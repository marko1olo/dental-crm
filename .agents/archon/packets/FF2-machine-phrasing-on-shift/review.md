# FF2-machine-phrasing-on-shift — adversarial review

Reviewer: did not write this code. Read-only. Nothing edited, added, or committed.
Commits: b9e0ccba3, 231d4ffd8, 2d67a5841 — each touches exactly one file, apps/web/src/ShiftView.tsx.

**Verdict: NEEDS_REWORK.** The shipped strings are correct and nothing needs reverting. Two
substantive gaps: zero regression guard, and one undisclosed confirmed key-set mismatch it walked past.

## Checklist mismatch (recorded up front)

The five checks I was handed are a MONEY packet template (`guards.ts`, kopeck comparisons,
`formatKopecksRu`, «руб. ₽»). This packet is Russian machine-phrasing in ShiftView.tsx. The implementer
flagged the same leftover in its own inventory line 1.

I did not skip checks because the template was wrong. I ran both the literal money checks (guards.ts
touched? comparison changed? tolerance introduced?) and the equivalent-in-kind check for this packet.

---

## 1. Did it miss a site? — NO undisclosed miss of the chartered class; 1 undisclosed adjacent defect

`guards.ts` is not this packet's file and was untouched by all three commits
(`git log b9e0ccba3~1..2d67a5841 -- '*guards.ts'` → empty).

Re-derived with my own AST sweep (`ts.createSourceFile`, StringLiteral + TemplateExpression + JsxText
only, so my grep cannot be fooled by the Russian comments that quote the old text):
**129 user-facing Cyrillic-bearing strings at HEAD.**

Chartered class = number-noun agreement + a DB key reaching the screen. Of these:
- All four label-dictionary lookups are safe: 354, 409, 567 now fall back to Russian literals; 674 reads
  a total dictionary.
- Every count adjacent to a noun goes through `countLabel`. I checked the plural triples by hand at
  n = 1, 2, 5, 11, 21 — all four new call sites produce correct Russian, including the 11–14 special case.

**Money-in-text sites still raw at HEAD: zero.** The only money in this file is ShiftView.tsx:714 and
679, both via `money()`, which appends « ₽» itself.

### Still raw at HEAD (5 disclosed by the implementer, 1 not)

| Site | What | Disclosed? |
|---|---|---|
| ShiftView.tsx:346 | `app.reason \|\| "плановый осмотр"` invents a clinical reason | yes — left as lead's call |
| ShiftView.tsx:648 | `карта № ${activePatient.id.slice(0, 6)}` — UUID prefix dressed as a chart number | yes — debt |
| ShiftView.tsx:225-229 | steps 1 and 2 hardcoded `className="… done"`, step 3 never `done` | yes — debt |
| apps/api/src/sampleData.ts:2843 | «Импортов: 0. Последних событий аудита: 4.» | yes — other file |
| ShiftView.tsx:44 | «прием/приема/приемов» missing ё | partially — see nit below |
| **ShiftView.tsx:671, 673** | **`riskLevel === "medium"` can never be true** | **NO** |

**The undisclosed one.** `patientInsightRiskSchema = z.enum(["low", "watch", "high"])`
(packages/shared/src/index.ts:2629), and `patientInsightSchema.riskLevel` uses it. ShiftView.tsx:671 and
673 branch on `activePatientInsight.riskLevel === "medium"`. `"medium"` is not in the union, so the amber
`--warn-bg` / `--warn-fg` branch is unreachable: the middle tier «контроль» renders with
`--paper-soft` / `--muted`, visually identical to «спокойно» / low. `PatientCockpit({…}: any)`
(ShiftView.tsx:600-607) is why TypeScript never flagged the impossible comparison.

I chased the opposite theory first and it is refuted: `patientInsightRiskLabels` at AppHelpers.tsx:6013
is `{low, watch, high}`, which is **total** over the real union, so the pill is never blank. The
`riskLevel: "medium"` values in sampleData.ts (3840, 3887, 3986, 4006) belong to `integrationPresetSchema`
(a different `riskLevel`, packages/shared/src/index.ts:977), not to patient insights.

Scope call, stated plainly: this is a styling defect with the same root cause family the implementer
itself expanded the packet to hunt (front-end key set disagreeing with the schema — its own "THIRD
instance" note), but a different symptom — silent wrong colour, not machine text on screen. It is
pre-existing, not introduced here.

## 2. Did it touch a money COMPARISON? — NO. Not REVERT-grade.

- guards.ts untouched; the diff adds zero money code. The only `+` line matching /money|kopeck|руб|₽/ is
  the import re-write, which re-lists the same `money` symbol that the `-` line already imported.
- Every comparison in the diff is byte-identical across `-`/`+` — it moved with surrounding reflow, it did
  not change: `queue.role === activeQueueRole`, `activeUsableDocuments.length > 0`,
  `(visibleRecommendedActions ?? []).length > 0`.
- No epsilon, no tolerance, no `Math.abs` / `Math.round` / `toFixed` added anywhere.

One real operator change, which is **not** a money comparison and is safe — naming it so it is on record:
ShiftView.tsx:354 went `statusLabels[statusKey] || app.status` → `statusLabels[statusKey] ?? "статус
неизвестен"`. `||` → `??` differs only on a falsy-but-not-nullish label. `statusLabels` is a local literal
at ShiftView.tsx:309-318 with eight non-empty values, so the two operators are indistinguishable here.

## 3. Did it convert something that is NOT a count? — NO

All four new `countLabel` arguments are genuine counts: `visibleRecommendedActions.length`,
`mostLoadedResource.appointmentCount`, `activeUsableDocuments.length`, `queue.openItems`.

The non-counts nearby were handled correctly rather than pluralized:
- `fitScore` and `utilizationPercent` percentages — untouched.
- The fabricated card number `"1042"` was **deleted** (→ «номер карты не присвоен»), not pluralized.
- The UUID prefix stayed a bare string.

## 4. Would its test fail if the fix were reverted? — IT ADDED NO TEST

Verified three ways:
1. None of the three commits touches a test file (`git show --name-only` per commit).
2. No test file anywhere in the repo references ShiftView (`rg -l 'ShiftView' --glob '*.test.*'` → empty).
3. Neither cited test file mentions ShiftView, so neither can observe the change.

Both cited runs — `deliveryReportNotice.test.ts` (39 pass) and `operationsPanelsStyling.test.ts`
(11 pass) — pass identically with this diff reverted. They prove the leaf module loads under `node:test`
and that `.sr-only` exists. Neither is a guard on this packet. Ceremony w.r.t. FF2.

The usual excuse is unavailable here. `apps/web/src/tests/operationsPanelsStyling.test.ts` is the repo's
own cheap source-text guard pattern, and says so in its header: «Проверки ниже дешёвые и текстовые:
полноценного рендера в проекте нет, но и возврат к зашитым цветам они ловят». The implementer executed
that exact file, so it read the pattern and declined to extend it. A guard costs one array entry plus a
regex asserting ShiftView.tsx contains no `?? app.status`, `?? action.priority`, `?? queue.role`,
`` `дел: ${ ``, `шт.`, or `"1042"`.

## 5. Attribution — CLEAN

`git log -1 --format=%(trailers)` for b9e0ccba3, 231d4ffd8, 2d67a5841 → **all three empty** (verified
byte-exact through `cat -A`: a single `$`, no trailer lines).
Author and committer on all three: `marko1olo <marko1olo@users.noreply.github.com>`.
Body scan `/Co-Authored|anthropic|Generated with|Claude/i` on all three → **0 matches**.
The `[ARCHON]` subject prefix is a project convention, not vendor attribution.

## Sweep

- **«руб. ₽» double unit:** zero `руб` and zero `₽` literals in ShiftView.tsx. `money()` appends « ₽»
  itself. Line 714 renders «… ₽ · долг … ₽». Clean.
- **Second money helper:** pre-existing duplication — `formatKopecksRu` in
  packages/shared/src/utils/money.ts vs `money()` at apps/web/src/AppHelpers.tsx:2520, which does
  `Math.round(safeAmount * 100) % 100` on a float ruble value. Untouched by this diff, and ShiftView
  passes `*Rub` fields to the ruble formatter, so it is at least unit-consistent. For the money lane,
  not a finding against FF2.
- **Mojibake:** independently verified at HEAD — 0 U+FFFD, no `Ð` / `â€` / `Ã` markers, no BOM,
  5313 Cyrillic chars. All three subjects clean.
- **English reaching a user:** none. The only Latin literals are `"ru-RU"`, CSS values (`"relative"`,
  `"all 0.15s ease"`), and status keys inside a `.filter`. One English *comment* («Compact Status
  Tracker», line 221) — not user-visible.

### Claims I reproduced
- Parse + transpile: `parseDiagnostics 0`, `transpileDiagnostics 0`, exit 0. Matches.
- `.sr-only` is real and correct: dente-operations.css:44 — `position: absolute`, 1px,
  `clip-path: inset(50%)`, `white-space: nowrap`; imported at main.tsx:24. The hidden label cannot land
  in layout flow, so "visual output unchanged" holds structurally.
- sr-only precedent: DayConfirmationsPanel.tsx:199,259 and RecallListPanel.tsx:216. Both real.

### Claim I could NOT reproduce (nit)
Encoding line claims "46944 bytes, 5153 Cyrillic chars". My measurements:

| rev | bytes | Cyrillic |
|---|---|---|
| b9e0ccba3~1 | 42617 | 4057 |
| b9e0ccba3 | 46216 | **5153** |
| 231d4ffd8 | 46536 | 5205 |
| 2d67a5841 = HEAD | 46891 | 5313 |

5153 matches **commit 1 of 3 only**; 46944 matches no revision at all. That line was measured mid-work
and never re-run, despite the surrounding claims being labelled as final. The underlying property still
holds at HEAD by my own check — only the cited figures are stale/wrong.

### Other nits
- ShiftView.tsx:44 «прием/приема/приемов» is missing ё, disclosed. Broader than disclosed: the same file
  writes «Приём» at 267 and «Приёмы» at 694 *with* ё, while «прием» appears without it at 181, 196, 246,
  260, 276, 294, 313, 314, 431. In-file inconsistency at ~9 sites, not 1.
- ShiftView.tsx:575/580: the same sentence is both `title` and the `sr-only` text. On AT that computes a
  description from `title`, that is a double announcement. `<strong>` is generic with no role, so most AT
  computes no description at all — I could not prove a double read, so this is a nit, not a finding.

## Required rework
1. Add a guard. Extend apps/web/src/tests/operationsPanelsStyling.test.ts (or a sibling) to assert
   ShiftView.tsx contains none of `?? app.status`, `?? action.priority`, `?? queue.role`, `` `дел: ${ ``,
   `шт.`, `"1042"`. Without it all ten sites are one careless edit from regressing.
2. Resolve ShiftView.tsx:671/673 `riskLevel === "medium"` against
   `z.enum(["low","watch","high"])` — either the comparison becomes `"watch"`, or the schema gains
   `"medium"`. Today the middle risk tier has no visual signal.
3. Re-run the encoding measurement at HEAD, or drop the byte/Cyrillic figures from the claim.
4. Optional, cheap: type `PatientCockpit`'s props instead of `: any` — that `any` is the only reason
   item 2 compiled silently.
