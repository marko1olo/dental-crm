# DENTE rationale

Date: 2026-05-25

## Problem

Post-visit checkup reminders were fixed in API code: extraction and implantation used 24h, filling used 48h, hygiene used 72h. That violates the product requirement that each clinic can run its own protocols and that selected configuration stays active until changed.

## Solution

Add a typed settings object, `postVisitCheckupDelayHoursByTopic`, with defaults for all supported care topics. Normalize every incoming value to an integer 1-720 hours. Use that object in outbox scheduling. Expose it in first-run Telegram onboarding and in the full Telegram settings panel.

## Rejected Alternatives

- Hardcoded topic map: rejected because it cannot represent different clinic protocols.
- One free-form JSON field in the UI: rejected because doctors and administrators need readable controls in Russian.
- Per-message manual schedule edits only: rejected because bulk reminders need deterministic clinic policy.

## Operational Impact

Low-end devices: no extra browser-heavy work; only small controlled numeric inputs and one settings payload.

Middle tier: operators can tune common scenarios without touching server env.

High/Ultra tier: multi-clinic deployment can override delays through `DENTE_TELEGRAM_CLINIC_BOTS_JSON` and later map the same schema to DB-backed bot configs.

## Proof

Smoke test `npm run smoke:telegram-bot` now checks that checkup items are scheduled exactly from the issued post-visit document by the configured hours: extraction 26h, implantation 25h, filling 50h, hygiene 74h. The previous `Date.now()` threshold was replaced because it measured test runtime drift instead of product behavior.

---

Date: 2026-05-25

## Problem

The Telegram settings and post-visit reminder schema already supported endodontics, surgery, local anesthesia, prosthetics, orthodontics and periodontology, but the patient-facing bot only exposed four buttons: extraction, implantation, filling and hygiene. That made clinic configuration partially dead and forced patients into free text or administrator calls for common dental scenarios.

## Solution

Promote the missing topics to first-class Telegram care workflows: allowlisted inline callbacks, Russian care-menu buttons, specific patient guidance text, stable `CommunicationTask.workflowCode` values, doctor task creation/reuse, audit actions, and web preselection of the matching `post_visit_recommendations` care topic.

## Rejected Alternatives

- One generic "other care" button: rejected because doctors would lose topic-specific queues and document defaults.
- Free-text only routing: rejected because the product requirement is button-first Telegram UX.
- Browser-only mapping: rejected because webhook, audit and task creation must be server-owned.

## Operational Impact

Low-end devices: no additional heavy UI; just more inline buttons and typed server routing.

Middle tier: reception and doctors get correctly labeled tasks instead of generic callbacks.

High/Ultra tier: multi-clinic bot configs can tune reminder delays for every visible care topic and keep the same topic identity through outbox, documents and audit.

## Proof

`npm run smoke:telegram-bot` covers all expanded callbacks and duplicate-task reuse. `npm run smoke:document-payload-ui-source` verifies the web document workflow maps the new Telegram task codes to the matching care topics. Typechecks passed for shared and web packages.

---

Date: 2026-05-25

## Problem

Patient financial documents were present in DENTE (`payment_invoice`, `payment_receipt`, `completed_works_act`, installments, refund/correction), but Telegram exposed document entry points only for tax, medical records and forms. Patients asking for a receipt or invoice were likely to hit the tax path because the old free-text tax matcher included generic words like "чек" and "оплата".

## Solution

Add a separate `dente:billing` Telegram action and `telegram_billing_document_request` workflow. The route creates/reuses an administrator task, opens the protected portal with `dente_section=billing`, and maps the task in the web UI to concrete financial document kinds.

## Rejected Alternatives

- Keep "чек" under tax: rejected because most receipt/invoice requests are not tax-deduction workflows.
- Return payment details in Telegram: rejected because amounts and payment documents should stay in the protected portal.
- Only add a portal button without a task: rejected because the administrator still needs a tracked queue item.

## Operational Impact

Low-end devices: one extra inline button and no heavier browser flow.

Middle tier: administrators get a correctly labeled billing document queue instead of mixed tax requests.

High/Ultra tier: clinic-owned bots can route billing requests to the same outbox/portal section identity used by payment reminders.

## Proof

`npm run smoke:telegram-bot` now covers `dente:billing`, safe `billing` portal handoff, administrator task creation, and repeat free-text reuse. `npm run smoke:document-payload-ui-source` verifies billing tasks preselect the concrete financial document kinds.

---

Date: 2026-05-25

## Problem

First-run Telegram setup hid production settings that matter on day one: tax, billing and staff visual cards, all extended post-visit checkup topics, and quick toggles for payment reminders, recalls, callback requests and staff daily digest. Payment reminders also had a protected portal handoff but no explicit document/billing inline actions.

## Solution

Expose every Telegram visual-card slot in onboarding: main menu, appointment, documents, tax, billing, care, review and staff. Show every post-visit checkup delay topic in first-run setup. Add payment reminders, recall reminders, callback requests and staff digest to first-run quick scenarios. Add `Оплата и чеки` and `Документы` inline callback buttons to `payment_reminder_notice`.

## Rejected Alternatives

- Keep onboarding compact and leave tax/billing/staff media in full settings only: rejected because first clinic setup must define the communication surface.
- Keep only four care delay fields in onboarding: rejected because the bot now exposes more real care topics than the first-run protocol screen.
- URL-only payment reminder: rejected because the Telegram product direction is button-first, not command/manual navigation.
- Put payment details directly into Telegram callbacks: rejected because billing documents and amounts stay behind the protected DENTE portal.

## Operational Impact

Low-end devices: only extra form controls and inline buttons; no heavy rendering or background polling.

Middle tier: clinic administrators can configure media, payment, recall and staff flows before opening the bot to patients.

High/Ultra tier: clinic-owned bots can use the same settings shape for richer scenario-specific images and staff communication without changing task/document routes.

---

Date: 2026-05-25

## Problem

The bot had staff-linking and staff-digest concepts, but the digest was not strict enough as a release-grade clinic tool: it needed server-side role scoping, a staff-specific visual card, safe relink behavior beside patient links, and proof that schedule replies do not show stale visits. Financial documents also accepted weak date-like strings, and the Telegram transport silently truncated long photo captions.

## Solution

Use `staffId` in Telegram preview/outbox rendering. Build the staff digest from server-owned staff role, same-day visible appointments and open communication tasks, then emit only counters and generic action buttons. Treat patient overlap as a real schedule resource conflict, filter stale appointment replies, and make schedule gap suggestions require a shared doctor/assistant/chair. Add strict real-date validation to invoice/receipt/installment/act/estimate payloads. Split long visual-card messages at the route layer instead of truncating in transport.

## Rejected Alternatives

- Clinic-wide staff digest for every employee: rejected because assistants, doctors and administrators must not receive unrelated operational queues.
- Keep stale appointments visible to linked patients: rejected because a bot schedule answer must describe actionable upcoming records.
- Keep financial date fields as text: rejected because invalid fiscal dates can enter tax/payment paperwork.
- Silent caption truncation in Telegram transport: rejected because it removes operator-approved message text without audit.
- Revoke all chat links on patient relink: rejected because staff and patient Telegram identities are separate subjects.

## Operational Impact

Low-end devices: the staff digest is counter-only and does not add rich client rendering or polling.

Middle tier: clinics get usable staff Telegram summaries, safer schedule replies, and fewer blocked/invalid financial drafts.

High/Ultra tier: the same scoped bot model supports clinic-owned bots, staff media, multi-role workflows and larger outbound queues without adding PHI to Telegram.

## Proof

`npm run smoke:telegram-bot` now covers staff link, staff digest preview/outbox, staff visual card, patient relink preserving staff link, schedule replies against future appointments, safe caption split, and 52 webhook scenarios. Document payload smokes prove invalid financial dates are rejected and sparse legal profile allows only workflow-safe drafts. Schedule smoke proves patient overlap is blocked.

## Proof

`npm run smoke:onboarding-configuration-source` verifies all first-run visual-card keys, no four-topic delay slice, extended care labels and new quick toggles. `npm run smoke:telegram-bot` verifies payment reminders expose `Оплата и чеки` and `Документы` inline actions. API build, web typecheck and document/tax smoke contracts passed.
---

Date: 2026-05-25

## Problem

Tax deduction applications were too tightly coupled to already-selected fiscal receipts. In real clinic work, a patient can submit the tax request before the administrator has reconciled KKT receipts. The rendered application also risked showing internal payment UUIDs. Separately, Telegram QR cards could stay visible after changing patient/bot target, staff schedule replies fell back to a patient keyboard, `/start` did not respect already-linked chats, and several "Связаться" buttons routed to QR instructions instead of the administrator handoff.

## Solution

Allow `tax_deduction_application` payloads with an empty `selectedPaymentIds` array, while keeping certificates, registries and legacy tax certificates under explicit payment selection. Render a clear pending-receipt note and never expose internal payment ids in the tax application. Fix persisted-state cold start by moving post-visit checkup defaults before state hydration. Clear generated Telegram QR state whenever subject, patient, staff, bot mode or bot config changes. Pass runtime bot settings into linked schedule replies and preview rendering. Give staff schedule/digest replies a staff-safe inline keyboard. Route contact-labeled buttons to `dente:contact`. Add a staff digest preview button in the web panel.

## Rejected Alternatives

- Keep tax applications blocked until receipts are selected: rejected because the application is the intake request, not the final fiscal certificate.
- Auto-include all paid tax-year receipts in an application with empty selection: rejected because it hides an administrative reconciliation step.
- Keep `dente:clinic` on "Связаться": rejected because that action explains QR linking; it does not create/route a contact request.
- Use the patient linked keyboard for staff chats: rejected because staff workflows need schedule/contact/DENTE portal actions without patient document/care shortcuts.
- Keep preview on global bot settings only: rejected because clinic-owned bot configuration must affect preview before sending.

## Operational Impact

Low-end devices: no heavier rendering; QR clearing is a small state key comparison and staff digest remains counter-only.

Middle tier: administrators can register tax requests earlier, then attach receipts later; Telegram contact buttons create the expected handoff task.

High/Ultra tier: the same scoped preview/schedule path supports many clinic-owned bots with per-bot media and staff communication without adding PHI to Telegram.

## Proof

`npm run build -w @dental/shared`, `npm run build -w @dental/api`, `npm run typecheck -w @dental/web`, `npm run smoke:tax-registry-fiscal`, `npm run smoke:document-guards`, `npm run smoke:telegram-bot`, `npm run smoke:telegram-control-ui-source`, `npm run smoke:telegram-outbox-persistence`, `npm run smoke:telegram-validation`, `npm run smoke:telegram-admin-guard`, and `npm run smoke:settings-preferences` passed.

---

Date: 2026-05-25

## Problem

Refund/correction documents used structured action/amount/receipt fields, but the source payment scope was still implicit. A visit-level paid amount can include several unrelated receipts, so a partial refund could be validated against the whole visit instead of the actual receipt being corrected. Browser payment selections were also stored by patient/year/visit without clinic organization id, which is unsafe for multi-clinic use on the same workstation.

## Solution

Make `paymentRefundCorrection.selectedPaymentIds` required and duplicate-checked. Validate each selected payment against patient, visit, paid status, positive amount, fiscal receipt number/date and original fiscal receipt match. Sum paid amount only from selected refund source payments. Add an `Исходный платеж` selector to the web form, prefill fiscal receipt/payer/amount from the selected row, and require the selector before posting. Prefix saved tax/payment receipt selection keys with `organizationId`.

## Rejected Alternatives

- Keep visit-wide refund scope: rejected because one visit can contain separate receipts, installments or payer contexts.
- Trust manually typed receipt numbers without payment ids: rejected because typed text cannot prove payer/visit/status/fiscal-date scope.
- Store selections by patient only: rejected because DENTE is intended for many clinics and clinic-owned bots/settings under one browser profile.

## Operational Impact

Low-end devices: one select over already-loaded active payments and no extra network polling.

Middle tier: administrators get fewer blocked or overbroad refund drafts because source payment fields fill from the ledger.

High/Ultra tier: the same explicit payment-scope payload scales to multi-clinic receipt reconciliation and later per-clinic bot/payment workflows.

## Proof

`npm run build -w @dental/shared`, `npm run build -w @dental/api`, `npm run typecheck -w @dental/web`, `npm run smoke:document-guards`, `npm run smoke:document-payloads`, `npm run smoke:document-payload-ui-source`, `npm run smoke:documents-catalog`, `npm run smoke:visit-workflow-forms-lifecycle`, `npm run smoke:ui-preferences`, `npm run smoke:tax-document-explicit-payment-scope`, `npm run smoke:russian-fallback-source`, and `npm run build -w @dental/web` passed. Vite emitted only the existing large-chunk warning.

---

Date: 2026-05-25

## Problem

Local document issue signature fallback and outpatient 025/u draft keys were browser-wide. In multi-clinic DENTE, a workstation can serve several organizations or clinic-owned bot contexts, so local convenience state must not be keyed only by patient/visit or one global signature key. The signature mode select also used a raw TypeScript cast from DOM value.

## Solution

Add `documentIssueSignatureLocalKey(organizationId)`, scoped load/save with legacy fallback, and a post-hydration scoped signature load that does not beat newer UI preferences. Require `organizationId` in `documentPayloadDraftKey` for 025/u. Replace raw signature mode cast with `normalizedDocumentIssueSignatureMode`.

## Rejected Alternatives

- Keep one global signature draft: rejected because browser workstations may be shared between clinic organizations.
- Scope only by patient/visit: rejected because organization is the tenant boundary even when UUIDs are globally unique.
- Trust DOM select casting: rejected because future option edits could bypass shared normalization.

## Operational Impact

Low-end devices: only localStorage key changes and one post-hydration lookup.

Middle tier: clinics can share one workstation without carrying issue defaults into another organization.

High/Ultra tier: same local key model scales to clinic-owned bot/multi-org workspaces without changing document payload schemas.

## Proof

`npm run smoke:document-payload-ui-source`, `npm run smoke:ui-preferences`, `npm run typecheck -w @dental/web`, `npm run smoke:settings-preferences`, `npm run smoke:settings-persistence-file`, `npm run smoke:document-legal-confirmations`, and `npm run smoke:document-payloads` passed.

---
Date: 2026-05-25

## Problem

First-run onboarding fallback used one browser-wide localStorage key. A shared clinic workstation or future multi-organization browser profile could carry a completed onboarding state from one clinic into another, hiding the setup master that should collect clinic, doctor, schedule, legal and Telegram data.

## Solution

Add `onboardingLocalKey(organizationId)`, scope `saveOnboardingDismissed` and `loadOnboardingDismissalState`, and rehydrate scoped fallback only after UI preferences and clinic profile are loaded. Full completion, draft-mode continuation and reopen now write fallback state with `dashboard?.clinicSettings.profile.organizationId`.

## Rejected Alternatives

- Keep a single browser-wide onboarding key: rejected because it violates the new-clinic first-open workflow.
- Move all UI preferences to organization-scoped local keys in one pass: rejected for this slice because server preferences and broader workspace selections need a separate migration path.
- Apply scoped fallback before dashboard load: rejected because the app does not know the tenant boundary yet.

## Operational Impact

Low-end devices: one localStorage lookup after dashboard/profile hydration.
Middle tier: shared reception/doctor workstation can distinguish onboarding fallback by clinic.
High/Ultra tier: same pattern supports clinic-owned bot/multi-clinic browser profiles without changing onboarding UI payloads.

## Proof

`npm run smoke:onboarding-configuration-source`, `npm run smoke:ui-preferences`, `npm run typecheck -w @dental/web`, `npm run smoke:settings-preferences`, and `npm run smoke:settings-persistence-file` passed.

---
Date: 2026-05-25

## Problem

Telegram controls for clinic bot mode, privacy policy, QR subject and outbox filters trusted raw DOM strings through TypeScript casts. That made the persisted bot/control state dependent on the current JSX option list and could store impossible values if browser/plugin/script state changed.

## Solution

Add explicit Telegram normalizers and route every Telegram select through them before setting state. Invalid values now fall back to safe defaults: shared DENTE bot, no-PHI privacy, patient QR subject and all outbox filters.

## Rejected Alternatives

- Keep raw casts: rejected because settings are long-lived clinic configuration, not temporary view state.
- Add server-only validation: rejected as insufficient because invalid values could still poison local/server UI preferences before the next API call.

## Operational Impact

Low-end: no meaningful runtime cost.
Middle tier: fewer stuck Telegram panels after corrupted local preference state.
High/Ultra: same normalized controls support clinic-owned bots and filtered outbox workflows without unsafe state transitions.

## Proof

`npm run smoke:telegram-control-ui-source`, `npm run smoke:ui-preferences`, and `npm run typecheck -w @dental/web` passed.

---

Date: 2026-05-25

## Problem

Schedule, document payload and clinical-rule selects still trusted raw `event.target.value as ...` casts. Those values are not harmless view state: several are persisted in UI preferences, local document drafts, appointment mutations, signed document payloads or rule configuration. Invalid values from a corrupted browser state or future JSX option drift could enter long-lived clinic workflow state before the API rejects them.

## Solution

Add shared input helpers for option arrays and string-union arrays, then route every remaining workflow select through explicit normalizers. Invalid values fall back to known defaults: planned/all appointment state, default document kind, safe tax/application defaults, known care/radiology/release/refund/void values, and valid clinical-rule metadata.

## Rejected Alternatives

- Keep TypeScript casts because the current JSX options are controlled: rejected because casts do not validate runtime DOM values.
- Add only server-side validation: rejected because UI preferences and local draft state can still be poisoned before the request.
- Normalize only persisted preferences: rejected because signed document payload builders and appointment/rule mutations are also workflow state.

## Operational Impact

Low-end: no meaningful cost; a few array/key checks on user interaction only.
Middle tier: fewer stuck forms after localStorage corruption, browser extensions or stale UI state.
High/Ultra: the same normalized state path supports many clinics, clinic-owned bot contexts, and wider document catalogs without unsafe enum drift.

## Proof

`npm run smoke:ui-preferences`, `npm run smoke:document-payload-ui-source`, `npm run smoke:schedule-configuration`, `npm run typecheck -w @dental/web`, `npm run smoke:document-payloads`, `npm run smoke:settings-preferences`, and `npm run smoke:document-legal-confirmations` passed.

---

Date: 2026-05-25

## Problem

Generic Telegram review requests were still scheduled with a fixed two-hour delay after a closed visit/payment. That is a clinic policy decision, not application law: some clinics ask immediately after hygiene, some after anesthesia wears off, some only next day. The fixed value also made the Settings UI look configurable while one high-value automation remained hidden in code.

## Solution

Add `reviewRequestDelayHours` to shared Telegram settings, normalize it to 1-720 hours in API state, persist it through settings, add `review_request_delay_hours` to the DB config shape, and allow `DENTE_TELEGRAM_CLINIC_BOTS_JSON` to override it per clinic-owned bot. Expose the same field in first-run onboarding and the full Telegram settings panel. Review outbox scheduling now receives runtime settings and adds the configured delay to the real visit/payment base timestamp.

## Rejected Alternatives

- Keep the fixed 2h delay: rejected because review timing is a clinic-level communication policy.
- Store the delay only in browser UI preferences: rejected because the outbound worker and API outbox must use server-owned settings.
- Add a free-form JSON advanced field: rejected because administrators need one obvious Russian numeric control.
- Split by treatment topic in this slice: rejected because topic-specific after-care already has `postVisitCheckupDelayHoursByTopic`; generic review request timing is a separate campaign-level control.

## Operational Impact

Low-end: no runtime polling or heavy UI; one numeric input and one integer read during outbox generation.

Middle tier: clinics can tune review timing without touching env/deploy.

High/Ultra: clinic-owned bot JSON and DB schema now carry the same field, so many clinics can run different review timing on one deployment.

## Proof

`npm run smoke:telegram-bot` persists 5h/6h review delay settings, validates clinic-owned bot JSON values, and checks that the active review outbox `scheduledAt` equals the visit/payment base timestamp plus configured hours. Shared/API builds, web typecheck, DB runtime contract, Telegram control UI, outbox SLA, onboarding and preferences smokes passed.

---

Date: 2026-05-25

## Problem

The price-list analyzer returned stable semantic DTO values, but the web result list exposed them directly in the operator UI. A doctor or administrator could see `zirconia`, `lithium_disilicate`, `metal ceramic`, `unknown` or raw crown-type strings instead of readable Russian labels. The Telegram QR panel also exposed visible `QR SVG` wording in the action state and button label.

## Solution

Keep analyzer/API values unchanged and add display-only label helpers in `apps/web/src/App.tsx`: `pricelistMaterialKindLabel`, `pricelistRestorationTypeLabel`, `pricelistCrownTypeLabel`, `pricelistMaterialSummaryText` and `pricelistItemMaterialText`. Summary and row details now show Russian material/restoration/crown labels, hide non-useful `unknown/none` restoration noise, and fall back to `материал не распознан` only when nothing meaningful was detected. The QR download action now uses Russian operator copy.

## Rejected Alternatives

- Translate DTO values in the API: rejected because catalog mapping, smoke checks and future import review need stable codes.
- Add labels into every analyzer row: rejected because that duplicates UI language into a domain payload and complicates future multilingual support.
- Keep `QR SVG`: rejected because operators need a clear action label, not implementation detail.

## Operational Impact

Low-end: a few array maps/string joins only when the Settings price-list result is rendered.

Middle tier: admin review of imported price lists is clearer and less error-prone because material/restoration meanings are human-readable.

High/Ultra: stable semantic codes remain available for future multilingual UI and catalog automation while display text can evolve independently.

## Proof

`npm run smoke:pricelist-analyzer` now verifies both deterministic analyzer behavior and the web-source localization contract. `npm run typecheck -w @dental/web` passed.

---

Date: 2026-05-25

## Problem

Local imaging recovery used browser-wide keys for selected local CT/DICOM folders, browser-picked folder summaries, DICOM workbench manifests and viewer drafts. On a workstation shared by several clinic organizations, that can reopen the previous clinic's local imaging context after switching tenants. The server-side workbench bundle is redacted, but the browser convenience layer still needed the same tenant boundary as document drafts and onboarding fallback.

## Solution

Add `organizationScopedLocalStorageKey` and route local imaging recovery through it. DICOM workbench, local folder recovery and browser-picked folder summaries now load/save under organization-scoped keys with legacy fallback. Per-study imaging viewer drafts use an organization prefix before the study id. After dashboard profile load, `localImagingRecoveryHydratedOrganizationIdRef` rehydrates the scoped local folder/browser-picked recovery for the active organization. DICOM workbench restore and all local viewer draft reads/writes receive `activeOrganizationId`.

## Rejected Alternatives

- Keep one browser-wide imaging key: rejected because local imaging state is workflow context and can be confusing across clinics.
- Remove legacy keys immediately: rejected because upgrade should not discard a prepared CT/MPR workbench or selected folder before the operator can review it.
- Move browser-local paths to the server: rejected because local folder paths are workstation-local and should not become CRM server state.

## Operational Impact

Low-end: one extra scoped localStorage lookup on organization hydration and on imaging save/read paths.

Middle tier: shared reception/admin workstations no longer silently reuse another clinic's CT folder or workbench recovery.

High/Ultra: many clinics can run on one deployment/browser profile while browser recovery remains isolated by organization; server workbench bundles stay redacted and pixel-free.

## Proof

`npm run smoke:ui-preferences` checks source wiring for scoped local imaging recovery. `npm run typecheck -w @dental/web` passed.

---

Date: 2026-05-25

## Problem

UI preferences validated saved ids only as nullable UUID/string values. That does not prove the selected patient, schedule filters, default doctor/assistant/chair or Telegram staff QR target still exist in the currently loaded clinic. In a multi-clinic browser profile, stale ids can survive a clinic switch and leave filters empty, appointment defaults misleading, or staff QR generation pointed at a non-current staff id.

## Solution

Add `reconcileDashboardScopedUiSelections()` after dashboard load. It builds active patient, doctor/owner, assistant, staff and chair id sets from the current dashboard. Invalid saved schedule filters/defaults and Telegram staff target are cleared. An invalid selected patient falls back to the first active patient so the doctor/front desk still lands on a real current record.

## Rejected Alternatives

- Trust UUID validation: rejected because tenant membership and active status are dashboard facts, not string-shape facts.
- Clear all UI preferences on organization switch: rejected because safe preferences such as Russian language, document kind and filters should remain stable until changed.
- Handle only schedule defaults: rejected because stale staff id can also affect Telegram QR staff linking.

## Operational Impact

Low-end: a few Set builds after dashboard changes or relevant saved selections change.

Middle tier: shared workstations recover from stale saved ids without a manual reset.

High/Ultra: the same reconciliation supports many clinics in one deployment while preserving long-lived safe operator preferences.

## Proof

`npm run smoke:ui-preferences` requires dashboard-scoped stale-id guards. `npm run typecheck -w @dental/web` passed.

---

Date: 2026-05-25

## Problem

The real DENTE document catalog had a coverage hole: `personal_data_processing_consent` existed in shared document kinds, rendering and payload checks, but the main documentation catalog did not list it. The FNS source notes also drifted: docs still showed old `soc_nv_pm` and `imns39_08` URLs while the pinned manifest and shared metadata had newer official FNS anchors.

## Solution

Add personal-data processing consent to the operator-facing form catalog, structured-payload rules and README summary. Extend `smoke:documents-catalog` with a required-fragment map for every exported `DocumentKind`, so a rendered but undocumented form fails CI. Update the FNS docs anchors to the canonical official pages and extend `smoke:official-document-sources` to assert the canonical URLs, reject stale paths, and match the docs date to `docs/legal-sources/fns-knd-1151156.json`.

## Rejected Alternatives

- Documentation-only fix: rejected because the same omission can return as soon as another form is added.
- Render-count-only check: rejected because `renderedCount: 31` does not prove the human catalog names all 31.
- Bump all `sourceCheckedAt` metadata to 2026-05-25: rejected because only FNS sources were rechecked in this slice.
- Keep old FNS paths as alternate links: rejected because smoke contracts should point operators to one canonical official route.

## Operational Impact

Low-end: no runtime client cost; source checks run only in smoke scripts.
Middle tier: clinic operators see the complete real form catalog, including personal-data consent.
High/Ultra: future document kinds must be added to docs deliberately, which keeps multi-clinic releases auditable.

## Proof

`npm run build -w @dental/shared`, `npm run build -w @dental/api`, `npm run smoke:official-document-sources`, `npm run smoke:documents-catalog`, and `npm run smoke:document-payloads` passed.

---

Date: 2026-05-25

## Problem

`selectedProtocolId` was persisted as an operator preference, but the dashboard-scoped reconciliation function did not validate it against the current clinic's protocol template set. If a clinic switches workspaces, removes a template, or changes the protocol library, a stale protocol id could remain in saved preferences. A later specialty-specific effect cleared display state, but the core saved-configuration reconciliation path stayed incomplete.

## Solution

Add current `dashboard.protocolTemplates` ids to `reconcileDashboardScopedUiSelections()` and clear `selectedProtocolId` when it is no longer present. Add `selectedProtocolId` to the reconciliation effect dependencies. Extend `smoke:ui-preferences` to require this guard, so future preference additions cannot quietly skip the dashboard ownership check.

## Rejected Alternatives

- Rely on the specialty-specific fallback: rejected because it validates render availability after memoization, not the complete dashboard-scoped preference contract.
- Clear all protocol preferences on dashboard reload: rejected because valid protocol choices should persist until the operator changes them.
- Store only specialty, never protocol id: rejected because doctors need a stable default template inside a specialty.

## Operational Impact

Low-end: one small Set build during dashboard/preference reconciliation.

Middle tier: doctors keep their chosen protocol while it exists; removed or foreign templates stop poisoning the workspace.

High/Ultra: multi-clinic deployments can keep clinic-specific protocol libraries without browser-profile bleed between organizations.

## Proof

`npm run smoke:ui-preferences`, `npm run smoke:settings-preferences`, and `npm run typecheck -w @dental/web` passed.

---

Date: 2026-05-25

## Problem

Local visit draft recovery used `dental-crm:visit-draft:${visitId}` without clinic organization scope. Production UUIDs usually avoid collision, but DENTE is designed for multi-clinic deployments, shared workstations, demo data and local recovery. Browser-wide draft keys are weaker than the tenant-scoped local storage contract already used for document signatures, onboarding and imaging recovery.

## Solution

Route visit draft keys through `organizationScopedLocalStorageKey`. `loadVisitLocalDraft` now reads the organization-scoped key first and falls back to the legacy key for upgrade recovery. `saveVisitLocalDraft` writes the scoped key. Restore/autosave effects pass `activeOrganizationId` and include it in dependencies.

## Rejected Alternatives

- Trust visit id uniqueness: rejected because local recovery must be robust in demo/sample/shared-workstation contexts too.
- Clear legacy drafts on first organization load: rejected because unsynced clinical text is higher value than storage neatness.
- Hide organization lookup inside storage helpers: rejected because explicit ownership keeps the helper pure and testable.

## Operational Impact

Low-end: one extra localStorage fallback read on visit draft restore.

Middle tier: a clinic switch cannot reopen another organization's local visit text if ids overlap or demo data is reused.

High/Ultra: many clinics can share one browser profile while local clinical draft recovery follows the active organization boundary.

## Proof

`npm run smoke:ui-preferences` and `npm run typecheck -w @dental/web` passed.

---

Date: 2026-05-25

## Problem

Pending STT chunks are intentionally durable and can survive offline periods, visit changes and clinic switches. The queue item and server response include `visitId`, but the web client applied every flushed transcription to the currently open visit transcript. That can mix an older visit's dictated text into a different open card after connectivity returns.

## Solution

Add `speechTranscriptionMatchesActiveVisit()` and guard `applySpeechTranscription()` before appending text. Foreign visit chunks can still sync to the server, but they are not appended to the current transcript. `flushPendingSpeechChunks()` now schedules recording assembly only when the flushed result matches the active visit. Add `smoke:speech-queue-source` to keep the guard before `appendVisitDictationText()` and require the STT plan to document this ownership rule.

## Rejected Alternatives

- Clear the pending STT queue on visit switch: rejected because that would discard offline audio.
- Keep appending and rely on doctors to notice: rejected because mixed clinical dictation is a real documentation error.
- Assemble every flushed recording under current query params: rejected because foreign recordings should not touch the current card flow.

## Operational Impact

Low-end: one string comparison per flushed transcription result.

Middle tier: offline dictation recovery remains useful without contaminating the current visit.

High/Ultra: multi-clinic browser profiles can keep long-lived STT queues while respecting active visit ownership.

## Proof

`npm run smoke:speech-queue-source`, `npm run typecheck -w @dental/web`, and `npm run smoke:russian-fallback-source` passed. After adding the docs guard, `npm run smoke:speech-queue-source` and `npm run typecheck -w @dental/web` passed again.

---

Date: 2026-05-25

## Problem

Telegram settings are part of first-run clinic setup, but the browser still sent some operator-entered bot values in a weak form. Public URLs could be rejected by the API only after a failed save, and `botUsername` / `ownBotUsername` were posted as raw trimmed strings. Separately, clinic-owned bot configs from `DENTE_TELEGRAM_CLINIC_BOTS_JSON` accepted raw public URL strings into runtime settings before later helpers had a chance to filter them.

## Solution

Add client-side public URL normalization for every Telegram settings URL: webhook, patient portal, welcome image, scenario visual cards, review link and maps link. The guard requires HTTPS, removes hashes, rejects URL credentials, patient/document/visit/token path segments, UUID-like ids and long personal numeric identifiers in path or query. Add `normalizeTelegramBotUsernameDraft()` for shared and clinic-owned bot names before settings save. Export `safeDenteTelegramPublicHttpsUrl()` from the API state layer and use it while parsing clinic-owned bot JSON runtime configs.

## Rejected Alternatives

- Rely only on server validation: rejected because onboarding and settings should tell a doctor/admin which field is wrong before a failed save cycle.
- Allow arbitrary public review/maps URLs and strip only during send: rejected because runtime status and preview context should not carry patient-identifying URLs.
- Keep raw bot username payloads: rejected because the UI already knows the exact Telegram bot-name contract and can normalize `@dentecrm_bot` locally.

## Operational Impact

Low-end: only small string/URL checks on settings save or env config parse.

Middle tier: first clinic setup fails earlier with a Russian field-level explanation instead of a generic settings-save failure.

High/Ultra: clinic-owned bot deployments can scale by JSON config without leaking per-patient portal/review/maps URLs into scoped runtime settings.

## Proof

`npm run smoke:telegram-url-ui-source`, `npm run typecheck -w @dental/web`, `npm run smoke:telegram-control-ui-source`, `npm run build -w @dental/api`, `npm run smoke:telegram-bot`, `npm run smoke:onboarding-configuration-source`, `npm run smoke:russian-fallback-source`, and `npm run smoke:ui-preferences` passed.
