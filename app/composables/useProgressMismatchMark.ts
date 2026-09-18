// app/composables/useProgressMismatchMark.ts
//
// RED (plan 09-33, Task 1): implementación deliberadamente incompleta.
// `markProgressMismatch` todavía no añade nada al conjunto, así que
// `readProgressMismatchWarning` no puede devolver el aviso todavía — el
// test de la Task 1 debe fallar por esta razón exacta, no por un fallo de
// carga del módulo. GREEN (siguiente commit) completa `markProgressMismatch`
// y añade el resto de la documentación definitiva del fichero.
//
// PROGRESS_MISMATCH_WARNING lleva aquí un texto PROVISIONAL: el texto
// definitivo, con su comprobación de respaldo oración a oración, lo fija la
// Task 3 de este mismo plan (09-33-PLAN.md). Se anota explícitamente como
// provisional para que quede claro en el historial de commits.
const juegosConProgresoQueNoCoincide = new Set<string>()

export const PROGRESS_MISMATCH_WARNING = 'Aviso: la última partida de este juego no pudo registrarse correctamente. (Texto provisional, pendiente de la Task 3 de 09-33-PLAN.md.)'

export function markProgressMismatch(_gameId: string): void {
  // TODO(RED, Task 1, 09-33): todavía no añade nada al conjunto.
}

export function clearProgressMismatch(gameId: string): void {
  juegosConProgresoQueNoCoincide.delete(gameId)
}

export function readProgressMismatchWarning(gameId: string): string | null {
  return juegosConProgresoQueNoCoincide.has(gameId) ? PROGRESS_MISMATCH_WARNING : null
}
