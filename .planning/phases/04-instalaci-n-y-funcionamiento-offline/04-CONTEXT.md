# Phase 4: Instalación y funcionamiento offline - Context

**Gathered:** 2026-08-31
**Status:** Ready for planning

<domain>
## Phase Boundary

La app se instala en la tablet como aplicación (pantalla completa, sin barra del
navegador) y el flujo guiado completo —incluida la voz— funciona sin conexión
después de una sola visita. Cuando se publica una versión nueva, el grupo decide
cuándo aplicarla; la app nunca se recarga sola.

**En alcance:** módulo PWA y su configuración, manifiesto de instalación con sus
iconos, estrategia de precacheo del service worker, banda de "versión nueva"
como superficie visible, y una suite pequeña de pruebas de navegador para lo que
los tests unitarios no pueden cubrir.

**Fuera de alcance:** cualquier trabajo responsive o de adaptación a móvil (ver
D-08); cambiar el contenido de las frases; tocar la capa de voz de las Fases 3 y
3.1 más allá de lo que exija el precacheo.

**Dependencia dura con la Fase 03.1:** esta fase se verifica con los **37 clips
de audio generados**. Hoy hay 9. La fase 03.1 sigue abierta (plan 03.1-03
parcial, plan 03.1-06 sin empezar) y la verificación de OFF-02 y OFF-03 aquí
**no puede darse por buena** hasta que el lote esté completo. Planificar y
ejecutar sí se puede antes; cerrar la fase no.

</domain>

<decisions>
## Implementation Decisions

### Aviso de versión nueva (OFF-04)
- **D-01:** La banda es **descartable y no vuelve en toda la sesión**. Una vez
  descartada, no reaparece hasta que se abra la app de nuevo. Motivo: coherencia
  con D-45 de la Fase 3 y con la banda de "sin voz española" — nada que atender a
  mitad de partida. Se acepta conscientemente que el grupo pueda terminar la
  tarde con una versión vieja: en una app sin backend eso casi nunca importa.
- **D-02:** Pulsar "actualizar" **aplica la actualización al momento**, sin
  esperar al fin de ronda. La partida vive en `localStorage` y se reanuda en el
  mismo paso —comportamiento ya verificado desde la Fase 1—, así que recargar es
  seguro. Se descartó "aplicar al terminar la ronda" por meter estado nuevo que
  mantener y un retardo entre pulsar y ver el efecto.
- **D-03:** `registerType: 'prompt'`, nunca `'autoUpdate'`. Decisión heredada del
  documento de stack, no reabierta aquí.

### Precacheo (OFF-02, OFF-03)
- **D-04:** Los **37 audios entran en el precacheo** del service worker. Con una
  sola visita queda todo en local, aunque el grupo no haya empezado partida — que
  es literalmente lo que pide OFF-02. Workbox versiona cada fichero por hash, así
  que un clip regenerado (D-10/D-11 de la 03.1) se actualiza solo en la siguiente
  versión. Coste aceptado: ~650 KB de descarga en segundo plano la primera vez.
- **D-05:** La precarga de la Fase 03.1 (`usePreloadedAudio.ts`, D-09) **se
  queda** como segunda capa. Cubre la ventana de la primera visita, antes de que
  el service worker esté activo. Ya está construida y verificada en dispositivo;
  si el fichero ya está en la caché del SW, la petición se resuelve en local y no
  cuesta red. **Las dos capas se solapan a propósito** — no es duplicación por
  descuido, y quien planifique no debe "simplificar" retirando una.

### Identidad instalada (OFF-01)
- **D-06:** El icono se **genera con la tipografía y los colores que la app ya
  usa** — iniciales o un símbolo geométrico sobre fondo sólido, producido por
  código y versionado. Cero dependencias nuevas.
- **D-07:** El icono **no puede llevar arte de Marvel Champions ni de Fantasy
  Flight Games**. La restricción legal del proyecto cubre las reglas para uso
  privado; un icono con arte con copyright en la pantalla de inicio es otra cosa.
- **D-08:** **No se fuerza la orientación** en el manifiesto. Palabras del
  usuario: *"si alguien la quiere usar en el móvil que pueda hacerlo sin
  problemas, lo verá peor pero es un tema de espacio, yo no forzaría nada"*.
  Implicación para quien planifique: que la app se vea peor en móvil es
  **aceptable y esperado**, no un defecto a corregir. No hay trabajo responsive
  en esta fase.

### Verificación (OFF-02, OFF-03)
- **D-09:** Se añade **Playwright con una suite pequeña**: que el service worker
  se registra, que el flujo completo funciona con `setOffline(true)`, y que la
  banda de versión nueva aparece y no recarga sola. Es justo lo que los tests
  unitarios no pueden cubrir y lo que es caro de repetir a mano en cada
  despliegue. Se acepta la dependencia de desarrollo nueva y el coste en CI.
- **D-10:** OFF-03 se da por bueno con una **prueba humana en la tablet real:
  empezar partida, activar modo avión a mitad, y terminarla incluida la voz**.
  `setOffline` en un navegador de escritorio no es lo mismo que un Android
  perdiendo la wifi. Playwright complementa, no sustituye.

### Claude's Discretion
- Qué módulo PWA concreto y con qué configuración exacta (el stack apunta a
  `@vite-pwa/nuxt`, pero la versión y las opciones las fija la investigación).
- Estrategia de caché por tipo de recurso más allá de los audios.
- Cómo se genera el icono y en qué tamaños, mientras respete D-06 y D-07.
- Dónde vive la banda de actualización en el árbol de componentes y cómo se
  cablea con el registro del service worker.
- Estructura de la suite de Playwright y cómo se engancha a CI.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Decisiones de stack ya tomadas (leer PRIMERO — no reabrirlas)
- `CLAUDE.md` §"Rationale for the two decisions" — por qué `nuxt generate` y no
  `ssr:false`, y por qué `registerType: 'prompt'` y no `'autoUpdate'`.
- `CLAUDE.md` §"Hosting: Vercel (in use)" — las cabeceras de caché viven en
  `nitro.routeRules`, NUNCA en configuración del host. No reintroducir
  `netlify.toml` ni un `vercel.json` para cabeceras.
- `CLAUDE.md` §"What NOT to Use" — `registerType: 'autoUpdate'` está
  explícitamente descartado para esta app.

### Estado del código que esta fase toca
- `nuxt.config.ts` — **las reglas de `routeRules` para `/sw.js` y
  `/manifest.webmanifest` YA ESTÁN ESCRITAS**, puestas de antemano en una fase
  anterior precisamente para no olvidarlas al instalar el módulo. También está
  la regla de `/audio/**` con `max-age=0, must-revalidate` (T-03.1-15), que es
  deliberadamente distinta del `immutable` de `/fonts/**`.
- `app/composables/usePreloadedAudio.ts` — la precarga de D-09 de la 03.1, que
  D-05 manda conservar.
- `app/composables/useVoiceAnnouncer.ts` — la capa de voz; el precacheo no debe
  alterar su comportamiento.

### Capa de voz que el offline tiene que respetar
- `.planning/phases/03.1-.../03.1-CONTEXT.md` — D-07 (respaldo silencioso), D-08
  (salto de calidad aceptado), D-09 (precarga al empezar partida).
- `.planning/debug/resolved/audio-corta-y-reinicia.md` — el bug del solape entre
  audio y síntesis, resuelto y confirmado en dispositivo. Cualquier cambio en el
  camino de audio debe no reintroducirlo.

### Requisitos
- `.planning/REQUIREMENTS.md` — OFF-01, OFF-02, OFF-03, OFF-04.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`nuxt.config.ts` ya tiene la mitad del trabajo de cabeceras hecho.** Las
  cuatro reglas de `routeRules` existen y están comentadas explicando por qué.
  El módulo PWA se instala sobre terreno preparado.
- **La banda de "sin voz española" de la Fase 3** es el precedente exacto de la
  banda de actualización: no modal, descartable, no bloquea el botón SIGUIENTE.
  Copiar ese patrón en vez de inventar otro.
- **`public/`** ya contiene `favicon.ico`, `fonts/`, `robots.txt` y `audio/`. Los
  iconos del manifiesto van aquí y el precacheo los recoge por glob.
- **`app/composables/usePersistedSession.ts`** — la partida sobrevive a una
  recarga; es lo que hace segura la decisión D-02.

### Established Patterns
- Todo el código de APIs del navegador sigue la forma
  `try { ... } catch { /* comentario citando la decisión */ }` — sin logging, sin
  error visible. El registro del service worker debe seguirla.
- Los gates de contenido y los tests unitarios viven en `engine/__tests__/` y
  `app/composables/__tests__/`, y corren en CI con `npm run test` (278 tests hoy).
  Playwright será un runner **aparte**, no mezclado con Vitest.
- El proyecto no tiene ninguna dependencia PWA todavía: 7 dependencias y 3 de
  desarrollo. Playwright sería la cuarta de desarrollo.

### Integration Points
- `nuxt.config.ts` — donde entra el módulo y la configuración del manifiesto.
- `public/` — iconos generados y audios que se precachean.
- El componente raíz o el layout — donde vive la banda de actualización.
- `.github/workflows/ci.yml` — donde engancha la suite de Playwright.

</code_context>

<specifics>
## Specific Ideas

- La prueba que cierra OFF-03, en palabras del usuario: **empezar partida,
  activar modo avión a mitad, terminarla incluida la voz.**
- Sobre el móvil: *"lo verá peor pero es un tema de espacio, yo no forzaría
  nada"*. Es una decisión de alcance, no una queja a resolver.
- Contexto de por qué D-09/D-10 piden prueba humana: en esta sesión, los 278
  tests automáticos no cazaron el bug del audio que se cortaba al segundo. Hizo
  falta un dispositivo real. Los tests de navegador cubren lo mecánico y
  repetible; el dispositivo cubre lo que solo pasa en un dispositivo.

</specifics>

<deferred>
## Deferred Ideas

- **`IndexOverlay` no se cierra con Escape**, a diferencia de
  `WarningDetailModal`. Detectado en la quick 260831-g2s, fuera de alcance aquí.
- **El truco táctico de los Estados** (se puede intentar la acción bloqueada aun
  sin objetivo válido, solo para descartar el Estado) no cupo en los 320
  caracteres del aviso. Candidato a un aviso propio en el paso de atacar.
- **Modelo y versión de SO de la tablet de mesa**: bloqueante abierto desde la
  Fase 1. El móvil Android sirvió para validar la reproducción de audio por
  compartir SO, pero la instalación como PWA y el modo avión se prueban en la
  tablet.

</deferred>

---

*Phase: 04-instalaci-n-y-funcionamiento-offline*
*Context gathered: 2026-08-31*
