/**
 * Параметры печати бланков ИДС и пакетов согласий
 */
import type { ConsentSubstitutionContext } from "./types";

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
	representativeBasis?: string;
	representativePhone?: string;
	childName?: string;
	childBirthDate?: string;
	childDocument?: string;
	accompanyingPerson?: string;
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
