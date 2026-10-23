export const ORDER_1094N_NAME = "Приказ Минздрава России от 24.11.2021 № 1094н";
export const FORM_107_1_U_TITLE = "Форма бланка № 107-1/у";

export interface PrescriptionPrescribedDrug {
	readonly id?: string | undefined;
	readonly mnnLatin: string;
	readonly dosage: string;
	readonly formAndDispenseLatin: string;
	readonly signaRu: string;
	readonly tradeNameRu?: string | undefined;
	readonly mnnRu?: string | undefined;
}

export interface PrescriptionPatientInfo {
	readonly fullName: string;
	readonly birthDate?: string | undefined;
	readonly cardNumber?: string | undefined;
	readonly address?: string | undefined;
}

export interface PrescriptionDoctorInfo {
	readonly fullName: string;
	readonly specialty?: string | undefined;
	readonly snils?: string | undefined;
}

export interface PrescriptionClinicInfo {
	readonly legalName: string;
	readonly address: string;
	readonly phone?: string | undefined;
	readonly inn: string;
	readonly ogrn: string;
	readonly licenseNumber: string;
	readonly licenseDate?: string | undefined;
}

export interface PrescriptionForm107Input {
	readonly seriesNumber: string;
	readonly dateIso: string;
	readonly validityDays: 15 | 30 | 60 | 365;
	readonly clinic: PrescriptionClinicInfo;
	readonly patient: PrescriptionPatientInfo;
	readonly doctor: PrescriptionDoctorInfo;
	readonly medications: readonly PrescriptionPrescribedDrug[];
	readonly isChronicCare?: boolean | undefined;
	readonly chronicPeriodicity?: string | undefined;
}

export interface PrescriptionValidationResult {
	readonly isValid: boolean;
	readonly errors: readonly string[];
	readonly warnings: readonly string[];
}
