---
quick_id: 260831-umh
slug: boton-partida-terminada-para-volver-a-ho
status: pending-human-verification
subsystem: ui-navegacion
tags: [overlay, confirm-dialog, persistencia, atajos-teclado, wake-lock, tts]
dependency-graph:
  requires:
    - app/components/ConfirmDialog.vue (sin modificar, reutilizado)
    - app/composables/usePersistedSession.ts (sin modificar, clear(gameId) reutilizado)
    - app/composables/useVoiceAnnouncer.ts (sin modificar, silence() ya expuesta)
  provides:
    - "salida explícita de la partida en curso: ≡ → «Partida terminada» → confirmar → inicio"
  affects:
    - app/pages/[game]/index.vue
    - app/components/IndexOverlay.vue
    - app/composables/useStepShortcuts.ts
tech-stack:
  added: []
  patterns:
    - "barra inferior shrink-0 en overlay flex-column (sin position:fixed propio)"
    - "ConfirmDialog apilado como hermano DOM tras otro fixed inset-0 z-50 (sin tocar z-index)"
    - "orden explícito silence() -> session=null -> clear() -> navigateTo() para evitar resurrección por watchDebounced"
key-files:
  created: []
  modified:
    - app/components/IndexOverlay.vue
    - app/composables/useStepShortcuts.ts
    - app/composables/__tests__/useStepShortcuts.test.ts
    - "app/pages/[game]/index.vue"
decisions:
  - "D-U1..D-U8 tomadas en planificación, aplicadas sin revisitar (ver PLAN.md)"
metrics:
  duration: "~35 min"
  completed: 2026-08-31
---

# Quick 260831-umh: Botón «Partida terminada» para volver al inicio — Summary

**One-liner:** Barra inferior del overlay del índice con «Partida terminada» → `ConfirmDialog`
apilado → borrado de `tga:progress:<gameId>` + corte de voz + `navigateTo('/')`, en el orden
exacto que evita que el autoguardado de 300ms resucite la clave borrada.

## Qué se construyó

1. **`IndexOverlay.vue`** — barra inferior fija (`shrink-0`, separador superior) con el botón
   destructivo no relleno «Partida terminada» (mismo estilo que «Empezar nueva» de
   `ResumePrompt.vue`). Nuevo emit `end-game` — el componente sigue siendo tonto: no borra nada,
   no navega, solo emite. Comentario de cabecera actualizado explicando por qué el botón vive
   aquí (D-U1).

2. **`useStepShortcuts.ts`** — sexto banderín `awaitingEndConfirm` en `ShortcutState`, añadido a
   la guarda de `shortcutsEnabled`. Los dos comentarios que decían «cinco estados de overlay»
   ahora dicen «seis», con la nota de por qué es deliberadamente redundante hoy (D-U6): el diálogo
   solo aparece con el índice abierto, pero el contrato de la función es «ningún overlay», no «el
   índice abierto».

3. **`useStepShortcuts.test.ts`** — `awaitingEndConfirm: false` en el helper `shortcutState()` y
   un test nuevo: `con la confirmación de partida terminada abierta -> false`.

4. **`app/pages/[game]/index.vue`** — `silence` desestructurada de `useVoiceAnnouncer`;
   `awaitingEndConfirm` ref; `endGameBody` computed (reutiliza `savedSummary`, nunca cadenas
   tecleadas a mano); tres manejadores:
   - `onEndGameRequest()` → abre la confirmación sin cerrar el índice (D-U3).
   - `onEndGameCancel()` → la cierra, no toca nada más.
   - `onEndGameConfirm()` → orden EXACTO de D-U4: baja `awaitingEndConfirm`/`isIndexOpen` →
     `silence()` → `session.value = null` → `clear(gameId)` → `navigateTo('/')`. Sin
     `releaseWakeLock()` explícito (D-U5): `navigateTo` desmonta la página y el
     `tryOnScopeDispose` interno de `useWakeLock` libera solo.
   - `atajosActivos` pasa `awaitingEndConfirm.value` a `shortcutsEnabled`.
   - Plantilla: `@end-game="onEndGameRequest"` en `IndexOverlay`; `ConfirmDialog` apilado como
     hermano JUSTO DESPUÉS (mismo mecanismo de pintado por orden en el DOM que
     `ResumePrompt`/su `ConfirmDialog` de descarte, sin tocar z-index).

## Verificación automatizada (completada)

- `npm run test` → **14 ficheros, 294 tests, todos en verde** (293 de base + 1 nuevo). Nota de
  proceso: en este worktree hubo que ejecutar `npx nuxi prepare` primero porque `.nuxt/` no
  existía (artefacto de build, gitignored, no es una desviación de código — solo el entorno
  local del worktree no lo tenía generado).
- `npm run generate` → completa sin error. 4 rutas prerenderizadas, PWA precache 65 entradas,
  ningún error de `window` durante el prerender.
- `git diff --stat` limita el cambio a los cuatro ficheros del plan exactamente:
  `app/components/IndexOverlay.vue`, `app/composables/useStepShortcuts.ts`,
  `app/composables/__tests__/useStepShortcuts.test.ts`, `app/pages/[game]/index.vue`.
  `content/marvel-champions.json`, `package.json` y `usePersistedSession.ts` no aparecen.
- `grep -v '^\s*//' app/composables/useStepShortcuts.ts | grep -c awaitingEndConfirm` → **2**
  (la propiedad de la interfaz y la guarda de `shortcutsEnabled`), no más.
- `grep -n "localStorage" "app/pages/[game]/index.vue"` → sin resultados: la página sigue sin
  tocar el almacenamiento directamente.
- Working tree limpio tras cada commit: sin ficheros generados por `npm run generate` quedando
  sin trackear (`.output/`, `.nuxt/`, `node_modules/.cache/` están gitignored).

## Deviations from Plan

None — plan ejecutado tal y como estaba escrito. La única acción fuera de las tareas del plan
fue ejecutar `npx nuxi prepare` para regenerar `.nuxt/tsconfig.app.json`, un artefacto de build
gitignored que no existía en este worktree; no modifica ningún fichero versionado y no cuenta
como desviación de código (Regla 3, blocker de entorno, sin instalación de paquetes).

## Checkpoint humano — PENDIENTE, no ejecutado por este agente

La Tarea 3 del plan es `type="checkpoint:human-verify"` con `gate="blocking"`: requiere
interacción táctil real en `npm run dev` / tablet, que este agente no puede realizar. Se deja
literal para que el usuario la ejecute y reporte el resultado ("aprobado" o el número de paso
que falla). Su resultado NO se fabrica ni se asume.

**Qué se construyó (contexto para quien verifique):**
Un botón «Partida terminada» en la barra inferior del overlay del índice (≡) de la pantalla de
juego. Al pulsarlo aparece un diálogo de confirmación destructivo con el resumen de la partida
que se va a perder. Al confirmar: se corta la locución, se borra el progreso guardado de ese
juego y la app vuelve a la pantalla de inicio (selector de juego). La preferencia de voz NO se
borra. Nada más de la interfaz ha cambiado: misma cabecera, mismo SIGUIENTE, mismo índice.

**Cómo verificar (pasos literales del plan):**

Con `npm run dev` abierto en el navegador (idealmente también en la tablet):

1. **Camino feliz.** Entra en Marvel Champions, elige 3 jugadores / Normal y avanza 5 o 6 pasos
   con SIGUIENTE. Pulsa **≡**. Comprueba que el botón «Partida terminada» está abajo del todo,
   con borde rojo y fondo transparente, y que **la lista de pasos sigue pudiendo desplazarse por
   detrás sin que el botón se mueva ni se encoja**.
2. **Cancelar no rompe nada.** Pulsa «Partida terminada» → aparece el diálogo por ENCIMA del
   índice, con el resumen correcto (p. ej. «PREPARACIÓN · 6 de 23 · 3 jug · Normal»). Pulsa
   «Cancelar»: vuelves al índice tal y como estaba (no al paso). Cierra el índice con ✕ y
   comprueba que sigues en el MISMO paso de antes.
3. **Confirmar lleva al inicio.** ≡ → «Partida terminada» → «Sí, terminar». Debes acabar en el
   selector de juego.
4. **Lo importante: ya no hay partida.** Vuelve a entrar en Marvel Champions. Debe aparecer el
   **mini-setup** (nº de jugadores / dificultad). Si aparece «Partida guardada · ¿Continuar o
   empezar nueva?», el borrado ha fallado — repórtalo.
5. **Sobrevive a cerrar la app.** Repite: empieza otra partida, avanza unos pasos, termínala con
   el botón, **cierra del todo la pestaña/la app y vuelve a abrirla**. Entra en el juego: otra
   vez mini-setup, no partida en curso.
6. **La voz no se queda hablando.** Con la voz activada, pulsa SIGUIENTE y, MIENTRAS está
   locutando, haz ≡ → «Partida terminada» → «Sí, terminar». La voz debe cortarse; no debe seguir
   hablando ya en el selector.
7. **La preferencia de voz sobrevive.** Silencia la voz con el icono de la cabecera, termina la
   partida, empieza una nueva y comprueba que la voz **sigue silenciada** (no debe reactivarse
   sola).
8. **Carrera del autoguardado.** Pulsa SIGUIENTE y, sin esperar, encadena lo más rápido que
   puedas ≡ → «Partida terminada» → «Sí, terminar». Espera 2-3 segundos en el selector, vuelve a
   entrar en el juego: mini-setup, nunca «Partida guardada».
9. **Nada por detrás del diálogo (si usas portátil).** Con el diálogo de confirmación abierto,
   pulsa Espacio y la flecha izquierda varias veces: no debe pasar absolutamente nada (ni
   avanzar, ni retroceder, ni confirmar). Cancela y comprueba que sigues en el mismo paso.
10. **En la tablet, a un brazo de distancia:** ¿el botón se lee bien y NO compite con SIGUIENTE?
    ¿Te parece que podríais pulsarlo por accidente a media partida?

**Resume-signal esperado:** Escribe "aprobado" o describe qué falla (indicando el número del
paso).

## Notas para el futuro (del `<output>` del plan)

- **`MesaListaScreen.vue`** tiene cabecera propia SIN ≡, así que desde «Mesa lista» no se llega
  al botón «Partida terminada». No es un hueco: esa pantalla tiene «‹ Atrás», que devuelve al
  último paso, donde el ≡ sí está (D-U8).
- **`ResumePrompt`** conserva su propio «Empezar nueva» con semántica distinta: borra el
  progreso y deja al usuario en el mini-setup del MISMO juego («quiero otra partida de esto»),
  frente a «Partida terminada», que lleva al inicio («hemos terminado»). Unificarlos sería una
  decisión de producto, no una limpieza de código — no se ha tocado.
- **Sin cobertura de Playwright** para este flujo. El comportamiento clave (volver a entrar
  muestra el mini-setup, no la partida) lo cubre el checkpoint humano de forma directa y barata;
  el candidato natural si se amplía la suite de `e2e/` es un spec que compruebe que, tras
  terminar la partida y recargar, aparece el mini-setup.

## Threat Flags

Ninguna. Los seis STRIDE (T-umh-01..06) del `<threat_model>` del plan cubren toda la superficie
tocada; no se detectó ninguna superficie nueva fuera de lo previsto (sin red, sin nuevo endpoint,
sin cambio de esquema, borrado acotado a `clear(gameId)` sin ampliar).

## Known Stubs

Ninguno.

## Self-Check

Ficheros modificados (existencia verificada):
- FOUND: app/components/IndexOverlay.vue
- FOUND: app/composables/useStepShortcuts.ts
- FOUND: app/composables/__tests__/useStepShortcuts.test.ts
- FOUND: app/pages/[game]/index.vue

Commits (existencia verificada en `git log`):
- FOUND: 1db4bdb — feat(260831-umh): botón «Partida terminada» en la barra inferior del índice
- FOUND: 30ef579 — feat(260831-umh): cablear borrado + navegación de «Partida terminada»

## Self-Check: PASSED
