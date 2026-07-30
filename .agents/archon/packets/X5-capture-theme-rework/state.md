# X5-capture-theme-rework — state

STATUS: DEFECT CONFIRMED — and a HARD COLLISION on half my claim

## !!! COLLISION on scripts/ops-panels-shots.mjs (11:52 UTC) !!!
At my start the file was clean at 766 lines. 40 minutes later it is ` M` DIRTY at 803 lines,
+37 lines I did not write: a new `waitlist` panel entry inside `PANELS` (view schedule,
testId waitlist-drawer, with a prepare block probing /api/waitlist). No commit between
2cf36a1e7 and 49ec4553 touches the file, so this is a live uncommitted edit by another author
inside MY claim.
CONSEQUENCE I CANNOT ENGINEER AROUND: `git commit -- scripts/ops-panels-shots.mjs` commits the
WHOLE working-tree file, so committing my fix would sweep their unfinished waitlist panel into
my commit (AGENTS.md §7a / §8b: never sweep another agent's unfinished work). `git add -p` is
interactive and unavailable; `git stash` is banned.
DECISION: I do NOT touch, revert or commit that file while it is dirty by them. Editing it would
also let THEIR next `git commit -- <that path>` sweep MY half-finished edit. So:
  1) shared helper scripts/lib/shot-audit.mjs (new file, mine alone)
  2) scripts/dente-redesign-shots.mjs (clean, mine alone) — full rework, commit
  3) re-poll ops-panels-shots.mjs; apply + commit ONLY if it becomes clean.

## HEAD at start
2cf36a1e7a2decc3323b92ed721a969382eaabdf

## COLLISION NOTE (not mine, not touched)
`git diff --cached --name-only` at my start already had ANOTHER agent's files STAGED:
  apps/api/src/db/rebookingConversionRulesQuery.ts
  apps/web/src/components/analytics/RebookingConversionRulesWidget.tsx
I will NOT unstage/reset them. Every commit of mine uses explicit pathspec after `--`.

## Read complete
.agents/AGENTS.md, .agents/INDEX.md, .agents/archon/VISUAL_VERDICT.md (all 457 lines incl. addendum C+D),
.agents/archon/packets/W5-capture-theme-assert/{review.md,handoff.md,state.md},
scripts/ops-panels-shots.mjs (766), scripts/dente-redesign-shots.mjs (522).
TIME: (cycle 8, rework of W5)

## Packet
X5-capture-theme-rework — rework of W5-capture-theme-assert.
Claim: scripts/ops-panels-shots.mjs, scripts/dente-redesign-shots.mjs + shared helpers.

## Milestones
- [x] STARTED
- [ ] AUTHORITY READ
- [ ] DEFECT CONFIRMED/ABSENT
- [ ] EDIT WRITTEN
- [ ] SELF-CHECK PASSED
- [ ] COMMITTED <hash>
- [ ] PROVEN
- [ ] DONE

## Log
- STARTED: packet dir created, state.md written before any reads.
