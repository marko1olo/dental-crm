# ADVERSARIAL REVIEW (SECOND PASS) — V3-token-guard-precision

Commits attacked: `1d5fdc3de` (parser + token-aliases.css comments) + `a0ee75eba` (fixture test).
Specification: `.agents/archon/packets/U3-undefined-tokens/review.md` — read complete; all six §7 items
plus §4 consequences and §5 nits worked one by one below.
Reviewer did not write this code. Posture: disbelief. Every number re-derived, not checked.

HEAD at review start `545d2e02d`. Working tree: `apps/web/src/styles/main.css` is **clean** now
(relevant to one of the builder's claims — see N1).

PROVENANCE. A `review.md` already existed in this directory (mtime 09:23, untracked, verdict
`SOUND_WITH_NITS`). I did not delete it and I did not audit its arithmetic — I re-derived everything
from the tree. Two of its findings I confirm independently; one of its findings is **wrong** (N3b
below); and it **missed the most serious thing in this packet** (§F1).

Nothing in this packet loads `apps/api/dist`. The guard reads `apps/web/src/**` off disk and lists
`dist` in `SKIP_DIRS`; the fixture test spawns a byte copy of the guard against a synthetic tree. No
rebuild was required and none was performed. Stated because the standing order demands it.

## VERDICT: NEEDS_REWORK

Not because anything the builder claimed is false. **Every single claim reproduced**, several to six
decimal places, and the parser fix is correct by an independent oracle: `postcss` — a real CSS parser —
finds **exactly the same 147 declaration names** as the shipped anchored regex, zero missed, zero extra.
The gate provably goes red against the parent blob. No spec item was ignored. This is honest work.

The rework is for one thing the packet did not look at and one thing it wrote into source anyway:

**The guard scans `var()` uses in `.css` files only. It never reads a single `var()` in `.ts`/`.tsx`.
There are 1016 of them, 105 distinct names, and 34 names / 102 occurrences are declared nowhere and
carry no fallback — in live `style={{…}}` props that reach the DOM.** The guard reports 3 names / 12
occurrences and the commit writes «неизвестных имён без запаса ТРИ» into `token-aliases.css:19`
unqualified. The true figure for the disease this guard was commissioned to inventory is **37 names /
114 occurrences**, and the section the builder added in this very commit — «ЧЕГО ПРОВЕРКА НЕ ВИДИТ»,
four enumerated blind spots — omits this one, which is larger than the other four put together and
larger than both defects the packet fixed.

U3's review §4.2 said: *"A stale number was replaced by an incorrect one."* That is what happened again.

---

## 1. GIT HYGIENE — clean

| check | result |
|---|---|
| `1d5fdc3de --numstat` | `apps/web/src/styles/token-aliases.css` 22/4, `scripts/check-css-tokens.mjs` 93/14 = **+115/-18**, exactly as claimed |
| `a0ee75eba --numstat` | `scripts/tests/check-css-tokens.test.mjs` **187/0**, exactly as claimed |
| foreign work swept in? | **No.** 3 files, 2 commits, all 3 claimed. No `apps/api/dist`, no `tsbuildinfo`, no `.data/*.json`, no `scratch/**`, nothing from the neighbouring dirty authors |
| author | `marko1olo` on both, consistent with the campaign |
| subjects | Both Russian, Conventional Commits, `[ARCHON]` prefix, and both name the **DEFECT** («суффикс BEM-класса читался как объявление токена», «промахи разбора … не ловил никто»), not the activity |
| `gitleaks detect --log-opts=1d5fdc3de^..a0ee75eba` | **`no leaks found`, TRUE_EXIT=0**, 3 commits scanned |
| encoding, 3 source files + 4 packet docs + both subjects + both bodies | **0 mojibake lines, no BOM, 0 U+FFFD, Cyrillic present** — checked as decoded characters, not by eye |
| `commitmsg.txt` / `commitmsg-test.txt` vs the real messages | **identical modulo one trailing newline** that `--format=%B` appends. No post-hoc editing of the record. (Pass 1 called these "byte-identical"; strictly they are not — one trailing blank line. Immaterial, but this is a review that says "byte" a lot.) |
| working tree vs commit | `git diff a0ee75eba -- <the 3 files>` **empty**. What I reviewed is what was committed |
| temp artefacts | `scripts/.v3-baseline.mjs` **gone**; `git status --porcelain -- scripts/` **empty**; `node_modules/.cache` contains no `dente-css-token-guard-*` leftovers after a full suite run |
| packet docs | `state.md`, `handoff.md`, `commitmsg*.txt` are **untracked**, matching every other packet. They are not in the commits, contrary to a flat reading of FILES CHANGED |

## 2. WAS THE DEFECT REAL AT THE PARENT? — YES, twice over

`git rev-parse 1d5fdc3de^` = `6aade173f`, the blob the builder used. Correct baseline.

I did not reuse the builder's delete-after-run method (it writes into a tracked directory). I ran **both
parse rule sets over ONE in-memory snapshot in one process**, using the guard's own helper functions
(`blankComments`, `lineIndex`, `hasFallbackAt`) verbatim, so drift is structurally impossible:

```
                        BEFORE (old rules)      AFTER (new rules)
css files                          52                     52
declared in css                   154   ->               147
js-set names                        9   ->                 9
var() uses                       2945   ->              2945   (fallback 369 / 369)
names used via var()              178   ->               178
OFFENDERS                2 names, 10 occ  ->   3 names, 12 occ

ADDED to offender list  : ['2x --danger', 'main.css:2251', 'main.css:4090']
REMOVED from offender list: []
```

**The count moved, and it moved by exactly the predicted delta.** Defect 1 was real. My `var()` figures
are 2945/369 against the handoff's 2946/370 — that drift is declared in the handoff itself
(`2938 -> 2946 -> 2945`, `366 -> 370 -> 369`) and my BEFORE and AFTER agree with each other, which is
the only thing a paired comparison rests on.

Second, independent route — **I ran the committed fixture suite, byte-for-byte, against the parent
blob installed under the production filename** in an isolated root:

```
node --test scripts/tests/check-css-tokens.test.mjs      # guard = 6aade173f blob (md5 d09183cf…)
TRUE_EXIT=1     tests 5 / pass 1 / fail 4
```

and the failures are real assertion failures with the right numbers, not spawn errors:

| fixture | pre-fix failure |
|---|---|
| BEM suffix | `AssertionError: селектор не объявляет токенов` — `2 !== 0` |
| TS comments | `AssertionError: комментарий не выставляет токенов` — `2 !== 0` |
| all legal declaration positions | `AssertionError: setProperty, обычный и вычисляемый ключ` — `2 !== 3` |
| both misses on one input | `actual { names: 1, occurrences: 1 }` vs `expected { names: 3, occurrences: 3 }` |

The fifth (per-site fallback) passes on both versions — correct; it is a declared regression pin, not a
mutation target. **The gate goes red when the defect is reintroduced. Proven, not asserted.**

## 3. PROOF AUDIT — every claimed command re-run, true exit codes captured

| Claim | Result |
|---|---|
| `node scripts/check-css-tokens.mjs` red by design, 3 names / 12 occurrences | **REPRODUCED. TRUE_EXIT=1.** 52 / 147 / 9 / 2945 (369) / 178 / `3 имён, 12 вхождений`; `--brand-400` ×5, `--glass-bg` ×5, `--danger` ×2 at `main.css:2251` and `:4090`. Not weakened to green |
| runtime 0.83 s | **REPRODUCED within noise**: 890 / 960 / 932 ms over three runs on a loaded box |
| 383 `.ts/.tsx`, 5.55 MB | **REPRODUCED**: 383 files, 5.60 MB (tree grew) |
| `node --test scripts/tests/check-css-tokens.test.mjs` → 5/5 | **REPRODUCED**: `tests 5 / pass 5 / fail 0`, **TRUE_EXIT=0**, 1703 ms. No fixture left behind |
| anchor sweep: unanchored 154, `[{;]` 147, `[{;}]` 147, `[{;}]`+`m` 147; LOST=7, GAINED=0 | **REPRODUCED number-for-number** in one process over one snapshot |
| the 7 phantoms and their match sites | **REPRODUCED exactly**: `auth.css:362` `--danger`, `auth.css:371` `--secondary`, `dente-operations.css:168`+`:172` `--button`, `:356` `--ok`, `:363` `--warn`, `:370` `--bad`, `:377` `--info` — 8 sites, `--button` twice, all BEM suffixes before a pseudo-class/element, zero real declarations among them |
| 6 of 7 phantoms never used via `var()` | **REPRODUCED**, per name, over the snapshot: `--bad --button --info --ok --secondary --warn` = `NEVER`; `--danger` = `main.css:2251, main.css:4090` |
| `--danger` declared nowhere | **REPRODUCED FOUR WAYS**: postcss finds no `--danger` declaration in any of the 52 files; the unanchored regex's only match is the phantom `auth.css:362`; it is in neither the old nor the new JS name set; **and it is not among the 419 custom properties Tailwind's `theme.css` injects via `@import "tailwindcss/theme.css"`** (an oracle nobody checked — see §5c) |
| contrast 1.0740, L 0.013572 / 0.009189 | **REPRODUCED to six decimals** with my own WCAG implementation. `L(#16211f)=0.013572`, `L(#111827)=0.009189`, ratio `1.0740`. The `1.02` in `b05e18f79`'s body and in the old `token-aliases.css:86` was wrong |
| 6 names declared only outside a theme block, `--corner-dock-*`, `cornerDock.css:20-37` | **REPRODUCED with a real parser**, resolving nesting through postcss parents, not by regex: exactly 6, all `--corner-dock-{gutter,gap,z,control,control-primary,bar-floor}`, primary sites at `cornerDock.css:20,21,26,27,31,37`. 141 in-theme + 6 outside = 147 |
| every `var()` of those 6 is inside `cornerDock.css` | **REPRODUCED**: `rg -l 'var\(\s*--corner-dock-'` → `cornerDock.css`, `cornerDockLayout.test.ts`, `dente-redesign.css` — and the latter two only reference the three **dynamic** `--corner-dock-{bar-clearance,lift,reserve-block}` names, not the six. Dispute stands |
| all 9 JS-set names are genuine | **REPRODUCED BY INSPECTION, not assertion.** `--ab/--af/--abr` are keys of real `style={{…}}` props on `._ccm-btn` (`VisitView.tsx:1330,1337,1352`); `--glow` a real `style` key (`WorkspaceFeaturesSelector.tsx:262`); the three `--mpr-*` are a `CSSProperties &` intersection type at `AppHelpers.tsx:408-412` plus 13 more assignment sites; `--sa-viewer-filter/-transform` real style keys (`ShadowAnalystImageSlider.tsx:68-69`). **No lookup table is being forgiven** |
| AST set == old-regex set | **REPRODUCED as sets, not counts**: `ONLY OLD = []`, `ONLY NEW = []`. So the AST swap introduced no new false alarm and lost no name |
| line citations: real ones are 119 and 132-136, not 129 and 143-149 | **THE BUILDER IS RIGHT, THE U3 REVIEW WAS WRONG.** In blob `a6a6f019b`: line 119 is `for (const match of source.matchAll(/(--[\w-]+)\s*:/g)) {`; line 129 is the comment `// 2. Имена, которые выставляет JS…`; 132-136 is the `.ts/.tsx` harvest; 143-149 is the `var()` loop. Correcting the reviewer with the blob quoted is the right instinct |
| `apps/web/tsconfig.json` includes only `["src","vite.config.ts"]` | **TRUE.** `apps/api` includes `["src"]`, `packages/shared` `["src"]`. `scripts/**` is in no typecheck gate |
| typecheck | `npm run typecheck -w @dental/web` is **GREEN, TRUE_EXIT=0** now. The handoff/state claimed 5 foreign errors at hand-off time; the foreign author has since fixed them. Direction of the claim was honest (it claimed red, not green) and it named files that were not the builder's |
| guard and test wired into no gate | **TRUE.** `rg check-css-tokens` outside markdown hits only the two script files and `token-aliases.css`. Root `test` delegates to workspaces; `@dental/web`'s is `node --import tsx --test "src/**/*.test.ts" "src/**/*.test.tsx"`, which excludes `scripts/**`. Honestly declared NOT PROVEN |
| `typescript` is a declared root dep; `pg` precedent | **TRUE** — root `devDependencies.typescript ^5.8.3`, installed 5.9.3; `check-schema-type-drift.mjs:22` is `import pg from "pg"` |
| `.gitignore:60-61` are `scratch_*.cjs` / `scratch_*.js`, so `scratch/…mjs` is unignored | **TRUE, verbatim** (58-61: `patch_*.cjs`, `patch_*.js`, `scratch_*.cjs`, `scratch_*.js`) |
| `scratch/scan-undefined-tokens.mjs` exists, untracked, unignored, has the same two diseases plus one | **TRUE.** Line 30 is the same unanchored `/(--[\w-]+)\s*:/g`; comments are never stripped; line 50 accepts **any** quoted `--name` in any `.ts/.tsx` as a definition. The builder's self-caught correction of its own draft is accurate |
| both `--danger` sites are reachable | **TRUE, and harder to prove than the builder made it look.** `.imaging-upload-status.cancelled` comes from `ImagingView.tsx:444` `` `imaging-upload-status ${phase}` `` with `BrowserImagingScanPhase = "scanning" \| "done" \| "cancelled"` (`AppHelpers.tsx:570`), set at `useAppLogic.tsx:8760,8912`. `.dicom-series-blocked` matches **no literal grep** — it is built dynamically as `` `dicom-series-row dicom-series-${series.status}` `` at `SettingsImportsTab.tsx:3867` and `SourcesDicomCapability.tsx:312`, and `blocked` is a real status (`dicomSeriesPreview.blockedSeries` rendered at `SourcesDicomCapability.tsx:307`). Base rules confirmed: `.imaging-upload-status` `border-left: 5px solid var(--teal)` (main.css:2239), `.dicom-series-row` `border-left: 4px solid var(--teal)` (main.css:4049) |

Nothing in the claimed-proven list failed to reproduce.

## 4. DID THE FIX BREAK ANYTHING? — no, and I attacked it three ways

**(a) Independent real-parser oracle.** `postcss` 8.5.16 over all 52 files, walking `Declaration`
nodes and `@property` at-rules:

```
unanchored regex          154 names
anchor [{;]               147
anchor [{;}]  (SHIPPED)   147
anchor [{;}] + m flag     147
postcss (REAL PARSER)     147      parse failures: 0

REAL declarations postcss has that the SHIPPED regex misses : 0   []
names the SHIPPED regex has that postcss does not           : 0   []
names the OLD regex has that postcss does not               : 7   (--bad --button --danger --info --ok --secondary --warn)
```

Zero divergence from a real CSS parser. The builder's regex-vs-regex comparison could only prove the
two sets differ by 7; this proves the **survivors are exactly right**.

**(b) Anchor gauntlet, 27 constructed cases, postcss as truth.** Adjacent declarations with no
whitespace (`a{--a:1;--b:2;--c:3}` — the classic anchor-consumption bug); empty value then another
declaration; declaration at file start; after a nested rule's `}`; after a comment; `@property`; inside
`@media` / `@supports` / `@layer` / `@container`; `;` inside a `data:` URL; after `!important`; after an
`&:hover` nested block; after a `var()` value; multi-line indented; after an at-rule block closes inside
a rule; CRLF file; uppercase/underscore names; `:` inside a `url()` value; no space after `{`. Plus five
must-NOT-match traps.

**Result: `missed = 0`.** No legal declaration position is lost — the direction that would have created
false alarms is clean.

`phantom = 2`, and both are the same artificial construct: a `{` inside a **quoted CSS string** followed
by text shaped like a declaration — `a{content:"{--fake:1}";--real:2}` and `[data-x="{--fake2:1}"]`.
Direction of error is the same as the original bug (a phantom "declared"), but it needs a literal
`{--name:` inside a string. **It does not occur in this repo**: that is exactly what oracle (a) proves —
zero divergence from postcss across all 52 real files. Residual, not live. The four traps that matter
(BEM + pseudo-class, BEM + pseudo-element, attribute selector containing `--fake:1`, comment containing
a declaration) are all silent.

**(c) Could the fix have created a false alarm?** Structurally no, and I checked both halves. Anchoring
only ever *removes* names from `definedInCss`, so it can only add offenders — and the 7 removed are
phantoms by postcss, of which only `--danger` is used. The AST swap could only lose a name — `ONLY OLD =
[]`, so it lost none. **No false-alarm regression exists in either direction.** No third of a viewport
given away here; the change has no runtime surface at all.

**(d) `token-aliases.css` really is comment-only.** The diff is inside `/* … */` throughout, and the
guard blanks comments before matching — so the `.auth-pin-btn--danger:hover` text the builder wrote into
that comment is invisible to it. Confirmed from the other side: the *unanchored* regex's only `--danger`
match anywhere in the repo is `auth.css:362`, never `token-aliases.css`.

## 5. FINDINGS THE PACKET DID NOT LOOK AT

### F1 — THE GUARD READS NO `var()` IN `.ts`/`.tsx`. 34 UNDECLARED NAMES, 102 OCCURRENCES, LIVE.

`check-css-tokens.mjs` walks `.ts/.tsx` for exactly one purpose — harvesting names the code *sets*
(`collectJsCustomProperties`, lines 171-194). It never looks for names the code *uses*. `CSS_VAR_USE` is
applied only to `cssFiles` (line 223-241). The predecessor `scratch/scan-undefined-tokens.mjs` had the
same limit, so **this is not a V3 regression** — but V3 is the commit that wrote a corrected count into
source and added the blind-spot disclosure section, and it did neither for this.

Measured with the guard's own `hasFallbackAt` logic over `.ts/.tsx` under `apps/web/src`:

```
distinct names used via var() in .ts/.tsx : 105
total uses                                : 1016   (170 with a fallback)
UNDECLARED anywhere AND no fallback       : 34 names, 102 occurrences
```

Top offenders, all in live `style={{…}}` props that reach the DOM and behave identically to the CSS
case:

| occ | name | sample sites |
|---|---|---|
| 17 | `--border` | `VisiographAnalyzer.tsx:481` `border: '1px solid var(--border)'`, +13 more in that file, `PatientPortal.tsx:462`, `SettingsPricesTab.tsx:336,391` |
| 16 | `--text-muted` | `VisiographAnalyzer.tsx:459,515,527,539,584,…,794` |
| 12 | `--foreground-muted` | `PayrollView.tsx:358` `color: "var(--foreground-muted)"`, +11 more |
| 9 | `--tomato` | `InventoryView.tsx:414` `color: lowStockCount > 0 ? "var(--tomato)" : "var(--teal)"`, +8 more |
| 6 | `--bg-inset` | `VisiographAnalyzer.tsx:492,567,660,678,694,771` |
| 4 | `--color-danger` | `PayrollView.tsx:417,500,633,798` |
| 4 | `--color-success` | `PayrollView.tsx:457,499,659,812` |
| 4 | `--text` | `VisiographAnalyzer.tsx:583,591,717,783` |
| 2 each | `--color-primary`, `--color-primary-rgb`, `--paper-2`, `--surface`, … | `PayrollView.tsx:608,645`, `SettingsBpmnTab.tsx:171`, `SettingsReportingTab.tsx:127` |

Declared-nowhere verified per name against three sources: the 52 project CSS files (postcss), the 9
JS-set names, and Tailwind's 419 injected theme properties. `--teal` as a control returns three
declarations; every name above returns zero.

**Hardened floor, in case anyone wants to argue with the 34/102.** Restricted to the eight names above,
`.tsx` only, test files excluded, and every hit checked for being inside a comment (none are):
`--border` 17, `--text-muted` 16, `--foreground-muted` 12, `--tomato` 9, `--bg-inset` 6,
`--color-danger` 4, `--color-success` 4, `--text` 4 = **8 names, 72 occurrences**, in
`VisiographAnalyzer.tsx` (38), `PayrollView.tsx` (20), `InventoryView.tsx` (9),
`SettingsPricesTab.tsx` (2), `PatientPortal.tsx` (1). Even at this floor the guard reports 12
occurrences of a disease that has at least 84.

The consequence is the exact disease in the guard's own header: `VisiographAnalyzer`'s panel loses its
border, its inset background and its muted text colour to `initial`/inherited values;
`InventoryView`'s low-stock figure loses its red and falls to `currentColor`. **47 of the 102
occurrences are in one component.**

Why this matters for the record rather than just for the backlog:

1. `token-aliases.css:19-21`, written by this commit, reads «неизвестных имён без запаса **ТРИ** —
   `--brand-400` (5 вхождений), `--glass-bg` (5) и `--danger` (2), все три не объявлены нигде». The
   sentence is scoped only by «Её замер» (the guard's measurement); the section it sits in
   («ЧАСТЬ 1 — НЕОБЪЯВЛЕННЫЕ ПЕРЕМЕННЫЕ») opens on the general phenomenon and never says "in `.css`
   files only". The next author reads "three left". The truth is **37 names / 114 occurrences**.
   U3's review §4.2 ordered this exact class of error fixed; it recurs here at 11× the magnitude.
2. The mitigating sentence «Именно вывод проверки … считать текущим состоянием» defers to output that
   is itself short by 34 names.
3. The guard's «ЧЕГО ПРОВЕРКА НЕ ВИДИТ» section — **added by this commit**, lines 45-56 — enumerates
   four blind spots: dynamic names, values not computed, declarations inside a component block, and
   partial parse of a syntactically broken file. It omits the one that hides 102 occurrences. A
   disclosure section that lists the small holes and not the big one reads as completeness.

I am not asking the builder to fix 34 tokens, and I am not asking it to make the guard red on 37 names
without the lead's say — that is a scheduling decision, because it turns a 3-line inventory into a
37-line one. I am asking for the number in source to be true and the blind spot to be named.

### F2 — Latent: `node_modules` CSS is never read, so a Tailwind theme token would be a false alarm.

`@import "tailwindcss/theme.css" layer(theme)` (`styles/tailwind.css:34`) injects **419** custom
properties into the real cascade. The guard's `SKIP_DIRS` never reaches them because it only walks
`apps/web/src`. Today this costs nothing — I checked, and none of the 178 used names resolves only via
Tailwind, so there is no false alarm — but the failure direction here is the *dangerous* one (red on a
name that is genuinely defined), and it is undisclosed. One line in the same disclosure section.

## 6. NITS (do not block)

**N1 — a guess presented as a fact, repeated three times.** The handoff says `main.css:4090` "в рабочем
дереве = `main.css:4065` в HEAD (main.css грязный от второго автора, выше 4065 добавлено ~25 строк)" —
repeated at §7.4 and Долг §1. **The explanation is wrong.** The ~25 lines came from commit
`6aade173f`, which `git show --numstat` confirms added exactly `25 0` to `main.css` and which
`git merge-base --is-ancestor` confirms is an **ancestor of `1d5fdc3de`**. So at the builder's own HEAD
the *committed* `main.css` already carried the rule at 4089/4090; `4064/4065` was only ever true in the
U3-era frame. Measured per blob: `a6a6f019b` → 4064, `6aade173f` / `1d5fdc3de` / HEAD → 4089. And
`main.css` is **clean in the worktree**, so the "dirty second author" premise is not load-bearing on
anything. The shipped numbers (2251, 4090) are right; only the reason attached to them is invented.
Pass 1 found this too; I confirm it independently. Since the standing charge in this campaign is
fabricated proof, it gets named — in a handoff otherwise free of it.

**N2 — the guard now hard-fails without installed dev-dependencies.** `import ts from "typescript"`
(line 65) is a static top-level import and `typescript` is a **devDependency** (`^5.8.3`), so
`npm ci --omit=dev` turns a previously dependency-free script into `ERR_MODULE_NOT_FOUND`. Exit code
stays non-zero, so the failure direction is safe, but a consumer reading only the exit code cannot tell
a crash from a finding. The requirement is documented in the **test** file's header (lines 19-25), where
nobody running the guard will look — not in the guard's own «ЧЕГО ПРОВЕРКА НЕ ВИДИТ» section, which is
its natural home. *(Static conclusion from the import graph plus dependency classification; I did not
stage a stripped `node_modules` to watch it die.)*

**N3a — stale citation on a foreign dirty file.** `CornerDock.tsx:213/230/267/272` is now
`:220/237/274/279`, with the three constants at `:44-46`. The handoff declares the tree moved under it,
so this is drift, not invention.

**N3b — pass 1's own finding here is wrong, and I am recording it so it does not propagate.** Pass 1
says the builder's fallback enumeration "misses a fourth site, `dente-redesign.css:688`". It does not.
`dente-redesign.css:688` sits **inside a `/* … */` comment** (683-690, a block documenting a rule that
was removed) — the guard blanks comments before matching, so it is not a use at all. The builder's list
(`cornerDock.css:44,47`, `dente-redesign.css:844`) is the complete list of **real** uses. The only other
textual hit is `cornerDockLayout.test.ts:333`, a `.ts` file the guard never scans for uses — which is
itself F1 in miniature.

## 7. HOLLOW-FACADE / STANDARDS SWEEP — nothing found

- No `{success:true}` over a no-op, no placeholder, no `// TODO`, no mock. The exit code is honest: 1
  with a real list.
- No hardcoded hex, port, UUID or endpoint introduced; no static `px` where a relative unit belongs. The
  only hex in the diff is inside a CSS comment quoting `#16211f`/`#111827` as measured values.
- `useAppLogic.tsx` untouched; no return field deleted; no second owner of any state; no listener,
  interval or handle created, so no teardown is owed; no file deleted.
- New Russian text lives in CSS comments, a CLI script's `console` output and test assertion messages —
  no user-facing UI literal, so no i18n obligation.
- The fixture test runs the **real guard file byte-for-byte** (`copyFileSync(guardPath, …)`), not a
  re-implementation, and cleans its tree in `finally` — verified empty afterwards. That is the right
  shape for a parser fixture.
- §11 `madge` and the biome orders: not penalised per the review brief.
- The `}` in the anchor is the **stricter** choice, not the looser one: required for legal CSS nesting,
  and the gauntlet shows it buys no phantom.

## 8. ITEM-BY-ITEM AGAINST THE SPECIFICATION (U3 review §7 + §4 + §5 + §6)

| # | Requirement | Builder's label | My verdict |
|---|---|---|---|
| §7.1 | Anchor the declaration regex; re-run and quote new totals | CLOSED | **CLOSED.** `CSS_DECLARATION = /(?:^\|[{;}])\s*(--[\w-]+)\s*:/g`. Totals quoted and reproduced: 154→147, `2/10`→`3/12`. postcss independently agrees at 147, and my 27-case gauntlet loses no legal position |
| §7.2 | Strip comments from `.ts/.tsx` or narrow the pattern; prove with a fixture | CLOSED | **CLOSED, and better than ordered.** TypeScript AST rather than hand-rolled comment stripping; the stated reason (a regex literal `/https?:\/\//` fools a naive stripper) is correct. Fixture covers line and block comments and fails `2 !== 0` against the parent blob. `ONLY OLD = []` proves nothing was lost in the swap |
| §7.3 | Replace «осталось ДВА» with the corrected count; add `--danger` | CLOSED | **DISPUTED BY ME.** «ТРИ» is right for the guard's scope and wrong as written: `token-aliases.css:19-21` states it unqualified, and the repo-wide figure is 37 names / 114 occurrences (§F1). `--danger` and the seven phantoms are named correctly; the file is genuinely comment-only. This is the rework |
| §7.4 | Record `--danger` as an open inventory item with real usage sites; do not fix | CLOSED (by record) | **CLOSED.** Recorded in `token-aliases.css:31-37`, the commit body and Долг §1, with both sites and the `currentColor` consequence. Rule untouched, as ordered. Both sites confirmed reachable, including the dynamically-composed `.dicom-series-blocked`. Line-frame *explanation* is wrong — N1 |
| §7.5 | Correct 1.02 → 1.07 in the handoff and at `token-aliases.css:86` | CLOSED | **CLOSED.** 1.0740 reproduced to six decimals with an independent WCAG implementation. `b05e18f79`'s body genuinely cannot be rewritten; the correction is in the file and the handoff, and belongs in `progress.md` as the builder says |
| §7.6 | *Optional*: flag a name whose only definition sits outside a `:root`/`[data-theme]` block | DISPUTED with a number | **DISPUTE UPHELD, re-measured with a real parser.** Exactly 6 such names, one family (`--corner-dock-*`, `cornerDock.css:20-37`), every `var()` of all six inside `cornerDock.css`. As ordered the rule emits 6 false alarms and 0 real finds. The restatement — "declared on a component but read outside its subtree" — is the correct requirement and genuinely needs selector-nesting analysis. Legitimate dispute, not a dodge |
| §4.1 | "The claimed true count is false" | CLOSED | **CLOSED for CSS** — 3 names / 12 occurrences, reproduced. See §7.3 for the repo-wide caveat |
| §4.2 | "The wrong number was written into source" | CLOSED | **NOT CLOSED.** A number that is right-for-scope was written into source without its scope. §F1 |
| §4.3 | "150 declared is inflated; real is 143" | CLOSED | **CLOSED and confirmed in the new frame**: 154→147, same −7. The review's 150/143 was a smaller tree |
| §4.4 | "The delivered guard is looser than the ordered guard" | DISPUTED in general, CLOSED in the decisive case | **Accepted as argued.** `--danger`, the case that distinguishes the two specs, is closed; the general part reduces to §7.6 and is correctly rejected with a number |
| §5 nit | contrast 1.02 does not reproduce | CLOSED | **CLOSED** |
| §5 nit | "39 names" reproduces as 40 | cause confirmed in source, no fix | **Accepted.** `scratch/scan-undefined-tokens.mjs` verified on disk, untracked, unignored, and carrying both diseases plus a third. The builder caught and rewrote its own false draft claim before shipping — the behaviour this campaign has been trying to install |
| §5 nit | guard wired into no npm script | DECLARED DEBT | **Accepted** — verified true for the guard *and* the new test. Both suggested script lines are in the handoff; `package.json` is shared and outside the claim |
| §6 | no guard that a class cannot outrank `[data-theme]` for the same property | DECLARED DEBT, not this packet | **Accepted** — genuinely U3's open debt |

**No numbered item was silently ignored.** Every one carries a label and every label survives checking
except §7.3 / §4.2, where the label is right about `--danger` and wrong about completeness.

## 9. RECORD CORRECTIONS CLAIMED — all four verified, plus a fifth

1. «осталось ДВА» → three names. **Verified**; the third is `--danger` and the file says so. Incomplete
   in the other direction — §F1.
2. U3 handoff «Настоящее: 2 имени, 10 вхождений» → 3 / 12, and «Оба имени проверены вручную» is
   incomplete because the third was never printed. **Verified and fair.**
3. «Контраст 1.02» → 1.0740. **Verified** in `b05e18f79`'s body and recomputed independently.
4. The builder's own first draft falsely claimed `scratch/scan-undefined-tokens.mjs` was gone.
   **Verified false, verified self-corrected before shipping.**
5. Unlisted but real: the U3 review's line citations `:129` and `:143-149`. **The builder is right and
   the reviewer was wrong** — real lines 119 and 132-136 in blob `a6a6f019b`, quoted above.

## 10. REQUIRED REWORK

Surgical. **Do not touch the anchor, the AST harvest or the fixtures — they are correct and independently
verified.** Do not weaken the guard to green.

1. **`apps/web/src/styles/token-aliases.css:19-21` — scope the number or the number is wrong again.**
   «неизвестных имён без запаса ТРИ» must say that it counts `.css` files only, and must state the
   `.ts/.tsx` figure alongside it: 34 names / 102 occurrences of `var()` in inline styles, declared
   nowhere and without a fallback (measure it yourself; do not copy mine). This is U3 §4.2 again.
2. **`scripts/check-css-tokens.mjs`, «ЧЕГО ПРОВЕРКА НЕ ВИДИТ» — add the two missing blind spots:**
   (a) `var()` inside `.ts/.tsx` is never scanned, only names the code *sets*; (b) CSS imported from
   `node_modules` is never read, so the 419 properties `tailwindcss/theme.css` injects are invisible and
   a name defined only there would be a false alarm. Extending the scan to `.ts/.tsx` uses is the real
   fix, but it turns a 3-name red into a 37-name red — flag it to the lead as a scheduling decision
   rather than deciding it, and if the lead wants it, prove it with a fixture (a `.tsx` with
   `style={{ color: "var(--nope)" }}` must be reported).
3. **Move the "requires installed dev-dependencies" note (N2)** from the test header into the guard's own
   disclosure section, since `typescript` is a devDependency and the guard now dies without it.
4. **Drop the invented reference-frame explanation (N1)** from the handoff and Долг §1. The true frame:
   `4065` at `a6a6f019b`; `4090` from `6aade173f` — a **committed ancestor of this packet** — onward;
   `main.css` is clean in the worktree. Shipped numbers need no change.
5. **Refresh `CornerDock.tsx` citations (N3a)** to `:220/237/274/279` with constants at `:44-46`, and
   note in the packet record that pass 1's `dente-redesign.css:688` addition is wrong — that line is
   inside a comment, which the guard blanks.
