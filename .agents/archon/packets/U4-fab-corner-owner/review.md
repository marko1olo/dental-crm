# U4-fab-corner-owner — adversarial review

Commit attacked: `0112f293e878264c66dedb8816b1c48e2557e7e7`
Follow-ups: `952025f05` (test comments + packet material), `2750f01d2` (state.md)
Reviewer posture: disbelief. Every claimed command re-run, true exit code captured without a pipe.
Read-only on source. No server started, no screenshot pipeline.

VERDICT: **NEEDS_REWORK**. Not a fabrication packet — every self-claim reproduced exactly.
Two real defects introduced/left by this commit plus a false central architectural claim.

---

## 1. PROOF AUDIT — every claimed command re-run

| Claim | Re-run result | Verdict |
|---|---|---|
| `node --import tsx --test .../cornerDockLayout.test.ts` exit 0, tests 35 / suites 8 / pass 35 / fail 0 | TRUE_EXIT=0, tests 35 / suites 8 / pass 35 / fail 0, duration 157.0 ms | CONFIRMED |
| `npm test -w @dental/web` exit 0, 496 / 91 / 496 / 0 | TRUE_EXIT=0, tests 496 / suites 91 / pass 496 / fail 0 | CONFIRMED |
| `npm run typecheck -w @dental/web` exit 1, EXACTLY 6 errors, all `DocumentsView.tsx(2178\|2185\|2193\|2224\|2232\|3082,20) TS2304 AnamnesisField`, 0 in claim | TRUE_EXIT=1, `grep -c "error TS"` = 6, all six at those exact lines/columns, `grep -cE "floatingCorner\|Omnibar\|VoiceAssistant\|dente-redesign"` = 0 | CONFIRMED |
| `vite build` exit 0, PWA 111 entries | TRUE_EXIT=0, `built in 13.77s`, `precache 111 entries (11102.18 KiB)`, `dicom-components 4,257.63 kB` | CONFIRMED (11102.18 KiB and 4,257.63 kB match to the decimal; 13.77 s vs claimed 14.19 s is timing variance) |
| Built CSS carries `.corner-dock .omnibar-trigger-btn{position:static` | matched in `apps/web/dist/assets/voice-assistant-ui-hOs8g6dv.css` — same chunk hash as claimed | CONFIRMED |
| 9 files, +1897 / -288 | `git show --stat`: 9 files changed, 1897 insertions(+), 288 deletions(-) | CONFIRMED |
| dente-redesign.css "101 lines changed" | `--numstat`: 33 + 68 = 101 | CONFIRMED |
| cornerDock.css 475 lines, 0 static hex | `wc -l` = 475; `rg -c "#[0-9a-fA-F]{3,8}"` exit 1 | CONFIRMED |
| Mojibake scan across all 9 changed files | `rg -c "[РС][\x{0080}-\x{00FF}]"` exit 1 (zero matches) | CONFIRMED |
| neutral-850 / neutral-905 / neutral-705 gone from apps/web/src | `rg` exit 1 | CONFIRMED |
| z-scale 500 / 1000 / 2000 / 9998 / 9999 | main.css@HEAD:15477-15482 `--z-sticky:500 --z-drawer-overlay:1000 --z-modal-overlay:2000 --z-toast:9999`; `.omnibar-trigger-btn` at main.css@HEAD:16370 with `left:1.5rem; z-index:9998` | CONFIRMED |
| Index hygiene: only own files | `git show --name-only` per commit: 9 source files / 4 packet files + test / 1 state.md. Zero churn — no `apps/api/.data/*.json`, no tsbuildinfo, no `dist/`, no `scratch/**`, no foreign paths | CONFIRMED |
| Commit subject encoding | `od -c` on the subject: `321 203 320 263 320 276 320 273` = valid UTF-8 «угол»; `302 253 ... 302 273` = proper `«»` | CONFIRMED, no mojibake |

Two claims a fabricator would have skipped, and they check out:
- `scratch/probe-floating-buttons.mjs` — the cited closing command — **exists** (4764 bytes). Not an invented script name.
- Exactly ONE copy of the dock module ships: `rg -c "dente-corner-dock" dist/assets/*.js` returns a single
  file (`voice-assistant-ui-D3Pz_q9a.js`), and `.corner-dock{` appears in exactly one built stylesheet
  (2 occurrences = base rule + narrow media query). The "one host element" claim survives bundling.

The NOT-PROVEN list is honest and complete. It names the real gaps (no pixels seen, no profile, StrictMode
unobserved, reserve not measured live) and gives runnable closing commands.

**The handoff corrects the lead rather than flattering him.** handoff.md:211-217 retracts brief item B1.2:
the «Подпи…» truncation is caused by the treatment-plan panel's own «Подписать»/«Сохранить» markup, not by
the mic FAB. I opened `.dente-ops-shots/light_duplicateAlert_ПУСТО.png` myself: the builder is right and the
brief is wrong. The FABs sit at ~(1477,896) and ~(1545,896), on the dark «План лечения» card, *below* the
purple «Сохранить» button; both truncations are horizontal overflow of the panel past the viewport edge.
This is the opposite of the disease.

## 2. DEFECT REALITY — was there anything to fix?

CONFIRMED from source at `0112f293e^`, not from the report:
- `dente-redesign.css@^:826,828` — `:root { --floating-corner-bottom: 1.5rem; --floating-corner-step: 48px }`
- `dente-redesign.css@^:833` — `.omnibar-trigger-btn { bottom: var(--floating-corner-bottom) !important; z-index: 9998 !important }`
- `dente-redesign.css@^:878` — `--floating-corner-bottom: 4.5rem` inside `@media (max-width: 840px)` — the guessed nav height
- `Omnibar.tsx@^:88` — `createPortal(..., document.body)` for the pill; `VoiceAssistantUI.tsx@^` — a second body portal at `z-50`
- Plates opened personally. `narrow_full.png` (720x1100): the collapsed search circle is pressed against the
  top edge of the bottom nav — measured off the plate, circle bottom ≈ y1028, nav top ≈ y1036. 4.5rem/72px
  guessed against a ≈64px nav, i.e. an 8px accidental gap, not a designed clearance.

Three uncoordinated `position: fixed` islands with two z-index values and a hardcoded nav clearance: real,
functional, not cosmetic.

## 3. REACHABILITY — traced, not read

`App.tsx:7` imports VoiceAssistantUI, `:8` imports Omnibar (static, not lazy). Rendered at `:4729` and `:4741`,
unconditional, inside `<section class="workspace">`. `<nav className="dnt-bottom-nav">` is at `:4752`,
**outside** `</section>` — a sibling of `.workspace` under `<main class="app-shell dente-redesign">`, and
`.app-shell` declares no transform/filter/backdrop-filter, so the nav is genuinely viewport-fixed and
`getBoundingClientRect().top` is a real viewport coordinate. The measurement premise holds.
The host is `document.body.append(host)` — outside every containing block. **Not dead code.**

## 4. FINDINGS

### F1 — HIGH — a fourth live island in the same corner, at 1111x the dock's z-index, that the dock is written to ignore
`apps/web/src/components/IncomingCallToast.tsx:67`
```
className="fixed bottom-6 right-6 z-[999999] flex w-96 flex-col ..."
```
Rendered from `App.tsx:4750` — nine lines below the `<Omnibar />` this packet rewrote. Same anchor as the dock
(`right: 1.5rem`, `bottom: 1.5rem`), 384 px wide, `z-index: 999999` against the dock's 900.

And the dock cannot yield to it: the toast root is `<div role="dialog">` with tabIndex -1. `isCornerObstacle`
(`cornerDockLayout.ts:196`) has `div` in neither `INTERACTIVE_TAGS` nor `dialog` in `INTERACTIVE_ROLES`, so
the toast is not an obstacle, the bar does not lift, and the toast simply covers the mic / help / search
buttons whenever a call arrives — the exact failure class this packet exists to remove.

`handoff.md` debt #6 files this as a *future* risk ("если какая-то другая функция **добавит** четвёртый
`position: fixed` в этот угол") while the fourth already ships, and states "Проверены и переселены три
элемента". The corner was not inventoried. One command finds it:
`rg -n "fixed[^\"']*bottom-[0-9]" apps/web/src --glob '*.tsx'`. `cornerDockLayout.ts:14` asserts
"Никто больше не имеет права ставить `position: fixed` в правый нижний угол" — untrue at HEAD.

Second violator from the same command: `apps/web/src/components/schedule/WaitlistDrawer.tsx:188` —
`fixed bottom-4 right-4 z-50` (minimized waitlist pill). This one the dock *does* yield to (its inner element
is a `<button>`), but only if one of the five sample points lands on it; and it went from tying the FABs at
z-50 to being definitively painted over at z-900.

### F2 — MEDIUM — the corner reserve is applied twice at ≤840px; ~304px of an 844px phone viewport becomes reserve
Both of these now read the same variable, and both match the same DOM:
- `dente-redesign.css:670` (inside `@media (max-width: 840px)`) — `main, .app-content { padding-bottom: var(--corner-dock-reserve-block, 100px) !important }`
- `dente-redesign.css:786` — `.app-shell.dente-redesign .workspace { padding-bottom: var(--corner-dock-reserve-block, 48px) !important }`

The shell is `<main className="app-shell dente-redesign">` (`App.tsx:2299`), so the bare `main` type selector
hits it, and `.workspace` is its flex child. `main.css:186` declares `* { box-sizing: border-box }` and the
shell has `min-height: 100vh`, so the shell's `padding-bottom` shrinks `.workspace`'s visible box by `reserve`
and `.workspace` then adds another `reserve` of scroll padding inside it.

At 390 px: gutter 1 rem = 16, comfortable bar height = `--corner-dock-control-primary` 3.5 rem = 56,
nav ≈ 64 → `computeCornerReserve` = ceil(56 + 32 + 64) = **152 px**, applied twice ≈ 304 px of an 844 px
viewport. Before this commit it was 100 + 100 = 200 px. **Net regression ≈ +104 px of dead vertical space on
a phone**, caused by this commit's own edit at `:670`.

Side effect that undercuts the design: the bar's top now sits 16+64+56 = 136 px from the viewport bottom while
`.workspace`'s visible box ends at 152 px from the bottom — so at narrow widths the dock floats entirely below
the workspace, in the shell's blank padding band, the lift/compact machinery has nothing left to collide with,
and the second 152 px of scroll padding is unreachable dead space.

The reserve claim itself is sound on paper: `.app-shell.dente-redesign .workspace` at `:786` is (0,3,0)
+`!important` and follows the `padding: 20px 24px 48px !important` shorthand at `:776` of identical
specificity, and beats `.workspace, .dnt-content` (0,1,0) at `:426`. Both fallbacks ship in the entry CSS
(`index-EYCl2vcl.css` contains `corner-dock-reserve-block, 100px` and `, 48px`). The bug is that it lands
twice, not that it fails to land.

### F3 — MEDIUM — the obstacle list is sampled only at the un-lifted footprint, so the lift can park the bar on a button it never looked at
`CornerDock.tsx:205-209` collects obstacles at `footprint` with lift = 0, then `resolveCornerPlacement`
(`cornerDockLayout.ts:288-309`) evaluates every candidate lift against **that same list**. Anything sitting
above the corner that no sample point touched is invisible: a `lift: 36` can put the bar squarely on a
different «Сохранить» and still return `compact: false` with zero computed residual overlap. The compact
re-pass (`CornerDock.tsx:211-229`) re-samples, but again only at the un-lifted compact footprint.

The test that proves "minimal lift with zero residual overlap" (`cornerDockLayout.test.ts:255-270`) hands the
obstacle in by hand, so it structurally cannot catch this. The arithmetic is correct; the input is incomplete.
On real data — a treatment-plan panel is a *column* of buttons — this is the likely failure mode.

### F4 — MEDIUM — the layout pass runs every scroll frame on every screen, forcing 2 full layouts + 5 hit tests (10 in the compact path)
`CornerDock.tsx:261` adds a capture-phase `scroll` listener on `window`, so every nested scroller feeds
`schedule()`. Per frame `applyLayout` writes `--corner-dock-lift` and `data-corner-density`, then reads
`bar.getBoundingClientRect()` (forced synchronous layout), then `collectObstacles` runs 5
`document.elementsFromPoint` calls plus a `getBoundingClientRect()` for **every element in every returned
stack**, then writes the lift again (invalidating layout for the next frame). If `compact` fires, all of it
runs a second time in the same frame. Honestly declared NOT PROVEN by the builder — but this is the one code
path guaranteed live on every screen for every logged-in user, in an app whose largest chunk is 4.2 MB of
DICOM. Unprofiled cost on a universal hot path is a shipping risk, not a footnote.

### F5 — LOW — five exports the shipped corner never calls; the headline "slot order" coverage claim tests one of them
Verified with `rg` excluding `*.test.ts`:
- `sortCornerSlots` (`cornerDockLayout.ts:104`), `isCornerSlotId` (`:96`), `cornerRectsOverlap` (`:111`) —
  no production caller. `CornerDock.tsx` imports none of them.
- `cornerSlotLabels` (`cornerDockLabels.ts:140`) and `cornerDockSlots` (`CornerDock.tsx:332`, commented
  "Экспорт для тестов") — **no caller at all**, not even a test.

Consequence for the proof, not just for tidiness: the claim "Covers slot order independent of mount order"
(and `handoff.md:104`) rests on `cornerDockLayout.test.ts:45-61`, three assertions against `sortCornerSlots`,
a function production does not run. The real ordering guarantee is
`for (const slot of CORNER_BAR_SLOTS) bar.append(makeSlot(slot))` (`CornerDock.tsx:84`) and is untested.
The property does hold in production — by construction, via the array the test *does* pin at `:36-42` — so
this is an over-claim of coverage plus §2 dead code, not a hollow fix.

### F6 — LOW — the commit message permanently records the mechanism the handoff retracts, and carries forward an unverifiable CSS claim
1. `0112f293e`'s body states «Подписать» обрезано до «Подпи…», до «Сохранить» нельзя дотянуться — кнопка, на
   которой сидит плавающий элемент, не нажимается». `handoff.md:211-217` corrects exactly that. My own read of
   the plate agrees with the handoff. The retraction lives in a packet file; the wrong version is permanent
   git history.
2. `Omnibar.tsx:88` (a comment this commit rewrote and expanded) asserts `.workspace` has
   `backdrop-filter: blur(12px) saturate(1.8)`. `rg "saturate\(1\.8\)" apps/web/src/styles/*.css` returns
   nothing, and the three `.workspace` rules (`main.css:503`, `dente-redesign.css:377`, `:776`) declare no
   backdrop-filter. The stated reason for keeping the body portal is unverifiable at HEAD. Pre-existing text,
   but this packet rewrote the comment and kept the claim.

### F7 — LOW — two breakpoint mismatches introduced by the move
- `cornerDock.css:461` uses `@media (max-width: 52.5rem)` while `.dnt-bottom-nav` and the shell use
  `max-width: 840px`. Media-query `rem` tracks the browser's default font size, so a user at 20px base gets
  the corner's narrow density at 1050px while the nav still appears only ≤840px.
- `cornerDock.css:446-454` gates `DictationHints` behind `min-width: 60rem` (960px). The removed markup was
  `hidden md:block` (768px). Dictation hints now vanish on 768-960px tablets where they used to show.
  Not mentioned in the handoff.

## 5. THINGS I TRIED TO BREAK AND COULD NOT

- **Hollow facade / magic constants.** None. `voiceMeter.ts` is a genuine deterministic function of `volume`
  (clamps NaN and out-of-range, floor share 0.12, centre-weighted); the `Math.random()` fabrication is really
  gone. `CORNER_SAMPLE_INSET = 1` and the hairline borders are the only px, both justified.
- **Second owner.** The dock host is refcounted; exactly one module instance in the bundle; `attach()` guards
  on `dockDom`. No duplicate `#dente-corner-dock` reachable from bundling.
- **Missing teardown.** `detach()` removes `resize`, removes `scroll` with the matching `{capture:true}` flag,
  `disconnect()`s the single ResizeObserver (both observations), cancels the rAF handle, clears
  `--corner-dock-reserve-block`, removes the host. The pre-existing `setTimeout` at VoiceAssistantUI:48-56
  still clears. No leak found.
- **Deleted `.omnibar-trigger-btn` styling orphaning the pill.** Checked declaration-by-declaration against
  `main.css@HEAD:16370-16389`: `inset: auto !important` covers its `bottom`/`left`, and `background` /
  `color` / `border` shorthands with `!important` beat main.css's non-important `background-color` /
  `color: white` / `border: none`. `:focus-visible { outline: 2px solid ... !important }` beats
  `outline: none`. The only consumer of the class is `Omnibar.tsx:111`, inside the dock. Override is complete.
- **Undeclared token.** `--ink`, `--ink-2`, `--paper`, `--paper-soft`, `--paper-strong`, `--line`,
  `--line-strong`, `--muted`, `--teal*`, `--focus-ring`, `--warn-*`, `--bad-fg`, `--shadow-2/3` all defined in
  `dente-redesign.css` for all three themes. `--teal-glow` is declared twice with *incompatible* shapes —
  a bare colour in `dente-redesign.css:26/81/129` and a full box-shadow value in `premium.css:19/65/111` —
  but `dente-redesign.css` is imported after `premium.css` (`main.tsx:12-13`) at equal specificity, so the
  colour wins and `VoiceAssistantUI.tsx:240`'s inline `0 0 Npx var(--teal-glow)` stays valid CSS. Latent trap,
  not a live break.
- **Undeclared Russian literal.** All corner text is in `cornerDockLabels.ts`; no label resolves undefined.
- **Deleted useAppLogic return field.** None touched.
- **Unstyled-host window.** `.corner-dock{position:fixed...}` ships only in the code-split
  `voice-assistant-ui-hOs8g6dv.css`, not linked from `dist/index.html`. But the host is created only by code
  inside that same chunk and Vite's preload helper awaits the chunk's CSS, so no in-flow flash is reachable.
  Untestable without a browser; noted, not charged.

## 6. WHAT THE LEAD STILL OWNS

Nothing in the rendered result was verified by me either — no server, no pipeline, per constraints. The
builder's closing commands are correct and I confirm the probe script exists:
`node scratch/probe-floating-buttons.mjs` (expect exactly one `#dente-corner-dock`, zero overlap with
`.dnt-bottom-nav`), plus DevTools computed `padding-bottom` on both `<main class="app-shell">` **and**
`.workspace` — F2 predicts both will read ~152px at 390px, which is the check that settles it.
