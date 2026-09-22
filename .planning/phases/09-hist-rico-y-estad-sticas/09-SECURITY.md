---
phase: "09"
slug: "hist-rico-y-estad-sticas"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-22"
---

# Phase 09 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

Register origin: `register_authored_at_plan_time: true` — 31 of this phase's 40 `*-PLAN.md`
files carry a `<threat_model>` block. The audit verified declared mitigations; it did not
scan for new threats.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Grupo (tablet compartida) → `localStorage` del navegador | Único almacén de la app: sin backend, sin autenticación, sin red. Cualquiera con la tablet lee y escribe el histórico y el progreso | Nombres de pila del propio grupo, resultados de partida, posición en curso |
| Datos guardados → afirmaciones de la interfaz | La frontera que esta fase lleva nueve rondas defendiendo: lo que la pantalla dice sobre esos datos tiene que estar respaldado por una lectura real | Texto de aviso, copy de resultado, avisos de discrepancia |
| Estado de módulo (memoria) → montaje posterior de la misma página | Un hecho comprobado en un instante se transporta a otro instante; entre los dos, su referente puede haber dejado de existir | Marca de discrepancia de progreso (`useProgressMismatchMark`) |
| Gate automatizado → rondas de verificación futuras | Un gate en verde se lee como «esta clase de defecto está cubierta»; un gate vacuo es peor que no tener gate | Veredictos de `afirmacionesRespaldadas` / `invariantesDeMarcaDeEstado` |
| Motor (`engine/`) → pantallas de histórico y estadísticas | Funciones puras sin red ni storage; la frontera es de forma de datos, no de privilegio | Entradas de histórico normalizadas, agregados de estadísticas |

Spoofing y Elevation of Privilege no aplican en esta fase: la app no tiene identidades,
sesiones autenticadas ni privilegios que escalar. Premisa reverificada en esta auditoría,
no heredada — ver Audit Trail.

---

## Threat Register

171 threats across 31 plans. Full per-threat text lives in each plan's own `<threat_model>`
block; this table records the audited verdict. Two table shapes exist upstream — 22 plans
omit the Severity column, so severity is UNDECLARED (not low) for 122 of the 171 rows.

**Summary by disposition**

| Disposition | Count | Status |
|-------------|-------|--------|
| mitigate | 110 | closed |
| accept | 53 | closed (documented risk) |
| transfer | 3 | closed (target verified executed/recorded) |
| n/a | 4 | closed (premise verified against commits) |
| accept (parcialmente mitigado) | 1 | closed (residue bounded and documented) |
| **Total** | **171** | **0 open** |

**Blocking tier — the 20 threats declared `high` (at/above `block_on: high`), all `mitigate`, all closed**

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-09-32-01 | Spoofing | Copy de `failure-stale` | high | mitigate | `useHistorySavedNotice.ts:215` — el cuerpo no afirma identidad ni orden de partida | closed |
| T-09-32-02 | Tampering | Copy de `failure-stale` | high | mitigate | «reintentar» ausente del literal; `useGameEndCopy.ts:12` no ordena reintento | closed |
| T-09-33-01 | Tampering | `PROGRESS_MISMATCH_WARNING` | high | mitigate | `useProgressMismatchMark.ts:120` — sin «anterior»/«la ronda»/«reintentar» | closed |
| T-09-33-02 | Spoofing | `ResumePrompt.vue` | high | mitigate | El aviso se pinta antes del botón, verificado en plantilla | closed |
| T-09-34-01 | Repudiation | Mecanismo de excepción auditada | high | mitigate | `afirmacionesRespaldadas.test.ts:522-540` — `motivo`+`respaldo` no vacíos, `respaldoExiste` Y `respaldoRespaldaA`; `index.vue` con cero entradas (test :546) | closed |
| T-09-34-02 | Spoofing | Vocabulario del gate de clase | high | mitigate | `vocabularioDeAfirmaciones.ts` — raíces léxicas; test de subsunción sobre la lista cerrada anterior | closed |
| T-09-34-05 | Elevation of privilege | `NoticeVariant` | high | mitigate | `LITERALES_VARIANTE` incluye `'success'`; Gate C restringe la escritura a `useHistorySavedNotice.ts` | closed |
| T-09-35-01 | Tampering | Gate S | high | mitigate | 4 mutaciones EJECUTADAS y revertidas, mensajes literales en `09-35-SUMMARY.md` | closed |
| T-09-35-02 | Tampering | Detector de región vigilada | high | mitigate | Misma tanda de mutaciones ejecutadas | closed |
| T-09-36-01 | Repudiation | Trazabilidad de HIST-06 | high | mitigate | `REQUIREMENTS.md:81` — HIST-06 sigue `[ ]`, nota de cierre condicionada | closed |
| T-09-37-01 | Repudiation | Gate vacuo (descubrimiento vacío) | high | mitigate | Pata 5 exige descubrimiento no vacío; 191/191 tests ejecutados en vivo por la auditoría | closed |
| T-09-37-02 | Tampering | Vocabulario duplicado | high | mitigate | Módulo compartido único; ambos gates lo importan, sin redeclaración local (grep) | closed |
| T-09-37-04 | Repudiation | Aflojar una pata para quedar en verde | high | mitigate | `09-37-SUMMARY.md` documenta el gate observado ROJO contra el árbol real | closed |
| T-09-38-01 | Spoofing | Marca que sobrevive a su referente | high | mitigate | `useProgressMismatchMark.ts:167-171` — igualdad estricta de huella al leer | closed |
| T-09-38-03 | Repudiation | Garantía absoluta en la documentación | high | mitigate | Cabecera reescrita distinguiendo Caso A / Caso B | closed |
| T-09-39-01 | Spoofing | `respaldo` que no respalda (WR-02) | high | mitigate | `vocabularioDeAfirmaciones.ts:190-195` — lee el CONTENIDO del respaldo | closed |
| T-09-39-02 | Repudiation | Motivo circular con otra redacción (WR-03) | high | mitigate | `motivoNombraAlgoComprobable` incondicional; contraejemplos ROJO→VERDE en `09-39-SUMMARY.md` | closed |
| T-09-39-04 | Tampering | Umbral de 40 caracteres como única sustancia | high | mitigate | Tres condiciones documentadas por escrito en el fichero | closed |
| T-09-40-01 | Repudiation | Evaluación de riesgo a medias | high | mitigate | `REQUIREMENTS.md:241-244` — Casos A y B nombrados por separado | closed |
| T-09-40-02 | Repudiation | Dar HIST-06/DEV-02 por cerrados | high | mitigate | Ambos siguen abiertos y así lo dice la trazabilidad | closed |

**Special-attention rows (any severity)**

| Threat ID | Disposition | Verdict | Evidence |
|-----------|-------------|---------|----------|
| T-09-29-02 | accept (parcialmente mitigado) | closed | `deferred-items.md:293-327` — radio de impacto acotado a `tga:progress:<gameId>`, nunca `tga:history`; la propia entrada marca «Supuesto NO verificado» |
| T-09-28-SC | n/a | closed | `git show --stat` sobre `eabc574`,`2d2efe7`,`1f6c01c` — cero toques a `package.json`/`package-lock.json` |
| T-09-29-SC | n/a | closed | Ídem sobre `086e6f3`,`64d9c21`,`30f05ac` |
| T-09-30-SC | n/a | closed | Ídem sobre `a25e18d`,`10ed585`,`0cc1ddb` |
| T-09-31-SC | n/a | closed | Ídem sobre `7b4556d`,`f0d8785`,`1302978` |
| T-09-14-04 | transfer | closed | Destino (09-17) EJECUTADO: `useHeroSearch.ts:78` tiene `Object.hasOwn(spanishHeroAliases, heroId)` |
| T-09-17-05 | transfer | closed | `deferred-items.md:34-58` — riesgo, radio y remediación concretos |
| T-09-17-06 | transfer | closed | `deferred-items.md:159-187` — ídem |

**Phase-wide premises verified mechanically (close whole families of `accept` rows)**

| Premise | Check | Result |
|---------|-------|--------|
| Firestore no existe todavía en el repo (SC5 / STAT-04) | `grep -rIn "firestore\|firebase" app/ engine/ package.json` | sin coincidencias |
| Ni `v-html` ni `innerHTML` en toda la fase | `grep -rn "v-html\|innerHTML" app/` (sin tests) | sin coincidencias |
| `engine/types.ts` no importa zod | `grep -n "zod" engine/types.ts` | solo un comentario |
| La agregación no tiene ramas de red | `grep -n "fetch(" engine/statistics.ts app/composables/useGameHistory.ts` | sin coincidencias |

**Threat Flags in SUMMARYs:** the 10 SUMMARY files carrying a `## Threat Flags` section
(09-01, 09-04, 09-05, 09-06, 09-07, 09-08, 09-14, 09-16, 09-17, 09-23) all read «Ninguno».
No unregistered surface.

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `workflow.security_block_on` count toward `threats_open`*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-09-01 | T-09-29-02 | Mitigación parcial del autoguardado: el aviso previene al grupo antes de empezar, pero no corta el autoguardado. Radio de impacto acotado a `tga:progress:<gameId>` — nunca `tga:history`, el único dato irreconstruible. Registrado con evaluación de riesgo explícita, no por omisión | Plan 09-29 (`deferred-items.md:293-327`) | 2026-09-19 |
| AR-09-02 | T-09-17-05 | Archivado de histórico ante cuota agotada: exige interfaz nueva fuera de `09-UI-SPEC.md`. El síntoma es un fallo de escritura, ya honesto y recuperable tras 09-13/09-16 | Plan 09-17 (`deferred-items.md:34-58`) | 2026-09-18 |
| AR-09-03 | T-09-17-06 | Defensa en profundidad aguas abajo aplazada; tras 09-14 el motor no puede producir una entrada inválida, así que la rama es inalcanzable desde `record()` | Plan 09-17 (`deferred-items.md:159-187`) | 2026-09-18 |
| AR-09-04 | IN-05 (fuera del registro STRIDE) | `engine/history.ts:110` — `Math.random().toString(36).slice(2,12)` puede emitir un sufijo de menos de 10 caracteres en un caso extremo rarísimo, quedándose algo por debajo de la mitigación T-09-11. Deuda ya registrada con arreglo propuesto (`crypto.randomUUID()`) | `deferred-items.md:170-176`, previo a esta fase | 2026-09-18 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-22 | 171 | 171 | 0 | gsd-security-auditor (ASVS L1, L2 spot-checks on the 20 high-severity rows) |

### Audit coverage — what was exhaustive vs sampled

Recorded verbatim because an overstated coverage claim is the exact failure mode this
phase exists to eliminate.

**Exhaustive:** all 31 `<threat_model>` blocks read; all 20 high-severity threats verified
individually against source; all 10 `## Threat Flags` sections checked; the four
special-attention `n/a` rows verified against twelve real commits via `git show --stat`;
the three `transfer` rows' targets verified executed or recorded; the four phase-wide
premise greps run tree-wide.

**Live execution rather than trusting SUMMARY claims:** `npx vitest run
afirmacionesRespaldadas.test.ts invariantesDeMarcaDeEstado.test.ts` → 191/191 passing.

**Sampled:** roughly 90 remaining undeclared-severity, non-flagged citations were NOT
re-grepped line by line. Instead the recurring cited mechanisms were verified in the
current post-09-40 code state — tri-state `readEnvelope`, `Object.hasOwn` /
`Object.create(null)` at all four cited map sites, `Number.isFinite` / `Number.isInteger`
guards, `String(...)` coercion in `extractHeroIds` / `extractVillainId`, id-suffix width,
the `try/catch` window in `onOutcomeRecorded`, frozen `PLACEHOLDER_CONTEXT`, prerender
routes and the untouched `/sw.js` `no-cache` rule, `ConfirmDialog :destructive`. Because
the register is cumulative over a small shared file set, each mechanism check closes every
threat ID citing it. Zero OPEN threats were found in everything checked, so the fail-closed
rule for undeclared-severity OPEN threats was never exercised.

**Independently established this session (not agent-reported):** `npm test` → 34 files /
1096 tests / 0 failures / exit 0; `npx tsc --noEmit` → exit 0.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-22
