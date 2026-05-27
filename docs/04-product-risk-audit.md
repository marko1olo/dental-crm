# Product Risk Audit

Date: 2026-05-14

This is the current blunt assessment of why a clinic would refuse to use the product if it stayed as-is.

## Critical Refusal Reasons

1. Data could disappear.
   - A CRM that loses patients, payments, documents, imports, or chair/staff changes after an API restart is not a CRM.
   - Closed now for the prototype/MVP path with file-backed mutable state.
   - Follow-up closure: prototype state now writes a SHA-256 checksum and rotates JSON backups before overwrite; Settings/Audit exposes the current save and backup status.
   - Follow-up closure: `/api/system/persistence/verify` checks current state and recent backups for readability/checksum status, and `/api/system/persistence/export` gives owner/admin an emergency JSON export before risky migrations.
   - Still not production complete: PostgreSQL migrations, scheduled off-device backups, restore workflow, encryption, and tenant isolation remain mandatory.

2. No real authentication or tenant enforcement.
   - Role focus and access policies are presentation logic until identity exists.
   - A network clinic will not trust branch data without real session, tenant, role, and audit enforcement.
   - Follow-up closure: API now sends baseline no-store/privacy/security headers.
   - Still not production complete: these headers are not a substitute for authentication, tenant isolation, encryption, backups, or access-control tests.

3. The frontend is too monolithic.
   - `App.tsx` is over 3000 lines.
   - This slows product iteration, hides UX regressions, and makes role-specific work harder to reason about.
   - The next structural work should extract pages and reusable work-surface components without changing behavior.

4. Too many intelligent surfaces can become noise.
   - Recommendations, readiness, close checklist, clinical rules, and schedule suggestions are useful only if each answers one next action.
   - Every new smart block must stay capped and role-owned.
   - Follow-up closure: post-load API/action failures now show as inline notices, not as a full app-blocking boot screen.

5. Medical trust is not only UI.
   - Doctors need reliable signing, immutable history, document versioning, and visible source-of-truth boundaries.
   - AI must remain draft-only and never appear to make a final diagnosis.
   - Follow-up closure: accepting a reviewed draft or manual correction now writes into the active visit and records audit, while final signing remains separate.

6. Clinic setup needed a real onboarding flow.
   - Original risk: solo doctor, one chair, small clinic, and network modes existed as configuration, but first-run did not guide a clinic through staff, chairs, roles, documents, payments, and import safely.
   - Follow-up closure: first-run setup now appears after dashboard load, stays dismissible/reopenable, walks through role, specialty, clinic mode, legal/license profile, team, chairs, import sources, and stores local dismissal fallback under clinic `organizationId` after the clinic profile is known.
   - Follow-up closure: clinic legal/contact/license profile now has a dedicated server-backed settings endpoint and Settings form, so document-critical data persists until changed.
   - Follow-up closure: saved patient/staff/chair selections are reconciled against the loaded clinic dashboard before they drive filters, appointment defaults or Telegram staff QR creation, so stale ids from another clinic fall back to current active records.

7. Migration is not useful until it survives bad data.
   - Preview, warnings, smart parser, CSV report, and folder scan exist.
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
