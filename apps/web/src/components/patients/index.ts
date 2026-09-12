/**
 * DENTE CRM — Canonical Patients Components Domain Index (Mandates 8s, 8j, 8l)
 */

// Core Patient Modal & Creation
export * from "./PatientCardModal";
export * from "./PatientCreationModal";
export * from "./CreatePatientModal";
export * from "./patientCardSavePill";

// Overview & Widgets
export * from "./PatientOverviewTab";
export * from "./PatientFamilyCard";
export * from "./PatientLoyaltyHeader";
export * from "./PatientNoShowRisk";
export * from "./PatientDuplicateAlert";
export * from "./PatientAttachmentsPanel";
export * from "./PatientCommunicationConsentsPanel";
export * from "./PatientCommunicationTimelineWidget";
export * from "./PatientReclamationsWidget";
export * from "./PatientTaskTicketsWidget";
export * from "./PatientWhatsappSendPanel";
export * from "./PatientArchiveAndBlacklistWidget";
export * from "./OrthodonticProgressWidget";
export * from "./LabOrdersPanel";
export * from "./RecallListPanel";

// Consolidated Patient Components (Mandate 8s)
export * from "./PatientAdministrativeForm";
export * from "./PatientAllergySafetyBanner";
export * from "./PatientSentimentBadge";
export * from "./blankContractPrint";
export * from "./safetyMath";

// Patient Configuration & Logic Helpers
export * from "./patientFieldRequirementsConfig";
export * from "./patientListFeatureSalience";
export * from "./patientDraftResetDecision";

// Branch Transfer
export * from "./transfer/PatientBranchTransferModal";

// Re-exports of patient workspace & anamnesis components for unified access
export * from "../patient/PatientHeaderCard";
export * from "../patient/PatientWorkspaceView";
export * from "../patient/PatientAnamnesisModal";
export * from "../patient/PatientDetailModal";
export * from "../patient/tabs/PatientGeneralInfoTab";
