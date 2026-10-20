# Dispatch: worker_integrity_remediation_1

## Objective
Surgical code remediation to achieve 100% clean compilation, zero-any compliance, ACID transaction rollback boundaries, and complete WebGL disposal lifecycle.

## Track 1: Compiler Crash Fix & Zero-Any Elimination in apps/api
1. `apps/api/src/routes/portal/portalMockStorageRoutes.ts:29`:
   Fix TS2532 `Object is possibly 'undefined'` on `extMatch[1]` under `noUncheckedIndexedAccess: true`.
   Implement safe guard: `const ext = extMatch?.[1] ?? "bin";`.
2. `apps/api/src/routes/fiscal/receiptRoutes/*`:
   Eliminate all 15 `: any` and `as any` occurrences without `@ts-ignore` or lint suppressions:
   - `receiptCashBoxLedger.ts:22`: `tx: DbClientOrTransaction`
   - `receiptCashBoxLedger.ts:51,52,56`: Type `b` cleanly as CashBox record (from schema)
   - `receiptKktSender.ts:62,155`: `tx: DbClientOrTransaction`
   - `receiptKktSender.ts:160`: Type `compiled` using `PrintFiscalReceiptPayload` or `Ffd12ReceiptPayload`
   - `receiptCorrectionHandlers.ts:39`: `tx: DbClientOrTransaction`
   - `receiptCorrectionHandlers.ts:68,69`: Type `b` cleanly
   - `receiptDraftHandlers.ts:90`: Avoid `(item as any)`, assign typed properties
   - `receiptFiscalizeHandlers.ts:136,142`: Remove `compiled as any`, use typed payload
   - `receiptFfdValidator.ts:103,109`: Replace `readonly compiled: any;` with typed structure
3. `apps/api/src/routes/sbp/fiscalReceiptService.ts:322-337`:
   Remove all 3 `(err as any)` and all 3 `// biome-ignore lint/suspicious/noExplicitAny`. Type errors cleanly using custom error or `Record<string, unknown>`.

## Track 2: ACID Transaction & Orphan Row Prevention
1. In `apps/api/src/db/patientsQueryModules/patientSearchCore.ts:265`:
   Update `createPatientInDb` signature to accept optional `executor?: DbClientOrTransaction`:
   ```typescript
   export async function createPatientInDb(
       orgId: string,
       data: ...,
       executor?: DbClientOrTransaction
   ) {
       const client = executor ?? db;
       const [created] = await client.insert(schema.patients)...
   ```
2. In `apps/api/src/routes/visits/visitQuickRoutes.ts:69-92`:
   Pass `tx` to `createPatientInDb(orgId, { ... }, tx)` and `createAppointmentInDb(orgId, { ... }, tx)`.
   Ensure that any chair overlap or collision during appointment creation causes a full rollback of the patient record, eliminating orphan rows.

## Track 3: WebGL Disposal on Iframe Unmount & INN Fallback Purge
1. In `apps/web/public/viewer3d.html:319-336`:
   Extract teardown into a reusable `cleanup()` function.
   Register event listeners for all three lifecycle events:
   ```javascript
   function cleanup() {
       if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
       if (activeBlobUrl) { URL.revokeObjectURL(activeBlobUrl); activeBlobUrl = null; }
       if (currentMesh) { scene.remove(currentMesh); disposeMesh(currentMesh); currentMesh = null; }
       if (controls && typeof controls.dispose === 'function') { controls.dispose(); }
       if (renderer && typeof renderer.dispose === 'function') { renderer.dispose(); }
   }
   window.addEventListener('beforeunload', cleanup);
   window.addEventListener('pagehide', cleanup);
   window.addEventListener('unload', cleanup);
   ```
2. In `apps/web/src/components/visit/view/viewModalsModules/ClinicalSupportModals.tsx:376`:
   Replace fallback `"7701000000"` with honest `"—"`.
3. In `apps/web/src/components/patients/workspaceView/PatientWorkspaceModalsWrapper.tsx:166`:
   Replace fallback `"7701000000"` with honest `"—"`.

## Verification Commands
1. `npx tsc -p apps/api/tsconfig.json --noEmit` -> MUST exit with Code 0.
2. `grep -n -E "(as\s+any|:\s*any)" apps/api/src/routes/fiscal/receiptRoutes/*.ts` -> MUST return 0 results.
3. `npm run check:sandboxes` -> MUST exit with Code 0 (0 sandboxes).
4. `npm run typecheck` (with `--max-old-space-size=2048`) -> MUST exit with Code 0.

## 2026-10-20T06:11:50Z
Ты — Хирург-Ремедиатор Целостности Кода (teamwork_preview_worker). Твоя задача — провести хирургическое устранение всех нарушений, вскрытых Судебным Аудитором, Ревьюером и Челленджером в ходе Итерации 1.
Твоя рабочая директория: C:\Clinic_MVP\dental-crm\.agents\teamwork\worker_integrity_remediation_1

