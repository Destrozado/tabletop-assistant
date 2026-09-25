// engine/stepValues.ts
// Resuelve, para un paso que declara `value` (Fase 8, ampliado en el quick
// 260925-mpj), el dato conocido a pintar en pantalla: un único número de
// mesa para `villainHealth`, una fila por jugador para
// `heroHealth`/`handSizeAlterEgo`, o una LÍNEA DE TEXTO para
// `encounterSets` (`resolveStepValueText`, quick 260925-mpj D-07) — tercera
// forma de salida, hermana de las dos anteriores, que delega en
// `resolveEncounterSetNames` (engine/encounterSets.ts). Módulo puro,
// hermano estructural de engine/selection.ts y engine/counters.ts: cero
// imports de Vue/Nuxt/DOM.
//
// D-13 (regla dura): el valor pintado sale SIEMPRE del catálogo
// (`computeInitialVillainHealth` / `computeInitialHeroHealth` /
// `hero.handSizeAlterEgo`) y NUNCA de `resolveCounterValues`. Este módulo
// no importa ni llama a `resolveCounterValues` en ninguna rama. Caso
// concreto: el grupo vuelve con `‹ ATRÁS` desde la ronda a
// `setup.escenario.02` con el villano ya a 38 de 42 de vida congelada — el
// paso sigue pintando 42, porque el texto dice «ajustad el dial al valor
// INDICADO», es decir la vida inicial impresa en la carta, no el contador
// que el grupo ya movió. Pintar 38 respondería a otra pregunta.
//
// D-04: la aritmética se REUTILIZA de engine/counters.ts en vez de
// reimplementarse; este módulo no gobierna la semántica de "congelado al
// primer toque" (esa es la razón de ser de counters.ts) y `handSizeAlterEgo`
// no es un contador de nada, solo un campo plano del catálogo.
//
// D-05/D-07 (fidelidad de reglas, Rules Reference v1.7 Apéndice II paso 1):
// la mano inicial de setup usa `hero.handSizeAlterEgo`, NUNCA el campo
// hermano de la cara Héroe del catálogo — el setup arranca con la cara
// Alter-Ego boca arriba, así que la cifra correcta durante el setup es la
// de esa cara. Spider-Man muestra 6 (Alter-Ego), no 5 (Héroe).
import { computeInitialHeroHealth, computeInitialVillainHealth } from './counters'
import { resolveEncounterSetNames } from './encounterSets'
import { resolvePlayerSlots, resolveVillainId } from './selection'
import type { CharacterCatalogue, SessionContext } from './types'

// `playerName` es el crudo del hueco (sin resolver «Jugador N»): esa
// etiqueta por defecto la resuelve la capa de app con `resolvePlayerLabel`,
// no este módulo, que no puede importar de `app/`. `value` es SIEMPRE un
// `number`: una fila con valor desconocido no existe (D-14), se descarta en
// vez de emitirse con un marcador.
export interface StepValueRow {
  slot: number
  heroId: string
  heroName: string
  playerName: string
  value: number
}

// Cifra única de mesa (VAL-01, forma paréntesis). Solo `villainHealth`
// puede devolver un número — D-02: la forma de salida se deriva del propio
// miembro del enum, sin consultar ningún segundo campo de «alcance». La
// comparación es de igualdad estricta contra el literal, nunca un
// chequeo de veracidad ni un `switch` con `default`: `kind` llega al
// navegador como JSON crudo sin pasar por el validador de esquema en
// ejecución, así que puede estar ausente o traer cualquier cadena (mismo
// razonamiento que `showsSelectionGrid` en `useGameSession.ts`).
//
// D-15/VAL-03: sin ninguna selección de villano, `resolveVillainId`
// devuelve `null`, el `find` no encuentra nada, y `computeInitialVillainHealth`
// ya devuelve `null` ante un villano `null` — no hay nada que pintar.
export function resolveStepValue(
  kind: string | null | undefined,
  context: SessionContext,
  catalogue: CharacterCatalogue | null,
): number | null {
  if (kind !== 'villainHealth') return null

  const villainId = resolveVillainId(context)
  const villain = catalogue !== null
    ? catalogue.villains.find(v => v.id === villainId) ?? null
    : null

  return computeInitialVillainHealth(villain, context.playerCount, context.difficulty)
}

// Filas por jugador (VAL-02, forma lista). Solo `heroHealth` y
// `handSizeAlterEgo` producen filas; cualquier otro `kind` (incluidos
// `villainHealth`, un literal desconocido, `undefined` o `null`) devuelve
// `[]` (D-02, D-15/VAL-03).
//
// D-14: con selección parcial se devuelven SOLO las filas cuyo héroe se
// conoce — la fila se descarta (no se emite con el marcador de la banda de
// contadores ni con `value: null`) cuando el héroe no está en el catálogo,
// cuando `catalogue` es `null`, o cuando el número resuelto no pasa
// `Number.isFinite`. La numeración por `slot` (base 0) deja ver quién
// falta sin escribir un hueco.
//
// D-11: sin caso especial para `playerCount === 1` — una fila es una lista
// de una fila, igual que con cualquier otro número de jugadores.
export function resolveStepValueRows(
  kind: string | null | undefined,
  context: SessionContext,
  catalogue: CharacterCatalogue | null,
): StepValueRow[] {
  if (kind !== 'heroHealth' && kind !== 'handSizeAlterEgo') return []

  const slots = resolvePlayerSlots(context)
  const rows: StepValueRow[] = []

  slots.forEach((slot, index) => {
    const hero = catalogue !== null
      ? catalogue.heroes.find(h => h.id === slot.heroId) ?? null
      : null
    if (hero === null) return

    // handSizeAlterEgo es un campo plano del catálogo: no existe ni hace
    // falta una función de cálculo para la mano (a diferencia de la vida,
    // que sí pasa por computeInitialHeroHealth).
    const value = kind === 'heroHealth'
      ? computeInitialHeroHealth(hero)
      : hero.handSizeAlterEgo

    if (!Number.isFinite(value)) return

    rows.push({
      slot: index,
      heroId: hero.id,
      heroName: hero.name,
      playerName: slot.playerName,
      value: value as number,
    })
  })

  return rows
}

// Línea de texto (D-07, quick 260925-mpj): forma de salida distinta de las
// dos de arriba — ni un número de mesa ni una fila por jugador, una frase
// ya unida con « · ». Solo `encounterSets` produce algo aquí; comparación de
// igualdad estricta contra el literal, mismo razonamiento que
// `resolveStepValue` (`kind` llega como JSON crudo, sin pasar por el
// validador de esquema en ejecución). Sin ningún nombre que unir (D-07: sin
// villano y sin módulos), `null` — no una cadena vacía — para que
// StepScreen.vue no renderice el bloque en absoluto (mismo criterio que
// `stepValueRows` con `null`).
export function resolveStepValueText(
  kind: string | null | undefined,
  context: SessionContext,
  catalogue: CharacterCatalogue | null,
): string | null {
  if (kind !== 'encounterSets') return null

  const names = resolveEncounterSetNames(context, catalogue)
  return names.length ? names.join(' · ') : null
}
