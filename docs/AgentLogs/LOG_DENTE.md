# DENTE work log

## 2026-05-25

What was wrong:

- Telegram post-visit checkup reminders had fixed topic delays in API code.
- Multi-clinic bot runtime config could not override those delays.
- The settings UI had no readable Russian controls for control-after-treatment timing.
- The bot smoke checked delay against wall time, which made the contract weaker than checking against the issued document.

What was done:

- Added shared schema/type for `postVisitCheckupDelayHoursByTopic`.
- Added API defaults, normalization, persistence merge and outbox scheduling through clinic settings.
- Added clinic-owned bot env parsing for nested and legacy flat checkup delay keys.
- Added DB schema/migration column `post_visit_checkup_delay_hours_json`.
- Added Russian first-run and full Telegram settings controls for checkup delay hours.
- Updated smoke/source contracts and DENTE Telegram documentation.

Verification:

- `npm run build -w @dental/api`
- `npm run smoke:telegram-bot`
- `npm run smoke:telegram-control-ui-source`
- `npm run smoke:db-runtime-contract`
- `npm run smoke:telegram-outbox-sla-source`
- `npm run smoke:onboarding-configuration-source`
- `npm run typecheck -w @dental/shared`
- `npm run typecheck -w @dental/web`
- `npm run build -w @dental/web` passed; Vite kept the existing large chunk warning.
# 2026-05-25 - Telegram care topics completeness

What was wrong:
- Telegram post-visit settings already had clinic-configurable delays for endodontics, surgery, local anesthesia, prosthetics, orthodontics and periodontology.
- The patient bot exposed only extraction, implantation, filling and hygiene buttons, so part of the configuration was invisible and patients had to type free text.

What was done:
- Added first-class workflow codes for the missing care topics.
- Added Russian inline buttons for all visible post-visit care topics.
- Added server-side Telegram callback routing, specific patient guidance, doctor task creation/reuse and audit actions for the new topics.
- Added free-text routing for common Russian phrases such as canals, surgery, anesthesia, crowns, braces and gums.
- Connected the web document workflow so Telegram care tasks preselect the correct `post_visit_recommendations` topic.
- Updated DENTE Telegram documentation and runtime/source smokes.

Operational result:
- Bot remains button-first and visual-card capable.
- Each topic keeps one stable route from Telegram callback -> doctor task -> post-visit recommendation document -> outbox reminder.
- No medical/tax identifiers are embedded in callback payloads or portal URLs.

Verification:
- `npm run build -w @dental/api`: passed.
- `npm run smoke:telegram-bot`: passed, 49 processed webhook scenarios.
- `npm run smoke:telegram-control-ui-source`: passed.
- `npm run smoke:document-payload-ui-source`: passed.
- `npm run smoke:russian-fallback-source`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/web`: passed.

# 2026-05-25 - Telegram billing document request

What was wrong:
- Telegram document menu had tax, medical records and patient forms, but no explicit patient path for invoices, receipts, acts, installments or refund/correction documents.
- Generic words like `чек` and `оплата` could push a normal billing request into the tax flow.

What was done:
- Added `telegram_billing_document_request` to the shared workflow contract.
- Added `dente:billing` as a safe allowlisted callback.
- Added "Оплата и чеки" to the Telegram documents menu.
- Added server-side administrator task creation/reuse for billing documents.
- Added free-text routing for payment, invoice, receipt, installment, act and refund phrases.
- Connected the web document workflow to preselect financial document kinds from billing Telegram tasks.
- Updated Telegram bot smoke, source-smoke, document UI smoke and DENTE Telegram docs.

Operational result:
- Financial documents now have a separate route from Telegram -> administrator task -> protected billing portal.
- Tax requests stay tax-specific; plain receipts/invoices no longer depend on the tax flow.
- No amounts, payer ids, document ids or payment ids are embedded in Telegram callbacks or portal handoff URLs.

Verification:
- `npm run build -w @dental/api`: passed.
- `npm run smoke:telegram-bot`: passed, 51 processed webhook scenarios.
- `npm run smoke:telegram-control-ui-source`: passed.
- `npm run smoke:document-payload-ui-source`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/web`: passed.

# 2026-05-25 - First-run Telegram completeness and payment inline actions

What was wrong:
- First-run Telegram setup exposed only five image slots and hid tax, billing and staff scenario media.
- First-run post-visit control showed only four delay topics while the bot already supported more care workflows.
- Payment reminders had a protected billing portal handoff but no direct `Оплата и чеки` / `Документы` inline actions.
- High-value scenarios existed in settings but were not visible in the onboarding quick toggle list: payment reminders, recalls, callback requests and staff daily digest.

What was done:
- Expanded first-run visual-card setup to cover main menu, appointment, documents, tax, billing, care, review and staff.
- Removed the four-topic onboarding limit and now render all post-visit delay fields.
- Added payment reminders, recall reminders, callback requests and staff daily digest to first-run quick scenarios.
- Added billing and documents callbacks to `payment_reminder_notice`.
- Extended onboarding and bot smoke contracts so these routes cannot silently disappear.

Operational result:
- A new clinic can configure the whole Telegram surface during first launch instead of discovering hidden settings later.
- Payment reminder messages are button-first and can move the patient to billing or document requests without commands.
- Tax/billing/staff media are now first-class onboarding configuration, matching the multi-clinic/clinic-owned bot model.

Verification:
- `npm run smoke:onboarding-configuration-source`: passed.
- `npm run smoke:telegram-control-ui-source`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:russian-fallback-source`: passed.
- `npm run smoke:document-payload-ui-source`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:telegram-bot`: passed, 51 processed webhook scenarios.
- `npm run smoke:tax-knd-xml`: passed.
- `npm run smoke:tax-registry-fiscal`: passed.
- `npm run smoke:document-guards`: passed.
- `npm run smoke:document-payloads`: passed.

# 2026-05-25 - Staff-safe Telegram digest, schedule truth, and document payload hardening

What was wrong:
- Staff Telegram digest was concept-level but not strict enough: it needed server-side role scoping, a staff visual card, and independent coexistence with patient chat links.
- Linked patient schedule replies could depend on old sample appointments instead of proving upcoming-only behavior.
- Schedule gap suggestions could imply fake availability when adjacent appointments did not share a real resource.
- Financial document payload dates accepted weak date-like strings.
- Telegram photo transport silently truncated captions over Telegram's limit.

What was done:
- Added `staffId` to Telegram message preview input and used it in outbox rendering.
- Built staff daily digest from role-scoped appointment/task counters only, with `visualCardUrls.staff` and staff-safe inline buttons.
- Kept patient relink revocation scoped to patient links while active staff links survive.
- Made patient overlap a hard appointment conflict and kept stale ended appointments out of linked schedule replies.
- Restricted schedule gap suggestions to same doctor, assistant or chair.
- Added real-date validation for act, estimate, invoice, receipt and installment payload fields.
- Allowed sparse clinic legal profiles only for internal workflow drafts, while payment/tax/legal documents still block.
- Split long Telegram visual-card messages into short photo caption plus full follow-up text with inline actions.

Operational result:
- Doctors can receive a safe DENTE staff digest without patient names, treatment details, teeth, payment data or document ids.
- Patients see only actionable upcoming schedule data.
- Invalid fiscal/payment dates fail before document creation/issue.
- Telegram media no longer drops approved message text silently.

Verification:
- `npm run build -w @dental/shared`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:telegram-bot`: passed, 52 processed webhook scenarios.
- `npm run smoke:schedule-configuration`: passed.
- `npm run smoke:document-payloads`: passed.
- `npm run smoke:document-guards`: passed.
- `npm run smoke:documents-catalog`: passed.
- `npm run smoke:document-lifecycle`: passed.
- `npm run smoke:russian-fallback-source`: passed.
- `npm run smoke:telegram-control-ui-source`: passed.
- `npm run smoke:onboarding-configuration-source`: passed.
- `npm run smoke:document-payload-ui-source`: passed.
- `npm run smoke:settings-preferences`: passed.
- `npm run smoke:tax-knd-xml`: passed.
- `npm run smoke:tax-registry-fiscal`: passed.
# 2026-05-25 - Tax intake before receipts and Telegram staff/contact UX

What was wrong:
- `tax_deduction_application` behaved like a final tax certificate and required selected fiscal payments too early.
- The tax application renderer could expose internal payment ids instead of human fiscal receipt labels.
- Persisted-state cold start could crash because Telegram checkup defaults were read before initialization.
- Generated Telegram QR/deep-link cards could stay visible after switching patient, staff, bot mode or clinic bot config.
- Linked staff schedule replies had no staff-safe keyboard and could fall back to patient-oriented linked actions.
- Linked `/start` always explained QR onboarding instead of showing the already-linked patient/staff menu.
- Several contact-labeled Telegram buttons pointed to `dente:clinic`, which is QR guidance, not administrator handoff.
- Web Telegram preview had no staff digest button and preview ignored selected clinic-owned runtime scope.

What was done:
- Allowed empty `selectedPaymentIds` for `tax_deduction_application`, while keeping receipt selection mandatory for final certificates/registries.
- Rendered a pending-receipt note for applications without selected payments and removed internal UUID output from the application table.
- Made certificate issue matching accept a matching application without receipts as a pre-request, while non-empty application receipt selections remain exact.
- Moved Telegram post-visit checkup defaults above persistent-state hydration.
- Added QR target invalidation keyed by subject, patient/staff id, bot mode and bot config id.
- Passed runtime bot settings into linked schedule replies and preview rendering.
- Added staff schedule/digest inline keyboard with schedule, contact and main-menu actions.
- Made linked `/start` return a linked patient/staff menu instead of QR onboarding.

# 2026-05-25 - Clinic-scoped first-run onboarding fallback

What was wrong:
- Local onboarding fallback completion used one browser-wide key.
- New clinic/profile contexts could inherit a previous clinic's dismissed onboarding state on the same workstation.

What was done:
- Added `onboardingLocalKey(organizationId)`.
- Scoped onboarding fallback load/save by clinic organization id.
- Added post-hydration scoped fallback restore after UI preferences and dashboard clinic profile are available.
- Updated first-run and UI preference smokes for organization-aware onboarding persistence.

Operational result:
- First-run master is no longer hidden by a different clinic's local fallback completion.
- Full completion, draft continuation and reopen all write clinic-scoped fallback state.

Verification:
- `npm run smoke:onboarding-configuration-source`: passed.
- `npm run smoke:ui-preferences`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:settings-preferences`: passed.
- `npm run smoke:settings-persistence-file`: passed.
- Changed contact-labeled template buttons to `dente:contact`.
- Added staff digest preview button in the Telegram settings panel.
- Extended smoke contracts for scoped preview, staff preview payload and contact handoff buttons.

Operational result:
- Clinics can register tax deduction requests before cash-office reconciliation and attach receipts later.
- Telegram UI is less command-driven: staff and patients get buttons that match the visible action text.
- Clinic-owned bot previews now use the same selected runtime scope as outbox/link operations.
- QR cards no longer silently target the wrong person or wrong bot config after operator navigation.

Verification:
- `npm run build -w @dental/shared`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:tax-registry-fiscal`: passed.
- `npm run smoke:document-guards`: passed.
- `npm run smoke:tax-document-explicit-payment-scope`: passed.
- `npm run smoke:document-payloads`: passed.
- `npm run smoke:documents-catalog`: passed.
- `npm run smoke:telegram-bot`: passed, 52 processed webhook scenarios.
- `npm run smoke:telegram-control-ui-source`: passed.
- `npm run smoke:telegram-outbox-lookup`: passed.
- `npm run smoke:telegram-outbox-persistence`: passed.
- `npm run smoke:telegram-handoff-source`: passed.
- `npm run smoke:telegram-validation`: passed.
- `npm run smoke:telegram-admin-guard`: passed.
- `npm run smoke:ui-preferences`: passed.
- `npm run smoke:settings-preferences`: passed.

# 2026-05-25 - Refund source payment scope and clinic-scoped saved selections

What was wrong:
- Refund/correction payloads carried action, amount and receipt text but not the actual source payment ids.
- API paid-amount calculation and renderer could fall back to visit-wide paid facts for refund/correction.
- The browser form let staff type an original fiscal receipt manually without forcing a ledger row.
- Saved tax/payment receipt selections were patient/year/visit-scoped but not clinic-scoped.

What was done:
- Required `paymentRefundCorrection.selectedPaymentIds` in shared schema and blocked duplicate source payment ids.
- Added API validation for selected refund source payments: patient, visit, paid status, positive amount, fiscal receipt number/date and original receipt match.
- Scoped refund/correction paid amount and rendered/issued payment rows to selected source payment ids only.
- Added `Исходный платеж` select in the document UI with amount, fiscal receipt label and date; selection pre-fills amount, payer and original receipt fields.
- Added organization id to local tax and payment receipt selection keys.
- Extended smoke tests for missing selection, other-visit rejection, selected paid-amount scope, refund UI source selection and clinic-scoped local keys.

Operational result:
- A refund/correction document can no longer borrow paid amount from unrelated receipts in the same visit.
- Staff use ledger-backed source data instead of retyping receipt facts from memory.
- Multi-clinic browser sessions no longer share saved payment selections between clinics.

Verification:
- `npm run build -w @dental/shared`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:document-guards`: passed.
- `npm run smoke:document-payloads`: passed.
- `npm run smoke:document-payload-ui-source`: passed.
- `npm run smoke:documents-catalog`: passed.
- `npm run smoke:visit-workflow-forms-lifecycle`: passed.
- `npm run smoke:ui-preferences`: passed.
- `npm run smoke:tax-document-explicit-payment-scope`: passed.
- `npm run smoke:russian-fallback-source`: passed.
- `npm run build -w @dental/web`: passed with Vite large-chunk warning only.

# 2026-05-25 - Clinic-scoped local document drafts and issue defaults

What was wrong:
- Browser fallback for document issue signature defaults used one global key.
- Outpatient 025/u local draft key lacked clinic organization id.
- Signature mode select trusted a raw DOM value cast.

What was done:
- Added `documentIssueSignatureLocalKey(organizationId)` and scoped signature default load/save with legacy fallback.
- Hydrated scoped signature defaults only after UI preferences and clinic profile are available, and only when newer than saved UI preferences.
- Required organization id in 025/u local document draft key.
- Replaced document issue signature mode cast with normalized value handling.
- Extended source smokes for clinic-scoped document convenience state.

Operational result:
- Shared workstations no longer carry document issue defaults or 025/u local drafts across clinic organization contexts.
- Future changes to signature mode options go through the same normalization as storage.

Verification:
- `npm run smoke:document-payload-ui-source`: passed.
- `npm run smoke:ui-preferences`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:settings-preferences`: passed.
- `npm run smoke:settings-persistence-file`: passed.
- `npm run smoke:document-legal-confirmations`: passed.
- `npm run smoke:document-payloads`: passed.

# 2026-05-25 - Telegram control select normalization

What was wrong:
- Telegram bot mode, privacy, QR subject and outbox filters trusted raw DOM strings via TypeScript casts.
- A corrupted browser/preference state could persist an impossible control value.

What was done:
- Added normalizers for Telegram bot mode, privacy mode, QR subject type, outbox status filter and outbox template filter.
- Replaced raw Telegram select casts with normalized setters in first-run onboarding and Settings.
- Extended Telegram UI and UI preference smokes to reject those raw casts.

Operational result:
- Clinic-owned bot setup and Telegram outbox filters now fail closed into safe defaults instead of storing invalid values.

Verification:
- `npm run smoke:telegram-control-ui-source`: passed.
- `npm run smoke:ui-preferences`: passed.
- `npm run typecheck -w @dental/web`: passed.

# 2026-05-25 - Workflow select normalization for schedule, documents and rules

What was wrong:
- Remaining schedule, document and clinical-rule selects used raw `event.target.value as ...` casts.
- A bad runtime DOM value could enter persisted preferences, local drafts, appointment status mutations, typed document payloads, refund/void workflows or clinical-rule settings before validation.

What was done:
- Added generic option/string-union validators and explicit normalizers in `apps/web/src/App.tsx`.
- Replaced raw DOM casts for appointment status/filter, selected document kind, patient intake, tax application, procedure consent, treatment-plan acceptance, post-visit care, X-ray/CBCT, outpatient 025/u codes, medical release channels, refund/correction, document void and clinical-rule editor fields.
- Extended `smoke:ui-preferences`, `smoke:document-payload-ui-source` and `smoke:schedule-configuration` so the old cast patterns fail source checks.
- Updated DENTE UX and document-generation docs with the new rule.

Operational result:
- Saved configuration and real document payload state now fail closed into known defaults instead of storing impossible enum values.
- The browser can still be convenient, but it no longer treats TypeScript casts as runtime validation.

Verification:
- `npm run smoke:ui-preferences`: passed.
- `npm run smoke:document-payload-ui-source`: passed.
- `npm run smoke:schedule-configuration`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:document-payloads`: passed.
- `npm run smoke:settings-preferences`: passed.
- `npm run smoke:document-legal-confirmations`: passed.

# 2026-05-25 - Configurable Telegram review request delay

What was wrong:
- Review request outbox scheduling still used a hardcoded 2-hour delay after visit/payment closure.
- Clinic-owned bot JSON could tune visual cards, post-visit care delays and review/map URLs, but not generic review request timing.
- First-run onboarding and Settings did not expose this policy, so operators could not tune it without code edits.

What was done:
- Added `reviewRequestDelayHours` to shared Telegram settings with 1-720h bounds.
- Normalized and persisted the setting in API runtime state.
- Passed runtime settings into review outbox scheduling for visits and payments.
- Added `review_request_delay_hours` to the Telegram bot config schema and migration `0023_telegram_review_request_delay.sql`.
- Added `reviewRequestDelayHours` support to `DENTE_TELEGRAM_CLINIC_BOTS_JSON`.
- Added the Russian numeric control to first-run Telegram onboarding and the full Telegram settings panel.
- Extended smoke/source contracts to prove persistence, DB shape, env parsing and exact scheduled time.

Operational result:
- Clinics can decide when DENTE asks for a review after a closed visit/payment.
- The value is server-owned and stable until changed.
- Multi-clinic deployments can run different review timing per clinic-owned bot.

Verification:
- `npm run build -w @dental/shared`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:telegram-bot`: passed, 52 processed webhook scenarios.
- `npm run smoke:telegram-control-ui-source`: passed.
- `npm run smoke:db-runtime-contract`: passed.
- `npm run smoke:telegram-outbox-sla-source`: passed.
- `npm run smoke:onboarding-configuration-source`: passed.
- `npm run smoke:settings-preferences`: passed.
- `npm run smoke:ui-preferences`: passed.

# 2026-05-25 - Russian price-list result labels and QR download copy

What was wrong:
- Settings -> Price list analysis showed raw internal material/restoration/crown values in result cards.
- Telegram QR download UI exposed visible `QR SVG` wording instead of Russian operator copy.

What was done:
- Added display-only price-list label helpers in `apps/web/src/App.tsx`.
- Mapped material kinds, restoration types and known crown-type strings to Russian labels at render time.
- Replaced raw summary/detail joins with `pricelistMaterialSummaryText` and `pricelistItemMaterialText`.
- Renamed visible QR download action copy to `Скачать QR` / `QR-код скачан`.
- Extended `smoke:pricelist-analyzer` to fail on raw JSX enum joins or visible `QR SVG` regressions.

Operational result:
- Doctors and administrators review imported price lists using readable Russian labels.
- API/analyzer DTO codes stay stable for catalog matching and future multilingual UI.

Verification:
- `npm run smoke:pricelist-analyzer`: passed.
- `npm run typecheck -w @dental/web`: passed.

# 2026-05-25 - Clinic-scoped local imaging recovery

What was wrong:
- Browser-local imaging recovery used one key for the whole browser profile.
- The selected local CT/DICOM folder, browser-picked folder summary, DICOM workbench and per-study viewer draft could be reused after switching to another clinic organization on the same workstation.

What was done:
- Added reusable `organizationScopedLocalStorageKey`.
- Scoped local DICOM workbench, local imaging folder and browser-picked folder recovery by `organizationId`.
- Scoped per-study imaging viewer draft keys with the active organization id.
- Rehydrated local imaging recovery after dashboard clinic profile load.
- Kept legacy keys as read fallback and clear them when the active scoped recovery is cleared.
- Updated browser-file input smoke to accept organization-scoped browser-picked keys.
- Extended `smoke:ui-preferences` to require scoped local imaging recovery wiring.

Operational result:
- Shared clinic workstations keep local imaging recovery per organization.
- Existing unscoped recovery is still readable after upgrade.
- Server-side workbench bundles remain redacted and pixel-free.

Verification:
- `npm run smoke:ui-preferences`: passed.
- `npm run typecheck -w @dental/web`: passed.

# 2026-05-25 - Telegram public settings normalization

What was wrong:
- First-run Telegram setup still allowed several bad values to travel too far before rejection.
- Public URL fields for webhook, patient portal, welcome image, visual cards, review and maps could fail only after API save.
- Shared and clinic-owned bot usernames were posted from the browser as raw trimmed strings.
- Clinic-owned bot runtime config from `DENTE_TELEGRAM_CLINIC_BOTS_JSON` accepted raw URL strings before scoped runtime merge.

What was done:
- Added `normalizeTelegramPublicHttpsUrlDraft()` in `apps/web/src/App.tsx`.
- Added `normalizeTelegramVisualCardUrlDraftsForSave()` for every scenario image slot.
- Added `normalizeTelegramBotUsernameDraft()` and used it for `botUsername` and `ownBotUsername`.
- Changed `saveTelegramSettings()` to normalize values first, update drafts to canonical values, and only then send the settings payload.
- Added `safeDenteTelegramPublicHttpsUrl()` in `apps/api/src/sampleData.ts`.
- Changed `apps/api/src/routes/telegram.ts` so clinic-owned JSON bot config URL fields are normalized or ignored before runtime settings merge.
- Extended `scripts/smoke-telegram-url-ui-source.mjs` and `scripts/smoke-telegram-control-ui-source.mjs` to prevent raw URL/username regressions.

Operational result:
- A doctor/admin configuring `@dentecrm_bot` or a clinic-owned bot gets immediate Russian validation for wrong bot names and unsafe links.
- Public DENTE/Telegram links no longer keep hash fragments, credentials, patient ids, visit ids, document ids, tokens, phone/INN/SNILS-like numbers or sensitive query keys.
- Multi-clinic bot configs from environment cannot inject patient-specific portal/review/maps links into scoped runtime status.

Verification:
- `npm run smoke:telegram-url-ui-source`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:telegram-control-ui-source`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:telegram-bot`: passed, 52 webhook scenarios.
- `npm run smoke:onboarding-configuration-source`: passed.
- `npm run smoke:russian-fallback-source`: passed.
- `npm run smoke:ui-preferences`: passed.

# 2026-05-25 - Active-visit guard for pending STT queue

What was wrong:
- Offline STT chunks can survive a visit or clinic switch.
- The server response carries `visitId`, but the web client appended every flushed transcription to the currently open visit transcript.
- A restored fragment from another visit could therefore pollute the active card.

What was done:
- Added `speechTranscriptionMatchesActiveVisit()`.
- Guarded `applySpeechTranscription()` before it appends text to the visit transcript.
- Changed pending STT flush so recording assembly only runs for results that match the active visit.
- Added `smoke:speech-queue-source` and wired it into `package.json`.
- Updated `docs/05-speech-transcription-plan.md` so the offline queue ownership rule is documented and smoke-checked.

Operational result:
- Offline STT still syncs to the server.
- Foreign visit chunks are not added to the current chart.
- Current-visit assembly is no longer triggered by unrelated queued recordings.

Verification:
- `npm run smoke:speech-queue-source`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:russian-fallback-source`: passed.
- `npm run smoke:speech-queue-source`: passed again after docs guard.
- `npm run typecheck -w @dental/web`: passed again after docs guard.
- `npm run smoke:document-payload-ui-source`: passed as a document form regression sweep.
- `npm run smoke:document-payloads`: passed as a document payload regression sweep.

# 2026-05-25 - Protocol selection reconciliation

What was wrong:
- `selectedProtocolId` was saved and restored, but dashboard-scoped preference reconciliation skipped protocol template ownership.
- A stale protocol id from a removed template, changed protocol library or another clinic could remain in preferences until a later specialty-specific UI effect cleared it.

What was done:
- Added a `dashboard.protocolTemplates` id set inside `reconcileDashboardScopedUiSelections()`.
- Cleared `selectedProtocolId` when the saved id is absent from the current dashboard template set.
- Added `selectedProtocolId` to the reconciliation effect dependencies.
- Extended `smoke:ui-preferences` to require the protocol id set and stale protocol guard.

Operational result:
- Saved protocol configuration still persists while valid.
- Removed or foreign clinic protocol ids no longer survive dashboard reconciliation.
- Multi-clinic browser profiles are less likely to show misleading clinical protocol defaults.

Verification:
- `npm run smoke:ui-preferences`: passed.
- `npm run smoke:settings-preferences`: passed.
- `npm run typecheck -w @dental/web`: passed.

# 2026-05-25 - Clinic-scoped local visit draft recovery

What was wrong:
- Browser-local visit draft recovery was keyed only by `visitId`.
- That is usually unique in production, but weak for shared workstations, demo/sample ids and multi-clinic browser profiles.

What was done:
- Changed `visitLocalDraftKey` to accept organization id and use `organizationScopedLocalStorageKey`.
- Made `loadVisitLocalDraft` read scoped storage first and fall back to the previous unscoped key.
- Made visit draft autosave write the organization-scoped key.
- Added `activeOrganizationId` to the restore/autosave effect dependencies.
- Extended `smoke:ui-preferences` with source checks for scoped local visit draft recovery.

Operational result:
- Local clinical drafts still recover after upgrade.
- A clinic switch no longer relies on visit id uniqueness alone for local draft isolation.
- The visit draft path now follows the same tenant boundary as document signature, onboarding and imaging recovery.

Verification:
- `npm run smoke:ui-preferences`: passed.
- `npm run typecheck -w @dental/web`: passed.

# 2026-05-25 - Document catalog coverage and FNS source anchor drift

What was wrong:
- `personal_data_processing_consent` was a real document kind and rendered successfully, but the main operator-facing document catalog omitted it.
- `smoke:documents-catalog` proved rendering count, but did not prove every document kind had a catalog entry in `docs/12-document-generation-forms.md`.
- FNS documentation anchors drifted: docs still had old `soc_nv_pm` and `imns39_08` paths while pinned source metadata used canonical official pages.
- The docs source-check date was behind the pinned FNS manifest date.

What was done:
- Added personal-data processing consent to the document catalog, structured-payload rules, UI validation notes and README structured payload summary.
- Added a `DocumentKind -> docs fragment` coverage map to `scripts/smoke-documents-catalog.mjs`.
- Updated FNS official-source docs anchors to the canonical medical deduction page and KND 1151156 filling-note page.
- Extended `scripts/smoke-official-document-sources.mjs` to require those canonical URLs, reject stale paths, and match the docs date to the pinned FNS manifest.
- Split FNS tax document metadata to `sourceCheckedAt = 2026-05-25` without pretending every non-FNS medical/legal source was rechecked.

Operational result:
- DENTE now fails smoke checks if a real document kind renders but is absent from the operator documentation catalog.
- Tax document source notes now point to one current official FNS route instead of mixed old/new anchors.
- Source-date metadata is more honest: FNS was rechecked; unrelated sources were not silently bumped.

Verification:
- `npm run build -w @dental/shared`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:official-document-sources`: passed.
- `npm run smoke:documents-catalog`: passed, 31 rendered forms.
- `npm run smoke:document-payloads`: passed.

# 2026-05-25 - Dashboard-scoped saved selection reconciliation

What was wrong:
- Saved selected patient, schedule staff/chair filters, appointment default staff/chair ids and Telegram staff QR target were shape-valid preferences, but not reconciled against the current clinic dashboard.
- A stale UUID from another clinic or deleted staff/chair could remain in the UI after dashboard load.

What was done:
- Added `reconcileDashboardScopedUiSelections()` in `apps/web/src/App.tsx`.
- Invalid selected patient now falls back to the first active patient in the current dashboard.
- Invalid doctor/assistant/chair filters and appointment defaults are cleared so current dashboard defaults can take over.
- Invalid Telegram staff QR target is cleared.
- Extended `smoke:ui-preferences` with source checks for these guards.

Operational result:
- Saved configuration still persists until changed, but stale ids no longer poison the current clinic workspace.
- Multi-clinic browser profiles recover without forcing a full preference wipe.

Verification:
- `npm run smoke:ui-preferences`: passed.
- `npm run typecheck -w @dental/web`: passed.

# 2026-05-31 - CT OPG and cross-section reconstruction plan

What was wrong:
- CT planning could store an ОПТГ curve and cross-section intent, but did not compute a route-level reconstruction plan from the actual curve.
- Export/handoff could imply OPG readiness without naming curve length, cross-section spacing, derived slice count, slab width or workstation scaling.

What was done:
- Added `apps/web/src/ctPlanningReconstruction.ts`.
- Added `apps/web/src/ctPlanningReconstructionPanel.tsx`.
- `ctPlanningState` now exposes `reconstructionPlan` from merged saved/local annotations.
- `ctPlanningExport` now treats missing OPG/cross-section reconstruction plan as a handoff gap.
- `CtPlanningToolsPanel` now renders a dedicated ОПТГ/cross-section board.
- Vite, bundle budget, code-split smoke and imaging source smoke now cover the two new CT chunks.
- `docs/10-imaging-dicom-viewer-plan.md` now states the boundary: route/quality plan only, not pixel export or certified viewer replacement.

Cinematic cheats used:
- Structural-curve route plan instead of fake panoramic pixel generation.
- Continuous `qualityWeight` changes derived cross-section density only; it does not mutate clinical measurements, DTO identity, or handoff truth.
- Derived slice count is capped at 160 for weak workstations.

Exact microseconds saved:
- 0 measured. No profiler artifact was produced.
- Static budget protected: `ct-planning-tools` stayed at 17,886 bytes under the 18,000 byte budget; new reconstruction logic is split into a 4,382 byte chunk and UI into a 1,410 byte chunk.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---
Date: 2026-06-03

Slice: Visit draft mutation response hardening

What was wrong:
- Visit draft autosave/accept malformed payloads were bounded, but state failures still depended on visit domain exception text.
- Closed signed/voided visit saves returned correct 409 status but did not prove bounded `reason` and non-raw operator copy.
- Unknown visit autosave returned correct 404 status but did not prove stable body shape.

What was done:
- Added `visitDraftDomainMessage()` as a private classifier only.
- Unknown visit draft mutation now returns `VisitNotFound`, `reason: visit_not_found`, and route-owned message.
- Closed visit autosave/accept now return `VisitDraftMutationRejected`, `reason: visit_closed`, and operation-specific route-owned copy.
- Updated `smoke:visit-route-validation` source guards.
- Expanded `smoke:visit-draft-status-contract` to assert body shape and forbid route/schema/DTO/raw-domain leakage.
- Updated `04-product-risk-audit.md`.

Cinematic cheats used:
- No visit model rewrite.
- No autosave persistence rewrite.
- No React visit UI rewrite.
- One route classifier plus stricter runtime smoke fixed the public contract without touching valid draft paths.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: one string classification and one invalid-request response object only on rejected visit draft mutations.
- Expected i3/MX350 impact: effectively 0; no valid autosave/accept, dashboard, DICOM, speech, finance, import, or web hot path changed.
- Bundle budget was not used as a gate for this slice by explicit instruction.

Verification:
- `npm run typecheck -w @dental/api`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:visit-route-validation`: passed.
- `npm run smoke:visit-draft-status-contract`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:api-global-error-boundary`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---

Date: 2026-06-03

Slice: Telegram control-plane response hardening

What was wrong:
- Link-code issuing could expose raw chat-encryption or subject-scope domain exception text.
- Message preview could expose raw missing patient/appointment/document/task preview exceptions.
- The Telegram validation smoke covered malformed payloads but not these valid-shaped state rejection bodies.

What was done:
- Added `telegramLinkCodeRejection()` for bounded link-code public responses.
- Added `telegramMessagePreviewRejection()` for bounded message-preview public responses.
- Mapped link-code failures to `TelegramChatEncryptionKeyMissing` / `TelegramLinkCodeScopeInvalid` with bounded `reason`.
- Mapped preview lookup failures to `TelegramMessagePreviewNotFound` with bounded `reason`.
- Extended `smoke:telegram-validation` with source guards plus runtime link-code encryption and missing-patient preview cases.
- Updated `04-product-risk-audit.md`.

Scope control:
- No Telegram transport rewrite.
- No outbox worker rewrite.
- No web Settings rewrite.
- Only expected rejection bodies and proof coverage changed.

Runtime impact:
- Runtime frame path: 0 measured.
- Added cost: one string classification and one invalid-response object only on rejected Telegram control-plane actions.
- Valid Telegram status/outbox/webhook/link-code/preview paths are unchanged.
- Bundle budget was not used as a gate for this slice by explicit instruction.

Verification:
- `npm run typecheck -w @dental/api`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:telegram-validation`: passed.
- `npm run smoke:telegram-control-ui-source`: passed.
- `npm run smoke:telegram-due-worker-source`: passed.
- `npm run smoke:telegram-url-ui-source`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:api-global-error-boundary`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- `npm run smoke:settings-route-validation`: passed.
- `npm run smoke:settings-admin-guard`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
---
Date: 2026-06-03

Slice: Speech chunk rejection response hardening

What was wrong:
- Damaged speech audio could return route/domain decoder copy directly from `SpeechChunkPayloadError`.
- Retry identity conflicts returned the English storage exception about queue identity mismatch.
- Existing speech smokes proved validation/scope/provider failures but did not prove these chunk rejection body contracts.

What was done:
- Added route-owned `SpeechChunkRejected` response handling.
- Mapped damaged audio to `reason: audio_rejected` with Russian recovery copy.
- Mapped retry identity conflict to `reason: chunk_conflict` with queue refresh/retry copy.
- Updated `smoke:speech-route-validation` to reject raw `error.message` send patterns.
- Updated `smoke:speech-clinical-scope` to assert damaged audio and identity-conflict runtime bodies.
- Updated `04-product-risk-audit.md`.

Cinematic cheats used:
- No speech storage rewrite.
- No provider pipeline rewrite.
- No web queue rewrite.
- One route-level public response boundary plus runtime/source smokes fixed the exposed contract.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: one invalid-request response object only on rejected speech chunks.
- Expected i3/MX350 impact: effectively 0; valid dictation chunks, provider fallback, dashboard, DICOM, finance, import, and web hot paths unchanged.
- Bundle budget was not used as a gate for this slice by explicit instruction.

Verification:
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:speech-route-validation`: passed.
- `npm run smoke:speech-clinical-scope`: passed.
- `npm run smoke:speech-provider-errors`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run smoke:speech-groq-chunk-floor`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:api-global-error-boundary`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:speech-queue-source`: passed.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---
Date: 2026-06-03

Slice: AI recognition scope response hardening

What was wrong:
- AI recognition job scope failures returned human text directly in `error`.
- Visit-note draft missing-patient failure used the same unstable human `error` field.
- Existing AI smoke checked status codes but did not lock body shape or leakage terms.

What was done:
- Added `AiRecognitionScopeError` for unknown patient, unknown imaging study, and wrong-patient imaging links.
- Added `VisitNoteDraftScopeError` for missing patient on deterministic visit-note draft.
- Split Russian operator copy into `message`.
- Expanded `smoke:ai-recognition-scope` with source guards and runtime body checks for stable codes and no route/schema/parser leakage.
- Updated `02-ai-and-migration-plan.md` and `04-product-risk-audit.md`.

Cinematic cheats used:
- No AI worker rewrite.
- No deterministic parser rewrite.
- No recognition job model rewrite.
- Two response helpers and one stronger smoke fixed the public contract without touching valid AI/draft paths.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: one invalid-request response object only on rejected AI scope calls.
- Expected i3/MX350 impact: effectively 0; no speech provider, DICOM render, finance, schedule, import, deterministic parser valid path, or UI hot path changed.
- Bundle budget was not used as a gate for this slice by explicit instruction.

Verification:
- `npm run typecheck -w @dental/api`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:ai-recognition-scope`: passed.
- `npm run smoke:core-route-validation`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE node/npm/vite/tsx/tsc/csc build or test process left behind; unrelated Unity Roslyn `dotnet ... VBCSCompiler.dll` was already present and was not touched.

---
Date: 2026-06-03

Slice: Patient route not-found response hardening

What was wrong:
- Patient update routes forwarded domain `error.message` into public `error`.
- Missing route-param fallback used raw `patientId` wording.
- Patient smoke only covered create validation, not stale/missing patient edit responses.

What was done:
- Added `PatientRouteValidationError` for missing route patient selection.
- Added `PatientNotFound` for missing patient card on core update and administrative-profile update.
- Split Russian operator copy into `message`.
- Expanded `smoke:patient-create-contract` with source guards and runtime body checks for not-found responses.
- Updated `04-product-risk-audit.md`.

Cinematic cheats used:
- No patient data model rewrite.
- No persistence rewrite.
- No React patient form rewrite.
- Two response helpers and one stronger smoke fixed the public contract without touching valid patient paths.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: one invalid-request response object only on rejected patient lookup/route failures.
- Expected i3/MX350 impact: effectively 0; no dashboard, schedule, speech, DICOM render, finance, import, or UI hot path changed.
- Bundle budget was not used as a gate for this slice by explicit instruction.

Verification:
- `npm run typecheck -w @dental/api`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:patient-create-contract`: passed.
- `npm run smoke:core-route-validation`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE node/npm/vite/tsx/tsc/csc build or test process left behind; unrelated Unity Roslyn `dotnet ... VBCSCompiler.dll` was already present and was not touched.

---

Date: 2026-06-03
Slice: Visit draft route validation hardening

What was wrong:
- Visit draft autosave and accept routes parsed merged `request.body` payloads directly.
- Invalid doctor draft payloads could expose zod `issues`, parser paths, or fields such as `patientId`, `selectedSpecialty`, `clientMutationId`, `doctorSummary`, `complaint`, `diagnosis`, and `treatmentPlan`.
- The leak could happen before autosave/accept business mutation functions decided not found, closed visit, revision, audit, or receipt behavior.

What was done:
- Added `parseVisitPayload` in `routes/visits.ts`.
- Routed `/api/visits/:visitId/draft/autosave` through a bounded autosave validation message before `upsertVisitDraftAutosave`.
- Routed `/api/visits/:visitId/draft/accept` through a bounded accept validation message before `acceptVisitDraft`.
- Added `smoke:visit-route-validation` with source guards and runtime invalid compiled route checks under a production-style clinical admin secret.
- Updated product risk audit with the visit-draft validation boundary.

Cinematic cheats used:
- No visit mutation rewrite.
- No audit/revision/idempotency changes.
- Shared zod schemas remain the typed machine contract; the route owns only public recovery copy.
- Existing 404/409 domain errors for missing or closed visits stayed intact.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: invalid-request safeParse and string mapping only.
- Expected i3/MX350 impact: effectively 0; no render, DICOM, speech provider, finance, schedule polling, import parsing, or UI hot path changed.
- Bundle budget was not used as a gate for this slice by explicit instruction.

Verification so far:
- `npm run typecheck -w @dental/api`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:visit-route-validation`: passed.
- `npm run smoke:visit-draft-status-contract`: passed.
- `npm run smoke:schedule-active-visit-status-contract`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- Full cross-surface verification is continuing.

---

Date: 2026-06-02
Slice: Speech provider and polish public-error hardening

What was wrong:
- STT provider failures had public/safe wording, but key rotation wrapped typed provider errors into generic errors, losing 429/timeout/status classification before the public warning mapper.
- Neural polish key rotation had the same generic wrapping risk.
- `/api/speech/polish-transcript` validation exposed raw zod issue text.
- The speech queue source smoke still required old `STT-????????` copy even though the UI had moved to clinic-readable "???????? ?????????????..." wording.

What was done:
- Added STT provider failure classification in `speechProviderFailureReason`.
- Preserved `SpeechProviderRequestError` through STT key rotation so rate-limit/auth/timeout/status data reaches the public mapper.
- Added neural-polish failure classification in `speechPolishFailureReason` and preserved typed errors through neural key rotation.
- Replaced raw zod issue joining in the polish route with a stable Russian validation message.
- Added `smoke:speech-provider-errors` with runtime checks for polish validation, synthetic STT 429, and synthetic neural-polish 500.
- Updated speech queue source guard to require the current clinic-readable foreign-visit message and reject old `STT-????????` copy.
- Updated speech plan and product risk audit for this public-error boundary.

Cinematic cheats used:
- No provider SDK rewrite.
- No frontend translation layer invented.
- Kept key-health/fingerprint diagnostics internal and changed only error-path copy/classification.
- Local/deterministic transcript remains the recovery path, so provider failure does not block a visit.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: error-path classification only on failed STT/neural polish calls.
- Expected i3/MX350 impact: effectively 0; no DICOM, render, import, schedule, finance, or polling hot path changed.
- Bundle budget was not used as a gate for this slice by explicit instruction.

Verification:
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:speech-provider-errors`: passed after exposing and driving the typed-error wrapping fix.
- `npm run smoke:speech-clinical-scope`: passed.
- `npm run smoke:speech-groq-chunk-floor`: passed.
- `npm run smoke:speech-key-rotation`: passed.
- `npm run smoke:speech-queue-source`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run build -w @dental/web`: passed; Vite still reports the existing large `workspace` chunk warning.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.

---

Date: 2026-06-02
Slice: Telegram settings validation copy hardening

What was wrong:
- `PUT /api/settings/telegram` could return user-facing messages like `webhookBaseUrl: https_required`.
- Public URL privacy failures exposed raw reason tokens such as `patient_identifying_query_not_allowed`.
- Appointment preview warnings exposed callback/webhook secret env names when signed appointment buttons were disabled.
- The Telegram smoke suite had normalized those raw strings as expected output, so the defect was protected by tests.

What was done:
- Added `readableTelegramSettingsValidationMessage` in the Telegram route.
- Routed both Telegram settings schema parse failures and save failures through that humanizer.
- Mapped invalid URL, non-HTTPS URL, URL credentials, bad path encoding, patient-identifying path/query key and patient-identifying path/query value failures to Russian operator actions.
- Replaced signed appointment callback env-name warnings with "enable signed-button secret in server settings" copy.
- Updated `smoke:telegram-bot` to require human validation fragments and reject raw reason tokens in API messages.
- Updated `smoke:telegram-control-ui-source` to require the server humanizer and reject old raw settings/callback copy.
- Updated `smoke:telegram-url-ui-source` to track the current operator-readable webhook label.
- Updated Telegram plan, product architecture, and risk audit.

Cinematic cheats used:
- Kept API error codes stable and changed only user-facing messages.
- Did not add auth/session infrastructure or a new validation framework.
- Error-path string mapping is cheaper and safer than pushing token translation into every UI render site.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: one error-path string map during Telegram settings save or preview failure.
- Expected i3/MX350 impact: effectively 0; no render, DICOM, import, schedule, speech, or polling hot path changed.
- Bundle budget was not used as a gate for this slice by explicit instruction; operator-facing correctness took priority over gzip size.

Verification:
- `npm run build -w @dental/api`: passed.
- `npm run smoke:telegram-control-ui-source`: passed.
- `npm run smoke:telegram-bot`: passed.
- `npm run smoke:telegram-validation`: passed.
- `npm run smoke:telegram-admin-guard`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run typecheck -w @dental/web`: passed.

---

# 2026-06-04 - Continuous orchestration: integration guard/payment/speech proof

Task:
- Integrate returned agent findings and keep the next Dental CRM wave moving without waiting for another command.

What was done:
- Updated `smoke:clinical-mutation-guard` after DICOMweb connector checks moved to Settings-admin access.
- Added an explicit source guard that `/api/imaging/dicomweb/check` is called with `settingsAccessHeaders`.
- Fixed payment submit auto-selection so `payment_refund_correction_request` is not used as an incoming payment document.
- Added `smoke:speech-local-bridge-readiness` to `package.json`.
- Added browser-side payment `clientMutationId` generation for `/api/billing/payments`.
- Integrated service-worker shell-cache recovery that purges stale chunks while keeping core offline fallbacks.
- Closed completed agent threads and launched the next wave: CT runtime/3D, offline/PWA shell, imports/migration, settings/access, and document lifecycle.

Verification:
- `npm run smoke:clinical-mutation-guard`: passed.
- `npm run smoke:dicomweb-connector-boundary`: passed.
- `npm run smoke:payment-capture-source`: passed.
- `npm run smoke:billing-document-link`: passed.
- `npm run smoke:payment-idempotency`: passed.
- `npm run smoke:web-service-worker-cache-source`: passed.
- `npm run smoke:web-service-worker-runtime`: passed.
- `npm run smoke:app-update-recovery-source`: passed.
- `npm run smoke:workspace-shell-source`: passed.
- `npm run smoke:speech-local-bridge-readiness`: passed.
- `npm run smoke:speech-queue-source`: passed.
- `npm run smoke:schedule-view-source`: passed.
- `npm run smoke:schedule-active-visit-status-contract`: passed.
- `npm run smoke:schedule-admin-guard`: passed.
- `npm run smoke:schedule-configuration`: passed.
- `npm run smoke:documents-view-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:telegram-url-ui-source`: passed.
- `npm run build -w @dental/web`: passed; Vite still reports the existing large `workspace` chunk warning.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---
Date: 2026-06-02
Slice: Frontend domain admin-secret sessions

What was wrong:
- Server admin secrets were already split into clinical, schedule, settings, and Telegram domains.
- The web app still used one `telegramAdminSecretSession` for clinical headers, settings mutations, schedule mutations, UI preferences, and Telegram control-plane requests.
- A correct settings or schedule secret could be entered from the UI but still fail because the unlock path attempted `/api/dashboard` with a non-clinical secret.
- Settings UI had no settings-domain unlock panel outside Telegram, so `DENTE_SETTINGS_ADMIN_SECRET` was technically accepted by the API but not cleanly operable from the normal settings tabs.

What was done:
- Added separate in-memory browser sessions for `clinical`, `settings`, `schedule`, and `telegram` admin secrets.
- Added explicit `settingsAccessHeaders()` and `scheduleMutationHeaders()` helpers.
- Changed clinical read/mutation helpers to use `clinicalAdminSecretSession` directly instead of routing through Telegram headers.
- Routed `/api/settings/clinic/profile`, `/api/settings/clinic/mode`, staff, chair, and UI preference calls through the settings helper.
- Routed appointment create/update through the schedule helper.
- Kept Telegram control-plane routes on `telegramControlPlaneHeaders()`.
- Made `unlockTelegramAdminSession()` domain-aware while preserving existing child prop names. Clinical/global unlock can seed every domain for one-secret deployments; schedule/settings/Telegram unlocks no longer reload or clear dashboard state.
- Added a protected-settings unlock panel on non-Telegram Settings tabs.
- Changed Schedule unlock copy to schedule-only language.
- Updated source smokes for settings, schedule, UI preferences, onboarding wording, and clinical header separation.
- Updated architecture and risk docs with the browser-side domain boundary.

Cinematic cheats used:
- No new auth system was faked. This is still prototype header-gated admin access.
- No runtime endpoint inference was added. Explicit helper ownership is the cheap, auditable path.
- No persistent secret storage was added. Sessions stay in React memory only.

Exact microseconds saved:
- Frame-time savings: 0 measured.
- Added frame cost: 0 measured.
- Request-time overhead: one branch-selected header helper per protected request.
- Low-end i3/MX350 impact: effectively 0; no render, DICOM, import, or polling hot path changed.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:schedule-view-source`: passed.
- `npm run smoke:ui-preferences`: passed.
- `npm run smoke:onboarding-configuration-source`: passed.
- `npm run smoke:telegram-control-ui-source`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- `npm run build -w @dental/web`: passed; existing Vite large `workspace` chunk warning remains.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:settings-preferences`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.

---
Date: 2026-06-02
Slice: Public health persistence metadata hardening

What was wrong:
- `/api/health` was public and still returned a redacted persistence summary.
- The response did not expose raw state paths or checksums, but it did expose whether persistence exists, current version, save timestamp, backup count, latest backup timestamp, latest backup size, and backup limit.
- Settings/Audit had a guarded persistence verify route for the same information, so the public health route was carrying operations telemetry it did not need.

What was done:
- Removed `getPersistentStateMeta` usage and `publicPersistentStateMeta` from `apps/api/src/server.ts`.
- `/api/health` now returns only `ok`, `service`, and `time`.
- `loadPersistenceHealth` in `App.tsx` now calls `/api/system/persistence/verify` with clinical read headers, parses `report.meta`, and updates both `persistenceHealth` and `persistenceIntegrity` from one guarded response.
- Fresh admin unlock passes the just-entered secret override into the guarded persistence check.
- Settings/Audit manual check no longer fires a duplicate persistence verify request.
- `smoke-clinical-mutation-guard` now forbids public persistence metadata helpers/fields and requires the web audit path to use the guarded verify endpoint.
- `docs/00-product-architecture.md` and `docs/04-product-risk-audit.md` now record that public health is liveness only.

Cinematic cheats used:
- No UI redesign, no database rewrite, no persistence format change, no DICOM work.
- This is access-boundary hardening: make public liveness cheap and keep backup/integrity telemetry behind owner/admin clinical access.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Public health request does less persistence metadata work.
- Settings/Audit check avoids the previous public health plus protected verify split and uses one protected verify response for both cards.
- Expected i3/MX350 impact: 0 on render/DICOM paths; negligible positive effect on health/audit request count.
- Bundle budget was not used as a gate for this slice by explicit instruction; privacy and operational boundary were the target.

Verification:
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run build -w @dental/web`: passed; existing Vite large `workspace` chunk warning remains.
- `npm run smoke:settings-persistence-file`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files remain.
- Process check: two external BrowserOps `node.exe` processes were present under `C:\hades\Tools\BrowserOps\...`; no DENTE build/test process was left behind.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files remain.

# 2026-05-31 - CT implant body, apex and guide sleeve model plan

What was wrong:
- CT planning had selected implant data and an implant-axis artifact, but no explicit model plan for body, apex, safety envelope and guide sleeve.
- Validation/export could reason about an implant route too loosely for lab/guide handoff.

What was done:
- Added `apps/web/src/ctPlanningImplantModel.ts`.
- Added `apps/web/src/ctPlanningImplantModelPanel.tsx`.
- `ctPlanningState` now exposes `implantModelPlan` from merged saved/local annotations and the selected implant plan.
- `ctPlanningValidation` now has a dedicated model gate.
- `ctPlanningExport` no longer marks the lab/guide lane ready unless the model plan is ready.
- `CtPlanningToolsPanel` now renders the model board next to validation/reconstruction.
- Vite, bundle budget, code-split smoke and imaging source smoke now cover the implant model chunks.
- `docs/10-imaging-dicom-viewer-plan.md` now states that quality changes display density only, not implant/sleeve dimensions.

Cinematic cheats used:
- Metadata-derived implant body/apex/sleeve plan instead of fake 3D geometry.
- Continuous `modelingWeight` is available for visual density, but clinical dimensions stay invariant.
- Safety envelope and sleeve are explicit derived values, not hidden renderer state.

Exact microseconds saved:
- 0 measured. No profiler artifact was produced.
- Static budget protected: `ct-planning-tools` is 17,987 bytes under the 18,000 byte budget; implant model logic is split into a 4,271 byte chunk and panel UI into a 1,366 byte chunk.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `git diff --check`: no whitespace errors; only existing CRLF warnings.
- Process check: no DENTE build/test process left behind.

---
Date: 2026-06-01
Slice: CT export and implant-fit visible wording

What was wrong:
- CT canal/template export fact leaked English `handoff` into a doctor-facing readiness line.
- CT implant-fit candidate reasons and warnings exposed `fallback shortest/longest` implementation wording.

What was done:
- Changed the visible canal/template fact to `?????? ????? ? ????????.`
- Changed implant-fit reasons to `????????? ???????`.
- Changed generic ruler warning to `????????????? ????????/??????? ??????? ???????? ?????? ??? ????????`.
- Added source-smoke guards requiring the new Russian copy and forbidding the old visible jargon.
- Updated CT viewer plan docs.

Cinematic cheats used:
- No new CT pixel work, segmentation, or geometry simulation. This is a clinical-copy hardening pass around existing metadata/tool-state flows.

Exact microseconds saved:
- 0 measured. Render text substitutions only.
- Bundle proof: `ct-planning-export` 7,810 bytes / 2,829 gzip; `ct-planning-implant-fit` 4,967 bytes / 2,008 gzip; aggregate JS gzip 428,979 / 430,000; total gzip 456,878 / 480,000.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

Date: 2026-06-02
Slice: CT contour/artifact visible wording hardening

What was wrong:
- CT artifact board exposed implementation-language `????????? ?????`.
- Draft guidance told operators to draw in the viewer instead of naming the CT-slice mode.
- Artifact/scenario card status exposed raw blocked wording.
- CT area/volume cards exposed raw `ROI` titles across catalog, measurement, state, validation, export, geometry warnings, and artifact commands.

What was done:
- Changed artifact board visible copy to `???????? ?????` and `???? ????????????? ????????; ???????? ????? ? ?????? ??-??????.`
- Changed artifact/scenario visible blocked labels to `????? ????????` and `??????? ????????`.
- Changed visible ROI titles/warnings/facts to `?????? ???????`, `?????? ??????`, and contour-volume wording.
- Kept internal `CtPlanningArtifact*`, `ready/draft/blocked`, `area_roi`, `volume_roi`, DICOM tool names, and bridge metadata stable.
- Added source-smoke guards for the new visible wording and old-copy forbids.
- Updated the CT viewer plan with the contour-vs-contract boundary.

Cinematic cheats used:
- No CT pixel work, segmentation, simulation, CAD/STL generation, or diagnostic claim. This is a metadata/UI wording hardening pass over existing tool-state routes.

Exact microseconds saved:
- Runtime: 0 measured.
- Bundle proof: aggregate JS gzip 428,879 / 430,000; total gzip 456,778 / 480,000.
- Key chunks: artifact commands 5,621 bytes / 1,921 gzip; artifact panel 1,498 bytes / 749 gzip; measurement plan 7,850 bytes / 3,096 gzip; catalog 9,474 bytes / 2,735 gzip.

Verification:
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---
Date: 2026-06-02
Slice: Clinical/schedule/settings/Telegram admin-secret separation

What was wrong:
- The clinical access guard accepted `DENTE_SETTINGS_ADMIN_SECRET` and `DENTE_TELEGRAM_ADMIN_SECRET` as fallback secrets.
- That meant a settings-only or Telegram-only admin secret could unlock clinical patients, documents, imaging, speech, imports, and emergency persistence export routes.
- Settings routes accepted the Telegram admin secret as a fallback.
- Schedule mutations still accepted settings or Telegram secrets through `configuredScheduleAdminSecret`, allowing appointment create/update without a schedule-domain secret.

What was done:
- `apps/api/src/accessGuard.ts` now accepts only `DENTE_CLINICAL_ADMIN_SECRET` for clinical read/mutation/export access.
- `apps/api/src/routes/settings.ts` now uses a settings-only guard backed by `DENTE_SETTINGS_ADMIN_SECRET`; clinic settings, preferences, and settings mutations no longer use clinical guards or Telegram fallback.
- `apps/api/src/routes/schedule.ts` now accepts only `DENTE_SCHEDULE_ADMIN_SECRET` for appointment mutations.
- `scripts/smoke-clinical-mutation-guard.mjs` now source-checks the clinical guard and runtime-checks that settings-only/Telegram-only secrets fail closed for clinical routes.
- `scripts/smoke-settings-admin-guard.mjs` now runtime-checks that Telegram-only secret fails closed for Settings.
- `scripts/smoke-schedule-admin-guard.mjs` now source-checks the schedule guard and runtime-checks that settings-only/Telegram-only secrets fail closed for schedule mutations.
- `docs/00-product-architecture.md`, `docs/04-product-risk-audit.md`, and `docs/13-dente-telegram-bot-plan.md` now record four separate prototype admin-secret domains: clinical, schedule, settings, Telegram.

Cinematic cheats used:
- No UI rendering, no DICOM pixel work, no appointment algorithm change, no auth framework rewrite.
- The fix is a control-plane boundary: make each protected route compare exactly one domain secret and prove the fallback cannot silently widen access.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Protected request path: no meaningful added cost; the fallback chain is shorter and still uses the same timing-safe comparison.
- Expected i3/MX350 impact: 0 on UI/render paths; negligible on protected API requests.
- Bundle budget was not used as a gate for this slice by explicit instruction; security correctness was the target.

Verification:
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- `npm run smoke:settings-admin-guard`: passed.
- `npm run smoke:schedule-admin-guard`: passed.
- `npm run smoke:telegram-admin-guard`: passed.
- `npm run smoke:schedule-active-visit-status-contract`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:schedule-view-source`: passed.
- `npm run smoke:settings-preferences`: passed.
- `npm run smoke:ui-preferences`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run build -w @dental/web`: passed; existing Vite large `workspace` chunk warning remains.
- `npm run smoke:settings-persistence-file`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.

---
Date: 2026-06-01
Slice: CT continuation clinical wording pass

What was wrong:
- CT implant-fit, measurement, reconstruction, workflow, and viewer bridge surfaces still had scattered raw implementation wording: `ready/draft/blocked`, `hard gate`, `viewer-???????`, `?? viewer`, `viewer/workbench`, `????? ????? viewer`, `???? ?????????`, and `missing viewer apply targets`.

What was done:
- Added `fitStatusLabel` for implant-fit cards.
- Reworded measurement density/canal guidance, reconstruction route/station guidance, and workflow task-packet warning.
- Reworded viewer bridge manifest labels to `????? ?????????` and localized launch missing-target blockers.
- Added smoke requires/forbids and updated the CT viewer plan doc.

Cinematic cheats used:
- No new CT pixel rendering, segmentation, or 3D simulation. The CRM remains a metadata/tool-state planning shell for these slices.

Exact microseconds saved:
- 0 measured. String/label mapping only.
- Final bundle proof: aggregate JS gzip 429,089 / 430,000; total gzip 456,988 / 480,000.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---
Date: 2026-06-01

What was wrong:
- Focused CT workflow/handoff cards could show `???? ?????????: ...` from the viewer bridge manifest.
- CT bridge launch blocker used English adapter text: `missing viewer apply targets`.

What was done:
- Changed viewer bridge manifest status labels to `????? ?????????: ...`.
- Changed launch missing-target blocker to `?? ??????? ????? ??????????????: ...`.
- Added source-smoke requires/forbids for visible bridge labels and blocker wording.
- Updated `docs/10-imaging-dicom-viewer-plan.md`.

Cinematic cheats used:
- No new viewer runtime or pixel path. This is UI-contract hardening around the existing no-pixel bridge envelope.

Exact microseconds saved:
- 0 measured. Label/blocker string changes only.
- Bundle proof: `ct-planning-viewer-restore` 3,272 bytes / 1,166 gzip; `ct-planning-viewer-bridge-launch` 882 bytes / 531 gzip; aggregate JS gzip 429,089 / 430,000; total gzip 456,988 / 480,000.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---
Date: 2026-06-01

What was wrong:
- CT measurement readiness exposed `viewer-???????`, `?? viewer`, and `hard gate` in visible guidance.
- ????/cross-section reconstruction exposed `viewer/workbench` and `??? ? viewer`.
- CT workflow warnings exposed `????? ????? viewer`.

What was done:
- Reworded measurement density units and canal-clearance guidance into Russian clinical copy.
- Reworded ????/cross-section route and station coverage guidance around `??????????? ??` / `???????????`.
- Reworded CT workflow missing-task warning to `????? ????? ????????? ??? ?? ??????`.
- Added smoke guards requiring the new strings and forbidding the old raw fragments.
- Updated `docs/10-imaging-dicom-viewer-plan.md`.

Cinematic cheats used:
- No pixel rendering, segmentation, or volumetric reconstruction added. This keeps the CRM shell metadata/tool-state only while improving operator-facing CT guidance.

Exact microseconds saved:
- 0 measured. String-only changes.
- Bundle proof: `ct-planning-measurement-plan` 7,970 bytes / 3,144 gzip; `ct-planning-reconstruction` 6,777 bytes / 2,863 gzip; `ct-planning-workflow-plan` 5,381 bytes / 2,151 gzip; aggregate JS gzip 429,023 / 430,000; total gzip 456,922 / 480,000.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---
Date: 2026-06-01

What was wrong:
- CT implant-fit cards rendered raw `ready/draft/blocked` status ids.
- Implant-fit reasons/actions still exposed `hard gate` and English `viewer` terms to the doctor-facing CT workflow.

What was done:
- Added `fitStatusLabel` in `CtPlanningImplantFitPanel` and rendered Russian clinical status labels.
- Replaced visible `hard gate` / `viewer` copy in implant-fit plan reasons/actions with Russian clinical wording.
- Added source-smoke guards for the new labels and forbidden raw fragments.
- Updated `docs/10-imaging-dicom-viewer-plan.md` with the implant-fit label boundary.

Cinematic cheats used:
- No new CT pixel, 3D, or segmentation work. This was a UI-contract hardening pass around existing implant-fit evidence.

Exact microseconds saved:
- 0 measured. One render branch and string substitutions only.
- Bundle proof: `ct-planning-implant-fit` 5,012 bytes / 2,017 gzip; `ct-planning-implant-fit-panel` 1,995 bytes / 865 gzip; aggregate JS gzip 429,026 / 430,000; total gzip 456,925 / 480,000.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---
Date: 2026-06-01
Slice: CT export and implant-fit visible wording

What was wrong:
- CT canal/template export fact leaked English `handoff` into a doctor-facing readiness line.
- CT implant-fit candidate reasons and warnings exposed `fallback shortest/longest` implementation wording.

What was done:
- Changed the visible canal/template fact to `?????? ????? ? ????????.`
- Changed implant-fit reasons to `????????? ???????`.
- Changed generic ruler warning to `????????????? ????????/??????? ??????? ???????? ?????? ??? ????????`.
- Added source-smoke guards requiring the new Russian copy and forbidding the old visible jargon.
- Updated CT viewer plan docs.

Cinematic cheats used:
- No new CT pixel work, segmentation, or geometry simulation. This is a clinical-copy hardening pass around existing metadata/tool-state flows.

Exact microseconds saved:
- 0 measured. Render text substitutions only.
- Bundle proof: `ct-planning-export` 7,810 bytes / 2,829 gzip; `ct-planning-implant-fit` 4,967 bytes / 2,008 gzip; aggregate JS gzip 428,979 / 430,000; total gzip 456,878 / 480,000.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

# 2026-05-31 - CT surgical guide readiness gate

What was wrong:
- The lab handoff lane could treat a guide route too loosely.
- The implant model plan did not expose guide route length or one explicit `guideReady` fact.

What was done:
- `apps/web/src/ctPlanningImplantModel.ts` now reads `surgical_guide` as a structured route.
- It computes `hasGuideRoute`, `guideReady`, `guideRoutePointCount`, and `guideRouteLengthMm`.
- The guide card is rendered by the existing implant model panel, so no new CT tools UI chunk was added.
- `apps/web/src/ctPlanningValidation.ts` gates the template check on `input.implantModelPlan.guideReady`.
- `apps/web/src/ctPlanningExport.ts` gates lab handoff and missing artifacts on guide readiness, not just a generic route.
- Source smoke now locks the route extraction, route length, guide-ready flag, validation gate and export gate.

Cinematic cheats used:
- Structured route/sleeve readiness instead of fake STL, CAD/CAM geometry, or voxel collision.
- Canal clearance stays the hard safety dependency for lab handoff.
- Existing implant-model panel renders the new guide card without growing the main CT tools chunk.

Exact microseconds saved:
- 0 measured. No profiler artifact was produced.
- Static budget protected: `ct-planning-implant-model` is 5,498 bytes under the 8,000 byte budget; `ct-planning-tools` remains 17,790 bytes under the 18,000 byte budget.

Verification:
- `npm run typecheck -w @dental/web`: passed after one syntax fix.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files remain.

# 2026-05-31 - CT measurement readiness map

What was wrong:
- CT planning had computed metrics, but ruler, angle, ROI area, ROI volume, density probe state, saved density values, clearance and unsaved local artifacts were not one explicit readiness map.
- Export could describe measurements too loosely for doctor/lab handoff.

What was done:
- Added `apps/web/src/ctPlanningMeasurementPlan.ts`.
- Added `apps/web/src/ctPlanningMeasurementPanel.tsx`.
- `ctPlanningState` now exposes `measurementPlan`.
- `ctPlanningValidation` now has a measurement-map gate.
- `ctPlanningExport` now uses measurement-map readiness for the doctor measurement lane.
- Vite, bundle budget, code-split smoke and imaging source smoke now cover the measurement plan chunks.
- `docs/10-imaging-dicom-viewer-plan.md` now states that density probe points are draft until the viewer saves values.

Cinematic cheats used:
- Readiness map over annotation metadata instead of fake CT pixel sampling.
- Density probes are counted separately from saved density values.
- Volume ROI remains a contour/slab estimate, not tissue segmentation.

Exact microseconds saved:
- 0 measured. No profiler artifact was produced.
- Static budget protected: `ct-planning-tools` is 17,866 bytes under the 18,000 byte budget; measurement plan logic is split into a 4,347 byte chunk and panel UI into a 1,155 byte chunk.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files remain.

# 2026-05-31 - CT dynamic clinical workflow board

What was wrong:
- CT planning had separate reconstruction, measurement, implant, validation and export boards, but no computed route telling the doctor what phase blocks the plan now.
- The old workflow in `ctPlanningTools.tsx` was static text and could not react to missing ОПТГ curve, missing density value, missing axis, safety fail, or unsaved artifacts.

What was done:
- Added `apps/web/src/ctPlanningWorkflowPlan.ts`.
- Added `apps/web/src/ctPlanningWorkflowPanel.tsx`.
- `CtPlanningToolsPanel` now builds and renders the dynamic workflow board from existing CT facts.
- Removed the static `ctPlanningWorkflow` array from the main CT tools chunk.
- Vite, bundle budget, code-split smoke and imaging source smoke now cover workflow plan/panel chunks.
- `docs/10-imaging-dicom-viewer-plan.md` now documents the workflow as metadata/tool-state only, not pixel export.

Cinematic cheats used:
- Fixed six-phase readiness route instead of a fake CT renderer or ОПТГ pixel generator.
- Uses existing derived facts from reconstruction/measurement/model/export instead of redoing heavy work in React UI.
- Highlights the first unfinished phase via `activePhaseId` instead of forcing the operator to parse all boards.

Exact microseconds saved:
- 0 measured. No profiler artifact was produced.
- Static budget protected and improved: `ct-planning-tools` is 17,457 bytes under the 18,000 byte budget; workflow logic is split into a 4,346 byte chunk and panel UI into a 1,109 byte chunk.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files remain.
- Process check: one existing BrowserOps `node.exe` was present; no CT build/test process left behind.

# 2026-05-31 - CT OPG curve sampling quality

What was wrong:
- The OPG/cross-section reconstruction plan could treat a minimal three-point panoramic curve as ready.
- That made a sparse dental-arch route look equivalent to a clinically useful curved route for derived cross-sections.

What was done:
- `apps/web/src/ctPlanningReconstruction.ts` now computes `curveSegmentCount`, `longestCurveSegmentMm`, and `curveSpacingTargetMm`.
- The reconstruction plan now has a `curve-sampling` card.
- Sparse OPG curves become draft when their largest control-point gap exceeds the workstation-derived spacing target.
- Source smoke locks the largest-gap field, spacing target, route-quality card, and sparse-curve warning.
- `docs/10-imaging-dicom-viewer-plan.md` documents the boundary: route QA only, not pixel OPG reconstruction.

Cinematic cheats used:
- Polyline route QA instead of fake panoramic pixel generation.
- Continuous workstation quality changes the suggested route sampling target, not clinical geometry.
- One bounded pass over curve points replaces any volume sampling loop in this CRM layer.

Exact microseconds saved:
- 0 measured. No profiler artifact was produced.
- Static budget protected: `ct-planning-reconstruction` is 5,373 bytes under the 8,000 byte budget; `ct-planning-tools` remains 17,790 bytes under the 18,000 byte budget.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files remain.
- Process check: one existing BrowserOps `node.exe` was present; no CT build/test process left behind.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

# 2026-06-01 - CT workflow Russian labels and active-step accessibility

What was wrong:
- CT workflow board rendered internal owner ids such as `series`, `doctor`, `implant`, `admin`, and `lab`.
- Workflow copy still mixed English implementation terms: `without pixel export from CRM`, `safety envelope`, and `Клинические gates`.
- The active phase was only visually marked; assistive tech had no structural current-step signal.

What was done:
- `apps/web/src/ctPlanningWorkflowPanel.tsx` now maps owner ids to Russian labels with `ownerLabels`.
- Active workflow phase now renders `aria-current="step"`.
- `apps/web/src/ctPlanningWorkflowPlan.ts` now uses Russian clinical wording for OPG route, implant contour, and safety checks.
- `scripts/smoke-imaging-viewer-usability-source.mjs` requires the Russian label map and active-step attribute, and forbids the old mixed-language strings.
- `docs/10-imaging-dicom-viewer-plan.md` documents the workflow UI/accessibility hardening.

Cinematic cheats used:
- Presentation-layer label mapping instead of changing route owner ids.
- Text and ARIA hardening in the small workflow chunks instead of touching the near-limit CT tools chunk.
- Source-level forbid checks instead of relying on manual UI review.

Exact microseconds saved:
- 0 measured. No profiler artifact was produced.
- Static budget protected: `ct-planning-workflow-plan` is 4,409 bytes / 1,778 gzip; `ct-planning-workflow-panel` is 1,285 bytes / 630 gzip; `ct-planning-tools` remains 17,790 bytes / 5,051 gzip.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.

# 2026-05-31 - CT portable semantic ruler role contract

What was wrong:
- CT ruler role semantics could be inferred by helper code, but the role was not a first-class portable annotation field.
- A saved/exported CT tool-state bundle could preserve label/note text while losing the structured fact that a distance was ridge width, bone height, or clearance.
- The CT measurement readiness map still looked too good when only generic rulers existed.

What was done:
- Added `imagingViewerAnnotationSemanticRoleSchema` and optional `semanticRole` to shared viewer annotations and DICOM tool-state annotations.
- Visit CT artifact creation writes `semanticRole` directly from the artifact command.
- Local annotation refs, CT tools, local CT state bridge and API tool-state bundle builder preserve `semanticRole`.
- CT geometry and artifact command matching now prefer the structured role before text fallback.
- CT measurement readiness counts signed ridge-width, bone-height and clearance roles and requires signed width plus height before `ready`.
- Source smoke now locks the shared schema and carry-through routes.

Cinematic cheats used:
- Structured metadata role instead of fake segmentation, fake HU values, or role parsing from visible clinical notes.
- Bounded annotation scan; no CT pixel loop and no diagnostic rendering claim.

Exact microseconds saved:
- 0 measured. No profiler artifact was produced.
- Static budget protected: `ct-planning-tools` 17,790 bytes under the 18,000 byte budget; `ct-planning-measurement-plan` 5,267 bytes under the 8,000 byte budget; shared schema/vendor remains 173,288 bytes under the 210,000 byte budget.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files remain.

# 2026-05-31 - CT implant library fit screening

What was wrong:
- The CT implant library exposed preset sizes, but it did not screen them against current ruler measurements, bone-height assumptions, selected implant state or mandibular canal clearance.
- The existing library strip could make a size look selected even when the plan had no ruler width/height evidence.

What was done:
- Added `apps/web/src/ctPlanningImplantFit.ts`.
- Added `apps/web/src/ctPlanningImplantFitPanel.tsx`.
- `ctPlanningGeometry` now exposes `distanceMeasurementsMm` from completed ruler annotations.
- `CtPlanningToolsPanel` now builds and renders the implant fit board from `planningSnapshot.geometrySummary` and `ctImplantLibrary`.
- Vite, bundle budget, code-split smoke and imaging source smoke now cover the fit plan/panel chunks.
- `docs/10-imaging-dicom-viewer-plan.md` now documents that this is screening only; the doctor confirms width/height semantics.

Cinematic cheats used:
- Metadata/ruler-based fit screening instead of fake CT segmentation or fake HU sampling.
- The shortest ruler is treated as a width candidate and the longest as a height candidate only for screening; warnings make that boundary explicit.
- Canal clearance remains a hard blocker when below 2 mm.

Exact microseconds saved:
- 0 measured. No profiler artifact was produced.
- Static budget protected: `ct-planning-tools` is 17,730 bytes under the 18,000 byte budget; implant fit logic is split into a 2,975 byte chunk and panel UI into a 1,539 byte chunk.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.

# 2026-05-31 - CT signed canal clearance ruler

What was wrong:
- The `clearance` semantic role existed in the portable annotation contract, but the CT artifact command list did not provide a dedicated signed canal-clearance ruler.
- A generic ruler could document a distance, but it was not explicit enough for implant-to-canal control evidence.

What was done:
- Added `canal-clearance-ruler` in `apps/web/src/ctPlanningArtifactCommands.ts`.
- The command creates distance drafts with `semanticRole: "clearance"`, requires an implant plan, uses oblique projection, and requires two points before becoming completed.
- `apps/web/src/ctPlanningMeasurementPlan.ts` now shows signed clearance ruler count when computed geometry is missing, but keeps the hard safety gate tied to implant axis plus mandibular canal route.
- Source smoke now locks the dedicated command, structured clearance role, and hard-gate text.
- `docs/10-imaging-dicom-viewer-plan.md` documents the boundary: control evidence only, not certified canal clearance.

Cinematic cheats used:
- Signed metadata/ruler control instead of fake canal segmentation or fake collision modeling.
- Manual clearance is allowed as evidence, but not as the hard safety proof.
- The existing below-2-mm canal blocker remains owned by computed implant/canal geometry.

Exact microseconds saved:
- 0 measured. No profiler artifact was produced.
- Static budget protected: `ct-planning-tools` is 17,790 bytes under the 18,000 byte budget; `ct-planning-measurement-plan` is 5,443 bytes; `ct-planning-artifact-commands` is 5,589 bytes.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files remain.
- Process check: one existing BrowserOps `node.exe` was present; no CT build/test process left behind.

# 2026-05-31 - CT semantic ruler roles for implant fit

What was wrong:
- The implant fit board could display ruler-derived width/height, but those distances were not semantically signed.
- Generic shortest/longest ruler fallback was useful for draft screening, but too weak for `ready` status.

What was done:
- `apps/web/src/ctPlanningGeometry.ts` now exposes typed distance measurements with `ridge_width`, `bone_height`, `clearance`, and `generic` roles.
- `apps/web/src/ctPlanningArtifactCommands.ts` now has dedicated `ridge-width-ruler` and `bone-height-ruler` commands.
- `apps/web/src/App.tsx` and `apps/web/src/ctPlanningTools.tsx` pass annotation labels and notes into the CT artifact state.
- `apps/web/src/ctPlanningImplantFit.ts` requires typed ridge width and typed bone height before a candidate or selected plan can be `ready`.
- `apps/web/src/ctPlanningImplantFitPanel.tsx` shows whether width/height came from a role, fallback draft, or missing measurement.
- Source smoke and `docs/10-imaging-dicom-viewer-plan.md` now document the typed role gate.

Cinematic cheats used:
- Typed metadata gate instead of fake segmentation or fake implant collision modeling.
- Shortest/longest distances remain visible only as draft fallback.
- The hard canal clearance blocker still owns the safety stop below 2 mm.

Exact microseconds saved:
- 0 measured. No profiler artifact was produced.
- Static budget protected: `ct-planning-tools` is 17,756 bytes under the 18,000 byte budget; semantic support is split into `ct-planning-geometry`, `ct-planning-artifact-commands`, `ct-planning-implant-fit`, and `ct-planning-implant-fit-panel` chunks.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.

# 2026-05-31 - CT density protocol hint hardening

What was wrong:
- The CT measurement map counted density probes and saved values but did not summarize the values into average/range.
- Numeric density values were not separated into explicit HU versus viewer units, which made future drill-protocol copy vulnerable to false HU claims.

What was done:
- `apps/web/src/ctPlanningMeasurementPlan.ts` now computes density count, average, range label, displayed unit, HU-calibration flag, mixed-unit flag, and protocol label from saved `bone_density_probe` annotations.
- HU-based protocol hints are emitted only when the saved unit is explicit `HU`.
- Non-HU values show `viewer-единицы` and the warning `Плотность сохранена в viewer-единицах; это не HU-калибровка.`
- Mixed units produce a separate warning to repeat the probe in one calibration.
- `apps/web/src/ctPlanningMeasurementPanel.tsx` displays `plan.densityProtocolLabel` in the measurement summary.
- `scripts/smoke-imaging-viewer-usability-source.mjs` locks the average/range/protocol/HU guard and the visible panel contract.
- `docs/10-imaging-dicom-viewer-plan.md` records that the CRM does not invent HU and uses HU thresholds only when the viewer marks values as `HU`.

Cinematic cheats used:
- One metadata-derived density summary instead of voxel sampling in the CRM shell.
- Viewer-unit values remain useful as a soft planning hint while refusing calibrated HU protocol claims.
- No new render loop, worker, or separate panel chunk was added.

Exact microseconds saved:
- 0 measured. No profiler artifact was produced.
- Static budget protected: `ct-planning-measurement-plan` is 7,474 bytes / 3,004 gzip, `ct-planning-measurement-panel` is 1,343 bytes / 604 gzip, and `ct-planning-tools` remains 17,790 bytes / 5,051 gzip under the 18,000 byte limit.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files remain.
- Process check: one existing BrowserOps `node.exe` was present; no CT build/test process left behind.

# 2026-05-31 - CT cross-section station coverage

What was wrong:
- The OPG/cross-section reconstruction plan exposed a derived slice count, but not whether the capped station list covered the whole arch route.
- A very long curve could hit the 160-station cap and still look ready from `crossSectionCount > 0`.

What was done:
- `apps/web/src/ctPlanningReconstruction.ts` now computes `crossSectionRequiredCount`, `crossSectionCoverageMm`, `crossSectionCoveragePercent`, and `crossSectionStationPreview`.
- Added a dedicated `station-coverage` card.
- `crossSectionStatus` now requires `crossSectionCoveragePercent >= 99`; under-covered capped routes stay draft.
- `apps/web/src/ctPlanningReconstructionPanel.tsx` shows coverage percent and compact station preview in the summary.
- `scripts/smoke-imaging-viewer-usability-source.mjs` locks the station fields, coverage card, readiness gate, and incomplete-coverage warning.
- `docs/10-imaging-dicom-viewer-plan.md` documents the safety cap boundary.

Cinematic cheats used:
- Route coverage math instead of fake panoramic pixel reconstruction.
- Compact `0 / middle / end` preview instead of storing every station offset in React state.
- The 160 cap remains a workstation protection; under-coverage becomes visible instead of silently ready.

Exact microseconds saved:
- 0 measured. No profiler artifact was produced.
- Static budget protected: `ct-planning-reconstruction` is 6,728 bytes / 2,864 gzip, `ct-planning-reconstruction-panel` is 1,541 bytes / 705 gzip, and `ct-planning-tools` remains 17,790 bytes / 5,050 gzip under the 18,000 byte limit.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

# 2026-05-31 - CT ROI area and volume estimate values

What was wrong:
- CT ROI area and volume were visible mostly as counts.
- Volume ROI could look stronger than it is: the current CRM layer has contour x slab estimates, not certified tissue segmentation.
- Underdrawn ROI drafts were already excluded from completed geometry, but the measurement board did not expose draft count or value labels clearly enough.

What was done:
- `apps/web/src/ctPlanningGeometry.ts` now exposes `roiAreaTotalMm2`, `roiVolumeTotalMm3`, `roiVolumeSlabMm`, and `roiDraftCount`.
- `apps/web/src/ctPlanningMeasurementPlan.ts` now emits `roiAreaTotalLabel`, `roiVolumeTotalLabel`, slab value, and draft warnings.
- `apps/web/src/ctPlanningMeasurementPanel.tsx` shows ROI area/volume values in the summary instead of `areaCount/volumeCount` only.
- `apps/web/src/ctPlanningValidation.ts` carries ROI value labels into the clinical validation check.
- `scripts/smoke-imaging-viewer-usability-source.mjs` locks the ROI totals, slab provenance, underdrawn draft warning, panel values, and validation handoff.
- `docs/10-imaging-dicom-viewer-plan.md` records that volume ROI remains an estimate unless a real segmentation engine supplies signed volume facts.

Cinematic cheats used:
- Scalar contour-area and contour x slab summaries instead of loading voxels in the CRM shell.
- Draft ROI detection by point count instead of a heavy geometry validity pass.
- Copy compression instead of raising the CT measurement-plan bundle limit.

Exact microseconds saved:
- 0 measured. No profiler artifact was produced.
- Static budget protected: initial `ct-planning-measurement-plan` failed at 8,086 bytes against the 8,000 byte cap; final build is 7,862 bytes / 3,132 gzip. `ct-planning-geometry` is 5,390 bytes / 2,219 gzip, `ct-planning-measurement-panel` is 1,361 bytes / 614 gzip, and `ct-planning-tools` remains 17,790 bytes / 5,051 gzip.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files remain.
- Process check: one external BrowserOps `node.exe` was present (`C:\hades\Tools\BrowserOps\cdp_eval_first_match.js`); no CT build/test process was left behind.

# 2026-06-01 - CT export clinical fact sheet

What was wrong:
- CT export packet had lanes and missing artifacts, but no compact clinical fact sheet.
- Implant/sleeve, OPG coverage, ROI values, density protocol, and canal/guide readiness were scattered across separate panels.
- The handoff packet was weaker than the CT planning board it represented.

What was done:
- `apps/web/src/ctPlanningExport.ts` now defines `CtPlanningExportFact` and returns `clinicalFacts`.
- The fact sheet carries implant/sleeve, OPG station coverage, ROI area/volume, density protocol, and canal/guide state.
- `apps/web/src/ctPlanningExportPanel.tsx` renders the facts above owner lanes with ready/warning/blocked tone.
- `apps/web/src/styles/main.css` styles the fact grid/card states and responsive layout.
- `scripts/smoke-imaging-viewer-usability-source.mjs` locks the export facts, panel render, and CSS selectors.
- `docs/10-imaging-dicom-viewer-plan.md` records that the facts are metadata/tool-state summaries only.

Cinematic cheats used:
- Scalar handoff fact sheet instead of duplicating the full CT board or viewer renderer.
- Existing ROI, OPG, density, implant, and guide summaries reused instead of a new hot state owner.
- Copy/object-construction compression instead of raising the 8,000 byte export chunk budget.

Exact microseconds saved:
- 0 measured. No profiler artifact was produced.
- Initial `ct-planning-export` build failed at 8,964 bytes. Final build is 7,868 bytes / 2,814 gzip. `ct-planning-export-panel` is 1,542 bytes / 612 gzip, and `ct-planning-tools` remains 17,790 bytes / 5,052 gzip.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

# 2026-06-01 - CT workflow Russian labels and active-step accessibility

What was wrong:
- CT workflow board rendered internal owner ids such as `series`, `doctor`, `implant`, `admin`, and `lab`.
- Workflow copy still mixed English implementation terms: pixel-export copy, `safety envelope`, and mixed gate wording.
- The active phase was only visually marked; assistive tech had no structural current-step signal.

What was done:
- `apps/web/src/ctPlanningWorkflowPanel.tsx` now maps owner ids to Russian labels with `ownerLabels`.
- Active workflow phase now renders `aria-current="step"`.
- `apps/web/src/ctPlanningWorkflowPlan.ts` now uses Russian clinical wording for OPG route, implant contour, and safety checks.
- `scripts/smoke-imaging-viewer-usability-source.mjs` requires the Russian label map and active-step attribute, and forbids the old mixed-language strings.
- `docs/10-imaging-dicom-viewer-plan.md` documents the workflow UI/accessibility hardening.

Cinematic cheats used:
- Presentation-layer label mapping instead of changing route owner ids.
- Text and ARIA hardening in the small workflow chunks instead of touching the near-limit CT tools chunk.
- Source-level forbid checks instead of relying on manual UI review.

Exact microseconds saved:
- 0 measured. No profiler artifact was produced.
- Static budget protected: `ct-planning-workflow-plan` is 4,409 bytes / 1,778 gzip; `ct-planning-workflow-panel` is 1,285 bytes / 630 gzip; `ct-planning-tools` remains 17,790 bytes / 5,051 gzip.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

# 2026-06-01 - CT export release gate and implant fit explainability tail marker

What was wrong:
- The latest status entries were initially inserted above a duplicate workflow section, so the tail of the log did not show the current CT release/implant-fit work.

What was done:
- Appended a tail marker for the current completed slices: CT export release gate, budget regex hardening, and implant fit decision reasons.
- The detailed rationale remains in `Rationale_DENTE.md`; source proof remains in the smoke scripts.

Cinematic cheats used:
- Documentation tail marker only; no runtime behavior.

Exact microseconds saved:
- 0 measured.

Verification:
- Same verification set as recorded in `Status_DENTE.md` for the two slices.
- External BrowserOps `node.exe` processes under `C:\hades\Tools\BrowserOps\...` were not touched.

# 2026-06-01 - CT handoff implant-fit evidence

What was wrong:
- Implant fit reasons existed in the fit board, but the export/handoff panel did not receive them.
- Admin/lab transfer could show the selected implant plan without the specific screening reason next to the release gate.
- Moving the evidence into export logic would risk the near-limit `ct-planning-export` chunk.

What was done:
- `apps/web/src/ctPlanningExportPanel.tsx` now accepts `implantFitPlan`.
- Added `buildImplantFitHandoff` to summarize selected or review candidate size, score, reasons, and next action.
- The export board renders `ct-planning-export-fit` as a dedicated handoff card.
- `apps/web/src/ctPlanningTools.tsx` passes the already computed `implantFitPlan` to the export panel.
- `scripts/smoke-imaging-viewer-usability-source.mjs` locks the prop, helper, decision reason join, test id, CSS selector, and tools-panel wiring.
- `docs/10-imaging-dicom-viewer-plan.md` records the handoff evidence route.

Cinematic cheats used:
- UI handoff bridge instead of inflating the export packet logic.
- Reused the already computed implant fit plan; no duplicate screening pass.
- Capped candidate list and bounded reason strings remain the data surface.

Exact microseconds saved:
- 0 measured. No profiler artifact was produced.
- Budget proof: `ct-planning-tools-BYzk65Ex.js` is 17,807 bytes / 5,064 gzip, `ct-planning-export-panel-YHH1IX5o.js` is 3,866 bytes / 1,372 gzip, and `ct-planning-export-qBdy6B2F.js` remains 7,868 bytes / 2,837 gzip.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files/docs remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

# 2026-06-01 - CT quick-action artifact route

What was wrong:
- Quick actions changed viewer tool/projection/window, but the required artifact draft lived in a separate board.
- Ridge width/height and canal route/clearance had no explicit quick-action route, so the doctor had to manually find the right command.

What was done:
- `CtPlanningQuickAction` now has `artifactCommandIds`.
- `ctPlanningCatalog.ts` maps OPG, typed rulers, implant axis, ROI, volume ROI, canal, density, and guide scenarios to the matching artifact commands.
- `ctPlanningTools.tsx` resolves the active quick action into artifact command states and renders `ct-planning-active-action-artifacts`.
- The active scenario card shows ready/draft/blocked chips and creates the next needed draft through the existing `onCreateArtifact` route.
- `main.css` styles the active scenario chips and explicit create button.
- Source smokes now lock the artifact route mapping, active action UI, and CSS coverage.

Cinematic cheats used:
- Explicit create button instead of mutation on tool selection.
- Static route ids instead of parsing visible text.
- Existing artifact state reused; no new CT state owner.

Exact microseconds saved:
- 0 measured. No profiler artifact was produced.
- Budget proof: `ct-planning-tools` is 9,684 bytes / 3,044 gzip; `ct-planning-catalog` is 9,334 bytes / 2,673 gzip.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.

# 2026-06-01 - CT static catalog chunk split

What was wrong:
- `ct-planning-tools` mixed UI and static catalog ownership.
- The chunk was 17,807 bytes against an 18,000 byte cap, so the next CT viewer work would immediately hit the budget again.

What was done:
- Added `apps/web/src/ctPlanningCatalog.ts` for CT tool keys, quick actions, planning tools, metrics, implant library, and implant-plan normalization.
- `apps/web/src/ctPlanningTools.tsx` now imports the catalog and re-exports it for compatibility while staying the panel owner.
- `apps/web/vite.config.ts` emits a named `ct-planning-catalog` chunk.
- `scripts/smoke-web-code-split-source.mjs`, `scripts/smoke-imaging-viewer-usability-source.mjs`, and `scripts/smoke-web-bundle-budget.mjs` now require and measure the split.
- `docs/10-imaging-dicom-viewer-plan.md` records the new module boundary.

Cinematic cheats used:
- Static catalog split instead of raising budgets.
- Compatibility re-export instead of route-level import churn.
- Named manual chunk instead of implicit Rollup shared-chunk behavior.

Exact microseconds saved:
- 0 measured. No profiler artifact was produced.
- Bundle proof: `ct-planning-tools` dropped to 8,958 bytes / 2,813 gzip; `ct-planning-catalog` is 8,969 bytes / 2,571 gzip.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.

# 2026-06-01 - CT exact artifact routing and geometry gates

What was wrong:
- CT artifact creation still picked quick actions by shared viewer tool id.
- Distance-based artifacts can mean ridge width, bone height, generic ruler, or canal clearance, so `action.tool === command.tool` can open the wrong clinical scenario.
- CT geometry could still produce false scalar evidence from underdrawn drafts: single-point polylines became `0`, and a 2-point canal could feed implant-to-canal clearance.

What was done:
- Added `findCtPlanningQuickActionForArtifactCommand` in `apps/web/src/ctPlanningCatalog.ts`.
- `apps/web/src/App.tsx` now resolves artifact creation through exact `artifactCommandIds.includes(command.id)` before falling back to the shared viewer tool.
- `apps/web/src/ctPlanningGeometry.ts` now requires 2 points for distance/implant-axis metrics, 3 points for OPG/canal curve metrics, and 3 canal points for implant-to-canal clearance.
- `scripts/smoke-imaging-viewer-usability-source.mjs` locks the exact route resolver and the underdrawn metric gates.
- `scripts/smoke-web-code-split-source.mjs` requires the catalog resolver to stay in the static CT catalog chunk.
- `docs/10-imaging-dicom-viewer-plan.md` records the route and geometry boundaries.

Cinematic cheats used:
- Static exact route ids instead of parsing labels or guessing from viewer tool names.
- Early point-count gates instead of carrying partial geometry deeper into validation/export.
- Fallback preserved for generic commands, but exact artifact id owns clinical routing.

Exact microseconds saved:
- 0 measured. No profiler artifact was produced.
- Build proof: `ct-planning-tools` is 9,684 bytes / 3,050 gzip; `ct-planning-catalog` is 9,454 bytes / 2,735 gzip; `ct-planning-geometry` is 5,435 bytes / 2,225 gzip.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; only existing CRLF warnings.
- Process check: no DENTE build/test process left behind.

# 2026-06-01 - CT quick-action identity persistence

What was wrong:
- `activeQuickActionId` existed as exact UI state, but viewer sessions and DICOM tool-state bundles still persisted only `activeTool`.
- Restoring a local/server session or portable workbench bundle could lose the exact CT clinical scenario and fall back to shared tool inference.

What was done:
- `packages/shared/src/index.ts` now persists nullable `activeQuickActionId` in `ImagingViewerSessionState`.
- `packages/shared/src/index.ts` now persists nullable `activeQuickActionId` in `DicomViewerToolStateBundleResponse`.
- `apps/web/src/App.tsx` saves and restores `activeQuickActionId` with viewer session state.
- `apps/web/src/ctPlanningTools.tsx` falls back to `toolStateBundle.activeQuickActionId` when shell state is absent.
- `apps/api/src/routes/imaging.ts` writes `input.viewerState?.activeQuickActionId ?? null` into DICOM tool-state bundles.
- `apps/api/src/sampleData.ts` default viewer state includes `activeQuickActionId: null`.
- `scripts/smoke-imaging-viewer-usability-source.mjs` locks schema, App, API, sample and panel fallback contracts.
- `scripts/smoke-dicom-folder-workup.mjs` asserts active CT scenario identity survives the built workbench endpoint.
- `docs/10-imaging-dicom-viewer-plan.md` records the persistence boundary.

Cinematic cheats used:
- One nullable route id instead of inferring clinical context from shared viewer tooling.
- Portable metadata-only handoff; no DICOM pixels added to session or tool-state bundle.
- Backward-compatible schema defaults for old local/server viewer sessions.

Exact microseconds saved:
- 0 measured. No profiler artifact was produced.
- Build proof: `ct-planning-tools` is 9,807 bytes / 3,086 gzip; `ct-planning-catalog` is 9,454 bytes / 2,735 gzip; shared schema/vendor is 173,418 bytes / 42,634 gzip.

Verification:
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/shared`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed after dist refresh.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-bundle-budget`: passed.

# 2026-06-01 - CT active clinical scenario identity

What was wrong:
- CT panel selected/highlighted the active quick action by shared viewer tool id.
- Distance tooling is shared by ridge width, bone height, generic rulers, and canal clearance, so the UI could show the wrong clinical route even after artifact creation was routed by exact command id.

What was done:
- Added `activeQuickActionId` to `apps/web/src/ctPlanningTools.tsx`.
- The CT panel now resolves active scenario by quick-action id before falling back to `activeTool`.
- Quick-action button selected state now uses `activeQuickAction?.id === action.id`.
- `apps/web/src/App.tsx` now owns `ctPlanningActiveQuickActionId`, sets it on CT quick actions and implant-library selection, clears it on viewer restore/reset and fallback tool activation, and passes it into visit CT panel plus Settings.
- `apps/web/src/SettingsView.tsx` now normalizes and forwards the active quick-action id and writes it on settings-side CT quick actions.
- `scripts/smoke-imaging-viewer-usability-source.mjs` locks the source contract.
- `docs/10-imaging-dicom-viewer-plan.md` records the route identity boundary.

Cinematic cheats used:
- Scalar clinical scenario id instead of inferring route from shared viewer tool.
- Non-mutating quick-action selection; artifact creation remains explicit.
- Existing viewer session contract left stable; UI scenario state is shell-owned.

Exact microseconds saved:
- 0 measured. No profiler artifact was produced.
- Build proof: `ct-planning-tools` is 9,757 bytes / 3,077 gzip; `ct-planning-catalog` is 9,454 bytes / 2,735 gzip.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; only existing CRLF warnings.
- Process check: no DENTE build/test process left behind.

# 2026-06-01 - CT exact planning-task active route

What was wrong:
- DICOM tool-state bundles preserved `activeQuickActionId`, but planning task active status still used shared `activeTool`.
- `measure_distance` could make the generic ruler task active even when the real clinical scenario was mandibular canal planning.

What was done:
- Added `planningTaskKindForQuickActionId` in `apps/api/src/routes/imaging.ts`.
- `buildDicomViewerPlanningTasks` now prefers exact `activeQuickActionId -> task.kind` active status and uses `activeTool` only as fallback.
- `scripts/smoke-dicom-folder-workup.mjs` now proves `activeTool: "measure_distance"` plus `activeQuickActionId: "nerve_canal"` activates the nerve-canal task, not generic distance.
- `scripts/smoke-imaging-viewer-usability-source.mjs` locks the source contract.
- `docs/10-imaging-dicom-viewer-plan.md` records the active-status boundary.

Cinematic cheats used:
- Scalar route map instead of parsing UI labels or annotations.
- Metadata-only active route; no DICOM pixels, mesh, voxel work, or worker path added.
- Fallback preserved for old sessions without `activeQuickActionId`.

Exact microseconds saved:
- 0 measured. No profiler artifact was produced.
- Expected frame cost: none; mapping runs only while building the tool-state bundle.

Verification:
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

# 2026-06-01 - CT workflow selected phase focus

What was wrong:
- CT workflow only exposed `activePhaseId` as the first unfinished blocker.
- That was honest for blocker reporting, but selecting a clinical quick action such as canal, ROI, implant library, guide, or OPG did not focus the matching workflow phase.

What was done:
- Added `selectedPhaseId` to `CtPlanningWorkflowPlan`.
- Added `selectedPhaseForQuickActionId` in `apps/web/src/ctPlanningWorkflowPlan.ts`.
- `apps/web/src/ctPlanningTools.tsx` now passes `effectiveActiveQuickActionId` into the workflow planner.
- `apps/web/src/ctPlanningWorkflowPanel.tsx` now highlights and exposes `selectedPhaseId ?? activePhaseId` through `aria-current`.
- `scripts/smoke-imaging-viewer-usability-source.mjs` locks the selected-phase and accessibility contract.
- `docs/10-imaging-dicom-viewer-plan.md` records that selected focus is separate from the first unfinished blocker.

Cinematic cheats used:
- Scalar quick-action-to-phase map instead of parsing labels, annotations, or viewer tool ids.
- One workflow board, two facts: first blocker remains `activePhaseId`; current doctor scenario is `selectedPhaseId`.
- No image, geometry, worker, or bundle-heavy path added.

Exact microseconds saved:
- 0 measured. No profiler artifact was produced.
- Static budget protected: `ct-planning-workflow-plan` is 4,755 bytes / 1,917 gzip; `ct-planning-workflow-panel` is 1,300 bytes / 646 gzip; `ct-planning-tools` is 9,831 bytes / 3,091 gzip.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files/docs remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

# 2026-06-01 - CT export current-scenario handoff

What was wrong:
- CT planning knew the exact quick action, but the portable export packet did not expose the active clinical scenario as a handoff fact.
- Doctor/admin/lab transfer could still force scenario inference from shared viewer tools, which is ambiguous for distance-based workflows.

What was done:
- Added nullable `activeQuickActionId` to `CtPlanningExportPacket`.
- Routed `effectiveActiveQuickActionId` from `apps/web/src/ctPlanningTools.tsx` through `apps/web/src/ctPlanningState.ts` into `apps/web/src/ctPlanningExport.ts`.
- Added `buildActiveScenarioHandoff` and `ct-planning-export-focus` in `apps/web/src/ctPlanningExportPanel.tsx`.
- Styled the new handoff card in `apps/web/src/styles/main.css`.
- Locked the packet/UI/CSS wiring in `scripts/smoke-imaging-viewer-usability-source.mjs`.
- Removed unused `CtPlanningExportPacket.detail` instead of raising the export chunk budget.
- Updated `docs/10-imaging-dicom-viewer-plan.md`.

Cinematic cheats used:
- Scalar scenario id instead of reverse-parsing tool labels, annotation notes, or viewer tool names.
- Compact card added to the existing handoff board instead of a second transfer board.
- Metadata/tool-state only; no pixel export, segmentation, mesh, or CAD/CAM claim added.

Exact microseconds saved:
- 0 measured. No profiler artifact was produced.
- Static budget protected: `ct-planning-export` is 7,756 bytes / 2,811 gzip; `ct-planning-export-panel` is 4,948 bytes / 1,726 gzip; `ct-planning-tools` is 9,855 bytes / 3,091 gzip.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files/docs remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

# 2026-06-01 - CT export scenario artifact readiness

What was wrong:
- The handoff packet exposed the active CT scenario, but the scenario card did not show the readiness of its exact required artifacts.
- Multi-artifact scenarios still required the operator to cross-read the artifact board before transfer.

What was done:
- Added `apps/web/src/ctPlanningExportScenarioPanel.tsx`.
- Split the current-scenario handoff card out of `ctPlanningExportPanel.tsx`.
- Added `scenarioArtifacts?: CtPlanningExportScenarioArtifact[]`.
- `ctPlanningTools.tsx` now maps active quick-action artifact states into handoff-ready DTOs.
- The scenario card now renders `ct-planning-export-scenario-artifacts` chips with ready/draft/blocked state.
- Updated vite manual chunks, web bundle budget, code-split smoke, imaging usability smoke, CSS, and CT docs.

Cinematic cheats used:
- Reused existing artifact command states; no second readiness engine.
- Chips show typed artifact readiness instead of deriving status from free text.
- Metadata/tool-state only; no pixel export, segmentation, mesh, or CAD/CAM claim added.

Exact microseconds saved:
- 0 measured. No profiler artifact was produced.
- Static budget protected: `ct-planning-export-panel` is 3,989 bytes / 1,428 gzip; `ct-planning-export-scenario-panel` is 1,613 bytes / 894 gzip; `ct-planning-tools` is 10,003 bytes / 3,132 gzip.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files/docs remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

# 2026-06-01 - CT export scenario tone isolation

What was wrong:
- The focused current-scenario handoff card showed exact artifacts but still inherited `packet.status` for severity.
- A blocked current scenario artifact could be visually masked by the wider packet state.

What was done:
- Added `scenarioTone` in `ctPlanningExportScenarioPanel.tsx`.
- Blocked artifacts dominate the focused scenario tone.
- Draft artifacts make the focused card warning.
- All-ready scenario artifacts remain warning when the wider packet is still blocked by unsaved portable state or a broader clinical blocker.
- Extended imaging usability smoke to require scenario-first tone logic.
- Updated the CT viewer plan documentation.

Cinematic cheats used:
- Metadata-first handoff. The CRM grades typed tool-state artifacts and does not touch CT pixels, segmentation, volume rendering, or CAD/CAM generation.
- Scenario-first severity. The selected clinical route gets a cheap scalar UI tone instead of another board or backend packet expansion.

Exact microseconds saved:
- 0 measured. Added branch-only UI logic over a small artifact array; no browser profiler artifact was produced.
- Static budget protected: `ct-planning-export-scenario-panel` is 1,772 bytes / 943 gzip; `ct-planning-export-panel` is 3,989 bytes / 1,427 gzip; `ct-planning-tools` is 10,003 bytes / 3,132 gzip.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files/docs remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

# 2026-06-01 - CT export scenario count summary

What was wrong:
- The focused scenario card had correct tone, but its readable sentence only showed ready/total.
- The operator had to read individual chips to tell hard blockers from ordinary drafts.

What was done:
- Added `scenarioStatusCounts` in `ctPlanningExportScenarioPanel.tsx`.
- Reused the same counts for `scenarioDetail` and `scenarioTone`.
- Scenario detail now shows blocked and draft counts when present.
- Extended source smoke to require count-driven detail and tone.
- Updated the CT viewer plan documentation.

Cinematic cheats used:
- Counted typed tool-state artifacts instead of running viewer analysis or touching CT pixels.
- One compact sentence gives current-route severity without adding another handoff board.

Exact microseconds saved:
- 0 measured. One reduce over a tiny active scenario artifact list; no browser profiler artifact was produced.
- Static budget protected: `ct-planning-export-scenario-panel` is 1,935 bytes / 1,040 gzip; `ct-planning-export-panel` is 3,989 bytes / 1,427 gzip; `ct-planning-tools` is 10,003 bytes / 3,131 gzip.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files/docs remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

# 2026-06-01 - CT export active scenario summary packet

What was wrong:
- The export packet carried `activeQuickActionId`, but not a structured summary of the selected scenario.
- Workflow/handoff could render scenario counts, but non-React handoff consumers would only see the scenario id.

What was done:
- Added nullable `activeScenarioSummary` to `CtPlanningExportPacket`.
- Added `ctPlanningExportScenarioSummary.ts` for scenario title, tone, counts, detail, and next action.
- Kept the base export builder conservative: it returns `activeScenarioSummary: null` until artifact state is attached.
- `CtPlanningToolsPanel` now enriches the export packet with active scenario summary and passes the same packet to workflow and handoff UI.
- Added vite chunk, bundle budget, code-split smoke, imaging usability smoke, and CT docs coverage.

Cinematic cheats used:
- Metadata-only scenario summary; no DICOM pixels, segmentation, mesh, or CAD/CAM claim.
- Split summary logic chunk instead of growing the visual panel or export builder.

Exact microseconds saved:
- 0 measured. Added one memoized object spread and reused active scenario artifact counts; no browser profiler artifact was produced.
- Static budget protected: `ct-planning-export` is 7,783 bytes / 2,821 gzip; `ct-planning-export-scenario-summary` is 1,423 bytes / 812 gzip; `ct-planning-export-scenario-panel` is 837 bytes / 473 gzip; `ct-planning-tools` is 10,153 bytes / 3,192 gzip.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files/docs remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

# 2026-06-01 - CT workflow active scenario focus

What was wrong:
- `activeScenarioSummary` existed in the enriched export packet, but the workflow board only used `activeQuickActionId` to highlight a phase.
- The doctor could see the selected scenario counts and next action only in the handoff block, not in the clinical route board.

What was done:
- Added `CtPlanningWorkflowScenarioFocus` and nullable `selectedScenario` to `CtPlanningWorkflowPlan`.
- Built `selectedScenario` from `exportPacket.activeScenarioSummary`.
- Rendered `ct-planning-workflow-focus` in `CtPlanningWorkflowPanel`.
- Kept `activePhaseId` untouched as the first unfinished blocker.
- Rewrote the workflow panel visible copy as clean UTF-8 after `smoke:web-text-encoding` caught mojibake in the new block.
- Added source smoke requirements, CSS coverage, and CT docs coverage.

Cinematic cheats used:
- Metadata-only scenario focus; no DICOM pixels, segmentation, mesh, or CAD/CAM claim.
- Reused the export packet summary instead of rescanning artifact state in workflow.

Exact microseconds saved:
- 0 measured. One object projection and one conditional card; no browser profiler artifact was produced.
- Static budget protected: `ct-planning-workflow-plan` is 5,032 bytes / 2,012 gzip; `ct-planning-workflow-panel` is 1,813 bytes / 730 gzip; `ct-planning-tools` is 10,153 bytes / 3,193 gzip.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files/docs remain.
- Process check: transient `node.exe` entries were gone on re-check; no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

# 2026-06-01 - CT release gate active scenario dominance

What was wrong:
- Release gate used packet status and clinical facts first.
- A blocked or draft active scenario could sit below a release card that looked ready or only generically warning.

What was done:
- `buildReleaseGate` now reads `packet.activeScenarioSummary`.
- Blocked active scenario returns a blocked release gate with scenario detail and next action.
- Draft active scenario keeps release in warning/draft unless the packet is already blocked by a stronger blocker.
- Imaging usability smoke and CT docs now lock the behavior.

Cinematic cheats used:
- Metadata-only release governance; no DICOM pixels, segmentation, mesh, or CAD/CAM claim.
- Reused the existing portable active scenario summary instead of rescanning artifact command state.

Exact microseconds saved:
- 0 measured. One nullable summary read and two branch checks; no browser profiler artifact was produced.
- Static budget protected: `ct-planning-export-panel` is 4,357 bytes / 1,515 gzip; `ct-planning-export-scenario-summary` is 1,423 bytes / 812 gzip; `ct-planning-tools` is 10,153 bytes / 3,193 gzip.

Verification:
- `npm run smoke:web-text-encoding`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files/docs remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

---
Date: 2026-06-01

## CT active scenario issue lists

What was wrong: `activeScenarioSummary` carried status and counts, but not the exact unfinished scenario artifact identities. A portable handoff consumer still needed React chips or localized detail text to know which artifact blocked the selected CT route.

What was done: added typed `draftArtifacts` and `blockedArtifacts` to the active scenario summary; workflow now exposes focused issue titles; handoff scenario panel can render chips from the packet summary if `scenarioArtifacts` is not passed; source smoke, CSS and CT docs were updated.

Cinematic cheats used: metadata-first CT route governance. No CRM-side pixel export, segmentation, mesh or panoramic sampling was added. The heavy viewer remains the owner of pixels; CRM carries compact artifact state.

Exact microseconds saved: 0 measured. Claimed runtime impact is branch/reduce-level below measurement noise. Bundle proof: summary 1,746 bytes / 912 gzip; scenario panel 1,145 bytes / 627 gzip; workflow plan 5,115 bytes / 2,049 gzip; workflow panel 2,032 bytes / 772 gzip; CT tools 10,153 bytes / 3,194 gzip.

Verification: web/shared/api typechecks, imaging usability source smoke, web text encoding smoke, code split smoke, web build, bundle budget smoke, DICOM folder workup, `git diff --check`, and process check passed.

---
Date: 2026-06-01

## CT active scenario handoff route

What was wrong: active CT scenario metadata named readiness and unfinished artifacts, but not route ownership or expected deliverable. Portable handoff consumers still had to infer whether the selected route was doctor work or lab work.

What was done: added typed route metadata to `activeScenarioSummary`; workflow focus and export scenario card now show owner, deliverable and confirmation step; smoke and CT docs now enforce the contract.

Cinematic cheats used: metadata route governance. No CRM-side DICOM pixel work, segmentation, mesh, panoramic sampling, or CAD/CAM generation was added.

Exact microseconds saved: 0 measured. One map lookup and short text render; expected frame impact below measurement noise. Bundle proof: summary 3,656 bytes / 1,439 gzip; scenario panel 1,248 bytes / 674 gzip; workflow plan 5,208 bytes / 2,087 gzip; workflow panel 2,130 bytes / 794 gzip; CT tools 10,153 bytes / 3,195 gzip.

Verification: web/shared/api typechecks, imaging usability source smoke, web text encoding smoke, code split smoke, web build, bundle budget smoke, DICOM folder workup, `git diff --check`, and process check passed.

---
Date: 2026-06-01

## CT active scenario viewer preset

What was wrong: active CT scenario metadata carried route and blockers, but not projection/window/slab/requiresVolume. A portable CT handoff still had to guess the intended viewer setup.

What was done: added typed viewer preset metadata to `activeScenarioSummary`; workflow and export scenario cards now show view/window/slab; smoke and CT docs enforce the contract; first bundle-budget failure was fixed by compressing the preset map with a factory.

Cinematic cheats used: metadata-only viewer restore. No CRM-side DICOM pixel rendering, segmentation, mesh, panoramic sampling, or CAD/CAM generation was added.

Exact microseconds saved: 0 measured. One map lookup and short text render; expected frame impact below measurement noise. Bundle proof after compression: summary 4,602 bytes / 1,734 gzip; scenario panel 1,408 bytes / 735 gzip; workflow plan 5,298 bytes / 2,121 gzip; workflow panel 2,187 bytes / 807 gzip; CT tools 10,153 bytes / 3,192 gzip.

Verification: web/shared/api typechecks, imaging usability source smoke, web text encoding smoke, code split smoke, web build, bundle budget smoke, DICOM folder workup, `git diff --check`, and process check passed.

---
Date: 2026-06-01

## CT active scenario viewer restore commands

What was wrong: active scenario summary had viewer fields, but no canonical restore command order for external viewer adapters.

What was done: added ordered `restoreCommands` tokens to the viewer preset and exposed them through `data-viewer-restore` in workflow and handoff cards. Smoke and CT docs enforce the adapter-facing command contract.

Cinematic cheats used: metadata-only viewer restore. No CRM-side DICOM pixel rendering, segmentation, mesh, panoramic sampling, or CAD/CAM generation was added.

Exact microseconds saved: 0 measured. Four short strings and one join on focused cards; expected frame impact below measurement noise. Bundle proof: summary 4,696 bytes / 1,792 gzip; scenario panel 1,465 bytes / 762 gzip; workflow plan 5,345 bytes / 2,139 gzip; workflow panel 2,260 bytes / 837 gzip; CT tools 10,153 bytes / 3,194 gzip.

Verification: web/shared/api typechecks, imaging usability source smoke, web text encoding smoke, code split smoke, web build, bundle budget smoke, DICOM folder workup, `git diff --check`, and process check passed.

---
Date: 2026-06-01
Slice: CT viewer restore bridge chunk

What was wrong:
- CT current-scenario summary owned adapter restore command construction while also owning route/view/readiness metadata.
- Workflow and handoff panels serialized restore commands directly with `.join("|")`.
- Workflow widened typed restore tokens to `string[]`, which TypeScript caught after the serializer became strict.

What was done:
- Added `apps/web/src/ctPlanningViewerRestore.ts` with typed restore commands, builder, and serializer.
- Wired scenario summary to `buildCtPlanningViewerRestoreCommands`.
- Wired workflow/handoff panels to `serializeCtPlanningViewerRestoreCommands`.
- Narrowed `CtPlanningWorkflowScenarioFocus.viewerRestoreCommands` to `CtPlanningViewerRestoreCommand[]`.
- Added manual Vite chunk and budget/source-smoke coverage for `ct-planning-viewer-restore`.
- Updated CT viewer plan docs with the new adapter boundary.

Cinematic Cheats used:
- Metadata-only restore tokens instead of any CRM-side CT pixel reconstruction.
- Compact ordered command string instead of heavy adapter objects.
- Chunk split instead of increasing the summary budget.

Exact Microseconds saved:
- 0 measured. No runtime profiler was run. The concrete proof is bundle containment: `ct-planning-viewer-restore` is 200 bytes / 166 gzip and summary remains below 5 KB at 4,738 bytes / 1,804 gzip.

Verification:
- Passed: web/shared/api typecheck, imaging viewer usability source smoke, web code split source smoke, web text encoding smoke, DICOM folder workup smoke, web production build, web bundle budget.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE node/npm/vite/tsx/tsc/csc process left behind.

---
Date: 2026-06-01
Slice: CT viewer bridge readiness manifest

What was wrong:
- Restore commands existed, but the handoff did not state whether a volume route could actually restore volume pixels.
- UI would have needed to infer volume readiness from generic packet blockers.
- The current-scenario panel had a damaged separator after the previous quick edit path; text-encoding smoke was kept as proof after rewriting it.

What was done:
- Added `volumeReady` to `CtPlanningExportPacket`.
- Added `CtPlanningViewerBridgeManifest` and `buildCtPlanningViewerBridgeManifest` to `ctPlanningViewerRestore.ts`.
- Workflow focus now carries `viewerBridgeStatus` and `viewerBridgeLabel` and exposes `data-viewer-bridge-status`.
- Handoff scenario panel now shows a `ct-planning-viewer-bridge` line with restore readiness and adapter summary.
- Updated source smoke and CT docs.

Cinematic Cheats used:
- Metadata/tool-state bridge instead of CRM-side volume rendering.
- One compact manifest object instead of adapter-specific command objects.
- Volume gate as a boolean proof route, not a localized string parse.

Exact Microseconds saved:
- 0 measured. No runtime profiler was run. Concrete proof: helper chunk remains 960 bytes / 459 gzip; no pixel decode or render path was added.

Verification:
- Passed: web/shared/api typecheck, imaging viewer usability source smoke, web text encoding smoke, web code split source smoke, DICOM folder workup smoke, web production build, web bundle budget.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE node/npm/vite/tsx/tsc/csc process left behind.

---
Date: 2026-06-01
Slice: CT viewer restore parser

What was wrong:
- `data-viewer-restore` was emitted as a serialized string, but adapters had no shared runtime parser.
- Invalid projection/window/slab tokens could only be caught by adapter-specific code, or not caught at all.
- TypeScript protected internal arrays, not external DOM strings.

What was done:
- Added `CtPlanningViewerRestoreParseResult`.
- Added `parseCtPlanningViewerRestoreCommandString`.
- Parser validates 4-token shape, restore mode, projection, window preset, and positive slab.
- Bridge manifest now exposes `restoreValid` and `parseError`.
- Workflow and handoff cards expose `data-viewer-restore-valid`.
- Source smoke and CT docs updated.

Cinematic Cheats used:
- Runtime string validation instead of launching any CT viewer work in CRM.
- Small Set-based token validation instead of large adapter-specific state machines.
- Fail-fast bridge metadata instead of hidden adapter mutation.

Exact Microseconds saved:
- 0 measured. No runtime profiler was run. Concrete proof: helper chunk remains inside budget at 2,569 bytes / 993 gzip.

Verification:
- Passed: web/shared/api typecheck, imaging viewer usability source smoke, web text encoding smoke, web code split source smoke, DICOM folder workup smoke, web production build, web bundle budget.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE node/npm/vite/tsx/tsc/csc process left behind.

---
Date: 2026-06-01
Slice: CT viewer bridge apply plan

What was wrong:
- Parser validated `data-viewer-restore`, but adapter step order was still implicit.
- External bridges would need to re-create the volume/projection/window/slab sequence themselves.
- `commandCount` existed, but it did not prove normalized executable steps.

What was done:
- Added `CtPlanningViewerBridgeApplyStep` and `CtPlanningViewerBridgeApplyPlan`.
- Added `buildCtPlanningViewerBridgeApplyPlan`.
- Valid restore strings now map to ordered `volume`, `projection`, `window`, and `slab` targets.
- Manifest now carries `applyStepCount`.
- Workflow and handoff cards expose `data-viewer-apply-steps`.
- Source smoke and CT docs updated.

Cinematic Cheats used:
- Metadata-only apply plan instead of launching a CT renderer in CRM.
- Four typed bridge steps instead of heavy adapter-specific command objects.
- Step count proof instead of UI text parsing.

Exact Microseconds saved:
- 0 measured. No runtime profiler was run. Concrete proof: helper chunk remains inside budget at 3,285 bytes / 1,176 gzip.

Verification:
- Passed: web/shared/api typecheck, imaging viewer usability source smoke, web text encoding smoke, web code split source smoke, DICOM folder workup smoke, web production build, web bundle budget.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE node/npm/vite/tsx/tsc/csc process left behind.

## 2026-06-01 - CT viewer bridge launch payload

What was wrong: active CT scenario handoff had parser/apply-plan metadata, but no single launch payload that declared adapter target and pixel policy for external viewer bridges.

What was done: added `CtPlanningViewerBridgeLaunchPayload` and `buildCtPlanningViewerBridgeLaunchPayload`; workflow and handoff now expose `data-viewer-adapter-target` and `data-viewer-pixel-policy`; smoke and CT docs lock the contract.

Cinematic cheats used: no CRM-side CT pixel rendering. The slice is metadata/tool-state only: `metadata_only_no_pixels` for metadata routes and `external_volume_only` for routes that need a real viewer volume.

Exact microseconds saved: 0 measured. Expected low-end impact is below measurement noise; the payload avoids future duplicated parser/policy inference in OHIF/Cornerstone/local bridge adapters.

Proof: web/shared/api typechecks, imaging viewer source smoke, text encoding smoke, code split smoke, DICOM folder workup smoke, web build, and web bundle budget passed. `ct-planning-viewer-restore` is 3,612 bytes / 1,291 gzip. `git diff --check` has no whitespace errors beyond existing CRLF warnings. No node/npm/vite/tsx/tsc/csc process was left running.

## 2026-06-01 - CT viewer bridge launch gate

What was wrong: launch payload carried target and pixel policy, but no final gate proved required adapter targets were present before an external viewer launch.

What was done: added `CtPlanningViewerBridgeLaunchGate` and `buildCtPlanningViewerBridgeLaunchGate`; metadata routes require projection/window/slab, volume routes additionally require volume. Workflow and handoff expose `data-viewer-launch-gate` and `data-viewer-can-launch`.

Cinematic cheats used: no CRM CT rendering. The gate is metadata/tool-state preflight only and keeps real volume work in OHIF/Cornerstone/local viewer paths.

Exact microseconds saved: 0 measured. Expected low-end impact is below measurement noise; the gate avoids duplicated adapter-side readiness inference and wrong-state launches.

Proof: web/shared/api typechecks, imaging viewer source smoke, text encoding smoke, code split smoke, DICOM folder workup smoke, web build, and web bundle budget passed. `ct-planning-viewer-restore` is 4,060 bytes / 1,450 gzip. `git diff --check` has no whitespace errors beyond existing CRLF warnings. No node/npm/vite/tsx/tsc/csc process was left running.

## 2026-06-01 - CT viewer bridge audit record

What was wrong: launch payload and gate existed, but there was no single portable audit object for external viewer adapters to log or verify.

What was done: added `CtPlanningViewerBridgeAuditRecord` and `buildCtPlanningViewerBridgeAuditRecord`; workflow and handoff now expose `data-viewer-audit-version` and `data-viewer-missing-targets`; smoke and docs lock the contract.

Cinematic cheats used: no CRM CT rendering and no pixel telemetry. The audit is metadata/tool-state proof only; real volume work stays in OHIF/Cornerstone/local viewer paths.

Exact microseconds saved: 0 measured. Expected low-end impact is below measurement noise; the audit avoids adapter-specific proof reconstruction and scattered DOM parsing.

Proof: web/shared/api typechecks, imaging viewer source smoke, text encoding smoke, code split smoke, DICOM folder workup smoke, web build, and web bundle budget passed. `ct-planning-viewer-restore` is 4,405 bytes / 1,556 gzip. `git diff --check` has no whitespace errors beyond existing CRLF warnings. No node/npm/vite/tsx/tsc/csc process was left running.

## 2026-06-01 - CT viewer bridge audit chunk split

What was wrong: audit proof was inside `ct-planning-viewer-restore`, leaving the restore/parser/gate contract at 4,405 bytes under a 5 KB budget.

What was done: moved audit proof into `ctPlanningViewerBridgeAudit.ts`, added explicit `ct-planning-viewer-bridge-audit` chunking and bundle-budget coverage, and updated source smoke and docs.

Cinematic cheats used: no runtime renderer work. This is bundle discipline: keep proof metadata isolated from the core restore bridge path.

Exact microseconds saved: 0 measured. Concrete artifact improvement: restore chunk dropped to 4,060 bytes / 1,450 gzip; audit is a separate 354 bytes / 219 gzip chunk.

Proof: web/shared/api typechecks, imaging viewer source smoke, code split source smoke, text encoding smoke, DICOM folder workup smoke, web build, and web bundle budget passed. `git diff --check` has no whitespace errors beyond existing CRLF warnings. No node/npm/vite/tsx/tsc/csc process was left running.

---
Date: 2026-06-01
Slice: CT viewer bridge launch chunk split

What was wrong: CT restore adapter code still carried launch payload/gate policy after audit was split out. Parser/apply/manifest should not absorb future OHIF/Cornerstone/local bridge launch growth.

What was done: Created `apps/web/src/ctPlanningViewerBridgeLaunch.ts`, moved launch payload/gate types and builders there, rewired workflow/handoff/audit imports, added Vite manual chunking, added bundle-budget coverage, updated source smoke checks, and documented the launch chunk boundary in `docs/10-imaging-dicom-viewer-plan.md`.

Cinematic Cheats used: no clinical geometry fake added. This is a transport-boundary split: metadata-only routes stay metadata-only, volume-ready routes remain gated by explicit volume targets, and restore command parsing remains separate from launch policy.

Exact Microseconds saved: 0 measured. No runtime profiler artifact. Static bundle result is concrete: restore chunk dropped from 4,060 bytes / 1,450 gzip to 3,292 bytes / 1,180 gzip; launch isolated at 851 bytes / 471 gzip; audit isolated at 354 bytes / 219 gzip.

Verification: `npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run smoke:dicom-folder-workup`, `npm run build -w @dental/web`, and `npm run smoke:web-bundle-budget` passed. `git diff --check` showed no whitespace errors, only existing CRLF warnings. Process check found no leftover node/npm/vite/tsx/tsc/csc processes.

---
Date: 2026-06-01
Slice: CT viewer bridge handoff envelope

What was wrong: workflow and handoff UI each rebuilt manifest, launch payload, launch gate, and audit locally. Same external CT viewer bridge fact had two assembly routes.

What was done: Added `apps/web/src/ctPlanningViewerBridgeHandoff.ts`, composed manifest/launch/gate/audit into `CtPlanningViewerBridgeHandoff`, added a stable serialized `CtPlanningViewerBridgeEnvelope`, rewired workflow and scenario handoff UI, exposed `data-viewer-envelope-version` and `data-viewer-bridge-envelope`, added manual chunking, budget coverage, smoke checks, and CT docs.

Cinematic Cheats used: no CT pixel rendering, no diagnostic shortcut, no hidden DICOM path. This is a metadata/tool-state envelope for external viewers; volume pixels remain in OHIF/Cornerstone/local workbench paths.

Exact Microseconds saved: 0 measured. One selected-scenario object composition and `JSON.stringify`; below measurement noise. Concrete artifact: new handoff chunk is 939 bytes / 476 gzip. Aggregate JS gzip is 429,443 under the 430,000 budget, so the next slice needs budget recovery before adding bulk.

Verification: first web typecheck failed on strict optional `target`; fixed without weakening types. Then web/shared/api typechecks, imaging viewer source smoke, code split source smoke, text encoding smoke, DICOM folder workup smoke, web build, and web bundle budget passed. `git diff --check` showed no whitespace errors, only existing CRLF warnings. Process check found no leftover node/npm/vite/tsx/tsc/csc processes.

---
Date: 2026-06-01
Slice: CT bridge budget recovery

What was wrong: after the CT viewer bridge envelope, aggregate JS gzip was 429,443 / 430,000 and UI still duplicated restore command serialization despite `handoff.manifest.commandString` already owning the normalized bridge restore string.

What was done: workflow selected scenarios now carry `viewerRestoreCommandString`; workflow and export scenario panels reuse that value for legacy `data-viewer-restore`; restore serialization remains in `ctPlanningViewerRestore.ts`; repeated CT planning CSS selector groups were compressed with `:is(...)` without class or markup changes.

Cinematic cheats used: none. This was byte-budget recovery and bridge contract ownership cleanup, not CT visual simulation.

Exact microseconds saved: 0 measured. Bundle evidence: aggregate JS gzip recovered 26 bytes, CSS recovered 259 raw bytes / 135 gzip bytes, total gzip recovered 161 bytes. Latest budget proof: JS gzip 429,417 / 430,000, CSS gzip 27,899, total gzip 457,316 / 480,000.

Verification: `npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run smoke:dicom-folder-workup`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, and `git diff --check` passed. Process check found no DENTE build/test process left behind.

---
Date: 2026-06-01
Slice: CT viewer bridge DOM metadata owner

What was wrong: workflow and export scenario panels both carried the same `data-viewer-*` bridge metadata wiring. The handoff envelope was centralized, but the DOM adapter contract still had duplicate owners and wasted gzip across UI chunks.

What was done: added `ctPlanningViewerBridgeAttributes.ts`; workflow selected scenarios now carry `viewerBridgeAttributes`; workflow and export scenario panels spread that shared object; source smoke now checks the shared builder; Vite routes the helper into the existing `ct-planning-viewer-bridge-handoff` chunk; CT docs were updated.

Cinematic cheats used: none. This is bridge metadata ownership and bundle recovery, not CT rendering or clinical geometry.

Exact microseconds saved: 0 measured. Bundle evidence: aggregate JS gzip recovered 333 bytes, from 429,417 to 429,084; total gzip recovered 333 bytes, from 457,316 to 456,983. No separate attributes microchunk is emitted. Current handoff chunk is 1,620 bytes / 655 gzip.

Verification: web/shared/api typechecks, imaging viewer source smoke, web code-split smoke, web text encoding smoke, DICOM folder workup smoke, web build, and web bundle budget passed.
Final hygiene: `git diff --check` had no whitespace errors, only existing CRLF warnings. Process check found no DENTE build/test process left behind.

---
Date: 2026-06-01
Slice: CT active scenario bridge metadata owner

What was wrong:
- Active CT scenario summary owned route/viewer/artifact state, but workflow and export scenario UI still rebuilt bridge handoff metadata outside the summary boundary.
- First pass exceeded the hard `ct-planning-export-scenario-summary` budget: 5,027 bytes against 5,000.

What was done:
- `buildCtPlanningExportScenarioSummary` now builds one selected-scenario bridge handoff using the viewer preset and packet volume readiness.
- Workflow focus and handoff card now read `summary.bridge.label` and `summary.bridge.attrs`; the external `data-viewer-*` contract stays unchanged.
- Technical bridge blockers remain inside the serialized envelope metadata instead of visible scenario copy.
- Recovered budget by compacting the internal summary bridge field and shortening the rare no-artifact fallback string.

Cinematic cheats used:
- Metadata-only bridge handoff remains the cheap CRM-side route. CT pixels and certified volume operations stay in external viewer/OHIF/Cornerstone paths.
- UI shows readiness and route labels; adapter diagnostics stay in machine metadata.

Exact microseconds saved:
- 0 measured. This is a contract ownership and bundle-budget slice, not a profiled runtime optimization.
- Bundle proof: summary chunk moved from failed 5,027 bytes to 4,959 bytes / 1,878 gzip. Aggregate JS gzip is 428,874 / 430,000; total gzip is 456,773 / 480,000.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---
Date: 2026-06-01
Slice: CT fallback clinical labels

What was wrong:
- CT planning fallback summary could show raw viewer enum text when the backend planning task bundle was absent.
- CT task projection labels still exposed raw `MIP` in this panel.

What was done:
- Replaced enum-derived fallback with compact Russian copy: `?????? ?????????? ??`.
- Replaced CT task `MIP` projection label with `????? ?????????`.
- Added source-smoke guards for both wording contracts.
- Updated CT viewer plan docs.

Cinematic cheats used:
- No pixel/render change. This is UI-state hygiene: exact clinical scenario stays in quick-action/current-scenario cards; fallback copy stays compact and safe.

Exact microseconds saved:
- 0 measured. This removes jargon and preserves bundle limits.
- Failed dictionary attempt: `ct-planning-state` 8,414 bytes.
- Final compact proof: `ct-planning-state` 7,841 bytes / 3,142 gzip; aggregate JS gzip 428,875 / 430,000; total gzip 456,774 / 480,000.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---
Date: 2026-06-01
Slice: CT package target clinical labels

What was wrong:
- CT package card could render raw tool-state adapter ids such as `cornerstone3d` or `generic_json`.

What was done:
- Added `toolStateTargetLabels` in `CtPlanningToolsPanel`.
- Package card now renders readable viewer/package labels and keeps machine ids inside the bundle.
- Source-smoke now forbids the old raw-target JSX expression.
- Updated CT viewer plan docs.

Cinematic cheats used:
- No pixel or adapter behavior change. This is a visible-label cleanup while machine metadata stays exact.

Exact microseconds saved:
- 0 measured. Runtime cost is one object lookup.
- Bundle proof: `ct-planning-tools` 10,319 bytes / 3,275 gzip; aggregate JS gzip 428,958 / 430,000; total gzip 456,857 / 480,000.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---
Date: 2026-06-01
Slice: CT export and implant-fit visible wording

What was wrong:
- CT canal/template export fact leaked English `handoff` into a doctor-facing readiness line.
- CT implant-fit candidate reasons and warnings exposed `fallback shortest/longest` implementation wording.

What was done:
- Changed the visible canal/template fact to `?????? ????? ? ????????.`
- Changed implant-fit reasons to `????????? ???????`.
- Changed generic ruler warning to `????????????? ????????/??????? ??????? ???????? ?????? ??? ????????`.
- Added source-smoke guards requiring the new Russian copy and forbidding the old visible jargon.
- Updated CT viewer plan docs.

Cinematic cheats used:
- No new CT pixel work, segmentation, or geometry simulation. This is a clinical-copy hardening pass around existing metadata/tool-state flows.

Exact microseconds saved:
- 0 measured. Render text substitutions only.
- Bundle proof: `ct-planning-export` 7,810 bytes / 2,829 gzip; `ct-planning-implant-fit` 4,967 bytes / 2,008 gzip; aggregate JS gzip 428,979 / 430,000; total gzip 456,878 / 480,000.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

EOF append marker:
- Latest CT continuation pass changed visible CT wording/status labels across implant-fit, measurement, reconstruction, workflow, and viewer bridge surfaces.
- Old exposed fragments covered by smoke forbids: raw status JSX, `hard gate`, `viewer-??????`, `?? viewer`, `viewer/workbench`, `??? ? viewer`, `????? ????? viewer`, `???? ?????????:`, `missing viewer apply targets`.
- Verification passed: web/shared/api typechecks, build, imaging source smoke, bundle budget, code split, text encoding, DICOM workup, diff check, process check.
- Final budget: aggregate JS gzip 429,089 / 430,000; total gzip 456,988 / 480,000.

2026-06-01 - CT copy compression / bundle reserve pass

What was wrong:
- Aggregate JS gzip was too close to the ceiling: 429,089 / 430,000 after the previous CT pass.
- CT measurement/reconstruction/workflow cards had verbose guidance where shorter clinical copy carried the same meaning.
- CT implant-model still showed visible `gate` wording in the canal-clearance card.

What was done:
- Compressed CT measurement density wording, local packet warning, OPG/station wording, workflow packet wording, and implant-model sleeve/guide-route wording.
- Replaced visible implant-model `?????? ?? ?????? ???????? gate.` with `?????? ?? ?????? ????????.`.
- Kept calculations, validation gates, export payloads, viewer bridge metadata, and chunk boundaries unchanged.
- Added source-smoke guards for the compact density copy, compact implant-model quality wording, and visible gate removal.
- Updated `docs/10-imaging-dicom-viewer-plan.md` with the budget-reserve and lab-boundary note.

Cinematic cheats used:
- Text/contract compression only. No fake clinical measurement, no pixel export claim, no CAD/STL generation claim.

Exact microseconds saved:
- Runtime: 0 measured; no profiler claim.
- Transfer/parse budget: aggregate JS gzip improved to 428,914 / 430,000. `ct-planning-implant-model` is 5,280 bytes / 2,250 gzip.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---
Date: 2026-06-02
Slice: CT contour/artifact visible wording hardening

What was wrong:
- CT artifact board exposed `????????? ?????`.
- Draft guidance told operators to draw in the viewer.
- Artifact/scenario status exposed raw blocked wording.
- CT area/volume cards exposed raw `ROI` titles across catalog, measurement, state, validation, export, geometry warnings, and artifact commands.

What was done:
- Changed visible CT copy to `???????? ?????`, `????? ????????`, `??????? ????????`, `?????? ???????`, and `?????? ??????`.
- Kept internal `CtPlanningArtifact*`, `ready/draft/blocked`, `area_roi`, `volume_roi`, DICOM tool names, and bridge metadata stable.
- Added source-smoke guards and updated `docs/10-imaging-dicom-viewer-plan.md`.

Cinematic cheats used:
- No CT pixel work, segmentation, simulation, CAD/STL generation, or diagnostic claim. Metadata/UI wording only.

Exact microseconds saved:
- Runtime: 0 measured.
- Bundle proof: aggregate JS gzip 428,879 / 430,000; total gzip 456,778 / 480,000.

Verification:
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---
Date: 2026-06-02
Slice: CT visible ROI leak cleanup in workflow/header/summary

What was wrong:
- Active CT scenario labels and deliverables still showed `ROI ???????`, `ROI ?????`, `?????? ? ??????? ROI`, and `???????? ROI`.
- The CT measurement summary still started with visible `ROI`.
- CT workflow phase details and the suite header still showed raw `ROI` to the clinician.

What was done:
- Replaced visible scenario labels/deliverables with `?????? ???????`, `?????? ??????`, `?????? ???????`, and `?????? ??????`.
- Replaced the measurement summary prefix with `???????`.
- Replaced workflow/header visible copy with `???????`.
- Added source-smoke guards for the exact old strings and updated `docs/10-imaging-dicom-viewer-plan.md`.
- Kept internal `area_roi`, `volume_roi`, ROI geometry, DICOM ROI tools, and adapter contracts unchanged.

Cinematic cheats used:
- UI/metadata wording only. No CT pixel work, segmentation, CAD/STL generation, or diagnostic claim.

Exact microseconds saved:
- Runtime: 0 measured.
- Bundle proof: aggregate JS gzip 428,866 / 430,000; total gzip 456,765 / 480,000.

Verification:
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---
Date: 2026-06-02
Slice: DICOM/settings external viewing wording cleanup

What was wrong:
- Settings DICOM launch controls, App settings/onboarding copy, CT package target labels, API imaging/system responses, and sample low-power DICOM labels still exposed `??????? ???????????`.
- Settings/imaging/workspace label maps still rendered raw blocked wording for operator-fixable setup states.
- The exact phrase was not source-smoke guarded outside the Settings panel, so it could regress through App/API copy.

What was done:
- Replaced visible `??????? ???????????` copy with `??????? ????????` in SettingsView, App, CT planning tools, API imaging/system routes, and sample DICOM labels.
- Replaced blocked UI labels in Settings/imaging/workspace label maps with `????? ????????`.
- Kept `external_viewer`, `blocked`, viewer bridge metadata, launch targets, DICOM workup ids, and adapter contracts unchanged.
- Added source-smoke guards for App, CT package labels, API imaging/system routes, sample data, Settings launch copy, imaging labels, and workspace labels.
- Updated `docs/10-imaging-dicom-viewer-plan.md` with the visible-label versus machine-contract boundary.

Cinematic cheats used:
- No pixel rendering, no DICOM decoding change, no adapter launch behavior change, no CT simulation. This is UI/API response copy plus source-smoke hardening.

Exact microseconds saved:
- Runtime: 0 measured.
- Bundle proof: aggregate JS gzip 428,828 / 430,000; total gzip 456,727 / 480,000.
- Relevant chunk proof: `ct-planning-tools` 10,324 bytes / 3,275 gzip; `SettingsView` 222,274 bytes / 51,668 gzip.

Verification:
- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---
Date: 2026-06-02
Slice: DICOM download/workbench local-path redaction

What was wrong:
- Browser DICOM download buttons serialized live `dicomViewerToolStateBundle` and `dicomViewerWorkbenchManifest` directly.
- The downloaded JSON could expose local workstation paths through `seriesRef.firstFilePath`, viewport `referencedImageId`, tool-state annotation `referencedImageId`, `dicomfile:` references, launch `viewerUrl`, or warning text.
- Server workbench bundle persistence already redacted viewport references, but missed tool-state annotation `referencedImageId`.

What was done:
- Added client-side DICOM download redaction helpers in `App.tsx`.
- `downloadDicomViewerToolStateBundle` now serializes `redactedDicomViewerToolStateBundleForDownload(...)`, not live state.
- `downloadDicomWorkbenchManifest` now serializes `redactedDicomWorkbenchManifestForDownload(...)`, not live manifest state.
- Redaction uses `redacted-local-dicom-path:<fingerprint>` markers for local paths and preserves HTTPS/OHIF/PACS and relative API URLs.
- Tool-state annotation `referencedImageId` is redacted in both browser downloads and server-side `cloneDicomWorkbenchManifestForServerStorage`.
- Source smoke now requires the client/server redaction points and forbids raw `JSON.stringify(...)` of live DICOM handoff state.
- `docs/10-imaging-dicom-viewer-plan.md` now records the download/server redaction boundary.

Cinematic cheats used:
- No CT pixel rendering, no DICOM decoding, no simulated volume work, no CAD/STL claim.
- This is a no-pixel privacy/handoff hardening pass: keep useful local recovery inside the same browser, redact exported handoff/state files.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: explicit download click or server save-time JSON clone/redaction only.
- Expected i3/MX350 impact: negligible outside hot render/workflow paths.
- Bundle budget was not used as a gate for this slice by explicit instruction; service quality/privacy took priority over gzip size.

Verification:
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---
Date: 2026-06-02
Slice: Explicit admin-secret panel routing

What was wrong:
- Browser admin-secret sessions were split by domain, but fixed panels still called a shared unlock/lock callback with no explicit domain.
- The callback inferred the domain from ambient route state. A retained Telegram onboarding step could make a non-Telegram Settings panel unlock the Telegram slot instead of the settings slot.
- Telegram tab copy still said "settings and Telegram", while the actual parent wiring now routes that panel to the Telegram domain only.

What was done:
- `unlockTelegramAdminSession` and `lockTelegramAdminSession` now accept an optional domain override.
- App bootstrap unlock passes `all`.
- First-run/onboarding Telegram unlock passes `telegram`.
- Schedule passes `schedule` for both unlock and forget.
- Settings computes `settingsAdminSecretDomain` and passes `settings` for ordinary Settings tabs or `telegram` for the Telegram tab.
- Telegram unlock copy is now Telegram-only and no longer implies access to general clinic settings.
- `smoke-clinical-mutation-guard` now requires explicit fixed-panel domain overrides and rejects the old retained-onboarding override route.
- `smoke-settings-view-source` now forbids old Telegram copy that implied general settings access.
- Architecture and risk docs now record explicit fixed-panel domain routing.

Cinematic cheats used:
- No auth stack invention, no tenant/session rewrite, no route refactor.
- This is a boundary hardening pass: make the UI's visible panel, in-memory secret slot, and protected route family agree exactly.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: one optional string parameter and branch at unlock/lock click time.
- Expected i3/MX350 impact: effectively 0; no render, DICOM, import, polling, or scheduling hot path changed.
- Bundle budget was not used as a gate for this slice by explicit instruction; correctness of access routing took priority over gzip size.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:schedule-view-source`: passed.
- `npm run smoke:ui-preferences`: passed.
- `npm run smoke:onboarding-configuration-source`: passed.
- `npm run smoke:telegram-control-ui-source`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- `npm run build -w @dental/web`: passed; Vite still reports the existing large `workspace` chunk warning.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:settings-preferences`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
---

Date: 2026-06-02
Slice: Domain admin-secret draft isolation

What was wrong:
- Browser admin-secret sessions were domain-scoped, but the input draft was still one shared `telegramAdminSecretDraft`.
- A settings or schedule password typed but not submitted could follow the operator into another panel.
- Telegram control-plane actions that accept a just-typed draft override could receive a secret typed for another route family.

What was done:
- Added separate in-memory drafts for clinical/global, settings, schedule, and Telegram admin secrets.
- `unlockTelegramAdminSession` now resolves the domain first and reads `adminSecretDraftForDomain(domain)`.
- `clearAdminSecretDraft(domain)` clears only the matching domain; `all` clears every draft after global unlock.
- Bootstrap uses the clinical/global draft.
- Schedule receives the schedule draft and setter.
- Settings receives the settings draft/setter or Telegram draft/setter based on `settingsAdminSecretDomain`.
- Source guard now requires separate draft states, domain-based draft reads, draft clearing, and domain-specific prop wiring.
- Architecture and risk docs now record domain-separated drafts.

Cinematic cheats used:
- No auth/session rewrite, no storage layer change, no route refactor.
- The fix keeps secrets memory-only and makes UI draft ownership match the protected route family.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: three React string states and a click-time branch for read/clear.
- Expected i3/MX350 impact: effectively 0; no DICOM, import, render, polling, or schedule hot path changed.
- Bundle budget was not used as a gate for this slice by explicit instruction; access correctness took priority over gzip size.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:schedule-view-source`: passed.
- `npm run smoke:telegram-control-ui-source`: passed.
- `npm run smoke:ui-preferences`: passed.
- `npm run smoke:onboarding-configuration-source`: passed.
- `npm run build -w @dental/web`: passed; Vite still reports the existing large `workspace` chunk warning.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:settings-preferences`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---

Date: 2026-06-02
Slice: Telegram settings validation copy hardening

What was wrong:
- `PUT /api/settings/telegram` could return user-facing messages like `webhookBaseUrl: https_required`.
- Public URL privacy failures exposed raw reason tokens such as `patient_identifying_query_not_allowed`.
- Appointment preview warnings exposed callback/webhook secret env names when signed appointment buttons were disabled.
- The Telegram smoke suite had normalized those raw strings as expected output, so the defect was protected by tests.

What was done:
- Added `readableTelegramSettingsValidationMessage` in the Telegram route.
- Routed both Telegram settings schema parse failures and save failures through that humanizer.
- Mapped invalid URL, non-HTTPS URL, URL credentials, bad path encoding, patient-identifying path/query key and patient-identifying path/query value failures to Russian operator actions.
- Replaced signed appointment callback env-name warnings with "enable signed-button secret in server settings" copy.
- Updated `smoke:telegram-bot` to require human validation fragments and reject raw reason tokens in API messages.
- Updated `smoke:telegram-control-ui-source` to require the server humanizer and reject old raw settings/callback copy.
- Updated `smoke:telegram-url-ui-source` to track the current operator-readable webhook label.
- Updated Telegram plan, product architecture, and risk audit.

Cinematic cheats used:
- Kept API error codes stable and changed only user-facing messages.
- Did not add auth/session infrastructure or a new validation framework.
- Error-path string mapping is cheaper and safer than pushing token translation into every UI render site.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: one error-path string map during Telegram settings save or preview failure.
- Expected i3/MX350 impact: effectively 0; no render, DICOM, import, schedule, speech, or polling hot path changed.
- Bundle budget was not used as a gate for this slice by explicit instruction; operator-facing correctness took priority over gzip size.

Verification:
- `npm run build -w @dental/api`: passed.
- `npm run smoke:telegram-control-ui-source`: passed.
- `npm run smoke:telegram-bot`: passed.
- `npm run smoke:telegram-validation`: passed.
- `npm run smoke:telegram-admin-guard`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:telegram-url-ui-source`: passed.
- `npm run build -w @dental/web`: passed; Vite still reports the existing large `workspace` chunk warning.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---

Date: 2026-06-02
Slice: Operator-facing infrastructure error copy hardening

What was wrong:
- Local bridge readiness could surface raw URL parser/fetch exception text.
- KND XML missing tax-office setup exposed an env key in the API error.
- PDF export errors could expose browser env/process/spawn details.

What was done:
- Local bridge readiness maps malformed URL and probe failures to clinic-readable warnings.
- KND XML missing tax-office setup now asks for the 4-digit tax-office code in server settings.
- PDF export missing-browser, launch, timeout, exit, corrupt-output, and catch-all paths now return print-browser/server actions.
- Smokes now reject old raw parser/network/env/process strings.
- Architecture and risk docs record the operator-facing API error boundary.

Cinematic cheats used:
- Stable machine-readable codes stayed intact.
- Only error-path copy changed; no auth, storage, PDF engine, or bridge protocol rewrite.
- Exact diagnostics remain available to code/test/docs; operator messages give actions.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: error-path string mapping only.
- Expected i3/MX350 impact: effectively 0; no DICOM, render, import, schedule, finance, or communications hot path changed.
- Bundle budget was not used as a gate for this slice by explicit instruction.

Verification:
- Broad source guard pass, local bridge runtime guard, KND XML smoke, PDF lifecycle smoke, shared/api/web typechecks, api/web builds, code-split/text-encoding/DICOM smokes, and extra interactive/payment/communications source smokes passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.

---

Date: 2026-06-02
Slice: Persistence integrity warning hardening

What was wrong:
- Persistence verify/export could expose raw JSON parser diagnostics or internal state-file tokens in browser-visible `warnings`, backup `warning`, or export `error`.
- This was in Settings/Audit, exactly where owners check backups before import, migration, update, or restore work.

What was done:
- Added bounded persistence read diagnostics in `persistentState.ts`.
- Added `persistenceWarningText` and mapped current state warnings, backup warnings, and export errors through it.
- Added settings source guards against raw parser diagnostics and `state_file_parse_failed`.
- Extended `smoke:settings-persistence-file` to corrupt the state JSON and verify the API payload stays operator-readable.
- Updated architecture and risk docs for persistence/readiness warning boundaries.

Cinematic cheats used:
- No storage engine rewrite.
- No restore workflow invented.
- Kept exact JSON parse detail in server console logs and removed it only from browser-visible payloads.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: error-path string mapping during persistence verify/export only.
- Expected i3/MX350 impact: effectively 0; no DICOM, render, import, schedule, finance, speech, or communications hot path changed.
- Bundle budget was not used as a gate for this slice by explicit instruction.

Verification:
- `npm run smoke:settings-view-source`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:settings-persistence-file`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:settings-preferences`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run build -w @dental/web`: passed; Vite still reports the existing large `workspace` chunk warning.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---

Date: 2026-06-03
Slice: Document, ingestion, and pricelist route validation hardening

What was wrong:
- Document create/issue/void returned first zod issue text as public API `message`.
- Ingestion extract and price-list analyze parsed `request.body` directly.
- Bad legal/financial/admin payloads could expose `issues`, schema paths, `payload`, `rawText`, attestation keys, or parser tokens to clinic operators.

What was done:
- Added stable document create/issue/void validation messages in `routes/documents.ts`.
- Added local safe-parse helpers and bounded validation messages in `routes/ingestion.ts` and `routes/pricelist.ts`.
- Added `smoke:document-route-validation` with source guards and runtime invalid-payload checks for document create/issue/void, ingestion extract, and price-list analyze.
- Updated document ingestion plan and product risk audit with the public validation boundary.

Cinematic cheats used:
- No new validation framework.
- No extractor/analyzer/document workflow rewrite.
- Shared zod schemas remain the machine contract; route layer owns only public recovery copy.
- Runtime proof uses real compiled Fastify routes under production-style clinical admin secret.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: invalid-request safeParse and string mapping only.
- Expected i3/MX350 impact: effectively 0; no render, DICOM, schedule, finance, speech, or UI hot path changed.
- Bundle budget was not used as a gate for this slice by explicit instruction.

Verification:
- `npm run typecheck -w @dental/api`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:document-route-validation`: passed.
- `npm run smoke:document-guards`: passed.
- `npm run smoke:document-payloads`: passed.
- `npm run smoke:document-zip-redaction`: passed.
- `npm run smoke:pricelist-analyzer`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run build -w @dental/web`: passed; Vite still reports the existing large `workspace` chunk warning.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run smoke:document-lifecycle`: passed.
- `npm run smoke:documents-catalog`: passed.
- `npm run smoke:document-html-issue-guards`: passed.
- `npm run smoke:import-contracts`: passed.
- `npm run build -w @dental/shared`: passed.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---

Date: 2026-06-03
Slice: Core clinical route validation hardening

What was wrong:
- Patient, schedule, clinical-rule, speech-adjacent AI draft, billing, and communication routes still had direct request-body parsing or joined zod issue text.
- Invalid core workflow payloads could expose `issues`, schema paths, parser tokens, or DTO field names such as `doctorUserId`, `startsAt`, `amountRub`, `inputText`, `taskId`, and `triggerServiceIds`.
- `smoke:patient-create-contract` still expected the old raw validation shape.

What was done:
- `routes/patients.ts` now safe-parses patient create/update and administrative-profile update with bounded operator messages.
- `routes/schedule.ts` now safe-parses appointment create/update with schedule-specific operator messages.
- `routes/billing.ts` no longer joins payment zod issues into the public API message.
- `routes/ai.ts`, `routes/communications.ts`, and `routes/clinical.ts` now return stable route-owned validation messages for invalid AI job, visit-note draft, task-complete, and clinical-rule evaluate/create/update payloads.
- Added `smoke:core-route-validation` with source guards and invalid compiled Fastify route checks under production-style clinical/schedule secrets.
- Updated `smoke:patient-create-contract` to assert bounded `PatientValidationError` responses and no zod issue payload leaks.
- Updated product risk audit with the core-route validation boundary.

Cinematic cheats used:
- No new validation framework.
- No domain mutation rewrites.
- Shared zod schemas remain the typed machine contract; route handlers own public recovery copy.
- Existing 404/409 domain checks stayed intact.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: invalid-request safeParse and string mapping only.
- Expected i3/MX350 impact: effectively 0; no DICOM render, schedule polling, import parsing, speech provider work, or UI hot path changed.
- Bundle budget was not used as a gate for this slice by explicit instruction.

Verification:
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:core-route-validation`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:patient-create-contract`: passed.
- `npm run smoke:schedule-active-visit-status-contract`: passed.
- `npm run smoke:schedule-admin-guard`: passed.
- `npm run smoke:billing-document-link`: passed.
- `npm run smoke:communication-task-complete-contract`: passed.
- `npm run smoke:clinical-rule-contract`: passed.
- `npm run smoke:finance-view-source`: passed.
- `npm run smoke:payment-capture-source`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run build -w @dental/shared`: passed.
- `npm run build -w @dental/web`: passed; Vite still reports the existing large `workspace` chunk warning.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- `npm run smoke:document-route-validation`: passed.
- `npm run smoke:import-contracts`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---

Date: 2026-06-03
Slice: Settings route validation hardening

What was wrong:
- Settings routes still used direct request-body parsing for preferences, clinic mode, staff, chair, and working-hours updates.
- Clinic profile validation joined zod issue text into the public API message.
- Invalid setup payloads could expose `issues`, parser paths, or DTO keys such as `uiLanguage`, `clinicName`, `medicalLicenseIssuedAt`, `workingHours`, `staffId`, and `chairId`.

What was done:
- Added `parseSettingsPayload` in `routes/settings.ts`.
- Routed UI preferences, clinic mode/profile, staff create, staff hours, chair create, and chair hours through stable route-owned validation messages.
- Added `smoke:settings-route-validation` with source guards and runtime invalid compiled route checks under a production-style settings admin secret.
- Updated product risk audit with the settings validation boundary.

Cinematic cheats used:
- No settings model rewrite.
- No auth/session changes.
- Shared zod schemas remain the typed machine contract; settings routes own only public recovery copy.
- Existing settings 404/409 domain checks stayed intact.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: invalid-request safeParse and string mapping only.
- Expected i3/MX350 impact: effectively 0; no render, DICOM, speech provider work, finance, schedule polling, import parsing, or UI hot path changed.
- Bundle budget was not used as a gate for this slice by explicit instruction.

Verification:
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:settings-route-validation`: passed.
- `npm run smoke:settings-admin-guard`: passed.
- `npm run smoke:settings-preferences`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run build -w @dental/shared`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- `npm run smoke:core-route-validation`: passed.
- `npm run smoke:document-route-validation`: passed.
- `npm run build -w @dental/web`: passed; Vite still reports the existing large `workspace` chunk warning.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:import-contracts`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run smoke:settings-persistence-file`: passed.
- `npm run smoke:ui-preferences`: passed.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---

Date: 2026-06-03
Slice: Visit + Speech route validation hardening

What was wrong:
- Visit draft autosave and accept parsed merged `request.body` payloads directly.
- Speech recording strategy and chunk upload parsed `request.body` directly.
- Invalid doctor workflow payloads could expose zod `issues`, parser paths, or DTO keys before visit mutation, audit, receipt, clinical scope, queue, or provider work ran.

What was done:
- Added `parseVisitPayload` in `routes/visits.ts`.
- Routed visit draft autosave and accept through bounded doctor-facing validation messages before mutation functions.
- Added `smoke:visit-route-validation`.
- Added `parseSpeechPayload` in `routes/speech.ts`.
- Routed speech recording strategy and chunk upload through bounded operator validation messages before strategy/provider/scope work.
- Added `smoke:speech-route-validation`.
- Updated `04-product-risk-audit.md` and `05-speech-transcription-plan.md`.

Cinematic cheats used:
- No visit mutation rewrite.
- No speech gateway/provider rewrite.
- No audit, revision, receipt, queue, or key-rotation changes.
- Shared zod schemas remain the machine contract; routes own only public recovery copy.
- Existing domain 404/409, corrupt-audio, provider-failure, and clinical-scope messages stayed on their current paths.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: invalid-request safeParse and string mapping only.
- Expected i3/MX350 impact: effectively 0; no render, DICOM, speech provider valid path, finance, schedule polling, import parsing, or UI hot path changed.
- Bundle budget was not used as a gate for this slice by explicit instruction.

Verification:
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run build -w @dental/shared`: passed.
- `npm run build -w @dental/web`: passed; Vite still reports the existing large `workspace` chunk warning.
- `npm run smoke:visit-route-validation`: passed.
- `npm run smoke:visit-draft-status-contract`: passed.
- `npm run smoke:schedule-active-visit-status-contract`: passed.
- `npm run smoke:speech-route-validation`: passed.
- `npm run smoke:speech-provider-errors`: passed.
- `npm run smoke:speech-clinical-scope`: passed.
- `npm run smoke:speech-queue-source`: passed.
- `npm run smoke:speech-groq-chunk-floor`: passed.
- `npm run smoke:speech-key-rotation`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:core-route-validation`: passed.
- `npm run smoke:document-route-validation`: passed.
- `npm run smoke:settings-route-validation`: passed.
- `npm run smoke:visit-workflow-forms-lifecycle`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:shift-visit-usability-source`: passed.
- `npm run smoke:import-contracts`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---

Date: 2026-06-03
Slice: Global API error boundary hardening

What was wrong:
- Global Fastify fallback still returned raw zod `issues`.
- Route-owned validation copy covered many paths, but a future missed direct parse could still expose schema paths, parser codes, and DTO field names.
- Runtime smokes could not import the compiled API cleanly without also risking listener/background-worker side effects.

What was done:
- Updated `server.ts` global error handler to return one bounded validation message for any zod validation exception.
- Split API startup into `createDenteApiApp` and `startDenteApiServer`.
- Kept HTTP listen and Telegram due-worker startup on the entry point path only.
- Added `smoke:api-global-error-boundary` with synthetic zod and technical exception routes against compiled Fastify runtime.
- Updated `smoke-api-text-encoding` source guards for the new global fallback contract.
- Updated `00-product-architecture.md` and `04-product-risk-audit.md`.

Cinematic cheats used:
- No route rewrite where route-owned validation was already proven.
- No per-field zod issue localization.
- No real port binding or Telegram delivery in the smoke.
- One fixed clinic-facing validation fallback acts as the last safety boundary; detailed diagnostics stay in logs/tests.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: invalid-error classification and fixed string response only.
- Expected i3/MX350 impact: effectively 0; no render, DICOM, speech provider valid path, finance, schedule polling, import parsing, Telegram hot path, or UI hot path changed.
- Bundle budget was not used as a gate for this slice by explicit instruction.

Verification:
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run build -w @dental/shared`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run build -w @dental/web`: passed; Vite still reports the existing large `workspace` chunk warning.
- `npm run smoke:api-global-error-boundary`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- `npm run smoke:telegram-due-worker-source`: passed.
- `npm run smoke:core-route-validation`: passed.
- `npm run smoke:visit-route-validation`: passed.
- `npm run smoke:speech-route-validation`: passed.
- `npm run smoke:document-route-validation`: passed.
- `npm run smoke:settings-route-validation`: passed.
- `npm run smoke:import-contracts`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run smoke:speech-provider-errors`: passed.
- `npm run smoke:speech-clinical-scope`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:shift-visit-usability-source`: passed.
- `npm run smoke:visit-draft-status-contract`: passed.
- `npm run smoke:schedule-active-visit-status-contract`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

Date: 2026-06-03
Slice: Telegram settings validation boundary

What was wrong:
- `PUT /api/settings/telegram` parsed `request.body` directly with `updateDenteTelegramBotSettingsSchema.parse`.
- Other Telegram control-plane payloads already used `parseTelegramRouteBody`.
- Malformed settings payload shape was a different failure class from URL/signed-button business validation and needed to stop before mutation.

What was done:
- Replaced the direct Telegram settings schema parse with `parseTelegramRouteBody(updateDenteTelegramBotSettingsSchema, request.body)`.
- Preserved `readableTelegramSettingsValidationMessage` for post-parse URL and signed-button validation errors.
- Extended `smoke:telegram-validation` with source guards and malformed `PUT /api/settings/telegram` runtime injection.
- Updated `13-dente-telegram-bot-plan.md` and `04-product-risk-audit.md`.

Cinematic cheats used:
- No Telegram settings model rewrite.
- No outbox/webhook/link-code changes.
- No new parser abstraction; reused the Telegram route-body boundary already proven on other routes.
- Business validation remains targeted only after payload structure is valid.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: invalid-request parse wrapper and fixed message only.
- Expected i3/MX350 impact: effectively 0; no render, DICOM, speech provider valid path, finance, schedule polling, import parsing, Telegram worker hot path, or UI hot path changed.
- Bundle budget was not used as a gate for this slice by explicit instruction.

Verification:
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:telegram-validation`: passed.
- `npm run smoke:telegram-admin-guard`: passed.
- `npm run smoke:telegram-due-worker-source`: passed.
- `npm run smoke:telegram-control-ui-source`: passed.
- `npm run smoke:telegram-url-ui-source`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:api-global-error-boundary`: passed.
- `npm run smoke:settings-route-validation`: passed.
- `npm run smoke:settings-admin-guard`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run build -w @dental/shared`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run build -w @dental/web`: passed; Vite still reports the existing large `workspace` chunk warning.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---
Date: 2026-06-03

Slice: Speech clinical scope response hardening

What was wrong:
- Speech clinical-scope failures returned human text in `error` instead of a stable public error code.
- Missing scope, unknown records, and mismatched patient/visit failures were status-correct but could regress toward `visitId`, `patientId`, request-query, helper, null, or undefined wording.
- Damaged audio and speech prompt/parser warnings needed smoke proof that doctor/admin workflows do not expose env names, parser ids, base64, byte limits, or transport jargon.

What was done:
- Added `SpeechClinicalScopeError` as the stable public code and separated Russian operator text into `message`.
- Routed chunk upload, chunk audit, recording recovery, and recording assembly through one speech scope response helper.
- Rewrote speech scope messages for missing scope, missing visit, missing patient, unknown visit, mismatched patient, and mismatched clinic.
- Expanded `smoke:speech-clinical-scope` to assert response bodies and reject route/scope internals.
- Extended speech smoke coverage for damaged audio, dental prompt warnings, and local rule-based draft warnings.
- Updated `05-speech-transcription-plan.md` and `04-product-risk-audit.md`.

Cinematic cheats used:
- No speech provider rewrite.
- No new provider/key-pool path.
- No full error-taxonomy refactor.
- One route helper and one stable code bought the public contract without touching valid dictation hot paths.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: one invalid-request response object only on rejected speech-scope calls.
- Expected i3/MX350 impact: effectively 0; no DICOM, render, speech provider valid path, queue flush, schedule, finance, import, or UI hot path changed.
- Bundle budget was not used as a gate for this slice by explicit instruction.

Verification:
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:speech-clinical-scope`: passed.
- `npm run smoke:speech-route-validation`: passed.
- `npm run smoke:speech-provider-errors`: passed.
- `npm run smoke:speech-queue-source`: passed.
- `npm run smoke:speech-groq-chunk-floor`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:api-global-error-boundary`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run build -w @dental/shared`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run build -w @dental/web`: passed; Vite still reports the existing large `workspace` chunk warning.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.

---
Date: 2026-06-03

Slice: Billing payment scope response hardening

What was wrong:
- Billing payment payload validation was bounded, but valid payloads with wrong patient/visit/document links still returned human text in `error`.
- Status-only billing smoke could pass while the public body contract stayed weak.
- Wrong-patient and non-financial document failures risked exposing route-id vocabulary instead of one stable failure class.

What was done:
- Added `BillingPaymentScopeError` as the stable public code for billing scope/link failures.
- Split operator copy into `message`.
- Replaced patient, visit, document, voided-document, and non-financial-document link failures with one response helper.
- Expanded `smoke:billing-document-link` with source guards and runtime body checks for unknown patient, unknown visit, unknown document, wrong-patient document, and non-financial document cases.
- Updated `04-product-risk-audit.md`.

Cinematic cheats used:
- No finance model rewrite.
- No payment schema rewrite.
- No document lifecycle rewrite.
- One route helper and one stable code fixed the public contract without touching valid payment creation.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: one invalid-request response object only on rejected billing scope/link calls.
- Expected i3/MX350 impact: effectively 0; no render, DICOM, speech provider, schedule, import, document print, or UI hot path changed.
- Bundle budget was not used as a gate for this slice by explicit instruction.

Verification:
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:billing-document-link`: passed.
- `npm run smoke:core-route-validation`: passed.
- `npm run smoke:payment-capture-source`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run build -w @dental/shared`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run build -w @dental/web`: passed; Vite still reports the existing large `workspace` chunk warning.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:finance-view-source`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---
Date: 2026-06-03

Slice: Imaging study scope response hardening

What was wrong:
- Imaging viewer-session and preview missing-study paths exposed English not-found copy in the public `error` field.
- Imaging study creation returned Russian human copy directly in `error` for missing patient, missing visit, and mismatched clinical scope.
- Existing imaging visit smoke covered status behavior but did not fully lock public body shape or leakage terms.

What was done:
- Added `ImagingStudyNotFound` as the stable public code for missing study lookup.
- Added `ImagingStudyScopeError` as the stable public code for valid imaging create payloads linked to missing or wrong clinical context.
- Split operator copy into Russian `message` fields.
- Updated viewer-session read/save, preview lookup, missing patient, missing visit, visit-patient mismatch, and clinic mismatch responses.
- Expanded `smoke:imaging-study-visit-scope` with source guards and runtime checks for stable body shape and no route/schema/parser leakage.
- Updated `10-imaging-dicom-viewer-plan.md` and `04-product-risk-audit.md`.

Cinematic cheats used:
- No DICOM import rewrite.
- No viewer-session storage rewrite.
- No preview generation rewrite.
- Two tiny API response helpers fixed the public contract without touching valid imaging hot paths.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: one invalid-request response object only on rejected imaging lookup/scope calls.
- Expected i3/MX350 impact: effectively 0; no DICOM render, preview generation for valid studies, speech provider, finance, schedule, import, or UI hot path changed.
- Bundle budget was not used as a gate for this slice by explicit instruction.

Verification:
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:imaging-study-visit-scope`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run build -w @dental/shared`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed; Vite still reports the existing large `workspace` chunk warning.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.
---
Date: 2026-06-03

Slice: Schedule mutation response hardening

What was wrong:
- Schedule create/update validation was bounded, but domain mutation failures still reached public `message` as `error.message`.
- Active-visit locks, missing appointments, overlaps, missing assistant/resource data, invalid merged times, and outside-hours checks were status-correct but not contract-stable.
- Existing schedule smokes checked old zod issue paths or raw domain phrases instead of bounded API body shape.

What was done:
- Rebuilt `routes/schedule.ts` response handling around `AppointmentCreateRejected`, `AppointmentUpdateRejected`, `AppointmentNotFound`, and bounded `reason` enums.
- Added route-owned Russian messages for missing appointment, active visit lock, missing references/resources, invalid time, overlap, outside hours, and fallback rejection.
- Removed public forwarding of schedule `error.message`.
- Updated `smoke:schedule-configuration`, `smoke:schedule-active-visit-status-contract`, and `smoke:core-route-validation` to assert `code`, `reason`, readable `message`, no `error` field on schedule rejections, and no raw zod/schema/route leakage.
- Updated `04-product-risk-audit.md`.

Cinematic cheats used:
- No appointment model rewrite.
- No schedule algorithm rewrite.
- No React schedule UI rewrite.
- One route-level classifier plus stronger smoke coverage fixed the public contract without touching valid schedule paths.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: one string classification and one invalid-request response object only on rejected appointment mutations.
- Expected i3/MX350 impact: effectively 0; no dashboard success path, schedule render, DICOM, speech, finance, import, or valid appointment hot path changed.
- Bundle budget was not used as a gate for this slice by explicit instruction.

Verification:
- `npm run typecheck -w @dental/api`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:schedule-configuration`: passed.
- `npm run smoke:schedule-active-visit-status-contract`: passed.
- `npm run smoke:schedule-admin-guard`: passed.
- `npm run smoke:core-route-validation`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:schedule-view-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind; unrelated Unity Roslyn `dotnet ... VBCSCompiler.dll` was already present and was not touched.
---
Date: 2026-06-03

Slice: Settings and communications mutation response hardening

What was wrong:
- Settings profile/staff/chair mutation failures still depended on domain exception text for public response bodies.
- Staff/chair missing-resource and active-appointment conflict responses were status-correct but not contract-stable.
- Communication task completion returned the raw not-found exception as public `message`.

What was done:
- Added route-owned settings classifiers for `ClinicProfileMutationRejected`, `StaffScheduleNotFound`, `ChairScheduleNotFound`, `StaffScheduleRejected`, and `ChairScheduleRejected`.
- Split settings public failures into stable `error`, bounded `reason`, and Russian `message`.
- Removed public settings machine codes containing the DTO key `workingHours`.
- Changed communication task not-found to `CommunicationTaskNotFound`, `reason: task_not_found`, and route-owned operator copy.
- Expanded `smoke:settings-route-validation`, `smoke:schedule-configuration`, `smoke:communication-task-complete-contract`, and `smoke:core-route-validation`.
- Updated `04-product-risk-audit.md`.

Cinematic cheats used:
- No settings persistence rewrite.
- No schedule algorithm rewrite.
- No communications model rewrite.
- Small route-level classifiers plus stronger smokes fixed the public contract without touching valid hot paths.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: one string classification and one invalid-request response object only on rejected settings/communication mutations.
- Expected i3/MX350 impact: effectively 0; no dashboard success path, schedule render, DICOM, speech, finance, import, or web hot path changed.
- Bundle budget was not used as a gate for this slice by explicit instruction.

Verification:
- `npm run typecheck -w @dental/api`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:settings-route-validation`: passed.
- `npm run smoke:schedule-configuration`: passed.
- `npm run smoke:communication-task-complete-contract`: passed.
- `npm run smoke:core-route-validation`: passed.
- `npm run smoke:settings-admin-guard`: passed.
- `npm run smoke:settings-persistence-file`: passed; corrupt-state warning lines are the smoke's invalid-state probe and exit code was 0.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- `npm run smoke:schedule-admin-guard`: passed.
- `npm run smoke:communications-view-source`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run build -w @dental/web`: passed; Vite still reports the existing large `workspace` chunk warning.
- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:api-global-error-boundary`: passed.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.
---
Date: 2026-06-03

Slice: Document operation response contract hardening

What was wrong:
- Document operational refusals still used Russian operator copy as the machine `error` value.
- Existing document/tax smokes were status-correct but still read the old `json().error` text contract.
- KND 1151156 invalid-INN create needed a useful operator hint without reopening raw zod issue leakage.

What was done:
- Changed document route `apiError()` to return stable `DocumentOperationRejected` plus separate Russian `message`.
- Added a route-owned KND 1151156 validation special case for non-empty INN values that are not 12 digits.
- Updated document/tax smokes to read operator text from `message ?? error`.
- Strengthened document route/html smokes to assert the machine `error` is stable, non-Russian, and has no zod `issues`.
- Updated `04-product-risk-audit.md`, `Status_DENTE.md`, and `Rationale_DENTE.md`.

Scope control:
- No document model rewrite.
- No renderer rewrite.
- No tax XML algorithm rewrite.
- No web UI rewrite.
- Valid document hot paths are unchanged; only rejected-response shape and one invalid-create hint changed.

Exact runtime impact:
- Runtime frame path: 0 measured.
- Added cost: one extra response field only on rejected document operations; one small request-body inspection only after document create validation has already failed.
- Expected low-end impact: effectively 0.
- Bundle budget was not used as a gate by explicit instruction.

Verification:
- `npm run typecheck -w @dental/api`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:document-route-validation`: passed.
- `npm run smoke:document-html-issue-guards`: passed.
- `npm run smoke:document-issue-chains`: passed.
- `npm run smoke:tax-document-explicit-payment-scope`: passed.
- `npm run smoke:tax-certificate-duplicate-issue`: passed.
- `npm run smoke:tax-knd-xml`: passed.
- `npm run smoke:document-guards`: passed.
- `npm run smoke:document-payloads`: passed.
- `npm run smoke:document-zip-redaction`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:api-global-error-boundary`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- `npm run smoke:documents-view-source`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run build -w @dental/web`: passed; existing large `workspace` chunk warning remains non-gating.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind; unrelated Unity `dotnet` processes were present and were not touched.

---
Date: 2026-06-03

Slice: Telegram chat-link revoke response hardening

What was wrong:
- Missing/stale Telegram chat-link revoke returned only `TelegramChatLinkNotFound`.
- The API contract had no operator-readable `message` and no runtime proof that route ids, bot scope ids, request params/query/body, parser terms or secrets stayed out of the response.

What was done:
- Added `telegramChatLinkNotFoundMessage` in `routes/telegram.ts`.
- Kept `error: "TelegramChatLinkNotFound"` and added a bounded Russian `message` on missing revoke.
- Extended `smoke:telegram-validation` with source guards against the old bare-code response.
- Added a runtime unknown-chat-link revoke injection and leakage checks.
- Updated `13-dente-telegram-bot-plan.md` and `04-product-risk-audit.md`.

Cinematic cheats used:
- No Telegram link storage rewrite.
- No chat-link ledger rewrite.
- No UI workaround.
- One route-owned message plus one smoke case fixed the public contract without touching successful revoke/list/outbox/webhook paths.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: one extra response field only on rejected revoke.
- Expected i3/MX350 impact: effectively 0; no DICOM render, speech provider, finance, schedule, import, Telegram outbox, webhook, or UI hot path changed.
- Bundle budget was not used as a gate for this slice by explicit instruction.

Verification:
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:telegram-validation`: passed.
- `npm run smoke:telegram-control-ui-source`: passed.
- `npm run smoke:telegram-due-worker-source`: passed.
- `npm run smoke:telegram-url-ui-source`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:api-global-error-boundary`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- `npm run smoke:settings-route-validation`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run build -w @dental/web`: passed; Vite reports the existing large `workspace` chunk warning, not treated as a gate.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

# 2026-06-03 - Pricelist warning UI humanization

Task:
- Continue broad Dental CRM hardening without treating gzip size as the objective.

What was found:
- `SettingsView` rendered price-list row warnings through `warnings.join(", ")`.
- Analysis-level price-list warnings rendered directly as `{warning}`.
- That leaked analyzer ids such as `price_not_found`, `image_payload_invalid`, and `groq_skipped_invalid_image_payload` into the admin UI.

What was done:
- Added `pricelistWarningsText` in `apps/web/src/pricelistUiMeta.ts`.
- Wired the helper through `App.tsx` into `SettingsView`.
- Replaced raw price-list warning renders in the Settings price-list result panel.
- Extended `smoke:pricelist-analyzer` to require the helper and reject the old raw price-list warning JSX.
- Updated `02-ai-and-migration-plan.md` and `04-product-risk-audit.md`.

Cinematic cheats used:
- No analyzer DTO rewrite.
- No API localization pass.
- No generic Settings-wide warning formatter.
- One UI-owned label map fixed the public copy while preserving stable machine ids.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: small string-map lookup only when the Settings price-list result panel renders.
- Expected i3/MX350 impact: effectively 0; no visit, DICOM, speech, schedule, finance, Telegram, or API hot path changed.
- Bundle budget was not used as a gate by explicit instruction.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:pricelist-analyzer`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed; Vite reports the existing large `workspace` chunk warning, not treated as a gate.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.

---

# 2026-06-04 - Executable CT progressive stages and 3D model workbench routing

Task:
- Continue CT hardware optimization and 3D skull/surface model routing without treating gzip size as the objective.

What was found:
- Render-cache phases described first paint/navigation/refinement, but a future viewer still had no executable slice order, request type, cancellation group, or prerequisites.
- Local organizer detected skull/mandible surface files, but did not produce a model-workbench route.

What was done:
- Added `progressiveStages` to the shared DICOM render-cache response contract.
- API now emits seed slices, interleaved low-resolution volume, active window, adjacent window, and idle refinement stages.
- Stages carry bounded `sliceOrder`, request type, cancel group, required previous stages, decimation factor, resident window, budget, and next action.
- Local organizer now emits `dental-crm-model-workbench-v1` for model candidates.
- Skull/maxilla/mandible/CT bone surface models route to `local_bridge`; smaller generic models can route to external model viewing; archives/unknown formats stay metadata-only.
- Settings shows progressive stage request counts and model-workbench target/size/role.
- Source and runtime smokes now guard both contracts.

Cinematic cheats used:
- No mesh load in CRM.
- No full CT renderer rewrite.
- No all-slices-before-first-frame plan.
- Server-owned schedule prepares future viewer/desktop adapter work.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Expected saved work: future CT viewer can avoid unbounded first-load and cancel stale ranges during scroll.
- Added cost: render-cache response assembly and small Settings diagnostics only.
- Bundle budget was not used as a gate by explicit instruction.

Verification:
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run smoke:dicom-workbench-offline-source`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test/dev process left behind.

---

# 2026-06-04 - CT ZIP streaming, first-frame range reads, surface manifests, and offline DB v4

Task:
- Continue Dental CRM CT/offline/performance hardening. Gzip size is not a gate; CT must stay honest and responsive on site, phone, PC browser, and desktop shell.

What was found:
- Regular ZIP workup still had a coarse total-size blocker even though the parser now supports bounded central-directory range reads.
- Deflated ZIP DICOM metadata could still inflate a whole compressed entry before taking the header prefix.
- First-frame preview could still read a whole DICOM file for a thumbnail candidate.
- ZIP virtual entries could appear more browser-MPR executable than they are without a real local pixel bridge.
- CT surface models and implant planning needed a strict boundary: CRM metadata only, no mesh/CAD generation claim.
- Server-local CT operations needed a visible stop path in Settings, not only browser-local scan cancellation.
- Existing v3 offline DB instances could miss CT/MPR stores and fall back to weaker `localStorage`.

What was done:
- Removed the regular ZIP total-size gate and added a sparse central-directory-offset ZIP fixture to the no-PHI DICOM smoke.
- Added bounded streaming inflate for deflated ZIP DICOM entry prefixes.
- Added bounded header-plus-first-frame DICOM preview reads and removed full-file preview reads.
- Routed virtual ZIP entries to metadata/external-only readiness, runtime, launch, and resource policies.
- Added shared/API CT surface model manifests with `containsMeshGeometry=false`, local-bridge readiness, and CT pairing hints.
- Added implant/export fields that mark browser output as planning parameters only; CAD/STL belongs to lab/local bridge.
- Added Settings stop control for API-local DICOM discovery/organizer/workup/preview operations.
- Moved offline DB to v4, asserted required stores, closed old connections on version change, and reset cached DB open promises on blocked/error.
- Extended source/runtime smokes for the new contracts.

Cinematic cheats used:
- No full CT volume renderer in the CRM shell.
- No mesh or CAD generation in the patient card.
- No hidden ZIP pixel extraction for browser MPR.
- Metadata/routing remains useful now; real pixels and surfaces stay in OHIF/Cornerstone/local bridge paths.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Expected impact: lower peak memory for ZIP metadata and thumbnail preview, fewer stale server-local CT tasks, and stronger offline CT/MPR draft recovery.
- Added cost: small schema assertion during DB open, one local-operation cancel state, and bounded inflater stream overhead only during deflated ZIP metadata reads.

Verification before log update:
- `npm run smoke:api-dicom-scan-abort-yield-source`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:dicom-workbench-ui-cancel-source`: passed.
- `npm run smoke:dicom-workbench-offline-source`: passed.
- `npm run smoke:visit-offline-queue-source`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run build -w @dental/web`: passed; existing large `workspace` chunk warning only.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:api-text-encoding`: passed.

---

# 2026-06-04 - CT runtime capability and picker/render concurrency honesty

Task:
- Continue orchestration after CT ZIP/preview/offline hardening. Focus on site/phone/PC/desktop-app honesty and bounded browser-local CT work.

What was found:
- `desktop_app` runtime could be inferred from `userAgent`/`platform` text.
- Browser CT file-input scan materialized `FileList` through `Array.from(fileList)` before the 900-file cap.
- Browser directory picker traversal had global caps but no per-directory entry cap.
- Render-cache planning reported quality-mode worker counts even when Web Workers were unavailable.

What was done:
- Added explicit runtime/capability fields to workstation client facts: `runtimeSurfaceHint`, `desktopShellBridgeSupported`, `directoryPickerSupported`, and `directoryHandlePersistence`.
- Web client now reports desktop app only when a real desktop/local bridge global exists; otherwise it reports web/mobile/tablet facts.
- API now treats `runtimeSurfaceHint: "desktop_app"` as `desktop_app` only when `desktopShellBridgeSupported=true`; UA spoof without a bridge falls back to PC browser.
- Browser CT file-input and adjacent browser migration input now iterate files by index up to the cap instead of materializing the whole list.
- Browser directory picker and browser migration directory traversal now cap inspected entries per folder.
- Render-cache worker count is now gated by `canUseWorker`; no-worker clients get worker count 0, decode concurrency 1, and main-thread progressive stages.

Verification:
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:browser-imaging-scan-progress-source`: passed.
- `npm run smoke:api-dicom-scan-abort-yield-source`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed; now proves explicit desktop bridge, UA-spoof rejection, and no-worker render-cache planning.
- `npm run build -w @dental/web`: passed; existing large `workspace` chunk warning only.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed; Vite reports the existing large `workspace` chunk warning, not treated as a gate.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.

---

# 2026-06-04 - Accepted visit offline queue moved to IndexedDB

Task:
- Continue broad Dental CRM hardening for online/offline operation across site, phone, PC, and desktop shell.

What was found:
- Accepted visit-note save retry queue still used `localStorage`.
- App boot synchronously read the pending visit-save queue to initialize counters.
- Speech chunks already had an IndexedDB offline path, so accepted visit saves were the weaker outlier.

What was done:
- Added `pendingVisitSaves` store to `dental-crm-offline` IndexedDB version 2.
- Added indexes for `queuedAt`, `organizationId`, and `visitId`.
- Added normalization, sorting, IndexedDB read/write/delete, stale pruning, and migration from scoped/legacy `localStorage`.
- Converted accepted-visit queue, refresh, and flush to async IndexedDB-first behavior.
- Kept scoped `localStorage` fallback for browsers where IndexedDB is unavailable or blocked.
- Removed synchronous React state initialization from the pending accepted-save queue.
- Added `smoke:visit-offline-queue-source`.
- Updated `04-product-risk-audit.md`.

Cinematic cheats used:
- No new sync engine.
- No backend mutation shape change.
- No storage UI expansion in this slice.
- Reused the existing offline database instead of adding another queue owner.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Expected saved work: fewer boot-time synchronous storage reads and a more durable retry queue under offline operation.
- Added cost: IndexedDB transaction during queue refresh/flush only.
- Bundle budget was not used as a gate by explicit instruction.

Verification:
- `npm run smoke:visit-offline-queue-source`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:app-boot-state-source`: passed.
- `npm run smoke:speech-queue-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:visit-draft-status-contract`: passed.
- `npm run build -w @dental/web`: passed; Vite reports the existing large `workspace` chunk warning, not treated as a gate.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind.

---

# 2026-06-04 - CT workbench recovery moved to IndexedDB

Task:
- Continue Dental CRM CT/offline hardening across site, phone, PC browser, and desktop shell.

What was found:
- DICOM workbench recovery kept the last no-pixel manifest in `localStorage`.
- Per-series MPR controls also used `localStorage`.
- These are not pixel payloads, but they are important clinical route state and should not be boot-time synchronous storage.

What was done:
- Raised `dental-crm-offline` IndexedDB version to 3.
- Added `dicomWorkbenchDrafts` store for last DICOM workbench manifest recovery.
- Added `mprWorkbenchDrafts` store for per-series CT/MPR control recovery.
- Added organization/series/saved-time indexes.
- Added localStorage migration plus restricted-browser fallback for both stores.
- Converted DICOM workbench restore to async/cancellable effect.
- Converted manual and automatic MPR restore to async IndexedDB-first path.
- Converted MPR autosave to async local write.
- Changed DICOM workbench build/reconnect flows to mark `dicomWorkbenchLocalSavedAt` only when local recovery write succeeds.
- Added `smoke:dicom-workbench-offline-source`.
- Updated `10-imaging-dicom-viewer-plan.md` and `04-product-risk-audit.md`.

Cinematic cheats used:
- No CT pixel storage in the CRM shell.
- No mesh storage in the CRM shell.
- No hidden file-system access claim.
- Recovery state remains metadata/tool-state only.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Expected saved work: no synchronous localStorage read for CT workbench recovery, and more durable restore state for offline work.
- Added cost: small IndexedDB transactions on CT workbench restore/save only.
- Bundle budget was not used as a gate by explicit instruction.

Verification:
- `npm run smoke:dicom-workbench-offline-source`: passed.
- `npm run smoke:visit-offline-queue-source`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:app-boot-state-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run build -w @dental/web`: passed; Vite reports the existing large `workspace` chunk warning, not treated as a gate.
- `npm run smoke:browser-file-input-dicom`: passed on temporary API+web dev servers.
- `npm run smoke:web-code-split-source`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Temporary API+web dev process trees were stopped after browser smoke.
- Process check: no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build, dev, or test process left behind.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---

# 2026-06-04 - Import row warning UI hardening

Task:
- Continue broad Dental CRM hardening without treating gzip size as the objective.

What was found:
- Settings patient import rows rendered warnings through `row.warnings.join(", ")`.
- Settings imaging import rows rendered warnings through `row.warnings.join(", ")`.
- Imaging ready rows used `row.filePath` as the fallback visible text, which can expose full workstation paths.

What was done:
- Added `patientImportRowWarningText` and `imagingImportRowWarningText` in `SettingsView`.
- Routed patient/imaging import row warnings through `humanizeMigrationText`.
- Changed imaging ready fallback to show a safe file name when available, otherwise a clean ready-to-link message.
- Extended `smoke:settings-view-source` to require the helpers and reject the old raw warning joins.
- Updated `04-product-risk-audit.md`.

Cinematic cheats used:
- No import API rewrite.
- No DTO shape changes.
- No global warning formatter.
- One domain-specific UI formatting layer fixed visible import rows without touching import execution.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: small string formatting only when Settings import preview rows render.
- Expected i3/MX350 impact: effectively 0; no visit, DICOM preview, speech, schedule, finance, Telegram, or API hot path changed.
- Bundle budget was not used as a gate by explicit instruction.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:import-contracts`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed; Vite reports the existing large `workspace` chunk warning, not treated as a gate.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---

# 2026-06-04 - AI recognition warning UI hardening

Task:
- Continue broad Dental CRM hardening without treating gzip size as the objective.

What was found:
- Settings AI recognition result warnings rendered `typedRecognitionJob.warnings` directly as `{warning}`.
- Server warnings were useful stable DTO state, but visible copy still exposed OCR/preview/AI/viewer wording to admins.

What was done:
- Added `aiRecognitionWarningText` and a Settings-local clinical label map.
- Routed recognition result warning chips through the UI-owned formatter.
- Extended `smoke:settings-view-source` to require the formatter and reject the old raw warning render.
- Updated `02-ai-and-migration-plan.md` and `04-product-risk-audit.md`.
- Removed duplicate verification lines left in the previous price-list log/status slice.

Cinematic cheats used:
- No API DTO rewrite.
- No provider/recognition pipeline change.
- No global Settings warning formatter.
- One UI-owned label map fixed the public copy while preserving stable backend warnings.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: one string-map lookup per recognition warning only when the Settings AI result panel renders.
- Expected i3/MX350 impact: effectively 0; no visit, DICOM, speech capture, schedule, finance, Telegram, or API hot path changed.
- Bundle budget was not used as a gate by explicit instruction.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:ai-recognition-scope`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed; Vite reports the existing large `workspace` chunk warning, not treated as a gate.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---

# 2026-06-04 - Clinic public lookup warning UI hardening

Task:
- Continue broad Dental CRM hardening without treating gzip size as the objective.

What was found:
- Settings clinic public lookup suggestions and result warnings rendered raw warning strings.
- Import-side clinic lookup warnings rendered raw warning strings.
- Smart-import clinic suggestion warnings rendered raw warning strings.
- Migration-autopilot clinic lookup warnings used generic humanization but not the field-aware clinic lookup copy path.

What was done:
- Added `clinicPublicLookupWarningText` in `SettingsView`.
- Routed clinic lookup, import-side lookup, migration-autopilot lookup, and smart-import clinic suggestion warnings through that formatter.
- Rewrote duplicate-requisite warnings with clinic profile field labels instead of raw keys.
- Extended `smoke:settings-view-source` to require the formatter and reject old raw lookup/suggestion warning chips.
- Updated `02-ai-and-migration-plan.md` and `04-product-risk-audit.md`.

Cinematic cheats used:
- No API DTO rewrite.
- No provider/lookup pipeline change.
- No global Settings warning formatter.
- One field-aware UI formatter fixed the public copy while preserving stable backend warnings.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: one string humanization/regex pass per visible clinic lookup warning only when Settings lookup/import panels render.
- Expected i3/MX350 impact: effectively 0; no visit, DICOM, speech capture, schedule, finance, Telegram, or API hot path changed.
- Bundle budget was not used as a gate by explicit instruction.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:import-contracts`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-render-gating-source`: passed.
- `npm run build -w @dental/web`: passed; Vite reports the existing large `workspace` chunk warning, not treated as a gate.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---

# 2026-06-04 - DICOM planning route copy hardening

Task:
- Continue broad Dental CRM hardening without treating gzip size as the objective.

What was found:
- `buildDicomViewerPlanningTasks` returned English task titles such as `OPG / panoramic reconstruction` and `Surgical guide route`.
- Route-owned planning reasons and blockers still exposed English implementation copy such as `Volume stack is not ready`, `Panoramic reconstruction needs`, and implant-library warning text.
- These fields can flow into workflow/export/handoff packets, so browser-only copy cleanup is not enough.

What was done:
- Replaced DICOM planning task titles, reasons, and blocker warnings in `imaging.ts` with Russian operator copy.
- Kept task kinds, target tools, DTO field names, geometry contracts, and viewer-state contracts stable.
- Extended `smoke:imaging-viewer-usability-source` to require Russian route copy and forbid the old English strings in `imaging.ts`.
- Updated `10-imaging-dicom-viewer-plan.md` and `04-product-risk-audit.md`.

Cinematic cheats used:
- No DTO rename.
- No browser-only adapter.
- No CT viewer rewrite.
- Static route copy fixed the exported planning packet boundary.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: 0; static API string replacement during planning packet assembly.
- Expected i3/MX350 impact: effectively 0; DICOM parsing, preview decode, render-plan selection, browser CT controls, schedule, finance, Telegram, and speech paths are unchanged.
- Bundle budget was not used as a gate by explicit instruction.

Verification:
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed; Vite reports the existing large `workspace` chunk warning, not treated as a gate.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- Old English DICOM planning strings remain only inside smoke `forbidIn` guards, not in `imaging.ts`.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test process left behind.

---

# 2026-06-04 - CT geometry budgets and surface-model organizer roles

Task:
- Continue broad Dental CRM hardening with CT performance, hardware-aware planning, and 3D skull/model routing as the priority. Gzip size is not the objective.

What was found:
- DICOM memory planning still relied too much on slice/file count.
- Render-cache planning had task ordering, but not explicit first-paint/navigation/idle-refine interaction phases.
- Local organizer model-role detection did not classify CT-derived skull, maxilla, mandible, or generic bone-surface model files.

What was done:
- Added DICOM geometry fields to shared row/group schemas and API parsing.
- Parsed Rows, Columns, bit depth, samples-per-pixel, and estimated pixel bytes from bounded DICOM headers and manifest rows.
- Changed MPR/browser/GPU estimates to use pixel geometry when available.
- Added render-cache interaction phases and exposed them in Settings.
- Added metadata-only CT surface model roles: skull surface, maxilla surface, mandible surface, and CT bone surface.
- Extended no-PHI DICOM smoke for 32x32 and 1024x1024 geometry estimates, phase coverage, and synthetic skull/mandible model-role detection.
- Updated `10-imaging-dicom-viewer-plan.md` and `04-product-risk-audit.md`.

Cinematic cheats used:
- No mesh loading in CRM shell.
- No diagnostic pixel rendering claim.
- No one-shot full-volume load requirement.
- Metadata/geometry planning carries the CT route until a dedicated viewer or local worker owns pixel/mesh rendering.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Added cost: bounded header/manifest integer parsing during admin CT workup; small phase-list render in Settings only.
- Expected hardware impact: fewer wrong full-MPR decisions on weak hardware; future CT viewer can show first visible slice before full refinement.
- Bundle budget was not used as a gate by explicit instruction.

Verification:
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed; Vite reports the existing large `workspace` chunk warning, not treated as a gate.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.

---

# 2026-06-04 - CT runtime profile across site, phone, PC, desktop app, online/offline

Task:
- Continue broad Dental CRM hardening with CT hardware honesty and online/offline operation across site, phone, PC browser, and desktop app.

What was found:
- Workstation readiness did not expose one explicit runtime profile for surface plus network/source mode.
- Offline local DICOM folders and offline remote DICOMweb/PACS archives were too easy to treat as one "offline" case.
- Operator UI needed lane labels, not raw `browser_mpr`, `desktop_app_mpr`, or `metadata_only` ids.

What was done:
- Added shared/API runtime profile contract for surface, network mode, execution lane, local/remote capability flags, label, next action, and warnings.
- API now detects mobile/tablet/PC browser/desktop app from client facts and user agent.
- API render planning forces phone/tablet into preview/handoff and forces offline remote archives into metadata-only with metadata-index cache work only.
- Desktop app + offline local folders route to desktop-app MPR instead of pretending the website and desktop module are identical.
- Settings renders runtime label plus translated lane and recovery action.
- Source smoke blocks raw runtime lane ids in operator copy.
- DICOM folder smoke covers desktop browser, mobile, desktop app offline-local, and offline remote metadata-only cases.
- Updated `10-imaging-dicom-viewer-plan.md` and `04-product-risk-audit.md`.

Cinematic cheats used:
- No full CT renderer rewrite in CRM shell.
- No mobile full-volume promise.
- No remote pixel fetch while offline.
- Runtime routing buys responsiveness before pixel work exists.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Expected saved work: phone/tablet and offline remote archive paths skip decode/upload/cache tasks that cannot safely complete.
- Added cost: one readiness-profile classification during DICOM workstation readiness and small UI text render in Settings.
- Bundle budget was not used as a gate by explicit instruction.

Verification:
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed; Vite reports the existing large `workspace` chunk warning, not treated as a gate.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.

---

# 2026-06-04 - Browser-local CT scan progress/cancel/yield

Task:
- Continue Dental CRM CT/offline hardening; gzip size is not the objective. CT must stay responsive across site, phone, PC, and desktop app.

What was found:
- Browser-local CT/folder selection scanned up to 900 files and 180 DICOM magic headers without visible progress or cancellation.
- This path does not decode CT pixels, but it can still feel frozen on phones or weak PCs when the selected folder is large.

What was done:
- Added `BrowserImagingScanProgress`, named scan limits, and a browser scan runtime controller in `App.tsx`.
- Added throttled progress publishing, `AbortController` cancellation, abort checks around directory/file/header reads, `scheduler.yield()` support, and `setTimeout(0)` fallback.
- Settings now shows live counts for files, folders, DICOM-like files, archives, 3D models, bytes, scan phase, timestamps, and stop controls.
- Added `smoke:browser-imaging-scan-progress-source`.
- Updated `10-imaging-dicom-viewer-plan.md` and `04-product-risk-audit.md`.

Cinematic cheats used:
- No diagnostic pixel decode in the CRM shell.
- No mesh loading in Settings.
- No fake percent progress for an unknown directory total.
- Browser-local summary stays metadata/no-path; heavy CT still routes to local/OHIF/Cornerstone/external workbench.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Expected impact: fewer long browser main-thread tasks during local CT/3D selection on phone and weak-PC routes.
- Added cost: small progress state render during active browser scan only.
- Bundle budget was not used as a gate by explicit instruction.

Verification:
- `npm run smoke:browser-imaging-scan-progress-source`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run build -w @dental/web`: passed; Vite reports the existing large `workspace` chunk warning, not treated as a gate.
- `npm run smoke:browser-file-input-dicom`: passed after temporary API+web dev servers were started for the browser route.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Temporary dev process trees were stopped.
- Process check: no DENTE build/test/dev process left behind.

---

# 2026-06-04 - API local CT/DICOM scan abort/yield

Task:
- Continue Dental CRM CT/offline hardening. CT must stay responsive across site, phone, PC browser, and desktop app; gzip size is not the objective.

What was found:
- Browser-local CT scans were already cancellable/yielding, but the API-side local scan routes still walked folders and parsed bounded DICOM headers without request abort propagation.
- A cancelled browser/desktop-shell request could leave the API doing stale local folder work until the existing limits were reached.
- ZIP archive parsing remains memory-weaker than the folder walks because current code still reads <=250 MB ZIP files as a whole buffer before reading selected entries.

What was done:
- Added `ApiDicomScanOptions`, request-scoped `AbortSignal`, abort error handling, and a shared `maybeYieldApiDicomScan` helper using `node:timers/promises` `setImmediate`.
- Threaded the signal through `collectImagingFiles`, `collectDicomHeaderFiles`, `buildDicomHeaderManifest`, `buildDicomFirstFramePreview`, `discoverLocalDicomFolders`, `organizeLocalImagingSources`, `buildDicomFolderSeriesPreview`, and `buildDicomFolderWorkupPlan`.
- Wrapped six heavy routes: local folder discovery, local organizer, folder series preview, first-frame preview, folder workup plan, and generic folder scan preview.
- Added `smoke:api-dicom-scan-abort-yield-source`.
- Updated `docs/10-imaging-dicom-viewer-plan.md` and `docs/04-product-risk-audit.md`.

Cinematic cheats used:
- No full CT volume renderer in the CRM shell.
- No mesh loading into the patient card.
- No worker-pool rewrite in this slice.
- Request abort/yield buys responsiveness now; ZIP random-read remains the next focused memory-honesty repair.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Expected impact: fewer stale API scan tasks and fewer long Node event-loop stretches during local CT/3D folder scans.
- Added cost: one abort listener per heavy local scan request and scheduled yield checks during folder/file/header loops.

Verification:
- `npm run smoke:api-dicom-scan-abort-yield-source`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run smoke:api-text-encoding`: passed.

---

# 2026-06-04 - ZIP/DICOM bounded metadata reads and browser scan observability

Task:
- Continue Dental CRM CT/offline hardening. Gzip size is not the objective; CT paths must be honest, responsive, and useful across site, phone, PC browser, and desktop shell.

What was found:
- The ZIP metadata parser still read regular ZIP files as a whole buffer before reading entries.
- Already expanded `archive.zip::slice.dcm` paths could be classified as archive sources again during series grouping.
- Browser-local CT scan progress showed counts and timestamps, but not elapsed time, processed work, or the actual scan caps.

What was done:
- Reworked `readZipCentralDirectoryDetailed` to read the EOCD tail, bounded central directory, and per-entry local prefix by descriptor/range.
- Kept unsupported split/multi-disk, ZIP64 sentinel, encrypted, out-of-bounds, and central-directory-over-limit archives as warnings.
- Changed `isDicomArchivePath` so virtual `zip::entry` paths are not re-expanded.
- Added a stored synthetic ZIP with six no-PHI DICOM slices to `smoke:dicom-folder-workup`.
- Extended browser scan progress with `elapsedMs`, `processedUnits`, `fileLimit`, `folderLimit`, and `magicReadLimit`.
- Settings now renders file/folder counts against caps, DICOM signature cap, work units, and elapsed time in the browser-local CT scan progress strip.
- Updated `docs/10-imaging-dicom-viewer-plan.md`, `Status_DENTE.md`, and `Rationale_DENTE.md`.

Cinematic cheats used:
- No diagnostic CT pixel decode in the CRM shell.
- No hidden mesh/skull renderer in Settings.
- No fake percentage for browser directory traversal.
- Regular ZIP metadata is supported with bounded reads; unsupported archive shapes remain explicit warnings.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Expected impact: lower peak memory for ZIP metadata preview and clearer long-scan behavior on weak/mobile browsers.
- Added cost: small progress fields during active browser scan only.

Verification:
- `npm run smoke:api-dicom-scan-abort-yield-source`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed; output reported `filesParsed=54`, `estimatedPixelBytes=110592`.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:browser-imaging-scan-progress-source`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run build -w @dental/web`: passed; existing large `workspace` chunk warning only.
- `npm run smoke:web-text-encoding`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE build/test/dev process left behind.

---

# 2026-06-04 - CT integration wave: bounded traversal, PWA cache, site fit, report, 3D readiness

Task:
- Continue Dental CRM CT/offline/desktop hardening. Bundle gzip is not the gate; CT must be useful and honest across site, phone, PC browser, and desktop app.

What was found:
- Server collectors still needed a directory-entry cap before per-directory materialization.
- The PWA service worker needed an explicit cache allowlist so offline shell support did not become a generic dynamic/API/local-output cache.
- Implant-fit measurements needed tooth/site scoping before ranking candidates.
- Export/report and local 3D readiness needed to be useful without implying CRM-owned pixels, meshes, or CAD/STL.

What was done:
- Added bounded `opendir` traversal with head-index queues and per-folder entry caps to generic imaging and DICOM header collection.
- Added `maxFolders` and `maxEntriesPerFolder` request fields to the shared DICOM/imaging scan contracts.
- Added a service-worker shell/assets allowlist, dynamic shell cache pruning, and `smoke:web-service-worker-cache-source`.
- Integrated site-scoped CT implant-fit evidence and fixed the `string | null` geometry return after parallel integration.
- Integrated CT report print/text/JSON sidecar actions.
- Integrated local CT 3D readiness lanes for CT surface, arches, scan-body, and guide metadata.
- Updated `docs/10-imaging-dicom-viewer-plan.md`, `Status_DENTE.md`, and `Rationale_DENTE.md`.

Cinematic cheats used:
- No CRM diagnostic CT pixel renderer.
- No skull/mesh loader in browser CRM.
- No CAD/STL generator in browser CRM.
- No broad PWA cache for API/local CT work outputs.

Exact microseconds saved:
- Runtime frame path: 0 measured.
- Expected impact: bounded API traversal before giant-directory materialization; safer offline shell cache; fewer clinically misleading implant-fit candidate reasons.

Verification:
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:browser-imaging-scan-progress-source`: passed.
- `npm run smoke:web-service-worker-cache-source`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:api-dicom-scan-abort-yield-source`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run build -w @dental/web`: passed; existing large `workspace` chunk warning only.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:web-text-encoding`: passed.

Follow-up integration:
- Added CT local 3D dentist/lab next-action summary in the readiness panel.
- Added browser continuity OPFS/file-picker/directory-picker facts and explicit metadata-only CT offline boundary.
- Re-ran `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:dicom-workbench-offline-source`, `npm run typecheck -w @dental/web`, and `npm run build -w @dental/web`: passed.
- Added CT render hardware policy fields: memory budget class, continuous hardware quality weight, progressive slice-window cap, and diagnostic pixel policy.
- Desktop web is capped to planning preview; explicit desktop-app bridge can unlock diagnostic policy under bounded slice windows.
- Re-ran `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run smoke:api-dicom-scan-abort-yield-source`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/web`, and `npm run smoke:imaging-viewer-usability-source`: passed.

---

# 2026-06-04 - Issued document HTML preview safety

Task:
- Harden issued HTML document preview safety and popup-blocked fallback for site/phone/PC/desktop shells.

What was found:
- `openIssuedDocumentHtml` fetched `/api/documents/:id/html`, converted the response into a blob, and opened `blob:`. That bypassed the API response context carrying no-store, nosniff, and HTML CSP headers.

What was done:
- Added shared issued HTML preview/download URL helpers.
- Changed preview open to navigate directly to `/api/documents/:id/html`.
- Changed popup-blocked behavior to keep visible guidance and invoke the authenticated `html?download=1` archive download fallback.
- Added the same authenticated download fallback for header-secret clinical sessions because a new tab cannot carry `x-dente-admin-secret`.
- Added `smoke:document-html-preview-source` and updated `smoke:document-payload-ui-source` for the new helper.
- Fixed two exact-optional `AbortSignal` compile errors in current `App.tsx` migration scan code that blocked the required web typecheck.
- Updated `docs/12-document-generation-forms.md`, `Status_DENTE.md`, and `Rationale_DENTE.md`.

Rejected alternatives:
- Blob preview with longer revocation: rejected because it still loses API security headers.
- Warning-only popup fallback: rejected because locked-down clinic browsers need an immediate download route.

Verification:
- `npm run smoke:document-html-preview-source`: passed.
- `npm run smoke:document-payload-ui-source`: passed.
- `npm run smoke:document-html-issue-guards`: passed.
- `npm run typecheck -w @dental/web`: passed.

---

# 2026-06-04 - Orchestrated wave: CT policy UI, PWA recovery, migration scans, communications

Task:
- Continue Dental CRM without stopping at one issue; orchestrate parallel workers and integrate cross-surface hardening for CT, offline/PWA, legacy migration, documents, and reception workflows.

What was done:
- Added CT render-cache policy fields to the shared/API response and surfaced memory class, hardware quality weight, slice-window cap, and diagnostic pixel policy in Settings readiness/cache/workbench cards.
- Integrated PWA stale-update recovery: SW shell cache `v4`, network-first JS/CSS shell assets, skip-waiting, shell-cache clearing before stale route reload, and runtime/source smokes.
- Integrated browser migration scan progress/cancel/yield: bounded old-MIS/file/folder/signature scan, UI stop buttons, and source smoke.
- Integrated communication task outcomes: no answer, callback, reschedule, promised payment, document pickup, required UI selection, backward-compatible API.
- Integrated CT server-operation cancel wiring: UI abort controller, signal propagation, neutral cancel handling, and source smoke coverage.
- Integrated schedule admin naming cleanup: schedule route/component now use schedule-owned admin secret names instead of Telegram names.
- Integrated ZIP virtual-path honesty: archive-contained DICOM metadata no longer advertises local pixel/MPR readiness or local `dicomfile:` references until a real pixel owner exists.
- Integrated daily-surface keyboard/accessibility smoke for schedule, documents, payment capture, communications, settings, and shell contracts.
- Kept issued document HTML preview on the API URL path and popup-blocked fallback on authenticated download.
- Updated `docs/10-imaging-dicom-viewer-plan.md`, `Status_DENTE.md`, and `Rationale_DENTE.md`.

Rejected alternatives:
- Browser diagnostic CT claim from hardware score alone.
- Broad Cache Storage for medical/API/DICOM/mesh payloads.
- Unbounded browser filesystem traversal on high-end machines.
- Boolean-only communication task completion.
- Let abort-aware CT API routes run without a UI cancel signal.
- Keep Telegram naming at the schedule component boundary.
- Treat `archive.zip::slice.dcm` as a directly loadable local pixel path.
- Treat accessibility as covered only by scattered feature smokes.

Verification:
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:browser-migration-scan-progress-source`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:web-service-worker-cache-source`: passed.
- `npm run smoke:web-service-worker-runtime`: passed.
- `npm run smoke:app-update-recovery-source`: passed.
- `npm run smoke:communication-task-complete-contract`: passed.
- `npm run smoke:communications-view-source`: passed.
- `npm run smoke:communication-task-outcomes`: passed.
- `npm run smoke:dicom-workbench-ui-cancel-source`: passed.
- `npm run smoke:schedule-admin-guard`: passed.
- `npm run smoke:schedule-configuration`: passed.
- `npm run smoke:schedule-view-source`: passed.
- `npm run smoke:daily-surfaces-keyboard-accessibility`: passed.
- `npm run smoke:segmented-controls-accessibility-source`: passed.
- `npm run smoke:documents-view-source`: passed.
- `npm run smoke:payment-capture-source`: passed.
- `npm run smoke:dicom-workbench-offline-source`: passed.
- `npm run smoke:api-dicom-scan-abort-yield-source`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run build -w @dental/web`: passed; existing large `workspace` chunk warning only.

External technical references checked:
- Cornerstone3D progressive volume loading: https://v3.cornerstonejs.org/docs/concepts/progressive-loading/volumeProgressive/
- Cornerstone3D overview/local DICOM capability: https://www.cornerstonejs.org/docs/getting-started/overview/
- OHIF configuration/data-source model: https://docs.ohif.org/configuration/configurationFiles
- MDN OPFS boundary: https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system

---

# 2026-06-04 - Continuous orchestration: CT/offline/finance/speech

Task:
- Continue Dental CRM as an orchestrated multi-surface wave, prioritizing CT performance honesty, offline operation, daily financial safety, and speech recovery.

What was done:
- Aligned `smoke:core-route-validation` with the stricter communication-task outcome validation message.
- Changed CT implant/model copy so browser CRM stores plan parameters and local 3D readiness only; CAD/STL and surface geometry remain lab/local-module deliverables.
- Added Russian record-count formatting for local 3D readiness cards.
- Wired CT reconstruction and implant-model quality weights to the continuous `renderPlan.hardwareQualityWeight` field.
- Integrated the offline visit queue fix: accepted visit saves queue only offline/network/temporary failures, not explicit server rejections.
- Integrated finance hardening: append-only payment guidance and payment-ledger document linkage.
- Fixed the visible payment-ledger mojibake string found during integration.
- Integrated speech queue hardening: queued `audioBase64` remains local until a real recognizer is available.
- Integrated patient hardening: short non-empty phones are blocked, active duplicates return bounded Russian conflict, and patient rows promote the next best action.
- Integrated DICOMweb boundary hardening: the production connector check now requires Settings-admin access rather than clinical-read access.
- Integrated document draft recovery follow-up: 025/у legal confirmations now survive offline/reload draft recovery.
- Integrated speech guidance follow-up: empty and queued-audio actions now reflect recognition availability and keep local audio when upload is unavailable.
- Integrated patient representative follow-up: guardian/representative fragments require full identity context on the merged administrative profile.
- Audited CT ZIP ingest memory path: current implementation already uses bounded range reads for EOCD, central directory, and selected entry prefixes.
- Integrated price-list warning filter: provider/key/HTTP/payload warning patterns render as Russian operator actions.
- Integrated medical-record extract draft recovery: extract fields and confirmations now persist through their own scoped local draft shape.
- Integrated payment idempotency: optional `clientMutationId` prevents duplicate append on retry and blocks cross-patient operation-id reuse.
- Repaired the Russian fallback smoke to track current local-module and external-viewing operator copy after the viewer-wording cleanup.
- Fixed smart-import report filenames so source file extensions are stripped before `_report.csv`.
- Reassigned completed agents to second-pass offline, payment-idempotency, and speech-provider recovery tasks.
- Updated `Status_DENTE.md` and `Rationale_DENTE.md`.

Verification:
- `npm run smoke:core-route-validation`: passed.
- `npm run smoke:communication-task-outcomes`: passed.
- `npm run smoke:communications-view-source`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:visit-offline-queue-source`: passed.
- `npm run smoke:visit-draft-status-contract`: passed.
- `npm run smoke:app-boot-state-source`: passed.
- `npm run smoke:payment-capture-source`: passed.
- `npm run smoke:finance-view-source`: passed.
- `npm run smoke:finance-ledger-source`: passed.
- `npm run smoke:finance-planning-source`: passed.
- `npm run smoke:billing-document-link`: passed.
- `npm run smoke:tax-payment-explicit-payer`: passed.
- `npm run smoke:speech-queue-source`: passed.
- `npm run smoke:speech-clinical-scope`: passed.
- `npm run smoke:speech-provider-errors`: passed.
- `npm run smoke:speech-route-validation`: passed.
- `npm run smoke:speech-key-rotation`: passed.
- `npm run smoke:patients-usability-source`: passed.
- `npm run smoke:patient-create-contract`: passed.
- `npm run smoke:patient-administrative-profile`: passed.
- `npm run smoke:patient-forms-lifecycle`: passed.
- `npm run smoke:dicomweb-connector-boundary`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:settings-route-validation`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run smoke:document-payload-ui-source`: passed.
- `npm run smoke:api-dicom-scan-abort-yield-source`: passed.
- `npm run smoke:pricelist-analyzer`: passed.
- `npm run smoke:payment-idempotency`: passed.
- `npm run smoke:documents-view-source`: passed.
- `npm run smoke:russian-fallback-source`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:api-global-error-boundary`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:import-contracts`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:daily-surfaces-keyboard-accessibility`: passed.
- `npm run smoke:segmented-controls-accessibility-source`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run typecheck -w @dental/web`: passed.
