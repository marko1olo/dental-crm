# S5-telegram-rework — state

STATUS: DEFECT CONFIRMED
Packet: S5-telegram-rework (rework of R5-telegram-time-bugs)
Lane: COMMS

## HEAD
- HEAD when the FIRST S5 attempt started (it died before writing any edit): c78243b54
- HEAD now, re-derived live: 723e09fa3e237f94a38288f0a89210240a5b96e6
- The previous state.md said `apps/api/src/sampleData.ts` was DIRTY and un-editable. **Not true at
  723e09fa3** — the other agent committed; sampleData.ts is absent from `git status --porcelain`.

## AUTHORITY READ (this attempt, complete)
.agents/AGENTS.md (162), .agents/INDEX.md (28), .agents/MESSENGERS.md (112 — line 4: Telegram is NOT
covered there, line 13 points at apps/api/src/routes/telegram.ts),
R5 review.md (243, MY SPEC), R5 handoff.md (226), R5 state.md (131).

## COLLISION CHECK at 723e09fa3 — `git status --porcelain -- <file>` per file
CLEAN: routes/telegram.ts, tests/telegramOutboxPartialDelivery.test.ts, apps/web/src/AppHelpers.tsx,
sampleData.ts, routes/communicationsOutbox.ts, services/communications/dispatchWorker.ts,
useAppLogic.tsx, packages/shared/src/index.ts.
`git diff --cached --name-only` — EMPTY. No collision.
NOTE: `components/settings/SettingsTelegramTab.tsx` is the non-fleet author's zone — I will NOT edit it.

## DEFECT CONFIRMATION — routes/telegram.ts read IN FULL (2781 lines) at 723e09fa3

### (b) unreadable scheduledAt fails OPEN — CONFIRMED at real lines
- `routes/telegram.ts:554-557` `isDenteTelegramOutboxItemDue`:
  `return !Number.isFinite(scheduledAtMs) || scheduledAtMs <= nowMs;` -> NaN == "due".
  Consumed at `:909` by `executeDenteTelegramOutboxDueBatch` (worker + POST /outbox/send-due).
- `sampleData.ts:9729-9730` `prepareDenteTelegramOutboxDelivery`:
  `if (Number.isFinite(scheduledAtMs) && scheduledAtMs > Date.now())` — NaN skips the guard entirely.
  This is the last line of defence and it also guards POST /outbox/:itemId/send.
- `apps/web/src/AppHelpers.tsx:2424-2427` `isTelegramOutboxItemDueForUi` — SAME fail-open, not named by
  R5 or by the review. Consumers: `SettingsTelegramTab.tsx:1075` (send button `disabled` when NOT due)
  and `useAppLogic.tsx:4590-4598` ("due" filter). Today the send button is ENABLED for an unreadable time.
- REACHABILITY, honest: NO live producer. Every producer is defensive and ends in `.toISOString()` —
  I checked the three R5 never checked: `taxApplicationScheduledAt` (sd:8983-8991),
  `documentReadyScheduledAt` (sd:9061-9065), `postVisitCheckupScheduledAt` (sd:9270-9281) all
  `Date.parse` + `Number.isFinite` fallback. The one passthrough `scheduledAt: task.dueAt` (sd:9969):
  every in-memory writer uses `now` (sd:7084,7100,7589,7605,8044,8060,8352,8368) and DB hydration is
  `isoOrNow(task.dueAt)` (domainStateHydration.ts:580 -> :96-105, Date+NaN checked). LATENT by
  construction. I will NOT claim it is live.

### F1 reachability-overclaim — CONCEDED, re-measured myself
`.tmp/s5-caption-measure.cjs` (read-only, source only) — longest literal in routes/telegram.ts = 288;
worst composed webhook reply = 461 (`careTopicReplyFor`), 352 (`documentSubmenuReplyFor`); absolute
2-literal ceiling = 522. Threshold is 1024 (`telegram.ts:88`). So the split branch (`:634`) is NOT
reachable from real config — the reviewer is right. **Same measurement also kills reviewer note H5**:
`sendWebhookSuggestedReply` (`:2246-2280`) has no 1024 caption check, but its ceiling is 522, so it
cannot get a 400 either. I will NOT expand scope there; I will report the number.

### F2 operator-signal-regression — CONFIRMED
`AppHelpers.tsx:2394-2409` `telegramBlockedReasonLabels` has NO `telegram_photo_sent_text_failed`
entry; `telegramHumanMessage:2415-2422` therefore returns "Нужна проверка настройки Telegram."
`useAppLogic.tsx:13169` `const reason = telegramHumanMessage(result.blockedReason) || warning;` —
warnings are dropped whenever a reason exists. Confirmed by reading both files.

### F3 residual-double-send — CONFIRMED
`useAppLogic.tsx:13140-13143` mints a fresh `crypto.randomUUID()` per click; the marker is keyed on the
PAIR via `findDenteTelegramOutboxDeliveryReceipt` (`sampleData.ts:8776-8786`, map lookup on
`${outboxItemId}:${clientMutationId}`), consumed at `telegram.ts:809`. Receipt cap
`denteTelegramOutboxDeliveryReceipts.splice(200)` at `sampleData.ts:8817`.
`denteTelegramOutboxDeliveryReceipts` IS exported (`sampleData.ts:243`) => an item-scoped scan is
possible from routes/telegram.ts with NO edit to sampleData.ts. All outbox ids embed entity UUIDs
(sd:8617, 8705, 8891, 8938, 9058, 9129, 9257) so an id-scoped scan cannot cross tenants.

### F4 — CONFIRMED BY RUNNING IT
`node scripts/smoke-telegram-control-ui-source.mjs` -> EXIT=1,
`ENOENT ...apps/api/drizzle/0008_document_payload_storage.sql`. File is gone; `0008_add_settings.sql`
is the current 0008. Pre-existing, outside my claim.

### Timezone question — R5's dossier correction STANDS, verified at the line
`sampleData.ts:9129` `staff-digest:${appointmentClinicDateKey(now.toISOString())}:${staffId}` —
clinic-local key, not UTC. `telegram/outbox.ts:75` UTC key is real but unreachable: sole importer is
`telegram/benchmark.ts:2` (`git grep -n buildDenteTelegramOutboxItems HEAD -- apps/` returns only the
definition and that import — dist is no longer tracked since 589d63a4d). ZERO UTC-day logic inside
routes/telegram.ts (`grep toISOString().split|slice(0,10)` -> none).

## PLANNED EDITS (inside claim + AppHelpers.tsx, which the review names for F2)
routes/telegram.ts: `telegramOutboxScheduleState` 3-state classifier, fail-closed due check, refusal
with `telegram_outbox_schedule_unreadable` on BOTH send entry points, unreadable items surfaced as
blocked results in the due batch, item-scoped `telegramOutboxDeliveredPartsForItem`.
AppHelpers.tsx: register both blocked-reason labels (F2) + fail-closed `isTelegramOutboxItemDueForUi`.

## EDIT WRITTEN
apps/api/src/routes/telegram.ts + apps/web/src/AppHelpers.tsx. See PLANNED EDITS above.

## GATE PASSED
`npm run typecheck -w @dental/api` -> EXIT=0, zero errors (log .tmp/s5-tc-api.txt).
`npm run typecheck -w @dental/web` -> EXIT=1, but ZERO errors in my claim: all 6 errors are
`src/DocumentsView.tsx ... Cannot find name 'AnamnesisField'` — DocumentsView.tsx is DIRTY and
components/documents/AnamnesisField.tsx is UNTRACKED, i.e. another agent's in-flight edit.
`grep -c AppHelpers .tmp/s5-tc-web.txt` -> 0.

## NEXT: commit code before proofs

## COMMITTED 3c5189471e1c6c137a5586eaaf2c3635f380ae3b
`[ARCHON] fix(телеграм): нечитаемое время отправки считалось наступившим, а фото уходило дважды`
`git log -1 --stat`: 2 files changed, 127 insertions(+), 9 deletions(-) — ONLY
apps/api/src/routes/telegram.ts (+115) and apps/web/src/AppHelpers.tsx (+21). No dist, no .data,
no tsbuildinfo, no scratch, no foreign file. Russian subject and body render as readable Cyrillic.
Known cosmetic blemish in the body: "обa" carries a Latin 'a' (typo, not mojibake). Not amended —
history is not rewritten for a cosmetic character.

## NEXT: proofs (node:test with a FIXED CLOCK), then second commit for the test

## PROVEN
- UNIT VERIFIED: `node --import tsx --test apps/api/src/tests/telegramOutboxPartialDelivery.test.ts`
  -> TRUE_EXIT=0, tests 18 / suites 3 / pass 18 / fail 0. Fixed clock, no Date.now() in new tests.
- TYPECHECK VERIFIED: `npm run typecheck -w @dental/api` -> EXIT=0.
- Full API suite: `npm test -w @dental/api` -> TRUE_EXIT=0, tests 949 / suites 154 / pass 949 / fail 0.
- F1 measurement: `node .tmp/s5-caption-measure.cjs` -> EXIT=0 (read-only).
- F4 confirmed by running it: smoke -> EXIT=1 ENOENT.
- Test commit 1837a78780ef73f11d2b321f0100519e2a16ce7e.
- SHARED INDEX REPORT: before the test commit `git diff --cached --name-only` carried two S6 files
  (packets/S6-speech-audio-rework/commitmsg-test.txt, apps/api/src/speech/tests/assemblyAiRetention.test.ts).
  NOT unstaged, NOT reset. My pathspec commit took exactly 1 file.

## NOT PROVEN (closing commands in handoff.md)
- The refusal inside executeTelegramOutboxSend and the blocked-result emission in the due batch are
  STATIC (read at the line), not executed: reaching deliveryStatus "ready" needs bot token + active
  chat link + decryptable transport ref from env.
- No real Telegram delivery. Shared server does not run my code (no --watch). No UI claim (lead only).

## DONE
handoff.md written. R5's handoff.md corrected with a 4-point block naming the false sentences.

## FINAL
Docs commit e5fffd992 (6 files, all mine: my packet dir + the 25-line correction block in R5/handoff.md).
HEAD kept moving under me (other packets): 723e09fa3 -> ... -> 87bf14e98.
`npm run typecheck -w @dental/api` re-run at 87bf14e98 -> TRUE_EXIT=0.
Mojibake sweep over all 798 added lines of my three commits: 0 cp1252 markers, 0 U+FFFD, 0 legacy.
Probes under .tmp/ (gitignored) deleted. My files clean vs HEAD.
STATUS: DONE
