# R3-finance-rework — ADVERSARIAL REVIEW (FINAL)

Reviewer: adversarial reviewer for [ARCHON]. Read-only on source: no edit, no commit, no git add.
Commit attacked: `e90e1b2762d58a347b4fbfe9b13fc6558f6c3e6d` (fix, 2 files, +89 −2)
Siblings: `6d97e0e7d` (test, 1 file, +148 −19), `625c2c486` (docs + C6 record corrections, 7 files,
+551 −5), `a9619b4c0` (state.md tail, 1 file)
Repo HEAD at review time: `7d277108c` (later packets: `b4292f74d`, `511403807`, `7d277108c`)
Author on all four: `marko1olo <marko1olo@users.noreply.github.com>`
Specification: `.agents/archon/packets/C6-finance-phantom-amount/review.md` — read COMPLETE.
Also read complete: `.agents/AGENTS.md`, `.agents/INDEX.md`, `.agents/BILLING_AND_FINANCE.md`,
C6 `handoff.md` + `state.md` at HEAD, R3 `handoff.md` + `state.md`.

## VERDICT: SOUND_WITH_NITS

Every numbered item of the C6 review is disposed of — none silently ignored. The central claim
reproduces, and it reproduces harder than the builder proved it: I ran a mutation test the builder
did not, deleting the one guard line, and six tests flip to red. The false reachability sentence was
corrected in place in both C6 records with the wrong sentence quoted, not deleted. Nits are
precision failures in the record, not in the code.

---

## A. PROOF AUDIT — every claimed command re-run by me, same command, true exit code

| Claimed proof | Re-run | Result |
|---|---|---|
| `node --import tsx --test apps/web/src/tests/paymentComposerReset.test.ts` | YES | `tests 17 / suites 4 / pass 17 / fail 0`, **TRUE EXIT=0** (`${PIPESTATUS[0]}`, not `$?` after a pipe). Both demanded titles present verbatim: `✔ перезагрузка сводки при том же пациенте сбросов не даёт вовсе`, `✔ на смене пациента не остаётся ни одного поля предыдущего`. REPRODUCES. |
| `npm run typecheck -w @dental/web` | YES | `> tsc -b --noEmit`, **TRUE EXIT=0**. REPRODUCES. |
| `npm test -w @dental/web` | YES | `tests 436 / suites 77 / pass 436 / fail 0`, EXIT=0 at HEAD `7d277108c`. Claim was 411/411 at their HEAD. **Arithmetic verified independently:** the C6 review measured 406; `6d97e0e7d` adds 8 `it(` and removes 3 → net +5 → **411**; the foreign `511403807` adds 25 `it(` to `panoramicArch.test.ts` → **436**. Exact. REPRODUCES. |
| Guard executed, not modelled (`node --import tsx -e`, 15 counting setters) | YES, own harness | `SENTINEL seed, mount id=pat-a -> reset: false | setter calls: 0` / `switch to pat-b -> reset: true | 15` / `same id pat-b -> false | 0` / `UNDEFINED seed, mount id=pat-a -> reset: true | 15`. All four claimed lines REPRODUCE. My two extra cases: `mount id=undefined -> false | 0`, then `real select pat-a -> true | 15`. `typeof sentinel: symbol`. Amount written on reset: `""`. |
| Non-vacuity vs pre-rework `d9c90d685` | YES, piped `git show` into stdin | `PRE-REWORK wiring guard matches: false` / `PRE-REWORK seed guard matches: false`; HEAD: `true` / `true`. REPRODUCES. **One number is mislabelled — see NIT 1.** |
| J.3 whitespace tolerance | YES, extended | Reproduces for the exact reformat claimed. **Residual gap — see NIT 2.** |
| DB: money type live on 127.0.0.1:5432 | YES, own `pg` client, connection string read from `.env`, never echoed | `rows: 2` / `cash_ledger.amount_rub = numeric(12,2)` / `payments.amount_rub = numeric(12,2)` / `postgres server_version: 18.4`. EXACT REPRODUCE. Kopecks are exact at the database, so resetting to `""` (not `0`, not `"0.00"`) is right, and the dossier's "amountRub is an integer" is wrong at the DB level too. |
| Encoding: 0 mojibake, 0 BOM | YES, own script, `[РС][-ÿ]` per AGENTS.md, plus the `РљР`/`вЂ`/`В«`/`РЎС` marker set | 0/0/clean on **10** files (they claimed 7): 3 source, 2 C6 records, 2 R3 records, 3 commitmsg files. All four commit subjects CLEAN. REPRODUCES. |

### The check the builder did NOT do, which I did — MUTATION TEST

The disease of this repo is a test that restates the code. The builder claims the helper now
*executes* production code. I proved it, out of the repo (no source touched): copied
`paymentComposerReset.ts`, `usePatientLogic.ts`, `useAppLogic.tsx`, `tests/paymentComposerReset.test.ts`
to `%TEMP%/r3-mut`, deleted exactly one line from the copy —

```
	if (previousPatientId === PAYMENT_COMPOSER_PATIENT_UNTRACKED) return false;
```

— and ran the suite against the mutant:

```
✖ перезагрузка сводки при том же пациенте сбросов не даёт вовсе
✖ сумма без выбранного пациента переживает монтирование
✖ вкладка «Зубная формула» заводит второй экземпляр контекста и сумму не стирает
✖ после монтирования второй экземпляр гасит форму на настоящей смене
✖ снятие выбора пациента очищает набранную сумму
✖ на смене пациента не остаётся ни одного поля предыдущего
ℹ tests 17 / ℹ pass 11 / ℹ fail 6      TRUE_EXIT=1
```

The guard line is load-bearing and the tests are pinned to it. Scratch tree removed afterwards; the
worktree is byte-identical to HEAD on every R3 file (`git diff HEAD -- <3 files>` empty), so all my
runs exercised the committed state.

---

## B. THE DEFECT WAS REAL BEFORE THIS COMMIT — verified, not read

`git show e90e1b276^:apps/web/src/hooks/domains/usePatientLogic.ts`:

```ts
	useEffect(() => {
		resetPaymentComposer(useDocumentStore.getState());
	}, [documentPatient?.id]);
```

Zero occurrences of any ref guard in that revision (`grep -c paymentComposerPatientIdRef` → 0).
A `useEffect` always runs on mount. The reviewer's BLOCKING 1 was real.

---

## C. REACHABILITY — traced myself, link by link, at HEAD. Not dead code.

Exactly **two** `useAppLogic()` consumer sites, `rg -n "useAppLogic\(\)" apps/web/src`:

```
apps/web/src/App.tsx:956                          const appLogicValue = useAppLogic();
apps/web/src/components/useVisitDiaryLogic.ts:27  const { activeDoctor } = useAppLogic();
apps/web/src/useAppLogic.tsx:933                  export function useAppLogic(): any {
```

Chain, every line number opened and confirmed EXACT:
`main.tsx:35-38` `<React.StrictMode><AppShell/>` → `App.tsx:956` → `useAppLogic.tsx:2383`
`const patient = usePatientLogic({` → `usePatientLogic.ts:233-235` (ref) + `:237-243` (guarded effect).
Second instance: `App.tsx:3745 <VisitView>` → `VisitView.tsx:353-355` renders `<VisitOdontogramTab>`
only while `visitSubViewTab === "odontogram"` (tab button `:313-322` `🦷 Зубная формула и Дневник`,
default `"emk"` at `:161`) → `VisitOdontogramTab.tsx:68-73 <VisitDiaryEditor>` when
`activeAppointment?.id` → `VisitDiaryEditor.tsx:103 useVisitDiaryLogic(visitId, patientId)` →
`useVisitDiaryLogic.ts:27 useAppLogic()` → the same guarded effect.
Money terminus: `useAppLogic.tsx:1830-1831` (`paymentAmount` / `setPaymentAmount`) →
`FinanceView.tsx:191 amount={paymentAmount}` / `:203 onAmountChange={setPaymentAmount}` →
`apps/web/src/PaymentCapture.tsx:619 id="payment-amount-input"` → POST `/api/billing/payments`.

**The mechanism that makes the fix actually work, which I verified rather than assumed:** `dashboard`
lives in the module-level zustand store (`appStore.ts:235-236`), destructured in `useAppLogic.tsx`
at `} = useAppStore();` (`:2158`). So the *second* instance sees the live, non-null dashboard on its
very first render; `documentPatient?.id` is the real patient at that instant; the fresh ref records it
and resets nothing. Had `dashboard` been per-instance `useState`, the second instance would have
mounted with `undefined`, then flipped to the real id one tick later, and the guard would have counted
that as a patient change and wiped the money anyway — the fix would have been theatre. It is not.

---

## D. ATTACKS THAT FAILED — the change survives these

- **"Real data, not the fixture" — transient `documentPatient?.id === undefined`: DISPROVED.** This was
  my main attack. `documentPatient = selectedPatient ?? activePatient` and `selectedPatient` is `null`
  while `!dashboard`, so any transient nulling of `dashboard` would produce TWO resets (id→undefined,
  undefined→id) and wipe typed money. `rg "setDashboard\(null\)"` returns exactly one site,
  `useAuthLogic.ts:196` (`lockTelegramAdminSession`, a deliberate session lock). `loadDashboard`
  (`useAppLogic.tsx:2709+`) never nulls: it has a stale-response sequence guard and only ever calls
  `setDashboard(payload)` on success, and on failure explicitly keeps the previous state. The dep is
  stable across refreshes. No spurious reset path.
- **Fix reachable, not dead code: CONFIRMED** (§C). Both directions still work: the root instance lives
  for the session, so a real patient switch still clears the form (C6's original defect stays closed),
  and the second instance no longer wipes on mount.
- **Hollow facade / magic constant / fabricated default: DISPROVED.** The diff adds one `unique symbol`
  (`Symbol("payment-composer-patient-untracked")` — a description string, not a magic value), two types,
  one interface, one 8-line function. No `{success:true}`, no placeholder, no hardcoded UUID/port/endpoint,
  no `// TODO`. `DEFAULT_PAYER_RELATIONSHIP` pre-existed C6.
- **Symbol identity across chunks: DISPROVED.** The only production importer of `paymentComposerReset.ts`
  is `usePatientLogic.ts` (`rg resetPaymentComposer`), which is reached only from `useAppLogic.tsx`.
  One module instance, one symbol; both effect instances seed and compare against the same one. Vite
  code-splitting cannot fork it.
- **God Context return block: UNTOUCHED.** The fix commit is 2 files and neither is `useAppLogic.tsx`.
  Nothing deleted or renamed; the 50+-file break is not in play.
- **Listener / interval / subscription / file handle without teardown: NONE.** The guarded effect
  registers nothing and needs no cleanup; the diff adds no timer, no subscription, no fetch.
- **Second owner: NO NEW ONE.** `resetPaymentComposerOnPatientChange` is the single decision function;
  `resetPaymentComposer` remains the single field list. The post-payment block still enumerates 14
  fields — pre-existing, declared as Долг 2, and now held by a value-checking guard (§E, J.4).
- **Deleted/renamed file: NONE.** No file removed; nothing to dangle.
- **Hardcoded hex / static px / new i18n debt: NONE.** Pure TS module, no JSX, no colour, no unit, no
  new user-visible string.
- **Mojibake: NONE** in any touched file or any of the four commit subjects (§A).
- **Circular dependency: impossible here.** `paymentComposerReset.ts` imports nothing. (`madge` absent
  per §11 — not held against the builder.)
- **StrictMode double-invoke (builder's own NOT-PROVEN item): safe by React semantics, and I agree with
  their reasoning.** StrictMode's simulated setup→cleanup→setup preserves refs, so the second setup sees
  `previous === current` and returns `false`. Not executed in a browser by either of us; correctly left
  in НЕ ПРОВЕРЕНО rather than claimed.
- **Reviewer option (b) DISPUTE: every element verified, dispute is CORRECT.** The only
  `AppLogicProvider` in `App.tsx` opens at `:4166` and closes at `:4703`, inside the
  `currentView === "settings"` branch (`:4164`, closing `) : null}` at `:4705`). `<VisitView>` renders at
  `:3745`, outside it. `contexts/AppLogicContext.tsx:20-22` returns `{} as AppLogicContextType` when
  there is no provider — **it does not throw**. `useVisitDiaryLogic.ts:128-131` refuses every save with
  «Выберите врача для приема» when `!activeDoctor`, and silently when `silent = true` (the 30 s
  autosave). Option (b) would have traded a retypable money wipe for silent loss of clinical diary text.
  The same provider gap is already documented in code at `App.tsx:3682-3683`,
  `VisitOdontogramTab.tsx:9-10`, `ScheduleView.tsx:91` and `LabOrdersPanel.tsx:48`. Refusing option (b)
  with evidence, instead of obeying the reviewer, was the right call.
  (Side observation, pre-existing: `apps/web/src/logic/AppLogicContext.tsx` is a second, entirely
  unused copy of the context — zero importers. Not R3's.)

---

## E. REVIEWER ITEMS — item by item, verified

| Item | Builder's disposition | My verdict |
|---|---|---|
| **I.1 BLOCKING** — stop the mount wipe; re-prove with mount-without-change (same id ⇒ 0 resets) | CLOSED | **CLOSED, VERIFIED.** Guard at `usePatientLogic.ts:233-243`; same-id mount ⇒ 0 resets and `12000,50` + ФН `9960440301234567` survive; real switch ⇒ exactly 1 reset with an exhaustive no-survivor sweep. Executed by me twice (suite + direct harness) and mutation-proven load-bearing. |
| **I.2 BLOCKING** — correct the reachability section of C6 `handoff.md` / `state.md` | CLOSED | **CLOSED, VERIFIED.** `625c2c486` adds a marked correction block to both, **quoting the wrong sentences verbatim** and giving the `rg` command plus the full mount chain. `state.md` annotation reads: *"The paragraph above is right about the mechanism and wrong to imply the shipped fix avoided it."* Corrected in place, not deleted. That is the standard this role exists to enforce, and it was met. |
| **I.1 option (b)** — point `useVisitDiaryLogic.ts:27` at `useAppLogicContext()` | DISPUTED with evidence | **DISPUTE UPHELD** — every cited line verified (§D). |
| **J.3 nit** — whitespace-tolerant regex | CLOSED | **CLOSED with a residual gap — NIT 2.** |
| **J.4 nit** — post-payment guard must assert the reset VALUE | CLOSED | **CLOSED, VERIFIED.** Guard builds `setX("<fresh value>")` from `emptyPaymentComposerFields()`, so `setPaymentAmount(paymentAmount)` no longer satisfies it. I read the real block: anchor `paymentMutationIdRef.current = null;` at `useAppLogic.tsx:12661`, 14 literal-valued setters at `:12662-12675` (including `setPaymentPayerRelationship("пациент")`), `await loadDashboard();` at `:12676`. The R3-corrected numbers are EXACT. |
| **J.5 nit** — soften "documentStore has no persist" | CLOSED | **CLOSED, VERIFIED EXACT.** `rg -c "persist|createJSONStorage"` on `documentStore.ts` → 0; `rg -n localStorage` → 0 direct hits; `documentStore.ts:44 const initialUiPreferences = loadUiPreferences();`; `:2127 paymentMethod: initialUiPreferences.paymentMethod`; `AppHelpers.tsx:4022-4031` reads `window.localStorage`. Every number right, and no money/fiscal field is seeded. |
| **§C FINDING 2** — post-payment reset still enumerates 14 fields inline | DECLARED DEBT (Долг 2) | **ACCEPTED.** The C6 review itself said unifying is not trivial because ordering with `setPaymentFeedback` is load-bearing — confirmed by reading `:12676-12678`: `loadDashboard()` then the feedback string. Mitigated by the value guard. Correctly declared, not silently skipped. |
| **§F** — line-number drift | CLOSED | **CLOSED**, and the builder's counter-correction is right: the review's own `usePatientLogic.ts:219-221` was off by one (`:219` is the comment terminator `*/`, the effect was `:220-222`). Verified against `e90e1b276^`. Ironically §F recurs once in the new record — NIT 3. |
| **§A / §G** — no action requested | re-derived independently | Accepted; I re-derived the two-call-site fact myself rather than trusting either record. |

**No reviewer item was silently ignored.**

---

## F. NITS (do not block the packet; fix in the record, not the code)

1. **`PRE-REWORK source bytes: 17266` is not bytes.** The blob is **20090 bytes**
   (`git cat-file -s d9c90d685:apps/web/src/hooks/domains/usePatientLogic.ts` = 20090; piped byte count
   = 20090; 0 CRLF). 17266 is the JS **string length** in UTF-16 code units — I confirmed
   `s.length === 17266` exactly, against 2815 non-ASCII characters in a Russian-commented file. The
   number is real and the load-bearing part (`guard matches: false`) reproduces; only the label is wrong.
   In a repo whose disease is fabricated proof, a number labelled with the wrong unit is a cheap way to
   lose a reader's trust.
2. **J.3 is closed for the reformat that was tested, not for every reformat.** The new regex tolerates
   newlines and indentation but still fails when a formatter adds a trailing comma inside the dep array,
   or splits the `useEffect` argument list:
   `dep array on own line, no trailing comma → true` (the claimed case, REPRODUCES);
   `dep array on own line WITH trailing comma → false`;
   `each useEffect arg on own line + trailing comma → false`.
   Downgraded to a nit because there is **no formatter configured in this repo** (`fd biome` finds no
   config; root `package.json` has no `format` script, `lint` is just `typecheck`), and because the old
   C6 literal regex failed all three variants. Strict improvement, incompletely characterised.
3. **§F drift recurs inside the correction.** R3 `handoff.md` Долг 4 cites
   `usePatientLogic.ts:42` for the `any` props. At HEAD `:42` is `setError,`; the annotation `}: any) {`
   is at `:46` (signature opens `:39`). Same class of slip the review flagged, in the handoff that closed it.
4. **C6 `handoff.md:153-154` still presents the wrong contract as verified.** The ПРОВЕРЕНО bullet reads
   *«четыре подряд загрузки при том же пациенте дают один сброс, а не четыре»* — one reset on mount is
   exactly what R3 established to be the defect (correct answer: zero). The top correction block explains
   the mount problem, but this specific bullet is not annotated, so a reader who skims ПРОВЕРЕНО can still
   take "1 reset" as the intended contract.
5. **C6 correction block does not name the revision its line numbers belong to.**
   `documentPatient — usePatientLogic.ts:112` is right for the C6-era file and is `:116` at HEAD, because
   R3's own 4-line import block shifted everything below it. Worth one clause ("at `d9c90d685`").
6. **`a9619b4c0` subject breaks the pattern of the other three:**
   `docs(paket R3): state.md log closed at final HEAD` — transliterated scope ("paket" not "пакет") and
   an English subject naming no defect. Still a valid Conventional Commit; cosmetic only.

---

## G. ACCURATE DISCLOSURE THAT DESERVES ITS OWN PACKET (not a defect of this one)

R3's «Найдено, не починено» is correct and I verified the shape. `usePatientLogic.ts:245-249` and
`:251-257` are the **same** unguarded-mount pattern, two and eight lines below the effect that was just
fixed:

```ts
	useEffect(() => {
		setPatientCoreDraft(patientCoreDraftFromPatient(selectedPatient));
		setPatientCoreSaveState("idle");
		setPatientCoreDirty(false);
	}, [selectedPatient?.id, selectedPatient?.updatedAt]);
```

`patientCoreDraft` and its dirty flag live in the shared module-level store
(`patientStore.ts:62 export const usePatientStore = create<PatientStore>((set) => ({` — cited exactly),
so mounting the second God Context from the same «Зубная формула и Дневник» tab overwrites an unsaved
patient-card edit (ФИО / телефон / ИНН / паспорт) with the saved values **and clears `dirty`**, which is
what suppresses any "unsaved changes" signal. Same silent-loss class, different lane (patient card, not
касса). The builder was right to declare it and right not to widen a MONEY packet into it. ARCHON should
raise it as a packet; the same `useRef` + first-run sentinel closes it.

## H. UNRELATED STANDING FAILURE FOUND WHILE PROBING (explicitly NOT R3's)

`node scripts/smoke-payment-capture-source.mjs` → **EXIT=1**, 8 assertions red, including
`Whole-ruble parser must reject commas, dots, signs and mixed text` and
`Whole-ruble parser must allow spaces as thousands separators`. That smoke still enforces the
pre-kopeck whole-ruble contract that `c28c9c532 fix(деньги): касса научилась принимать копейки`
(2026-07-27) deliberately replaced with `rubAmountInput.ts`. It reads `App.tsx`, `FinanceView.tsx`,
`main.css` — **none of the files R3 touched**, and R3 never touched `useAppLogic.tsx` at all, so R3
cannot have caused it. `node scripts/smoke-patients-usability-source.mjs` is also EXIT=1, on a
`PatientsView.tsx` needle (`className="patient-empty-state"`) — same verdict, not R3's. Flagged because
the MONEY lane's own source smoke is red and now contradicts the shipped kopeck contract, which §8b
("money is exact to the kopeck") makes a governance problem, not a cosmetic one.

---

## I. GIT HYGIENE — CLEAN

- `e90e1b276`: exactly 2 files — `components/finance/paymentComposerReset.ts` (+66),
  `hooks/domains/usePatientLogic.ts` (+25 −2). Nothing else.
- `6d97e0e7d`: exactly 1 file — `tests/paymentComposerReset.test.ts` (+148 −19).
- `625c2c486`: exactly 7 files — the 2 corrected C6 records + 5 R3 packet files. Nothing else.
- `a9619b4c0`: exactly 1 file — R3 `state.md`.
- **No churn swept in.** The worktree is dirty right now with exactly the known churn
  (`apps/api/.data/*.json`, ~40 `apps/api/dist/*`, `apps/web/tsconfig.tsbuildinfo`, `scratch/*`,
  plus three foreign `apps/web/src/*` files under another author's hand) and **none of it reached any of
  the four commits**. The shared-index contamination that hit cycle-1 commits did not recur.
- All R3 files are byte-identical between HEAD and the worktree, so every re-run above exercised the
  committed state.
- Conventional Commits: `fix(касса):` / `test(касса):` / `docs(пакет R3):` / `docs(paket R3):`.
  The first three carry Russian subjects that name the DEFECT, not the file, with long WHY bodies
  (§12 satisfied). No mojibake in any subject or body. Fourth subject: see NIT 6.
- Author `marko1olo` on all four — the repo-configured identity, same as every other packet this cycle.
- `git remote -v` NOT run (live tokens). No server started, no screenshot pipeline, no DB write; the
  only SQL was a read of `information_schema.columns`.

---

## J. WHAT REMAINS GENUINELY UNPROVEN (the builder's own list, which I endorse as honest)

The builder's НЕ ПРОВЕРЕНО is accurate and complete for the surface I could reach:
live browser behaviour of the React effect; StrictMode double-invoke on first paint of the diary tab;
UI VERIFIED (lead's); the payment request body (contract unchanged — verified, the diff touches no API
file); and removal of the duplicate God Context itself (Долг 1, with a falsifiable closing command:
`rg -n "useAppLogic\(\)" apps/web/src` must return only `App.tsx` and the declaration). Nothing was
claimed as executed that I could not execute, and nothing I executed contradicted a claim.

The one closing command the lead holds: 127.0.0.1:5173 → «Оплаты» → pick a patient → type `12000,50`
plus ФН/ФД/ФПД → «Приём» → tab «Зубная формула и Дневник» → back to «Оплаты» (fields must still be
filled) → switch patient (fields must clear).
</content>
