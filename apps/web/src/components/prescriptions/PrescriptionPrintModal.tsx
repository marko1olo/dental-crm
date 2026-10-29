/**
 * PrescriptionPrintModal.tsx — Backward-compatibility facade
 * Canonical SSOT is PrescriptionWorkspaceModal.tsx per Mandates 8b & 8x.
 */

export function resolvePrescriptionPatientName(patient?: { fullName?: string }, patientNameProp?: string): string {
	const patientName = patient?.fullName || patientNameProp || "";
	return patientName;
}

export {
	PrescriptionModal,
	PrescriptionModal as PrescriptionPrintModal,
	type PrescriptionModalProps,
	type PrescriptionModalProps as PrescriptionPrintModalProps,
	type PrescriptionDrugItem,
	type PrescriptionFormType,
} from "./PrescriptionModal";

export {
	detectPrescriptionAllergyConflicts,
	detectPrescriptionSomaticWarnings,
	type AllergyConflictDrugItem,
	type PrescriptionAllergyConflict,
	type PrescriptionSomaticWarning,
} from "./prescriptionAllergyChecker";

export {
	DENTAL_FAST_PRESCRIPTION_SETS,
	DENTAL_OUTPATIENT_EXTENDED_DRUGS,
	type DentalFastPrescriptionSet,
} from "./prescriptionDataSets";
