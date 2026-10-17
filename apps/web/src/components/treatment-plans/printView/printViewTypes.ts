import type { TreatmentPlanTier, TreatmentPlanTierId } from "../types";

export interface TreatmentPlanPresenterPrintViewProps {
	readonly printDocFormat: "patient_friendly" | "official_appendix";
	readonly setPrintDocFormat: (format: "patient_friendly" | "official_appendix") => void;
	readonly showMicroConsumables: boolean;
	readonly setShowMicroConsumables: (val: boolean) => void;
	readonly selectedTier: TreatmentPlanTier;
	readonly patientName: string;
	readonly patientBirthDate?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly doctorFullName: string;
	readonly doctorSpecialty?: string | undefined;
	readonly clinicName: string;
	readonly clinicLegalName: string;
	readonly clinicInn?: string | undefined;
	readonly clinicOgrn?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly clinicLicense?: string | undefined;
	readonly displayContractNumber: string;
	readonly todayRu: string;
	readonly watermarkText?: string | undefined;
	readonly getTierLetter: (tierId: TreatmentPlanTierId) => string;
	readonly patientId?: string | undefined;
	readonly planAgeDays?: number | undefined;
}
