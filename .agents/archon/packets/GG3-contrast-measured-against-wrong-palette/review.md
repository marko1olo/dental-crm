# GG3 contrast-measured-against-wrong-palette — adversarial review

Commits: `c495c2b43` (fix), `1a6f1aa92` (test). Reviewer did not write this code. Read-only.
Every number below was re-derived by the reviewer, not copied from the packet.

## NOTE ON THE CHECKLIST
The five mandated checks are a MONEY-packet template (guards.ts money interpolation, integer-kopeck
comparisons, `formatKopecksRu`, `${index+1}` is a line number). This packet touches only CSS, one
CSS-token script, and one new test. Checks 1–3 are run literally AND re-aimed at the contrast
equivalent so the answer carries information instead of being vacuously N/A.

---

## CHECK 5 — ATTRIBUTION (run first, cheap)
    git log -1 --format=%(trailers) c495c2b43  -> EMPTY
    git log -1 --format=%(trailers) 1a6f1aa92  -> EMPTY
    grep -i 'co-authored-by|anthropic|claude|generated with' over both bodies + author + committer
      -> NO MATCH
Author on both: `marko1olo <marko1olo@users.noreply.github.com>`. **CLEAN.**

## CHECK 2 — MONEY COMPARISON TOUCHED?  **NO.**
`git show --name-only` on both commits returns exactly four paths: `main.css`, `contrast-fixes.css`,
`check-css-tokens.mjs`, `themeContrastGuard.test.ts`. `apps/api/src/documents/guards.ts` is not among
them. Grep of both diffs for `kopeck|копеек|formatKopecks|toFixed(2)|руб|₽|amount|price` returns only
CSS comment prose and the new test's `toFixed(2)` used for **printing WCAG ratios**. Every comparison
operator in the diff lives inside the new test's CSS parser / luminance maths. No money comparison, no
money tolerance. **Not REVERT-grade.**

## CHECK 3 — CONVERTED SOMETHING THAT IS NOT MONEY?  **N/A — no money surface exists.**
Contrast equivalent (did it re-token something that must stay literal?): no. The three chip rules moved
from *undeclared* ladders (`--indigo/-teal/-amber-50/200/700`, declared in **zero** files, so the literal
fallback painted in all three themes) to semantic pairs declared in all three themes. Verified by my own
grep: those six names have **0** occurrences at HEAD and had exactly **1** each in the parent.

## CHECK 1 — SITES MISSED (my own grep)
Money sites: **0 raw, 0 fixed, 0 applicable.** Contrast residuals I found still open at HEAD:
- `main.css:16871-16873` `.chip-assistant` still on the undeclared violet ladder
  (`--violet-50/200` light fallbacks + `--violet-700` dark fallback). Declared and deferred in the
  commit message with a rationale — see finding F5 for why deferring got *locally* worse.
- `main.css:10646` `--primary-strong` dark fallback `#0d9488` (pre-existing, out of packet scope).
- `main.css:16281` `.smart-field input:focus ~ label` paints `var(--brand-600)` = **4.10** in light,
  below AA, surviving only because `contrast-fixes.css:113` is imported later. The commit documents this
  and leaves it. See F2 — the packet removed exactly this fragility for the strip border in the same
  commit, so the two are treated inconsistently.

## CHECK 4 — WOULD THE TEST FAIL ON REVERT?  **YES for all three CSS changes it guards. Not ceremony.**
`tokenOfProperty()` resolves fg/bg from **the rule in the CSS**, not from a list in the test — this is
what makes it revert-sensitive. Named assertions:
- revert `var(--ink-2)` -> `var(--muted)`: fg becomes `--muted`, light ratio becomes **4.48** (I computed
  this independently) against expected 7.62. Breaks BOTH
  `assert.ok(Math.abs(actual - expected) < 0.02, ...)` and `assert.ok(actual >= AA_NORMAL, ...)` in
  *"каждое отношение из комментариев воспроизводится и держит норму 4.5"*.
- restore `background: var(--amber-50, #fffbeb)` in `.chip-chair`: breaks
  `assert.ok(!/#[0-9a-f]{3,8}\b|\brgba?\(/i.test(value), ...)` in *"ни в одном из них нет hex или rgb вне
  var()"*; also breaks `assert.ok(raw, '--amber-50 не объявлен...')` in `colorOf`.
- restore `border: 1px solid var(--teal-glow)`: breaks
  `assert.ok(!declaration.includes("--teal-glow"), ...)` in *"рамки не берут --teal-glow"*.
The test does **not** guard the undeclared animation change (F1).

---

## REPRODUCED (independent re-computation, my own WCAG implementation)
Ran `node --import tsx --test apps/web/src/tests/themeContrastGuard.test.ts` -> **pass 6 / fail 0**, 2.46 s.
Ran `node scripts/check-css-tokens.mjs` -> **exit 0**.

Headline thesis CONFIRMED: winning palette gives **4.48** for `.onboarding-compact-strip span`; the
losing palette (`--muted #5d746f` on `--teal-surface rgba(13,148,136,.07)`) gives **exactly 4.63** — the
number the old comment printed. The diagnosis is real.

All 22 claimed ratios reproduce **exactly** under float alpha compositing. My first pass showed 0.01–0.06
deltas on six composited figures; that was **my** integer rounding of the composite, not their error —
unrounded compositing (what the test does, and what is conventional) matches every claim to the digit.

Also verified independently:
- Cascade: `main.css:67` and `main.css:128` are `:root[data-theme="..."]` = **(0,2,0)**;
  `dente-redesign.css:11/67` are `:root, [data-theme=...]` = **(0,1,0)**. main.css wins light+dark.
  main.css has **no** night block (all 7 `night` hits in main.css are comment text), so
  `dente-redesign.css:115` wins night. Claim correct.
- `--ink-2` declared at `dente-redesign.css:19/74/122` for all three themes, never in main.css. Safe swap.
- `--warn-fg` on `--warn-bg` light = **exactly 4.42** < 4.5. Light `--warn-bg` is solid `#fef3c7`, so no
  compositing convention can move it. The rejection of own-hue chip text is justified.
- `--teal-glow` really is dual-typed: `premium.css:19/65/111` declare it as a **shadow**
  (`0 0 20px rgba(...)`); `--line-strong` is a colour in all 6 of its declarations. The swap is safe.
- Debt-list trim is honest, not a weakening: all six removed names have **0** usages at HEAD (strict and
  loose grep). `staleDebt` at `check-css-tokens.mjs:377` **hard-exits 1** when a debt name leaves the
  tree, so trimming was mandatory. The claim "the gate demanded it" is true.
- `DARK_WITHOUT_NIGHT_DEBT = 36`: my own re-derivation gives **exactly 36**. Zero headroom — a 37th does
  fail today.
- Sweep clean: no `руб`/`₽` misuse, no second money helper, no `@dental/shared` duplicate, no mojibake
  (`U+FFFD`, `Ð`, `Ñ`, `â€`, `ï»¿`) in either subject/body/diff, no `.tsx` touched so no user-facing
  string surface at all.

---

## FINDINGS

### F1 — UNDECLARED SCOPE: the fix commit carries another packet's work (most severe)
`c495c2b43` contains three changes absent from its own message and from the packet inventory:
- `main.css:277` — `animation-delay: -0.01ms !important;` added inside `prefers-reduced-motion`.
- `main.css:~14192` — `.workspace > *`, `.panel`, `.shift-hero > *`: fill-mode `both` -> `forwards`.
- deletion of four staggered rules: `.workspace > *:nth-child(2|3|4)`, `.shift-hero > *:nth-child(2)`.

`GG4-imaging-void-backdrop-filter/state.md` admits it: *"fixed in main.css, committed f3dee4b08 (earlier
hunks absorbed by c495c2b43)"*. The commit message of `c495c2b43` is entirely about palette/contrast and
never mentions animation.

Failure scenario: `git revert c495c2b43` to back out a contrast decision also restores fill-mode `both`
and the stagger delays, silently re-introducing the invisible imaging section GG4 fixed; and
`git log`/`git blame` for any future animation regression points at a commit whose subject is about
contrast. The animation change also has **zero** test coverage in this commit.

### F2 — the new `--teal-glow` comment overstates its own cascade claim
`main.css:802-810` states: *"Оба объявления специфичности (0,1,0), и цвет здесь держался только порядком
импорта в main.tsx"*, citing only `dente-redesign.css:26/81/129` vs `premium.css:19/65/111`.

It omits `main.css:24/86/146`, which also declare `--teal-glow`. `main.css:86` and `:146` sit in
`:root[data-theme="dark"]` / `:root[data-theme="light"]` at **(0,2,0)** and therefore win outright:

    light  winner: main.css:146            (0,2,0)  rgba(13,148,136,0.25) COLOUR
    dark   winner: main.css:86             (0,2,0)  rgba(45,212,191,0.2)  COLOUR
    night  winner: dente-redesign.css:129  (0,1,0)  rgba(224,164,88,0.35) COLOUR

Import order was decisive in **night only** (main.css has no night block). The stated hazard applied to
1 of 3 themes, not all three. The fix itself (`--line-strong`) stays correct and strictly safer — only
the rationale is wrong. This is the same defect class the packet exists to eliminate: a comment asserting
a cascade fact the browser does not produce, written by this very commit, and not covered by its test.
Required: name `main.css:24/86/146` and scope the hazard to the night theme.

### F3 — nit: 0.02 tolerance is 2x the last printed digit
`Math.abs(actual - expected) < 0.02` lets a comment be wrong by up to 0.019 — e.g. 14.17 written as
14.19 passes. `actual.toFixed(2) === expected.toFixed(2)` is exact and costs nothing. The original
4.63-vs-4.48 error (0.15) is still caught, so the guard is not defeated, but the packet's own standard is
that the printed number is the number.

### F4 — nit: the debt ratchet cannot tighten
`assert.ok(lonely.length <= DARK_WITHOUT_NIGHT_DEBT)` has no staleness check, unlike
`check-css-tokens.mjs:377` `staleDebt`, which hard-fails when a debt name leaves the tree — the exact
mechanism that forced this commit to clean the token list. Currently exact (36 = 36, zero headroom), so a
37th violation does fail. But after someone fixes 10 of the 36, 10 new violations land silently.

### F5 — nit / residual: `.chip-assistant` is now the odd one out
It stays on the undeclared violet ladder, so in both dark themes it renders as a light plaque while its
three siblings are now correct. Before this commit all four were uniformly wrong. Aggregate improvement,
worse local inconsistency, in a chip row scanned by colour.

### F6 — latent gap (not live today)
`tokenOfProperty` matches rules by **exact selector string**, so a theme-scoped override such as
`[data-theme="dark"] .chip-chair { background: #fffbeb }` would be invisible to the measurement. I
verified no such override currently exists for any of the 8 touched selectors, so today's numbers are
right. But the guard would not notice one being added — which is precisely the bug class (a dark arm
forgetting night) this packet is about. Related: rules inside `@media` are parsed as unconditional.

Minor: block citations drift by one line (comment says `main.css:66/126`; the selectors are at 67/128).

---

## VERDICT: NEEDS_REWORK
The measurement work is genuinely sound — the thesis, all 22 ratios, the cascade analysis, the debt trim
and the gate/test results all reproduced independently, and the test is revert-sensitive rather than
ceremony. Two things need to change: F2 (a new comment states a cascade fact that is false for 2 of 3
themes, in the packet whose whole purpose is comment accuracy) and F1 (the commit silently carries
GG4's animation work, creating a revert hazard and a misleading blame trail).
No money comparison was touched and no tolerance was introduced on money. Not REVERT.
