# R5-telegram-time-bugs — state

STATUS: DEFECT CONFIRMED
HEAD at start: d4029c0325184375242737931451bd1d97e9873e

## Collision check
`git status --porcelain` at start: NEITHER `apps/api/src/routes/telegram.ts` NOR
`apps/api/src/services/communications/dispatchWorker.ts` NOR `apps/api/src/routes/communicationsOutbox.ts`
is dirty. Only their generated `apps/api/dist/routes/telegram.js` is dirty (never stage dist).
No collision. Proceeding.

## AUTHORITY READ
.agents/AGENTS.md, .agents/INDEX.md, .agents/MESSENGERS.md, .agents/TELEPHONY_AND_PORTAL.md — all read complete.
.agents/archon/RECON_DOSSIER.md §5.7 read (lines 328-358); the three-bug bullet is at line 344-346.

## DEFECT CONFIRMATION — all three, at real lines

### (a) daily-digest dedup keyed on UTC date — SPLIT VERDICT
- `apps/api/src/telegram/outbox.ts:75` — `const digestDate = now.toISOString().split("T")[0];`
  then `:77` `const digestId = ` + "`staff_digest:${link.subjectId}:${digestDate}`" — **UTC date. REAL.**
  BUT the sole importer of `buildDenteTelegramOutboxItems` is `apps/api/src/telegram/benchmark.ts:2`.
  **No route imports it.** Verified: `rg -n "buildDenteTelegramOutboxItems|telegram/outbox"` returns only
  outbox.ts:19 (def), benchmark.ts:2 (import). NOT reachable by a patient or a member of staff.
- The LIVE digest dedup is `apps/api/src/sampleData.ts:9128-9130` `staffDailyDigestOutboxId()`, which keys on
  `appointmentClinicDateKey(now.toISOString())` -> `sampleData.ts:2185-2203`, which resolves
  `clinicProfile.timezone` through `validScheduleTimeZone()` + an `Intl` formatter.
  **This is ALREADY a configured clinic-local date key. Not UTC. Not a hardcoded +4.**
  => In the live path defect (a) is ALREADY FIXED. Dossier §5.7 line 344 is stale for the live path.
- Also: the digest subject is `subjectType: "staff"` — it never reaches a PATIENT's phone.

### (b) unparseable scheduledAt treated as DUE (fail-open) — REAL, FOUR SITES, LATENT
- `apps/api/src/routes/telegram.ts:530-533` `isDenteTelegramOutboxItemDue()`
  `return !Number.isFinite(scheduledAtMs) || scheduledAtMs <= nowMs;`  <- NaN => DUE
- `apps/api/src/sampleData.ts:9944-9945` `denteTelegramOutboxItemMatchesStatus()` status "due" — same
- `apps/api/src/sampleData.ts:10052-10055` `dueCount` — same, so the counter is inflated too
- `apps/api/src/sampleData.ts:9730-9731` `prepareDenteTelegramOutboxDelivery()` —
  `if (Number.isFinite(scheduledAtMs) && scheduledAtMs > Date.now())` blocks "not due yet";
  when NaN the guard is skipped entirely, so the last line of defence ALSO fails open.
  This one also protects the manual `POST /api/telegram/outbox/:itemId/send` route.
- REACHABILITY, honestly: every live producer of `scheduledAt` is defensive and ends in `.toISOString()`
  (`patientPaymentReminderScheduledAt` :8647, `recallScheduledAt` :8724, `reviewRequestScheduledAtFromBase`
  :8834, `postVisitInstructionScheduledAt` :8894, `appointmentReminderScheduledAt` :8941). The one
  passthrough is `scheduledAt: task.dueAt` (:9969); DB hydration guards it with `isoOrNow()`
  (`db/domainStateHydration.ts:579,102-104`). Shared schema is `scheduledAt: z.string()`
  (`packages/shared/src/index.ts:2337`) — NO datetime constraint, so nothing structurally prevents it.
  => fail-open by construction, but I found NO live producer today. LATENT, not currently firing.

### (c) partial "photo + text" delivery marked wholly failed -> retry re-sends the photo — REAL AND LIVE
- `apps/api/src/routes/telegram.ts:669-706` transport IIFE:
  `:672` `shouldSplitPhotoCaption = deliveryText.length > telegramPhotoCaptionMaxLength` (1024, `:79`)
  `:673` photo sent first; `:684` full text sent as a second message;
  `:691-693` when the TEXT send fails it pushes a warning and `return textTransport` — a NOT-ok result.
- `:708-734` `if (!transport.ok)` records `status:"failed"`, `telegramMessageId: null`,
  `blockedReason:"telegram_transport_failed"` for the WHOLE item. The photo message id is DISCARDED.
- `:542` `if (replay && !(replay.status === "failed" && clientMutationId?.startsWith("due-")))` and
  `sampleData.ts:8797` explicitly ARM a retry of failed `due-` deliveries.
  `dueOutboxClientMutationId(item.id, item.scheduledAt)` (`:525-528`) is STABLE, so the retry lands on the
  same receipt, is allowed through, and re-runs the transport IIFE FROM THE TOP ->
  **`sendTelegramPhotoMessage` fires a second time. The patient gets the photo twice.**
- Trigger is an everyday one: Telegram 429/timeout on the SECOND API call. `retryAfterDelayMs()` (`:842-853`)
  even schedules the retry for you.
- Confirmed the item survives to be retried: the failed path writes audit action
  `telegram_outbound_failed` (`sampleData.ts:9846-9849`), so `telegramOutboxItemAlreadySent()` stays false
  and `buildAllDenteTelegramOutboxItems` re-emits the item.

## DECISION
Fix **(c)**. Largest patient impact of the three and the only one that is live AND patient-facing:
(a) is already fixed in the live path and is staff-only, (b) is latent with no live producer.
Report (a) and (b) with exact file:line for the lead.

## EDIT WRITTEN — apps/api/src/routes/telegram.ts only
- new exported const `telegramPhotoSentTextFailedBlockedReason = "telegram_photo_sent_text_failed"`
- new warning builders `telegramPhotoPartialDeliveryWarning`, `telegramPhotoAlreadyDeliveredWarning`
- new exported `TelegramOutboxDeliveredParts` + `telegramOutboxDeliveredParts(receipt)` — reads the
  delivered-part flag from the receipt's blockedReason, NOT from message_id (Telegram can accept a photo
  and return no message_id; that delivery still happened)
- new exported `deliverTelegramOutboxParts(input)` — the photo/text sequence lifted out of the anonymous
  IIFE, with injectable senders so it is testable without calling api.telegram.org
- `executeTelegramOutboxSend` now feeds `telegramOutboxDeliveredParts(replay)` in, and on failure records
  `blockedReason = telegram_photo_sent_text_failed` + the photo's message id instead of
  `telegram_transport_failed` + null

## GATE PASSED
`npm run typecheck -w @dental/api` -> exit 2, but ZERO errors in my claim.
The only error is `src/speech/gateway.ts(1922,45) error TS2345` — `apps/api/src/speech/gateway.ts` is
DIRTY and is NOT mine (packet R6-speech-audio-retention is in flight). Verified with
`npx tsc -p tsconfig.json --noEmit | rg "routes/telegram"` -> NONE.
HEAD moved d4029c032 -> 1635a606f while I worked; `git diff -U0 -- apps/api/src/routes/telegram.ts`
hunk headers confirmed all 12 hunks are mine, no foreign content.

## COMMITTED 370d2f10f405a3b5839c9994c083a9284481297a
`[ARCHON] fix(телеграм): пациент получал фото второй раз, когда текст под ним не уходил`
`git log -1 --stat` verified: Russian subject intact (no mojibake), 1 file changed, only
apps/api/src/routes/telegram.ts.

## PROVEN
- UNIT VERIFIED: `node --import tsx --test apps/api/src/tests/telegramOutboxPartialDelivery.test.ts`
  -> `tests 8 / pass 8 / fail 0`, exit 0. Asserts the actual Telegram call SEQUENCE: on retry
  `calls.map(c => c.kind)` === `["text"]`, zero sendPhoto. No call to api.telegram.org.
- TYPECHECK VERIFIED: `npm run typecheck -w @dental/api` -> exit 0, zero errors (clean once the R6
  agent committed their gateway.ts in f0252c128).
- Full API suite: `npm test -w @dental/api` -> tests 911 / pass 910 / fail 1. The single failure is
  `dayConfirmations.test.ts:211` (clinic-timezone "tomorrow", actual 2026-07-29 vs expected 2026-07-28).
  NOT mine: both that test and routes/dayConfirmations.ts are CLEAN in git status (so it fails at HEAD
  without my edits) and the file contains zero telegram references.
- Second commit for the test: 86f39eccf.

## NOT PROVEN (exact closing commands in handoff.md)
- No real Telegram delivery (packet forbids it).
- The shared API server runs WITHOUT --watch, so it does not execute my edit; restarting it is not mine.
- Pre-fix runtime behaviour was NOT executed — the pre-fix block is a STATIC citation from
  `git show HEAD~2:apps/api/src/routes/telegram.ts | sed -n '666,700p'`.

## Log
- [x] STARTED
- [x] AUTHORITY READ
- [x] DEFECT CONFIRMED
- [x] EDIT WRITTEN
- [x] GATE PASSED
- [x] COMMITTED 370d2f10f405a3b5839c9994c083a9284481297a
- [x] PROVEN (test commit 86f39eccf)
- [x] DONE

## Handed to the lead, NOT fixed (deliberately — packet forbids half-fixing three things)
- (b) fail-open on unparseable scheduledAt, four sites: `routes/telegram.ts:554-557`,
  `sampleData.ts:9731`, `sampleData.ts:9945`, `sampleData.ts:10054`. Latent (no live producer found).
- (a) UTC digest key: `telegram/outbox.ts:75,77` — NOT reachable from any route (sole importer
  `telegram/benchmark.ts:2`). The LIVE digest key is already clinic-local. Dossier §5.7:344 corrected.
- Found in passing, outside claim: `routes/dayConfirmations.ts:93` computes "tomorrow" in UTC while the
  rest of the module works in the clinic timezone; its own test is RED on HEAD right now. Same defect
  family as (a), but live. Recommend a separate packet.
