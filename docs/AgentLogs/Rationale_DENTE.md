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

---
Date: 2026-05-31

## Problem

CT planning had structural artifacts for ОПТГ curves and cross-section intent, but the plan did not yet translate a drawn panoramic curve into an explicit reconstruction route. A handoff could say that an OPG route exists while the operator still lacked curve length, derived cross-section count, spacing, slab width and workstation-scaled viewing density.

## Solution

Add `ctPlanningReconstruction.ts` as a cold deterministic planner. It selects the longest panoramic and canal curves, computes curve length, maps the existing DICOM render plan to a continuous `qualityWeight`, derives cross-section step from that weight, caps derived slice count at 160, and exposes a typed `CtPlanningReconstructionPlan`. The snapshot owns this plan and passes it to export/UI. The UI panel says this is an OPG/cross-section route plan only, not pixel export or certified rendering.

## Rejected Alternatives

- Generate a fake panoramic image in the CRM shell: rejected because a structural curve is not source CT data and must not masquerade as diagnostic pixels.
- Binary low/high quality mode: rejected because the product direction requires continuous scaling; `qualityWeight` changes display density only, not clinical dimensions or route ownership.
- Let the export lane treat any OPG curve as complete: rejected because curve points without a cross-section plan still leave the doctor/admin with an incomplete handoff.
- Raise the CT tools bundle budget: rejected because the main CT panel was already close to 18 KB; reconstruction logic and UI now live in separate chunks.

## Scalability Potential

Low: wider cross-section spacing and capped count keep the browser route plan light on weak clinic laptops.

Middle: balanced MPR workstations get denser derived slices without changing the clinical artifact contracts.

High: discrete GPUs receive more detailed route planning density while handoff still stays metadata/tool-state only.

Ultra: diagnostic-class render plans can drive the densest planned cross-section route, but pixel rendering still belongs to OHIF/Cornerstone/external workbench.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_COMPILE. No profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: no new hot loop; the work runs in React memo/snapshot construction and is bounded by annotation point count plus a 160 derived-slice cap. Expected frame impact is below measurement noise, pending browser profiler proof.

Bundle impact after build: `ct-planning-tools` 17,886 bytes / 5,016 gzip; `ct-planning-reconstruction` 4,382 bytes / 2,082 gzip; `ct-planning-reconstruction-panel` 1,410 bytes / 653 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run build -w @dental/web`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:web-bundle-budget`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, and `npm run typecheck -w @dental/api` passed. `git diff --check` reported no whitespace errors, only pre-existing CRLF warnings in large web files.

---
Date: 2026-05-31

## Problem

CT planning could carry a selected implant type and an implant-axis annotation, but there was no explicit derived model plan for implant body length/diameter, apex point, safety envelope or surgical guide sleeve. That made validation/export too coarse: a lab lane could appear close to ready without the facts a guide workflow needs.

## Solution

Add `ctPlanningImplantModel.ts` as a cold deterministic planner. It selects the usable implant axis, reads the selected implant dimensions, derives a displayed apex label from axis direction plus implant length, computes a 2 mm radial safety envelope, and derives guide sleeve diameter/length. `ctPlanningState` owns the resulting `implantModelPlan`; validation and export consume that one snapshot. `CtPlanningImplantModelPanel` renders the model state separately from the main CT tools chunk.

## Rejected Alternatives

- Generate a fake 3D implant/sleeve mesh in the CRM shell: rejected because the current source data is annotations and implant metadata, not a certified volumetric renderer or surgical guide engine.
- Let quality tier change implant/sleeve dimensions: rejected because workstation quality may change visual density only; clinical dimensions stay data-owned.
- Treat selected implant type alone as guide-ready: rejected because an implant without axis/apex/sleeve is not a transferable guide plan.
- Raise the `ct-planning-tools` budget: rejected because new model logic/panel can be split into small chunks.

## Scalability Potential

Low: weak clinic laptops get metadata cards and lighter future visual density through continuous `modelingWeight`; no hot CT mesh loop is added.

Middle: normal workstations can show body, axis, apex, envelope and sleeve readiness in the CT panel without launching an external renderer.

High: GPU-backed render plans can use denser visual representation later while keeping the same snapshot/export facts.

Ultra: future full 3D implant placement can consume this explicit model plan as a route contract; certified pixel rendering still belongs to the CT workbench/OHIF/Cornerstone path.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_COMPILE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: no new frame-loop owner; the helper is bounded by annotation count and runs in the existing CT snapshot/memo route. Expected frame impact is below measurement noise until a browser profiler proves otherwise.

Bundle impact after build: `ct-planning-tools` 17,987 bytes / 5,048 gzip; `ct-planning-implant-model` 4,271 bytes / 1,925 gzip; `ct-planning-implant-model-panel` 1,366 bytes / 648 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-code-split-source`, `npm run build -w @dental/web`, `npm run smoke:web-text-encoding`, `npm run smoke:web-bundle-budget`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, and `npm run smoke:dicom-folder-workup` passed. `git diff --check` reported no whitespace errors, only pre-existing CRLF warnings in large web files.

Date: 2026-05-31

## Problem

CT planning had geometry metrics, but ruler, angle, ROI area, ROI volume, density probes, saved density values, canal clearance, calibration warnings and unsaved local artifacts were not presented as one readiness map. That left the measurement lane too loose for doctor review and export handoff.

## Solution

Add `ctPlanningMeasurementPlan.ts` as a cold deterministic measurement readiness planner. It separates probe points from saved density values, treats density without a viewer value as draft, keeps canal clearance as a hard clinical gate when below 2 mm, and exposes `CtPlanningMeasurementPlan` through `ctPlanningState`. `CtPlanningMeasurementPanel` renders the map; validation and export consume the same plan.

## Rejected Alternatives

- Invent HU/density values from a probe point: rejected because CRM metadata does not contain diagnostic pixel sampling.
- Keep measurement status only in the generic geometry grid: rejected because export readiness needs an explicit ruler/ROI/density/package map.
- Raise the `ct-planning-tools` budget after adding the panel: rejected because the new logic and UI are split into dedicated chunks and excess copy was removed instead.
- Treat one arbitrary measurement as enough for the doctor lane: rejected because area, volume, density, clearance and portable state are different clinical checks.

## Scalability Potential

Low: weak laptops get a small card map and no pixel sampling loop.

Middle: normal clinic workstations can see which measurements are ready before exporting a CT plan.

High: GPU-backed viewer paths can later fill density values into the same plan without changing the export route.

Ultra: full volumetric segmentation can add richer derived values later while this map remains the handoff contract for readiness.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_COMPILE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: no new frame-loop owner; the helper is bounded by annotation count and runs inside the existing CT snapshot path. Expected frame impact is below measurement noise until browser profiler proof exists.

Bundle impact after build: `ct-planning-tools` 17,866 bytes / 5,033 gzip; `ct-planning-measurement-plan` 4,347 bytes / 1,859 gzip; `ct-planning-measurement-panel` 1,155 bytes / 537 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-code-split-source`, `npm run build -w @dental/web`, `npm run smoke:web-text-encoding`, `npm run smoke:web-bundle-budget`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, and `npm run smoke:dicom-folder-workup` passed. `git diff --check` reported no whitespace errors, only pre-existing CRLF warnings in large web files.

---
Date: 2026-05-31

## Problem

CT planning had many derived boards: reconstruction, measurements, implant model, validation, export, and artifact authoring. The operator still had to infer the next clinical step manually. The old workflow was static text, so it did not react to missing volume, missing ОПТГ curve, incomplete density values, absent implant axis, safety blockers, or unsaved local artifacts.

## Solution

Add `ctPlanningWorkflowPlan.ts` as a cold deterministic workflow planner. It consumes the existing reconstruction, measurement, implant model, validation and export facts, then emits six fixed phases: series, ОПТГ/cross-sections, measurements, implant model, safety, and handoff. `activePhaseId` names the first unfinished phase. `CtPlanningWorkflowPanel` renders score, next action and top blockers. Static workflow text was removed from the main CT tools chunk.

## Rejected Alternatives

- Keep the static four-step workflow: rejected because it cannot show the current blocker.
- Recompute readiness inside the React panel: rejected because UI should render a typed plan, not own clinical logic.
- Treat this as ОПТГ pixel reconstruction: rejected because the CRM shell still has metadata/tool-state only, while pixel work belongs to the viewer path.
- Raise the `ct-planning-tools` budget: rejected because removing static workflow text and splitting the planner made the main chunk smaller.

## Scalability Potential

Low: weak laptops render six small cards and no pixel sampling loop.

Middle: clinic workstations get a deterministic next-action route across CT planning without opening extra panels.

High: GPU-backed viewer paths can fill the same workflow facts with richer values later.

Ultra: full ОПТГ/segmentation/guide engines can feed this workflow without changing the handoff contract.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_COMPILE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: no frame-loop owner; workflow planning is six fixed phases plus small array checks already present in derived plans. Expected frame impact is below measurement noise until browser profiler proof exists.

Bundle impact after build: `ct-planning-tools` 17,457 bytes / 4,959 gzip; `ct-planning-workflow-plan` 4,346 bytes / 1,765 gzip; `ct-planning-workflow-panel` 1,109 bytes / 533 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-code-split-source`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-text-encoding`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, and `npm run typecheck -w @dental/api` passed. `git diff --check` reported no whitespace errors, only pre-existing CRLF warnings in large web files.

---
Date: 2026-05-31

## Problem

CT planning had an implant library and separate ruler/clearance metrics, but no explicit fit-screening board connecting the chosen implant size to measured ridge width, bone height and mandibular canal clearance. A doctor could select a preset without seeing whether current measurements were enough to reject or review that size.

## Solution

Add `ctPlanningImplantFit.ts` as a cold deterministic screening planner. `ctPlanningGeometry` now exposes `distanceMeasurementsMm` so the planner uses real viewer ruler values rather than parsing UI labels. The fit plan computes `ridgeWidthMm`, `boneHeightMm`, `diameterMarginMm`, `lengthMarginMm`, `canalMarginMm`, score and status for each implant library item. `CtPlanningImplantFitPanel` renders the selected candidate and the screening warnings inside the CT planning suite.

## Rejected Alternatives

- Automatically choose the "best" implant: rejected because current ruler annotations are not semantically typed as width or height; the doctor must confirm which measurement is which.
- Synthesize width/height when only one ruler exists: rejected because that would create fake clinical readiness.
- Ignore canal clearance during fit: rejected because the existing hard safety gate is less than 2 mm = blocked.
- Inline the rules in `ctPlanningTools.tsx`: rejected because the CT tools chunk is near its 18 KB budget and clinical logic belongs in a typed helper.

## Scalability Potential

Low: weak laptops get a static card grid from existing annotations and no CT sampling loop.

Middle: clinic workstations can review implant presets against ruler measurements before handoff.

High: viewer integrations can later provide typed width/height ruler roles while keeping this fit-plan contract.

Ultra: full surgical guide engines can replace the measurement source with certified segmentation/implant planning facts without changing the UI route.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_COMPILE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: no frame-loop owner; current work is four library presets plus bounded annotation measurement extraction. Expected frame impact is below measurement noise until browser profiler proof exists.

Bundle impact after build: `ct-planning-tools` 17,730 bytes / 5,030 gzip; `ct-planning-implant-fit` 2,975 bytes / 1,398 gzip; `ct-planning-implant-fit-panel` 1,539 bytes / 693 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-code-split-source`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-text-encoding`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, and `npm run typecheck -w @dental/api` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings in large web files. Process check found one existing BrowserOps `node.exe`; no CT build/test process was left behind.

---
Date: 2026-05-31

## Problem

The implant fit board could only see completed distance rulers as numbers. It used shortest distance as ridge width and longest distance as bone height for screening, which was honest but still too weak: a generic ruler could make a preset look ready even when the doctor had not marked the measurement as ridge width or bone height.

## Solution

Add typed CT distance semantics. `ctPlanningGeometry.ts` now exposes `CtPlanningDistanceMeasurement` with `ridge_width`, `bone_height`, `clearance`, or `generic`. `ctPlanningArtifactCommands.ts` adds dedicated `ridge-width-ruler` and `bone-height-ruler` commands and filters command readiness by semantic role. `ctPlanningImplantFit.ts` still displays shortest/longest fallback values, but `ready` status now requires typed width and typed height roles. `CtPlanningImplantFitPanel` shows whether each dimension came from a role, fallback draft, or is missing.

## Rejected Alternatives

- Keep generic shortest/longest as ready: rejected because numeric length alone does not prove clinical meaning.
- Parse only Russian visible button titles: rejected because saved annotation labels/notes need stable internal role tokens as well.
- Add a heavy CT segmentation step here: rejected because this CRM layer still owns planning metadata and tool-state, not certified voxel segmentation.
- Raise the CT tools bundle budget: rejected because semantic logic remains split across small typed chunks.

## Scalability Potential

Low: weak laptops get deterministic annotation-role checks with no frame-loop sampling.

Middle: clinic workstations can separate draft rulers from signed ridge/bone measurements before export.

High: a richer viewer can feed the same typed role contract from real drawing tools.

Ultra: certified segmentation and guide planning can replace the measurement source while keeping the fit-board readiness gate unchanged.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_COMPILE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: no frame-loop owner; role extraction is bounded by annotation count and candidate scan is bounded by the implant preset list. Expected frame impact is below measurement noise until browser profiler proof exists.

Bundle impact after build: `ct-planning-tools` 17,756 bytes / 5,040 gzip; `ct-planning-geometry` 4,792 bytes / 1,967 gzip; `ct-planning-artifact-commands` 5,072 bytes / 1,834 gzip; `ct-planning-implant-fit` 3,898 bytes / 1,755 gzip; `ct-planning-implant-fit-panel` 1,694 bytes / 766 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-code-split-source`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-text-encoding`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, and `npm run typecheck -w @dental/api` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings in large web files. Process check found no leftover `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process.

---
Date: 2026-05-31

## Problem

Typed CT ruler commands existed, but the semantic meaning was still only reliable inside web helper code. If the role only lived in a title/note string, saved sessions, API tool-state bundles, and future viewer adapters could lose or reinterpret it. Generic rulers also still made the measurement readiness map too optimistic.

## Solution

Add `semanticRole` to shared `ImagingViewerAnnotation` and exported `DicomViewerToolStateAnnotation`. The visit UI writes the role when creating CT artifacts, the local CT bridge and API tool-state builder copy it, and CT geometry/artifact command state prefer the structured role before text fallback. Measurement readiness now counts signed ridge-width, bone-height, and clearance ruler roles and requires signed width plus height before reporting the measurement map as ready.

## Rejected Alternatives

- Hide stable role tokens in visible notes: rejected because doctor-facing annotation notes should not carry implementation metadata.
- Keep role semantics web-only: rejected because the portable viewer bundle must be the handoff source.
- Require certified segmentation now: rejected because this slice is metadata/tool-state transport, not voxel segmentation or HU sampling.
- Raise CT chunk budgets: rejected because the new contract stayed inside existing split chunks and under current limits.

## Scalability Potential

Low: weak laptops pay one optional string field per annotation and a bounded annotation scan.

Middle: clinic workstations can save and reopen CT ruler roles without losing implant screening state.

High: dedicated Cornerstone/OHIF adapters can map real tool handles into the same role field.

Ultra: certified guide/segmentation engines can emit the same semantic roles while replacing CRM screening math with signed viewer facts.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_COMPILE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: no frame-loop owner; the role copy is linear in annotation count and capped by the existing 200-annotation limit. Expected frame impact is below measurement noise until browser profiler proof exists.

Bundle impact after build: `ct-planning-tools` 17,790 bytes / 5,050 gzip; `ct-planning-state` 7,709 bytes / 3,098 gzip; `ct-planning-geometry` 4,832 bytes / 1,982 gzip; `ct-planning-measurement-plan` 5,267 bytes / 2,142 gzip; `dental-shared` 173,288 bytes / 42,615 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-code-split-source`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-text-encoding`, and `npm run smoke:dicom-folder-workup` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings in large web files. Process check found one existing BrowserOps `node.exe`; no CT build/test process was left behind.

---
Date: 2026-05-31

## Problem

The shared `clearance` semantic role existed, but the doctor-facing CT artifact command list did not create a dedicated canal-clearance ruler. Operators could still use a generic distance ruler, which made the control measurement weaker and easier to confuse with ridge width or bone height.

## Solution

Add `canal-clearance-ruler` to `ctPlanningArtifactCommands.ts` with `semanticRole: "clearance"`, implant requirement, oblique projection, and a minimum two-point distance. Update `ctPlanningMeasurementPlan.ts` so a signed clearance ruler is visible as control evidence when the computed implant-axis-to-canal clearance is not available. Keep the actual readiness gate tied to computed geometry from implant axis plus mandibular canal route.

## Rejected Alternatives

- Generic ruler only: rejected because the UI would not distinguish safety-clearance evidence from other distances.
- Close the hard canal gate from a manual clearance ruler: rejected because a line segment does not prove implant-axis-to-canal clearance.
- Fake automatic canal segmentation: rejected because this CRM slice owns planning state and handoff metadata, not certified voxel segmentation.
- Increase CT bundle budgets: rejected because the new artifact command and measurement copy stayed inside existing split chunks.

## Scalability Potential

Low: weak laptops pay a static command entry and a bounded annotation count check.

Middle: clinic workstations get an explicit signed control line before handoff.

High: a viewer adapter can map a real distance tool into the same `clearance` role.

Ultra: certified guide-planning engines can emit the same role while keeping the hard gate sourced from true implant/canal geometry.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_COMPILE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: no frame-loop owner; the new path is static command metadata plus an existing linear annotation scan. Expected frame impact is below measurement noise until browser profiler proof exists.

Bundle impact after build: `ct-planning-tools` 17,790 bytes / 5,050 gzip; `ct-planning-measurement-plan` 5,443 bytes / 2,205 gzip; `ct-planning-artifact-commands` 5,589 bytes / 1,917 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run smoke:web-code-split-source`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-text-encoding`, and `npm run smoke:dicom-folder-workup` passed. Final `git diff --check` and process check are recorded in `Status_DENTE.md`.

---
Date: 2026-05-31

## Problem

The OPG reconstruction plan treated any three-point panoramic curve as enough to build a cross-section grid. That is too optimistic: three points can span a long dental arch with a coarse polyline, making cross-sections look route-ready even when the operator has not placed enough control points.

## Solution

Add route-level curve sampling quality to `ctPlanningReconstruction.ts`. The plan now computes `curveSegmentCount`, `longestCurveSegmentMm`, and a continuous workstation-derived `curveSpacingTargetMm`. It renders a `curve-sampling` card and keeps reconstruction status in draft when the largest OPG segment exceeds the target. This remains metadata/tool-state QA; no pixel OPG reconstruction is claimed.

## Rejected Alternatives

- Treat any three OPG points as ready: rejected because sparse curves create misleading cross-section placement.
- Generate a fake panoramic bitmap in CRM: rejected because the CRM owns route planning and handoff metadata, not diagnostic pixel reconstruction.
- Use a fixed binary quality tier: rejected because workstation capability already flows through continuous reconstruction quality weight.
- Mutate clinical measurements from workstation quality: rejected because display density can scale, but clinical geometry and handoff truth must stay stable.

## Scalability Potential

Low: weak laptops get a looser spacing target and avoid pretending to build dense derived routes.

Middle: clinic workstations can see when a curve needs more control points before handoff.

High: browser viewer adapters can use the same largest-gap QA before asking Cornerstone/OHIF to sample curved planar reformation.

Ultra: certified engines can replace the sampling implementation while keeping the CRM route-quality gate and warning language.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_COMPILE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: one linear pass over OPG control points. Expected frame impact is below measurement noise until browser profiler proof exists.

Bundle impact after build: `ct-planning-reconstruction` 5,373 bytes / 2,394 gzip; `ct-planning-tools` 17,790 bytes / 5,051 gzip; total JS 1,555,801 bytes / 417,222 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run build -w @dental/web`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:web-bundle-budget`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, and `npm run smoke:dicom-folder-workup` passed. Final `git diff --check` and process check are recorded in `Status_DENTE.md`.

---
Date: 2026-05-31

## Problem

The lab handoff lane could become too optimistic: it treated guide route plus implant model readiness as enough, while the implant model plan did not explicitly own guide route length or a single guide-ready fact. That let a generic surgical-guide annotation look closer to lab-ready than it should.

## Solution

Extend `ctPlanningImplantModel.ts` with `surgicalGuideAnnotation`, `guideRouteLengthMm`, `guideRoutePointCount`, `hasGuideRoute`, and `guideReady`. `guideReady` requires selected implant, implant axis, guide route, sleeve dimensions, and computed canal clearance of at least 2 mm. Validation and export now gate the surgical template and lab lane on `input.implantModelPlan.guideReady`.

## Rejected Alternatives

- Mark lab lane ready from `hasGuideRoute && hasImplantPlan`: rejected because it ignores axis, sleeve and canal clearance.
- Create a fake STL/CAD plan in CRM: rejected because this slice owns structured route readiness, not lab manufacturing geometry.
- Add a separate guide chunk and panel: rejected because the existing implant-model panel already renders cards and the CT tools chunk is near its strict budget.
- Allow missing canal clearance for lab handoff: rejected because the existing CT safety model treats canal clearance as a clinical gate.

## Scalability Potential

Low: weak laptops pay one extra bounded scan over guide route points and no renderer work.

Middle: clinic workstations get an explicit lab-blocking state instead of a vague guide route note.

High: viewer adapters can fill the same guide route fields from real spline handles.

Ultra: CAD/CAM integrations can replace the route source while keeping the CRM lab gate unchanged.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_COMPILE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: one linear pass over surgical-guide points. Expected frame impact is below measurement noise until browser profiler proof exists.

Bundle impact after build: `ct-planning-implant-model` 5,498 bytes / 2,340 gzip; `ct-planning-export` 5,836 bytes / 2,187 gzip; `ct-planning-validation` 3,822 bytes / 1,446 gzip; `ct-planning-tools` 17,790 bytes / 5,051 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run build -w @dental/web`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:web-bundle-budget`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, and `npm run smoke:dicom-folder-workup` passed. Final `git diff --check` and process check are recorded in `Status_DENTE.md`.

---
Date: 2026-05-31

## Problem

The CT measurement map only counted saved density probe values. It did not summarize average/range, did not show a drill-protocol hint, and did not clearly distinguish calibrated HU from arbitrary viewer-unit values. That left two bad options: a raw counter that is clinically weak, or an unsafe fake HU interpretation.

## Solution

Extend `ctPlanningMeasurementPlan.ts` with a bounded one-pass density stats builder. The plan now exposes average, range label, unit label, HU-calibration flag, mixed-unit flag, and `densityProtocolLabel`. HU-based density categories are used only when the saved unit is explicitly `HU`. Non-HU values render as viewer units and produce a warning that this is not HU calibration. `CtPlanningMeasurementPanel` shows the protocol label in the summary.

## Rejected Alternatives

- Apply HU thresholds to any numeric probe: rejected because a viewer value without explicit HU unit is not calibrated density.
- Treat probe points without values as density: rejected because point placement alone does not carry measurement truth.
- Add voxel sampling in the CRM shell: rejected because this slice owns portable tool-state facts; diagnostic sampling belongs in the viewer engine.
- Add a separate panel/chunk: rejected because the measurement plan already owns density readiness and stayed inside bundle budget.

## Scalability Potential

Low: weak laptops get one linear annotation scan and no renderer, voxel, or worker work.

Middle: clinic workstations get readable density range and a safe drill-protocol reminder.

High: viewer adapters can start storing real `HU` units and automatically unlock HU threshold copy without changing the UI contract.

Ultra: certified CBCT/HU calibration engines can replace the value source while preserving the same measurement-plan fields.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_COMPILE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: no frame-loop owner; density stats are linear in saved density annotations and normally tiny. Expected frame impact is below measurement noise until browser profiler proof exists.

Bundle impact after build: `ct-planning-measurement-plan` 7,474 bytes / 3,004 gzip; `ct-planning-measurement-panel` 1,343 bytes / 604 gzip; `ct-planning-tools` 17,790 bytes / 5,051 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run build -w @dental/web`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:web-bundle-budget`, and `npm run smoke:dicom-folder-workup` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings in large web files. Process check found one existing BrowserOps `node.exe`; no CT build/test process was left behind.

---
Date: 2026-05-31

## Problem

The reconstruction plan derived a cross-section count from OPG curve length and workstation quality, but it did not expose whether the capped station list actually covered the whole route. A very long curve could hit the 160-slice safety cap and still look like a ready cross-section plan even if the last part of the route was not covered.

## Solution

Add `crossSectionStationPlan()` to `ctPlanningReconstruction.ts`. It computes uncapped demand, capped count, covered length, coverage percent, and a compact station preview (`0 / middle / end`). `crossSectionStatus` now requires `crossSectionCoveragePercent >= 99`, and a dedicated `station-coverage` card plus summary row show the coverage. Under-covered capped routes stay draft with a warning to split the route or adjust step in the viewer.

## Rejected Alternatives

- Keep the old `crossSectionCount > 0` readiness: rejected because count alone does not prove route coverage.
- Store all derived station offsets in UI state: rejected because the CRM shell only needs bounded route readiness, not a full station table.
- Generate panoramic pixels in CRM: rejected because this slice is route planning; diagnostic OPG/MPR pixels stay in the viewer engine.
- Remove the 160 cap: rejected because weak workstations need a bounded handoff plan.

## Scalability Potential

Low: weak laptops keep the 160-station cap and see when the route must be split instead of silently overloading the browser.

Middle: clinic workstations get a clear coverage percent and station preview before handoff.

High: real viewer adapters can use the same demand/coverage contract to request actual cross-section planes.

Ultra: certified panoramic reconstruction can replace the station source while preserving the CRM route coverage gate.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_COMPILE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: no frame-loop owner; the new station plan is constant math after the existing OPG curve length pass. Expected frame impact is below measurement noise until browser profiler proof exists.

Bundle impact after build: `ct-planning-reconstruction` 6,728 bytes / 2,864 gzip; `ct-planning-reconstruction-panel` 1,541 bytes / 705 gzip; `ct-planning-tools` 17,790 bytes / 5,050 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run build -w @dental/web`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:web-bundle-budget`, and `npm run smoke:dicom-folder-workup` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings in large web files. Process check found no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

---
Date: 2026-05-31

## Problem

The CT measurement map treated ROI area and volume as counters. That was weak for the user-facing requirement: doctors need area/volume values, but the CRM must not imply certified tissue segmentation. A volume ROI derived from a contour and slab thickness is useful planning metadata, not a segmented anatomical volume.

## Solution

Extend `ctPlanningGeometry.ts` to compute total ROI area, total ROI volume, the slab thickness used for volume estimates, and the count of underdrawn ROI drafts. Extend `ctPlanningMeasurementPlan.ts`, `CtPlanningMeasurementPanel`, and CT validation so the UI shows area/volume value labels and explicitly states that volume ROI is a contour x slab estimate, not tissue segmentation.

## Rejected Alternatives

- Keep count-only ROI cards: rejected because "1 volume" is not a clinical planning value.
- Claim segmentation from the existing `volume_roi` annotation: rejected because no voxel/tissue segmentation exists in the CRM shell.
- Store every ROI point table in React state: rejected because current handoff needs bounded summary facts, not heavy contour payload duplication.
- Raise the measurement-plan bundle budget: rejected because shortening copy kept the chunk below the existing 8,000 byte limit.

## Scalability Potential

Low: weak laptops get scalar area/volume summaries from existing annotations with no renderer, worker, or voxel sampling.

Middle: clinic workstations see concrete ROI values and draft-contour warnings before export.

High: viewer adapters can replace the value source with calibrated tool-state values while keeping the same summary contract.

Ultra: certified segmentation engines can later emit signed volume facts into this same route, while CRM copy continues to distinguish estimate versus segmentation.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_COMPILE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: no frame-loop owner; one bounded annotation scan and scalar accumulation. Expected frame impact is below measurement noise until browser profiler proof exists.

Bundle impact after build: `ct-planning-geometry` 5,390 bytes / 2,219 gzip; `ct-planning-measurement-plan` 7,862 bytes / 3,132 gzip after copy compression; `ct-planning-measurement-panel` 1,361 bytes / 614 gzip; `ct-planning-tools` 17,790 bytes / 5,051 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run build -w @dental/web`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:web-bundle-budget`, and `npm run smoke:dicom-folder-workup` passed. Initial bundle budget failed at 8,086 bytes for `ct-planning-measurement-plan`; copy was compressed instead of raising the limit, and the final budget passed at 7,862 bytes. `git diff --check` reported no whitespace errors, only existing CRLF warnings in large web files. Process check found one external BrowserOps `node.exe` (`C:\hades\Tools\BrowserOps\cdp_eval_first_match.js`); no CT build/test process was left behind.

---
Date: 2026-06-01

## Problem

The CT export packet had owner lanes, blockers, and a missing-artifact list, but it did not carry a compact clinical fact sheet. A doctor, admin, or lab operator had to infer implant size, sleeve state, OPG station coverage, ROI values, density protocol, and canal/guide readiness from separate panels. That is weak handoff UX and makes the portable packet less useful away from the main CT board.

## Solution

Add `CtPlanningExportFact` and `clinicalFacts` to `CtPlanningExportPacket`. Build five bounded facts from existing signed summaries: implant/sleeve, OPG/cross-section coverage, ROI area/volume, density protocol, and canal/guide state. Render them in `CtPlanningExportPanel` as small status-toned cards. The facts stay metadata/tool-state summaries and reuse the existing guide/canal/validation gates.

## Rejected Alternatives

- Create a separate CT fact-state owner: rejected because export already receives the required geometry, measurement, reconstruction, implant, and validation summaries.
- Put the fact sheet into `ct-planning-tools`: rejected because that chunk is already near its strict 18,000 byte cap.
- Claim real OPG pixels, tissue segmentation, or CAD/CAM guide output: rejected because this CRM layer owns handoff metadata only.
- Raise the `ct planning export` budget: rejected after the first build failed at 8,964 bytes; copy and object construction were compressed instead.

## Scalability Potential

Low: weak laptops get five scalar cards and no renderer, worker, voxel, or mesh work.

Middle: clinic workstations can hand off a CT plan with the relevant clinical facts visible in one place.

High: OHIF/Cornerstone adapters can populate the same packet with richer signed tool-state facts after real display-set loading.

Ultra: certified segmentation/CAD engines can emit authoritative ROI/guide facts into the same route while the CRM continues to separate estimates from signed outputs.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_COMPILE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: no frame-loop owner; five fact strings are derived from existing bounded summaries. Expected frame impact is below measurement noise until browser profiler proof exists.

Bundle impact after build: first `ct-planning-export` build failed at 8,964 bytes against the 8,000 byte cap. Final build is 7,868 bytes / 2,814 gzip. `ct-planning-export-panel` is 1,542 bytes / 612 gzip, and `ct-planning-tools` remains 17,790 bytes / 5,052 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, and `npm run typecheck -w @dental/api` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings in large web files. Process check found no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

---
Date: 2026-06-01

## Problem

The CT workflow board still leaked implementation language into the user interface: visible phase owners rendered as `series`, `doctor`, `implant`, `admin`, or `lab`, and several workflow details mixed English terms such as `without pixel export from CRM`, `safety envelope`, and `Клинические gates`. The active phase also had only visual styling, without a structural signal for assistive technology.

## Solution

Keep the typed owner enum internal, but add an `ownerLabels` map in `CtPlanningWorkflowPanel` and render Russian role labels. Replace mixed English workflow copy in `ctPlanningWorkflowPlan.ts` with doctor-readable Russian wording. Add `aria-current="step"` to the active phase card. Extend the imaging usability smoke to require the role-label map and active-step attribute, and to forbid the old mixed-language strings.

## Rejected Alternatives

- Change the owner enum values themselves: rejected because state/workflow logic can keep stable internal ids while the panel controls presentation.
- Leave mixed English because it is not a diagnostic pixel viewer: rejected because the workflow board is visible to doctors/admins.
- Rely only on the `.active` class for the current phase: rejected because visual state should have a structural accessibility signal.
- Move the workflow copy into the main CT tools panel: rejected because the small workflow chunks already own this UI and remain well under budget.

## Scalability Potential

Low: weak laptops get the same tiny workflow phase list with no extra renderer, worker, or polling.

Middle: clinic workstations present the CT route in clinical Russian, reducing operator interpretation overhead.

High: more phase owners can keep stable enum ids while adding localized labels without touching planning logic.

Ultra: a future full viewer adapter can reuse the workflow board as an accessible high-level route without exposing engine terminology.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_COMPILE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: one static label map lookup per phase and one conditional attribute. Expected frame impact is below measurement noise until browser profiler proof exists.

Bundle impact after build: `ct-planning-workflow-plan` is 4,409 bytes / 1,778 gzip; `ct-planning-workflow-panel` is 1,285 bytes / 630 gzip; `ct-planning-tools` remains 17,790 bytes / 5,051 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, and `npm run typecheck -w @dental/api` passed. Final `git diff --check` and process check are recorded in `Status_DENTE.md`.

---
Date: 2026-06-01

## Problem

The CT export panel showed summary, clinical facts, lanes, and missing artifacts, but it did not present a hard release decision in one place. A warning packet could still look like a handoff packet unless the operator read every supporting card. The bundle budget smoke also had a false-proof risk: `/^ct-planning-export-[\w-]+\.js$/` can match `ct-planning-export-panel-...js`, so the export logic chunk could be skipped if asset ordering changed.

## Solution

Add `buildReleaseGate` in `CtPlanningExportPanel`. It derives ready/warning/blocked transfer copy from the existing packet status, the first blocked or warning clinical fact, and missing artifacts. Render it as `ct-planning-export-release` before the fact sheet. Fix the bundle budget regex to `^ct-planning-export-(?!panel-)` and add a code-split source guard so this cannot regress silently.

## Rejected Alternatives

- Add release logic to `ctPlanningExport.ts`: rejected because the logic chunk is already 7,868 bytes against an 8,000 byte cap, and UI copy belongs in the panel.
- Create another CT state owner for release readiness: rejected because the export packet already has the required status, facts, and blockers.
- Leave the budget regex as-is because current file order happened to pass: rejected because CI proof must not depend on directory ordering.
- Raise the export budget: rejected because the real issue was matcher precision, not bundle size.

## Scalability Potential

Low: weak laptops render one extra scalar status card; no DICOM pixels, workers, or volume data.

Middle: clinic workstations get a clear fix/draft/blocked decision before admin or lab handoff.

High: richer viewer adapters can feed better blocker facts into the same gate without changing panel ownership.

Ultra: certified segmentation/CAD modules can later emit signed facts and blockers while this release gate remains the transfer policy surface.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_COMPILE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: one bounded `.find` for blocked fact and one for warning fact over the compact clinical fact list. Expected frame impact is below measurement noise until browser profiler proof exists.

Bundle impact after build: `ct-planning-export` is correctly measured as 7,868 bytes / 2,837 gzip, `ct-planning-export-panel` is 2,762 bytes / 1,029 gzip, and `ct-planning-tools` remains 17,790 bytes / 5,050 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-code-split-source`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-text-encoding`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, and `npm run typecheck -w @dental/api` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings in large web files. Process check found no `node.exe`, `npm.cmd`, `vite.exe`, `tsx.exe`, `tsc.exe`, or `csc.exe` process left behind.

---
Date: 2026-06-01

## Problem

The CT implant-library screening card showed margins and candidate status, but it did not explicitly explain why a specific implant size was ready, draft, or blocked. A doctor could see a low score and a blocked state but still had to infer whether the blocker was missing typed rulers, negative diameter margin, negative length margin, missing canal hard gate, or canal clearance below 2 mm.

## Solution

Add `decisionReasons` to every `CtPlanningImplantFitCandidate`. Build them with `candidateDecisionReasons` from the existing scalar evidence: CT readiness, typed width/height presence, diameter margin, length margin, and canal clearance. Render the reasons as bounded chips inside each candidate card. Source smoke now requires the reason builder, candidate field, fallback warning, panel mapping, and CSS selector.

## Rejected Alternatives

- Treat the best score as enough explanation: rejected because clinical screening needs the blocker reason visible beside the candidate.
- Put all blockers into the global warning strip only: rejected because different implant sizes can fail for different dimensions.
- Claim automatic implant choice: rejected because this board is still a screening aid that must be confirmed in the viewer.
- Increase bundle budgets: rejected because the implant fit logic and panel remain comfortably under existing caps.

## Scalability Potential

Low: weak laptops render bounded text chips from existing scalar margins; no DICOM pixel or mesh work.

Middle: clinic workstations let doctors compare multiple implant sizes without mentally decoding each margin.

High: future viewer adapters can feed richer signed width/height/canal measurements into the same reason route.

Ultra: certified planning engines can replace the source measurements while keeping the CRM library as an explainable screening surface.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_COMPILE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: at most six candidates with four short reason strings each. Expected frame impact is below measurement noise until browser profiler proof exists.

Bundle impact after build: `ct-planning-implant-fit` is 4,905 bytes / 1,997 gzip, `ct-planning-implant-fit-panel` is 1,888 bytes / 824 gzip, and `ct-planning-tools` remains 17,790 bytes / 5,054 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, and `npm run typecheck -w @dental/api` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings in large web files. Process check found two external BrowserOps `node.exe` processes under `C:\hades\Tools\BrowserOps\...`; no DENTE build/test process was left behind.

---
Date: 2026-06-01

## Problem

Implant fit candidate reasons were visible in the implant fit board, but the transfer package UI still received only the export packet. During admin/lab handoff, the selected implant size could be visible without the screening reason beside the release gate. That forced cross-reading another panel and weakened the transfer surface.

## Solution

Pass `implantFitPlan` into `CtPlanningExportPanel` as UI evidence. Add `buildImplantFitHandoff` to choose the selected candidate or first review candidate, map status to ready/warning/blocked, and show size, score, decision reasons, and next action in a `ct-planning-export-fit` card. Keep export logic unchanged so `ct-planning-export` does not grow.

## Rejected Alternatives

- Add implant fit data to `CtPlanningExportPacket`: rejected for this slice because the export logic chunk is close to its strict 8,000 byte cap.
- Recompute implant fit inside the export panel: rejected because `ctPlanningTools.tsx` already computes the plan once.
- Keep fit reasons only in the implant fit board: rejected because the handoff panel is the transfer decision surface.
- Raise bundle budgets: rejected because all chunks stayed below existing caps.

## Scalability Potential

Low: weak laptops render one small handoff evidence card from an already computed plan.

Middle: clinic workstations can hand the CT plan to admin/lab with selected size reason visible near release state.

High: richer fit engines can feed stronger candidate reasons through the same prop without touching export packet logic.

Ultra: certified implant planning modules can later replace screening evidence while the CRM handoff card remains the explanatory bridge.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_COMPILE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: one selected-candidate lookup over a capped six-candidate list and a short reason join. Expected frame impact is below measurement noise until browser profiler proof exists.

Bundle impact after build: `ct-planning-tools` is 17,807 bytes / 5,064 gzip, `ct-planning-export-panel` is 3,866 bytes / 1,372 gzip, `ct-planning-export` remains 7,868 bytes / 2,837 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, and `npm run typecheck -w @dental/api` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings in large web files/docs. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

`ct-planning-tools` was carrying both the reusable CT planning panel and the static tool/action/metric/implant catalogs. After the implant-fit handoff slice it was 17,807 bytes against an 18,000 byte cap, leaving 193 bytes of headroom. That is not enough for the next CT viewer layers and creates a refactoring loop after every feature.

## Solution

Create `ctPlanningCatalog.ts` as the single owner for CT static catalogs and `implantPlanFromLibraryItem`. Keep `ctPlanningTools.tsx` as the UI owner and re-export the catalog so existing App/Settings imports stay stable. Add a Vite manual chunk `ct-planning-catalog`, source-smoke requirements, and a separate bundle budget entry.

## Rejected Alternatives

- Raise the `ct-planning-tools` budget: rejected because the problem was mixed ownership, not unavoidable UI size.
- Keep arrays in the panel and shorten more Russian copy: rejected because that spends UX text to hide a structural chunk problem.
- Duplicate catalog imports into App and Settings immediately: rejected because the panel re-export keeps the route stable while the bundle split still proves the separation.
- Let Rollup decide shared chunking implicitly: rejected because the budget contract needs a named artifact.

## Scalability Potential

Low: weak laptops load the CT panel UI without forcing all static planning copy into the same UI chunk.

Middle: clinic workstations get the same CT planning functions while future viewer panels can grow under clearer budgets.

High: richer implant libraries or planning presets can expand in the catalog chunk without inflating the panel chunk.

Ultra: a real Cornerstone/OHIF adapter can consume the same catalog while the CRM keeps UI, static data, and viewer math independently budgeted.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: less JS in the CT panel chunk. Production proof: `ct-planning-tools` dropped from 17,807 bytes / 5,064 gzip to 8,958 bytes / 2,813 gzip. The new `ct-planning-catalog` chunk is 8,969 bytes / 2,571 gzip and is measured separately.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-code-split-source`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-text-encoding`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, and `npm run typecheck -w @dental/api` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

CT quick actions selected the viewer tool, MPR projection, window, slab, and slice, but the matching structured artifact route lived in a separate artifact board. That forced the doctor to pick a scenario in one place and then manually find the correct artifact command elsewhere. It also created a risk that a quick scenario and artifact requirements drift apart.

## Solution

Add `artifactCommandIds` to each `CtPlanningQuickAction` in `ctPlanningCatalog.ts`. The CT panel now resolves those ids against `artifactCommands`, renders active scenario artifact status chips, and exposes one button for the next needed structured draft. Ridge ruler maps to both typed width and height rulers; canal maps to canal route plus clearance ruler.

## Rejected Alternatives

- Auto-create an artifact whenever a quick action is selected: rejected because switching tools should not mutate viewer annotations.
- Keep quick actions and artifact commands separate: rejected because it keeps the navigation gap and allows catalog drift.
- Store artifact command references in visible labels: rejected because route ids must stay typed metadata, not parsed UI text.
- Move artifact command definitions into the catalog: rejected because command state and annotation matching are already owned by `ctPlanningArtifactCommands.ts`.

## Scalability Potential

Low: weak laptops get small status chips and one button; no image decoding, voxel sampling, or worker path.

Middle: clinic workstations reduce CT planning clicks for OPG, typed rulers, canal, ROI, density, implant axis, and guide routes.

High: richer viewer adapters can consume the same quick-action route to open the exact tool and create the matching tool-state object.

Ultra: certified planning modules can replace artifact creation with signed viewer commands while preserving the same route ids.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: one small map over the existing artifact command states when the CT panel renders. Production proof remains under budget: `ct-planning-tools` is 9,684 bytes / 3,044 gzip, and `ct-planning-catalog` is 9,334 bytes / 2,673 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-code-split-source`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-text-encoding`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, and `npm run typecheck -w @dental/api` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

CT artifact creation had exact route metadata in `artifactCommandIds`, but `App.tsx` still selected the quick action with `action.tool === command.tool`. That is too coarse because ridge width, bone height, generic distance and canal clearance all use `measure_distance`. Separately, CT geometry could still emit false evidence for underdrawn drafts: `polylineLengthMm` returned `0` for single-point rulers/axes, and implant-to-canal clearance accepted a 2-point canal even though canal readiness requires 3 points.

## Solution

Add `findCtPlanningQuickActionForArtifactCommand` in `ctPlanningCatalog.ts`. It resolves by exact `artifactCommandIds.includes(command.id)` first and only then falls back to a shared viewer tool. Use that resolver in `createCtPlanningArtifact`. In `ctPlanningGeometry.ts`, require 2 points before distance/implant-axis metrics, require 3 points before OPG/canal curve metrics, and require a 3-point canal route before calculating implant-to-canal clearance. Extend source smokes and CT docs to lock the contract.

## Rejected Alternatives

- Keep tool-based route matching: rejected because the viewer tool is an implementation detail shared by multiple clinical artifacts.
- Remove the fallback entirely: rejected because old or generic command ids can still benefit from opening the matching viewer tool if no exact route exists.
- Let underdrawn polyline drafts produce a `0` metric: rejected because it turns an unfinished click into clinical-looking evidence.
- Accept a 2-point canal for clearance: rejected because the rest of the planning state already treats canal curves as 3-point artifacts.

## Scalability Potential

Low: weak laptops get scalar guards only; no pixel decode, voxel sampling, worker, or mesh work.

Middle: clinic workstations avoid wrong quick-action context when creating distance-based CT artifacts.

High: a richer Cornerstone/OHIF adapter can consume the same exact route ids for signed tool-state commands.

Ultra: certified planning modules can replace the command executor while preserving exact route ids and point-count gates as CRM-side policy.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: one bounded quick-action lookup and early point-count checks. Expected frame impact is below measurement noise until browser profiler proof exists.

Bundle impact after build: `ct-planning-tools` is 9,684 bytes / 3,050 gzip, `ct-planning-catalog` is 9,454 bytes / 2,735 gzip, and `ct-planning-geometry` is 5,435 bytes / 2,225 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-code-split-source`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-text-encoding`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, and `npm run typecheck -w @dental/api` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings in large web files/docs. Final process check found no DENTE build/test process left behind.


---
Date: 2026-06-01

## Problem

After exact artifact routing, the CT panel still treated `activeTool` as the selected clinical scenario. That is wrong because several clinical scenarios reuse the same viewer tool: ridge width, bone height, generic ruler, and canal clearance can all pass through distance tooling. The panel could therefore highlight the wrong scenario and show the wrong linked artifact route even though artifact creation itself had already been fixed.

## Solution

Add `activeQuickActionId` to `CtPlanningToolsPanel` and resolve the active scenario by `ctPlanningQuickActions.find((action) => action.id === activeQuickActionId)` before falling back to tool id. `App.tsx` now owns `ctPlanningActiveQuickActionId`, sets it on quick-action activation and implant-library selection, clears it on viewer session restore/reset and non-scenario fallback tool activation, and passes it into both visit CT panel and Settings. `SettingsView.tsx` normalizes and forwards the same id.

## Rejected Alternatives

- Keep selected state as `activeTool === action.tool`: rejected because the shared tool id is not a clinical route.
- Store the quick-action id inside `ImagingViewerSessionState`: rejected for this slice because the shared viewer contract currently persists technical viewer state and implant plan, not UI scenario identity.
- Infer the selected scenario from artifact draft type: rejected because selecting a quick scenario does not have to create an artifact, and switching tools must remain non-mutating.
- Duplicate scenario state inside Settings: rejected because the visit shell already owns viewer state and Settings should reflect the same workbench.

## Scalability Potential

Low: weak laptops get scalar id comparison and one bounded catalog lookup; no image decode, geometry, worker, or mesh work.

Middle: clinic workstations keep the correct CT action card and artifact route visible when the doctor moves between ridge ruler, canal, implant library, OPG, ROI, and guide scenarios.

High: richer viewer adapters can still use shared viewer tools while the CRM preserves clinical scenario identity for guidance and handoff.

Ultra: certified planning modules can replace viewer command execution while the CRM keeps exact clinical route identity for UI, audit, and export policy.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: one extra React state value and bounded quick-action lookup. Expected frame impact is below measurement noise until browser profiler proof exists.

Bundle impact after build: `ct-planning-tools` is 9,757 bytes / 3,077 gzip and `ct-planning-catalog` is 9,454 bytes / 2,735 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-code-split-source`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-text-encoding`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, and `npm run typecheck -w @dental/api` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings in large web files/docs. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

The CT panel now had exact `activeQuickActionId` UI state, but saved viewer sessions and portable DICOM tool-state bundles still persisted only `activeTool`. That made the route exact only until reload. After local/server restore or workbench handoff, the CRM could again infer a clinical scenario from a shared technical tool id and lose the distinction between ridge ruler, canal, implant library, OPG, ROI, and other CT scenarios.

## Solution

Add nullable `activeQuickActionId` with a default to `imagingViewerSessionStateSchema` and `dicomViewerToolStateBundleResponseSchema`. Save it from `currentImagingViewerSessionState`, restore it in `applyImagingViewerSessionState`, include it in `buildDicomViewerToolStateBundle`, and let `CtPlanningToolsPanel` use `activeQuickActionId ?? toolStateBundle?.activeQuickActionId ?? null` before falling back to `activeTool`. Update DICOM folder workup smoke to prove the built workbench bundle preserves the id.

## Rejected Alternatives

- Keep the id as UI-only React state: rejected because reload/server restore loses the exact clinical scenario.
- Infer the scenario from `activeTool`: rejected because `measure_distance` and other tools are shared by multiple clinical routes.
- Store scenario in annotation notes: rejected because notes are visible narrative, not a typed route contract.
- Make the field required without a default: rejected because existing local/server viewer sessions must remain readable.

## Scalability Potential

Low: weak laptops carry one nullable string in session metadata; no image decode, voxel sampling, mesh, or worker path.

Middle: clinic workstations recover the exact CT scenario after local autosave, server session restore, and workbench bundle handoff.

High: richer viewer adapters can hydrate the exact CRM clinical route while still using their own technical tool groups.

Ultra: certified CT planning modules can consume the same scalar route id as an adapter hint without changing heavy DICOM payload policy.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus API_SMOKE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: one nullable string in session and bundle JSON. Expected frame impact is zero-measurement until browser profiler proof exists.

Bundle impact after build: `ct-planning-tools` is 9,807 bytes / 3,086 gzip, `ct-planning-catalog` is 9,454 bytes / 2,735 gzip, and shared schema/vendor is 173,418 bytes / 42,634 gzip.

## Proof

`npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/web`, `npm run typecheck -w @dental/api`, `npm run build -w @dental/shared`, `npm run build -w @dental/api`, `npm run smoke:dicom-folder-workup`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-code-split-source`, `npm run build -w @dental/web`, `npm run smoke:web-text-encoding`, and `npm run smoke:web-bundle-budget` passed. DICOM smoke initially failed against stale `apps/api/dist`; after shared/api build, the runtime route preserved `activeQuickActionId` in the workbench bundle. `git diff --check` reported no whitespace errors, only existing CRLF warnings in large web files/docs. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

`activeQuickActionId` was persisted into viewer sessions and tool-state bundles, but API planning tasks still marked active state by `viewerState?.activeTool === task.crmTool`. That kept the old ambiguity inside the bundle itself: a canal clinical route could carry `activeTool: "measure_distance"` and make the generic distance task look active instead of the nerve-canal task.

## Solution

Add `planningTaskKindForQuickActionId` in `apps/api/src/routes/imaging.ts`. The function maps known CT quick-action ids to the clinical `DicomViewerPlanningTask.kind`. `buildDicomViewerPlanningTasks` now computes `activeQuickActionTaskKind` and uses `task.kind === activeQuickActionTaskKind` when available, falling back to `viewerState?.activeTool === task.crmTool` only for old or generic sessions. `smoke-dicom-folder-workup` now sends `activeTool: "measure_distance"` with `activeQuickActionId: "nerve_canal"` and asserts nerve-canal is active while generic distance is not.

## Rejected Alternatives

- Keep active status based only on `activeTool`: rejected because technical viewer tools are shared across multiple clinical routes.
- Remove the fallback entirely: rejected because old sessions and generic external viewers may only have `activeTool`.
- Move CT quick-action catalog into shared/API: rejected for this slice because the API only needs a stable scalar route map, not all doctor-facing UI text.
- Encode active status from annotation type: rejected because selecting a scenario does not have to create an annotation.

## Scalability Potential

Low: weak laptops receive one correct active task in metadata with no image decode, voxel sampling, or geometry work.

Middle: clinic workstations get correct workbench task guidance when the active viewer tool is reused by multiple CT scenarios.

High: external viewer adapters can restore the exact clinical route from the bundle without reverse-engineering tool labels.

Ultra: certified CT planning modules can consume the active task kind as a deterministic handoff hint while preserving the same metadata-only bundle.

## Hardware Impact

Evidence class: STATIC_SOURCE plus API_SMOKE. No profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: one bounded string-to-kind mapping while building a tool-state bundle. No per-frame cost.

## Proof

`npm run typecheck -w @dental/api`, `npm run smoke:imaging-viewer-usability-source`, `npm run build -w @dental/api`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/web`, `npm run smoke:web-code-split-source`, and `npm run smoke:web-text-encoding` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings in large web files/docs. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

The CT workflow board had only `activePhaseId`, defined as the first unfinished phase. That is correct for blocker reporting, but it made the board ignore the doctor's current exact quick action. Selecting mandibular canal, implant library, ROI, guide, or OPG could still visually focus an unrelated first unfinished phase, forcing the operator to read multiple boards to understand where the selected scenario belongs.

## Solution

Keep `activePhaseId` as the first unfinished blocker and add `selectedPhaseId` as a separate field. `selectedPhaseForQuickActionId` maps the exact CT quick-action id into one of the six workflow phases. `CtPlanningToolsPanel` passes `effectiveActiveQuickActionId` into the workflow planner. `CtPlanningWorkflowPanel` focuses `selectedPhaseId ?? activePhaseId` for the active visual state and `aria-current`, while the summary and next action still use the true first unfinished phase.

## Rejected Alternatives

- Replace `activePhaseId` with the selected route: rejected because it hides the real next blocker.
- Derive phase focus from `activeTool`: rejected because shared viewer tools are reused by several CT clinical scenarios.
- Add a second workflow board for selected scenario: rejected because it increases scan load and UI chunk weight without adding new clinical facts.
- Encode selected phase in visible copy only: rejected because assistive tech and tests need a structural route.

## Scalability Potential

Low: weak laptops get one string-to-phase map and one highlighted card; no image decode, geometry, worker, or mesh cost.

Middle: clinic workstations can see the selected CT scenario in the main route board while still seeing the real next blocker in the summary.

High: richer viewer adapters can feed the same `activeQuickActionId` without changing the workflow phase schema.

Ultra: certified planning modules can replace quick-action execution while the CRM keeps selected route focus and blocker route as separate facts.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: one bounded string map in a memoized workflow builder and one scalar comparison per phase render. Expected frame impact is below measurement noise.

Bundle impact after build: `ct-planning-workflow-plan` is 4,755 bytes / 1,917 gzip, `ct-planning-workflow-panel` is 1,300 bytes / 646 gzip, and `ct-planning-tools` is 9,831 bytes / 3,091 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-code-split-source`, and `npm run smoke:web-text-encoding` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings in large web files/docs. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

The CT panel could restore and highlight `activeQuickActionId`, but the export packet handed to doctor/admin/lab flows did not expose that scenario as a first-class handoff fact. A packet could carry OPG, canal, ROI, implant library, density, axis, or guide context in UI state, while the transfer summary still forced downstream users to infer intent from the shared viewer tool.

## Solution

Add nullable `activeQuickActionId` to `CtPlanningExportPacket`, pass `effectiveActiveQuickActionId` from `CtPlanningToolsPanel` through `buildCtPlanningTaskSnapshot`, and let `buildCtPlanningExportPacket` fall back to `toolStateBundle.activeQuickActionId` for restored bundles. Render a dedicated `ct-planning-export-focus` card in `CtPlanningExportPanel` with compact scenario labels and action text tied to the packet status. Remove unused `CtPlanningExportPacket.detail` to keep the export logic chunk under budget without raising limits.

## Rejected Alternatives

- Derive the handoff scenario from `activeTool`: rejected because shared tools such as distance measurement cover multiple clinical routes.
- Put the current scenario only in visible copy: rejected because doctor/admin/lab handoff needs a typed packet field.
- Store scenario identity inside annotation notes: rejected because notes are narrative, not a route contract.
- Raise bundle limits: rejected because removing a dead packet field created enough headroom.

## Scalability Potential

Low: weak laptops pass one nullable string and render one compact card; no image decode, worker, voxel sampling, or mesh cost.

Middle: clinic workstations preserve the active CT scenario across panel, snapshot, export packet, and handoff UI.

High: external/OHIF/Cornerstone adapters can consume the active scenario as route metadata without changing heavy DICOM payload policy.

Ultra: certified planning modules can replace the rendering backend while the CRM shell still transfers current clinical intent as a scalar packet field.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: one nullable string assignment and one conditional card render. Expected frame impact is below measurement noise.

Bundle impact after build: `ct-planning-export` is 7,756 bytes / 2,811 gzip, `ct-planning-export-panel` is 4,948 bytes / 1,726 gzip, and `ct-planning-tools` is 9,855 bytes / 3,091 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, and `npm run smoke:dicom-folder-workup` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings in large web files/docs. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

The CT export packet and handoff card now carried the active clinical scenario, but the card still reduced that scenario to a label. For scenarios with multiple required artifacts, such as ridge width plus bone height or canal curve plus clearance ruler, the doctor/admin/lab handoff did not show which exact artifact was ready, draft, or blocked.

## Solution

Create `ctPlanningExportScenarioPanel.tsx` as a split panel for the active scenario handoff. `CtPlanningToolsPanel` now maps active quick-action artifact command states into `scenarioArtifacts` and passes them to `CtPlanningExportPanel`, which delegates the focused card to the split panel. The scenario panel renders readiness chips and uses the first unfinished artifact as the next action before falling back to generic packet blockers.

## Rejected Alternatives

- Expand `ctPlanningExportPanel.tsx`: rejected because the panel was already close to its 5 KB budget.
- Recompute artifact state inside the export panel: rejected because `CtPlanningToolsPanel` already owns active command state and creation routing.
- Put artifact details only into `missingArtifacts`: rejected because that list is packet-wide and loses exact current-scenario command identity.
- Claim clinical completion from the scenario id alone: rejected because a selected scenario is not a completed artifact.

## Scalability Potential

Low: weak laptops render a few chips from existing command state; no DICOM pixels, workers, meshes, or extra geometry work.

Middle: clinic workstations can see the current scenario and its exact artifact blockers in the transfer packet.

High: richer viewer adapters can keep publishing typed annotations while the CRM handoff UI displays per-scenario readiness without parsing viewer internals.

Ultra: certified CT modules can replace the rendering backend and still use the same scalar quick-action plus artifact status handoff contract.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: one memoized map over the active scenario's artifact states and a compact chip render. Expected frame impact is below measurement noise.

Bundle impact after build: `ct-planning-export-panel` is 3,989 bytes / 1,428 gzip, `ct-planning-export-scenario-panel` is 1,613 bytes / 894 gzip, and `ct-planning-tools` is 10,003 bytes / 3,132 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-code-split-source`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-text-encoding`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, and `npm run smoke:dicom-folder-workup` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings in large web files/docs. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

The focused CT scenario summary existed as UI behavior, but the portable export packet still exposed only `activeQuickActionId`. Workflow/handoff code could show artifact counts, but an external route looking at the packet had no typed summary for the selected scenario: no title, tone, ready/draft/blocked counts, detail, or next action.

## Solution

Add nullable `activeScenarioSummary` to `CtPlanningExportPacket`. Keep the base export builder conservative by returning `null`; it does not own artifact command state. Add `ctPlanningExportScenarioSummary.ts` as a small logic chunk that builds the summary from the packet and active scenario artifacts. `CtPlanningToolsPanel` attaches that summary after artifact command state is known, then passes the enriched export packet to both workflow and handoff panels.

## Rejected Alternatives

- Keep the summary only in `CtPlanningExportScenarioPanel`: rejected because the packet would still be incomplete for non-React handoff consumers.
- Move artifact command state into `ctPlanningExport.ts`: rejected because export logic is already tight on bundle budget and does not own UI action routing.
- Pass separate packet objects to workflow and handoff: rejected because the active scenario summary would have two truth routes.
- Raise budget limits: rejected because a split summary chunk kept the export builder under the existing limit.

## Scalability Potential

Low: weak laptops get one memoized object spread and a tiny summary object; no DICOM pixel, worker, geometry, or mesh work.

Middle: clinic workstations can show the same selected scenario summary in workflow and handoff without recomputing from UI labels.

High: external viewer adapters can read a typed scenario summary from the packet rather than parsing UI text.

Ultra: certified planning modules can replace rendering while the CRM still transfers selected-route readiness as compact structured metadata.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: one object spread plus the existing active scenario count pass. Expected frame impact is below measurement noise.

Bundle impact after build: `ct-planning-export` is 7,783 bytes / 2,821 gzip, `ct-planning-export-scenario-summary` is 1,423 bytes / 812 gzip, `ct-planning-export-scenario-panel` is 837 bytes / 473 gzip, and `ct-planning-tools` is 10,153 bytes / 3,192 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-code-split-source`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-text-encoding`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, and `npm run smoke:dicom-folder-workup` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings in large web files/docs. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

The export packet now carried a typed active scenario summary, but the dynamic CT workflow board still consumed only `activeQuickActionId` through `selectedPhaseId`. That highlighted the right phase but did not expose the selected scenario's ready/draft/blocked counts, detail, or next action until the operator reached the handoff panel.

## Solution

Add `CtPlanningWorkflowScenarioFocus` and nullable `selectedScenario` to the workflow plan. Build it from `exportPacket.activeScenarioSummary`, not from React chips or a second artifact scan. Render a dedicated `ct-planning-workflow-focus` card between the route summary and phase grid. Keep `activePhaseId` unchanged so the first real blocker remains the workflow truth.

## Rejected Alternatives

- Recalculate scenario artifact status inside workflow: rejected because export packet already owns the selected scenario summary after artifact state is attached.
- Replace `activePhaseId` with selected quick action: rejected because the current scenario is a focus, not necessarily the first unfinished clinical blocker.
- Only show selected scenario in the handoff panel: rejected because the doctor needs the current route before transfer/release.
- Keep mojibake strings to match terminal output: rejected because `smoke:web-text-encoding` correctly blocks broken user-facing source text.

## Scalability Potential

Low: weak laptops render one compact metadata card; no DICOM pixels, workers, geometry recalculation, or mesh work.

Middle: clinic workstations see the same focused CT route in workflow and handoff without double-reading artifact chips.

High: external viewer adapters can keep publishing scenario summaries through the packet while the CRM workflow remains a thin readable shell.

Ultra: certified CT modules can replace rendering/segmentation while CRM still shows selected-route readiness through a typed packet summary.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: one object projection from an existing summary and one conditional React card. Expected frame impact is below measurement noise.

Bundle impact after build: `ct-planning-workflow-plan` is 5,032 bytes / 2,012 gzip, `ct-planning-workflow-panel` is 1,813 bytes / 730 gzip, and `ct-planning-tools` is 10,153 bytes / 3,193 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, and `npm run smoke:dicom-folder-workup` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings in large web files/docs. Final process re-check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

The handoff release gate still made its top-level decision from packet status and clinical facts first. A selected active scenario could be blocked or draft through `activeScenarioSummary`, but the operator might see the scenario blocker below a release card that looked ready or only generally warning.

## Solution

Teach `buildReleaseGate` to inspect `packet.activeScenarioSummary`. If the selected scenario is blocked, the release gate returns blocked with the scenario detail and next action. If the selected scenario is warning and the packet is not already blocked, the release gate stays warning/draft with the scenario action. Packet-level blocked state remains dominant over scenario warning.

## Rejected Alternatives

- Leave the selected scenario only in the focus card: rejected because the top release decision is what controls handoff confidence.
- Let scenario warning override packet blocked: rejected because missing viewer state or clinical blockers must remain hard blockers.
- Move release-gate logic into the export summary chunk: rejected because the release gate is UI policy, while the summary chunk is portable scenario metadata.
- Raise the export panel budget: rejected because the panel remains under 5 KB after the branch-only change.

## Scalability Potential

Low: weak laptops do one nullable summary read and two branches; no DICOM pixels, workers, geometry, or mesh work.

Middle: clinic workstations get a safer one-glance release decision for the current CT route.

High: external viewer adapters can keep feeding scenario summaries while the CRM release gate blocks unsafe handoff consistently.

Ultra: certified CT modules can replace rendering while the CRM still uses compact packet metadata for release governance.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: one object read and two branch checks in render. Expected frame impact is below measurement noise.

Bundle impact after build: `ct-planning-export-panel` is 4,357 bytes / 1,515 gzip, `ct-planning-export-scenario-summary` is 1,423 bytes / 812 gzip, and `ct-planning-tools` is 10,153 bytes / 3,193 gzip.

## Proof

`npm run smoke:web-text-encoding`, `npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-code-split-source`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, and `npm run smoke:dicom-folder-workup` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings in large web files/docs. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

The active CT scenario summary exposed tone, counts, detail and next action, but the exact draft/blocked artifact identities still lived in React artifact chips. A portable handoff packet could say that a canal or guide scenario was blocked without carrying the concrete unfinished artifact list.

## Solution

Add `CtPlanningExportScenarioIssue` plus `draftArtifacts` and `blockedArtifacts` to `CtPlanningExportScenarioSummary`. Build the lists from the same focused scenario artifact state as the counts. Workflow projects these into bounded `issueTitles`; the handoff scenario panel falls back to summary issues when visual artifact props are absent.

## Rejected Alternatives

- Parse `summary.detail`: rejected because it is localized user copy, not a stable contract.
- Keep only counts and next action: rejected because a lab/admin/API handoff needs artifact identity, not only severity.
- Store full artifact UI records in the packet: rejected because status labels are presentation concerns and inflate the portable contract.
- Recompute scenario issues in workflow: rejected because export summary already owns the selected scenario route after artifact state is attached.

## Scalability Potential

Low: weak laptops do one bounded reduce over focused scenario artifacts and render at most four workflow issue titles.

Middle: clinic workstations can show exact route blockers in workflow and handoff without rescanning all CT planning tasks.

High: external viewer adapters can consume typed blocked/draft artifact identities from packet metadata instead of reading UI chips.

Ultra: certified CT modules can replace CRM rendering while keeping focused-route release governance through compact scenario issue metadata.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: one small reduce and bounded chip render. Expected frame impact is below measurement noise.

Bundle impact after build: `ct-planning-export-scenario-summary` is 1,746 bytes / 912 gzip, `ct-planning-export-scenario-panel` is 1,145 bytes / 627 gzip, `ct-planning-workflow-plan` is 5,115 bytes / 2,049 gzip, `ct-planning-workflow-panel` is 2,032 bytes / 772 gzip, and `ct-planning-tools` is 10,153 bytes / 3,194 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, and `npm run smoke:dicom-folder-workup` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings in large web files/docs. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

The active CT scenario summary now carried readiness counts and exact draft/blocked artifacts, but it still did not define who owns the selected route or what deliverable must be produced. Workflow and handoff could name blockers, but a portable consumer could not distinguish doctor-facing OPG/ruler/ROI work from lab-facing surgical guide work without hardcoding UI assumptions.

## Solution

Add `CtPlanningExportScenarioRoute` and `activeScenarioRoutes` to the scenario summary module. Resolve route metadata from the exact `activeQuickActionId`: owner, visible owner label, expected deliverable and confirmation step. Project the route into workflow focus and export scenario card.

## Rejected Alternatives

- Derive route owner from workflow phase: rejected because measurement and handoff phases contain multiple different clinical routes.
- Derive route from viewer tool id: rejected because multiple scenarios share distance/volume-like tools and prior work already separated `activeQuickActionId` from tool id.
- Store only a localized route sentence: rejected because owner and deliverable need to be structured for portable consumers.
- Move this into the heavy export builder: rejected because active scenario artifacts are attached after UI state is known; the split summary chunk is the correct owner.

## Scalability Potential

Low: weak laptops do one record lookup and render one short route line.

Middle: clinic workstations can route CT scenario work to doctor/admin/lab without rescanning the whole planning board.

High: external viewer adapters can consume owner/deliverable/confirmation metadata directly from the packet.

Ultra: certified CT modules can replace rendering while CRM still governs route-level handoff through compact metadata.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: one map lookup per enriched packet and two short text renders. Expected frame impact is below measurement noise.

Bundle impact after build: `ct-planning-export-scenario-summary` is 3,656 bytes / 1,439 gzip, `ct-planning-export-scenario-panel` is 1,248 bytes / 674 gzip, `ct-planning-workflow-plan` is 5,208 bytes / 2,087 gzip, `ct-planning-workflow-panel` is 2,130 bytes / 794 gzip, and `ct-planning-tools` is 10,153 bytes / 3,195 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, and `npm run smoke:dicom-folder-workup` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings in large web files/docs. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

The active CT scenario summary identified route owner, deliverable and blockers, but it did not carry the viewer context needed to restore the selected scenario: projection, visible view, window preset, slab thickness, and whether a full volume is required. Portable handoff consumers still had to infer those facts from UI text or from a separate catalog.

## Solution

Add `CtPlanningExportScenarioViewerPreset` and `activeScenarioViewerPresets` to the scenario summary module. Resolve the viewer preset from the exact `activeQuickActionId` and attach it to `activeScenarioSummary`. Workflow and handoff render a compact viewer line. After the first bundle-budget failure, compress repeated preset object literals through `viewerPreset(...)` instead of raising the budget.

## Rejected Alternatives

- Import `ctPlanningCatalog` into the summary chunk: rejected because it couples portable summary metadata to the larger catalog and can inflate chunks.
- Store only display text: rejected because projection/window/slab/requiresVolume need to remain structured for adapters.
- Derive preset from shared viewer tool id: rejected because several clinical scenarios share generic tools and prior work already separated quick-action identity.
- Raise the 5 KB scenario summary budget: rejected because the final data fits under the existing budget after removing repeated object keys.

## Scalability Potential

Low: weak laptops do one preset lookup and render a short text line; no pixel work is added.

Middle: clinic workstations can restore the intended OPG, oblique, 3D volume, density or library context from packet metadata.

High: external viewer adapters can consume projection/window/slab/requiresVolume without loading CRM UI catalogs.

Ultra: certified CT modules can replace rendering while CRM still transfers exact viewer setup metadata for the selected route.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: one map lookup per enriched packet and short text render. Expected frame impact is below measurement noise.

Bundle impact after build: `ct-planning-export-scenario-summary` is 4,602 bytes / 1,734 gzip, `ct-planning-export-scenario-panel` is 1,408 bytes / 735 gzip, `ct-planning-workflow-plan` is 5,298 bytes / 2,121 gzip, `ct-planning-workflow-panel` is 2,187 bytes / 807 gzip, and `ct-planning-tools` is 10,153 bytes / 3,192 gzip. Initial uncompressed preset map failed at 5,178 bytes; final version passes the 5,000 byte budget.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, and `npm run smoke:dicom-folder-workup` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings in large web files/docs. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

The active CT scenario summary carried structured viewer preset fields, but adapter consumers still needed to decide their own command order to restore the selected scenario. That is tolerable inside the CRM, but weaker for a universal handoff path to OHIF, Cornerstone or a local viewer bridge.

## Solution

Add ordered `restoreCommands` to `CtPlanningExportScenarioViewerPreset`: `load_volume` or `metadata_only`, then `projection:*`, `window:*`, and `slab:*`. Expose the same command string through `data-viewer-restore` on workflow and handoff focus cards. Keep it metadata-only; no visible command UI was added.

## Rejected Alternatives

- Use visible view/window labels as commands: rejected because labels are localized operator copy.
- Let each external adapter infer command order: rejected because one route should own one proof artifact.
- Store a large command object array: rejected because the scenario summary chunk is close to the 5 KB budget and compact string tokens are enough.
- Render commands to the doctor: rejected because the doctor needs the viewer context, not adapter syntax.

## Scalability Potential

Low: weak laptops build four short strings per active preset and join them only for the focused card.

Middle: clinic workstations can pass a stable restore string to a local viewer bridge without loading a full catalog.

High: external OHIF/Cornerstone adapters can map command tokens to their own APIs while CRM keeps route ownership.

Ultra: certified CT modules can consume the same compact command sequence while replacing the rendering engine entirely.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: four short strings and one join for the focused card. Expected frame impact is below measurement noise.

Bundle impact after build: `ct-planning-export-scenario-summary` is 4,696 bytes / 1,792 gzip, `ct-planning-export-scenario-panel` is 1,465 bytes / 762 gzip, `ct-planning-workflow-plan` is 5,345 bytes / 2,139 gzip, `ct-planning-workflow-panel` is 2,260 bytes / 837 gzip, and `ct-planning-tools` is 10,153 bytes / 3,194 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, and `npm run smoke:dicom-folder-workup` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings in large web files/docs. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

The active CT scenario summary owned both clinical scenario metadata and the machine restore command syntax. That put adapter details inside a chunk already constrained to 5 KB and let UI code serialize command arrays directly with `join("|")`.

## Solution

Create `ctPlanningViewerRestore.ts` as the single adapter contract module. It owns `CtPlanningViewerRestoreCommand`, the ordered restore builder (`load_volume`/`metadata_only`, projection, window, slab), and `serializeCtPlanningViewerRestoreCommands`. Workflow and handoff panels now call the serializer; scenario summary only asks the module to build commands. `CtPlanningWorkflowScenarioFocus` now carries `CtPlanningViewerRestoreCommand[]` instead of `string[]`.

## Rejected Alternatives

- Keep command construction in `ctPlanningExportScenarioSummary.ts`: rejected because the summary chunk was already close to its budget and adapter syntax is not scenario scoring logic.
- Keep `.join("|")` in panels: rejected because serialization format should have one owner.
- Widen serializer input to `readonly string[]`: rejected after TypeScript caught the workflow type gap; arbitrary strings would weaken the command contract.
- Raise the scenario summary budget: rejected because the adapter contract fits in a 200 byte chunk.

## Scalability Potential

Low: weak laptops load a 200 byte restore helper when the focused CT handoff path needs adapter metadata. No pixel work is added.

Middle: clinic workstations can pass stable restore strings to a local viewer bridge without loading the whole CT scenario catalog.

High: OHIF/Cornerstone integrations can map typed tokens to their APIs while CRM preserves route ownership and visible operator copy separately.

Ultra: certified CT modules can consume the same compact command sequence while replacing the CRM shell renderer entirely.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: one four-token array and one join for the focused scenario. Expected frame impact is below measurement noise.

Bundle impact after build: `ct-planning-viewer-restore` is 200 bytes / 166 gzip, `ct-planning-export-scenario-summary` is 4,738 bytes / 1,804 gzip, `ct-planning-export-scenario-panel` is 1,519 bytes / 780 gzip, `ct-planning-workflow-panel` is 2,314 bytes / 856 gzip, and `ct-planning-tools` is 10,153 bytes / 3,192 gzip.

## Proof

`npm run typecheck -w @dental/web` initially failed because workflow still typed restore commands as `string[]`; after narrowing to `CtPlanningViewerRestoreCommand[]`, it passed. `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run smoke:dicom-folder-workup`, `npm run build -w @dental/web`, and `npm run smoke:web-bundle-budget` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

Restore commands were typed, but the handoff still did not state whether those commands could actually restore a volume. A volume route and a metadata-only implant-library route both exposed command strings, while the operator had to infer readiness from packet blockers.

## Solution

Add `CtPlanningExportPacket.volumeReady` from `volumeBlockedTasks === 0`. Add `CtPlanningViewerBridgeManifest` and `buildCtPlanningViewerBridgeManifest` to the viewer restore module. The manifest reports `ready`, `metadata_only`, or `blocked`, keeps the serialized command string, counts commands, and names the blocker when a volume scenario lacks a ready CT volume. Workflow and handoff cards now expose `data-viewer-bridge-status`; the handoff card shows `ct-planning-viewer-bridge` as visible readiness evidence.

## Rejected Alternatives

- Parse `missingArtifacts` in the panel: rejected because adapter decisions must not depend on localized text.
- Treat metadata-only and volume restore as the same state: rejected because implant library can transfer without volume pixels, but OPG/oblique/3D scenarios cannot.
- Put the manifest in the visual panel: rejected because command ownership already lives in `ctPlanningViewerRestore.ts`.
- Add a fake volume renderer to satisfy readiness: rejected because CRM remains metadata/tool-state only for this slice.

## Scalability Potential

Low: weak laptops get a one-line bridge status and a 960 byte restore helper chunk; no CT pixel decode, no volume allocation, no canvas work.

Middle: clinic workstations can see whether the selected handoff will restore volume or only metadata before transfer.

High: OHIF/Cornerstone adapters can consume `commandString` and `data-viewer-bridge-status` without loading CRM route UI logic.

Ultra: certified viewer modules can replace rendering while still consuming the same manifest contract and status gate.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: one boolean, one short manifest object, one serializer call for the focused scenario. Expected frame impact is below measurement noise.

Bundle impact after build: `ct-planning-viewer-restore` is 960 bytes / 459 gzip, `ct-planning-export-scenario-summary` is 4,738 bytes / 1,805 gzip, `ct-planning-export-scenario-panel` is 1,893 bytes / 891 gzip, `ct-planning-workflow-plan` is 5,673 bytes / 2,265 gzip, `ct-planning-workflow-panel` is 2,443 bytes / 884 gzip, and `ct-planning-tools` is 10,153 bytes / 3,191 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run smoke:dicom-folder-workup`, `npm run build -w @dental/web`, and `npm run smoke:web-bundle-budget` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

The bridge manifest produced a serialized restore string, but there was no runtime parser for adapters consuming `data-viewer-restore`. A copied, stale, truncated, or hand-built command string could reach a viewer bridge without local validation.

## Solution

Add `CtPlanningViewerRestoreParseResult` and `parseCtPlanningViewerRestoreCommandString`. The parser requires exactly four tokens, validates `load_volume`/`metadata_only`, validates supported MPR projection and window preset values, and rejects non-positive slab values. `buildCtPlanningViewerBridgeManifest` now round-trips the serialized string through the parser and exposes `restoreValid` and `parseError`. Workflow and handoff cards expose `data-viewer-restore-valid`.

## Rejected Alternatives

- Trust TypeScript command arrays only: rejected because adapter ingress is a runtime string from DOM/data attributes.
- Let each adapter implement its own parser: rejected because one route should own one proof artifact and one error vocabulary.
- Accept unknown projection/window values and pass them through: rejected because unsupported viewer states must fail before they mutate a clinical viewport.
- Add full viewer launch execution in CRM: rejected because this slice is a contract gate, not a CT renderer.

## Scalability Potential

Low: weak laptops pay four string-token checks for the focused scenario, no pixel decode, no WebGL, no volume allocation.

Middle: clinic workstations can validate handoff strings before local viewer bridge restore.

High: OHIF/Cornerstone adapters can consume the parser and reject unsupported command strings before mutating display sets.

Ultra: certified viewer modules can reuse the same parser while replacing the rendering engine entirely.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: four token checks, Set membership for projection/window, one number parse. Expected frame impact is below measurement noise.

Bundle impact after build: `ct-planning-viewer-restore` is 2,569 bytes / 993 gzip, `ct-planning-export-scenario-summary` is 4,738 bytes / 1,803 gzip, `ct-planning-export-scenario-panel` is 1,951 bytes / 911 gzip, `ct-planning-workflow-plan` is 5,707 bytes / 2,272 gzip, `ct-planning-workflow-panel` is 2,524 bytes / 902 gzip, and `ct-planning-tools` is 10,153 bytes / 3,195 gzip.

## Proof

`npm run typecheck -w @dental/web` initially failed on possibly undefined token entries; after explicit fallback strings, it passed. `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run smoke:dicom-folder-workup`, `npm run build -w @dental/web`, and `npm run smoke:web-bundle-budget` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

The restore parser could validate a serialized command string, but adapters still had to translate parsed values into executable restore steps. That left command ordering and step naming to each bridge implementation.

## Solution

Add `CtPlanningViewerBridgeApplyPlan` and `buildCtPlanningViewerBridgeApplyPlan`. A valid restore string becomes four ordered adapter steps: `volume-mode`, `projection`, `window`, and `slab`. `CtPlanningViewerBridgeManifest` now includes `applyStepCount`; workflow and handoff cards expose it through `data-viewer-apply-steps`.

## Rejected Alternatives

- Let OHIF, Cornerstone, and local bridges each define their own step order: rejected because one restore route should have one owner and one proof artifact.
- Use only `commandCount`: rejected because token count does not prove adapter step normalization.
- Execute viewer restore inside CRM: rejected because this slice is a bridge contract, not a renderer launch path.
- Store large adapter objects in the handoff packet: rejected because four compact typed steps are enough for current restore semantics.

## Scalability Potential

Low: weak laptops build four small step objects for the focused scenario; no pixel decode, no WebGL, no volume allocation.

Middle: clinic workstations can hand a normalized apply plan to a local viewer bridge.

High: OHIF/Cornerstone adapters can map normalized targets to display-set APIs without duplicating parser/order code.

Ultra: certified viewer modules can consume the same four-step plan while replacing the rendering engine entirely.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: one parser pass and four small object literals for focused scenario metadata. Expected frame impact is below measurement noise.

Bundle impact after build: `ct-planning-viewer-restore` is 3,285 bytes / 1,176 gzip, `ct-planning-export-scenario-summary` is 4,738 bytes / 1,803 gzip, `ct-planning-export-scenario-panel` is 1,994 bytes / 930 gzip, `ct-planning-workflow-plan` is 5,745 bytes / 2,287 gzip, `ct-planning-workflow-panel` is 2,590 bytes / 922 gzip, and `ct-planning-tools` is 10,153 bytes / 3,191 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run smoke:dicom-folder-workup`, `npm run build -w @dental/web`, and `npm run smoke:web-bundle-budget` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

The CT viewer bridge could validate a restore string and produce ordered adapter steps, but the UI handoff still lacked a single launch payload that stated adapter target and pixel policy. External bridge code would have to infer whether the selected scenario was metadata-only or an external-volume restore.

## Solution

Add `CtPlanningViewerBridgeLaunchPayload` and `buildCtPlanningViewerBridgeLaunchPayload`. The payload includes adapter target, bridge status, pixel policy, serialized command string, normalized apply steps, and blocker. Workflow and active handoff cards expose `data-viewer-adapter-target` and `data-viewer-pixel-policy`. Source smoke and CT docs now lock this boundary.

## Rejected Alternatives

- Put pixel policy only in visible copy: rejected because launch code must consume a machine-readable contract.
- Let each adapter derive target/pixel policy from bridge status: rejected because status and pixel route are different facts.
- Start a browser CT renderer in CRM: rejected because this slice is a launch contract; real CT pixels remain in OHIF/Cornerstone/local viewer paths.
- Add a broad adapter object with vendor-specific fields: rejected because the current route only needs normalized target/status/policy/commands/steps/blocker data.

## Scalability Potential

Low: weak laptops only build a small payload for the focused scenario; no DICOM pixel decode, no WebGL allocation, no volume upload.

Middle: clinic workstations can hand `local_bridge` payloads to a local viewer helper without parsing Russian UI labels.

High: OHIF/Cornerstone adapters can map the same payload to display-set restore APIs.

Ultra: certified viewer modules can replace the adapter target while preserving the same CRM-side metadata boundary.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: one parser/apply-plan pass and one small payload object for the selected scenario. Expected frame impact is below measurement noise.

Bundle impact after build: `ct-planning-viewer-restore` is 3,612 bytes / 1,291 gzip, `ct-planning-export-scenario-panel` is 2,123 bytes / 986 gzip, `ct-planning-workflow-plan` is 5,861 bytes / 2,352 gzip, `ct-planning-workflow-panel` is 2,722 bytes / 958 gzip, and `ct-planning-tools` is 10,153 bytes / 3,191 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run smoke:dicom-folder-workup`, `npm run build -w @dental/web`, and `npm run smoke:web-bundle-budget` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

The CT viewer bridge launch payload carried adapter target and pixel policy, but there was no final launch gate proving that the payload had all required adapter targets. A future adapter could treat a valid payload as launchable even if normalized steps were incomplete.

## Solution

Add `CtPlanningViewerBridgeLaunchGate` and `buildCtPlanningViewerBridgeLaunchGate`. Metadata-only handoffs require projection, window, and slab targets. Volume restores require volume plus those metadata targets. The gate returns `metadata_ready`, `volume_ready`, or `blocked`, exposes `canLaunch`, missing targets, and blocker. Workflow and active handoff cards expose `data-viewer-launch-gate` and `data-viewer-can-launch`.

## Rejected Alternatives

- Use bridge status as the launch gate: rejected because bridge status does not prove normalized apply target coverage.
- Let each adapter check targets independently: rejected because one handoff fact should have one owner and one proof artifact.
- Render a visible-only warning: rejected because launch code must use machine-readable metadata.
- Start CT pixel rendering inside CRM to prove launch: rejected because real volume pixels remain in OHIF/Cornerstone/local viewer paths.

## Scalability Potential

Low: weak laptops run one Set membership pass over four apply steps; no DICOM pixel decode, no WebGL allocation, no volume upload.

Middle: clinic workstations can block local bridge launch before opening a wrong or incomplete viewer state.

High: OHIF/Cornerstone adapters can trust `data-viewer-can-launch` and consume the same normalized target list.

Ultra: certified viewer modules can keep their own renderer while still using the CRM-side gate as a handoff preflight.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: one Set over four steps and one short array filter for the selected scenario. Expected frame impact is below measurement noise.

Bundle impact after build: `ct-planning-viewer-restore` is 4,060 bytes / 1,450 gzip, `ct-planning-export-scenario-panel` is 2,229 bytes / 1,029 gzip, `ct-planning-workflow-plan` is 5,935 bytes / 2,384 gzip, `ct-planning-workflow-panel` is 2,865 bytes / 994 gzip, and `ct-planning-tools` is 10,153 bytes / 3,191 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run smoke:dicom-folder-workup`, `npm run build -w @dental/web`, and `npm run smoke:web-bundle-budget` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

The CT viewer bridge had a payload and launch gate, but no single portable audit object. Future external adapters could read multiple DOM attributes and lose the proof trail for target, gate status, pixel policy, missing targets, and exact restore command string.

## Solution

Add `CtPlanningViewerBridgeAuditRecord` and `buildCtPlanningViewerBridgeAuditRecord`. The record is versioned as `dental-crm-ct-viewer-bridge-audit-v1` and stores target, gate status, launch decision, pixel policy, apply-step count, missing-target count, blocker, and restore command string. Workflow and active handoff cards expose audit version and missing-target count as machine-readable metadata.

## Rejected Alternatives

- Depend only on DOM attributes: rejected because adapters need a compact portable audit object, not a scattered field list.
- Add visible audit copy: rejected because this is machine proof, not operator text.
- Hash the restore command only: rejected because the current restore command string is small and contains no CT pixels or PHI.
- Move audit into a backend endpoint now: rejected because this slice is a frontend bridge contract; server persistence can consume the same type later.

## Scalability Potential

Low: weak laptops build one small object for the focused scenario; no DICOM pixel decode, no WebGL allocation, no volume upload.

Middle: clinic workstations can hand a stable audit record to a local bridge or logs.

High: OHIF/Cornerstone adapters can write the audit record beside launch attempts for support and safety review.

Ultra: certified viewer modules can keep full renderer telemetry while using this CRM record as the handoff boundary proof.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: one object literal and two short metadata fields for selected scenario. Expected frame impact is below measurement noise.

Bundle impact after build: `ct-planning-viewer-restore` is 4,405 bytes / 1,556 gzip, `ct-planning-export-scenario-panel` is 2,349 bytes / 1,080 gzip, `ct-planning-workflow-plan` is 6,041 bytes / 2,433 gzip, `ct-planning-workflow-panel` is 3,005 bytes / 1,026 gzip, and `ct-planning-tools` is 10,153 bytes / 3,193 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run smoke:dicom-folder-workup`, `npm run build -w @dental/web`, and `npm run smoke:web-bundle-budget` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

The viewer restore adapter chunk had grown to 4,405 bytes after adding audit proof, leaving little headroom under the 5 KB budget for parser/gate work. Audit proof is useful but not part of the core restore parser/apply/gate path.

## Solution

Move `CtPlanningViewerBridgeAuditRecord` and `buildCtPlanningViewerBridgeAuditRecord` into a new `ctPlanningViewerBridgeAudit.ts` module. Add explicit Vite manual chunking and bundle-budget coverage for `ct-planning-viewer-bridge-audit`. Keep workflow and handoff behavior unchanged by importing the audit builder from the new module.

## Rejected Alternatives

- Raise the `ct-planning-viewer-restore` limit: rejected because the point is to protect the adapter contract boundary, not normalize growth.
- Leave audit in restore because it is small: rejected because this chunk is now the hot bridge contract for parser/apply/payload/gate work and needs headroom.
- Rely on Rollup default chunking: rejected because CT planning already uses explicit chunks as a source-level performance contract.
- Remove audit proof entirely: rejected because adapters need a compact handoff proof object.

## Scalability Potential

Low: weak laptops load smaller restore/parser/gate code when audit proof is not needed; audit is a 354-byte separate chunk.

Middle: clinic workstations can still use audit proof without inflating the restore module.

High: OHIF/Cornerstone adapters can import audit explicitly when logging launches.

Ultra: certified viewer modules can keep audit proof isolated from heavier renderer integration modules.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE plus BUNDLE_BUDGET. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: no measured frame gain. Concrete bundle result: restore chunk reduced from 4,405 bytes / 1,556 gzip to 4,060 bytes / 1,450 gzip, with audit isolated at 354 bytes / 219 gzip.

Bundle impact after build: `ct-planning-viewer-restore` is 4,060 bytes / 1,450 gzip, `ct-planning-viewer-bridge-audit` is 354 bytes / 219 gzip, `ct-planning-export-scenario-panel` is 2,403 bytes / 1,092 gzip, `ct-planning-workflow-plan` is 6,100 bytes / 2,456 gzip, `ct-planning-workflow-panel` is 3,005 bytes / 1,026 gzip, and `ct-planning-tools` is 10,153 bytes / 3,192 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run smoke:dicom-folder-workup`, `npm run build -w @dental/web`, and `npm run smoke:web-bundle-budget` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

The CT restore adapter chunk still owned launch payload and launch gate policy after the audit split. That kept parser/apply/manifest code tied to future adapter launch growth and left the restore contract at 4,060 bytes.

## Solution

Move `CtPlanningViewerBridgeLaunchPayload`, `CtPlanningViewerBridgeLaunchGate`, `buildCtPlanningViewerBridgeLaunchPayload`, and `buildCtPlanningViewerBridgeLaunchGate` into `ctPlanningViewerBridgeLaunch.ts`. Add an explicit Vite manual chunk and bundle-budget rule for `ct-planning-viewer-bridge-launch`. Keep workflow and handoff behavior unchanged by importing launch/gate builders from the new module.

## Rejected Alternatives

- Raise the restore chunk limit: rejected because the restore parser/apply/manifest path should stay small and measurable.
- Keep launch policy in restore because it was still under 5 KB: rejected because launch policy will grow with OHIF/Cornerstone/local bridge adapters.
- Depend on default Rollup chunking: rejected because CT planning already uses explicit chunk names as source-level performance contracts.
- Remove the launch gate: rejected because metadata-only and volume-ready routes need a deterministic launch proof.

## Scalability Potential

Low: weak laptops can parse/validate restore commands without loading launch policy when only checking the CT handoff contract.

Middle: clinic workstations still load the launch chunk when opening the focused bridge card.

High: OHIF/Cornerstone integration can import launch payload/gate explicitly without changing restore parser ownership.

Ultra: certified viewer modules can expand launch policies, pixel routing, and telemetry while the restore/parser/manifest chunk remains stable.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE plus BUNDLE_BUDGET. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: no measured frame gain. Concrete bundle result: restore chunk reduced from 4,060 bytes / 1,450 gzip to 3,292 bytes / 1,180 gzip. Launch policy is isolated at 851 bytes / 471 gzip. Audit remains isolated at 354 bytes / 219 gzip.

Bundle impact after build: `ct-planning-viewer-restore` is 3,292 bytes / 1,180 gzip, `ct-planning-viewer-bridge-launch` is 851 bytes / 471 gzip, `ct-planning-viewer-bridge-audit` is 354 bytes / 219 gzip, `ct-planning-export-scenario-panel` is 2,468 bytes / 1,109 gzip, `ct-planning-workflow-plan` is 6,155 bytes / 2,473 gzip, `ct-planning-workflow-panel` is 3,005 bytes / 1,026 gzip, and `ct-planning-tools` is 10,153 bytes / 3,190 gzip.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run smoke:dicom-folder-workup`, `npm run build -w @dental/web`, and `npm run smoke:web-bundle-budget` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

The CT viewer bridge had manifest, launch payload, gate, and audit records, but workflow and handoff UI each assembled those pieces locally. That created two owners for the same external viewer handoff contract. Future OHIF/Cornerstone/local bridge work would risk drift between UI metadata and workflow metadata.

## Solution

Add `ctPlanningViewerBridgeHandoff.ts`. It composes `CtPlanningViewerBridgeManifest`, `CtPlanningViewerBridgeLaunchPayload`, `CtPlanningViewerBridgeLaunchGate`, `CtPlanningViewerBridgeAuditRecord`, and a stable `CtPlanningViewerBridgeEnvelope` with serialized JSON. Rewire workflow and scenario handoff UI to consume `buildCtPlanningViewerBridgeHandoff`. Expose `data-viewer-envelope-version` and `data-viewer-bridge-envelope` for external adapters.

## Rejected Alternatives

- Keep duplicated assembly in workflow and panel: rejected because one bridge fact needs one owner.
- Expose only more individual DOM fields: rejected because adapters need one stable payload, while existing fields remain useful for smoke/UI checks.
- Put the envelope in `ctPlanningViewerRestore.ts`: rejected because restore must stay parser/apply/manifest only.
- Put the envelope in `ctPlanningViewerBridgeLaunch.ts`: rejected because launch should not own audit composition.
- Encode pixels or DICOM paths in the envelope: rejected because CRM handoff remains metadata/tool-state only and must not move CT pixels through the shell.

## Scalability Potential

Low: weak laptops still avoid CT pixel work; envelope assembly is one selected-scenario JSON stringify and stays under a 1 KB chunk.

Middle: clinic workstations can hand one payload to a local bridge without scraping multiple fields.

High: OHIF/Cornerstone adapters can validate envelope version, launch gate, missing targets, and apply steps from one object.

Ultra: certified viewer modules can expand adapter-specific launch code while this CRM envelope remains the stable no-pixel boundary.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE plus BUNDLE_BUDGET. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: one object composition and one `JSON.stringify` for selected scenario only. Expected frame impact is below measurement noise.

Bundle impact after build: `ct-planning-viewer-bridge-handoff` is 939 bytes / 476 gzip, `ct-planning-viewer-restore` is 3,292 bytes / 1,180 gzip, `ct-planning-viewer-bridge-launch` is 851 bytes / 471 gzip, `ct-planning-viewer-bridge-audit` is 354 bytes / 219 gzip, `ct-planning-export-scenario-panel` is 2,548 bytes / 1,096 gzip, `ct-planning-workflow-plan` is 6,137 bytes / 2,426 gzip, `ct-planning-workflow-panel` is 3,147 bytes / 1,053 gzip, and `ct-planning-tools` is 10,153 bytes / 3,188 gzip. Aggregate JS gzip is 429,443 bytes against a 430,000-byte budget; next work must reduce or split before adding bulk.

## Proof

Initial `npm run typecheck -w @dental/web` failed on `exactOptionalPropertyTypes` for `target: undefined`; fixed by only spreading `target` when present. Then `npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run smoke:dicom-folder-workup`, `npm run build -w @dental/web`, and `npm run smoke:web-bundle-budget` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

After the CT viewer bridge envelope, aggregate JS gzip was 429,443 / 430,000. The next CT feature slice had almost no budget headroom. Workflow and handoff UI also still serialized restore commands directly even though the handoff manifest already owned the normalized command string.

## Solution

Reuse `handoff.manifest.commandString` as the legacy `data-viewer-restore` value. Replace `viewerRestoreCommands` in the selected scenario with `viewerRestoreCommandString`, remove restore serializer imports from workflow/panel chunks, and keep `ctPlanningViewerRestore.ts` as the single serializer owner. Compress repeated CT planning CSS selector lists with `:is(...)` while preserving class names and markup.

## Rejected Alternatives

- Raise the aggregate JS or CSS budget: rejected because the current pressure is evidence that new CT work must recover or split code first.
- Remove the bridge envelope: rejected because external viewer adapters need the no-pixel handoff contract.
- Remove legacy `data-viewer-restore`: rejected because smoke tests and existing adapter hooks still use the legacy metadata path.
- Broad CSS rewrite: rejected because it would add risk and obscure the focused budget recovery.

## Scalability Potential

Low: weak laptops download and parse fewer CSS bytes and no longer carry duplicate restore serializer calls in UI chunks.

Middle: clinic workstations keep the same CT handoff metadata while the restore command has one owner.

High: OHIF/Cornerstone/local adapters can continue reading legacy restore metadata and the newer envelope without duplicated UI construction logic.

Ultra: future adapter and implant-planning code still needs more budget recovery or separate chunks before expansion; aggregate JS has only 583 gzip bytes of headroom.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE plus BUNDLE_BUDGET. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: no measured frame gain. Concrete bundle evidence: aggregate JS gzip moved from 429,443 to 429,417, recovering 26 gzip bytes. Main CSS moved from 185,796 / 28,034 gzip to 185,537 / 27,899 gzip, recovering 259 raw bytes and 135 gzip bytes. Total gzip moved from 457,477 to 457,316, recovering 161 gzip bytes.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run smoke:dicom-folder-workup`, `npm run build -w @dental/web`, and `npm run smoke:web-bundle-budget` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

Workflow and export scenario panels both owned the same `data-viewer-*` wiring for the CT viewer bridge. The handoff envelope already centralized manifest, launch, gate, and audit, but the DOM contract still had two owners and duplicated machine-readable attribute strings across UI chunks. The aggregate JS gzip budget remained tight at 429,417 / 430,000.

## Solution

Add `ctPlanningViewerBridgeAttributes.ts` with a typed `CtPlanningViewerBridgeDataAttributes` contract and `buildCtPlanningViewerBridgeDataAttributes(handoff)`. Workflow selected scenarios now carry `viewerBridgeAttributes`; workflow and export scenario panels spread the shared object. Vite routes the attributes helper into the existing `ct-planning-viewer-bridge-handoff` chunk instead of emitting a separate microchunk.

## Rejected Alternatives

- Keep attributes duplicated in panels: rejected because the same machine-readable bridge fact would keep two owners.
- Store all bridge scalars on the workflow scenario type: rejected because it repeats the handoff envelope and bloats workflow state.
- Emit a separate `ct-planning-viewer-bridge-attributes` chunk: rejected after build evidence showed it worked but cost 304 gzip bytes as its own asset; co-locating in handoff reduced aggregate size.
- Raise the aggregate JS budget: rejected because the bundle pressure is real and must be paid down before larger CT features.

## Scalability Potential

Low: weak clinic laptops download fewer duplicated UI strings and avoid one extra microchunk request.

Middle: normal workstations keep the same legacy `data-viewer-*` hooks for local adapters without UI drift.

High: OHIF/Cornerstone bridge work can extend one attributes builder instead of editing multiple panels.

Ultra: certified/external viewer adapter metadata can grow in the handoff boundary while CT panel chunks stay focused on rendering clinical state.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE plus BUNDLE_BUDGET. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: no measured frame gain. Concrete bundle evidence: aggregate JS gzip moved from 429,417 to 429,084, recovering 333 gzip bytes. Total gzip moved from 457,316 to 456,983, recovering 333 gzip bytes. The handoff chunk grew to 1,620 bytes / 655 gzip while workflow/export panel chunks shrank and no separate attributes chunk is emitted.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run smoke:dicom-folder-workup`, `npm run build -w @dental/web`, and `npm run smoke:web-bundle-budget` passed.

Final hygiene: `git diff --check` reported no whitespace errors, only existing CRLF warnings. Process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

`activeScenarioSummary` carried route, viewer preset, and artifact state, but workflow and handoff panels still rebuilt bridge metadata outside the summary boundary. That left multiple owners for the same selected CT scenario bridge. The first implementation also pushed `ct-planning-export-scenario-summary` over its 5,000-byte hard limit at 5,027 bytes.

## Solution

`buildCtPlanningExportScenarioSummary` now builds the viewer bridge handoff once from the selected viewer preset and packet volume readiness, then stores compact bridge metadata on `summary.bridge`. Workflow and handoff panels only read `summary.bridge.label` and spread `summary.bridge.attrs`. Visible UI shows the doctor-readable bridge label; technical adapter blocker details remain in the serialized bridge envelope metadata.

## Rejected Alternatives

- Keep handoff builders in both workflow and export scenario panels: rejected because the selected scenario would still have multiple bridge owners.
- Surface raw adapter blockers in visible scenario copy: rejected because clinicians need route readiness, while adapters can inspect serialized envelope metadata.
- Raise the summary chunk budget: rejected because the chunk was only 27 bytes over and could be recovered with focused source changes.
- Move large route/viewer tables into a new chunk: rejected for this slice because it would create request churn and was not needed to pass the hard limit.

## Scalability Potential

Low: weak clinic laptops keep the selected-scenario bridge contract in one summary path and avoid duplicate panel assembly code.

Middle: standard workstations get the same legacy `data-viewer-*` metadata and the same serialized bridge envelope from one summary fact.

High: OHIF/Cornerstone/local viewer adapters can consume the same active scenario envelope without deriving state from visible labels.

Ultra: future CT scenario launch policy can grow behind the bridge envelope while workflow and handoff cards remain render-only consumers.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE plus BUNDLE_BUDGET. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: no measured frame gain. Concrete bundle evidence: first attempt failed at 5,027 bytes for `ct-planning-export-scenario-summary`; final proof is 4,959 bytes / 1,878 gzip. Aggregate JS gzip is 428,874 / 430,000 and total gzip is 456,773 / 480,000.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, and `npm run typecheck -w @dental/api` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-02

## Problem

The CT planning UI still leaked implementation-flavored clinical copy in the artifact/scenario/ROI lane. The artifact board said `????????? ?????`, draft guidance told operators to draw in the viewer, card status could show `?????????????`, and area/volume cards exposed raw `ROI` titles across catalog, measurement, state, validation, export, geometry warnings, and artifact commands.

## Solution

Keep all typed contracts stable (`CtPlanningArtifact*`, `ready/draft/blocked`, `area_roi`, `volume_roi`, DICOM tool names) and change only visible Russian copy. The UI now says `???????? ?????`, `????? ????????`, `??????? ????????`, `?????? ???????`, and `?????? ??????`. Source-smoke guards now require these visible strings and forbid the old artifact/viewer/blocked/ROI copy in the exact CT source files that render it.

## Rejected Alternatives

- Rename internal ROI/task/status ids: rejected because those ids are part of shared viewer/tool-state/export contracts and would create integration risk without improving visible UX.
- Leave `ROI` because clinicians may know the acronym: rejected because the product target is universal and accessible; the visible action is drawing a contour, not explaining a data id.
- Remove smoke guards and rely on review: rejected because this module has already accumulated repeated wording regressions.

## Scalability Potential

Low: weak clinic laptops receive the same CT chunks with no new runtime work and slightly better aggregate gzip than the previous logged pass.

Middle: standard clinic PCs get clearer CT planning steps without interpreting artifact/status/ROI jargon.

High: high-end CT workstations keep the same portable viewer contracts while visible labels can continue to improve independently.

Ultra: future OHIF/Cornerstone/local adapters still consume stable `area_roi`/`volume_roi` metadata and bridge attributes; no UI wording change blocks richer viewer restores.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE plus BUNDLE_BUDGET. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: 0 measured frame-time gain. Bundle proof: aggregate JS gzip is 428,879 / 430,000 and total gzip is 456,778 / 480,000. Key CT chunks: artifact commands 5,621 bytes / 1,921 gzip; artifact panel 1,498 bytes / 749 gzip; measurement plan 7,850 bytes / 3,096 gzip; catalog 9,474 bytes / 2,735 gzip; export scenario summary 4,964 bytes / 1,885 gzip.

## Proof

`npm run smoke:imaging-viewer-usability-source`, `npm run typecheck -w @dental/web`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, and `npm run typecheck -w @dental/api` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

The continuation pass found doctor/admin-facing CT strings that still exposed raw implementation language across several chunks: implant-fit raw status ids, `hard gate`, `viewer-???????`, `?? viewer`, `viewer/workbench`, `????? ????? viewer`, `???? ?????????`, and English `missing viewer apply targets`.

## Solution

Keep machine contracts stable, but localize only visible guidance. Implant-fit cards map status ids through `fitStatusLabel`. Measurement and reconstruction plans use viewing-unit, CT viewer, and clinical axis/canal check wording. Workflow warning says the viewing task packet is not assembled. Viewer bridge manifest labels say `????? ?????????`, and launch blockers are Russian operator guidance. Source-smoke now requires the new wording and forbids the old raw fragments.

## Rejected Alternatives

- Rename internal viewer/bridge/handoff/fallback contracts: rejected because these are adapter payloads and chunk boundaries, not the visible defect.
- Hide CT warnings to avoid wording work: rejected because density calibration, station coverage, and missing task packets are clinically relevant.
- Localize enum values in state/export payloads: rejected because UI copy must not become machine state.

## Scalability Potential

Low: no new CT pixel path; weak laptops keep metadata/tool-state planning and code-split chunks.

Middle: doctors and admins see readable CT planning instructions without adapter/debug terms.

High: OHIF/Cornerstone/local bridge metadata remains stable for future integrations.

Ultra: future volume renderer/implant tools can add machine metadata without leaking it into clinical cards.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE plus BUNDLE_BUDGET. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: 0 measured; label/string mapping only. Final bundle proof: aggregate JS gzip is 429,089 / 430,000 and total gzip is 456,988 / 480,000.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, and `npm run typecheck -w @dental/api` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

The CT focused scenario handoff exposed `summary.bridge.label`, sourced from the viewer bridge manifest. That label used `???? ?????????: ...`, which is implementation language for a doctor/admin card. The launch gate blocker also used English adapter wording: `missing viewer apply targets`.

## Solution

Keep internal bridge/audit/data-attribute names stable, but change manifest status labels to `????? ?????????: ...`. Localize the missing-target blocker to `?? ??????? ????? ??????????????: ...`. Add source-smoke guards that require the new visible labels and forbid the old bridge/English fragments. Update the CT viewer plan to document this UI/metadata boundary.

## Rejected Alternatives

- Rename `ct-planning-viewer-bridge-*` modules and `data-viewer-*` attributes: rejected because adapters and smoke contracts use those machine names.
- Remove missing-target blocker details: rejected because integrators need the missing apply target list when a handoff cannot launch.
- Leave `???? ?????????` visible because it is shorter: rejected because it describes implementation plumbing, not the transfer package a clinic operator sees.

## Scalability Potential

Low: weak clinic laptops still receive the same no-pixel handoff metadata and no new render work.

Middle: admins see a readable package status while adapter attributes remain machine-parseable.

High: future OHIF/Cornerstone/local bridge launchers can keep the same payload while visible copy continues to improve independently.

Ultra: richer launch audits can add internal fields without forcing bridge jargon into workflow or handoff cards.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE plus BUNDLE_BUDGET. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: 0 measured; label/blocker string changes only. Bundle proof: `ct-planning-viewer-restore` is 3,272 bytes / 1,166 gzip and `ct-planning-viewer-bridge-launch` is 882 bytes / 531 gzip. Aggregate JS gzip is 429,089 / 430,000 and total gzip is 456,988 / 480,000.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, and `npm run typecheck -w @dental/api` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

CT measurement, reconstruction, and workflow plans still had visible implementation wording: `viewer-???????`, `?? viewer`, `??? hard gate`, `viewer/workbench`, `??? ? viewer`, and `????? ????? viewer`. These strings were in doctor/admin-facing guidance, not just internal adapter fields.

## Solution

Replace visible wording with Russian clinical copy while preserving typed adapter metadata. Measurement uses viewing units and clinical axis/canal check language. Reconstruction names the CT viewer and station-step adjustment in Russian. Workflow missing-task guidance says the viewing task packet is not assembled. Source-smoke now requires the new phrases and forbids the old raw fragments. The CT viewer plan documents the boundary.

## Rejected Alternatives

- Remove viewer bridge metadata from `CtPlanningWorkflowScenarioFocus`: rejected because route/export adapters need `viewerLabel`, bridge label, and DOM attributes.
- Rename all internal viewer contracts: rejected because these are stable machine payloads and not the visible defect.
- Drop density warnings for non-HU values: rejected because the warning is clinically necessary; only the wording was wrong.
- Drop station cap warnings: rejected because long ???? routes can exceed the safety cap and must stay visible.

## Scalability Potential

Low: weak clinic laptops keep bounded CT planning chunks and no new pixel work.

Middle: admins and doctors see readable CT measurement/reconstruction instructions without implementation terms.

High: the same typed fields can continue to feed external OHIF/Cornerstone/local adapters while the UI copy stays separate.

Ultra: future true volume renderer and implant planning tools can add adapter metadata without leaking it into clinical cards.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE plus BUNDLE_BUDGET. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: 0 measured; string-only changes. Bundle proof: `ct-planning-measurement-plan` is 7,970 bytes / 3,144 gzip, `ct-planning-reconstruction` is 6,777 bytes / 2,863 gzip, and `ct-planning-workflow-plan` is 5,381 bytes / 2,151 gzip. Aggregate JS gzip is 429,023 / 430,000 and total gzip is 456,922 / 480,000.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, and `npm run typecheck -w @dental/api` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

The CT implant-fit card still rendered raw candidate status ids (`ready`, `draft`, `blocked`) when the candidate was not selected. The same flow also exposed `hard gate` and English `viewer` wording in clinical reasons/actions. That made a dentist-facing CT planning card read like adapter/debug output.

## Solution

Add a render-only `fitStatusLabel` mapper in `CtPlanningImplantFitPanel` and keep the typed status values internal. Replace visible `hard gate` / `viewer` fragments in implant-fit reasons/actions with Russian clinical wording: axis+canal check, ?????, and ???????????. Add source-smoke guards that require the mapper/new copy and forbid the previous raw JSX/status fragments. Update the CT viewer plan with this boundary.

## Rejected Alternatives

- Localize the `CtPlanningImplantFitPlan["status"]` enum: rejected because export/planning state should stay machine-stable and not carry UI copy.
- Rename internal viewer bridge/chunk/module names: rejected because those are adapter implementation details, not the visible UI defect.
- Leave `ready/draft/blocked` visible because they are compact: rejected because the CT planning panel is a clinical operator surface.

## Scalability Potential

Low: weak clinic laptops do one tiny render label branch and load the same code-split chunks.

Middle: doctors see readable candidate readiness without interpreting typed ids.

High: future candidate states can be mapped in one UI function while state/export contracts remain stable.

Ultra: additional automated implant-fit scoring can extend typed status/evidence without leaking machine vocabulary into cards.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE plus BUNDLE_BUDGET. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: 0 measured; one render branch and string substitutions only. Bundle proof: `ct-planning-implant-fit` is 5,012 bytes / 2,017 gzip and `ct-planning-implant-fit-panel` is 1,995 bytes / 865 gzip. Aggregate JS gzip is 429,026 / 430,000 and total gzip is 456,925 / 480,000.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, and `npm run typecheck -w @dental/api` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

Two CT planning user-visible strings still leaked implementation language. The canal/template export fact said `?????? ????? ? handoff.` and implant-fit warnings/reasons exposed `fallback shortest/longest` / `????????? fallback`. These are not acceptable in a clinical planning UI even though `handoff` and `fallback` remain valid internal adapter/state names.

## Solution

Change only the visible CT copy. Canal/template readiness now says `?????? ????? ? ????????.` Implant-fit draft evidence now says `??????/?????? ????? ?? ????????? ???????` and the generic ruler warning names universal short/long rulers as a draft source. Add source-smoke guards requiring the new strings and forbidding the old visible jargon. Update the CT viewer plan with the boundary: internal handoff/fallback metadata is allowed, doctor-facing copy is not.

## Rejected Alternatives

- Rename internal `handoffSummary`, `lab-handoff`, bridge chunks, or `widthSource: "fallback"` values: rejected because those are machine contracts, not the visible defect.
- Replace the implant-fit source typing with Russian enum values: rejected because it would mix localized UI copy into typed state and adapter payloads.
- Leave `fallback` because it is technically precise: rejected because the CT board is a clinical workflow surface, not an implementation debugger.

## Scalability Potential

Low: weak clinic laptops load the same chunks; no additional logic path or viewer work is introduced.

Middle: doctors see draft evidence in human terms and can continue the plan without interpreting implementation vocabulary.

High: adapter and export contracts keep stable machine names while visible labels can continue to improve independently.

Ultra: future viewer adapters can consume `handoff` and `fallback` metadata without forcing those terms back into clinical cards.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE plus BUNDLE_BUDGET. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: 0 measured; render string substitutions only. Bundle proof: `ct-planning-export` is 7,810 bytes / 2,829 gzip, `ct-planning-implant-fit` is 4,967 bytes / 2,008 gzip. Aggregate JS gzip is 428,979 / 430,000 and total gzip is 456,878 / 480,000.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, and `npm run typecheck -w @dental/api` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

Two CT planning user-visible strings still leaked implementation language. The canal/template export fact said `?????? ????? ? handoff.` and implant-fit warnings/reasons exposed `fallback shortest/longest` / `????????? fallback`. These are not acceptable in a clinical planning UI even though `handoff` and `fallback` remain valid internal adapter/state names.

## Solution

Change only the visible CT copy. Canal/template readiness now says `?????? ????? ? ????????.` Implant-fit draft evidence now says `??????/?????? ????? ?? ????????? ???????` and the generic ruler warning names universal short/long rulers as a draft source. Add source-smoke guards requiring the new strings and forbidding the old visible jargon. Update the CT viewer plan with the boundary: internal handoff/fallback metadata is allowed, doctor-facing copy is not.

## Rejected Alternatives

- Rename internal `handoffSummary`, `lab-handoff`, bridge chunks, or `widthSource: "fallback"` values: rejected because those are machine contracts, not the visible defect.
- Replace the implant-fit source typing with Russian enum values: rejected because it would mix localized UI copy into typed state and adapter payloads.
- Leave `fallback` because it is technically precise: rejected because the CT board is a clinical workflow surface, not an implementation debugger.

## Scalability Potential

Low: weak clinic laptops load the same chunks; no additional logic path or viewer work is introduced.

Middle: doctors see draft evidence in human terms and can continue the plan without interpreting implementation vocabulary.

High: adapter and export contracts keep stable machine names while visible labels can continue to improve independently.

Ultra: future viewer adapters can consume `handoff` and `fallback` metadata without forcing those terms back into clinical cards.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE plus BUNDLE_BUDGET. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: 0 measured; render string substitutions only. Bundle proof: `ct-planning-export` is 7,810 bytes / 2,829 gzip, `ct-planning-implant-fit` is 4,967 bytes / 2,008 gzip. Aggregate JS gzip is 428,979 / 430,000 and total gzip is 456,878 / 480,000.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, and `npm run typecheck -w @dental/api` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

CT planning snapshot had two UI-wording leaks. When the backend planning task bundle was absent, the fallback summary used `activeTool.replace(/_/g, " ")`, which could show enum-like text such as `measure distance`. The CT task projection map also used raw `MIP`, even though other MPR UI already avoids that jargon.

## Solution

Replace the raw active-tool fallback with compact Russian copy: `?????? ?????????? ??`. Keep exact clinical scenario naming in the quick-action/current-scenario cards, where that context already exists. Change CT task projection label from `MIP` to `????? ?????????`. Add source-smoke guards that require the Russian fallback and density-map wording and forbid enum replacement/raw `MIP` in CT planning state.

## Rejected Alternatives

- Add a full `ImagingViewerTool` label dictionary to `ctPlanningState`: rejected after build evidence; it pushed `ct-planning-state` to 8,414 bytes over the 8,000-byte chunk limit.
- Import the shared MPR label map from `imagingUiLabels`: rejected because it would couple CT planning state to a large UI-label chunk for one rare fallback.
- Leave raw `MIP`: rejected because this panel has its own projection map and user-facing CT planning must avoid renderer jargon.

## Scalability Potential

Low: weak clinic laptops do not load a larger CT state chunk just to avoid enum leakage.

Middle: standard workstations get readable fallback copy even before the backend bundle arrives.

High: the exact active scenario remains available through quick-action and active-scenario summary instead of duplicating a label table.

Ultra: future CT task labels can still move into a shared lightweight clinical-label module if several chunks need the same map.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE plus BUNDLE_BUDGET. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: no measured frame gain. Full dictionary attempt failed at `ct-planning-state` 8,414 bytes. Final compact fallback passes at 7,841 bytes / 3,142 gzip. Aggregate JS gzip is 428,875 / 430,000 and total gzip is 456,774 / 480,000.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, and `npm run typecheck -w @dental/api` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

The CT package card rendered `toolStateBundle.target` directly. That could show adapter ids such as `cornerstone3d`, `generic_json`, or `external_viewer` in the clinician-facing CT planning board. The machine id is useful for adapters but not acceptable as visible package state.

## Solution

Add a compact `toolStateTargetLabels` map in `CtPlanningToolsPanel` and render the readable label in the package card. Keep the original target id inside the bundle and handoff metadata. Add source-smoke guards that require the label map and forbid the old raw-target JSX expression.

## Rejected Alternatives

- Leave raw adapter ids visible: rejected because the CT panel is a clinical workflow board, not an adapter debugger.
- Move the labels into the large shared imaging UI label module: rejected because this card needs only four short labels and should not create a chunk dependency.
- Add a new panel/chunk: rejected because this is a small render-only mapping and `ct-planning-tools` has enough raw/gzip headroom.

## Scalability Potential

Low: weak laptops still load the same CT tools panel with a small label map only.

Middle: clinic operators see readable package state while the underlying bundle keeps adapter identity intact.

High: future external viewer targets can be added through one visible mapping without changing the handoff contract.

Ultra: adapter-specific automation can continue to use `toolStateBundle.target` and bridge metadata; visible UI remains stable.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE plus BUNDLE_BUDGET. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: one object lookup in render, below measurement noise. Bundle proof: `ct-planning-tools` is 10,319 bytes / 3,275 gzip. Aggregate JS gzip is 428,958 / 430,000 and total gzip is 456,857 / 480,000.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, and `npm run typecheck -w @dental/api` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-01

## Problem

Two CT planning user-visible strings still leaked implementation language. The canal/template export fact said `?????? ????? ? handoff.` and implant-fit warnings/reasons exposed `fallback shortest/longest` / `????????? fallback`. These are not acceptable in a clinical planning UI even though `handoff` and `fallback` remain valid internal adapter/state names.

## Solution

Change only the visible CT copy. Canal/template readiness now says `?????? ????? ? ????????.` Implant-fit draft evidence now says `??????/?????? ????? ?? ????????? ???????` and the generic ruler warning names universal short/long rulers as a draft source. Add source-smoke guards requiring the new strings and forbidding the old visible jargon. Update the CT viewer plan with the boundary: internal handoff/fallback metadata is allowed, doctor-facing copy is not.

## Rejected Alternatives

- Rename internal `handoffSummary`, `lab-handoff`, bridge chunks, or `widthSource: "fallback"` values: rejected because those are machine contracts, not the visible defect.
- Replace the implant-fit source typing with Russian enum values: rejected because it would mix localized UI copy into typed state and adapter payloads.
- Leave `fallback` because it is technically precise: rejected because the CT board is a clinical workflow surface, not an implementation debugger.

## Scalability Potential

Low: weak clinic laptops load the same chunks; no additional logic path or viewer work is introduced.

Middle: doctors see draft evidence in human terms and can continue the plan without interpreting implementation vocabulary.

High: adapter and export contracts keep stable machine names while visible labels can continue to improve independently.

Ultra: future viewer adapters can consume `handoff` and `fallback` metadata without forcing those terms back into clinical cards.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE plus BUNDLE_BUDGET. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: 0 measured; render string substitutions only. Bundle proof: `ct-planning-export` is 7,810 bytes / 2,829 gzip, `ct-planning-implant-fit` is 4,967 bytes / 2,008 gzip. Aggregate JS gzip is 428,979 / 430,000 and total gzip is 456,878 / 480,000.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, and `npm run typecheck -w @dental/api` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

EOF append marker: CT continuation clinical wording pass kept machine contracts stable and changed only visible copy/status labels: implant-fit status labels, measurement/reconstruction/workflow wording, viewer bridge `????? ?????????` labels, and Russian launch blockers. Final proof: web/shared/api typechecks, build, imaging source smoke, bundle budget, code split, text encoding, DICOM workup, diff check, and process check passed. Aggregate JS gzip 429,089 / 430,000.

---
Date: 2026-06-01

## Problem

CT/web aggregate JS gzip had only 911 bytes of headroom after the previous CT bridge wording pass. That is too tight for continued CT viewer/planning work. At the same time, several CT cards had verbose copy and one implant-model card still showed the implementation term `gate` to the clinician.

## Solution

Compress only visible CT planning copy in measurement, reconstruction, workflow, and implant-model modules. Keep all calculation logic, typed state, export packet fields, bridge metadata, and smoke-required clinical meaning intact. Add source-smoke guards for the compact density copy and the implant-model `gate` removal. Update the CT viewer plan with the budget reserve and lab-boundary note.

## Rejected Alternatives

- Raise `smoke:web-bundle-budget`: rejected because the budget is the pressure that keeps CT growth honest.
- Remove CT cards or facts: rejected because the user goal is broader CT functionality, not a smaller feature surface.
- Rename internal gate/handoff/fallback contracts: rejected because those names are machine-state/API boundaries; the defect was visible copy.

## Scalability Potential

Low: weak clinic laptops download less JS while keeping the same CT planning cards and no extra runtime branch.

Middle: ordinary clinic PCs keep readable CT planning guidance with less bundle pressure.

High: future CT modules have roughly 1.1 KB aggregate JS gzip headroom before the current ceiling.

Ultra: high-end workstations can still receive richer CT bridge/viewer layers later because this pass freed budget instead of consuming it.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE plus BUNDLE_BUDGET. No browser profiler artifact was generated, so no runtime microsecond saving is claimed.

Low-end i3/MX350 estimate: 0 measured frame-time gain; this is transfer/parse budget work. Aggregate JS gzip improved from 429,089 / 430,000 to 428,914 / 430,000. `ct-planning-implant-model` is 5,280 bytes / 2,250 gzip after the copy compression.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, and `npm run typecheck -w @dental/api` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-02

## Problem

CT artifact/scenario/ROI copy still leaked implementation language: `????????? ?????`, viewer-draw guidance, `?????????????`, and raw `ROI` titles.

## Solution

Keep machine contracts stable and change only visible labels to `???????? ?????`, `????? ????????`, `??????? ????????`, `?????? ???????`, and `?????? ??????`. Add source-smoke guards for those labels and old-copy forbids.

## Rejected Alternatives

- Rename `area_roi`/`volume_roi`/status ids: rejected because those are viewer/tool-state contracts.
- Leave `ROI` visible: rejected because the accessible action is drawing a contour.
- Rely on docs only: rejected because the boundary has regressed before.

## Scalability Potential

Low: no extra runtime path and aggregate gzip stays under ceiling.
Middle: clinic operators read task actions without decoding ids.
High: viewer adapters keep stable ROI metadata.
Ultra: richer OHIF/Cornerstone restores can still use the same typed route.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE plus BUNDLE_BUDGET. Runtime microseconds saved: 0 measured. Aggregate JS gzip is 428,879 / 430,000; total gzip is 456,778 / 480,000.

## Proof

`npm run smoke:imaging-viewer-usability-source`, `npm run typecheck -w @dental/web`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, and `npm run typecheck -w @dental/api` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-02

## Problem

After the artifact/scenario cleanup, four visible CT surfaces still leaked raw `ROI`: active scenario labels/deliverables, the measurement summary line, workflow phase details, and the suite header.

## Solution

Change only visible strings to contour wording: `?????? ???????`, `?????? ??????`, `???????`, and `???????`. Add source-smoke guards for those files and update the CT viewer plan boundary.

## Rejected Alternatives

- Rename `area_roi`, `volume_roi`, DICOM ROI tool names, or geometry field names: rejected because they are portable viewer/adaptor contracts.
- Forbid every `ROI` token in source smoke: rejected because internal typed contracts still need ROI semantics.
- Leave the header/workflow copy as-is: rejected because it makes the clinical planning surface read like implementation state.

## Scalability Potential

Low: no added runtime path and aggregate gzip stays under the ceiling.
Middle: clinic users see contour actions consistently across CT panels.
High: viewer adapters keep stable ROI metadata while UI copy can keep improving independently.
Ultra: OHIF/Cornerstone restore routes can still consume the same typed ROI commands without forcing raw names into the CRM surface.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE plus BUNDLE_BUDGET. Runtime microseconds saved: 0 measured. Aggregate JS gzip is 428,866 / 430,000; total gzip is 456,765 / 480,000.

## Proof

`npm run smoke:imaging-viewer-usability-source`, `npm run typecheck -w @dental/web`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, and `npm run typecheck -w @dental/api` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-02

## Problem

DICOM/settings handoff copy still leaked the operator-facing phrase `??????? ???????????` in several surfaces: Settings launch controls, App settings/onboarding copy, CT package target labels, API imaging/system response text, and sample low-power DICOM labels. Settings/imaging/workspace label maps also exposed raw `?????????????`/`????????????` for blocked setup states where the operator needs an action, not a dead end.

## Solution

Keep machine contracts stable and change only visible labels. `external_viewer` remains the route/adapter id, but UI/API copy now says `??????? ????????`. Blocked UI labels in the Settings/imaging/workspace label layer now say `????? ????????`. Source smoke now requires the new labels and forbids exact old `??????? ???????????` wording in the DICOM/CT handoff sources.

## Rejected Alternatives

- Rename `external_viewer`: rejected because DICOM workup, viewer bundles, low-power policy, and adapter launch contracts depend on this stable id.
- Globally forbid all Russian blocked words: rejected because Telegram security, document policy, and other non-DICOM states can legitimately be blocked.
- Leave API/sample wording for later: rejected because App and Settings consume those strings as operator guidance.

## Scalability Potential

Low: no new runtime route, no pixel work, and the web bundle remains below the current ceiling.
Middle: clinic operators see the same external-viewing wording in settings, CT package cards, and API-driven hints.
High: DICOM/OHIF/Cornerstone/local adapters keep stable ids while the visible layer can stay localized.
Ultra: future viewer bridges can grow richer adapter payloads without forcing adapter names into clinical copy.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE plus BUNDLE_BUDGET. Runtime microseconds saved: 0 measured. Aggregate JS gzip is 428,828 / 430,000; total gzip is 456,727 / 480,000. `ct-planning-tools` is 10,324 bytes / 3,275 gzip and `SettingsView` is 222,274 bytes / 51,668 gzip after the wording pass.

## Proof

`npm run smoke:settings-view-source`, `npm run smoke:imaging-viewer-usability-source`, `npm run typecheck -w @dental/web`, `npm run build -w @dental/web`, `npm run smoke:web-bundle-budget`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, and `npm run typecheck -w @dental/api` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-02

## Problem

Server-side workbench persistence already redacted most local DICOM paths, but browser downloads still serialized live `dicomViewerToolStateBundle` and `dicomViewerWorkbenchManifest` directly. A downloaded handoff JSON could therefore expose local workstation paths through `seriesRef.firstFilePath`, viewport `referencedImageId`, annotation `referencedImageId`, `dicomfile:` references, launch `viewerUrl`, or warning text. Server persistence also missed annotation `referencedImageId`.

## Solution

Add a client-side download redaction boundary in `App.tsx`. Browser downloads now clone the DICOM tool-state/workbench manifest, redact local paths to `redacted-local-dicom-path:<fingerprint>`, serialize the sanitized copy, and leave the in-memory/local recovery state unchanged. Server storage redaction now also sanitizes tool-state annotation `referencedImageId`. Source smoke guards the exact bypass points and forbids raw JSON serialization of live DICOM handoff state.

## Rejected Alternatives

- Mutate the live workbench manifest before download: rejected because same-workstation recovery needs the local source until the operator reconnects or clears recovery.
- Rely on server persistence only: rejected because the browser download buttons bypass server storage.
- Strip every file-like string from the manifest: rejected because HTTPS/OHIF/PACS and relative API viewer URLs must stay usable.
- Stop offering downloadable handoff JSON: rejected because portable no-pixel handoff is a core DICOM/CT workflow.

## Scalability Potential

Low: weak laptops pay no frame cost; redaction runs only when the operator downloads a JSON handoff.
Middle: clinics can move no-pixel CT planning state between workstations without exposing local folder names.
High: OHIF/Cornerstone/local adapter contracts still receive stable redacted references and warnings.
Ultra: richer viewer bridges can add more state fields as long as they pass through the same download/server redaction owner.

## Hardware Impact

Evidence class: STATIC_SOURCE plus CLI_BUILD plus DICOM_SMOKE. Runtime frame microseconds saved: 0 measured. Added cost is click-time JSON clone/string redaction on explicit download or server save-time clone only; expected impact on i3/MX350 class hardware is negligible because it is outside the render/workflow hot path. Bundle-budget smoke was intentionally not used as a gate for this slice after the explicit directive that gzip size is not the objective.

## Proof

`npm run smoke:imaging-viewer-usability-source`, `npm run typecheck -w @dental/web`, `npm run build -w @dental/web`, `npm run smoke:settings-view-source`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, and `npm run typecheck -w @dental/api` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-02

## Problem

Prototype admin secrets were still acting as hidden cross-domain keys. `DENTE_SETTINGS_ADMIN_SECRET` or `DENTE_TELEGRAM_ADMIN_SECRET` could unlock clinical read/mutation/export routes through the clinical guard fallback, and Telegram could unlock settings routes. A separate schedule fallback also allowed settings or Telegram secrets to mutate appointments. That is not tenant auth, but it is still an avoidable privilege escalation in the MVP server.

## Solution

Make admin secrets domain-scoped in code and smoke proof:
- clinical patients/documents/imaging/speech/imports/persistence export require `DENTE_CLINICAL_ADMIN_SECRET`;
- appointment mutations require `DENTE_SCHEDULE_ADMIN_SECRET`;
- settings routes require `DENTE_SETTINGS_ADMIN_SECRET`;
- Telegram control-plane routes require `DENTE_TELEGRAM_ADMIN_SECRET`.

Deployments can still set identical values deliberately, but the API no longer promotes a secret from one domain into another domain implicitly.

## Rejected Alternatives

- Keep settings/Telegram fallback for convenience: rejected because a bot/control-plane secret must not become a PHI/export key by accident.
- Split the web UI into multiple admin-secret prompts now: rejected because this pass is server authorization hardening; UX can still reuse one deliberate value per deployment.
- Protect only persistence export: rejected because patients, documents, imaging, speech, imports, and appointment mutations were still operationally sensitive.
- Treat schedule as settings: rejected because appointment mutation changes clinical operations and patient-facing communication state.

## Scalability Potential

Low: no new runtime data structure, no client bundle dependency, and no render-path work.
Middle: single-clinic MVP can keep one deliberate secret value while the server boundary is explicit.
High: branch/role auth can later map these domains to real claims without unwinding fallback assumptions.
Ultra: external Telegram automation, clinical exports, settings, and schedule APIs can be independently rotated and audited.

## Hardware Impact

Evidence class: STATIC_SOURCE plus API_BUILD plus SECURITY_SMOKE plus WEB_BUILD. Runtime frame microseconds saved: 0 measured. Request overhead remains one env read and timing-safe header comparison at protected mutation/read boundaries. Low-end i3/MX350 impact is effectively 0 because no hot UI/render/DICOM path changed. Bundle-budget smoke was intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/api`, `npm run build -w @dental/api`, `npm run smoke:clinical-mutation-guard`, `npm run smoke:settings-admin-guard`, `npm run smoke:schedule-admin-guard`, `npm run smoke:telegram-admin-guard`, `npm run smoke:schedule-active-visit-status-contract`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/web`, `npm run smoke:settings-view-source`, `npm run smoke:schedule-view-source`, `npm run smoke:settings-preferences`, `npm run smoke:ui-preferences`, `npm run smoke:api-text-encoding`, `npm run build -w @dental/web`, `npm run smoke:settings-persistence-file`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, and `npm run smoke:dicom-folder-workup` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-02

## Problem

`/api/health` was public but still serialized a redacted persistence summary: enabled/existence/version/save time/backup count/latest backup time/latest backup size/max backup count. That avoided raw paths/checksums, but still exposed operational backup posture to unauthenticated callers. Settings/Audit already had a guarded persistence verify endpoint for the same facts.

## Solution

Make `/api/health` liveness-only: `ok`, `service`, and `time`. Move Settings/Audit persistence summary loading to `/api/system/persistence/verify` with clinical read headers. `loadPersistenceHealth` now parses `report.meta`, sets the health card and integrity report from the same guarded response, and accepts a just-entered admin secret override after unlock.

## Rejected Alternatives

- Keep redacted backup counts on public health: rejected because save times and backup counts are operational telemetry, not liveness.
- Add a settings-secret health route: rejected because persistence export/verify is already a clinical owner/admin continuity path.
- Keep two requests in Settings/Audit: rejected because one guarded verify response already contains both summary and integrity detail.
- Remove the Settings/Audit health card: rejected because operators still need backup/readability status before migrations and risky imports.

## Scalability Potential

Low: public health does less work and no longer reads persistence metadata.
Middle: Settings/Audit gets one protected verify response instead of public health plus protected verify.
High: future tenant auth can map persistence verify/export to owner/admin claims without preserving a public summary exception.
Ultra: external probes can keep using health for liveness while backup/integrity telemetry stays in authenticated operations tooling.

## Hardware Impact

Evidence class: STATIC_SOURCE plus API_BUILD plus WEB_BUILD plus SECURITY_SMOKE. Runtime frame microseconds saved: 0 measured. Public health now avoids persistence metadata reads; Settings/Audit manual/open check avoids a duplicate verify path. Low-end i3/MX350 impact is effectively 0 on render and DICOM paths. Bundle-budget smoke was intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/api`, `npm run build -w @dental/api`, `npm run typecheck -w @dental/web`, `npm run smoke:clinical-mutation-guard`, `npm run smoke:settings-view-source`, `npm run build -w @dental/web`, `npm run smoke:settings-persistence-file`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:api-text-encoding`, `npm run smoke:dicom-folder-workup`, and `npm run typecheck -w @dental/shared` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind.

---
Date: 2026-06-02

## Problem

The API had domain-scoped prototype admin secrets, but the browser still treated `telegramAdminSecretSession` as the shared key for clinical reads/mutations, settings routes, schedule mutations, UI preferences, and Telegram control-plane calls. That left two concrete failures:
- a valid schedule/settings secret could be entered from the UI and still fail because the unlock flow first tried to reload `/api/dashboard` with a non-clinical secret;
- a Telegram secret stayed eligible for settings/preferences headers in the frontend even though the API no longer accepts it there.

## Solution

Split browser memory into four explicit sessions: clinical, settings, schedule, and Telegram. Clinical/global unlock can seed all four for clinics that deliberately deploy one shared value. Domain unlocks now update only their own slot and do not reload or clear the clinical dashboard. Settings profile/mode/staff/chair/preferences calls use `settingsAccessHeaders`; appointment create/update uses `scheduleMutationHeaders`; clinical routes use `clinicalAdminSecretSession`; Telegram keeps `telegramControlPlaneHeaders`. Non-Telegram Settings tabs now show a settings-domain unlock panel, and Schedule copy no longer claims settings/Telegram access.

## Rejected Alternatives

- Keep the single `telegramAdminSecretSession`: rejected because it recreates the cross-domain boundary leak on the client after the server was fixed.
- Add endpoint-string domain inference in a generic fetch wrapper: rejected because explicit helper ownership is easier to test in source smokes and avoids another hidden router.
- Force separate prompts for one-secret clinics: rejected because small deployments can still intentionally use one secret; the difference is explicit seeding, not silent fallback.
- Leave settings unlock only inside the Telegram tab: rejected because settings access and Telegram control-plane access are separate domains.

## Scalability Potential

Low: no render work, no extra network path, and no stored browser secret.
Middle: single-clinic MVP can keep one deliberate admin value without breaking settings/schedule/Telegram flows.
High: future session/role auth can map claims to these frontend domains without unwinding a Telegram-named global secret.
Ultra: clinical data, appointment mutations, settings, and external automation can rotate independently while the UI stays operable.

## Hardware Impact

Evidence class: STATIC_SOURCE plus WEB_BUILD plus SECURITY_SOURCE_SMOKE. Runtime frame microseconds saved: 0 measured. Added cost is four short React state strings and branch selection when building request headers. Low-end i3/MX350 impact is effectively 0; no DICOM, render, import, or polling hot path changed. Bundle-budget smoke was intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:settings-view-source`, `npm run smoke:schedule-view-source`, `npm run smoke:ui-preferences`, `npm run smoke:onboarding-configuration-source`, `npm run smoke:telegram-control-ui-source`, `npm run smoke:clinical-mutation-guard`, `npm run build -w @dental/web`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run smoke:settings-preferences`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:api-text-encoding`, and `npm run smoke:dicom-folder-workup` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind. `npm run smoke:web-bundle-budget` was intentionally not used as a gate.

---
Date: 2026-06-02

## Problem

The previous browser domain split still left one fragile edge: fixed unlock panels called a shared callback that inferred the target domain from ambient `currentView`, `settingsTab`, and `onboardingStep`. A retained Telegram onboarding step could override a non-Telegram Settings panel, so the visible panel and the actual session slot could diverge. The Telegram tab also still claimed "settings and Telegram" access even though the parent now passes the Telegram domain only.

## Solution

Add explicit domain overrides to the admin-secret session functions. Bootstrap unlock passes `all`; onboarding Telegram passes `telegram`; Schedule passes `schedule`; Settings passes `settingsAdminSecretDomain`, which is `settings` for non-Telegram tabs and `telegram` for the Telegram tab. The ambient resolver remains only as a fallback for non-fixed/global call paths. Telegram unlock copy now says Telegram-only and no longer implies general settings access.

## Rejected Alternatives

- Add more conditions to `currentAdminSecretUnlockDomain`: rejected because fixed panels should not depend on unrelated retained wizard state.
- Rename every legacy `unlockTelegramAdminSession` prop now: rejected because the current risk is behavior/copy mismatch, not public API naming; a broad rename would create noise in a very large working tree.
- Keep "settings and Telegram" copy: rejected because Settings has its own protected-settings unlock panel and Telegram uses a separate route family.
- Store domain secrets in browser storage: rejected because the current prototype boundary intentionally keeps them memory-only.

## Scalability Potential

Low: no extra network request, no render work, and no stored browser secret.
Middle: one-secret clinics still work through the global unlock while fixed panels are honest about their route family.
High: real role/session auth can map fixed panels to claims without preserving ambient route inference.
Ultra: independent clinical, schedule, settings, and Telegram rotation remains operable with precise UI copy and source guards.

## Hardware Impact

Evidence class: STATIC_SOURCE plus WEB_BUILD plus SECURITY_SOURCE_SMOKE. Runtime frame microseconds saved: 0 measured. Added cost is one optional string parameter and a branch when unlocking or locking an admin session. Low-end i3/MX350 impact is effectively 0; no DICOM, import, render, polling, or schedule computation hot path changed. Bundle-budget smoke was intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:settings-view-source`, `npm run smoke:schedule-view-source`, `npm run smoke:ui-preferences`, `npm run smoke:onboarding-configuration-source`, `npm run smoke:telegram-control-ui-source`, `npm run smoke:clinical-mutation-guard`, `npm run build -w @dental/web`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run smoke:settings-preferences`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:api-text-encoding`, and `npm run smoke:dicom-folder-workup` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind. `npm run smoke:web-bundle-budget` was intentionally not used as a gate.
---

Date: 2026-06-02

## Problem

The browser had separate admin-secret sessions, but the password input draft itself was still a single `telegramAdminSecretDraft`. That meant a typed but not submitted settings or schedule secret could appear in another protected panel after navigation, and Telegram control-plane calls that allow a just-typed secret override could accidentally receive a draft from the wrong domain.

## Solution

Split the draft state into clinical/global, settings, schedule, and Telegram slots. `unlockTelegramAdminSession` now resolves the target domain first, reads `adminSecretDraftForDomain(domain)`, and clears drafts with `clearAdminSecretDraft(domain)`. The app bootstrap receives the clinical/global draft, Schedule receives the schedule draft, and Settings receives the settings or Telegram draft based on `settingsAdminSecretDomain`.

## Rejected Alternatives

- Keep one shared draft and rely on `type="password"` hiding the text: rejected because the problem is route-family ownership, not only visual masking.
- Clear all drafts on every domain unlock: rejected because it erases unrelated operator input when the user unlocks only Schedule or Settings.
- Rename every legacy `telegramAdminSecretDraft` prop in child components now: rejected because parent-domain wiring solves the bug without broad churn in large files.
- Persist drafts to browser storage per domain: rejected because admin secrets should remain memory-only in this prototype.

## Scalability Potential

Low: no storage writes, no network work, and no render hot path.
Middle: clinics using one deliberate secret still work through global unlock while individual panels remain isolated.
High: future session auth can replace these memory slots with claim/session state without preserving shared password input behavior.
Ultra: independent key rotation for clinical, settings, schedule, and Telegram remains usable without cross-panel draft leakage.

## Hardware Impact

Evidence class: STATIC_SOURCE plus WEB_BUILD plus SECURITY_SOURCE_SMOKE. Runtime frame microseconds saved: 0 measured. Added cost is three short React state strings and a click-time branch to read/clear the right draft. Low-end i3/MX350 impact is effectively 0; no DICOM, import, render, polling, schedule, or API hot path changed. Bundle-budget smoke was intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:clinical-mutation-guard`, `npm run smoke:settings-view-source`, `npm run smoke:schedule-view-source`, `npm run smoke:telegram-control-ui-source`, `npm run smoke:ui-preferences`, `npm run smoke:onboarding-configuration-source`, `npm run build -w @dental/web`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run smoke:settings-preferences`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:api-text-encoding`, and `npm run smoke:dicom-folder-workup` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind. `npm run smoke:web-bundle-budget` was intentionally not used as a gate.

---
Date: 2026-06-02

## Problem

Telegram settings validation still leaked internal reason tokens into the API `message` field. `PUT /api/settings/telegram` could return strings such as `webhookBaseUrl: https_required` or `patientPortalBaseUrl: patient_identifying_path_not_allowed`, and the contract smoke expected those raw fragments. Appointment preview warnings also exposed callback/webhook secret env names when signed appointment buttons were disabled. Those responses are surfaced to admins, so the product was teaching internal contracts instead of giving an operator action.

## Solution

Added `readableTelegramSettingsValidationMessage` in the Telegram route and routed both parse and save failures through it. The helper preserves the stable API error code while translating URL, credential, path/query privacy, and callback-secret failures to Russian operator copy. Updated appointment callback warnings/errors in `sampleData` to say that signed-button secrets must be enabled in server settings. Updated runtime and source smokes so raw reason tokens and callback env names are rejected in user-facing messages.

## Rejected Alternatives

- Keep raw validation reasons because they are precise for developers: rejected because these messages are displayed to clinic administrators, not only logs.
- Let frontend `telegramHumanMessage` mask tokens: rejected because the API response itself should be safe and readable.
- Remove validation detail entirely: rejected because admins need to know whether the link needs HTTPS, has credentials, or contains patient-identifying data.
- Rename env variables or change deployment docs: rejected because the issue was user-facing copy, not server configuration naming.

## Scalability Potential

Low: a small clinic admin sees one concrete action instead of a token and does not need developer support.
Middle: multi-URL Telegram setup remains debuggable without exposing internal field/reason contracts.
High: future tenant auth can keep stable error codes while localizing operator messages per role/language.
Ultra: advanced deployments can still log/inspect internal configuration names server-side while browser/admin copy remains safe.

## Hardware Impact

Evidence class: API_CONTRACT_SMOKE plus SOURCE_GUARD plus WEB_BUILD. Runtime frame microseconds saved: 0 measured. Added cost is one error-path string mapping during Telegram settings save or preview failure; no render, polling, DICOM, schedule, import, or speech hot path changed. Low-end i3/MX350 impact is effectively 0. Bundle-budget smoke was intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run build -w @dental/api`, `npm run smoke:telegram-control-ui-source`, `npm run smoke:telegram-bot`, `npm run smoke:telegram-validation`, `npm run smoke:telegram-admin-guard`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run typecheck -w @dental/web`, `npm run smoke:settings-view-source`, `npm run smoke:telegram-url-ui-source`, `npm run build -w @dental/web`, `npm run smoke:web-code-split-source`, `npm run smoke:web-text-encoding`, `npm run smoke:api-text-encoding`, and `npm run smoke:dicom-folder-workup` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind. `npm run smoke:web-bundle-budget` was intentionally not used as a gate.

---
Date: 2026-06-02

## Problem

Several infrastructure-adjacent API paths still returned raw implementation detail in user-facing `message` or `warnings`:
- local bridge readiness could surface URL parser or fetch exception text;
- KND 1151156 XML generation exposed `DENTE_FNS_TAX_OFFICE_CODE` in the missing tax-office setup error;
- PDF export messages named browser env/process details instead of telling the clinic what to fix.

These strings are shown in Settings/Audit and document workflows. They are not developer logs.

## Solution

Add explicit operator-copy mapping at each boundary. Local bridge readiness now has typed warning helpers for malformed URLs and probe failures. KND XML still requires the same 4-digit tax-office code but describes it as a server settings action. PDF export maps missing print browser, launch failure, timeout, nonzero exit, corrupt PDF, and catch-all failure to clinic-readable document-printing actions. Source/runtime smokes now reject the old raw parser/network/env/process strings.

## Rejected Alternatives

- Keep `error.message` in readiness warnings: rejected because JavaScript/network exception text is unstable and not actionable to clinic staff.
- Keep env keys in API errors: rejected because server variable names belong in setup docs, logs, and deployment scripts, not operator cards.
- Push all translation to the frontend: rejected because API responses are consumed by smokes and future integrations, not only the current React shell.
- Add a generic error sanitizer middleware now: rejected because the safer bounded fix is to harden the known surfaces and guard them with source/runtime tests before broader routing work.

## Scalability Potential

Low: weak devices and small clinics get the same API work with clearer failures; no render or polling hot path changes.
Middle: Settings/Audit and document workflows become supportable without developer-only exception text.
High: future role/session auth can keep stable internal `code` values while localizing messages per audience.
Ultra: advanced deployments can still log exact env/process/network diagnostics server-side while browser/operator copy remains clean.

## Hardware Impact

Evidence class: STATIC_SOURCE plus API_CONTRACT_SMOKE plus API_BUILD plus WEB_BUILD. Runtime frame microseconds saved: 0 measured. Added cost is error-path string mapping only; no DICOM, render, import, schedule, finance, or communication polling hot path changed. Low-end i3/MX350 impact is effectively 0. Bundle-budget smoke was intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

Broad source guard pass, local bridge runtime guard, KND XML smoke, PDF lifecycle smoke, shared/api/web typechecks, api/web builds, code-split/text-encoding/DICOM smokes, and extra interactive/payment/communications source smokes passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind. `npm run smoke:web-bundle-budget` was intentionally skipped as a gate by explicit instruction.

---
Date: 2026-06-02

## Problem

The guarded persistence verify/export flow still used raw state-file read diagnostics as browser-visible data. A corrupt JSON state file could put parser detail or internal diagnostic tokens into `warnings`, backup `warning`, or export `error`, exactly in the Settings/Audit area that owners use before migration or restore work.

## Solution

Convert persistence file read failures into bounded internal diagnostics, then map them through `persistenceWarningText` before they leave the API. Current state warnings, backup warnings, and export errors now describe the recovery action: unreadable state file, missing state file, checksum mismatch, disabled persistence, or backup integrity problem. Runtime smoke corrupts the state file and asserts verify/export payloads do not expose JSON parser text or internal tokens.

## Rejected Alternatives

- Keep raw `JSON.parse` error text for precision: rejected because server logs can hold it, but browser-visible owner/admin payloads need recovery actions.
- Return only machine tokens and translate in SettingsView: rejected because persistence verify/export may be consumed outside the current React UI.
- Add a broad API sanitizer: rejected because this route has clear state-specific actions and should own its own recovery wording.
- Remove backup warning detail entirely: rejected because operators need to know whether current state or recent backups are suspect.

## Scalability Potential

Low: small clinics see a direct recovery action instead of parser text before a risky import.
Middle: Settings/Audit keeps readable backup health while exact parser diagnostics remain server-side.
High: future restore workflow can reuse the same action labels while adding real restore operations.
Ultra: off-device backup and tenant restore can keep machine diagnostics in audit/log channels and show role-specific recovery copy in UI/API.

## Hardware Impact

Evidence class: STATIC_SOURCE plus API_RUNTIME_SMOKE plus API_BUILD plus WEB_BUILD. Runtime frame microseconds saved: 0 measured. Added cost is error-path string mapping only during persistence verify/export. Low-end i3/MX350 impact is effectively 0; no DICOM, render, import, schedule, finance, speech, or communications hot path changed. Bundle-budget smoke was intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run smoke:settings-view-source`, `npm run typecheck -w @dental/api`, `npm run build -w @dental/api`, `npm run smoke:settings-persistence-file`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/web`, `npm run smoke:api-text-encoding`, `npm run smoke:web-text-encoding`, `npm run smoke:settings-preferences`, `npm run smoke:clinical-mutation-guard`, `npm run smoke:web-code-split-source`, `npm run smoke:dicom-folder-workup`, and `npm run build -w @dental/web` passed. The persistence smoke kept exact JSON parse detail in server console logs only and rejected it in API verify/export payloads. `npm run smoke:web-bundle-budget` was intentionally skipped as a gate by explicit instruction.

---
Date: 2026-06-02

## Problem

Telegram outbox/webhook transport failures still leaked internal failure classes into user-facing data. Failed sends could return `telegram_transport_bad_request`, `telegram_photo_fallback_bad_request`, `retry_after_seconds:7`, or callback/webhook text with raw `errorClass`. These warnings are shown in Settings/Telegram and communication audit. They are machine diagnostics, not operator instructions.

## Solution

Added server-owned Telegram transport humanizers in `routes/telegram.ts` for outbox send, photo fallback, split-caption text send, webhook reply, and callback-answer failures. The API now keeps stable machine `blockedReason` values for contracts while returning Russian operator warnings/messages for transport problems. Added structured `retryAfterSeconds` to `denteTelegramOutboxSendResponseSchema`; the due worker now reads that field for backoff instead of parsing warning text.

## Rejected Alternatives

- Translate raw transport warning tokens only in `telegramHumanMessage`: rejected because API payloads and delivery receipts must be safe before frontend rendering.
- Keep `retry_after_seconds:*` in warnings for the worker: rejected because scheduler behavior must not depend on browser-visible copy.
- Drop retry detail entirely: rejected because due reminders need bounded rate-limit backoff.
- Rename `blockedReason`: rejected because it is the stable machine contract and already maps cleanly in UI.

## Scalability Potential

Low: a small clinic sees one actionable Telegram warning instead of enum tokens and does not need developer support.
Middle: due reminders can back off rate limits without coupling worker logic to UI copy.
High: future dead-letter/retry UI can use the same `retryAfterSeconds` field and localize warnings per role.
Ultra: multi-bot/tenant deployments keep exact transport classes inside server transport code while browser/admin surfaces stay operator-readable.

## Hardware Impact

Evidence class: STATIC_SOURCE plus API_RUNTIME_SMOKE plus SHARED_SCHEMA plus API_BUILD plus WEB_BUILD. Runtime frame microseconds saved: 0 measured. Added cost is error-path string mapping and one nullable response field only when Telegram send fails or returns a retry hint; no render, DICOM, speech, import, finance, schedule, or polling hot path changed. Low-end i3/MX350 impact is effectively 0. Bundle-budget smoke was intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run smoke:telegram-control-ui-source`, `npm run smoke:telegram-due-worker-source`, `npm run smoke:telegram-bot`, `npm run smoke:telegram-validation`, `npm run smoke:telegram-admin-guard`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run typecheck -w @dental/web`, `npm run build -w @dental/api`, `npm run build -w @dental/web`, `npm run smoke:api-text-encoding`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, `npm run smoke:settings-view-source`, `npm run smoke:settings-preferences`, `npm run smoke:clinical-mutation-guard`, `npm run smoke:dicom-folder-workup`, and `npm run smoke:telegram-url-ui-source` passed. Web build kept the existing large `workspace` chunk warning. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind. `npm run smoke:web-bundle-budget` was intentionally skipped as a gate by explicit instruction.

---
Date: 2026-06-02

## Problem

Speech provider failures were sanitized but still not reliably classified at the public boundary. The key-rotation layer wrapped typed `SpeechProviderRequestError` objects into generic `Error` text, so a real 429 could degrade into "source did not return ready text". Neural polish had the same risk in its key-rotation path, and `/api/speech/polish-transcript` validation joined raw zod issue text into the response.

## Solution

Added explicit public failure mappers for STT and neural polish, then preserved typed provider errors through key rotation so the mapper sees `timedOut`, `rateLimited`, and `statusCode`. Invalid polish requests now return one clinic-readable validation message. Added `smoke:speech-provider-errors`, which exercises runtime route validation, a synthetic STT 429, and a synthetic neural-polish 500, rejecting raw provider classes, HTTP tokens, upstream messages, and synthetic secret material.

## Rejected Alternatives

- Parse raw provider tokens from warning strings: rejected because browser-visible warnings must not be scheduler/provider contracts.
- Keep sanitized upstream provider messages: rejected because redaction removes secrets but not useless provider classes or HTTP tokens.
- Source-only guard: rejected because runtime smoke found the actual typed-error wrapping bug.
- Remove neural polish warnings entirely: rejected because the doctor needs to know deterministic/local text was kept after optional cleanup failed.

## Scalability Potential

Low: small clinics see a recovery action and keep working from local/deterministic text.
Middle: support staff can distinguish temporary source limits from validation problems without reading provider jargon.
High: future provider fallback UI can localize the same bounded failure classes per role.
Ultra: multi-provider deployments keep exact key-health diagnostics and fingerprints in server/admin telemetry while doctor/API warnings stay stable.

## Hardware Impact

Evidence class: API_RUNTIME_SMOKE plus STATIC_SOURCE plus API_BUILD plus WEB_BUILD. Runtime frame microseconds saved: 0 measured. Added cost is error-path classification only when speech recognition or neural polish fails; no render, DICOM, import, finance, schedule, or polling hot path changed. Low-end i3/MX350 impact is effectively 0. Bundle-budget smoke was intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/api`, `npm run build -w @dental/api`, `npm run smoke:speech-provider-errors`, `npm run smoke:speech-clinical-scope`, `npm run smoke:speech-groq-chunk-floor`, `npm run smoke:speech-key-rotation`, `npm run smoke:speech-queue-source`, `npm run smoke:api-text-encoding`, `npm run smoke:web-text-encoding`, `npm run smoke:settings-view-source`, `npm run smoke:clinical-mutation-guard`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/web`, `npm run build -w @dental/web`, `npm run smoke:web-code-split-source`, and `npm run smoke:dicom-folder-workup` passed. Web build kept the existing large `workspace` chunk warning. `npm run smoke:web-bundle-budget` was intentionally skipped as a gate by explicit instruction.

---
Date: 2026-06-02

## Problem

Import and migration routes parsed `request.body` directly with shared zod schemas. The global Fastify zod handler, and the import smoke's custom handler, could return raw `issues`, `path`, `code`, and schema field names for invalid import payloads. That is tolerable for tests, but not for a clinic admin trying to paste a bad old-MIS export, choose a bad local source, or run a migration report.

## Solution

Added route-owned safe-parse helpers in `routes/imports.ts` and `routes/smartImports.ts`. Patient import intake/preview/commit, smart preview/report/safe-report/commit, local-source discovery/workup/probe, migration autopilot/report, and clinic public lookup now return one bounded Russian operator message per route before the parser, report, commit, or public lookup work starts. Extended `smoke:import-contracts` to reject direct route `.parse(request.body...)` calls and to exercise invalid runtime payloads across those routes.

## Rejected Alternatives

- Keep the global zod handler and rely on the web app to translate: rejected because API payloads and downloaded workflow actions must be safe before frontend rendering.
- Patch only smart preview: rejected because report, safe report, commit, autopilot, local source, and clinic lookup are the same migration workflow surface.
- Return sanitized zod paths: rejected because field names such as `rawText`, `sourceRef`, `maxFolders`, and `clinicName` are still parser/UI implementation detail for the clinic operator.
- Source-only guard: rejected because runtime validation can still leak through Fastify error handlers if any route is missed.

## Scalability Potential

Low: small clinics can recover from a bad paste or empty lookup with one action instead of developer schema text.
Middle: admins can retry source discovery/probe/autopilot without seeing local-source field names or parser jargon.
High: future import templates can add route-specific validation copy while keeping shared schemas as the typed machine contract.
Ultra: multi-tenant migration tooling can keep exact schema diagnostics in server telemetry and return role-specific operator messages per route.

## Hardware Impact

Evidence class: API_RUNTIME_SMOKE plus STATIC_SOURCE plus API_BUILD plus WEB_BUILD. Runtime frame microseconds saved: 0 measured. Added cost is error-path safeParse and string mapping only when invalid import/migration payloads are submitted; no DICOM render, speech, finance, schedule, polling, or hot UI loop changed. Low-end i3/MX350 impact is effectively 0. Bundle-budget smoke was intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/api`, `npm run build -w @dental/api`, `npm run build -w @dental/shared`, `npm run smoke:import-contracts`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/web`, `npm run smoke:api-text-encoding`, `npm run smoke:settings-view-source`, `npm run smoke:clinical-mutation-guard`, `npm run build -w @dental/web`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, and `npm run smoke:dicom-folder-workup` passed. Web build kept the existing large `workspace` chunk warning. `npm run smoke:web-bundle-budget` was intentionally skipped as a gate by explicit instruction.

---
Date: 2026-06-02

## Problem

Imaging and DICOM routes still used direct shared-schema `.parse(request.body...)` calls. A malformed DICOM folder request, viewer workbench packet, DICOMweb check, viewer-session save, or study-create request could fall into a zod error handler and expose `issues`, schema paths, local-folder fields, and viewer-state field names. That is a public medical workflow surface, not a developer API console.

## Solution

Added `parseImagingPayload` in `routes/imaging.ts` and routed imaging import preview/commit, DICOM series preview, DICOMweb check, viewer launch/tool-state/render-cache/workstation/workbench packets, workbench bundle save, local folder discovery, local organizer, folder preview, first-frame preview, folder workup, folder scan, viewer-session save, and study creation through route-owned Russian validation messages. Extended `smoke:dicom-folder-workup` with source guards and runtime invalid-payload checks while keeping the existing synthetic CBCT workup, workbench, and no-pixel bundle proof.

## Rejected Alternatives

- Translate zod issues in the web app: rejected because workbench/download/API responses must be safe before browser rendering.
- Patch only folder-workup routes: rejected because launch, tool-state, workbench bundle, viewer-session, and study creation are the same CT/imaging route family.
- Return sanitized schema paths: rejected because fields such as `folderPath`, `series`, `client`, `manifest`, and `viewerState` are still implementation details for clinic operators.
- Source-only smoke: rejected because route ordering can still leak runtime zod issues after access checks.

## Scalability Potential

Low: a weak laptop or small clinic gets a recovery action for a bad folder, bad DICOMweb URL, or bad viewer packet.
Middle: admins can retry DICOM source setup and workbench save without reading schema fields.
High: future OHIF/Cornerstone adapter routes can keep precise schemas while returning role-specific public copy.
Ultra: multi-workstation imaging deployments can keep exact route diagnostics in server telemetry and return bounded operator messages to doctors/admins.

## Hardware Impact

Evidence class: API_RUNTIME_SMOKE plus STATIC_SOURCE plus API_BUILD plus WEB_BUILD. Runtime frame microseconds saved: 0 measured. Added cost is invalid-request safeParse and string mapping only; no DICOM pixel decode, render loop, speech, finance, schedule, import parsing, or polling path changed. Low-end i3/MX350 impact is effectively 0. Bundle-budget smoke was intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/api`, `npm run build -w @dental/api`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/web`, `npm run smoke:api-text-encoding`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:settings-view-source`, `npm run build -w @dental/web`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, `npm run smoke:clinical-mutation-guard`, and `npm run smoke:import-contracts` passed. Web build kept the existing large `workspace` chunk warning. `npm run smoke:web-bundle-budget` was intentionally skipped as a gate by explicit instruction.

---
Date: 2026-06-03

## Problem

Document create/issue/void returned the first zod issue as public `message`, while ingestion and price-list analyzer routes still parsed `request.body` directly. A bad legal document payload, empty file parse request, or empty price-list analyzer request could expose schema field names, parser tokens, or internal payload keys to a clinic admin.

## Solution

Added stable route-owned validation messages for document create, issue, and void. Added local safe-parse helpers to ingestion and pricelist routes so invalid bodies fail before extractor/analyzer work or a global zod handler. Added `smoke:document-route-validation`, which checks source guards and exercises invalid compiled Fastify routes for documents, ingestion, and pricelist analysis under a production-style clinical admin secret.

## Rejected Alternatives

- Keep first zod issue text for precision: rejected because legal/document and financial-price routes are operator workflows, not developer diagnostics.
- Translate errors only in the web app: rejected because API responses and direct admin tools must be safe before browser rendering.
- Add a global validator mapper: rejected for this slice because route-specific recovery actions are clearer and do not change every API route at once.
- Source-only smoke: rejected because Fastify error handlers and route ordering can still leak runtime zod responses.

## Scalability Potential

Low: a small clinic gets one recoverable action for a bad document, file, or price-list payload without seeing schema internals.
Middle: support staff can retry ingestion/analyzer work without interpreting `rawText`, `payload`, or attestation fields.
High: future document templates can keep strict typed payload schemas while exposing role-specific route messages.
Ultra: multi-tenant deployments can keep exact validation diagnostics in telemetry and still return bounded public copy per workflow.

## Hardware Impact

Evidence class: API_RUNTIME_SMOKE plus STATIC_SOURCE plus API_BUILD plus WEB_BUILD. Runtime frame microseconds saved: 0 measured. Added cost is invalid-request safeParse and string mapping only; no DICOM render, speech, finance, schedule, import parsing, or UI hot loop changed. Low-end i3/MX350 impact is effectively 0. Bundle-budget smoke was intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/api`, `npm run typecheck -w @dental/shared`, `npm run build -w @dental/api`, `npm run smoke:document-route-validation`, `npm run smoke:document-guards`, `npm run smoke:document-payloads`, `npm run smoke:document-zip-redaction`, `npm run smoke:pricelist-analyzer`, `npm run smoke:api-text-encoding`, `npm run smoke:clinical-mutation-guard`, `npm run typecheck -w @dental/web`, `npm run smoke:settings-view-source`, `npm run build -w @dental/web`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, `npm run smoke:dicom-folder-workup`, `npm run smoke:document-lifecycle`, `npm run smoke:documents-catalog`, `npm run smoke:document-html-issue-guards`, `npm run smoke:import-contracts`, and `npm run build -w @dental/shared` passed. Web build kept the existing large `workspace` chunk warning. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind. `npm run smoke:web-bundle-budget` was intentionally skipped as a gate by explicit instruction.

---
Date: 2026-06-03

## Problem

Core clinic workflow routes still exposed invalid request details through direct zod parsing or joined zod issue text. Patient create/update, schedule appointment create/update, billing payment create, AI job/draft routes, communication task completion, and clinical-rule evaluate/create/update could return `issues`, schema paths, or implementation fields such as `doctorUserId`, `startsAt`, `amountRub`, `inputText`, `taskId`, or `triggerServiceIds`.

## Solution

Added route-owned validation boundaries in `patients.ts`, `schedule.ts`, `billing.ts`, `ai.ts`, `communications.ts`, and `clinical.ts`. Invalid bodies now return stable Russian operator actions before mutation or AI/clinical-rule work runs. Added `smoke:core-route-validation`, which checks targeted source guards and invalid compiled Fastify responses under production-style clinical and schedule secrets. Updated `smoke:patient-create-contract` to assert the public API error shape separately from direct domain invariant checks.

## Rejected Alternatives

- Keep global zod handler for core routes: rejected because these endpoints are doctor/front-desk/admin workflows, not developer consoles.
- Sanitize individual zod issue text: rejected because field names are still route internals and often not the operator's mental model.
- Patch only patient and schedule routes: rejected because AI draft, communication tasks, billing, and clinical rules are the same next-action surface.
- Replace all API validation globally: rejected for this slice because route-specific messages are clearer and avoid changing unrelated settings/speech/Telegram routes in one risky edit.

## Scalability Potential

Low: front desk and doctors get one actionable recovery message on weak clinic hardware without schema jargon.
Middle: admins can retry payment, schedule, patient, task, AI draft, and rule changes without support interpreting DTO field names.
High: future auth/tenant routes can preserve strict shared schemas while adding role-specific public copy per workflow.
Ultra: production deployments can keep exact validation diagnostics in telemetry while returning bounded copy to users across every core clinical mutation path.

## Hardware Impact

Evidence class: API_RUNTIME_SMOKE plus STATIC_SOURCE plus API_BUILD plus WEB_BUILD. Runtime frame microseconds saved: 0 measured. Added cost is invalid-request safeParse and string mapping only; no DICOM render, speech provider, finance ledger, schedule polling, import parsing, or UI hot loop changed. Low-end i3/MX350 impact is effectively 0. Bundle-budget smoke was intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/api`, `npm run build -w @dental/api`, `npm run smoke:core-route-validation`, `npm run smoke:api-text-encoding`, `npm run smoke:patient-create-contract`, `npm run smoke:schedule-active-visit-status-contract`, `npm run smoke:schedule-admin-guard`, `npm run smoke:billing-document-link`, `npm run smoke:communication-task-complete-contract`, `npm run smoke:clinical-rule-contract`, `npm run smoke:finance-view-source`, `npm run smoke:payment-capture-source`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/web`, `npm run build -w @dental/shared`, `npm run build -w @dental/web`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, `npm run smoke:settings-view-source`, `npm run smoke:clinical-mutation-guard`, `npm run smoke:document-route-validation`, `npm run smoke:import-contracts`, and `npm run smoke:dicom-folder-workup` passed. Web build kept the existing large `workspace` chunk warning. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind. `npm run smoke:web-bundle-budget` was intentionally skipped as a gate by explicit instruction.

---
Date: 2026-06-03

## Problem

Settings routes still parsed request bodies directly or joined zod issue text. Invalid UI preferences, clinic mode/profile, staff, chair, or working-hours payloads could expose `issues`, parser paths, or settings DTO keys such as `uiLanguage`, `clinicName`, `medicalLicenseIssuedAt`, `workingHours`, `staffId`, or `chairId` to clinic owners during setup.

## Solution

Added `parseSettingsPayload` in `routes/settings.ts` and routed preferences, clinic mode/profile, staff create, staff hours, chair create, and chair hours through stable route-owned Russian messages. Added `smoke:settings-route-validation`, which checks source guards and invalid compiled Fastify route responses under a production-style settings admin secret. Updated the product risk audit to record the settings validation boundary.

## Rejected Alternatives

- Leave settings raw because they are admin-only: rejected because clinic owners/admins are product users, not developers.
- Sanitize individual zod issue messages: rejected because settings forms need recovery actions, not DTO field names.
- Patch only clinic profile: rejected because preferences, staff, chair, and hours are the same onboarding/setup surface.
- Move this into a global validator mapper: rejected for this slice because route-specific settings copy is clearer and does not change unrelated speech/visit/Telegram routes.

## Scalability Potential

Low: a solo clinic can recover from bad setup payloads without seeing schema internals.
Middle: admins can correct staff, chair, schedule, and profile settings without support interpreting DTO keys.
High: future onboarding/settings modules can reuse route-owned copy while preserving strict shared schemas.
Ultra: multi-branch deployments can keep exact validation diagnostics in telemetry while showing bounded setup guidance to clinic owners.

## Hardware Impact

Evidence class: API_RUNTIME_SMOKE plus STATIC_SOURCE plus API_BUILD plus WEB_BUILD. Runtime frame microseconds saved: 0 measured. Added cost is invalid-request safeParse and string mapping only; no DICOM render, speech provider, finance ledger, schedule polling, import parsing, or UI hot loop changed. Low-end i3/MX350 impact is effectively 0. Bundle-budget smoke was intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/api`, `npm run build -w @dental/api`, `npm run smoke:settings-route-validation`, `npm run smoke:settings-admin-guard`, `npm run smoke:settings-preferences`, `npm run smoke:settings-view-source`, `npm run smoke:api-text-encoding`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/web`, `npm run build -w @dental/shared`, `npm run smoke:clinical-mutation-guard`, `npm run smoke:core-route-validation`, `npm run smoke:document-route-validation`, `npm run build -w @dental/web`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, `npm run smoke:import-contracts`, `npm run smoke:dicom-folder-workup`, `npm run smoke:settings-persistence-file`, and `npm run smoke:ui-preferences` passed. Web build kept the existing large `workspace` chunk warning. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind. `npm run smoke:web-bundle-budget` was intentionally skipped as a gate by explicit instruction.

---
Date: 2026-06-03

## Problem

Visit draft autosave and accept routes still parsed merged `request.body` payloads directly. Invalid doctor autosave or draft-accept requests could fall into zod/global validation and expose `issues`, parser paths, or workflow fields such as `patientId`, `selectedSpecialty`, `clientMutationId`, `doctorSummary`, `complaint`, `diagnosis`, or `treatmentPlan` before route business guards ran.

## Solution

Added `parseVisitPayload` in `routes/visits.ts` and routed draft autosave and draft accept through stable doctor-facing validation messages. Invalid bodies now stop before `upsertVisitDraftAutosave`, `acceptVisitDraft`, active visit mutation, audit writes, revision changes, or save receipt creation. Added `smoke:visit-route-validation`, which checks source guards and invalid compiled Fastify responses under a production-style clinical admin secret.

## Rejected Alternatives

- Keep global zod handling for visit draft routes: rejected because autosave/accept are doctor continuity paths, not developer diagnostics.
- Sanitize individual zod issue text: rejected because DTO fields are still implementation details and leak the route model.
- Fold visits into `smoke:core-route-validation`: rejected for this slice because visit autosave/accept need focused pre-mutation checks separate from patient/schedule/billing validation.
- Change `sampleData` mutation functions: rejected because the defect is at the API boundary and existing revision/audit/idempotency behavior must stay intact.

## Scalability Potential

Low: a solo doctor gets one recovery action when a draft payload is malformed, without losing the current visit to schema jargon.
Middle: clinic workstations can retry autosave/accept without support interpreting EMR DTO names.
High: future visit draft endpoints can keep strict shared schemas while exposing role-specific doctor copy.
Ultra: multi-branch deployments can keep exact validation diagnostics in server telemetry while returning bounded copy at the clinical route boundary.

## Hardware Impact

Evidence class: API_RUNTIME_SMOKE plus STATIC_SOURCE plus API_BUILD. Runtime frame microseconds saved: 0 measured. Added cost is invalid-request safeParse and string mapping only; no DICOM render, speech provider, finance ledger, schedule polling, import parsing, or UI hot loop changed. Low-end i3/MX350 impact is effectively 0. Bundle-budget smoke is intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

Initial proof passed: `npm run typecheck -w @dental/api`, `npm run typecheck -w @dental/shared`, `npm run build -w @dental/api`, `npm run smoke:visit-route-validation`, `npm run smoke:visit-draft-status-contract`, `npm run smoke:schedule-active-visit-status-contract`, and `npm run smoke:clinical-mutation-guard`. Full cross-surface verification is continuing and will be recorded in `Status_DENTE.md` and `LOG_DENTE.md`.

---
Date: 2026-06-03

## Problem

Speech recording strategy and speech chunk upload routes still parsed `request.body` directly. Invalid strategy/chunk payloads could fall into zod/global validation and expose `issues`, parser paths, or DTO fields such as `expectedDurationMs`, `networkState`, `recordingId`, `chunkIndex`, `audioBase64`, `localTranscript`, `patientId`, or `visitId` before recording strategy, clinical scope, queue, or provider work ran.

## Solution

Added `parseSpeechPayload` in `routes/speech.ts` and routed recording strategy and chunk upload through stable operator validation messages. Existing transcript polish already used a bounded message, and `smoke:speech-route-validation` now covers all three invalid-payload routes on compiled Fastify output. Provider/gateway errors and speech scope errors were left on their existing route because their separate smokes already prove sanitized provider copy and clinical ownership.

## Rejected Alternatives

- Keep direct parse on strategy because it is a read route: rejected because Settings/Visit recording diagnostics are product surfaces.
- Sanitize individual zod issue text: rejected because speech DTO keys are not the doctor's mental model.
- Move invalid chunk handling into provider code: rejected because malformed requests must stop before clinical scope, queue, or provider branches.
- Rewrite speech gateway validation globally: rejected because provider failure copy, corrupt audio copy, and route-body validation are separate contracts with separate tests.

## Scalability Potential

Low: a weak workstation gets one recovery action for malformed dictation payloads before any provider work starts.
Middle: clinics can retry chunk upload or strategy calculation without support interpreting speech DTO keys.
High: future local/native/mobile dictation routes can keep strict shared schemas while returning role-specific route copy.
Ultra: multi-provider deployments can keep exact validation diagnostics in server telemetry while returning bounded copy before provider/key-pool execution.

## Hardware Impact

Evidence class: API_RUNTIME_SMOKE plus STATIC_SOURCE plus API_BUILD plus WEB_BUILD. Runtime frame microseconds saved: 0 measured. Added cost is invalid-request safeParse and string mapping only; valid speech provider, queue, key-rotation, DICOM render, finance ledger, schedule polling, import parsing, and UI hot loops are unchanged. Low-end i3/MX350 impact is effectively 0. Bundle-budget smoke is intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/api`, `npm run build -w @dental/api`, `npm run smoke:speech-route-validation`, `npm run smoke:speech-provider-errors`, `npm run smoke:speech-clinical-scope`, `npm run smoke:speech-queue-source`, `npm run smoke:speech-groq-chunk-floor`, `npm run smoke:speech-key-rotation`, `npm run smoke:clinical-mutation-guard`, `npm run smoke:api-text-encoding`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/web`, `npm run build -w @dental/shared`, `npm run build -w @dental/web`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, `npm run smoke:shift-visit-usability-source`, `npm run smoke:import-contracts`, `npm run smoke:dicom-folder-workup`, and `npm run smoke:settings-view-source` passed. Web build kept the existing large `workspace` chunk warning. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind. Bundle-budget smoke was intentionally skipped as a gate by explicit instruction.

---
Date: 2026-06-03

## Problem

The global Fastify error handler still treated zod validation as a diagnostics payload and returned raw `issues`. Route-owned safeParse now covers many clinical paths, but one future direct parse could still expose schema paths, parser codes, and DTO field names in a browser-visible API response.

## Solution

Changed the global API fallback to return a single bounded validation message for any zod validation exception. Split server startup into `createDenteApiApp` and `startDenteApiServer`, with listener and Telegram due-worker side effects only on the entry point path. Added `smoke:api-global-error-boundary` so compiled Fastify runtime proves both synthetic zod and technical exceptions are sanitized.

## Rejected Alternatives

- Keep route-only validation hardening: rejected because future routes can miss route-owned parsing and the global boundary must still protect clinic copy.
- Map zod issue messages into Russian strings: rejected because issue `path`, `code`, and field names remain implementation details.
- Keep a source-only smoke: rejected because the real Fastify error handler needs runtime proof through `app.inject`.
- Start the normal server during smoke: rejected because binding ports and starting Telegram due-worker delivery are unrelated side effects.

## Scalability Potential

Low: a solo clinic sees one recovery message for malformed unknown payloads instead of schema internals.
Middle: admins can correct bad forms without support interpreting DTO paths.
High: new API modules can rely on a documented last-resort safety boundary while still owning route-specific copy where needed.
Ultra: multi-branch deployments can keep exact validation diagnostics in logs/tests while returning bounded operator copy at every API edge.

## Hardware Impact

Evidence class: API_RUNTIME_SMOKE plus STATIC_SOURCE plus API_BUILD plus WEB_BUILD. Runtime frame microseconds saved: 0 measured. Added cost is invalid-request error classification and one fixed string only; valid DICOM render, speech provider, finance ledger, schedule polling, import parsing, Telegram worker, and UI hot loops are unchanged. Low-end i3/MX350 impact is effectively 0. Bundle-budget smoke is intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/api`, `npm run build -w @dental/api`, `npm run typecheck -w @dental/shared`, `npm run build -w @dental/shared`, `npm run typecheck -w @dental/web`, `npm run build -w @dental/web`, `npm run smoke:api-global-error-boundary`, `npm run smoke:api-text-encoding`, `npm run smoke:clinical-mutation-guard`, `npm run smoke:telegram-due-worker-source`, `npm run smoke:core-route-validation`, `npm run smoke:visit-route-validation`, `npm run smoke:speech-route-validation`, `npm run smoke:document-route-validation`, `npm run smoke:settings-route-validation`, `npm run smoke:import-contracts`, `npm run smoke:dicom-folder-workup`, `npm run smoke:speech-provider-errors`, `npm run smoke:speech-clinical-scope`, `npm run smoke:settings-view-source`, `npm run smoke:shift-visit-usability-source`, `npm run smoke:visit-draft-status-contract`, `npm run smoke:schedule-active-visit-status-contract`, `npm run smoke:web-text-encoding`, and `npm run smoke:web-code-split-source` passed. Web build kept the existing large `workspace` chunk warning. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Process check found no DENTE build/test process left behind. Bundle-budget smoke was intentionally skipped as a gate by explicit instruction.

---
Date: 2026-06-03

## Problem

`PUT /api/settings/telegram` still used `updateDenteTelegramBotSettingsSchema.parse(request.body)` directly. Existing business validation copy handled URL and signed-button reasons, but malformed payload shape could still pass through a zod exception path before settings mutation and expose schema detail if the global fallback changed or a test used a local raw handler.

## Solution

Moved Telegram settings body validation to the existing `parseTelegramRouteBody` helper before calling `updateDenteTelegramBotSettings`. Kept `readableTelegramSettingsValidationMessage` for post-parse business validation such as unsafe URLs and missing signed-button secrets. Extended `smoke:telegram-validation` to reject the direct parse source pattern and inject a malformed `PUT /api/settings/telegram` request through compiled Fastify.

## Rejected Alternatives

- Keep direct schema parse and rely on global zod fallback: rejected because Telegram settings is a control-plane route and should own the same boundary as webhook/outbox/link-code/preview.
- Send all settings errors through the generic Telegram message: rejected because URL fields and signed-button setup have useful operator labels after a structurally valid payload.
- Add a new parser just for settings: rejected because `parseTelegramRouteBody` already owns the bounded malformed-payload copy for Telegram routes.
- Source-only smoke: rejected because the compiled route response must prove no raw schema detail or secret leakage.

## Scalability Potential

Low: a solo clinic can save Telegram settings with one clear correction path when payload shape is bad.
Middle: admins can fix bot configuration without seeing DTO field paths or zod issue arrays.
High: future Telegram settings fields inherit the same route-body boundary while business validation keeps targeted operator copy.
Ultra: multi-bot/multi-branch control planes can keep exact validation diagnostics in tests/logs while every public settings edge returns bounded copy.

## Hardware Impact

Evidence class: API_RUNTIME_SMOKE plus STATIC_SOURCE plus API_BUILD plus WEB_BUILD. Runtime frame microseconds saved: 0 measured. Added cost is invalid-request try/parse and a fixed message only; valid Telegram settings save, outbox worker, webhook handling, DICOM render, speech provider, finance ledger, schedule polling, import parsing, and UI hot loops are unchanged. Low-end i3/MX350 impact is effectively 0. Bundle-budget smoke is intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/api`, `npm run build -w @dental/api`, `npm run smoke:telegram-validation`, `npm run smoke:telegram-admin-guard`, `npm run smoke:telegram-due-worker-source`, `npm run smoke:telegram-control-ui-source`, `npm run smoke:telegram-url-ui-source`, `npm run smoke:api-text-encoding`, `npm run smoke:api-global-error-boundary`, `npm run smoke:settings-route-validation`, `npm run smoke:settings-admin-guard`, `npm run typecheck -w @dental/shared`, `npm run build -w @dental/shared`, `npm run typecheck -w @dental/web`, `npm run build -w @dental/web`, `npm run smoke:web-text-encoding`, and `npm run smoke:web-code-split-source` passed. Web build kept the existing large `workspace` chunk warning. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Process check found no DENTE build/test process left behind. Bundle-budget smoke was intentionally skipped as a gate by explicit instruction.

---
Date: 2026-06-03

## Problem

Speech clinical-scope failures still used the public `error` field as human copy. Missing scope and mismatched visit/patient responses were correct in status code, but the API contract had no stable machine code and could drift back toward `visitId`, `patientId`, request-query, or helper-name leakage.

## Solution

Made speech scope failures return `SpeechClinicalScopeError` plus a separate Russian operator `message`. Routed chunk upload, chunk audit, recovery, and assembly through one response helper. Extended `smoke:speech-clinical-scope` to assert the body contract for missing visit scope, unknown patient, unknown visit, mismatched patient, missing audit scope, mismatched recovery scope, and mismatched assemble scope. The same smoke now proves damaged audio, dental prompt setup warnings, and local rule-parser draft warnings stay clinic-readable and hide env/parser/base64/byte jargon.

## Rejected Alternatives

- Keep human copy in `error`: rejected because clients need a stable error code and translation should not break integrations.
- Return ids in public failures for support: rejected because clinical-scope failures are PHI boundary events, not diagnostics payloads.
- Rely on the global zod fallback: rejected because scope validation is business logic after schema parse and needs route-owned copy.
- Add a new speech error-code enum everywhere: rejected because this slice only needs one stable scope code and bounded messages.

## Scalability Potential

Low: a single-chair clinic sees direct recovery copy when dictation is scoped to the wrong patient or visit.
Middle: admins can triage damaged chunks and prompt/parser setup without seeing DTO or environment names.
High: multi-provider speech routing can keep route-owned scope errors while provider/key-pool diagnostics stay in server telemetry.
Ultra: multi-branch deployments can key automation on `SpeechClinicalScopeError` and localize messages without changing the public transport code.

## Hardware Impact

Evidence class: API_RUNTIME_SMOKE plus STATIC_SOURCE plus API_BUILD plus WEB_BUILD. Runtime frame microseconds saved: 0 measured. Added cost is one fixed object allocation on invalid speech-scope requests only; valid dictation upload, provider calls, key rotation, queue flush, DICOM render, finance ledger, schedule polling, import parsing, and UI hot loops are unchanged. Low-end i3/MX350 impact is effectively 0. Bundle-budget smoke is intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/api`, `npm run build -w @dental/api`, `npm run smoke:speech-clinical-scope`, `npm run smoke:speech-route-validation`, `npm run smoke:speech-provider-errors`, `npm run smoke:speech-queue-source`, `npm run smoke:speech-groq-chunk-floor`, `npm run smoke:api-text-encoding`, `npm run smoke:api-global-error-boundary`, `npm run typecheck -w @dental/shared`, `npm run build -w @dental/shared`, `npm run typecheck -w @dental/web`, `npm run build -w @dental/web`, `npm run smoke:web-text-encoding`, and `npm run smoke:web-code-split-source` passed. Web build kept the existing large `workspace` chunk warning. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind. Bundle-budget smoke was intentionally skipped as a gate by explicit instruction.

---
Date: 2026-06-03

## Problem

Billing payment creation already had route-owned schema validation, but valid payloads linked to the wrong patient, visit, or document still returned human Russian text directly in the public `error` field. Status codes were correct; the API body contract was not. That makes integrations fragile and risks leaking route-id vocabulary such as `patientId`, `visitId`, or `documentId` back into clinic-visible failures.

## Solution

Added one billing payment scope response helper that returns `BillingPaymentScopeError` plus a separate Russian operator `message`. Replaced patient, visit, document, voided-document, and non-financial-document link failures with that helper. Extended `smoke:billing-document-link` to assert the stable code, useful message, and absence of route/schema/parser terms for unknown patient, unknown visit, unknown document, wrong-patient document, and non-financial document cases.

## Rejected Alternatives

- Keep Russian text in `error`: rejected because `error` is the machine contract and should not change when copy changes.
- Use `BillingValidationError` for everything: rejected because malformed payload and wrong clinical-finance link are different failure classes.
- Return ids in the failure body for support: rejected because payment scope failures are audit boundary events, not diagnostics payloads.
- Add a full billing error enum: rejected because this slice only needs one stable public scope class and route-owned messages.

## Scalability Potential

Low: a solo clinic sees a direct correction when an operator links a payment to the wrong document.
Middle: finance/admin UI can key on one stable scope error while showing localized copy.
High: future payment-document reconciliation can add more link checks without exposing DTO ids.
Ultra: multi-branch finance automation can separate malformed payloads from clinical-finance scope failures across clinics.

## Hardware Impact

Evidence class: API_RUNTIME_SMOKE plus STATIC_SOURCE plus API_BUILD. Runtime frame microseconds saved: 0 measured. Added cost is one invalid-request response object on rejected billing scope/link requests only; valid payment creation, document rendering, DICOM render, speech provider, schedule polling, import parsing, and UI hot loops are unchanged. Low-end i3/MX350 impact is effectively 0. Bundle-budget smoke is intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/api`, `npm run build -w @dental/api`, `npm run smoke:billing-document-link`, `npm run smoke:core-route-validation`, `npm run smoke:payment-capture-source`, `npm run smoke:clinical-mutation-guard`, `npm run typecheck -w @dental/shared`, `npm run build -w @dental/shared`, `npm run typecheck -w @dental/web`, `npm run smoke:api-text-encoding`, `npm run build -w @dental/web`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, and `npm run smoke:finance-view-source` passed. Web build kept the existing large `workspace` chunk warning. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind. Bundle-budget smoke is intentionally not used as a gate after the explicit directive that gzip size is not the objective.

---
Date: 2026-06-03

## Problem

Imaging study lookup and scope failures still mixed public operator copy with machine error fields. Viewer-session and preview lookups exposed English not-found strings, while study creation put Russian clinical-scope text directly into `error`. Status codes were mostly correct, but the public body contract was unstable and could leak route vocabulary such as `patientId`, `visitId`, `studyId`, `request.body`, or parser names back to API consumers.

## Solution

Added two bounded imaging response helpers: `ImagingStudyNotFound` for missing study lookups and `ImagingStudyScopeError` for valid create payloads linked to missing or mismatched clinical context. Viewer-session read/save, preview lookup, missing patient, missing visit, visit-patient mismatch, and clinic mismatch now return stable codes plus separate Russian `message` copy. Expanded `smoke:imaging-study-visit-scope` to assert body shape, Russian message presence, and absence of route/schema/parser internals for runtime cases and source guards.

## Rejected Alternatives

- Keep English `Study not found` in `error`: rejected because it is visible copy masquerading as a machine code.
- Reuse payload validation errors for clinical scope failures: rejected because malformed payload and valid payload against the wrong visit/patient are different failure classes.
- Return ids in public failures for debugging: rejected because imaging scope failures sit on a clinical data boundary, not a diagnostics channel.
- Build a broad imaging error taxonomy now: rejected because this slice needed one lookup code, one scope code, and smoke proof without touching DICOM import/render hot paths.

## Scalability Potential

Low: a small clinic gets clear correction messages when an image is linked to a missing or wrong visit.
Middle: web/API clients can branch on stable imaging failure classes without parsing Russian copy.
High: multi-clinic deployments can localize messages while preserving one transport contract for viewer sessions, previews, and study creation.
Ultra: future DICOM adapters and external viewer bridges can reuse the same lookup/scope boundary without exposing adapter or DTO internals.

## Hardware Impact

Evidence class: API_RUNTIME_SMOKE plus STATIC_SOURCE plus API_BUILD plus WEB_BUILD. Runtime frame microseconds saved: 0 measured. Added cost is one invalid-request response object on rejected imaging lookup/scope requests only; valid DICOM folder workup, viewer session persistence, preview generation for existing studies, speech provider calls, finance ledger, schedule polling, import parsing, and UI hot loops are unchanged. Low-end i3/MX350 impact is effectively 0. Bundle-budget smoke is intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/api`, `npm run build -w @dental/api`, `npm run smoke:imaging-study-visit-scope`, `npm run smoke:dicom-folder-workup`, `npm run smoke:clinical-mutation-guard`, `npm run smoke:api-text-encoding`, `npm run typecheck -w @dental/shared`, `npm run build -w @dental/shared`, `npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run build -w @dental/web`, `npm run smoke:web-text-encoding`, and `npm run smoke:web-code-split-source` passed. Web build kept the existing large `workspace` chunk warning. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE build/test process left behind. Bundle-budget smoke is intentionally not used as a gate after the explicit directive that gzip size is not the objective.

---
Date: 2026-06-03

## Problem

AI recognition scope failures still used the public `error` field as operator copy. Unknown patient, unknown imaging study, wrong-patient imaging links, and visit-note draft missing-patient cases were status-correct, but the API body contract was unstable and could regress toward `patientId`, `imagingStudyId`, `request.body`, parser/schema, or null/undefined wording.

## Solution

Added two bounded AI scope response helpers. Recognition job scope failures now return `AiRecognitionScopeError`; visit-note draft missing-patient failures return `VisitNoteDraftScopeError`. Both carry separate Russian operator `message` text. Expanded `smoke:ai-recognition-scope` from status checks to body checks, including source guards and runtime leakage rejection for ids, DTO fields, request-shape text, parser/schema terms, and null/undefined internals.

## Rejected Alternatives

- Keep human copy in `error`: rejected because `error` is the stable API machine field.
- Reuse malformed-payload validation codes for scope failures: rejected because valid input linked to a missing/wrong clinical object is not malformed payload.
- Return ids for support: rejected because AI draft scope failures are clinical/image boundary events, not diagnostics payloads.
- Add a broad AI error taxonomy now: rejected because this slice needed two public scope codes without changing the AI/draft model.

## Scalability Potential

Low: a solo clinic sees a direct patient/image correction without route ids.
Middle: the browser can branch on stable AI scope codes while showing localized copy.
High: future AI worker/provider adapters can keep server diagnostics private while preserving the same transport contract.
Ultra: multi-branch AI draft queues can separate malformed payloads from clinical/image scope failures without parsing Russian text.

## Hardware Impact

Evidence class: API_RUNTIME_SMOKE plus STATIC_SOURCE plus API_BUILD. Runtime frame microseconds saved: 0 measured. Added cost is one invalid-request response object only on rejected AI scope calls; valid recognition job creation, deterministic visit draft parsing, speech provider calls, DICOM render, finance, schedule, import, and UI hot loops are unchanged. Low-end i3/MX350 impact is effectively 0. Bundle-budget smoke is intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/api`, `npm run typecheck -w @dental/shared`, `npm run build -w @dental/api`, `npm run smoke:ai-recognition-scope`, `npm run smoke:core-route-validation`, `npm run smoke:clinical-mutation-guard`, and `npm run smoke:api-text-encoding` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE node/npm/vite/tsx/tsc/csc build or test process left behind; an unrelated Unity Roslyn `dotnet ... VBCSCompiler.dll` process was already present and was not touched. Bundle-budget smoke is intentionally not used as a gate after the explicit directive that gzip size is not the objective.

---
Date: 2026-06-03

## Problem

Patient update and administrative-profile routes still forwarded domain exception text into the public `error` field. The visible text was Russian, but it was still `error.message` and the route also carried raw `patientId` wording for missing route params. That weakens the same public contract already hardened for AI, speech, billing, and imaging.

## Solution

Added bounded patient response helpers. Missing route params return `PatientRouteValidationError` plus operator copy, and missing patient records return `PatientNotFound` plus a separate Russian `message`. Extended `smoke:patient-create-contract` beyond create validation so it now asserts source guards and runtime body shape for missing patient core update and administrative-profile update.

## Rejected Alternatives

- Keep forwarding domain `error.message`: rejected because domain exceptions are internal control flow, not stable transport codes.
- Reuse `PatientValidationError` for lookup failures: rejected because valid payload against a missing patient card is not malformed input.
- Add separate administrative-profile not-found code: rejected because the missing entity is still the patient card.
- Update only source guards: rejected because compiled Fastify injection must prove public response bodies.

## Scalability Potential

Low: a one-chair clinic sees a clear recovery action when a stale patient card is edited.
Middle: browser forms can branch on `PatientNotFound` without parsing Russian copy.
High: future auth/tenant scoping can reuse the same missing-card boundary without exposing route ids.
Ultra: multi-branch sync/conflict UI can separate malformed patient data from stale/missing record edits.

## Hardware Impact

Evidence class: API_RUNTIME_SMOKE plus STATIC_SOURCE plus API_BUILD. Runtime frame microseconds saved: 0 measured. Added cost is one invalid-request response object only on rejected patient lookup/route failures; valid patient create/update, administrative profile save, dashboard, schedule, DICOM render, speech, finance, import, and UI hot loops are unchanged. Low-end i3/MX350 impact is effectively 0. Bundle-budget smoke is intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/api`, `npm run typecheck -w @dental/shared`, `npm run build -w @dental/api`, `npm run smoke:patient-create-contract`, `npm run smoke:core-route-validation`, `npm run smoke:clinical-mutation-guard`, and `npm run smoke:api-text-encoding` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings in web files. Process check found no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind; unrelated Unity Roslyn `dotnet ... VBCSCompiler.dll` was already present and was not touched. Bundle-budget smoke is intentionally not used as a gate after the explicit directive that gzip size is not the objective.

---
Date: 2026-06-03

## Problem

Schedule create/update routes had bounded payload validation, but mutation rejections still proxied domain exception text into public `message`. Active visit locks, missing appointments, resource overlaps, missing assistant/resource data, invalid merged times, and outside-hours checks were status-correct but exposed internal exception wording and made tests depend on domain messages.

## Solution

Rebuilt `routes/schedule.ts` around route-owned response classification. Domain exceptions are normalized for private classification only, then returned as stable `code`, bounded `reason`, and Russian `message`. Added `AppointmentNotFound`, `active_visit_locked`, `resource_overlap`, `resource_missing`, `time_invalid`, `outside_operational_hours`, and fallback `mutation_rejected` transport reasons. Updated schedule smokes to reject raw zod issues, `appointmentId`, DTO keys, parser/schema terms, raw outside-hours prefixes, null, and undefined in public schedule failure bodies.

## Rejected Alternatives

- Keep forwarding `error.message`: rejected because domain exceptions are not stable API copy.
- Put all failures under one generic rejection: rejected because UI and operators need bounded but useful reasons.
- Expose raw appointment/resource ids for debugging: rejected because schedule mutation failures are clinic workflow boundaries, not diagnostics payloads.
- Keep invalid calendar/hour tests checking zod paths: rejected because route-owned validation must not return zod issue arrays.

## Scalability Potential

Low: a single-chair clinic gets clear schedule recovery messages without seeing route ids.
Middle: browser rows can branch on `reason` enums instead of parsing Russian text.
High: future tenant/auth scope can map not-found, overlap, and active-visit locks consistently across branches.
Ultra: sync/conflict UI can separate stale appointment rows, resource collisions, and clinical visit locks without exposing domain internals.

## Hardware Impact

Evidence class: API_RUNTIME_SMOKE plus STATIC_SOURCE plus API_BUILD plus WEB_TYPECHECK. Runtime frame microseconds saved: 0 measured. Added cost is one invalid-request response object and one string classification only on rejected appointment mutations; valid appointment create/update, dashboard build, schedule UI render, settings, clinical mutation guard, DICOM, speech, finance, imports, and web route chunks are unchanged. Low-end i3/MX350 impact is effectively 0. Bundle-budget smoke is intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/api`, `npm run typecheck -w @dental/shared`, `npm run build -w @dental/api`, `npm run smoke:schedule-configuration`, `npm run smoke:schedule-active-visit-status-contract`, `npm run smoke:schedule-admin-guard`, `npm run smoke:core-route-validation`, `npm run smoke:api-text-encoding`, `npm run smoke:clinical-mutation-guard`, `npm run typecheck -w @dental/web`, `npm run smoke:schedule-view-source`, `npm run smoke:web-text-encoding`, and `npm run smoke:web-code-split-source` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings in web files. Process check found no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind; unrelated Unity Roslyn `dotnet ... VBCSCompiler.dll` was already present and was not touched. Bundle-budget smoke is intentionally not used as a gate after the explicit directive that gzip size is not the objective.

---
Date: 2026-06-03

## Problem

Settings and communications still had status-correct but weak mutation failures. Settings profile/staff/chair routes could proxy domain exception text into public bodies, and communication task completion returned the domain not-found exception as public `message`. That left stale UI actions and schedule narrowing failures dependent on internal Russian exception strings.

## Solution

Added route-owned settings classifiers for clinic profile schedule conflicts, staff/chair missing resources, and staff/chair active-appointment conflicts. Public settings failures now use `ClinicProfileMutationRejected`, `StaffScheduleNotFound`, `ChairScheduleNotFound`, `StaffScheduleRejected`, or `ChairScheduleRejected` plus bounded `reason` and Russian `message`. Communication task not-found now returns `CommunicationTaskNotFound`, `reason: task_not_found`, and route-owned copy.

## Rejected Alternatives

- Keep forwarding `error.message`: rejected because domain exceptions are internal control flow.
- Use `StaffWorkingHours*` / `ChairWorkingHours*` as machine codes: rejected because `workingHours` is a DTO key and should not appear in public rejection codes.
- Fold settings lookup/conflict failures into `SettingsValidationError`: rejected because valid payloads rejected by state are not malformed request bodies.
- Rely on status-only smoke checks: rejected because the prior weak state already had correct status codes.

## Scalability Potential

Low: a single-chair clinic sees clear stale-resource and schedule-conflict recovery messages.
Middle: browser settings and communication actions can branch on stable codes/reasons without parsing Russian copy.
High: future auth/tenant enforcement can map stale resource, schedule conflict, and communication task lookup failures consistently.
Ultra: sync/conflict handling can separate malformed settings payloads, stale staff/chair resources, active-appointment blockers, and stale communication task actions without exposing domain exceptions.

## Hardware Impact

Evidence class: API_RUNTIME_SMOKE plus STATIC_SOURCE plus API_BUILD plus WEB_BUILD. Runtime frame microseconds saved: 0 measured. Added cost is one string classification and one invalid-request response object only on rejected settings/communication mutations; valid clinic settings, schedule dashboard, communications completion, DICOM, speech, finance, import, and web hot paths are unchanged. Low-end i3/MX350 impact is effectively 0. Bundle-budget smoke is intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/api`, `npm run typecheck -w @dental/shared`, `npm run build -w @dental/api`, `npm run smoke:settings-route-validation`, `npm run smoke:schedule-configuration`, `npm run smoke:communication-task-complete-contract`, `npm run smoke:core-route-validation`, `npm run smoke:settings-admin-guard`, `npm run smoke:settings-persistence-file`, `npm run smoke:api-text-encoding`, `npm run smoke:clinical-mutation-guard`, `npm run smoke:schedule-admin-guard`, `npm run smoke:communications-view-source`, `npm run typecheck -w @dental/web`, `npm run build -w @dental/web`, `npm run smoke:settings-view-source`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, and `npm run smoke:api-global-error-boundary` passed. `smoke:settings-persistence-file` emitted its corrupt-state probe warnings and exited 0. `git diff --check` reported no whitespace errors, only existing CRLF warnings in web files. Process check found no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc`/`dotnet` process left behind. Bundle-budget smoke is intentionally not used as a gate after the explicit directive that gzip size is not the objective.

---
Date: 2026-06-03

## Problem

Visit draft autosave/accept routes already hid malformed payload details, but state failures still derived public responses from domain exception text. Closed signed/voided visits and unknown visit autosave were status-correct, but the response body did not prove stable `reason` or separation between machine code and operator copy.

## Solution

Added a private visit draft domain-message classifier and route-owned public responses. Unknown visits now return `VisitNotFound`, `reason: visit_not_found`, and bounded Russian copy. Closed visits now return `VisitDraftMutationRejected`, `reason: visit_closed`, and operation-specific Russian copy for autosave vs accept without repeating the raw domain exception phrase.

## Rejected Alternatives

- Keep forwarding the closed-visit exception phrase in `message`: rejected because the smoke correctly treated identical domain copy as raw exception leakage.
- Use one generic visit draft message for autosave and accept: rejected because the operator action differs.
- Throw unknown mutation errors into the global 500 path: rejected for known visit draft state failures because they are recoverable workflow states.
- Rely on status-only smoke checks: rejected because the prior weak state already returned correct 404/409 statuses.

## Scalability Potential

Low: a solo doctor sees clear recovery copy when a stale tab tries to save a closed visit.
Middle: browser autosave and accept flows can branch on `visit_closed` / `visit_not_found` without parsing Russian text.
High: future role/session enforcement can reuse the same missing/closed visit boundary.
Ultra: offline sync conflict UI can separate malformed draft payloads, stale visit identity, and closed-record protection without exposing domain exceptions.

## Hardware Impact

Evidence class: API_RUNTIME_SMOKE plus STATIC_SOURCE plus API_BUILD plus WEB_TYPECHECK. Runtime frame microseconds saved: 0 measured. Added cost is one string classification and one invalid-request response object only on rejected visit draft mutations; valid autosave, accept, dashboard, schedule, DICOM, speech, finance, import, and web hot paths are unchanged. Low-end i3/MX350 impact is effectively 0. Bundle-budget smoke is intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/api`, `npm run typecheck -w @dental/shared`, `npm run build -w @dental/api`, `npm run smoke:visit-route-validation`, `npm run smoke:visit-draft-status-contract`, `npm run smoke:clinical-mutation-guard`, `npm run smoke:api-text-encoding`, `npm run smoke:api-global-error-boundary`, `npm run typecheck -w @dental/web`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, and `npm run smoke:settings-view-source` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings in web files. Process check found no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc`/`dotnet` process left behind. Bundle-budget smoke is intentionally not used as a gate after the explicit directive that gzip size is not the objective.

---
Date: 2026-06-03

## Problem

Speech chunk upload had two remaining status-correct but weak rejection bodies. Damaged audio could return decoder text, and retry identity conflicts returned the storage exception `Speech chunk retry identity mismatch; audio remains recoverable in the local queue.` directly to the API caller. Both paths mixed internal queue/transport mechanics with clinic-facing recovery.

## Solution

Added a route-owned `sendSpeechChunkRejection()` boundary. Audio payload failures now return `SpeechChunkRejected`, `reason: audio_rejected`, and Russian recovery copy. Retry identity conflicts now return `SpeechChunkRejected`, `reason: chunk_conflict`, and copy instructing the client/operator to refresh the dictation queue and retry. Runtime smoke now proves both bodies and source smoke rejects the old raw `error.message` send patterns.

## Rejected Alternatives

- Keep forwarding `error.message`: rejected because payload decoder and storage identity exceptions are not public API copy.
- Collapse these into `SpeechChunkValidationError`: rejected because malformed request shape and valid-shape runtime rejection need different client recovery.
- Put identifiers such as `recordingId` or `chunkIndex` in the public reason: rejected because the UI can use stable reason enums without exposing route identifiers.
- Rely on global error handling: rejected because these are known recoverable speech workflow states, not unknown server errors.

## Scalability Potential

Low: a single-chair clinic gets readable recovery for damaged dictation audio without transport jargon.
Middle: browser queue retry logic can branch on `audio_rejected` versus `chunk_conflict`.
High: future offline sync/conflict UI can separate damaged local audio, stale queue identity, and provider failures without parsing text.
Ultra: multi-device dictation recovery can keep internal recording ids in local diagnostics while exposing only stable API reasons.

## Hardware Impact

Evidence class: API_RUNTIME_SMOKE plus STATIC_SOURCE plus API_BUILD plus WEB_TYPECHECK. Runtime frame microseconds saved: 0 measured. Added cost is one invalid-request response object only on rejected speech chunks; valid dictation chunk transcription, provider fallback, clinical scope checks, dashboard, DICOM, finance, import, and web hot paths are unchanged. Low-end i3/MX350 impact is effectively 0. Bundle-budget smoke is intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/api`, `npm run build -w @dental/api`, `npm run smoke:speech-route-validation`, `npm run smoke:speech-clinical-scope`, `npm run smoke:speech-provider-errors`, `npm run typecheck -w @dental/shared`, `npm run smoke:speech-groq-chunk-floor`, `npm run smoke:clinical-mutation-guard`, `npm run smoke:api-text-encoding`, `npm run smoke:api-global-error-boundary`, `npm run typecheck -w @dental/web`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, and `npm run smoke:speech-queue-source` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings in web files. Process check found no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc`/`dotnet` process left behind. Bundle-budget smoke is intentionally not used as a gate after the explicit directive that gzip size is not the objective.

---
Date: 2026-06-03

## Problem

Telegram control-plane still had two valid-shaped state rejection paths that could expose domain exception text. Link-code issuing returned chat-encryption/scope exception copy, and message-preview failures returned sample-data lookup phrases such as missing patient/appointment/document/task preview directly in `message`.

## Solution

Added route-owned classifiers for Telegram link-code rejection and message-preview rejection. Link-code failures now return stable `TelegramChatEncryptionKeyMissing` or `TelegramLinkCodeScopeInvalid` plus bounded `reason` and Russian recovery copy. Message-preview lookup failures now return `TelegramMessagePreviewNotFound` with `reason` values for patient, appointment, document, task, or generic preview unavailability.

## Rejected Alternatives

- Keep forwarding `linkCodeError.message` / `previewError.message`: rejected because domain exceptions are not public API copy.
- Treat these as malformed-payload validation: rejected because the payload is valid shape; the referenced state or server setup is the failing boundary.
- Depend on global error handling: rejected because link-code and preview failures are expected operator workflows, not unknown server errors.
- Put route identifiers in public messages: rejected because stable `reason` is enough for the UI.

## Scalability Potential

Low: a small clinic sees actionable Telegram setup and preview recovery copy.
Middle: Settings/Telegram UI can branch on missing chat encryption versus stale preview references.
High: multi-bot or multi-clinic routing can keep tenant/scope failures machine-readable without exposing internal identifiers.
Ultra: future Telegram admin audit can attach diagnostics server-side while keeping public responses bounded.

## Hardware Impact

Evidence class: API_RUNTIME_SMOKE plus STATIC_SOURCE plus API_BUILD plus WEB_TYPECHECK. Runtime frame microseconds saved: 0 measured. Added cost is one string classification and one invalid-response object only on rejected Telegram control-plane actions; valid Telegram status, outbox, webhook, link-code success, preview success, dashboard, DICOM, speech, finance, import, and web hot paths are unchanged. Bundle-budget smoke is intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/api`, `npm run typecheck -w @dental/shared`, `npm run build -w @dental/api`, `npm run smoke:telegram-validation`, `npm run smoke:telegram-control-ui-source`, `npm run smoke:telegram-due-worker-source`, `npm run smoke:telegram-url-ui-source`, `npm run smoke:api-text-encoding`, `npm run smoke:api-global-error-boundary`, `npm run smoke:clinical-mutation-guard`, `npm run smoke:settings-route-validation`, `npm run smoke:settings-admin-guard`, `npm run typecheck -w @dental/web`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, and `npm run smoke:settings-view-source` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings in web files. Process check found no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc`/`dotnet` process left behind. Bundle-budget smoke is intentionally not used as a gate after the explicit directive that gzip size is not the objective.

---
Date: 2026-06-03

## Problem

Document routes had a remaining public-response weakness: operational refusals used the operator-facing Russian text as the machine `error` value. That made missing documents, printable HTML blockers, issue-chain blockers, tax duplicate/payment-scope blockers, and tax XML blockers harder for clients to branch on and kept the old pattern where public `error` was not a stable code.

The KND 1151156 create path also proved that blindly replacing all zod issue text with one generic message loses a useful operator action. The service needs useful copy without exposing raw schema/parser details.

## Solution

Changed the document route helper to return `error: "DocumentOperationRejected"` and a separate repaired Russian `message`. Updated document/tax smokes to read operator text from `message ?? error` and added runtime/source checks that reject the old `{ error: repairMojibakeText(message) }` contract.

Added a narrow route-owned document-create validation special case for KND 1151156: a non-empty taxpayer INN that is not 12 digits now gets a bounded Russian explanation about the 12-digit physical-person INN requirement. Other malformed document create payloads still return the generic bounded create message.

## Rejected Alternatives

- Restore `parsedInput.error.issues[0]?.message`: rejected because it reopens zod issue/path leakage.
- Leave operator copy in `error`: rejected because web/UI copy and machine branching should not share one field.
- Add a full document-error taxonomy in this slice: rejected because it would be broad churn; this pass closes the public contract first.
- Remove the KND-specific smoke expectation: rejected because the 12-digit INN requirement is a real operator action, not technical noise.

## Scalability Potential

Low: a small clinic sees the same readable document recovery text, while the browser can branch on one stable code.
Middle: document issue/tax workflows can add UI-specific handling without parsing Russian messages.
High: future auth/tenant/session layers can attach richer internal diagnostics without changing public error shape.
Ultra: external integrations can treat document rejections as stable API events while DENTE keeps operator copy localizable.

## Hardware Impact

Evidence class: API_RUNTIME_SMOKE plus STATIC_SOURCE plus API_BUILD plus WEB_BUILD. Runtime frame microseconds saved: 0 measured. Added cost is one extra response field only on rejected document operations and one small invalid-payload inspection only when document create validation fails; valid document create/issue/html/pdf/xml, dashboard, schedule, DICOM, speech, finance, import, and web hot paths are unchanged. Bundle-budget smoke is intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/api`, `npm run typecheck -w @dental/shared`, `npm run build -w @dental/api`, `npm run smoke:document-route-validation`, `npm run smoke:document-html-issue-guards`, `npm run smoke:document-issue-chains`, `npm run smoke:tax-document-explicit-payment-scope`, `npm run smoke:tax-certificate-duplicate-issue`, `npm run smoke:tax-knd-xml`, `npm run smoke:document-guards`, `npm run smoke:document-payloads`, `npm run smoke:document-zip-redaction`, `npm run smoke:api-text-encoding`, `npm run smoke:api-global-error-boundary`, `npm run smoke:clinical-mutation-guard`, `npm run smoke:documents-view-source`, `npm run typecheck -w @dental/web`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, `npm run smoke:settings-view-source`, and `npm run build -w @dental/web` passed. Web build reported the existing large `workspace` chunk warning; gzip size was not treated as a gate. `git diff --check` reported no whitespace errors, only existing CRLF warnings in web files. Process check found no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind; unrelated Unity `dotnet` processes were present and were not touched.

---
Date: 2026-06-03

## Problem

Telegram chat-link revoke was scope-aware and audit-preserving, but the missing/stale binding path returned only `{ error: "TelegramChatLinkNotFound" }`. That is stable enough for machines but weak for operators, and it had no runtime proof that the body stayed free of `linkId`, runtime-scope ids, request params/query/body, parser terms, secrets, mojibake, null, or undefined.

## Solution

Added route-owned Russian copy for missing chat-link revoke while keeping the stable `TelegramChatLinkNotFound` code. Extended `smoke:telegram-validation` with source guards against the old bare-code response and a runtime POST to an unknown chat-link id. The smoke now asserts code/message and runs the existing no-secret/no-mojibake guard plus expanded no-domain-leak checks for route ids and runtime scope ids.

## Rejected Alternatives

- Keep the bare not-found code: rejected because admin workflows need a human recovery sentence.
- Add `reason` for this path: rejected because this mutation has one clear missing/stale binding failure and no useful sub-state yet.
- Include `linkId` or runtime scope in the response: rejected because public bodies should not echo route identifiers or bot scope internals.
- Push the fix into the UI only: rejected because the API response contract is the failing boundary.

## Scalability Potential

Low: a small clinic sees why revoking a stale chat binding did not change anything.
Middle: Settings/Telegram can show one admin-safe message without parsing route state.
High: clinic-owned bot deployments keep bot scope diagnostics server-side while public responses stay bounded.
Ultra: future paged chat-link ledgers can add bulk revoke/retry flows while keeping missing-link responses stable and localizable.

## Hardware Impact

Evidence class: API_RUNTIME_SMOKE plus STATIC_SOURCE plus API_BUILD plus WEB_BUILD. Runtime frame microseconds saved: 0 measured. Added cost is one extra response field only on rejected Telegram chat-link revoke; valid link-code issue, chat-link list, revoke success, Telegram outbox, webhook, DICOM, speech, finance, import, and UI hot paths are unchanged. Bundle-budget smoke is intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/api`, `npm run build -w @dental/api`, `npm run smoke:telegram-validation`, `npm run smoke:telegram-control-ui-source`, `npm run smoke:telegram-due-worker-source`, `npm run smoke:telegram-url-ui-source`, `npm run smoke:api-text-encoding`, `npm run smoke:api-global-error-boundary`, `npm run smoke:clinical-mutation-guard`, `npm run smoke:settings-route-validation`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/web`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, `npm run smoke:settings-view-source`, and `npm run build -w @dental/web` passed. Web build reported the existing large `workspace` chunk warning; gzip size was not treated as a gate. `git diff --check` reported no whitespace errors, only existing CRLF warnings in web files. Final process check found no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind.

---
Date: 2026-06-03

## Problem

The price-list analyzer already returned semantic warning ids for machines, but the Settings price-list result rendered row warnings through `warnings.join(", ")` and analysis notes directly as `{warning}`. That exposed backend ids such as `price_not_found`, `image_payload_invalid`, and `groq_skipped_invalid_image_payload` to clinic admins.

## Solution

Added `pricelistWarningsText` in `pricelistUiMeta.ts`, with UI-owned Russian labels for known price-list warning ids and a cleaned fallback for future ids. `SettingsView` now uses this helper for both item warnings and analysis-level notes. `App.tsx` passes the helper into the lazy settings view. `smoke:pricelist-analyzer` now requires the helper and rejects the old raw price-list warning JSX.

## Rejected Alternatives

- Leave warning ids raw: rejected because a clinical admin needs an action phrase, not analyzer internals.
- Move labels into the API: rejected because the DTO warning id is useful stable machine state and UI localization belongs in the web layer.
- Forbid every `{warning}` render globally in Settings: rejected because other domains need separate owner-label reviews instead of a blanket smoke failure.

## Scalability Potential

Low: a small clinic sees readable price-list review actions in the admin screen.
Middle: future OCR/photo warning ids can be added in one UI-owned map without changing the analyzer DTO.
High: service mapping and catalog import can branch on stable ids while showing localized operator copy.
Ultra: external imports can preserve warning ids for audit/export while the browser renders clinic-specific language.

## Hardware Impact

Evidence class: WEB_TYPECHECK plus STATIC_SOURCE_SMOKE. Runtime frame microseconds saved: 0 measured. Added cost is a tiny string map and join only when the Settings price-list result panel renders; visit, schedule, DICOM, speech, billing, Telegram, and API routes are unchanged. Bundle-budget smoke is intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/web`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run smoke:pricelist-analyzer`, `npm run smoke:settings-view-source`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, and `npm run build -w @dental/web` passed. Web build reported the existing large `workspace` chunk warning; gzip size was not treated as a gate. `git diff --check` reported no whitespace errors, only existing CRLF warnings in web files. Final process check found no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind.

---
Date: 2026-06-04

## Problem

Settings patient import and imaging import rows still rendered row warnings through `row.warnings.join(", ")`. Imaging ready rows also used `row.filePath` as the visible fallback, which made full workstation paths routine UI copy instead of a deliberate diagnostic.

## Solution

Added `patientImportRowWarningText` and `imagingImportRowWarningText` in `SettingsView`. Both helpers route warnings through `humanizeMigrationText`; imaging ready rows now show a safe file name when available and otherwise a clean ready-to-link message. `smoke:settings-view-source` now requires the helpers and rejects the old raw patient/imaging import warning fallbacks.

## Rejected Alternatives

- Rewrite import API warning DTOs: rejected because the current DTO strings are stable enough and this slice fixes the visible UI contract.
- Use a global Settings warning formatter: rejected because Telegram, DICOM, migration, price-list, patient import, and imaging import all need domain-owned labels.
- Keep full `row.filePath` as ready fallback: rejected because routine admin UI should not expose full local workstation paths.

## Scalability Potential

Low: small clinics see readable import-row actions without parser or path noise.
Middle: mixed patient/image imports can add new warnings while keeping display copy in one UI owner.
High: local workstation bridges can keep full paths server-side while browser UI shows bounded file identity.
Ultra: future import history and rollback can preserve raw warning/path data for audit while rendering localized operator copy.

## Hardware Impact

Evidence class: WEB_TYPECHECK plus STATIC_SOURCE_SMOKE. Runtime frame microseconds saved: 0 measured. Added cost is a tiny string-map/humanizer pass only when Settings import preview rows render; visit, schedule, DICOM preview, speech, billing, Telegram, and API routes are unchanged. Bundle-budget smoke is intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/web`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run smoke:import-contracts`, `npm run smoke:settings-view-source`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, and `npm run build -w @dental/web` passed. Web build reported the existing large `workspace` chunk warning; gzip size was not treated as a gate. `git diff --check` reported no whitespace errors, only existing CRLF warnings in web files. Final process check found no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind.

---
Date: 2026-06-04

## Problem

Settings AI recognition results rendered `typedRecognitionJob.warnings` directly as `{warning}`. The API warnings are stable enough for audit, but visible copy still exposed backend wording such as OCR, preview, AI safety notes, and viewer phrasing instead of concise clinic actions.

## Solution

Added `aiRecognitionWarningText` and a Settings-local clinical label map. Recognition warnings now keep their backend strings as DTO state but render through UI-owned labels. `smoke:settings-view-source` now requires the formatter and rejects the old raw `typedRecognitionJob.warnings` render.

## Rejected Alternatives

- Rewrite API warning strings: rejected because this slice fixes the public UI boundary without changing a stable API contract.
- Reuse the import-row formatter only: rejected because AI recognition has different clinical safety copy than migration rows.
- Trust Russian backend warnings: rejected because human language alone did not remove OCR/preview/AI implementation wording from the admin panel.

## Scalability Potential

Low: small clinics see clear recognition review actions in Settings.
Middle: new recognition targets can add labels without DTO churn.
High: API audit can retain stable warning strings while browser copy stays clinic-readable.
Ultra: provider-backed recognition can add structured backend warnings while the UI remains localized and action-oriented.

## Hardware Impact

Evidence class: WEB_TYPECHECK plus API_TYPECHECK plus STATIC_SOURCE_SMOKE plus WEB_BUILD. Runtime frame microseconds saved: 0 measured. Added cost is one string-map lookup per recognition warning only when the Settings AI result panel renders; visit, schedule, DICOM, speech capture, billing, Telegram, and API hot paths are unchanged. Bundle-budget smoke is intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/web`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run smoke:settings-view-source`, `npm run smoke:ai-recognition-scope`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, and `npm run build -w @dental/web` passed. Web build reported the existing large `workspace` chunk warning; gzip size was not treated as a gate. `git diff --check` reported no whitespace errors, only existing CRLF warnings in web files. Final process check found no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind.

---
Date: 2026-06-04

## Problem

Settings clinic public lookup and smart-import clinic suggestion panels still had raw visible warning chips. The backend warnings were route-owned, but the browser displayed lookup/suggestion warnings directly in clinic profile lookup, import-side lookup, and smart-import clinic suggestions. Duplicate requisites also exposed raw field keys instead of the field labels used by the rest of the panel.

## Solution

Added `clinicPublicLookupWarningText` in `SettingsView`. It routes clinic lookup warnings through migration humanization, rewrites duplicate-value warnings with clinic profile field labels, and cleans provider/status phrasing before display. Clinic lookup, import-side lookup, migration-autopilot lookup, and smart-import clinic suggestion warnings now use this formatter. `smoke:settings-view-source` requires the formatter and rejects the old raw warning chips.

## Rejected Alternatives

- Rewrite smart-import API warning strings: rejected because route warnings are stable DTO/audit state and the bug was the visible UI boundary.
- Use only `humanizeMigrationText`: rejected because duplicate requisites need field-aware copy such as "ИНН" instead of raw keys.
- Hide the warnings: rejected because admins need these checks before applying public requisites into the clinic profile draft.

## Scalability Potential

Low: small clinics see readable public-requisite review actions before saving a profile.
Middle: smart import and migration autopilot reuse one warning formatter for the same clinic-profile boundary.
High: external requisites providers can keep stable route warnings while the UI remains localized.
Ultra: future provider-specific warnings can be added without DTO churn or exposing service internals to admins.

## Hardware Impact

Evidence class: WEB_TYPECHECK plus API_TYPECHECK plus IMPORT_RUNTIME_SMOKE plus STATIC_SOURCE_SMOKE plus WEB_BUILD. Runtime frame microseconds saved: 0 measured. Added cost is one string humanization/regex pass per visible clinic lookup warning only when Settings lookup/import panels render; visit, schedule, DICOM, speech capture, billing, Telegram, and API hot paths are unchanged. Bundle-budget smoke is intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/web`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run smoke:settings-view-source`, `npm run smoke:import-contracts`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, `npm run smoke:web-render-gating-source`, and `npm run build -w @dental/web` passed. Web build reported the existing large `workspace` chunk warning; gzip size was not treated as a gate. `git diff --check` reported no whitespace errors, only existing CRLF warnings in web files. Final process check found no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind.

---
Date: 2026-06-04

## Problem

The DICOM planning route still returned English operator-facing titles, reasons, and blocker warnings for planning tasks. Those fields are not private enums; they are packet text used by workflow, exports, and handoff surfaces. English strings such as `Volume stack is not ready`, `Panoramic reconstruction needs`, and implant-library blockers leaked implementation language into clinic-visible CT planning packages.

## Solution

Changed `buildDicomViewerPlanningTasks` in `imaging.ts` to return Russian operator copy for task titles, reasons, and warnings while leaving DTO field names, task kinds, target tools, and geometry/tool-state contracts unchanged. Extended `smoke:imaging-viewer-usability-source` to require the Russian route strings and forbid the old English planning copy inside `imaging.ts`. Updated the imaging plan and product-risk audit to record that DICOM planning packet copy is API-owned Russian operator copy.

## Rejected Alternatives

- Humanize only in the browser: rejected because exports and handoff packets can consume these API fields directly.
- Rename DTO kinds/tools: rejected because the machine contract was not the problem and renaming would increase integration risk.
- Hide blockers until the viewer is complete: rejected because operators need clear preparation blockers for incomplete CT series and implant presets.

## Scalability Potential

Low: small clinics receive readable CT planning tasks even when the CT series is incomplete.
Middle: browser workflow/export surfaces can reuse the route packet without extra copy adapters.
High: external viewer handoff can keep stable task/tool identifiers while operator text remains localized.
Ultra: future implant libraries and reconstruction tools can add route copy under smoke guard without DTO churn.

## Hardware Impact

Evidence class: API_TYPECHECK plus API_BUILD plus DICOM_RUNTIME_SMOKE plus STATIC_SOURCE_SMOKE plus WEB_BUILD. Runtime frame microseconds saved: 0 measured. This is static string replacement in API packet assembly; DICOM parsing, first-frame preview, render-plan selection, browser CT controls, and web hot paths are unchanged. Bundle-budget smoke is intentionally not used as a gate after the explicit directive that gzip size is not the objective.

## Proof

`npm run typecheck -w @dental/api`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:dicom-folder-workup`, `npm run smoke:api-text-encoding`, `npm run build -w @dental/api`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/web`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, and `npm run build -w @dental/web` passed. Web build reported the existing large `workspace` chunk warning; gzip size was not treated as a gate. Old English DICOM planning strings remain only in smoke `forbidIn` guards, not in `imaging.ts`. `git diff --check` reported no whitespace errors, only existing CRLF warnings in web files. Final process check found no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind.

---
Date: 2026-06-04

## Problem

CT workup still had two weak points in the performance and 3D-model route. Memory estimates were mostly count-based, so a tiny synthetic stack and a high-resolution CBCT stack could be treated too similarly. The render-cache plan described tasks but not interaction phases, which leaves future viewer code free to block first paint behind full refinement. Local organizer model roles also covered dental arches and guides, but not CT-derived skull, maxilla, mandible, or bone-surface files.

## Solution

Added image geometry fields to shared DICOM row/group schemas and API parsing. `imaging.ts` now reads Rows, Columns, bit depth, samples-per-pixel, estimates pixel bytes, and feeds those values into MPR resource policy and render-cache memory estimates. Added render-cache interaction phases for external review, first visible slice, interactive navigation, and idle refinement, and exposed them in Settings. Added metadata-only skull/maxilla/mandible/CT bone surface model roles in shared/API/UI labels and no-PHI smoke coverage.

## Rejected Alternatives

- Keep fixed per-file memory estimates: rejected because CBCT dimensions and bit depth are the hardware truth for memory pressure.
- Load CAD meshes in the CRM shell to prove skull models: rejected because organizer decisions need metadata only; real mesh display belongs to the CT/3D viewer or lab path.
- Treat render cache as one task list: rejected because first orientation, active scrolling, and idle refinement have different latency budgets.
- Make gzip size the deciding gate: rejected by explicit product directive; correctness, CT responsiveness, and safe routing are the gates.

## Scalability Potential

Low: weak/no-WebGL workstations move to external review before large pixel loads.
Middle: integrated GPUs get downsampled first-paint and bounded navigation windows from geometry-derived estimates.
High: diagnostic workstations can keep more slices resident and refine after first interaction.
Ultra: future Cornerstone/OHIF/local worker paths can spend saved latency on volume refinement, 3D bone surfaces, implant overlays, and export snapshots without changing the CRM metadata contract.

## Hardware Impact

Evidence class: SHARED_TYPECHECK plus API_TYPECHECK/API_BUILD plus WEB_TYPECHECK/WEB_BUILD plus DICOM_RUNTIME_SMOKE plus STATIC_SOURCE_SMOKE. Runtime frame microseconds saved: 0 measured in browser because this slice is planning/metadata, not a live pixel renderer. Expected impact is lower false-positive full-MPR admission on weak hardware and less first-paint blocking for future viewer code. Added UI cost is rendering a small phase list in Settings only.

## Proof

`npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run typecheck -w @dental/web`, `npm run build -w @dental/api`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:dicom-folder-workup`, `npm run smoke:api-text-encoding`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, and `npm run build -w @dental/web` passed. `smoke:dicom-folder-workup` now verifies 32x32 and 1024x1024 geometry-derived memory, render interaction phases, and synthetic skull/mandible surface roles. Web build reported the existing large `workspace` chunk warning; gzip size was not treated as a gate. `git diff --check` reported no whitespace errors, only existing CRLF warnings in web files. Final process check found no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind.

---
Date: 2026-06-04

## Problem

CT readiness still treated the launch surface too generically. A phone, a tablet, a PC browser, and a desktop app do not have the same safe CT path. Offline local DICOM folders and offline remote DICOMweb/PACS archives also require different behavior: local pixels can still be present, remote pixels are not available.

## Solution

Added a DICOM runtime profile to shared/API readiness: surface, network mode, execution lane, local/remote capability flags, operator label, next action, and warnings. API render planning now forces phone/tablet into preview/handoff, allows desktop app offline-local MPR, and keeps offline remote archives metadata-only. Settings maps execution lanes through Russian labels, and source smoke blocks raw lane ids in visible readiness copy.

## Rejected Alternatives

- Use gzip size as the constraint: rejected by explicit product directive and irrelevant to CT route correctness.
- Decide only from WebGL/device memory: rejected because source locality and desktop-app local file access are equally important.
- Promise mobile full-volume MPR on high-spec phones: rejected because mobile browser memory/storage behavior is not a reliable clinical workstation path.
- Try to fetch/decode remote archive pixels while offline: rejected because it would create false readiness and broken cache work.

## Scalability Potential

Low: weak/mobile devices keep patient card, notes, first preview, and handoff without loading heavy volume pixels.
Middle: PC browsers with local folders can use phased browser MPR when WebGL/IndexedDB/storage are present.
High: desktop app/local workstation can keep local folder and external viewer/module routes without browser pixel transfer.
Ultra: future local CT worker can use the same runtime lane to add progressive volume loading, 3D bone surfaces, implant overlays, and idle refinement without changing the CRM operator contract.

## Hardware Impact

Evidence class: SHARED_TYPECHECK plus API_TYPECHECK/API_BUILD plus WEB_TYPECHECK plus DICOM_RUNTIME_SMOKE plus STATIC_SOURCE_SMOKE. Runtime frame microseconds saved: 0 measured in browser; this is routing and planning. Expected impact is avoided decode/upload work on phones and offline remote archives, and fewer false browser-MPR admissions before a real CT viewer owns pixel budgets.

## Proof

`npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run smoke:imaging-viewer-usability-source`, `npm run typecheck -w @dental/web`, `npm run build -w @dental/api`, `npm run smoke:dicom-folder-workup`, `npm run smoke:api-text-encoding`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, and `npm run build -w @dental/web` passed. `smoke:dicom-folder-workup` verifies desktop browser MPR, mobile browser preview, desktop app offline-local MPR, and offline remote metadata-only cache behavior. Web build reported the existing large `workspace` chunk warning; gzip size was not treated as a gate. Official docs checked for direction: Cornerstone3D supports stack/volume viewports and progressive/interleaved volume loading; MDN documents IndexedDB/offline use plus quota/eviction constraints, so readiness must not promise unlimited browser CT storage.

---
Date: 2026-06-04

## Problem

The CT render-cache plan had phases and tasks, but not an executable request schedule. A future viewer adapter would still need to invent slice order, cancellation, and prerequisites. The local organizer also detected skull/bone surface files, but those files were dead metadata with no model-workbench route.

## Solution

Added `progressiveStages` to the DICOM render-cache contract. Each stage now carries stage kind, request pattern, Cornerstone-style request type, cancel group, prerequisite stage ids, bounded slice order, decimation factor, resident-slice window, budget, and next action. Added a model-workbench manifest for local imaging organizer cases: model role, format, size, load target, CT pairing hint, warnings, and no-mesh next action.

## Rejected Alternatives

- Keep progressive loading as prose: rejected because a request pool needs order, cancellation, and prerequisites.
- Build a mesh viewer in Settings: rejected because the CRM shell is not the safe owner for heavy skull/CT surface geometry.
- Treat CT surface models as generic arch scans: rejected because skull/mandible/maxilla/bone surfaces need different routing and local bridge expectations.
- Load every slice before first interaction: rejected because it blocks the clinical screen on weak hardware.

## Scalability Potential

Low: seed slices and metadata-only paths keep weak/mobile/offline routes responsive.
Middle: PC browsers can load interleaved low-resolution CT before active-window refinement.
High: desktop/local adapters can consume ordered stages and local surface-model routes without duplicating scheduler policy.
Ultra: future CT viewer can use the same contract for request-pool priority, cancellation, 3D bone surfaces, implant overlays, and idle full-resolution refinement.

## Hardware Impact

Evidence class: SHARED_TYPECHECK plus API_TYPECHECK/API_BUILD plus WEB_TYPECHECK plus DICOM_RUNTIME_SMOKE plus STATIC_SOURCE_SMOKE. Runtime frame microseconds saved: 0 measured in browser; this is server-owned planning. Expected impact is lower first-interaction latency once the viewer consumes the stage order, and no accidental mesh load in the CRM shell.

## Proof

`npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run smoke:imaging-viewer-usability-source`, `npm run typecheck -w @dental/web`, `npm run build -w @dental/api`, `npm run smoke:dicom-folder-workup`, `npm run smoke:api-text-encoding`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, and `npm run build -w @dental/web` passed. The DICOM smoke verifies progressive stage kinds/order counts, interleaved interaction request type, cancel group/prerequisite, bounded slice order, and skull-surface local-bridge pairing with same-folder CT series. Web build reported the existing large `workspace` chunk warning; gzip size was not treated as a gate.

---
Date: 2026-06-04

## Problem

Accepted visit-note saves were queued in `localStorage` when the server was unavailable. That kept the prototype usable, but it was the wrong storage class for an offline-capable clinical app: synchronous boot reads, one JSON blob per clinic scope, tighter quota behavior, and weaker migration path than the existing IndexedDB audio queue.

## Solution

Added a `pendingVisitSaves` object store to the existing `dental-crm-offline` IndexedDB database. Accepted-save queue load/save/flush are now async, legacy scoped and unscoped `localStorage` queues migrate into IndexedDB, stale rows are pruned, and restricted browsers retain a scoped `localStorage` fallback. React boot initializes the pending-save counters as empty and refreshes them asynchronously.

## Rejected Alternatives

- Keep the queue in `localStorage`: rejected because the product requirement is offline operation across site, phone, PC, and desktop app, and accepted EMR saves are too important for a synchronous JSON fallback to be the primary path.
- Add a second database for visit saves: rejected because the app already has an offline database and one upgrade path is easier to audit.
- Clear the object store before writing the replacement queue: rejected because it could drop same-origin queued work from another organization scope if a browser closes mid-write.

## Scalability Potential

Low: restricted browsers still retain a small scoped fallback instead of dropping accepted saves.
Middle: mobile/tablet/PC browser queues use async IndexedDB and avoid boot-time storage blocking.
High: installed PWA/desktop shell can keep clinical retry state in the same offline database as audio chunks.
Ultra: future encrypted local storage or desktop-app sync can reuse the IndexedDB queue owner without changing the visit acceptance flow.

## Hardware Impact

Evidence class: WEB_TYPECHECK/WEB_BUILD plus STATIC_SOURCE_SMOKE plus neighboring offline/boot/speech/visit smokes. Runtime frame microseconds saved: 0 measured. Expected impact is less main-thread blocking during app boot and a more durable accepted-save retry path under offline/spotty-network operation. No CT pixel renderer was modified in this slice.

## Proof

`npm run smoke:visit-offline-queue-source`, `npm run typecheck -w @dental/web`, `npm run smoke:app-boot-state-source`, `npm run smoke:speech-queue-source`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, `npm run smoke:visit-draft-status-contract`, and `npm run build -w @dental/web` passed. Web build reported the existing large `workspace` chunk warning; gzip size was not treated as a gate. `git diff --check` reported no whitespace errors, only existing CRLF warnings in web files. Final process check found no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build or test process left behind.

---
Date: 2026-06-04

## Problem

The CT workbench recovery path still kept the last DICOM workbench manifest and per-series MPR controls in `localStorage`. That is acceptable for a prototype convenience field, but not for a CT-heavy app that must survive online/offline operation across browser, phone, PC, and desktop shell. The workbench state is not pixels, but it is still clinically important route state.

## Solution

Added `dicomWorkbenchDrafts` and `mprWorkbenchDrafts` object stores to the existing `dental-crm-offline` IndexedDB database. DICOM workbench recovery is keyed by organization, MPR view state is keyed by organization plus series key, and both migrate from legacy `localStorage` with restricted-browser fallback. Restore effects are async and cancellable; saved timestamps are shown only when the local write succeeds.

## Rejected Alternatives

- Store CT workbench recovery as one `localStorage` JSON blob: rejected because the product requires real offline behavior and CT state should not block app boot through synchronous storage reads.
- Store CT pixels or 3D meshes in this browser recovery path: rejected because the CRM shell is metadata/tool-state owner; pixel/mesh work belongs to Cornerstone/OHIF/local modules.
- Use one global MPR state for every CT series: rejected because stale slice/projection state from one series can mislead work on another series.

## Scalability Potential

Low: restricted browsers still get a scoped fallback and metadata-only restore.
Middle: site/mobile/PC browser restores last CT workbench state asynchronously without loading heavy pixels.
High: desktop app/local workstation can reuse the same no-pixel recovery state while keeping folder access and rendering local.
Ultra: future local CT module can consume the restored manifest/MPR state, then spend hardware budget on progressive volume, skull/bone surfaces, and implant overlays outside the CRM shell.

## Hardware Impact

Evidence class: WEB_TYPECHECK/WEB_BUILD plus STATIC_SOURCE_SMOKE plus DICOM_RUNTIME_SMOKE plus live browser DICOM file-input smoke. Runtime frame microseconds saved: 0 measured. Expected impact is reduced boot-time sync storage work and more durable CT workbench recovery without loading diagnostic pixels or meshes in the browser shell.

## Proof

`npm run smoke:dicom-workbench-offline-source`, `npm run smoke:visit-offline-queue-source`, `npm run typecheck -w @dental/web`, `npm run smoke:dicom-folder-workup`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:app-boot-state-source`, `npm run smoke:web-text-encoding`, `npm run build -w @dental/web`, `npm run smoke:browser-file-input-dicom`, and `npm run smoke:web-code-split-source` passed. The browser DICOM smoke required temporary API+web dev servers; both process trees were stopped after the run. Web build reported the existing large `workspace` chunk warning; gzip size was not treated as a gate. `git diff --check` reported no whitespace errors, only existing CRLF warnings in web files. Final process check found no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build, dev, or test process left behind. Official MDN docs checked for direction: IndexedDB is object-store/transaction based and appropriate for asynchronous browser persistence; File System Access still requires explicit user directory selection, so this slice stores recovery state only, not hidden file handles or CT pixels.

---
Date: 2026-06-04

## Problem

The browser-local CT/folder selection path read up to 900 files and up to 180 DICOM magic headers as one silent async workflow. Even though this does not decode CT pixels, it can still monopolize the main thread enough to feel broken on phones, weak laptops, and desktop shells under load.

## Solution

Added a browser imaging scan controller around the local file/directory summary path. It publishes throttled progress, supports cancellation through `AbortController`, checks abort state around directory/file/header reads, yields through `scheduler.yield()` when the browser supports it, and falls back to a zero-delay timer otherwise. Settings now renders progress and stop controls while preserving the PHI-safe no-path summary result.

## Rejected Alternatives

- Claim this is CT rendering optimization: rejected because no diagnostic pixel/mesh renderer was changed in this slice.
- Show a percentage: rejected because browser directory traversal has no reliable total before scanning.
- Move immediately to a worker: rejected for this narrow slice because the path currently summarizes user-selected handles/files and does not decode pixels; chunked main-thread work is the lower-risk repair.
- Keep the old spinner-only behavior: rejected because online/offline CT operation on site, phone, PC, and desktop app needs visible, cancellable local work.

## Scalability Potential

Low: weak/mobile browsers can keep the Settings route interactive while local CT files are counted.
Middle: PC browsers can scan larger local CT/3D selections with visible progress and stop control.
High: desktop app/local module can reuse the same progress/cancel contract before handing real pixels to local CT tooling.
Ultra: future Cornerstone/OHIF/local workers can replace the summary loop with worker-owned decode while keeping the same UI progress semantics.

## Hardware Impact

Evidence class: WEB_TYPECHECK/WEB_BUILD plus STATIC_SOURCE_SMOKE plus DICOM_RUNTIME_SMOKE plus live browser file-input smoke. Runtime frame microseconds saved: 0 measured. Expected impact is fewer long browser tasks during local CT/3D selection on phone/weak-PC surfaces. No CT pixel renderer, mesh loader, or diagnostic viewer was modified.

## Proof

`npm run smoke:browser-imaging-scan-progress-source`, `npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:web-text-encoding`, `npm run smoke:web-code-split-source`, `npm run smoke:dicom-folder-workup`, `npm run build -w @dental/web`, and `npm run smoke:browser-file-input-dicom` passed. The browser DICOM smoke required temporary API+web dev servers; both process trees were stopped after the run. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build, dev, or test process left behind. Official MDN docs checked for direction: `scheduler.yield()` is meant to break long-running work so the browser remains responsive, and `AbortController` is the standard abort signal owner.

---
Date: 2026-06-04

## Problem

API-local imaging and DICOM scan routes could keep doing bounded but long folder/header work after the client closed the request. Browser-local scans already had progress/cancel/yield; the server side needed the same event-loop fairness for site, phone, PC browser, and desktop shell routes.

## Solution

Added an API scan abort/yield contract in `apps/api/src/routes/imaging.ts`. Six local scan routes now create a request-scoped `AbortSignal` from Fastify `request.raw.close` plus `request.raw.aborted`. The folder walkers, DICOM header collector, manifest parser, first-frame preview, discovery, and organizer loops yield through `node:timers/promises` `setImmediate` and rethrow aborts instead of treating them as ordinary unreadable-folder warnings.

## Rejected Alternatives

- Only cancel on the browser side: rejected because desktop shell/API callers can hit the same local scan routes.
- Add a broad worker pool now: rejected for this slice because the immediate blocker was request abort and event-loop fairness; worker isolation belongs with the next ZIP/parser memory-honesty pass.
- Rewrite ZIP handling in the same patch: rejected because the existing whole-ZIP read under the 250 MB cap is a real weakness but parser-correct random reads need a focused test surface.

## Scalability Potential

Low: weak phones and small PCs can abort local scans without waiting for the current request to finish the entire bounded folder walk.
Middle: clinic PCs get scheduled breaks between folder/file/header units while scanning local exports.
High: desktop app routes can keep local/offline CT paths but stop stale work when the user navigates or cancels.
Ultra: future local CT module can reuse this abort/yield contract while moving heavy pixel/mesh work into worker/local adapters.

## Hardware Impact

Evidence class: API_TYPECHECK plus STATIC_SOURCE_SMOKE plus DICOM_RUNTIME_SMOKE plus API_TEXT_ENCODING_SMOKE. Runtime microseconds saved: 0 measured. Expected impact is fewer stale scan tasks and better Node event-loop fairness under large local CT/3D folders. No CT pixel renderer, mesh loader, or ZIP streaming parser was modified.

## Proof

`npm run smoke:api-dicom-scan-abort-yield-source`, `npm run typecheck -w @dental/api`, `npm run smoke:dicom-folder-workup`, `npm run smoke:api-text-encoding`, `npm run build -w @dental/api`, `npm run typecheck -w @dental/shared`, `npm run smoke:dicom-workbench-offline-source`, and `npm run smoke:imaging-viewer-usability-source` passed. `git diff --check` reported no whitespace errors, only existing CRLF warnings in web files. Final process check found no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build, dev, or test process left behind. Official Fastify docs checked for client abort detection via raw request close/aborted state; official Node docs checked for `AbortController`/`AbortSignal` and promise `setImmediate` with `signal`.

---
Date: 2026-06-04

## Problem

The next CT/offline weakness was not diagnostic rendering; it was metadata-path honesty. ZIP-contained DICOM preview still depended on whole-archive buffering for regular archives, and already expanded `archive.zip::entry.dcm` rows could be treated as archives again during series grouping. Browser-local scan progress also lacked elapsed/cap visibility, which made bounded work look like a frozen CT import on weak devices.

## Solution

Changed ZIP metadata parsing to random-range reads: EOCD tail, bounded central directory, then bounded local-entry prefix reads. Unsupported split/multi-disk, ZIP64 sentinel, encrypted, out-of-bounds, and oversized central-directory cases stay warning-only. Virtual ZIP entry paths are no longer archive sources. Browser-local scan progress now includes elapsed milliseconds, processed units, file/folder limits, and magic-read limit; Settings renders those values during active local CT/3D selection.

## Rejected Alternatives

- Claim this is full CT performance optimization: rejected because no pixel renderer, mesh loader, or 3D skull surface pipeline was changed.
- Add ZIP64/split/archive extraction now: rejected because safe archive support needs a separate parser/worker path and real fixtures.
- Deduplicate expanded ZIP entries later in grouping: rejected because the source-path classifier should not lie about `zip::entry` ownership.
- Show percent progress for browser scans: rejected because browser directory traversal lacks a reliable total before scanning.

## Scalability Potential

Low: weak/mobile browsers get visible elapsed/cap progress and can avoid silent long scans.
Middle: normal clinic PCs can preview regular CT ZIP metadata without allocating a full archive buffer.
High: desktop app/local workstations can reuse the same virtual-entry and progress semantics before handing real CT pixels to local tooling.
Ultra: future local CT module can add worker-owned ZIP64/streaming decode, progressive volume upload, skull/bone surfaces, and implant overlays without changing the CRM metadata boundary.

## Hardware Impact

Evidence class: API_TYPECHECK/API_BUILD plus WEB_TYPECHECK/WEB_BUILD plus STATIC_SOURCE_SMOKE plus DICOM_RUNTIME_SMOKE. Runtime microseconds saved: 0 measured. Expected impact is lower peak memory during ZIP metadata preview and better operator observability during browser-local CT/3D selection. No diagnostic CT pixel rendering or 3D model rendering was modified.

## Proof

`npm run smoke:api-dicom-scan-abort-yield-source`, `npm run typecheck -w @dental/api`, `npm run build -w @dental/api`, `npm run smoke:dicom-folder-workup`, `npm run smoke:api-text-encoding`, `npm run smoke:browser-imaging-scan-progress-source`, `npm run typecheck -w @dental/web`, `npm run build -w @dental/web`, and `npm run smoke:web-text-encoding` passed. The DICOM workup smoke reported `filesParsed=54` and `estimatedPixelBytes=110592` for 48 direct synthetic slices plus 6 ZIP-contained synthetic slices. Web build reported the existing large `workspace` chunk warning; gzip size was not treated as a gate by explicit instruction. `git diff --check` reported no whitespace errors, only existing CRLF warnings. Final process check found no DENTE `node`/`npm`/`vite`/`tsx`/`tsc`/`csc` build, dev, or test process left behind.

---
Date: 2026-06-04

## Problem

The next CT blockers were memory honesty and execution honesty, not bundle size. Regular ZIP archives could still be rejected by a coarse archive-size gate, deflated ZIP entry metadata still risked whole-entry inflation, first-frame preview still risked whole-file reads, virtual ZIP entries could look more executable than they are, and the offline CT/MPR IndexedDB schema could miss same-version stores. CT surface and implant-model metadata also needed an explicit no-mesh/no-CAD boundary so the CRM did not imply skull/guide generation in the browser shell.

## Solution

The API now treats regular ZIP metadata as bounded range work: large central-directory offsets are allowed when the descriptor ranges are valid, deflated DICOM entry prefixes stream through a capped inflater, and first-frame preview reads a bounded header plus the first-frame pixel range only. ZIP virtual entries are downgraded to metadata/external-only for MPR/runtime/launch contracts until a local pixel bridge exists. The shared/API model workbench now emits CT surface manifests with `containsMeshGeometry=false`, and the implant/export path marks CRM output as planning parameters only. The web CT path adds a stop control for API-local scan/workup calls. The offline DB moved to v4 with required store assertions and blocked/error hygiene.

## Rejected Alternatives

- Keep the coarse ZIP size gate: rejected because valid clinic archives can place the central directory past the old limit while still being safe for bounded metadata reads.
- Inflate full deflated ZIP entries: rejected because DICOM pixel payloads are exactly where memory spikes become unacceptable.
- Read full DICOM files for first-frame thumbnails: rejected because preview needs a bounded orientation image, not diagnostic full-file ownership.
- Treat `archive.zip::slice.dcm` as browser-local MPR-ready: rejected because virtual archive paths do not provide the random-access pixel source needed by a real viewer.
- Load skull/mandible/maxilla meshes in the CRM shell: rejected because CRM owns metadata, planning state, and handoff; mesh generation/rendering belongs to local/3D modules.
- Let CT/MPR offline drafts remain on IndexedDB v3: rejected because same-version missing-store browsers can silently fall back to weaker storage.

## Scalability Potential

Low: phone and weak-browser routes remain metadata/preview/handoff only and can cancel stale local operations.
Middle: clinic PCs can inspect ZIP/DICOM metadata and first-frame previews with bounded reads.
High: desktop browsers can preserve CT workbench state durably while external/local modules own pixels and meshes.
Ultra: desktop app/local bridge can later consume the same manifests to generate skull surfaces, implant overlays, and CAD/STL without changing CRM ownership.

## Hardware Impact

Evidence class: API_TYPECHECK/API_BUILD plus SHARED_TYPECHECK plus WEB_TYPECHECK/WEB_BUILD plus STATIC_SOURCE_SMOKE plus synthetic no-PHI DICOM runtime smoke. Runtime microseconds saved: 0 measured. Expected impact is lower peak memory and fewer stale scan tasks on CT metadata/preview paths. No diagnostic CT volume renderer, mesh renderer, or CAD generator was added to the CRM shell.

## Proof

`npm run smoke:api-dicom-scan-abort-yield-source`, `npm run typecheck -w @dental/api`, `npm run build -w @dental/api`, `npm run typecheck -w @dental/shared`, `npm run smoke:dicom-folder-workup`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:dicom-workbench-ui-cancel-source`, `npm run smoke:dicom-workbench-offline-source`, `npm run smoke:visit-offline-queue-source`, `npm run typecheck -w @dental/web`, `npm run build -w @dental/web`, `npm run smoke:web-text-encoding`, and `npm run smoke:api-text-encoding` passed before this rationale update. Web build reported the existing large `workspace` chunk warning; gzip size was not treated as a gate.

---
Date: 2026-06-04

## Problem

The CT runtime contract still trusted too much implicit environment text. A desktop-looking user-agent could unlock the desktop-app lane without proving a local bridge. Browser file-input CT scans also allocated an array of every selected file before applying the file cap. Render-cache planning could claim worker concurrency when Web Workers were not available.

## Solution

Client facts now carry explicit runtime and local capability fields. The API accepts `desktop_app` only when a real desktop/local bridge flag is present; otherwise the route stays PC browser even if the user-agent says Electron or Tauri. Browser CT file-input and migration scans iterate by index up to the cap, and directory scans cap inspected entries per folder. Render-cache worker count now starts from `canUseWorker`, so no-worker clients get `workerCount=0`, decode concurrency 1, and no worker/offscreen progressive targets.

## Rejected Alternatives

- Trust user-agent or platform text for desktop-app CT: rejected because a website, phone, and desktop shell need different pixel/local-file authority.
- Keep `Array.from(fileList)`: rejected because a huge user selection can allocate work that the scan cap will discard.
- Keep worker count tied to quality mode only: rejected because quality cannot create Web Worker capability.

## Scalability Potential

Low: mobile/weak browsers stay in metadata/preview/handoff lanes and avoid up-front FileList materialization.
Middle: PC browsers can keep browser MPR when hardware facts pass, without pretending to be a desktop shell.
High: real desktop shells can unlock local CT lanes through explicit bridge facts.
Ultra: future local bridge can add persistent handles and CT worker modules without changing the runtime DTO.

## Proof

`npm run smoke:imaging-viewer-usability-source`, `npm run smoke:browser-imaging-scan-progress-source`, `npm run smoke:api-dicom-scan-abort-yield-source`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/web`, `npm run typecheck -w @dental/api`, `npm run build -w @dental/api`, `npm run smoke:dicom-folder-workup`, and `npm run build -w @dental/web` passed before this rationale update.

---
Date: 2026-06-04

## Problem

The next CT wave had four integration risks: server folder traversal could still spend work on giant directories before caps, PWA offline caching could overreach into dynamic/local outputs, implant-fit rulers could cross tooth sites, and the new local 3D/report paths could imply more than the CRM actually owns.

## Solution

Server-local CT collectors now traverse with bounded `opendir` iteration and queue indexes. The service worker caches only explicit shell/assets routes and prunes dynamic shell entries. CT geometry/implant-fit now carries site evidence and keeps mixed/unscoped fit evidence as draft. The CT report and local 3D readiness paths are metadata-only: text/JSON report, no PDF dependency, no DICOM pixels, no mesh geometry, no CAD/STL generation in the browser CRM.

## Rejected Alternatives

- Cache all same-origin GETs: rejected because CT/local outputs and API responses are not generic offline shell assets.
- Let FileList/folder/directory work materialize before caps: rejected because weak devices pay the allocation/work cost before the limit can help.
- Use any available ruler for implant ranking: rejected because a measurement from another tooth site can produce a clinically misleading candidate.
- Add mesh/skull rendering into this CRM slice: rejected because local bridge/external 3D modules own geometry; CRM owns metadata, state, and handoff.
- Add PDF generation for reports: rejected because print/text/JSON gives the dentist/lab artifact without a new rendering dependency.

## Scalability Potential

Low: phone/weak browsers get bounded traversal, shell-only offline cache, and metadata/report routes without pixel or mesh load.
Middle: PC browsers can run CT planning state, reports, and local metadata readiness while heavy volume/mesh work remains external.
High: desktop shells can use explicit bridge readiness to route CT surface/arch/guide work to local modules.
Ultra: future local modules can consume the same report, site evidence, and model-manifest contracts for progressive CT volume, skull surface, and guide workflows without changing CRM ownership.

## Proof

`npm run typecheck -w @dental/web`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:browser-imaging-scan-progress-source`, `npm run smoke:web-service-worker-cache-source`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run smoke:api-dicom-scan-abort-yield-source`, `npm run smoke:dicom-folder-workup`, `npm run build -w @dental/web`, `npm run build -w @dental/api`, and `npm run smoke:web-text-encoding` passed before this rationale update. Web build reported the existing large `workspace` chunk warning; gzip size was not treated as a gate.

## Follow-up Integration

The local 3D readiness card now includes a dentist/lab next-action summary rather than only per-lane cards. Browser continuity now reports OPFS, file picker, and directory picker capability while explicitly keeping CT recovery metadata-only: no diagnostic image payloads, no mesh geometry, no directory handles, no local paths, and OPFS diagnostic storage disabled.

Rejected alternative: enabling OPFS as a CT diagnostic image store in the browser. Rejected because OPFS capability does not by itself provide certified viewer ownership, pixel lifecycle policy, PHI audit, or desktop/local bridge performance guarantees.

Additional proof after the follow-up integrations: `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:dicom-workbench-offline-source`, `npm run typecheck -w @dental/web`, and `npm run build -w @dental/web` passed.

The CT render plan now carries typed hardware policy fields: memory budget class, continuous hardware quality weight, progressive slice-window cap, and diagnostic pixel policy. Desktop web is capped to `browser_preview_not_diagnostic` and cannot advertise `diagnostic_full`; explicit desktop app bridge can unlock diagnostic policy, still bounded by the slice-window cap.

Rejected alternative: allow high-end desktop browsers to claim diagnostic-full rendering by hardware score alone. Rejected because browser hardware capability is not the same as desktop/local module authority, pixel lifecycle, or certified viewer ownership.

Additional proof after render-policy integration: `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run smoke:api-dicom-scan-abort-yield-source`, `npm run smoke:dicom-folder-workup`, `npm run typecheck -w @dental/web`, and `npm run smoke:imaging-viewer-usability-source` passed.

---
Date: 2026-06-04

## Problem

Issued document HTML preview fetched server HTML, wrapped it in a `blob:` URL, then opened the blob. That made the preview run as a browser-owned document instead of the API response that carries no-store, nosniff, and restrictive CSP headers. Popup blocking also stopped the preview without an immediate protected fallback.

## Solution

`openIssuedDocumentHtml` now opens the `/api/documents/:id/html` server URL directly when the navigation can load without a custom clinical-secret header. The download path uses a shared `html?download=1` URL helper. If `window.open` returns null, or the current clinic session relies on a header-only clinical secret that a new tab cannot carry, the UI keeps visible guidance and invokes the authenticated archive HTML download fallback with the existing clinical read headers.

## Rejected Alternatives

- Keep blob preview and add manual revocation: rejected because revocation does not restore API CSP/no-store/nosniff headers.
- Inline the HTML in the app shell: rejected because legal/medical documents need the server-rendered archive route and attachment route, not an app-owned execution context.
- Show only a popup warning: rejected because mobile Safari and locked-down clinic PCs need an immediate fallback path.

## Scalability Potential

Low: locked-down phones and weak browsers get a direct download fallback instead of a dead popup.
Middle: PC browsers open server preview without client HTML cloning.
High: desktop shells can use the same URL contract and retain archive download fallback.
Ultra: future portal/auth work can bind the same preview/download URLs without changing the document UI contract.

## Proof

`npm run smoke:document-html-preview-source`, `npm run smoke:document-payload-ui-source`, `npm run smoke:document-html-issue-guards`, and `npm run typecheck -w @dental/web` passed before this rationale update.

---
Date: 2026-06-04

## Problem

The next broad wave exposed four operator-risk classes outside pure CT algorithms: CT render hardware policy was typed but not visible enough in UI, PWA/stale chunk recovery needed runtime proof and explicit shell-cache clearing, browser migration scans could still look frozen on large legacy folders, and communication tasks could be closed without recording what actually happened.

## Solution

Render-cache responses now carry the same memory class, continuous hardware quality weight, slice-window cap, and diagnostic pixel policy as the render plan. Settings renders those facts in workstation readiness, cache plan, and saved workbench cards. PWA recovery now clears stale shell cache before route reloads and uses network-first shell JS/CSS while keeping clinical/API/DICOM/mesh payloads out of Cache Storage. Browser migration scans gained abort/progress/yield behavior. Communication tasks gained typed completion outcomes with a required selector in the web UI and backward-compatible API input.

## Rejected Alternatives

- Hide hardware policy behind derived memory numbers: rejected because clinicians/admins need to know when the browser is only a planning preview.
- Cache all same-origin app traffic for offline: rejected because medical documents, API responses, DICOM pixels, and mesh/CAD/STL artifacts are not shell assets.
- Let higher-tier machines remove browser migration scan caps: rejected because old-MIS folders and browser file APIs still need bounded traversal and a stop path.
- Keep communication completion as a boolean: rejected because no-answer, callback, reschedule, promised payment, and document pickup are operationally different outcomes.

## Scalability Potential

Low: phone/weak browsers get bounded scans, visible cancel, preview-only CT, and shell-only offline recovery.
Middle: PC browsers get progressive CT policy visibility and stable PWA update recovery without claiming diagnostic pixel ownership.
High: desktop shells can use explicit local/desktop modules while the browser still preserves medical payload boundaries.
Ultra: future CT local modules can consume the same render policy and cache-plan fields for real volume/mesh acceleration without changing CRM ownership of metadata and handoff.

## Proof

`npm run smoke:imaging-viewer-usability-source`, `npm run smoke:browser-migration-scan-progress-source`, `npm run smoke:settings-view-source`, `npm run smoke:web-service-worker-cache-source`, `npm run smoke:web-service-worker-runtime`, `npm run smoke:app-update-recovery-source`, `npm run smoke:communication-task-complete-contract`, `npm run smoke:communications-view-source`, `npm run smoke:communication-task-outcomes`, `npm run smoke:dicom-workbench-ui-cancel-source`, `npm run smoke:schedule-admin-guard`, `npm run smoke:schedule-configuration`, `npm run smoke:schedule-view-source`, `npm run smoke:dicom-workbench-offline-source`, `npm run smoke:api-dicom-scan-abort-yield-source`, `npm run smoke:dicom-folder-workup`, `npm run smoke:web-text-encoding`, `npm run typecheck -w @dental/shared`, `npm run typecheck -w @dental/api`, `npm run typecheck -w @dental/web`, and `npm run build -w @dental/web` passed before this rationale update.

Follow-up: CT server-preparation fetches now use a UI-owned abort controller and neutral cancel path, so the already abort-aware API routes can stop when the operator cancels. Schedule admin prop naming now uses schedule-owned identifiers instead of Telegram names; behavior remains the same, but future schedule auth edits no longer cross a misleading component boundary.

Follow-up: ZIP-contained virtual DICOM paths now stay metadata/handoff-only unless MPR is actually openable from real pixel paths. Direct local DICOM remains unchanged; archive-only series no longer emit local `dicomfile:` references, local manifest readiness, or enabled volume tools.

Follow-up: daily surfaces now have a source accessibility smoke across schedule, documents, payment capture, communications, settings, and the shell. This does not replace runtime mobile checks, but it gives a cheap regression gate for keyboard routes, disabled/busy guidance, row context names, settings tab keys, and reduced-motion handling.

---
Date: 2026-06-04

## Problem

The next orchestration wave exposed three correctness risks: accepted visit saves could queue explicit server rejections as offline retries, CT implant/model copy still contained technical browser/CAD boundary wording, and local CT planning builders used coarse render labels even though the API now produces a continuous hardware quality weight.

## Solution

Accepted visit save failures are now classified before queueing: offline/network/temporary server failures stay retryable, while closed/voided/validation/conflict responses stay visible operator errors and do not become false local accepted notes. CT implant and local 3D readiness copy now states that CRM stores plan parameters and readiness only; CAD/STL and surface geometry remain laboratory/local-module outputs. CT reconstruction and implant modeling weights now consume `renderPlan.hardwareQualityWeight` so derived planning density scales continuously with the actual workstation policy.

Finance and speech were also tightened in parallel: payment capture now states append-only ledger behavior and payment history shows linked document context, while queued speech keeps recoverable audio until a real recognizer is available.

## Rejected Alternatives

- Queue every accepted-visit save failure: rejected because explicit clinical/server rejection is not an offline retry problem.
- Let browser CRM copy imply CAD/STL or skull mesh ownership: rejected because CRM currently owns metadata, plan parameters, and handoff, not certified geometry generation.
- Keep CT planning density tied only to enum-like quality/gpu labels: rejected because the render policy already owns a continuous hardware score for weak phones through high-end workstations.
- Delete queued speech audio after local fallback text: rejected because fallback text is not equivalent to actual audio recognition.

## Scalability Potential

Low: phone/offline paths keep recoverable visit and speech work without inventing accepted server state; CT derived planning stays sparse.
Middle: browser PCs get readable CT/3D boundaries and payment/document context without heavier payloads.
High: stronger workstations get denser derived CT planning through the same hardware policy fields.
Ultra: future desktop/local CT modules can consume the same no-pixel/no-mesh handoff while owning real volume and CAD/STL work.

## Proof

`npm run smoke:core-route-validation`, `npm run smoke:communication-task-outcomes`, `npm run smoke:communications-view-source`, `npm run smoke:imaging-viewer-usability-source`, `npm run smoke:visit-offline-queue-source`, `npm run smoke:visit-draft-status-contract`, `npm run smoke:app-boot-state-source`, `npm run smoke:payment-capture-source`, `npm run smoke:finance-view-source`, `npm run smoke:finance-ledger-source`, `npm run smoke:finance-planning-source`, `npm run smoke:billing-document-link`, `npm run smoke:tax-payment-explicit-payer`, `npm run smoke:speech-queue-source`, `npm run smoke:speech-clinical-scope`, `npm run smoke:speech-provider-errors`, `npm run smoke:speech-route-validation`, `npm run smoke:speech-key-rotation`, `npm run smoke:web-text-encoding`, and `npm run typecheck -w @dental/web` passed before this rationale update.

---
Date: 2026-06-04

## Problem

The integration pass found two boundary mismatches after parallel hardening. The clinical guard smoke still treated DICOMweb connector checks as clinical-read work even though they are Settings-admin work, and the payment UI could auto-link a refund/correction request as the target document for a new incoming payment.

## Solution

`smoke:clinical-mutation-guard` now expects one fewer imaging clinical-read route and explicitly checks that the DICOMweb connector call uses settings access headers. Payment submit now excludes `payment_refund_correction_request` from automatic document selection, matching the server's append-only billing boundary. The local speech bridge readiness smoke also has a first-class npm alias so local Whisper/Vosk UI/API wording remains repeatable proof.

## Rejected Alternatives

- Put DICOMweb connector setup back under clinical-read access: rejected because connector setup belongs to settings/admin configuration, not patient data read.
- Let the UI send refund/correction request documents and rely on API rejection: rejected because the operator sees a broken payment submit for a document type that should never be selected as incoming payment evidence.
- Keep the speech readiness check as a direct `node` command only: rejected because proof commands should be discoverable through `package.json`.

## Proof

`npm run smoke:clinical-mutation-guard`, `npm run smoke:dicomweb-connector-boundary`, `npm run smoke:payment-capture-source`, `npm run smoke:billing-document-link`, `npm run smoke:payment-idempotency`, `npm run smoke:speech-local-bridge-readiness`, `npm run smoke:speech-queue-source`, and `npm run typecheck -w @dental/web` passed before this rationale update.

Follow-up: the browser payment submit now sends its own `clientMutationId`, so the already implemented server idempotency path is reachable from real UI retries. Service-worker update recovery now clears stale dynamic chunks without destroying the core offline shell fallback.
