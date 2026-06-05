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

## Slice: CT ZIP, preview, surface, offline, and local-operation hardening

- [x] Removed the false regular-ZIP total-size blocker from the DICOM metadata path.
  - Implementation: regular ZIP workup now relies on bounded central-directory and entry-prefix reads instead of rejecting large but valid archive offsets.
  - Rejected alternative: keep the coarse archive-size gate; it blocks usable clinic exports before metadata can be inspected.
- [x] Made ZIP-contained CT entries honest for browser MPR.
  - Implementation: virtual `archive.zip::slice.dcm` entries remain metadata/external-only until a local pixel bridge exists.
  - Rejected alternative: pretend browser-local MPR can open virtual archive entries without a real random-access pixel source.
- [x] Repaired the deflated ZIP entry hot path.
  - Implementation: DICOM metadata prefixes from deflated ZIP entries stream through a bounded inflater and stop after the header budget.
  - Rejected alternative: inflate the full compressed entry and slice the output afterward.
- [x] Repaired first-frame preview memory behavior.
  - Implementation: preview reads a bounded DICOM header prefix, locates PixelData, then reads only the first-frame range under a pixel cap.
  - Rejected alternative: `readFileSync(filePath)` for every preview candidate.
- [x] Added explicit CT surface-model metadata boundaries.
  - Implementation: skull/mandible/maxilla/CT bone surface candidates carry a no-mesh manifest with role, format, local-bridge readiness, pairing hint, warnings, and `containsMeshGeometry=false`.
  - Rejected alternative: load STL/PLY/3MF meshes into the CRM shell or claim CRM-generated skull models.
- [x] Added explicit implant/CAD boundary.
  - Implementation: CT implant modeling/export now marks the browser bundle as planning parameters only; CAD/STL generation belongs to the lab/local bridge.
  - Rejected alternative: let route/guide metadata imply a generated surgical-guide mesh.
- [x] Added server-local CT operation cancellation in the UI path.
  - Implementation: Settings has a stop control for API-local DICOM discovery/organizer/workup/preview operations and threads `AbortSignal` through those calls.
  - Rejected alternative: cancel browser-local scans only while API-local scans keep running stale work.
- [x] Fixed IndexedDB CT/MPR draft migration durability.
  - Implementation: offline DB version moved to v4, required stores are asserted, version changes close old connections, and blocked/error opens reset the cached promise.
  - Rejected alternative: rely on same-version `onupgradeneeded` and fall back silently to `localStorage`.
- [x] Made CT runtime classification explicit.
  - Implementation: browser client facts now report runtime surface, desktop bridge support, directory-picker support, and directory-handle persistence; API only unlocks `desktop_app` when the bridge is explicit.
  - Rejected alternative: promote Electron/Tauri-looking user-agent text into the desktop CT lane.
- [x] Bounded browser CT picker work before file reads.
  - Implementation: file-input scans iterate `FileList` by index up to the cap, and directory scans cap inspected entries per folder.
  - Rejected alternative: `Array.from(fileList)` and unbounded per-directory enumeration before applying CT scan limits.
- [x] Made render-cache worker planning honest.
  - Implementation: no-worker clients now get `workerCount=0`, decode concurrency 1, main-thread stages, and a reduced-background-preparation warning.
  - Rejected alternative: report two or three workers from quality mode when Web Workers are unavailable.
- [x] Bounded server-side folder traversal before CT/DICOM preview work.
  - Implementation: generic imaging and DICOM collectors now use `opendir`, head-index queues, folder caps, and per-folder entry caps.
  - Rejected alternative: keep `readdir(...).sort(...)` plus `queue.shift()` and apply only file-count caps after directory materialization.

## Verification: CT ZIP, preview, surface, offline, and local-operation hardening

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
- `npm run build -w @dental/web`: passed, existing Vite large `workspace` chunk warning only; gzip size was not used as a gate.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:browser-imaging-scan-progress-source`: passed after bounded `FileList` and per-directory cap guard.
- `npm run smoke:api-dicom-scan-abort-yield-source`: passed after bounded server traversal guard.
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

## Slice: CT OPG and cross-section reconstruction plan

- [x] Identified relevant mandates before coding.
  - Implementation: used OPT_Zero_GC, OPT_Performance_Budgets, UI_Data_Streaming, UI_Localization and QA_Evidence as the working constraints for the Dental CRM web slice.
  - DOD practice: source read plus explicit evidence class; no runtime diagnostic claim.
  - Rejected alternative: start by building fake CT pixels in the CRM shell.
  - Microsecond estimate: 0 measured; static planning only, no profiler artifact.
- [x] Added a cold OPG/cross-section reconstruction planner.
  - Implementation: `ctPlanningReconstruction.ts` calculates panoramic curve length, continuous workstation quality weight, cross-section spacing, slab width and capped cross-section count from structured annotations and render plan.
  - DOD practice: pure deterministic helper with typed shared DICOM contracts.
  - Rejected alternative: fixed low/high quality switch or unbounded derived slice count.
  - Microsecond estimate: 0 measured; cold React memo path only.
- [x] Integrated the reconstruction plan into CT snapshot, export and UI.
  - Implementation: `ctPlanningState` exposes `reconstructionPlan`; export packet names missing OPG/cross-section plan; `CtPlanningReconstructionPanel` renders doctor-readable cards.
  - DOD practice: no duplicate local state owner; one snapshot route feeds UI and handoff.
  - Rejected alternative: count any OPG curve as handoff-ready without cross-section plan.
  - Microsecond estimate: 0 measured; main CT tools chunk held under 18 KB.
- [x] Preserved chunk boundaries and source contracts.
  - Implementation: Vite and bundle-budget smokes now split/check `ct-planning-reconstruction` and `ct-planning-reconstruction-panel`; imaging source smoke checks quality weight, cap and non-pixel wording.
  - DOD practice: executable source guard plus bundle budget.
  - Rejected alternative: raise the `ct-planning-tools` budget.
  - Microsecond estimate: 0 measured; static payload budget evidence only.
- [x] Updated CT viewer documentation and verification record.
  - Implementation: `docs/10-imaging-dicom-viewer-plan.md` states that the new planner is a route/quality plan, not a pixel export or certified viewer replacement.
  - DOD practice: docs aligned to capability boundary.
  - Rejected alternative: advertise full diagnostic CT rendering from structural planning data.
  - Microsecond estimate: 0 measured; no runtime claim.

## Verification: CT OPG and cross-section reconstruction plan

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain.
- Process check: no DENTE build/test process left behind.

## Slice: CT export and implant-fit visible wording

- [x] Removed visible English `handoff` jargon from CT canal/template export fact.
  - Implementation: `ctPlanningExport` now says `?????? ????? ? ????????.` while internal handoff ids and packet fields remain machine metadata.
  - DOD practice: user-facing CT plan facts must be clinical Russian; adapter contracts stay typed and stable.
  - Rejected alternative: rename internal `handoffSummary`, `lab-handoff`, and bridge chunk ids; that would churn non-visible API/adapter contracts without improving the UI.
  - Microsecond estimate: 0 measured; one string replacement only.
- [x] Removed visible `fallback shortest/longest` wording from implant-fit reasons.
  - Implementation: candidate reasons now say `????????? ???????`; warning copy now says `????????????? ????????/??????? ???????`.
  - DOD practice: implant library evidence stays explainable without exposing implementation terms to the doctor.
  - Rejected alternative: rename typed `widthSource: "fallback"` / `heightSource: "fallback"` values; those are internal state values and are not the visible defect.
  - Microsecond estimate: 0 measured; render text only.
- [x] Added source-smoke regression guards and updated CT viewer plan docs.
  - Implementation: smoke requires the new Russian strings and forbids the old visible English/jargon strings.
  - DOD practice: copy regressions in CT planning are blocked at source level.
  - Rejected alternative: rely on manual QA after every CT iteration.
  - Microsecond estimate: 0 measured.

## Verification: CT export and implant-fit visible wording

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-export` is 7,810 bytes / 2,829 gzip, `ct-planning-implant-fit` is 4,967 bytes / 2,008 gzip, aggregate JS gzip is 428,979 / 430,000, and total gzip is 456,878 / 480,000.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain in large web files and DENTE logs.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT contour/artifact visible wording hardening

- [x] Reworded CT artifact authoring board as clinical markups.
  - Implementation: `CtPlanningArtifactPanel` now shows `???????? ?????`, guides unfinished drafts through `????? ??-??????`, and removes visible artifact/viewer wording from the summary.
  - DOD practice: visible clinician copy is separate from internal `CtPlanningArtifact*` contracts.
  - Rejected alternative: rename internal artifact command types; rejected because they are typed machine contracts and already drive smoke-protected routes.
  - Microsecond estimate: 0 measured; render strings only.
- [x] Replaced raw blocked status labels in CT artifact/scenario UI.
  - Implementation: artifact command cards render `????? ????????`; active scenario chips/details render `??????? ????????`.
  - DOD practice: status ids remain `ready/draft/blocked`, visible state uses operator-readable Russian labels.
  - Rejected alternative: expose `?????????????` because it is exact; rejected because it reads as a system state, not a clinical next step.
  - Microsecond estimate: 0 measured.
- [x] Replaced visible ROI titles with contour wording across CT planning.
  - Implementation: catalog, measurement plan, geometry warnings, task labels, validation, export facts, and artifact commands now use `?????? ???????`, `?????? ??????`, and contour-volume copy while retaining `area_roi`/`volume_roi` ids.
  - DOD practice: machine route ids stay stable; doctor-facing text stops leaking acronym-heavy implementation labels.
  - Rejected alternative: rename shared ROI ids; rejected because it would break DICOM/tool-state contracts for no user-visible gain.
  - Microsecond estimate: 0 measured.
- [x] Added source-smoke guards for the wording boundary.
  - Implementation: `smoke-imaging-viewer-usability-source.mjs` now requires contour/markup labels and forbids the old artifact, viewer, blocked, and raw ROI copy in the relevant CT source files.
  - DOD practice: the text boundary is enforced by CI-style source smoke, not memory.
  - Rejected alternative: document-only convention; rejected because previous passes already proved visible text regressions recur without guards.
  - Microsecond estimate: 0 measured.
- [x] Updated the CT viewer plan with the contour/contract boundary.
  - Implementation: `docs/10-imaging-dicom-viewer-plan.md` now states that visible CT cards use contour wording while internal ROI ids remain portable viewer metadata.
  - DOD practice: stable docs describe the user-facing boundary and the machine-contract exception.
  - Rejected alternative: skip docs because code is self-evident; rejected because CT module boundaries are multi-agent work.
  - Microsecond estimate: 0 measured.

## Verification: CT contour/artifact visible wording hardening

- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; aggregate JS gzip is 428,879 / 430,000 and total gzip is 456,778 / 480,000.
- Key chunks: `ct-planning-artifact-commands` 5,621 bytes / 1,921 gzip; `ct-planning-artifact-panel` 1,498 bytes / 749 gzip; `ct-planning-measurement-plan` 7,850 bytes / 3,096 gzip; `ct-planning-catalog` 9,474 bytes / 2,735 gzip; `ct-planning-export-scenario-summary` 4,964 bytes / 1,885 gzip.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain in large web files and DENTE logs.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT continuation 2026-06-01 clinical wording pass

- [x] Implant-fit cards no longer render raw `ready/draft/blocked` ids.
  - Implementation: `CtPlanningImplantFitPanel` maps statuses through `fitStatusLabel`.
  - DOD practice: typed ids remain internal; card labels are Russian clinical copy.
  - Rejected alternative: localize enum values inside state/export payloads.
  - Microsecond estimate: 0 measured.
- [x] Measurement, ???? reconstruction, station coverage, and workflow warnings no longer expose raw `viewer` / `hard gate` fragments.
  - Implementation: measurement uses viewing-unit wording, clinical axis/canal check copy, and `???????????`; reconstruction uses `??????????? ??`; workflow says `????? ????? ?????????`.
  - DOD practice: clinical guidance is readable while adapter fields remain typed metadata.
  - Rejected alternative: remove warnings instead of fixing wording.
  - Microsecond estimate: 0 measured.
- [x] Viewer bridge labels no longer show `???? ?????????`.
  - Implementation: restore manifest labels now say `????? ?????????`; launch blocker says `?? ??????? ????? ??????????????`.
  - DOD practice: workflow/handoff cards show operator copy while `data-viewer-*` metadata stays machine-readable.
  - Rejected alternative: rename internal bridge chunks and attributes.
  - Microsecond estimate: 0 measured.
- [x] Source-smoke contracts and CT viewer plan docs were updated for all three passes.
  - Implementation: smoke requires the new Russian labels and forbids the old raw fragments.
  - DOD practice: wording regressions are blocked statically.
  - Rejected alternative: rely on manual UI scan.
  - Microsecond estimate: 0 measured.

## Verification: CT continuation 2026-06-01 clinical wording pass

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; final aggregate JS gzip is 429,089 / 430,000 and total gzip is 456,988 / 480,000.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain in large web files and DENTE logs.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT viewer bridge clinical labels

- [x] Removed visible `???? ?????????` wording from CT scenario bridge status labels.
  - Implementation: `buildCtPlanningViewerBridgeManifest` now returns `????? ?????????: ...` labels for ready, metadata-only, missing-volume, and parse-error states.
  - DOD practice: workflow/handoff cards show operator-readable labels while bridge attributes keep machine metadata.
  - Rejected alternative: rename the internal bridge chunks and `data-viewer-*` attributes; adapter contracts still need stable machine names.
  - Microsecond estimate: 0 measured; label-only change.
- [x] Localized missing-target launch blocker.
  - Implementation: `buildCtPlanningViewerBridgeLaunchGate` now reports `?? ??????? ????? ??????????????: ...` instead of English adapter text.
  - DOD practice: blockers that can surface through audit or handoff metadata must be readable Russian.
  - Rejected alternative: hide missing targets; that would remove an integrator/debug signal.
  - Microsecond estimate: 0 measured.
- [x] Added source-smoke guards and CT viewer plan docs for this boundary.
  - Implementation: smoke requires `????? ?????????` labels and forbids `???? ?????????:` plus `missing viewer apply targets`.
  - DOD practice: visible bridge-jargon regression is blocked statically.
  - Rejected alternative: rely on QA to inspect the focused scenario handoff card.
  - Microsecond estimate: 0 measured.

## Verification: CT viewer bridge clinical labels

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-viewer-restore` is 3,272 bytes / 1,166 gzip, `ct-planning-viewer-bridge-launch` is 882 bytes / 531 gzip, aggregate JS gzip is 429,089 / 430,000, and total gzip is 456,988 / 480,000.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain in large web files and DENTE logs.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT measurement and reconstruction clinical wording

- [x] Removed raw `viewer`/`hard gate` wording from CT measurement readiness.
  - Implementation: density fallback units now render as viewing units, density draft copy says `???????????`, and clearance guidance says `??????????? ????????`.
  - DOD practice: measurement cards explain clinical state without exposing adapter/debug vocabulary.
  - Rejected alternative: rename internal viewer-state contracts; visible measurement copy was the defect.
  - Microsecond estimate: 0 measured; string-only logic.
- [x] Removed raw `viewer/workbench` and `??? ? viewer` copy from ????/cross-section planning.
  - Implementation: reconstruction guidance now uses `??????????? ??` and `??? ? ????????????`.
  - DOD practice: route/station planning remains metadata-only while operator copy stays readable.
  - Rejected alternative: hide the station cap warning; the cap remains clinically relevant for long arcs.
  - Microsecond estimate: 0 measured.
- [x] Removed raw `????? ????? viewer` wording from CT workflow warnings.
  - Implementation: workflow missing-task warning now says `????? ????? ????????? ??? ?? ??????`.
  - DOD practice: workflow board stays clinical while internal `viewerLabel`/bridge fields stay typed metadata.
  - Rejected alternative: delete viewer bridge metadata from the selected scenario focus; adapters still need it.
  - Microsecond estimate: 0 measured.
- [x] Added source-smoke forbids and updated CT viewer plan documentation.
  - Implementation: smoke now requires the new measurement/reconstruction/workflow Russian copy and forbids the old raw fragments.
  - DOD practice: wording regressions are checked by source contracts.
  - Rejected alternative: rely on manual UI scanning.
  - Microsecond estimate: 0 measured.

## Verification: CT measurement and reconstruction clinical wording

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-measurement-plan` is 7,970 bytes / 3,144 gzip, `ct-planning-reconstruction` is 6,777 bytes / 2,863 gzip, `ct-planning-workflow-plan` is 5,381 bytes / 2,151 gzip, aggregate JS gzip is 429,023 / 430,000, and total gzip is 456,922 / 480,000.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain in large web files and DENTE logs.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT implant-fit clinical status labels

- [x] Removed raw candidate status ids from implant-fit cards.
  - Implementation: `CtPlanningImplantFitPanel` maps `ready/draft/blocked` through `fitStatusLabel` before rendering.
  - DOD practice: machine status ids stay typed state; visible CT cards use Russian clinical labels.
  - Rejected alternative: localize the status enum itself, which would mix UI copy into planning state and export contracts.
  - Microsecond estimate: 0 measured; one render branch.
- [x] Removed visible `hard gate` and English `viewer` wording from implant-fit reasons/actions.
  - Implementation: candidate blockers now say `??? ???????? ??? + ?????`; accepted candidates say `?????? ????????; ??????????? ? ????????????`.
  - DOD practice: clinical decision reasons must not expose implementation jargon.
  - Rejected alternative: rename internal bridge/viewer module names; those are not the visible defect.
  - Microsecond estimate: 0 measured; string-only render changes.
- [x] Added source-smoke guards and CT plan documentation for the label boundary.
  - Implementation: smoke requires `fitStatusLabel`, the Russian source label, and the new reason/action strings, while forbidding the old raw JSX/status fragments.
  - DOD practice: copy regressions are blocked at source level.
  - Rejected alternative: rely on visual review after every CT planning iteration.
  - Microsecond estimate: 0 measured.

## Verification: CT implant-fit clinical status labels

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-implant-fit` is 5,012 bytes / 2,017 gzip, `ct-planning-implant-fit-panel` is 1,995 bytes / 865 gzip, aggregate JS gzip is 429,026 / 430,000, and total gzip is 456,925 / 480,000.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain in large web files and DENTE logs.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT workflow Russian labels and active-step accessibility

- [x] Identified the workflow readability gap before coding.
  - Implementation: focused on `ctPlanningWorkflowPlan.ts` and `ctPlanningWorkflowPanel.tsx`, where visible workflow copy leaked internal owner ids and mixed English terms.
  - DOD practice: doctor-facing copy must be readable Russian and active clinical step must be exposed structurally.
  - Rejected alternative: keep `series/doctor/lab` enum values visible because they are convenient implementation ids.
  - Microsecond estimate: 0 measured; no profiler artifact.
- [x] Replaced internal owner ids with Russian role labels.
  - Implementation: workflow panel now maps owner ids through `ownerLabels` before rendering.
  - DOD practice: enum values stay internal; visible UI uses clinical language.
  - Rejected alternative: change the owner enum itself and risk downstream status logic.
  - Microsecond estimate: 0 measured; one constant lookup per phase.
- [x] Removed mixed English workflow copy.
  - Implementation: English pixel-export copy, `safety envelope`, and mixed gate wording were replaced with Russian clinical wording.
  - DOD practice: source smoke forbids those strings from returning.
  - Rejected alternative: leave mixed copy because it is only a workflow board; it is still visible UI.
  - Microsecond estimate: 0 measured; text-only change.
- [x] Added active-step accessibility.
  - Implementation: active workflow phase now renders `aria-current="step"`.
  - DOD practice: the visual active phase has a matching structural signal.
  - Rejected alternative: rely only on color/border state.
  - Microsecond estimate: 0 measured; static attribute only.

## Verification: CT workflow Russian labels and active-step accessibility

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; workflow plan is 4,409 bytes / 1,778 gzip, workflow panel is 1,285 bytes / 630 gzip.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT export release gate and budget regex hardening

- [x] Identified the handoff release gap before coding.
  - Implementation: focused on `ctPlanningExportPanel.tsx`, where packet status existed but there was no explicit "fix / draft / blocked" transfer gate.
  - DOD practice: handoff must expose the first actionable gate without claiming diagnostic CT rendering.
  - Rejected alternative: infer transfer readiness only from summary copy and owner lanes.
  - Microsecond estimate: 0 measured; no profiler artifact.
- [x] Added a release gate to the export panel.
  - Implementation: `buildReleaseGate` derives ready/warning/blocked copy from `packet.status`, first blocked/warning clinical fact, and missing artifacts.
  - DOD practice: status is derived from existing packet facts; no duplicate CT state owner.
  - Rejected alternative: add gate logic to `ctPlanningExport.ts`, which is near the 8,000 byte logic budget.
  - Microsecond estimate: 0 measured; one bounded fact lookup.
- [x] Styled and source-locked the release gate.
  - Implementation: `.ct-planning-export-release` shares existing export card states and is test-tagged as `ct-planning-export-release`.
  - DOD practice: smoke requires the UI, CSS, and test tag.
  - Rejected alternative: unstyled text below the summary; it would be easy to miss in a clinical handoff.
  - Microsecond estimate: 0 measured; static card render.
- [x] Fixed the export bundle budget matcher.
  - Implementation: `smoke-web-bundle-budget.mjs` now uses `^ct-planning-export-(?!panel-)` for the logic chunk, and code-split smoke requires that guard.
  - DOD practice: the budget proof now measures the real export logic chunk, not the smaller panel chunk.
  - Rejected alternative: trust asset ordering from `readdirSync`.
  - Microsecond estimate: 0 measured; CI/source guard only.

## Verification: CT export release gate and budget regex hardening

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-export` is now correctly measured as `ct-planning-export-qBdy6B2F.js` at 7,868 bytes / 2,837 gzip, and `ct-planning-export-panel` is separately measured at 2,762 bytes / 1,029 gzip.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT implant fit decision reasons

- [x] Identified the implant-library explainability gap before coding.
  - Implementation: focused on `ctPlanningImplantFit.ts` and `ctPlanningImplantFitPanel.tsx`, where candidates exposed margins and a score but not the concrete reason for ready/draft/blocked state.
  - DOD practice: implant library remains a screening aid, not an automatic clinical selector.
  - Rejected alternative: rely on the operator to infer blockers from three margin labels.
  - Microsecond estimate: 0 measured; no profiler artifact.
- [x] Added bounded candidate decision reasons.
  - Implementation: `candidateDecisionReasons` returns up to four reasons per implant size: missing CT series, fallback width/height, missing rulers, negative margins, missing canal hard gate, or canal clearance below 2 mm.
  - DOD practice: reasons are derived from existing scalar margins and hard gates.
  - Rejected alternative: add another planner object or analyze raw DICOM pixels in CRM.
  - Microsecond estimate: 0 measured; bounded scalar string list per library candidate.
- [x] Rendered reason chips in the implant fit panel.
  - Implementation: each candidate card renders `candidate.decisionReasons.map` under the margin line.
  - DOD practice: visible explanation is attached to the candidate, not hidden in global warnings.
  - Rejected alternative: only show one global warning strip for all candidate sizes.
  - Microsecond estimate: 0 measured; at most six cards x four chips.
- [x] Locked the behavior with smoke and budget proof.
  - Implementation: source smoke requires `decisionReasons`, `candidateDecisionReasons`, fallback reason copy, panel rendering, and `.ct-planning-implant-fit-reasons`.
  - DOD practice: bundle budget stayed under existing caps.
  - Rejected alternative: raise implant fit budget.
  - Microsecond estimate: 0 measured; final implant fit chunk is 4,905 bytes / 1,997 gzip.

## Verification: CT implant fit decision reasons

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-implant-fit` is 4,905 bytes / 1,997 gzip, panel is 1,888 bytes / 824 gzip.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files remain.
- Process check: two external BrowserOps `node.exe` processes were present under `C:\hades\Tools\BrowserOps\...` for Hecton8 marketing queue; no DENTE build/test process was left behind.

## Slice: CT handoff implant-fit evidence

- [x] Identified the evidence-loss gap before coding.
  - Implementation: `implantFitPlan` was computed beside the export panel, but the handoff UI only received `exportPacket`.
  - DOD practice: transfer surface must carry the implant screening reason, not only the main planning board.
  - Rejected alternative: force implant fit into `ctPlanningExport.ts`, which is already close to the 8,000 byte logic cap.
  - Microsecond estimate: 0 measured; no profiler artifact.
- [x] Passed implant fit evidence into the handoff panel.
  - Implementation: `CtPlanningExportPanel` now accepts `implantFitPlan?: CtPlanningImplantFitPlan`.
  - DOD practice: UI-only handoff evidence stays in the small export panel chunk.
  - Rejected alternative: duplicate implant fit calculation inside the export panel.
  - Microsecond estimate: 0 measured; one prop pass.
- [x] Rendered selected/candidate fit evidence in export.
  - Implementation: `buildImplantFitHandoff` shows selected candidate or first review candidate, score, status tone, and `decisionReasons.join(" · ")`.
  - DOD practice: the export board says why a size is blocked/draft/ready before admin/lab handoff.
  - Rejected alternative: leave the operator to cross-read the implant fit panel.
  - Microsecond estimate: 0 measured; one bounded candidate lookup.
- [x] Preserved budgets.
  - Implementation: export logic chunk stayed unchanged, export panel grew under its 5,000 byte cap, and CT tools stayed under 18,000 bytes.
  - DOD practice: budget proof after production build.
  - Rejected alternative: increase CT tools or export panel limits.
  - Microsecond estimate: 0 measured; static bundle evidence only.

## Verification: CT handoff implant-fit evidence

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-tools` is 17,807 bytes / 5,064 gzip, `ct-planning-export-panel` is 3,866 bytes / 1,372 gzip, and `ct-planning-export` remains 7,868 bytes / 2,837 gzip.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files/docs remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT static catalog chunk split

- [x] Identified the CT tools budget risk before adding more viewer behavior.
  - Implementation: focused on the static tool/action/metric/implant arrays inside `ctPlanningTools.tsx`.
  - DOD practice: reduce the near-limit UI chunk before expanding CT planning.
  - Rejected alternative: raise the 18,000 byte `ct-planning-tools` budget or keep compressing copy after each new feature.
  - Microsecond estimate: 0 measured; no profiler artifact.
- [x] Split CT static data from the reusable panel.
  - Implementation: added `ctPlanningCatalog.ts` for `ctPlanningQuickActions`, `ctPlanningTools`, `ctPlanningMetrics`, `ctImplantLibrary`, and `implantPlanFromLibraryItem`; `ctPlanningTools.tsx` imports and re-exports the catalog for compatibility.
  - DOD practice: one static catalog owner, one reusable panel owner.
  - Rejected alternative: duplicate catalog imports in App and Settings.
  - Microsecond estimate: 0 measured; module split only.
- [x] Added a dedicated bundle route and smoke proof.
  - Implementation: Vite now emits `ct-planning-catalog`; source smokes require the split catalog and budget smoke measures it separately.
  - DOD practice: budget evidence from production build, not source intent.
  - Rejected alternative: trust Rollup's incidental shared chunking.
  - Microsecond estimate: 0 measured; static budget guard only.

## Verification: CT static catalog chunk split

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-tools` is 8,958 bytes / 2,813 gzip and `ct-planning-catalog` is 8,969 bytes / 2,571 gzip.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files/docs remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT static catalog chunk split

- [x] Identified the CT tools budget risk before adding more viewer behavior.
  - Implementation: focused on the static tool/action/metric/implant arrays inside `ctPlanningTools.tsx`.
  - DOD practice: reduce the near-limit UI chunk before expanding CT planning.
  - Rejected alternative: raise the 18,000 byte `ct-planning-tools` budget or keep compressing copy after each new feature.
  - Microsecond estimate: 0 measured; no profiler artifact.
- [x] Split CT static data from the reusable panel.
  - Implementation: added `ctPlanningCatalog.ts` for `ctPlanningQuickActions`, `ctPlanningTools`, `ctPlanningMetrics`, `ctImplantLibrary`, and `implantPlanFromLibraryItem`; `ctPlanningTools.tsx` imports and re-exports the catalog for compatibility.
  - DOD practice: one static catalog owner, one reusable panel owner.
  - Rejected alternative: duplicate catalog imports in App and Settings.
  - Microsecond estimate: 0 measured; module split only.
- [x] Added a dedicated bundle route and smoke proof.
  - Implementation: Vite now emits `ct-planning-catalog`; source smokes require the split catalog and budget smoke measures it separately.
  - DOD practice: budget evidence from production build, not source intent.
  - Rejected alternative: trust Rollup's incidental shared chunking.
  - Microsecond estimate: 0 measured; static budget guard only.

## Verification: CT static catalog chunk split

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-tools` is 8,958 bytes / 2,813 gzip and `ct-planning-catalog` is 8,969 bytes / 2,571 gzip.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files remain.

## Slice: CT implant body, apex and guide sleeve model plan

- [x] Identified relevant mandates before coding.
  - Implementation: used OPT_Zero_GC, OPT_Performance_Budgets, OPT_Cinematic_Cheat, UI_Data_Streaming, UI_Localization and QA_Evidence for this Dental CRM web slice.
  - DOD practice: source-level capability boundary and explicit evidence class.
  - Rejected alternative: generate a fake implant mesh or diagnostic CT overlay from CRM metadata.
  - Microsecond estimate: 0 measured; no profiler artifact.
- [x] Added a cold implant modeling planner.
  - Implementation: `ctPlanningImplantModel.ts` derives body size, axis length, apex label, safety envelope diameter and guide sleeve diameter/length from the selected implant plan and drawn axis annotation.
  - DOD practice: pure deterministic helper over typed shared DICOM/viewer contracts.
  - Rejected alternative: binary quality mode or quality-dependent clinical dimensions.
  - Microsecond estimate: 0 measured; bounded by annotation point count.
- [x] Integrated implant model readiness into CT snapshot, validation and export.
  - Implementation: `ctPlanningState` exposes `implantModelPlan`; validation adds a model gate; lab export now requires the model before guide handoff is marked ready.
  - DOD practice: one snapshot route owns derived CT planning facts.
  - Rejected alternative: allow guide/lab export readiness from implant type alone without axis, apex and sleeve.
  - Microsecond estimate: 0 measured; static planning path only.
- [x] Added doctor-readable UI and preserved code-split boundaries.
  - Implementation: `CtPlanningImplantModelPanel` renders model cards; Vite and bundle-budget smokes split/check model logic and panel chunks.
  - DOD practice: visible UI, source smoke and bundle budget proof.
  - Rejected alternative: put all model UI into the main CT tools chunk and raise its 18 KB limit.
  - Microsecond estimate: 0 measured; static bundle evidence only.
- [x] Updated CT viewer documentation and regression contracts.
  - Implementation: imaging source smoke, code-split smoke and CT plan docs now require the implant body/apex/sleeve model boundary.
  - DOD practice: docs match actual capability; no certified-renderer claim.
  - Rejected alternative: document this as full interactive 3D implant placement.
  - Microsecond estimate: 0 measured; no runtime claim.

## Verification: CT implant body, apex and guide sleeve model plan

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
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT workflow Russian labels and active-step accessibility

- [x] Identified the workflow readability gap before coding.
  - Implementation: focused on `ctPlanningWorkflowPlan.ts` and `ctPlanningWorkflowPanel.tsx`, where the visible workflow showed internal owner ids and mixed English jargon.
  - DOD practice: doctor-facing copy must be readable Russian and active clinical step must be exposed structurally.
  - Rejected alternative: keep `series/doctor/lab` enum values visible because they are convenient implementation ids.
  - Microsecond estimate: 0 measured; no profiler artifact.
- [x] Replaced internal owner ids with Russian role labels.
  - Implementation: workflow panel now maps owner ids through `ownerLabels` before rendering.
  - DOD practice: enum values stay internal; visible UI uses clinical language.
  - Rejected alternative: change the owner enum itself and risk downstream status logic.
  - Microsecond estimate: 0 measured; one constant lookup per phase.
- [x] Removed mixed English workflow copy.
  - Implementation: `without pixel export from CRM`, `safety envelope`, and `Клинические gates` were replaced with Russian clinical wording.
  - DOD practice: source smoke forbids those strings from returning.
  - Rejected alternative: leave mixed copy because it is only a workflow board; it is still visible UI.
  - Microsecond estimate: 0 measured; text-only change.
- [x] Added active-step accessibility.
  - Implementation: active workflow phase now renders `aria-current="step"`.
  - DOD practice: the visual active phase has a matching structural signal.
  - Rejected alternative: rely only on color/border state.
  - Microsecond estimate: 0 measured; static attribute only.

## Verification: CT workflow Russian labels and active-step accessibility

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; workflow plan is 4,409 bytes / 1,778 gzip, workflow panel is 1,285 bytes / 630 gzip.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.

## Slice: CT measurement readiness map

- [x] Identified relevant mandates before coding.
  - Implementation: used OPT_Zero_GC, OPT_Performance_Budgets, OPT_Cinematic_Cheat, UI_Data_Streaming, UI_Localization and QA_Evidence for the measurement-map slice.
  - DOD practice: source-level boundary and bundle evidence; no diagnostic HU claim.
  - Rejected alternative: synthesize density/HU values from missing pixel data.
  - Microsecond estimate: 0 measured; no profiler artifact.
- [x] Added a cold measurement readiness planner.
  - Implementation: `ctPlanningMeasurementPlan.ts` counts ruler, angle, ROI area, ROI volume, density probes, saved density values, calibration review flags, canal clearance and unsaved artifacts.
  - DOD practice: pure deterministic helper over typed viewer annotations.
  - Rejected alternative: keep area/volume/density buried in a generic geometry card list.
  - Microsecond estimate: 0 measured; bounded by annotation count.
- [x] Integrated measurement readiness into snapshot, validation, export and UI.
  - Implementation: `ctPlanningState` exposes `measurementPlan`; validation adds a measurement-map gate; export lane uses measurement-map readiness; `CtPlanningMeasurementPanel` renders a doctor-readable board.
  - DOD practice: one snapshot route feeds UI and handoff.
  - Rejected alternative: let export call measurement lane ready from any single metric.
  - Microsecond estimate: 0 measured; static planning path only.
- [x] Preserved code splitting and CT tools budget.
  - Implementation: Vite splits `ct-planning-measurement-plan` and `ct-planning-measurement-panel`; bundle budget checks both; CT tools stayed below 18 KB after removing excess copy.
  - DOD practice: executable bundle budget, not a raised limit.
  - Rejected alternative: increase the `ct-planning-tools` maxBytes.
  - Microsecond estimate: 0 measured; static payload budget evidence only.
- [x] Updated CT docs and smoke contracts.
  - Implementation: `docs/10-imaging-dicom-viewer-plan.md`, imaging usability smoke and code-split smoke now require the measurement-map boundary.
  - DOD practice: docs match capability; density point without saved viewer value remains draft.
  - Rejected alternative: call a probe point a clinical density value.
  - Microsecond estimate: 0 measured; no runtime claim.

## Verification: CT measurement readiness map

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

## Slice: CT dynamic clinical workflow board

- [x] Identified relevant mandates before coding.
  - Implementation: used OPT_Zero_GC, OPT_Performance_Budgets, OPT_Cinematic_Cheat, UI_Data_Streaming, UI_Localization and QA_Evidence for the workflow-board slice.
  - DOD practice: source-level capability boundary and bundle evidence; no diagnostic renderer claim.
  - Rejected alternative: add another static checklist that duplicates stale text.
  - Microsecond estimate: 0 measured; no profiler artifact.
- [x] Added a cold dynamic workflow planner.
  - Implementation: `ctPlanningWorkflowPlan.ts` derives phases for series, ОПТГ/cross-sections, measurements, implant model, safety, and handoff from existing CT plans.
  - DOD practice: one planner consumes existing facts; it does not search global state or synthesize pixels.
  - Rejected alternative: make `ctPlanningTools.tsx` own another large inline workflow object.
  - Microsecond estimate: 0 measured; bounded by six fixed phases.
- [x] Added doctor-readable workflow UI.
  - Implementation: `CtPlanningWorkflowPanel` shows score, first unfinished phase via `activePhaseId`, next action, and top blockers.
  - DOD practice: visible test-tagged UI tied to derived state.
  - Rejected alternative: leave the operator to infer order from validation/export cards.
  - Microsecond estimate: 0 measured; render cost is six small cards.
- [x] Preserved chunk boundaries and lowered the CT tools chunk.
  - Implementation: Vite and bundle-budget smokes split workflow logic and panel chunks; static workflow text was removed from `ctPlanningTools.tsx`.
  - DOD practice: budget proof instead of raising the `ct-planning-tools` limit.
  - Rejected alternative: increase main CT tools budget.
  - Microsecond estimate: 0 measured; static payload evidence only.
- [x] Updated docs and regression contracts.
  - Implementation: CT plan docs, imaging usability smoke and code-split smoke now require the dynamic workflow board and the no-pixel-export boundary.
  - DOD practice: docs match actual capability.
  - Rejected alternative: advertise this as real ОПТГ pixel reconstruction.
  - Microsecond estimate: 0 measured; no runtime claim.

## Verification: CT dynamic clinical workflow board

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT implant library fit screening

- [x] Identified relevant mandates before coding.
  - Implementation: used OPT_Zero_GC, OPT_Performance_Budgets, OPT_Cinematic_Cheat, UI_Data_Streaming, UI_Localization and QA_Evidence for the implant-fit slice.
  - DOD practice: source-level screening boundary and bundle evidence; no auto-selection or diagnostic CT pixel claim.
  - Rejected alternative: choose an implant automatically from missing width/height semantics.
  - Microsecond estimate: 0 measured; no profiler artifact.
- [x] Exposed ruler distances for downstream CT fit checks.
  - Implementation: `ctPlanningGeometry.ts` now returns `distanceMeasurementsMm` from completed distance annotations.
  - DOD practice: reuse real viewer measurements instead of parsing display strings.
  - Rejected alternative: infer width/height from labels or synthetic defaults.
  - Microsecond estimate: 0 measured; bounded by annotation count.
- [x] Added implant-library fit planner.
  - Implementation: `ctPlanningImplantFit.ts` computes ridge width, bone height, diameter margin, length margin, canal margin, score and per-preset status.
  - DOD practice: hard canal gate remains less than 2 mm = blocked.
  - Rejected alternative: treat library metadata as guide-ready without ruler measurements.
  - Microsecond estimate: 0 measured; four current presets, bounded library scan.
- [x] Added doctor-readable fit board.
  - Implementation: `CtPlanningImplantFitPanel` renders selected preset, margins, warnings and next actions inside CT planning.
  - DOD practice: test-tagged UI with explicit warning that doctor confirms width/height semantics.
  - Rejected alternative: bury fit warnings inside the generic implant library strip.
  - Microsecond estimate: 0 measured; small card grid.
- [x] Preserved code splitting and CT tools budget.
  - Implementation: Vite splits `ct-planning-implant-fit` and `ct-planning-implant-fit-panel`; bundle budget and source smokes cover both.
  - DOD practice: budget proof instead of raising the `ct-planning-tools` limit.
  - Rejected alternative: inline the fit rules into `ctPlanningTools.tsx`.
  - Microsecond estimate: 0 measured; static payload evidence only.

## Verification: CT implant library fit screening

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files remain.
- Process check: one existing `node.exe` belongs to a `C:\hades\Tools\BrowserOps\` helper; no CT build/test process left behind.

## Slice: CT semantic ruler roles for implant fit

- [x] Identified relevant mandates before coding.
  - Implementation: used OPT_Zero_GC, OPT_Performance_Budgets, OPT_Cinematic_Cheat, UI_Data_Streaming, UI_Localization and QA_Evidence for typed ruler semantics.
  - DOD practice: explicit semantic gate; generic distance fallback cannot mark implant fit ready.
  - Rejected alternative: keep shortest/longest distance as a ready clinical rule.
  - Microsecond estimate: 0 measured; no profiler artifact.
- [x] Added typed distance role extraction.
  - Implementation: `ctPlanningGeometry.ts` now exposes `CtPlanningDistanceMeasurement` with `ridge_width`, `bone_height`, `clearance` or `generic` role.
  - DOD practice: pure annotation-label/note classification over existing viewer annotations.
  - Rejected alternative: infer clinical role from numeric length alone.
  - Microsecond estimate: 0 measured; bounded by annotation count.
- [x] Added dedicated width/height artifact commands.
  - Implementation: `ctPlanningArtifactCommands.ts` includes `ridge-width-ruler` and `bone-height-ruler`; command states filter by `semanticRole`.
  - DOD practice: structured authoring path instead of one vague ruler command.
  - Rejected alternative: ask users to remember free-text labels.
  - Microsecond estimate: 0 measured; static command list only.
- [x] Hardened implant fit readiness.
  - Implementation: `ctPlanningImplantFit.ts` exposes `measurementRoleCount`, `widthSource`, `heightSource`, and requires typed width+height for ready status.
  - DOD practice: fallback shortest/longest stays draft and explicitly visible in `CtPlanningImplantFitPanel`.
  - Rejected alternative: let any two distances approve a preset.
  - Microsecond estimate: 0 measured; four preset scan plus bounded measurements.
- [x] Preserved budget and contracts.
  - Implementation: source smokes require typed roles; bundle budget remains under limits.
  - DOD practice: executable source and bundle evidence.
  - Rejected alternative: move semantics into the heavy workspace chunk.
  - Microsecond estimate: 0 measured; static payload evidence only.

## Verification: CT semantic ruler roles for implant fit

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT portable semantic ruler role contract

- [x] Identified relevant mandates before coding.
  - Implementation: used OPT_Zero_GC, OPT_Performance_Budgets, OPT_Cinematic_Cheat, UI_Data_Streaming, UI_Localization and QA_Evidence for semantic annotation roles.
  - DOD practice: structured shared/API contract; no role parsing from visible note text as the primary path.
  - Rejected alternative: hide `ridge_width`/`bone_height` tokens in doctor-facing notes.
  - Microsecond estimate: 0 measured; no profiler artifact.
- [x] Added portable annotation role schema.
  - Implementation: shared viewer annotations and DICOM tool-state annotations now carry optional `semanticRole`.
  - DOD practice: one field survives local draft, save request and exported bundle.
  - Rejected alternative: keep roles only inside web-only CT helper modules.
  - Microsecond estimate: 0 measured; schema-only payload field.
- [x] Preserved semantic roles through CT bridges.
  - Implementation: App artifact creation, local annotation refs, CT tools, CT state bridge and API tool-state builder copy `semanticRole`.
  - DOD practice: local unsaved drafts and saved bundles use the same role route.
  - Rejected alternative: make implant fit infer role from ruler title after export.
  - Microsecond estimate: 0 measured; bounded by annotation count.
- [x] Hardened measurement readiness around signed rulers.
  - Implementation: measurement plan now counts ridge-width, bone-height and clearance roles and cannot become ready without signed width/height rulers.
  - DOD practice: generic distance remains useful, but not sufficient for CT measurement readiness.
  - Rejected alternative: let a generic ruler keep the measurement map green.
  - Microsecond estimate: 0 measured; linear annotation scan.
- [x] Preserved build and budget evidence.
  - Implementation: source smoke requires shared semantic-role schema and carry-through points.
  - DOD practice: compile, smoke and bundle budget proof.
  - Rejected alternative: increase CT planning tools budget.
  - Microsecond estimate: 0 measured; static payload evidence only.

## Verification: CT portable semantic ruler role contract

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
- Process check: one existing `node.exe` belongs to `C:\hades\Tools\BrowserOps\cdp_click_xy.js`; no CT build/test process left behind.

## Slice: CT signed canal clearance ruler

- [x] Identified relevant mandates before coding.
  - Implementation: used OPT_Zero_GC, OPT_Performance_Budgets, OPT_Cinematic_Cheat, UI_Data_Streaming, UI_Localization and QA_Evidence for the signed clearance ruler.
  - DOD practice: structured clearance artifact; no replacement of the hard canal gate.
  - Rejected alternative: mark clearance ready from a manual ruler alone.
  - Microsecond estimate: 0 measured; no profiler artifact.
- [x] Added dedicated signed canal-clearance artifact.
  - Implementation: `ctPlanningArtifactCommands.ts` includes `canal-clearance-ruler` with `semanticRole: "clearance"`.
  - DOD practice: signed manual control line is explicit and requires implant selection.
  - Rejected alternative: force users through a generic distance ruler.
  - Microsecond estimate: 0 measured; static command list only.
- [x] Kept the hard canal gate separate.
  - Implementation: `ctPlanningMeasurementPlan.ts` shows signed clearance ruler count when axis plus canal clearance is missing, but leaves the clearance card draft until computed geometry exists.
  - DOD practice: manual ruler is control evidence, not implant-to-canal safety proof.
  - Rejected alternative: pass the canal gate from any clearance distance.
  - Microsecond estimate: 0 measured; bounded annotation scan.
- [x] Preserved contracts and budgets.
  - Implementation: source smoke locks `canal-clearance-ruler`, `semanticRole: "clearance"`, and hard-gate copy.
  - DOD practice: compile, smoke and bundle proof.
  - Rejected alternative: increase budgets.
  - Microsecond estimate: 0 measured; static payload evidence only.

## Verification: CT signed canal clearance ruler

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
- Process check: one existing `node.exe` belongs to `C:\hades\Tools\BrowserOps\cdp_click_xy.js`; no CT build/test process left behind.

## Slice: CT OPG curve sampling quality

- [x] Identified relevant mandates before coding.
  - Implementation: used OPT_Zero_GC, OPT_Performance_Budgets, OPT_Cinematic_Cheat, UI_Data_Streaming, UI_Localization and QA_Evidence for route-level OPG quality.
  - DOD practice: structural route quality gate; no fake pixel panoramic reconstruction.
  - Rejected alternative: mark any 3-point OPG curve ready.
  - Microsecond estimate: 0 measured; no profiler artifact.
- [x] Added OPG control-point gap analysis.
  - Implementation: `ctPlanningReconstruction.ts` computes `longestCurveSegmentMm`, `curveSegmentCount`, and `curveSpacingTargetMm`.
  - DOD practice: pure bounded polyline scan over existing annotation points.
  - Rejected alternative: sample volume pixels or invent a rendered OPG image.
  - Microsecond estimate: 0 measured; linear in OPG point count.
- [x] Added route-quality card and readiness effect.
  - Implementation: reconstruction plan now includes `curve-sampling`; a sparse ready-looking curve becomes draft until its largest segment is within target.
  - DOD practice: exact clinical dimensions stay unchanged; quality weight only drives visual route sampling target.
  - Rejected alternative: make workstation quality mutate the curve geometry or implant truth.
  - Microsecond estimate: 0 measured; static card plus existing render.
- [x] Preserved contracts and budgets.
  - Implementation: source smoke locks longest segment, spacing target, quality card, and sparse-curve warning.
  - DOD practice: compile, smoke, synthetic DICOM and bundle proof.
  - Rejected alternative: increase CT chunk budgets.
  - Microsecond estimate: 0 measured; static payload evidence only.

## Verification: CT OPG curve sampling quality

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
- Process check: only external BrowserOps `node.exe` snapshot processes were present; no CT build/test process left behind.

## Slice: CT surgical guide readiness gate

- [x] Identified relevant mandates before coding.
  - Implementation: used OPT_Zero_GC, OPT_Performance_Budgets, OPT_Cinematic_Cheat, UI_Data_Streaming, UI_Localization and QA_Evidence for the lab guide gate.
  - DOD practice: explicit guide readiness fact; no fake STL/CAD generation.
  - Rejected alternative: mark lab lane ready from any surgical-guide route alone.
  - Microsecond estimate: 0 measured; no profiler artifact.
- [x] Added structured guide route facts to implant model plan.
  - Implementation: `ctPlanningImplantModel.ts` now computes `hasGuideRoute`, `guideReady`, `guideRoutePointCount`, and `guideRouteLengthMm`.
  - DOD practice: bounded polyline scan over existing `surgical_guide` annotations.
  - Rejected alternative: duplicate a separate guide chunk and grow `ct-planning-tools`.
  - Microsecond estimate: 0 measured; linear in guide route point count.
- [x] Hardened validation and lab export.
  - Implementation: validation guide check and export lab lane now gate on `input.implantModelPlan.guideReady`.
  - DOD practice: guide needs route, sleeve, axis, selected implant, and canal clearance >= 2 mm.
  - Rejected alternative: use `hasGuideRoute && hasImplantPlan` as lab-ready.
  - Microsecond estimate: 0 measured; existing plan object lookup.
- [x] Preserved contracts and budgets.
  - Implementation: source smoke locks guide route extraction, route length, `guideReady`, validation gate, and export gate.
  - DOD practice: compile, smoke, synthetic DICOM and bundle proof.
  - Rejected alternative: increase CT bundle budgets.
  - Microsecond estimate: 0 measured; static payload evidence only.

## Verification: CT surgical guide readiness gate

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
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT density protocol hint hardening

- [x] Identified the density gap before coding.
  - Implementation: focused on saved `bone_density_probe` values inside the CT measurement map.
  - DOD practice: saved viewer values only; no voxel sampling and no invented HU.
  - Rejected alternative: treat every probe point or viewer-unit value as calibrated bone density.
  - Microsecond estimate: 0 measured; no profiler artifact.
- [x] Added density average/range facts to the measurement plan.
  - Implementation: `ctPlanningMeasurementPlan.ts` now computes `densityAverageValue`, `densityRangeLabel`, unit label, HU calibration flag, mixed-unit flag and protocol label in one bounded annotation scan.
  - DOD practice: pure derived state from existing tool-state annotations.
  - Rejected alternative: add a new rendering worker or parse visible UI strings.
  - Microsecond estimate: 0 measured; linear in saved density probe count.
- [x] Added clinical drill-protocol copy with HU guard.
  - Implementation: HU threshold hints are emitted only for explicit `HU`; viewer units show a calibration warning and mixed units ask for repeated probe.
  - DOD practice: false-ready prevention over optimistic clinical copy.
  - Rejected alternative: apply HU thresholds to unknown viewer units.
  - Microsecond estimate: 0 measured; branch-only derived label.
- [x] Exposed the hint in the CT measurement panel.
  - Implementation: `CtPlanningMeasurementPanel` renders `plan.densityProtocolLabel` in the measurement summary and the density card shows range/detail.
  - DOD practice: visible doctor-facing state, not hidden diagnostics.
  - Rejected alternative: keep only `densityValueCount/densityProbeCount`.
  - Microsecond estimate: 0 measured; one small text row.
- [x] Updated source contracts and CT docs.
  - Implementation: imaging usability smoke now requires average/range/protocol/HU guard and the CT plan doc records the boundary.
  - DOD practice: executable source proof plus concise documentation.
  - Rejected alternative: rely on manual review of Russian UI text.
  - Microsecond estimate: 0 measured; static checks only.

## Verification: CT density protocol hint hardening

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
- Process check: one existing BrowserOps `node.exe` was present; no CT build/test process was left behind.

## Slice: CT cross-section station coverage

- [x] Identified the station coverage gap before coding.
  - Implementation: focused on the OPG/cross-section route in `ctPlanningReconstruction.ts`.
  - DOD practice: route metadata only; no fake panoramic pixels or certified MPR claim.
  - Rejected alternative: mark any capped cross-section list as ready.
  - Microsecond estimate: 0 measured; no profiler artifact.
- [x] Added uncapped demand and coverage facts.
  - Implementation: reconstruction plan now exposes `crossSectionRequiredCount`, `crossSectionCoverageMm`, `crossSectionCoveragePercent`, and `crossSectionStationPreview`.
  - DOD practice: deterministic bounded math from the existing structural OPG curve.
  - Rejected alternative: store every station as a large array in UI state.
  - Microsecond estimate: 0 measured; constant extra math after existing curve length.
- [x] Hardened readiness when the 160-slice cap truncates the route.
  - Implementation: `crossSectionStatus` requires `crossSectionCoveragePercent >= 99`; under-covered capped routes stay draft.
  - DOD practice: fail-visible coverage gate instead of optimistic route handoff.
  - Rejected alternative: keep only a warning while status stays ready.
  - Microsecond estimate: 0 measured; one integer comparison.
- [x] Added doctor-facing station coverage UI.
  - Implementation: reconstruction panel summary shows coverage percent and a compact `0 / middle / end` station preview.
  - DOD practice: visible route-readiness state, not hidden diagnostic telemetry.
  - Rejected alternative: bury coverage in the warning list only.
  - Microsecond estimate: 0 measured; one small text row.
- [x] Updated source contracts and CT docs.
  - Implementation: imaging usability smoke requires station coverage fields/card/gate and docs describe the cap boundary.
  - DOD practice: executable source proof plus concise documentation.
  - Rejected alternative: rely on manual inspection of built chunks.
  - Microsecond estimate: 0 measured; static checks only.

## Verification: CT cross-section station coverage

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

## Slice: CT ROI area and volume estimate values

- [x] Identified the ROI counter gap before coding.
  - Implementation: focused on `ctPlanningGeometry.ts` and `ctPlanningMeasurementPlan.ts`, where area/volume were mostly counts.
  - DOD practice: portable annotation facts only; no fake segmentation or pixel-volume renderer.
  - Rejected alternative: leave only `areaCount/volumeCount` in the doctor board.
  - Microsecond estimate: 0 measured; no profiler artifact.
- [x] Added ROI total values and slab provenance.
  - Implementation: geometry summary now exposes `roiAreaTotalMm2`, `roiVolumeTotalMm3`, `roiVolumeSlabMm`, and `roiDraftCount`.
  - DOD practice: deterministic bounded scan over existing ROI annotations.
  - Rejected alternative: store full contour tables in UI state.
  - Microsecond estimate: 0 measured; linear in annotation count.
- [x] Made underdrawn ROI drafts fail-visible.
  - Implementation: ROI contours with 1-2 points are warnings and do not count as area or volume.
  - DOD practice: ready state requires at least 3 points, same as polygon math.
  - Rejected alternative: count a started ROI as completed work.
  - Microsecond estimate: 0 measured; one filter over annotations.
- [x] Exposed area/volume values in the measurement and validation UI.
  - Implementation: measurement panel shows `roiAreaTotalLabel` and `roiVolumeTotalLabel`; validation carries those values into the ROI check.
  - DOD practice: doctor sees value provenance, not a raw counter.
  - Rejected alternative: hide values only in geometry metric cards.
  - Microsecond estimate: 0 measured; small text rendering only.
- [x] Preserved bundle budget.
  - Implementation: after an initial 8,086 byte failure, shortened measurement copy instead of raising the 8,000 byte limit.
  - DOD practice: budget proof after build.
  - Rejected alternative: increase `ct planning measurement plan` budget.
  - Microsecond estimate: 0 measured; static payload evidence only.

## Verification: CT ROI area and volume estimate values

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-bundle-budget`: passed after copy compression; measurement plan is 7,862 bytes / 3,132 gzip.
- `npm run smoke:dicom-folder-workup`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files remain.
- Process check: one external BrowserOps `node.exe` was present (`C:\hades\Tools\BrowserOps\cdp_eval_first_match.js`); no CT build/test process was left behind.

## Slice: CT export clinical fact sheet

- [x] Identified the handoff summary gap before coding.
  - Implementation: focused on `ctPlanningExport.ts` and `ctPlanningExportPanel.tsx`, where export had lanes and blockers but no compact "what exactly is in the plan" fact sheet.
  - DOD practice: metadata/tool-state summary only; no fake volume renderer, tissue segmentation, or CAD/CAM output.
  - Rejected alternative: leave doctors/lab to reconstruct facts from separate measurement, OPG, implant, and validation cards.
  - Microsecond estimate: 0 measured; no profiler artifact.
- [x] Added typed clinical facts to the export packet.
  - Implementation: `CtPlanningExportPacket.clinicalFacts` now carries implant/sleeve, OPG coverage, ROI value, density protocol, and canal/guide state.
  - DOD practice: facts reuse existing signed planning summaries and readiness gates.
  - Rejected alternative: create a new heavy CT summary state owner; export already receives the required bounded summaries.
  - Microsecond estimate: 0 measured; scalar string assembly only.
- [x] Rendered fact cards in the handoff panel.
  - Implementation: `CtPlanningExportPanel` renders `packet.clinicalFacts.map` above owner lanes, with ready/warning/blocked tones.
  - DOD practice: small panel chunk; no changes to the near-limit `ct-planning-tools` chunk.
  - Rejected alternative: add another full CT planning panel inside the main suite.
  - Microsecond estimate: 0 measured; five small cards.
- [x] Preserved bundle budget after an initial failure.
  - Implementation: first build made `ct-planning-export` 8,964 bytes and failed the 8,000 byte budget; copy and repeated object keys were compressed instead of raising the limit.
  - DOD practice: budget proof after rebuild.
  - Rejected alternative: increase `ct planning export` budget.
  - Microsecond estimate: 0 measured; final export chunk is 7,868 bytes / 2,814 gzip.

## Verification: CT export clinical fact sheet

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed after compression; export chunk is 7,868 bytes / 2,814 gzip.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT workflow Russian labels and active-step accessibility

- [x] Identified the workflow readability gap before coding.
  - Implementation: focused on `ctPlanningWorkflowPlan.ts` and `ctPlanningWorkflowPanel.tsx`, where visible workflow copy leaked internal owner ids and mixed English terms.
  - DOD practice: doctor-facing copy must be readable Russian and active clinical step must be exposed structurally.
  - Rejected alternative: keep `series/doctor/lab` enum values visible because they are convenient implementation ids.
  - Microsecond estimate: 0 measured; no profiler artifact.
- [x] Replaced internal owner ids with Russian role labels.
  - Implementation: workflow panel now maps owner ids through `ownerLabels` before rendering.
  - DOD practice: enum values stay internal; visible UI uses clinical language.
  - Rejected alternative: change the owner enum itself and risk downstream status logic.
  - Microsecond estimate: 0 measured; one constant lookup per phase.
- [x] Removed mixed English workflow copy.
  - Implementation: English pixel-export copy, `safety envelope`, and mixed gate wording were replaced with Russian clinical wording.
  - DOD practice: source smoke forbids those strings from returning.
  - Rejected alternative: leave mixed copy because it is only a workflow board; it is still visible UI.
  - Microsecond estimate: 0 measured; text-only change.
- [x] Added active-step accessibility.
  - Implementation: active workflow phase now renders `aria-current="step"`.
  - DOD practice: the visual active phase has a matching structural signal.
  - Rejected alternative: rely only on color/border state.
  - Microsecond estimate: 0 measured; static attribute only.

## Verification: CT workflow Russian labels and active-step accessibility

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; workflow plan is 4,409 bytes / 1,778 gzip, workflow panel is 1,285 bytes / 630 gzip.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT export release gate and budget regex hardening

- [x] Identified the handoff release gap before coding.
  - Implementation: focused on `ctPlanningExportPanel.tsx`, where packet status existed but there was no explicit "fix / draft / blocked" transfer gate.
  - DOD practice: handoff must expose the first actionable gate without claiming diagnostic CT rendering.
  - Rejected alternative: infer transfer readiness only from summary copy and owner lanes.
  - Microsecond estimate: 0 measured; no profiler artifact.
- [x] Added a release gate to the export panel.
  - Implementation: `buildReleaseGate` derives ready/warning/blocked copy from `packet.status`, first blocked/warning clinical fact, and missing artifacts.
  - DOD practice: status is derived from existing packet facts; no duplicate CT state owner.
  - Rejected alternative: add gate logic to `ctPlanningExport.ts`, which is near the 8,000 byte logic budget.
  - Microsecond estimate: 0 measured; one bounded fact lookup.
- [x] Fixed the export bundle budget matcher.
  - Implementation: `smoke-web-bundle-budget.mjs` now uses `^ct-planning-export-(?!panel-)` for the logic chunk, and code-split smoke requires that guard.
  - DOD practice: the budget proof now measures the real export logic chunk, not the smaller panel chunk.
  - Rejected alternative: trust asset ordering from `readdirSync`.
  - Microsecond estimate: 0 measured; CI/source guard only.

## Verification: CT export release gate and budget regex hardening

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-export` is correctly measured as `ct-planning-export-qBdy6B2F.js` at 7,868 bytes / 2,837 gzip, and `ct-planning-export-panel` is separately measured at 2,762 bytes / 1,029 gzip.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files remain.
- Process check: no DENTE build/test process was left behind.

## Slice: CT implant fit decision reasons

- [x] Identified the implant-library explainability gap before coding.
  - Implementation: focused on `ctPlanningImplantFit.ts` and `ctPlanningImplantFitPanel.tsx`, where candidates exposed margins and a score but not the concrete reason for ready/draft/blocked state.
  - DOD practice: implant library remains a screening aid, not an automatic clinical selector.
  - Rejected alternative: rely on the operator to infer blockers from three margin labels.
  - Microsecond estimate: 0 measured; no profiler artifact.
- [x] Added bounded candidate decision reasons.
  - Implementation: `candidateDecisionReasons` returns up to four reasons per implant size: missing CT series, fallback width/height, missing rulers, negative margins, missing canal hard gate, or canal clearance below 2 mm.
  - DOD practice: reasons are derived from existing scalar margins and hard gates.
  - Rejected alternative: add another planner object or analyze raw DICOM pixels in CRM.
  - Microsecond estimate: 0 measured; bounded scalar string list per library candidate.
- [x] Rendered reason chips in the implant fit panel.
  - Implementation: each candidate card renders `candidate.decisionReasons.map` under the margin line.
  - DOD practice: visible explanation is attached to the candidate, not hidden in global warnings.
  - Rejected alternative: only show one global warning strip for all candidate sizes.
  - Microsecond estimate: 0 measured; at most six cards x four chips.

## Verification: CT implant fit decision reasons

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-implant-fit` is 4,905 bytes / 1,997 gzip, panel is 1,888 bytes / 824 gzip.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files remain.
- Process check: two external BrowserOps `node.exe` processes were present under `C:\hades\Tools\BrowserOps\...` for Hecton8 marketing queue; no DENTE build/test process was left behind.

## Slice: CT handoff implant-fit evidence

- [x] Handoff receives implant fit evidence.
  - Implementation: `CtPlanningExportPanel` accepts `implantFitPlan` and renders `ct-planning-export-fit` with selected/review candidate size, score, decision reasons, and next action.
  - DOD practice: transfer decision surface carries implant screening reasons without growing `ct-planning-export` logic.
  - Rejected alternative: duplicate fit calculation or add it to the near-limit export packet logic.
  - Microsecond estimate: 0 measured; one bounded candidate lookup over capped candidates.

## Verification: CT handoff implant-fit evidence

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-tools` is 17,807 bytes / 5,064 gzip, `ct-planning-export-panel` is 3,866 bytes / 1,372 gzip, and `ct-planning-export` remains 7,868 bytes / 2,837 gzip.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files/docs remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT static catalog chunk split

- [x] Identified the CT tools budget risk before adding more viewer behavior.
  - Implementation: focused on the static tool/action/metric/implant arrays inside `ctPlanningTools.tsx`.
  - DOD practice: reduce the near-limit UI chunk before expanding CT planning.
  - Rejected alternative: raise the 18,000 byte `ct-planning-tools` budget or keep compressing copy after each new feature.
  - Microsecond estimate: 0 measured; no profiler artifact.
- [x] Split CT static data from the reusable panel.
  - Implementation: added `ctPlanningCatalog.ts` for `ctPlanningQuickActions`, `ctPlanningTools`, `ctPlanningMetrics`, `ctImplantLibrary`, and `implantPlanFromLibraryItem`; `ctPlanningTools.tsx` imports and re-exports the catalog for compatibility.
  - DOD practice: one static catalog owner, one reusable panel owner.
  - Rejected alternative: duplicate catalog imports in App and Settings.
  - Microsecond estimate: 0 measured; module split only.
- [x] Added a dedicated bundle route and smoke proof.
  - Implementation: Vite now emits `ct-planning-catalog`; source smokes require the split catalog and budget smoke measures it separately.
  - DOD practice: budget evidence from production build, not source intent.
  - Rejected alternative: trust Rollup's incidental shared chunking.
  - Microsecond estimate: 0 measured; static budget guard only.

## Verification: CT static catalog chunk split

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-tools` is 8,958 bytes / 2,813 gzip and `ct-planning-catalog` is 8,969 bytes / 2,571 gzip.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files/docs remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT quick-action artifact route

- [x] Identified the CT action routing gap before coding.
  - Implementation: focused on quick actions in `ctPlanningCatalog.ts` and the active action card in `ctPlanningTools.tsx`.
  - DOD practice: quick scenario metadata must name its structured artifact route instead of relying on manual scrolling.
  - Rejected alternative: auto-create annotations on every quick-action click.
  - Microsecond estimate: 0 measured; no profiler artifact.
- [x] Linked quick actions to artifact commands.
  - Implementation: added `artifactCommandIds` to every quick action; ridge ruler maps to width and height, canal maps to canal route and clearance control.
  - DOD practice: one route id per artifact command, no parsing visible labels.
  - Rejected alternative: duplicate artifact command objects in the catalog.
  - Microsecond estimate: 0 measured; static id list only.
- [x] Added active scenario artifact controls.
  - Implementation: CT plan board now renders `ct-planning-active-action-artifacts`, status chips, and a button that creates the next required draft via `onCreateArtifact`.
  - DOD practice: selecting a viewer tool does not mutate annotations; creating a draft remains explicit.
  - Rejected alternative: leave artifact creation only in the separate board.
  - Microsecond estimate: 0 measured; one map over existing command state.

## Verification: CT quick-action artifact route

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-tools` is 9,684 bytes / 3,044 gzip and `ct-planning-catalog` is 9,334 bytes / 2,673 gzip.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files/docs remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT exact artifact routing and underdrawn geometry gates

- [x] Removed shared-tool ambiguity from CT artifact creation.
  - Implementation: `findCtPlanningQuickActionForArtifactCommand` now resolves a quick action by exact `artifactCommandIds.includes(command.id)` before falling back to the viewer tool id.
  - DOD practice: structured artifact ids are the route owner; `measure_distance` is only a shared viewer tool.
  - Rejected alternative: keep `action.tool === command.tool`; canal clearance, ridge width and bone height all share distance tooling.
  - Microsecond estimate: 0 measured; one bounded lookup over the quick-action catalog.
- [x] Hardened CT geometry against underdrawn drafts.
  - Implementation: single-point distance/axis drafts return no metric, OPG/canal curves require 3 points for length/count, and implant-to-canal clearance requires a 3-point canal route.
  - DOD practice: clinical geometry must match artifact readiness gates and must not turn partial clicks into zero-valued measurements.
  - Rejected alternative: let `polylineLengthMm` return `0` for underdrawn drafts; that creates false evidence.
  - Microsecond estimate: 0 measured; early point-count guards only.
- [x] Updated source contracts and CT docs.
  - Implementation: imaging source smoke now locks exact artifact routing and underdrawn metric gates; CT plan docs record both boundaries.
  - DOD practice: executable source proof plus concise documentation.
  - Rejected alternative: rely on manual code review of routing and point-count checks.
  - Microsecond estimate: 0 measured; static checks only.

## Verification: CT exact artifact routing and underdrawn geometry gates

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-tools` is 9,684 bytes / 3,050 gzip, `ct-planning-catalog` is 9,454 bytes / 2,735 gzip, and `ct-planning-geometry` is 5,435 bytes / 2,225 gzip.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files/docs remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT active clinical scenario identity

- [x] Split CT clinical scenario identity from shared viewer tool identity.
  - Implementation: `CtPlanningToolsPanel` now accepts `activeQuickActionId` and resolves the active quick action by exact scenario id before falling back to `activeTool`.
  - DOD practice: clinical scenario ids own UI state; viewer tool ids remain technical shared tools.
  - Rejected alternative: continue highlighting by `action.tool === activeTool`; ridge width, bone height, and canal clearance can all reuse distance tooling.
  - Microsecond estimate: 0 measured; one bounded lookup over the quick-action catalog.
- [x] Routed visit and settings workbenches through the exact active scenario state.
  - Implementation: `App.tsx` stores `ctPlanningActiveQuickActionId`, passes it to the CT panel and Settings, sets it on quick actions and implant selection, and clears it on session restore/reset/fallback tool activation.
  - DOD practice: one explicit state owner in the visit shell, propagated to secondary workbench surfaces.
  - Rejected alternative: derive the scenario after the fact from restored viewer session tool state; saved sessions do not carry the clinical quick-action id.
  - Microsecond estimate: 0 measured; scalar React state only.
- [x] Locked the contract in source smokes and CT docs.
  - Implementation: imaging source smoke now requires `activeQuickActionId`, id-first scenario resolution, and App/Settings propagation; CT plan docs record the boundary.
  - DOD practice: executable source proof plus concise documentation.
  - Rejected alternative: rely on manual regression testing of selected quick-action cards.
  - Microsecond estimate: 0 measured; static checks only.

## Verification: CT active clinical scenario identity

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-tools` is 9,757 bytes / 3,077 gzip and `ct-planning-catalog` is 9,454 bytes / 2,735 gzip.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files/docs remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT quick-action identity persistence

- [x] Persisted exact CT clinical scenario identity in the shared viewer session contract.
  - Implementation: `ImagingViewerSessionState` now carries nullable `activeQuickActionId` with a default, and App saves/restores it with `currentImagingViewerSessionState`.
  - DOD practice: restored CT context must not be inferred from a shared viewer tool when the clinical scenario has its own id.
  - Rejected alternative: keep `activeQuickActionId` as volatile React state only; local/server restore would lose exact ruler/canal scenario.
  - Microsecond estimate: 0 measured; one scalar field in the session payload.
- [x] Persisted the same identity in the lightweight DICOM tool-state bundle.
  - Implementation: bundle response schema and `buildDicomViewerToolStateBundle` now include `activeQuickActionId`; CT panel falls back to `toolStateBundle.activeQuickActionId` when shell state is absent.
  - DOD practice: portable handoff keeps clinical route metadata without embedding heavy DICOM image data.
  - Rejected alternative: encode scenario in notes or tool labels; route metadata must stay typed and nullable.
  - Microsecond estimate: 0 measured; scalar metadata only.
- [x] Updated executable contracts and CT documentation.
  - Implementation: source smoke checks schema, App restore/save, API bundle propagation, default sample state, and bundle fallback; DICOM folder workup smoke asserts the id survives the workbench path.
  - DOD practice: source proof plus route-level runtime smoke.
  - Rejected alternative: rely on TypeScript alone; the API smoke imports built `dist`, so runtime propagation needed proof after build.
  - Microsecond estimate: 0 measured; static and API smoke proof only.

## Verification: CT quick-action identity persistence

- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/shared`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed after shared/api build refreshed `dist`.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-tools` is 9,807 bytes / 3,086 gzip, `ct-planning-catalog` is 9,454 bytes / 2,735 gzip, and shared schema/vendor is 173,418 bytes / 42,634 gzip.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files/docs remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT exact planning-task active route

- [x] Removed shared-tool ambiguity from API planning task active status.
  - Implementation: `planningTaskKindForQuickActionId` maps exact CT quick-action ids to `DicomViewerPlanningTask.kind`, and `buildDicomViewerPlanningTasks` now uses that before falling back to `viewerState.activeTool`.
  - DOD practice: active planning status must follow clinical route identity, not reusable viewer tool ids.
  - Rejected alternative: keep `viewerState?.activeTool === task.crmTool`; `measure_distance` can represent ridge, height, generic ruler, or canal-clearance context.
  - Microsecond estimate: 0 measured; one scalar mapping per tool-state bundle build.
- [x] Proved precedence with route-level DICOM smoke.
  - Implementation: `smoke-dicom-folder-workup` now sends `activeTool: "measure_distance"` with `activeQuickActionId: "nerve_canal"` and asserts the nerve-canal planning task is active while generic distance is not.
  - DOD practice: runtime smoke over built API `dist`, not source-only proof.
  - Rejected alternative: only source-search for the helper; that would not prove the endpoint payload behavior.
  - Microsecond estimate: 0 measured; smoke assertion only.
- [x] Updated source contracts and CT docs.
  - Implementation: imaging source smoke requires exact quick-action-to-task mapping and CT plan docs record the active-status boundary.
  - DOD practice: executable source proof plus concise documentation.
  - Rejected alternative: rely on manual comparison of workbench JSON.
  - Microsecond estimate: 0 measured; static checks only.

## Verification: CT exact planning-task active route

- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files/docs remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT workflow selected phase focus

- [x] Preserved the workflow blocker route while adding exact selected-scenario focus.
  - Implementation: `CtPlanningWorkflowPlan` now carries `selectedPhaseId` derived from `activeQuickActionId`, while `activePhaseId` remains the first unfinished phase.
  - DOD practice: clinical navigation focus must not hide the real next blocker.
  - Rejected alternative: overwrite `activePhaseId` with the selected quick action; that would make the summary lie about the next unfinished gate.
  - Microsecond estimate: 0 measured; one bounded string map in a memoized workflow builder.
- [x] Routed the CT panel and assistive focus through the selected phase.
  - Implementation: `CtPlanningToolsPanel` passes `effectiveActiveQuickActionId` into the workflow builder, and `CtPlanningWorkflowPanel` uses `selectedPhaseId ?? activePhaseId` for highlighted step and `aria-current`.
  - DOD practice: the board follows the doctor's current scenario while the blocker remains auditable in the data model.
  - Rejected alternative: add another visible workflow board; duplicate boards would increase scan cost and chunk weight.
  - Microsecond estimate: 0 measured; render diff is one scalar comparison per phase.
- [x] Locked the source and docs contract.
  - Implementation: imaging source smoke now requires `selectedPhaseForQuickActionId`, `selectedPhaseId`, and focused `aria-current`; CT docs record the boundary.
  - DOD practice: source smoke protects the exact route from regressing back to `activePhaseId`-only UI.
  - Rejected alternative: manual screenshot-only proof; the contract is structural and should fail in CI.
  - Microsecond estimate: 0 measured; static smoke only.

## Verification: CT workflow selected phase focus

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-workflow-plan` is 4,755 bytes / 1,917 gzip, `ct-planning-workflow-panel` is 1,300 bytes / 646 gzip, and `ct-planning-tools` is 9,831 bytes / 3,091 gzip.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files/docs remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT export current-scenario handoff

- [x] Carried the exact CT scenario into the portable export packet.
  - Implementation: `CtPlanningExportPacket` now includes nullable `activeQuickActionId`, `buildCtPlanningTaskSnapshot` passes the effective quick action into `buildCtPlanningExportPacket`, and the builder falls back to the tool-state bundle value when needed.
  - DOD practice: handoff identity follows the clinical scenario route, not the shared viewer tool.
  - Rejected alternative: infer from `activeTool`; distance-capable tools still represent ridge rulers, canal clearance, and generic measurements.
  - Microsecond estimate: 0 measured; one nullable string assignment in memoized plan construction.
- [x] Rendered the current-scenario card in the CT handoff panel.
  - Implementation: `CtPlanningExportPanel` maps the active quick action to a compact doctor-facing label and renders `ct-planning-export-focus` beside release and implant-fit handoff cards.
  - DOD practice: the doctor/admin/lab packet shows the active context before transfer.
  - Rejected alternative: hide scenario inside missing-artifact text; it would not be a stable UI or testable contract.
  - Microsecond estimate: 0 measured; one small conditional card render.
- [x] Protected budget by removing dead export packet detail.
  - Implementation: removed unused `CtPlanningExportPacket.detail`; no consumer read it, and the summary/next-action fields remain intact.
  - DOD practice: shrink the dense export logic chunk instead of raising budget.
  - Rejected alternative: raise `ct-planning-export` or panel limits; current change did not need more budget.
  - Microsecond estimate: 0 measured; static bundle reduction only.
- [x] Locked the source and docs contract.
  - Implementation: imaging usability smoke requires active scenario packet field, builder, panel test id, CSS class, and tools snapshot wiring; CT docs record the handoff boundary.
  - DOD practice: structural smoke proof over manual review.
  - Rejected alternative: rely on visible UI only; future refactors could drop the packet field while leaving copy intact.
  - Microsecond estimate: 0 measured; static smoke only.

## Verification: CT export current-scenario handoff

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-export` is 7,756 bytes / 2,811 gzip, `ct-planning-export-panel` is 4,948 bytes / 1,726 gzip, and `ct-planning-tools` is 9,855 bytes / 3,091 gzip.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files/docs remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT export scenario artifact readiness

- [x] Split the active CT scenario handoff card into its own chunk.
  - Implementation: `ctPlanningExportScenarioPanel.tsx` now owns the current-scenario handoff card, while `ctPlanningExportPanel.tsx` stays the board shell.
  - DOD practice: add CT UI depth without forcing the export panel over its 5 KB budget.
  - Rejected alternative: keep expanding `ctPlanningExportPanel.tsx`; it was already near the hard panel budget.
  - Microsecond estimate: 0 measured; chunk split only.
- [x] Passed exact active-scenario artifact readiness into handoff.
  - Implementation: `CtPlanningToolsPanel` maps active quick-action command states into `scenarioArtifacts`, then passes them to the handoff card.
  - DOD practice: current scenario must show its own ready/draft/blocked artifacts, not rely on generic packet status.
  - Rejected alternative: infer missing work from `missingArtifacts`; that loses per-scenario command identity such as ridge width versus bone height.
  - Microsecond estimate: 0 measured; small memoized map over active command states.
- [x] Exposed readiness chips in the handoff card.
  - Implementation: the active handoff card renders `ct-planning-export-scenario-artifacts` with ready/draft/blocked chips and uses the first unfinished artifact as the next action.
  - DOD practice: handoff UI tells the doctor exactly which artifact blocks the current scenario.
  - Rejected alternative: add another board; the existing handoff board already owns transfer readiness.
  - Microsecond estimate: 0 measured; conditional chip render only.
- [x] Locked split, smoke, CSS and docs.
  - Implementation: vite/manual chunk, bundle budget, code-split smoke, imaging usability smoke, CSS, and CT docs now cover the scenario artifact handoff.
  - DOD practice: executable contracts protect the split and the current-scenario artifact UI.
  - Rejected alternative: documentation-only note; future chunk merges would not fail CI.
  - Microsecond estimate: 0 measured; static source proof only.

## Verification: CT export scenario artifact readiness

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-export-panel` is 3,989 bytes / 1,428 gzip, `ct-planning-export-scenario-panel` is 1,613 bytes / 894 gzip, and `ct-planning-tools` is 10,003 bytes / 3,132 gzip.
- `npm run smoke:web-text-encoding`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files/docs remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT export scenario tone isolation

- [x] Made the current-scenario handoff card grade itself from scenario artifacts.
  - Implementation: `ctPlanningExportScenarioPanel.tsx` now computes `scenarioTone` from the active scenario artifact list before falling back to the packet status.
  - DOD practice: the focused clinical route owns its own readiness signal.
  - Rejected alternative: keep using `packet.status`; that hides a blocked canal/ROI/ruler artifact behind a packet-wide draft/warning state.
  - Microsecond estimate: 0 measured; at most three short array scans over the active scenario artifact list.
- [x] Preserved wider packet blocking without overstating scenario completion.
  - Implementation: all-ready scenario artifacts return `ready` unless the wider packet is still `blocked`, in which case the focused card stays `warning`.
  - DOD practice: do not claim transferable readiness when unsaved portable state or wider clinical blockers still stop handoff.
  - Rejected alternative: mark all-ready scenario artifacts as fully ready even with a blocked packet; that creates a false doctor/admin/lab transfer signal.
  - Microsecond estimate: 0 measured; branch-only UI logic.
- [x] Locked the contract in source smoke and docs.
  - Implementation: imaging usability smoke now requires `scenarioTone` and blocked-artifact dominance; CT docs record scenario-first grading.
  - DOD practice: executable source proof for the handoff semantics.
  - Rejected alternative: rely on manual UI review; future refactors could silently return to packet-only status.
  - Microsecond estimate: 0 measured; static smoke only.

## Verification: CT export scenario tone isolation

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-export-scenario-panel` is 1,772 bytes / 943 gzip, `ct-planning-export-panel` is 3,989 bytes / 1,427 gzip, and `ct-planning-tools` is 10,003 bytes / 3,132 gzip.
- `npm run smoke:web-text-encoding`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files/docs remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT export scenario count summary

- [x] Counted scenario artifact statuses once for both detail and tone.
  - Implementation: `scenarioStatusCounts` reduces active scenario artifacts into ready/draft/blocked counts.
  - DOD practice: one fact owner for focused scenario readiness.
  - Rejected alternative: keep independent `filter`/`some` passes in detail and tone; it duplicates the same readiness fact.
  - Microsecond estimate: 0 measured; one short reduce over the active scenario artifact list.
- [x] Made the focused scenario summary state blocked and draft counts explicitly.
  - Implementation: `scenarioDetail` now adds blocked and draft counts next to the ready ratio.
  - DOD practice: handoff should be readable without forcing the doctor to parse every chip.
  - Rejected alternative: leave counts only in visual chips; that is slower to scan and weaker for assistive text.
  - Microsecond estimate: 0 measured; string assembly only.
- [x] Locked the count summary contract.
  - Implementation: imaging usability smoke requires `scenarioStatusCounts`, blocked count text, draft count text, and count-driven tone.
  - DOD practice: source smoke protects the exact CT handoff behavior.
  - Rejected alternative: docs-only; UI regressions would not fail.
  - Microsecond estimate: 0 measured; static source proof only.

## Verification: CT export scenario count summary

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-export-scenario-panel` is 1,935 bytes / 1,040 gzip, `ct-planning-export-panel` is 3,989 bytes / 1,427 gzip, and `ct-planning-tools` is 10,003 bytes / 3,131 gzip.
- `npm run smoke:web-text-encoding`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files/docs remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT export active scenario summary packet

- [x] Added a portable focused-scenario summary to the CT export packet.
  - Implementation: `CtPlanningExportPacket` now includes nullable `activeScenarioSummary`, while the base export builder returns `null` until UI artifact state is attached.
  - DOD practice: portable handoff facts should be typed packet fields, not only rendered card text.
  - Rejected alternative: infer scenario counts from visible chips; external workflow consumers cannot read React output.
  - Microsecond estimate: 0 measured; one nullable packet field and object spread in memoized UI state.
- [x] Split scenario summary logic away from React UI.
  - Implementation: `ctPlanningExportScenarioSummary.ts` owns labels, counts, detail, tone, next action, and `buildCtPlanningExportScenarioSummary`.
  - DOD practice: logic chunk stays reusable and testable without pulling the TSX panel into CT tools.
  - Rejected alternative: keep summary logic inside `ctPlanningExportScenarioPanel.tsx`; that made the packet summary visual-component-owned.
  - Microsecond estimate: 0 measured; module split only.
- [x] Enriched workflow and handoff with the same packet instance.
  - Implementation: `CtPlanningToolsPanel` attaches the active scenario summary after artifact command state is known, then passes the enriched export packet to workflow and handoff panels.
  - DOD practice: one packet route for the active scenario summary.
  - Rejected alternative: pass one packet to workflow and another to handoff; that would split the handoff truth.
  - Microsecond estimate: 0 measured; memoized object creation only.
- [x] Locked split, budget, source smoke, and docs.
  - Implementation: vite/manual chunk, bundle budget, code-split smoke, imaging usability smoke, and CT docs now cover `ct-planning-export-scenario-summary`.
  - DOD practice: executable proof protects the packet field and chunk boundary.
  - Rejected alternative: documentation-only; a future import could silently merge logic back into CT tools.
  - Microsecond estimate: 0 measured; static source proof only.

## Verification: CT export active scenario summary packet

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-export` is 7,783 bytes / 2,821 gzip, `ct-planning-export-scenario-summary` is 1,423 bytes / 812 gzip, `ct-planning-export-scenario-panel` is 837 bytes / 473 gzip, and `ct-planning-tools` is 10,153 bytes / 3,192 gzip.
- `npm run smoke:web-text-encoding`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files/docs remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT workflow active scenario focus

- [x] Surfaced the selected CT scenario inside the workflow board.
  - Implementation: `CtPlanningWorkflowPlan` now includes nullable `selectedScenario`, derived from `exportPacket.activeScenarioSummary`.
  - DOD practice: one packet route for active scenario facts; workflow does not recalculate chip status separately.
  - Rejected alternative: keep workflow focused only by `selectedPhaseId`; that highlights a phase but hides selected route counts and next action.
  - Microsecond estimate: 0 measured; one tiny object projection from an already memoized export packet.
- [x] Kept true blockers separate from the doctor's selected route.
  - Implementation: `activePhaseId` still points to the first unfinished phase, while `selectedScenario` renders a separate focus card.
  - DOD practice: the current scenario can be visible without masking the first clinical blocker.
  - Rejected alternative: replace `activePhaseId` with the selected scenario; that would hide earlier blockers in the plan.
  - Microsecond estimate: 0 measured; render-only conditional card.
- [x] Fixed workflow panel encoding while adding the new card.
  - Implementation: `ctPlanningWorkflowPanel.tsx` now stores visible Russian UI text as normal UTF-8 and passes the web text encoding smoke.
  - DOD practice: no mojibake in user-facing CT workflow copy.
  - Rejected alternative: keep matching existing terminal mojibake; `smoke:web-text-encoding` correctly rejected it.
  - Microsecond estimate: 0 measured; source hygiene only.
- [x] Locked workflow focus with source smoke, CSS and docs.
  - Implementation: imaging usability smoke now requires `CtPlanningWorkflowScenarioFocus`, `selectedScenarioFocus(input.exportPacket)`, focus card UI, and `.ct-planning-workflow-focus`; CT docs record the behavior.
  - DOD practice: executable source contract protects the one-route workflow summary.
  - Rejected alternative: docs-only note; future workflow regressions would not fail CI.
  - Microsecond estimate: 0 measured; static source proof only.

## Verification: CT workflow active scenario focus

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-workflow-plan` is 5,032 bytes / 2,012 gzip, `ct-planning-workflow-panel` is 1,813 bytes / 730 gzip, and `ct-planning-tools` is 10,153 bytes / 3,193 gzip.
- `npm run smoke:dicom-folder-workup`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files/docs remain.
- Process check: transient `node.exe` entries were gone on re-check; no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT release gate active scenario dominance

- [x] Made active scenario blockers dominate the CT release gate.
  - Implementation: `buildReleaseGate` now reads `packet.activeScenarioSummary`; blocked selected scenario returns a blocked release gate.
  - DOD practice: a focused clinical route cannot be handed off as ready while its own required artifact is blocked.
  - Rejected alternative: leave the blocker only in the scenario card below the release gate; that lets the top release decision look safer than the selected route.
  - Microsecond estimate: 0 measured; one nullable object read and two branches.
- [x] Kept packet-level hard blockers stronger than draft scenario state.
  - Implementation: a warning active scenario can downgrade ready/warning packets to draft, but it does not downgrade an already blocked packet.
  - DOD practice: hard transfer blockers stay dominant while selected scenario drafts still stop false fixation.
  - Rejected alternative: let scenario warning override packet blocked; that would hide missing viewer state or clinical blockers.
  - Microsecond estimate: 0 measured; branch-only release logic.
- [x] Locked the behavior with source smoke and docs.
  - Implementation: imaging usability smoke now requires `const scenario = packet.activeScenarioSummary`, blocked scenario dominance, and warning scenario draft handling; CT docs record the gate rule.
  - DOD practice: executable source contract protects the release gate semantics.
  - Rejected alternative: docs-only note; a future refactor could return to packet-status-only release.
  - Microsecond estimate: 0 measured; static source proof only.

## Verification: CT release gate active scenario dominance

- `npm run smoke:web-text-encoding`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-export-panel` is 4,357 bytes / 1,515 gzip, `ct-planning-export-scenario-summary` is 1,423 bytes / 812 gzip, and `ct-planning-tools` is 10,153 bytes / 3,193 gzip.
- `npm run smoke:dicom-folder-workup`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files/docs remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT active scenario issue lists

- [x] Added typed non-ready artifact lists to the active CT scenario summary.
  - Implementation: `CtPlanningExportScenarioSummary` now carries `draftArtifacts` and `blockedArtifacts` as typed id/title/status/blocker records.
  - DOD practice: portable packet metadata owns the exact unfinished artifact identities; UI text is not parsed.
  - Rejected alternative: keep only ready/draft/blocked counts; counts tell severity but not which artifact blocks handoff.
  - Microsecond estimate: 0 measured; one tiny reduce over the already focused scenario artifact list.
- [x] Made workflow and handoff consume the portable issue lists.
  - Implementation: workflow focus exposes `issueTitles`, and the scenario handoff panel can rebuild chips from `activeScenarioSummary` when visual artifact props are absent.
  - DOD practice: one packet route for current CT scenario blockers across workflow, handoff and future API consumers.
  - Rejected alternative: require React to pass `scenarioArtifacts` everywhere; that breaks portable handoff and external viewer adapters.
  - Microsecond estimate: 0 measured; render-only chips from a bounded list.
- [x] Locked the behavior with source smoke, CSS and docs.
  - Implementation: smoke now requires issue lists, summary fallback chips, workflow issue chips and CSS coverage; CT docs record the typed metadata contract.
  - DOD practice: executable source contract protects non-ready artifact identity from regressing into localized copy.
  - Rejected alternative: docs-only note; future refactor could drop the typed lists while keeping the visual counts.
  - Microsecond estimate: 0 measured; static source proof only.

## Verification: CT active scenario issue lists

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-export-scenario-summary` is 1,746 bytes / 912 gzip, `ct-planning-export-scenario-panel` is 1,145 bytes / 627 gzip, `ct-planning-workflow-plan` is 5,115 bytes / 2,049 gzip, `ct-planning-workflow-panel` is 2,032 bytes / 772 gzip, and `ct-planning-tools` is 10,153 bytes / 3,194 gzip.
- `npm run smoke:dicom-folder-workup`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files/docs remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT active scenario handoff route

- [x] Added typed route metadata to the active CT scenario summary.
  - Implementation: `CtPlanningExportScenarioSummary` now carries `route.owner`, `ownerLabel`, `deliverable`, and `confirmation` resolved from the exact `activeQuickActionId`.
  - DOD practice: handoff route is packet metadata, not a label inferred from React UI or shared viewer tool ids.
  - Rejected alternative: derive owner from phase selection; the same phase can contain ruler, ROI, canal or implant-library scenarios with different handoff meaning.
  - Microsecond estimate: 0 measured; one map lookup per enriched export packet.
- [x] Surfaced the route in workflow and handoff.
  - Implementation: workflow focus exposes route label and confirmation; export scenario card shows owner, expected deliverable and confirmation beside readiness chips.
  - DOD practice: doctor/admin/lab can see what the active route is supposed to produce before release.
  - Rejected alternative: keep route only in docs; operators need the target outcome in the live CT packet.
  - Microsecond estimate: 0 measured; string projection and render-only text.
- [x] Locked route metadata with source smoke and docs.
  - Implementation: smoke now requires route type, route mapping, exact quick-action route lookup, workflow route projection and scenario-card route rendering; CT docs record the route contract.
  - DOD practice: executable source contract prevents future regression back to generic scenario labels.
  - Rejected alternative: bundle-only proof; a valid build would not prove route ownership survived refactor.
  - Microsecond estimate: 0 measured; static source proof only.

## Verification: CT active scenario handoff route

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-export-scenario-summary` is 3,656 bytes / 1,439 gzip, `ct-planning-export-scenario-panel` is 1,248 bytes / 674 gzip, `ct-planning-workflow-plan` is 5,208 bytes / 2,087 gzip, `ct-planning-workflow-panel` is 2,130 bytes / 794 gzip, and `ct-planning-tools` is 10,153 bytes / 3,195 gzip.
- `npm run smoke:dicom-folder-workup`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files/docs remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT active scenario viewer preset

- [x] Added typed viewer preset metadata to the active CT scenario summary.
  - Implementation: `CtPlanningExportScenarioSummary` now carries `viewer.projection`, `viewLabel`, `windowPreset`, `windowLabel`, `slabMm`, and `requiresVolume` resolved from exact `activeQuickActionId`.
  - DOD practice: portable handoff knows the intended CT view context; consumers do not infer OPG/oblique/3D/library mode from localized UI copy.
  - Rejected alternative: import the full CT planning catalog into the summary chunk; that risks chunk coupling and budget growth.
  - Microsecond estimate: 0 measured; one viewer preset lookup per enriched export packet.
- [x] Surfaced viewer preset in workflow and handoff.
  - Implementation: workflow focus exposes `viewerLabel`; export scenario card shows view, window, slab and no-volume flag for library-only route.
  - DOD practice: doctor/admin/lab can see the intended viewer setup before transfer or release.
  - Rejected alternative: keep projection/window only in hidden metadata; operators need to confirm they are looking at the right CT context.
  - Microsecond estimate: 0 measured; render-only short labels.
- [x] Kept the summary chunk under budget after the first failure.
  - Implementation: initial object-literal preset map built to 5,178 bytes and failed the 5,000 byte limit; replaced repeated object literals with `viewerPreset(...)` factory.
  - DOD practice: budget was fixed by compression, not by raising the limit.
  - Rejected alternative: increase `ct planning export scenario summary` budget; the data fit under the existing limit.
  - Microsecond estimate: 0 measured; bundle-size correction only.

## Verification: CT active scenario viewer preset

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed after compression; `ct-planning-export-scenario-summary` is 4,602 bytes / 1,734 gzip, `ct-planning-export-scenario-panel` is 1,408 bytes / 735 gzip, `ct-planning-workflow-plan` is 5,298 bytes / 2,121 gzip, `ct-planning-workflow-panel` is 2,187 bytes / 807 gzip, and `ct-planning-tools` is 10,153 bytes / 3,192 gzip.
- `npm run smoke:dicom-folder-workup`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files/docs remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT active scenario viewer restore commands

- [x] Added ordered machine-readable restore commands to the active CT scenario summary.
  - Implementation: `CtPlanningExportScenarioViewerPreset.restoreCommands` now emits `load_volume` or `metadata_only`, plus `projection:*`, `window:*`, and `slab:*` tokens.
  - DOD practice: portable CT handoff can restore the selected viewer context without scraping visible labels.
  - Rejected alternative: rely on `viewLabel` and `windowLabel`; labels are for operators, not adapter commands.
  - Microsecond estimate: 0 measured; commands are created with the compact viewer preset object.
- [x] Exposed restore commands to workflow and handoff DOM metadata.
  - Implementation: workflow focus and export scenario card now set `data-viewer-restore` from the same summary command list.
  - DOD practice: external viewer bridges and tests can read the exact restore route without re-running planning logic.
  - Rejected alternative: render commands as visible text; that adds UI noise and is not needed for doctors.
  - Microsecond estimate: 0 measured; one `join("|")` per focused card render.
- [x] Locked command contract with source smoke and docs.
  - Implementation: smoke requires command generation for volume/metadata mode, projection, window and slab, plus DOM metadata exposure; CT docs record the command string contract.
  - DOD practice: executable source contract protects adapter-facing restore semantics.
  - Rejected alternative: docs-only command convention; future refactor could silently drop the adapter path.
  - Microsecond estimate: 0 measured; static source proof only.

## Verification: CT active scenario viewer restore commands

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-export-scenario-summary` is 4,696 bytes / 1,792 gzip, `ct-planning-export-scenario-panel` is 1,465 bytes / 762 gzip, `ct-planning-workflow-plan` is 5,345 bytes / 2,139 gzip, `ct-planning-workflow-panel` is 2,260 bytes / 837 gzip, and `ct-planning-tools` is 10,153 bytes / 3,194 gzip.
- `npm run smoke:dicom-folder-workup`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings in large web files/docs remain.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT viewer restore bridge chunk

- [x] Moved CT viewer restore command ownership into a dedicated adapter module.
  - Implementation: `ctPlanningViewerRestore.ts` now owns `CtPlanningViewerRestoreCommand`, the volume/metadata + projection/window/slab command builder, and the serializer used by workflow and handoff panels.
  - DOD practice: the portable adapter contract has one owner and can be consumed by OHIF/Cornerstone/local viewer bridges without parsing scenario summary internals.
  - Rejected alternative: keep `.join("|")` and command construction inside UI/summary modules; that duplicated adapter syntax and kept the summary chunk close to its budget.
  - Microsecond estimate: 0 measured; metadata-only string tokens and one join per focused scenario render.
- [x] Kept CT restore code split and budgeted.
  - Implementation: Vite now emits `ct-planning-viewer-restore`, and bundle/code-split smokes require it.
  - DOD practice: adapter code is budgeted separately instead of hiding inside the scenario summary or panel chunks.
  - Rejected alternative: raise the 5 KB scenario summary budget; the split keeps summary under budget and adds a 200 byte restore chunk.
  - Microsecond estimate: 0 measured; bundle ownership change only.
- [x] Tightened workflow typing after the first typecheck failure.
  - Implementation: `CtPlanningWorkflowScenarioFocus.viewerRestoreCommands` now uses `CtPlanningViewerRestoreCommand[]` instead of `string[]`.
  - DOD practice: restore tokens cannot degrade to arbitrary strings between packet summary and UI metadata.
  - Rejected alternative: widen the serializer to accept `string[]`; that would erase the adapter contract TypeScript was protecting.
  - Microsecond estimate: 0 measured; compile-time contract only.

## Verification: CT viewer restore bridge chunk

- `npm run typecheck -w @dental/web`: failed once on `viewerRestoreCommands: string[]`; fixed by importing `CtPlanningViewerRestoreCommand` into `ctPlanningWorkflowPlan.ts`, then passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-viewer-restore` is 200 bytes / 166 gzip, `ct-planning-export-scenario-summary` is 4,738 bytes / 1,804 gzip, `ct-planning-export-scenario-panel` is 1,519 bytes / 780 gzip, `ct-planning-workflow-panel` is 2,314 bytes / 856 gzip, and `ct-planning-tools` is 10,153 bytes / 3,192 gzip.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain in large web files and DENTE logs.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT viewer bridge readiness manifest

- [x] Added packet-level volume readiness for viewer restore decisions.
  - Implementation: `CtPlanningExportPacket.volumeReady` is derived from `volumeBlockedTasks === 0` and travels with the handoff packet.
  - DOD practice: viewer bridge readiness no longer guesses volume availability from localized missing-artifact text.
  - Rejected alternative: parse `missingArtifacts` strings in UI; that would bind adapter logic to Russian copy and mojibake-prone text.
  - Microsecond estimate: 0 measured; one boolean assigned while building the export packet.
- [x] Added typed viewer bridge manifest.
  - Implementation: `buildCtPlanningViewerBridgeManifest` returns status, status label, adapter label, serialized command string, command count, and optional blocker from restore commands plus volume readiness.
  - DOD practice: external OHIF/Cornerstone/local viewer bridges have one typed manifest instead of mixing UI labels with command strings.
  - Rejected alternative: show only raw `data-viewer-restore`; operators need visible restore readiness and adapters need stable metadata.
  - Microsecond estimate: 0 measured; four-command metadata path only, no pixel work.
- [x] Surfaced bridge readiness in workflow and handoff UI metadata.
  - Implementation: workflow focus exposes `data-viewer-bridge-status` and a visible bridge label; handoff scenario panel shows `ct-planning-viewer-bridge` with bridge readiness and adapter summary.
  - DOD practice: doctor/admin/lab can see whether the selected route restores volume, metadata-only mode, or is blocked by missing CT volume.
  - Rejected alternative: keep bridge readiness hidden in tests; handoff operators need to catch wrong-volume routes before transfer.
  - Microsecond estimate: 0 measured; one short card line per focused scenario.

## Verification: CT viewer bridge readiness manifest

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-text-encoding`: passed; also caught no mojibake after rewriting the small scenario panel with clean separators.
- `npm run smoke:web-code-split-source`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-viewer-restore` is 960 bytes / 459 gzip, `ct-planning-export-scenario-summary` is 4,738 bytes / 1,805 gzip, `ct-planning-export-scenario-panel` is 1,893 bytes / 891 gzip, `ct-planning-workflow-plan` is 5,673 bytes / 2,265 gzip, `ct-planning-workflow-panel` is 2,443 bytes / 884 gzip, and `ct-planning-tools` is 10,153 bytes / 3,191 gzip.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain in large web files and DENTE logs.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT viewer restore parser

- [x] Added parser for serialized viewer restore strings.
  - Implementation: `parseCtPlanningViewerRestoreCommandString` validates command count, restore mode, projection token, window token, and positive slab value.
  - DOD practice: external adapters can validate `data-viewer-restore` before applying it to OHIF/Cornerstone/local viewer state.
  - Rejected alternative: trust the DOM string because CRM generated it; bridge consumers may receive copied or stale strings and need a local gate.
  - Microsecond estimate: 0 measured; four token checks on a focused handoff string.
- [x] Folded parser validity into bridge manifest and DOM metadata.
  - Implementation: `CtPlanningViewerBridgeManifest` now carries `restoreValid` and `parseError`; workflow and handoff expose `data-viewer-restore-valid`.
  - DOD practice: bad restore syntax blocks as bridge metadata instead of silently reaching the viewer adapter.
  - Rejected alternative: expose only commandString; that gives no proof that the string is safe to consume.
  - Microsecond estimate: 0 measured; parser runs once per focused bridge manifest.
- [x] Locked parser contract with smoke and docs.
  - Implementation: source smoke requires parser result type, invalid token checks, parse error propagation, and DOM restore-valid metadata; CT docs record the parser boundary.
  - DOD practice: future edits cannot remove adapter-side restore validation without breaking smoke.
  - Rejected alternative: rely on TypeScript types only; DOM strings are runtime data and need runtime validation.
  - Microsecond estimate: 0 measured; static source proof only.

## Verification: CT viewer restore parser

- `npm run typecheck -w @dental/web`: failed once on array token `undefined` safety; fixed with explicit fallback strings, then passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-viewer-restore` is 2,569 bytes / 993 gzip, `ct-planning-export-scenario-summary` is 4,738 bytes / 1,803 gzip, `ct-planning-export-scenario-panel` is 1,951 bytes / 911 gzip, `ct-planning-workflow-plan` is 5,707 bytes / 2,272 gzip, `ct-planning-workflow-panel` is 2,524 bytes / 902 gzip, and `ct-planning-tools` is 10,153 bytes / 3,195 gzip.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain in large web files and DENTE logs.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT viewer bridge apply plan

- [x] Added ordered apply plan for validated viewer restore strings.
  - Implementation: `buildCtPlanningViewerBridgeApplyPlan` parses `data-viewer-restore` and emits four ordered steps: volume/metadata mode, projection, window preset, and slab.
  - DOD practice: external OHIF/Cornerstone/local viewer bridges can consume one normalized apply route instead of reimplementing command parsing and ordering.
  - Rejected alternative: make every adapter parse and order tokens independently; that would create multiple route owners for one handoff fact.
  - Microsecond estimate: 0 measured; four small step objects after parser validation.
- [x] Exposed apply-step count in bridge manifest and DOM metadata.
  - Implementation: `CtPlanningViewerBridgeManifest.applyStepCount` is derived from the apply plan; workflow and handoff cards expose `data-viewer-apply-steps`.
  - DOD practice: bridge consumers and tests can prove the selected scenario has a complete four-step restore plan before applying it.
  - Rejected alternative: rely only on `commandCount`; command count proves token count, not normalized adapter steps.
  - Microsecond estimate: 0 measured; one integer copied to focused scenario metadata.
- [x] Locked apply-plan contract with source smoke and docs.
  - Implementation: source smoke requires apply plan type/function, volume/projection/window/slab targets, manifest step count, and DOM apply-step metadata; CT docs record the boundary.
  - DOD practice: future CT viewer bridge work cannot remove the ordered apply contract without failing smoke.
  - Rejected alternative: documentation-only adapter order; source smoke is the regression gate.
  - Microsecond estimate: 0 measured; static source proof only.

## Verification: CT viewer bridge apply plan

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-viewer-restore` is 3,285 bytes / 1,176 gzip, `ct-planning-export-scenario-summary` is 4,738 bytes / 1,803 gzip, `ct-planning-export-scenario-panel` is 1,994 bytes / 930 gzip, `ct-planning-workflow-plan` is 5,745 bytes / 2,287 gzip, `ct-planning-workflow-panel` is 2,590 bytes / 922 gzip, and `ct-planning-tools` is 10,153 bytes / 3,191 gzip.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain in large web files and DENTE logs.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT viewer bridge launch payload

- [x] Added a typed launch payload for external CT viewer bridges.
  - Implementation: `buildCtPlanningViewerBridgeLaunchPayload` wraps the validated manifest and normalized apply plan into target/status/pixel-policy/command/apply-step/blocker data.
  - DOD practice: adapter launch metadata now has one owner before OHIF, Cornerstone, or a local bridge consumes the active CT scenario.
  - Rejected alternative: let each UI panel infer pixel policy and adapter target independently; that would split one handoff route into several owners.
  - Microsecond estimate: 0 measured; one parser/apply-plan pass for the selected scenario only.
- [x] Exposed adapter target and pixel policy in workflow and handoff DOM metadata.
  - Implementation: workflow selected scenario carries `viewerAdapterTarget` and `viewerPixelPolicy`; workflow and handoff cards expose `data-viewer-adapter-target` and `data-viewer-pixel-policy`.
  - DOD practice: external launch code can distinguish metadata-only handoff from external-volume restore without scraping visible copy.
  - Rejected alternative: expose only `data-viewer-bridge-status`; status does not say whether pixel work is forbidden in CRM or expected in an external viewer.
  - Microsecond estimate: 0 measured; two short data attributes on the focused cards.
- [x] Locked launch-payload behavior with source smoke and docs.
  - Implementation: source smoke now requires launch payload type/function, local bridge default, metadata-only pixel policy, external-volume policy, apply steps, and DOM adapter/pixel metadata; CT docs record the boundary.
  - DOD practice: future CT bridge work cannot silently collapse metadata-only routes into fake CRM pixel rendering.
  - Rejected alternative: documentation-only boundary; the smoke is the regression gate.
  - Microsecond estimate: 0 measured; static source proof only.

## Verification: CT viewer bridge launch payload

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-viewer-restore` is 3,612 bytes / 1,291 gzip, `ct-planning-export-scenario-panel` is 2,123 bytes / 986 gzip, `ct-planning-workflow-plan` is 5,861 bytes / 2,352 gzip, `ct-planning-workflow-panel` is 2,722 bytes / 958 gzip, and `ct-planning-tools` is 10,153 bytes / 3,191 gzip.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain in large web files and DENTE logs.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT viewer bridge launch gate

- [x] Added a launch gate on top of the viewer bridge payload.
  - Implementation: `buildCtPlanningViewerBridgeLaunchGate` checks required adapter targets for metadata-only and volume restore routes, returns `volume_ready`, `metadata_ready`, or `blocked`, and exposes missing targets.
  - DOD practice: launch readiness is derived in one adapter-contract module before OHIF, Cornerstone, or a local bridge consumes the scenario.
  - Rejected alternative: infer readiness from `status` alone; status does not prove the normalized apply steps contain the targets needed by the adapter.
  - Microsecond estimate: 0 measured; one Set over four apply steps for the selected scenario only.
- [x] Exposed launch gate metadata through workflow and handoff cards.
  - Implementation: selected workflow scenario carries `viewerLaunchGateStatus` and `viewerCanLaunch`; workflow and handoff cards expose `data-viewer-launch-gate` and `data-viewer-can-launch`.
  - DOD practice: external bridge code can decide launch, block, or metadata-only handoff without parsing Russian text or duplicating gate logic.
  - Rejected alternative: show the gate only as visible UI copy; launch code needs machine-readable proof.
  - Microsecond estimate: 0 measured; two data attributes on the focused cards.
- [x] Locked launch gate with source smoke and docs.
  - Implementation: source smoke requires the launch gate type/function, metadata and volume target lists, missing target exposure, explicit gate statuses, and DOM metadata; CT docs record the boundary.
  - DOD practice: future edits cannot remove the last pre-launch check without failing smoke.
  - Rejected alternative: rely on bundle/build only; those prove syntax, not clinical handoff route semantics.
  - Microsecond estimate: 0 measured; static source proof only.

## Verification: CT viewer bridge launch gate

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-viewer-restore` is 4,060 bytes / 1,450 gzip, `ct-planning-export-scenario-panel` is 2,229 bytes / 1,029 gzip, `ct-planning-workflow-plan` is 5,935 bytes / 2,384 gzip, `ct-planning-workflow-panel` is 2,865 bytes / 994 gzip, and `ct-planning-tools` is 10,153 bytes / 3,191 gzip.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain in large web files and DENTE logs.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT viewer bridge audit record

- [x] Added a versioned audit record for viewer bridge handoff.
  - Implementation: `CtPlanningViewerBridgeAuditRecord` and `buildCtPlanningViewerBridgeAuditRecord` store target, gate status, launch decision, pixel policy, apply-step count, missing-target count, blocker, and exact restore command string.
  - DOD practice: future OHIF/Cornerstone/local bridge adapters can log one compact proof record without scraping UI text.
  - Rejected alternative: rely on DOM attributes only; they expose launch facts but not a single portable audit object.
  - Microsecond estimate: 0 measured; one small object built for the selected scenario only.
- [x] Exposed audit proof metadata in workflow and handoff cards.
  - Implementation: workflow selected scenario carries `viewerAuditVersion` and `viewerMissingTargetCount`; workflow and handoff cards expose `data-viewer-audit-version` and `data-viewer-missing-targets`.
  - DOD practice: automated adapters can verify bridge contract version and missing target count before consuming launch data.
  - Rejected alternative: add visible audit text; this is machine proof, not operator copy.
  - Microsecond estimate: 0 measured; two compact data attributes on focused cards.
- [x] Locked audit record with source smoke and docs.
  - Implementation: source smoke requires the audit type/function, stable version, missing target count, restore command retention, and DOM metadata; CT docs record the audit boundary.
  - DOD practice: future bridge edits cannot remove audit proof without failing smoke.
  - Rejected alternative: rely on build/budget; they do not prove handoff audit semantics.
  - Microsecond estimate: 0 measured; static source proof only.

## Verification: CT viewer bridge audit record

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-viewer-restore` is 4,405 bytes / 1,556 gzip, `ct-planning-export-scenario-panel` is 2,349 bytes / 1,080 gzip, `ct-planning-workflow-plan` is 6,041 bytes / 2,433 gzip, `ct-planning-workflow-panel` is 3,005 bytes / 1,026 gzip, and `ct-planning-tools` is 10,153 bytes / 3,193 gzip.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain in large web files and DENTE logs.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT viewer bridge audit chunk split

- [x] Split viewer bridge audit proof out of the restore contract chunk.
  - Implementation: created `ctPlanningViewerBridgeAudit.ts` with `CtPlanningViewerBridgeAuditRecord` and `buildCtPlanningViewerBridgeAuditRecord`; `ctPlanningViewerRestore.ts` keeps restore/parser/apply/payload/gate only.
  - DOD practice: the critical restore adapter contract regained bundle headroom while audit proof remains separately importable.
  - Rejected alternative: raise the 5 KB restore budget; that would hide growth instead of controlling the boundary.
  - Microsecond estimate: 0 measured; runtime behavior is the same object build, bundle route is smaller and cleaner.
- [x] Added manual chunk and budget coverage for audit.
  - Implementation: Vite now emits `ct-planning-viewer-bridge-audit`; bundle budget measures it separately at 3 KB / 2 KB gzip max.
  - DOD practice: audit growth is visible instead of silently inflating restore/parser/gate code.
  - Rejected alternative: depend on generic chunking; explicit CT subchunks are the existing optimization pattern in this codebase.
  - Microsecond estimate: 0 measured; source-split proof only.
- [x] Updated source smoke and docs for the split.
  - Implementation: source smoke reads `ctPlanningViewerBridgeAudit.ts`, requires audit type/function/version/missing-target/restore-command proof there, and checks code-split/budget entries.
  - DOD practice: future edits cannot move audit back into the restore chunk or remove its budget proof silently.
  - Rejected alternative: rely on production build output alone; source smoke catches the architectural boundary earlier.
  - Microsecond estimate: 0 measured; static source proof only.

## Verification: CT viewer bridge audit chunk split

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-viewer-restore` is 4,060 bytes / 1,450 gzip, `ct-planning-viewer-bridge-audit` is 354 bytes / 219 gzip, `ct-planning-export-scenario-panel` is 2,403 bytes / 1,092 gzip, `ct-planning-workflow-plan` is 6,100 bytes / 2,456 gzip, `ct-planning-workflow-panel` is 3,005 bytes / 1,026 gzip, and `ct-planning-tools` is 10,153 bytes / 3,192 gzip.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain in large web files and DENTE logs.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT viewer bridge launch chunk split

- [x] Split launch payload/gate out of the restore contract chunk.
  - Implementation: created `ctPlanningViewerBridgeLaunch.ts` with `CtPlanningViewerBridgeLaunchPayload`, `CtPlanningViewerBridgeLaunchGate`, `buildCtPlanningViewerBridgeLaunchPayload`, and `buildCtPlanningViewerBridgeLaunchGate`; `ctPlanningViewerRestore.ts` keeps restore command, parser, apply plan, and manifest.
  - DOD practice: the critical restore adapter contract regained bundle headroom while launch policy remains separately importable.
  - Rejected alternative: raise the restore budget; that would hide growth instead of controlling the boundary.
  - Microsecond estimate: 0 measured; runtime behavior is the same selected-scenario object assembly, bundle route is smaller.
- [x] Added manual chunk and budget coverage for launch.
  - Implementation: Vite now emits `ct-planning-viewer-bridge-launch`; bundle budget measures it separately at 3 KB / 2 KB gzip max.
  - DOD practice: launch/gate growth is visible instead of silently inflating restore/parser/manifest code.
  - Rejected alternative: rely on default Rollup splitting; explicit CT subchunks are the established optimization contract here.
  - Microsecond estimate: 0 measured; source-split proof only.
- [x] Updated source smoke and docs for the split.
  - Implementation: source smoke reads `ctPlanningViewerBridgeLaunch.ts`, requires launch type/function/target/gate proof there, and checks code-split/budget entries; CT docs now describe the launch chunk boundary.
  - DOD practice: future edits cannot move launch policy back into the restore chunk or remove budget proof silently.
  - Rejected alternative: rely on build output alone; source smoke catches the boundary earlier.
  - Microsecond estimate: 0 measured; static source proof only.

## Verification: CT viewer bridge launch chunk split

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-viewer-restore` is 3,292 bytes / 1,180 gzip, `ct-planning-viewer-bridge-launch` is 851 bytes / 471 gzip, `ct-planning-viewer-bridge-audit` is 354 bytes / 219 gzip, `ct-planning-export-scenario-panel` is 2,468 bytes / 1,109 gzip, `ct-planning-workflow-plan` is 6,155 bytes / 2,473 gzip, `ct-planning-workflow-panel` is 3,005 bytes / 1,026 gzip, and `ct-planning-tools` is 10,153 bytes / 3,190 gzip.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain in large web files and DENTE logs.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT viewer bridge handoff envelope

- [x] Added one composed bridge handoff contract for external CT viewers.
  - Implementation: created `ctPlanningViewerBridgeHandoff.ts` with `CtPlanningViewerBridgeEnvelope`, `CtPlanningViewerBridgeHandoff`, `serializeCtPlanningViewerBridgeEnvelope`, and `buildCtPlanningViewerBridgeHandoff`; it composes manifest, launch payload, launch gate, audit record, and a serialized no-pixel JSON envelope.
  - DOD practice: OHIF/Cornerstone/local bridge adapters can consume one stable contract instead of reconstructing state from scattered UI fields.
  - Rejected alternative: keep duplicated manifest/launch/gate/audit assembly in workflow and handoff UI; that creates two owners for the same bridge fact.
  - Microsecond estimate: 0 measured; one small JSON serialization for the selected scenario only.
- [x] Rewired workflow and scenario handoff UI to the composed handoff owner.
  - Implementation: `ctPlanningWorkflowPlan.ts` and `ctPlanningExportScenarioPanel.tsx` now call `buildCtPlanningViewerBridgeHandoff`; both expose `data-viewer-envelope-version` and `data-viewer-bridge-envelope` while preserving prior restore/gate/audit metadata.
  - DOD practice: one owner builds the payload, UI only displays/exports it.
  - Rejected alternative: add only another data attribute without centralizing the contract; that would increase drift.
  - Microsecond estimate: 0 measured; selected-scenario render only.
- [x] Added chunking, budget, source smoke, and docs for the envelope.
  - Implementation: Vite emits `ct-planning-viewer-bridge-handoff`; bundle budget measures it separately; imaging source smoke verifies envelope types/functions/data attributes; CT docs describe the no-pixel adapter envelope.
  - DOD practice: handoff growth is visible and cannot silently inflate panel or restore chunks.
  - Rejected alternative: leave the envelope inside export panel chunk; this would hide adapter contract growth inside UI.
  - Microsecond estimate: 0 measured; static source and bundle proof only.

## Verification: CT viewer bridge handoff envelope

- First `npm run typecheck -w @dental/web`: failed on `exactOptionalPropertyTypes` because `target: undefined` was passed to an optional property.
- Fix applied: `target` is now spread only when present; optional contract stays strict.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-viewer-bridge-handoff` is 939 bytes / 476 gzip, `ct-planning-viewer-restore` is 3,292 bytes / 1,180 gzip, `ct-planning-viewer-bridge-launch` is 851 bytes / 471 gzip, `ct-planning-viewer-bridge-audit` is 354 bytes / 219 gzip, `ct-planning-export-scenario-panel` is 2,548 bytes / 1,096 gzip, `ct-planning-workflow-plan` is 6,137 bytes / 2,426 gzip, `ct-planning-workflow-panel` is 3,147 bytes / 1,053 gzip, and `ct-planning-tools` is 10,153 bytes / 3,188 gzip.
- Aggregate JS gzip is 429,443 bytes under the 430,000-byte budget. This is a hard warning for the next slice.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain in large web files and DENTE logs.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT bridge budget recovery

- [x] Removed duplicate restore command serialization from CT workflow/handoff UI.
  - Implementation: workflow selected scenario now carries `viewerRestoreCommandString` from `handoff.manifest.commandString`; workflow panel and export scenario panel reuse it for legacy `data-viewer-restore`.
  - DOD practice: restore module remains the single serializer owner; UI exports normalized command string only.
  - Rejected alternative: leave serializer calls in UI after adding envelope; that keeps duplicate bridge routes.
  - Microsecond estimate: 0 measured; selected-scenario render only.
- [x] Compressed CT planning CSS selector lists.
  - Implementation: repeated CT card/status/typography selector groups in `main.css` now use `:is(...)` without changing class names or markup.
  - DOD practice: recover bundle budget before adding more CT viewer features.
  - Rejected alternative: raise aggregate JS/CSS budget; budget pressure is real.
  - Microsecond estimate: 0 measured; CSS download/parse byte reduction only.

## Verification: CT bridge budget recovery

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; aggregate JS gzip is 429,417 / 430,000; total gzip is 457,316 / 480,000. `ct-planning-viewer-restore` is 3,285 bytes / 1,176 gzip, `ct-planning-viewer-bridge-handoff` is 939 bytes / 475 gzip, `ct-planning-export-scenario-panel` is 2,484 bytes / 1,077 gzip, `ct-planning-workflow-panel` is 3,088 bytes / 1,025 gzip, `ct-planning-workflow-plan` is 6,142 bytes / 2,430 gzip, and `ct-planning-tools` is 10,153 bytes / 3,191 gzip.
- CSS budget recovered 259 raw bytes and 135 gzip bytes: `index-Ewmulf9q.css` is now 185,537 bytes / 27,899 gzip.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain in large web files and DENTE logs.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT viewer bridge DOM metadata owner

- [x] Added one shared DOM metadata builder for CT viewer bridge handoff attributes.
  - Implementation: created `ctPlanningViewerBridgeAttributes.ts` with `CtPlanningViewerBridgeDataAttributes` and `buildCtPlanningViewerBridgeDataAttributes`; it maps one handoff object to the full legacy `data-viewer-*` contract.
  - DOD practice: one bridge handoff fact now has one DOM metadata route; workflow and export panels no longer duplicate adapter attribute wiring.
  - Rejected alternative: keep identical `data-viewer-*` props in both UI chunks; that repeats machine contract strings and invites drift.
  - Microsecond estimate: 0 measured; selected-scenario render still spreads a small object.
- [x] Rewired workflow and export scenario panels to the shared attributes contract.
  - Implementation: workflow selected scenario carries `viewerBridgeAttributes`; `CtPlanningWorkflowPanel` spreads it; `CtPlanningExportScenarioPanel` builds the same attributes from the same handoff.
  - DOD practice: visible UI remains unchanged while machine-readable metadata is centralized.
  - Rejected alternative: store every bridge scalar on workflow scenario state; that bloats the workflow plan and duplicates the handoff envelope.
  - Microsecond estimate: 0 measured; byte-budget recovery only.
- [x] Kept the attributes helper inside the bridge-handoff chunk.
  - Implementation: Vite routes `ctPlanningViewerBridgeAttributes.ts` to `ct-planning-viewer-bridge-handoff`; no extra microchunk is emitted.
  - DOD practice: common bridge metadata is split out of panel chunks without creating a separate request for 690 raw bytes of helper code.
  - Rejected alternative: emit `ct-planning-viewer-bridge-attributes` as its own chunk; first build proved it worked but cost 304 gzip bytes as a separate asset.
  - Microsecond estimate: 0 measured; request-count and gzip evidence only.

## Verification: CT viewer bridge DOM metadata owner

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; aggregate JS gzip is 429,084 / 430,000 and total gzip is 456,983 / 480,000.
- Key chunks: `ct-planning-viewer-bridge-handoff` is 1,620 bytes / 655 gzip; `ct-planning-workflow-plan` is 5,649 bytes / 2,279 gzip; `ct-planning-workflow-panel` is 2,295 bytes / 831 gzip; `ct-planning-export-scenario-panel` is 1,865 bytes / 891 gzip; `ct-planning-tools` is 10,153 bytes / 3,193 gzip.
- Budget effect from the previous logged baseline: aggregate JS gzip recovered 333 bytes, from 429,417 to 429,084; total gzip recovered 333 bytes, from 457,316 to 456,983.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain in large web files and DENTE logs.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT active scenario bridge metadata owner

- [x] Moved selected scenario bridge metadata into active scenario summary.
  - Implementation: `buildCtPlanningExportScenarioSummary` now builds one bridge handoff from the selected viewer preset and packet volume readiness, then stores the shared DOM metadata on `summary.bridge`.
  - DOD practice: one selected scenario fact owns route, viewer preset, artifact readiness, and bridge metadata.
  - Rejected alternative: keep rebuilding handoff in workflow and export scenario panel; that duplicates contract ownership and UI chunks.
  - Microsecond estimate: 0 measured; selected-scenario object assembly only.
- [x] Rewired workflow and handoff cards to read the portable summary bridge.
  - Implementation: workflow uses `summary.bridge.label` and `summary.bridge.attrs`; handoff card spreads the same object into the existing `data-viewer-*` contract.
  - DOD practice: panels render state; summary owns the portable handoff contract.
  - Rejected alternative: pass a separate UI-only bridge model; it would recreate the second route.
  - Microsecond estimate: 0 measured.
- [x] Kept technical blockers out of visible scenario copy.
  - Implementation: visible card shows doctor-readable bridge readiness; technical blocker stays in serialized envelope metadata.
  - DOD practice: clinician UI avoids raw adapter failure strings while adapters retain full metadata.
  - Rejected alternative: surface bridge adapter blockers directly in the card.
  - Microsecond estimate: 0 measured.
- [x] Recovered the summary chunk budget without raising limits.
  - Implementation: shortened internal bridge field naming and rare no-artifact fallback copy.
  - DOD practice: preserve the existing external DOM/envelope contract while keeping the focused summary chunk under its hard limit.
  - Rejected alternative: raise `ct-planning-export-scenario-summary` above 5,000 bytes.
  - Microsecond estimate: 0 measured; bundle-byte proof only.

## Verification: CT active scenario bridge metadata owner

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-export-scenario-summary` is 4,959 bytes / 1,878 gzip, `ct-planning-export-scenario-panel` is 1,509 bytes / 764 gzip, `ct-planning-workflow-plan` is 5,369 bytes / 2,150 gzip, `ct-planning-viewer-bridge-handoff` is 1,620 bytes / 648 gzip, and `ct-planning-tools` is 10,153 bytes / 3,193 gzip.
- Aggregate JS gzip is 428,874 / 430,000; total gzip is 456,773 / 480,000.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain in large web files and DENTE logs.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT fallback clinical labels

- [x] Removed raw viewer enum fallback from CT planning snapshot copy.
  - Implementation: when the backend planning task bundle is absent, `taskSummaryLabel` now uses a compact Russian CT-tool fallback instead of `activeTool.replace(/_/g, " ")`.
  - DOD practice: clinician-facing state never exposes internal enum ids.
  - Rejected alternative: add a full local tool-label dictionary in `ctPlanningState`; first build proved it pushed the chunk over budget.
  - Microsecond estimate: 0 measured; string fallback only.
- [x] Removed raw MIP projection wording from CT planning task labels.
  - Implementation: CT task projection label now shows `????? ?????????` instead of `MIP`.
  - DOD practice: dense-structure views use doctor-readable copy, not renderer jargon.
  - Rejected alternative: leave MIP in CT planning because global MPR labels already avoid it; this panel had its own label map.
  - Microsecond estimate: 0 measured.
- [x] Added source-smoke guards for CT planning fallback labels.
  - Implementation: smoke now requires the Russian fallback, requires density-map projection wording, and forbids enum replacement plus raw `MIP` in CT planning state.
  - DOD practice: UI wording regression is blocked at source level.
  - Rejected alternative: rely on visual review; this is a cheap static contract.
  - Microsecond estimate: 0 measured.

## Verification: CT fallback clinical labels

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- First budget attempt with a full active-tool dictionary failed: `ct-planning-state` 8,414 bytes over the 8,000-byte limit.
- Final `npm run smoke:web-bundle-budget`: passed; `ct-planning-state` is 7,841 bytes / 3,142 gzip, aggregate JS gzip is 428,875 / 430,000, and total gzip is 456,774 / 480,000.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain in large web files and DENTE logs.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT package target clinical labels

- [x] Removed raw tool-state target ids from the CT package card.
  - Implementation: `CtPlanningToolsPanel` maps `toolStateBundle.target` through `toolStateTargetLabels` before rendering the package card.
  - DOD practice: adapter ids remain machine state; clinician card gets readable labels.
  - Rejected alternative: render `cornerstone3d`, `generic_json`, or `external_viewer` directly because they are technically precise; visible CRM UI must be operator-readable.
  - Microsecond estimate: 0 measured; one object lookup in render.
- [x] Added source-smoke guards for package target wording.
  - Implementation: smoke requires `toolStateTargetLabels`, requires indexed rendering, and forbids the old raw-target JSX expression.
  - DOD practice: source-level UI contract blocks raw adapter-id regression.
  - Rejected alternative: rely on manual QA; the raw expression is easy to catch statically.
  - Microsecond estimate: 0 measured.

## Verification: CT package target clinical labels

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-tools` is 10,319 bytes / 3,275 gzip, `ct-planning-state` is 7,841 bytes / 3,142 gzip, aggregate JS gzip is 428,958 / 430,000, and total gzip is 456,857 / 480,000.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain in large web files and DENTE logs.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT export and implant-fit visible wording

- [x] Removed visible English `handoff` jargon from CT canal/template export fact.
  - Implementation: `ctPlanningExport` now says `?????? ????? ? ????????.` while internal handoff ids and packet fields remain machine metadata.
  - DOD practice: user-facing CT plan facts must be clinical Russian; adapter contracts stay typed and stable.
  - Rejected alternative: rename internal `handoffSummary`, `lab-handoff`, and bridge chunk ids; that would churn non-visible API/adapter contracts without improving the UI.
  - Microsecond estimate: 0 measured; one string replacement only.
- [x] Removed visible `fallback shortest/longest` wording from implant-fit reasons.
  - Implementation: candidate reasons now say `????????? ???????`; warning copy now says `????????????? ????????/??????? ???????`.
  - DOD practice: implant library evidence stays explainable without exposing implementation terms to the doctor.
  - Rejected alternative: rename typed `widthSource: "fallback"` / `heightSource: "fallback"` values; those are internal state values and are not the visible defect.
  - Microsecond estimate: 0 measured; render text only.
- [x] Added source-smoke regression guards and updated CT viewer plan docs.
  - Implementation: smoke requires the new Russian strings and forbids the old visible English/jargon strings.
  - DOD practice: copy regressions in CT planning are blocked at source level.
  - Rejected alternative: rely on manual QA after every CT iteration.
  - Microsecond estimate: 0 measured.

## Verification: CT export and implant-fit visible wording

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-export` is 7,810 bytes / 2,829 gzip, `ct-planning-implant-fit` is 4,967 bytes / 2,008 gzip, aggregate JS gzip is 428,979 / 430,000, and total gzip is 456,878 / 480,000.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain in large web files and DENTE logs.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.
- EOF append marker: CT continuation clinical wording pass verified; aggregate JS gzip 429,089 / 430,000; full verification passed; no DENTE build/test process left behind.

## Slice: CT copy compression and budget reserve

- [x] Compressed CT measurement/reconstruction/workflow copy without weakening clinical meaning.
  - Implementation: shortened density viewing-unit guidance, density draft text, local packet warning, ???? route detail, station-coverage action, incomplete-station warning, and package detail.
  - DOD practice: preserve source-smoke-required clinical strings while reducing chunk bytes.
  - Rejected alternative: raise the aggregate JS gzip budget; the budget is a guardrail for CT growth.
  - Microsecond estimate: 0 measured; render strings only.
- [x] Removed visible `gate` wording from CT implant-model cards.
  - Implementation: implant model now renders `?????? ?? ?????? ????????.` and shorter sleeve/guide-route copy. Lab route states that STL/CAD stays laboratory-side.
  - DOD practice: internal gate semantics remain typed; clinician copy is Russian and operational.
  - Rejected alternative: rename internal validation/export gate terms; those are code contracts, not the visible defect.
  - Microsecond estimate: 0 measured; one render copy path.
- [x] Added source-smoke guards and updated the CT viewer plan.
  - Implementation: smoke now requires the compact density and implant-model wording and forbids visible `???????? gate`.
  - DOD practice: bundle-saving copy changes are locked by tests, not manual memory.
  - Rejected alternative: leave this as a one-off cleanup with no regression guard.
  - Microsecond estimate: 0 measured.

## Verification: CT copy compression and budget reserve

- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-measurement-plan` is 7,811 bytes / 3,096 gzip, `ct-planning-reconstruction` is 6,668 bytes / 2,828 gzip, `ct-planning-implant-model` is 5,280 bytes / 2,250 gzip, aggregate JS gzip is 428,914 / 430,000, and total gzip is 456,813 / 480,000.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain in large web files and DENTE logs.
- Process check: no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

## Slice: CT contour/artifact visible wording hardening

- [x] Reworded CT artifact/scenario/ROI visible copy to clinical contour/markup wording.
  - Implementation: CT cards now show `???????? ?????`, `????? ????????`, `??????? ????????`, `?????? ???????`, and `?????? ??????`; internal `ready/draft/blocked`, `area_roi`, `volume_roi`, and artifact contracts are unchanged.
  - DOD practice: one machine contract, one visible clinical label layer, source-smoke proof.
  - Rejected alternative: rename shared ROI/status ids; rejected because it would churn viewer/tool-state contracts.
  - Microsecond estimate: 0 measured; render strings only.
- [x] Added source-smoke guards and updated the CT viewer plan.
  - Implementation: smoke requires new contour/markup labels and forbids old artifact/viewer/blocked/ROI wording in relevant CT source files; docs now state the contour-vs-contract boundary.
  - DOD practice: no doc-only convention; regression is source-gated.
  - Rejected alternative: manual review only.
  - Microsecond estimate: 0 measured.

## Verification: CT contour/artifact visible wording hardening

- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; aggregate JS gzip is 428,879 / 430,000 and total gzip is 456,778 / 480,000.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain.
- Process check: no DENTE build/test process left behind.

## Slice: CT visible ROI leak cleanup in workflow/header/summary

- [x] Removed remaining visible `ROI` wording from CT planning workflow/header/measurement/scenario surfaces.
  - Implementation: active scenario labels and deliverables now show `?????? ???????` / `?????? ??????`; the measurement summary shows `???????`; workflow phase details and the CT suite header say `???????`.
  - DOD practice: preserve internal `area_roi`, `volume_roi`, DICOM ROI tools, geometry fields, and adapter contracts while localizing the clinician-facing layer.
  - Rejected alternative: rename ROI ids and tool contracts; rejected because that would churn portable viewer state and adapter payloads.
  - Microsecond estimate: 0 measured; render strings only.
- [x] Added source-smoke regression guards and updated CT viewer docs.
  - Implementation: smoke requires the new contour strings and forbids the old visible ROI strings in the exact source files where they regressed.
  - DOD practice: no doc-only boundary; visible-copy regressions fail CI smoke.
  - Rejected alternative: forbid every `ROI` token globally; rejected because typed ROI contracts are still valid machine metadata.
  - Microsecond estimate: 0 measured.

## Verification: CT visible ROI leak cleanup in workflow/header/summary

- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-tools` is 10,330 bytes / 3,273 gzip, `ct-planning-workflow-plan` is 5,397 bytes / 2,146 gzip, `ct-planning-export-scenario-summary` is 4,982 bytes / 1,871 gzip, aggregate JS gzip is 428,866 / 430,000, and total gzip is 456,765 / 480,000.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain.
- Process check: no DENTE build/test process left behind.

## Slice: DICOM/settings external viewing wording cleanup

- [x] Removed exact visible `??????? ???????????` wording from DICOM/settings/App/API handoff surfaces.
  - Implementation: Settings DICOM launch, App onboarding/settings copy, CT package target labels, API imaging/system route copy, and sample DICOM labels now say `??????? ????????`; internal `external_viewer` ids stay unchanged.
  - DOD practice: one typed route id, one operator-readable label layer, source-smoke proof across web and API files.
  - Rejected alternative: rename `external_viewer` route/adapter ids; rejected because DICOM workup, viewer bundles, and low-power routing use them as machine contracts.
  - Microsecond estimate: 0 measured; render/response strings only.
- [x] Replaced Settings/imaging/workspace blocked labels with `????? ????????`.
  - Implementation: label maps now render `????? ????????` for blocked states where the operator must fix setup or source readiness; raw `blocked` status remains the program contract.
  - DOD practice: accessible action wording in UI, no status enum churn.
  - Rejected alternative: globally forbid all Russian blocked words; rejected because legal/policy/security blocked states outside DICOM can still be semantically correct.
  - Microsecond estimate: 0 measured.
- [x] Added source-smoke guards and updated the CT/DICOM viewer plan.
  - Implementation: settings smoke guards label maps and launch copy; imaging smoke guards App, CT tools, API imaging/system routes, and sample DICOM labels against old `??????? ???????????` wording.
  - DOD practice: regression is caught by CI source smoke, not memory.
  - Rejected alternative: manual grep-only cleanup.
  - Microsecond estimate: 0 measured.

## Verification: DICOM/settings external viewing wording cleanup

- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:web-bundle-budget`: passed; `ct-planning-tools` is 10,324 bytes / 3,275 gzip, `SettingsView` is 222,274 bytes / 51,668 gzip, aggregate JS gzip is 428,828 / 430,000, and total gzip is 456,727 / 480,000.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain.
- Process check: no DENTE build/test process left behind.

## Slice: DICOM download/workbench local-path redaction

- [x] Closed the browser-download leak for DICOM tool-state JSON.
  - Implementation: `downloadDicomViewerToolStateBundle` now serializes a redacted copy. `seriesRef.firstFilePath`, viewport `referencedImageId`, tool-state annotation `referencedImageId`, and warning text are replaced with `redacted-local-dicom-path:<fingerprint>` when they contain local paths.
  - DOD practice: exported handoff files leave the browser without raw `C:\...`, UNC, POSIX, or `dicomfile:` paths; local recovery state remains untouched for same-workstation reconnect.
  - Rejected alternative: mutate the live workbench state before download; rejected because that would break local reconnect and same-machine recovery.
  - Microsecond estimate: 0 measured on render frames; explicit download performs one JSON clone/redaction pass only on click.
- [x] Closed the browser-download leak for DICOM workbench manifests.
  - Implementation: `downloadDicomWorkbenchManifest` now serializes `redactedDicomWorkbenchManifestForDownload`, including launch `viewerUrl`, readiness/render/launch warnings, and embedded tool-state.
  - DOD practice: one outgoing payload boundary for browser exports instead of trusting in-memory state.
  - Rejected alternative: rely only on server persistence redaction; rejected because the browser download path bypasses server storage.
  - Microsecond estimate: 0 measured on render frames; click-time JSON pass only.
- [x] Tightened server persistence redaction for tool-state annotations.
  - Implementation: `cloneDicomWorkbenchManifestForServerStorage` now redacts annotation `referencedImageId` alongside viewport ids.
  - DOD practice: server no-pixel workbench bundles sanitize every local DICOM reference owner in the current tool-state contract.
  - Rejected alternative: sanitize only warnings and viewport ids; rejected because annotations are independently portable handoff data.
  - Microsecond estimate: 0 measured; server save-time clone only.
- [x] Added source-smoke guards and updated the CT/DICOM viewer plan.
  - Implementation: imaging smoke requires client redaction helpers, safe JSON serialization, annotation id redaction, and server annotation redaction; it forbids raw `JSON.stringify(dicomViewerToolStateBundle...)` and `JSON.stringify(dicomViewerWorkbenchManifest...)`.
  - DOD practice: regression is source-gated at the exact bypass point.
  - Rejected alternative: manual grep after each change.
  - Microsecond estimate: 0 measured.

## Verification: DICOM download/workbench local-path redaction

- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run build -w @dental/web`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate for this slice after the explicit directive that gzip size is not the objective.
- Process check: no DENTE build/test process left behind.

## Slice: Clinical/schedule/settings/Telegram admin-secret separation

- [x] Removed cross-domain secret fallback from clinical access.
  - Implementation: clinical read/mutation/export guard now accepts only `DENTE_CLINICAL_ADMIN_SECRET`; settings and Telegram env vars no longer unlock patients, documents, imaging, speech, imports, or persistence export.
  - DOD practice: one domain secret, one protected data route, source guard plus production runtime fail-closed checks.
  - Rejected alternative: keep settings/Telegram fallback for operator convenience; rejected because it silently widens access to PHI and emergency exports.
  - Microsecond estimate: 0 measured; same request-time header comparison path.
- [x] Removed cross-domain secret fallback from settings access.
  - Implementation: settings clinic/profile/preferences/mutation routes use a settings-only guard backed by `DENTE_SETTINGS_ADMIN_SECRET`.
  - DOD practice: settings routes are no longer routed through clinical guards and Telegram admin secret is not accepted as settings access.
  - Rejected alternative: make Telegram admin secret a universal admin key; rejected because Telegram control-plane automation is not a tenant-auth model.
  - Microsecond estimate: 0 measured.
- [x] Removed cross-domain secret fallback from schedule mutations.
  - Implementation: appointment create/update routes now accept only `DENTE_SCHEDULE_ADMIN_SECRET`; `DENTE_SETTINGS_ADMIN_SECRET` and `DENTE_TELEGRAM_ADMIN_SECRET` alone return fail-closed production responses.
  - DOD practice: schedule mutations have their own source-smoke and runtime proof instead of relying on the clinical guard smoke.
  - Rejected alternative: treat schedule as settings; rejected because appointment mutation changes clinical operations and patient-facing workflow.
  - Microsecond estimate: 0 measured.
- [x] Updated architecture/risk/Telegram docs.
  - Implementation: docs now describe clinical, schedule, settings, and Telegram admin secrets as separate domains; deployments may still deliberately set the same value.
  - DOD practice: documented boundary matches executable smoke behavior.
  - Rejected alternative: document only clinical separation; rejected because schedule was the remaining hidden escalation path.
  - Microsecond estimate: 0 measured.

## Verification: Clinical/schedule/settings/Telegram admin-secret separation

- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:clinical-mutation-guard`: passed; settings-only and Telegram-only secrets do not unlock clinical read/mutation/export routes.
- `npm run smoke:settings-admin-guard`: passed; Telegram-only secret does not unlock settings routes.
- `npm run smoke:schedule-admin-guard`: passed; settings-only and Telegram-only secrets do not unlock schedule mutations.
- `npm run smoke:telegram-admin-guard`: passed.
- `npm run smoke:schedule-active-visit-status-contract`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:schedule-view-source`: passed.
- `npm run smoke:settings-preferences`: passed.
- `npm run smoke:ui-preferences`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run build -w @dental/web`: passed; Vite still reports the existing large `workspace` chunk warning.
- `npm run smoke:settings-persistence-file`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain.
- Process check: no DENTE build/test process left behind.

## Slice: Telegram settings validation copy hardening

- [x] Humanized Telegram settings URL validation messages.
  - Implementation: `apps/api/src/routes/telegram.ts` now routes Telegram settings parse/save failures through `readableTelegramSettingsValidationMessage`, mapping raw URL reasons such as `https_required`, `invalid_url`, and patient-identifying path/query blockers into Russian operator actions.
  - DOD practice: API keeps contract error codes but does not expose internal validation tokens as the user-facing `message`.
  - Rejected alternative: keep raw reason strings because tests already expected them; rejected because the browser shows these messages directly to clinic admins.
  - Microsecond estimate: 0 measured.
- [x] Removed raw callback-secret env names from appointment preview warnings.
  - Implementation: Telegram appointment callback warnings and fallback errors now say to enable the signed-button secret in server settings instead of naming callback/webhook env vars in patient/admin-facing preview data.
  - DOD practice: configuration names can stay in docs and server code paths, not in operator preview warnings.
  - Rejected alternative: rely on frontend `telegramHumanMessage` to hide technical strings; rejected because the API response itself should be safe and readable.
  - Microsecond estimate: 0 measured.
- [x] Updated Telegram guards and docs.
  - Implementation: `smoke:telegram-bot` now requires human settings validation fragments and forbids raw reason tokens in API messages; `smoke:telegram-control-ui-source` requires the server humanizer and forbids old raw callback/settings copy; `smoke:telegram-url-ui-source` now checks the current operator-readable webhook label. Telegram plan, product architecture, and risk audit record the boundary.
  - DOD practice: contract smoke covers runtime API behavior; source smoke covers the helper staying wired.
  - Rejected alternative: only update docs after code; rejected because raw validation copy would regress silently.
  - Microsecond estimate: 0 measured.

## Verification: Telegram settings validation copy hardening

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
- `git diff --check`: no whitespace errors; existing CRLF warnings remain.
- Process check: no DENTE build/test process left behind.

## Slice: Public health persistence metadata hardening

- [x] Removed persistence metadata from the public health endpoint.
  - Implementation: `/api/health` now returns only liveness fields: `ok`, `service`, and `time`. It no longer imports or serializes persistence state metadata.
  - DOD practice: public liveness endpoint is not an operations/audit endpoint; state-file, backup, checksum, and save metadata stay behind guarded routes.
  - Rejected alternative: keep a redacted persistence summary on health; rejected because backup counts and save timestamps still reveal operations posture to unauthenticated callers.
  - Microsecond estimate: 0 measured; health response now does less disk/state work.
- [x] Moved Settings/Audit persistence health loading to the guarded verify endpoint.
  - Implementation: `loadPersistenceHealth` now calls `/api/system/persistence/verify` with clinical read headers, parses `report.meta`, and sets both persistence health and integrity from one response. Fresh unlock passes the entered secret as an override.
  - DOD practice: one protected route owns backup/integrity metadata; the public route remains liveness only.
  - Rejected alternative: keep `/api/health` for the summary and `/api/system/persistence/verify` for details; rejected because it splits one fact across two access levels.
  - Microsecond estimate: 0 measured; Settings/Audit now avoids a duplicate verify request on tab open/manual check.
- [x] Updated source smoke and docs.
  - Implementation: clinical guard smoke now forbids public persistence metadata helpers/fields and requires the web audit path to use guarded persistence verify. Architecture/risk docs record the boundary.
  - DOD practice: CI source guard covers the exact public leak route.
  - Rejected alternative: rely on docs/manual review.
  - Microsecond estimate: 0 measured.

## Verification: Public health persistence metadata hardening

- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run build -w @dental/web`: passed; Vite still reports the existing large `workspace` chunk warning.
- `npm run smoke:settings-persistence-file`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain.
- Process check: no DENTE build/test process left behind.

## Slice: Frontend domain admin-secret sessions

- [x] Split web admin-secret sessions by domain.
  - Implementation: `App.tsx` now keeps separate in-memory sessions for clinical, settings, schedule, and Telegram secrets. Clinical/global unlock can seed all domains for one-secret deployments; schedule/settings/Telegram unlocks update only that domain.
  - DOD practice: the web access model now mirrors the API access model instead of using Telegram as a universal admin-secret carrier.
  - Rejected alternative: keep one `telegramAdminSecretSession` for all domains; rejected because a valid schedule/settings secret could fail by trying to reload clinical dashboard, and a Telegram secret could leak into settings requests.
  - Microsecond estimate: 0 measured; only header selection and session state routing changed.
- [x] Routed settings and schedule mutations through domain headers.
  - Implementation: settings profile/mode/staff/chair/preference calls use `settingsAccessHeaders`; appointment create/update uses `scheduleMutationHeaders`; clinical reads/mutations use `clinicalAdminSecretSession`; Telegram routes keep `telegramControlPlaneHeaders`.
  - DOD practice: one protected route family has one frontend header source.
  - Rejected alternative: infer the domain from endpoint strings at request time; rejected because explicit helpers are easier to smoke-test and audit.
  - Microsecond estimate: 0 measured.
- [x] Added settings-domain unlock UI outside Telegram.
  - Implementation: non-Telegram Settings tabs now expose a protected-settings unlock panel. Schedule unlock copy now states schedule-only access instead of implying settings and Telegram access.
  - DOD practice: a separated settings secret is operable from the UI, not just accepted by the API.
  - Rejected alternative: make operators visit the Telegram tab to unlock settings; rejected because Telegram control-plane access is a different domain.
  - Microsecond estimate: 0 measured.
- [x] Updated source smokes and docs.
  - Implementation: clinical guard smoke requires separated frontend sessions and rejects clinical headers routed through Telegram; UI preference smoke requires settings headers; schedule/settings/onboarding smokes cover the new visible copy. Architecture and risk docs record the browser-side boundary.
  - DOD practice: source guards now prove both server and browser honor the same domain split.
  - Rejected alternative: rely on manual review of the giant `App.tsx`.
  - Microsecond estimate: 0 measured.

## Verification: Frontend domain admin-secret sessions

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
- `git diff --check`: no whitespace errors; existing CRLF warnings remain.
- Process check: no DENTE build/test process left behind.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain.
- Process check: no DENTE build/test process left behind.

## Slice: Explicit admin-secret panel routing

- [x] Removed ambient route-state coupling from fixed admin unlock panels.
  - Implementation: `unlockTelegramAdminSession` and `lockTelegramAdminSession` now accept an optional explicit domain. The app bootstrap uses `all`; onboarding Telegram uses `telegram`; Schedule passes `schedule`; Settings passes `settings` or `telegram` from the active tab through `settingsAdminSecretDomain`.
  - DOD practice: a fixed UI panel names the protected route family it unlocks instead of relying on `currentView`, `settingsTab`, or retained onboarding state at submit time.
  - Rejected alternative: keep inference-only routing and add more conditions to `currentAdminSecretUnlockDomain`; rejected because it preserves hidden coupling between unrelated UI states.
  - Microsecond estimate: 0 measured.
- [x] Corrected Telegram unlock copy after the domain split.
  - Implementation: the Telegram tab now labels its admin panel as Telegram-only, asks for a Telegram-domain secret, and no longer claims that Telegram unlock opens general clinic settings.
  - DOD practice: visible access copy must match the actual header/session domain used by the next request.
  - Rejected alternative: keep "settings and Telegram" wording for convenience; rejected because Settings has its own non-Telegram unlock panel and route family.
  - Microsecond estimate: 0 measured.
- [x] Updated source guards and docs.
  - Implementation: clinical guard smoke now requires explicit fixed-panel domain overrides and rejects retained onboarding state overriding a settings tab. Settings source smoke now forbids old Telegram copy that implied general settings access. Architecture/risk docs record explicit panel-domain routing.
  - DOD practice: source checks cover both behavior wiring and visible operator copy.
  - Rejected alternative: rely on manual review of `App.tsx` prop wiring.
  - Microsecond estimate: 0 measured.

## Verification: Explicit admin-secret panel routing

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
- `git diff --check`: no whitespace errors; existing CRLF warnings remain.
- Process check: no DENTE build/test process left behind.

## Slice: Domain admin-secret draft isolation

- [x] Split browser admin-secret input drafts by access domain.
  - Implementation: `App.tsx` now keeps separate in-memory drafts for clinical/global, settings, schedule, and Telegram secrets. Unlock reads `adminSecretDraftForDomain(domain)` after the target domain is resolved.
  - DOD practice: typed secrets in fixed panels should not move between route families before the user submits them.
  - Rejected alternative: keep one shared `telegramAdminSecretDraft`; rejected because a settings or schedule password typed but not submitted could appear in the Telegram panel or be used as a Telegram control-plane override.
  - Microsecond estimate: 0 measured.
- [x] Clear only the relevant draft on unlock/lock.
  - Implementation: `clearAdminSecretDraft(domain)` clears the selected domain, while `all` clears every draft after successful global unlock.
  - DOD practice: clearing follows the same route-family ownership as the session slot.
  - Rejected alternative: always clear the Telegram-named draft; rejected because settings/schedule drafts would remain stale and visible after their own panel actions.
  - Microsecond estimate: 0 measured.
- [x] Updated source guard and docs.
  - Implementation: clinical guard smoke now requires four separate draft states, domain-based draft reads, domain clear, and domain-specific prop wiring into bootstrap, Schedule, and Settings. Architecture/risk docs record draft separation.
  - DOD practice: source guard covers both the state split and the fixed panel wiring.
  - Rejected alternative: rely on TypeScript only; rejected because TypeScript would allow a shared string to be passed everywhere.
  - Microsecond estimate: 0 measured.

## Verification: Domain admin-secret draft isolation

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
- `git diff --check`: no whitespace errors; existing CRLF warnings remain.
- Process check: no DENTE build/test process left behind.

## Slice: Telegram settings validation copy hardening

- [x] Humanized Telegram settings URL validation messages.
  - Implementation: `apps/api/src/routes/telegram.ts` now routes Telegram settings parse/save failures through `readableTelegramSettingsValidationMessage`, mapping raw URL reasons such as `https_required`, `invalid_url`, and patient-identifying path/query blockers into Russian operator actions.
  - DOD practice: API keeps contract error codes but does not expose internal validation tokens as the user-facing `message`.
  - Rejected alternative: keep raw reason strings because tests already expected them; rejected because the browser shows these messages directly to clinic admins.
  - Microsecond estimate: 0 measured.
- [x] Removed raw callback-secret env names from appointment preview warnings.
  - Implementation: Telegram appointment callback warnings and fallback errors now say to enable the signed-button secret in server settings instead of naming callback/webhook env vars in patient/admin-facing preview data.
  - DOD practice: configuration names can stay in docs and server code paths, not in operator preview warnings.
  - Rejected alternative: rely on frontend `telegramHumanMessage` to hide technical strings; rejected because the API response itself should be safe and readable.
  - Microsecond estimate: 0 measured.
- [x] Updated Telegram guards and docs.
  - Implementation: `smoke:telegram-bot` now requires human settings validation fragments and forbids raw reason tokens in API messages; `smoke:telegram-control-ui-source` requires the server humanizer and forbids old raw callback/settings copy; `smoke:telegram-url-ui-source` now checks the current operator-readable webhook label. Telegram plan, product architecture, and risk audit record the boundary.
  - DOD practice: contract smoke covers runtime API behavior; source smoke covers the helper staying wired.
  - Rejected alternative: only update docs after code; rejected because raw validation copy would regress silently.
  - Microsecond estimate: 0 measured.

## Verification: Telegram settings validation copy hardening

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
- `git diff --check`: no whitespace errors; existing CRLF warnings remain.
- Process check: no DENTE build/test process left behind.

## Slice: Operator-facing infrastructure error copy hardening

- [x] Local bridge, KND XML, and PDF export errors are now operator-readable.
  - Implementation: local bridge readiness uses explicit URL/probe warning helpers; KND 1151156 missing tax-office copy asks for a 4-digit server-settings code; PDF export maps browser setup/launch/timeout/output failures to document-printing actions.
  - DOD practice: user-facing `message` and `warnings` carry clinic actions, while internal env/parser/network/process details stay in code, docs, tests, and logs.
  - Rejected alternative: keep raw `error.message`, env keys, and browser process labels; rejected because Settings/Audit and document workflows show these strings to clinic staff.
  - Microsecond estimate: 0 measured.
- [x] Source/runtime guards cover the leak class.
  - Implementation: settings, clinical mutation, KND XML, and document source smokes require the new wording and reject old parser/network/env/process strings. Product architecture and risk audit record the boundary.
  - DOD practice: one owner route, one translated user-facing route, one proof artifact.
  - Rejected alternative: patch current strings without a durable source guard; rejected because this category already appeared in multiple endpoints.
  - Microsecond estimate: 0 measured.

## Verification: Operator-facing infrastructure error copy hardening

- Broad source guard pass: segmented controls, interactive buttons, app boot state, patients, shift visit, communications, finance, finance planning, finance ledger, payment capture, documents, and document payload UI smokes passed.
- Local bridge proof: `npm run smoke:settings-view-source`, `npm run typecheck -w @dental/api`, `npm run build -w @dental/api`, and `npm run smoke:clinical-mutation-guard` passed.
- KND XML proof: `npm run build -w @dental/api`, `npm run typecheck -w @dental/api`, and `npm run smoke:tax-knd-xml` passed.
- PDF export proof: `npm run smoke:documents-view-source`, `npm run typecheck -w @dental/api`, `npm run build -w @dental/api`, and `npm run smoke:document-lifecycle` passed.
- Final regression pass: shared/api/web typechecks, api/web builds, settings/documents/clinical/KND/document-lifecycle/code-split/text-encoding/DICOM smokes, plus interactive/payment/communications source smokes passed.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain.
- Process check: no DENTE build/test process left behind.

## Slice: Persistence integrity warning hardening

- [x] Removed raw persistence parser diagnostics from browser-visible verify/export payloads.
  - Implementation: `persistentState.ts` now uses bounded internal read diagnostics and maps missing, unreadable, checksum-failed, disabled, and backup-failed states through `persistenceWarningText` before `warnings`, backup `warning`, or export `error` leave the API.
  - DOD practice: Settings/Audit receives recovery actions, while server logs may retain exact JSON parser detail for diagnosis.
  - Rejected alternative: keep `error.message` from `JSON.parse`; rejected because it produces unstable parser text in an owner/admin workflow.
  - Microsecond estimate: 0 measured.
- [x] Added source and runtime guards for broken state files.
  - Implementation: settings source smoke requires bounded persistence diagnostics and forbids `state_file_parse_failed`/raw parser message pass-through. Settings persistence smoke corrupts the state JSON and asserts the verify/export payloads show operator-readable text without parser tokens.
  - DOD practice: one broken state file, one operator action, one proof artifact.
  - Rejected alternative: only source-check helper names; rejected because runtime must prove a corrupted file path is actually translated.
  - Microsecond estimate: 0 measured.
- [x] Updated product architecture and risk audit.
  - Implementation: docs now state that persistence/readiness reports must translate missing/unreadable/checksum-failed state files and keep JSON parser text out of browser-visible warnings.
  - DOD practice: product rule documents the boundary for future persistence/restore work.
  - Rejected alternative: leave this as an implicit code convention.
  - Microsecond estimate: 0 measured.

## Verification: Persistence integrity warning hardening

- `npm run smoke:settings-view-source`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:settings-persistence-file`: passed; server console logs kept exact JSON parser diagnostics, but API verify/export payload assertions rejected raw parser/tokens.
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
- `git diff --check`: no whitespace errors; existing CRLF warnings remain.
- Process check: no DENTE build/test process left behind.

## Slice: Telegram transport warning hardening

- [x] Telegram send/webhook transport failures no longer expose raw transport classes in browser-visible `warnings` or delivery messages.
  - Implementation: `routes/telegram.ts` maps `rate_limited`, `auth`, `chat_blocked`, `bad_request`, `timeout`, `network`, `server`, and `unknown` through Russian operator text for outbox send, photo fallback, split-caption text send, webhook reply, and callback-answer failures.
  - DOD practice: stable machine `blockedReason` stays for contracts; human-facing `message` and `warnings` are clinic-readable.
  - Rejected alternative: rely on `telegramHumanMessage` in the web app; rejected because API responses and communication-event messages must be safe before frontend rendering.
  - Microsecond estimate: 0 measured.
- [x] Telegram rate-limit backoff is now structured instead of hidden in warning text.
  - Implementation: `denteTelegramOutboxSendResponseSchema` carries `retryAfterSeconds`; due worker reads that field instead of regex-parsing `retry_after_seconds:*` from warnings.
  - DOD practice: one machine route for retry timing, one human route for warning copy.
  - Rejected alternative: keep `retry_after_seconds:7` in warnings and translate in UI; rejected because it couples scheduler behavior to user copy.
  - Microsecond estimate: 0 measured.
- [x] Guards and docs now reject the old leak class.
  - Implementation: Telegram source smoke requires transport humanizers and forbids old `telegram_transport_${...}`, `telegram_photo_fallback_`, `retry_after_seconds:`, and callback/webhook `errorClass` strings in route source. Runtime bot smoke covers photo fallback and a rate-limited fallback with `retryAfterSeconds`.
  - DOD practice: source guard plus runtime guard for the exact operator-visible failure path.
  - Rejected alternative: add only source snippets; rejected because 429 backoff needed runtime proof.
  - Microsecond estimate: 0 measured.

## Verification: Telegram transport warning hardening

- `npm run smoke:telegram-control-ui-source`: passed.
- `npm run smoke:telegram-due-worker-source`: passed.
- `npm run smoke:telegram-bot`: passed.
- `npm run smoke:telegram-validation`: passed.
- `npm run smoke:telegram-admin-guard`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run build -w @dental/web`: passed; Vite still reports the existing large `workspace` chunk warning.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:settings-preferences`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run smoke:telegram-url-ui-source`: passed.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- `git diff --check`: no whitespace errors; existing CRLF warnings remain.
- Process check: no DENTE build/test process left behind.

## Slice: Speech provider and polish public-error hardening

- [x] STT provider failures keep typed provider metadata until the public mapper sees it.
  - Implementation: `gateway.ts` now classifies provider failure reasons as timeout, temporary request limit, rejected server access, temporary source failure, rejected audio fragment, unstable connection, or no ready text. The key-rotation failure path rethrows `SpeechProviderRequestError` instead of wrapping it into a generic `Error`, so a 429 remains a rate-limit condition in public copy.
  - DOD practice: machine health/cooldown state stays internal; chunk `warnings` get clinic-readable recovery text and the local draft path.
  - Rejected alternative: parse `rate_limited` or `http_429` from warning strings; rejected because the scheduler/operator copy split must not depend on raw provider tokens.
  - Microsecond estimate: 0 measured.
- [x] Neural polish failures and polish validation no longer expose raw validator/provider detail.
  - Implementation: `polish.ts` maps neural-provider errors to clinic-readable reasons and preserves typed request errors through key rotation. `routes/speech.ts` returns a stable Russian validation message for invalid polish requests instead of joining zod issue text.
  - DOD practice: deterministic local text remains the recovery route; neural polish is optional and never blocks saving.
  - Rejected alternative: return sanitized upstream/provider messages because secrets are redacted; rejected because sanitized text can still carry provider classes, HTTP tokens, and useless upstream detail.
  - Microsecond estimate: 0 measured.
- [x] Added runtime/source guard for speech public-error boundaries.
  - Implementation: new `smoke:speech-provider-errors` exercises `/api/speech/polish-transcript` validation, a synthetic STT 429, and a synthetic neural-polish 500. It rejects `rate_limited`, `http_429`, `http_500`, `provider_error`, upstream text, and synthetic secret material in public warnings. `smoke:speech-queue-source` now checks the current clinic-readable foreign-visit queue message and forbids old `STT-????????` copy.
  - DOD practice: runtime proof for the exact doctor/API path plus source guard for regression wording.
  - Rejected alternative: source-only guard; rejected because the first smoke run found the real typed-error wrapping bug.
  - Microsecond estimate: 0 measured.
- [x] Speech plan and product risk audit now document the boundary.
  - Implementation: docs now state that provider/STT failures, neural polish failures, and polish validation must stay clinic-readable and keep local/deterministic recovery available.
  - DOD practice: future speech/import work gets a written boundary, not just a passing test.
  - Rejected alternative: leave the rule only in the new smoke script.
  - Microsecond estimate: 0 measured.

## Verification: Speech provider and polish public-error hardening

- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:speech-provider-errors`: passed after it exposed and drove the typed-error wrapping fix.
- `npm run smoke:speech-clinical-scope`: passed.
- `npm run smoke:speech-groq-chunk-floor`: passed.
- `npm run smoke:speech-key-rotation`: passed.
- `npm run smoke:speech-queue-source`: passed after the source guard was updated to the current clinic-readable copy.
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

## Slice: Imaging and DICOM route validation hardening

- [x] Imaging/DICOM API routes now own public validation copy.
  - Implementation: `routes/imaging.ts` uses `parseImagingPayload` for imaging import preview/commit, DICOM series preview, DICOMweb check, viewer launch/tool-state/render-cache/workstation/workbench routes, workbench bundle save, local folder discovery, local organizer, folder preview, first-frame preview, folder workup, folder scan, viewer-session save, and study creation.
  - DOD practice: shared zod schemas remain the typed machine contract; route handlers return bounded Russian operator actions before any viewer, folder, DICOMweb, save, or study-create work runs.
  - Rejected alternative: rely on the global zod handler; rejected because it can expose `issues`, schema paths, and fields such as `folderPath`, `series`, `client`, `manifest`, or `viewerState`.
  - Microsecond estimate: 0 measured.
- [x] DICOM runtime smoke now rejects raw validation leaks across imaging routes.
  - Implementation: `smoke:dicom-folder-workup` installs a custom Zod error handler, asserts route source has no direct `.parse(request.body...)`, and exercises invalid payloads for all imaging/DICOM POST routes plus existing viewer-session save when a sample study exists.
  - DOD practice: source guard plus actual Fastify route proof. The same smoke still builds a synthetic 48-slice CBCT folder, first-frame preview, workup, workbench manifest, and pixel-free saved bundle.
  - Rejected alternative: source guard only; rejected because the runtime route order can still bypass public copy after access checks.
  - Microsecond estimate: 0 measured.
- [x] Imaging docs and risk audit record the validation boundary.
  - Implementation: `10-imaging-dicom-viewer-plan.md` and `04-product-risk-audit.md` now state that bad imaging/DICOM payloads must not expose zod issues, local folder fields, or viewer-state fields.
  - DOD practice: future CT/viewer routes have a written public-error boundary and a smoke to extend.
  - Rejected alternative: leave the boundary only inside the route helper.
  - Microsecond estimate: 0 measured.

## Verification: Imaging and DICOM route validation hardening

- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run build -w @dental/web`: passed; Vite still reports the existing large `workspace` chunk warning.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- `npm run smoke:import-contracts`: passed.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Slice: Import and migration route validation hardening

- [x] Patient import routes now own public validation copy.
  - Implementation: `routes/imports.ts` uses `parseImportPayload` for intake, preview, and commit. Invalid payloads return one route-specific `ImportValidationError` message instead of letting raw zod issues reach the global error handler.
  - DOD practice: import builders still consume typed shared-schema output; browser/API users get an operator action, not schema field names.
  - Rejected alternative: rely on the global zod handler; rejected because it returns `issues`, `path`, and `code`, which are useful diagnostics but bad clinic UX on import screens.
  - Microsecond estimate: 0 measured.
- [x] Smart import and migration routes now own public validation copy.
  - Implementation: `routes/smartImports.ts` uses `parseSmartImportPayload` for smart preview/report/safe-report/commit, local discovery/workup/probe, migration autopilot/report, and clinic public lookup.
  - DOD practice: migration source aliases, limits, clinic requisites, and commit payloads fail closed with bounded Russian copy before any parser or public lookup path runs.
  - Rejected alternative: patch only `/preview`; rejected because report/download/commit and autopilot routes are the same admin workflow and must not regress separately.
  - Microsecond estimate: 0 measured.
- [x] Import contract smoke now checks payload quality, not only HTTP status.
  - Implementation: `smoke:import-contracts` now rejects direct route `.parse(request.body...)` calls and exercises invalid payloads across import, smart import, local source, autopilot, report, commit, and clinic lookup routes. It forbids raw zod `issues`, schema fields, parser tokens, and source-ref field names in responses.
  - DOD practice: source guard plus runtime API proof through the actual Fastify routes.
  - Rejected alternative: source-only guard; rejected because a custom Fastify error handler can still expose runtime zod issues if one route is missed.
  - Microsecond estimate: 0 measured.
- [x] Migration docs and risk audit now record the validation boundary.
  - Implementation: `02-ai-and-migration-plan.md` and `04-product-risk-audit.md` document route-owned operator validation for import/migration bad payloads.
  - DOD practice: future route additions have a written boundary and a smoke to extend.
  - Rejected alternative: leave the boundary only in source code.
  - Microsecond estimate: 0 measured.

## Verification: Import and migration route validation hardening

- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run build -w @dental/shared`: passed.
- `npm run smoke:import-contracts`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- `npm run build -w @dental/web`: passed; Vite still reports the existing large `workspace` chunk warning.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Slice: Document, ingestion, and pricelist route validation hardening

- [x] Document create/issue/void routes no longer expose first zod issue text.
  - Implementation: `routes/documents.ts` now uses stable route-owned Russian messages for invalid create, issue, and void payloads.
  - DOD practice: shared schemas remain the typed machine contract; the HTTP boundary returns clinic actions instead of schema paths or payload-key diagnostics.
  - Rejected alternative: preserve the first zod issue for precision; rejected because document routes are legal/medical workflow surfaces, not developer consoles.
  - Microsecond estimate: 0 measured.
- [x] Ingestion and price-list analyzer routes now own public validation copy.
  - Implementation: `routes/ingestion.ts` and `routes/pricelist.ts` use local safe-parse helpers before extraction/analyzer work and return bounded route errors for invalid bodies.
  - DOD practice: bad file/picture/text inputs fail before extractor/analyzer execution and before a global zod handler can leak `issues`, field names, or parser tokens.
  - Rejected alternative: rely on frontend translation; rejected because API responses must be safe before browser rendering and useful for direct admin tools.
  - Microsecond estimate: 0 measured.
- [x] Added a runtime/source smoke for document route validation.
  - Implementation: `smoke:document-route-validation` checks source guards and exercises invalid payloads through Fastify for document create/issue/void, ingestion extract, and pricelist analyze.
  - DOD practice: regression proof combines static route checks with real compiled route responses under production-style clinical admin secret guard.
  - Rejected alternative: source-only guard; rejected because route ordering and Fastify error handlers can still leak runtime zod responses.
  - Microsecond estimate: 0 measured.
- [x] Document ingestion docs and product risk audit record the boundary.
  - Implementation: `09-document-ingestion-plan.md` and `04-product-risk-audit.md` now state that bad document/ingestion/pricelist payloads must not expose schema/parser details.
  - DOD practice: future route additions have a written smoke and public-copy boundary to extend.
  - Rejected alternative: leave the boundary only in source code.
  - Microsecond estimate: 0 measured.

## Verification: Document, ingestion, and pricelist route validation hardening

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
- Process check: no `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind.

## Slice: Visit draft route validation hardening

- [x] Visit draft autosave now owns public validation copy.
  - Implementation: `routes/visits.ts` safe-parses autosave payloads through `parseVisitPayload` before calling `upsertVisitDraftAutosave`.
  - DOD practice: bad autosave requests return one doctor-facing Russian recovery message and never expose zod `issues`, parser paths, or visit draft DTO keys.
  - Rejected alternative: leave the global zod handler for draft autosave; rejected because autosave is a clinical continuity path, not a developer diagnostics route.
  - Microsecond estimate: 0 measured.
- [x] Visit draft accept now owns public validation copy.
  - Implementation: `routes/visits.ts` safe-parses accept payloads through the same route boundary before calling `acceptVisitDraft`.
  - DOD practice: invalid accept requests stop before active visit mutation, audit writes, revision changes, or receipt creation.
  - Rejected alternative: sanitize individual zod issue messages; rejected because fields such as `clientMutationId`, `doctorSummary`, and EMR section keys are implementation detail for doctors.
  - Microsecond estimate: 0 measured.
- [x] Added visit route runtime/source validation smoke.
  - Implementation: `smoke:visit-route-validation` checks source guards and invalid compiled Fastify route responses for autosave and accept under a production-style clinical admin secret.
  - DOD practice: regression proof rejects raw `issues`, schema paths, parser tokens, and visit-draft DTO keys in runtime responses.
  - Rejected alternative: rely on `smoke:visit-draft-status-contract`; rejected because that smoke proves closed-visit mutation behavior, not invalid-payload response quality.
  - Microsecond estimate: 0 measured.
- [x] Product risk audit records the visit-draft validation boundary.
  - Implementation: `04-product-risk-audit.md` now records route-owned visit autosave/accept validation.
  - DOD practice: future visit draft route additions have a written API boundary to extend.
  - Rejected alternative: leave proof only in route source and smoke name.
  - Microsecond estimate: 0 measured.

## Verification: Visit draft route validation hardening

- `npm run typecheck -w @dental/api`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:visit-route-validation`: passed.
- `npm run smoke:visit-draft-status-contract`: passed.
- `npm run smoke:schedule-active-visit-status-contract`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- Further API/shared/web regression verification is running after this checklist entry.

## Latest Slice Pointer: Settings route validation hardening

- Full checklist and verification are recorded above under `Slice: Settings route validation hardening`.
- Latest concrete change: settings preferences, clinic mode/profile, staff, chair, and working-hours routes now use route-owned validation copy and `smoke:settings-route-validation`.
- Latest verification: API/shared/web checks, settings/admin/preference/persistence smokes, route-validation smokes, import/DICOM smokes, `git diff --check`, and process check passed; bundle-budget smoke intentionally not used as a gate.

## Slice: Settings route validation hardening

- [x] Settings mutation routes now own public validation copy.
  - Implementation: `routes/settings.ts` uses `parseSettingsPayload` for UI preferences, clinic mode, clinic profile, staff creation, staff hours, chair creation, and chair hours.
  - DOD practice: invalid settings payloads return bounded Russian operator messages before settings mutation, instead of falling into the global zod handler or joining schema issue text.
  - Rejected alternative: leave settings validation raw because it is admin-only; rejected because clinic owners/admins are users, not developers, and settings errors are highly visible during onboarding.
  - Microsecond estimate: 0 measured.
- [x] Clinic profile validation no longer exposes zod issue text.
  - Implementation: invalid profile bodies return one `ClinicProfileValidationFailed` message that names the operator action, while existing 409 domain errors stay unchanged.
  - DOD practice: legal/license/bank/schedule setup stays recoverable without leaking fields such as `medicalLicenseIssuedAt`, `timezone`, or `scheduleDefaults`.
  - Rejected alternative: sanitize individual zod issues; rejected because the profile form needs a human action, not DTO names.
  - Microsecond estimate: 0 measured.
- [x] Added settings runtime/source validation smoke.
  - Implementation: `smoke:settings-route-validation` checks source guards and invalid compiled Fastify responses for preferences, clinic mode/profile, staff, chair, and working-hours routes under a production-style settings admin secret.
  - DOD practice: regression proof rejects raw zod `issues`, schema paths, parser tokens, and settings DTO keys in runtime responses.
  - Rejected alternative: rely on settings admin guard/preference smokes only; rejected because those smokes prove auth and valid persistence, not invalid-payload response quality.
  - Microsecond estimate: 0 measured.
- [x] Product risk audit records the settings boundary.
  - Implementation: `04-product-risk-audit.md` now records route-owned settings validation for preferences, clinic mode/profile, staff, chair, and working hours.
  - DOD practice: future settings route additions have a written smoke and boundary to extend.
  - Rejected alternative: leave the boundary only in source code.
  - Microsecond estimate: 0 measured.

## Verification: Settings route validation hardening

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
- Process check: no `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind.

## Slice: Core clinical route validation hardening

- [x] Patient routes now own public validation copy.
  - Implementation: `routes/patients.ts` safe-parses patient create/update and administrative-profile update before mutating sample state.
  - DOD practice: invalid patient payloads return bounded Russian operator messages instead of global zod `issues`, field paths, or schema keys.
  - Rejected alternative: keep the global zod handler for patient forms; rejected because patient intake/update is a front-desk workflow, not a developer diagnostics view.
  - Microsecond estimate: 0 measured.
- [x] Schedule and billing mutations now own invalid-body copy.
  - Implementation: `routes/schedule.ts` safe-parses appointment create/update with schedule-specific messages, and `routes/billing.ts` stops joining payment zod issue text into API messages.
  - DOD practice: bad appointment/payment submissions fail before domain mutation with one route action while existing 404/409 domain checks stay unchanged.
  - Rejected alternative: sanitize individual issue messages; rejected because field names such as `doctorUserId`, `startsAt`, `amountRub`, and `fiscalReceipt` are implementation detail for operators.
  - Microsecond estimate: 0 measured.
- [x] AI, communication, and clinical-rule routes no longer expose validator issue lists.
  - Implementation: `routes/ai.ts`, `routes/communications.ts`, and `routes/clinical.ts` return stable route-owned messages for invalid AI job, visit draft, task-complete, and clinical-rule evaluate/create/update payloads.
  - DOD practice: AI remains draft-only and invalid request copy stays operator-facing; clinical-rule changes keep schema precision internally but hide parser paths from admins.
  - Rejected alternative: leave AI/clinical invalid routes for later; rejected because these routes are next-action surfaces used by doctors/admins.
  - Microsecond estimate: 0 measured.
- [x] Added runtime/source proof for core route validation.
  - Implementation: `smoke:core-route-validation` checks targeted source guards and invalid compiled Fastify responses for patient, schedule, billing, AI, communication, and clinical-rule routes under production-style clinical/schedule secrets.
  - DOD practice: regression test proves both no direct body parser calls and no raw `issues`, field names, parser tokens, or internal workflow keys in runtime responses.
  - Rejected alternative: update only existing smokes; rejected because each existing smoke covered one product contract and missed cross-route validation leaks.
  - Microsecond estimate: 0 measured.
- [x] Patient create smoke and product risk audit now reflect the public API contract.
  - Implementation: `smoke:patient-create-contract` now expects bounded `PatientValidationError` responses and verifies no zod issue payload leaks while keeping direct domain create checks.
  - DOD practice: contract tests assert the API boundary and the domain invariant separately.
  - Rejected alternative: weaken the patient smoke to status-only; rejected because the exact response quality is the user-facing defect.
  - Microsecond estimate: 0 measured.

## Verification: Core clinical route validation hardening

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
- Process check: no `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind.

## Slice: Visit draft route validation hardening

- [x] Visit draft autosave now owns public validation copy.
  - Implementation: `routes/visits.ts` safe-parses autosave payloads through `parseVisitPayload` before `upsertVisitDraftAutosave`.
  - DOD practice: invalid autosave requests return one doctor-facing message and do not expose zod `issues`, parser paths, or visit draft DTO keys.
  - Rejected alternative: rely on the global zod handler; rejected because autosave is a clinical continuity path, not a diagnostics route.
  - Microsecond estimate: 0 measured.
- [x] Visit draft accept now owns public validation copy.
  - Implementation: `routes/visits.ts` safe-parses accept payloads before `acceptVisitDraft`.
  - DOD practice: invalid accept requests stop before active visit mutation, audit writes, revision changes, or save receipt creation.
  - Rejected alternative: sanitize zod issue text; rejected because EMR section and idempotency fields are route internals.
  - Microsecond estimate: 0 measured.
- [x] Added visit route validation proof.
  - Implementation: `smoke:visit-route-validation` checks source guards and invalid compiled Fastify responses for autosave and accept.
  - DOD practice: regression proof rejects raw `issues`, schema paths, parser tokens, and visit-draft DTO keys.
  - Rejected alternative: rely only on closed-visit status smoke; rejected because that does not prove invalid-payload copy.
  - Microsecond estimate: 0 measured.

## Slice: Speech route validation hardening

- [x] Speech recording strategy now owns public validation copy.
  - Implementation: `routes/speech.ts` safe-parses strategy requests through `parseSpeechPayload`.
  - DOD practice: invalid strategy requests return a bounded operator action before strategy calculation.
  - Rejected alternative: leave direct schema parse on a read route; rejected because Settings/Visit diagnostics are product surfaces.
  - Microsecond estimate: 0 measured.
- [x] Speech chunk upload now owns public validation copy.
  - Implementation: `routes/speech.ts` safe-parses chunk upload before clinical scope validation, queue/provider work, or gateway transcription.
  - DOD practice: bad chunks cannot expose zod `issues`, parser paths, or speech DTO keys.
  - Rejected alternative: move the check into provider code; rejected because malformed payloads must stop before provider, queue, and clinical-scope branches.
  - Microsecond estimate: 0 measured.
- [x] Added speech route validation proof.
  - Implementation: `smoke:speech-route-validation` checks source guards and invalid compiled Fastify responses for recording strategy, transcribe chunk, and polish transcript.
  - DOD practice: regression proof rejects raw zod `issues`, parser tokens, and speech DTO keys while existing provider-error and scope smokes keep their contracts.
  - Rejected alternative: only extend `smoke:speech-provider-errors`; rejected because provider errors and request validation are different failure classes.
  - Microsecond estimate: 0 measured.

## Verification: Visit + Speech route validation hardening

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
- Process check: no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc`/`dotnet` build or test process left behind.

## Slice: Telegram control-plane response hardening

- [x] Telegram link-code issuing failures no longer forward raw domain exception text.
  - Implementation: link-code catch now maps storage/encryption/scope failures through `TelegramChatEncryptionKeyMissing` or `TelegramLinkCodeScopeInvalid` with bounded `reason`.
  - DOD practice: public bodies no longer expose `DENTE_TELEGRAM_CHAT_ENCRYPTION_KEY`, raw chat-encryption storage text, subject lookup text, `undefined`, `null`, parser paths, or zod issues.
  - Microsecond estimate: 0 measured.
- [x] Telegram message-preview lookup failures no longer proxy sample-data exception copy.
  - Implementation: preview catch now maps missing patient/appointment/document/task/fallback to `TelegramMessagePreviewNotFound` plus `reason`.
  - DOD practice: the browser can branch on `patient_not_found`, `appointment_not_found`, `document_not_found`, `task_not_found`, or `preview_unavailable` without parsing Russian exception copy.
  - Microsecond estimate: 0 measured.
- [x] Runtime/source smoke coverage now proves these Telegram bodies.
  - Implementation: `smoke:telegram-validation` rejects raw source patterns and covers valid-shaped link-code encryption failure plus valid-shaped missing-patient preview.
  - DOD practice: malformed payload tests and state-rejection tests are separate.
  - Microsecond estimate: 0 measured.

## Verification: Telegram control-plane response hardening

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
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind.

## Slice: Global API error boundary hardening

- [x] Global zod fallback no longer exposes validation internals.
  - Implementation: `server.ts` now returns one bounded validation message from the global error handler and does not return `issues`, schema paths, parser tokens, or DTO field names.
  - DOD practice: route-owned validation copy remains preferred, while the global Fastify handler is now a last safety boundary for missed direct parses.
  - Rejected alternative: map each zod issue into public copy; rejected because issue paths still teach clinic staff internal DTO shape.
  - Microsecond estimate: 0 measured.
- [x] API app creation is testable without starting side effects.
  - Implementation: `server.ts` now exports `createDenteApiApp` and `startDenteApiServer`; HTTP listen and Telegram due-worker startup run only through the entry point path.
  - DOD practice: runtime smokes can inject requests into the compiled API without binding a port or starting background delivery.
  - Rejected alternative: keep source-only checks; rejected because the real Fastify error handler must be proven on compiled runtime output.
  - Microsecond estimate: 0 measured.
- [x] Added global error-boundary proof.
  - Implementation: `smoke:api-global-error-boundary` imports the compiled app factory, mounts synthetic zod and technical-error routes, and proves both responses stay clinic-readable.
  - DOD practice: smoke rejects raw zod `issues`, field names, schema tokens, local file paths, env-like secret names, and stack/exception text.
  - Rejected alternative: rely on route validation smokes only; rejected because future routes can still miss route-owned safeParse.
  - Microsecond estimate: 0 measured.
- [x] Product docs now state the global fallback contract.
  - Implementation: `00-product-architecture.md` and `04-product-risk-audit.md` describe the bounded fallback and entrypoint-only side effects.
  - DOD practice: one error-boundary rule is documented for future API routes instead of letting every route rediscover it.
  - Rejected alternative: only log the change in agent notes; rejected because API behavior is a product trust rule.
  - Microsecond estimate: 0 measured.

## Verification: Global API error boundary hardening

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
- Process check: no `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind.

## Slice: Telegram settings validation boundary

- [x] Telegram settings route no longer parses request bodies directly.
  - Implementation: `PUT /api/settings/telegram` now uses `parseTelegramRouteBody(updateDenteTelegramBotSettingsSchema, request.body)` before `updateDenteTelegramBotSettings`.
  - DOD practice: malformed settings payloads stop before Telegram settings mutation and return the same bounded Telegram validation copy as other control-plane payloads.
  - Rejected alternative: keep catch-and-humanize around direct schema parse; rejected because zod issue text can include DTO paths before the settings-specific humanizer sees a business validation reason.
  - Microsecond estimate: 0 measured.
- [x] Existing Telegram URL/secret humanizer remains on business validation.
  - Implementation: only schema-body validation moved to `parseTelegramRouteBody`; post-parse `updateDenteTelegramBotSettings` errors still pass through `readableTelegramSettingsValidationMessage`.
  - DOD practice: malformed JSON shape and invalid configured URLs are separate failure classes with separate public copy.
  - Rejected alternative: route every settings error through the generic Telegram message; rejected because URL labels and signed-button setup need targeted operator actions.
  - Microsecond estimate: 0 measured.
- [x] Telegram validation smoke now covers Settings payloads.
  - Implementation: `smoke:telegram-validation` rejects direct `updateDenteTelegramBotSettingsSchema.parse(request.body)`, requires the shared parser, and injects malformed `PUT /api/settings/telegram`.
  - DOD practice: runtime proof rejects raw schema detail, admin/webhook secret leakage, and mojibake markers on the Settings/Telegram route as well as webhook/outbox/link-code/preview routes.
  - Rejected alternative: rely on source grep only; rejected because the route must be proven through compiled Fastify injection.
  - Microsecond estimate: 0 measured.
- [x] Telegram docs record the validation boundary.
  - Implementation: `13-dente-telegram-bot-plan.md` and `04-product-risk-audit.md` now state that settings payload validation uses the shared Telegram route-body parser before mutation.
  - DOD practice: future Telegram settings fields inherit the same API boundary.
  - Rejected alternative: only record this in smoke names; rejected because Telegram settings is a clinic control-plane product rule.
  - Microsecond estimate: 0 measured.

## Verification: Telegram settings validation boundary

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
- Process check: no `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind.

## Slice: Speech clinical scope response hardening

- [x] Speech clinical-scope failures now have a stable public error code.
  - Implementation: `validateSpeechClinicalScope` now returns `SpeechClinicalScopeError` plus a separate Russian `message`, and every speech scope route uses `sendSpeechScopeValidationError`.
  - DOD practice: API machines can key on one error code while doctors/admins see one clear recovery sentence.
  - Rejected alternative: keep the previous human text in `error`; rejected because it made the public code unstable and mixed operator copy with transport contract.
  - Microsecond estimate: 0 measured.
- [x] Speech scope copy no longer exposes route internals.
  - Implementation: missing patient/visit scope, unknown patient, unknown visit, visit-patient mismatch, and clinic mismatch were rewritten without `visitId`, `patientId`, `request.query`, helper names, or null/undefined wording.
  - DOD practice: PHI-scope failures should describe the next safe action, not leak implementation shape.
  - Rejected alternative: return raw ids to make support easier; rejected because the browser/API edge is not a diagnostics sink.
  - Microsecond estimate: 0 measured.
- [x] Speech warning copy covers damaged audio, dental prompt setup, and local parser drafts.
  - Implementation: `smoke:speech-clinical-scope` now proves damaged audio chunks, dental prompt warnings, and rule-based draft warnings use clinic-readable Russian copy and reject env/parser/base64/byte-limit jargon.
  - DOD practice: dictation recovery stays useful when provider audio or local parsing fails.
  - Rejected alternative: leave these as developer diagnostics; rejected because they surface in doctor/admin workflows.
  - Microsecond estimate: 0 measured.
- [x] Speech scope docs record the public API boundary.
  - Implementation: `05-speech-transcription-plan.md` and `04-product-risk-audit.md` now document stable scope errors and speech warning copy restrictions.
  - DOD practice: future speech routes inherit the same external contract.
  - Rejected alternative: rely only on smoke names; rejected because PHI scope behavior is a product-risk rule.
  - Microsecond estimate: 0 measured.

## Verification: Speech clinical scope response hardening

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

## Slice: Billing payment scope response hardening

- [x] Billing payment scope/link failures now have a stable public error code.
  - Implementation: `routes/billing.ts` returns `BillingPaymentScopeError` plus a separate Russian `message` for missing patient, missing visit, missing document, patient/document mismatch, visit/document mismatch, voided document, and non-financial document link failures.
  - DOD practice: payment clients can key on one stable failure class while clinic staff see a concrete correction action.
  - Rejected alternative: keep Russian text directly in `error`; rejected because it mixes machine contract with operator copy and can drift per translation.
  - Microsecond estimate: 0 measured.
- [x] Billing link smoke now proves body shape, not only status code.
  - Implementation: `smoke:billing-document-link` asserts `BillingPaymentScopeError`, message text, and no `patientId`/`visitId`/`documentId`/`amountRub`/parser terms in scope/link failures.
  - DOD practice: wrong patient, unknown patient, unknown visit, unknown document, and non-financial document cases are executable API evidence.
  - Rejected alternative: status-only smoke; rejected because the prior route already had correct 404/409 statuses but weak public body contract.
  - Microsecond estimate: 0 measured.
- [x] Existing bad-payload payment validation remains separate.
  - Implementation: malformed payment payloads still return `BillingValidationError` and the existing route-owned payment validation message; scope/link checks only run after a valid payload.
  - DOD practice: schema validation, clinical-finance scope, and domain payment creation are separate failure classes.
  - Rejected alternative: reuse `BillingValidationError` for link/scope failures; rejected because a valid request linked to the wrong patient is not a malformed payload.
  - Microsecond estimate: 0 measured.
- [x] Product risk audit records the payment scope boundary.
  - Implementation: `04-product-risk-audit.md` now documents stable `BillingPaymentScopeError` and the no-route-id public copy rule.
  - DOD practice: future payment/document link failures extend the same public contract.
  - Rejected alternative: log-only note; rejected because billing scope is a medical trust and payment audit rule.
  - Microsecond estimate: 0 measured.

## Verification: Billing payment scope response hardening

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
- Process check: no `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind.

## Slice: Imaging study scope response hardening

- [x] Imaging study lookup failures now have a stable public error code.
  - Implementation: viewer-session read, viewer-session save, and preview lookup now return `ImagingStudyNotFound` plus the Russian operator message `Снимок не найден.`.
  - DOD practice: API clients key on a stable code while clinic users see a bounded correction sentence.
  - Rejected alternative: keep `Study not found` / `Imaging study not found`; rejected because English text in `error` is neither localizable nor a stable machine contract.
  - Microsecond estimate: 0 measured.
- [x] Imaging study create scope failures now use a stable public scope code.
  - Implementation: missing patient, missing visit, visit-patient mismatch, and clinic mismatch now return `ImagingStudyScopeError` plus Russian operator copy.
  - DOD practice: clinical scope validation stays separate from malformed payload validation and from successful imaging save.
  - Rejected alternative: put Russian copy directly in `error`; rejected because copy changes should not break API consumers.
  - Microsecond estimate: 0 measured.
- [x] Imaging study visit smoke now proves body shape and leakage guards.
  - Implementation: `smoke:imaging-study-visit-scope` asserts stable `error`, Russian `message`, viewer-session not-found, preview not-found, missing patient, missing visit, and wrong-patient visit cases.
  - DOD practice: route ids, parser names, `request.body`, `request.params`, null/undefined, and old English not-found copy are blocked by executable evidence.
  - Rejected alternative: status-only smoke; rejected because the broken state already had useful statuses but weak public bodies.
  - Microsecond estimate: 0 measured.
- [x] Imaging plan and product-risk docs record the public contract.
  - Implementation: `10-imaging-dicom-viewer-plan.md` and `04-product-risk-audit.md` document `ImagingStudyNotFound` / `ImagingStudyScopeError` and the no-route-internals copy rule.
  - DOD practice: future imaging routes inherit the same external boundary.
  - Rejected alternative: log-only note; rejected because imaging lookup/scope failures are a product trust boundary.
  - Microsecond estimate: 0 measured.

## Verification: Imaging study scope response hardening

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
- Process check: no `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind.

## Slice: AI recognition scope response hardening

- [x] AI recognition scope failures now use a stable public error code.
  - Implementation: unknown patient, unknown imaging study, and wrong-patient imaging links return `AiRecognitionScopeError` plus a separate Russian `message`.
  - DOD practice: bad payload validation stays `AiRecognitionValidationError`; valid payloads with wrong clinical/image scope are a separate failure class.
  - Rejected alternative: keep `Пациент не найден`, `Снимок не найден`, or wrong-patient copy directly in `error`; rejected because `error` is the API machine field.
  - Microsecond estimate: 0 measured.
- [x] Visit-note draft missing-patient failures now use a stable public error code.
  - Implementation: `/api/ai/visit-note-draft` returns `VisitNoteDraftScopeError` plus the same operator patient-selection recovery message.
  - DOD practice: deterministic draft parsing remains unchanged; only the public failure body changed.
  - Rejected alternative: reuse `VisitNoteDraftValidationError`; rejected because valid transcript payload against a missing patient is not malformed input.
  - Microsecond estimate: 0 measured.
- [x] AI scope smoke now proves public body shape.
  - Implementation: `smoke:ai-recognition-scope` asserts stable `error`, Russian `message`, and no `patientId`, `imagingStudyId`, `request.body`, parser/schema, null, or undefined leakage.
  - DOD practice: prior status-only checks can no longer pass a weak response contract.
  - Rejected alternative: source-only guard; rejected because compiled Fastify injection must prove the response body.
  - Microsecond estimate: 0 measured.
- [x] AI/risk docs record the public boundary.
  - Implementation: `02-ai-and-migration-plan.md` and `04-product-risk-audit.md` document the stable AI scope codes and no-route-internals rule.
  - DOD practice: future `/api/ai/*` work inherits the same machine-code plus operator-message split.
  - Rejected alternative: log-only note; rejected because AI draft scope sits on the medical trust boundary.
  - Microsecond estimate: 0 measured.

## Verification: AI recognition scope response hardening

- `npm run typecheck -w @dental/api`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:ai-recognition-scope`: passed.
- `npm run smoke:core-route-validation`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Slice: Patient route not-found response hardening

- [x] Patient update missing-record failures now use a stable public error code.
  - Implementation: `/api/patients/:patientId` returns `PatientNotFound` plus Russian `message` instead of forwarding domain `error.message`.
  - DOD practice: patient create/update malformed payloads stay `PatientValidationError`; valid update payloads against missing records are separate lookup failures.
  - Rejected alternative: keep forwarding `Пациент не найден` through `error`; rejected because domain exceptions are not public API codes.
  - Microsecond estimate: 0 measured.
- [x] Patient administrative-profile missing-record failures now use the same stable public code.
  - Implementation: `/api/patients/:patientId/administrative-profile` returns `PatientNotFound` with the same operator recovery message.
  - DOD practice: administrative profile validation remains separate from lookup failure.
  - Rejected alternative: add a separate administrative not-found code; rejected because the missing entity is still the patient card.
  - Microsecond estimate: 0 measured.
- [x] Patient route smoke now proves not-found body shape.
  - Implementation: `smoke:patient-create-contract` asserts `PatientNotFound`, message copy, no zod issues, and no `patientId`, DTO field, `error.message`, parser/schema, null, or undefined leakage for core and administrative updates.
  - DOD practice: status-only not-found checks can no longer pass a weak public body.
  - Rejected alternative: rely on clinical mutation guard; rejected because guard proof does not inspect route body shape after authorization.
  - Microsecond estimate: 0 measured.

## Verification: Patient route not-found response hardening

- `npm run typecheck -w @dental/api`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:patient-create-contract`: passed.
- `npm run smoke:core-route-validation`: passed.
- `npm run smoke:clinical-mutation-guard`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Slice: Schedule mutation response hardening

- [x] Appointment create/update mutation failures no longer forward domain exception text.
  - Implementation: `/api/appointments` and appointment update routes classify domain exceptions into stable `code`, bounded `reason`, and Russian route-owned `message`.
  - DOD practice: malformed payloads remain `AppointmentValidationError`; valid payloads rejected by state/scope/schedule rules are separate mutation failures.
  - Rejected alternative: keep `error.message` in `message`; rejected because domain exceptions are internal control flow, not the public transport contract.
  - Microsecond estimate: 0 measured.
- [x] Active-visit locks and missing appointments now have bounded public bodies.
  - Implementation: terminal status changes on an appointment with an open draft visit return `AppointmentUpdateRejected` plus `reason: active_visit_locked`; unknown appointment updates return `AppointmentNotFound` plus `reason: appointment_not_found`.
  - DOD practice: public bodies reject raw `appointmentId`, parser/schema terms, `request.body`, null, and undefined.
  - Rejected alternative: retain status-only assertions; rejected because the weak state had correct status codes but unstable messages.
  - Microsecond estimate: 0 measured.
- [x] Schedule smokes now prove bounded validation and mutation response contracts.
  - Implementation: `smoke:schedule-configuration`, `smoke:schedule-active-visit-status-contract`, and `smoke:core-route-validation` assert route-owned validation copy, `reason` enums, no `error` field on schedule rejections, and no raw zod issue leakage.
  - DOD practice: overlap, outside-hours, missing-assistant, invalid merged-time, missing appointment, and active-visit-lock cases are covered.
  - Rejected alternative: leave old zod issue expectations for invalid calendar/hour payloads; rejected because route-owned validation is the accepted boundary.
  - Microsecond estimate: 0 measured.

## Verification: Schedule mutation response hardening

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
- `npm run smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind; unrelated Unity Roslyn `dotnet ... VBCSCompiler.dll` was already present and was not touched.

## Slice: Settings and communications mutation response hardening

- [x] Settings mutation failures no longer forward raw domain exception text.
  - Implementation: clinic-profile schedule conflicts return `ClinicProfileMutationRejected`; staff/chair missing resources return `StaffScheduleNotFound` / `ChairScheduleNotFound`; staff/chair active-appointment conflicts return `StaffScheduleRejected` / `ChairScheduleRejected`.
  - DOD practice: public bodies carry stable `error`, bounded `reason`, and Russian `message`; no DTO terms such as `workingHours`, `staffId`, or `chairId` are used in public machine codes.
  - Rejected alternative: keep `StaffWorkingHours*` machine codes; rejected because the code itself leaked a settings DTO key.
  - Microsecond estimate: 0 measured.
- [x] Communication task not-found is now a bounded public response.
  - Implementation: completing a stale communication task returns `CommunicationTaskNotFound`, `reason: task_not_found`, and route-owned operator copy instead of `error.message`.
  - DOD practice: malformed communication payloads remain `CommunicationTaskValidationError`; valid stale task actions are separate lookup failures.
  - Rejected alternative: keep the Russian domain exception in `message`; rejected because route exceptions are not public API copy.
  - Microsecond estimate: 0 measured.
- [x] Runtime/source smoke coverage now proves these bodies.
  - Implementation: `smoke:settings-route-validation`, `smoke:schedule-configuration`, `smoke:communication-task-complete-contract`, and `smoke:core-route-validation` reject raw zod issue arrays, parser/schema text, route ids, DTO keys, `null`/`undefined`, and raw domain phrases in these failures.
  - DOD practice: status-only checks can no longer pass weak settings or communications failure bodies.
  - Microsecond estimate: 0 measured.

## Verification: Settings and communications mutation response hardening

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
- Process check: no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc`/`dotnet` build or test process left behind.

## Slice: Visit draft mutation response hardening

- [x] Visit draft state failures no longer forward raw domain exception text.
  - Implementation: draft autosave/accept mutation errors are classified through `visitDraftDomainMessage()` and returned as `VisitNotFound` or `VisitDraftMutationRejected` with bounded `reason`.
  - DOD practice: closed signed/voided visits return operation-specific Russian `message` without repeating the domain exception phrase.
  - Rejected alternative: keep the old closed-visit domain phrase in bounded copy; rejected because runtime smoke correctly treated it as raw exception leakage.
  - Microsecond estimate: 0 measured.
- [x] Visit runtime smoke now proves body shape, not only status.
  - Implementation: `smoke:visit-draft-status-contract` asserts `reason`, message, no zod issues, no route ids, no DTO keys, and no raw visit exception strings for closed autosave, closed accept, and unknown visit autosave.
  - DOD practice: `smoke:visit-route-validation` also rejects old source patterns that forwarded `error.message`.
  - Microsecond estimate: 0 measured.

## Verification: Visit draft mutation response hardening

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

## Slice: Speech chunk rejection response hardening

- [x] Speech chunk audio decode failures no longer forward decoder text.
  - Implementation: `SpeechChunkPayloadError` is translated at the route boundary into `SpeechChunkRejected`, `reason: audio_rejected`, and bounded Russian recovery copy.
  - DOD practice: public bodies no longer expose `audioBase64`, base64, byte limits, MIME, parser/path details, or the internal payload exception.
  - Microsecond estimate: 0 measured.
- [x] Speech recording retry identity conflicts no longer expose queue internals.
  - Implementation: `SpeechChunkIdentityConflictError` is translated into `SpeechChunkRejected`, `reason: chunk_conflict`, and operator recovery copy.
  - DOD practice: retry conflicts remain recoverable client workflow states; no `recordingId`, `chunkIndex`, or English domain exception leaves the API.
  - Rejected alternative: reuse the raw storage exception text; rejected because it described queue identity mechanics, not a clinic action.
  - Microsecond estimate: 0 measured.
- [x] Smoke coverage proves source and runtime body shape.
  - Implementation: `smoke:speech-route-validation` now rejects old `error.message` send patterns; `smoke:speech-clinical-scope` now asserts `audio_rejected` and `chunk_conflict` runtime bodies.
  - DOD practice: status-only speech tests can no longer pass these weak rejection paths.
  - Microsecond estimate: 0 measured.

## Verification: Speech chunk rejection response hardening

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
- Process check: no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc`/`dotnet` build or test process left behind.

## Slice: Document operation response contract hardening

- [x] Document operational refusals no longer put Russian operator copy in the machine `error` field.
  - Implementation: `apiError()` now returns stable `DocumentOperationRejected` plus a separate repaired Russian `message`.
  - Scope: missing document HTML, printable HTML blockers, issue-chain blockers, tax duplicate/payment-scope blockers, tax XML blockers, PDF/HTML document operation failures that use the shared route helper.
  - Runtime frame path: 0 measured; added cost is one extra response field only on rejected document operations.
- [x] KND 1151156 invalid taxpayer INN remains operator-readable without raw zod leakage.
  - Implementation: document create validation has a route-owned safe special case for non-empty KND 1151156 INN values that are not 12 digits; all other malformed document create payloads keep the bounded generic create message.
  - Rejected alternative: restore `parsedInput.error.issues[0]?.message`; rejected because it reopens raw schema issue leakage.
- [x] Document/tax smokes now prove message/error separation.
  - Implementation: document/tax runtime smokes read operator text from `message ?? error`, and `smoke:document-route-validation` / `smoke:document-html-issue-guards` assert `DocumentOperationRejected` stays non-Russian and no zod `issues` leak.

## Verification: Document operation response contract hardening

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
- `npm run build -w @dental/web`: passed; Vite reports the existing large `workspace` chunk warning, not treated as a gate.
- `smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind; unrelated Unity `dotnet` processes were present and were not touched.

## Slice: Telegram chat-link revoke response hardening

- [x] Missing Telegram chat-link revoke now returns operator-readable copy.
  - Implementation: `POST /api/telegram/chat-links/:linkId/revoke` keeps stable `TelegramChatLinkNotFound` and adds a bounded Russian `message` for missing or stale bindings in the selected runtime scope.
  - DOD practice: Settings/Telegram UI and integrations can branch on one code while staff see why revoke did not happen.
  - Rejected alternative: keep the bare `{ error: "TelegramChatLinkNotFound" }`; rejected because it leaves the operator without a recovery sentence and gives no smoke proof against route-id leakage.
  - Microsecond estimate: 0 measured.
- [x] Telegram validation smoke now proves the revoke body contract.
  - Implementation: `smoke:telegram-validation` injects an unknown chat-link revoke, asserts the code/message, rejects mojibake and secrets, and forbids `linkId`, runtime-scope ids, request params/query/body, parser terms, null/undefined, and old bare-code source.
  - DOD practice: not-found revoke stays a controlled admin workflow instead of an implementation-shaped response.
  - Rejected alternative: rely on source-only UI smoke; rejected because the weak path is an API runtime body.
  - Microsecond estimate: 0 measured.
- [x] Telegram plan and product-risk audit record the revoke boundary.
  - Implementation: `13-dente-telegram-bot-plan.md` and `04-product-risk-audit.md` now document the `TelegramChatLinkNotFound` message contract.
  - DOD practice: future chat-link mutations inherit the same no-route-id public response rule.
  - Rejected alternative: record only in final chat; rejected because the project memory is in disk artifacts.
  - Microsecond estimate: 0 measured.

## Verification: Telegram chat-link revoke response hardening

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
- `smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind.

## Slice: Pricelist warning UI humanization

- [x] Price-list result warnings no longer render raw analyzer ids.
  - Implementation: `pricelistUiMeta.ts` owns `pricelistWarningsText`, with Russian labels for price, material, restoration, OCR/image, and empty-row warning ids. `SettingsView` uses it for row warnings and analysis-level notes.
  - DOD practice: admins see clinic-readable review actions instead of `price_not_found`, `image_payload_invalid`, or provider skip ids.
  - Rejected alternative: keep `warnings.join(", ")`; rejected because it exposes backend analyzer ids in the Settings result panel.
  - Microsecond estimate: 0 measured.
- [x] Price-list smoke now guards the visible warning contract.
  - Implementation: `smoke:pricelist-analyzer` requires the warning humanizer and fails if the old raw price-list warning JSX returns.
  - DOD practice: analyzer ids remain internal DTO state, not user-facing copy.
  - Rejected alternative: rely on manual UI review; rejected because the regression is a source-level copy leak.
  - Microsecond estimate: 0 measured.
- [x] AI/migration plan and product-risk audit record the boundary.
  - Implementation: `02-ai-and-migration-plan.md` and `04-product-risk-audit.md` now document warning-label ownership for the price-list result panel.
  - DOD practice: future price-list warning additions must update UI labels or consciously fall back to cleaned text.
  - Rejected alternative: log only in chat; rejected because this is a project UI/API contract.
  - Microsecond estimate: 0 measured.

## Verification: Pricelist warning UI humanization

- `npm run typecheck -w @dental/web`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:pricelist-analyzer`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed; Vite reports the existing large `workspace` chunk warning, not treated as a gate.
- `smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Slice: Executable CT progressive stages and model workbench routing

- [x] Render-cache plans now expose executable progressive stages.
  - Implementation: shared/API contracts add `progressiveStages` with stage kind, request pattern, request type, cancel group, prerequisites, bounded `sliceOrder`, decimation, and resident-window limit.
  - DOD practice: future Cornerstone/OHIF/local adapters can execute the server-owned CT schedule instead of inventing load order in the client.
  - Rejected alternative: keep phase prose only; rejected because prose cannot drive request-pool order or cancellation.
  - Microsecond estimate: 0 measured.
- [x] Local imaging organizer now emits model-workbench manifests.
  - Implementation: CT surface model candidates get role, format, size, load target, CT pairing hint, warnings, and next action.
  - DOD practice: skull/mandible/maxilla/bone surface files route to local bridge or external 3D viewing without loading meshes into CRM.
  - Rejected alternative: render STL/OBJ/GLB in Settings; rejected because the organizer only needs route metadata and heavy mesh rendering belongs to a local/external model viewer.
  - Microsecond estimate: 0 measured.

## Verification: Executable CT progressive stages and model workbench routing

- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed; verifies progressive stage order/counts, interleaved interaction request type, cancel group/prerequisite, and skull-surface local-bridge pairing.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed; Vite reports the existing large `workspace` chunk warning, not treated as a gate.
- `smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind.

## Slice: Import row warning UI hardening

- [x] Patient and imaging import row warnings no longer render through raw joined arrays.
  - Implementation: `SettingsView` now owns `patientImportRowWarningText` and `imagingImportRowWarningText`; both route row warnings through `humanizeMigrationText` before visible rendering.
  - DOD practice: admins see readable row actions instead of raw warning joins.
  - Rejected alternative: make one global Settings warning formatter; rejected because other domains need owner-specific copy and leakage rules.
  - Microsecond estimate: 0 measured.
- [x] Imaging ready rows no longer default to full local file paths.
  - Implementation: the imaging import ready fallback now shows a safe file name when available, otherwise a clean "ready to link" message.
  - DOD practice: visible row state identifies the file without using full workstation paths as routine UI copy.
  - Rejected alternative: keep `row.filePath` as the fallback; rejected because full local paths are implementation detail and privacy noise.
  - Microsecond estimate: 0 measured.
- [x] Settings source smoke guards the import-row copy contract.
  - Implementation: `smoke:settings-view-source` requires both row warning helpers and rejects the old patient/imaging `row.warnings.join(", ")` fallbacks.
  - DOD practice: source checks prevent regression to raw warning arrays in migration/import rows.
  - Rejected alternative: rely on backend Russian warning strings; rejected because the UI was still structurally unsafe.
  - Microsecond estimate: 0 measured.

## Verification: Import row warning UI hardening

- `npm run typecheck -w @dental/web`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:import-contracts`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed; Vite reports the existing large `workspace` chunk warning, not treated as a gate.
- `smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind.

## Slice: AI recognition warning UI hardening

- [x] Settings AI recognition result warnings no longer render raw backend strings.
  - Implementation: `SettingsView` now owns `aiRecognitionWarningText` and a clinical label map for OCR/preview/AI-safety recognition warnings.
  - DOD practice: admins see review actions, not raw backend warning copy.
  - Rejected alternative: rewrite API warning DTOs; rejected because stable backend warnings remain useful for audit and tests.
  - Microsecond estimate: 0 measured.
- [x] Settings source smoke guards the AI recognition warning contract.
  - Implementation: `smoke:settings-view-source` requires the UI-owned formatter and rejects the old `typedRecognitionJob.warnings` raw render.
  - DOD practice: a future recognition warning cannot silently return to `{warning}` in the visible result panel.
  - Rejected alternative: rely on Russian backend strings; rejected because backend copy still included OCR/preview/AI wording.
  - Microsecond estimate: 0 measured.
- [x] AI/migration and product-risk docs record the UI/API boundary.
  - Implementation: `02-ai-and-migration-plan.md` and `04-product-risk-audit.md` now record the recognition warning label ownership.
  - DOD practice: new recognition warnings must be reviewed at the UI copy boundary.
  - Rejected alternative: chat-only report; rejected because this is a durable public-copy contract.
  - Microsecond estimate: 0 measured.

## Verification: AI recognition warning UI hardening

- `npm run typecheck -w @dental/web`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:ai-recognition-scope`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed; Vite reports the existing large `workspace` chunk warning, not treated as a gate.
- `smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind.

## Slice: Clinic public lookup warning UI hardening

- [x] Clinic public lookup warnings no longer render raw warning strings in Settings.
  - Implementation: `SettingsView` now owns `clinicPublicLookupWarningText`; clinic lookup, import-side lookup, migration-autopilot lookup, and smart-import clinic suggestion warnings use it before display.
  - DOD practice: admins see duplicate requisites, service errors, and lookup safety notes as operator actions instead of raw warning chips.
  - Rejected alternative: rewrite smart-import API warning DTOs; rejected because stable route warnings remain useful for audit/export.
  - Microsecond estimate: 0 measured.
- [x] Settings source smoke guards lookup warning rendering.
  - Implementation: `smoke:settings-view-source` requires the lookup warning formatter and rejects the old raw lookup/smart-import warning chips.
  - DOD practice: future clinic lookup warning additions cannot silently return to `<small>{warning}</small>` in these panels.
  - Rejected alternative: rely on `humanizeMigrationText` everywhere; rejected because lookup warnings need field-aware duplicate-value copy.
  - Microsecond estimate: 0 measured.
- [x] Migration docs record the clinic lookup UI/API boundary.
  - Implementation: `02-ai-and-migration-plan.md` and `04-product-risk-audit.md` now record UI ownership for clinic lookup warning labels.
  - DOD practice: backend keeps route warnings stable; browser owns operator copy.
  - Rejected alternative: chat-only report; rejected because this is a public migration UI contract.
  - Microsecond estimate: 0 measured.

## Verification: Clinic public lookup warning UI hardening

- `npm run typecheck -w @dental/web`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:settings-view-source`: passed.
- `npm run smoke:import-contracts`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run smoke:web-render-gating-source`: passed.
- `npm run build -w @dental/web`: passed; Vite reports the existing large `workspace` chunk warning, not treated as a gate.
- `smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind.

## Slice: DICOM planning route copy hardening

- [x] DICOM planning task titles, reasons, and blocker warnings no longer expose English CT planning copy.
  - Implementation: `imaging.ts` now returns Russian operator titles/reasons/blockers for OPG, cross-sections, ruler, angle, ROI, implant axis/library, nerve canal, density probe, and surgical guide tasks.
  - DOD practice: CT workflow/export packets can show planning facts without English `Volume stack`, `Panoramic reconstruction`, or implant-library warning text.
  - Rejected alternative: humanize only in the browser; rejected because these fields are API packet text used by exports and handoffs.
  - Microsecond estimate: 0 measured.
- [x] Imaging source smoke guards the route-owned DICOM planning copy boundary.
  - Implementation: `smoke:imaging-viewer-usability-source` requires Russian task/warning snippets and forbids the old English strings in `imaging.ts`.
  - DOD practice: future DICOM planning task changes cannot silently return to English operator-facing copy.
  - Rejected alternative: rely on manual review; rejected because this copy flows through generated planning packages.
  - Microsecond estimate: 0 measured.
- [x] Imaging/product-risk docs record the API-owned copy contract.
  - Implementation: `10-imaging-dicom-viewer-plan.md` and `04-product-risk-audit.md` now record Russian route ownership for DICOM planning task copy.
  - DOD practice: CT route packets keep stable DTO fields while visible labels stay clinic-readable.
  - Rejected alternative: chat-only report; rejected because this is a durable API/export boundary.
  - Microsecond estimate: 0 measured.

## Verification: DICOM planning route copy hardening

- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run smoke:api-text-encoding`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run smoke:dicom-workbench-offline-source`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build, dev, or test process left behind.
- `npm run build -w @dental/api`: passed.
- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed; Vite reports the existing large `workspace` chunk warning, not treated as a gate.
- `smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.
- Old English DICOM planning strings remain only inside smoke `forbidIn` guards, not in `imaging.ts`.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind.

## Slice: CT geometry budgets and surface-model organizer roles

- [x] DICOM workup now carries image geometry into series groups and render planning.
  - Implementation: shared/API schemas and `imaging.ts` now parse Rows, Columns, bit depth, samples per pixel, and estimated pixel bytes from bounded DICOM headers or manifest rows.
  - DOD practice: memory/GPU estimates use pixel geometry when available instead of pretending every slice costs the same.
  - Rejected alternative: keep fixed per-file estimates; rejected because CBCT stacks with different dimensions would get dishonest workstation decisions.
  - Microsecond estimate: 0 measured.
- [x] Render-cache planning now separates CT interaction phases.
  - Implementation: API render-cache plan returns external review, first visible slice, interactive navigation, and idle refinement phase metadata; Settings shows the phase budget.
  - DOD practice: a future viewer can paint orientation first, keep scroll/navigation responsive, and postpone heavy refinement.
  - Rejected alternative: one monolithic "load volume" task; rejected because it blocks weak workstations before the doctor can orient.
  - Microsecond estimate: 0 measured.
- [x] Local organizer now recognizes CT-derived skull/bone surface model roles.
  - Implementation: shared roles and API detection now classify skull surface, maxilla surface, mandible surface, and CT bone surface CAD/model files without loading meshes.
  - DOD practice: 3D skull/mandible assets can be routed to the right future viewer/lab path while CRM remains metadata-only.
  - Rejected alternative: load STL/OBJ/GLB meshes in the CRM shell; rejected because it increases PHI/memory risk and is not required for organizer decisions.
  - Microsecond estimate: 0 measured.

## Verification: CT geometry budgets and surface-model organizer roles

- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:dicom-folder-workup`: passed; verifies 32x32 and 1024x1024 geometry-derived memory, render interaction phases, and synthetic skull/mandible surface roles.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed; Vite reports the existing large `workspace` chunk warning, not treated as a gate.
- `smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Slice: CT runtime profile for online/offline and device modes

- [x] DICOM workstation readiness now exposes a runtime profile.
  - Implementation: shared/API contracts classify `mobile_web`, `tablet_web`, `desktop_web`, `desktop_app`, network mode, and CT execution lane.
  - DOD practice: the app no longer treats phone, PC browser, desktop app, local folder, and remote archive as the same CT workstation.
  - Rejected alternative: gate only by WebGL and memory; rejected because offline source type and desktop-app local file access change the correct route.
  - Microsecond estimate: 0 measured.
- [x] Render planning now honors runtime mode.
  - Implementation: mobile/tablet routes use preview/handoff; desktop app can keep offline local CT work; offline remote DICOMweb/PACS routes become metadata-only.
  - DOD practice: no decode/upload tasks are scheduled when remote pixels are unavailable offline.
  - Rejected alternative: allow browser MPR on every high-memory mobile client; rejected because touch/mobile memory pressure and storage eviction make that an unreliable clinical route.
  - Microsecond estimate: 0 measured.
- [x] Settings and source smoke guard operator copy for runtime lanes.
  - Implementation: Settings maps execution lanes to Russian labels, and API readiness details use `describeDicomExecutionLaneForOperator`.
  - DOD practice: internal lane ids stay machine fields and do not leak into the operator panel.
  - Rejected alternative: render raw `browser_mpr`/`metadata_only`; rejected because this is a clinic-facing readiness card.
  - Microsecond estimate: 0 measured.

## Verification: CT runtime profile for online/offline and device modes

- `npm run typecheck -w @dental/shared`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed; verifies desktop browser MPR, mobile browser preview, desktop app offline-local MPR, and offline remote metadata-only cache behavior.
- `npm run smoke:api-text-encoding`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run smoke:web-code-split-source`: passed.
- `npm run build -w @dental/web`: passed; Vite reports the existing large `workspace` chunk warning, not treated as a gate.
- `smoke:web-bundle-budget`: intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Slice: IndexedDB accepted-visit offline queue

- [x] Accepted visit-note save retries now use IndexedDB instead of boot-time `localStorage` JSON.
  - Implementation: `App.tsx` adds a `pendingVisitSaves` object store to the existing `dental-crm-offline` database, with `queuedAt`, `organizationId`, and `visitId` indexes.
  - DOD practice: accepted EMR saves can wait across reloads on site/mobile/PC/desktop shell without synchronously reading web storage during React initialization.
  - Rejected alternative: keep the accepted-save queue in `localStorage`; rejected because a real offline clinic queue must not be limited to one synchronous JSON blob.
  - Microsecond estimate: 0 measured.
- [x] Legacy queue migration and fallback remain explicit.
  - Implementation: scoped and legacy `localStorage` queues are normalized, merged into IndexedDB, then removed after a successful migration. Restricted browsers still fall back to scoped `localStorage`.
  - DOD practice: old queued saves are not dropped during the storage upgrade.
  - Rejected alternative: clear and rewrite the whole queue without reading existing IndexedDB rows; rejected because it can erase same-origin queued work from another clinic scope.
  - Microsecond estimate: 0 measured.
- [x] Source smoke now guards this queue contract.
  - Implementation: `smoke:visit-offline-queue-source` verifies IndexedDB version/store/indexes, migration helpers, async queue/flush behavior, and no synchronous boot read.
  - DOD practice: future edits cannot silently move accepted visit saves back to the weaker storage path.
  - Microsecond estimate: 0 measured.

## Verification: IndexedDB accepted-visit offline queue

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

## Slice: IndexedDB CT workbench recovery

- [x] DICOM workbench recovery now uses IndexedDB instead of primary `localStorage`.
  - Implementation: `App.tsx` adds `dicomWorkbenchDrafts` to `dental-crm-offline` DB version 3, keyed by organization and indexed by organization, series, and saved time.
  - DOD practice: the last no-pixel CT workbench manifest can restore across reloads on site/mobile/PC/desktop shell without keeping pixel data in the CRM browser shell.
  - Rejected alternative: keep the DICOM workbench manifest in `localStorage`; rejected because CT recovery state is larger and more important than a convenience text field.
  - Microsecond estimate: 0 measured.
- [x] Per-series MPR controls now use IndexedDB.
  - Implementation: MPR view state writes to `mprWorkbenchDrafts`, keyed by organization plus series key, with localStorage migration/fallback.
  - DOD practice: a doctor can return to the last CT plane/window/slab/slice for the selected series without the app blocking boot or pretending the shell owns CT pixels.
  - Rejected alternative: store every MPR state as one global last view; rejected because switching CT series must not apply stale plane/slice state to the wrong series.
  - Microsecond estimate: 0 measured.
- [x] Source smoke now guards this CT offline storage contract.
  - Implementation: `smoke:dicom-workbench-offline-source` verifies DB version/stores/indexes, async DICOM/MPR load-save migration helpers, cancellable restore effects, and durable savedAt UI wiring.
  - DOD practice: future edits cannot silently move CT workbench recovery back to synchronous browser storage.
  - Microsecond estimate: 0 measured.

## Verification: IndexedDB CT workbench recovery

- `npm run smoke:dicom-workbench-offline-source`: passed.
- `npm run smoke:visit-offline-queue-source`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run smoke:imaging-viewer-usability-source`: passed.
- `npm run smoke:app-boot-state-source`: passed.
- `npm run smoke:web-text-encoding`: passed.
- `npm run build -w @dental/web`: passed; Vite reports the existing large `workspace` chunk warning, not treated as a gate.
- `npm run smoke:browser-file-input-dicom`: passed after temporary API+web dev servers were started for the browser route.
- `npm run smoke:web-code-split-source`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Temporary dev process trees were stopped.
- Process check: no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build, dev, or test process left behind.

## Slice: Browser-local CT scan progress/cancel/yield

- [x] Browser-selected CT/folder scans now yield during file work.
  - Implementation: `App.tsx` moved the browser scan caps into named limits and added a chunk controller that uses `scheduler.yield()` when available, with `setTimeout(0)` fallback.
  - DOD practice: local browser scans no longer run as one silent 900-file UI task on phone/weak-PC routes.
  - Rejected alternative: move this browser summary scan to a hidden worker now; rejected because the current work reads user-selected `File`/directory handles and only needs bounded summary metadata, not CT pixel decode.
  - Microsecond estimate: 0 measured.
- [x] Browser-selected CT/folder scans can be cancelled.
  - Implementation: `AbortController`, scan abort ref, abort checks around directory entry/file/header reads, and Settings stop buttons were added.
  - DOD practice: a doctor/admin can stop a slow browser-local selection without closing the page.
  - Rejected alternative: rely on browser refresh/cancel dialog; rejected because the product must work on site, phone, PC, and desktop shell with predictable controls.
  - Microsecond estimate: 0 measured.
- [x] Browser-selected CT/folder scans now show progress.
  - Implementation: Settings shows live file/folder/DICOM/archive/3D/byte counts, phase state, and timestamps; final no-path browser summary behavior remains unchanged.
  - DOD practice: browser-local CT selection communicates real work without exposing local paths.
  - Rejected alternative: show percent complete; rejected because browser directory handles do not provide a reliable total before traversal.
  - Microsecond estimate: 0 measured.

## Verification: Browser-local CT scan progress/cancel/yield

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
- Process check: no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build, dev, or test process left behind.

## Slice: API local CT/DICOM scan abort/yield

- [x] Server-side local CT/DICOM scans now stop when the client aborts the request.
  - Implementation: `imaging.ts` adds a request-scoped `AbortSignal` from Fastify `request.raw.close`/`request.raw.aborted` and wraps the six heavy local imaging scan routes.
  - DOD practice: if a browser, phone, PC web client, or desktop shell cancels a local folder scan, the API does not keep walking the folder tree in the background.
  - Rejected alternative: only rely on frontend cancel; rejected because local scans can also be started through API clients or desktop shell requests.
  - Microsecond estimate: 0 measured.
- [x] Server-side local CT/DICOM scans now yield between bounded work units.
  - Implementation: folder scans, DICOM header collection, manifest parsing, first-frame candidate reads, local folder discovery, and local organizer loops call a shared `maybeYieldApiDicomScan` using `node:timers/promises` `setImmediate`.
  - DOD practice: large local CT/3D folders are still bounded by existing limits, but the Node event loop gets scheduled breaks between folder/file/header units.
  - Rejected alternative: move all local scan work to a worker in this pass; rejected because the immediate blocker was cancellation/event-loop fairness, while ZIP random-read and worker isolation need a larger parser/runtime slice.
  - Microsecond estimate: 0 measured.
- [x] Source smoke now guards API scan abort/yield threading.
  - Implementation: `smoke:api-dicom-scan-abort-yield-source` checks the abort bridge, yield helper, helper signatures, route wrapping, and callsite signal propagation.
  - DOD practice: future API edits cannot silently return CT/DICOM local scans to monolithic request work.
  - Microsecond estimate: 0 measured.

## Verification: API local CT/DICOM scan abort/yield

- `npm run smoke:api-dicom-scan-abort-yield-source`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed.
- `npm run smoke:api-text-encoding`: passed.

## Slice: ZIP/DICOM bounded metadata reads

- [x] ZIP DICOM metadata preview no longer buffers the whole archive for central-directory parsing.
  - Implementation: `readZipCentralDirectoryDetailed` now opens a descriptor, reads the EOCD search tail, reads a bounded central-directory range, and leaves the descriptor open only long enough for bounded per-entry prefix reads.
  - DOD practice: a local CT ZIP under the current parser limits no longer allocates one full-archive buffer before extracting metadata.
  - Rejected alternative: add ZIP64/split/archive decompression now; rejected because the safe current route is regular stored/deflated entries with explicit warnings for unsupported archive shapes.
  - Microsecond estimate: 0 measured.
- [x] ZIP-contained virtual DICOM paths no longer expand twice.
  - Implementation: `isDicomArchivePath` rejects paths containing `::`, while `isZipArchivePath` can still identify the base archive where appropriate.
  - DOD practice: `archive.zip::slice.dcm` stays one parsed slice in series grouping and memory estimates.
  - Rejected alternative: deduplicate later in the series reducer; rejected because virtual path ownership should be correct before grouping.
  - Microsecond estimate: 0 measured.
- [x] Runtime smoke now covers ZIP-contained synthetic DICOM slices.
  - Implementation: `smoke:dicom-folder-workup` creates a stored ZIP with six no-PHI synthetic DICOM slices and asserts 54 parsed slices plus geometry-derived pixel bytes.
  - DOD practice: ZIP metadata parsing is proven without reading real patient exports.
  - Microsecond estimate: 0 measured.

## Verification: ZIP/DICOM bounded metadata reads

- `npm run smoke:api-dicom-scan-abort-yield-source`: passed.
- `npm run typecheck -w @dental/api`: passed.
- `npm run build -w @dental/api`: passed.
- `npm run smoke:dicom-folder-workup`: passed; output reported `filesParsed=54` and `estimatedPixelBytes=110592`.
- `npm run smoke:api-text-encoding`: passed.

## Slice: Browser-local CT scan progress observability

- [x] Browser CT/3D scan progress now carries elapsed time and scan caps.
  - Implementation: `BrowserImagingScanProgress` now includes `elapsedMs`, `processedUnits`, `fileLimit`, `folderLimit`, and `magicReadLimit`.
  - DOD practice: Settings can explain slow offline/local scans instead of showing only a spinner and raw counts.
  - Rejected alternative: use a fake percent; rejected because browser directory traversal has no reliable total before walking.
  - Microsecond estimate: 0 measured.
- [x] Settings shows the new scan observability fields.
  - Implementation: the browser scan progress chip row now renders file/folder counts against limits, DICOM magic-read cap, processed units, elapsed time, bytes, and existing CT/3D counts.
  - DOD practice: phone, PC browser, and desktop shell users see bounded local work and cancellation remains available.
  - Microsecond estimate: 0 measured.

## Verification: Browser-local CT scan progress observability

- `npm run smoke:browser-imaging-scan-progress-source`: passed.
- `npm run typecheck -w @dental/web`: passed.
- `npm run build -w @dental/web`: passed; Vite reports the existing large `workspace` chunk warning, not treated as a gate.
- `npm run smoke:web-text-encoding`: passed.
- `git diff --check`: no whitespace errors; existing CRLF warnings only.
- Process check: no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build, dev, or test process left behind.

## Slice: CT integration wave - report, local 3D readiness, bounded traversal, PWA cache

- [x] Generic server-local imaging and DICOM folder traversal is bounded before directory materialization.
  - Implementation: `collectImagingFiles` and `collectDicomHeaderFiles` use `opendir`, head-index queues, folder caps, and per-folder entry caps.
  - DOD practice: large CT/3D folders do not force `readdir(...).sort(...)` or `queue.shift()` churn before scan limits apply.
- [x] PWA shell cache is now allowlisted.
  - Implementation: `sw.js` caches shell/assets only, prunes dynamic shell entries, and leaves arbitrary same-origin/API/local work outputs out of the offline cache.
  - DOD practice: offline app shell remains useful without pretending CT pixels, exports, or API responses are a safe generic cache target.
- [x] CT implant-fit ranking is site-scoped.
  - Implementation: geometry carries tooth/site evidence; implant-fit excludes other-site rulers and keeps mixed/unscoped evidence as draft.
  - DOD practice: implant size screening no longer lets a ruler from another tooth site influence the selected-site candidate ranking.
- [x] CT planning export has a lightweight report action.
  - Implementation: `ctPlanningReport.ts` builds text and JSON sidecar reports from the existing export packet; UI supports print/download without PDF dependency.
  - DOD practice: dentist/lab gets a portable metadata report with explicit no-pixel/no-mesh/no-CAD boundary.
- [x] CT local 3D readiness is visible when local model metadata exists.
  - Implementation: CT implant-model UI shows CT surface, arch, scan-body, and guide readiness lanes from the local model manifest and local bridge status.
  - DOD practice: CRM tells the operator what 3D metadata exists without loading mesh geometry or claiming CAD/STL generation.
- [x] CT local 3D readiness now has a single dentist/lab next-action summary.
  - Implementation: the local 3D readiness panel derives ready/missing lane counts, bridge need, and the no-mesh browser boundary into one tagged card.
  - DOD practice: doctor/lab can see the next practical action without reading every lane card.
- [x] Browser continuity audit now exposes CT offline storage boundaries.
  - Implementation: browser capability facts include OPFS/file picker/directory picker readiness and a `metadata_only` CT offline boundary.
  - DOD practice: the CRM can show offline/local CT capability without claiming browser-owned diagnostic image storage, mesh storage, directory handle persistence, or user file path storage.
- [x] CT render planning now has typed hardware/runtime policy.
  - Implementation: render plans expose `memoryBudgetClass`, `hardwareQualityWeight`, `progressiveSliceWindowCap`, and `diagnosticPixelPolicy`.
  - DOD practice: PC browser stays planning-preview bounded, no-worker clients get tiny slice windows, and only an explicit desktop-app bridge can unlock diagnostic-full policy.

## Verification: CT integration wave - report, local 3D readiness, bounded traversal, PWA cache

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
- After the local 3D summary integration, `npm run smoke:imaging-viewer-usability-source`, `npm run typecheck -w @dental/web`, and `npm run build -w @dental/web` passed again.
- After the browser OPFS/offline-boundary integration, `npm run smoke:dicom-workbench-offline-source`, `npm run smoke:imaging-viewer-usability-source`, `npm run typecheck -w @dental/web`, and `npm run build -w @dental/web` passed again.
- After the CT render-policy integration, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run smoke:api-dicom-scan-abort-yield-source`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/web`, and `npm run smoke:imaging-viewer-usability-source` passed again.

## Slice: Issued document HTML preview safety

- [x] Issued HTML preview no longer clones server HTML into a `blob:` URL.
  - Implementation: `openIssuedDocumentHtml` opens the `/api/documents/:id/html` API URL directly so preview navigation keeps server CSP/no-store/nosniff headers.
  - DOD practice: issued legal/medical document preview stays on the protected server response path instead of a browser-owned blob document.
- [x] Popup-blocked fallback is immediate and operator-visible.
  - Implementation: blocked popups leave visible guidance and call the authenticated `html?download=1` archive download fallback without clearing that guidance on success.
  - DOD practice: mobile Safari, clinic PCs, desktop shells, and header-secret clinical sessions have a safe download route when new-window preview is blocked or cannot carry the required header.
- [x] Source regression smoke added.
  - Implementation: `smoke:document-html-preview-source` rejects `fetch -> blob -> window.open(blob:)` preview regressions and checks the server HTML header hook.

## Verification: Issued document HTML preview safety

- `npm run smoke:document-html-preview-source`: passed.
- `npm run smoke:document-payload-ui-source`: passed.
- `npm run smoke:document-html-issue-guards`: passed.
- `npm run typecheck -w @dental/web`: passed.

## Slice: Orchestrated cross-surface hardening wave

- [x] CT render-cache policy is visible in operator UI.
  - Implementation: render-cache responses now preserve `memoryBudgetClass`, `hardwareQualityWeight`, `progressiveSliceWindowCap`, and `diagnosticPixelPolicy`; Settings shows those facts in workstation readiness, cache plan, and saved workbench bundle cards.
  - DOD practice: browser CT preview cannot silently look like diagnostic rendering; the hardware/memory policy is visible before the operator opens a heavy series.
- [x] PWA shell update recovery is explicit.
  - Implementation: the service worker moved to shell cache `v4`, uses network-first JS/CSS shell assets, supports skip-waiting and shell-cache clearing, and stale route reload buttons clear shell cache before reload.
  - DOD practice: long clinic sessions can recover from stale lazy chunks without caching `/api/*`, documents, DICOM pixels, or mesh/CAD/STL payloads.
- [x] Browser migration scans are controllable.
  - Implementation: old-MIS/local browser scans now use `AbortController`, bounded file/folder/signature caps, cooperative yields, visible progress, and stop buttons.
  - DOD practice: phone/weak-PC admins can stop large legacy-folder scans; autopilot starts only after a completed scan.
- [x] Communication task closure carries an outcome.
  - Implementation: shared/API/web now support `no_answer`, `callback_requested`, `reschedule_requested`, `promised_payment`, and `document_pickup`; web requires a selected outcome before closing a task.
  - DOD practice: reception/admin work no longer collapses every call into a false generic completion.
- [x] CT server-side preparation is cancellable from UI.
  - Implementation: CT/DICOM server fetches now receive `AbortController.signal`, neutral abort handling, and source smoke coverage for the cancel path.
  - DOD practice: stopping a long CT preparation path no longer leaves abort-aware API routes doing stale work after the operator cancels.
- [x] Schedule admin naming is domain-owned.
  - Implementation: Schedule route props and component internals use `scheduleAdminSecret*`, `unlockScheduleAdminSession`, and `lockScheduleAdminSession`; source smoke forbids Telegram admin names inside `ScheduleView`.
  - DOD practice: schedule mutation controls stay isolated from Telegram/communications settings while preserving the same admin-secret guard.
- [x] ZIP-contained virtual DICOM paths no longer claim pixel/MPR readiness.
  - Implementation: volume-only CT tools disable when `canOpenMpr=false`; tool-state viewports emit volume refs only for real openable DICOM pixel paths, not `archive.zip::slice.dcm`.
  - DOD practice: ZIP metadata remains useful, but browser/desktop/local pixel readiness is withheld until the archive is unpacked or a local/external viewer owns pixel access.
- [x] Daily surfaces now have keyboard/accessibility source coverage.
  - Implementation: new smoke covers schedule, documents, payment capture, communications, settings, shell skip link, native links/disclosures, busy/disabled guidance, row-context labels, settings tab keys, and reduced-motion contract.
  - DOD practice: older doctors/admins on PC keyboards and mobile assistive navigation get a regression guard across the daily work surfaces.

## Verification: Orchestrated cross-surface hardening wave

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

## Slice: Continuous orchestration wave - CT/offline/finance/speech

- [x] Communication route-validation smoke aligned with the required completion outcome.
  - Implementation: `smoke:core-route-validation` now expects the bounded Russian message that asks for task, staff member, and communication outcome.
  - DOD practice: the shared validation smoke no longer fights the stricter communications contract.
- [x] CT implant/3D cards use operator-readable 3D boundaries.
  - Implementation: implant/model readiness copy now says CRM stores plan parameters and local 3D readiness only; CAD/STL and surface meshes remain in the laboratory/local 3D module.
  - DOD practice: browser CRM no longer looks like it generated surgical CAD/STL or loaded skull meshes.
- [x] CT reconstruction and implant-model planning consume continuous hardware weight.
  - Implementation: OPG/cross-section density and implant modeling labels now include `renderPlan.hardwareQualityWeight` instead of only coarse quality/gpu labels.
  - DOD practice: weak phones/PCs get lower-density derived planning while strong workstations can use denser planning without changing clinical dimensions.
- [x] Accepted-visit offline queue no longer masks server rejections.
  - Implementation: failed accepted EMR saves are classified by HTTP status; only network/offline/temporary server failures are queued for retry.
  - DOD practice: closed/voided/validation-conflict visits do not become false local accepted notes.
- [x] Finance capture now states append-only payment behavior and ledger document linkage.
  - Implementation: payment capture warns that corrections/refunds are separate ledger events; payment history shows the linked document or an explicit unlinked state.
  - DOD practice: staff do not treat a payment as silently editable or lose document context.
- [x] Speech queue keeps recoverable audio until a real recognizer is available.
  - Implementation: queued speech with `audioBase64` is not deleted just because local fallback text exists; flush waits for `/api/speech/status` to report a usable server/local recognizer.
  - DOD practice: offline/mobile recordings remain useful and can be recognized later.
- [x] Patient create/update rejects unusable phone drafts and active duplicates.
  - Implementation: shared DTO blocks non-empty phone values under 5 digits; API rejects active-patient duplicate name/birthdate/phone combinations with bounded Russian `409 PatientDuplicateError`.
  - DOD practice: reception cannot create low-quality duplicate cards from mobile/PC intake flow.
- [x] Patient rows promote the next clinical/admin action.
  - Implementation: `PatientsView` renders insight `nextBestAction` as a compact row scan target.
  - DOD practice: mobile scanning shows the next useful action without opening every patient card.
- [x] DICOMweb connector check uses Settings-admin access.
  - Implementation: `/api/imaging/dicomweb/check` moved to a settings-admin guard; web sends `settingsAccessHeaders`.
  - DOD practice: production PACS/DICOMweb setup is not unlocked by the clinical-read secret.
- [x] Document offline draft recovery preserves 025/у legal confirmations.
  - Implementation: local document draft persistence now keeps source-record, official-form, and third-party-data checks for outpatient medical card recovery.
  - DOD practice: refresh/offline recovery does not force operators to repeat completed legal confirmations.
- [x] Speech empty/queued states reflect provider availability.
  - Implementation: empty dictation and queued-audio actions switch labels/titles when recognition upload is unavailable and keep audio local.
  - DOD practice: offline users are not told to send unavailable server recognition.
- [x] Patient representative profile updates validate merged identity facts.
  - Implementation: representative phone/document/recipient text requires representative full name and relationship/legal basis, while complete saved profiles can accept partial updates.
  - DOD practice: guardian/representative paperwork cannot be saved as an orphan identity fragment.
- [x] CT ZIP metadata path audited as bounded range reads.
  - Implementation: no code change needed; current ZIP path reads EOCD tail, bounded central directory, and selected entry prefixes instead of full volume/pixel data.
  - DOD practice: archive metadata stays useful without browser/offline pixel claims.
- [x] Price-list warning UI filters provider/technical warning text.
  - Implementation: `pricelistWarningsText` now maps provider/key/HTTP/payload failure patterns to Russian operator actions.
  - DOD practice: Settings price-list results do not leak provider names or technical failure strings.
- [x] Medical-record extract offline draft recovery is scoped separately from 025/у.
  - Implementation: `medical_record_extract` now has its own draft field type, scoped load/save helpers, and restored signed-record/third-party-data confirmations.
  - DOD practice: recovery no longer routes extract fields through the 025/у draft shape.
- [x] Payment creation supports client operation idempotency.
  - Implementation: optional bounded `clientMutationId` is persisted with payments; same-patient retries return the original payment and cross-patient reuse returns a bounded conflict.
  - DOD practice: network retries do not append duplicate payments while payment ledger remains append-only.
- [x] API Russian fallback guard follows current operator wording.
  - Implementation: `smoke:russian-fallback-source` now pins the current local-module and external-viewing Russian copy instead of old “viewer” wording.
  - DOD practice: global/source fallback checks keep blocking English/technical leaks without fighting the newer UI vocabulary.
- [x] Smart-import report filenames no longer duplicate source extensions.
  - Implementation: `safeSmartImportReportFilename` strips an existing short extension before appending `_report.csv`.
  - DOD practice: a source like `bad name?.csv` downloads as `bad_name_report.csv`, not `bad_name_.csv_report.csv`.
- [x] Clinical-read guard smoke follows the DICOMweb Settings-admin boundary.
  - Implementation: `smoke:clinical-mutation-guard` no longer counts `/api/imaging/dicomweb/check` as clinical-read and pins the web call to `settingsAccessHeaders`.
  - DOD practice: PACS/DICOMweb setup remains settings work while clinical imaging routes still fail closed behind the clinical-read secret.
- [x] Payment submit no longer auto-links refund/correction requests.
  - Implementation: `recordPayment()` excludes `payment_refund_correction_request` from automatic payment-document selection and `smoke:payment-capture-source` pins the predicate.
  - DOD practice: the UI does not send a refund/correction request as an incoming payment target that the API must reject.
- [x] Payment submit sends a client operation id.
  - Implementation: `recordPayment()` sends `clientMutationId: browserGeneratedId("payment")` and `smoke:payment-capture-source` pins it.
  - DOD practice: browser retries can use the server idempotency route instead of risking duplicate append-only ledger rows.
- [x] Local speech bridge readiness has an npm proof entry.
  - Implementation: `package.json` exposes `smoke:speech-local-bridge-readiness`.
  - DOD practice: local Whisper/Vosk readiness wording can be checked with the same command style as the rest of speech recovery.
- [x] Service-worker update recovery preserves core offline shell.
  - Implementation: `DENTE_CLEAR_SHELL_CACHE` recovery now removes stale dynamic chunks while preserving/re-priming core shell fallbacks.
  - DOD practice: website/PWA/desktop-shell refresh recovery can purge broken chunks without deleting `/index.html` and `/offline.html`.
- [x] Smart-import report filenames reject path-like and reserved Windows names.
  - Implementation: dynamic report filenames strip dot runs and fall back to `smart_import_report.csv` for reserved device names.
  - DOD practice: migration/report downloads do not emit awkward or dangerous local filenames such as `../CON.csv`.
- [x] Settings and schedule admin unlock copy states domain scope.
  - Implementation: Settings copy distinguishes settings-only and Telegram-only admin secrets; Schedule copy states that schedule secret does not unlock settings, Telegram, or clinical data.
  - DOD practice: admins are not taught that one unlocked panel grants every control plane.
- [x] CT handoff carries a runtime truth policy.
  - Implementation: CT export/report/bridge metadata now carries hardware weight, memory class, bounded slice-window cap, diagnostic pixel policy, source mode, execution lane, and explicit no-pixel/no-mesh browser ownership flags.
  - DOD practice: mobile/browser/desktop-app CT handoff stays honest about preview metadata versus diagnostic pixels and heavy skull/mesh geometry.
- [x] Telegram outbox remaining count follows server pagination.
  - Implementation: Settings outbox UI computes hidden/remaining rows from API `filteredCount` and keeps the `nextCursor` affordance visible.
  - DOD practice: large queues do not hide server-side remaining Telegram work behind browser-slice math.
- [x] Speech recovery no longer calls the scoped API before active visit context exists.
  - Implementation: `loadSpeechRecordingRecovery()` now returns locally with `null` recovery state until active `visitId` and `patientId` are loaded.
  - DOD practice: initial browser load does not produce a noisy `/api/speech/recordings/recovery?limit=5` 400 before the active visit is known.
- [x] Issued document archive readiness requires complete immutable metadata.
  - Implementation: document HTML/PDF recovery and row download readiness now require both `issuedSnapshotSha256` and `issuedSnapshotCreatedAt`.
  - DOD practice: hash-only issued metadata does not expose incomplete archive download/recovery as ready.

## Verification: Continuous orchestration wave - CT/offline/finance/speech

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
