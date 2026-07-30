# FF3-third-theme-never-judged — adversarial review of 42c3ccc60

Reviewer: independent. Read-only. Verdict: **NEEDS_REWORK** (code is sound; two thirds of the quoted
evidence is measured against the wrong palette, and one stated AA pass is actually a fail).

## Brief mismatch (stated up front)

The five mandated checks are written for a money-rounding packet (`guards.ts`, integer-kopeck
comparisons, `formatKopecksRu`). Commit 42c3ccc60 is CSS only — `git show --stat --format='' 42c3ccc60
-- '*.ts' '*.tsx' '*.mjs'` returns empty. The packet author flagged the same mismatch. I ran the checks
literally anyway; results below.

## What reproduced exactly

- **Premise holds.** `apps/web/src/lib/themeClasses.ts:49` — `darkClass: theme === "dark"`. The `dark`
  class is never set for `night`. `main.css` has **no** `[data-theme="night"]` palette block (its three
  night mentions at 761 / 11837 / 16708 are comments this commit added). So `[data-theme="dark"] / .dark
  / html.dark / body.dark-mode` overrides genuinely never fired in «Тепло».
- **All 12 night-theme ratios reproduce to the hundredth** with my own relative-luminance
  implementation (sanity: `#0369a1` on `#f8fafc` → 5.67 vs repo's recorded 5.6). BEFORE 2.99 / 3.11 /
  1.12 / 3.13 / 2.70 / 1.15 and AFTER 8.35 / 12.84 / 4.59 / 6.59 / 10.98 / 10.56 — every one exact.
- **`.status-blocker-note` deletion is safe.** `git grep` over HEAD: exactly one usage repo-wide,
  `apps/web/src/components/schedule/AppointmentCard.tsx:339`, on the same element as
  `.appointment-handoff-note`. Claim verified.
- **Tailwind cascade claim verified.** `apps/web/src/styles/tailwind.css:32` declares
  `@layer theme, base, components, utilities;` and imports utilities into `layer(utilities)`. Handwritten
  CSS is unlayered → wins. No `!important` needed.
- **`--amber-50 / -200 / -700` undeclared** — confirmed; only `--amber` itself is declared.
- `node scripts/check-css-tokens.mjs` → exit **0** on my own run.
- Attribution clean: trailers **empty**, body grep for co-authored/anthropic/claude/generated → **0**.
- No mojibake, no «руб. ₽», no English user-facing string, no comparison or tolerance touched.

## Findings

### 1. Light and dark ratio columns measured against a palette that loses the cascade — MEDIUM

Every light/dark number in the commit body and in the new source comments reproduces only if you use
`dente-redesign.css` palette values. But `main.css` declares its light and dark palettes under
`:root[data-theme="light"]` and `:root[data-theme="dark"]` — specificity **(0,2,0)** — which beats
`dente-redesign.css`'s bare `[data-theme="light"]` / `[data-theme="dark"]` **(0,1,0)** regardless of
import order. Night is the one theme where `main.css` contributes only `:root` (0,1,0), so
`dente-redesign.css` wins on source order — which is why night is right and light/dark are not.

Real resolved values vs claimed (light / dark):

| site | claimed | actual |
|---|---|---|
| strip `strong` | 15.88 / 13.43 | 16.70 / 14.17 |
| strip `span` | **4.63** / 4.75 | **4.48** / 5.78 |
| `.finance-due` | 14.07 / 12.62 | 14.52 / 13.83 |
| handoff note | 15.43 / 11.61 | 15.93 / 12.83 |
| label `--info-fg` | 5.93 / 8.28 | 5.93 / 8.33 |

One crosses the line: **`.onboarding-compact-strip span` in the LIGHT theme is 4.48:1, not 4.63:1** —
`--muted` `#64748b` on `--teal-surface` `rgba(204,251,241,0.5)` over white. It is `font-size: 13px;
font-weight: 750` (main.css:797-801), which is **not** WCAG large text, so 4.5 applies. The commit body
reports a pass; reality is a 0.02 miss. It was 4.39:1 before, so this commit *improved* it and did not
cause it — but the false pass is now durably recorded in a source comment at main.css:772-773.

### 2. Missed sites of the packet's own defect class, in the same file — MEDIUM

`main.css:15831-15845` — `.chip-reason`, `.chip-doctor`, `.chip-chair` sit on the identical undeclared
ladder (`--indigo-50/-200/-700`, `--teal-50/-200/-700`, `--amber-50/-200/-700`, all undeclared) with
**no dark or night override anywhere** (`git grep` for a themed `.chip-chair` selector → empty). They
render near-white plates `#eef2ff` / `#f0fdfa` / `#fffbeb` in «Тепло».

The packet's own proof output names `--amber-700  apps/web/src/styles/main.css:15843  запас #b45309`
explicitly. That output was pasted as evidence of success without reconciling it. Selection is
inconsistent: `.handoff-lock` measured 4.84:1 (legible, passing) and was fixed; `.chip-chair` measures
the same 4.84:1 on the same undeclared amber ladder, 850 lines away, and was left.

### 3. `--teal-glow` is dual-typed; the new border is valid only by accident — LOW (durability)

`--teal-glow` is a **colour** in main.css:24/86/146 and dente-redesign.css:26/81/129, but a
**box-shadow** in premium.css:19/65/111 (`0 0 20px rgba(...)`). The new
`border: 1px solid var(--teal-glow)` resolves to a colour in all three themes only because main.css
wins light/dark at (0,2,0) and dente-redesign.css happens to be imported *after* premium.css (main.tsx
12 → 13) for night. Flip that order and the declaration becomes invalid at computed-value time and
`.onboarding-compact-strip` loses its border entirely. `check-css-tokens.mjs` validates resolvability,
not type — nothing guards this.

### 4. No test, and nothing existing would fail on revert — LOW

`git grep -l` over all `*.test.ts` / `*.test.tsx` at HEAD for
`onboarding-compact|finance-due|handoff-lock|appointment-handoff-note|status-blocker-note|smart-field`
returns **empty**. A full revert of 42c3ccc60 breaks **no** assertion. `themeTokenSpecificity.test.ts`
guards token specificity, not per-selector literals. The commit is unguarded against exactly the
regression it fixes — a future author re-adding a `[data-theme="dark"]`-only override.

### 5. Disclosed scope creep beyond the «Тепло» defect — NIT

`.handoff-lock` light theme was 4.84:1 (passing) and its text moved from amber-700 to `var(--ink)`,
dropping the amber semantic from the text. `.finance-due` border went from `rgba(163,79,50,0.42)` to
full-opacity `var(--bad-fg)` (`#b91c1c` in light) — a visibly stronger border on a finance row. The body
discloses the background hue shift, not the border weight change.

### 6. Stray triple blank line — NIT

main.css:17111-17113, where the `[data-theme="dark"] .finance-due` block was removed.

## Mandated checks, literal results

1. **Missed site (guards.ts).** My grep at HEAD: **11** money interpolations, **0 raw** — all 11 route
   through `moneyRubText()` / `moneyKopecksText()`. Not this commit's file (untouched).
2. **Money comparison touched.** No. CSS only; zero `.ts/.tsx/.mjs`; grep for
   `>=|<=|===|!==|Math.abs|epsilon|tolerance|kopeck` over the diff → empty. Not REVERT-grade.
3. **Converted a non-money value.** N/A for CSS. `guards.ts:744` `${index + 1}` correctly remains a raw
   line number. Nearest analogue in scope is finding 5.
4. **Test would fail on revert.** No — see finding 4. No test added.
5. **Attribution.** `git log -1 --format=%(trailers) 42c3ccc60` → **empty**. Author
   `marko1olo <marko1olo@users.noreply.github.com>`. Body grep → 0 matches.

## Required rework

1. Recompute every light and dark figure against the winning palette (`main.css`
   `:root[data-theme="light"]` / `:root[data-theme="dark"]`, specificity 0,2,0) and correct the source
   comments at main.css:757-771, 11831-11845, 16703-16719 and contrast-fixes.css:83-99. Night stands.
2. Resolve light `.onboarding-compact-strip span` at 4.48:1 — darken `--muted` for that rule, or state
   the residual miss instead of printing 4.63.
3. Close or explicitly defer `.chip-reason` / `.chip-doctor` / `.chip-chair` (main.css:15831-15845) —
   same undeclared ladder, same file, named in the packet's own proof output.
4. Add one test that greps the stylesheets and fails if a `[data-theme="dark"]` rule exists without a
   matching `night` arm, or if a touched selector regains a light literal. Nothing currently guards this.
5. Give `--teal-glow` a single type, or use `--line-strong` for the strip border.
