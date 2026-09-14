// app/composables/useProgressMountPlan.ts
//
// La decisión de MONTAJE (plan 09-29, cierre de la mitad de montaje del Gap
// #1 de la ronda 6 y de CR-02/WR-02 de `09-REVIEW.md`).
//
// `onMounted` (`app/pages/[game]/index.vue`) enseña el mini-setup por TRES
// caminos distintos: no hay ninguna partida guardada (`stored === 'absent'`),
// la lectura del dispositivo ha fallado (`stored === 'unknown'`), o hay una
// posición guardada pero `resume()` ya la ha degradado a `outcome: 'fresh'`
// por ser inservible. Mientras el montaje consumiera solo `informe.outcome`
// (que vale `'fresh'` en los TRES casos), los tres eran indistinguibles en
// pantalla — y el aviso de fallo, antes de este plan, le pedía al grupo que
// dedujera la ausencia de la propia aparición del mini-setup (frase ya
// retirada por el plan 09-28). Esta función cierra la otra mitad: que el
// propio montaje deje de presentar el mini-setup como si hubiera comprobado
// el dispositivo cuando no ha podido.
//
// `planProgressMount` es una función pura y TOTAL sobre los cuatro valores
// de `StoredProgress`: recorrerlos produce cuatro resultados, ninguno
// `undefined`, y `'absent'`/`'unknown'` producen resultados DISTINTOS — el
// hueco exacto que este plan cierra. La guarda `never` del `switch` de abajo
// convierte un quinto valor futuro de `StoredProgress` en un error de
// `npm run typecheck`, no en una rama `else` silenciosa.
//
// Mismo patrón que `useHistorySavedNotice.ts` (`planGameEnd`/`NOTICE_BODY`):
// decisión pura + copy como dato exportado, para que una afirmación sobre
// los datos del grupo sea comprobable por un test puro y no viva suelta en
// una plantilla.
import type { ResumeOutcome } from '~~/engine/persistence'
import type { StoredProgress } from '~/composables/useStoredProgress'

export type MountAction = 'resume-prompt' | 'content-changed-notice' | 'mini-setup'

export interface ProgressMountPlan {
  action: MountAction
  unverifiedNotice: string | null
}

// Afirma exactamente lo que `stored === 'unknown'` respalda —que la lectura
// del dispositivo ha fallado— y nada más. No dice que no haya partida (eso
// es lo que la ronda 6 encontró que la app no podía afirmar sin comprobarlo:
// Gap #1 de `09-VERIFICATION.md`), no promete que la haya, y avisa de la
// consecuencia real de seguir adelante desde el mini-setup — que es la única
// acción que el grupo puede tomar desde aquí. La copy vive en este fichero y
// no en la plantilla por la misma razón que `NOTICE_BODY`: una afirmación
// sobre los datos del grupo tiene que ser comprobable por un test puro.
export const UNVERIFIED_PROGRESS_NOTICE
  = 'No hemos podido comprobar si este dispositivo tiene una partida guardada de este juego. Podéis empezar una nueva, pero si había alguna, al guardar la nueva podríais sustituirla.'

export function planProgressMount(stored: StoredProgress, outcome: ResumeOutcome): ProgressMountPlan {
  switch (stored) {
    case 'resumable':
    case 'stale':
      // `'stale'` no cambia lo que la app puede HACER al montar: la partida
      // sigue en el dispositivo y se ofrece igual (`resume-prompt`) o con el
      // aviso de contenido cambiado, según `outcome`. Al montar no hay
      // ninguna sesión con la que `readStoredProgress` pudiera comparar
      // (`onMounted` la llama sin `esperada`), así que `'stale'` es en la
      // práctica inalcanzable aquí — pero la rama existe para que la función
      // siga siendo total sobre los cuatro valores del tipo.
      return {
        action: outcome === 'content-changed' ? 'content-changed-notice' : 'resume-prompt',
        unverifiedNotice: null,
      }
    case 'absent':
      // Se ha comprobado el dispositivo y no hay nada que ofrecer: el
      // mini-setup aparece sin ningún aviso, porque no hay nada no
      // comprobado que decir.
      return { action: 'mini-setup', unverifiedNotice: null }
    case 'unknown':
      // La ÚNICA entrada que produce aviso: la lectura ha fallado y el
      // mini-setup no puede presentarse como si el dispositivo se hubiera
      // comprobado.
      return { action: 'mini-setup', unverifiedNotice: UNVERIFIED_PROGRESS_NOTICE }
    default: {
      const _exhaustivo: never = stored
      throw new Error(`planProgressMount: valor de StoredProgress no contemplado: ${_exhaustivo}`)
    }
  }
}
