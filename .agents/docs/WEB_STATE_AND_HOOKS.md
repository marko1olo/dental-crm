# Web State & Hooks

## 1. Global State Management
The global state management in the `web` application relies exclusively on **Zustand**. The application does not use a massive React Context tree for its global state; instead, stores are cleanly modularized by domain in `apps/web/src/store`.

The main global stores are:
- `appStore.ts` (Handles UI preferences, dashboard context, omnibar state, access locks)
- `documentStore.ts` (Handles drafted inputs, signatures, and document workflow sub-states)
- `imagingStore.ts` (Handles DICOM viewer states, image uploads, visual states)
- `leadsStore.ts` (Lead management states)
- `patientStore.ts` (Patient-specific temporary states)
- `scheduleStore.ts` (Scheduling and calendar states)
- `settingsStore.ts` (Application settings states)
- `themeStore.ts` (UI theme state)
- `uiStore.ts` (General generic UI states)
- `visitStore.ts` (Active visit states)

## 2. Deep-Dive: `useDocumentWorkflowModule.ts`
Located in `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts`, this massive 190KB file exports the God Hook that orchestrates the entire clinical, financial, and tax document lifecycle. 

**Core Responsibilities & Factual Capabilities:**
- **State Integration:** It pulls state from `useDocumentStore` and `useAppStore` alongside local component props (like `activeDoctor`, `activePayments`, `activeTreatmentPlanItems`, `documentPatient`, `dashboard`).
- **Validation & Business Logic:** It rigorously validates document payloads before submission to `POST /api/documents`. For example, it ensures tax documents are strictly linked to a specific tax year and correctly matched payments; it checks that payment correction refunds do not exceed actual payments; it enforces that active visits match the document's targeted patient.
- **Workflow Operations:** It exposes functions for issuing and voiding documents (`requestDocumentIssue`, `confirmDocumentIssue`, `requestDocumentVoid`, `confirmDocumentVoid`).
- **Artifact Handling:** It coordinates downloading and opening generated documents (`downloadTaxDocumentXml`, `downloadIssuedDocumentHtml`, `downloadIssuedDocumentPdf`, `openIssuedDocumentHtml`).
- **Derived Data Formulation:** It calculates and exposes complex arrays and aggregates for the UI, such as `taxDocumentPayerOptions`, `eligibleTaxPayments`, `eligiblePaymentReceiptPayments`, `patientBillingSummary`, `installmentScheduleRemainingRubValue`, and `completedActPaidRubValue`.

## 3. Summary: `AppHelpers.tsx`
Located at `apps/web/src/AppHelpers.tsx`, this file serves purely as a **barrel re-export module** to cluster domain helpers. 

According to its internal documentation, it previously caused build/test failures (`ERR_UNKNOWN_FILE_EXTENSION`) because it dragged components and CSS into isolated logic tests. It has since been gutted of implementation and now aggregates and re-exports functions and constants from domain-specific utilities, including:
- `utils/DocumentHelpers`
- `utils/SpeechHelpers`
- `utils/ImagingHelpers`
- `utils/TelegramHelpers`
- `utils/PreferencesHelpers`
- `utils/PatientHelpers`
- `utils/AuthOnboardingHelpers`
- `utils/AppointmentHelpers`
- `utils/CommonHelpers`

It also explicitly re-exports UI metadata and localized helpers, such as `countLabel` from `lib/russianPlural.js`, avoiding deeply nested imports in consumer components.
