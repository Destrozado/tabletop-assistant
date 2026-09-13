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
  notifyHistorySaved,
  resolveAutoDismissMs,
  resolveNoticeVariant,
  useHistorySavedNotice,
} from '../useHistorySavedNotice'
import type { StoredProgress } from '../useStoredProgress'

// Las tres respuestas posibles de la autoridad de lectura (`readStoredProgress`),
// escritas como constante del test — nunca se inventa un cuarto valor.
const TODOS_LOS_ESTADOS_DEL_DISPOSITIVO: StoredProgress[] = ['resumable', 'absent', 'unknown']

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

  it('2. las tres variantes de fallo devuelven FAILURE_AUTO_DISMISS_MS (20000), mayor que el de éxito (asimetría D-03)', () => {
    expect(resolveAutoDismissMs('failure-recoverable')).toBe(FAILURE_AUTO_DISMISS_MS)
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

describe('resolveNoticeVariant (función pura — tabla de verdad TOTAL sobre StoredProgress, plan 09-26)', () => {
  it.each(TODOS_LOS_ESTADOS_DEL_DISPOSITIVO)('(true, %s) → success: el estado del dispositivo es irrelevante cuando el histórico ya se escribió', (stored) => {
    expect(resolveNoticeVariant(true, stored)).toBe('success')
  })

  it('(false, \'resumable\') → failure-recoverable: el histórico falló pero el progreso sigue en el dispositivo', () => {
    expect(resolveNoticeVariant(false, 'resumable')).toBe('failure-recoverable')
  })

  it('(false, \'absent\') → failure-unrecoverable: el histórico falló y no hay progreso que ofrecer', () => {
    expect(resolveNoticeVariant(false, 'absent')).toBe('failure-unrecoverable')
  })

  it('(false, \'unknown\') → failure-unknown: el histórico falló y no se ha podido comprobar el dispositivo', () => {
    expect(resolveNoticeVariant(false, 'unknown')).toBe('failure-unknown')
  })

  it('la variante no recuperable no promete nada sobre el dispositivo', () => {
    expect(NOTICE_BODY['failure-unrecoverable']).not.toContain('sigue guardada')
    expect(NOTICE_BODY['failure-unrecoverable']).not.toContain('Partida terminada')
  })

  it('failure-unknown tiene cuerpo propio, distinto de las otras dos variantes de fallo', () => {
    const cuerpoDesconocido = NOTICE_BODY['failure-unknown']
    expect(cuerpoDesconocido).not.toBe(null)
    expect(cuerpoDesconocido).not.toBe(NOTICE_BODY['failure-recoverable'])
    expect(cuerpoDesconocido).not.toBe(NOTICE_BODY['failure-unrecoverable'])
  })
})
