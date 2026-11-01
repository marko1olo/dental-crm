/**
 * apps/web/src/components/prescriptions/index.ts
 *
 * Facade export for Statutory Medical Prescription Module SSOT.
 */

export * from "./generator";
export * from "./PrescriptionStudioModal";
export * from "./PrescriptionAllergyBanner";
export * from "./PrescriptionCockpitModal";
export * from "./PrescriptionDrugCatalogSelector";
export * from "./PrescriptionExpressPills";
export * from "./PrescriptionModal";
export * from "./PrescriptionWorkspaceModal";
export * from "./PrescriptionModalFooter";
export * from "./PrescriptionPrintModal";
export * from "./PrescriptionPrintSheet";
export * from "./PrescriptionSheetPreview";
export * from "./prescriptionAllergyChecker";
export * from "./prescriptionApiClient";
export * from "./prescriptionDataSets";
export {
	CANONICAL_DENTAL_DRUGS,
	CLINICAL_FAST_SETS,
	DENTAL_PRESCRIPTION_CATEGORIES,
	PATIENT_CARE_RECOMMENDATIONS,
	findDrugById,
	formatSoapPrescriptionText,
	formatMessengerPatientMemo,
} from "./prescriptionCatalogData";
export * from "./prescriptionPrintHtml";
export * from "./usePrescriptionCockpit";
export * from "./DirectPrescriptionLauncher";
