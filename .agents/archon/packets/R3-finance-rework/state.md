# R3-finance-rework — state

STATUS: DONE — COMMITTED e90e1b2762d58a347b4fbfe9b13fc6558f6c3e6d (fix) + 6d97e0e7d (test)
+ docs commit below. PROVEN: 17/17 own tests, 411/411 web suite, typecheck EXIT 0.

- Packet: R3-finance-rework (rework of C6-finance-phantom-amount)
- Spec: .agents/archon/packets/C6-finance-phantom-amount/review.md
- Claim: usePatientLogic.ts, useVisitDiaryLogic.ts + payment-composer files touched by C6,
  tests/paymentComposerReset.test.ts
- Gate: npm run typecheck -w @dental/web

## Timeline
- STARTED — packet dir created, state.md written before any reading.
- AUTHORITY READ — .agents/AGENTS.md (complete), .agents/INDEX.md (complete),
  .agents/BILLING_AND_FINANCE.md (complete),
  .agents/archon/packets/C6-finance-phantom-amount/{review.md,handoff.md,state.md} (complete).

## Reviewer items to close (from review.md §I / §J)
- I.1 BLOCKING — mount-time wipe of the money input. Fix via first-run/prev-id ref guard at
  usePatientLogic.ts:219-221 or point useVisitDiaryLogic.ts:27 at useAppLogicContext().
  Must re-prove: mount with SAME id => 0 resets.
- I.2 BLOCKING — correct the reachability section of C6 handoff.md / state.md (useAppLogic() has
  TWO call sites; God Context is NOT mounted once per session).
- J.3 nit — make tests/paymentComposerReset.test.ts:218 regex whitespace-tolerant.
- J.4 nit — post-payment guard must assert reset VALUE, not just setter name.
- J.5 nit — soften "documentStore has no persist" (loadUiPreferences() seeds paymentMethod).

## Git state at start
- HEAD: d9c90d6852a5c17e7ce8c8f7af300940787e8673
- `git status --porcelain` on all claimed files: EMPTY (clean). Index empty. No collision.
- Worktree dirt is the known churn only: apps/api/dist/**, apps/api/.data/*.json,
  .agents/archon/progress.md. NEVER staged by me.

## DEFECT CONFIRMED (reviewer BLOCKING 1) — read at HEAD d9c90d685
- usePatientLogic.ts:220-222 (reviewer said 219-221, off by one; 219 is the comment `*/`):
  `useEffect(() => { resetPaymentComposer(useDocumentStore.getState()); }, [documentPatient?.id]);`
  No first-run guard => a `useEffect` always runs on mount => any fresh God Context instance
  wipes the money input + fiscal block of the SHARED documentStore.
- TWO `useAppLogic()` consumer call sites CONFIRMED by rg:
  App.tsx:956 `const appLogicValue = useAppLogic();`
  components/useVisitDiaryLogic.ts:27 `const { activeDoctor } = useAppLogic();`
  (definition at useAppLogic.tsx:933). So the God Context is NOT a session singleton.
- Mount chain confirmed at HEAD: App.tsx:3745 `<VisitView>` -> VisitView.tsx:353-355 renders
  `<VisitOdontogramTab>` only while `visitSubViewTab === "odontogram"` (tab button :313-322,
  default "emk") -> VisitOdontogramTab.tsx:68-73 renders `<VisitDiaryEditor>` when
  `activeAppointment?.id` -> VisitDiaryEditor.tsx:103 `useVisitDiaryLogic(...)` ->
  useVisitDiaryLogic.ts:27 `useAppLogic()` -> useAppLogic.tsx:2383 `usePatientLogic({...})` ->
  the effect. Tab click = mount = wipe.

## DECISION on the two reviewer options — option (b) is UNSAFE, evidence:
The ONLY `AppLogicProvider` in App.tsx opens at :4166 and closes at :4703, INSIDE the
`currentView === "settings"` branch (:4164). `<VisitView>` is rendered at :3745, OUTSIDE it.
contexts/AppLogicContext.tsx:18-23 `useAppLogicContext()` returns `{}` when there is no
provider (no throw). So pointing useVisitDiaryLogic.ts:27 at `useAppLogicContext()` would make
`activeDoctor` undefined on the live path and useVisitDiaryLogic.ts:128-131 would refuse every
diary save with "Выберите врача для приема" (silently for autosave, silent=true).
=> Taking reviewer option (a): first-run / previous-id ref guard. Option (b) declared as debt.

## EDIT WRITTEN
- apps/web/src/components/finance/paymentComposerReset.ts — added
  PAYMENT_COMPOSER_PATIENT_UNTRACKED (unique symbol), TrackedComposerPatientId,
  TrackedComposerPatientRef, resetPaymentComposerOnPatientChange(ref, patientId, setters):boolean.
  First run of an effect instance records the id and returns false (no reset); a real change
  (including -> undefined) resets and returns true.
- apps/web/src/hooks/domains/usePatientLogic.ts — `paymentComposerPatientIdRef` seeded with the
  sentinel; the effect now calls resetPaymentComposerOnPatientChange. Dep array unchanged.
- apps/web/src/tests/paymentComposerReset.test.ts — applyPatientSwitches now EXECUTES the
  production guard instead of modelling it; added the mount-with-same-id (0 resets, amount
  survives), no-patient mount, second-context-instance and post-mount-real-switch cases;
  wiring regex made whitespace-tolerant; post-payment guard now asserts the reset VALUE;
  new guard that the ref is seeded with the sentinel, not undefined.

## GATE PASSED
- `npm run typecheck -w @dental/web` -> `tsc -b --noEmit`, EXIT=0.
- `node --import tsx --test apps/web/src/tests/paymentComposerReset.test.ts`
  -> tests 17 / suites 4 / pass 17 / fail 0, EXIT=0.

## COMMITTED
- e90e1b2762d58a347b4fbfe9b13fc6558f6c3e6d — fix, 2 files, +89 -2. Index held only my two
  files (`git diff --cached --name-only` checked before the commit). Russian subject intact
  in `git log -1 --stat`.
- 6d97e0e7d — test, 1 file, +148 -19. Same check.

## PROVEN
- `npm test -w @dental/web` -> tests 411 / suites 73 / pass 411 / fail 0, EXIT=0
  (review had 406/406 before; +5 are mine, no foreign failure).
- Non-vacuity of the new source guards, `git show d9c90d685:...usePatientLogic.ts | node -e`:
  `PRE-REWORK wiring guard matches: false` / `PRE-REWORK seed guard matches: false`.
- Whitespace tolerance (J.3) executed, not asserted: new regex matches HEAD source AND the
  same code reformatted with the dep array on its own line (`true` / `true`), while the C6
  literal regex on that reformatted code returns `false`.
- Production guard executed (`node --import tsx -e`, read-only, 15 counting setters):
  sentinel seed + mount id=pat-a -> reset false, 0 setter calls;
  switch to pat-b -> reset true, 15 setter calls; same id -> false, 0 calls;
  UNDEFINED seed + mount id=pat-a -> reset true, 15 calls (sentinel is load-bearing).
- DB VERIFIED (127.0.0.1:5432, information_schema, connection string from .env, never echoed):
  `payments.amount_rub = numeric(12,2)`, `cash_ledger.amount_rub = numeric(12,2)`,
  `postgres server_version: 18.4`. Kopecks are exact => reset to "" (not 0) stays correct.
- Encoding: 0 mojibake lines, 0 BOM on all touched files (source, tests, both C6 records,
  both commit-message files).

## CLAIM EXTENSION — DECLARED, NOT HIDDEN
Reviewer item I.2 orders the reachability section of C6's handoff.md / state.md to be
corrected, so both files were edited:
- .agents/archon/packets/C6-finance-phantom-amount/handoff.md
- .agents/archon/packets/C6-finance-phantom-amount/state.md
Both were clean at HEAD before I touched them and re-checked immediately before staging.
No source file outside the claim was edited. useVisitDiaryLogic.ts was NOT edited — see the
DECISION block above (reviewer option (b) DISPUTED with evidence).

## DONE
- handoff.md written: .agents/archon/packets/R3-finance-rework/handoff.md
- Commit 3: 625c2c486667437ad5dbe2e5ab216f21b4846c70 — docs, 7 files, +551 -5
  (5 R3 packet files + the two corrected C6 records). Index held only those seven.
- Re-verified at HEAD 625c2c486 (after a foreign commit b4292f74d landed in between):
  `npm run typecheck -w @dental/web` EXIT=0; own test file 17/17 EXIT=0.
- Tree clean on every file I touched. Untracked review.md files of OTHER packets
  (C1-C6, P*, R1, R2) are not mine and were left alone; C6's own review.md — my
  specification — is still untracked in the repo, the lead may want it committed.
