# UX Principles

Date: 2026-05-12

Goal: this product must feel like a dental cockpit for one cabinet, not a spreadsheet.

## Non-Negotiable UX Rules

- The first screen is the working shift: who is next, what must be done, and what needs attention before closing the visit.
- Every patient card must expose the next useful action: start visit, call, open documents, issue tax certificate.
- Patient context must be compressed: one risk label, one next action, and a few chips for debt, recall, documents, and communication are enough for the default view.
- EMR is not a giant form by default. It is a guided note with sections, dictation, tooth context, and a clear sign/close action.
- The structured EMR draft must sit immediately after dictation and be editable. A tired doctor should not scroll through anatomy, templates, or warnings to see or correct what will be accepted.
- Documents are a checklist: contract, consent, act, payment, tax certificate. Staff should see what is missing without opening five screens.
- Payments are a daily work surface: the administrator must see plan amount, paid amount, remaining debt, tax-deduction amount, and last payments without opening Settings.
- Treatment-plan variants belong near payments: staff need to explain urgent, standard, optimal, and maintenance paths without rebuilding the plan in front of the patient.
- Communications are a daily work surface: confirmations, debt calls, document pickup, post-visit instructions, and recalls must be visible as role-owned tasks.
- Dental work needs visual anatomy. Tooth chart is a first-class control, not a report hidden behind a table.
- Patient images are clinical context, but the full viewer is now a dedicated Imaging page. Shift and Visit show counts, warnings, and entry points instead of pushing the EMR down.
- X-ray controls must be immediate and compact: rotate, flip, invert, brightness, contrast, zoom, reset. They belong in Imaging, not above the doctor's primary visit command surface.
- DICOM series grouping belongs in Settings/Imports as an admin preview. It should answer "is this a complete study, can MPR open, can panoramic reconstruction be attempted, and which viewer path does it need" without turning the visit screen into a radiology workstation.
- CBCT/MPR controls may be rich only inside the dedicated Imaging workbench: axial/coronal/sagittal/oblique/panoramic, window preset, slab, crosshair, linked planes, measurement/export. The Visit screen should surface the result and warnings, not the workstation plumbing.
- Voice quality is a warning layer, not a gate. If STT confidence, fallback, silence, or provider metadata looks risky, the Visit strip should say "check" and explain the next action, while typing/saving continues.
- Mobile layout must work for quick lookup, patient calls, reminders, and dictation. Heavy EMR editing can be desktop-first, but must not break on phone.
- Older doctors need obvious controls, stable layout, large targets, readable contrast, and no hidden critical actions.
- Hidden top-level workspaces are not acceptable as the default render path. Shift, patient cockpit, Imaging, Documents, Payments, Communications, compliance, and Settings mount only when the route needs them, so the first screen does not build a large invisible DOM before the doctor acts.
- Inside Documents, structured legal, tax, patient, payment, and workflow payload editors mount only for the selected document kind. Inactive form editors must not remain as hidden DOM, because a doctor usually edits one document packet at a time.
- Inside Settings, clinic, access, Telegram, protocols, rules, prices, sources, AI, imports, and audit tools mount only for the active tab or explicit shared source/import route. Inactive admin tools must not remain as hidden DOM, because Settings is already heavy enough for weak clinic PCs.
- AI must look like a draft assistant. It must never look like an authority that silently decides diagnosis.
- AI recognition must show confidence, warnings, and next step in the same surface where it was started.
- Specialty protocols must make the visit easier, not busier: choose specialty, see one relevant template, prefill a draft, then let the doctor review.
- The Visit page must not show every specialty by default. Show the current doctor's/chair's likely specialties first; keep the full catalog inside a deliberate protocol disclosure.
- General exams are a first-class clinical flow, not an absence of specialty. They need their own prompts, imaging suggestions, warnings, and plan handoff.
- A doctor or assistant must be created with an explicit specialty. Defaulting every doctor to therapy creates wrong templates and wrong trust.
- Protocol templates are optional support on the Visit page, not the first thing a tired doctor must parse.
- Dictation needs quick phrase chips for repetitive clinical fragments. They must append text without forcing the doctor through a wizard.
- Repeated UI/tool choices must survive refresh and workstation changes: role focus, selected specialty, selected patient, schedule filters, default doctor/assistant/chair for new appointments, payment method, tax document year, import mode, price-list AI toggle, imaging filter, local viewer connector URLs, and first-run setup completion are loaded local-first, reconciled with `/api/settings/preferences`, then saved again only after server hydration completes.
- First opening must offer a compact setup path for a new clinic or doctor: role, specialty, clinic mode, legal/license fields, team with explicit role/specialty, chairs, doctor/assistant/chair working hours, Telegram, and import sources. The import source step must let the user choose persisted defaults for price lists, patient migration, mixed import, document ingestion, imaging, DICOMweb, and OHIF inline, not only send them to Settings. It must be dismissible, server-persisted in UI preferences, legacy-local fallback compatible, and reopenable from Settings.
- First opening must not mark setup complete while the active first appointment is blocked by team or schedule readiness. The same appointment-readiness checks used by the working schedule must feed onboarding completion.
- First-run dismissal fallback must be clinic-scoped by `organizationId`; one clinic's completed onboarding must not hide the setup master for a new clinic on the same workstation.
- Clinic setup is persistent configuration, not visit data. Saved clinic profile fields must stay until changed and must feed document generation from the server render context.
- First-run clinic profile edits must not be lost when the user moves steps, hides setup, or finishes setup. Dirty profile edits should auto-save after the dashboard is ready and must be flushed before onboarding navigation/dismissal.
- Clinic profile and UI preference persistence must be verified through file-backed state reload, not only same-process PUT/GET behavior.
- UI preference schema growth must be backward-compatible: older partial state files must load with explicit safe defaults for role, specialty, payment method, source/import modes, imaging URLs, Telegram filters, onboarding state, and document defaults instead of breaking `/api/settings/preferences`.
- Preference persistence must stay separate from clinical drafts. Do not put patient text, amounts, audio chunks, image payloads, DICOM pixels, or raw import blobs into the shared UI preference record.
- Long medical-document drafts such as 025/у may be recovered locally only with a patient/visit/form scoped key, never as global UI preferences and never as a substitute for signed visit sources at issue time.
- Telegram bot mode, privacy mode, QR subject and outbox filters are saved configuration. Every select value must be normalized before persisting so invalid browser/plugin values cannot poison clinic bot setup.
- Schedule, document and clinical-rule selects are also workflow state, not disposable UI strings. Appointment status, schedule status filter, document kind, intake/tax/procedure/treatment/post-visit/X-ray/025/у/release/refund/void fields and rule editor selects must normalize DOM values before state update so invalid browser/plugin values cannot enter preferences, local drafts, document payloads or appointment mutations.
- Payment capture may remember the chosen payment method, but fiscal receipt date/number, payer identity document, payer birth date, INN, and tax code are payment facts and must be saved on the payment ledger, not in UI preferences.
- Dictation and structured EMR edits must autosave locally per active visit. Local restore should happen only when it is newer than the server visit to avoid overwriting reviewed server data.
- Save must not become a hard blocker. If server sync fails, the reviewed visit note should stay local, show an explicit pending-server state, and retry sync later.
- After the dashboard is loaded, action/API errors must stay as inline notices. Do not replace the whole working app with an error screen while a doctor is in the visit.
- Document and clinic-profile save errors must surface the server's actual blocking reason. A doctor or administrator should see "missing fiscal receipt number" or "clinic license data incomplete", not only `API 409`.
- Document issue blockers are part of the workflow, not backend trivia. Missing clinic legal profile, missing payer full name, missing payer birth date, missing fiscal receipt number, and mixed-taxpayer tax drafts must be shown as actionable reasons before the user prints or sends a document.
- Tax-year choice is a legal boundary, not just a filter. KND 1151156 is exposed for 2024+ payments only; 2021-2023 payments route to the legacy certificate draft, and either form must block years outside its legal range instead of silently generating a wrong form.
- Tax documents and payment receipts must use explicitly selected fiscal receipts/payments. The UI may offer `Все`, but it must not silently select every eligible payment when the year, payer, or form changes.
- Payment receipts must take payer facts from the selected payment ledger or explicit receipt fields, not from patient-card fallbacks.
- If the server AI/model path is unavailable, a local deterministic parser should still draft the note for review. Offline help is acceptable; silent final medical decisions are not.
- A visible accept/save action must do real work: accepting a reviewed draft or manual correction writes it into the visit and keeps signing as a separate medical/legal action.
- Clinical rules must be visible and actionable: show warnings, missing required services, limited services, owner role, and patient-facing explanation without hiding them in logs.
- On Visit, clinical rules are warnings first: title, owner, and one required action stay visible; long medical/patient explanation is expanded on demand.
- The shift must show operational control: clinic-mode readiness, doctor/chair load, role queues, and warnings without forcing the user into Settings.
- Role focus must reduce noise, not become another page: one compact switcher may highlight the doctor/admin/assistant/manager/owner queue, but it must not hide critical clinical warnings.
- Recommended actions must replace static dashboard counters when possible: show the next best action, not a pile of metrics.
- Schedule rows must answer “can this patient be seated now?” with one readiness label and one next action.
- Schedule suggestions can sit above the timeline, but only as a short lane for attention-needed visits, gaps, and overload.
- Schedule gaps and buffer warnings are same-day operational hints; cross-date appointments are separate working days and must not be compared as one continuous timeline.
- Appointment edits must reject non-existent calendar dates and time rollovers at the API boundary; the UI may be convenient, but the server must not let `Date.parse` silently move a clinic visit to another day.
- Visit closing must stay one compact checklist: one score, one next action, and role-owned rows that jump to the right screen instead of adding more form sections.

## Visual Direction

- Quiet medical workspace, not generic SaaS marketing.
- Use clean medical surfaces, dark reliable navigation, teal for primary clinical action, rust/amber only for attention.
- Use icons for navigation and actions, but pair with text on desktop.
- Avoid dense grids. Prefer task stacks, status chips, timeline, and document checklist.
- Cards are for real entities only: appointment, patient, document, task. No decorative card nesting.
- Migration must be a guided import studio: paste/export, preview, dedupe warnings, then explicit commit. No blind database write.
- Legal documents must be one-click clinical actions: contract, act, tax certificate, consent, treatment plan.
- Owner confidence requires visible history: import batches and audit events must be readable without opening admin tools.
- Owner confidence also requires visible save health: Settings/Audit must show server persistence, checksum presence, and backup status without exposing this noise to the doctor's Visit surface.
- Import/export belongs in Settings. It must not appear in the doctor's normal shift surface.
- Imaging connectors, watched folders, PACS, DICOMweb, TWAIN/WIA, and migration tools belong in Settings. The doctor sees the resulting images, not the plumbing.
- Clinic modes, staff roles, specialties, and chair/room setup belong in Settings. The doctor sees the correct schedule and permissions without needing to understand the configuration model.
- Settings sub-pages need direct links such as `#settings/audit`; mobile tabs may scroll horizontally, but the active tab must stay visible and the section content must start in the first viewport.
- Workspace profiles and access policies belong in Settings. Doctors see a focused workspace; owners and managers see scope, writable sections, restrictions, approval points, and audit keys.
- The working shift can preview a selected role focus from those policies: next action, writable areas, restricted areas, and open queue count.
- Mode readiness and workload are shown as compact operational state: score, resource load, role owner, next action, and warning.
- Migration presets must be compact disclosure controls: show what works now, what needs field mapping, and what is a later connector without dumping a wall of integration text on the user.
- The working shift must avoid product/architecture explanation blocks. Doctors see work, not strategy.
- Protocol templates belong in the visit workflow only as a practical shortcut. Editing template libraries, bulk import, source mapping, and connector setup stay in Settings.
- The Visit page starts with patient, reason, warnings, readiness, and dictation as the primary action; protocol details stay collapsed until needed.
- Full imaging lanes must not sit above the Visit focus on mobile; the visit may show image counts and targeted access, but not push the EMR command surface down.
- A 2D image viewer and CBCT/MPR controls belong in the dedicated Imaging section. Settings/Sources owns connector setup and DICOM readiness checks; Visit remains the charting surface.
- On mobile Visit, global role controls and global add/import buttons must not appear before the clinical command surface.
- Clinical rule cards belong in Visit and Payments because the same constraint must protect both the doctor's closure workflow and the patient's financial plan conversation.
- Visit uses compact clinical-rule rows; Finance may use fuller cards because that screen supports explanation and planning conversation.
- Visit shows only the highest-priority unresolved clinical rule by default; the rest are counted, not expanded into a wall.
- Warning details are collapsed by default on Visit. Dictation and the structured EMR draft come before the expanded warning panel because the focus bar already exposes attention items without stealing the primary action.
- Warnings must never block routine doctor flow. They can request confirmation, review, or owner handoff, but the doctor must still be able to continue dictation and EMR work.
- Clinical rule editing belongs in Settings: lead doctors and owners can create/disable rules, but ordinary visit flow only shows consequences and next actions.
- Patient insight belongs in Shift and Patients as a small context layer. It must not become a second medical record or another dense admin table.
- Recommended action tiles should stay capped to a small set for the active role. More actions belong in the underlying page, not on the shift dashboard.
- Appointment readiness belongs inside the schedule row as chips. It must show doctor, assistant, chair, and the next owner without forcing staff into separate readiness screens.
- Schedule suggestions should never push the actual timeline below a wall of cards. Keep the lane capped and role-aware.
- Visit close status belongs next to the EMR draft, but documents, payment, and communication details remain on their own pages.

## Primary Personas

### Doctor

Needs:
- see current patient fast;
- dictate visit;
- edit generated note;
- see tooth/diagnosis/treatment plan;
- sign visit only after reviewing.

### Administrator

Needs:
- schedule;
- create patient in seconds;
- see who needs documents/payment;
- generate договор, акт, справка для вычета;
- call/message patients.

### Owner

Needs:
- no local-data trap;
- backup/export;
- migration path;
- legal confidence;
- eventual SaaS scaling.

### Clinic Manager

Needs:
- choose whether the product behaves like a solo cabinet, one-chair office, small clinic, or network clinic;
- add doctors, administrators, assistants, and managers without reading a permission matrix;
- connect chairs/rooms with imaging equipment so staff know where a patient and image source belong;
- choose a migration source such as old MIS, spreadsheet, paper archive, RVG folder, PACS, or accounting export and understand risk before preview;
- run AI recognition for dictation, paper archive, or image summary as a reviewable draft, then pass the result into import or EMR;
- keep import/export and migration power tools away from the clinical shift screen.

## MVP Screen Shape

Desktop:
- left rail navigation;
- top clinic header;
- separate working views: Shift, Schedule, Patients, Visit, Documents, Settings;
- Payments is its own working view because money, documents, and tax certificates are a frequent clinic workflow;
- Treatment scenarios sit inside Payments because the patient conversation is usually about phases, risk, and cash timing at the same time;
- Communications is its own working view because staff need a queue, templates, and contact history without digging through patient notes;
- Settings has its own tabs: Clinic, Protocols, Sources, AI, Import, Audit;
- Access is a dedicated Settings tab because permissions, role scopes, first screens, and approval points must not be mixed into clinical protocol editing.
- Shift is a dashboard, not a dumping ground for every tool.

Mobile:
- bottom navigation;
- current/next patient first;
- schedule second;
- documents and patient search reachable without horizontal tables.
- Settings tools must be split into tabs so import, AI and connector details do not become a single scroll wall.
