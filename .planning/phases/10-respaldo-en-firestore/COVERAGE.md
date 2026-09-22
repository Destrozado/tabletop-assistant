# API Coverage — Firebase (Firestore + Auth)

> Full coverage by default. Opt-outs are explicit, reasoned decisions.
> Derived from the locked decisions in `10-CONTEXT.md` (D-01..D-16) and the
> ROADMAP scope fence for Phase 10. Every opt-out below was considered and
> rejected on purpose, not overlooked.

## Firestore

| capability | decision | reason |
|---|---|---|
| create document (`setDoc` with explicit id) | INTEGRATE | |
| server timestamp (`serverTimestamp`) | INTEGRATE | |
| security rules (`firestore.rules`, create-only) | INTEGRATE | |
| read document (`getDoc`) | OPT-OUT | explicitly out of scope — write-only boundary; every screen reads localStorage only (`PITFALLS.md` §8, D-11) |
| query collection (`getDocs`/`query`) | OPT-OUT | explicitly out of scope — same write-only boundary; no screen reads the cloud |
| realtime listeners (`onSnapshot`) | OPT-OUT | explicitly out of scope — would make Firestore a read source |
| update document | OPT-OUT | explicitly out of scope — append-only backup; rules deny `update` (D-11) |
| delete document | OPT-OUT | explicitly out of scope — a backup that deletes with the local original is not a backup (D-04, D-11) |
| batched writes / transactions | OPT-OUT | not needed — one independent document per game, no cross-document invariant |
| offline persistence (`persistentLocalCache`) | OPT-OUT | explicitly out of scope — SYNC-09; the retry queue is hand-rolled in localStorage (ROADMAP milestone decision, D-01) |
| collection-group queries | OPT-OUT | not needed — a single flat `history/{id}` collection (D-10) |
| bundles / data connect / aggregation queries | OPT-OUT | not needed — no read path exists to serve them |

## Firebase Auth

| capability | decision | reason |
|---|---|---|
| anonymous sign-in (`signInAnonymously`) | INTEGRATE | SYNC-06 |
| email/password, phone, OAuth providers | OPT-OUT | explicitly out of scope — "no user accounts" is a standing project constraint (`PROJECT.md:109`, ROADMAP scope reminder) |
| account linking / upgrade anonymous → permanent | OPT-OUT | explicitly out of scope — same constraint; the anonymous uid rotating is accepted in D-10 |
| custom claims / admin SDK | OPT-OUT | not needed — no backend, no server (`nuxt generate`, no runtime server) |

## Other Firebase products

| capability | decision | reason |
|---|---|---|
| App Check | OPT-OUT | not needed yet — tracked in `10-CONTEXT.md` §Deferred Ideas as the next lever if junk writes become a real problem |
| Cloud Storage | OPT-OUT | not needed — no binary payloads |
| Cloud Functions | OPT-OUT | not needed — no server-side logic; a backend is an explicit project exclusion |
| Analytics / Performance / Crashlytics | OPT-OUT | not needed — no telemetry in a private friends' app; would also pull SDK weight into the boot path (SYNC-05) |
| Cloud Messaging | OPT-OUT | not needed — no notifications |
| Remote Config | OPT-OUT | not needed — content ships in the bundle |
| Firebase Hosting | OPT-OUT | not needed — the app deploys to Vercel (`CLAUDE.md` §Hosting) |
