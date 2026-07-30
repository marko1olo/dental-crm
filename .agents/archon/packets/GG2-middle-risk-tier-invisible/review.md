# GG2 adversarial review — middle risk tier invisible

Reviewer: adversarial (did not write this code). READ-ONLY. Commits under review:
`20608de77` (fix) and `04c507de1` (guard test). HEAD at review time: `f98692df5`.

## Scope mismatch in the review brief (stated up front)

The five-point checklist I was handed is written for a **money-formatting** packet: it names
`guards.ts`, "interpolations of a money value into text", "11 raw and 4 already correct", integer-kopeck
comparisons, and `${index + 1}` line numbers. **None of that is in this diff.** This packet changes a
risk-tier enum comparison and a props type in `apps/web/src/ShiftView.tsx`. There is no `guards.ts` in
this repo. I answered each numbered check against the real diff rather than reporting "n/a", and I flag
where the check is inapplicable rather than silently scoring it as a pass.

## Check 2 — money COMPARISON touched? NO. Not REVERT-grade.

The diff changes exactly six comparisons, all of them `===` against a **string enum member**, not a
numeric amount:

```
-  background: activePatientInsight.riskLevel === "high" ? "var(--bad-bg)" : activePatientInsight.riskLevel === "medium" ? "var(--warn-bg)" : "var(--paper-soft)"
+  background: activePatientInsight.riskLevel === "high" ? "var(--bad-bg)" : activePatientInsight.riskLevel === "watch" ? "var(--warn-bg)" : "var(--paper-soft)"
```

No kopeck comparison, no epsilon/tolerance introduced, no `Math.abs(a-b) < x`, no rounding. The two
`money()` calls inside `PatientCockpit` (`money(activePatientInsight.balanceDueRub)` and the
`billingSummary` tile) are **not on any changed line** — verified by reading the full hunk list of
`20608de77`, which touches only the import, a new type block, the props annotation, and the three
`riskLevel` ternary lines plus comments. Nothing here can move a receipt total.

## Check 3 — converted something that is not money? NO.

Nothing was "converted" in the money-formatting sense; no formatter was applied or removed. Counts on
screen stay counts (`countLabel(activeUsableDocuments.length, ...)` etc. are untouched by this diff —
they came from an earlier commit). No `${index + 1}` line-number site was touched.

## Check 5 — attribution: CLEAN.

```
git log -1 --format='%(trailers)' 20608de77...  -> (empty)
git log -1 --format='%(trailers)' 04c507de1...  -> (empty)
```

Author and committer on both: `marko1olo <marko1olo@users.noreply.github.com>`. Body grep for
`Co-Authored-By` / `anthropic` / `Claude` / `Generated`: see the sweep section below.

## Check 1 — missed sites (re-derived by me, not taken from the brief)

Contract at HEAD, `packages/shared/src/index.ts:2629`:
`export const patientInsightRiskSchema = z.enum(["low", "watch", "high"]);` — so `"medium"` was never a
legal value and `"watch"` is the correct resolution. CSS agrees: `main.css` defines
`.patient-insight-panel.risk-watch` and `.risk-high`, and there is **no** `.risk-medium` rule anywhere.

My grep for remaining sites of this defect class in `apps/web/src`:

- `rg -n '"medium"' apps/web/src/ShiftView.tsx` -> only lines **605** and **698**, both inside the
  explanatory comments. Zero executable occurrences.
- `rg -n 'riskLevel\s*===' apps/web/src --glob '!**/tests/**'` -> only `ShiftView.tsx:705` and `:707`,
  both already `"watch"`. **No other file in the web app compares `riskLevel` at all.**

So for the enum defect: 0 sites missed.

## Check 4 — would the test fail on revert? YES for the enum/props fix. Proven against the real blob.

I did not trust the author's synthetic mutation. I extracted the **actual pre-fix blob**
(`git show 20608de77^:apps/web/src/ShiftView.tsx`) and re-ran each guard's own logic against it:

```
CONTRACT LEVELS = ["low","watch","high"]

--- HEAD (fix present) ---
PASS  A comparisons-in-contract     :: compared=["high","watch","high","watch","high","watch"] offending=[]
PASS  B watch-branch+warn-colours   :: hasWatchCmp=true warnBg=true warnFg=true
PASS  C props-not-any               :: sigCaptured="PatientCockpitProps" hasDashboardShape=true
PASS  D forbidden-needles           :: hits=[]

--- PRE-FIX BLOB 20608de77^ (fix reverted) ---
FAIL  A comparisons-in-contract     :: compared=["high","medium","high","medium","high","medium"] offending=["medium","medium","medium"]
FAIL  B watch-branch+warn-colours   :: hasWatchCmp=false warnBg=true warnFg=true
FAIL  C props-not-any               :: sigCaptured="any" hasDashboardShape=false
PASS  D forbidden-needles           :: hits=[]

GUARDS THAT BREAK ON REVERT = [A, B, C]
VACUOUS (pass both ways)     = [D]
```

Named assertions that break on revert:

1. `сравнения уровня риска ссылаются только на значения контракта` — `assert.ok(levels.includes(value))`
   fails three times with `сравнение с «medium», которого нет в контракте (low | watch | high)`.
2. `средний уровень риска отличается от спокойного на вид` — `assert.ok(source.includes('riskLevel === "watch"'))` fails.
3. `пропсы карточки пациента типизированы, а не any` — the signature regex captures `any`, so
   `assert.ok(!/\bany\b/.test(signature[1]))` fails.

Test run at HEAD, reproduced independently: `node --import tsx --test apps/web/src/tests/shiftViewHumanText.test.ts`
-> **6 pass / 0 fail**, exit 0.

Guard A is genuinely contract-derived, not hardcoded: it parses `patientInsightRiskSchema` out of
`packages/shared/src/index.ts` at runtime, so widening or renaming the enum on the contract side is
picked up without editing the test. That is the right construction.

### Guard D passes both ways — disclosed scope, not concealed ceremony

Guard D (the six forbidden human-text needles) passes on the pre-fix blob too, because those ten
human-text sites were fixed by an **earlier** commit, not by `20608de77`. The author's own inventory says
so explicitly ("ALREADY CORRECT — FF2 fixed it and my guard now pins it"), so this is declared, not
hidden. It is still non-vacuous **against its own defect** — I injected each needle as real code and
confirmed it fires:

```
DETECTED  "?? app.status" / "?? action.priority" / "?? queue.role" / "дел: ${" / "шт." / "1042"   (6/6)
comment-only injection fires = []      <- intended exemption works, no false positive
```

The comment-stripping self-check test (`вырезание комментариев не мешает ловить настоящее нарушение`) is
a real guard-of-the-guard: it pins the `https://` false-strip case and asserts a code-side `1042`
survives stripping, so "no violations found" cannot silently mean "the file got eaten".

## Type-safety of the `any` -> `PatientCockpitProps` change

The author is honest that `npx esbuild` "is NOT a typecheck and proves nothing about type errors". I was
barred from running `tsc`, so I verified assignability by reading every field the body touches:

- Body reads `activePatient.fullName/.id/.birthDate/.phone/.notes` — all present on `patientSchema`
  (`birthDate`, `phone`, `notes` are `.nullable()`, and the body uses `?? "не указан"` / a truthiness
  guard / `birthDateLabel(value: unknown)`, so nullability is handled).
- Body reads `activePatientInsight.riskLevel/.nextBestAction/.balanceDueRub/.openTasks/.missingDocumentKinds/.recallDueAt`
  — all present on `patientInsightSchema`. The `as keyof typeof` removal is sound because
  `patientInsightRiskLabels` is declared `Record<Dashboard["patientInsights"][number]["riskLevel"], string>`
  in `AppHelpers.tsx:6013`, i.e. keyed by the same enum.
- `dashboard?.billingSummary?.totalPaidRub ?? 0` — optional-chained, safe under `Dashboard | null | undefined`.
- The three `readonly unknown[]` props are the only strict ones. All three sources in `useAppLogic.tsx`
  always return an array (`activeCommunicationTasks`/`activeImagingStudies` early-return `[]` when
  `!dashboard`; `activeUsableDocuments` is `activeDocuments.filter(...)`), so none can be `undefined` and
  the call site at `App.tsx:3568` passes exactly the six declared props. No excess-prop error.

`Dashboard` is exported (`packages/shared/src/index.ts:4414`) and imported as `import type`, so no runtime
import weight is added.

Conclusion: I found no type error, but note that **no typecheck was run by anyone** — this is static
reading, not compiler proof. The claim "the next foreign-string comparison becomes a compile error"
depends only on the prop type declaration (not on caller types), so it holds by construction.

## Nits (not defects)

1. **Text guard blind spots.** Guard A only matches `riskLevel === "..."`. I confirmed by injection that
   `riskLevel == "medium"`, `riskLevel !== "watch"` and `case "medium":` are **NOTCAUGHT** by the text
   guard. The compiler covers all three now that props are typed, so the practical exposure is low — but
   the guard is narrower than its test name suggests.
2. **Needle narrowness.** Guard D misses `3 шт` (no period) and `док-тов`, both confirmed NOTCAUGHT, even
   though `док-тов` is named in the code comment at the documents tile as the exact abbreviation that was
   removed. A relapse spelled slightly differently walks past.
3. **`ShiftView({...}: any)` at line 67 is still `any`,** plus inline `(app: any)` / `(member: any)`
   annotations in its body. The author declares this out of scope. It is the same class of blindness that
   let this defect survive, so it is real residual debt — but scoping it out was a defensible call and it
   is disclosed rather than hidden.
4. The `1042` needle is a bare number; if that digit string ever becomes legitimate (a price, an id
   fragment) the guard produces a false positive. Acceptable for now.
5. **Guard C pins the signature spelling, not the actual type — confirmed bypass.** I mutated the alias
   to `export type PatientCockpitProps = any;` while leaving one stray
   `type KeepShape = Dashboard["patientInsights"][number];` in the file, and guard C still returned
   **PASS (BYPASS - guard blind)**. The realistic relapse (`}: any)`) *is* caught, and the compiler is
   the real protection, so severity is low — but the guard is weaker than its name implies.
6. Author's inventory says ShiftView has "~10 inline `(app: any)` / `(member: any)`". Actual count at
   HEAD is **13 total `: any` sites** (line 78 is ShiftView's own props; 12 inline). Minor undercount in
   the self-report, not material to the change.

## Sweep results (all clean)

- **`руб. ₽` double unit:** none in `ShiftView.tsx` or the test.
- **Second money helper beside `@dental/shared`:** the premise does not hold here — `@dental/shared`
  contains **no money formatter at all** (no `formatKopecksRu`, no `formatMoney`). The single web-side
  formatter is `money()` at `AppHelpers.tsx:2520`, imported by ShiftView and untouched by this diff.
  There is no duplicate to reconcile and this packet introduced none.
- **Mojibake:** `ShiftView.tsx`, the test file and `state.md` all validate as UTF-8; no `Ð`/`Ñ`/`â€`/`Â`
  sequences. Both commit subjects render correctly as Cyrillic.
- **English string reaching a user:** none added. Every non-comment added line is an import, a type
  alias, a props field, or a CSS custom-property name (`var(--warn-bg)`). No new user-facing text.
- **`Co-Authored-By` / `anthropic` / `claude` / `generated` / model names in either body:** no match.
- **Ancestry:** both commits are ancestors of HEAD (`f98692df5`), so neither was lost to the concurrent
  commits that landed around them.

### Independent re-derivation of remaining raw-key-to-screen sites in ShiftView

- Raw enums appearing in JSX at lines 406, 409, 551, 705 are all in `className` / `key` positions
  (`priority-${action.priority}`, `risk-${riskLevel}`, `key={queue.role}`). These are CSS hooks and React
  keys, **not user-visible text** — converting them would itself be a defect, and the packet correctly
  left them alone.
- `?? ` fallbacks to a raw field: line 138 `app.endsAt ?? app.startsAt` (a date used in arithmetic, not
  rendered) and line 587 `queue.blockedBy?.[0] ?? queue.automationHint`. I checked the contract
  (`roleQueueSchema`: `automationHint: z.string()`, `blockedBy: z.array(z.string())`) and then the server
  values (`apps/api/src/sampleData.ts:3234+`): `blockedBy` holds full Russian sentences
  ("Есть неподписанный прием", "Нет ассистента в смене"). Human text, not an internal key.

**Result: 0 sites missed.** The brief's "11 raw / 4 already correct" figures belong to a different
(money-formatting) packet and have no counterpart in this diff.

## Verdict: SOUND_WITH_NITS

The fix is correct and independently confirmed on all three sides of the contract: the enum
(`low | watch | high`), the stylesheet (`.risk-watch` exists, `.risk-medium` does not), and the server
(`sampleData.ts` emits `watch` for the middle tier). `"watch"` was the right resolution; widening the enum
would have been wrong. The guard test is non-vacuous where it counts — three of its four guards fail
against the genuine pre-fix blob. No money comparison was touched, no tolerance introduced, nothing
non-money was converted, attribution is clean.

The one substantive caveat, which the author disclosed rather than hid: **no typecheck was run by anyone.**
`esbuild` strips types and proves only that the file parses. The claim "the next foreign-string comparison
becomes a compile error" holds by construction from the prop-type declaration and I found no assignability
break by reading every field the body touches against `patientSchema` / `patientInsightSchema` / the three
`useAppLogic` array sources — but that is static reading, not compiler output. Someone should run
`tsc --noEmit` once the tree is quiet.

