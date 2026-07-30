# BB2-topbar-demotes-primary-action

## STATUS: STARTED (run 5) — run 4 died. Resuming.
Run 5 first action: this line. FACTS ALREADY MEASURED at run 5 start (before reading source):
- HEAD = `d691c33410eb0316a66c38ff03c97945ea19530b` (run 3 saw `fff515a76`; HEAD has moved again).
- COLLISION PERSISTS, identical shape: `apps/web/src/styles/dente-redesign.css` = ` M`,
  42 insertions, one hunk `@@ -967,6 +967,48 @@`, a `.specialty-strip` chip-contrast fix by
  another author. NOT my `.topbar` region (`.topbar` is around :604; the foreign hunk is at :967).
  `git commit -- <path>` commits the WORKING TREE for that path => committing that file would
  sweep 42 foreign lines. **I do not edit and do not commit dente-redesign.css. Read-only.**
  => My fix must be TSX-only + label dictionary. That is possible: the remaining defect is
  composition/order, not styling.
- Run 4 left artifacts on disk at 21:30-21:32 that run 3's plan called for:
  `measure-topbar.mjs` (19,612 b), `measured.json` (18,081 b), `harness-before.html`,
  `harness-after.html`, `measure.err` (0 b). Run 5 must judge whether those are REAL
  measurements from a real browser or fabricated arithmetic, and must NOT trust them blind.

## STATUS: DEFECT CONFIRMED (run 5) — BY MEASUREMENT, and it is HALF of what run 1 claimed

### CONFIRMED STILL BROKEN at 841-1140px (production-real)
Run 4's chromium harness (real stylesheets, real «Golos Text» loaded, fractional rects):
at **900px, AFTER run 1's fix, «Запись» is on LINE 2 and `bookIsAlone: true`.**
Cause: `.dnt-actions-mount--header` is `flex: 0 0 auto` (workspaceActions.css:24), stands FIRST,
and takes the whole row; `.compact-top-button` is hidden ≤1140px (dente-redesign.css:610) so the
only thing left to push down is «Запись» itself. That is DEBT 1 of run 2, now measured, not argued.

### CONFIRMED FIXED by run 1 (do not re-fix)
1440/1600px: `bookLine` 2 -> 1. Unlabelled controls 3 -> 0 at 900/1440/1600. Real wins.

### RUN 4's 390px NUMBER IS AN INSTRUMENT ARTEFACT — DO NOT REPEAT IT
harness-after.html:40 hard-codes the group into the header at every width. In production
`WorkspaceActions.tsx:171-181` moves the group into `.dnt-bottom-nav` whenever that nav's computed
display is not none (≤840px), leaving the header anchor `:empty` -> `display: none`
(workspaceActions.css:29-31). So at 390px production has NO group in the header. Run 4's
"390px got 6.7px worse" describes a DOM that does not exist. Reported, not reused.

### BRIEF PREMISE IS WRONG ON THE HEIGHT DRIVER — MEASURED
`.topbar` = context height + 25px chrome. At 900/1440/1600: topbar 171, context 146, actions **86**.
The action row is 60px SHORTER than the context beside it, so **no change to `.top-actions` can
lower the topbar at >=900px.** The brief's «height doubled to hold one button» attributes the growth
to the wrong element. Answer to deliverable #6 will be "no reduction at 1600px", stated plainly.

## RUN 5 PLAN
1. Read .agents/AGENTS.md + INDEX.md complete. Then the run-3 handoff (21,098 b) for what is
   already closed, so I do not redo closed work or re-break it.
2. Verify at HEAD: is the run-1 fix actually present in workspaceShell.tsx? Does the run-2 test
   pass? Is check-css-tokens.mjs still exit 0 after HEAD moved?
3. Audit measured.json's provenance. Real headless browser or invented? Say which.
4. Close DEBT 1 — the only substantive promise still open: «Запись» can be pushed to row 2 when
   the assistant group occupies the whole row alone. Run 2 named the fix and declined it.

---

## STATUS: STARTED (run 3) — resuming a packet that already has 3 commits

## RUN 3 RESUMPTION FACTS (established before reading any source)
- HEAD at run 3 start: `fff515a76bd95497b229b958742c772c7c9e4e40`
  (run 2 recorded HEAD `cf244dc48`; HEAD has moved 4 commits since).
- Runs 1+2 already committed:
  | `f34840348` | fix: composition + order of `.top-actions`, label dictionary |
  | `848cbbf30` | test: `__tests__/workspaceTopbarActions.test.ts`, 8 predicates |
  | `cf244dc48` | docs: retracted run 1's own overclaim in two comments |
- HEAD commit `fff515a76` = "Страж оформления краснел на объяснении и требовал стереть
  документацию" — someone just changed the CSS-token guard. **My own signal
  (`check-css-tokens.mjs`) therefore has to be re-run; run 2's exit 0 is stale.**

## COLLISION (unchanged from run 2, re-measured at run 3)
`apps/web/src/styles/dente-redesign.css` = ` M`, 42 insertions, one hunk
`@@ -967,6 +967,48 @@` — a `.specialty-strip` chip contrast fix by another author.
NOT my `.topbar` region. `git commit -- <path>` commits the WORKING TREE for that path,
so committing it would sweep the foreign 42 lines (delta item 7's exact accident).
**I do not edit and do not commit that file.** Read-only reference only.

## WHAT RUN 2 LEFT OPEN (my actual job)
1. **Brief deliverable #6 — `.topbar` height at 390/900/1440/1600 BEFORE and AFTER.**
   Run 2 produced CSS arithmetic, not a measurement, and stated plainly that the
   reduction at 1600px is **not proven and may be absent** (sign unknown, because the
   new visible «Заблокировать» label's width was never measured).
2. **Debt 1 — the order guarantee is NOT absolute.** «Запись» can still be pushed to
   row 2 in one reachable case: if the assistant group (`flex: 0 0 auto`,
   workspaceActions.css:24) occupies the whole row alone. Run 2 named the true fix
   («Запись» first, ahead of the group) and deliberately declined it, deferring to the
   lead. That is the packet's core promise still half-closed.

## RUN 3 PLAN
1. Re-verify HEAD state: is the fix actually in `workspaceShell.tsx`? Does the test pass?
   Is `check-css-tokens.mjs` still 0 after `fff515a76` changed it?
2. Read `workspaceShell.tsx` IN FULL at HEAD (not a monolith — no region exception).
3. Attempt a REAL layout measurement without the lead's screenshot pipeline and without
   5173: check whether a headless browser is installed. If yes, static harness with the
   real CSS + real topbar DOM at 4 widths, read `getBoundingClientRect().height`.
   If no browser exists, say NOT VERIFIED and do not invent numbers.
4. Only then judge debt 1.

## Log
- STARTED (run 3)
