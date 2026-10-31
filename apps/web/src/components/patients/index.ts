/**
 * apps/web/src/components/patients/index.ts
 *
 * Canonical unified barrel export facade for Patient domain components.
 * Conforms to Mandate 8s (SSOT) and Mandate 8aq (Ban on Orphan Components).
 */

export * from "./PatientCard";
export * from "./PatientCardModal";
export * from "./PatientDetailModal";
export * from "./PatientDetailsModal";
export * from "./PatientDrawer";
export * from "./PatientHistoryTab";
export * from "./PatientWorkspaceView";
export { PatientWorkspaceView as PatientWorkspace } from "./PatientWorkspaceView";
export * from "./TreatmentPlansList";
export * from "./PatientAnamnesisTab";
export * from "./PatientCreationModal";
export * from "./MobilePatientProfileWorkspace";
export * from "./MobilePatientsGroupedList";
export * from "./family/FamilyWalletModal";
export * from "./tabs/PatientGeneralInfoTab";
export * from "./safetyMath";
export * from "./DirectPatientCardLauncher";
export * from "./patientCatalogData";
export * from "./PatientStudioModal";
export * from "./studioModal";
export * from "./DirectPatientLauncher";

