import type {
	ConsentPackageKey,
	ConsentTemplateKey,
	ConsentSubstitutionContext,
	ConsentTemplate,
} from "../consentTemplates.js";
import type {
	PatientConsentSummaryParams,
	SignedConsentPayload,
	ConsentScopeMismatchResult,
} from "../consentSummaryHelper.js";
import type {
	SignatureStroke,
	SignaturePoint,
	SignatureVectorData,
} from "../signaturePadMath.js";

export type VerificationMethod = "tablet_stylus" | "sms_otp" | "paper_physical";

export interface InformedConsentPatientInfo {
	fullName?: string | null | undefined;
	birthDate?: string | null | undefined;
	passport?: string | null | undefined;
	phone?: string | null | undefined;
	snils?: string | null | undefined;
	address?: string | null | undefined;
	cardNumber?: string | null | undefined;
}

export interface InformedConsentModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialMode?: "packages" | "single";
	initialPackageKey?: ConsentPackageKey;
	initialTemplateKey?: ConsentTemplateKey;
	initialVerificationMethod?: VerificationMethod;
	patient?: InformedConsentPatientInfo | null | undefined;
	doctorName?: string | null | undefined;
	doctorSpecialty?: string | null | undefined;
	clinicName?: string | null | undefined;
	clinicLegalName?: string | null | undefined;
	clinicAddress?: string | null | undefined;
	clinicOgrn?: string | null | undefined;
	clinicPhone?: string | null | undefined;
	licenseNumber?: string | null | undefined;
	diagnosisIcd?: string | null | undefined;
	toothNumbers?: string | null | undefined;
	isLocked?: boolean | undefined;
	isDraft?: boolean | undefined;
	isSigned?: boolean | undefined;
	status?: string | undefined;
	watermarkText?: string | undefined;
	onConsentSigned?: (payload: SignedConsentPayload) => void;
	onPackageSigned?: (payloads: SignedConsentPayload[]) => void;
	onConsentConfirmed?: (payload: {
		consentType: string;
		intervention: string;
		toothOrArea: string;
		confirmedAt: string;
		integrityHash?: string;
	}) => void;
}

export type {
	ConsentPackageKey,
	ConsentTemplateKey,
	ConsentSubstitutionContext,
	ConsentTemplate,
	PatientConsentSummaryParams,
	SignedConsentPayload,
	ConsentScopeMismatchResult,
	SignatureStroke,
	SignaturePoint,
	SignatureVectorData,
};
