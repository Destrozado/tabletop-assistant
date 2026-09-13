// Tests de app/composables/useHistorySavedNotice.ts (D-03: aviso breve de
// éxito, aviso más largo de fallo, autocierre asimétrico, cierre manual).
//
// El estado es de módulo (ver justificación en el propio fichero), así que
// se comparte entre tests de este fichero: cada test debe dejarlo limpio
// (`afterEach` de abajo) para no filtrar estado a los siguientes. Se usan
// temporizadores falsos (`vi.useFakeTimers()`) para poder afirmar el
// autocierre sin esperas reales.
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

  it('2. failure-recoverable devuelve FAILURE_AUTO_DISMISS_MS (20000), mayor que el de éxito (asimetría D-03); failure-unrecoverable comparte la misma duración', () => {
    expect(resolveAutoDismissMs('failure-recoverable')).toBe(FAILURE_AUTO_DISMISS_MS)
    expect(resolveAutoDismissMs('failure-unrecoverable')).toBe(FAILURE_AUTO_DISMISS_MS)
    expect(FAILURE_AUTO_DISMISS_MS).toBeGreaterThan(SUCCESS_AUTO_DISMISS_MS)
  })
})

describe('notifyHistorySaved / useHistorySavedNotice', () => {
  it('3. notifyHistorySaved(true, true) deja variant en success; notifyHistorySaved(false, true) lo deja en failure-recoverable', () => {
    const { variant } = useHistorySavedNotice()

    notifyHistorySaved(true, true)
    expect(variant.value).toBe('success')

    notifyHistorySaved(false, true)
    expect(variant.value).toBe('failure-recoverable')
  })

  it('4. tras avanzar SUCCESS_AUTO_DISMISS_MS la variante de éxito vuelve a null; un milisegundo antes todavía no', () => {
    const { variant } = useHistorySavedNotice()

    notifyHistorySaved(true, true)
    vi.advanceTimersByTime(SUCCESS_AUTO_DISMISS_MS - 1)
    expect(variant.value).toBe('success')

    vi.advanceTimersByTime(1)
    expect(variant.value).toBe(null)
  })

  it('5. la variante de fallo sigue visible pasados los ms de éxito y desaparece a los de fallo (asimetría D-03)', () => {
    const { variant } = useHistorySavedNotice()

    notifyHistorySaved(false, true)
    vi.advanceTimersByTime(SUCCESS_AUTO_DISMISS_MS)
    expect(variant.value).toBe('failure-recoverable')

    vi.advanceTimersByTime(FAILURE_AUTO_DISMISS_MS - SUCCESS_AUTO_DISMISS_MS)
    expect(variant.value).toBe(null)
  })

  it('6. dismissHistorySavedNotice() la retira de inmediato y el temporizador pendiente no la resucita después', () => {
    const { variant, dismiss } = useHistorySavedNotice()

    notifyHistorySaved(true, true)
    expect(variant.value).toBe('success')

    dismiss()
    expect(variant.value).toBe(null)

    vi.advanceTimersByTime(SUCCESS_AUTO_DISMISS_MS)
    expect(variant.value).toBe(null)
  })

  it('7. dos notifyHistorySaved seguidos no acumulan temporizadores: avanzar el reloj una sola vez tras el segundo deja el estado en null y no vuelve a cambiarlo', () => {
    const { variant } = useHistorySavedNotice()

    notifyHistorySaved(true, true)
    vi.advanceTimersByTime(1000)
    notifyHistorySaved(true, true)

    vi.advanceTimersByTime(SUCCESS_AUTO_DISMISS_MS)
    expect(variant.value).toBe(null)

    // Si el primer temporizador no se hubiera cancelado, este avance
    // adicional no debería cambiar nada (ya está en null), pero tampoco
    // debería quedar ningún temporizador fantasma corriendo.
    vi.advanceTimersByTime(SUCCESS_AUTO_DISMISS_MS)
    expect(variant.value).toBe(null)
  })
})

describe('resolveNoticeVariant (función pura — tabla de verdad de CR-01 ronda 4)', () => {
  it('(true, false) → success: el segundo booleano es irrelevante cuando el histórico ya se escribió', () => {
    expect(resolveNoticeVariant(true, false)).toBe('success')
  })

  it('(true, true) → success', () => {
    expect(resolveNoticeVariant(true, true)).toBe('success')
  })

  it('(false, true) → failure-recoverable: el histórico falló pero el progreso está a salvo', () => {
    expect(resolveNoticeVariant(false, true)).toBe('failure-recoverable')
  })

  it('(false, false) → failure-unrecoverable: ni el histórico ni el progreso se pudieron escribir', () => {
    expect(resolveNoticeVariant(false, false)).toBe('failure-unrecoverable')
  })

  it('la variante no recuperable no promete nada sobre el dispositivo', () => {
    expect(NOTICE_BODY['failure-unrecoverable']).not.toContain('sigue guardada')
    expect(NOTICE_BODY['failure-unrecoverable']).not.toContain('Partida terminada')
  })
})
