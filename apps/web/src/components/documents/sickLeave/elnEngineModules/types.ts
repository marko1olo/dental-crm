/**
 * STATUTORY ELECTRONIC SICK LEAVE (ЭЛН) & ORDER 1089N TYPES
 * Conforming to Ministry of Health of the Russian Federation Order № 1089н
 *
 * Domain: Statutory Electronic Sick Leave (ЭЛН) & Medical Commission (ВК)
 */

import type {
	IncapacityReasonCode,
	IncapacityRegimeType,
	SickLeaveClosingCode,
	RegimeViolationCode
} from '../sickLeaveElnPresets';

export interface IncapacityPeriod {
	id: string;
	dateFrom: string; // YYYY-MM-DD
	dateTo: string; // YYYY-MM-DD
	doctorSpecialty: string;
	doctorFio: string;
	doctorSnils: string;
	doctorRole: 'attending' | 'vk_member' | 'vk_chairperson';
	vkChairpersonFio?: string | undefined;
	vkChairpersonSnils?: string | undefined;
	vkProtocolNumber?: string | undefined;
	vkProtocolDate?: string | undefined;
}

export interface MedicalCommissionProtocol {
	protocolNumber: string;
	protocolDate: string; // YYYY-MM-DD
	chairpersonFio: string;
	chairpersonSpecialty: string;
	chairpersonSnils: string;
	deputyChairpersonFio?: string | undefined;
	memberFios: string[];
	attendingDoctorFio: string;
	clinicalDiagnosis: string;
	icd10Code: string;
	clinicalSubstantiation: string;
	expertDecision: string;
	extensionDays: number;
	extensionDateFrom: string; // YYYY-MM-DD
	extensionDateTo: string; // YYYY-MM-DD
	nextReviewDate?: string | undefined;
}

export interface SickLeavePatientData {
	patientFio: string;
	patientBirthDate: string; // YYYY-MM-DD
	patientGender: 'male' | 'female';
	patientSnils: string;
	patientOmsNumber?: string | undefined;
	patientPassport?: string | undefined;
	employerName: string;
	isPrimaryWorkplace: boolean;
	patientPhone?: string | undefined;
}

export interface SickLeaveFormState {
	elnNumber: string;
	issueDate: string; // YYYY-MM-DD
	isDuplicate: boolean;
	prevElnNumber?: string | undefined;
	reasonCode: IncapacityReasonCode;
	additionalReasonCode?: string | undefined;
	regimeType: IncapacityRegimeType;
	icd10Code: string;
	diagnosisText: string;
	periods: IncapacityPeriod[];
	closingCode: SickLeaveClosingCode;
	workResumeDate?: string | undefined;
	nextElnNumber?: string | undefined;
	violationCode?: RegimeViolationCode | undefined;
	violationDate?: string | undefined;
	isVkRequired: boolean;
	vkProtocol?: MedicalCommissionProtocol | undefined;
	organizationName: string;
	organizationOgrn: string;
	organizationAddress: string;
	medicalLicenceNumber: string;
}

export interface SickLeaveValidationResult {
	isValid: boolean;
	totalDays: number;
	isVkRequired: boolean;
	singleDoctorLimitExceeded: boolean;
	errors: string[];
	warnings: string[];
	infoMessages: string[];
}

export interface Form036uEntry {
	entryNumber: string;
	date: string;
	patientFio: string;
	birthDate: string;
	snils: string;
	medicalCardNumber: string;
	diagnosis: string;
	icd10: string;
	sickLeaveNumber: string;
	incapacityPeriodText: string;
	totalDays: number;
	vkReason: string;
	vkDecisionText: string;
	chairpersonSign: string;
	membersSign: string[];
}
