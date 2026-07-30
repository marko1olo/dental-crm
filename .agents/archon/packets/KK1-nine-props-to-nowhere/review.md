# Adversarial review — KK1-nine-props-to-nowhere

Commits under review: `71692b19c`, `69fdd3d54`
Reviewer: adversarial (did not write this code). Read-only.

## BRIEF/PACKET MISMATCH (read this first)

The five mandated checks describe a **money-formatting packet over `apps/api/src/documents/guards.ts`**
("11 raw and 4 already correct at dispatch", money comparisons in integer kopecks, `formatKopecksRu`,
`«${index + 1}»` line numbers). The two commits I was given touch **no money code and no `guards.ts`**.

Proven:

```
git show --name-only --format="" 71692b19c 69fdd3d54 | sort -u
apps/web/src/SettingsView.tsx
apps/web/src/useSettingsDerivations.tsx
```

`rg "guards"` over both commits' name-only output -> exit 1 (no match).

The guards.ts money work was done by a **different** packet:
```
git log --oneline -S "moneyRubText" -- apps/api/src/documents/guards.ts
185f181ac [ARCHON] fix(документы): отказ по денежному документу бросал исключение вместо объяснения суммы
```
plus `d0c0d196d [ARCHON] fix(документы): отказ по деньгам печатал 900.1299999999999 вместо 900.13`.

So checks 1-3 are **vacuously clean** for this diff, not "passed". I report them as such and do not
award credit for work this packet did not do. Checks 4 and 5 I ran against the real diff.

## Check 1 — missed sites (re-derived by my own grep, at HEAD)

`apps/api/src/documents/guards.ts` (1303 lines). Money-in-text interpolations: **11**. Raw
(unwrapped): **0**.

```
rg -n '\$\{\s*[A-Za-z_$][A-Za-z0-9_$.?\[\]]*(Rub|Kopecks|Kopeck)\s*\}' apps/api/src/documents/guards.ts
-> exit 1, no hits
rg -P -n '\$\{(?![^}]*money(Rub|Kopecks)Text)[^}]*(Rub|Kopecks)[^}]*\}' apps/api/src/documents/guards.ts
-> exit 1, no hits
```

All 11 go through `moneyRubText(...)` or `moneyKopecksText(...)` (lines 424, 540, 544, 545, 744, 758,
772, 783, 841, 850, 881). My count of raw sites is 0, versus the lead's 11-at-dispatch — because
another packet already landed it. **Not attributable to KK1.**

## Check 2 — money comparison touched?

**No.** The diff contains exactly two comparisons, both on array length:
`item.warnings.length > 0` and `pricelistWarningRows.length > 0`. No money value, no epsilon, no
tolerance. Nothing in `guards.ts` or any kopeck comparison is in the diff. Not REVERT-grade.

## Check 3 — converted something that is not money?

**No money formatting exists in the diff at all.** The two numbers it renders are correctly typed as
non-money and labelled as such:
- `item.sourceLine` -> rendered `Строка {item.sourceLine}` — a source-pricelist line number, labelled
  as a line number. Correct.
- `pricelistWarningRows.length` / `typedPricelistItems.length` -> rendered
  `строк с предупреждениями — N из M` — counts rendered as counts. Correct.

Neither is passed through a money helper. Clean.

## Check 5 — attribution

```
git log -1 --format='%(trailers)' 71692b19c  -> (empty)
git log -1 --format='%(trailers)' 69fdd3d54  -> (empty)
git log -2 --format='%B' 69fdd3d54 | rg -in "co-authored-by|anthropic|generated with|claude"
-> exit 1 (no matches)
```
Both authored `marko1olo <marko1olo@users.noreply.github.com>`. **Clean.**

## Verified claims (reproduced)

- `pricelistUiMeta.ts:151` — `export function pricelistWarningsText(warnings: string[]): string`.
  Call site passes `item.warnings` (`string[]`). Signature matches. TRUE.
- `packages/shared/src/index.ts:1718-1740` `dentalPricelistItemSchema` — the diff's cast
  `as Array<{id: string; sourceLine: number; title: string; warnings: string[]}>` is structurally
  accurate: `id: z.string()` (1719), `sourceLine: z.number().int().positive()` (1720),
  `title: z.string()` (1722), `warnings: z.array(z.string())` (1738). All four **required**, none
  optional — so `item.warnings.length` cannot throw and `key={item.id}` is a real key. TRUE.
- Warning-label coverage: every per-item code the analyzer emits has a Russian label in
  `pricelistWarningLabels` (`price_not_found`, `category_uncertain`, `material_uncertain`,
  `restoration_uncertain`, `title_too_short`, `photo_ocr_requires_visual_review`). No English or
  snake_case reaches the clinic through the newly-rendered helper.

## Claim line-number drift (minor)

Claim says `analyzer.ts:836 if (!input.priceRub) warnings.push("price_not_found")`. At HEAD it is
**line 855**. Content TRUE, line number stale — analyzer.ts moved under other agents' commits
(`f1592b977`, `c31252afb`) after the claim was written. Same for the cited `analyzer.ts:713` rule
comment. Cosmetic, but the packet cites stale coordinates in a shipped commit message.

## Check 4 — would a test fail if the fix were reverted?

**It added no test. Zero test files in either commit:**
```
git show --name-only --format="" 71692b19c 69fdd3d54 | rg -in "test|spec"  -> exit 1
```

The four tests the packet cites all pass **either way**:
- `panelsAreMounted.test.ts` — I ran it: 9 pass, 0 fail, TRUE_EXIT=0. But it is a **component-file
  census** (`componentReachability()`, `@babel/parser`), asserting component *files* are mounted. The
  new banner is **inline JSX inside SettingsView.tsx** — no new file, no new import (the packet itself
  proved 0 added import lines). The census structurally cannot see it. Its 9 test names are all about
  the view registry / router / legacy backlog; none touches the pricelist banner.
- `staffPhoneIsReachable`, `settingsProfileLoad`, `settingsWorkflowsPanel` — unrelated surfaces.

Revert commit `69fdd3d54` and **no assertion in any cited test changes state.** That is ceremony, and
`commitmsg2.txt` presents it under "Проверено:" as verification *of this fix*. The tests did run green
(reproduced), but they are non-probative here — overstated proof.

This matters more than usual: the fix is precisely "a render surface that was never rendered", and
`panelsAreMounted.test.ts`'s own header documents that this exact defect class hit this repo **three
times** and was caught only by a live screenshot. The fix ships with zero regression protection against
its own defect class.

## Findings

1. **No test (primary).** Needs a source-text or render assertion that the prices tab surfaces
   `pricelistWarningsText` / the warning banner. Nothing currently fails if the banner is deleted.
2. **Photo-OCR degenerates the banner to "N из N".** `analyzer.ts:865`
   `if (input.sourceKind === "photo_ocr") warnings.push("photo_ocr_requires_visual_review")` fires
   **per item**, so for any photo-sourced pricelist every row carries a warning. The headline then
   reads `строк с предупреждениями — 600 из 600` and the actionable `price_not_found` rows are buried
   in an all-rows scroll list (`maxHeight: 220px`). The commit's stated purpose — surface the row whose
   price was refused — is defeated on the photo path. Separate `price_not_found` from advisory codes,
   or group by code.
3. **The three dead destructures survive.** At HEAD, exactly one occurrence each:
   `SettingsPricesTab.tsx:78`, `SettingsImportsTab.tsx:1020`, `SettingsAuditTab.tsx:1023`. Honestly
   reported as forbidden files, but the packet's title is only partly discharged — the dead ends still
   exist, now sitting beside a live render in a *different* file. Needs a follow-up with those files
   in scope.
4. **Stale line numbers in shipped commit messages (x2).** `analyzer.ts:836` is actually **855**;
   `SettingsPricesTab.tsx:602` (`items.slice(0, 12)`) is actually **583**. Both are cited in
   `commitmsg2.txt`, now permanent history.

## What is genuinely correct (reproduced, not taken on trust)

- Commit 1 is deletion-only and **comments-only**: 44 deletions, and a filter for non-comment `-` lines
  returns exit 1 (zero). No runtime effect.
- `parseDiagnostics = 0` for both files (re-ran `ts.createSourceFile`, TSX).
- The cast is **structurally honest** — every field it asserts is required in
  `dentalPricelistItemSchema`, so `item.warnings.length` cannot throw and `key={item.id}` is a real key.
- The banner is **genuinely reachable**: `pricelistAnalysis` (14358) and `pricelistWarningsText` (14370)
  are both inside `useAppLogic.tsx`'s return object (`return {` at 13771).
- **No import conflict.** SettingsView imports only `settingsTabGroups, type SettingsTabGroup` from
  `AppHelpers` (line 169) — no duplicate declaration of `pricelistWarningsText`. Exactly 3 occurrences.
- **No English reaches the clinic** through the newly-rendered helper: every per-item code the analyzer
  emits has a Russian label; `groq_failed:` and the technical pattern catch the rest.
- CSS tokens declared: `--warning-color` in `main.css:60` (light), `:122` (dark), `:182`;
  `--surface-muted` / `--text-muted` in `token-aliases.css:144` / `:180`.
- **Not duplicative**: the tab's preview renders only `"цена ?"` for a null price — never the warning
  reason and never the source line. The banner adds real information.
- The packet **corrected the lead's brief** (the "nine props" were commented destructures, not prop
  conduits) instead of inventing pass-throughs. Correct and worth crediting.

## Sweeps

| Sweep | Result |
|---|---|
| `руб. ₽` double unit | no hits (exit 1) |
| mojibake in diff or subject | no hits (exit 1) |
| English string reaching a user | none — only CSS token names inside `style={{}}` |
| money comparison changed | none |
| second money helper | see below (out of scope) |

**Out-of-scope observation for the lead.** The canonical money-text helpers live in
`apps/api/src/documents/guards.ts:87` (`moneyRubText`) and `:102` (`moneyKopecksText`) — **not** in
`@dental/shared`. The web prices tab renders money with raw `toLocaleString("ru-RU")`
(`SettingsPricesTab.tsx`, the `цена ?` block), which **drops the kopeck trailing zero**: verified with
node, `(1500.50).toLocaleString("ru-RU")` -> `"1 500,5"`, so 1500,50 ₽ displays as `1 500,5 ₽`. That is
a second money convention and a real display defect. Pre-existing, untouched by this packet — flagging
because the sweep asked.

## Verdict: NEEDS_REWORK

Not REVERT: no money comparison changed, no tolerance introduced, no epsilon anywhere in the diff.
The code that landed is correct, reachable, and type-honest. Rework is driven by the missing test on a
render-surface fix in a repo with a documented triple history of this exact regression, the photo-OCR
`N из N` degeneration, and the three still-dead destructures.

