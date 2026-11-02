export interface ClinicRequisites043 {
	clinicName: string;
	clinicLegalName: string;
	clinicAddress: string;
	clinicPhone: string;
	clinicOgrn: string;
	clinicInn: string;
	clinicKpp: string;
	licenseNumber: string;
	licenseDate: string;
	licenseIssuer: string;
	chiefDoctorFullName: string;
}

export interface MedicalRecordPrintConfig {
	activeTab: "overview" | "passport" | "anamnesis" | "odontogram" | "diaries" | "epicrisis";
	pageOrientation: "portrait" | "landscape";
	includeClinicLogo: boolean;
	includeClinicRequisites: boolean;
	includeUkepStamp: boolean;
	includeDoctorStampSeal: boolean;
	includePatientSignatureBlock: boolean;
	includeXrayThumbnails: boolean;
	includeFullSoapDiaries: boolean;
	selectedDiaryIds?: string[];
	fontSizePt: number;
	scaleRatio: number;
	themeMode: "light" | "dark";
	isLocked?: boolean;
	isDraft?: boolean;
	status?: "draft" | "signed" | string;
	revisionCount?: number;
}

/** Алиас для обратной совместимости */
export type Form043PrintConfig = MedicalRecordPrintConfig;

export interface Form043ValidationResult {
	isComplete: boolean;
	completenessScore: number;
	missingFields: {
		fieldKey: string;
		label: string;
		category: "passport" | "anamnesis" | "dental_status" | "diaries" | "epicrisis";
		severity: "critical" | "warning";
	}[];
	warnings: string[];
}
