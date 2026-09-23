---
phase: 09-hist-rico-y-estad-sticas
plan: 13
subsystem: persistencia (localStorage — histórico)
tags: [gap-closure, blocker, cr-01-ronda-3, hist-06]
dependency-graph:
  requires: ["09-04", "09-09", "09-12"]
  provides: ["readRaw discriminado de tres vías (RawRead)", "readEnvelope que propaga 'unreadable' de LECTURA"]
  affects: ["app/composables/usePersistedSession.ts", "cualquier futuro consumidor de readRaw/readEnvelope"]
tech-stack:
  added: []
  patterns: ["resultado discriminado por 'kind' en vez de string|undefined para distinguir ausencia de illegibilidad"]
key-files:
  created: []
  modified:
    - app/composables/usePersistedSession.ts
    - app/composables/__tests__/usePersistedSession.test.ts
decisions:
  - "readRaw devuelve RawRead ({kind:'absent'|'value'|'unreadable'}) en vez de string|undefined; solo 'absent' (getItem devuelve null sin lanzar) autoriza 'empty' en readEnvelope"
  - "load()/loadVoicePreference() siguen colapsando 'absent' y 'unreadable' a propósito (datos reconstruibles); solo readEnvelope (histórico, irreconstruible) distingue"
  - "El contrato de retorno de appendHistoryEntry sigue siendo boolean (no se convierte a resultado discriminado) — decisión explícita del plan, diferida a 09-16 desde el lado de la copy"
metrics:
  duration: "~25 min"
  completed: "2026-09-13"
---

# Phase 09 Plan 13: readRaw deja de mentir — cierre de CR-01 (ronda 3) Summary

Resultado discriminado de tres vías (`absent`/`value`/`unreadable`) en `readRaw`, propagado por `readEnvelope`, para que un fallo transitorio de lectura de `localStorage` nunca vuelva a presentarse ante `appendHistoryEntry` como «no hay histórico todavía».

## What Was Built

Cierre del BLOCKER **CR-01 (ronda 3)** de `09-VERIFICATION.md`. Antes de este plan, `readRaw` colapsaba tres situaciones distintas (clave ausente, SSR sin `window`, `getItem` lanzando) en un único `undefined`, y `readEnvelope` traducía ese `undefined` a `{ kind: 'empty' }` — el mismo camino exacto que una clave genuinamente ausente. `appendHistoryEntry` trataba `'empty'` como «no hay histórico todavía» y reconstruía el envoltorio con `previous = []`, destruyendo partidas ya registradas cuando `getItem` lanzaba una única vez (modo privado, cuota, contexto restringido).

**Task 1** introdujo el tipo `RawRead` (`{kind:'absent'}|{kind:'value',raw:string}|{kind:'unreadable'}`) y reescribió `readRaw` con este mapeo exacto: sin `window` (SSR) ⇒ `'unreadable'`; `getItem` devuelve `null` ⇒ `'absent'` (única vía); `getItem` devuelve una cadena ⇒ `'value'`; `getItem` lanza ⇒ `'unreadable'`. `readEnvelope` ahora comprueba `read.kind === 'unreadable'` ANTES que `read.kind === 'absent'`, así que un fallo de lectura nunca llega a `'empty'`. `load()` y `loadVoicePreference()` se adaptaron al tipo nuevo sin cambiar su comportamiento observable (progreso y preferencia de voz son datos reconstruibles, así que ambos siguen colapsando `'absent'` y `'unreadable'` al valor por defecto). Se reescribieron los dos comentarios de bloque (`:22-26` y el bloque sobre `readEnvelope`) que declaraban la colapsación como intencional y segura.

**Task 2** añadió un `describe` nuevo con 7 tests permanentes que reproducen exactamente el escenario que el verificador ejecutó a mano: dos partidas registradas sobreviven a un `getItem` que lanza una única vez en la tercera llamada (`appendHistoryEntry` devuelve `false`, el blob previo permanece byte a byte idéntico — comparación `toBe` sobre la cadena capturada, nunca `toEqual` sobre el objeto parseado), `setItem` no llega a invocarse para `tga:history`, `removeHistoryEntry` con la lectura caída no escribe nada, el contrato hacia `/historico` no cambia (`loadHistory()` sigue devolviendo `[]` sin lanzar), la vía legítima (`'absent'` genuino) sigue permitiendo escribir, SSR/prerender ni lee ni escribe el histórico, y el endurecimiento no se propagó a `load()`/`loadVoicePreference()`.

## Deviations from Plan

### Auto-fixed Issues

Ninguna. El plan se ejecutó tal como estaba escrito para ambas tareas.

### Nota sobre la prueba anti-tautología (no es una desviación, es una aclaración de resultado)

El plan pedía usar `git stash push -- app/composables/usePersistedSession.ts` para revertir temporalmente el código de producción y confirmar que los tests 1-3 fallan. **`git stash` está prohibido en modo worktree** (contaminación cruzada entre worktrees vía `refs/stash` compartido, #3542) y además el fichero de producción ya estaba COMMITEADO (Task 1) en el momento de escribir los tests de la Task 2, así que `git stash push` sobre ese path no habría tenido nada que hacer (`No local changes to save`, confirmado al intentarlo). Se sustituyó por la alternativa saneada equivalente: `git show <commit-anterior-a-Task-1>:<path>` para volcar el contenido previo, sobrescribir el fichero de producción con ese contenido, ejecutar la suite del fichero de test, y restaurar con `git checkout -- <path>` (operación explícitamente permitida sobre un fichero concreto).

**Resultado de la prueba anti-tautología:** de los 7 tests nuevos, **2 fallan** contra el código previo a este plan — los dos que ejercitan `appendHistoryEntry` (la reproducción exacta del verificador, y la comprobación de que `setItem` no se invoca). El test de `removeHistoryEntry` con la lectura caída **pasa igual contra el código viejo Y el nuevo**, porque `removeHistoryEntry` nunca reconstruye nada desde cero: su guarda `read.kind !== 'ok'` ya trataba `'empty'` y `'unreadable'` exactamente igual (no-op) tanto antes como después de este plan. El BLOCKER real —reconstrucción destructiva con `previous = []`— solo existía en `appendHistoryEntry`, tal como el propio `<objective>` del plan lo describe línea por línea. Este test de `removeHistoryEntry` queda en el repo como test de regresión permanente (documenta que la propiedad se mantiene), no como reproducción de un defecto que nunca existió ahí. Tras restaurar el fichero de producción, la suite completa vuelve a 26 ficheros / 688 tests en verde.

## Verification Results

- `npx vitest run`: 26 ficheros, 688 tests, código 0 (línea base era 681; +7 tests nuevos, ningún test preexistente editado).
- `npm run build`: código 0.
- `grep -ric "firestore\|firebase" app/ engine/`: 0 en todos los ficheros — SC5/STAT-04 siguen triviales, Fase 10 no se adelanta.
- Todos los criterios de aceptación de grep de la Task 1 y la Task 2 (conteos de `kind: 'absent'`, ausencia de `raw === undefined`, ausencia de `if (!raw) return null`, ausencia de la premisa falsa `"clave ausente O storage inaccesible"`, orden de guardas en `readEnvelope`) verificados manualmente contra el fichero final.
- `git diff --stat` del fichero de test: solo adiciones (108 líneas nuevas, 0 eliminadas).

## Self-Check: PASSED

- `app/composables/usePersistedSession.ts` — FOUND (modificado, commit 1544473)
- `app/composables/__tests__/usePersistedSession.test.ts` — FOUND (modificado, commit ca70ffd)
- Commit 1544473 (`fix(09-13): readRaw devuelve resultado discriminado de tres vías`) — FOUND en `git log --oneline`
- Commit ca70ffd (`test(09-13): reproducción permanente de CR-01 (ronda 3)`) — FOUND en `git log --oneline`
