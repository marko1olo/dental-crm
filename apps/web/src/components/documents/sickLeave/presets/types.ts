export type IncapacityReasonCode = '01' | '02' | '03' | '05' | '08' | '09' | '10' | '11';
export type IncapacityRegimeType = 'ambulatory';
export type SickLeaveClosingCode = '31' | '32' | '33' | '34' | '36';
export type RegimeViolationCode = '23' | '24' | '25' | '28';
export type MedicalCommissionRole = 'CHAIRPERSON' | 'DEPUTY_CHAIRPERSON' | 'COMMISSION_MEMBER' | 'ATTENDING_DOCTOR';

export interface IncapacityReasonMeta {
	code: IncapacityReasonCode;
	titleRu: string;
	descriptionRu: string;
	isDentalCommon: boolean;
}

export interface SickLeaveClosingMeta {
	code: SickLeaveClosingCode;
	titleRu: string;
	descriptionRu: string;
	requiresResumeDate: boolean;
	requiresNextElnNumber: boolean;
}

export interface RegimeViolationMeta {
	code: RegimeViolationCode;
	titleRu: string;
	descriptionRu: string;
}

export interface DentalClinicalPreset {
	id: string;
	titleRu: string;
	shortTitleRu: string;
	icd10Code: string;
	icd10TitleRu: string;
	reasonCode: IncapacityReasonCode;
	recommendedMinDays: number;
	recommendedMaxDays: number;
	defaultDays: number;
	isVkMandatory: boolean;
	clinicalDescriptionRu: string;
	expertJustificationRu: string;
}

export interface CommissionMemberPreset {
	role: MedicalCommissionRole;
	roleTitleRu: string;
	fio: string;
	specialty: string;
	snils: string;
}
