# Deferred Items — Phase 02

Items discovered during execution that are out of scope for the current task
(pre-existing, not caused by this plan's changes) and therefore not auto-fixed.

## `npx nuxt typecheck` has never been runnable in this repo

**Found during:** 02-02, Tarea 2 verification (`npx vitest run && npx nuxt typecheck`).

**Issue:** `nuxt typecheck` requires a type checker (`vue-tsc` or Golar) to be
installed. Neither `typescript` nor `vue-tsc` appears in `package.json`
`devDependencies` at any point in git history (`git log --all -p -- package.json`
shows no commit ever added them) — this is not a regression introduced by
02-01 or 02-02, it is a gap that has existed since the Phase 1 scaffold.
Running `npx nuxt typecheck` in this worktree prints an interactive prompt
offering to install `vue-tsc`/Golar rather than performing any check.

**Why not auto-fixed:** installing a new package (`typescript`, `vue-tsc`) is
explicitly excluded from Rule 3 auto-fix — it requires a
`checkpoint:human-verify` (`gate="blocking-human"`) for package-legitimacy
confirmation before proceeding, per the executor's package-install exclusion.
This is also arguably out of scope entirely: the failure is not caused by
02-02's changes, it is a pre-existing condition of the whole project.

**Mitigation applied this plan:** all `.vue`/`.ts` changes in 02-02 were
manually re-read for type compatibility (prop shapes, computed return types,
`EngineSession`/`RuntimeStepNode` field usage) in lieu of `tsc`. `npx vitest
run` (which does transform every touched file through Vite/oxc, catching
syntax errors, though not full type errors) passes at 91/91.

**Recommendation:** a future plan (or a standalone `chore` task) should add
`typescript` + `vue-tsc` as devDependencies and wire `nuxt typecheck` into CI,
closing this gap properly with an explicit package-legitimacy checkpoint.
