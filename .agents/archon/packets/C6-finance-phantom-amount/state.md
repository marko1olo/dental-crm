# C6-finance-phantom-amount — state

STATUS: NEEDS_REWORK (разбор) -> закрыто пакетом R3-finance-rework
Time: 2026-07-28

## ПОПРАВКА R3: УТВЕРЖДЕНИЕ О ДОСЯГАЕМОСТИ БЫЛО НЕВЕРНЫМ
Сдача этого пакета утверждала, что God Context создаётся один раз при корне
приложения и смонтирован весь сеанс. Это неверно. `useAppLogic()` вызывается из ДВУХ
мест (`rg -n "useAppLogic\(\)" apps/web/src`): `App.tsx:956` и
`components/useVisitDiaryLogic.ts:27`. Второй экземпляр монтируется при каждом
открытии вкладки «Зубная формула и Дневник», а `useEffect` на первом прогоне
выполняется всегда — поэтому добавленный здесь сброс стирал набранную сумму и
фискальный блок без всякой смены пациента. Закрыто в R3: `e90e1b276` (починка),
`6d97e0e7d` (замок).

## Claim / gate
Claim as issued: apps/web/src/FinanceView.tsx and/or apps/web/src/components/finance/**
Gate:  npm run typecheck -w @dental/web  -> EXIT 0 (twice)
HEAD at start: 26f1f3c59f5f64b3a4caa83ec2f6e05a03e14b88 (claimed files clean)
HEAD at end:   a4907fe624759209dfda47c04fbff0c192e81f14

## CLAIM EXTENSION — DECLARED, NOT HIDDEN
The prefill did not live in the claimed files. Files actually edited:
- apps/web/src/components/finance/paymentComposerReset.ts  NEW, IN CLAIM
- apps/web/src/tests/paymentComposerReset.test.ts          NEW, proof file
- apps/web/src/hooks/domains/usePatientLogic.ts            OUT OF CLAIM — the defect site
- apps/web/src/useAppLogic.tsx                             OUT OF CLAIM — 7 vestigial keys
                                                           removed from the call site at
                                                           :2378-2392; God Context return
                                                           block NOT touched
All four were clean before I touched them and were re-checked immediately before staging.
FinanceView.tsx was NOT edited: a reset placed there would fire on every lazy remount of
the finance chunk and wipe an amount the cashier had already typed after merely visiting
the patient card and coming back. That would be a new defect, not a fix.

R3 CORRECTION: that hazard was named correctly and then shipped anyway. The effect in
usePatientLogic.ts had no first-run guard, and useAppLogic() is instantiated a second time
by useVisitDiaryLogic.ts:27 — so opening the visit-diary tab remounted the effect and wiped
the money input exactly as described above, just from a different mount point. The paragraph
above is right about the mechanism and wrong to imply the shipped fix avoided it.

## FINDING 1 — THE LITERAL 3800 IS ALREADY GONE (packet items 1-2)
Source WAS documentStore.ts initial state: `paymentAmount: "3800"`,
`refundAmountRub: "3800"`. Case = hardcoded literal left over from demo data.
Fixed at HEAD by non-fleet author marko1olo, commit 0baa1f723 (2026-07-28 01:13:43).
Screenshot .dente-redesign-shots/desktop_light_finance.png is dated 2026-07-27 04:02:26 —
older than the fix. The lead read a stale plate.

## FINDING 2 — THE LIVE DEFECT, FIXED (packet item 3, branch "stale state")
usePatientLogic.ts:199-207 cleared 6 of 14 payment-composer fields on patient change.
Omitted paymentAmount and all 7 fiscal fields. Canonical fresh composer is the
post-payment reset at useAppLogic.tsx:12661-12677, which clears all 14.
Cause: setters were prop-injected one by one; 6 were passed, so 6 were cleared.

## FINDING 3 — packet item 5, money type CONFIRMED
rubAmountInput.ts:20-33 — kopecks ARE supported, string field, Math.round(rub*100)/100.
Dossier's "amountRub is an integer" is WRONG at HEAD. Reset value is "" not 0.

## FINDING 4 — adjacent defects (packet item 4, reported only)
- Clipped placeholder «Пример: Оплата 5000 ка»: ALREADY FIXED, PaymentCapture.tsx:558-566.
- Five ungrouped clusters, two unlabelled: LIVE. PaymentCapture.tsx:597-601 and :632-656
  have no aria-label; :660 and :288 do. Not fixed — one defect per packet.

## Log
- [x] STARTED
- [x] AUTHORITY READ (AGENTS.md, INDEX.md, BILLING_AND_FINANCE.md, VISUAL_VERDICT A2)
- [x] DEFECT CONFIRMED (usePatientLogic.ts:199-207); original literal ABSENT
- [x] EDIT WRITTEN
- [x] GATE PASSED (npm run typecheck -w @dental/web, EXIT 0)
- [x] COMMITTED 8f9243bddfa9704952ff4ca5fe17fe7d5d0f8ac8  (fix, 3 files, +158 -21)
- [x] PROVEN     a4907fe624759209dfda47c04fbff0c192e81f14  (test, 1 file, +241)
                 node --import tsx --test apps/web/src/tests/paymentComposerReset.test.ts
                 -> tests 12 / pass 12 / fail 0, EXIT 0
                 Guard proven non-vacuous against pre-fix 26f1f3c59: 8/14 fields uncleared,
                 regex guard returns false on that source.
- [x] DONE       handoff.md written. Tree clean on every file I touched.
- [x] REVIEWED   NEEDS_REWORK — review.md. Fix real and reproducible, but it wiped the money
                 input on mount and the reachability claim was the opposite of the truth.
- [x] REWORKED   R3-finance-rework: e90e1b276 (first-run guard), 6d97e0e7d (test executing the
                 production guard: mount with the same id -> 0 resets, real switch -> 1 reset
                 and no field of the previous patient survives). 17/17 pass, full web suite
                 411/411, typecheck EXIT 0. Reachability corrected here and in handoff.md.
