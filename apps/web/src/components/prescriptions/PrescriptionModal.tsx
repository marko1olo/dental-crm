/**
 * PrescriptionModal.tsx — Canonical Facade for Medical Prescriptions & Outpatient Pharmacopeia
 * DENTE Dental CRM (Doctor Autonomy Mandates 8e, 8n, 8x, 8y, 8am & Apple HIG).
 * Delegates directly to canonical PrescriptionStudioModal SSOT.
 */

export {
	PrescriptionStudioModal,
	PrescriptionStudioModal as PrescriptionModal,
	PrescriptionStudioModal as PrescriptionWorkspaceModal,
	type PrescriptionStudioModalProps as PrescriptionModalProps,
} from "./PrescriptionStudioModal";

export type { DentalOutpatientDrug as PrescriptionDrugItem } from "./prescriptionCatalogData";
export type PrescriptionFormType = "standard" | "special" | "107-1u" | "148-1u-88";
