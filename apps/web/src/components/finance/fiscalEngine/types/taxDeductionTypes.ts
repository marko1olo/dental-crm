/**
 * taxDeductionTypes.ts — Налоговый вычет и справки об оплате услуг (Мандат 8b <= 120 строк).
 */

import type { Kopecks } from "@dental/shared";

export const ANNUAL_TAX_DEDUCTION_LIMIT_RUB = 150000;
export const ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024 = 150000;
export const ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024 = 120000;

export type TaxDeductionRelationship = "self" | "spouse" | "parent" | "child";

export const TAX_DEDUCTION_RELATIONSHIP_LABELS: Record<TaxDeductionRelationship, string> = {
	self: "Пациент лично (за себя)",
	spouse: "Супруг / супруга",
	parent: "Родитель (мать / отец)",
	child: "Ребенок / подопечный (до 18 / 24 лет)",
};

export const TAX_DEDUCTION_RELATIONSHIP_CODES: Record<TaxDeductionRelationship, string> = {
	self: "1",
	spouse: "2",
	parent: "3",
	child: "4",
};

export interface TaxDeductionReceiptBreakdown {
	readonly code01Kopecks: Kopecks;
	readonly code01Rub: number;
	readonly code02Kopecks: Kopecks;
	readonly code02Rub: number;
	readonly totalKopecks: Kopecks;
	readonly totalRub: number;
	readonly hasCode01: boolean;
	readonly hasCode02: boolean;
	readonly dominantCode: "1" | "2";
	readonly code01ItemsCount: number;
	readonly code02ItemsCount: number;
	readonly refund13EstimateRub: number;
	readonly refund15EstimateRub: number;
	readonly code01UsedFromLimitRub: number;
	readonly code01RemainingLimitRub: number;
	readonly code01Refund13Rub: number;
	readonly code02Refund13Rub: number;
	readonly code01Refund15Rub: number;
	readonly code02Refund15Rub: number;
}

export interface TaxDeductionCertificatePayload {
	readonly certificateNumber: string;
	readonly issueDateIso: string;
	readonly issueDateRu: string;
	readonly taxYear: number;
	readonly clinicName: string;
	readonly clinicLegalName: string;
	readonly clinicInn: string;
	readonly clinicKpp: string;
	readonly clinicOgrn?: string | undefined;
	readonly clinicLicenseNum?: string | undefined;
	readonly clinicAddress: string;
	readonly payerFullName: string;
	readonly payerInn?: string | undefined;
	readonly payerBirthDate?: string | undefined;
	readonly payerRelationship: TaxDeductionRelationship;
	readonly payerRelationshipLabel: string;
	readonly payerRelationshipCode: string;
	readonly patientFullName: string;
	readonly patientBirthDate?: string | undefined;
	readonly patientInn?: string | undefined;
	readonly breakdown: TaxDeductionReceiptBreakdown;
	readonly receipts: ReadonlyArray<{
		readonly receiptNumber: string;
		readonly fiscalDocumentNumber: string;
		readonly fiscalSign: string;
		readonly dateIso: string;
		readonly amountRub: number;
		readonly taxCode: "1" | "2";
	}>;
}

export type TaxDeductionCertificateData = TaxDeductionCertificatePayload;
