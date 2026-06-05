# Product Risk Audit

Date: 2026-05-14

This is the current blunt assessment of why a clinic would refuse to use the product if it stayed as-is.

## Critical Refusal Reasons

1. Data could disappear.
   - A CRM that loses patients, payments, documents, imports, or chair/staff changes after an API restart is not a CRM.
   - Closed now for the prototype/MVP path with file-backed mutable state.
   - Follow-up closure: prototype state now writes a SHA-256 checksum and rotates JSON backups before overwrite; Settings/Audit exposes the current save and backup status.
   - Follow-up closure: `/api/system/persistence/verify` checks current state and recent backups for readability/checksum status, and `/api/system/persistence/export` gives owner/admin an emergency JSON export before risky migrations.
   - Follow-up closure: public `/api/health` no longer exposes persistence or backup metadata; Settings/Audit reads those details only through the guarded persistence verify route.
   - Follow-up closure: persistence verify/export now translate missing, unreadable, and checksum-failed state files into operator-readable actions; source/runtime smokes reject raw JSON parser errors and persistence diagnostic tokens in browser-visible payloads.
   - Still not production complete: PostgreSQL migrations, scheduled off-device backups, restore workflow, encryption, and tenant isolation remain mandatory.

2. No real authentication or tenant enforcement.
   - Role focus and access policies are presentation logic until identity exists.
   - A network clinic will not trust branch data without real session, tenant, role, and audit enforcement.
   - Follow-up closure: API now sends baseline no-store/privacy/security headers.
   - Follow-up closure: prototype admin secrets are now domain-scoped. Clinical read/mutation/export routes accept only `DENTE_CLINICAL_ADMIN_SECRET`; schedule mutations accept only `DENTE_SCHEDULE_ADMIN_SECRET`; settings routes use `DENTE_SETTINGS_ADMIN_SECRET`; Telegram control-plane routes use `DENTE_TELEGRAM_ADMIN_SECRET`. Settings, schedule, and Telegram secrets no longer silently act as clinical or cross-domain fallbacks.
   - Follow-up closure: the web app now keeps clinical, settings, schedule, and Telegram admin-secret sessions and input drafts separate in memory. Fixed Schedule, Settings, and Telegram panels pass their target domain explicitly, so retained onboarding/tab state or a typed secret in another panel cannot unlock the wrong route family; one-secret deployments can still seed all domains deliberately through the clinical/global unlock.
   - Still not production complete: these headers are not a substitute for authentication, tenant isolation, encryption, backups, or access-control tests.

3. The frontend is too monolithic.
   - `App.tsx` is over 3000 lines.
   - This slows product iteration, hides UX regressions, and makes role-specific work harder to reason about.
   - The next structural work should extract pages and reusable work-surface components without changing behavior.

4. Too many intelligent surfaces can become noise.
   - Recommendations, readiness, close checklist, clinical rules, and schedule suggestions are useful only if each answers one next action.
   - Every new smart block must stay capped and role-owned.
   - Follow-up closure: post-load API/action failures now show as inline notices, not as a full app-blocking boot screen.
   - Follow-up closure: Telegram settings validation now converts URL/signed-button technical reasons into Russian operator actions, and source/contract smokes reject raw `https_required`, patient-identifying reason tokens, and callback secret env names in user-facing messages.
   - Follow-up closure: Telegram settings payload validation now uses the shared Telegram route-body parser before settings mutation, so malformed Settings/Telegram saves return controlled operator copy instead of zod issue arrays or DTO field paths.
   - Follow-up closure: Telegram send/webhook transport failures now convert `rate_limited`, `auth`, `network`, photo-fallback, callback-answer, and retry delay details into Russian operator warnings. Stable machine `blockedReason` values remain, while `warnings` and delivery messages reject raw `telegram_transport_*` and `retry_after_seconds:*` tokens; rate-limit backoff uses structured `retryAfterSeconds`.
   - Follow-up closure: Telegram link-code and message-preview control-plane failures now return stable `error`, bounded `reason`, and Russian recovery copy. Public bodies no longer forward chat-encryption storage exceptions, preview lookup exceptions, env keys, zod issue arrays, or route/parser internals.
   - Follow-up closure: Telegram chat-link revoke now returns `TelegramChatLinkNotFound` with Russian operator copy when a binding is missing or stale, and runtime smoke rejects bare-code responses plus `linkId`, runtime-scope ids, route params, parser terms, or secrets in that body.
   - Follow-up closure: Settings/Audit local-module readiness, KND XML tax-office setup, and document PDF export now translate malformed URLs, network probe failures, missing tax-office code, missing document-print browser, and browser launch failures into operator-readable actions; source/runtime smokes reject raw parser/network/spawn text and env keys in these user-facing responses.

5. Medical trust is not only UI.
   - Doctors need reliable signing, immutable history, document versioning, and visible source-of-truth boundaries.
   - AI must remain draft-only and never appear to make a final diagnosis.
   - Follow-up closure: accepting a reviewed draft or manual correction now writes into the active visit and records audit, while final signing remains separate.
   - Follow-up closure: patient create/update, patient administrative profile, schedule appointment create/update, billing payment create, AI recognition job, visit-note draft, communication task completion, and clinical-rule create/update/evaluate now return route-owned operator validation messages for bad payloads. Runtime/source smoke rejects raw zod `issues`, schema paths, parser tokens, and workflow field names in these API responses.
   - Follow-up closure: patient update and administrative-profile missing-record failures now return stable `PatientNotFound` plus operator message. Patient routes no longer forward domain `error.message`, raw `patientId` wording, DTO field names, parser/schema text, or null/undefined internals in public failures.
   - Follow-up closure: schedule appointment create/update mutation failures now return stable `code`, bounded `reason`, and route-owned Russian `message` instead of forwarding domain `error.message`. Active-visit locks, missing appointments, resource overlaps, missing team/resource data, invalid merged time, and outside-hours failures no longer expose raw `appointmentId`, schema/parser text, internal domain detail prefixes, null, or undefined in public bodies.
   - Follow-up closure: AI recognition and visit-note draft clinical scope failures now return stable `AiRecognitionScopeError` / `VisitNoteDraftScopeError` codes plus operator messages. Unknown patients, unknown imaging studies, and wrong-patient imaging links no longer put human copy, `patientId`, `imagingStudyId`, request-shape text, parser names, or null/undefined internals into the public `error` field.
   - Follow-up closure: billing payment scope/link failures now return stable `BillingPaymentScopeError` plus operator messages. Unknown patient/visit/document, wrong-patient document links, voided documents, and non-financial document links no longer put human copy or route ids directly into the public `error` field.
   - Follow-up closure: visit draft autosave and accept routes now stop invalid payloads at the route boundary with doctor-facing recovery copy. Runtime/source smoke rejects raw zod `issues`, parser tokens, and visit-draft DTO keys before any draft mutation or audit write can run.
   - Follow-up closure: visit draft not-found and closed-visit mutation failures now return stable `VisitNotFound` / `VisitDraftMutationRejected` codes, bounded `reason`, and route-owned Russian `message`; public bodies no longer forward raw visit domain exceptions or route/schema fields.
   - Follow-up closure: the global API error fallback now converts any missed zod validation exception into one bounded validation message without `issues`, schema paths, field names, or parser tokens. Runtime/source smoke imports the API through `createDenteApiApp`, proves synthetic zod and technical exceptions stay clinic-readable, and avoids starting the HTTP listener or Telegram worker during the proof.
   - Follow-up closure: document operational refusals now separate stable `DocumentOperationRejected` machine error from Russian `message`. Missing documents, blocked printable HTML, document issue chains, tax duplicate/payment-scope blocks, and KND XML blocks no longer put operator copy in `error`; the KND 1151156 invalid-INN create path keeps a safe route-owned 12-digit explanation instead of raw zod issue data.

6. Clinic setup needed a real onboarding flow.
   - Original risk: solo doctor, one chair, small clinic, and network modes existed as configuration, but first-run did not guide a clinic through staff, chairs, roles, documents, payments, and import safely.
   - Follow-up closure: first-run setup now appears after dashboard load, stays dismissible/reopenable, walks through role, specialty, clinic mode, legal/license profile, team, chairs, import sources, and stores local dismissal fallback under clinic `organizationId` after the clinic profile is known.
   - Follow-up closure: clinic legal/contact/license profile now has a dedicated server-backed settings endpoint and Settings form, so document-critical data persists until changed.
   - Follow-up closure: saved patient/staff/chair selections are reconciled against the loaded clinic dashboard before they drive filters, appointment defaults or Telegram staff QR creation, so stale ids from another clinic fall back to current active records.
   - Follow-up closure: Settings preferences, clinic mode/profile, staff, chair, and working-hours mutations now return route-owned operator validation messages for bad payloads. Runtime/source smoke rejects raw zod `issues`, schema paths, parser tokens, and settings DTO keys in these API responses.
   - Follow-up closure: Settings clinic-profile schedule conflicts, staff/chair schedule not-found, staff/chair schedule active-appointment conflicts, and communication task not-found now return stable machine codes plus bounded Russian `message`; public bodies no longer forward raw domain `error.message`, route ids, zod issue arrays, or settings/communication DTO keys.

7. Migration is not useful until it survives bad data.
   - Preview, warnings, smart parser, CSV report, and folder scan exist.
   - Follow-up closure: patient import, smart import, local-source discovery/workup/probe, migration autopilot, migration reports, smart commit, and clinic public lookup now return route-owned operator validation messages for bad payloads. Runtime/source smokes reject raw zod `issues`, schema paths, field names, and parser tokens in these API responses.
   - Follow-up closure: document create/issue/void, document ingestion extract, and price-list analysis now return route-owned operator validation messages for bad payloads. Runtime/source smoke rejects raw zod `issues`, schema paths, parser tokens, and document/file/price-list payload keys in these API responses.
   - Follow-up closure: Settings price-list analysis now renders analyzer warnings through UI-owned Russian labels; source smoke blocks raw price-list warning ids in the visible result panel.
   - Follow-up closure: Settings patient import and imaging import rows now render warnings through UI-owned readable formatters; source smoke blocks raw `row.warnings.join(", ")` and full local file-path ready fallbacks in those visible rows.
   - Follow-up closure: Settings AI recognition result warnings now render through UI-owned clinical labels; source smoke blocks raw backend recognition warnings in the visible result panel.
   - Follow-up closure: Settings clinic public lookup, migration autopilot clinic lookup, and smart-import clinic suggestion warnings now render through UI-owned operator labels; source smoke blocks raw lookup/suggestion warning chips in those visible panels.
   - Remaining risk: duplicate resolution, rollback, import history drill-down, and source-specific mapping templates.

8. Offline/online continuity was incomplete.
   - Doctors cannot trust a visit screen if dictation disappears after a reload or API failure.
- Follow-up closure: active visit transcript, selected specialty, and structured EMR fields now autosave locally per visit.
- Follow-up closure: local drafts restore only when newer than the server visit, and server save remains the reviewed source path.
- Follow-up closure: server-side draft snapshots now persist the current dictation/EMR draft before acceptance, while signed/accepted EMR revision remains a separate doctor action.
   - Follow-up closure: reviewed visit-note saves now queue locally when the server is unavailable and retry later.
   - Follow-up closure: accepted visit-note saves now carry a client mutation id, server revision, and save receipt, so repeated sync attempts do not create duplicate server mutations or audit noise.
   - Follow-up closure: both API and client now have deterministic rule-parser fallback for visit-note drafts when model/API/network is unavailable.
   - Follow-up closure: PWA shell, manifest, icon, service worker, and offline page exist; `/api/*` medical responses are intentionally not cached.
   - Follow-up closure: Visit now shows a compact device readiness card, and Settings/Audit can verify local draft writes, IndexedDB audio queue, PWA/service-worker state, Cache Storage, quota, persistent-storage grant, and pending sync counts.
   - Follow-up closure: Settings/Audit now verifies optional local workstation bridges for STT, OCR, DICOM/CBCT worker, and OHIF without sending clinical payloads. Missing or unreachable bridges stay warnings, not blockers.
   - Follow-up closure: Settings/Audit now shows local bridge use-plans for dictation, OCR, price-list photos, CBCT/MPR, and imaging import. These plans choose server/local/manual paths but never block the doctor workflow.
   - Follow-up closure: speech recognition, local dictation queue, and neural polish failures now return clinic-readable recovery copy; raw provider classes, HTTP tokens, upstream messages, zod issue text, and secret-bearing diagnostics stay out of doctor/API warnings.
   - Follow-up closure: speech recording strategy, speech chunk upload, and transcript polish routes now return route-owned operator validation messages for bad payloads. Runtime/source smoke rejects raw zod `issues`, parser tokens, and speech DTO keys before provider, queue, or clinical-scope work can run.
   - Follow-up closure: speech clinical-scope failures now return stable `SpeechClinicalScopeError` plus doctor/admin-readable Russian messages. Chunk upload, chunk audit, recovery, and assembly no longer expose `visitId`, `patientId`, parser/helper names, request-query details, `base64`, or speech transport jargon in public failures.
   - Follow-up closure: speech chunk audio rejection and retry identity conflicts now return stable `SpeechChunkRejected` plus bounded `reason` and Russian recovery copy. Public bodies no longer forward audio decoder text, queue identity mismatch exceptions, `recordingId`, `chunkIndex`, MIME, base64, byte-limit, parser, or path details.
   - Follow-up closure: imaging/DICOM routes now return route-owned operator validation messages for bad manifests, DICOMweb checks, viewer packets, local folder scans, workup plans, workbench bundle saves, viewer-session saves, and study creation. Runtime/source smokes reject raw zod `issues`, schema paths, local folder fields, viewer-state fields, and parser tokens in those API responses.
   - Follow-up closure: imaging study lookup and clinical scope failures now return stable `ImagingStudyNotFound` / `ImagingStudyScopeError` codes plus Russian messages. Viewer-session, preview, and study-create failures no longer expose `Study not found`, `patientId`, `visitId`, request params, parser names, or null/undefined internals.
   - Follow-up closure: DICOM planning task titles, reasons, and blockers now use route-owned Russian operator copy; source smoke blocks English `Volume stack`, `Panoramic reconstruction`, and implant-library warning text from returning to the visible planning packet.
   - Follow-up closure: CT workup now derives CPU/GPU memory budgets from DICOM image geometry, exposes phased render-cache decisions for first paint/navigation/idle refinement, and classifies CT-derived skull/mandible/maxilla/bone surface model roles as metadata-only organizer hints.
   - Follow-up closure: DICOM workstation readiness now separates site, phone/tablet, PC browser, and desktop app routes, and distinguishes offline local DICOM folders from offline remote DICOMweb/PACS archives. Mobile/tablet routes stay preview/handoff, desktop app can use local folders offline, and offline remote archives stay metadata-only instead of pretending pixels are available.
   - Follow-up closure: DICOM render-cache planning now emits bounded executable progressive stages with slice order, request type, cancel group, prerequisites, decimation, and resident-window limits. Future CT viewers can follow one server-owned schedule instead of inventing load order client-side.
   - Follow-up closure: CT-derived 3D surface files now receive a model-workbench manifest. Skull/mandible/maxilla/bone surface models route to local bridge or external 3D viewing with same-folder CT pairing hints; CRM does not load mesh geometry into the clinical shell.
   - Follow-up closure: accepted visit-note save retries now live in IndexedDB under the offline database, with scoped migration from the legacy `localStorage` queue and a restricted-browser fallback. Visit boot no longer synchronously reads that queue from web storage.
   - Follow-up closure: DICOM workbench recovery and per-series MPR view controls now live in IndexedDB under the offline database, with migration from legacy `localStorage` and restricted-browser fallback. The CRM still stores no CT pixels or mesh geometry in this browser recovery state.
   - Follow-up closure: browser-local CT/folder selection now runs as a cancellable yielding scan with visible progress. It reports file/folder/DICOM/archive/3D counts without exposing local paths, uses `AbortController` for stop, and yields with `scheduler.yield()` or a timer fallback so phone and weak-PC browsers do not sit in one long scan task.
   - Follow-up closure: server-side local imaging/DICOM folder scans now run through a request-scoped abort/yield wrapper. Local folder discovery, local organizer, DICOM folder-series preview, first-frame preview, folder-workup plan, and generic folder scan preview stop on client abort and yield between bounded folder/file/header work units.
   - Still not production complete: encrypted local storage, visible conflict-resolution UI, auth/tenant enforcement, and backup/restore tests remain mandatory.

9. Accessibility and older-user ergonomics need hard checks.
   - The UI has responsive smoke tests, but it needs systematic keyboard, contrast, font, focus, and low-vision review.

10. The visit screen can start with the wrong thing.
   - A tired doctor should not land on configuration text or a blocking command before seeing patient, visit reason, warnings, and dictation.
   - Closed now for the main visit path with a compact visit focus bar and collapsed protocol library.
   - Follow-up closure: on mobile Visit, global role switcher and global top actions are hidden from the first screen so the clinical command surface moves up.
   - Follow-up closure: clinical rules on Visit show only the highest-priority warning plus a count for the rest, so warnings no longer push dictation and EMR down by default.
   - Follow-up closure: dictation is the primary action in the focus bar; warnings are secondary and cannot hijack the doctor's next click.
   - Follow-up closure: quick dictation phrase chips now append common clinical fragments without forcing a template wizard.
   - Follow-up closure: structured EMR fields now sit directly under dictation instead of below anatomy and system panels.
   - Follow-up closure: structured EMR fields are editable, including anamnesis, so the doctor owns the final text before saving.
   - Follow-up closure: warning details are collapsed by default; opening them is a deliberate secondary action.
   - Follow-up closure: top specialty focus now shows only the active doctor's/chair's likely specialties and current choice; the full catalog remains available inside the collapsed protocol library.
   - Follow-up closure: new doctors/assistants can be created with an explicit specialty instead of silently becoming therapists.

## Closed In This Pass

- Added file-backed persistence for mutable prototype state.
- Health endpoint now reports persistence status and state file metadata.
- Persistence now includes checksum validation, rotating local JSON backups, and a Settings/Audit data-safety panel.
- Settings/Audit can now verify backup integrity and download a no-store JSON state export for owner/admin emergency recovery.
- Patient creation now records an audit event instead of silently mutating memory.
- Runtime state files are ignored by git.
- Visit now starts with a patient/closure focus bar, and protocol templates are collapsed into an optional tool instead of occupying the first screen.
- Visit warning language was softened from hard-stop language to warnings/important checks, with dictation restored as the main doctor action.
- Visit dictation now has quick phrase chips, and the warning panel is collapsed by default so the doctor sees work before system commentary.
- Accepting a reviewed draft or manual correction now updates active visit fields through `/api/visits/:visitId/draft/accept` and writes an audit event.
- Local visit autosave and restore now protect active dictation/EMR edits from reloads and API outages during prototype work.
- Local pending-save queue now protects reviewed visit-note acceptance when the API is unavailable.
- Accepted visit-note saves now use client mutation ids, server revisions, and save receipts, so retries are idempotent and conflict warnings stay non-blocking.
- PWA shell/offline page added without caching API medical data; service worker is same-origin only, keeps navigation network-first, and uses cached shell/static assets only as fallback.
- Browser continuity audit added: localStorage probe, IndexedDB queue probe, service-worker state, Cache Storage support, quota estimate, persistent-storage request, and Visit device status.
- Local workstation bridge audit added: optional Whisper.cpp, Vosk, DICOM/CBCT worker, OCR worker, and OHIF endpoints are probed with short timeouts, URL redaction, and local/private-network default policy.
- Local bridge use-plans added: Settings can now explain whether current dictation/OCR/CBCT/import work should use local bridge, server/Groq path, metadata preview, or manual review.
- Speech provider and neural polish failure copy now stays clinic-readable and keeps deterministic/local text as the recovery path.
- Production web build now splits React, icons, shared schemas, and app code into separate chunks, removing the oversized single-JS warning without changing the clinical UI.
- Post-load API/action failures no longer replace the working app with a blocking error screen.
- Server and browser deterministic parsers now provide non-AI fallback drafts by specialty when model/API/network is unavailable.
- Server and browser now use one shared specialty parser, with explicit-section priority before keyword fallback.
- Visit specialty focus is narrowed to the current doctor/chair/reason, while all protocols remain reachable on demand.
- API baseline no-store/privacy/security headers added.
- First-run clinic setup added without making daily doctor work wizard-only.
- Clinic legal/contact/license profile editing added to Settings and persisted through `/api/settings/clinic/profile`.
- Saved clinic-workflow selections now reconcile against active patients, staff and chairs after dashboard load instead of trusting stale UUIDs from an older clinic context.

## Next Highest-Leverage Fixes

1. Extract the monolithic React app into page and widget modules.
2. Add session/role scaffolding so access policies become enforceable API behavior.
3. Add persistence tests around patient/document/payment/communication mutations and active visit draft acceptance.
4. Add encrypted offline storage, visible sync conflict handling, and auth/tenant enforcement before any real clinical deployment.
5. Add authenticated user-level scoping to onboarding completion. The current browser fallback is clinic-scoped by `organizationId`; it is not yet per human user/role.
