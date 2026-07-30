# ADVERSARIAL REVIEW — U3-undefined-tokens

Commits attacked: `b05e18f79` (fix, token-aliases.css) + `a6a6f019b` (guard + test + stale-count)
Reviewer: did not write this code. Posture: disbelief; every claim re-run, nothing read and believed.
HEAD at review start: `feb39fe35`; it advanced to `e14c09862` mid-review as neighbouring agents
committed (`637a83789` touches `scripts/lib/api-route-census.mjs` + `scripts/smoke-clinical-mutation-guard.mjs`,
`e14c09862` only `.agents/archon/packets/U1-identity-verified/**`). Neither touches the three files
under review, so every measurement below still stands against the reviewed blobs.

## VERDICT: NEEDS_REWORK

The fix half (`b05e18f79`) is sound and is the best-proven diagnosis I have audited in this campaign:
the pixel measurement reproduces byte-for-byte, and the mutation test reproduces independently from
the pre-fix git blob. The guard half (`a6a6f019b`) — which the builder itself calls "the real
deliverable" — has a **one-line parsing bug with a live miss**, and the number it produced was written
into source as fact. Rework is surgical; nothing here justifies a revert.

Note on my own first suspicion, recorded before I read the file at HEAD and then killed: I thought the
bare `:root` member of the light block had been deleted, which would have left the six tokens undefined
on a root with no attribute and no class. It was **not** deleted — `token-aliases.css:103` still carries
it. Wrong suspicion, dropped.

---

## 1. GIT HYGIENE — clean

- `b05e18f79 --stat`: `apps/web/src/styles/token-aliases.css` only (+35/-6).
- `a6a6f019b --stat`: `token-aliases.css` (+20/-6), `apps/web/src/tests/themeTokenSpecificity.test.ts`
  (new, 235), `scripts/check-css-tokens.mjs` (new, 195).
- Exactly the three claimed files. No `apps/api/.data/*.json`, no `tsbuildinfo`, no `scratch/**`,
  nothing from the neighbouring dirty authors (`DocumentsView.tsx`, `documentStore.ts`, `main.css`,
  `scripts/lib/api-route-census.mjs` are all still uncommitted in the worktree — correctly left alone).
- Both subjects Russian, Conventional Commits, and they name the DEFECT, not the activity.
- Encoding: 0 mojibake lines, no BOM, no U+FFFD in any of the three files; commit subjects and bodies
  are clean UTF-8 (checked as characters, not by eye). `node scripts/check-encoding.mjs` exits 1
  (pre-existing red) and names none of the three files — claim holds.

## 2. WAS THE DEFECT REAL BEFORE THE COMMIT? — YES, and I looked at it myself

I opened `.dente-ops-shots/light_duplicateAlert_ПУСТО.png`. Two solid black bars sit inside the
left-hand patient cards: one in «Савельева Ольга Игоревна» between the pink «срочно» chip and the
«26 500 ₽» chip, one in «Громов Илья Андреевич» under the orange «контроль» chip. Both cards are white.
The bars are filled rectangles with barely-visible darker text inside — rendered content, not redaction.

`git show b05e18f79^:apps/web/src/styles/token-aliases.css` — pre-fix selectors:
`:root, [data-theme="light"], html.light` (light) vs `[data-theme="dark"], html.dark` (dark), and
`--srf-chip-soft: #16211f` at **line 85**. `git grep -c -i 16211f b05e18f79^ -- apps/web` → exactly
**1** hit in the whole of apps/web. So "the only occurrence of that hex, at token-aliases.css:85" is
exactly right *in the pre-commit reference frame*. (A naive grep at HEAD shows 6 hits — all of them
text the builder itself added afterwards in the comment and the test. Checked; not a lie.)

## 3. PROOF AUDIT — re-ran every claimed command, true exit codes

| Claim | Result |
|---|---|
| `probe-pixels.mjs light_duplicateAlert_ПУСТО.png 620` | **REPRODUCED to the pixel**: `box x=319..517 y=251..268 (w=199 h=18) fill=#16211fx2453 #111827x193`; `box x=319..524 y=713..729 (w=206 h=17) fill=#16211fx2264 #111827x216`. Exit 0. Geometry, fill hex and both pixel counts match the claim exactly. |
| `probe-theme.mjs` same plate | **REPRODUCED**: page `#fdfefd`, card `#ffffff`, h3 `#0f1e1b`, phone `#64748b`. `--muted` in main.css is `#6b7280` in `:root` (line 17) and `#64748b` in the light block (line 139) — the measured `#64748b` proves main.css's light block **won** on that plate, so the page really was light while a dark token value was painted. |
| Control: `probe-pixels.mjs patients_light_full.png 620` | **REPRODUCED**: zero dark boxes. Mechanism isolated. |
| `node scripts/check-css-tokens.mjs` | **REPRODUCED number-for-number**: 51 css files, 150 declared, 7 from JS, 2869 var() uses (358 with fallback), 167 names, "2 имён, 10 вхождений". **TRUE_EXIT=1**. Red by design, as stated. |
| `node --import tsx --test src/tests/themeTokenSpecificity.test.ts` | **REPRODUCED**: tests 7 / pass 7 / fail 0. |
| MUTATION (does the gate go red?) | **REPRODUCED INDEPENDENTLY.** I did not trust the builder's revert-and-restore. I took the pre-fix blob straight from git (`git show b05e18f79^:…css`) into `/tmp/u3mut/src/styles/`, copied the test verbatim to `/tmp/u3mut/src/tests/`, ran it from `apps/web`: **TRUE_EXIT=1, pass 4 / fail 3**, `actual '#16211f' expected '#f7fbf9'` (light) and `'#16211f'` vs `'#1a1714'` (night). Specificity arithmetic and the pixel reading agree on `#16211f` by two independent routes. Source untouched: `git diff` on the three files is empty. |
| `npm test -w @dental/web` | **REPRODUCED**: tests 461 / pass 461 / fail 0, suites 83, **TRUE_EXIT=0**. |
| `npm run typecheck -w @dental/web` | **REPRODUCED**: only `DocumentsView.tsx(2178,2185,2193,2224,2232,3082) TS2304 Cannot find name 'AnamnesisField'` — the 6 pre-existing errors of the foreign dirty author. Zero in the builder's files. |
| `curl 127.0.0.1:5173/src/styles/token-aliases.css` | **REPRODUCED**: HTTP 200, **9252 bytes**. Payload is Vite's JS-wrapped CSS, so the selectors appear escaped: `root[data-theme=\"light\"]`, `\"dark\"`, `\"night\"`, plus `html.dark:not([data-theme])`. Correctly labelled by the builder as NOT a rendering proof. |
| Reachability | **TRACED AND TRUE.** `main.tsx:15` imports the file into the real bundle. `main.css:9555` is the `.patient-next-action {` rule (the `background: var(--srf-chip-soft)` line is 9558 at HEAD — the citation points at the rule, which is correct). `PatientsView.tsx:293` renders `<strong className="patient-next-action">{insight.nextBestAction}</strong>` for every patient with an insight. The defective *state* needs attribute-light + class-dark, which `applyThemeToRoot` (themeClasses.ts:58-63) never produces. The builder's refusal to sell this as a user-facing defect is correct and unusually disciplined. |

### Regression hunt on the fix — came up clean
I went looking for the way `:root[data-theme=…]` could break something the old bare
`[data-theme=…]` handled: a **scoped** theme preview (`<div data-theme="dark">`), which the `:root`
prefix would stop matching while `main.css`'s bare `[data-theme="dark"]` (line 71) would still match —
that would have desynchronised the six surface tokens inside such a subtree. `rg 'data-theme|dataset\.theme'`
over all `.ts/.tsx`: every read is `document.documentElement.getAttribute("data-theme")` and the only
write is `root.dataset.theme` in `applyThemeToRoot`. No scoped consumer exists. No regression.
The bare `:root` member of the light block was **retained** (line 103), so a root with neither
attribute nor class still gets light values; `html.dark:not([data-theme])` (0,2,1) still wins the
cold-load frame that `index.html:2`'s hardcoded `class="dark"` creates. The six tokens are declared
in this file and nowhere else (checked across all of apps/web), so there is no competing cascade.

---

## 4. THE FINDING THAT MATTERS — the guard has a live false negative, and its headline number is wrong

**`scripts/check-css-tokens.mjs:129`** collects declarations with `/(--[\w-]+)\s*:/g`. That pattern is
unanchored, so it also matches a **BEM class-name suffix followed by a pseudo-class or pseudo-element**.
`.auth-pin-btn--danger:hover` is read as a declaration of `--danger`.

Seven phantom "declarations" exist in the repo today, none of them real:

| phantom name | what actually matched |
|---|---|
| `--danger` | `apps/web/src/styles/auth.css:362` `.auth-pin-btn--danger:hover:not(:disabled)` |
| `--secondary` | `auth.css:371` `.auth-pin-btn--secondary:hover…` |
| `--button` | `dente-operations.css:168` `.ops-metric--button:hover` |
| `--ok` | `dente-operations.css:356` `.ops-state--ok::before` |
| `--warn` | `dente-operations.css:363` `.ops-state--warn::before` |
| `--bad` | `dente-operations.css:370` `.ops-state--bad::before` |
| `--info` | `dente-operations.css:377` `.ops-state--info::before` |

Four of those seven — `--ok`, `--warn`, `--bad`, `--info` — are near-misses of real tokens in this
palette (`--ok-fg`, `--ok-bg`, `--bad-fg`, …), so the hole is pre-loaded with exactly the names a future
author is most likely to typo.

**One of them is a live miss.** `--danger` is declared **nowhere** in the repository
(`rg '(^|[{;]|\s)--danger\s*:' apps packages scripts` → no hits; not in the 7 JS-set names either),
and it is used **without a fallback** in shipped CSS:

- `apps/web/src/styles/main.css:2251` — `.imaging-upload-status.cancelled { border-left-color: var(--danger); }`
- `apps/web/src/styles/main.css:4065` — `.dicom-series-blocked { border-left-color: var(--danger); }`

Both base rules set `border-left: 5px solid var(--teal)` / `4px solid var(--teal)`. Invalid at
computed-value time does **not** fall back to the earlier cascade entry — a non-inherited property goes
to its initial value, and `border-left-color`'s initial value is `currentColor`. So a **cancelled**
upload and a **blocked** DICOM series render a text-coloured left border instead of red, and lose the
teal too. That is precisely the disease this guard was commissioned to inventory, and the guard hides it.

**Proven with the guard's own code, not by re-implementation.** I copied
`scripts/check-css-tokens.mjs` unchanged to `/tmp/u3fake/scripts/` and built a synthetic
`/tmp/u3fake/apps/web/src/` containing:

```css
.btn--danger:hover { background: red; }
.x { border-left-color: var(--danger); }
.y { color: var(--definitely-missing-xyz); }
.z { color: var(--commented-token); }
```
```ts
// a comment that merely mentions { "--commented-token": "1rem" } and nothing else
```

Output: `объявлено переменных в css: 1`, `имён выставляется из js: 1`,
`НЕ РАЗРЕШАЕТСЯ НИ В ОДНОЙ ТЕМЕ: 1 имён, 1 вхождений` — only the control name
`--definitely-missing-xyz` is reported. `var(--danger)` is swallowed by the class-name match, and
`var(--commented-token)` is swallowed by a **TypeScript comment**: the JS scan at
`check-css-tokens.mjs:143-149` reads `.ts/.tsx` **without stripping comments**, so any mention of
`"--name":` anywhere in any TS file marks that name defined forever. (Second hole; latent, not a live
miss — the three real JS-sourced names `--mpr-axis-deg / --mpr-slab-width / --mpr-slice-position` are
genuine `CSSProperties` keys at `AppHelpers.tsx:409-411`.)

### Consequences of the bug, in order of seriousness

1. **The claimed true count is false.** Not "2 names / 10 occurrences" — at least **3 names / 12
   occurrences** (`--brand-400` ×5, `--glass-bg` ×5, `--danger` ×2). The brief's step 4 said in so many
   words: *"Report the true count you find"*.
2. **The wrong number was written into source.** `token-aliases.css:19-20` now reads
   «неизвестных имён без запаса осталось ДВА — --brand-400 (5 вхождений) и --glass-bg (5)». A stale
   number was replaced by an incorrect one. The mitigating sentence — «Именно её вывод, а не это число,
   считать текущим состоянием» — is good practice but does not make the printed number right, because
   the output it defers to is itself short by one name.
3. `объявлено переменных в css: 150` is inflated by the same 7 phantoms; the real figure is **143**.
4. **The delivered guard is looser than the ordered guard.** The brief specified failure when a `var()`
   name has "no definition in any `:root`/`[data-theme=…]` block". This guard accepts a definition in
   **any** block whatsoever. `--danger` is the exact case that distinguishes the two specs, and the
   leniency is not disclosed anywhere in the handoff's claim list.

The fix is one line: anchor the declaration regex so a name only counts when it starts a declaration —
e.g. require `[{;]` or start-of-line whitespace before the `--`, which is what I used in my own audit
pass (143 real vs 150 raw). Then re-run, correct `token-aliases.css:19-20`, and hand `--danger` to the
lead's schedule alongside `--brand-400` and `--glass-bg`.

---

## 5. NITS (do not block)

- **Contrast 1.02 does not reproduce.** For the stated pair — fill `#16211f`, text `#111827` — the
  WCAG ratio is **1.074** (`L=0.013572` vs `L=0.009189`). Unreadable either way; the conclusion is
  untouched. But it is a claimed measurement that is off, and it is also written into source at
  `token-aliases.css:86` and into the commit body.
- **"39 names" from the predecessor script reproduces as 40.** Cause found and it is self-inflicted:
  `a6a6f019b` added the text `var(--x, запас)` to the header comment of `token-aliases.css:17`, and the
  old comment-blind script counts comment text as a use (verified: the pre-`a6a6f019b` blob contains no
  `var(--x`). Immaterial — and it demonstrates the builder's own point about the predecessor better than
  the handoff does.
- The guard is not wired into any npm script. Neither are `check-encoding.mjs` nor
  `check-schema-type-drift.mjs`, so this matches the house style, and a red-on-arrival check cannot be
  wired into a blocking gate anyway. Worth stating explicitly in the handoff rather than leaving implicit.

## 6. HOLLOW-FACADE / STANDARDS SWEEP — nothing found

- No `{success:true}` over a no-op, no placeholder, no magic constant, no hardcoded UUID/port/endpoint,
  no fabricated default. The guard's exit code is honest (1 with a real list).
- No hex at any call site; no theme value changed by either commit (the diff touches selectors only).
- No `useAppLogic` return field touched; no listener, interval or handle created; no file deleted.
- No static `px` introduced where a relative unit belongs; no new undeclared Russian literal in TSX
  (the Russian added is in CSS comments, a test's assertion messages, and a CLI script's output —
  none of it user-facing UI text).
- `themeTokenSpecificity.test.ts` throws on an unrecognised selector shape instead of silently passing
  it — the right failure direction for a hand-rolled parser. Its `:not()` specificity handling matches
  the CSS spec (takes the argument's specificity, contributes nothing itself).
- Honestly declared as NOT PROVEN and confirmed still open: no second guard asserts that a class
  selector never outranks a `[data-theme]` selector for the same custom property. `main.css:69`'s
  `html.dark` block does declare custom properties and is only survived because its light counterpart
  (`main.css:128-130`) happens to list `:root[data-theme="light"]` (0,2,0) first; delete that one
  member and the same disease returns across ~200 tokens with no gate to catch it.
  `VisitView.css:112-139`'s `html.dark …` rules set `background`/`color` on descendants, not custom
  properties on the root, so they cannot swap a palette — a different, milder trap.

## 7. REQUIRED REWORK

1. `scripts/check-css-tokens.mjs:129` — anchor the declaration regex so `.foo--bar:hover` is not read
   as a declaration of `--bar`. Require a `{`, `;`, or start-of-line before the `--`. Re-run and quote
   the new totals.
2. Same file, `:143-149` — strip comments from `.ts/.tsx` before harvesting `"--name":` keys, or narrow
   the pattern to object-literal/`setProperty` positions. Prove it with a fixture that a commented-out
   mention no longer silences a real offender.
3. `apps/web/src/styles/token-aliases.css:19-20` — replace «осталось ДВА» with the corrected count and
   add `--danger` to the named list.
4. Record `--danger` (`main.css:2251`, `main.css:4065`) as an open inventory item for the lead, with the
   consequence stated: `border-left-color` falls to `currentColor`, so the cancelled-upload and
   blocked-DICOM states lose their red border. Do not fix it in this packet.
5. Correct the contrast figure from 1.02 to 1.07 in the handoff and at `token-aliases.css:86`.
6. Optional, and the builder already listed it: bring the declaration-vs-selector strictness up to the
   ordered spec — flag a name whose only definition sits outside a `:root`/`[data-theme=…]` block.

## 8. CLOSING COMMANDS THE LEAD STILL OWNS (unchanged from the handoff, and correctly labelled)

```
node scripts/ops-panels-shots.mjs
node .agents/archon/packets/U3-undefined-tokens/probe-pixels.mjs .dente-ops-shots/patients_light_full.png 620   # expect zero dark boxes
# in the 5173 console:
document.documentElement.classList.add('dark');
getComputedStyle(document.documentElement).getPropertyValue('--srf-chip-soft')   # expect ' #f7fbf9'
```
