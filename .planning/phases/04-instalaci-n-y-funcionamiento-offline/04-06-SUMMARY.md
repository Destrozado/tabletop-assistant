---
phase: 04-instalaci-n-y-funcionamiento-offline
plan: 06
subsystem: infra
tags: [playwright, ci, pwa, offline, service-worker, human-verification, checkpoint]

# Dependency graph
requires:
  - phase: 04-instalaci-n-y-funcionamiento-offline (plan 04)
    provides: "precache real de 37 audios + HTML/JS/CSS/iconos/fuente/manifest, flujo offline en verde"
  - phase: 04-instalaci-n-y-funcionamiento-offline (plan 05)
    provides: "banda de versión nueva descartable (D-01/D-02), prueba de no-recarga espontánea"
provides:
  - ".github/workflows/ci.yml amplia el job `test` existente con Playwright (Task 1, ya mergeado en 4eef19f): install browsers, run e2e, subir informe solo en fallo"
  - "veredicto humano registrado para OFF-01/OFF-02/OFF-03/OFF-04 contra el despliegue real de producción, en un dispositivo Android real (no la tablet objetivo)"
  - "confirmación de que el bug audio-corta-y-reinicia no se reproduce con el service worker activo"
  - "corrección documental: el checkpoint de este mismo plan y las instrucciones dadas al usuario tenían un error sobre el comportamiento esperado de la banda tras cerrar y reabrir la app"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/phases/04-instalaci-n-y-funcionamiento-offline/04-06-SUMMARY.md
  modified: []

key-decisions:
  - "El veredicto humano se registra por bloques separados (instalación, offline+voz, banda de actualización, regresión de audio, orientación), nunca como un 'aprobado' global, tal como exige el acceptance criteria del plan."
  - "El bloqueante de Fase 1 sobre modelo/SO de la tablet NO se cierra con esta prueba: se hizo en un móvil Android, no en la tablet de mesa. Se documenta explícitamente como seguir abierto, en vez de darlo por resuelto porque 'hubo una prueba en Android'."
  - "Se corrige un error propio de este plan: el guion de verificación (`<how-to-verify>` paso 3.4) y las instrucciones dadas al usuario decían que la banda debía reaparecer al cerrar y reabrir la app tras aplicar una actualización. Esto es incorrecto — es el comportamiento esperado de un service worker en modo 'prompt' (el worker en espera se activa al cerrar el último cliente, así que al reabrir ya no hay nada que anunciar). Se documenta como error de documentación a corregir, no como defecto de la app."
  - "El criterio de amenaza que exigía 404 literal para voice-probe.html no es alcanzable con el hosting SSG actual (Nuxt sirve 200.html como fallback para cualquier ruta inexistente); se registra el riesgo real (el fichero probe ya no existe en el build, los clips de _probe devuelven 404 limpio) como resuelto, sin fingir que el criterio literal se cumplió."

requirements-completed: [OFF-01, OFF-02, OFF-03, OFF-04]

# Metrics
duration: ~20min
completed: 2026-08-31
---

# Fase 4 Plan 06: CI con Playwright y veredicto humano en dispositivo real Summary

**Task 1 (Playwright enganchado a `.github/workflows/ci.yml`) ya estaba mergeado antes de este plan; este plan cierra la Task 2 registrando el veredicto humano — probado en un móvil Android real contra el despliegue de producción, no en la tablet de mesa objetivo — con los cuatro requisitos OFF-01 a OFF-04 en PASS por bloques separados, y documentando dos gaps que quedan abiertos: el modelo/SO de la tablet real y un error de documentación propio sobre cuándo debe reaparecer la banda de actualización.**

## Performance

- **Duration:** ~20 min (solo Task 2: registrar el veredicto ya recibido y redactar este SUMMARY)
- **Completed:** 2026-08-31
- **Tasks:** 2/2 (Task 1 ya completada y mergeada en un commit previo; Task 2 es este SUMMARY)
- **Files modified:** 1 (`04-06-SUMMARY.md`, este fichero)

## Task 1 — ya hecho (referencia, no repetido en este plan)

`.github/workflows/ci.yml` ya contiene, desde el commit `4eef19f` (mergeado antes de arrancar este plan), los steps "Install Playwright browsers" (`npx playwright install --with-deps chromium`) y "Run E2E tests" (`npx playwright test`) después de "Run tests", más "Upload Playwright report" condicionado a `if: failure()` con `retention-days: 7`. `permissions: contents: read` se mantiene sin ampliar. Confirmado leyendo el fichero en este worktree — no se ha tocado ni se repite el commit.

## Task 2 — Veredicto humano registrado

### Evidencia automatizada previa al checkpoint (verificada por el orquestador en `main`)

- `npm run test` → **293/293**.
- `npx playwright test` → **11/11** (`offline-flow` 2, `portrait-usable` 2, `pwa-install` 4, `update-banner` 3).
- Precache de Workbox: **66 entradas, 1719 KiB**; **37/37** clips de audio coinciden con `public/audio/`; **cero** referencias a `_probe`/`voice-probe` en el manifiesto del service worker.
- CI ejecuta Vitest + Playwright en cada push, con informe HTML subido solo si falla.
- **Caveat honesto sobre `voice-probe.html`:** el criterio del threat model de la 03.1 exigía que esa ruta devolviera **404** literal en producción. Devuelve **200** — pero es el fallback SPA `200.html` de Nuxt, que responde 200 para **cualquier** ruta inexistente (comprobado con una URL inventada, también 200). El fichero probe está genuinamente fuera del build y los clips `_probe` sí devuelven 404 limpio. El riesgo real que el criterio pretendía cubrir está resuelto; el criterio literal de "404" no es alcanzable con este hosting SSG. Se registra así, sin marcarlo como aprobado sin matices.

### Dispositivo probado

**Móvil Android real** contra el despliegue de producción vivo en https://tabletop-assistant.vercel.app/. **NO es la tablet de mesa**, que es el dispositivo objetivo del roadmap (tablet en horizontal, junto a la mesa, legible a un brazo de distancia).

**Modelo exacto y versión de SO/navegador: NO proporcionados.** Este es un bloqueante abierto desde la Fase 1, se preguntó explícitamente y sigue sin respuesta. **No se cierra con este plan.**

### Bloque 1 — Instalación y pantalla completa (OFF-01): PASS

Palabras del usuario: *"He instalado la APP y se ha instalado bien y se abre en pantalla completa"*. Icono confirmado como el del proyecto, no uno genérico: *"El icono esta bien, es como un Play negro con fondo azul"*.

Mapea a Criterio de éxito 1 del ROADMAP ("El usuario puede instalar la app en la tablet y abrirla a pantalla completa, sin barra del navegador") — **cumplido en Android, no verificado todavía en la tablet real.**

### Bloque 2 — Offline a mitad de partida, con voz (OFF-02 / OFF-03): PASS

Palabras del usuario: *"tras poner el modo avion se sigue pudiendo avanzar y retroceder y suenan los audios"*.

Al cerrar y relanzar la app con la red aún cortada, se ejerció además el flujo de reanudación de la Fase 1 y el flush de guardado en `pagehide` añadido por el plan 04-04: *"vuelve a la pantalla de inicio de seleccion de juegos, ah pero al darle a marvel champions me sale el aviso de Partida guardada y puedo darle a continuar, y sigue donde estaba"*.

**Regresión de audio (`audio-corta-y-reinicia`) — NO reproducida.** El usuario avanzó rápido por muchos pasos seguidos, justo el guion del bug ya resuelto: *"parece el audio va bien aunque avance mucho me locuta solo la frase donde acabo"*. Narrar solo la frase del paso final es el comportamiento esperado de cancelar-y-hablar; el síntoma antiguo (sonar ~1s, cortarse, reiniciar la misma frase con una voz más robótica) no ocurrió, ahora con un service worker en medio del camino del audio.

Mapea a Criterio de éxito 2 y 3 del ROADMAP ("el flujo completo... funciona sin conexión a internet" / "si la conexión se cae a mitad de partida, la app sigue funcionando sin interrupción") — **cumplidos en Android**, incluida la voz y la reanudación tras cierre/relanzamiento.

### Bloque 3 — Banda de versión nueva (OFF-04): PASS, probado en dos despliegues distintos

- **Primer despliegue, con la app abierta:** *"He quitado el modo avion estando en la APP abierta, y al usarla un poco me ha salido el aviso de Nueva versión disponible, le he dado a actualizar y he podido seguir donde estaba."* Esto demuestra que la app **esperó** la decisión (nunca se recargó sola) y que la partida se reanudó en el mismo paso tras aplicar la actualización (D-02). La banda apareció solo tras recuperar la red — esperado: sin red el navegador no puede descubrir un despliegue nuevo.
- **Segundo despliegue, ruta de descarte:** *"Al darle a la X puedo seguir jugando"* — confirma que descartar (D-01) no bloquea el juego.
- El usuario reportó que la banda **no reapareció** tras cerrar completamente la app y relanzarla. **Esto es el comportamiento correcto de un service worker, no un defecto**: al cerrar el último cliente, el worker en espera se activa; al relanzar, la versión nueva ya está en marcha y no queda nada que anunciar.
- Se confirmó que la actualización se había aplicado de verdad: el usuario giró la tablet* a vertical y la app funcionó — la guarda de orientación solo se retiró en ese despliegue posterior, así que funcionar en vertical prueba que la versión nueva estaba activa. (*prueba hecha en el mismo móvil Android, no en la tablet.)

Mapea a Criterio de éxito 4 del ROADMAP ("cuando hay una versión nueva publicada, la app avisa y espera la decisión del usuario; nunca se recarga sola a mitad de ronda") — **cumplido en Android**, en dos despliegues reales consecutivos.

### Bloque adicional — Orientación vertical (fuera del alcance nominal de OFF-01..04, pero probado en la misma sesión)

Tras la retirada de la guarda de orientación (quick task `260831-mgd`, ya mergeada): *"Funciona bien el cambio de orientación la verdad, cero problemas"*.

## Correcciones a la documentación de este mismo plan

**Este plan (04-06) contenía un error en su propio guion de verificación**, repetido en las instrucciones dadas al usuario: el paso 3.4 de `<how-to-verify>` decía que la banda "Nueva versión disponible" debía reaparecer al cerrar y reabrir la app tras aplicar una actualización. Es incorrecto. Con `registerType: 'prompt'`, el service worker en espera se activa al perder su último cliente (al cerrar la app); al reabrir, la versión activa ya es la nueva y no hay nada pendiente que el `needRefresh` de `@vite-pwa/nuxt` pueda señalar. La ausencia de banda al relanzar es la señal correcta de que la actualización quedó aplicada, no un fallo del flujo. Se deja constancia aquí para que ningún plan futuro repita esta expectativa incorrecta al escribir un guion de prueba similar.

## Lo que NO queda validado (explícito, para no leer la fase como cerrada del todo)

1. **Modelo y versión de SO/navegador de la tablet real: sin proporcionar.** Bloqueante abierto desde la Fase 1, preguntado dos veces al usuario, sin respuesta. Sigue abierto tras este plan.
2. **Toda la prueba se hizo en un móvil Android, no en la tablet de mesa.** El dispositivo objetivo del ROADMAP es una tablet en horizontal, a un brazo de distancia. Preocupaciones específicas de tablet — legibilidad a esa distancia, la disposición física en la mesa — quedan sin verificar en el dispositivo real.
3. **"La banda nunca tapa ni desplaza el botón SIGUIENTE" no fue confirmado explícitamente por el usuario.** Dijo que pudo seguir jugando tras descartarla y tras actualizar, lo cual lo implica pero no lo prueba de forma directa. La garantía de "la app nunca se recarga sola" está cubierta por Playwright (`update-banner.spec.ts`); este punto concreto de layout descansa sobre la implicación del relato del usuario, no sobre una confirmación visual directa.
4. **Item `human_needed` de la Fase 2** (trampa de foco del modal en un iPad/Safari real) sigue abierto a nivel de hito, sin relación con esta fase — se menciona solo como referencia cruzada.

## Files Created/Modified

- `.planning/phases/04-instalaci-n-y-funcionamiento-offline/04-06-SUMMARY.md` (este fichero, creado).

Ningún fichero de código se modifica en esta Task 2 — es un checkpoint de verificación humana, tal como especifica el plan (`<files>ninguno</files>`).

## Task Commits

1. **Task 1: Añadir la suite de navegador al workflow de CI existente** — `4eef19f` (feat) — ya mergeado antes de arrancar este plan, no repetido.
2. **Task 2: Prueba humana bloqueante y firma de la fase (registro del veredicto)** — commit de este mismo plan (ver hash abajo tras `git commit` de este SUMMARY).

## Deviations from Plan

### Auto-fixed Issues

Ninguna — esta tarea es puramente de registro documental del veredicto humano ya recibido; no se ha tocado código.

### Corrección documental (no es un "fix" de Regla 1-3, es un error de guion detectado en este mismo plan)

Ver sección "Correcciones a la documentación de este mismo plan" arriba: el paso 3.4 del `<how-to-verify>` de este plan (04-06) y las instrucciones dadas al usuario tenían una expectativa incorrecta sobre el comportamiento del service worker al relanzar la app tras actualizar. Documentado para que no se repita en futuras pruebas similares.

## Issues Encountered

Ninguno bloqueante para el registro del veredicto. Los dos gaps de "Lo que NO queda validado" son limitaciones de cobertura de la prueba, no fallos de la app.

## User Setup Required

Ninguno.

## Next Phase Readiness

- Los cuatro requisitos OFF-01/OFF-02/OFF-03/OFF-04 tienen ahora verificación automática (Playwright en CI, 11/11) **y** confirmación en un dispositivo real — aunque ese dispositivo real es un móvil Android, no la tablet de mesa objetivo.
- El bloqueante de modelo/SO de la tablet, abierto desde la Fase 1, **sigue abierto** y debería resolverse antes de dar por cerrado el milestone, no solo la fase.
- Se recomienda una pasada de verificación específica en la tablet real (legibilidad a un brazo de distancia, disposición física) en cuanto esté disponible, aunque el riesgo funcional principal (offline, voz, actualización) ya está cubierto en un dispositivo Android real del mismo linaje de SO.

---
*Phase: 04-instalaci-n-y-funcionamiento-offline*
*Completed: 2026-08-31*
