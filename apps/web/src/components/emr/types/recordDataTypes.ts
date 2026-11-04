/**
 * apps/web/src/components/emr/types/recordDataTypes.ts
 *
 * Единый канонический SSOT-модуль типов медицинской карты приёма и клинических дневников DENTE CRM.
 * Мандаты 8e (Автономия врача), 8n (Соло-врач), 8x/8ap (Единый предметный язык без бюрократических номеров приказов).
 */

import type {
	FdiToothRecord,
	DmftIndex,
	CpitnIndex,
	DentalBiteType,
	OralMucosaStatus,
} from "@dental/shared";

export interface ClinicRequisitesData {
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

/** Алиас для обратной совместимости */
export type ClinicRequisites043 = ClinicRequisitesData;

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

export interface MedicalRecordValidationResult {
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

/** Алиас для обратной совместимости */
export type Form043ValidationResult = MedicalRecordValidationResult;

export interface HygieneIndexOhiS {
	score?: number | undefined;
	totalScore?: number | undefined;
	rating?: "good" | "satisfactory" | "unsatisfactory" | "poor" | string | undefined;
	ratingLabel?: string | undefined;
	ratingText?: string | undefined;
	debrisScore?: number | undefined;
	calculusScore?: number | undefined;
}

export interface ClinicalPassportData {
	medicalCardNumber: string;
	cardOpenedDate: string;
	patientFullName: string;
	patientBirthDate: string;
	patientSex: "male" | "female";
	patientPhone: string;
	patientEmail: string;
	patientAddressRegistration: string;
	patientAddressResidence: string;
	patientIdentityDocument: string;
	patientSnils: string;
	patientInsurancePolicy: string;
	patientInsuranceCompany: string;
	patientPrivilegeCategory: string;
	primaryDiagnosisText: string;
	primaryDiagnosisIcd10: string;
	attendingDoctorFullName: string;
	attendingDoctorSpecialty: string;
	attendingDoctorSnils: string;
}

export type Form043PassportData = ClinicalPassportData;

export interface ClinicalAnamnesisData {
	chiefComplaint: string;
	historyOfPresentIllness: string;
	medicalHistoryVitae: string;
	allergologicalHistory: string;
	concomitantSomaticDiseases: string;
	currentSystemicMedications: string;
	pregnancyLactationStatus: string;
	pastDentalInterventions: string;
	occupationalHazardsAndHabits: string;
}

export type Form043AnamnesisData = ClinicalAnamnesisData;

export interface ClinicalDentalStatusData {
	odontogramTeeth: FdiToothRecord[];
	dmftIndex: DmftIndex;
	cpitnIndex: CpitnIndex;
	hygieneIndexOhiS: HygieneIndexOhiS;
	biteType: DentalBiteType;
	biteDescription: string;
	oralMucosaStatus: OralMucosaStatus;
	xrayFindingsDescription: string;
	xrayRadiationDoseMsv: number;
}

export type Form043DentalStatusData = ClinicalDentalStatusData;

export interface ClinicalVisitDiaryEntry {
	id: string;
	entryDate: string;
	entryTime: string | null;
	doctorFullName: string;
	doctorSpecialty: string;
	toothNumber: string | null;
	subjectiveComplaints: string;
	objectiveStatusLocalis: string;
	assessmentDiagnosisText: string;
	assessmentIcd10Code: string;
	procedureProtocol: string;
	anesthesiaDetails?: string | undefined;
	appliedMaterials?: string | undefined;
	homeCareRecommendations?: string | undefined;
	nextVisitDate?: string | undefined;
	isSignedWithUkep?: boolean | undefined;
	digitalSignatureHash?: string | undefined;
	eodMicroamperes?: number | null | undefined;
	percussionVertical?: string | undefined;
	percussionHorizontal?: string | undefined;
	probingTenderness?: string | undefined;
	thermalTestResponse?: string | undefined;
	probingPocketDepthMm?: number | null | undefined;
}

export type Form043VisitDiaryEntry = ClinicalVisitDiaryEntry;
export type VisitDiaryEntry043 = ClinicalVisitDiaryEntry;

export interface ClinicalEpicrisisData {
	treatmentSummary: string;
	treatmentOutcome: "cured_complete" | "improvement_remission" | "without_change" | "deterioration" | "treatment_in_progress" | "complete_cure";
	treatmentOutcomeLabel: string;
	dispensaryGroup: "D_I_healthy" | "D_II_risk" | "D_III_chronic_compensated" | "D_III_chronic_subcompensated";
	dispensaryGroupLabel: string;
	plannedRecallIntervalMonths: number;
	preventivePlanRecommendations: string;
	dateCompleted: string;
	headOfDepartmentFullName: string;
	attendingDoctorFullName: string;
}

export type Form043EpicrisisData = ClinicalEpicrisisData;

export interface MedicalRecordData {
	formNumber: "Медицинская карта приёма" | "043/у" | string;
	formOrderName: "Медицинская карта приёма" | "Медицинская карта стоматологического пациента" | "Приказ Минздрава России от 15.12.2014 № 834н" | "Приказ Минздрава СССР от 04.10.1980 № 1030" | string;
	clinic: ClinicRequisitesData;
	passport: ClinicalPassportData;
	anamnesis: ClinicalAnamnesisData;
	dentalStatus: ClinicalDentalStatusData;
	generalTreatmentPlan: string;
	visitDiaries: ClinicalVisitDiaryEntry[];
	epicrisis: ClinicalEpicrisisData;
}
