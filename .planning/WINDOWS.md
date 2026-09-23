---
schema_version: 1
open_count: 2
waived_count: 0
fixed_count: 0
total_count: 2
last_updated: 2026-09-22T14:03:50.157Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 09 | unmet-truth | app/composables/__tests__/afirmacionesRespaldadas.test.ts |  | Gate A marca huellaDelProgreso (useStoredProgress.ts) como afirmacion sin auditar; 4 self-tests de fixture (HOY/ROJA hoy) en invariantesDeMarcaDeEstado.test.ts quedan obsoletos por el arreglo de 09-38 -- ambos reservados al plan 09-39 por scope_boundary | open |  | 2026-09-22T14:03:50.065Z |  |
| 2 | 09 | unrun-verify | app/pages/[game]/index.vue |  | Mutacion ejecutada (Task 3, 09-38): quitar clearProgressMismatch de onResumeContinue no pone rojo ningun test -- gap de cobertura de integracion, no cerrable dentro del scope_boundary de 09-38 (crear test de pagina no esta en files_modified) | open |  | 2026-09-22T14:03:50.157Z |  |

````json
[
  {
    "id": 1,
    "kind": "unmet-truth",
    "phase": "09",
    "file": "app/composables/__tests__/afirmacionesRespaldadas.test.ts",
    "line": null,
    "description": "Gate A marca huellaDelProgreso (useStoredProgress.ts) como afirmacion sin auditar; 4 self-tests de fixture (HOY/ROJA hoy) en invariantesDeMarcaDeEstado.test.ts quedan obsoletos por el arreglo de 09-38 -- ambos reservados al plan 09-39 por scope_boundary",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-22T14:03:50.065Z",
    "resolved_at": null,
    "milestone": "v1.8"
  },
  {
    "id": 2,
    "kind": "unrun-verify",
    "phase": "09",
    "file": "app/pages/[game]/index.vue",
    "line": null,
    "description": "Mutacion ejecutada (Task 3, 09-38): quitar clearProgressMismatch de onResumeContinue no pone rojo ningun test -- gap de cobertura de integracion, no cerrable dentro del scope_boundary de 09-38 (crear test de pagina no esta en files_modified)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-22T14:03:50.157Z",
    "resolved_at": null,
    "milestone": "v1.8"
  }
]
````
