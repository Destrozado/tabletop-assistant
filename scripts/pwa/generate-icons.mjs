#!/usr/bin/env node
// scripts/pwa/generate-icons.mjs
//
// Qué es: CLI invocado A MANO por el desarrollador para generar los cuatro
// PNG del icono instalable de la app (manifiesto PWA + apple-touch-icon).
//
// D-06: cero dependencias nuevas. Los chunks PNG (IHDR/IDAT/IEND) se escriben
// a mano usando solo `node:zlib` (`deflateSync`, `crc32`) y `node:fs`. NO se
// añade `sharp`, `@vite-pwa/assets-generator`, `canvas` ni `jimp`.
//
// D-07: ningún píxel procede de una imagen externa. El icono es un triángulo
// geométrico (el mismo símbolo de avance que el botón "SIGUIENTE ›" de la
// app) calculado por aritmética de coordenadas sobre los colores del tema
// (app/assets/css/main.css @theme) — no hay arte de Marvel Champions ni de
// Fantasy Flight Games, ni entrada de red ni lectura de ningún otro fichero
// de imagen: este fichero no importa ninguna función de lectura de ficheros
// de `node:fs` más allá de la escritura de sus propias salidas, ni realiza
// peticiones HTTP.
//
// Este script NUNCA se engancha a `build`, `generate` ni `postinstall` (mismo
// criterio D-06 que `scripts/voice/generate.mjs`): los cuatro PNG resultantes
// se versionan en `public/icons/` y solo se regeneran a mano con
// `npm run icons:generate` cuando el diseño cambie. La generación es
// determinista: ejecutarlo dos veces produce ficheros byte a byte idénticos
// (no se escriben fechas, versiones ni ningún dato variable).

import { mkdirSync, writeFileSync } from 'node:fs'
import { crc32, deflateSync } from 'node:zlib'

// ── 1. Constantes de rutas y colores ────────────────────────────────────────
const ICONS_DIR = 'public/icons'

// Colores literales de app/assets/css/main.css @theme — no se inventan
// valores nuevos (04-02-PLAN.md <interfaces>).
const COLOR_ACCENT = [0x2F, 0x81, 0xF7] // --color-accent: fondo del icono
const COLOR_ON_ACCENT = [0x0B, 0x12, 0x20] // --color-on-accent: triángulo

// Tabla de salidas: { name, size, triangleRatio }. `triangleRatio` es la
// fracción del lado del lienzo que ocupa el lado del cuadrado que
// circunscribe el triángulo (04-02-PLAN.md §Diseño del icono).
const OUTPUTS = [
  { name: 'icon-192.png', size: 192, triangleRatio: 0.52 },
  { name: 'icon-512.png', size: 512, triangleRatio: 0.52 },
  // Maskable: triángulo reducido al ~34% para quedar holgado dentro del
  // círculo seguro del 80% que los lanzadores maskable pueden recortar.
  { name: 'icon-512-maskable.png', size: 512, triangleRatio: 0.34 },
  { name: 'apple-touch-icon.png', size: 180, triangleRatio: 0.52 },
]

// ── 2. Codificación PNG de cero dependencias (04-RESEARCH.md §Pattern 3) ───
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcInput = Buffer.concat([typeBuf, data])
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(crcInput) >>> 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function encodePng(width, height, rgbaPixels) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr.writeUInt8(8, 8) // profundidad de bit: 8
  ihdr.writeUInt8(6, 9) // tipo de color: 6 = RGBA (alfa 255 en todos los
  // píxeles hace que apple-touch-icon.png quede opaco de hecho sin mantener
  // una segunda ruta de codificación en tipo de color 2)

  // Cada fila del raw lleva su byte de filtro 0 (sin filtro) delante.
  const raw = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4)
    raw[rowStart] = 0
    rgbaPixels[y].copy(raw, rowStart + 1)
  }
  const idat = deflateSync(raw)

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ── 3. Trazado del triángulo (relleno por comprobación geométrica) ─────────
// Triángulo isósceles apuntando a la derecha, inscrito en un cuadrado de
// lado `triangleSize` centrado en el lienzo — el mismo símbolo que usa el
// botón "SIGUIENTE ›" de la app. Ningún píxel se lee de un fichero externo.
function makeTriangleTest(size, triangleRatio) {
  const cx = size / 2
  const cy = size / 2
  const half = (triangleRatio * size) / 2

  // Vértices: base vertical a la izquierda, ápice a la derecha.
  const topLeft = [cx - half, cy - half]
  const bottomLeft = [cx - half, cy + half]
  const apex = [cx + half, cy]

  function sign(p1, p2, p3) {
    return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1])
  }

  return function isInsideTriangle(px, py) {
    // Se muestrea el centro del píxel (px+0.5, py+0.5) para un borde más
    // simétrico que probar la esquina del píxel.
    const p = [px + 0.5, py + 0.5]
    const d1 = sign(p, topLeft, bottomLeft)
    const d2 = sign(p, bottomLeft, apex)
    const d3 = sign(p, apex, topLeft)
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0
    return !(hasNeg && hasPos)
  }
}

function buildIconRows({ size, triangleRatio }) {
  const isInsideTriangle = makeTriangleTest(size, triangleRatio)
  const rows = []
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(size * 4)
    for (let x = 0; x < size; x++) {
      const [r, g, b] = isInsideTriangle(x, y) ? COLOR_ON_ACCENT : COLOR_ACCENT
      const offset = x * 4
      row[offset] = r
      row[offset + 1] = g
      row[offset + 2] = b
      row[offset + 3] = 255 // alfa 255 en TODOS los píxeles (D-06/Pitfall 2 iOS)
    }
    rows.push(row)
  }
  return rows
}

// ── 4. Generación de los cuatro ficheros ────────────────────────────────────
mkdirSync(ICONS_DIR, { recursive: true })

console.log(`Generando ${OUTPUTS.length} iconos en ${ICONS_DIR}/...`)
OUTPUTS.forEach((spec, index) => {
  console.log(`[${index + 1}/${OUTPUTS.length}] ${spec.name}...`)
  const rows = buildIconRows(spec)
  const png = encodePng(spec.size, spec.size, rows)
  writeFileSync(`${ICONS_DIR}/${spec.name}`, png)
  console.log(`  escrito (${png.length} bytes, ${spec.size}x${spec.size})`)
})

console.log(`Hecho: ${OUTPUTS.length}/${OUTPUTS.length} iconos generados.`)
