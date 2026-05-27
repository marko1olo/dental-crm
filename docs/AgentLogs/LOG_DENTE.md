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
