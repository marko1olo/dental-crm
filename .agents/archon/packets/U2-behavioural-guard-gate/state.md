# U2-behavioural-guard-gate — state

STATUS: DONE

HEAD at start: 65dc2d62302a1a268f41871851c98dbbe8199e9a
HEAD now: 637a837897c9c1b36bc19230356c73fd86aebeb4
`git status --porcelain -- scripts/` at start: CLEAN (no collision on my claim).
`git status --porcelain -- scripts/` at end: CLEAN (both commits landed).

## Milestones
- STARTED — packet dir + state.md written as FIRST action.
- AUTHORITY READ — .agents/AGENTS.md, .agents/INDEX.md, .agents/COMMANDS_AND_TESTS.md,
  .agents/archon/progress.md. RECON_DOSSIER.md has NO section about this gate.
- DEFECT CONFIRMED — both directions, measured (see handoff.md).
- EDIT WRITTEN — new scripts/lib/api-route-census.mjs; scripts/smoke-clinical-mutation-guard.mjs
  rewritten.
- GATE PASSED — `npm run typecheck -w @dental/api` exit 0; the gate itself exit 0.
- COMMITTED e8be281d9765e06e25842939fdd387a4c5dfd37b (+742 −696, 2 files).
- COMMITTED 637a837897c9c1b36bc19230356c73fd86aebeb4 (+22 −7, 2 files) — silent logger,
  explicit flush+exit; wall time 12 060 ms -> 1 963 ms.
- PROVEN —
  * gate exit 0: 481 route-table entries, 479 probed, 186 mutating, 172 challenged, 580 ms probe
  * suite runner: `PASS smoke:clinical-mutation-guard 1810ms`
  * regression catch: guard neutralised in untracked dist -> exit 1 naming
    `POST /api/billing/payments ... 400 (BillingValidationError)`; restored byte-identical
    (md5 d696c686f9a2c890c1b79ebd7ece50a6), git status on dist empty, gate green again
  * both auth idioms pass in one run (401 AuthRequired x100, 403 ClinicalAdminSecretRequired x59)
  * patients.ts: all 10 mutating /api/patients routes challenged
  * live API 127.0.0.1:4100: /api/health 200, POST /api/patients 401,
    POST /api/billing/payments 400 (dev escape hatch — reason the gate sets its own env)
- DONE — handoff.md written. scratch probes deleted. No files left dirty in my claim.

## Files left on disk
- .agents/archon/packets/U2-behavioural-guard-gate/state.md
- .agents/archon/packets/U2-behavioural-guard-gate/commitmsg.txt
- .agents/archon/packets/U2-behavioural-guard-gate/commitmsg-2.txt
- .agents/archon/packets/U2-behavioural-guard-gate/handoff.md
