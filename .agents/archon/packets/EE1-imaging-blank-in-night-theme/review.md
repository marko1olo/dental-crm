# EE1 — adversarial review of aaed659160000def317c3936b8cb896ffbed6ca5

Reviewer: adversarial (did not write the code). READ-ONLY pass. Every number below is mine,
re-derived, not copied from the packet.

## Scope reality check (before the five questions)

The commit is CSS + docs only. `git show --stat`:

- `apps/web/src/styles/shadow-analyst.css` — 36 lines changed, 27 of them a Cyrillic comment block
- `.agents/archon/packets/EE1-imaging-blank-in-night-theme/reproduction.md` — new, 121 lines
- 2 files, 148 insertions, 9 deletions. **No `.ts`/`.tsx` in the commit.**

Two notes on the dispatch:

1. The brief's `FILES` list names `state.md`. `state.md` is NOT in this commit — it landed in
   `9e4f14543` (`docs(снимки): состояние пакета EE1 не было записано после коммита`, 1 file, 4
   insertions). The packet's own PROVEN list says this correctly.
2. The five mandated checks (guards.ts, kopecks, money comparisons, `${index + 1}`) have **zero
   intersection** with this diff. I ran them literally anyway; see §1a and §2.

Commit is an ancestor of HEAD (`git merge-base --is-ancestor` = yes). Seven commits from other
agents landed on top, so the working tree is not the post-commit tree. Caveats flagged where it
matters.

## 1. Did it miss a site?

### 1a. The brief's literal question (guards.ts money-in-text) — MY numbers

`apps/api/src/documents/guards.ts` at HEAD, 1248 lines:

| measurement | my command | my count |
|---|---|---|
| `kopecksToNumericString(` occurrences | `rg -o … \| wc -l` | **24** |
| lines carrying `${kopecksToNumericString` | `rg -c '\$\{kopecksToNumericString'` | **11** |
| raw money interpolations left | `rg '\$\{[^}]*Rub[^}]*\}' \| rg -v kopecksToNumericString` | **0** |
| `toFixed` in the file | `rg -n toFixed` | **0** |

So: 24 formatted money interpolations across 11 sites, **0 raw**. Not "11 raw / 4 already correct".
That figure belongs to the guards.ts money packet (`d0c0d196d` / `a3f83ebeb`), not to EE1. This
commit touched none of it.

### 1b. The real question — did it miss a site in the imaging AI-report cascade?

**YES. Two colour literals inside the exact panel the fix re-coloured are absent from the 11-item
inventory — no CONVERTED, no ALREADY CORRECT, no NOT MONEY verdict. One of them the fix made
measurably worse.**

**MISS 1 (the material one): `.sa-tooth-num` — `shadow-analyst.css:322`, `color: #38bdf8`.**

It is not chrome. `ShadowAnalystReport.tsx:150` renders `<span className="sa-tooth-num">{update.code}</span>`
— the tooth number itself, "36". It sits inside `.sa-tooth-row`, i.e. inside the very rows this
commit re-backgrounded, physically between two converted sites (`:315` and `:332`).

WCAG, recomputed by me from the declared palette (`dente-redesign.css:11/67/115` blocks, alpha
composited over `--paper-soft` then rounded to integer channels):

| row / theme | before | after | AA 4.5 |
|---|---|---|---|
| critical row, **light** | 1.96 | **1.75** | fail, and **worse than before** |
| done row, **light** | 2.05 | **1.95** | fail, and worse than before |
| neutral row, light | 2.03 | 2.03 | fail (untouched) |
| critical row, dark | 1.96 (literal bg) | 6.99 | pass |
| critical row, night | 1.96 (literal bg) | 6.56 | pass |

The fix moved `--bad-bg` light from `#fef2f2` to `#fee2e2` (slightly more saturated, as the commit
body says) — which lowered the sky-blue tooth number from 1.96 to **1.75**. Both figures are far
below AA; the change is small and the regression is not the defect. The defect is that a text site
carrying the packet's own payload ("зуб **36** — глубокий кариес") sits at 1.75:1 in the default
theme and the inventory does not mention it at all. The commit body claims for the light theme
"смысл цвета «критично / сделано» сохранён" — true for `--text-primary`, silent on the number.

**MISS 2 (minor, pre-existing, untouched): `.sa-icon-btn--active` — `shadow-analyst.css:228`,
`color: #10b981`.** Same literal green the fix tokenised at `:338`, in the same panel header, left
raw and unlisted. Light theme 2.41:1 on `--paper-soft`, dark 7.24:1. It is an icon, not text, so it
is a weaker finding than MISS 1 — but the inventory converted `#10b981` at one site and did not
mention the identical literal 110 lines above it.

### 1c. Inventory claims I could verify — all hold

| claim | my check | verdict |
|---|---|---|
| `--bad-bg/--bad-fg/--ok-bg/--ok-fg` declared in all three themes | `rg` -> `dente-redesign.css:28-30` (`:root, [data-theme="light"]`), `:83-85` (`dark`), `:148-150` (`night`) | **VERIFIED** |
| `:280 .sa-tooth-row` `var(--surface-muted)` ALREADY CORRECT | `--surface-muted: var(--surface-100)` (`token-aliases.css:144`, `:root`) and `--surface-100: var(--paper-soft)` declared in all three theme blocks (`dente-redesign.css:55/106/171`) | **VERIFIED** |
| `:454 .sa-label--left` / `:468 .sa-ai-badge` sit on the image, not a themed surface | `ShadowAnalystImageSlider.tsx:104-105` puts both labels inside `.sa-image-container`; `ImagingView.tsx:1068` puts the badge on the thumbnail | **VERIFIED** |
| `premium.css:153 .imaging-zone` is a dead selector | `rg 'imaging-zone' apps/web/src` -> **1 hit, the CSS declaration itself, zero `.tsx`** | **VERIFIED** |
| `:29/:35 .sa-toast--*` consumed by `GlobalToast.tsx` | true, but see nit below | **VERIFIED with a wrong reason** |

Nit on the toast: `GlobalToast.tsx:49` applies `sa-toast sa-toast--${type}` **and** an inline
`style` prop setting `background: 'var(--surface-sunken, #0f172a)'`, `color: '#fff'`, and
`border: '1px solid rgba(255,255,255,0.1)'`. Inline styles win. All three literals in
`.sa-toast--success` / `--error` are therefore **inert**, and `rg 'sa-toast' --glob '!*.css'` finds
no other consumer. The decision (leave alone) is right; the stated reason ("consumed app-wide, so
out of my claim") is not the real reason (the rule never paints).

No `.sa-` selector exists in any other CSS file (`rg '\.sa-' --glob '*.css' --glob '!**/shadow-analyst.css'`
-> 0 hits), and `contrast-fixes.css` overrides none of `--bad-*` / `--ok-*` / `--text-primary`. So
the fix is neither shadowed nor redundant.

## 2. Did it touch a money COMPARISON?

**No.** The diff contains no `.ts`/`.tsx`/`.js` at all — it is `background:`, `color:`,
`border-left-color:` and a comment. Zero comparison operators, zero tolerance/epsilon, zero
rounding. `moneyRubEquals` (`guards.ts:51-53`, `kopecks === parseKopecks(rub)`) is byte-identical to
its state before this commit. Nothing REVERT-grade here.

## 3. Did it convert something that is NOT money?

Not applicable in the money sense (no code). The equivalent over-conversion question for a CSS
theming fix is: *did it tokenise a literal that is intentionally theme-independent?* Checked all
nine new `var()` calls:

- `.sa-tooth-row--critical/--done` background and `border-left-color`, `.sa-tooth-icon`,
  `.sa-tooth-icon--done` colour, `.sa-badge-critical` background/colour/border — all sit on
  `--paper-soft` inside `.sa-panel`, i.e. on a themed surface. Tokenising them is correct.
- The literals it deliberately left raw are the ones painted **over the radiograph**:
  `:343 #0a0e17` stage, `:55 rgba(10,14,23,.72)` overlay, `:454/:468` labels and badge. I confirmed
  the markup nesting for the labels and badge. Leaving those raw is right.

One judgement call worth naming, not a defect: `.sa-badge-critical` `border` moved from `#fca5a5`
(a light tint one step off the text colour) to `var(--bad-fg)` — the border is now the *same* colour
as the text. That is a deliberate-looking simplification, but it is a visual change the commit body
does not mention, and the packet measured only the text/background pair (5.30 light / 5.41 dark —
both of which I reproduce exactly).

## 4. Would its test fail if the fix were reverted?

**There is no test. And the gate the packet cites as proof cannot see a revert. I proved this by
running it.**

- The commit adds no test file and touches no test file (`git show --stat`: one `.css`, one `.md`).
- `scripts/check-css-tokens.mjs` is the only gate offered as proof. Its single use-scanner is
  `const CSS_VAR_USE = /\bvar\(\s*(--[\w-]+)/g` (line 101), and both failing buckets (`offenders`,
  `lightFallbacks`, lines 341-364) are populated **exclusively** from `var()` matches. A bare
  `background: #fef2f2` never enters either bucket.
- Empirical proof, not reasoning: I built a throwaway tree outside the repo (`scripts/` +
  `apps/web/src` + `node_modules/typescript`), restored the pre-fix
  `shadow-analyst.css` from `aaed65916^`, and ran the checker:

| tree | var() uses | unresolvable | light-fallback | **exit** |
|---|---|---|---|---|
| live (fix applied) | 2993 | 0 names / 0 occ. | 0 names / 0 occ. | **0** |
| reverted copy | 2984 | 0 names / 0 occ. | 0 names / 0 occ. | **0** |

  The gate is byte-for-byte green on the reverted tree. Only an informational counter moves
  (2993 -> 2984 = the 9 new `var()` calls; the pre-fix file had 22 `var()`, the post-fix 31 — the
  packet's arithmetic checks out).
- Every reverted line is a bare hex with zero `var(` on it — I printed them from
  `git show aaed65916^:…` and counted: `:180 background: #fef2f2` (0), `:293 border-left-color: #ef4444` (0),
  `:294 background: #fef2f2` (0), `:315 color: #ef4444` (0).

Consequence: a 1.04:1 white-on-white regression of exactly this class can be re-introduced tomorrow
and every gate stays green. The temp tree was deleted after the run.

## 5. Attribution

```
$ git log -1 --format=%(trailers) aaed659160000def317c3936b8cb896ffbed6ca5
(empty — single newline, confirmed through cat -A)
```

- Author: `marko1olo <marko1olo@users.noreply.github.com>`
- `rg -i 'Co-Authored-By|anthropic|claude|generated with'` over subject + body: **0 hits**
- Same clean for the follow-up `9e4f14543`.

**PASS.**

## Extra sweeps required by the brief

| sweep | command | result |
|---|---|---|
| `руб. ₽` (formatKopecksRu where a decimal belongs) | `rg 'руб\.\s*₽' apps/ packages/` | **0 hits** |
| second money helper beside `@dental/shared` | `rg 'export function (parseKopecks\|sumKopecks\|kopecksToNumericString\|formatKopecksRu)'` | **1 module only**: `packages/shared/src/utils/money.ts:53/92/113/191` |
| mojibake in diff / subject | `rg 'Ð[°-¿]\|Ñ[€-]\|â€\|Ã[¢©]'` over `git show` | **0 hits**; `node scripts/check-encoding.mjs` -> exit **0**, 2275 files, no findings (packet said 2266 — the delta is files other agents added since) |
| English string reaching a user | `rg "content:\s*['\"][A-Za-z]"` on the touched CSS; labels in `ShadowAnalystImageSlider.tsx` | **0**; labels are «Оригинал» / «С обработкой» |

## The claimed proofs I could reproduce independently

Every contrast number in the packet reproduces **exactly** when the translucent dark/night
`--bad-bg`/`--ok-bg` are alpha-composited over `--paper-soft` and the composited channels rounded to
integers:

| | light | dark | night |
|---|---|---|---|
| critical, before (`#fef2f2`) | 15.71 | **1.04** | **1.11** |
| done, before (`#f0fdf4`) | **16.42** | **1.09** | **1.16** |
| critical, after | 14.07 | 13.13 | 11.59 |
| done, after | 15.65 | 12.15 | 11.38 |
| `.sa-badge-critical` after | 5.30 | 5.41 | 5.18 |

Nit: the commit body and the CSS comment both say *"в светлой теме остаётся 14.07 и 15.65 (было
15.71)"* — one "before" figure against two "after" figures. The done row's light "before" was
**16.42**, so that row went 16.42 -> 15.65. `reproduction.md:114` is more honest than the commit
body: it prints `—` for that cell rather than reusing 15.71. Cheap to compute, should have been.

Pixel claims in `reproduction.md`, re-measured by me with `pngjs` (my own window, so boundary
handling differs by a pixel or two — direction and magnitude identical):

| measurement | packet | mine |
|---|---|---|
| scrollbar thumb, `desktop_dark_imaging` | y205..884, 680 px | y203..886, **684 px** |
| scrollbar thumb, `desktop_light_imaging` | y29..708, 680 px | y27..710, **684 px** |
| thumb length identical across themes | yes | **yes, 684 == 684 exactly** |
| `desktop_dark_patients` thumb | 340 px | 345 px |
| dark imaging content region, rows with <=3 colours | 834 | **832 / 834** |
| dominant colour share | 96.3% rgb(14,24,23) | **94.0% rgb(14,24,23)**, only **9** distinct colours in the whole region |
| `desktop_dark_patients`, same window | 5 flat rows | **0 / 834**, 3794 distinct colours |
| `desktop_light_imaging`, same window (my addition) | — | 65 / 834, 3307 distinct colours |

Supporting claims I also confirmed: no `[data-theme="dark"|"night"]` selector anywhere in
`apps/web/src` names an imaging selector (0 hits); `ImagingView.tsx` contains no `useThemeStore`,
`matchMedia`, `prefers-color-scheme` or `data-theme` read (0 hits); `--glass-blur: blur(12px)` in
all three themes, so `reproduction.md:94` quoting the resolved value is accurate.

## Verdict

The colour fix is real, correct, measured, reproducible, complete across all three themes, and
honestly documented — including the part where the packet says out loud that the *dispatched* bug
was not reproduced. The blankness in `desktop_dark_imaging.png` is real (9 distinct colours in the
content region) but the packet's reading is that no CSS rule explains it, and I could not find one
either. **EE1 as dispatched is therefore still open**, with `backdrop-filter` on `.workspace` named
as the untested suspect and three specific captures requested from the lead.

Rework, in priority order:

1. `.sa-tooth-num` (`shadow-analyst.css:322`) — 1.75:1 in the light theme after this change (1.96
   before). The tooth number is the payload. Unlisted in the inventory. Either give it a token or
   name it as accepted debt with a number.
2. The gate is blind: a revert of this exact fix keeps `check-css-tokens.mjs` at exit 0 (proved by
   running it on a reverted tree). The checker needs a rule for a literal colour on a surface whose
   text comes from a theme token — otherwise this class recurs.
3. `.sa-icon-btn--active` (`:228`) — the same `#10b981` that was tokenised at `:338`, left raw and
   unlisted. 2.41:1 light.
4. Documentation accuracy: the light-theme "before" for the done row is 16.42, not 15.71, in both
   the commit body and the CSS comment at `:306`.
5. The `.sa-toast--*` rationale is wrong (the rules are overridden by inline styles in
   `GlobalToast.tsx:49`, not merely out of scope). Right call, wrong reason — worth correcting so
   the next agent does not "fix" a rule that never paints.
