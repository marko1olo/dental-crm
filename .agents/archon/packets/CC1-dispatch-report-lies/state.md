# CC1-dispatch-report-lies — state

STATUS: RESUMED (run 3) — finishing a half-written edit left by run 1's death
HEAD NOW (re-read run 3): d691c33410eb0316a66c38ff03c97945ea19530b
HEAD run 2: 7d5328f9fa8b4f00f79c133bf8f512e263dd4401
HEAD run 1: ed297c24f5a3649e04046798ea5144d601a4b507
`git log ed297c24f..HEAD -- <my 4 claimed files>` = EMPTY. No other author touched my claim.
Index EMPTY at run-3 start (the two foreign staged files named in the brief were committed by
their owner before run 1 started).

## On disk at run-3 resume, all inside my claim
  M appointmentReminders.ts (+121) — COMPLETE
  M dispatcher.ts (+83)            — COMPLETE
  M MessageDeliveryConsole.tsx (+17/-28) — **HALF WRITTEN, TREE IS RED**
  ?? deliveryReportNotice.ts (375 lines, new) — COMPLETE
NOT MINE, untouched: M components/communications/CampaignPanel.tsx (non-fleet author) + ~60 others.

## THE RED I INHERITED FROM MY OWN RUN 1 (must not be committed as-is)
MessageDeliveryConsole.tsx imports `Notice`/`failNotice`/`formatMoment` from ./deliveryReportNotice.js
at :26-34 AND STILL DECLARES `Notice` at :198 and `failNotice` at :201 — duplicate identifiers.
`countLabel` import was removed but is still called at :389. The file cannot compile.
This is exactly the cycle-10 failure mode. Finish, then compile, then commit.

## Authority read (complete)
.agents/AGENTS.md, .agents/INDEX.md, .agents/MESSENGERS.md (communications domain doc).

## Targets read IN FULL
- MessageDeliveryConsole.tsx (935 lines, whole file, twice)
- dispatcher.ts (817 lines, whole file)
- appointmentReminders.ts (whole file)
- communicationsOutbox.ts (951 lines, whole file; re-read :500-760 in run 3)
- deliveryPolicy.ts, channelRouter.ts (:121-175), dispatchWorker.ts (:125-229)
- tests/routes/communicationsOutbox.test.ts, tests/routes/appointmentReminders.test.ts
- styles/dente-operations.css (:441-510)

## Defects — all six CONFIRMED, plus three the brief did not name
1..6 CONFIRMED at the cited lines (see handoff.md for line-by-line).
7. NEW: `organizations === 0` (reminders OFF) => all-zero report, empty problems, calm grey
   «Поставлено напоминаний: 0.» Same family, not in brief.
8. NEW: `examined === 0` — legitimate calm outcome the screen never explains.
9. NEW: the SECOND-PRESS fix cannot be built from `report.claimed` alone. `summary.queued` from
   GET /api/communications/outbox conflates «backed off after a refusal» with «waiting for its
   scheduled time». Using it would paint a genuine success red — the brief forbids exactly that.
   The dispatcher must report the remainder itself, split by cause.

## Log
- [x] STARTED
- [x] AUTHORITY READ
- [x] DEFECT CONFIRMED
- [x] INVENTORY (in handoff.md + structured output)
- [ ] EDIT WRITTEN
- [ ] SELF-CHECK PASSED
- [ ] COMMITTED <hash>
- [ ] PROVEN
- [ ] DONE

## Run-3 remaining work, in order
1. dispatcher.ts: add `awaitingRetry` / `awaitingSchedule` to DispatchReport — the queue remainder
   AFTER the pass, EXCLUDING the ids this pass handled, split by `attempts > 0`. Both return paths.
2. deliveryReportNotice.ts: add the two fields to the mirrored type + voice table; drop
   `QueueAfterDispatch` (no longer needed — the report answers it).
3. MessageDeliveryConsole.tsx: delete the duplicate Notice/failNotice, wire both handlers.
4. New test apps/web/src/components/communications/deliveryReportNotice.test.ts.
5. node --import tsx --test on it + npx tsc --noEmit on the api file. THEN commit.

## About to run (slow-command log)
- npx tsc --noEmit --skipLibCheck on single files (fast, no shared state, writes no tsbuildinfo)
