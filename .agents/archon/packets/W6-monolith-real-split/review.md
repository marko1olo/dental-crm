# ADVERSARIAL REVIEW — W6-monolith-real-split

Commit under attack: `64d17693613646c67665b41f91a0a3f03fe29f75`
Reviewer: adversarial, did not write this code. Posture: disbelief. Every number re-derived.
VERDICT: **NEEDS_REWORK** — nothing fabricated, every claim reproduced, but two real defects
introduced inside the packet's own scope, one of them undisclosed.

---

## 1. WAS THE DEFECT REAL AT THE PARENT? — YES, REPRODUCED

```
git grep -n "documents/forms/TaxDeductionApplicationForm" 64d17693^ -- apps/web/src   -> exit 1, no hits
git show 64d17693^:apps/web/src/components/documents/forms/TaxDeductionApplicationForm.tsx | wc -l -> 201
```
Nothing imported the file by path at the parent. Every other `TaxDeductionApplicationForm` hit at the
parent is the same-named TYPE from `@dental/shared` (App.tsx:193, AppHelpers.tsx:175, documentStore.ts:27,
useAppLogic.tsx:124, DocumentsView.tsx:21) plus the orphan's own `export function` line. I dumped the
201-line orphan and the parent inline block (DocumentsView.tsx:2263-2375) side by side: identical form,
field for field, placeholder for placeholder, including the `knd_1151156` INN branch and the duplicate
warning checkbox. Two owners of one legal form; an edit to either never reached the other. Real defect.

Reachable by a real user: `DocumentsView` is rendered at `App.tsx:3900`; `tax_deduction_application` is
in the shared kind registry (`packages/shared/src/index.ts:80`, factory group at :737) with a validator
(`documentValidators.ts:1719`). Not dead code sold as a fix.

## 2. NUMBERS — ALL REPRODUCE EXACTLY

| Claim | Re-derived |
|---|---|
| DocumentsView 5094 -> 4363 | `git show` both revs: 5094 / 4363; worktree also 4363 |
| 41/30/16/25/156/194/139/127/148/155/170/328 | all 12 match to the line |
| commit 13 files, +1556 −959 | exact |
| 870 DocumentState fields, 171 destructured, 0 missing | exact (parsed the interface, walked the 7 forms) |
| 25 tests, pass 25, fail 0, exit 0 | TRUE_EXIT=0, tests 25, pass 25, fail 0 (449.3 ms this run) |
| encoding smoke 430 / 0 / 0, exit 0 | exact |
| css tokens 151 declared, 2979 var(), 0 unresolvable, exit 0 | exact |
| esbuild parse exit 0 | 13/13 exit 0 (my first run failed only because I added a bogus `--loader`) |
| 21 shell copies left, lines 1274/1401/1541… | exact, 21 `style={{ background: "var(--surface-100)"` remain |
| orphans 225 + 79 still unwired | exact; both still imported by nobody |

## 3. THE CSS `!important` CLAIM — TRUE, AND THE CASCADE REASONING IS CORRECT

`apps/web/src/styles/dente-redesign.css` 1262-1287 (cited range exact):
`.document-manual-override` sets background/padding/border-radius **10px**/border/margin-top **12px** all
`!important`; `.document-manual-override > summary` sets cursor/font-weight/color **var(--teal-dark)**/
user-select all `!important`; `.document-payload-collapsed-content` sets margin-top/display/
flex-direction/gap **10px** all `!important`. Dark/night summary colour override exists at 1277-1279, and
`main.css:17095` adds `!important` dark rules too. The sheet is really loaded (`main.tsx:13`).

I enumerated every removed inline style: each of the six shared-card parent blocks had exactly **3**
`style={{…}}` objects, 13 properties total, and **all 13 are covered by an author `!important`
declaration**. Author `!important` beats a normal `style` attribute, so those inline values never painted.
The refusal block had 0 inline styles and was moved verbatim. No un-covered property was dropped.

## 4. BEHAVIOUR / COPY — PROVEN CONSERVED (this is the strongest part of the packet)

Whole-file Cyrillic multiset diff, parent `DocumentsView.tsx` vs (HEAD `DocumentsView.tsx` + all 11 new
files): the **only** text that loses occurrences is `✏️ Ручная корректировка полей (развернуть)` ×5 —
six copies collapsing into one `DocumentPayloadCard`. Everything else in the delta is added doc comments.
Zero labels, placeholders, checkbox texts or field orders changed.

Prop plumbing preserved verbatim: `activeDoctor?.fullName ?? "врач, проводивший разъяснение"`,
`dashboard?.activeVisit?.complaint ?? "показание к вмешательству"`,
`inferredTreatmentArea || "FDI / зона лечения"`, the refusal template literal, the 3 `readOnly` operator
fields, `togglePhotoVideoMaterial`, `renderClinicalToothRowsEditor` — all identical before/after.

`appendChipToText` is an exact behavioural equivalent of all four inlined expressions
(`x.trim() ? \`${x.trim()}, ${chip.toLowerCase()}\` : chip`) — verified against all four parent handlers.
`QuickChipsRow`'s 200-char className is byte-identical to the four copies it replaced.

No `useEffect` / listener / timer was moved (0 in the parent blocks, 0 in the new files) — the teardown
requirement is N/A, not skipped.

## 5. TYPECHECK — I RAN THE GATE THE PACKET DEFERRED. THE PACKET'S FILES ARE CLEAN.

```
apps/web$ ../../node_modules/.bin/tsc -b --noEmit --force   -> TRUE_EXIT=1, exactly 3 errors
src/App.tsx(4775,40) TS2769  Type '"inventory"' is not assignable to type 'LazyWorkspaceView'
src/App.tsx(4789,40) TS2769  Type '"scanner"'   is not assignable to type 'LazyWorkspaceView'
src/App.tsx(4797,40) TS2769  Type '"leads"'     is not assignable to type 'LazyWorkspaceView'
```
`--force` = no incremental `.tsbuildinfo` shortcut. **Zero errors in any of W6's 13 files.** All four risk
spots the builder named (renamed `TaxDeductionApplicationFormKind`, the moved `DocumentSelectOption`,
`exactOptionalPropertyTypes` vs the optional hints, `renderToothRowsEditor: () => ReactNode`) pass — the
call-site values arrive through `DocumentsViewProps = Record<string, any>`, so they are `any`.

The 3 errors are PRE-EXISTING, from commit `41a22b63d` which added the inventory/scanner/leads routes to
App.tsx but never extended the union in `workspaceRouteErrorBoundary.tsx:3`. Not W6's. The lead should
know the web typecheck gate is RED at HEAD for someone else's reason.

Whole web suite, which the packet did not run: `npm test -w @dental/web` -> **exit 0, tests 608,
pass 608, fail 0**. `import('./src/DocumentsView.tsx')` under tsx loads cleanly.

## 6. GIT HYGIENE — CLEAN

`git show --name-only 64d17693` = exactly the 13 claimed files, nothing else. Packet notes committed
separately (`11a9fc13b`, `23c181b29`), author `marko1olo` on all three. The neighbouring agent's
untracked `apps/web/src/__tests__/clinicModeSurface.test.ts` is still untracked — not swept in. No BOM, no
mojibake in any of the 13 files (`rg` for the known garble classes: 0 hits); Russian subject intact.

---

## FINDINGS

### F1 — 171 dead store destructures left behind in DocumentsView.tsx (undisclosed)
`apps/web/src/DocumentsView.tsx:191-402` and `:408-1013` still destructure 814 fields from two
selector-less `useDocumentStore()` calls. I counted the ones never referenced anywhere else in the file:

* parent `64d17693^`: 814 destructured, **2** dead (`isDocumentIngesting`, `setIsDocumentIngesting` — pre-existing)
* HEAD: 814 destructured, **173** dead

The 171 new dead bindings are precisely the 171 fields the extracted forms now read from the store
themselves (`informedConsent*`, `procedureConsent*`, `anesthesia*`, `photoVideo*`, `personalData*`,
`refusal*`, `taxApplication*` and their setters). The parent still declares the entire state of seven
forms it no longer renders. No gate catches it (`noUnusedLocals` is not set in `tsconfig.base.json`, and
there is no biome config in the repo, so `npm run lint` is just `typecheck`), and there is no runtime
cost, because a selector-less subscription already re-renders on every store key. But it is dead code in
the exact file the packet was decomposing, it is the same "two names for one thing" smell the packet was
written to kill, and it is not in the packet's otherwise scrupulous debt list. The real achievable
reduction is ~4192 lines, not 4363.

### F2 — W6 broke one needle in `smoke:document-payload-ui-source` (already-red gate)
`npm run smoke:document-payload-ui-source` -> TRUE_EXIT=1, 52 missing needles. Attribution, needle by
needle, against the parent revision of DocumentsView.tsx:

* **1 caused by W6**: `"12 цифр, если есть"` — the KND-1151156 INN placeholder. It was in the parent
  DocumentsView; it now lives in `components/documents/forms/TaxDeductionApplicationForm.tsx`, and that
  smoke's source list (`scripts/smoke-document-payload-ui-source.mjs:4-13`) reads App.tsx, useAppLogic,
  DocumentsView.tsx, documentStore.ts, CommunicationsView.tsx, communicationTaskData.ts,
  postVisitCareData.ts, workspaceUiLabels.ts — **not** `components/documents/**`.
* 51 pre-existing: never in DocumentsView at all, so they were missing at the parent too. The smoke was
  already RED before W6.

Same failure mode as `068cc6f0c` ("переименование сломало проверку исходников smoke"). The builder ran
only the encoding smoke and the CSS-token checker; it never ran the five source smokes that read
DocumentsView.tsx. I ran them all and attributed every failure:

| smoke | exit | attributable to W6 |
|---|---|---|
| `smoke:documents-view-source` | 1 | **0** (3 failures, all non-DocumentsView; verified by re-running the same assertions against the parent DocumentsView — identical 3) |
| `smoke:document-payload-ui-source` | 1 | **1** (F2) |
| `smoke:document-legal-confirmations` | 1 | 0 (74 missing, all `app:` needles from the earlier state-to-store migration) |
| `smoke:daily-surfaces-keyboard-accessibility` | 1 | 0 (12 failures: patients/schedule/communications/settings; zero `documents:` lines) |
| `smoke:tax-ui-year-source` | 0 | — |

### F3 — nits (numbers are claims too)
* `components/documents/DocumentPayloadCard.tsx:7` and the commit body say each copy carried **"четырьмя
  объектами `style={{ … }}`"**. It is **three**, in all six blocks (`rg -c 'style=\{\{'` = 3 per block).
  A wrong count inside the comment whose whole job is to justify the deletion.
* `DocumentPayloadCard.tsx:17` and `documentChipText.ts:11` point at `tests/documentPayloadForms.test.tsx`.
  The file is `documentPayloadForms.test.**ts**`; no `.tsx` exists.
* `PersonalDataProcessingConsentForm.tsx:18` invents `DocumentClinicOperator` with 4 **required** strings,
  duplicating fields of the existing `ClinicProfileDraft` (`AppHelpers.tsx:3233`), while
  `appStore.ts:18/243` types `clinicProfileDraft` as `any` with initial value `null`. Not a regression —
  the parent also did `clinicProfileDraft.legalName` unguarded — but a new type asserting non-null over a
  nullable store value, where `Pick<ClinicProfileDraft, …>` would have tied the two together.

## WHAT I COULD NOT DO
Rendered appearance in light/dark/night is still unproven by anyone. My work is static: the cascade
argument is airtight on paper (all 13 properties `!important`, sheet loaded, markup otherwise identical),
but no capture was taken, by the builder or by me. The lead's UI VERIFIED still stands open.
