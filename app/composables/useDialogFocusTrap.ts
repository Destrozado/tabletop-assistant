// app/composables/useDialogFocusTrap.ts
//
// Trampa de foco de GameOutcomeDialog (quick 260923-3rm, cierre de WR-02/
// WR-03 ronda 4, `09-REVIEW-ronda4.md`): `GameOutcomeDialog.vue` declara
// `role="dialog" aria-modal="true"`, pero `StepScreen`, `NavBand`,
// `AppHeader` e `IndexOverlay` seguían en el DOM sin `inert`/`aria-hidden` y
// seguían siendo tabulables — `Tab` podía sacar el foco del diálogo hacia un
// «SIGUIENTE» invisible detrás del velo, y `Enter` habría avanzado la
// partida con el diálogo de cierre abierto (WR-02). Además, la restauración
// de foco al cerrar (`previouslyFocused.focus()`) era inalcanzable en las
// cuatro salidas reales porque `IndexOverlay` y `GameOutcomeDialog` se
// desmontan en el mismo flush, dejando el nodo desprendido del DOM (WR-03).
//
// El foco inicial va al CONTENEDOR (`container.value?.focus()`), nunca a
// ningún botón de resultado (D-02, 09-UI-SPEC.md §Layout 2): los tres
// botones de registro son deliberadamente iguales en peso visual, y
// depositar el foco sobre el primero empujaría al grupo hacia esa opción —
// exactamente lo que D-02 prohíbe, ahora también en la capa de
// accesibilidad. Enfocar el panel mete al usuario de teclado dentro del
// diálogo sin preseleccionar nada: el siguiente `Tab` cae en el primer botón
// de resultado, el `Shift+Tab` en «Salir sin registrar».
//
// Por qué la restauración de foco (WR-03) NO hace nada útil en las cuatro
// salidas reales de este diálogo, y por qué eso es intencional: en las
// cuatro (GANADA / PERDIDA · Plan Principal / PERDIDA · Héroes eliminados /
// Salir sin registrar) el botón que abrió este diálogo (el «Partida
// terminada» de `IndexOverlay.vue`) se desmonta en el MISMO flush de Vue en
// el que se cierra este diálogo, y la página navega a `/` — el nodo
// previamente enfocado ya no está conectado al DOM cuando `onUnmounted` se
// ejecuta, así que `resolveRestoreTarget` devuelve `null` y no se llama a
// `focus()` sobre nada. Este composable no protege esas cuatro salidas: las
// protege de un `TypeError`/comportamiento indefinido si algún día existiera
// un QUINTO cierre no terminal de este diálogo (p. ej. un botón «Cancelar»
// futuro que NO navegara) — ese caso sí encontraría su `previouslyFocused`
// todavía conectado y restauraría el foco correctamente.
import type { Ref } from 'vue'
import { onMounted, onUnmounted } from 'vue'

// Función pura: dado el índice actual dentro de una lista de `count`
// botones (`-1` si el foco está fuera de la lista, incluido el caso de
// llegar al diálogo desde fuera con un `Tab`/`Shift+Tab`), devuelve el
// siguiente índice al que mover el foco. `null` solo cuando no hay ningún
// botón enfocable (`count <= 0`) — un diálogo real siempre tiene al menos
// uno («Salir sin registrar»), pero la función es total sobre cualquier
// `count`, nunca lanza.
export function nextTrappedIndex(currentIndex: number, count: number, backwards: boolean): number | null {
  if (count <= 0) return null
  if (backwards) {
    const previous = currentIndex - 1
    return previous < 0 ? count - 1 : previous
  }
  const next = currentIndex + 1
  return next >= count ? 0 : next
}

// Función pura y genérica (WR-03): solo devuelve el nodo previamente
// enfocado si SIGUE conectado al DOM en el instante de restaurar — nunca se
// llama `.focus()` sobre un nodo desprendido. Genérica sobre cualquier forma
// con `isConnected` para que el test pueda ejercerla con objetos sintéticos
// sin necesidad de un `HTMLElement` real.
export function resolveRestoreTarget<T extends { isConnected: boolean }>(previous: T | null): T | null {
  if (previous === null) return null
  return previous.isConnected ? previous : null
}

// Cableado (D-Q2, mismo criterio que useStepShortcuts.ts): las funciones
// puras de arriba se prueban solas; este composable solo las conecta al DOM
// real. Un único listener `keydown` en `window`, dado de alta en
// `onMounted` y retirado en `onUnmounted` — mismo patrón de alta/baja que
// `WarningDetailModal.vue`.
export function useDialogFocusTrap(container: Ref<HTMLElement | null>): void {
  let previouslyFocused: HTMLElement | null = null

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return
    const panel = container.value
    if (!panel) return

    const buttons = Array.from(panel.querySelectorAll<HTMLButtonElement>('button:not([disabled])'))
    if (buttons.length === 0) return

    // `indexOf` devuelve -1 tanto si el foco está en un elemento ajeno al
    // diálogo (p. ej. tras un toque sobre el velo, que no existe en este
    // componente pero sí en el patrón general) como si `document.activeElement`
    // no es ninguno de los botones — en los dos casos el índice -1 es
    // exactamente lo que `nextTrappedIndex` espera para "fuera de la lista".
    const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const next = nextTrappedIndex(currentIndex, buttons.length, event.shiftKey)
    if (next === null) return

    // El caso que cierra WR-02: aunque el foco estuviera FUERA del diálogo
    // (currentIndex === -1, p. ej. si algo lo hubiera movido ahí), este
    // `preventDefault()` + `focus()` lo trae de vuelta dentro en vez de
    // dejar que el navegador complete el `Tab` nativo hacia un control
    // invisible detrás del velo.
    event.preventDefault()
    buttons[next]?.focus()
  }

  onMounted(() => {
    previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    container.value?.focus()
    window.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
    // WR-03: nunca `.focus()` sobre un nodo desprendido — ver el
    // razonamiento largo en la cabecera de este fichero sobre por qué esto
    // es un no-op en las cuatro salidas reales de GameOutcomeDialog.vue.
    resolveRestoreTarget(previouslyFocused)?.focus()
  })
}
