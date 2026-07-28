# W1-hollow-query-census — state

STATUS: DONE
Time: 2026-07-28 (cycle 7)
Agent: implementer under [ARCHON]

## HEAD
start: e75df11857f4e2e7202bb4e7ffa557c487147720
final: a7b0b2706b04a2bacbf7f9aa1ff3fb79d6e93d45

## THE TRUE NUMBER: 24 hollow of 42 modules — not 45 of 50
After the work: 5 hollow of 23 modules. All 5 blocked on the second author's files.
All 24 hollow tables measured against live PostgreSQL 18: 0 writers, 0 seeds, 0 rows.

## Commits (7, all pathspec, all verified with git log -1 --stat)
2ff49559b  census tool + test
29a59a80d  6 routes with no consumer + 9 modules
7821bef70  treatment plan trio: 3 modules, 3 routes, 3 widgets, DocumentsView grid
6bb2bb0ab  schedule pair: 2 modules, 2 routes, 2 widgets
908be0f54  urgent requests: module, route, widget + ShiftView section header rewritten
93a2f1803  patients pair: 2 modules, 1 route, 2 widgets + KNOWN_MISSING line and bound
a7b0b2706  confirmation reports: module, route, widget on 3 screens + familyRecommendationSources

Deleted: 19 db/*Query.ts modules (42 -> 23), 14 routes in clinical.ts (29 -> 15,
527 -> 444 lines), 9 widgets.

## Gates run (mine only, never a shared gate)
census --db                                        exit 0
scripts/census-hollow-query-modules.test.mjs       pass 6 fail 0
apps/api/src/tests/webCallsExistingRoutes.test.ts  pass 3 fail 0 (after every deletion)
services/clinical/ClinicalRouter.test.ts           pass 5 fail 0
npm run smoke:web-text-encoding                    ok true, 0 mojibake
scripts/check-css-tokens.mjs                       0 unresolved var()
live API 127.0.0.1:4100                            deleted=404, kept=401

## BLOCKED, handed to the lead
smoke-clinical-mutation-guard.mjs refuses on a stale dist (exit 1) and demands
`npm run build -w @dental/api` — a shared gate, not mine (§7a). Typecheck likewise
never run by me on either workspace.

## Log
- STARTED
- AUTHORITY READ
- DEFECT CONFIRMED (24 hollow, 0 rows in live DB)
- EDIT WRITTEN
- SELF-CHECK PASSED
- COMMITTED 2ff49559b / 29a59a80d / 7821bef70 / 6bb2bb0ab / 908be0f54 / 93a2f1803 / a7b0b2706
- PROVEN (DB + API + UNIT + SMOKE; build-dependent gate BLOCKED and reported)
- DONE
