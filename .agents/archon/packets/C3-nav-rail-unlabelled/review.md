# ADVERSARIAL REVIEW — packet C3-nav-rail-unlabelled

Reviewer: adversarial (did not write this code). Posture: disbelief.
Commit under attack: `e71445757cbd4ce11c4f38de16509754aa6f26a1` (+ test commit `0500e257e`).

VERDICT: **SOUND_WITH_NITS**

Every load-bearing claim reproduced, including the negative control, which I reproduced by an
independent method that never touched the working tree. Two real defects survive; one is undeclared.

---

## 1. WAS THE DEFECT REAL BEFORE THE COMMIT? — YES, CONFIRMED TWICE

`git show e71445757^:apps/web/src/workspaceShell.tsx` — six `Sparkles` references:

```
SidebarIcon:  analytics -> Sparkles (explicit)
              marketing -> Sparkles (explicit)
              fallback  -> Sparkles   <-- "shift" had NO branch, fell here
ActionIcon:   analytics -> Sparkles (explicit)
              fallback  -> Sparkles   <-- "shift" AND "marketing" fell here
```

`appViews` order puts shift at position 1, analytics at 8, marketing at 11. Exactly as reported.

Independent visual confirmation — I opened `.dente-redesign-shots/desktop_light_patients.png`
myself (1440x900, valid PNG signature `89504e47`, md5 `6bce431a…`): a ~74px rail, eleven bare
icons, **identical four-point sparkle at rail positions 1, 8 and 11**, no `DENTE` wordmark, no
theme switcher. Icon pitch measures ~46px, which matches `min-height:44px` (main.css `@layer
legacy`) + `gap:2px` (dente-redesign.css:283) — i.e. the shot is the real rail, not a stale render.

The builder's correction to the dossier is also correct: the labels *were* in the markup
(`.nav-copy` / `.nav-label`); the stylesheet hides them at `[data-collapsed="true"]`
(dente-redesign.css:354) and `@media (max-width:1140px)` (dente-redesign.css:588-590). At a
1440px viewport only the first can be responsible, so that plate is the collapsed state, and
collapse is persisted in `localStorage` (`dente_sidebar_collapsed`, App.tsx:946-956).

Bonus verification of the builder's §0 dossier correction: I opened
`.dente-redesign-shots/desktop_light_shift_collapsed.png`. **It is a Vite CSS error overlay**
(`[plugin:vite:css] [postcss] .../main.css:16846:24: Unknown word display`, source line
`.nav-copy small {\n    display: none;` with a *literal* backslash-n). Confirmed: that file is
not evidence of anything about the collapsed rail. The literal `\n` is **no longer** in
main.css today (0 occurrences, 16 896 lines), so the CSS build is not currently broken by it.

---

## 2. REACHABILITY — CONFIRMED, NOT DEAD CODE

Traced independently of the builder's claim:

- `apps/web/src/App.tsx:2298-2299` — top-level `return` of `App()`:
  `<main className="app-shell dente-redesign" data-collapsed={sidebarCollapsed}>`
- `apps/web/src/App.tsx:2303` — `<WorkspaceSidebar currentView={…} collapsed={sidebarCollapsed} …/>`,
  unconditional. No feature flag, no role gate on the rail itself.
- `apps/web/src/App.tsx:946-956` — `sidebarCollapsed` seeded from
  `localStorage.getItem("dente_sidebar_collapsed")`, written back in `toggleSidebarCollapsed`. Sticky.
- `apps/web/src/App.tsx:4752-4765` — mobile bottom nav renders `<ActionIcon section={view}/>` over
  `["shift","schedule","patients","visit"]`. `shift` previously hit the `Sparkles` fallback there
  too, so the icon fix lands on mobile as well.
- Only render site: `rg WorkspaceSidebar` → App.tsx:2303 is the sole JSX usage.
  `AppHelpers.tsx:305` imports it but never uses it (pre-existing dead import, not this commit's).
  `useAppLogic.tsx:867,872` are **import specifiers only**, not God-Context return fields.

---

## 3. PROOF AUDIT — every claimed command re-run

| Claim | Reproduced? | Evidence I produced |
|---|---|---|
| TYPECHECK `npm run typecheck -w @dental/web` | **YES, with a caveat** | see 3a |
| UNIT `node --import tsx --test src/__tests__/workspaceShellNav.test.ts` | YES | `tests 7 / suites 1 / pass 7 / fail 0 / duration_ms 334.54`, EXIT 0 |
| UNIT negative control (guard bites) | **YES, independently** | see 3b |
| UNIT whole web suite `npm test -w @dental/web` | YES | `tests 365 / suites 64 / pass 365 / fail 0`, EXIT 0 |
| SMOKE `node scripts/smoke-workspace-shell-source.mjs` | YES | EXIT 1, exactly the two baseline lines, **no third** |
| DEFECT by direct image read | YES | see §1 |
| ENCODING `encoding-check.cjs` | YES + hardened | see 3c |
| COMMIT hygiene | YES | see §5 |
| CRLF false-negative diagnosis | YES, exact numbers | see 3d |
| Tailwind emission (builder marked NOT PROVEN) | **I closed it in the builder's favour** | see §4 |

### 3a. TYPECHECK — the claim holds, but the command is a weak instrument

First re-run: `> tsc -b --noEmit`, EXIT 0. Then I checked whether it actually compiled:

```
$ npx tsc -b --noEmit --verbose
Project 'tsconfig.json' is up to date because newest input 'src/workspaceShell.tsx'
is older than output 'tsconfig.tsbuildinfo'
```

**`tsc -b` reports success without compiling anything when the buildinfo is fresh.** So a bare
re-run of this command proves nothing. I forced it:

```
$ cd apps/web && npx tsc -b --noEmit --force
FORCED_TYPECHECK_EXIT=0
```

Zero errors on a full rebuild. Claim stands. The builder's first run was legitimately post-edit,
so they did not cheat — but flag for the lead: **"TYPECHECK VERIFIED" in this repo is only
meaningful on the first run after a source edit.** That is a rubric hole, repo-wide.

Test file is genuinely inside the program: `apps/web/tsconfig.tsbuildinfo` → `fileNames.length
= 2069`, contains both `workspaceshellnav.test` and `workspaceshell.tsx`. `apps/web/tsconfig.json`
`include: ["src", "vite.config.ts"]`. Confirmed.

### 3b. Negative control — reproduced WITHOUT touching the working tree

The builder edited the source, ran, and reverted. I did not want to trust a revert, so I injected
the same mutation through a Node ESM `load` hook (temp files outside the repo,
`C:\Users\Admin\AppData\Local\Temp\c3_mutate_hook*.mjs`), rewriting the *transpiled* source of
`workspaceShell.tsx` in memory: first `marketing: Megaphone` → `marketing: BarChart3`.

```
[MUTATION HOOK] injected duplicate glyph: sidebarIcons.marketing = BarChart3 (== analytics)
  ✖ gives every view its own sidebar glyph (2.7008ms)
  AssertionError: two rail items share one glyph, so they cannot be told apart
    actual:   [ 'analytics and marketing both render ChartColumn' ]
    expected: []
tests 7 / pass 6 / fail 1        NEG_CTRL_EXIT=1
```

Byte-identical to the builder's quoted output. **The guard bites.** `git status --porcelain --
apps/web/src/workspaceShell.tsx` is empty; the tree was never dirtied.

Weakness of the guard, for the record: it asserts over the exported `sidebarIcons`/`actionIcons`
maps, not over `SidebarIcon`/`ActionIcon`. Someone could reintroduce an if-chain in the components
and the test would still pass. The exhaustive `Record<AppView, LucideIcon>` type is the real
compile-time lock; the test is the runtime uniqueness lock. Together they cover the reported defect.

All four new glyphs resolve at runtime in the installed lucide-react (the test's `assert.ok(glyph)`
passed for all 11 entries, and the failure message printed lucide's own `ChartColumn` display name
for `BarChart3`).

### 3c. Encoding — reproduced, and I hardened it

`node .agents/archon/packets/C3-nav-rail-unlabelled/encoding-check.cjs apps/web/src/workspaceShell.tsx`
→ `bom: false`, `mojibake_lines: 0`, `crlf_count: 0`, `lines: 399`, `has_nav_copy_literal: true`,
`cyrillic_chars: 2337`. Exact match.

I suspected the detector was fake: printed to a terminal, its regex reads `/[РС][-ÿ]/`, which as
written would be the two-character set `{-, ÿ}` and would miss `РљР°СЂРёРµСЃ`. Codepoint dump of
that line: `U+0420 U+0421 U+0080 U+00FF` — it is genuinely the canonical AGENTS.md regex
`[РС][-ÿ]`; U+0080 is simply invisible. **Detector is legitimate.**

My own independent audit (`/tmp/c3_encoding_audit.cjs`):

```
workspaceShell.tsx        | bytes 16264 | bom false | crlf 0 | cyrillic 2337 |
                            canonical_mojibake_lines 0 | U+FFFD 0 | utf8_roundtrip_lossless true
workspaceShellNav.test.ts | bytes  4033 | bom false | crlf 0 | cyrillic   23 |
                            canonical_mojibake_lines 0 | U+FFFD 0 | utf8_roundtrip_lossless true
commit message            | bytes  3582 | cyrillic 1340 | mojibake 0 | U+FFFD 0 | lossless true
subject: "[ARCHON] fix(навигация): свернутая рельса из 11 значков, три из них — одна искорка"
```

No mojibake anywhere. Typographic signatures (`вЂ`, `В«`, `В»`, `Ð`, `Ñ`) — zero hits.

### 3d. CRLF false-negative — reproduced to the digit

```
crlf_total 16895 | lf_only 0 | needs_LF_variant false | has_CRLF_variant true
occurrences_of_selector 3
```

`scripts/smoke-workspace-shell-source.mjs:455-459` searches `main.css` for
`".nav-copy small {" + LF + "    display: none;"`. `main.css` is 100% CRLF, so the assertion can
never pass no matter how correct the CSS is. The style block exists at main.css:12948. The
**assertion** is the bug, not the stylesheet. Correctly diagnosed, correctly left alone
(out of packet scope).

---

## 4. TAILWIND EMISSION — builder marked NOT PROVEN; I PROVED IT (in their favour)

Compiled `apps/web/src/styles/tailwind.css` through the installed `tailwindcss@4.3.3` compiler API
(read-only, output to `/tmp`, no repo write, no vite build):

```
EMITTED  flex / w-full / min-w-0 / flex-col / items-center / text-center / block /
         max-w-full / font-semibold / break-words / hidden
EMITTED  gap-[0.1875rem]  gap-[0.6875rem]  text-[0.625rem]  leading-[1.15]
EMITTED  max-[1140px]:flex-col  max-[1140px]:gap-[0.1875rem]  max-[1140px]:text-center
EMITTED  max-[1140px]:block
index .hidden = 288 | index .max-[1140px]:block = 997 | later-wins-block: true
```

All 19 utilities exist, and `.max-[1140px]:block` is emitted **after** `.hidden` at equal
specificity, so the caption does appear below the breakpoint. This closes one of the builder's
НЕ ПРОВЕРЕНО items.

Cascade reasoning also checks out. The only handwritten selectors that reach inside `.nav-item`
are descendant selectors (`.nav-item svg`, `.nav-copy`, `.nav-label`, `.nav-copy small`) — I
grepped all four stylesheets that mention the rail (`main.css`, `premium.css`, `dente-redesign.css`,
`touch-targets.css`) and there is **no `>` direct-child selector**, so wrapping the icon in a span
breaks nothing. `main.css @media (max-width:1180px) { .nav-item { font-size: 0 } }` does not kill
the caption either: a declaration on the element beats inheritance regardless of `@layer`.

---

## 5. GIT HYGIENE — CLEAN

```
e71445757  M  apps/web/src/workspaceShell.tsx            (1 file, +95 -28)
0500e257e  A  apps/web/src/__tests__/workspaceShellNav.test.ts
           A  .agents/archon/packets/C3-nav-rail-unlabelled/{state,handoff}.md
           A  .agents/archon/packets/C3-nav-rail-unlabelled/{commitmsg,commitmsg-proof}.txt
           A  .agents/archon/packets/C3-nav-rail-unlabelled/encoding-check.cjs
```

- No `apps/api/.data/*.json`, no `dist/`, no `*.tsbuildinfo`, no `scratch/**`.
- No foreign-author work swept in. `git diff --cached --name-only` is empty right now.
- Conventional Commits: `fix(навигация):` / `test(навигация):`, Russian subject naming the actual
  defect ("свернутая рельса из 11 значков, три из них — одна искорка"). Body explains WHY.
- The known fleet contamination pattern (shared git index) did **not** occur here.

---

## 6. STANDARD HAZARD SWEEP

| Hazard | Result |
|---|---|
| Hollow facade / `{success:true}` over a no-op | NO. Real render change, no placeholder, no stub |
| Magic constant / hardcoded UUID / port / endpoint | Only `1140` — see finding B |
| Fabricated 0 / default standing in for unknown | NO |
| Second owner of something that had one | YES — the 1140 breakpoint. See finding B |
| useAppLogic return field deleted/renamed | NO. Commit touches one file, not `useAppLogic.tsx` |
| Listener / timer / interval / subscription without teardown | NONE added (read the file end to end) |
| Hardcoded hex | NONE added. Pre-existing hex in `premium.css:254-283` is not this commit's |
| Static px where relative belongs | Sizes are `rem`; the only px is the `1140` breakpoint |
| New hardcoded Russian literal | NONE. `aria-label="Навигация"` was **moved**, verified against the parent blob (`:120` before, `:189` after) |
| Mojibake | NONE (§3c) |
| Broken selector for existing tests/smokes | NONE. `scripts/dente-redesign-shots.mjs:168` (`aside.sidebar nav a[href=…]`), `scripts/smoke-workspace-live-routes.mjs:295` (`.nav-item[aria-current="page"]`), `scripts/ops-panels-shots.mjs:177` all still match |
| Accessibility regression | Net improvement; see note below |

Accessibility: `aria-current`, per-item `aria-label`, `title` all preserved (the smoke asserts on
those exact literals and does not report them). The `aria-label="Навигация"` move makes the `<nav>`
a named landmark and leaves the `<aside>` an unnamed complementary landmark. Defensible — there is
one aside — but it was not requested by the packet. Nothing in `apps/` or `scripts/` selects on the
old placement (`rg` for the literal returns only workspaceShell.tsx:189).

---

## 7. DEFECTS THAT SURVIVE

### A. UNDECLARED — the packet's own defect is still live at exactly 1140 CSS px
`workspaceShell.tsx:176` uses `max-[1140px]:block`. Tailwind v4 compiles that to
**`@media (width < 1140px)`** — strict less-than (verified in the compiled output above).
The handwritten rule it is meant to mirror is `dente-redesign.css:588`
**`@media (max-width: 1140px)`** — inclusive.

At a viewport width of exactly 1140px:
- `.nav-copy` IS hidden (`max-width:1140px` matches)
- the new caption is NOT shown (`width < 1140px` does not match)
- → eleven unlabelled icons. The defect, unfixed, in a reachable state.

One-value window, so severity is low, but it is the exact failure the packet exists to kill, and
it also produces a one-pixel flash of unlabelled rail while resizing. Fix: `max-[1141px]:` (or
move the breakpoint decision into CSS so there is one owner).

### B. SECOND OWNER — the 1140 breakpoint now lives in two files
`dente-redesign.css:588` and `workspaceShell.tsx:173,176`, with no shared constant and no comment
binding them beyond prose. They already disagree (finding A). Anyone who retunes the CSS media
query silently desynchronises the caption. This is a direct consequence of the packet's
"CSS only if a token is missing" scope — the builder obeyed the scope; the debt is real and should
be recorded rather than blamed.

### C. DECLARED BY THE BUILDER, STILL UNMEASURED — collapsed rail vertical growth
Arithmetic against the measured shot: before, each collapsed item was 44px
(`main.css` `@layer legacy` `min-height:44px`; observed 46px pitch with the 2px gap). After, an
item is `11 + 19 + 3 + ~11.5 + 11 ≈ 55.5px`, and ~67px whenever the caption wraps —
«Маркетинг/SEO» certainly wraps in the 52px content column (76px rail − 2×12px padding).
Rail total moves from ~600px to ~790px.

It is not a lock-out: `.sidebar` has no `overflow-y`, `.app-shell.dente-redesign` is
`min-height:100vh` with no clip, and `body` only clips `overflow-x` — so the document grows a
vertical scrollbar and the collapse button stays reachable. But on a 1366×768 laptop (viewport
height ~640px) the *compact* mode stops fitting, and this is the sticky mode. The builder named
this in НЕ ПРОВЕРЕНО and prescribed the one-line fix (`overflow-y:auto` on the rail). It needs a
measurement, not more arithmetic.

### D. Nit — caption size
`text-[0.625rem]` = 10px, smaller than the existing `.nav-copy small` (10.5px) and far smaller than
`.nav-label` (13.5px). Legibility of 10px Russian in a 52px column is unverified. Contrast is
unverified by the builder and by me (inherits `.nav-item` colour, which `premium.css:236-283`
overrides with `!important` hexes in the active state — pre-existing, and identical to what
`.nav-label` already gets).

### E. Nit — `viewLabels[view]` now renders twice per `<a>`
Once in `.nav-copy > .nav-label`, once as the caption, with visibility resolved by two independent
mechanisms (CSS for one, React+Tailwind for the other). Same dictionary, so no data second-owner,
but it is duplicated markup that a future reader will have to reason about.

### F. Repo-wide rubric hole (not this builder's fault)
`npm run typecheck -w @dental/web` is `tsc -b`, which prints nothing and exits 0 when the
buildinfo is fresh. Any reviewer re-running it as a verification step is verifying nothing.
Use `tsc -b --noEmit --force`.

---

## 8. WHAT I COULD NOT TEST

- Rendered appearance in any theme or viewport. No screenshot pipeline permitted, and the file the
  builder's closing command names for the collapsed state
  (`.dente-redesign-shots/desktop_light_shift_collapsed.png`) is currently a Vite error overlay —
  the lead must re-run the shot pipeline before that filename means anything.
- Actual pixel height of the collapsed rail (finding C). Arithmetic only.
- Behaviour in the 841–1140px band. No capture at that width exists.
- Contrast ratio of the caption in light/dark/night.
