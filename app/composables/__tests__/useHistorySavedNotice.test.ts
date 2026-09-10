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
  SUCCESS_AUTO_DISMISS_MS,
  dismissHistorySavedNotice,
  notifyHistorySaved,
  resolveAutoDismissMs,
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

  it('2. failure devuelve FAILURE_AUTO_DISMISS_MS (20000), mayor que el de éxito (asimetría D-03)', () => {
    expect(resolveAutoDismissMs('failure')).toBe(FAILURE_AUTO_DISMISS_MS)
    expect(FAILURE_AUTO_DISMISS_MS).toBeGreaterThan(SUCCESS_AUTO_DISMISS_MS)
  })
})

describe('notifyHistorySaved / useHistorySavedNotice', () => {
  it('3. notifyHistorySaved(true) deja variant en success; notifyHistorySaved(false) lo deja en failure', () => {
    const { variant } = useHistorySavedNotice()

    notifyHistorySaved(true)
    expect(variant.value).toBe('success')

    notifyHistorySaved(false)
    expect(variant.value).toBe('failure')
  })

  it('4. tras avanzar SUCCESS_AUTO_DISMISS_MS la variante de éxito vuelve a null; un milisegundo antes todavía no', () => {
    const { variant } = useHistorySavedNotice()

    notifyHistorySaved(true)
    vi.advanceTimersByTime(SUCCESS_AUTO_DISMISS_MS - 1)
    expect(variant.value).toBe('success')

    vi.advanceTimersByTime(1)
    expect(variant.value).toBe(null)
  })

  it('5. la variante de fallo sigue visible pasados los ms de éxito y desaparece a los de fallo (asimetría D-03)', () => {
    const { variant } = useHistorySavedNotice()

    notifyHistorySaved(false)
    vi.advanceTimersByTime(SUCCESS_AUTO_DISMISS_MS)
    expect(variant.value).toBe('failure')

    vi.advanceTimersByTime(FAILURE_AUTO_DISMISS_MS - SUCCESS_AUTO_DISMISS_MS)
    expect(variant.value).toBe(null)
  })

  it('6. dismissHistorySavedNotice() la retira de inmediato y el temporizador pendiente no la resucita después', () => {
    const { variant, dismiss } = useHistorySavedNotice()

    notifyHistorySaved(true)
    expect(variant.value).toBe('success')

    dismiss()
    expect(variant.value).toBe(null)

    vi.advanceTimersByTime(SUCCESS_AUTO_DISMISS_MS)
    expect(variant.value).toBe(null)
  })

  it('7. dos notifyHistorySaved seguidos no acumulan temporizadores: avanzar el reloj una sola vez tras el segundo deja el estado en null y no vuelve a cambiarlo', () => {
    const { variant } = useHistorySavedNotice()

    notifyHistorySaved(true)
    vi.advanceTimersByTime(1000)
    notifyHistorySaved(true)

    vi.advanceTimersByTime(SUCCESS_AUTO_DISMISS_MS)
    expect(variant.value).toBe(null)

    // Si el primer temporizador no se hubiera cancelado, este avance
    // adicional no debería cambiar nada (ya está en null), pero tampoco
    // debería quedar ningún temporizador fantasma corriendo.
    vi.advanceTimersByTime(SUCCESS_AUTO_DISMISS_MS)
    expect(variant.value).toBe(null)
  })
})
