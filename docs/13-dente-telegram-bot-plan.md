# DENTE Telegram bot plan

Date: 2026-05-19

## Decision

DENTE uses Telegram as a safe communication client, not as the medical source of truth.

The bot must help patients and clinic staff, but the CRM remains authoritative for patients, appointments, payments, documents, imaging, audit and signatures.

## Current implementation

Implemented server-side foundation:

- `GET /api/telegram/status`, `GET /api/telegram/status/:organizationId`, `GET /api/telegram/status/:organizationId/:botConfigId` and `GET /api/settings/telegram` return bot status without exposing token values. The scoped status routes are for operators checking clinic-owned bot runtime configs from `DENTE_TELEGRAM_CLINIC_BOTS_JSON`; when one organization has more than one bot config, callers must use the `:botConfigId` route. The Settings UI stores the selected clinic bot config id in UI preferences and uses the scoped status route in `clinic_owned_bot` mode when organization id and config id are known.
- `PUT /api/settings/telegram` persists selected Telegram configuration until it is changed. Malformed settings payloads now pass through the shared Telegram route-body parser before any settings mutation; URL and signed-button validation errors are translated to operator-readable Russian messages; raw zod issue arrays, payload field paths, reason tokens such as `https_required`, and server env names are not returned as the user-facing `message`.
- `shared_dente_bot` and `clinic_owned_bot` are both selectable. Clinic-owned bots use a saved username plus server-only env token/webhook secret (`DENTE_TELEGRAM_OWN_*`, `DENTE_TELEGRAM_CLINIC_*` or `DENTE_TELEGRAM_CLINIC_BOTS_JSON`); tokens are not accepted from the browser and are never returned by API responses.
- Telegram settings include an optional HTTPS `welcomeImageUrl` plus scenario-specific HTTPS `visualCardUrls` for `mainMenu`, `appointment`, `documents`, `tax`, `billing`, `care`, `review`, and `staff`. Empty scenario fields fall back to `welcomeImageUrl`. When a visual card is configured, Telegram uses `sendPhoto` with the same Russian inline menu; if photo delivery fails, the API falls back to the text reply path.
- Telegram settings include `postVisitCheckupDelayHoursByTopic`: per-clinic hour delays for generic post-visit checkups after extraction, implantation, filling/restoration, endodontics, surgery, local anesthesia, hygiene, prosthetics, orthodontics, periodontology and other care. Values are normalized to 1-720 hours, persisted by settings, available in first-run Telegram onboarding, and used by the outbox instead of hardcoded defaults.
- Telegram settings include `reviewRequestDelayHours`: per-clinic delay for generic review requests after a closed visit or payment. Values are normalized to 1-720 hours, persisted by settings, exposed in first-run onboarding and the full Telegram tab, accepted in `DENTE_TELEGRAM_CLINIC_BOTS_JSON`, and used by review outbox scheduling instead of the old fixed 2-hour delay.
- `GET /api/telegram/feature-plan` exposes the safe patient/staff capability map.
- `POST /api/telegram/link-codes` creates one-time patient/staff link codes. In clinic-owned mode the request is scoped by `organizationId` + `clinicId` + `botConfigId`, subject validation is performed inside the resolved runtime organization, clinic mismatch is rejected before code issue, the deep link uses the selected bot username, and the server stores only a salted SHA-256 fingerprint, last 4 characters, TTL, bot config id and status.
- Link-code creation now returns `deepLink`, `qrSvg` and `shareText` so staff can connect a patient or employee without copying raw bot-token data into the browser.
- The Settings QR panel is QR-first for operators: it remembers the selected patient/staff mode and selected staff member in validated UI preferences, offers copy-code, copy-deep-link, copy-share-text and Russian QR download actions, and clears the generated card when subject, patient, staff member, bot mode, or clinic bot config changes.
- `GET /api/telegram/link-codes` lists link-code metadata without the raw code or fingerprint. It accepts `organizationId`, `botConfigId`, `status`, `subjectType`, `subjectId`, `limit` and `cursor`, returns `totalCount`, `filteredCount`, status counters and `nextCursor`, so pending/revoked code history is not hidden by a fixed browser slice or mixed between bots.
- `GET /api/telegram/chat-links` lists active/revoked patient/staff chat bindings using salted chat fingerprints only. It accepts `organizationId`, `botConfigId`, `status`, `subjectType`, `subjectId`, `limit` and `cursor`, returns active/revoked counters and `nextCursor`, and never returns `chatTransportRef`.
- `POST /api/telegram/chat-links/:linkId/revoke` revokes a binding in the selected runtime scope without deleting the audit trail. Missing or stale bindings return `TelegramChatLinkNotFound` plus Russian operator copy, not a bare code or route id.
- `POST /api/telegram/messages/preview` renders safe Telegram text previews from an allowlist. The route resolves the same optional `organizationId` + `botConfigId` runtime scope as outbox/link operations, so clinic-owned bot previews use the selected bot media and portal settings. Staff digest preview accepts `staffId` and renders only staff-safe counters. `includePhi: true` is blocked by default.
- Patient-facing Telegram previews, share texts, command replies, inline buttons and language-selector fallbacks are Russian by default until a real dictionary-based multilingual UI exists.
- Telegram control-panel selects normalize DOM values before saving bot mode, privacy mode, QR subject and outbox filters. Invalid browser/plugin values fall back to shared DENTE bot, no-PHI privacy, patient QR subject and all-filter defaults instead of entering UI preferences.
- Review-request previews, `/review` replies and map callbacks use only clinic-level HTTPS `clinicReviewUrl` / `clinicMapsUrl` saved by `PUT /api/settings/telegram`; when `visualCardUrls.review` or `welcomeImageUrl` is configured they send a visual card with the same button-first keyboard. The template is blocked until at least one safe URL exists and never adds patient, appointment, diagnosis, tooth, treatment, payment or tax identifiers.
- `GET /api/telegram/outbox` builds a safe outbound readiness queue from open Telegram communication tasks and linked staff digest recipients for the selected bot config only. It accepts `status`, `templateKind`, `limit`, `cursor`, and optional `organizationId` + `botConfigId` for clinic-owned bot runtime scope. It computes `readyCount`, `dueCount`, `notDueCount`, `blockedCount`, `totalCount` and `filteredCount` before pagination, and returns `nextCursor` so a clinic can page through large reminder batches without browser-side slicing.
- Each outbox item returns the preview text, optional scenario `photoUrl`, template kind, delivery status and blocking reason so the operator can see which visual card a patient will receive.
- `POST /api/telegram/outbox/:itemId/send` resolves the requested item from the full generated outbox, not only the first paged result, and accepts the same optional `organizationId` + `botConfigId` runtime scope so a clinic-owned bot send uses that bot token, visual card and portal URLs instead of the shared DENTE runtime.
- Document-ready, tax-document-status, payment, post-visit and recall outbox items use the matching scenario visual card (`documents`, `tax`, `billing`, `care`) and Russian inline keyboards with portal, document/tax/care/schedule/billing, administrator-contact, privacy and `Главное меню` actions. Contact-labeled buttons use `dente:contact`; `dente:clinic` is reserved for QR/linking guidance. The `Открыть DENTE` URL strips any query/hash already present in the configured portal base and then adds only safe handoff parameters (`dente_source=telegram`, `dente_section=home|documents|tax|billing|care|schedule`), never patient, document, appointment, payment, tax or treatment identifiers. The message text stays generic and excludes diagnosis, treatment details, fiscal receipt identifiers, amounts, payer INN, PDF files and medical-document contents.
- The web portal consumes those Telegram handoff parameters on first load, opens the matching section (`home`, `documents`, `tax`, `billing`, `care`, or `schedule`), preselects the document/tax form when applicable, shows a Russian notice, and immediately strips the query from the URL. The browser route keeps only `#shift`, `#documents`, `#finance`, `#communications`, or `#schedule`; patient, document, appointment and payment ids from a pasted URL are ignored.
- `POST /api/telegram/outbox/:itemId/send` sends one ready, non-PHI allowlisted outbox item through Telegram from the API process only. Patient templates use `sendPhoto` with the matching scenario visual card when available, then fall back to `welcomeImageUrl`, then fall back to `sendMessage` if Telegram rejects the photo. It supports `dryRun`, blocks delivery before the outbox item's `scheduledAt`, uses encrypted server-only chat transport refs, bounded timeout, protected content, sanitized operator-readable failure warnings, communication-event audit, and closes the source communication task only after a confirmed send. `blockedReason` may keep stable machine codes such as `telegram_transport_failed`, but `warnings` and delivery messages must not expose raw transport classes or `retry_after` tokens; send responses carry structured `retryAfterSeconds` for worker backoff.
- Due reminders also have a bounded in-process worker for prototype deployments. `DENTE_TELEGRAM_OUTBOX_WORKER_ENABLED=1` starts a recursive timer, processes only due safe outbox items through the same send executor, honors dry-run/batch/interval env limits, skips overlapping runs, reads Telegram rate-limit delay from structured `retryAfterSeconds`, and stops on Fastify shutdown. The manual `/api/telegram/outbox/send-due` route remains the admin/ops override and accepts `organizationId` + `botConfigId` for scoped clinic-owned bot runs. Failed due receipts can be retried by the due runner instead of being permanently replayed as final idempotent receipts.
- `POST /api/telegram/webhook`, `/api/telegram/webhook/:organizationId` and `/api/telegram/webhook/:organizationId/:botConfigId` accept Telegram updates with idempotency by `update_id`. Scoped webhook routes resolve the correct clinic-owned bot token/webhook secret from server-only runtime config instead of the singleton demo settings. If one organization has multiple bot configs, the `:organizationId`-only route is rejected instead of silently picking the first token. Terminal duplicate updates are ignored; stale `processing` claims older than the retry window are reclaimed and audited as `stale_processing_retry`.
- Webhook command/link-code handling now sends the same generic non-PHI reply back through Telegram `sendMessage` from the API process when a bot token is configured and the update came from a private chat. Raw chat ids are used only transiently for this send, are never returned to the browser, and duplicate updates do not send a second reply.
- Group, supergroup and channel updates are rejected into the audit trail without sending a public Telegram reply; the API returns a safe suggested private-chat instruction for staff diagnostics only.
- Webhook replies for `/start`, `/help`, `/clinic`, `/privacy`, `/schedule`, `/appointments`, rejected codes and successful links now include Russian inline keyboards. Buttons are the primary UX; commands remain a fallback for power users and direct links. Buttons either use safe allowlisted callback data (`dente:start`, `dente:help`, `dente:clinic`, `dente:privacy`, `dente:schedule`, `dente:documents`, `dente:tax`, `dente:billing`, `dente:medical-docs`, `dente:patient-forms`, `dente:care`, `dente:care-extraction`, `dente:care-implant`, `dente:care-filling`, `dente:care-endo`, `dente:care-surgery`, `dente:care-anesthesia`, `dente:care-hygiene`, `dente:care-prosthetics`, `dente:care-orthodontics`, `dente:care-periodontology`, `dente:contact`, `dente:review`, `dente:map`) or a configured HTTPS DENTE portal/review/maps URL with a non-identifying section handoff; no patient, appointment, treatment, payment, tax or imaging identifiers are embedded in button payloads.
- Document, care, map, review, privacy, clinic, linked/rejected and appointment-callback menus keep a `Главное меню` inline button (`dente:start`) so a patient can stay in a button-only flow without remembering slash commands.
- `/start`, `/clinic` and rejected-code paths point unlinked patients to the clinic QR first, with manual code entry as fallback. For already linked patient or staff private chats, `/start` returns the linked button-first menu instead of repeating onboarding.
- Plain Russian private-chat text is routed to the same button-first flows: `документы`, `налог`, `оплата`, `чек`, `счет`, `медкарта`, `выписка`, `анкета`, `согласие`, `памятка`, `расписание`, `нужен звонок`, `отзыв`, and `карта` do not require slash commands. For linked patients, specific document phrases create or reuse the same administrator request task as the matching inline button, and specific care phrases (`удаление`, `имплант`, `пломба`, `каналы`, `хирургия`, `анестезия`, `гигиена`, `коронка`, `брекеты`, `десны`) create or reuse the matching doctor handoff. Unknown text gets a Russian safe menu with inline buttons instead of silence.
- Private Telegram photo/document/voice updates receive a Russian explanation that files are not accepted as medical documents in Telegram, plus inline buttons for `Документы`, `Памятки`, `Позвать администратора`, and the configured portal/visual card when available. The bot does not store or echo Telegram `file_id` values.
- Linked patients can request `/schedule` and receive only administrative time/status for their own active appointments plus signed inline buttons for the nearest appointment: confirm, reschedule, or request a call. The compact appointment callback payload is verified against `organizationId + clinicId + botConfigId + appointmentId + action + expiry`, so a button generated by one clinic-owned bot is rejected when replayed through another bot config. Linked staff can request the same command and receive only time, their role and status for assigned appointments. Unlinked chats receive a one-time-code instruction instead of any schedule data.
- Linked patients can press `Документы` or `Памятки` and receive a portal-only explanation for contracts, consents, acts, fiscal/tax documents and post-visit recommendations. These menus use `visualCardUrls.documents`, `visualCardUrls.tax`, or `visualCardUrls.care` first, then fall back to `welcomeImageUrl`, and finally to text if Telegram photo delivery fails.
- Document menu buttons split real clinic work into `Налоговая`, `Медкарта` and `Формы пациента`: tax preparation mentions KND 1151156, the 2021-2023 legacy period, fiscal receipts and payer data; medical-record requests route staff toward copy request, extract, release receipt, visit certificate and the structured outpatient card 025/у; patient forms route back to the protected DENTE portal plus administrator handoff.
- Linked-patient document submenu callbacks and clear free-text intents now create or reuse one open administrator `needs_call` task for tax documents, medical records or patient forms, store a stable `workflowCode`, record an inbound Telegram communication event, and audit created/repeated actions in the organization from the active chat binding, not the singleton demo settings. Repeated presses/messages refresh the existing task by workflow code instead of spamming the queue. The Telegram reply stays non-PHI and points back to DENTE/protected portal.
- The Communications view now recognizes those Telegram document-request workflow codes and offers Russian quick actions for the real follow-up forms: tax application/current certificate/legacy certificate/register, medical copy request/extract/outpatient card 025/у/release receipt/visit certificate, and intake/personal-data/treatment/procedure/refusal/minor/photo-video consents. Each action preselects the relevant DENTE form and selected patient without silently issuing a document from the communication queue. Legacy title matching remains only as fallback for already-created prototype tasks.
- The final site-side issue step stays outside Telegram: generated drafts opened from these tasks require a Russian `Проверить и выдать` review block and explicit `Выдать после проверки`, so bot button presses cannot accidentally issue tax, medical-record or consent paperwork.
- Care menu buttons split common after-visit scenarios into `После удаления`, `После имплантации`, `После пломбы` and `После гигиены`; Telegram carries short non-diagnostic instructions and the portal/admin buttons, while patient-specific instructions remain in DENTE.
- Topic care buttons also create or reuse a doctor-owned post-visit instruction task with a stable care `workflowCode` when the patient has no issued personalized recommendation for that care topic. The Communications action `Подготовить памятку` opens the `post_visit_recommendations` form, selects the patient from the task and applies the matching care-topic preset by workflow code. The task is not a Telegram outbox item until a real `post_visit_recommendations` document exists.
- Linked patients can press `Позвать администратора`. DENTE creates or reuses one open `needs_call` communication task in the linked chat's organization, records an inbound Telegram communication event, and sends a safe confirmation. Repeated presses refresh the existing task instead of spamming the queue.
- Allowlisted `callback_query` updates are acknowledged with Telegram `answerCallbackQuery` and then answered with the same non-PHI safe message flow. Handled appointment, review and map callbacks keep a safe next-action keyboard (`Расписание`, `Документы`, `Позвать администратора`, `Конфиденциальность`, `Главное меню`) so the bot remains button-first after confirm/reschedule/callback actions or an external map/review click. Unknown callback payloads are not treated as product commands and arbitrary callback text is not stored.
- Appointment callback data contains only a compact action/id/expiry/signature tuple; the HMAC input includes the webhook runtime scope (`organizationId`, `clinicId`, `botConfigId`) and does not include patient, diagnosis, payment or document facts.
- Production webhook protection uses `X-Telegram-Bot-Api-Secret-Token`; in production a missing `DENTE_TELEGRAM_WEBHOOK_SECRET` makes the webhook unavailable instead of silently accepting unsigned updates.
- Telegram control-plane routes (`/api/settings/telegram`, link codes, chat links, previews, outbox and status) require `x-dente-admin-secret` when `DENTE_TELEGRAM_ADMIN_SECRET` is configured; in production the control plane is closed if that secret is missing. Webhook routes do not use this admin secret.
- `DENTE_TELEGRAM_ADMIN_SECRET` is not a clinical, schedule, or settings fallback. It does not unlock patients, documents, imaging, speech, imports, persistence export, appointment mutations, or Settings routes unless the clinic deliberately configures the same secret value in the relevant clinical/schedule/settings env var too.
- Inbound audit stores update id, command, kind, action, warnings and a salted chat fingerprint only. Raw chat ids and arbitrary message text are not stored.
- `/start DENTE-...` and bare `DENTE-...` messages consume one-time codes only inside the webhook runtime scope that owns the code, bind the chat fingerprint to a patient/staff subject, store an encrypted server-only chat transport ref when `DENTE_TELEGRAM_CHAT_ENCRYPTION_KEY` is configured, and return a generic non-PHI confirmation.
- Public chat-link responses expose `chatIdLast4` for support diagnostics but omit encrypted transport refs and raw chat ids.
- Duplicate updates do not create a second event unless the earlier event is a stale in-flight `processing` claim that must be retried.
- Settings UI now has a Telegram tab with bot status, saved clinic bot config id, webhook readiness, one-click patient/staff QR generation, deep-link display, safe template previews, scenario visual-card URL fields, visual-card thumbnails, blocked-by-default policy chips, paged link-code/chat-link ledgers, and outbound outbox counts with exact blocked reasons and item warnings. The tab sends the selected outbox status/template filters plus saved `organizationId` + `botConfigId` scope to the API in `clinic_owned_bot` mode, and uses `nextCursor` for `Показать еще` in outbox, link-code and chat-link lists instead of treating the browser as the queue database.
- The Telegram tab persists the QR target controls and exposes copy/download actions for the generated code, deep link, share text and SVG QR so reception staff can work from buttons instead of slash commands.
- The Telegram tab also stores clinic review/maps URLs server-side and previews the generic review request next to other safe templates.
- Outbox item titles are template-generic. Raw communication task titles are not returned because they can contain tooth numbers, treatment names, payment context or other PHI-adjacent details.
- Outbox items now return the exact `replyMarkup` that delivery will use. The Settings UI previews inline keyboards as Telegram-style rows and labels each button as `ссылка`, `действие` or `кнопка`, so the operator sees the same button shape the patient will receive.
- The Settings UI uses the API `filteredCount` and `nextCursor` as the source of truth for Telegram outbox remaining rows, so server-side pages are not hidden by the browser's current slice.
- `communication_tasks.workflow_code` is stored by migration `0016_communication_task_workflow_code.sql`. Current codes cover Telegram tax-document, medical-record, patient-form, care-topic, reschedule, callback-request and administrator-contact tasks.
- `npm run smoke:telegram-bot` verifies env-only shared and clinic-owned token reporting, scoped multi-clinic status/webhook routing by `organizationId + botConfigId`, scoped link-code/chat-link isolation so a code from one bot cannot be consumed through another bot config, second-clinic link-code creation and document/care/contact callbacks staying in that clinic's organization, scoped appointment callback HMAC rejection when a primary-bot inline button is replayed through a secondary bot config, scoped outbox list/send/send-due routing through the selected clinic bot token, portal URL and visual card, scenario visual-card routing for document/review/payment previews, webhook secret enforcement, safe private-chat webhook replies, no public replies in groups/channels, QR/deep-link package creation, one-time code creation/use/reuse rejection, paged link-code/chat-link ledger counters/filters, public chat-link redaction, encrypted chat transport storage, one active chat binding per patient/staff subject after relink, stable workflow codes for Telegram-created communication tasks from both buttons and clear free-text document requests, all visible after-care callbacks (`extraction`, `implant`, `filling`, `endo`, `surgery`, `anesthesia`, `hygiene`, `prosthetics`, `orthodontics`, `periodontology`) creating/reusing doctor tasks, payment reminders exposing `Оплата и чеки` / `Документы` inline actions, review request delay persistence and exact scheduled time from clinic settings, review/map visual-card replies, safe linked/unlinked schedule commands, Russian safe preview fallback, PHI preview blocking, outbox readiness with inline keyboards, section-specific portal handoff URLs without sensitive query keys, future scheduled-send blocking, update idempotency, stale processing retry, operator-readable Telegram settings and transport-failure messages, structured retry delay on rate-limited sends, and no secret/chat-id/link-code leakage in responses.
- `npm run smoke:telegram-validation` verifies malformed Telegram webhook/control payloads return controlled readable Russian 400 errors, never leak admin/webhook secrets, and fail on mojibake markers in the response or the callback fallback answer source.
- `npm run smoke:telegram-due-worker-source` verifies the due-worker env controls, recursive timer design, Fastify shutdown hook, shared due-batch executor, route reuse, structured `retryAfterSeconds` backoff, and failed-due retry behavior.
- `npm run smoke:telegram-control-ui-source` verifies the UI source, QR generator, scoped clinic-bot status endpoint selection, scoped outbox/link-code/chat-link query propagation, row-preserving outbox inline-keyboard preview, paged link-code/chat-link controls, visual-card preview, scenario visual-card settings, own-bot controls, readable server validation and transport-failure humanizers, shared schema and PostgreSQL document payload/workflow-code/visual-card columns.
- The same Telegram UI source smoke rejects raw Telegram select casts and requires normalizers for bot mode, privacy mode, QR subject, outbox status filter and outbox template filter.
- The same source smoke now checks persisted QR target preferences and QR copy/download actions.
- `npm run smoke:telegram-handoff-source` verifies the web-side Telegram handoff parser, section mapping, URL cleanup, Russian notice, document/tax preselection and rejection of patient/document/appointment/payment query identifiers.

Env keys:

```dotenv
DENTE_TELEGRAM_BOT_TOKEN=
DENTE_TELEGRAM_BOT_USERNAME=dentecrm_bot
DENTE_TELEGRAM_ADMIN_SECRET=
DENTE_TELEGRAM_WEBHOOK_SECRET=
DENTE_TELEGRAM_OWN_BOT_USERNAME=
DENTE_TELEGRAM_OWN_BOT_TOKEN=
DENTE_TELEGRAM_OWN_WEBHOOK_SECRET=
DENTE_TELEGRAM_CLINIC_BOT_USERNAME=
DENTE_TELEGRAM_CLINIC_BOT_TOKEN=
DENTE_TELEGRAM_CLINIC_WEBHOOK_SECRET=
DENTE_TELEGRAM_CLINIC_BOTS_JSON=
DENTE_TELEGRAM_WEBHOOK_BASE_URL=
DENTE_TELEGRAM_PATIENT_PORTAL_BASE_URL=
DENTE_TELEGRAM_WELCOME_IMAGE_URL=
# DENTE_TELEGRAM_CLINIC_BOTS_JSON records may also include:
# "visualCardUrls": { "mainMenu": "https://...", "documents": "https://...", "tax": "https://...", "billing": "https://...", "care": "https://...", "review": "https://...", "staff": "https://..." }
# "postVisitCheckupDelayHoursByTopic": { "extraction": 24, "implantation": 24, "filling_restoration": 48, "endo": 48, "surgery": 24, "local_anesthesia": 24, "hygiene": 72, "prosthetics": 48, "orthodontics": 72, "periodontology": 72, "other": 48 }
# "reviewRequestDelayHours": 5
DENTE_TELEGRAM_SEND_TIMEOUT_MS=12000
DENTE_TELEGRAM_OUTBOX_WORKER_ENABLED=0
DENTE_TELEGRAM_OUTBOX_WORKER_INTERVAL_MS=60000
DENTE_TELEGRAM_OUTBOX_WORKER_BATCH_LIMIT=10
DENTE_TELEGRAM_OUTBOX_WORKER_DRY_RUN=0
DENTE_TELEGRAM_OUTBOX_WORKER_RUN_ON_START=0
DENTE_TELEGRAM_CHAT_HASH_SALT=
DENTE_TELEGRAM_CHAT_ENCRYPTION_KEY=
DENTE_TELEGRAM_LINK_CODE_SALT=
```

Do not commit real bot tokens. The token pasted during development must be rotated in BotFather before production use.

## Tenant model

Two bot modes must exist from the first real product version:

- `shared_dente_bot`: one platform bot. Tenant and clinic are resolved by one-time link code and stored chat binding.
- `clinic_owned_bot`: clinic-supplied bot mode. The current prototype supports it through server-only env configuration per organization/clinic; browser-side token entry remains intentionally unsupported until encrypted per-clinic token storage, tenant auth, webhook-secret rotation and audit are implemented.

Required database tables before production:

- `telegram_bot_configs`: organization, clinic nullable, mode, bot username, encrypted token, webhook secret hash, status, timestamps.
- `telegram_link_codes`: hashed one-time code, tenant, clinic, bot config, patient/staff subject, short TTL, used timestamp.
- `telegram_chat_links`: tenant, clinic, bot config, Telegram user/chat ids as encrypted or fingerprinted values, patient/staff subject, active/revoked status.
- `telegram_events`: redacted inbound/outbound audit, template id, communication task id, Telegram update/message ids, status and warnings.

Current prototype behavior:

- chat fingerprints are one-way salted hashes for audit/link listing;
- outbound transport refs are encrypted with AES-256-GCM from `DENTE_TELEGRAM_CHAT_ENCRYPTION_KEY`;
- if the encryption key is missing, linking still works for inbound identity but outbound delivery is marked `transport_not_ready`;
- clinic-owned bot tokens can come from `DENTE_TELEGRAM_OWN_BOT_TOKEN`, `DENTE_TELEGRAM_CLINIC_BOT_TOKEN` or `DENTE_TELEGRAM_CLINIC_BOTS_JSON`; the JSON form allows `{ organizationId, clinicId, botConfigId, botUsername, botToken, webhookSecret, patientPortalBaseUrl, welcomeImageUrl, visualCardUrls, postVisitCheckupDelayHoursByTopic, reviewRequestDelayHours, clinicReviewUrl, clinicMapsUrl }` records and is the prototype path for multiple clinics on one deployment;
- the API never returns the bot token, raw chat id, link code hash, or encrypted transport ref to the browser.

Document persistence hardening added on 2026-05-19:

- `generated_documents.tax_payer_inn` keeps tax-document payer scope in PostgreSQL, matching the file-backed runtime model.
- `generated_documents.payload_json` keeps structured document payloads such as anesthesia, medication and lab work orders instead of dropping them in production storage.

The current persistent JSON state is an MVP continuity layer only. It is not tenant-grade storage.

## Patient bot actions

Safe default actions:

- link patient profile with one-time code;
- show next appointment as clinic/date/time/address only;
- hide old appointments that already ended beyond the short dispatch grace window;
- confirm appointment;
- request reschedule;
- request callback;
- complete non-diagnostic intake questionnaire;
- receive appointment reminders without diagnosis or procedure details;
- receive document-ready notice with secure portal link only;
- request tax document preparation status;
- receive generic post-visit instruction templates;
- receive recall reminders.
- receive a generic review request with a clinic-level HTTPS review/maps link only.
- open safe inline buttons for documents, care instructions, schedule, map/review and administrator handoff without remembering commands.
- split long photo captions: when a visual-card message exceeds Telegram's caption limit, send the image with a short safe caption and the full text as a follow-up message with the inline buttons.

Blocked by default:

- diagnosis;
- treatment plan contents;
- tooth numbers;
- prescriptions;
- CBCT, X-ray, intraoral photo and DICOM files;
- medical record copies;
- tax PDFs;
- payment itemization that exposes treatment;
- free-form clinical advice.

## Staff bot actions

Safe default staff actions:

- daily schedule digest by role;
- role-scoped daily digest uses only counters: visible appointment count, open task count and urgent task count. It must not include patient names, treatment reasons, teeth, amounts, document ids or payment facts.
- confirmation queue alerts;
- patient asked to reschedule/callback;
- communication task assignment/escalation;
- document readiness counters without document body;
- post-visit instruction task reminders;
- missing-payment or missing-document alerts without PHI payload.

Staff commands must be resolved server-side through organization, clinic, role and linked Telegram identity. Frontend-selected role is never authorization.

The staff digest may use its own `visualCardUrls.staff` media asset and keeps only `Расписание`, `Связь` (`dente:contact`) and main-menu buttons. Patient relinking must revoke only older patient chat links for that subject; active staff chat links in the same clinic remain active.

## Linking flow

Patient:

1. Staff opens patient card and creates Telegram link code.
2. DENTE stores only hashed code with 10-15 minute TTL; current API also revokes older pending codes for the same subject.
3. Patient opens `@dentecrm_bot` or clinic-owned bot and sends code/deep-link payload.
4. API validates code, tenant, clinic and subject. Consent enforcement is still a production gate.
5. Bot confirms linking without patient name, diagnosis, treatment, imaging, tax or payment data.
6. CRM records redacted audit event and active chat fingerprint binding.

Staff:

1. Owner/admin enables Telegram for a staff member.
2. Staff receives a one-time code.
3. Bot binds Telegram identity to staff user after code verification.
4. API filters every command by server-side role policy.

No phone-number-only auto-linking. Telegram phone data is not sufficient identity proof for medical records.

## Document and tax boundaries

Telegram can request or notify document status, but generated documents stay in DENTE/secure portal.

The document generator already covers the core clinic set: patient intake, personal-data consent, informed consent, procedure-specific consent, minor/legal representative consent, photo/video consent, refusal, treatment plan, plan acceptance, anesthesia log, prescriptions, lab work order, estimates, installment schedule, contract, invoice/payment memo, act, refund/correction request, recommendations, attendance certificate, warranty memo, medical-record extract/copy request/release receipt, X-ray/CBCT referral, KND 1151156 draft, legacy 2021-2023 certificate draft and tax registry.

Tax basis checked on 2026-05-19:

- FNS says from 2024 medical organizations issue unified certificate KND 1151156; it is based on patient/spouse application, one certificate per patient, two copies, with annual cumulative paid amount.
- FNS says for 2021-2023 expenses the previous form from Minzdrav/MNS order 289/BG-3-04/256 remains relevant.

Medical consent basis checked on 2026-05-19:

- Minzdrav order 1051n defines the informed consent/refusal procedure and forms for medical intervention.
- Minzdrav order 274n (2025-05-13, published 2025-05-30, effective from 2025-09-01) approves unified outpatient medical documentation forms and maintenance procedures. DENTE must treat it as the current source when converting medical-record/extract flows from drafts to exact official forms.

Sources:

- Telegram Bot API: https://core.telegram.org/bots/api
- Telegram Bot API `sendMessage`: https://core.telegram.org/bots/api#sendmessage
- Telegram Bot API `setWebhook` secret token: https://core.telegram.org/bots/api#setwebhook
- FNS KND 1151156 note: https://www.nalog.gov.ru/rn43/news/activities_fts/15525152/
- FNS 2024+ and 2021-2023 tax-document distinction: https://www.nalog.gov.ru/rn26/news/smi/16490481/
- Minzdrav order 1051n reference: https://rg.ru/documents/2021/11/26/minzdrav-prikaz1051-site-dok.html
- Official publication, Minzdrav order 274n: https://publication.pravo.gov.ru/document/0001202505300033

## Production gates

Do not enable PHI-bearing Telegram messages until these are done:

- real authentication and tenant enforcement;
- encrypted token and chat-link storage;
- keep clinic-owned bot tokens server-only; do not add browser token paste until encrypted per-clinic token storage exists;
- consent records per channel;
- outbound template classification: `no_phi`, `limited_admin`, `phi_requires_consent`;
- rate limits for link attempts and commands;
- webhook secret configured through Telegram `setWebhook`;
- per-clinic review/maps URL validation and moderation policy before bulk review campaigns;
- distributed outbound scheduler/worker, retry/backoff, rate limits and dead-letter handling beyond the current bounded in-process due worker and single-item audited send route;
- per-clinic revocation path;
- redacted audit trail in PostgreSQL;
- secure portal for documents and tax PDFs.
