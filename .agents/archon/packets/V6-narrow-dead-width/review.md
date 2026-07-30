# V6-narrow-dead-width — ADVERSARIAL REVIEW

Reviewer: independent, did not write this code. Posture: disbelief; every claim reproduced or marked
unreproducible. Commit under attack: `a7861bcb8109724665d9973bec77bac1fb45856c`.
Packet also spans `9c2e609f6` (test) and `fd3765bd1` (docs/handoff).
Repo HEAD while reviewing: `9de69093a1ce3df2b71cccf51ac81818c7992d31` (other agents committing
concurrently; the three source files of this packet were CLEAN in the worktree throughout).

VERDICT: **SOUND_WITH_NITS**.

---

## 0. Commit topology — established, not accepted

The 8 claimed files are not all in `a7861bcb8`. Union of three commits, verified with
`git show --name-only`:

| commit | parent | files |
|---|---|---|
| a7861bcb8 | dd91e67a2 | PatientsView.tsx, styles/patients-redesign.css, packets/.../state.md, commitmsg.txt |
| 9c2e609f6 | 320ae2175 | tests/patientsWidgetsGridColumns.test.ts, commitmsg-test.txt |
| fd3765bd1 | efa07327a | commitmsg-docs.txt, handoff.md, state.md |

Union = exactly the 8 claimed files. Zero foreign files. `git log 56bc2ef6d..HEAD --` over the three
source paths returns only `a7861bcb8` and `9c2e609f6`: nobody else touched them, and the builder swept
up nobody else's work despite a heavily dirty tree (schema.ts, InventoryView.tsx, main.css,
token-aliases.css, apps/api/.data/*, packages/shared/dist were all dirty and all stayed out).

---

## 1. Structural constants re-derived from source (handoff not trusted)

- `PatientsView.tsx:266` `.patients-main-grid` inline `display:grid;
  grid-template-columns:'minmax(260px, 320px) 1fr'`, THREE children: `.patient-list` (268),
  `section.patient-admin-panel` (323), `div.patients-widgets-grid` (676). Auto-placement puts child 3
  at row 2 / col 1 = the `minmax(260px,320px)` track.
- `dente-redesign.css:1067` `@media (max-width:840px) .patients-main-grid { display:flex !important;
  flex-direction:column !important; gap:12px !important }` → at ≤840px the group is a full-width
  flex item.
- `dente-redesign.css:823-824` `.app-shell.dente-redesign .workspace { padding-inline:24px !important;
  max-width:1560px !important }`, and `:816` `overflow-y:auto !important` (the workspace, not the
  window, is the scroller). `@media (max-width:840px)` override at `:1063` → `padding-inline:12px`.
- `dente-redesign.css:1030-1035` `.patients-panel { padding:20px !important; border:1px solid ... }`
  beats `patients-redesign.css:3` `padding:1.5rem` (no `!important` there).
- `main.css:187` `* { box-sizing: border-box }` — line number exact, also exact in HEAD.
- `main.css:13165` block only sets `padding-bottom` on `.patients-panel` at narrow widths: width
  arithmetic unaffected.
- `main.css:512-514` `.workspace section, .workspace article, .workspace div { min-width: 0 }` — only
  `min-width`; it cannot fight the new rule's `display`/`grid-template-columns`/`gap`/`margin-top`.
- `patients-redesign.css` IS imported (`main.tsx:11`) → the rule ships. `.patients-widgets-grid` occurs
  repo-wide only in that CSS rule, the JSX, and the new test. No second owner, no later stylesheet with
  a selector that can reach the element.
- `ROOT_FONT_PX = 16` (the test's load-bearing assumption): scanned all 52 CSS files under
  `apps/web/src` for an `html`/`:root` `font-size` declaration → **0 hits**. The assumption holds, so
  `30rem = 480px` and `1rem = 16px` are real.
- Only `PatientDuplicateMergeQueuesWidget` (`.panel ops-panel`, root at line 115) is a query container
  (`dente-operations.css:78-79` `container-type:inline-size; container-name:opsPanel`); the
  `@container opsPanel (max-width:720px)` card-mode block is at `:698`. The other five widgets are not
  containers.

---

## 2. Attack surface — hypotheses actually tested

### H1. Was the defect real at the PARENT commit? — CONFIRMED (mechanism), plate unreproducible
`git show a7861bcb8^:apps/web/src/PatientsView.tsx` line 674 carries
`gridTemplateColumns:"repeat(auto-fit, minmax(min(280px, 100%), 1fr))"`, gap 16px.
Re-derived on the constants in §1: group at a 720px window = 720 − 24 − 42 = **654px**;
`floor((654+16)/(280+16)) = 2` columns; track `(654−16)/2 = 319px`; `319/720 = 44.31%`.
The old rule first reaches 2 columns at window **642px** (657px if a classic 15px scrollbar is
present). So the defect band is 642–840px and 720 is inside it. This is a deterministic grid
computation on rules I read myself, not a claim I accepted.

What I could NOT reproduce: the pre-fix plate. `.dente-ops-shots/narrow_full.png` was rewritten at
10:39:52 by a later capture run; the file the builder describes at "10:28" no longer exists and
`.dente-ops-shots` is untracked, so there is no pre-fix image anywhere. The "empty bordered box to the
right" therefore rests on (a) the mechanism above, (b) `align-items:stretch` being the grid default,
(c) the lead's own `VISUAL_VERDICT.md` B2 line "Roughly 45 % of the width is a single empty white
panel". That is enough to call the defect real; it is not a plate I opened.

### H2. Is the fix reachable by a real user, or dead code? — CONFIRMED reachable
`PatientsView` is a primary nav destination; `PatientDuplicateMergeQueuesWidget` and
`PatientServiceLineagesWidget` render unconditionally at `PatientsView.tsx:684-685` with no flag and no
role gate. Defect band 642–840px window contains **768px = iPad/tablet portrait** and any half-screen
laptop window. Not dead code.

### H3. Does the rendered result hold? — CONFIRMED, from an artifact the packet declared NOT PROVEN
This is the largest single finding of the review, and it runs in the builder's favour.

`.dente-ops-shots/narrow_full.png` is 720×1100 (PNG header read directly) with mtime
**10:39:52.297**, i.e. **66 s after** `patients-redesign.css` was written (10:38:46.688) and **57 s
after** `PatientsView.tsx` was written (10:38:55.048). It is a POST-FIX plate. I decoded it with
`pngjs` and measured border columns rather than eyeballing it:

- at y=600, 700, 820 the only vertical border runs are x = 13, 34, 685, 706 (colour 226,232,240 =
  `--line`), interior fill 248,250,252. Panel border-box ≈ x13–706 (~694px, matches 720 − 24 with no
  scrollbar); widget box = x34–685 = **652px** against the predicted 654px group width.
- x = 56…684 contains **no vertical border at all** at those rows. Two 319px tracks cannot produce
  that. The group is ONE full-width column.
- Opening the image: the duplicates card is full width and still in the stacked label/value layout
  B2 praised; `Сквозное дерево связей обращений` sits BELOW it, full width, with its real empty-state
  card — no bordered box beside anything. Nothing clipped, the two-line Russian heading and the
  two-line `Дерево связей` chip both wrap. Last card bottom ≈ y830, FAB row ≈ y960: no corner overlap.

So the lead's closing check — "there must be no bordered box to the right of the duplicates card" — is
already satisfied by a file on disk. The measured 652px also independently confirms the corrected
654px figure, not the earlier 639px one: the capture script emulates with
`Emulation.setDeviceMetricsOverride ... mobile: width < 800` (`scripts/ops-panels-shots.mjs:218-225`),
so at 720px there is no classic scrollbar eating layout width. The record correction is right for the
pipeline that produces the plate.

### H4. Are the claimed MEASUREMENTS reproducible? — CONFIRMED, all eight, to the digit
Re-derived independently (gap 16, old min 280, new min 480, panel chrome 42, workspace inline 24/48):

| container | old cols / track | new cols / track |
|---|---|---|
| 324 (win 390) | 1 / 324 | 1 / 324 |
| 654 (win 720) | **2 / 319** | **1 / 654** |
| 639 (win 720 + 15px scrollbar) | 2 / 311.5 | 1 / 639 |
| 774 (win 840) | 2 / 379 | 1 / 774 |
| 260 / 320 (desktop card track) | 1 / 260, 1 / 320 | 1 / 260, 1 / 320 |
| 1470 (full section 1560−48−42) | 5 / 281.2 | 2 / 727 |

`319/720 = 44.31%` ("44.3 %" ✔). Old rule needs a ≥576px container for 2 columns, new rule ≥976px.
Across the whole reachable band 240…800px the new rule yields non-single-column at **0** widths.
Defect band lower bound 642px ✔ (657 with a classic scrollbar); upper bound 840px is the media-query
edge, verified structurally (above 840px child 3 lands in the ≤320px track → 1 column anyway).

### H5. Regression worse than the defect (the cycle-5 shape)? — DISPROVED
- 390px phone: 1 column before and after. Nothing given away.
- 1440px desktop: group sits in the `minmax(260px,320px)` track → 1 column before and after.
  Corroborated on `patients_light_full.png` (1600px viewport): the left column measures ~318px.
- No dead space pushed inward: only `CustomCrmTaskTypesWidget` has an internal grid
  (`grid-cols-1 md:grid-cols-2`), and `md:` is viewport-keyed at 768px, so widening the widget from
  319→654px at a 720px window changes nothing there. The other four have no internal grid.
- Card-mode reflow preserved: the only query container is the duplicates panel, threshold 720px, and
  its container is now 654px (measured 652px) — still card mode. The test asserts this with the
  threshold read out of `dente-operations.css` rather than hardcoded.
- `min(30rem, 100%)` keeps the 100% floor, so the original "column must shrink below its minimum or
  cards get cut off" protection survives. Rendered plate shows no horizontal overflow.
- `margin-top: 1.5rem` = the removed inline 24px; `gap: 1rem` = the removed inline 16px. No spacing drift.

### H6. Hollow facade / second owner / broken bindings / hardcode / mojibake? — DISPROVED
No hollow facade: the class is applied in JSX, the stylesheet is imported, and the rendered plate proves
the rule is live. No second owner of `.patients-widgets-grid`. `useAppLogic` untouched — the whole
source diff is one comment block plus `style={{…}}` → `className=…` plus one CSS rule; no hooks, no
state, no teardown surface. No colour, no hex, no px in the new rule (rem only) → UI_STANDARDS
"Relative Metrics" satisfied, and moving off an inline style satisfies UI_STANDARDS §1. No new UI
string, so no undeclared Russian literal. Encoding audit over all 8 files: **0 mojibake lines,
0 U+FFFD, no BOM**; the three commit subjects are clean Russian and each names the defect.

### H7. Does the guard go RED when the defect is reintroduced? — CONFIRMED, twice
Broken in a scratch tree outside the repo (`%TEMP%/v6scratch`, source untouched):
- revert the track minimum (`30rem` → `17.5rem` = 280px): **exit 1**, 3 of 6 tests fail, first
  assertion `при ширине группы 576px получается 2 колонок` — 576 = 2·280+16, exactly my own
  independent boundary.
- restore the parent's JSX (`git show a7861bcb8^:…PatientsView.tsx`): **exit 1**, test 6 fails
  `группа виджетов не помечена классом`.
Baseline scratch copy passes 6/6 first, so the failures are the injected defect and not the relocation.
A third shape (dropping `min(…,100%)`) fails at the `requireMatch` on the template regex. This guard is
not decorative.

### H8. Real data vs fixture? — CONFIRMED (not applicable as a weakness)
The fix is pure layout: column count depends only on container width and the two lengths in the rule,
not on API payloads. The *defect's visibility* did depend on `PatientServiceLineagesWidget` being in its
empty state, but the single-column result is data-independent. The plate was taken against live
127.0.0.1:4100 with real seeded duplicate pairs (Орлова/Орлов, 35 % совпадения), not a fixture.

---

## 3. Proof audit — every claimed command re-run, true exit code captured

| claim | my run | result |
|---|---|---|
| `node --import tsx --test apps/web/src/tests/patientsWidgetsGridColumns.test.ts` → exit 0, 6/6 | re-run | **exit 0**, `tests 6 / pass 6 / fail 0` — matches |
| `npm test -w @dental/web` → exit 0, 551/551 | re-run | **exit 0**, `tests 551 / suites 95 / pass 551 / fail 0` — matches |
| `npm run typecheck -w @dental/web` → exit 0 | re-run, `$?` before any pipe | **exit 0** (`tsc -b --noEmit`) — matches |
| encoding clean over 8 files | re-run independently | 0 mojibake / 0 U+FFFD / no BOM — matches |
| owner of the empty panel identified at `PatientDuplicateMergeQueuesWidget.tsx:115` / `PatientServiceLineagesWidget.tsx:38` | read both files | line 115 IS `<section className="panel ops-panel">`; line 38 IS the `return (` of the lineages widget, whose root is a bordered rounded Tailwind div — matches |
| dev server served the new rule | not re-run (no server start allowed, and it is superseded) | the rendered plate is stronger evidence; see H3 |

Stale-artifact trap: **does not apply here.** Nothing in this packet's proof chain loads
`apps/api/dist` — the unit test reads `apps/web/src/styles/*.css` and `PatientsView.tsx` off disk,
`npm test -w @dental/web` is `node --import tsx --test src/**/*.test.ts` over source, and typecheck is
`tsc -b --noEmit`. I did not rebuild and I am not claiming a build.

---

## 4. Findings (nits — none blocking)

1. **Two line citations in the shipped test comment do not resolve.**
   `apps/web/src/tests/patientsWidgetsGridColumns.test.ts:116` cites `dente-redesign.css:843` for
   `.workspace padding-inline: 24px` — line 843 is a *different* `.workspace` block (the corner-dock
   `padding-bottom` reserve); the real declaration is at **823**. Line 196 of the same test cites
   `dente-redesign.css:846` for `max-width: 1560px` — 846 is `.default-clinic-banner`; the real
   declaration is at **824**. Same two wrong pointers appear in the commit body of `a7861bcb8`.
   Both VALUES are correct and verifiable ~20 lines up, so no number changes — but a citation that
   sends the next reader to the wrong rule is the exact habit this repo is trying to kill.
   Also `dente-operations.css:73` is cited for "@container opsPanel": the container declaration is at
   **78-79** and the `@container` rule itself is at **698**.
2. **One tautological assertion.** `test:148` `assert.equal(trackWidth(width, grid), width)` cannot
   fail once `columns === 1` has been asserted two lines above — with one column `trackWidth` returns
   the container by construction. Harmless, but it is the "assertion that asserts nothing" the brief
   warned about. Everything else in the file is load-bearing (proved by H7).
3. **The defect-reproduction case borrows today's gap.** `test:170` builds the historical grid as
   `{ trackMinPx: 280, gapPx: grid.gapPx }`, reading the gap from the *current* rule instead of pinning
   the historical 16px. It coincides today. Changing the new `gap` would silently change what "before"
   means. (It still yields 2 columns at gap 32, so the guard survives — the coupling is gratuitous,
   not dangerous.)
4. **The packet under-claims.** Its first NOT PROVEN item was already closed by
   `.dente-ops-shots/narrow_full.png` at the moment the handoff was written (see H3). The builder cited
   that file as the evidence of the defect but never re-opened it after their own edit landed, so the
   lead is being asked to re-run a pipeline that has already answered. Honest direction of error, but
   it costs the lead a capture cycle.
5. **Debt #1 is a bigger instance of the same defect class, left standing.** `.patients-main-grid`
   declares two tracks and receives three children, so on desktop the widget group is confined to the
   ≤320px first track and row 2 / column 2 (~1100px at a 1440px window) renders nothing. Independently
   corroborated: left column measures ~318px in `patients_light_full.png` at a 1600px viewport, and
   `dente-operations.css:69-77` carries a dated note about the duplicates panel sitting in "около 300
   пикселей" at a 1600px window. Correctly scoped out (no lead verdict exists on desktop composition)
   and loudly disclosed in the handoff — but it needs its own packet.
6. **`30rem` is chosen, not measured** (disclosed as debt #4). Consequence worth stating: a second
   column now needs a 976px group and nothing reachable provides one, so the `auto-fit` form is
   currently inert — test 4 ("auto-fit is not a dead form") asserts behaviour at an unreachable width.
   It becomes live only if debt #1 is fixed. Defensible as forward-compatibility; it is not proof of
   anything a user sees today.

Not counted against the builder, per the review brief: `madge` absent (§11), biome orders absent.
Noted as pre-existing repo convention, not a packet defect: the `[ARCHON]` prefix before
`fix(scope):` is not strictly Conventional Commits (§12), but every agent in this repo does it.

## 5. What the lead should do next

1. Skip the re-capture of `narrow_full.png` for *this* packet — it is already the post-fix plate; just
   open it. If you want a fresh one for the record, note the capture run at 10:38–10:40 overwrote the
   pre-fix plate, so the "before" image is gone for good.
2. 390px and 1440px plates are still genuinely unshot. Arithmetic says 1 column at both and I
   reproduced it, but neither has an image.
3. Open the desktop dead-track packet (finding 5). It is the same defect class, wider, on the more
   common viewport.
