## 2026-08-18T17:11:19Z
You are the Frontend Integration Explorer for Clinic MVP (DENTE).
Your working directory is `C:/Clinic_MVP/dental-crm/.agents/survey_frontend_explorer`.
You MUST read:
1. `C:/Clinic_MVP/dental-crm/.agents/ORIGINAL_REQUEST.md`
2. `C:/Clinic_MVP/dental-crm/.agents/AGENTS.md`
3. `C:/Clinic_MVP/dental-crm/.agents/UI_STANDARDS.md`
4. `C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md`

Your Mission:
Perform a comprehensive survey of frontend architecture in `apps/web`:
1. Examine `apps/web/src/components/documents/` and `DocumentsView.tsx` (document signing UI, certificate selection, PDF preview, document list).
2. Examine tooth chart and dental examination components (`apps/web/src/components/` - dental chart, tooth formula, FDI notation, 5-surface selection).
3. Investigate browser-side CryptoPro plugin integration (`cadesplugin`, certificate discovery, detached CAdES-BES signature creation for Doctor UKEP).
4. Investigate WebSocket client and real-time document status updates in UI (`QUEUED` -> `VALIDATING` -> `REGISTERED_IN_REMD` -> `DELIVERED_TO_EPGU`).
5. Examine UI integration for:
   - FNS Tax Certificate generator dialog & download.
   - MIAC Form 039/u Chief Medical Officer reporting tab/view.
   - 4 Informed Consent (IDS) templates (therapy, surgery, prosthetics, orthodontics) in DocumentsView.
   - Staff speech scripts drawer/modal for patient refusal handling under 323-FZ / 152-FZ / KoAP.
6. Verify design compliance (Tailwind semantic themes, light/dark mode, responsive layout, i18n/mojibake safety).

Output requirements:
Write a comprehensive frontend integration report to `C:/Clinic_MVP/dental-crm/.agents/survey_frontend_explorer/handoff.md` with exact component paths, props interfaces, state flows, and integration plan.
Send a completion message back to the parent agent when done.
