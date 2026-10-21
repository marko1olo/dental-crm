## 2026-08-17T18:26:30Z

<USER_REQUEST>
You are the Project Orchestrator for DENTE Dental CRM.
Working directory: C:\Clinic_MVP\dental-crm\.agents\orchestrator_r15
Project root: C:\Clinic_MVP\dental-crm

Create your working directory C:\Clinic_MVP\dental-crm\.agents\orchestrator_r15 and maintain your BRIEFING.md, plan.md, and progress.md in it.

The authoritative user request is recorded in `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md`.

Read the project constitution in `C:\Clinic_MVP\dental-crm\.agents\AGENTS.md` before executing. Follow all project rules, including Mandate 8b (individual git add, no tool trailers), kopeck-exact integer financial calculations, no mocks/stubs in production paths, zero-skimming, and multi-pass verification.

## Core Mission & Requirements:
1. **R1. Clinical EMR, Odontogram & Protocols**:
   - Verify adult (11–48) and pediatric (51–85) FDI odontograms with anatomical SVG shaders.
   - Ensure Form 043/u SOAP diary auto-save, non-destructive merge, and 63-FZ electronic signature ceremony.
   - Support 1-click clinical protocol templates mapped to ICD-10 and FDI teeth.

2. **R2. DICOM 3D MPR CT Viewer & Nerve Safety**:
   - Orthogonal MPR slicing (Axial, Sagittal, Coronal) with crosshair synchronization and HU bone density calculation (Misch D1–D4).
   - Automatic safety alarm when virtual implant is within < 2.0 mm of the mandibular nerve canal.

3. **R3. FinTech 54-FZ & 13% NDFL Tax Deduction**:
   - Kopeck-exact integer arithmetic for all financial operations without floating-point errors.
   - 0% installment plans (3, 6, 12, 24 months) preserving exact sum (sum(parts) == T).
   - 1-click NDFL certificate calculation: Code 01 (capped at 150,000 RUB, max 19,500 RUB refund) vs Code 02 (expensive treatment without limits).
   - 54-FZ cashier receipts with `clientMutationId` idempotency and offline queue.

4. **R4. Visual UI, 10 Themes & Mobile Compliance**:
   - Flawless rendering across all 10 themes (`light`, `dark`, `night`, `calm_teal`, `contrast`, `sakura`, `ocean`, `emerald`, `cyber_xray`, `warm_sand`).
   - Minimum touch targets >= 44px for sterile glove operation on touchscreens.
   - Zero horizontal overflow on 390px mobile viewports.

## Acceptance Criteria:
- `npm run check:encoding` passes with 0 mojibake errors across all files.
- `npm run typecheck` passes with 0 TypeScript compiler errors.
- `npm test -w @dental/shared` passes 185/185 unit tests.
- `npm test -w @dental/web` passes 1349/1349 unit tests.
- Live 4-state screenshots generated and visually verified.

Decompose the work into structured milestones, spawn specialized subagents (explorers, workers, reviewers, challengers, auditors), track their outputs, verify all gates with raw command execution, and report back when fully completed.
</USER_REQUEST>
