# Patient Cockpit & CRM UI Architecture

## Overview
The "Patient Cockpit" (the central patient hub) is primarily orchestrated through `apps/web/src/PatientsView.tsx` and its core child component `apps/web/src/components/patients/PatientOverviewTab.tsx`. (Note: A dedicated `PatientCockpit` file does not exist; its responsibilities are handled by the `PatientsView` and `PatientOverviewTab` components). 

This hub serves as the unified interface for patient discovery, administrative editing, clinical assessment, and CRM tracking.

## Component Architecture

### 1. `PatientsView.tsx` (Main Hub Shell)
This file handles the overarching layout, patient roster, and core profile editing.
- **Search & Quick Create (`header`)**: 
  - Supports searching by Name or Phone.
  - Includes a "Lost Patients" toggle that filters the list via `/api/analytics/lost-patients-filters`.
  - **Smart Dictation**: Integrates `SmartMicrophoneButton` and `SmartParsePreview` (via `parsePatientDictationLocal`). It allows voice dictation of "Name, Phone, DOB", which is parsed and immediately populated into the creation fields.
- **Patient List (`.patient-list`)**: 
  - Renders the roster of patients.
  - Conditionally renders risk labels (e.g., "Черный список / Архив") and balance due (based on `patientInsightRiskLabels`) only when they deviate from the clinic's prevailing baseline (calculated via `patientListFeatureSalience`).
- **Core Info Form**: 
  - Manages basic demographic data (Name, DOB, Phone, Email).
  - Includes a "Notes" `textarea` with one-click quick chips (e.g., "Аллергия на анестезию", "Боится уколов") that append to the string avoiding duplication.
- **Administrative Documents (`PatientAdministrativeForm`)**: 
  - Housed in a collapsible `<details>` element.
  - Strictly validates fields (e.g., requiring paired time slots for "convenient appointment times" to satisfy server normalization).

### 2. `PatientOverviewTab.tsx` (The Cockpit Widgets)
Renders a specialized grid of widgets specific to the selected patient, acting as the CRM dashboard:
- **`PatientFamilyCard`**: Fetches family group data (`/api/finance/family/patient/:id`). Strictly differentiates between a missing family (404) and a server error (500/401/403) to prevent creating duplicate family wallets.
- **`PatientJourneyTimeline`**: Visualizes the history of the patient's interactions and visits.
- **`OrthodonticProgressWidget` & `LabOrdersPanel`**: Clinical and prosthetic workflow trackers (gated by workspace flags).
- **CRM Widgets**: Integrates `PatientReclamationsWidget`, `PatientTaskTicketsWidget`, `PatientCommunicationTimelineWidget`, `PatientArchiveAndBlacklistWidget`, and `PatientDuplicateMergeQueuesWidget`.

## Integrations

### Imaging (DICOM) & Clinical Tools Integration
Clinical tools are embedded directly within the Cockpit (`PatientsView.tsx`), allowing immediate clinical assessment without switching contexts:
- **`OdontogramModule`**: Attached to the `selectedPatient`. It interfaces with `/api/patients/:id/tooth-states` to persist and load tooth conditions, formulas, and history (including pediatric formulas and multiselect).
- **`VisiographAnalyzer`**: Rendered inside the patient view for 2D X-Ray analysis.

### Visits & Schedule (Waitlist) Integration

#### Active Visit Tracking
In `PatientOverviewTab.tsx`, the system cross-references the current active visit with the selected patient:
```tsx
dashboard?.activeVisit?.patientId === selectedPatientId
```
If true, it injects a pulsing green indicator ("Активный приём"), notifying staff that the patient is currently in the clinic.

#### Waitlist / Schedule Integration (`WaitlistDrawer.tsx`)
The waitlist drawer is injected via a React Portal (`document.body`) to prevent `position: fixed` issues caused by parent transforms in the schedule view.
- **Adding to Waitlist**: Authorized strictly via `denteAdminSecretRequestHeaders` (requiring staff tokens, not just clinic read tokens) to POST to `/api/waitlist`.
- **Booking from Waitlist (`handleBook`)**:
  - When "Записать на прием" is clicked, it populates the `newAppointmentDraft` state in the `scheduleStore` with the waitlisted `patientId` and `preferredDoctorId`.
  - It programmatically triggers the schedule creation drawer by clicking the `[data-schedule-create-toggle]` DOM element and focusing the editor.
- **Waitlist Fulfillment (`handleFulfill`)**: 
  - Instead of deleting the entry when a patient is booked, it sends a `PUT` request setting `status: "fulfilled"`. This ensures the CRM retains the historical record of closed queue requests for analytics.
- **Drag-and-Drop**: List items include `onDragStart` handlers that serialize the waitlist item payload as JSON (`type: "waitlist_item"`), allowing them to be dragged directly onto the schedule grid.
```
