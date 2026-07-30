# HH3-contrast-wrong-palette — adversarial review (in progress)

COMMIT UNDER REVIEW: 2a9a5ef0c052fe8c20eb79ab7281aacc37154b07
HEAD at review time: 40afc20feac03a6c53eababd3166acaff95c0c1e (2 commits ahead; other agents mid-edit)

## 0. BRIEF MISMATCH (recorded first, it changes what checks 1-4 can mean)
The five mandated checks describe a MONEY-FORMATTING packet (guards.ts, formatKopecksRu,
integer-kopeck comparisons, `${index + 1}` line numbers). The commit under review
(2a9a5ef0c) touches ONE file, apps/web/src/styles/main.css, and changes ONLY a CSS
comment block: 8 insertions / 2 deletions, no declaration, no selector, no value.
`git show --stat 2a9a5ef0c` -> ` apps/web/src/styles/main.css | 10 ++++++++--`.
Checks 1-4 as literally worded therefore have no surface on this diff. I still ran each
one against HEAD with my own greps and report my own numbers below rather than declaring
them N/A.

## 5. ATTRIBUTION (run first, cheapest)
`git log -1 --format=%(trailers) 2a9a5ef0c052fe8c20eb79ab7281aacc37154b07` -> EMPTY (zero bytes).
Author: marko1olo <marko1olo@users.noreply.github.com>. Body grep pending below.
Body grep for Co-Authored-By / anthropic / claude / generated / robot emoji on
79658291f, d487d36fe, 2a9a5ef0c -> 0 matches each; trailers empty on all three.
ATTRIBUTION: CLEAN.

## Numbers I recomputed myself (independent WCAG 2.x, own cascade resolution)
Winning palette derived by me: light/dark tokens come from main.css
`:root[data-theme="light"]` / `:root[data-theme="dark"]` at specificity (0,2,0), which
beat premium.css (0,1,0) and dente-redesign.css (0,1,0); main.css has no night block, so
night comes from dente-redesign.css:115 (later import than premium.css:100, same (0,1,0)).
--info-bg/--info-fg/--warn-bg/--warn-fg/--ink-2 are declared ONLY in dente-redesign.css
(premium.css does not declare them at all) -> dente wins those in every theme.

EVERY figure in the reviewed diff reproduces to the printed 2 decimals:
  --info-bg      over --paper  1.15 / 1.29 / 1.35   <- matches the diff
  --teal-surface over --paper  1.06 / 1.20 / 1.14   <- matches the diff
  --warn-bg      over --paper  1.11 / 1.32 / 1.39   <- matches the diff
  --ink on info plate  15.46 / 13.24 / 10.85        <- matches
  --ink on teal plate  16.69 / 14.19 / 12.81        <- matches
  --ink on warn plate  15.93 / 12.89 / 10.56        <- matches
  --teal-dark vs --paper 5.47 / 7.17 / 6.59         <- matches (border claim 5.47)
  --warn-fg on warn plate light 4.42                <- matches
  pre-fix plates #eef2ff/#f0fdfa/#fffbeb vs --paper 1.12/1.04/1.04 light,
      15.97/17.12/17.22 dark, 15.89/17.03/17.13 night  <- all match
THE CENTRAL CLAIM IS CONFIRMED: "1.15 / 1.29 / 1.35" is the three-THEME row of --info-bg
alone; the other two plates give different rows, and the worst case is 1.06
(--teal-surface, light) not 1.15. The commit is factually right and the prior text was
factually wrong.

Also reproduced from neighbouring comments (not in this diff): strip strong
16.69/14.19/12.81, score 5.47/7.17/6.59 (correct because .onboarding-compact-score sets
`background: var(--paper)` itself), span --ink-2 7.62/8.64/8.62, span --muted
4.48/5.79/4.58, pre-fix #eef8f5 rows 16.37/1.04/1.12 and 4.39/2.37/3.13, score-on-white
5.47/2.49/2.70, blended plates rgb(230,253,248)/rgb(18,42,57)/rgb(44,34,25).
Two figures needed a base I had to guess: 17.27 reproduces only when rgba(15,23,42,.92)
is composited over --paper-soft #020617 (over --paper #0f172a it is 17.06); and the
"4.63" the comment names as WRONG computes to 4.61 on my read of the losing palette.
Both are historical/pre-fix figures explicitly labelled as such; neither changes a verdict.

## 1. MISSED SITE — YES, one real miss in the same DOM group  [FINDING, rework-grade]
apps/web/src/styles/main.css:16995
    .chip-assistant {
      background: var(--violet-50, #f5f3ff);
      color: var(--violet-700, #6d28d9);
      border-color: var(--violet-200, #ddd6fe);
    }
apps/web/src/components/schedule/AppointmentCard.tsx renders FOUR chips in one
`.chip-group`: chip-reason (130), chip-doctor (133), chip-assistant (136), chip-chair (140).
The commit's comment converts and documents three of them and opens with "три чипа
причины, врача и кресла были почти белыми плашками в любой теме". The fourth chip sits on
the identical defect shape — an undeclared shade ladder with light literal fallbacks. My
own grep: --violet-50/--violet-200/--violet-700 are declared in ZERO css files.
`node scripts/check-css-tokens.mjs` names it: "1x --violet-700 ... main.css:16997 запас #6d28d9".
Measured by me: plate #f5f3ff vs --paper 1.10 / 16.28 / 16.20; vs the real card backdrop
1.08 / 16.41 / 16.38. Compare the pre-fix figures the comment itself calls the defect
(15.97 / 17.12 / 17.22). So the appointment card still has a near-white chip in both dark
themes, four lines below the rules the comment declares fixed, and `.chip-assistant` is
NOT in GUARDED_SELECTORS in the new test either. The packet's claim "chips CLOSED, NOT
DEFERRED" is not true of the chip group.
Same group, lower severity, also unguarded: .chip-suggestion.priority-urgent (main.css:17011,
`background:#fee2e2 !important`) and .priority-important (:17017, `#fef3c7 !important`) —
BARE light literals, exactly the class the new test was written to catch, plate vs card
1.20/14.74/14.70 and 1.10/16.17/16.13, neither in GUARDED_SELECTORS.

MONEY WORDING OF CHECK 1 (re-derived myself, though this commit does not touch it):
apps/api/src/documents/guards.ts at HEAD -> 24 money interpolations, ALL wrapped in
moneyRubText/moneyKopecksText, 0 RAW. Last touched by 185f181ac, not by this packet.

## 2. MONEY COMPARISON TOUCHED — NO
`git show --stat 2a9a5ef0c` = 1 file, apps/web/src/styles/main.css, 8 insertions / 2
deletions, all inside a /* */ block. No declaration, no selector, no operator. Nothing to
quote. For the record at HEAD: guards.ts:51-53 `moneyRubEquals` is
`kopecks === parseKopecks(rub)` — integer kopecks, no epsilon. The money series (a3f83ebeb)
made comparisons STRICTER, replacing float `!==` at three gates. The two
`Math.abs(...) > 0.01` tolerances at guards.ts:743/757 PRE-DATE it (present at
a3f83ebeb^ lines 657/671) — pre-existing debt, not introduced.

## 3. CONVERTED A NON-MONEY VALUE — NO
Nothing is converted in this diff. In guards.ts the only non-money interpolation is
`${index + 1}` at line 744 ("строка ${index + 1}") and it is correctly left raw.

## 4. WOULD THE TEST FAIL ON REVERT — NO for this commit, and the test does not guard the chips
PROVEN, not argued. Sandbox copy at C:\Users\Admin\AppData\Local\Temp\hh3rev (repo never
written; node_modules junction created and removed, repo node_modules verified intact at
475 entries).
  a) Faithful chip revert (true pre-fix text from `git show 42c3ccc60^:apps/web/src/styles/main.css`,
     lines 15825-15829: `background: var(--indigo-50, #eef2ff)` etc.) -> test still 4/4 PASS.
     Cause: lightLiterals() runs withoutVarCalls() first (test lines 226-248 and 258), so a
     literal inside a var() FALLBACK is invisible to it by construction — and that is
     exactly the chips' pre-fix shape.
  b) Faithful strip revert (`background: #eef8f5`, bare literal) -> test FAILS 2/4:
     test 1 at line 342 `assert.deepEqual(offenders, [])` prints
     "main.css:825  .onboarding-compact-strip  background: #eef8f5 (яркость 0.92)",
     and test 3 fails on line 401 `assert.match(strip.body, /border:[^;]*var\(--line-strong\)/)`.
     So the test IS load-bearing — for the bare-literal fixes, not for the chips.
  c) The chips ARE covered, by the PRE-EXISTING gate: `node check-css-tokens.mjs` on the
     reverted sandbox exits 1 and names --indigo-50/--indigo-200/--indigo-700 and fallback
     #eef2ff. At HEAD the same gate exits 0 (0 unresolvable, 0 light fallbacks, 2 known
     dark-fallback debt) — the executor's GATE_EXIT=0 claim reproduces.
  d) NO number in any of these comments is pinned by anything. The test says so itself
     (lines 55-58: "Не вычисляет каскад и не считает контраст ... охраняет форму, а не
     оттенок"). The precise defect this commit fixes — a wrong contrast figure in prose —
     can regress silently tomorrow. The commit adds no test and none is possible for prose
     without a figure-recompute harness.
  e) Test at HEAD: 4/4 pass, exit 0 — reproduced.

## NITS
N1. Every plate figure is stated "против --paper", but --paper is not the winning backdrop.
    premium.css:357 applies `background: var(--glass-panel) !important` to .mode-fit-card,
    .glass-panel and `article`; AppointmentCard.tsx:96-100 is all three, and an !important
    author declaration beats that element's own inline `style={{ background: 'var(--paper)' }}`.
    Real backdrop = --glass-panel over --bg: rgb(252.8,253.5,253.2) / rgb(14.8,24.4,23.4) /
    rgb(26.6,21.9,19.3). Re-measured there the numbers move <=0.02 on plates (info 1.15->1.13,
    warn 1.32->1.34) and <=0.18 on text (doctor 16.69->16.57). Worst case is still 1.06,
    doctor, light. Precision of the stated base, not a wrong conclusion.
N2. The report to the lead says "The stated import lines 12/13 do not contain CSS imports at
    all". False: main.tsx:12 is `import "./styles/tailwind.css"`, :13 is
    `import "./styles/main.css"`. The committed wording ("таких импортов там нет") is
    defensible as "not those imports"; the claim as delivered to the lead is not.
N3. Chip borders all clear WCAG 1.4.11 3:1 in all themes (--info-fg 5.93/8.33/8.35,
    --teal-dark 5.47/7.17/6.59, --warn-fg 4.92/10.69/9.40), so the "плашка не текст, порог
    4.5 не применяется" judgement holds. Verified, not a defect.
N4. premium.css:236-239 `.nav-item.active { box-shadow: var(--teal-glow) !important }`
    confirmed present and shadow-typed; the colour type does win in all three themes by my
    own cascade read, so the declaration is IACVT and the active nav item has no shadow.
    Correctly named as out-of-file and pinned by test 3 (shadowTyped.length === 1).

## SWEEPS
«руб. ₽» adjacency: 0 hits across apps/ and packages/. formatKopecksRu (money.ts:191-200)
already emits NBSP + ₽; no site doubles the unit. One money module only:
packages/shared/src/utils/money.ts; guards.ts imports from @dental/shared and does no
arithmetic of its own. Mojibake: diff is 3497 bytes, valid UTF-8, 0 U+FFFD, 0
mojibake-shaped byte pairs, subject clean. English strings reaching a user: none — the diff
adds Russian prose plus CSS custom-property names only.

## VERDICT: NEEDS_REWORK
The diff is factually right and every figure in it reproduces to the printed decimal; the
central claim (one theme-row misread as a plate-row, worst case 1.06 not 1.15) is confirmed
and the prose it replaced was genuinely wrong. What fails is closure: the fourth chip in the
same .chip-group is still on the undeclared ladder with light literal fallbacks, the packet
reported the chips as CLOSED, and neither the missed chip nor the two bare-literal
.chip-suggestion rules were added to the guard list. Not REVERT: no comparison changed, no
tolerance introduced, attribution clean.
