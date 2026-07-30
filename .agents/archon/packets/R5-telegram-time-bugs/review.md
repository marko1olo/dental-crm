# ADVERSARIAL REVIEW — packet R5-telegram-time-bugs

Reviewer: adversarial subagent (did NOT write the code). Posture: disbelief.
Commit under attack: `370d2f10f405a3b5839c9994c083a9284481297a`
Repo HEAD at review time: `f93ffbf93fe5d63303a75eebdbf391008e306393` (moved under me again; other agents committing)

VERDICT: **NEEDS_REWORK** — not because a proof was faked (none was), but because the central
*impact* claim ("reachable by a real patient", "the patient got the photo, then got it again, on
every tick") is falsified by measurement, and the change ships an unlabelled `blockedReason` that
degrades the operator-visible message.

---

## 1. What the commit actually is

`git show 370d2f10f --stat` -> `apps/api/src/routes/telegram.ts | 197 ++--`, 1 file, +156/-41.
7 hunks at -U3, **12 hunks at -U0** — matches the builder's "12 hunks" claim exactly.

Three commits, file scope exactly as claimed:
- `370d2f10f` fix — 1 file, `apps/api/src/routes/telegram.ts`
- `86f39eccf` test — 1 file, `apps/api/src/tests/telegramOutboxPartialDelivery.test.ts` (+275)
- `0f3bc9c38` docs — 5 files, all under `.agents/archon/packets/R5-telegram-time-bugs/`

No `apps/api/dist/**`, no `apps/api/.data/*.json`, no `*.tsbuildinfo`, no `scratch/**`, no foreign
author's file in any of the three. The working tree carries a large amount of unstaged `dist/**` and
`.data/*.json` churn from the shared dev server — **none of it was swept into these commits.** Clean.

Substance: the anonymous IIFE inside `executeTelegramOutboxSend` that ran "sendPhoto then sendText"
was lifted into an exported, sender-injectable `deliverTelegramOutboxParts` (telegram.ts:623) that
returns `{transport, warnings, delivered}` instead of only the last transport result. The failure
path now stamps `blockedReason = "telegram_photo_sent_text_failed"` plus the delivered photo's
`message_id` onto the receipt; `telegramOutboxDeliveredParts()` (telegram.ts:577) reads that marker
back and the retry skips `sendPhoto`.

---

## 2. PROOF AUDIT — every claimed command re-run, same command, true exit code

| claimed proof | my re-run | verdict |
|---|---|---|
| `node --import tsx --test apps/api/src/tests/telegramOutboxPartialDelivery.test.ts` -> exit 0, `tests 8 / pass 8 / fail 0` | **EXIT=0**, `tests 8 / suites 1 / pass 8 / fail 0`, all four named assertions present verbatim | REPRODUCED |
| `npm run typecheck -w @dental/api` -> EXIT=0, zero errors | **EXIT=0**, output is the npm banner + `tsc -p tsconfig.json --noEmit`, nothing else | REPRODUCED |
| `npm test -w @dental/api` -> `tests 911 / pass 910 / fail 1` (`dayConfirmations` clock flake, not mine) | **EXIT=0**, `tests 918 / suites 148 / pass 918 / fail 0`. The cited test `по умолчанию берётся завтрашний день в поясе клиники` is now GREEN (`/tmp/r5_full.txt:1415`) | REPRODUCED AND BETTER — the failure was a genuine wall-clock-boundary flake, independently confirmed as not the builder's (it fails/passes purely by time of day; count rose 911->918 because other agents landed tests) |
| STATIC citation of pre-fix behaviour via `git show HEAD~1:...` | `git show 370d2f10f^:apps/api/src/routes/telegram.ts` reproduces the quoted block byte-for-byte: `if (textTransport.ok) return textTransport;` / `deliveryWarnings.push(...); return textTransport;`, and `:708-734` writes `status:"failed"`, `telegramMessageId: null`, `blockedReason:"telegram_transport_failed"` for the whole item | REPRODUCED, and correctly self-labelled STATIC |
| Mojibake: 0 cp1252 markers, 0 U+FFFD in both source files and all commit messages | own script `.tmp/mojibake.cjs`: all 3 commit messages 0/0, 156 added diff lines 0/0, both files 0/0 | REPRODUCED |

No fabricated proof found. Every runnable claim reproduces on the same command. The four
NOT-PROVEN items are correctly scoped and each carries a real closing command. The load-bearing
design justification also holds: `telegramTransport.ts:100-107` returns `ok:true` with
`telegramMessageId: telegramMessageIdFromPayload(payload)` which **can be null**, so keying the
delivered-part flag on `blockedReason` rather than on message-id presence is correct, not cargo cult.

Every deferred-defect citation in `handoff.md` verifies at the exact line:
`sampleData.ts:9731`, `:9945`, `:10054`, `routes/telegram.ts:554-557`, `telegram/outbox.ts:75`,
`:77`, and "sole importer is `telegram/benchmark.ts:2`" (`rg` returns only the definition and that
one import). This is the opposite of the fabricated-citation disease. Credit.

---

## 3. FALSIFIABLE HYPOTHESES — what I actually tested

### H1. Was the defect real before this commit? — **CONFIRMED (logic), see H3 for impact**
Pre-fix source confirms all four links of the chain, each at a real line:
1. IIFE returns `textTransport` (not-ok) when photo succeeded and the split text failed.
2. Caller writes `status:"failed"`, `telegramMessageId:null` for the entire item.
3. `telegram.ts:675` lets a `failed` + `due-` receipt through the replay guard.
4. `sampleData.ts:8797` `claimDenteTelegramOutboxDeliveryReceipt` returns `null` (allows through) for
   exactly that pair — verified by reading, and it returns *before* mutating, so the marker survives.
5. `telegramOutboxItemAlreadySent` (`sampleData.ts:8878-8885`) only matches
   `telegram_outbound_sent`, so a failed attempt does not remove the item — retry is genuinely armed.
6. `dueOutboxClientMutationId` (`telegram.ts:549-552`) is a sha256 of `id:scheduledAt` — stable.

So the logic bug was real and the retry loop was real. **Also note the zod gate is safe**: the new
reason flows through `denteTelegramOutboxSendResponseSchema` where `blockedReason` is
`z.string().nullable()` (`packages/shared/src/index.ts:2395`) — no runtime parse throw. I checked
this specifically because an enum there would have turned the failure path into a 500.

### H2. Is the fix reachable by a real user? — **PARTIALLY DISPROVED. This is the finding.**
The *function* is live: `server.ts:41/484` -> `startDenteTelegramOutboxDueWorker` ->
`executeDenteTelegramOutboxDueBatch` -> `executeTelegramOutboxSend` -> `deliverTelegramOutboxParts`
(telegram.ts:801), plus `POST /api/telegram/outbox/send-due` (telegram.ts:2632) and
`POST /api/telegram/outbox/:itemId/send` (telegram.ts:2617). That part of the builder's claim holds.

**But the only branch where a partial delivery can occur is `shouldSplitPhotoCaption === true`
(telegram.ts:634, `input.text.length > 1024`), and I could not make real config reach it.**

The builder's reachability claim says: *"Item eligibility needs a photoUrl plus a rendered text over
1024 chars — both are produced by the real visual-card templates."* The second half is false.

`prepared.text` is `item.previewText`, and `previewText` has exactly ONE producer in the live path —
`sampleData.ts:8604 previewText: preview.text` from `buildDenteTelegramMessagePreviewData`
(`sampleData.ts:6469-6628`). Every one of the 11 photo-bearing template kinds
(`patientVisualTemplateKinds` + `staffVisualTemplateKinds`, `sampleData.ts:6666-6680`) is a single
short sentence whose only unbounded inputs are `clinicName` and `portalUrl`.

I ran the real exported builder with the **maximum values the write schemas allow** —
`clinicName` 240 (`packages/shared/src/index.ts:4290` `z.string().trim().min(1).max(240)`),
portal URL 497/500 (`:2135` `z.string().trim().max(500)`), counts 999999:

```
appointment_reminder        len=369   split(>1024)=false
appointment_confirmation    len=331   split(>1024)=false
payment_reminder_notice     len=822   split(>1024)=false
document_ready_notice       len=572   split(>1024)=false
tax_document_request_status len=597   split(>1024)=false
callback_request_received   len=78    split(>1024)=false
post_visit_instruction_link len=562   split(>1024)=false
post_visit_checkup          len=627   split(>1024)=false
recall_notice               len=826   split(>1024)=false
review_request              len=303   split(>1024)=false
staff_daily_digest          len=196   split(>1024)=false

MAX=826 kind=recall_notice splitReachable=false
```
(`node --import tsx .tmp/r5probe.mts`, EXIT=0, `DENTAL_STATE_PERSISTENCE=off` so nothing was written.)

**Ceiling is 826 characters. The 1024 caption limit is never crossed.** `repairMojibakeText`
(telegram.ts:799) can only shrink, never grow, so it cannot lift the ceiling either.

The only way in: `apps/api/src/db/domainStateHydration.ts:305` does
`clinicProfile.clinicName = organization.name;` with **no length check**, and
`organizations.name` is `text("name").notNull()` (`db/schema.ts:211`) — unbounded in Postgres. So the
240 cap is bypassable via the DB. Arithmetic on the worst template (`recall_notice`: 89-char literal
skeleton + clinicName + portalUrl): you need `clinicName + portalUrl > 935`, i.e. **a clinic name of
~436+ characters together with a near-max 500-character portal URL**. That is not a clinic
configuration; that is a fuzz input.

Supporting (secondary) evidence from the live persisted config
`apps/api/.data/dental-crm-state.json`: `welcomeImageUrl: null` and **all eight `visualCardUrls` are
null**, `patientPortalBaseUrl` length 0, `clinicName` length 23. With no visual card configured
`photoUrl` is null for every item (`sampleData.ts:6681-6686`, `:6839`) so the photo branch is not
entered at all today. Caveat, stated honestly: that file is a snapshot and DB hydration can override
it at request time — which is why the 826 ceiling, not this snapshot, is the load-bearing argument.

Consequence: **the builder rejected (b) as "latent, no live producer found" and then fixed a defect
that is latent for the same class of reason.** The selection rationale in `handoff.md:45-48` ("(c) is
the only one that is simultaneously live, patient-facing and self-repeating") does not survive
measurement. The code is correct; the sold impact is not.

### H3. Does it hold on real data, not just the fixture? — **the fixture is the only place it holds**
`longPatientText` in the test is 1220+ chars, built by `"...".repeat(20)`. Test 1
(`telegram.ts` fixture line 85-90) even asserts `length > 1024` "or the branch isn't exercised" —
the builder noticed the branch needs a long text and manufactured one, without ever asking whether
production can produce one. That is precisely the cycle-2 panorama shape, inverted: passes every
test, cannot fire on real input.

### H4. Hollow facade? — **NO**
No `{success:true}` over a no-op, no placeholder, no magic constant, no hardcoded UUID/port/endpoint,
no fabricated default standing in for an unknown. The new constant
`telegramPhotoSentTextFailedBlockedReason` is a real discriminator that is read back. The behaviour
is genuinely implemented. All other branches are preserved: I diffed them by hand — short caption ->
single call and early return; photo rejected -> `telegramPhotoFallbackWarning` then text; no photo ->
text only. Warning *content* is unchanged; the failure path gains two extra warnings (additive).

### H5. Second owner of something that already had one? — **NO for the fixed path**
`deliverTelegramOutboxParts` replaces the IIFE; there is exactly one caller (telegram.ts:801).
Adjacent, pre-existing, NOT this commit's fault but worth the lead's attention:
`sendWebhookSuggestedReply` (telegram.ts:2246-2280) is a second photo-then-text sequence that passes
`caption: text` with **no 1024 check at all** — a long reply gets a Telegram 400 and silently falls
back to text-only, dropping the visual card. It was left un-migrated to the new function.
`apps/api/src/sampleData_opt.ts` (unreferenced 429 KB duplicate, `:6254`, `:7087`, `:7101`) still
carries the old shape; the builder declared this in `handoff.md:198-200`.

### H6. `useAppLogic.tsx` return field deleted/renamed? — **NO.** The commit touches only
`apps/api/src/routes/telegram.ts`. Nothing in `apps/web/**`.

### H7. Listener / interval / subscription / handle without teardown? — **NO**
`telegramOutboxDeliveryClaims.delete(claimKey)` is still in a `.finally()`, now attached to the
`deliverTelegramOutboxParts(...)` promise (telegram.ts:810-812). `deliverTelegramOutboxParts` is an
`async function`, so it always returns a promise and the `finally` always runs, including on a
sender rejection. No new timers, listeners or handles.

### H8. Hardcoded hex / static px / undeclared i18n debt? — see finding F2. Two new Russian
literals were added in the API layer next to ~a dozen identical existing ones, and the builder
**declared** that debt itself (`handoff.md:220-224`). Not a hidden violation.

### H9. Mojibake? — **NO.** 0 cp1252 markers, 0 U+FFFD, 0 `вЂ/В«/В»` markers across all three
commit messages, the 156 added diff lines, and both files at HEAD.

### H10. Deleted file still referenced? — N/A, nothing deleted.

---

## 4. FINDINGS

### F1 (BLOCKING, category `reachability-overclaim`) — telegram.ts:634
The fixed branch cannot be reached by real configuration. Max achievable outbox text is **826 chars
against a 1024 threshold** (runtime measurement above). The REACHABILITY and SUMMARY claims assert
the templates produce >1024 chars; they do not. The packet asked for the defect with the *largest
patient impact*; on this evidence (c) has, today, **zero** patient impact, and the choice was made
against a competitor ((b)) that was dismissed for being latent.

### F2 (BLOCKING-ish, category `operator-signal-regression`) — telegram.ts:824 vs AppHelpers.tsx:2392-2407
The new `blockedReason` value `"telegram_photo_sent_text_failed"` is **not registered** in
`telegramBlockedReasonLabels`. `telegramHumanMessage` (`AppHelpers.tsx:2414-2421`) matches
`/^[a-z0-9_.:-]+$/`, finds no label, and returns the generic
`"Нужна проверка настройки Telegram."`. So on a partial delivery the operator's toast
(`useAppLogic.tsx:13169-13172`) now reads *"Отправка Telegram заблокирована: Нужна проверка настройки
Telegram."* — where before the change it read *"Telegram не принял сообщение. Проверьте подключение
бота, сеть и связанный чат."* Strictly worse and actively misleading: it tells the operator to go
fix settings when the truth is "the photo is already in the patient's chat, only the text failed".
Worse, `useAppLogic.tsx:13169` uses `warning` **only when `reason` is empty**, so the two new Russian
partial-delivery warnings are dropped from the toast, and I found **no component that renders
delivery-receipt warnings at all** (`SettingsTelegramTab.tsx:1020` renders `item.warnings`, i.e. the
outbox item's warnings, not the receipt's). The commit body's claim *"оператор видит, что именно
лежит у пациента в чате"* is therefore **not supported by any UI**: the photo's `message_id` is in
the response payload and the receipt, and nothing displays it.

### F3 (DECLARED but misjudged, category `residual-double-send`) — useAppLogic.tsx:13140-13143
The marker lives in the pair `(itemId, clientMutationId)`; `findDenteTelegramOutboxDeliveryReceipt`
(`sampleData.ts:8776-8786`) is a map lookup on `` `${outboxItemId}:${clientMutationId}` ``. The
builder declared this boundary (`handoff.md:214-219`) and argued *"a new mutation id is a request for
a new delivery, not a retry."* **Its only caller contradicts that:** `sendTelegramOutboxItem`
generates a fresh `crypto.randomUUID()` on every single click of the same "send" button. So an
operator pressing "send" again after a partial failure gets `alreadyDelivered = nothing`, `sendPhoto`
fires, **and the patient receives the photo a second time — the exact defect this commit claims to
have fixed, still live on the operator route.** Compounded by F2, whose new label ("check your
Telegram settings") is precisely the message that makes an operator click again.
Two smaller variants of the same class, neither declared:
 - `dueOutboxClientMutationId(item.id, item.scheduledAt)` — if `scheduledAt` moves between ticks the
   id changes, the receipt is missed, and the photo re-sends.
 - `denteTelegramOutboxDeliveryReceipts.splice(200)` (`sampleData.ts:8817`) caps receipts at 200; an
   evicted receipt loses the marker and the photo re-sends. (This cap also gates the pre-existing
   retry mechanism, so it is not new — but it is now load-bearing for patient-visible duplication.)

### F4 (NIT, pre-existing, not this commit) — scripts/smoke-telegram-control-ui-source.mjs:36
The telegram source smoke cannot run at all: `ENOENT apps/api/drizzle/0008_document_payload_storage.sql`,
deleted long ago in `471fb19ef`. Broken before this packet. Not the builder's debt; flagged so the
lead knows this gate is not protecting anything right now.

---

## 5. GIT HYGIENE
Clean. Exact claimed files only, all three commits. Conventional Commits with Russian subjects that
name the defect and not the patch (`fix(телеграм): пациент получал фото второй раз, когда текст под
ним не уходил`) — the body explains WHY at length, per §12. `[ARCHON]` prefix on all three. No
mojibake. No dist, no `.data`, no tsbuildinfo, no scratch, no other agent's work. §11 madge / biome
not run — explicitly excused by the review brief.

## 6. NOTE ON MY OWN ARTEFACTS
I created only `.tmp/r5probe.mts` and `.tmp/mojibake.cjs` (`.tmp/` is gitignored) and deleted them
after use. No source file was edited, nothing was staged, committed or reverted, no server started or
restarted, no request sent to api.telegram.org.
