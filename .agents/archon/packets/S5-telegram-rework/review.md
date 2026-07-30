# ADVERSARIAL REVIEW — packet S5-telegram-rework (rework of R5-telegram-time-bugs)

Reviewer: adversarial subagent. Did NOT write the code. Posture: disbelief.
Commit under attack: `3c5189471e1c6c137a5586eaaf2c3635f380ae3b`
Sibling commits in the packet: `1837a7878` (test), `e5fffd992` (docs), `c17243a47` (state tail).
Repo HEAD at review time: `c17243a47`.
Spec: `.agents/archon/packets/R5-telegram-time-bugs/review.md` — read COMPLETE (243 lines).
Also read complete: `.agents/AGENTS.md`, `.agents/INDEX.md`, S5 `handoff.md` (258), S5 `state.md` (135).

## VERDICT: NEEDS_REWORK

Not because a proof was faked — no fabricated output was found, and every runnable command reproduces.
Because **the packet repeats, in item F2, the exact sin it was sent to atone for in item F1: a
reachability overclaim.** The two new operator captions cannot render on any path in the app, and the
handoff asserts they render "with zero preconditions" at three cited lines, none of which is a live
consumer. On top of that the new batch-refusal introduces an undeclared operator-signal regression of
the same class as the reviewer's F2.

---

## 1. PROOF AUDIT — every claimed command re-run by me, same command, true exit code

| claimed proof | my re-run | verdict |
|---|---|---|
| `node --import tsx --test apps/api/src/tests/telegramOutboxPartialDelivery.test.ts` -> TRUE_EXIT=0, tests 18 / suites 3 / pass 18 / fail 0, fixed clock | **TRUE_EXIT=0**, `tests 18 / suites 3 / pass 18 / fail 0`; all 10 new assertion names present verbatim; `fixedNowMs = Date.parse("2026-07-28T02:00:00+04:00")`, no `Date.now()` in any new test | REPRODUCED |
| `npm run typecheck -w @dental/api` -> EXIT=0, zero errors | **TRUE_EXIT=0**, output = npm banner + `tsc -p tsconfig.json --noEmit`, nothing else | REPRODUCED |
| `npm test -w @dental/api` -> TRUE_EXIT=0, tests 949 / suites 154 / pass 949 / fail 0 | **TRUE_EXIT=0**, `tests 952 / suites 155 / pass 952 / fail 0`, `grep -c "^not ok"` = 0. The `dayConfirmations` flake that was red for R5 is green. | REPRODUCED (counts rose: `6649fc02a` landed a test after the builder's run) |
| web typecheck: EXIT=1 but zero errors in claim (`state.md:91-94`) | **TRUE_EXIT=1**, exactly 6 errors, all `src/DocumentsView.tsx ... Cannot find name 'AnamnesisField'`; `grep -c AppHelpers` = **0**. `DocumentsView.tsx` is `M` in `git status`, `components/documents/AnamnesisField.tsx` is untracked — another agent's in-flight edit | REPRODUCED, correctly attributed |
| F4: `node scripts/smoke-telegram-control-ui-source.mjs` -> EXIT=1, ENOENT `0008_document_payload_storage.sql` line 36 | **TRUE_EXIT=1**, identical ENOENT at `scripts/smoke-telegram-control-ui-source.mjs:36`; current 0008 is `0008_add_settings.sql` | REPRODUCED |
| mojibake: 798 added lines, 0 cp1252, 0 U+FFFD, 0 legacy `вЂ/В«/В»` | own script over all four commits: 797 added lines, **0 / 0 / 0**. The one Latin-`a` homoglyph in "обa" appears in the body of `3c5189471` and in `commitmsg.txt` — declared by the builder as debt #7 | REPRODUCED |
| git hygiene over `3c5189471 1837a7878 e5fffd992` | `git show --name-only` on all **four** commits: only claimed files. No `apps/api/dist/**`, no `.data/*.json`, no `*.tsbuildinfo`, no `scratch/**`, no foreign author's file. The working tree carries heavy `dist`/`.data`/`tsbuildinfo` churn — none of it swept in | REPRODUCED |
| R5 handoff correction cites lines 8, 19, 66, 214-219 | `git show 3c5189471^:.../R5.../handoff.md`: line 8, line 66 and 214-219 match the quoted text **verbatim**. Line 19 does **not** — see F5 | PARTIALLY REPRODUCED |
| **F1 measurement: "longest string literal in `routes/telegram.ts` = 288 … absolute 2-literal ceiling 522 … Reviewer's unreachability finding reproduced independently"** | measures a file that does not produce the string under test | **DOES NOT SUPPORT THE CLAIM — F1 below** |

Errors judged only inside the claimed scope. The full-suite log also contains a Postgres FK stack trace
from `apps/api/src/tests/routes/speechTranscribeChunkAccess.test.ts:106` (`portal_otp_codes_patient_id_fkey`);
`fail 0` and exit 0, and it is not this packet's file. Not held against the builder.

---

## 2. FINDINGS

### F1 (category `proof-does-not-support-claim`) — handoff.md:86-95, state.md:45-51
The builder lists as PROVEN: *"F1 measurement (my own, read-only, source only) — longest string literal
in `routes/telegram.ts` = 288 … absolute 2-literal ceiling 522 … **Reviewer's unreachability finding
reproduced independently.**"*

The string whose length gates the branch is **not produced in `routes/telegram.ts`**:

- `deliverTelegramOutboxParts` splits on `input.text.length > telegramPhotoCaptionMaxLength`
  (`apps/api/src/routes/telegram.ts:693`).
- its single caller passes `text: deliveryText`, and `const deliveryText = repairMojibakeText(prepared.text)`
  — `apps/api/src/routes/telegram.ts:878`.
- `prepared.text` is `item.previewText` — `apps/api/src/sampleData.ts:9787`.
- `previewText: preview.text` from `buildDenteTelegramMessagePreviewData` — `apps/api/src/sampleData.ts:8604`.

The caption ceiling is therefore a property of the preview templates in **sampleData.ts**. A scan of
string literals in `routes/telegram.ts` cannot bound it. The two numbers actually reported (461
`careTopicReplyFor` at `telegram.ts:1967`, 352 `documentSubmenuReplyFor` at `telegram.ts:1931`) belong
to the *webhook reply* path — reviewer note H5 — not to the outbox path F1 is about.

The reviewer's method was correct (`.tmp/r5probe.mts` ran the exported preview builder with max-schema
inputs -> MAX=826). F1's **conclusion** is not in dispute; the reviewer's evidence carries it, and I did
not attempt to overturn it. What is invalid is the PROVEN entry: a number that coexists with the claim
instead of supporting it, in a packet whose stated purpose was correcting overclaims.

Same defect one step further — **"the same measurement also kills reviewer note H5" is not supported
either.** `careTopicReplyFor` (`telegram.ts:2004`) and `documentSubmenuReplyFor` (`telegram.ts:1961`)
both return `text: [texts[topic], requestResult?.text].filter(Boolean).join("\n\n")`, and
`requestResult.text` is built by `createDenteTelegramCareRequest` (`sampleData.ts:7941`) /
`createDenteTelegramDocumentRequest` (`sampleData.ts:7517`) — again outside the measured file. An
"absolute two-literal ceiling" cannot bound a string concatenated with text produced elsewhere.

### F2 (BLOCKING, category `reachability-overclaim`) — the F2 remedy renders nowhere
The packet's numbered item 3 ("Оператору вернули правдивое сообщение") and REACHABILITY claim (3) say:
*"The F2 labels ARE reachable with zero preconditions: `telegramHumanMessage` is called on every
blocked/failed outbox response (`useAppLogic.tsx:13167-13169`, `SettingsView.tsx:1589`,
`SettingsTelegramTab.tsx:1019`), so the new `telegram_outbox_schedule_unreadable` caption renders as
soon as the server returns that reason."*

All three cited consumers are dead for these two values:

1. **`useAppLogic.tsx:13165-13172` is unreachable for blocked/failed responses.** Twelve lines above it:
   ```
   13157: if (!response.ok)
   13158:   throw new Error(
   13159:     await responseErrorMessage(response, "Сообщение Telegram не отправлено"),
   ```
   and `executeTelegramOutboxSend` never returns a 2xx with `status: "blocked"` or `"failed"`:
   every `prepared.ok === false` branch returns 404 or 409 (`sampleData.ts:9712, 9722, 9736, 9749, 9765,
   9778`), the new unreadable refusal returns **409** (`telegram.ts:777`), the missing-mutation-id branch
   400, the in-flight branches 409, transport failure **502**, and 200 is reserved for `sent` / `dry_run`
   and for replays of those. `Response.ok` is false for all of them, so the only call site of
   `telegramHumanMessage(result.blockedReason)` in the entire web app never executes on this route.
   What the operator actually sees comes from `responseErrorMessage` (`AppHelpers.tsx:4145-4154`), which
   reads only `payload.message` / `payload.error` — fields a blocked send body does not have — and falls
   through to `responseStatusFailureLabel` (`AppHelpers.tsx:4132-4143`):
   - 409 -> `"Сообщение Telegram не отправлено: данные уже изменились, обновите экран"`
   - 502 -> `"Сообщение Telegram не отправлено: сервер не смог выполнить действие"`

   **Byte-identical before and after `3c5189471`.** The two new captions change nothing operator-visible.
2. **`SettingsTelegramTab.tsx:1019/1025` renders `item.blockedReason`**, i.e. the outbox *item*'s reason
   from `GET /api/telegram/outbox`. That field is assigned at `sampleData.ts:8545-8608` from bot mode,
   feature flags, preview policy, chat-link and transport state, and is never derived from a delivery
   receipt. Neither `telegram_photo_sent_text_failed` nor `telegram_outbox_schedule_unreadable` can ever
   appear there, and `3c5189471` did not touch `sampleData.ts`.
3. **`SettingsView.tsx:1589` is not a call site at all.** It is the raw line
   `telegramHumanMessage(item.blockedReason)` inside a non-executable block of text lines
   (neighbours: `aria-label="Добавить сотрудника"`, `telegram-outbox-buttons`, `"recall_notice"`).

`grep -rn "telegram/outbox" apps/web/src` returns exactly two send callers, both in `useAppLogic.tsx`
(:13145 item send, :13203 batch) — there is no third path that could surface the label.

So the reviewer's F2 (BLOCKING-ish, operator-signal-regression) is **answered with a change that cannot
be observed**, and the handoff sells it as the load-bearing half: *"тост больше не отправляет оператора
чинить исправные настройки, а говорит правду"*. That toast string is never produced. Note the builder
did examine `:13169` — they declared the "warnings dropped when reason is non-empty" debt at exactly
that line — and still did not notice that the line above throws first. This is the same category the
reviewer used to block R5.

### F3 (BLOCKING-ish, category `operator-signal-regression`, undeclared) — telegram.ts:992-1006 + 2745
The new batch behaviour surfaces unreadable items as blocked results. Cost, undeclared:

- `telegram.ts:1032` `ok: failedCount === 0 && blockedCount === 0`
- `telegram.ts:2745` `reply.code(response.failedCount > 0 ? 502 : response.blockedCount > 0 ? 409 : 200)`
- `useAppLogic.tsx:13212-13218` `if (!response.ok) throw new Error(await responseErrorMessage(response, "Готовые Telegram-сообщения не отправлены"))`

So one unreadable item in the ready set makes the whole `send-due` call answer 409, the operator's
"send all due" toast reads **"Готовые Telegram-сообщения не отправлены: данные уже изменились, обновите
экран"** even when 24 messages did go out in the same batch, and the success path's own refresh
(`loadTelegramControlPlane` + `loadDashboard`, `:13221-13222`) plus the `sentCount`/`attemptedCount`
report (`:13223-13227`) are all skipped, leaving a stale queue on screen.

409-with-partial-success was already possible pre-S5 (e.g. `telegram_outbox_preview_empty`), so the
*mechanism* is pre-existing. What `3c5189471` adds is a **permanently sticky** member of the blocked
set: pre-S5 an unreadable item was sent and left the queue via `telegram_outbound_sent`; post-S5 the
send is refused and nothing else removes the item, so from the first such item onward *every*
`send-due` call returns 409 and *every* operator batch send reports total failure, forever. The
handoff presents the blocked-result emission as pure gain ("они попадают в blockedCount, в лог воркера
и в код ответа роута") and does not mention the cost. Latent today, exactly as (b) is.

Second, smaller, in the same hunk: the two lists are sliced **independently** —
`dueItems … .slice(0, input.limit)` (`:991`) and `unreadableItems … .slice(0, input.limit)` (`:992-994`)
— so `results` can carry up to `2 × requestedLimit` entries while `attemptedCount` reports at most
`limit`. `denteTelegramOutboxSendDueResponseSchema.results` has no max
(`packages/shared/src/index.ts:2410`), so nothing throws; it is a silent contract drift.

### F4 (NIT, category `proof-theatre`) — telegramOutboxPartialDelivery.test.ts, "before/after contrast"
CLAIMED PROVEN says: *"executed before/after contrast in one test:
`telegramOutboxDeliveredParts(null).photoDelivered === false` (R5's pair-keyed lookup, i.e. the photo
would be re-sent) vs `telegramOutboxDeliveredPartsForItem(itemId, null).photoDelivered === true`."*

`telegramOutboxDeliveredParts(null)` is tautologically false — the function's first line is
`if (!receipt || receipt.status !== "failed") return telegramOutboxNothingDelivered;`
(`telegram.ts:609`). Passing `null` exercises none of R5's logic: R5's miss was
`findDenteTelegramOutboxDeliveryReceipt(itemId, freshUuid)` returning `null` from the
`${outboxItemId}:${clientMutationId}` map (`sampleData.ts:8776-8786`) *while the receipt sits in the
array*. A genuine contrast would call
`telegramOutboxDeliveredParts(findDenteTelegramOutboxDeliveryReceipt(itemId, "fresh-uuid"))` inside the
same `withReceipt(...)` block. The "after" half of the test is real and the collapsed call sequence
`calls.map(kind) === ["text"]` is real proof of the new behaviour; only the "before" half is decoration.

### F5 (NIT, category `citation-accuracy`) — R5 handoff correction block, point 2
The correction block says «**Строка 19** и рядом: «Триггер бытовой: 429 или таймаут Telegram на ВТОРОМ
вызове» — НЕВЕРНО», and `handoff.md:90-91` claims the corrections carry «указанием точных строк 8 и 19».
In the pre-correction file, line 19 is
`telegramPhotoCaptionMaxLength`, где предел 1024 (`telegram.ts:79`): длиннее в подпись не влезает.`
The quoted sentence is at **line 43**, 24 lines away. Lines 8, 66 and 214-219 all match verbatim, so
this is a locator error, not a fabricated quote — but in a packet whose entire docs deliverable is
"name the false sentence at its exact line", one of four line numbers being wrong is worth the record.

### F6 (NIT, category `packet-accounting`) — handoff.md:225-232
`## Коммиты` lists two commits. The packet is four (`3c5189471`, `1837a7878`, `e5fffd992`,
`c17243a47`). `state.md` names `e5fffd992` in `## FINAL` and cannot name `c17243a47`, which added that
very section. `c17243a47`'s subject is also English (`docs(telegram): S5 state final HEAD and gate
re-run`) and names no defect, breaking the packet's own Russian-subject convention. One commit earlier
in this same history the lead flagged precisely this class of miscount (`87bf14e98` — "сдача S4
обещала «четыре хеша», а коммитов пакета стало шесть").

---

## 3. HYPOTHESES I ACTUALLY TESTED

- **Was the defect real before this commit?** CONFIRMED. `git show 3c5189471^:apps/api/src/routes/telegram.ts`
  reproduces `return !Number.isFinite(scheduledAtMs) || scheduledAtMs <= nowMs;` byte-for-byte, and
  `3c5189471^:apps/web/src/AppHelpers.tsx` reproduces the same fail-open in
  `isTelegramOutboxItemDueForUi`. NaN meant "due" in both.
- **Is the fail-closed fix reachable?** Chain verified independently: `server.ts` worker ->
  `executeDenteTelegramOutboxDueBatch` (`telegram.ts:986-1006`) and both routes
  (`telegram.ts:2718-2730` item send, `:2733-2745` send-due) funnel through `executeTelegramOutboxSend`
  where the 409 sits (`:777`). `denteTelegramOutboxItemMatchesStatus` (`sampleData.ts:9942-9946`) is
  still fail-open for `status: "due"`, so unreadable items really do arrive in `outbox.items` and
  `unreadableItems` is really non-empty — the surfacing is wired, not dead. LATENT for lack of a live
  producer, which the builder declares honestly and repeatedly.
- **Does the F3 marker mechanism hold on real data, not just the fixture?** Yes for the write side:
  `recordDenteTelegramOutboxDelivery` (`sampleData.ts:9858-9882`) genuinely `unshift`s the
  `telegram_photo_sent_text_failed` receipt into the exported
  `denteTelegramOutboxDeliveryReceipts` array that the new scan reads, so the scan can find it in
  production, not only in the test. But the whole F3 path is still gated on
  `input.text.length > 1024`, which F1 proves unreachable — the builder states this himself in
  REACHABILITY (2) and does not claim patient impact.
- **Cross-tenant collision via the broadened key** (`receipt.outboxItemId === outboxItemId`, mutation id
  and `scheduledAt` both dropped from the key) — **DISPROVED.** `patients.id` is
  `uuid("id").primaryKey().defaultRandom()` (`apps/api/src/db/schema.ts:282`), and every outbox id
  embeds such a PK (`sampleData.ts:8617, 8705, 8891, 8938, 9058, 9129, 9257`), so a collision needs a
  UUID collision. The builder's claim stands.
- **Stale marker suppressing a legitimate later photo** — DISPROVED. Once the retry's text succeeds,
  `recordDenteTelegramOutboxDelivery` writes a `telegram_outbound_sent` audit event and
  `telegramOutboxItemAlreadySent` (`sampleData.ts:9717`) excludes the id from the outbox permanently,
  so the id is not reused while the marker lives.
- **Hollow facade?** NO. No `{success:true}` over a no-op, no placeholder, no magic constant, no
  hardcoded UUID/port/endpoint, no fabricated default. Both new constants are real discriminators that
  are read back. `attemptedCount: sendResults.length` is an honest narrowing, not a flattering number.
- **Second owner?** NO. `telegramOutboxDeliveredPartsForItem` wraps rather than duplicates
  `telegramOutboxDeliveredParts`; one caller (`telegram.ts:888`).
- **useAppLogic return field deleted/renamed? Listener/interval without teardown?** NO. `3c5189471`
  does not touch `useAppLogic.tsx`; `AppHelpers.tsx` gains two map entries and one early return. The
  `telegramOutboxDeliveryClaims.delete(claimKey)` `.finally()` is intact (`telegram.ts:889-891`).
- **Hardcoded hex / static px / undeclared Russian literal?** No colours, no pixels. Two new Russian
  literals in `routes/telegram.ts` (`:97` comment block and `:585` warning) next to a dozen identical
  existing ones; the builder declared this as debt #6 and the two `AppHelpers.tsx` strings went into
  the existing `telegramBlockedReasonLabels` dictionary. Not a hidden violation.
- **Mojibake?** NO — 0/0/0 over 797 added lines and all four subjects. The declared Latin-`a` in "обa"
  is the only blemish and it is declared.
- **Deleted file still referenced?** N/A — nothing deleted.
- **Collision warning honoured?** YES. `git status --porcelain` shows neither
  `apps/api/src/routes/communicationsOutbox.ts` nor
  `apps/api/src/services/communications/dispatchWorker.ts`; neither was touched.
- **Real Telegram traffic?** None. The tests inject senders through the same seam production fills with
  `sendTelegramPhotoMessage` / `sendTelegramTextMessage` (`telegram.ts:652-655`). No request to
  api.telegram.org from anything I ran. I started no server and restarted nothing.

---

## 4. ITEM-BY-ITEM AGAINST THE SPEC (R5 review.md §4)

| spec item | builder's disposition | my verdict |
|---|---|---|
| F1 BLOCKING `reachability-overclaim` (telegram.ts:634) | CLOSED / CONCEDED + own measurement + 4-point correction in R5's handoff | **ADDRESSED, invalid proof.** Concession genuine, in-file correction genuine (3 of 4 line citations exact). The "independent reproduction" measures the wrong file — my F1. |
| F2 BLOCKING-ish `operator-signal-regression` | CLOSED for the load-bearing half, remainder declared debt | **NOT CLOSED — my F2.** Labels registered, but no live consumer can render either value; the operator string is unchanged. Reachability overclaim. |
| F3 `residual-double-send` (2 undeclared variants) | CLOSED main path + drift variant; 200-receipt cap declared debt | **ADDRESSED.** Mechanism correct and verified on the production write path; cross-tenant claim verified. "Before/after contrast" is partly theatre — my F4. |
| F4 NIT smoke ENOENT | DECLARED DEBT, confirmed by running it | **ADDRESSED.** Reproduced exactly, including line 36 and the reason for not fixing it. |
| Brief: unparseable `scheduledAt` fails OPEN | CLOSED inside claim + a fourth site (`AppHelpers.tsx:2440`) neither R5 nor the reviewer named | **ADDRESSED**, latent and declared latent. Undeclared cost — my F3. |
| Brief: residual digest/timezone question | NO DEFECT, R5's dossier correction upheld; two §1 debts named outside claim | **ADDRESSED.** `sampleData.ts:9129` staff-digest key is `appointmentClinicDateKey(...)`, clinic-local; `denteTelegramOutboxItemMatchesStatus` carries no UTC-day logic. |
| H5 note (`sendWebhookSuggestedReply`, no 1024 guard) | refused scope expansion, "reported the number instead" | **number is not a bound** — see F1 tail. Refusing the scope expansion was right; the justification is not established. |
| Correcting R5's false statements | 4-point block at the top of R5's handoff | **DONE**, 3 of 4 line citations exact — my F5. |

No spec item was silently ignored.

---

## 5. GIT HYGIENE
Clean. Four commits, claimed files only, `[ARCHON]` prefix on all, Conventional Commits with Russian
subjects naming the defect rather than the patch on the three substantive ones (`c17243a47` is English
and names no defect — my F6). No `apps/api/dist/**`, no `.data/*.json`, no `*.tsbuildinfo`, no
`scratch/**`, no other author's file, despite a working tree full of exactly that churn. The builder
also reported, unprompted, that the shared index carried two S6 files before the test commit and that
the pathspec commit took exactly one file — I verified `1837a7878` contains exactly
`apps/api/src/tests/telegramOutboxPartialDelivery.test.ts`. §11 madge / biome not run — excused by the
review brief.

## 6. REQUIRED REWORK (numbered, build directly from this)

1. **Make the F2 remedy observable, or retract the claim.** `useAppLogic.tsx:13157-13163` throws before
   `:13165`, and every blocked/failed send response is 400/409/502, so
   `telegramHumanMessage(result.blockedReason)` never runs. Either (a) parse the body before the
   `!response.ok` throw in `sendTelegramOutboxItem` and route a `status === "blocked" | "failed"` body
   into the existing label path, or (b) delete the "operator sees the truth" claim from
   `handoff.md` item 3 / REACHABILITY (3) and re-file the two labels as a latent floor. Do not leave the
   claim standing.
2. **Correct REACHABILITY claim (3) in `handoff.md` in-file.** `SettingsView.tsx:1589` is not a call
   site (raw text in a non-executable block) and `SettingsTelegramTab.tsx:1019/1025` renders
   `item.blockedReason`, assigned at `sampleData.ts:8545-8608` and never from a receipt. Name both as
   wrong at their line numbers, in the same style as the S5 correction block added to R5's handoff.
3. **Retract or re-derive the F1 "independent reproduction".** The gated string is
   `item.previewText` (`sampleData.ts:8604` -> `:9787` -> `telegram.ts:878`), not a literal in
   `routes/telegram.ts`. Either run the exported preview builder the way the reviewer did (state the
   exact command and the per-kind lengths) or downgrade the entry from PROVEN to "conceded on the
   reviewer's measurement, not independently reproduced". Same for the H5 sub-claim: `522` cannot bound
   `[texts[topic], requestResult?.text].join("\n\n")` (`telegram.ts:1961`, `:2004`) because
   `requestResult.text` is built in `sampleData.ts:7517` / `:7941`.
4. **Declare or fix the sticky-409 regression.** `telegram.ts:1032` `ok` and `:2745` status make one
   unreadable item turn every `send-due` response into 409 permanently, and
   `useAppLogic.tsx:13212-13218` converts that into "Готовые Telegram-сообщения не отправлены" plus a
   skipped refresh even when `sentCount > 0`. Minimum: state it in `handoff.md` as a declared cost with
   the exact lines. Better: separate "blocked because we refuse to send" from "blocked because delivery
   failed" so a batch that sent messages does not report total failure.
5. **Fix the independent double slice.** `telegram.ts:991` and `:992-994` each apply
   `.slice(0, input.limit)`, so `results` can hold up to `2 × requestedLimit` entries. Apply one shared
   budget, or state in the handoff that `results.length` is deliberately no longer bounded by `limit`.
6. **Make the F3 "before" assertion real or drop it.** Replace
   `telegramOutboxDeliveredParts(null)` — tautologically false at `telegram.ts:609` — with
   `telegramOutboxDeliveredParts(findDenteTelegramOutboxDeliveryReceipt(itemId, "fresh-uuid"))` inside
   the same `withReceipt(...)` block, so the assertion actually exercises R5's pair-keyed lookup.
7. **Fix the line-19 citation** in the R5 correction block: "Триггер бытовой: 429 или таймаут Telegram
   на ВТОРОМ вызове" is at line **43** of the pre-correction `handoff.md`, and `handoff.md:90-91` must
   stop claiming "точных строк 8 и 19".
8. **Complete the commit ledger.** `handoff.md:225-232` lists two commits; the packet is four
   (`3c5189471`, `1837a7878`, `e5fffd992`, `c17243a47`). List all four with their subjects.

## 7. MY OWN ARTEFACTS
Read-only throughout. No source file edited, nothing staged, committed, reverted or reset; no server
started or restarted; no screenshot pipeline; no request to api.telegram.org. One helper script written
outside the repo (`%TEMP%\s5_mojibake.cjs`) and logs under `/tmp`. This `review.md` is the only file I
created inside the repo.
