/**
 * ЮРИДИЧЕСКИЙ КАТАЛОГ ИДС — ТИПЫ И ИНТЕРФЕЙСЫ
 */

export type ConsentTemplateKey =
	| "CONSENT_THERAPY"
	| "CONSENT_SURGERY_IMPLANT"
	| "CONSENT_ORTHODONTICS"
	| "CONSENT_ORTHOPEDICS"
	| "CONSENT_HYGIENE_BLEACHING"
	| "CONSENT_ANESTHESIA"
	| "CONSENT_PERSONAL_DATA"
	| "CONSENT_INSPECTION_1051N"
	| "CONSENT_PEDIATRIC"
	| "CONSENT_EGISZ_REFUSAL"
	| "CONSENT_TREATMENT_REFUSAL"
	| "CONSENT_WARRANTY_PASSPORT"
	| "CONSENT_WARRANTY_POLICY"
	| "CONSENT_SEDATION"
	| "CONSENT_PHOTOPROTOCOL"
	| "CONSENT_HEALTH_QUESTIONNAIRE";

export interface ConsentSection {
	id: string;
	title: string;
	content: string;
	bullets?: readonly string[];
}

export interface ConsentTemplate {
	key: ConsentTemplateKey;
	code: string;
	title: string;
	subtitle: string;
	category: "therapy" | "surgery" | "orthodontics" | "orthopedics" | "hygiene" | "anesthesia" | "legal" | "pediatric";
	statutoryBasis: string;
	sections: readonly ConsentSection[];
	mandatoryPlaceholders: readonly string[];
	aftercareInstructions: readonly string[];
	riskFactors: readonly string[];
	alternativeTreatments: readonly string[];
}

export interface ConsentSubstitutionContext {
	patientName?: string | null | undefined;
	birthDate?: string | null | undefined;
	passport?: string | null | undefined;
	doctorName?: string | null | undefined;
	clinicName?: string | null | undefined;
	clinicLegalName?: string | null | undefined;
	clinicAddress?: string | null | undefined;
	clinicOgrn?: string | null | undefined;
	licenseNumber?: string | null | undefined;
	diagnosisIcd?: string | null | undefined;
	toothNumbers?: string | null | undefined;
	date?: string | null | undefined;
	snils?: string | null | undefined;
	phone?: string | null | undefined;
	guardianName?: string | null | undefined;
	guardianRelation?: string | null | undefined;
	guardianDocument?: string | null | undefined;
	guardianPhone?: string | null | undefined;
	patientAgeYears?: number | null | undefined;
}

export type ConsentPackageKey =
	| "PACKAGE_PRIMARY_VISIT"
	| "PACKAGE_SURGERY"
	| "PACKAGE_ORTHOPEDICS";

export interface ConsentPackageDefinition {
	key: ConsentPackageKey;
	code: string;
	title: string;
	shortTitle: string;
	subtitle: string;
	templateKeys: readonly ConsentTemplateKey[];
	description: string;
}

export type ConsentPackage = ConsentPackageDefinition;

export interface RenderedConsentTemplate {
	title: string;
	subtitle: string;
	statutoryBasis: string;
	renderedSections: { id: string; title: string; content: string; bullets?: string[] | undefined }[];
	aftercareInstructions: string[];
	riskFactors: string[];
	alternativeTreatments: string[];
	fullTextContent: string;
}


export interface ConsentPrintParams {
	title?: string;
	subtitle?: string;
	clinicName?: string;
	clinicLicense?: string;
	clinicAddress?: string;
	clinicPhone?: string;
	patientName?: string;
	birthDate?: string;
	passport?: string;
	snils?: string;
	phone?: string;
	doctorName?: string;
	intervention?: string;
	toothOrArea?: string;
	diagnosisOrIndication?: string;
	expectedBenefit?: string;
	anesthesia?: string;
	materialNotes?: string;
	risks?: string;
	alternatives?: string;
	aftercare?: string;
	date?: string;
	isBlank?: boolean;
	isSigned?: boolean;
	watermarkText?: string;
}

/**
 * Параметры печати бланка ИДС на несовершеннолетнего (законный представитель)
 */
export interface MinorConsentPrintParams {
	clinicName?: string;
	clinicLicense?: string;
	clinicAddress?: string;
	clinicPhone?: string;
	representativeName?: string;
	representativeRelation?: string;
	representativeDocument?: string;
	representativePhone?: string;
	childName?: string;
	childBirthDate?: string;
	doctorName?: string;
	interventionScope?: string;
	diagnosisOrIndication?: string;
	risks?: string;
	alternatives?: string;
	date?: string;
	isBlank?: boolean;
	isSigned?: boolean;
	watermarkText?: string;
}

/**
 * Параметры непрерывной печати пакета согласий ИДС (А4)
 */
export interface ConsentPackagePrintOptions {
	mode?: "blank" | "filled" | undefined;
	isBlank?: boolean | undefined;
	isSigned?: boolean | undefined;
	watermarkText?: string | undefined;
	context?: ConsentSubstitutionContext | undefined;
	clinicDefaults?: Partial<ConsentSubstitutionContext> | undefined;
}
