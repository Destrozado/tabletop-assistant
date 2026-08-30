#!/usr/bin/env node
// scripts/voice/generate.mjs
//
// Qué es: CLI invocado A MANO por el desarrollador para generar los audios de
// locución (Gemini TTS -> PCM -> WAV -> AAC/M4A) de las 37 frases `speech` de
// content/marvel-champions.json.
//
// D-06: este script NUNCA se invoca desde `build`, `generate`, ni desde CI, ni
// desde Vercel. Meter una llamada de red a la API de Gemini (y la necesidad de
// la clave) en el build de despliegue rompería "sin backend". Requiere macOS
// (usa `afconvert`, nativo) y la variable de entorno de la clave de la API en
// un fichero `.env` no versionado.
//
// Este fichero es el ÚNICO escritor de scripts/voice/manifest.json (Pitfall 3
// de 03.1-RESEARCH.md): si alguien edita el manifiesto o los `.m4a` a mano sin
// pasar por aquí, el gate de deriva de CI (plan 03.1-03) puede quedar en un
// estado inconsistente. No lo hagas.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fingerprint } from './fingerprint.mjs'
import { ACTIVE_STYLE, PROBE_PHRASE, STYLES } from './styles.mjs'
import { wrapPcmAsWav } from './wav.mjs'

// ── 1. Carga de entorno ─────────────────────────────────────────────────────
try {
  process.loadEnvFile('.env')
}
catch {
  // Sin `.env` (o `loadEnvFile` no soportado en esta versión de Node): seguir
  // con `process.env` tal cual. No es un error — puede que ya esté exportada
  // en el shell.
}

const ENV_VAR_NAME = 'GEMINI_API_KEY'
const GEMINI_API_KEY = process.env[ENV_VAR_NAME]
if (!GEMINI_API_KEY) {
  console.error([
    'Falta la clave de la API de Gemini.',
    'Ponla en un fichero .env en la raíz del repo, en la variable',
    'GEMINI_API_KEY=tu-clave-aqui',
    '(el fichero .env ya está en .gitignore; su valor nunca se imprime).',
  ].join('\n'))
  process.exit(1)
}

// ── 2. Comprobar que afconvert existe (solo macOS) ─────────────────────────
try {
  execFileSync('which', ['afconvert'], { stdio: 'ignore' })
}
catch {
  console.error('No se encontró `afconvert`. La generación de audio solo corre en macOS.')
  process.exit(1)
}

// ── 3. Constantes ────────────────────────────────────────────────────────────
const MODEL = 'gemini-2.5-flash-preview-tts'
const VOICE = 'Rasalgethi' // D-01: voz elegida por el usuario ("Informativa")
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
const AUDIO_DIR = 'public/audio'
const PROBE_DIR = 'public/audio/_probe'
const MANIFEST_PATH = 'scripts/voice/manifest.json'
const CONTENT_PATH = 'content/marvel-champions.json'
const ID_PATTERN = /^[a-z0-9]+(?:\.[a-z0-9-]+)*$/
const RETRY_BACKOFFS_MS = [5000, 15000, 45000] // ante 429/5xx: 5s, 15s, 45s

// ── 4. Argumentos ────────────────────────────────────────────────────────────
const rawArgs = process.argv.slice(2)
const force = rawArgs.includes('--force') // D-11: regenerar las 37 sin mirar huellas
const probeMode = rawArgs.includes('--probe')
const delayArg = rawArgs.find(arg => arg.startsWith('--delay='))
const delayMs = delayArg ? Number(delayArg.slice('--delay='.length)) : 1500
const requestedIds = rawArgs.filter(arg => !arg.startsWith('--'))

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ── 5. Recorrido genérico del contenido ─────────────────────────────────────
// DUPLICA a `collectSpeechEntries` de engine/audio.ts (plan 03.1-02) porque un
// `.mjs` de Node plano no puede importar TypeScript sin un paso de build. La
// divergencia entre ambas la caza el gate de CI del plan 03.1-03, que compara
// el conjunto de claves de manifest.json con el de la función TS. Recorre
// sections -> phases -> steps genéricamente: NUNCA teclear a mano los ids de
// los pasos con variante de dificultad, se derivan del recorrido.
function collectSpeechEntries() {
  const raw = JSON.parse(readFileSync(CONTENT_PATH, 'utf-8'))
  const entries = []
  for (const section of raw.sections ?? []) {
    for (const phase of section.phases ?? []) {
      for (const step of phase.steps ?? []) {
        if (step.speech !== undefined) {
          entries.push({ id: step.id, speech: step.speech })
        }
        const difficultyVariants = step.variants?.difficulty
        if (difficultyVariants) {
          for (const [difficulty, variant] of Object.entries(difficultyVariants)) {
            if (variant?.speech !== undefined) {
              entries.push({ id: `${step.id}.${difficulty}`, speech: variant.speech })
            }
          }
        }
      }
    }
  }
  return entries
}

function assertValidId(id) {
  if (!ID_PATTERN.test(id)) {
    throw new Error(`Id inválido, no se usa como nombre de fichero: ${id}`)
  }
}

// ── 6. Manifiesto de huellas ─────────────────────────────────────────────────
function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    return { voice: VOICE, model: MODEL, style: ACTIVE_STYLE, generatedAt: null, entries: {} }
  }
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'))
}

function saveManifest(manifest) {
  const sortedEntries = {}
  for (const key of Object.keys(manifest.entries).sort()) {
    sortedEntries[key] = manifest.entries[key]
  }
  const toWrite = { ...manifest, entries: sortedEntries }
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(toWrite, null, 2)}\n`)
}

// ── 7. Llamada a Gemini TTS con reintento acotado ───────────────────────────
async function synthesize(text) {
  let attempt = 0
  for (;;) {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: VOICE },
            },
          },
        },
      }),
    })

    if (response.ok) {
      const json = await response.json()
      const base64 = json?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
      if (!base64) {
        throw new Error('Respuesta de Gemini sin audio (candidates[0].content.parts[0].inlineData.data ausente)')
      }
      return Buffer.from(base64, 'base64')
    }

    const retryable = response.status === 429 || response.status >= 500
    if (!retryable || attempt >= RETRY_BACKOFFS_MS.length) {
      const bodyText = await response.text().catch(() => '')
      throw new Error(`Gemini respondió HTTP ${response.status}. Cuerpo (primeros 200 caracteres): ${bodyText.slice(0, 200)}`)
    }
    const wait = RETRY_BACKOFFS_MS[attempt]
    console.error(`HTTP ${response.status} de Gemini; reintentando en ${wait}ms (intento ${attempt + 1}/${RETRY_BACKOFFS_MS.length})...`)
    await sleep(wait)
    attempt += 1
  }
}

// ── 8. WAV -> M4A vía afconvert (nunca shell: argumentos en array) ─────────
function convertPcmToM4a(pcm, m4aPath) {
  const tmpWavPath = join(tmpdir(), `voice-${randomUUID()}.wav`)
  writeFileSync(tmpWavPath, wrapPcmAsWav(pcm))
  try {
    execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '64000', tmpWavPath, m4aPath])
  }
  finally {
    try {
      unlinkSync(tmpWavPath)
    }
    catch {
      // El temporal ya no está o nunca llegó a crearse: no es un fallo de la conversión.
    }
  }
}

// ── 9. Modo --probe (Task 2 de 03.1-01-PLAN.md) ─────────────────────────────
// Genera PROBE_PHRASE con cada estilo de STYLES y escribe
// public/audio/_probe/estilo-<clave>.m4a. Deliberadamente NO lee ni escribe
// manifest.json: son clips desechables para que el usuario elija estilo
// (D-02), no forman parte del contrato de deriva contenido<->audio.
async function runProbe() {
  mkdirSync(PROBE_DIR, { recursive: true })
  const styleKeys = Object.keys(STYLES)
  console.log(`Generando ${styleKeys.length} variantes de estilo de la frase de prueba (modo --probe, sin tocar manifest.json)...`)
  let index = 0
  for (const styleKey of styleKeys) {
    const text = `${STYLES[styleKey]}${PROBE_PHRASE}`
    console.log(`  [${styleKey}] generando...`)
    const pcm = await synthesize(text)
    const m4aPath = join(PROBE_DIR, `estilo-${styleKey}.m4a`)
    convertPcmToM4a(pcm, m4aPath)
    console.log(`  [${styleKey}] escrito en ${m4aPath}`)
    index += 1
    if (index < styleKeys.length) await sleep(delayMs)
  }
  console.log('Listo. Abre public/voice-probe.html en la tablet real para elegir estilo (D-02).')
}

// ── 10. Modo lote: incremental por huella (D-10), reanudable ante 429 ──────
async function runBatch() {
  mkdirSync(AUDIO_DIR, { recursive: true })
  const entries = collectSpeechEntries()
  const validIds = new Set(entries.map(entry => entry.id))

  for (const id of requestedIds) {
    if (!validIds.has(id)) {
      console.error(`Id desconocido: ${id}\nIds válidos:\n${[...validIds].sort().join('\n')}`)
      process.exit(1)
    }
    assertValidId(id)
  }

  const manifest = loadManifest()
  manifest.voice = VOICE
  manifest.model = MODEL
  manifest.style = ACTIVE_STYLE

  const targets = entries.filter((entry) => {
    assertValidId(entry.id)
    if (requestedIds.length > 0 && !requestedIds.includes(entry.id)) return false
    if (force) return true
    const m4aPath = join(AUDIO_DIR, `${entry.id}.m4a`)
    const upToDate = manifest.entries[entry.id]?.hash === fingerprint(entry.speech) && existsSync(m4aPath)
    return !upToDate
  })

  console.log(`Generando ${targets.length} de ${entries.length} clips totales (estilo activo: ${ACTIVE_STYLE}).`)
  if (targets.length === 0) {
    console.log('Nada que generar: todo al día.')
    return
  }

  let completed = 0
  for (const entry of targets) {
    console.log(`[${completed + 1}/${targets.length}] ${entry.id}...`)
    try {
      const text = `${STYLES[ACTIVE_STYLE]}${entry.speech}`
      const pcm = await synthesize(text)
      const m4aPath = join(AUDIO_DIR, `${entry.id}.m4a`)
      convertPcmToM4a(pcm, m4aPath)
      // Reanudabilidad (obligatoria): fichero + manifiesto tras CADA clip, no al
      // final. Un corte por cuota deja el trabajo hecho consolidado.
      manifest.entries[entry.id] = {
        hash: fingerprint(entry.speech),
        bytes: pcm.length,
        generatedAt: new Date().toISOString(),
      }
      manifest.generatedAt = new Date().toISOString()
      saveManifest(manifest)
      completed += 1
    }
    catch (error) {
      console.error(`Fallo generando ${entry.id}: ${error.message}`)
      console.error(`Completados ${completed} de ${targets.length}. Para continuar: npm run voice:generate`)
      process.exit(1)
    }
    if (completed < targets.length) await sleep(delayMs)
  }
  console.log(`Hecho: ${completed}/${targets.length} clips generados.`)
}

if (probeMode) {
  await runProbe()
}
else {
  await runBatch()
}
