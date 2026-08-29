---
phase: 02-bucle-de-ronda-y-reglas-verificadas
plan: 03
subsystem: engine schema + ui (warning modal) + planning docs
tags: [warning-detail, modal, zod-schema, scope-debt, D-32]
dependency_graph:
  requires:
    - phase: "02-01"
      provides: "sección ronda (repeats:true, 2 fases, 10 pasos, 11 warnings) sobre la que se autoran los cinco warningDetail"
    - phase: "02-02"
      provides: "IndexOverlay.vue ya con prop dimmed, useGameSession.plainSectionTitle ya cableado — este plan no toca ninguno de los dos"
  provides:
    - "engine/schema.ts: TextBlockSchema.warningDetail (tope 320, sin .default()) + superRefine que rechaza warningDetail huérfano (sin warning) en el paso base y en cada variante de dificultad (DC-8)"
    - "engine/resolve.ts: resolveText fusiona warningDetail con el mismo patrón ?? que warning/speech"
    - "content/marvel-champions.json: contentVersion 8, cinco warningDetail autorados, incluido el tercer error confirmado del borrador (solo villano + esbirros con palabra clave Villano roban carta de aumento)"
    - "app/components/WarningDetailModal.vue: modal informativo de un solo botón (nuevo componente)"
    - "app/components/StepScreen.vue: línea de aviso clicable cuando hay warningDetail, sin afordancia falsa cuando no la hay"
    - "UI-09 en REQUIREMENTS.md/ROADMAP.md, excepción acotada en PROJECT.md Out of Scope"
  affects:
    - "app/pages/[game]/index.vue (wiring del modal, estado efímero isWarningDetailOpen)"
    - "engine/__tests__/schema.test.ts, resolve.test.ts, content.test.ts (gates nuevos)"
tech_stack:
  added: []
  patterns:
    - "Campo opcional sin .default() (a diferencia de kind/WR-01): warningDetail no necesita fallback en app/ porque Zod-en-Node y JSON crudo en el navegador nunca divergen para un optional puro"
    - "Regla de dependencia entre dos campos del mismo TextBlock implementada en el superRefine de nivel raíz (DC-8), no en StepSchema — evita convertir StepSchema en un esquema con efectos"
    - "Gate que muerde reutilizado tanto en engine/__tests__/content.test.ts (test automatizado) como en verificación manual (editar+revertir el fichero real) — doble confirmación de que DC-8 realmente bloquea"
key_files:
  created:
    - app/components/WarningDetailModal.vue
  modified:
    - engine/types.ts
    - engine/schema.ts
    - engine/resolve.ts
    - content/marvel-champions.json
    - engine/__tests__/schema.test.ts
    - engine/__tests__/resolve.test.ts
    - engine/__tests__/content.test.ts
    - app/components/StepScreen.vue
    - app/pages/[game]/index.vue
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
    - .planning/PROJECT.md
decisions:
  - "DC-6 aplicada: el campo se llama warningDetail, no detail — el comentario histórico de la Fase 1 sobre el detail rechazado se reescribió para no confundir ambas ideas"
  - "DC-7 confirmada: el CTA del modal es 'Entendido', capitalización de frase, sin chevron final — no hay navegación, el cierre devuelve exactamente al mismo paso y ronda"
  - "DC-8 aplicada: la regla 'warningDetail sin warning' vive en el superRefine de GameDefinitionSchema (recorrido de nivel raíz ya existente para ids duplicados), no en StepSchema, y cubre tanto el bloque base como cada variante de dificultad por separado"
  - "DC-9 aplicada: la deuda de alcance se saldó como tarea propia (Tarea 3), con sus propios tres diffs y su propio commit, sin colgarla de la tarea de UI"
  - "El disparador del modal se recupera con document.activeElement en el sitio de la llamada (app/pages/[game]/index.vue), no como payload del emit de StepScreen — mantiene el emit open-warning-detail: [] exactamente como especifica 02-UI-SPEC.md sin acoplar el componente tonto a la gestión de foco de la página"
metrics:
  duration: "~50min"
  completed: "2026-08-29"
---

# Phase 2 Plan 03: Aviso ⚠ clicable con modal de consecuencia (D-32) Summary

Campo `warningDetail` de punta a punta (tipos, esquema con tope de 320 y regla de dependencia con `warning`, fusión por dificultad, y los cinco detalles autorados de `<content_spec>`), el aviso `⚠` convertido en botón con afordancia real solo cuando tiene consecuencia detallada, el nuevo `WarningDetailModal.vue` que la muestra y se cierra por botón/velo/Escape devolviendo el foco, y la deuda de alcance de D-32 saldada en `ROADMAP.md`/`REQUIREMENTS.md`/`PROJECT.md`.

## What Was Built

- **`engine/types.ts`**: `TextBlock.warningDetail?: string`, entre `warning` y `speech`, comentado y atado a D-32.

- **`engine/schema.ts`**:
  - `TextBlockSchema.warningDetail: z.string().max(320).optional()`, sin `.default()` — comentario explícito de por qué este campo NO necesita el fallback `?? 'step'` que sí lleva `kind` (WR-01): un `optional()` puro nunca diverge entre el JSON validado por Zod en Node y el JSON crudo que recibe el navegador.
  - Comentario histórico `// NO "detail" — línea de aviso de trampa (D-05)` reescrito para no confundir el `detail` general rechazado en la Fase 1 con este campo mucho más estrecho (DC-6).
  - Nuevo bloque en el `superRefine` de raíz (mismo recorrido `sections[].phases[].steps[]` que ya usa el gate de ids duplicados): un paso que declara `warningDetail` sin `warning` falla nombrando su id; una variante de dificultad que declara `warningDetail` cuando ni ella ni el paso base declaran `warning` falla nombrando paso y nivel de dificultad (DC-8).

- **`engine/resolve.ts`**: `warningDetail: variant?.warningDetail ?? node.step.warningDetail` — misma línea, mismo patrón que `warning`/`speech`, siempre presente en el objeto devuelto (con `undefined` explícito cuando ni base ni variante lo definen).

- **`content/marvel-champions.json`**: `contentVersion` 7 → 8. Cinco `warningDetail` autorados (todos ≤320 caracteres, sin `\n`, siguiendo `<content_spec>` del plan al pie de la letra):
  - `ronda.jugadores.01` — procedimiento de cambio de etapa del villano (dial a cero, qué se conserva).
  - `ronda.jugadores.03` — agotamiento del mazo de jugador.
  - `ronda.jugadores.04` — qué efectos terminan/se resuelven al enderezar.
  - `ronda.villano.02` — **tercer error confirmado del borrador**: solo el villano y los esbirros con la palabra clave Villano roban carta de aumento, más la línea de recuento «sin saltarse a nadie» (D-21).
  - `ronda.villano.04` — agotamiento del mazo de encuentros y su castigo global/permanente (ficha de aceleración), distinto del agotamiento de mazo de jugador.

- **`app/components/StepScreen.vue`**: nuevo prop `warningDetailText: string | null` y emit `open-warning-detail: []`. Dos ramas mutuamente excluyentes: cuando hay `warningText` y `warningDetailText`, `<button>` con borde inferior en color de aviso al 50% de alpha, chevron `›` final, `min-h-12`, `active:brightness-95`; cuando solo hay `warningText`, el `<p>` exactamente igual que en la Fase 1 (sin borde, sin chevron, sin ser pulsable — D-32 "sin afordancia falsa").

- **`app/components/WarningDetailModal.vue`** (nuevo): props `heading`/`body`, emit `dismiss: []`. Cromo de `ConfirmDialog.vue` con tres divergencias deliberadas: velo translúcido `bg-background/80` (no opaco), cuerpo en texto primario (no secundario), un solo botón "Entendido" sin chevron (DC-7). Añade lo que `ConfirmDialog` no tiene: cierre por botón, por `@click.self` en el velo, y por `Escape` (listener registrado/retirado en `onMounted`/`onUnmounted`); foco al botón "Entendido" al montar.

- **`app/pages/[game]/index.vue`**: `isWarningDetailOpen` (ref efímero, nunca persistido — misma categoría que D-26). `onOpenWarningDetail` captura `document.activeElement` (el propio botón que disparó el click) para poder devolverle el foco al cerrar, ya que `StepScreen` emite `open-warning-detail` sin payload por contrato de `02-UI-SPEC.md`. `WarningDetailModal` se alimenta de `currentText.warning`/`currentText.warningDetail`; cerrar no toca `cursor`, `round` ni `context`.

- **`.planning/REQUIREMENTS.md`**: nuevo `UI-09` (sin marcar — se marcará al verificar la fase), fila de trazabilidad `UI-09 | Phase 2 | Pending`, coverage actualizado a 59/59, nota bajo `REF-01` aclarando que UI-09 adelanta solo el aviso clicable y que el resto de REF-01/REF-02 sigue en v2. Fecha de `*Last updated:*` actualizada.

- **`.planning/ROADMAP.md`**: `UI-09` añadido a la línea `**Requirements**` de la Fase 2; sexto criterio de éxito (estado observable: avisos con detalle son tocables y se cierran al instante sin perder paso/ronda; avisos sin detalle no ofrecen afordancia).

- **`.planning/PROJECT.md`**: la línea de «Pantalla de consulta de reglas» en Out of Scope conserva su vigencia y gana la excepción acotada de D-32 (el aviso clicable entra en v1; la pantalla de consulta, las keywords enlazadas y la búsqueda siguen fuera). Nueva fila en `## Key Decisions` para D-32, marcada «Completado en la Fase 2».

## Verification Performed

- `npx vitest run`: 7 archivos, **109 tests**, todos en verde (línea base tras 02-02: 95; +14 de este plan — 6 en `schema.test.ts`, 3 en `resolve.test.ts`, 5 en `content.test.ts`).
- `node -e "..."` estructural sobre el JSON real: `contentVersion===8`, exactamente 5 `warningDetail`, ninguno huérfano, ninguno >320, ninguno con `\n` → `ok`.
- Prueba de mordida manual reproducible sobre el fichero real: se borró `warning` de `ronda.villano.02` con un script Python, `npx vitest run engine/__tests__/content.test.ts` falló con `ZodError: Step "ronda.villano.02" declares warningDetail without warning`, se restauró desde una copia de respaldo y `git diff --stat content/marvel-champions.json` volvió a mostrar solo los cambios intencionales de este plan (sin restos de la mutación).
- `grep -c "warningDetail" engine/types.ts engine/resolve.ts` → 1 en cada uno (criterio estricto de aceptación — se reescribió un comentario en `types.ts` que repetía el nombre del campo en una línea aparte para cumplirlo).
- `grep -q "z.string().max(320).optional()" engine/schema.ts` → código 0.
- `grep -c "\.default(" engine/schema.ts` → 1, idéntico a la línea base (solo `kind` lleva `.default()`; el campo nuevo no añade ninguno).
- `grep -rn "warningDetail" app/composables/` → vacío (no existe fallback `?? literal` para este campo).
- `grep -c "v-html" / "~~/engine"` → 0 en `WarningDetailModal.vue` y `StepScreen.vue`.
- `grep -q 'role="dialog"'` / `aria-modal="true"` en `WarningDetailModal.vue` → ambos presentes.
- `grep -q "bg-background/80"` presente; `grep -c "text-secondary-text"` → 0 en `WarningDetailModal.vue`.
- `grep -c "Entendido"` → 1 en `WarningDetailModal.vue`, esa línea sin `›` (se reescribió el comentario de cabecera que también repetía la palabra, para cumplir el criterio estricto).
- `grep -q "min-h-12"` en `StepScreen.vue`; `grep -q "open-warning-detail"` en `StepScreen.vue` y en `index.vue`.
- `grep -c "isWarningDetailOpen"` → 0 en `usePersistedSession.ts` y `engine/persistence.ts` (el estado del modal no se persiste).
- `npx nuxt build` (client+server+prerender de `/` y `/marvel-champions`) sin errores — mismo sustituto de `nuxt typecheck` que 02-02, documentado abajo.
- `grep -c "UI-09"` → 4 en `REQUIREMENTS.md` (definición, nota REF-01, fila de trazabilidad, footer no cuenta) y 1 en `ROADMAP.md` (línea `**Requirements**` del bloque `### Phase 2`).
- `git diff .planning/REQUIREMENTS.md | grep -E "\[x\]"` → vacío (ningún requisito distinto de UI-09 cambió de estado).
- `git diff --diff-filter=D --name-only` tras cada uno de los tres commits: sin eliminaciones inesperadas.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `.nuxt/tsconfig.app.json` no existía, bloqueando `vitest`**
- **Found during:** primer intento de `npx vitest run` en este worktree.
- **Issue:** mismo síntoma documentado en `02-01-SUMMARY.md`/`02-02-SUMMARY.md` — cada worktree necesita su propia infraestructura de tipos de Nuxt.
- **Fix:** `npx nuxi prepare` (genera `.nuxt/` localmente; ya en `.gitignore`, no se commitea).
- **Files modified:** ninguno versionado.
- **Commit:** N/A.

**2. [Rule 1 - Bug] Los criterios de aceptación `grep -c` sobre comentarios propios contaban de más**
- **Found during:** verificación de Tarea 1 y Tarea 2 contra sus propios criterios de aceptación.
- **Issue:** los comentarios de cabecera que yo mismo escribí en `engine/types.ts`, `engine/schema.ts` y `app/components/WarningDetailModal.vue` repetían literalmente los términos `warningDetail`/`.default()`/`Entendido` en líneas de comentario separadas de la línea de código real, haciendo que `grep -c` (que cuenta líneas, no apariciones) devolviera un recuento mayor del esperado por tres criterios de aceptación explícitos del propio plan.
- **Fix:** se reescribieron los tres comentarios para no repetir el término literal en una línea aparte, sin perder la explicación.
- **Files modified:** `engine/types.ts`, `engine/schema.ts`, `app/components/WarningDetailModal.vue`.
- **Commit:** los dos primeros incluidos en los commits de Tarea 1 (`8df5622`) y Tarea 2 (`49147b4`) — detectados y corregidos antes de cerrar cada tarea. El de `engine/schema.ts` (recuento de `.default()`) se detectó durante la redacción de este Summary, tras ya haber cerrado el commit de Tarea 1, y se corrigió en un commit `fix` aparte (`a9fc16a`).

No hay deviations de Rule 2 ni Rule 4 — el plan no dejó ninguna funcionalidad crítica sin cubrir ni exigió ningún cambio arquitectónico.

### Deferred (documented, not auto-fixed; ya registrado en 02-02, no repetido aquí)

`npx nuxt typecheck` sigue sin ser ejecutable en este repo (ni `typescript` ni `vue-tsc` se han instalado nunca — ver `.planning/phases/02-bucle-de-ronda-y-reglas-verificadas/deferred-items.md`, escrito en 02-02). Mitigación aplicada de nuevo: `npx nuxt build` completo sin errores sobre los tres ficheros `.vue` tocados/creados en este plan, más relectura manual de tipos (props, emits, `TextBlock`/`RuntimeStepNode`).

## Known Stubs

Ninguno. `WarningDetailModal.vue` recibe siempre datos reales (`currentText.warning`/`currentText.warningDetail`) cuando se monta — nunca se renderiza con props vacías por diseño (`v-if="isWarningDetailOpen"` solo se activa desde un `⚠` que ya tiene ambos campos resueltos).

## Threat Flags

Ninguno nuevo más allá de lo ya registrado en el `threat_model` del propio plan (T-02-01…T-02-08, T-02-SC), todos con disposición `mitigate`/`accept` ya cerrada por este mismo plan:
- T-02-01 (interpolación `{{ }}` exclusiva): verificado, `grep -c "v-html"` → 0 en ambos componentes.
- T-02-02 (detalle huérfano): verificado, gate DC-8 + mordida manual.
- T-02-03 (`zod` fuera de `app/`): verificado, `grep -c "~~/engine"` → 0.
- T-02-04 (reproducción de texto con copyright): los cinco detalles son paráfrasis propias, ninguno copia literalmente el Rules Reference.
- T-02-07 (detalle desmesurado): tope `.max(320)` + gate de longitud en `content.test.ts`.
- T-02-08 (estado del modal filtrándose a la persistencia): verificado, `grep -c "isWarningDetailOpen"` → 0 en las dos costuras de persistencia.
- T-02-SC (paquetes nuevos): cero instalaciones — el modal es Tailwind hecho a mano.

No se introduce ninguna superficie de amenaza nueva no contemplada por el plan.

## Self-Check: PASSED

- `engine/types.ts` — FOUND (modificado)
- `engine/schema.ts` — FOUND (modificado)
- `engine/resolve.ts` — FOUND (modificado)
- `content/marvel-champions.json` — FOUND (modificado)
- `engine/__tests__/schema.test.ts` — FOUND (modificado)
- `engine/__tests__/resolve.test.ts` — FOUND (modificado)
- `engine/__tests__/content.test.ts` — FOUND (modificado)
- `app/components/StepScreen.vue` — FOUND (modificado)
- `app/components/WarningDetailModal.vue` — FOUND (nuevo)
- `app/pages/[game]/index.vue` — FOUND (modificado)
- `.planning/ROADMAP.md` — FOUND (modificado)
- `.planning/REQUIREMENTS.md` — FOUND (modificado)
- `.planning/PROJECT.md` — FOUND (modificado)
- Commit `8df5622` (feat: warningDetail de punta a punta) — FOUND en `git log`
- Commit `49147b4` (feat: aviso clicable + modal) — FOUND en `git log`
- Commit `84e2e40` (docs: deuda de alcance saldada) — FOUND en `git log`
- Commit `a9fc16a` (fix: recuento de `.default()` en schema.ts) — FOUND en `git log`
- `npx vitest run` — 109/109 en verde al cierre del plan
- `npx nuxt build` — completo sin errores al cierre del plan

## Manual Verification Not Performed

Este entorno de ejecución no dispone de herramienta de navegador/captura de pantalla, así que los tres recorridos manuales que el plan pide en `npm run dev` (emulación de tablet horizontal, apertura/cierre del modal por los tres caminos, verificación visual del aviso sin detalle) **no se han podido ejecutar interactivamente**. En su lugar:
- El servidor de desarrollo se levantó y respondió correctamente (`npx nuxt dev`), y `npx nuxt build` (que incluye el prerender de ambas rutas) terminó sin errores.
- Cada clase Tailwind y cada rama condicional de `StepScreen.vue`/`WarningDetailModal.vue` se contrastó línea a línea contra `02-UI-SPEC.md` §Layout 1 y §Component Inventory (chrome exacto, tokens de color, tamaños táctiles, coreografía de foco).
- Se recomienda que el usuario (o el paso de verificación de fase) confirme visualmente en una tablet real o emulada: el borde+chevron en `ronda.villano.02`, la ausencia de afordancia en `ronda.villano.01`, y los tres caminos de cierre del modal.

## Next Phase Readiness

D-32 completo: campo, esquema, contenido, UI y deuda de planificación saldada. `02-04` (revisión humana del contenido de la ronda contra el Rules Reference v1.7 y partida completa, D-36/CONT-09) puede construirse sin ninguna dependencia pendiente de este plan. Sin bloqueos, salvo la verificación visual manual señalada arriba.

---
*Phase: 02-bucle-de-ronda-y-reglas-verificadas*
*Completed: 2026-08-29*
