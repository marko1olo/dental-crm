# X1-corner-redesign — ADVERSARIAL REVIEW (written as I go)

Two reviewers have worked this packet. Reviewer #1 was killed mid-review at 14:59; their text is
preserved verbatim below the line, because part of it is right and the rest is the most instructive
mistake in this packet's file. Reviewer #2 (this section) settled the question they left open.

Reviewer #2: independent adversarial reviewer (did not write this code).
Commits under attack: `f0121f0c293f664777d919e6fdc960eb7d139cfa`, `5fd41faad7b54d822d8660792405f402a37f7563`
Repo HEAD at review time: `1d22de291` (both commits confirmed ancestors).
Dev server: 5173 already running (200). NOT started/restarted by me.
My probes (untracked, never staged): `scratch/rev2-x1-dedupe.mjs`, `scratch/rev2-x1-topbar.mjs`,
`scratch/rev2-x1-headergrowth.mjs` + their `.json` outputs, `scratch/rev2-parent-cornerDockLayout.ts`.

---

## FINDING 0 (verdict-critical, and it OVERTURNS reviewer #1's headline)

**Reviewer #1's driver — "THE GROUP IS EMPTY, THE THREE ACTIONS DO NOT RENDER" — reproduces, but the
cause is the RUNNING DEV SERVER'S STALE TRANSFORM CACHE, not the committed source.**

Reviewer #1 correctly found that the dev server serves two urls for one file (I re-confirmed by curl at
review time):

```
/src/workspaceShell.tsx            -> workspaceActions/WorkspaceActions.tsx?t=1785234135879  (14:22:15)
/src/components/Omnibar.tsx        -> workspaceActions/WorkspaceActions.tsx?t=1785234960377  (14:36:00)
/src/components/VoiceAssistantUI.tsx -> workspaceActions/WorkspaceActions.tsx?t=1785234960377
```

Two urls = two ES module records = two module-level `hostDom` singletons: the mount builds host A into
`.top-actions`, the residents portal into host B, host B is never attached. Reviewer #1 then wrote *"the
split was almost certainly already present when they measured"* and treated the builder's numbers as
unreproducible. **That inference is wrong, and my experiment shows it.**

`scratch/rev2-x1-dedupe.mjs` — one page, same server, same code on disk; the only change is that the
served body of the three importers has the `?t=NNN` stripped from that one import specifier, so all
three resolve to one url and therefore one module record. This is exactly what a freshly started dev
server or any production bundle gives.

| config | 390x844 | 1600x1100 |
|---|---|---|
| control (two urls, as the server currently is) | hosts 1, placement nav, **controls 0**, sheet on click **390x95, controls []** | hosts 1, placement header, **controls 0** |
| deduped (one url) | hosts 1, placement nav, **controls 3**, sheet on click **390x299**, «Голос» 73px / «Поиск» 57 / «Справка» 57, hints 32/16/16px, each centre owned by itself, gap sheet→nav 0px | hosts 1, placement header, **controls 3**: «Поиск» 94x40, «Голос» 91x40, «Справка» 109x40 |

The deduped column **reproduces the builder's claimed numbers to the pixel** (390x299 sheet, 73/57/57,
gap 0). A fabricator cannot predict 73/57/57 and a 299px sheet. So the builder measured a coherent
module graph; the graph rotted afterwards (Vite embeds the dep's `lastHMRTimestamp` at the moment each
importer is transformed, so importers transformed on either side of a 14:36:00 edit disagree forever
until the file changes again or the server restarts).

**Consequences for the verdict.** The empty group is NOT a defect in these commits and is NOT grounds
for REVERT. What it is:
- a real, currently-live breakage of the shared dev server that will mislead the next agent and the
  lead's own visual pass. It is fixed by restarting Vite — which I am forbidden to do. **The lead must
  restart the dev server before judging pixels, or they will photograph an empty pill.**
- a genuine architectural fragility worth naming (FINDING 3 below): the design leans on a mutable
  module-level singleton shared across three import sites, and when that assumption breaks, three
  product controls vanish **silently** — `WorkspaceActions.tsx:387` returns `null` when the slot target
  is falsy: no console error, no empty state, and no test in the suite can see it.

## FINDING 1 (NEW, verdict-driving, nobody measured it) — THE HEADER GROWS 48-80px, AND AT 1600x1100 THE GROUP PUSHES «Запись» ONTO ITS OWN SECOND ROW

The builder measured 390x844, 720x1100, 840x900 (group in the nav — header untouched) and 1600x1100
(header). Reviewer #1 measured the topbar too, but **in the broken config, where the group renders
nothing and therefore occupies 2px** — so their topbar numbers are not a measurement of the shipped
layout. The band 841-1000px, where the bottom nav is gone (`max-width: 840px`) and the group lands in a
row that already holds six controls at the narrowest width that can happen, **was measured by nobody.**

`scratch/rev2-x1-headergrowth.mjs` — ONE page, ONE module graph, group's own host detached and
re-attached, `.topbar` height measured each time. Nothing else changes:

| viewport | `.topbar` with group | with mount `display:none` | DELTA | `.top-actions` visual rows | «Запись» alone on its row |
|---|---|---|---|---|---|
| 841x900 | 235px | 187px | **+48px** | 2 → 2 | with: no / without: yes |
| 900x900 | 235px | 187px | **+48px** | 2 → 2 | with: no / without: yes |
| 1000x900 | 187px | 187px | 0 | 2 → 2 | — |
| 1280x800 | 187px | 187px | 0 | 2 → 2 | — |
| **1600x1100** | **187px** | **107px** | **+80px** | **1 → 2** | **with: YES / without: no** |

Detail at 1600x1100 (`scratch/rev2-x1-topbar.json`): without the group, `.top-actions` is a single
371x42 row and «Запись» sits on it at x=1472..1573, y=140. With the group (298px wide), the row becomes
630x86 — **row 1** = group + icon-button + «Настроить» + dictation + lock, ending at right=1573;
**row 2** = «Запись», alone, at y=205. The `flex-wrap: wrap` the builder added blind via
`.topbar .top-actions:has(> .dnt-actions-mount--header)` is what turns this into silent growth instead
of an overflow.

Why this is a finding and not taste:
1. It is the **same defect class the builder found and self-reported in the bottom nav** — a sixth item
   grew permanent chrome 64→76px, which they measured, fixed in a second commit, and re-measured. The
   identical arithmetic at the top of the screen is +48 to +80px and was never measured at all.
2. The packet's headline win is **-111px of trailing dead space at 390x844** — a viewport where the
   group lives in the nav and the header is untouched. At every width ≥841px the packet **adds** 48-80px
   of permanent chrome. The trade is real but it is undisclosed and unmeasured, and Constitution §4
   (no visual overload) plus VISUAL_VERDICT §3 (the header's problem is already too many controls) are
   the two rules this lands on.
3. The commit message asserts the placement keeps «Запись» "последним и самым правым" — true, and
   incomplete: at 1600x1100 it is last, rightmost, **and alone on a second line it did not previously
   need.** That is a claim that reads as a layout guarantee and is not one.

Nothing overflows, no horizontal scrollbar appears, the clinic name is not clipped at any of the five
widths (`clipped: false`, 201x19 at each) — so this is growth, not breakage.

## FINDING 2 (NEW) — the builder's one unproven interaction, closed: it works

The builder disclosed "the header dropdown (notice) at wide … never exercised" and named the closing
command. I ran it (deduped config, 1600x1100, page scrolled to y=428, click «Справка»):
panel present, `384x560` at x=928..1312 / y=205..765, `panelFullyInViewport: true`,
`panelCentreOwnedBySelf: true`, page auto-scrolled 428→0 (that is `revealWorkspaceActions()` doing its
job — the one thing the builder shipped without exercising). The only clipping ancestors are the
notice's own `overflow: auto` scroller and the app shell at bottom 5299 / right 1600, i.e. no clip.
**PROVEN GOOD.** Credit: this is the disclosed gap and it holds.

## FINDING 3 — silent-by-construction failure mode (design, not a shipping defect)

`WorkspaceActionsSlot` renders `null` when its target is falsy (`WorkspaceActions.tsx:385-388`), and the
target comes from a module-global singleton (`hostDom`, `navSlotDom`, `cachedPlacement`,
`placementListeners`). Every failure of that assumption — duplicate module record, a second bundle
chunk, a future micro-frontend split, an HMR edge — deletes search, microphone and help from the
product with **zero** diagnostics. The 26 unit tests cannot see it: the "группа действительно
смонтирована, а не осиротела" suite asserts on `readSource(...)` **text** (regexes over
`workspaceShell.tsx`), because the packet states jsdom is not installed. A regex over source cannot
observe an empty host — that guard is theatre against exactly the failure that was on screen while this
review was being written. Not a REVERT-class defect (production bundling makes one record), but the
lead should know the guard does not guard.

## FINDING 4 — dead `position: fixed` CSS survives the deletion AND SHIPS

`apps/web/src/styles/main.css:16578-16601` still declares, comment-stripped and live:

```css
.omnibar-trigger-btn { position: fixed; bottom: 1.5rem; left: 1.5rem; z-index: 9998; … }
.omnibar-trigger-btn:hover { … }
```

No element carries that class any more — the Omnibar trigger became `.dnt-actions__control` in this very
commit. I verified it ships: `omnibar-trigger-btn` appears twice in the built
`apps/web/dist/assets/index-C3jsCXKe.css`. It is 24 lines of dormant `position: fixed` corner styling
keyed to a name a future agent can re-apply in one line — the exact species the packet exists to
eradicate ("A dead heuristic left in the tree is the next agent's trap") and exactly what the brief's
repo-wide grep order was for. The builder's DELETION VERIFIED list grepped eight base names and did not
include the class names of the buttons they moved. Everything else is clean: `corner-dock__`,
`dente-corner-dock`, `corner-dock-reserve-block` = **0** live hits in the shipped CSS, and my own
comment-stripped sweep over all 52 tracked CSS files and 773 TS/TSX/MJS files finds no other live
reference.

## FINDING 5 — the microphone can keep recording with nothing on screen, which is the hazard the builder used to justify the design

The owner's own comment justifies not closing the sheet on an outside tap: *"случайный тап оставил бы
включённый микрофон без единого признака на экране"*. Its own trigger does precisely that:

- `VoiceAssistantUI.tsx:76-90`: a press shorter than 300 ms sets `isToggleModeRef` and **keeps
  listening** after release.
- Everything that signals recording — the transcript card, the level meter, the REC dot — renders into
  the `notice` slot, which at narrow lives inside `.dnt-actions__sheet-body`.
- MEASURED (`scratch/rev2-x1-routes.mjs`, marker node injected into the live `notice` slot): while the
  sheet is collapsed the slot's content has **0 client rects, 0x0 box, `display: none`**; opened, the
  same node is 358x40 and visible.
- The trigger's only state class is `dnt-actions__trigger--open`, bound to `expanded`, never to
  `isListening` (measured: `"dnt-actions__trigger"` collapsed vs `"… --open"` expanded).

So on a phone: tap «Голос», tap the mic once (<300 ms → toggle mode, still recording), tap «Голос»
again → the sheet hides, the transcript is gone, and **the microphone is still live with zero
indication anywhere on screen.** The old floating dock had the same mic but its transcript bubble was a
fixed overlay that could not be collapsed away. §3.

## FINDING 6 — a factually wrong "Замерено" claim in shipped source (the conclusion is right, the evidence is not)

`WorkspaceActions.tsx:110-115` justifies `revealWorkspaceActions()` with: *"Замерено по CSS — `.topbar`
объявлен `flex-shrink: 0` без `position: sticky` (`styles/dente-redesign.css:379-385`)"*.

`apps/web/src/styles/main.css:14218` declares `.topbar { position: sticky; top: 0; z-index: 10 }`, and it
**computes as `position: sticky`** at runtime (measured, both 1600x1100 and 900x900). The builder read one
of two files and called it a measurement.

The conclusion nevertheless holds, and I proved it the right way: `section.workspace` and
`main.app-shell` both have `overflow-y: auto` while never overflowing (`scrollHeight == clientHeight`,
1855/1855 and 1857/1857), so the sticky topbar has no scrollport to stick in; after a settled document
scroll to y=757 (the maximum) the topbar sits at **y = -652, off screen, `stickyPinned: false`**. The
group can indeed scroll out of view, so `revealWorkspaceActions()` is justified — for a different reason
than the one written in the file. Fix the comment, not the code.

Related, and the reason it matters: because the topbar scrolls away, FINDING 1's 48-80px is **not**
permanent chrome. It costs the first screenful, not the whole session. That is the one thing that keeps
FINDING 1 out of REVERT territory.

## FINDING 7 (nit) — every notice yanks the page to the top, including a 4-second transient

`VoiceAssistantUI.tsx` calls `revealWorkspaceActions()` on `hasNotice`, and `hasNotice` includes
`visibleAction` — the auto-dismissing "команда выполнена" chip. MEASURED for the help panel on the same
call site: page scroll **428 → 0**. So finishing a voice command while scrolled down a patient card
throws the reader back to the top of the page for a chip that disappears by itself in 4 seconds.
`block: "nearest"` does not save it, because the topbar is genuinely off-screen (FINDING 6).

---

## PROOF AUDIT — every claimed command re-run by me, TRUE exit captured

| Claimed proof | My re-run | Result |
|---|---|---|
| unit test 26/26, 6 suites, exit 0 | `node --import tsx --test …workspaceActionsPlacement.test.ts` → tests 26 / suites 6 / pass 26 / fail 0, duration 148.19 ms | **TRUE_EXIT=0 CONFIRMED** |
| tests actually assert | `assert.throws(fn, "строка")` verified to still assert (Node treats the string as `message`); simulated against an existing directory → `ERR_ASSERTION`. Fixtures are live source files read with `readFileSync`, which throws on a stale path | **CONFIRMED, not vacuous** |
| "54 geometry tests deleted, 26 added" | `it(` count in `f0121f0c2^:…/cornerDockLayout.test.ts` = **54**; new file = **26** | **CONFIRMED exactly** |
| `check-css-tokens.mjs` → 0 names, 0 occurrences | re-ran: 146 declared, 170 used, 2973 `var()`, **0 unresolvable in any theme** | **TRUE_EXIT=0 CONFIRMED** |
| `smoke:web-text-encoding` → 429 files, 0 hits | re-ran: `ok true`, **431** files (2 added by later commits), mojibake 0, garbled 0 | **TRUE_EXIT=0 CONFIRMED** |
| deletion: zero live refs repo-wide | `git grep` at HEAD for 12 names incl. 4 the builder did not list; plus a comment-stripped sweep of 52 CSS + 773 TS/TSX/MJS files | **CONFIRMED except FINDING 4** |
| arithmetic of the old mechanism | extracted the parent blob: `CORNER_OBSTACLE_BLOCK_SHARE = 0.5`; `cornerBlocksTarget` = `cornerOverlapArea(footprint,target) / targetArea >= share`. Equal height ⇒ barWidth/targetWidth; 168·44/(364·44) = **0.4615 < 0.5** | **CONFIRMED (static at the parent; a live re-run needs a checkout I am not permitted)** |
| dead space 299 "before" | it is V1's own reviewer number, and it is really there: V1 review line 223-226, *"space at 390x844 is `.patients-panel` 20 + `.work-grid` 96 + `.workspace` 144"* = 299. Correctly attributed, not claimed as their own | **CONFIRMED — not a fabricated baseline** |
| dead space after: 188/190 at 390x844, 68/70 at 1600 | reviewer #1 re-ran the builder's probe: 20+96+72 = 188, actual 190; my own runs: 48+20+0 = **68 / actual 70** at 900-1600, 164 / 262 at 841x900 (the legacy 841-860 band, `main` 96 + `.work-grid` 96, untouched by X1 and documented as intentional) | **CONFIRMED** |
| `npm run typecheck -w @dental/web` (named for the lead) | ran it: `tsc -b --noEmit` | **TRUE_EXIT=0 GREEN** |
| `npm test -w @dental/web` (named for the lead) | ran it: tests **610** / suites 98 / pass 610 / fail 0 | **TRUE_EXIT=0 GREEN** |
| production build (nobody claimed it; I ran it because dist staleness has hidden four defects here) | `npm run build -w @dental/web` → built in 1m07s; **exactly one** chunk contains `dnt-workspace-actions`, once → production has a single module record, so FINDING 0 is dev-only | **TRUE_EXIT=0** |
| REACHABILITY (packet tested `#patients` only) | 6 routes × 2 viewports, deduped: hosts 1, controls 3 (visible 3 at wide, 0 while the sheet is collapsed at narrow, correct), trigger 1 at narrow, navH 64, navItems 5, on `#shift #schedule #patients #visit #finance #settings`. Reviewer #1's "`#schedule` has no host" and my own first `#settings` miss were **mount flakes**: with a 15s budget `#settings` at 390x844 gives appShell/topbar/nav true, hosts 1, controls 3, trigger 1 | **CONFIRMED, wider than claimed** |
| StrictMode double-invocation (builder: "not observed") | StrictMode **is** on (`main.tsx:36`). Across ~25 page loads and 4 placement flips: `hostCount` 1, `.dnt-actions` 1, triggers 1, controls 3 — never doubled | **CLOSED in the builder's favour** |
| teardown / re-entry | SPA navigation by clicking real nav links (no reload) ×4 and two full round trips across the 840px boundary: nav container present-in-nav at narrow, removed at wide (`navSlots` 1 → 0 → 1 → 0 → 1), mount `:empty` toggles correctly, host never duplicated, and the sheet still opens 390x299 with 3 visible controls after all the churn | **CONFIRMED** |
| phone panel geometry 390x299, gap 0, 73/57/57, labels+hints, centres self-owned | reproduced to the pixel in the deduped graph | **CONFIRMED** |
| header help panel at wide (declared NOT PROVEN) | 384x560 at x=928..1312 / y=205..765, fully inside the viewport, centre self-owned, no clipping ancestor | **CLOSED, good** |

## Provenance of my gate runs (so nobody has to trust them)

`git status --porcelain` over X1's six shipped paths (`components/workspaceActions/**`,
`workspaceShell.tsx`, `Omnibar.tsx`, `VoiceAssistantUI.tsx`, `styles/dente-redesign.css`) is **empty** —
what I measured on disk and through the dev server is byte-identical to HEAD, not a dirty variant.
When I ran the typecheck and the whole web suite, the only uncommitted source file in the tree was
`apps/api/src/tests/webCallsExistingRoutes.test.ts`, which is outside the `@dental/web` workspace, so
both greens are clean measurements of HEAD. A neighbouring agent began editing `MarketingView.tsx`,
`ScheduleView.tsx`, `PaymentCapture.tsx` and others at 15:32+, i.e. **after** my typecheck (pre-15:27),
suite and build had finished; none of their work is in my numbers. My own writes: `scratch/rev2-*` and
this file. I rebuilt `apps/web/dist` (ignored by git) deliberately — a stale dist has hidden four
defects in this repo.

## GIT HYGIENE

`f0121f0c2` = exactly the 14 claimed files, +1857/−2360, two renames (voiceMeter 63%, labels 59%), four
deletions. `5fd41faad` = exactly 1 file, +10/−1. Nothing outside `apps/web/src/`. No `dist/`, `.data/`,
`scratch/`, `.tsbuildinfo`, `node_modules`, no `.agents/` prose swept in, no other author's work. No
secret-shaped strings in either diff. `App.tsx` is untouched by both commits, as claimed. Subject of
commit 1 in `od -c` = `321 203 320 263 320 276 320 273` = «угол», valid UTF-8, no mojibake. Both commits
are ancestors of HEAD `1d22de291` (`git merge-base --is-ancestor` ×2). Conventional Commits respected,
bodies explain WHY. **CLEAN.**

## VERDICT — NEEDS_REWORK

The packet did the hard thing correctly. The mechanism really was arithmetically unfixable, the
deletion really is complete, the actions really did move into real chrome, the reserve really is gone,
every gate is green including the two the builder was forbidden to run, and the reachability is broader
than they claimed. Reviewer #1's REVERT-shaped headline does not survive contact with a coherent module
graph. The builder's honesty held up under attack: they refused V1's performance win as moot rather than
banking it, they reported a defect they introduced themselves with before/after numbers, and their one
cited "before" baseline (299 px) is a real, correctly attributed measurement.

It goes back for one measured regression and three smaller defects, all bounded:

1. The group costs the header **+80px at 1600x1100** (107 → 187) and **+48px at 841-900**, and at
   1600x1100 it pushes «Запись» onto a row of its own that it did not previously need. Measure it,
   then either fit the group into the existing row (icon+label segments are 91-109px each; the row has
   the width at 1600) or state the trade explicitly as a design decision with the number in it.
   Closing command: `node scratch/rev2-x1-headergrowth.mjs`.
2. Delete `.omnibar-trigger-btn` from `apps/web/src/styles/main.css:16578-16601`. It ships.
3. Make the microphone's live state visible while the sheet is collapsed (state on the trigger, or
   refuse to collapse while listening), or drop toggle mode on narrow.
4. Correct the comment at `WorkspaceActions.tsx:110-115`: `.topbar` **is** `position: sticky` per
   `main.css:14218`; the reason the group can leave the viewport is that its scrolling ancestors never
   overflow. Same fix removes the temptation to "optimise away" `revealWorkspaceActions()`, and while
   there, stop calling it for the 4-second transient chip.

**OPERATIONAL, FOR THE LEAD, BEFORE YOU JUDGE PIXELS: restart the Vite dev server.** As it stands it
serves two module records for `WorkspaceActions.tsx` and the group renders as an empty pill in the
topbar and an empty 95px sheet on the phone. That is not what these commits do — it is what a 4-hour-old
transform cache does. I am not permitted to restart it.

---

# Reviewer #1's text, preserved verbatim (headline overturned by FINDING 0; the confirmation table is sound and I re-verified its key rows)

# X1-corner-redesign — ADVERSARIAL REVIEW (written as I go)

Reviewer: independent adversarial reviewer (did not write this code).
Commits under attack: `f0121f0c293f664777d919e6fdc960eb7d139cfa`, `5fd41faad7b54d822d8660792405f402a37f7563`
Repo HEAD at review time: `af88f6850`
Dev server: 5173 already running (200). NOT started/restarted by me.
My probes (untracked, not staged): `scratch/rev-x1-attack.mjs`, `scratch/rev-x1-residents.mjs`,
`scratch/rev-x1-decide.mjs`, `scratch/rev-x1-dupmodule.mjs` + their `.json` outputs.

---

## VERDICT DRIVER — THE GROUP IS EMPTY. THE THREE ACTIONS DO NOT RENDER.

**Claim under attack (packet REACHABILITY + MEASURED):** *"the probe found exactly 1
`#dnt-workspace-actions` host at all three viewports … plus 3 rendered `.dnt-actions__control`
elements each time"* and *"the phone panel really opens … sheet 390x299 … three actions each with a
visible label (18px) and a visible hint (16-32px), heights 73/57/57px"*.

**REFUTED, four independent ways, at HEAD, on the same dev server the builder used.**

1. **I re-ran the builder's OWN probe unchanged** — `node scratch/probe-x1-actions-placement.mjs
   reviewer-x1`, TRUE_EXIT=0 → `scratch/x1-actions-reviewer-x1.json`:
   - `controlCount: 0` at 390x844, 720x1100 AND 1600x1100. The builder's own script reports
     `controls: []`.
   - the real click on «Голос» opens the sheet, but the sheet is **390x95 with `controls: []`** — not
     390x299 with three 73/57/57 controls. The 204 px difference is exactly the three missing actions.
2. **My own probe** (`scratch/rev-x1-attack.json`): every slot is childless at every viewport —
   `notice:0 voice:0 search:0 help:0`. `hostOuter` at 1600x1100 is literally
   `<div id="dnt-workspace-actions" class="dnt-actions" role="group" aria-label="Голос и поиск"
   data-placement="header"><div class="dnt-actions__slot dnt-actions__notice"…></div><div
   class="dnt-actions__bar"><div …slot="search"></div><div …slot="voice"></div><div
   …slot="help"></div></div></div>` — **an empty pill announced to screen readers as «Голос и поиск»,
   containing nothing.**
3. **The residents ARE mounted**, so this is not "the subtree is missing"
   (`scratch/rev-x1-decide.json`): Ctrl+K opens the Omnibar dialog
   (`input[placeholder="Поиск по разделам или действиям..."]` count 0 → 1, visible true) while
   `.dnt-actions__control` stays 0. Omnibar's effect-registered listener works; its
   `WorkspaceActionsSlot slot="search"` renders nothing.
4. **ROOT CAUSE, proven at runtime** (`scratch/rev-x1-dupmodule.json`). I patched
   `Node.prototype.appendChild/insertBefore` before app boot. The three controls **are** created and
   appended — into slots whose parent is **detached**:
   ```
   { nodeCls: "dnt-actions__control dnt-actions__control--primary", parentSlot: "voice",
     parentConnected: false, parentRootIsDocument: false }
   { nodeCls: "dnt-actions__control", parentSlot: "help",   parentConnected: false }
   { nodeCls: "dnt-actions__control", parentSlot: "search", parentConnected: false }
   ```
   and module identity in the same page:
   `import("…/WorkspaceActions.tsx?t=1785234135879").WorkspaceActionsSlot !==
   import("…?t=1785234960377").WorkspaceActionsSlot` → `aEqualsB: false, aEqualsC: false,
   bEqualsC: false`. **Three distinct module records of the same file.**

   The dev server proves the split statically too:
   - `curl /src/workspaceShell.tsx` → `import { WorkspaceActionsMount } from
     "/src/components/workspaceActions/WorkspaceActions.tsx?t=1785234135879"` (14:22:15 local)
   - `curl /src/components/VoiceAssistantUI.tsx` and `/src/components/Omnibar.tsx` → the same file at
     `?t=1785234960377` (14:36:00 local)
   Both URLs serve 200 / 49565 bytes. Different URL ⇒ different ES module record ⇒ **two `hostDom`
   module-level singletons.** The mount point (instance A) builds and appends host A into
   `.top-actions`; the residents (instance B) build host B and portal into it; host B is never
   appended to the document by anyone. Search, microphone and help therefore **do not exist on
   screen at any width.**

Both timestamps predate the builder's own probe run (probe file mtime 14:38, second commit 14:37:30),
so the split was almost certainly already present when they measured — but I do not need to settle
that. Under the standard I was given, an unreproducible measurement is a failed measurement.

**Constitution consequences.** §1 depth not facade: this is the facade — an empty `role="group"`
container in the topbar and an empty 95 px sheet on the phone. §3 grandmother: the search, mic and
help buttons are simply GONE; there is no empty state, no error, no hint. The failure is **silent by
construction** — `WorkspaceActionsSlot` returns `null` when the target is falsy
(`WorkspaceActions.tsx:386`), so three product controls disappear with no console error and no test
able to notice. §5 "any decomposition must be IMPORTED AND USED, never orphaned": the imports exist,
but the rendered result is orphaned in a detached DOM tree — the letter is satisfied and the spirit
is violated.

**Why the packet's own guard could not catch it.** All 26 tests pass and none of them can see this:
the "группа действительно смонтирована, а не осиротела" suite asserts on `readSource(...)` **text**
(`/import \{ WorkspaceActionsMount \} from …/`, `indexOf("<WorkspaceActionsMount />")`). A regex over
source cannot observe an empty host. The one honest check — "is a control in the document" — needs a
DOM, and the packet declares (test header, lines 41-46) that jsdom is not installed and substitutes
file reads. The guard is theatre against exactly the failure that happened.

---

## What DID reproduce (credit where due)

| Claim | My result | Verdict |
|---|---|---|
| `node --import tsx --test …workspaceActionsPlacement.test.ts` = 26/26, exit 0 | tests 26 / suites 6 / pass 26 / fail 0, TRUE_EXIT=0 | CONFIRMED |
| Tests actually assert (no deleted fixtures) | read all 26; fixtures are live source files read via `readFileSync`, which throws on a stale path; `floatingCorner` absence is `assert.throws(readdirSync)` | CONFIRMED |
| `floatingCorner/` deleted, zero live refs repo-wide | `git ls-tree HEAD apps/web/src/components/floatingCorner/` EMPTY; `git grep -l` at HEAD for CornerDock / cornerDockLayout / cornerDockLabels / floatingCorner / CORNER_OBSTACLE_BLOCK_SHARE / corner-dock-reserve-block / cornerBlocksTarget / resolveCornerPlacement / corner-dock — every hit outside `.agents/` is inside `/* */` or is a test asserting absence (checked line by line) | CONFIRMED |
| The old mechanism was arithmetically unfixable | read `f0121f0c2^:…/cornerDockLayout.ts`: `CORNER_OBSTACLE_BLOCK_SHARE = 0.5`; `cornerBlocksTarget` = `overlapArea / TARGET area >= share`. Equal height ⇒ barWidth/targetWidth. 168/364 = 0.4615 < 0.5 | CONFIRMED (static, at the parent blob) |
| Old dock hosts 0, `--corner-dock-reserve-block` unset, at all viewports | `oldDockHosts: 0`, `reserveVar: ""` at 390x844, 840x900, 720x1100, 1600x1100 | CONFIRMED |
| `position:fixed` in the bottom-right quadrant: 0 wide, 1 narrow and it is the nav | 1600x1100 → 0; 390x844 and 720x1100 → 1, `.dnt-bottom-nav`. Host computes `position: static`, `closest('.topbar')` true at wide / `closest('.dnt-bottom-nav')` true at narrow | CONFIRMED |
| Trailing dead space 390x844 = 20 + 96 + 72 = 188 computed / 190 actual | `.patients-panel 20`, `.work-grid 96`, `section.workspace 72`, `main.app-shell 0`; stackTotal 188, trailingBelowLastElement 190 | CONFIRMED (the 299 px "before" is V1's number, not re-measurable by me without checking out the parent — the builder attributes it, does not claim it) |
| Trailing dead space 1600x1100 = 68 / 70 | 48 + 20 + 0 = 68, actual 70 | CONFIRMED |
| «Запись» 364x44 at 390x844, centre owned by itself, 0 fixed over centre | identical: 364x44, `centreOwnedBySelf: true`, `fixedOver: 0`; 89x36 at 720x1100; 101x36 at 1600x1100 | CONFIRMED |
| Bottom nav after the 2nd commit: 64 px, 6 items, 5 neighbours 64 px, «Голос» 38 px, all six label spans 12 px / 1 line, none clipped | identical, and `labelClipped: false` for all six, `lines: 1` for all six | CONFIRMED |
| 120-frame scroll cost: 0 `elementsFromPoint`, 0 `getBoundingClientRect`, 0.00 ms | my own instrumentation wrapping `Element.prototype.getBoundingClientRect`, `Document.prototype.elementFromPoint/elementsFromPoint`, counters reset then 120 rAF-driven scrolls: `rects 0, hits 0, ms 0` at 390x844, 840x900, 1600x1100 | CONFIRMED |
| Packet item 3 declared MOOT rather than banked | correct and honest: with the layout pass gone there is nothing to preserve; refusing V1's 19.34→0.27 ms is the right call | CONFIRMED as honest |

**The Email-label hit test the builder disclosed as NOT DONE — I closed it.** At 1600x1100 with
`scrollIntoViewIfNeeded` + settle: label rect 287x88 at (1254,1030), centre in viewport,
`ownedBySelf: true`, `fixedOverCentre: []`. So the *specific* V1 regression (a floating button sitting
on `<label>Email</label>`) is genuinely gone. It is gone because the buttons are gone.

---

## Second-order findings

5. **`#schedule` has no host at all.** `scratch/rev-x1-residents.json` run 2 (1600x1100, `#schedule`):
   `slotChildren: []`, `placement: null`, `hostCount` 0 — no `.dnt-actions__slot` anywhere. On
   `#patients` the host exists. So the group's presence is route-dependent and nobody measured a
   second route. Needs re-checking once the group actually renders.
6. **Pre-existing second mic in the header** (`.top-dictation-button`, 1 instance, measured) is
   disclosed by the builder. With the group empty it is currently the ONLY microphone affordance in
   the product, which is not what the packet designed.
7. **`revealWorkspaceActions()`** reads the same duplicated singleton (`hostDom?.host`), so in the
   split state it scrolls a detached node — a silent no-op. Never exercised by the builder (disclosed).

## Still to do in this review
- typecheck (`npm run typecheck -w @dental/web`) — the lead-must-run item.
- whole web suite (`npm test -w @dental/web`).
- production build: does the bundle collapse the duplicate module (i.e. is the empty group dev-only)?
- git hygiene: only claimed files, no other author's work swept in.
- CSS audit: hardcoded px/hex, three themes, teardown.
