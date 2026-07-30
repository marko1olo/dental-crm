# GG4 adversarial review — commit f3dee4b08202eeb5a0f73cf44ffec01790be6b6e

Reviewer: adversarial, read-only. Written incrementally.

## Commit shape (verified)
`git show --stat` -> **1 file, 12 insertions, 1 deletion**, `apps/web/src/styles/main.css` only.
The ONLY functional change in this commit:

```
 .role-switcher-options {
-  animation: fade-up 0.15s cubic-bezier(0.22, 1, 0.36, 1) both;
+  animation: fade-up 0.15s cubic-bezier(0.22, 1, 0.36, 1) forwards;
 }
```
plus an 11-line Russian comment. Nothing else.

## Check 5 — attribution: PASS
`git log -1 --format="%(trailers)" f3dee4b08` -> empty (single blank line, confirmed via `cat -A` = `$`).
Author `marko1olo <marko1olo@users.noreply.github.com>`. Body grep for Co-Authored-By / anthropic: pending below.

## Check 1 — missed money site: N/A, and the agent's "not my scope" claim is TRUE (verified independently)
My own grep at HEAD over `apps/api/src/documents/guards.ts`:
- raw unwrapped money interpolation `${...Rub}` / `${...Kopecks}` NOT inside a helper: **0 hits** (grep exit 1).
- `money(Rub|Kopecks)Text(` : 13 matching lines = 2 definitions (L87, L102) + **11 message sites**
  (424, 540, 544, 545, 744, 758, 772, 783, 841, 850, 881).
So the 11 the lead measured raw at dispatch are all converted at HEAD — but NOT by this commit
(this commit touches zero .ts files). That work belongs to packet DD1-raw-money-in-russian-text.
The reviewed agent correctly refused to claim credit for it.

## Check 2 — money comparison touched: NO
Diff is one CSS declaration. No .ts file in the commit, therefore no kopeck comparison, no epsilon,
no tolerance. Not REVERT-grade on this axis.

## Check 3 — converted a non-money value: N/A for money; CSS analogue examined below.

## Check 4 — test: NONE ADDED. See below.

(further findings appended as verified)

## ***CENTRAL FINDING — the one line this commit changed is DEAD CODE at runtime***

postcss resolution over the real import order from `apps/web/src/main.tsx` shows exactly TWO
`animation` declarations on `.role-switcher-options`:

```
#1 cascadeOrder=0 file=main.css        line=14366 layer=null important=false
     animation: fade-up 0.15s cubic-bezier(0.22, 1, 0.36, 1) forwards   <-- edited by THIS commit
#2 cascadeOrder=4 file=dente-redesign.css line=462  layer=null important=false
     animation: dntUp 0.18s ease                                        <-- WINS
```
- Import order (`apps/web/src/main.tsx`): `main.css` is line 9, `dente-redesign.css` is line 13.
- Specificity identical (0-1-0), neither `!important`, both UNLAYERED (main.css's `@layer legacy`
  spans 424-662 and 14628-end; line 14366 falls outside both).
- Later source order therefore wins: **`animation: dntUp 0.18s ease` is the effective value.**
- `animation` is a SHORTHAND, so the winner resets every longhand to initial:
  `animation-name: dntUp` and **`animation-fill-mode: none`**.

Consequence: the `both` this commit removed **was already overridden and never applied to a rendered
role switcher.** `fill-mode: none` holds no frame before or after the active phase, so the
"empty expanded role list" failure the commit message describes at length
(«Пустой раскрытый список ролей ничем не отличается от сломанного») **cannot occur.**
The edit is a runtime no-op.

Secondary: even if main.css HAD won, this rule carries NO `animation-delay`, so `backwards` would
hold `opacity: 0` for 0s. The commit's own body concedes this («Задержки у правила нет»). The only
scenario it defends against is an animation that never ticks at all — a hypothesis, not the measured
defect. Nothing was measured on the role switcher; every measurement in the packet is about
`.workspace > *`.

## The packet's ACTUAL fix is in a DIFFERENT commit (verified, and honestly disclosed)
`git show c495c2b43 -- apps/web/src/styles/main.css` contains the real repair:
`.workspace > *` / `.panel` / `.shift-hero > *` `both` -> `forwards`, deletion of the
`nth-child(2|3|4)` delays (0.04/0.08/0.12s) and `.shift-hero > *:nth-child(2)` 0.06s, and
`animation-delay: -0.01ms !important` added to the `prefers-reduced-motion` block.
c495c2b43's own subject is about palette/contrast and does NOT mention this defect.
=> Reverting f3dee4b08 would NOT restore the imaging void. The imaging fix does not live here.
The commit body states this outright, which is honest reporting, not concealment.

## Accuracy of the shipped comment
- Cited `main.css:268` for the prefers-reduced-motion block: **ACCURATE** — line 268 is exactly
  `@media (prefers-reduced-motion: reduce) {`.
- `@keyframes fade-up` (main.css:14132) is `from{opacity:0;translateY(12px)} to{opacity:1;translateY(0)}`
  — the comment's description of the `from` frame is correct.
- The comment claims to describe the behaviour of the rule it sits on. It does not, because that rule
  is overridden (see central finding). The comment is therefore misleading where it counts.

## Check 4 — test: NONE, and this change is UNTESTABLE BY BEHAVIOUR
- `grep -rl -iE 'role-switcher|fill-mode|fade-up|dntUp' --include=*.test.ts(x) apps/web/src` -> exit 1,
  **zero files**. No test added, no test exists.
- Nothing breaks on revert. There is no assertion to name.
- Stronger: because dente-redesign.css:462 wins the cascade, `getComputedStyle()` on a live
  `.role-switcher-options` reports `animation-fill-mode: none` / `animation-name: dntUp` BOTH before
  and after this commit. No behavioural test could distinguish the two states. Only a source-text
  assertion could — and the repo already supports exactly that pattern
  (`apps/web/src/components/workspaceActions/workspaceActionsPlacement.test.ts` reads CSS via
  `readSource("styles/...")`), so a test was feasible and was not written.

## Money sweeps (all clean, all out of this commit's reach)
- `moneyRubEquals` (guards.ts:51) = `kopecks === parseKopecks(rub)` — strict INTEGER kopecks,
  **no epsilon, no tolerance**. Docblock explicitly forbids one. `git show --name-only` for
  f3dee4b08 contains guards.ts **0 times** — the comparison gate is untouched.
- Double unit «руб. ₽» / «₽ руб»: 0 hits across apps+packages.
- `formatKopecksRu` interpolated before a literal «руб»: 0 hits.
- Rival money helper: guards.ts's `moneyRubText`/`moneyKopecksText` are thin wrappers over
  `kopecksToNumericString`/`parseKopecks` from `@dental/shared` — not a second implementation.
  (Standing, pre-existing, NOT this commit: `formatRub` in apps/web/src/pages/analyticsDoctorMetrics.ts:92
  and `moneyRub` in apps/api/src/services/finance/payoutNegativeExplain.ts:114 are display-only
  `₽` formatters outside @dental/shared. Flagging for the lead, not chargeable here.)
- Mojibake in diff or subject: 0 hits. Subject and body are clean UTF-8 Russian.
- English string reaching a user: none — the diff adds a Russian CSS comment and one keyword.

## Check 3 — converted something that is not the thing? Direction is harmless, effect is nil
`.role-switcher-options` carries NO `animation-delay`, so `forwards` is not wrong in principle — it
would be a legitimate hardening IF the rule applied. It does not apply. No non-money/non-target value
was mis-converted. The `.nav-item` exclusion the comment claims is ACCURATE and verified:
main.css:14223 is still `slide-in-left 0.2s ... both` with delays 0.04s..0.22s (14226-14232).

## VERDICT: NEEDS_REWORK
Not REVERT — no comparison changed, no tolerance introduced, no money file in the diff.
Not SOUND — the sole functional line is dead code; the defect it narrates cannot occur; no test; and
the 11-line comment shipped above it tells a future maintainer that this rule governs role-switcher
entry animation and that `forwards` here changes the failure mode. Both are false. In a 14,600-line
stylesheet a confidently-wrong comment is durable harm.

### Required rework
1. main.css:14366 is shadowed by dente-redesign.css:462 (`animation: dntUp 0.18s ease`, fill-mode
   `none`). Delete the dead declaration, or state the shadowing in the comment. Do not "fix" the
   winner — `dntUp` with fill-mode `none` is already fail-visible.
2. The packet's real repair sits in c495c2b43, whose message documents a palette/contrast defect
   instead. The imaging-void fix currently has no commit message anywhere. Record it durably
   (packet record / follow-up note). Do not rewrite pushed history.
3. Add the source-text guard the repo already supports: assert no entry animation whose keyframe
   `from` sets `opacity: 0` carries `fill-mode: both` together with a non-zero `animation-delay`.
   That assertion would have caught the original `.workspace > *` void and WOULD fail on revert of
   c495c2b43 — unlike anything in this commit.
