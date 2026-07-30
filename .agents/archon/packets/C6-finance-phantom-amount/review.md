# C6-finance-phantom-amount — ADVERSARIAL REVIEW (FINAL)

Reviewer: adversarial reviewer for [ARCHON]. Read-only on source: no edit, no commit, no git add.
Commit attacked: `8f9243bddfa9704952ff4ca5fe17fe7d5d0f8ac8`
Sibling commits in the packet: `a4907fe62` (test), `f8922a383` (packet docs)
Repo HEAD at review time: `d9c90d685` (later, other packets)
Author on all three: `marko1olo <marko1olo@users.noreply.github.com>`

## VERDICT: NEEDS_REWORK — real fix, reproducible proof, but it ships an undeclared
## regression on a money input, and the builder's reachability analysis asserts the
## opposite of the truth. DO NOT REVERT: the rework is additive and small.

---

## A. PROOF AUDIT — every claimed command re-run by me, not a similar one

| Claimed proof | Re-run | Result |
|---|---|---|
| `npm run typecheck -w @dental/web` | YES | `> @dental/web@0.1.0 typecheck` / `> tsc -b --noEmit`, **EXIT=0**. REPRODUCES. |
| `node --import tsx --test apps/web/src/tests/paymentComposerReset.test.ts` | YES | `tests 12 / suites 3 / pass 12 / fail 0`, EXIT=0. Every quoted test title present verbatim. REPRODUCES. |
| Guard non-vacuous vs pre-fix `26f1f3c59` | YES, independently (piped `git show` into stdin, no temp source file) | `PRE-FIX guard regex matches: false`; `Fields NOT cleared pre-fix: 8/14` — MISSING `paymentAmount` + all 7 fiscal. REPRODUCES. |
| Encoding: 0 mojibake, 0 BOM on the 4 touched files | YES, own script, `[РС][-ÿ]` per AGENTS.md | 0 / 0 on all four. REPRODUCES. |
| "Full web test suite" — builder declared NOT PROVEN | I ran it | `node --import tsx --test apps/web/src/tests/*.test.ts` → 256/256. Canonical `npm test -w @dental/web` → **tests 406 / pass 406 / fail 0**. No regression. Builder's NOT-PROVEN item now CLOSED, green. |

Two checks the builder did NOT do, which I did, and which the proof depended on:
- **Anchor uniqueness.** The source-scraping guard (test:227) slices useAppLogic.tsx between
  `paymentMutationIdRef.current = null;` and the next `await loadDashboard();`. That anchor occurs
  **exactly once** (line 12661). The guard is not accidentally anchored on some other block.
- **The `as DocumentState` cast.** `documentStore.ts:2626` is
  `create<DocumentState>((set) => ({...}) as DocumentState)`. An assertion, so tsc would NOT catch a
  setter declared in the interface but never created in a slice — `getState().setX` would be
  `undefined` and the reset would throw. I checked all 15 by hand against
  `documentStore.ts:2126-2156`: all 15 exist. `createSetter` (documentStore.ts:46-51) handles plain
  values correctly. No runtime TypeError.

**The defect was real before this commit.** Pre-fix effect body, extracted from `26f1f3c59`:
`setPaymentFeedback("")` plus 6 payer setters; `paymentAmount` and all 7 fiscal identifiers untouched.

---

## B. FINDING 1 (CONFIRMED, the one that costs the verdict) — the reachability claim is FALSE, and
## the commit widens a wipe onto the money input

Builder's claim, verbatim: *"the God Context is instantiated once at the app root and is mounted for
the entire session"* … *"Because it lives in an always-mounted hook rather than in a view, it fires on
every patient switch regardless of which screen the operator is on."*

`useAppLogic` is a plain hook, not a singleton. One grep falsifies both sentences:

```
apps/web/src/App.tsx:956                       const appLogicValue = useAppLogic();     <- root instance
apps/web/src/components/useVisitDiaryLogic.ts:27  const { activeDoctor } = useAppLogic();  <- SECOND FULL INSTANCE
```

The canonical consumer is `useAppLogicContext()` (`apps/web/src/contexts/AppLogicContext.tsx`).
`useVisitDiaryLogic` bypasses it and instantiates the whole God Context a second time.

Mount chain, every link read at HEAD:
- `apps/web/src/VisitView.tsx:353-355` renders `<VisitOdontogramTab>` **only while `visitSubViewTab === "odontogram"`** (tab button at `:316-319`, default `"emk"` at `:161`) — so it mounts and unmounts on tab clicks.
- `apps/web/src/components/visit/VisitOdontogramTab.tsx:69-73` renders `<VisitDiaryEditor>` when `activeAppointment?.id`.
- `apps/web/src/components/VisitDiaryEditor.tsx:103` → `useVisitDiaryLogic(...)` → `useAppLogic()` → `apps/web/src/useAppLogic.tsx:2383` → `usePatientLogic(...)` → the changed effect at `apps/web/src/hooks/domains/usePatientLogic.ts:219-221`.

A `useEffect` **always runs on mount**, whatever the dep values, and the new effect has **no first-run
guard**. `dashboard` lives in the shared `useAppStore` (`appStore.ts:235-236`), so the second instance
sees the real patient immediately and calls
`resetPaymentComposer(useDocumentStore.getState())` against the SHARED `documentStore`.

**Failure scenario, concrete:** cashier types `12000,50` into «Сумма к оплате (₽)» on «Оплаты» and
copies ФН/ФД/ФПД off the KKM receipt. Before pressing «Принять оплату» she switches to «Приём» and
clicks the «Зубная формула» tab (an appointment is open, so `VisitDiaryEditor` mounts). She returns to
«Оплаты»: the amount and the whole fiscal block are gone. Pre-fix the same navigation destroyed only
the 6 tax-deduction payer fields; the money survived. **This commit put the money in the blast radius.**

Not revert-grade: it trades *silent wrong-patient money* for *visible, retypable data loss*. That trade
is net positive. But it is undeclared, and the builder's own "every link confirmed by reading the file"
section states the opposite of what the files say.

Runtime status: CONFIRMED by static chain (React hook semantics + fully traced render path).
NOT executed in a browser — no server / screenshot pipeline permitted for me.

Cheapest rework, either one:
- add a first-run ref guard to the effect so it resets only on an actual id *change*, not on mount; or
- change `useVisitDiaryLogic.ts:27` to `useAppLogicContext()` (kills the duplicate God Context entirely
  and stops the duplicate effects/fetches it also causes).

---

## C. FINDING 2 (nit) — second owner remains, guard is real but shallow

`useAppLogic.tsx:12661-12676` still enumerates all 14 setters inline and does NOT call
`resetPaymentComposer`. So "one definition of the fresh composer" covers one of the two sites. The
builder declares this as debt and backs it with the source-scraping test. The guard is genuine (unique
anchor, checks all 14 names) but shallow: it asserts `setX(` *appears*, not what value is passed —
`setPaymentAmount(paymentAmount)` would satisfy it.

Unifying is not trivial and the builder was right not to try blind: the post-payment path ends with
`setPaymentFeedback("Оплата … записана …")` while `resetPaymentComposer` ends with
`setPaymentFeedback("")`, so ordering matters.

## D. FINDING 3 (nit) — the wiring guard is format-brittle

`tests/paymentComposerReset.test.ts:218` pins the effect with a literal regex requiring
`}, [documentPatient?.id]);` on one line. Any reformat (a formatter putting the dep array on its own
line) fails the test with the misleading message *"сброс … больше не вызывает resetPaymentComposer"*.

## E. FINDING 4 (nit) — "no persist" is loose

Handoff: *"Хранилище без `persist` … ноль совпадений на persist/localStorage/createJSONStorage"*. True
for those three tokens inside `documentStore.ts`, but `documentStore.ts:44` calls
`loadUiPreferences()` (AppHelpers → localStorage) and seeds `paymentMethod` from it
(`:2127`). No money/fiscal field is persisted, so the conclusion (session-scoped carry-over) holds; the
statement is imprecise, not wrong where it matters.

## F. Line-number drift in the reachability claim
`useAppLogic.tsx:2378` → actually **2383** at HEAD. `usePatientLogic.ts "post-fix ~:212"` → actually
**219-221**. `documentPatient` at `usePatientLogic.ts:111` → actually **112**. Cosmetic, but these were
presented as freshly-read HEAD line numbers.

---

## G. ATTACKS THAT FAILED — the change survives these

- **Hollow facade / dead code (primary path): DISPROVED.** `useDocumentStore.getState().setPaymentAmount`
  IS the setter the UI uses. `useAppLogic.tsx:1072` `const documentState = useDocumentStore();`,
  destructure closing at `:1938 } = documentState;`, supplying `paymentAmount`/`setPaymentAmount`
  (`:1830-1831`) → `App.tsx:1461/1667` → `App.tsx:4009 <FinanceView>` → `FinanceView.tsx:203`
  `onAmountChange={setPaymentAmount}` / `:191 amount={paymentAmount}` → `PaymentCapture.tsx:619`
  `id="payment-amount-input"` → submit at `useAppLogic.tsx:12493+` → `POST /api/billing/payments`.
  Not a parallel `useState`. Real money terminus.
- **PaymentCapture rendered from exactly one place: CONFIRMED.** grep returns only `FinanceView.tsx:6`
  and `:189`; `FinanceLedger.tsx` only has the unrelated `onFocusPaymentCapture` callback name.
- **Magic constant / fabricated default: DISPROVED.** `DEFAULT_PAYER_RELATIONSHIP = "пациент"` is the
  same literal that already lived at the pre-fix effect (`usePatientLogic.ts:205`), at the
  post-payment reset (`useAppLogic.tsx:12674`) and as the store default (`documentStore.ts:2151`).
  Centralisation, not invention. No `{success:true}`, no placeholder, no hardcoded UUID/port/endpoint.
- **Amount reset to `""` not `0`: correct and load-bearing.** `apps/web/src/rubAmountInput.ts:20-32`
  accepts kopecks (`/^\d+(\.\d{1,2})?$/`, comma and dot equal, `Math.round(rub*100)/100`, 3 decimals
  rejected outright). Packet item 5 verified: the dossier's "amountRub is an integer" is wrong at HEAD,
  the builder's correction is right.
- **God Context return block: UNTOUCHED.** Only the *call site* lost 7 props. `paymentAmount` (`:14012`)
  and `setPaymentAmount` (`:14216`) still exported. Nothing deleted or renamed. Typecheck EXIT=0 and
  406/406 unit tests corroborate. No leftover reference to any removed prop inside `usePatientLogic.ts`
  (grep: zero hits) — important, because the props are typed `: any`, so tsc would NOT have caught one.
- **Involuntary patient switch mid-typing: DISPROVED.** Every `setSelectedPatientId` writer outside
  `usePatientLogic` is inside an `onClick` (`IncomingCallToast.tsx:162`, `OmnichannelInboxView.tsx:594/795`,
  `PatientDuplicateAlert.tsx:186`, `App.tsx:4745`). No WebSocket/interval path flips the patient while
  the cashier types. The `[documentPatient?.id]` dep is also stable across dashboard refreshes because
  `selectedPatientId` pins `selectedPatient` (`usePatientLogic.ts:103-112`, `:190-197`).
- **Listener/interval/subscription without teardown: NONE.** The changed effect registers nothing and
  needs no cleanup; the diff adds no timer or subscription.
- **Hardcoded hex / static px / new i18n debt: NONE.** The new file is a pure TS module with no JSX,
  no colour, no unit.
- **`3800` really is gone at HEAD: CONFIRMED.** Only three comment lines mention it now
  (`documentStore.ts:2096-2099`); `paymentAmount: ""` at `:2125`, `refundAmountRub: ""`. Fixed by
  `0baa1f723` (2026-07-28 01:13:43) with regression test
  `apps/web/src/tests/moneyFieldsStartEmpty.test.ts`. The screenshot the packet was written from is
  older than that fix. **The builder correctly refused to fabricate a fix for an already-fixed defect,
  and said so.** That is the right behaviour for this repo and should be noted as such.
- **Adjacent-defect report (packet item 4) is accurate on both counts.**
  Clipped placeholder: already fixed, `PaymentCapture.tsx:559-566` comment + explicit
  `flexDirection: 'row'`, full text now `"Пример: Оплата 5000 картой, нужен налоговый вычет..."`.
  Unlabelled clusters: LIVE — `PaymentCapture.tsx:597` (dictation preset chips) and `:631` (quick-amount
  chips) carry no `aria-label`; `:660` has `aria-label="Способ оплаты"`. Verified by reading.

---

## H. GIT HYGIENE — CLEAN

- `8f9243bdd`: exactly 3 files, +158/−21 — `components/finance/paymentComposerReset.ts` (new),
  `hooks/domains/usePatientLogic.ts`, `useAppLogic.tsx`. Nothing else.
- `a4907fe62`: exactly 1 file, +241 — `tests/paymentComposerReset.test.ts`.
- `f8922a383`: exactly 5 files, +356 — all under `.agents/archon/packets/C6-finance-phantom-amount/`.
- **No churn swept in.** No `apps/api/.data/*.json`, no `apps/api/dist/**`, no `*.tsbuildinfo`, no
  `scratch/**`, no other author's file. The working tree is dirty with exactly that churn right now
  (`apps/api/.data/*`, ~40 `apps/api/dist/*`, `.agents/archon/progress.md`) and **none of it reached
  these three commits** — the shared-index contamination that hit two earlier commits did NOT recur.
- All four touched source files are clean in the worktree and byte-identical between `a4907fe62` and
  HEAD, so my re-runs exercised the committed state.
- Conventional Commits: `fix(касса):` / `test(касса):` / `docs(пакет C6):`. Russian subject names the
  defect, not the file. Body explains WHY at length (AGENTS.md §12 satisfied). No mojibake in the
  message. No `Co-Authored-By` trailer, unlike the same author's `0baa1f723` — cosmetic inconsistency,
  no repo rule broken.

---

## I. REQUIRED REWORK
1. Stop the mount-time wipe of the money input. Either add a first-run/previous-id ref guard to
   `usePatientLogic.ts:219-221`, or point `useVisitDiaryLogic.ts:27` at `useAppLogicContext()`.
   Re-prove with a test that models mount-without-change (the current
   `applyPatientSwitches` helper already has the shape for it: a mount with the *same* id must yield
   0 resets, not 1).
2. Correct the reachability section of `handoff.md` / `state.md`: `useAppLogic()` has **two** call
   sites and the God Context is **not** mounted once for the session.

## J. OPTIONAL (nits, not blocking)
3. Make the `tests/paymentComposerReset.test.ts:218` regex whitespace-tolerant.
4. Have the post-payment guard assert the reset *value*, not just the setter name.
5. Soften the "documentStore has no persist" wording (`loadUiPreferences()` does seed `paymentMethod`).
