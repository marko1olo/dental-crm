import {
	validateRussianInn as sharedValidateRussianInn,
	validateInnIndividual as sharedValidateInnIndividual,
	validateInnLegalEntity as sharedValidateInnLegalEntity,
	validateRussianPassport as sharedValidateRussianPassport,
	resolveTaxDeductionCategoryShared,
	classifyTaxDeduction804n,
	EXPENSIVE_TREATMENT_804N_CODES,
	TAX_DEDUCTION_RELATIONSHIP_MAP,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024,
	generateTaxCertificateQrSvg,
	generateFnsFormKnd1151156BarcodeSvg,
	amountToWordsRu,
	extractTaxYearFromDate,
	type TaxDeductionRelationship,
} from "@dental/shared";

export {
	sharedValidateRussianInn as validateRussianInn,
	sharedValidateInnIndividual as validateInnIndividual,
	sharedValidateInnLegalEntity as validateInnLegalEntity,
	sharedValidateRussianPassport as validateRussianPassport,
	resolveTaxDeductionCategoryShared as resolveTaxDeductionCategory,
	classifyTaxDeduction804n,
	EXPENSIVE_TREATMENT_804N_CODES,
	TAX_DEDUCTION_RELATIONSHIP_MAP,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024,
	generateTaxCertificateQrSvg,
	generateFnsFormKnd1151156BarcodeSvg,
	amountToWordsRu,
	extractTaxYearFromDate,
	type TaxDeductionRelationship,
};

export const FNS_ORDER_824_FULL_NAME =
	"Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@ (КНД 1151156)";
export const KND_1151156_FORM_CODE = "1151156";

export interface TaxPaymentRecord {
	readonly id: string;
	readonly dateIso: string;
	readonly receiptNumber?: string | undefined;
	readonly fiscalDocumentNumber?: string | undefined;
	readonly fiscalSign?: string | undefined;
	readonly serviceName: string;
	readonly code804n?: string | undefined;
	readonly amountRub: number;
	readonly amountKopecks?: number | undefined;
	readonly taxCode?: "1" | "2" | undefined;
	readonly isRefund?: boolean | undefined;
	readonly isReturn?: boolean | undefined;
	readonly status?: string | undefined;
}

export interface TaxYearAggregation {
	readonly taxYear: number;
	readonly code01Kopecks: number;
	readonly code01Rub: number;
	readonly code02Kopecks: number;
	readonly code02Rub: number;
	readonly totalNetKopecks: number;
	readonly totalNetRub: number;
	readonly totalGrossKopecks: number;
	readonly refundedKopecks: number;
	readonly eligibleCode01Kopecks: number;
	readonly eligibleCode01Rub: number;
	readonly estimatedRefund13Kopecks: number;
	readonly estimatedRefund13Rub: number;
	readonly receiptsCount: number;
	readonly payments: readonly TaxPaymentRecord[];
}

export interface TaxCertificatePartyInfo {
	readonly fullName: string;
	readonly birthDate?: string | undefined;
	readonly inn?: string | undefined;
	readonly snils?: string | undefined;
	readonly passportSeries?: string | undefined;
	readonly passportNumber?: string | undefined;
	readonly passportIssuedBy?: string | undefined;
	readonly passportIssuedDate?: string | undefined;
	readonly relationship?: TaxDeductionRelationship | undefined;
}

export interface TaxCertificateClinicInfo {
	readonly legalName: string;
	readonly inn: string;
	readonly kpp?: string | undefined;
	readonly ogrn: string;
	readonly address: string;
	readonly licenseNumber: string;
	readonly licenseDate?: string | undefined;
	readonly chiefDoctorOrDirector?: string | undefined;
}

export interface TaxCertificateDocumentData {
	readonly certificateNumber: string;
	readonly issueDateIso: string;
	readonly taxYear: number;
	readonly clinic: TaxCertificateClinicInfo;
	readonly taxpayer: TaxCertificatePartyInfo;
	readonly patient: TaxCertificatePartyInfo;
	readonly aggregation: TaxYearAggregation;
}
