/**
 * paidContract/contractDataTypes.ts
 * Services, disclosures, contract data and validation types (Mandate 8b <= 120 lines)
 */

import type {
	PaidContractClinicRequisites,
	PaidContractCustomerRequisites,
	PaidContractPatientRequisites,
	PaidContractRepresentativeRequisites,
} from "./contractPartyTypes";

export type {
	PaidContractClinicRequisites,
	PaidContractCustomerRequisites,
	PaidContractPatientRequisites,
	PaidContractRepresentativeRequisites,
} from "./contractPartyTypes";

export interface PaidContractServiceItem {
	id?: string | undefined;
	code?: string | undefined;
	name: string;
	toothOrArea?: string | undefined;
	quantity: number;
	unitPriceKopecks: number;
	discountKopecks: number;
	totalKopecks: number;
}

export interface PaidContractConfirmedDisclosures {
	clinicInfoConfirmed: boolean;
	serviceListAndPriceConfirmed: boolean;
	paidBasisUnderstood: boolean;
	writtenChangesConfirmed: boolean;
	freeCareNoticeUnderstood: boolean;
	recommendationsWarningUnderstood: boolean;
}

export interface PaidContractSmsSignDetails {
	phone: string;
	code: string;
	sentAt: number;
	expiresAt: number;
	verifiedAt?: number | undefined;
	isVerified: boolean;
	smsSignHash?: string | undefined;
}

export interface PaidContractData {
	contractNumber: string;
	contractDate: string;
	city: string;
	clinic: PaidContractClinicRequisites;
	patient: PaidContractPatientRequisites;
	customer: PaidContractCustomerRequisites;
	representative: PaidContractRepresentativeRequisites;
	clinicalReason: string;
	serviceScopeSummary: string;
	services: PaidContractServiceItem[];
	serviceStart: string;
	serviceEndOrCondition: string;
	totalAmountKopecks: number;
	paymentTerms: string;
	priceChangeRules: string;
	freeCareNotice: string;
	medicalRecommendationWarning: string;
	refusalAndRefundTerms: string;
	warrantyTerms: string;
	disputeResolutionTerms: string;
	personalDataConsentRef: string;
	informedConsentRef: string;
	doctorFullName: string;
	doctorSpecialty: string;
	signedAt: string;
	signMethod: "paper" | "pep_sms" | "touch_screen" | "sms_otp" | "manual";
	pepSmsDetails?: PaidContractSmsSignDetails | undefined;
	smsSignDetails?: PaidContractSmsSignDetails | undefined;
	touchSignatureBase64?: string | undefined;
	confirmedDisclosures: PaidContractConfirmedDisclosures;
}

export interface PaidContractMissingField {
	section: string;
	field: string;
	label: string;
	hint: string;
}

export interface ValidatePaidContractOptions {
	isDraft?: boolean | undefined;
	allowBlankPatientForPrint?: boolean | undefined;
	allowBlankForPrint?: boolean | undefined;
	isCito?: boolean | undefined;
}

export interface PaidContractValidationResult {
	isValid: boolean;
	missingFields: PaidContractMissingField[];
	warnings: string[];
	missingDisclosures?: string[];
}
