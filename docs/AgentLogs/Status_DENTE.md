# DENTE status

Date: 2026-05-25

## Slice: Telegram post-visit checkup configurability

- [x] Removed hardcoded post-visit checkup delays from runtime outbox scheduling.
  - Implementation: `postVisitCheckupDelayHoursByTopic` now lives in shared settings schema and is normalized in API state.
  - Rejected alternative: keep fixed per-topic constants; it prevents clinic-specific protocols.
- [x] Added clinic-owned bot env override path.
  - Implementation: `DENTE_TELEGRAM_CLINIC_BOTS_JSON` records may override per-topic checkup delays.
  - Rejected alternative: browser token/config paste; runtime bot config must stay server-owned.
- [x] Added first-run and full settings UI controls.
  - Implementation: Russian fieldset `Контроль после лечения`, autosaved through existing Telegram settings save path.
  - Rejected alternative: hidden JSON textarea; reception and doctors need explicit fields.
- [x] Persisted DB contract.
  - Implementation: `post_visit_checkup_delay_hours_json` migration and schema column for bot configs.
  - Rejected alternative: only file-backed mutable state; multi-clinic deployment needs DB shape.
- [x] Updated smoke contracts.
  - Implementation: bot smoke now proves scheduled checkup time from the issued post-visit document, not from current wall time.
  - Rejected alternative: loose `Date.now()` threshold; it is flaky and can hide a 24h hardcode.

## Verification

- `npm run build -w @dental/api`: passed.
- `npm run smoke:telegram-bot`: passed.
- `npm run smoke:telegram-control-ui-source`: passed.
- `npm run smoke:db-runtime-contract`: passed.
- `npm run smoke:telegram-outbox-sla-source`: passed.
- `npm run smoke:onboarding-configuration-source`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run build -w @dental/web`: passed, Vite reported existing large chunk warning.

## Slice: Telegram care topics completeness

- [x] Removed the dead gap between configurable post-visit topics and patient-visible bot actions.
  - Implementation: Telegram care menu now exposes extraction, implantation, filling, endodontics, surgery, anesthesia, hygiene, prosthetics, orthodontics and periodontology as Russian inline buttons.
  - Rejected alternative: leave extra topics only in settings; that makes clinic protocol configuration invisible to patients.
- [x] Added doctor handoff tasks for the expanded care topics.
  - Implementation: new stable workflow codes and request handlers create/reuse doctor tasks for endo, surgery, anesthesia, prosthetics, orthodontics and periodontology.
  - Rejected alternative: route all topics through one generic "other" task; it loses clinical routing and document defaults.
- [x] Connected web document preparation to the new Telegram workflow codes.
  - Implementation: communication tasks opened from the web preselect the matching `post_visit_recommendations` care topic.
  - Rejected alternative: manual doctor selection every time; it is slower and easy to misclassify.
- [x] Updated tests and docs in `dental-crm`, not Hecton8.
  - Implementation: Telegram bot smoke now covers all new callbacks and wider webhook event audit windows.
  - Rejected alternative: source-only assertion; runtime webhook behavior must be proven.

## Verification: Telegram care topics completeness

- `npm run build -w @dental/api`: passed.
- `npm run smoke:telegram-bot`: passed, 49 processed webhook scenarios.
- `npm run smoke:telegram-control-ui-source`: passed.
- `npm run smoke:document-payload-ui-source`: passed.
- `npm run smoke:russian-fallback-source`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/web`: passed.

## Slice: Telegram billing document request

- [x] Added a financial document route to the patient document menu.
  - Implementation: `dente:billing` opens "Оплата и чеки" with a safe `billing` portal handoff.
  - Rejected alternative: keep financial requests hidden under tax; checks and invoices are not always tax-deduction requests.
- [x] Added server-owned administrator workflow for billing documents.
  - Implementation: `telegram_billing_document_request` creates/reuses an administrator task for invoice, receipt, act, installment and refund/correction documents.
  - Rejected alternative: send payment details in Telegram; billing documents still belong in protected DENTE portal.
- [x] Connected web document preparation to billing workflow.
  - Implementation: billing Telegram tasks preselect `payment_invoice`, `payment_receipt`, `completed_works_act`, `installment_payment_schedule` and `payment_refund_correction_request`.
  - Rejected alternative: manual document-kind selection for every payment request.

## Verification: Telegram billing document request

- `npm run build -w @dental/api`: passed.
- `npm run smoke:telegram-bot`: passed, 51 processed webhook scenarios.
- `npm run smoke:telegram-control-ui-source`: passed.
- `npm run smoke:document-payload-ui-source`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/web`: passed.

## Slice: First-run Telegram completeness and payment inline actions

- [x] Removed hidden first-run Telegram visual-card settings.
  - Implementation: first-run onboarding now exposes every scenario image slot: main menu, appointment, documents, tax, billing, care, review and staff.
  - Rejected alternative: leave tax/billing/staff only in the full settings tab; the first clinic setup must not hide core patient/staff communication assets.
- [x] Removed the four-topic limit from first-run post-visit checkup settings.
  - Implementation: onboarding now shows all configured care checkup delays, including endodontics, surgery, anesthesia, prosthetics, orthodontics and periodontology.
  - Rejected alternative: keep the compact four-field block; it makes the expanded bot care menu inconsistent with clinic protocol setup.
- [x] Added missing high-value Telegram toggles to first-run quick scenarios.
  - Implementation: payment reminders, recall reminders, callback requests and staff digest are visible as Russian checkbox actions during onboarding.
  - Rejected alternative: make clinics discover them later in full settings; first launch is when communication policy is defined.
- [x] Made payment reminders button-first.
  - Implementation: `payment_reminder_notice` now includes `Оплата и чеки` and `Документы` inline callback buttons in addition to the safe billing portal handoff.
  - Rejected alternative: portal URL only; patients should not need slash commands or guess the document menu.

## Verification: First-run Telegram completeness and payment inline actions

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

## Slice: Staff-safe Telegram digest, schedule truth, and document payload hardening

- [x] Made staff daily digest real and scoped.
  - Implementation: staff digest preview/outbox accepts `staffId`, filters appointments/tasks by server-side staff role, uses only counters, and supports `visualCardUrls.staff`.
  - Rejected alternative: send a clinic-wide digest to every linked staff chat; that leaks unrelated workload and does not scale to multi-clinic roles.
- [x] Kept patient/staff Telegram links independent.
  - Implementation: patient relink revokes older patient chat links for the same subject while preserving active staff chat links.
  - Rejected alternative: global one-active-chat assertion; it breaks the clinic model where patient and staff bots coexist.
- [x] Fixed schedule visibility and conflict semantics.
  - Implementation: patient overlap is now a hard appointment resource conflict, stale ended appointments are hidden from linked schedule replies, and gap suggestions require the same real resource.
  - Rejected alternative: global gaps and old appointment display; both create false availability.
- [x] Hardened financial document dates and legal-profile gating.
  - Implementation: invoice, receipt, installment, act and estimate dates reject impossible/non-date values; sparse legal profile still allows internal workflow drafts but blocks payment/tax/legal forms.
  - Rejected alternative: accept free text dates; it lets invalid fiscal paperwork reach issue flow.
- [x] Removed silent Telegram photo caption truncation.
  - Implementation: long visual-card messages split into image-with-short-caption plus full follow-up message carrying inline actions.
  - Rejected alternative: `slice(0, 1024)` in transport; it loses legal/operator text without warning.

## Verification: Staff-safe Telegram digest, schedule truth, and document payload hardening

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
## Slice: Tax intake before receipts and Telegram staff/contact UX

- [x] Allowed tax application intake before fiscal receipt reconciliation.
  - Implementation: `tax_deduction_application` accepts an empty selected-payment list and renders a pending receipt note.
  - Rejected alternative: block request creation until administrator selects receipts; that turns an intake request into a final certificate flow.
- [x] Kept final tax documents under explicit fiscal scope.
  - Implementation: certificates, legacy certificates and registries still require selected paid fiscal receipts; non-empty application receipt selections must match exactly.
  - Rejected alternative: auto-include every paid tax-year receipt in the application.
- [x] Removed internal payment ids from tax application rendering.
  - Implementation: selected receipts render as receipt/date/amount labels, and empty applications render administrative pending text.
  - Rejected alternative: show UUIDs because they are convenient for debugging; they are not patient-facing document data.
- [x] Fixed Telegram persistent-state cold start.
  - Implementation: post-visit checkup delay defaults are initialized before persisted state hydration.
  - Rejected alternative: rely on normal fresh-start order; persisted-state smoke proved it breaks.
- [x] Prevented stale Telegram QR cards.
  - Implementation: generated code/deep-link/QR state clears on subject, patient, staff, mode or bot-config changes.
  - Rejected alternative: clear only on subject dropdown changes; patient navigation and bot config edits remained unsafe.
- [x] Made Telegram staff actions button-first and staff-scoped.
  - Implementation: staff linked schedule/digest replies use staff-safe schedule/contact/main-menu keyboard; linked `/start` returns a linked patient/staff menu.
  - Rejected alternative: fall back to patient linked keyboard for staff chats.
- [x] Routed contact-labeled buttons to contact handoff.
  - Implementation: contact buttons in reminders, documents, care, tax/payment and staff digest use `dente:contact`.
  - Rejected alternative: keep `dente:clinic`, which only explains QR linking.
- [x] Added staff digest preview and scoped Telegram preview runtime.
  - Implementation: web preview sends `staffId` for `staff_daily_digest` and appends selected clinic-owned bot scope; API renders preview with scoped settings.
  - Rejected alternative: global preview only; clinic-owned bots need accurate visual/card settings before send.

## Verification: Tax intake before receipts and Telegram staff/contact UX

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

## Slice: Refund source payment scope and clinic-scoped saved selections

- [x] Made refund/correction payloads explicit about source payments.
  - Implementation: `paymentRefundCorrection.selectedPaymentIds` is now required, duplicate-checked, and used by API paid-amount calculation plus render/issue guards.
  - Rejected alternative: keep visit-wide paid amount as the refund ceiling; a visit can contain unrelated receipts and overstate the refundable scope.
- [x] Added source-payment selection to the browser form.
  - Implementation: the refund/correction editor now forces an eligible paid fiscal receipt selection and pre-fills amount, payer and original receipt from the selected payment.
  - Rejected alternative: keep manual receipt typing only; it creates mismatches between payload and ledger.
- [x] Scoped saved tax/payment receipt selections by clinic organization id.
  - Implementation: local selection keys now include organization id before patient/year/visit scope.
  - Rejected alternative: patient-only local keys; they leak selection state between clinic contexts in the same browser.
- [x] Extended regression coverage.
  - Implementation: guard/source smokes check selected source payment requirements, other-visit rejection, selected paid-amount scope, refund UI source selection and clinic-scoped keys.

## Verification: Refund source payment scope and clinic-scoped saved selections

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

## Slice: Clinic-scoped local document drafts and issue defaults

- [x] Scoped reusable document issue signature defaults by clinic organization.
  - Implementation: browser issue-signature local fallback now uses `documentIssueSignatureLocalKey(organizationId)`, hydrates scoped data only after UI preferences and clinic profile are loaded, and falls back to the legacy key only for migration.
  - Rejected alternative: keep one browser-wide signature default; that leaks operator defaults between clinic contexts.
- [x] Scoped outpatient 025/u local draft keys by clinic organization.
  - Implementation: `documentPayloadDraftKey` now requires `organizationId` before patient and visit ids.
  - Rejected alternative: rely on patient UUID uniqueness only; local browser state should still carry clinic scope.
- [x] Removed raw DOM casting for document issue signature mode.
  - Implementation: signature mode select now uses `normalizedDocumentIssueSignatureMode(event.target.value)`.
  - Rejected alternative: trust the select value cast because current options are controlled; source-level contracts should block unsafe changes later.

## Verification: Clinic-scoped local document drafts and issue defaults

- `npm run smoke:document-payload-ui-source`: passed.
- `npm run smoke:ui-preferences`: passed.
- `npm run typecheck -w @dental/web`: passed after nullable dashboard fix.
- `npm run smoke:settings-preferences`: passed.
- `npm run smoke:settings-persistence-file`: passed.

## Slice: Telegram control select normalization

- [x] Removed raw DOM casts from Telegram bot controls.
  - Implementation: bot mode, privacy mode, QR subject, outbox status filter and outbox template filter now pass through normalizers before entering state/preferences.
  - Rejected alternative: trust `<select>` options because the visible UI is controlled; persisted clinic bot settings should defend against invalid browser/plugin values.
- [x] Extended Telegram and preferences smokes.
  - Implementation: smokes require the normalizer helpers and fail if raw `event.target.value as ...` Telegram setters return.

## Verification: Telegram control select normalization

- `npm run smoke:telegram-control-ui-source`: passed.
- `npm run smoke:ui-preferences`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:document-legal-confirmations`: passed.
- `npm run smoke:document-payloads`: passed.

## Slice: Clinic-scoped first-run onboarding fallback

- [x] Scoped onboarding local dismissal fallback by clinic organization.
  - Implementation: `onboardingLocalKey(organizationId)` stores fallback completion/reopen state per clinic after profile load.
  - Rejected alternative: keep one browser-wide `dental-crm:onboarding:v1` fallback; it can hide setup for a new clinic on a shared workstation.
- [x] Rehydrated scoped onboarding fallback after dashboard/profile load.
  - Implementation: `onboardingDismissalHydratedOrganizationIdRef` prevents repeated hydration and applies newer scoped fallback only after UI preferences are hydrated.
  - Rejected alternative: apply fallback before `organizationId` is known; that cannot distinguish clinics.
- [x] Extended first-run and preferences smokes.
  - Implementation: onboarding/source smokes now require scoped fallback wiring and organization-aware dismiss/draft-mode saves.

## Verification: Clinic-scoped first-run onboarding fallback

- `npm run smoke:onboarding-configuration-source`: passed after updating two stale source markers to the new multi-line organization-scoped call.
- `npm run smoke:ui-preferences`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:settings-preferences`: passed.
- `npm run smoke:settings-persistence-file`: passed.

## Slice: Workflow select normalization for schedule, documents, and rules

- [x] Removed raw DOM enum casts from schedule and document workflow selects.
  - Implementation: appointment status/filter, document kind, intake pregnancy/lactation, tax application relationship/form/delivery, procedure consent type, treatment acceptance variant, post-visit care topic, X-ray fields, 025/u demographic codes, release channels, refund action/method and void reason now use explicit normalizers.
  - Rejected alternative: rely on JSX option lists and TypeScript casts; persisted and signed workflow state must defend against invalid browser/plugin values.
- [x] Removed raw DOM enum casts from clinical-rule editor selects.
  - Implementation: rule action, severity, owner role, specialty and category now normalize before state update.
  - Rejected alternative: leave Settings-only casts; rule state changes affect clinical warnings and should not accept impossible enum values.
- [x] Extended smoke contracts.
  - Implementation: UI preference, document payload UI and schedule smokes require normalizers and reject the old raw cast patterns.

## Verification: Workflow select normalization for schedule, documents, and rules

- `npm run smoke:ui-preferences`: passed.
- `npm run smoke:document-payload-ui-source`: passed.
- `npm run smoke:schedule-configuration`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:document-payloads`: passed.
- `npm run smoke:settings-preferences`: passed.
- `npm run smoke:document-legal-confirmations`: passed.

## Slice: Configurable Telegram review request delay

- [x] Removed the hardcoded two-hour review request delay.
  - Implementation: `reviewRequestDelayHours` is now part of shared Telegram settings and API scheduling uses the normalized clinic value for visit/payment review outbox items.
  - Rejected alternative: keep a fixed 2h delay; clinics need different review timing after treatment and payment closure.
- [x] Made the setting persistent and tenant-ready.
  - Implementation: settings save/load, persisted runtime state, DB schema and migration `0023_telegram_review_request_delay.sql` carry `review_request_delay_hours`.
  - Rejected alternative: browser-only preference; outbound queue behavior must be server-owned.
- [x] Exposed the control in first-run onboarding and full Telegram settings.
  - Implementation: Russian numeric field `Просьба оценить клинику, часы после визита` normalizes to 1-720h and autosaves through the existing settings path.
  - Rejected alternative: hide it in env JSON only; clinic operators must adjust it without deployment edits.
- [x] Added clinic-owned bot override and smoke coverage.
  - Implementation: `DENTE_TELEGRAM_CLINIC_BOTS_JSON` records may include `reviewRequestDelayHours`, and smokes assert persistence plus exact scheduled time.

## Verification: Configurable Telegram review request delay

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

## Slice: Russian price-list result labels and QR download copy

- [x] Removed raw analyzer enum/string labels from the price-list result UI.
  - Implementation: added display-only helpers for material kinds, restoration types and known crown-type strings, then routed summary cards and row details through those helpers.
  - Rejected alternative: rewrite analyzer DTO values into Russian text; stable semantic codes are needed for API contracts, tests and future catalog mapping.
- [x] Replaced visible `QR SVG` operator text with Russian QR copy.
  - Implementation: the generated QR download button now says `Скачать QR`, and the action state says `QR-код скачан`.
  - Rejected alternative: keep `SVG` in the button; reception staff need action text, not file-format vocabulary.
- [x] Extended regression coverage.
  - Implementation: `smoke:pricelist-analyzer` now fails if raw price-list material/restoration/crown arrays return to JSX or visible `QR SVG` text leaks back.

## Verification: Russian price-list result labels and QR download copy

- `npm run smoke:pricelist-analyzer`: passed.
- `npm run typecheck -w @dental/web`: passed.

## Slice: Clinic-scoped local imaging recovery

- [x] Scoped browser-local imaging recovery by clinic organization.
  - Implementation: DICOM workbench recovery, local imaging folder recovery, browser-picked CT folder summary and per-study viewer draft keys now use `organizationScopedLocalStorageKey` / organization-prefixed viewer keys.
  - Rejected alternative: keep one browser-wide CT folder/workbench key; shared workstations can serve multiple clinics and must not inherit the previous clinic's local imaging context.
- [x] Kept legacy local recovery as migration fallback.
  - Implementation: scoped loads fall back to the old unscoped key when an organization-scoped record is absent; scoped removes also clear the legacy key so an operator clear action really clears recovery.
  - Rejected alternative: hard-cut old keys; that would discard useful local workbench recovery on upgrade.
- [x] Rehydrated imaging recovery after organization is known.
  - Implementation: `localImagingRecoveryHydratedOrganizationIdRef` reloads scoped local folder/browser-picked state after dashboard profile load; DICOM workbench and viewer drafts also pass `activeOrganizationId`.
  - Rejected alternative: load only before dashboard; at that moment the tenant boundary is unknown.
- [x] Extended smoke coverage.
  - Implementation: `smoke:ui-preferences` now checks scoped imaging recovery wiring, and the browser-file input smoke reads organization-scoped browser-picked storage keys.

## Verification: Clinic-scoped local imaging recovery

- `npm run smoke:ui-preferences`: passed.
- `npm run typecheck -w @dental/web`: passed.

## Slice: Dashboard-scoped saved selection reconciliation

- [x] Reconciled saved patient/staff/chair ids against the active clinic dashboard.
  - Implementation: `reconcileDashboardScopedUiSelections` clears or replaces stale selected patient, schedule filters, appointment defaults and Telegram staff QR target after dashboard load.
  - Rejected alternative: rely on UUID schema validation only; a UUID can be valid and still belong to another clinic or removed staff/chair record.
- [x] Kept useful fallbacks instead of blanking the UI.
  - Implementation: stale selected patient falls back to the first active patient; invalid staff/chair filters/defaults clear so existing schedule/default selection logic can pick current active records.
  - Rejected alternative: wipe all preferences on organization change; that would discard safe choices such as language, document kind and Telegram filters.
- [x] Extended source smoke coverage.
  - Implementation: `smoke:ui-preferences` now requires the dashboard-scoped reconciliation function and the stale-id guards.

## Verification: Dashboard-scoped saved selection reconciliation

- `npm run smoke:ui-preferences`: passed.
- `npm run typecheck -w @dental/web`: passed.

## Slice: Document catalog coverage and FNS source anchor drift

- [x] Closed the missing form in the public document catalog.
  - Implementation: `personal_data_processing_consent` is now listed in the form catalog, structured-payload rules, UI validation notes and README structured payload summary.
  - Rejected alternative: leave it covered only by renderer/payload tests; operators need the same real form list in docs.
- [x] Made catalog documentation coverage executable.
  - Implementation: `smoke:documents-catalog` now maps every exported `DocumentKind` to a required fragment in `docs/12-document-generation-forms.md`.
  - Rejected alternative: count rendered forms only; a form can render and still be absent from the operator-facing catalog.
- [x] Removed stale FNS source anchors.
  - Implementation: document docs and `smoke:official-document-sources` now use the canonical FNS medical deduction page and regional filling-note page, and reject old `soc_nv_pm` / `imns39_08` paths.
  - Rejected alternative: update text without a smoke guard; source drift would return quietly.
- [x] Split FNS source check dates from broader medical/legal metadata.
  - Implementation: FNS tax document metadata uses `2026-05-25`; non-FNS document metadata remains at the prior checked date until its official sources are rechecked.
  - Rejected alternative: bump every source date to 2026-05-25 without re-verifying all non-FNS documents.

## Verification: Document catalog coverage and FNS source anchor drift

- `npm run build -w @dental/shared`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:official-document-sources`: passed.
- `npm run smoke:documents-catalog`: passed, 31 rendered forms.
- `npm run smoke:document-payloads`: passed.

## Slice: Protocol selection reconciliation

- [x] Reconciled saved protocol template id against the active clinic dashboard.
  - Implementation: `reconcileDashboardScopedUiSelections` now builds a current protocol id set from `dashboard.protocolTemplates` and clears stale `selectedProtocolId`.
  - Rejected alternative: rely only on the specialty-specific render fallback; that clears the display later, but leaves the saved preference reconciliation incomplete.
- [x] Wired the reconciliation effect to react to protocol preference changes.
  - Implementation: `selectedProtocolId` is now in the dashboard-scoped reconciliation effect dependencies.
  - Rejected alternative: wait for the specialty template effect; that path cannot prove the id belongs to the current dashboard template set.
- [x] Extended preference smoke coverage.
  - Implementation: `smoke:ui-preferences` now requires the protocol id set and stale protocol guard in the reconciliation function.

## Verification: Protocol selection reconciliation

- `npm run smoke:ui-preferences`: passed.
- `npm run smoke:settings-preferences`: passed.
- `npm run typecheck -w @dental/web`: passed.

## Slice: Clinic-scoped local visit draft recovery

- [x] Scoped local visit draft recovery by clinic organization.
  - Implementation: `visitLocalDraftKey` now accepts organization id and uses `organizationScopedLocalStorageKey`.
  - Rejected alternative: rely on visit UUID uniqueness only; demo/sample/shared-workstation contexts can still make browser-wide recovery misleading.
- [x] Preserved upgrade recovery.
  - Implementation: scoped draft load falls back to the previous unscoped key when the organization-scoped key is absent.
  - Rejected alternative: hard-cut old local visit drafts; that would discard useful unsynced text during upgrade.
- [x] Wired active dashboard organization into visit draft load/save.
  - Implementation: restore and autosave paths pass `activeOrganizationId`, and React effects depend on it.
  - Rejected alternative: derive organization inside storage helpers from global state; helpers stay pure and explicit.
- [x] Extended source smoke coverage.
  - Implementation: `smoke:ui-preferences` now requires scoped local visit draft keying and scoped load/save call sites.

## Verification: Clinic-scoped local visit draft recovery

- `npm run smoke:ui-preferences`: passed.
- `npm run typecheck -w @dental/web`: passed.

## Slice: Active-visit guard for pending STT queue

- [x] Prevented queued STT chunks from appending to the wrong open visit.
  - Implementation: `applySpeechTranscription` now checks `result.chunk.visitId` against `dashboard.activeVisit.id` before mutating the current transcript.
  - Rejected alternative: trust that pending queue flushes only the current visit; offline queues can outlive a visit or clinic switch.
- [x] Prevented foreign recordings from triggering current-visit assembly.
  - Implementation: `flushPendingSpeechChunks` only adds a recording id to active assembly when the transcription result matches the active visit.
  - Rejected alternative: assemble every flushed recording with current query params; that wastes requests and risks confusing recovery state.
- [x] Added a dedicated source smoke.
  - Implementation: `smoke:speech-queue-source` checks the active-visit guard order, rejects unconditional recording assembly, and requires the STT plan to document the ownership rule.

## Verification: Active-visit guard for pending STT queue

- `npm run smoke:russian-fallback-source`: passed.
- `npm run smoke:speech-queue-source`: passed after code and STT plan documentation guard.
- `npm run typecheck -w @dental/web`: passed after code and STT plan documentation guard.

## Verification sweep: document forms after persistence/STT work

- `npm run smoke:document-payload-ui-source`: passed.
- `npm run smoke:document-payloads`: passed.

## Slice: Telegram public settings normalization for first-run clinic setup

- [x] Blocked unsafe Telegram public URLs in the web settings form before API save.
  - Implementation: `saveTelegramSettings` now normalizes webhook, patient portal, welcome image, visual cards, review and maps URLs through a client-side HTTPS/public-link guard.
  - Rejected alternative: rely only on API rejection; first-run setup should show the operator the exact bad field before a failed save round trip.
- [x] Blocked invalid bot usernames in the web settings form before API save.
  - Implementation: shared DENTE bot and clinic-owned bot usernames now use `normalizeTelegramBotUsernameDraft` before `PUT /api/settings/telegram`.
  - Rejected alternative: send raw `trim().replace(/^@/, "")` and let Zod fail; that produces a weaker first-run UX for doctors/admins configuring `@dentecrm_bot` or a clinic-owned bot.
- [x] Sanitized clinic-owned bot JSON runtime URLs.
  - Implementation: `DENTE_TELEGRAM_CLINIC_BOTS_JSON` URL fields now pass through `safeDenteTelegramPublicHttpsUrl` before runtime settings merge.
  - Rejected alternative: depend on later send/render helpers to ignore unsafe URLs; runtime status and scoped bot config should not carry patient-identifying links.
- [x] Extended smoke coverage.
  - Implementation: `smoke:telegram-url-ui-source` checks client username/URL normalization and rejects raw payload drafts; `smoke:telegram-control-ui-source` rejects raw env URL bypasses.

## Verification: Telegram public settings normalization for first-run clinic setup

- `npm run smoke:telegram-url-ui-source`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:telegram-control-ui-source`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:telegram-bot`: passed, 52 webhook scenarios.
- `npm run smoke:onboarding-configuration-source`: passed.
- `npm run smoke:russian-fallback-source`: passed.
- `npm run smoke:ui-preferences`: passed.
