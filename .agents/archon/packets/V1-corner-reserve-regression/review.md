# V1-corner-reserve-regression — adversarial review (pass 2)

Commits attacked: `bda50170d` (fix 1), `0d728da9d` (fix 2), `1cabdfc9e` (packet material)
Spec: `.agents/archon/packets/U4-fab-corner-owner/review.md` — read COMPLETE, audited item by item.
Posture: disbelief. Every claimed command re-run, TRUE exit captured without a pipe. Read-only on
source: no edit, no commit, no revert, no `git add`. No server started or restarted — 5173 and 4100
were ALREADY answering 200, so the browser claims were re-measured against the live tree.
Typecheck re-run with `--force` so no incremental `tsbuildinfo` could hide an error.

VERDICT: **NEEDS_REWORK**.

Not a fabrication packet in the arithmetic sense — every number the builder published reproduces, and
the cascade analysis that overturned the previous reviewer's F2 is correct and I re-derived it
independently, in the browser and by brace-walking `main.css`. But two things are worse than the
packet's record admits, and I proved both **live in a browser**, not by reasoning:

1. **The F1 remedy is provably inert.** `dialog`/`alertdialog` were added to `INTERACTIVE_ROLES` for
   the incoming-call toast, and the packet's own second commit made yielding to that toast
   arithmetically impossible. I injected the toast's exact geometry and semantics into the live page
   and fired the dock's own `resize` trigger: **the lift stayed 0 at 390x844 and at 1600x1100** while
   the toast covered the dock band by 7 680 px and 13 362 px. The handoff states this as CLOSED
   («тост стал мишенью, панель ему уступает»).
2. **The 0.5 area threshold cannot yield to a full-width button.** Measured live: a 620x48 button
   sitting exactly on the dock band is covered 44.9 % → no lift. At 390x844 the dock bar is 168 px
   wide, so **any** target wider than 336 px in its band is below the threshold by construction —
   which is every full-width mobile action button, the class that includes the «Сохранить» this whole
   region exists to protect. Confirmed at 390x844: 370x48 button, share 0.454, `lift="0px"`.
3. Plus a smaller one with real consequences: **the closing command the builder hands the lead for two
   of his own NOT-PROVEN items crashes at HEAD**, because fix 1 stopped writing
   `--corner-dock-lift`. `TRUE_EXIT=1`.

---

## 1. PROOF AUDIT — every claimed command re-run

| Claim | My re-run | Verdict |
|---|---|---|
| `npm run typecheck -w @dental/web` TRUE_EXIT=0, no output beyond the npm banner | TRUE_EXIT=0, output is exactly the two banner lines. Also `npx tsc -b --force --noEmit` in `apps/web`: TRUE_EXIT=0, `grep -c "error TS"` = 0 — not an incremental-cache pass | CONFIRMED |
| `node --import tsx --test .../cornerDockLayout.test.ts` exit 0, tests 54 / suites 11 / pass 54 / fail 0 | TRUE_EXIT=0, tests 54 / suites 11 / pass 54 / fail 0, duration 196.982 ms | CONFIRMED |
| `npm test -w @dental/web` exit 0, tests 533 / suites 95 / pass 533 / fail 0 | TRUE_EXIT=0, tests 533 / suites 95 / pass 533 / fail 0, duration 6016.36 ms | CONFIRMED |
| Reserve arithmetic: 144 at 390x844 and at 840, 96 at 1600x1100 | executed the SHIPPED `computeCornerReserve` myself: 48+16·2+64 = **144**, 48+24·2+0 = **96**; `computeCornerBarClearance({844, 780})` = **64** | CONFIRMED |
| Reserve applied exactly once — proof 1 (unit test parses the real CSS) | the test really does read `../../styles/*.css` + `floatingCorner/*.css`, strip comments, count `var(--corner-dock-reserve-block`, and assert `padding-bottom`. My own comment-stripping pass over `styles/` finds exactly **one** live consumer, `dente-redesign.css:844`; the other 4 hits in `rg` are inside comments. Repo-wide search finds no other CSS file | CONFIRMED |
| Reserve applied exactly once — proof 2 (browser: shell 96→0, workspace 80→144) | **I re-ran `node scratch/probe-corner-reserve.mjs adversary2` myself.** 390x844: reserveVar 144px, shell paddingBottom **0**, workspace **144**. 840x900: 0 / 144. 1600x1100: 0 / 96. Identical to `v1-corner-after2.json` | CONFIRMED |
| One host, zero overlap with the bottom nav, 24 px clearance ×3 | my run: `dockHosts: 1` at all three; dock 708..756 vs nav 780..844; 764..812 vs 836..900; 1028..1076 in a 1100 viewport with the nav `display:none`. Byte-identical to the claim | CONFIRMED (see N1 — the 24 px comes from a foreign hardcoded floor, not from the measurement) |
| Applied lift 0 at all three viewports after fix 2 | my run: `--corner-dock-lift` is the EMPTY string at all three, so the `var(…, 0px)` fallback applies. Effective lift 0 | CONFIRMED in effect (see F-G: the empty string breaks the builder's own probe) |
| F4 ms inside `getBoundingClientRect` 19.34→0.36 / 12.90→0.47 / 19.79→1.38 | my run **0.33 / 0.88 / 2.63** against the same BEFORE baseline = −98 % / −93 % / −87 %. My machine ran hotter (frame mean 85.18 ms at 1600 vs the builder's 57.32), which explains the gap | CONFIRMED in direction and order of magnitude; **partly mis-attributed, see F-C** |
| F4 hit tests 295→90 / 130 / 380 | my run 90 / 150 / 410. 390x844 matches exactly. The +29 % regression at 1600 reproduces as **+39 %** | CONFIRMED as numbers, **mis-attributed, see F-C** |
| `.workspace` is NOT a scroll container | my run: 9883/9883, 6977/6977, 6082/6082; the probe's own scroller detection resolves to `html.light` at all three | CONFIRMED — U4's comment was false, the correction is right |
| F6.2 DISPUTED: computed `backdrop-filter` on `.workspace` is `blur(12px) saturate(1.8)` | my run: `blur(12px) saturate(1.8)` at all three viewports. `premium.css:147` lists `.workspace` first; `:172` declares `backdrop-filter: var(--glass-blur) saturate(180%)`; `--glass-blur: blur(12px)`. **The builder is right; the previous reviewer searched for the literal `saturate(1.8)` and never opened `premium.css`** | CONFIRMED |
| Encoding: 0 mojibake across all files | `rg -c "[РС][\x{0080}-\x{00FF}]\|вЂ"` over all 12 files in the packet: 0 each. Subject `od -c`: `321 203 320 263 320 276 320 273` = «угол», valid UTF-8 | CONFIRMED |
| Tokens: no static hex in `cornerDock.css` | `rg -c '#[0-9a-fA-F]{3,8}'` exit 1 | CONFIRMED |
| Five dead exports deleted, nothing dangles | `rg` over `apps/web/src` + `scratch` + `packages`: one hit, the explanatory comment at `cornerDockLayout.test.ts:45`. Typecheck and 533 tests green | CONFIRMED |
| Index hygiene, only own files | `git show --name-only`: `bda50170d` = the 7 claimed source files (+735/−144), `0d728da9d` = 3 (+119/−1), `1cabdfc9e` = 5 packet files. Grep for `dist/ \| .data/ \| scratch/ \| tsbuildinfo \| node_modules` across all three: **NONE** | CONFIRMED |
| `commitmsg{,2,3}.txt` are the committed bodies | `diff` against `git log -1 --format=%B` for each: identical apart from one trailing blank line | CONFIRMED |
| (not claimed — my own check) does "exactly once" survive minification? | `npm run build -w @dental/web` TRUE_EXIT=0, built in 27.38 s, precache 111 entries. Exactly **one** `var(--corner-dock-reserve-block` in the whole of `dist/assets/*.css`: `index-p--V_Gf0.css`, `padding-bottom:var(--corner-dock-reserve-block, 48px)!important`. `.corner-dock{` ships in exactly one stylesheet | CONFIRMED — stronger than the source-level gate |
| record-correction #4: chunk hash `voice-assistant-ui-hOs8g6dv.css` is stale | after my rebuild: `voice-assistant-ui-B4qEaTKI.css`; `hOs8g6dv` count = 0 | CONFIRMED |
| record-correction #6: U4's "496 tests" is stale | 533 now, and 533 is what I measured | CONFIRMED |
| F7: `52.5rem`→`840px`, `60rem`→`768px` | `cornerDock.css`: `@media (min-width: 768px)` for `.corner-dock__side-hints`, `@media (max-width: 840px)` for narrow density. Only two media queries in the file | CONFIRMED |

## 2. DEFECT REALITY AT THE PARENT — reproduced, not read

- **F2 mechanism.** `main.css:13013` is real: a selector list beginning `.app-shell, .workspace, .panel,
  .work-grid, .imaging-layout, .patients-panel, .finance-panel, .visit-panel, .schedule-panel` with
  `padding-bottom: calc(96px + env(safe-area-inset-bottom)) !important`. I brace-walked `main.css` with
  comments stripped: line 13013's only enclosing at-rule is `@media (max-width: 860px)` — **unlayered**
  (`@layer legacy` spans 417–655 and 14353–end; 13013 falls between them). That check was necessary, not
  decoration: a layered `!important` would have beaten an unlayered one regardless of specificity.
  U4's rule matched `<main class="app-shell dente-redesign">` only through the type selector `main`
  = (0,0,1), which loses to `.app-shell` = (0,1,0) at equal importance and equal layer.
  **The builder's DISPUTE is correct: U4's shell reserve was dead from day one, and the previous
  reviewer's "applied TWICE / ~304 px of an 844 px viewport" is wrong on the mechanism.** The BEFORE
  probe closes it with measured numbers: published 144 px, computed 96 px on the shell and 80 px on
  `.workspace` — the reserve landed **zero** times at ≤840 px.
  `.app-content` exists in no markup; `.dnt-content` likewise (CSS mentions only).
- **F4 mechanism.** At `bda50170d^`, `applyLayout` wrote `VAR_BAR_CLEARANCE` unconditionally, then
  `VAR_LIFT = "0px"`, then `dataset.cornerDensity`, and only then read `bar.getBoundingClientRect()` —
  three style writes before a geometry read, every pass, with `schedule()` unthrottled
  (`if (frame) return; rAF`). Forced synchronous layout per scroll frame: real.
- **F3 mechanism.** At the parent, `collectObstacles` ran once at lift 0 and `resolveCornerPlacement`
  evaluated every candidate lift against that one list. Real.
- **False comment.** `attach()` at the parent claimed «страница прокручивается внутри `.workspace`».
  My live run refutes it (`scrollHeight == clientHeight` ×3, scroller is `html`). Correction landed.
- **BEFORE JSON internal consistency** (I cannot re-measure the parent without editing source): every
  row closes arithmetically against the parent's CSS. 390x844 lift 121 → 844−635 = 209 = gutter 16 +
  floor 72 + lift 121 ✓. 840x900 lift 116 → 900−696 = 204 = 16+72+116 ✓. 1600x1100 lift 46 →
  1100−1030 = 70 = 24+0+46 ✓. Fabricated numbers do not close like that.

## 3. GATE — broken on purpose in a scratch copy, six ways

Copied `floatingCorner/` + `styles/` outside the repo (baseline green there: 54/54, exit 0) and
reintroduced the defect. **No repo file was modified.**

| Injected defect | Gate |
|---|---|
| U4's exact shape: `main, .app-content { padding-bottom: var(--corner-dock-reserve-block, 100px) !important }` in `styles/dente-redesign.css` | **RED**, exit 1, «резерв должен применяться один раз, найдено 2» |
| Reserve consumer deleted entirely (hardcoded 80 px back) | **RED**, exit 1, «найдено 0» |
| A second consumer in a CSS file outside `styles/` and `floatingCorner/` | **GREEN** — hole |
| The single consumer moved back onto the OUTER box (`main.app-shell.dente-redesign`) | **GREEN** — hole; the gate never checks the selector |
| Two consumer declarations collapsed onto ONE source line | **GREEN** — hole; the gate counts lines, not declarations |
| **`@media (max-width: 840px) { .app-shell.dente-redesign .workspace { padding: 10px 12px 80px !important } }` appended after the reserve rule — U4's ACTUAL ≤840 px defect** | **GREEN** — see F-F |

## 4. FINDINGS

### F-A — HIGH — the F1 remedy is dead on arrival, and I proved it in the browser
`handoff.md` F1: «роли `dialog`/`alertdialog` добавлены в `INTERACTIVE_ROLES`, тост стал мишенью,
**панель ему уступает**». First half true, second half false at the packet's own declared HEAD.

Injected into the live page: `<div role="dialog" tabindex="-1">` at `position:fixed; right:24px;
bottom:24px; width:384px; height:224px; z-index:999999` — the exact geometry and semantics of
`IncomingCallToast.tsx:67` (`fixed bottom-6 right-6 z-[999999] w-96`). Then fired
`window.dispatchEvent(new Event("resize"))`, which is the listener the dock itself registers
(`window.addEventListener("resize", scheduleImmediate)`), so a pass is guaranteed:

```
390x844   toast 384x224  lift=""(0)  bar 708..756   toast 596..820   overlap 7 680 px  share 0.089
1600x1100 toast 384x224  lift=""(0)  bar 1028..1076 toast 852..1076  overlap 13 362 px share 0.155
```

Controls in the same run prove the trigger and the machinery are live, so the null result is the
threshold and nothing else:

```
1600x1100 same div shrunk to 384x60   -> lift="60px"   (share >= 0.5, dock yields)
1600x1100 button 160x44 on the band   -> lift="46px"
390x844   button 160x44 on the band   -> lift="46px"
```

For `share >= 0.5` the toast would have to be **≤69 px tall** (I ran the shipped `cornerBlocksTarget`
across heights: 0.504 at 69 px, 0.496 at 70 px). It is a `p-5` column with a header row, a caller
block and a bulleted «Скрипт разговора» list. So the toast is recognised by the predicate and then
discarded by the area rule, the dock does not lift, and the `z-index: 999999` toast still covers the
mic / help / search buttons on every incoming call — the exact wording of U4 review F1.

The unit test added for this (`cornerDockLayout.test.ts:139`) exercises only `isCornerObstacle`; it
never runs the toast rectangle through `cornerBlocksTarget`, which is why a 54-test suite is green on a
self-contradiction. NOT PROVEN #2 honestly says live yielding was not *observed* — but "not observed"
and "arithmetically impossible" are different claims, and the F1 section plus `bda50170d`'s body assert
the effective one. The handoff was written at 09:20, four minutes *after* fix 2 landed.

### F-B — HIGH — the 0.5 threshold cannot yield to a full-width button; on a phone that is every primary action
Measured live, dock band, `lift` read after a real pass:

| viewport | target | share | lift | target centre owned by |
|---|---|---|---|---|
| 1600x1100 | button 620x48 | **0.449** | `0px` | button (right edge → `button.corner-dock__control [DOCK]`) |
| 390x844 | button 370x48 (viewport-clamped) | **0.454** | `0px` | button |

This is structural, not a coincidence of my chosen widths. The dock bar is **168 px** wide at 390x844
and 278 px at 1600x1100. For an equal-height target the covered share is `barWidth / targetWidth`, so
the threshold `>= 0.5` is unreachable for any target wider than **336 px** (390x844) or **556 px**
(1600x1100). `cornerBlocksTarget`'s own doc comment justifies the threshold with «Маленькую кнопку
«Сохранить» панель накрывает целиком (доля 1.0) и обязана уступить» — true only while the button stays
small, and **nothing in the packet measures a button width.**

So I measured them. Enumerating every live `button/a/input/select/textarea/label/[role=button]` at
390x844 across five routes:

| route | dock bar | un-yieldable ceiling | widest short targets |
|---|---|---|---|
| `#patients` | 168 px | 336 px | `button.primary-button` «Запись» **364x44**, plus five `article.clickable-card` 364x113 |
| `#shift` | 168 px | 336 px | `button.primary-button` «Запись» **364x44** |
| `#schedule` | 168 px | 336 px | `button.primary-button` «Запись» **364x44** |
| `#finance` | 168 px | 336 px | `button.primary-button` «Запись» **364x44** |
| `#visit` | 168 px | 336 px | none over 336 (widest 314x36) |

«Запись» is the primary CTA and is present on four of five routes at **364x44** → maximum reachable
share `168·44 / (364·44)` = **0.4615**. The dock can never yield to it at any scroll position. Its
centre (x ≈ 195) stays left of the bar (206..374), so the button remains hittable — this is a hole in
the threshold's justification and in the packet's evidence, not a dead button. F-C is the case where
the centre is actually lost.

### F-C — HIGH — a live `<label>`/`<input>` on the patient form is now under the dock, and the parent commit avoided it
Measured live at 1600x1100, `#patients`, theme light, elements identified by name and text:

| target | box | share | `cornerBlocksTarget` | centre hit-test |
|---|---|---|---|---|
| `<label>` «Email» | 287x88 at (1254,1030) | **0.443** | false — no yield | **`button.omnibar-trigger-btn` [DOCK]** |
| `<input>` | 261x40 at (1267,1065) | 0.243 | false — no yield | input (still itself) |

`document.elementFromPoint` at the label's centre returns the dock's search button: the dock owns that
pixel, and `.omnibar-trigger-btn` is a real `pointer-events: auto` control, not a transparent region.

That this is a regression of *this* packet is arithmetically airtight from the builder's own BEFORE
data. `resolveCornerPlacement` derives candidates as `ceil(footprint.bottom − obstacle.top)` =
`1076 − 1030` = **46**, and `scratch/v1-corner-before.json` records the pre-packet applied lift at
1600x1100 as exactly **46 px**. The parent lifted over this label. Fix 1 raised it to 158. Fix 2
dropped it to 0.

Why nobody saw it: `scratch/probe-corner-obstacles.mjs` was run only at 390x844 and 840x900, at
09:12–09:13 — **before** fix 2 landed at 09:16. The corner's obstacle behaviour at 1600x1100 was never
measured, before or after, and no NOT-PROVEN item names that gap (the one declared, #4, is compact
density).

I do **not** charge the `article.clickable-card role="button"` tiles at 390/840 (share 0.163 / 0.12):
their centres stay reachable and record-correction #7 discloses them for the lead's visual judgement.

### F-D — MEDIUM — the F4 win is attributed to the F4 fix; the packet's own intermediate data says otherwise
`handoff.md` F4 and `state.md` publish `295 -> 90 / 130 / 380` and «время внутри
`getBoundingClientRect` упало на 93-98 %, **потому что** чтение геометрии больше не идёт сразу после
записи в стили». The builder's own `scratch/v1-corner-after.json` — fix 1 alone, i.e. the actual F4
work (10 Hz throttle + removal of the write-before-read) — refutes the causal half:

| viewport | BEFORE | after fix 1 ONLY | after fix 2 |
|---|---|---|---|
| hits 390x844 | 295 | **405 (+37 %)** | 90 |
| hits 840x900 | 295 | **385 (+31 %)** | 130 |
| hits 1600x1100 | 295 | **615 (+108 %)** | 380 |
| rectMs 390x844 | 19.34 | 6.92 (−64 %) | 0.36 (−98 %) |
| rectMs 840x900 | 12.90 | 6.47 (−50 %) | 0.47 (−96 %) |
| rectMs 1600x1100 | 19.79 | 1.89 (−90 %) | 1.38 (−93 %) |

The F4 fix alone made hit tests worse at **every** viewport, and delivered −50 % to −90 % of the rect
cost, not −93 % to −98 %. The remainder of both headline numbers comes from fix 2's area threshold
suppressing re-sampling — a **behaviour change**, and the same behaviour change that produced F-A,
F-B and F-C. On any screen where the corner genuinely must yield, the win evaporates and the per-pass
cost is up to 3× the old one (`CORNER_MAX_SOLVE_PASSES = 3` × 5 sample points versus a flat 5).

Load sensitivity, since the packet compares runs taken minutes apart: my 1600x1100 frame mean was
85.18 ms against the BEFORE run's 51.18 ms — the lowest of the six runs on disk. Hit counts at that
viewport across four independent AFTER runs are 380 / 345 / 415 / 410, i.e. +17 % to +41 % over 295.
The direction of the declared regression is real; its magnitude is not pinned.

### F-E — MEDIUM — F2's user-visible symptom is ~299 px and the "176 → 144" headline omits 96 px inside the box it measured
`main.css:13013` hands `padding-bottom: calc(96px + env(...))` to `.work-grid`, `.patients-panel` and
six more selectors, not just the shell — and those live **inside** `.workspace`. So the trailing dead
space at 390x844 is `.patients-panel` 20 + `.work-grid` **96** + `.workspace` 144, not 144. The
mechanism claim ("one consumer, proven twice") is correct and I verified it twice myself; the
**symptom** the brief complained about is still roughly a third of the phone viewport. Pre-packet the
same stack was ~331 px, so the real improvement is ~10 %, which is exactly the 32 px the builder
claims and no more. `handoff.md` files the `main.css:13013` spray as debt #2 without measuring its
contribution, and the F2 verdict «CLOSED по существу» reads as closing the symptom, which it does not.

### F-F — MEDIUM — the CSS gate does not catch the mechanism that actually broke the reserve
§3, row 6. The gate counts occurrences of `var(--corner-dock-reserve-block`. It cannot see a
**competing declaration** on the same selector — which is precisely how the reserve died at ≤840 px
(`padding: 10px 12px 80px !important` at equal (0,3,0) specificity, later in the file). I reinstated
that exact shape in a scratch copy and the gate stayed **GREEN, exit 0**.

This is not hypothetical: `dente-redesign.css:443` still declares
`.workspace, .dnt-content { padding: 14px 14px 100px !important }` inside `@media (max-width: 840px)`
— a third hardcoded bottom padding on `.workspace`, live at HEAD. It loses today only because it is
(0,1,0) against the reserve rule's (0,3,0). The §17 comment claims «Долгота вместо shorthand убирает
саму возможность спора»; the possibility is still there, one specificity notch away, and ungated.
Three further evasions in §3 (unscanned CSS dirs, wrong box, one-line collapse) compound it —
`apps/web/src` holds ~30 more `.css` files the scan never opens.

### F-G — MEDIUM — the closing command handed to the lead crashes at HEAD, TRUE_EXIT=1
`handoff.md` NOT PROVEN #2 and #4 both close with `node scratch/probe-corner-obstacles.mjs …`. I ran it:

```
$ node scratch/probe-corner-obstacles.mjs 1600 1100
page.evaluate: TypeError: Failed to execute 'elementsFromPoint' on 'Document':
  The provided double value is non-finite.
TRUE_EXIT=1
```

Cause: fix 1 made `applyLayout` skip the write when `placement.lift === appliedLift`, and `appliedLift`
starts at 0 — so `--corner-dock-lift` is never written in the common case.
`getComputedStyle(host).getPropertyValue("--corner-dock-lift")` returns `""`,
`Number.parseFloat("")` → `NaN`, and the probe's whole resting rectangle becomes `NaN`. The builder
changed the contract his own instrument depends on, cited that instrument in a handoff written after
the change, and never re-ran it — which is also why F-A survived. The surviving
`scratch/v1-obstacles-{390x844,840x900}.json` still carry `appliedLift` 121 and 299, i.e. pre-fix-2
state, confirming they were never refreshed.

### F-H — LOW — a false comment survives in a file this packet edited, describing the mechanism this packet deleted
`cornerDock.css:63-68`, inside the `.corner-dock` block, untouched although the file was edited:

```
/* НАМЕРЕННО без transition на bottom. Владелец региона сбрасывает подъём в
   ноль и тут же читает getBoundingClientRect(), чтобы замер шёл от исходного
   положения. ... */
```

`bda50170d` deleted exactly that write-then-read (replaced by `measureRestingFootprint` /
`liftCornerRect(rect, -appliedLift)`). The conclusion (no transition on `bottom`) is still correct and
still required; the stated reason is now false. Same defect class as spec F6, in a packet whose
headline is «поправки к ложным записям».

### F-I — LOW — declared debt #6 is the packet's own motivating example, not an exotic input
I ran the shipped `resolveCornerPlacementSampled` against a column of 176x48 targets at a 48 px pitch:
`placement { lift: 144, compact: false }`, `sampleCount 3`, and **one residual target covered at share
1.0** at the chosen lift. `handoff.md` debt #6 calls this «непрерывная лестница мишеней… Реальных
страниц с такой геометрией в замере не встретилось» — but `bda50170d`'s own body motivates F3 with
«Панель плана лечения — это СТОЛБИК кнопок», which is that geometry. F3 is marked **CLOSED**; the
bounded-but-wrong case is real, tested for boundedness only, and under-declared.

### Nits
- **N1** — the celebrated "24 px clearance" at ≤840 px is produced by the foreign hardcoded
  `--corner-dock-bar-floor: 4.5rem` (72 px) from `f50f7f67d`, not by the measured 64 px nav:
  `max(64px, 72px)` = 72. Debt #1 names the floor but only as «угол висит выше нужного». The sharper
  risk is arithmetic: `computeCornerReserve` uses `barClearance`, while the CSS positions with
  `max(barClearance, barFloor)`. Today the double-gutter gives 16 px of slack and the 8 px overshoot
  fits (occupied 136 ≤ reserve 144). If `floor − clearance` ever exceeds the gutter, the published
  reserve **under-counts** the dock and the last element goes back under the panel. Undeclared.
- **N2** — `main.app-shell.dente-redesign { padding-bottom: 0 !important }` at ≤840 px also drops
  `env(safe-area-inset-bottom)`, re-supplied only through the measured height of `.dnt-bottom-nav`.
  On any ≤840 px state where the nav is `display:none` or the dock is unmounted (login / PIN, reserve
  fallback 48 px), the safe-area compensation is gone. Headless Chromium resolves `env()` to 0, so
  this is a device check. The 841–860 px reasoning is exactly right: `.sidebar { display: none }` sits
  inside `@media (max-width: 840px)` and so does the override, so the legacy strip keeps its 96 px.
- **N3** — REACHABILITY cites `CornerDock.tsx:155` for the single `elementsFromPoint` caller; at HEAD
  it is `:172`. `:155` is `findBottomBar`.
- **N4** — «the 56 px the review assumed» was CORRECT when U4's review was written; the foreign
  `f50f7f67d` collapsed `--corner-dock-control-primary` to `3rem` five minutes before the BEFORE
  probe. The handoff names `f50f7f67d` honestly; only the CLAIMED-PROVEN bullet frames it as the
  reviewer's error.
- **N5** — pre-existing, not chargeable here: at 841–860 px the legacy `.sidebar` becomes a fixed
  bottom strip while `.dnt-bottom-nav` is hidden, and `BOTTOM_BAR_SELECTOR` knows only
  `.dnt-bottom-nav`, so the dock's clearance is 0 in that 20 px window.

## 5. THINGS I TRIED TO BREAK AND COULD NOT

- **Teardown.** `detach()` cancels the rAF handle, clears `deferTimer`, removes `resize`, removes
  `scroll` with the matching `{capture:true}`, disconnects BOTH ResizeObservers, clears `VAR_RESERVE`
  from `documentElement`, removes the host; `attach()` re-initialises every module-level `applied*`
  and `lastPassAt`. No leak found.
- **`measureRestingFootprint` arithmetic.** The lift is applied only inside the host's
  `bottom: calc(...)`, so it is a pure translation and subtracting `appliedLift` is exact. No
  `transition` on `bottom` (the only transitions are on the controls' background/border/color/
  transform), so no intermediate value can be read.
- **Termination of `resolveCornerPlacementSampled`.** Obstacle set only grows (`cornerRectKey` dedup),
  loop bounded by 3, `added === 0` breaks, equal placement breaks. Executed it myself on a 12-step
  staircase: terminates in 3 samples. (Correctness residual: F-I.)
- **`shouldRunCornerPass`.** Executed: `immediate` always runs; `stream` with `lastRunAt: null` runs;
  16 ms elapsed → `{run:false, deferMs:84}`; 100 ms → runs. Pure function of time, correctly tested.
- **Second owner / hollow facade / deleted `useAppLogic` field / undeclared Russian literal /
  hardcoded hex / mojibake / foreign paths in the index.** None. `dockHosts: 1` in the browser at all
  three viewports. `Omnibar.tsx` change is comment-only.
- **The F2 DISPUTE.** I tried hard to save the previous reviewer's F2 and could not. The builder is
  right on every one of the three numbers.
- **Nothing was silently ignored.** Every U4 item is addressed in writing: F1 partially (remedy broken
  — F-A), F2 closed + correctly disputed, F3 closed (residual F-I), F4 closed on the named cost with
  the regression declared (attribution F-D), F5 closed, F6.1 recorded as a git-history correction with
  a task for the lead, F6.2 correctly disputed, F7 closed (`52.5rem`→`840px`, `60rem`→`768px`, both
  verified in `cornerDock.css`).

## 6. WHAT THE LEAD STILL OWNS

I saw no pixels either. `probe-corner-reserve.mjs` runs clean (I completed it, exit 0);
`probe-corner-obstacles.mjs` does **not** (F-G). Before re-capturing plates, note F-C: at 1600x1100 the
plate will show the search pill sitting on the «Email» label of the patient form.

Two record items are still open and belong to the lead, correctly declared by the builder rather than
claimed done:
- F6.1 — `.agents/archon/progress.md` still contains no correction for `0112f293e`'s retracted
  «Подпи…» mechanism (`rg 'Подпи|0112f29'` on it: no hits).
- record-correction #5 — U4's `review.md` F2 still states «applied TWICE / ~304px of an 844px
  viewport». It is wrong on the mechanism and I confirmed that independently. The next agent will hunt
  for a double application that never existed unless the lead annotates it.

**Disclosure — two tracked files I dirtied.** `npm run build -w @dental/web` regenerated
`packages/shared/dist/index.d.ts` and `packages/shared/dist/index.js`, which are checked in and were
**stale relative to `packages/shared/src/index.ts`** (the rebuilt output adds `moneyRubSchema`, which
exists in the committed source but not in the committed dist). That is a pre-existing foreign hygiene
defect, unrelated to V1, exposed by the mandated rebuild. I am read-only, so I did not revert it:
`git checkout -- packages/shared/dist` restores the committed state, or a commit of the regenerated
output fixes the staleness. Note also that the dev server resolved the stale shared build during every
measurement in this packet, mine included — it does not touch corner geometry, but it is the kind of
staleness that has hidden defects here before.

Reviewer probes were written outside the repo and imported `playwright` by absolute path; the only
file I added under `scratch/` is `v1-corner-adversary2.json` (my re-measurement). No source file and
no index entry was touched; `git diff --cached --name-only` is empty.
