// engine/__tests__/voice-drift.test.ts
//
// Gate de deriva contenido↔audio (D-04/D-05, plan 03.1-03). Este fichero es
// SOLO LECTOR: nunca regenera audio, nunca invoca herramientas de conversión
// del sistema operativo, nunca hace peticiones de red ni lanza procesos hijos,
// y nunca escribe en disco. CI corre en ubuntu-latest sin clave de API y sin
// esas herramientas instaladas (D-06): este test solo lee ficheros ya
// versionados y compara huellas en memoria.
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { validateGameDefinition } from '../schema'
import { collectAudioIds, collectSpeechEntries } from '../audio'
import type { SpeechEntry } from '../audio'
import { fingerprint } from '../../scripts/voice/fingerprint.mjs'
import { ACTIVE_STYLE } from '../../scripts/voice/styles.mjs'

const contentPath = fileURLToPath(new URL('../../content/marvel-champions.json', import.meta.url))
const rawMarvelChampions: unknown = JSON.parse(readFileSync(contentPath, 'utf-8'))
const marvelChampions = validateGameDefinition(rawMarvelChampions)

const manifestPath = fileURLToPath(new URL('../../scripts/voice/manifest.json', import.meta.url))
const audioDir = fileURLToPath(new URL('../../public/audio', import.meta.url))

interface ManifestEntry {
  hash: string
  bytes: number
  generatedAt: string
}

interface Manifest {
  voice: string
  model: string
  style: string
  generatedAt: string
  entries: Record<string, ManifestEntry>
}

const manifest: Manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))

// Helpers locales puros (D-04/D-05): se usan tanto en el gate real como en el
// test de "el gate muerde", para no duplicar la lógica de comparación.
function findStaleAudio(entries: SpeechEntry[], manifestEntries: Record<string, ManifestEntry>): SpeechEntry[] {
  return entries.filter(entry => manifestEntries[entry.id]?.hash !== fingerprint(entry.speech))
}

function staleMessage(stale: SpeechEntry[]): string {
  const ids = stale.map(entry => entry.id)
  return [
    `Audio desactualizado para: ${ids.join(', ')}`,
    `Ejecuta: npm run voice:generate -- ${ids.join(' ')}`,
  ].join('\n')
}

// Muta en memoria la primera entrada obtenida por recorrido (nunca un id
// tecleado a mano) para ejercitar el gate sin tocar el contenido real.
function mutateFirstEntry(entries: SpeechEntry[]): { mutated: SpeechEntry[], target: SpeechEntry } {
  const [first, ...rest] = entries
  const target: SpeechEntry = { id: first.id, speech: `${first.speech} (mutado en memoria para el test)` }
  return { mutated: [target, ...rest], target }
}

describe('gate de deriva contenido↔audio (D-04/D-05)', () => {
  it('D-04: cada frase speech tiene un audio con la huella al día', () => {
    const entries = collectSpeechEntries(marvelChampions)
    const stale = findStaleAudio(entries, manifest.entries)
    if (stale.length > 0) {
      throw new Error(staleMessage(stale))
    }
    expect(stale).toHaveLength(0)
  })

  it('D-05: el mensaje de fallo nombra los ids y el comando exacto', () => {
    const entries = collectSpeechEntries(marvelChampions)
    const { mutated, target } = mutateFirstEntry(entries)
    const stale = findStaleAudio(mutated, manifest.entries)
    const message = staleMessage(stale)
    expect(message).toContain(target.id)
    expect(message).toContain(`npm run voice:generate -- ${target.id}`)
  })

  it('el gate muerde: cambiar una frase speech en memoria hace que su audio quede desactualizado', () => {
    const entries = collectSpeechEntries(marvelChampions)
    const { mutated, target } = mutateFirstEntry(entries)
    const stale = findStaleAudio(mutated, manifest.entries)
    expect(stale).toHaveLength(1)
    expect(stale[0].id).toBe(target.id)
  })

  it('el manifiesto cubre exactamente el catálogo del motor', () => {
    const engineIds = new Set(collectAudioIds(marvelChampions))
    const manifestIds = new Set(Object.keys(manifest.entries))
    const missingInManifest = [...engineIds].filter(id => !manifestIds.has(id))
    const extraInManifest = [...manifestIds].filter(id => !engineIds.has(id))
    if (missingInManifest.length > 0 || extraInManifest.length > 0) {
      const message = [
        missingInManifest.length > 0 ? `Faltan en el manifiesto: ${missingInManifest.join(', ')}` : null,
        extraInManifest.length > 0 ? `Sobran en el manifiesto: ${extraInManifest.join(', ')}` : null,
      ].filter(Boolean).join('\n')
      throw new Error(message)
    }
    expect(missingInManifest).toHaveLength(0)
    expect(extraInManifest).toHaveLength(0)
  })

  it('hay exactamente 35 entradas', () => {
    expect(Object.keys(manifest.entries)).toHaveLength(35)
  })

  it('D-11: el estilo del manifiesto coincide con ACTIVE_STYLE', () => {
    expect(manifest.style, 'Ejecuta: npm run voice:generate -- --force').toBe(ACTIVE_STYLE)
  })

  it('cada entrada del manifiesto tiene su fichero de audio', () => {
    const missing: string[] = []
    for (const id of Object.keys(manifest.entries)) {
      const filePath = join(audioDir, `${id}.m4a`)
      if (!existsSync(filePath) || statSync(filePath).size <= 10000) {
        missing.push(id)
      }
    }
    if (missing.length > 0) {
      throw new Error(`Sin fichero de audio válido para: ${missing.join(', ')}`)
    }
    expect(missing).toHaveLength(0)
  })

  it('metadatos de generación: voz Rasalgethi y modelo declarado (D-01)', () => {
    expect(manifest.voice).toBe('Rasalgethi')
    expect(manifest.model).toBeTruthy()
    expect(manifest.model.length).toBeGreaterThan(0)
  })
})
