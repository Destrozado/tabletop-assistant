// Tests de app/composables/useHistorySavedNotice.ts (D-03: aviso breve de
// éxito, aviso más largo de fallo, autocierre asimétrico, cierre manual).
//
// El estado es de módulo (ver justificación en el propio fichero), así que
// se comparte entre tests de este fichero: cada test debe dejarlo limpio
// (`afterEach` de abajo) para no filtrar estado a los siguientes. Se usan
// temporizadores falsos (`vi.useFakeTimers()`) para poder afirmar el
// autocierre sin esperas reales.
//
// Plan 09-26 (cierre del BLOCKER de la ronda 5): `notifyHistorySaved` pasa a
// recibir la `NoticeVariant` ya decidida (nunca dos booleanos), y
// `resolveNoticeVariant`/`planGameEnd` pasan a recibir un `StoredProgress`
// real en vez del booleano de una escritura — de ahí que este fichero
// importe también el tipo de la autoridad para construir su tabla de
// verdad.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  FAILURE_AUTO_DISMISS_MS,
  NOTICE_BODY,
  SUCCESS_AUTO_DISMISS_MS,
  dismissHistorySavedNotice,
  isSuccessVariant,
  notifyHistorySaved,
  planGameEnd,
  resolveAutoDismissMs,
  resolveNoticeVariant,
  useHistorySavedNotice,
} from '../useHistorySavedNotice'
import type { NoticeVariant } from '../useHistorySavedNotice'
import type { StoredProgress } from '../useStoredProgress'

// Las cuatro respuestas posibles de la autoridad de lectura (`readStoredProgress`),
// escritas como constante del test — nunca se inventa un quinto valor.
const TODOS_LOS_ESTADOS_DEL_DISPOSITIVO: StoredProgress[] = ['resumable', 'stale', 'absent', 'unknown']

// Las CINCO variantes de NoticeVariant (a diferencia de la constante de
// arriba, que son los cuatro estados del DISPOSITIVO): plan 09-32 Task 3,
// tabla de verdad de `isSuccessVariant`.
const TODAS_LAS_VARIANTES_DEL_AVISO: NoticeVariant[] = ['success', 'failure-recoverable', 'failure-stale', 'failure-unrecoverable', 'failure-unknown']

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  // El estado es de módulo y se comparte entre tests: se limpia aquí para
  // que ningún temporizador ni variante pendiente se filtre al siguiente
  // test, y se restauran los temporizadores reales.
  dismissHistorySavedNotice()
  vi.useRealTimers()
})

describe('resolveAutoDismissMs (función pura)', () => {
  it('1. success devuelve SUCCESS_AUTO_DISMISS_MS (6000)', () => {
    expect(resolveAutoDismissMs('success')).toBe(SUCCESS_AUTO_DISMISS_MS)
  })

  it('2. las cuatro variantes de fallo devuelven FAILURE_AUTO_DISMISS_MS (20000), mayor que el de éxito (asimetría D-03)', () => {
    expect(resolveAutoDismissMs('failure-recoverable')).toBe(FAILURE_AUTO_DISMISS_MS)
    expect(resolveAutoDismissMs('failure-stale')).toBe(FAILURE_AUTO_DISMISS_MS)
    expect(resolveAutoDismissMs('failure-unrecoverable')).toBe(FAILURE_AUTO_DISMISS_MS)
    expect(resolveAutoDismissMs('failure-unknown')).toBe(FAILURE_AUTO_DISMISS_MS)
    expect(FAILURE_AUTO_DISMISS_MS).toBeGreaterThan(SUCCESS_AUTO_DISMISS_MS)
  })
})

describe('notifyHistorySaved / useHistorySavedNotice', () => {
  it('3. notifyHistorySaved(\'success\') deja variant en success; notifyHistorySaved(\'failure-recoverable\') lo deja en failure-recoverable', () => {
    const { variant } = useHistorySavedNotice()

    notifyHistorySaved('success')
    expect(variant.value).toBe('success')

    notifyHistorySaved('failure-recoverable')
    expect(variant.value).toBe('failure-recoverable')
  })

  it('4. tras avanzar SUCCESS_AUTO_DISMISS_MS la variante de éxito vuelve a null; un milisegundo antes todavía no', () => {
    const { variant } = useHistorySavedNotice()

    notifyHistorySaved('success')
    vi.advanceTimersByTime(SUCCESS_AUTO_DISMISS_MS - 1)
    expect(variant.value).toBe('success')

    vi.advanceTimersByTime(1)
    expect(variant.value).toBe(null)
  })

  it('5. la variante de fallo sigue visible pasados los ms de éxito y desaparece a los de fallo (asimetría D-03)', () => {
    const { variant } = useHistorySavedNotice()

    notifyHistorySaved('failure-recoverable')
    vi.advanceTimersByTime(SUCCESS_AUTO_DISMISS_MS)
    expect(variant.value).toBe('failure-recoverable')

    vi.advanceTimersByTime(FAILURE_AUTO_DISMISS_MS - SUCCESS_AUTO_DISMISS_MS)
    expect(variant.value).toBe(null)
  })

  it('6. dismissHistorySavedNotice() la retira de inmediato y el temporizador pendiente no la resucita después', () => {
    const { variant, dismiss } = useHistorySavedNotice()

    notifyHistorySaved('success')
    expect(variant.value).toBe('success')

    dismiss()
    expect(variant.value).toBe(null)

    vi.advanceTimersByTime(SUCCESS_AUTO_DISMISS_MS)
    expect(variant.value).toBe(null)
  })

  it('7. dos notifyHistorySaved seguidos no acumulan temporizadores: avanzar el reloj una sola vez tras el segundo deja el estado en null y no vuelve a cambiarlo', () => {
    const { variant } = useHistorySavedNotice()

    notifyHistorySaved('success')
    vi.advanceTimersByTime(1000)
    notifyHistorySaved('success')

    vi.advanceTimersByTime(SUCCESS_AUTO_DISMISS_MS)
    expect(variant.value).toBe(null)

    // Si el primer temporizador no se hubiera cancelado, este avance
    // adicional no debería cambiar nada (ya está en null), pero tampoco
    // debería quedar ningún temporizador fantasma corriendo.
    vi.advanceTimersByTime(SUCCESS_AUTO_DISMISS_MS)
    expect(variant.value).toBe(null)
  })
})

describe('resolveNoticeVariant (función pura — tabla de verdad TOTAL sobre StoredProgress, planes 09-26/09-28)', () => {
  it.each(TODOS_LOS_ESTADOS_DEL_DISPOSITIVO)('(true, %s) → success: el estado del dispositivo es irrelevante cuando el histórico ya se escribió', (stored) => {
    expect(resolveNoticeVariant(true, stored)).toBe('success')
  })

  it('(false, \'resumable\') → failure-recoverable: el histórico falló pero el progreso sigue en el dispositivo', () => {
    expect(resolveNoticeVariant(false, 'resumable')).toBe('failure-recoverable')
  })

  it('(false, \'stale\') → failure-stale: el histórico falló y lo que queda en el dispositivo NO es la partida que acaba de terminar (plan 09-28)', () => {
    expect(resolveNoticeVariant(false, 'stale')).toBe('failure-stale')
  })

  it('(false, \'absent\') → failure-unrecoverable: el histórico falló y no hay progreso que ofrecer', () => {
    expect(resolveNoticeVariant(false, 'absent')).toBe('failure-unrecoverable')
  })

  it('(false, \'unknown\') → failure-unknown: el histórico falló y no se ha podido comprobar el dispositivo', () => {
    expect(resolveNoticeVariant(false, 'unknown')).toBe('failure-unknown')
  })

  it('los cuatro valores producen cuatro variantes distintas: biyección, sin hueco ni solape', () => {
    const variantesProducidas = TODOS_LOS_ESTADOS_DEL_DISPOSITIVO.map(stored => resolveNoticeVariant(false, stored))
    expect(new Set(variantesProducidas).size).toBe(TODOS_LOS_ESTADOS_DEL_DISPOSITIVO.length)
  })

  it('planGameEnd(false, \'stale\').preserveProgress es true: el snapshot anterior es el único rastro que queda de la partida', () => {
    expect(planGameEnd(false, 'stale').preserveProgress).toBe(true)
  })

  it('la variante no recuperable no promete nada sobre el dispositivo', () => {
    expect(NOTICE_BODY['failure-unrecoverable']).not.toContain('sigue guardada')
    expect(NOTICE_BODY['failure-unrecoverable']).not.toContain('Partida terminada')
  })

  it('failure-stale (plan 09-28) no promete identidad de partida: ni "sigue guardada" ni "no se ha perdido"', () => {
    expect(NOTICE_BODY['failure-stale']).not.toContain('sigue guardada')
    expect(NOTICE_BODY['failure-stale']).not.toContain('no se ha perdido')
  })

  // Plan 09-32 (octava cara del defecto, `09-VERIFICATION.md` ronda 7): la
  // frase de `failure-stale` afirmaba anterioridad temporal («versión
  // anterior») y diferencia de ronda («no la ronda») que `esLaMismaPartida`
  // no establece — ver el test 5 de `avisoTrasRegistroFallido.test.ts` para
  // el contraejemplo concreto. Este bloque fija por texto que esas dos
  // afirmaciones han desaparecido y que solo queda la que sí está
  // respaldada.
  it('failure-stale (plan 09-32) contiene la frase respaldada por esLaMismaPartida y ninguna otra', () => {
    expect(NOTICE_BODY['failure-stale']).toContain('no coincide con el punto en el que habéis terminado')
  })

  it('failure-stale (plan 09-32) ya no afirma anterioridad temporal: "versión anterior" ha desaparecido del texto', () => {
    expect(NOTICE_BODY['failure-stale']).not.toContain('versión anterior')
  })

  it('failure-stale (plan 09-32) ya no afirma diferencia de ronda: "no la ronda" ha desaparecido del texto', () => {
    expect(NOTICE_BODY['failure-stale']).not.toContain('no la ronda')
  })

  it('failure-stale (plan 09-32) no ordena ningún reintento: ninguna forma de "reintentar" aparece en el cuerpo', () => {
    expect(NOTICE_BODY['failure-stale']).not.toMatch(/reintentar/i)
  })

  it('failure-stale (plan 09-32) sigue conteniendo la advertencia modal, nunca certeza, sobre los datos que se guardarían', () => {
    expect(NOTICE_BODY['failure-stale']).toContain('podría guardar')
  })

  it('las otras cuatro entradas de NOTICE_BODY no cambian ni un carácter (plan 09-32 solo toca failure-stale)', () => {
    expect(NOTICE_BODY.success).toBe(null)
    expect(NOTICE_BODY['failure-recoverable']).toBe('La partida no se ha perdido: sigue guardada en el dispositivo. Volved a entrar en ella y pulsad «Partida terminada» otra vez para reintentar el registro. Si vuelve a fallar, puede deberse al modo privado del navegador, a la memoria llena, o a un histórico anterior que la app no consigue leer.')
    expect(NOTICE_BODY['failure-unrecoverable']).toBe('Al volver a entrar en el juego no encontraréis esta partida, así que esta vez no hay nada que reintentar. Suele deberse al modo privado del navegador o a la memoria llena: revisadlo antes de la próxima partida.')
    expect(NOTICE_BODY['failure-unknown']).toBe('No hemos podido comprobar si la partida sigue en el dispositivo. Volved a entrar en el juego: si os ofrece continuar, pulsad «Partida terminada» otra vez para reintentar el registro. Si no os la ofrece, puede que siga ahí y la app no consiga leerla: el modo privado del navegador y la memoria llena son las dos causas habituales.')
  })

  it('failure-unknown (plan 09-28) ya no delega en el grupo la inferencia de ausencia', () => {
    expect(NOTICE_BODY['failure-unknown']).not.toContain('ya no está')
  })

  it('failure-unknown tiene cuerpo propio, distinto de las otras tres variantes de fallo', () => {
    const cuerpoDesconocido = NOTICE_BODY['failure-unknown']
    expect(cuerpoDesconocido).not.toBe(null)
    expect(cuerpoDesconocido).not.toBe(NOTICE_BODY['failure-recoverable'])
    expect(cuerpoDesconocido).not.toBe(NOTICE_BODY['failure-stale'])
    expect(cuerpoDesconocido).not.toBe(NOTICE_BODY['failure-unrecoverable'])
  })

  it('las cuatro variantes de fallo tienen cuerpos distintos entre sí', () => {
    const cuerpos = [
      NOTICE_BODY['failure-recoverable'],
      NOTICE_BODY['failure-stale'],
      NOTICE_BODY['failure-unrecoverable'],
      NOTICE_BODY['failure-unknown'],
    ]
    expect(new Set(cuerpos).size).toBe(cuerpos.length)
  })
})

describe('planGameEnd.progressMismatch (tabla de verdad TOTAL sobre los ocho pares registro×dispositivo, plan 09-33)', () => {
  it.each(TODOS_LOS_ESTADOS_DEL_DISPOSITIVO)('(true, %s) → progressMismatch false: el histórico ya se escribió, no queda nada que advertir sobre el progreso', (stored) => {
    expect(planGameEnd(true, stored).progressMismatch).toBe(false)
  })

  it('(false, \'resumable\') → progressMismatch false: lo guardado SÍ corresponde a la partida que termina', () => {
    expect(planGameEnd(false, 'resumable').progressMismatch).toBe(false)
  })

  it('(false, \'stale\') → progressMismatch true: es el único de los ocho pares con discrepancia', () => {
    expect(planGameEnd(false, 'stale').progressMismatch).toBe(true)
  })

  it('(false, \'absent\') → progressMismatch false: no hay nada guardado con lo que pudiera haber discrepancia', () => {
    expect(planGameEnd(false, 'absent').progressMismatch).toBe(false)
  })

  it('(false, \'unknown\') → progressMismatch false: no se ha podido comprobar el dispositivo, así que no se puede afirmar discrepancia', () => {
    expect(planGameEnd(false, 'unknown').progressMismatch).toBe(false)
  })

  it('de los cuatro estados con historyRecorded === false, exactamente UNO produce progressMismatch === true', () => {
    const conDiscrepancia = TODOS_LOS_ESTADOS_DEL_DISPOSITIVO.filter(stored => planGameEnd(false, stored).progressMismatch)
    expect(conDiscrepancia).toEqual(['stale'])
  })

  // progressMismatch y preserveProgress contestan preguntas distintas
  // («¿hay que conservar el progreso?» y «¿el progreso que se conserva
  // corresponde a esta partida?») y confundirlas es la misma clase de
  // defecto que esta fase lleva ocho caras cerrando (09-VERIFICATION.md).
  // Este caso lo fija por test: (false, 'resumable') conserva el progreso
  // (preserveProgress true) porque el histórico no se escribió, pero SÍ
  // corresponde a la partida que termina (progressMismatch false) — la
  // independencia que el plan 09-33 exige comprobar.
  it('progressMismatch y preserveProgress son independientes: (false, \'resumable\') conserva el progreso sin discrepancia', () => {
    const plan = planGameEnd(false, 'resumable')
    expect(plan.preserveProgress).toBe(true)
    expect(plan.progressMismatch).toBe(false)
  })
})

// isSuccessVariant (plan 09-32, Task 3): única vía para que un `.vue`
// distinga el tono del aviso sin escribir a mano un literal de
// `NoticeVariant` — mismo criterio que ya aplica `resolveAutoDismissMs`
// internamente. Gate C (WR-03, `afirmacionesRespaldadas.test.ts`) vigila
// hoy los literales de `StoredProgress` y de `NoticeVariant`; este export
// existe para que `HistorySavedNotice.vue` no tenga que escribir
// `variant === 'success'` a mano.
describe('isSuccessVariant (función pura, plan 09-32)', () => {
  it('isSuccessVariant(\'success\') es true', () => {
    expect(isSuccessVariant('success')).toBe(true)
  })

  it.each(['failure-recoverable', 'failure-stale', 'failure-unrecoverable', 'failure-unknown'] as const)('isSuccessVariant(%s) es false', (variante) => {
    expect(isSuccessVariant(variante)).toBe(false)
  })

  it('coincide con resolveAutoDismissMs: la duración corta es exactamente la de la variante de éxito', () => {
    for (const variante of TODAS_LAS_VARIANTES_DEL_AVISO) {
      const duracionCorta = resolveAutoDismissMs(variante) === SUCCESS_AUTO_DISMISS_MS
      expect(duracionCorta).toBe(isSuccessVariant(variante))
    }
  })
})
