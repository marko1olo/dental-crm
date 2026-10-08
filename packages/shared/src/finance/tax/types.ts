/**
 * DENTE Dental CRM — Tax Deduction Engine (Types & DTOs)
 * Compliant with FNS Russia Order EA-7-11/824@ (КНД 1151156 / 1184043).
 */

/**
 * Коды родства налогоплательщика и пациента по Приказу ФНС № ЕА-7-11/824@ (КНД 1151156).
 */
export type TaxDeductionRelationship = "patient" | "spouse" | "parent" | "child";

export interface TaxDeductionPaymentItem {
	readonly id: string;
	readonly dateIso: string;
	readonly receiptNumber: string;
	readonly fiscalDocumentNumber: string;
	readonly fiscalSign: string;
	readonly serviceName: string;
	readonly code804n?: string | undefined;
	readonly amountRub: number;
	readonly amountKopecks?: number | undefined;
	readonly taxCode?: "1" | "2" | undefined;
	readonly payerRelationship?: TaxDeductionRelationship | undefined;
	readonly isRefund?: boolean | undefined;
	readonly isReturn?: boolean | undefined;
	readonly operationType?: string | undefined;
	readonly status?: string | undefined;
}

export interface TaxDeductionYearSummary {
	readonly taxYear: number;
	readonly code01Rub: number;
	readonly code01Kopecks: number;
	readonly code02Rub: number;
	readonly code02Kopecks: number;
	readonly totalRub: number;
	readonly totalKopecks: number;
	readonly receiptsCount: number;
	readonly code01StatutoryLimitRub: number;
	readonly code01StatutoryLimitKopecks: number;
	readonly code01EligibleRub: number;
	readonly code01EligibleKopecks: number;
	readonly refund13EstimateRub: number;
	readonly refund13EstimateKopecks: number;
	readonly refund15EstimateRub: number;
	readonly refund15EstimateKopecks: number;
}

export interface TaxDeductionCalculationResult {
	readonly yearsSummary: readonly TaxDeductionYearSummary[];
	readonly grandTotalCode01Rub: number;
	readonly grandTotalCode01Kopecks: number;
	readonly grandTotalCode02Rub: number;
	readonly grandTotalCode02Kopecks: number;
	readonly grandTotalRub: number;
	readonly grandTotalKopecks: number;
	readonly grandTotalRefund13Rub: number;
	readonly grandTotalRefund13Kopecks: number;
	readonly grandTotalRefund15Rub: number;
	readonly grandTotalRefund15Kopecks: number;
	readonly totalReceiptsCount: number;
	readonly totalAmountInWordsRu: string;
}

export interface TaxDeductionClinicParams {
	readonly legalName: string;
	readonly inn: string;
	readonly kpp?: string | undefined;
	readonly ogrn?: string | undefined;
	readonly licenseNumber?: string | undefined;
	readonly licenseDate?: string | undefined;
	readonly address: string;
	readonly chiefDoctorName?: string | undefined;
	readonly isSoleProprietor?: boolean | undefined;
}

export interface TaxDeductionPersonParams {
	readonly fullName: string;
	readonly inn?: string | undefined;
	readonly birthDate?: string | undefined;
	readonly identityDocumentSeries?: string | undefined;
	readonly identityDocumentNumber?: string | undefined;
	readonly identityDocumentIssuedBy?: string | undefined;
	readonly identityDocumentIssueDate?: string | undefined;
	readonly subdivisionCode?: string | undefined;
	readonly snils?: string | undefined;
}

export interface TaxDeductionCertificateParams {
	readonly certificateNumber: string;
	readonly issueDateIso: string;
	readonly taxYear: number;
	readonly taxOfficeCode?: string | undefined;
	readonly clinic: TaxDeductionClinicParams;
	readonly payer: TaxDeductionPersonParams & {
		readonly relationship: TaxDeductionRelationship;
	};
	readonly patient: TaxDeductionPersonParams;
	readonly payments: readonly TaxDeductionPaymentItem[];
	readonly signer?: {
		readonly signerType?: "1" | "2" | undefined; // 1 = руководитель/ИП, 2 = представитель
		readonly fullName?: string | undefined;
		readonly authorityDoc?: string | undefined;
	} | undefined;
}

export interface TaxDeductionBatchParams {
	readonly batchId?: string | undefined;
	readonly taxYear: number;
	readonly taxOfficeCode: string;
	readonly clinic: TaxDeductionClinicParams;
	readonly certificates: readonly TaxDeductionCertificateParams[];
	readonly signer?: {
		readonly signerType?: "1" | "2" | undefined;
		readonly fullName?: string | undefined;
		readonly authorityDoc?: string | undefined;
	} | undefined;
}

export interface FnsTaxCertificateValidationResult {
	readonly isValid: boolean;
	readonly errors: readonly string[];
	readonly warnings: readonly string[];
}

/**
 * Exact Tax Split breakdown using integer BigInt kopecks.
 */
export interface ExactTaxSplitKopecks {
	readonly code01Kopecks: bigint;
	readonly code01Rub: number;
	readonly code02Kopecks: bigint;
	readonly code02Rub: number;
	readonly totalKopecks: bigint;
	readonly totalRub: number;
	readonly code01StatutoryLimitKopecks: bigint;
	readonly code01StatutoryLimitRub: number;
	readonly code01EligibleKopecks: bigint;
	readonly code01EligibleRub: number;
	readonly code01Refund13Kopecks: bigint;
	readonly code01Refund13Rub: number;
	readonly code02Refund13Kopecks: bigint;
	readonly code02Refund13Rub: number;
	readonly refund13Kopecks: bigint;
	readonly refund13Rub: number;
	readonly refund15Kopecks: bigint;
	readonly refund15Rub: number;
	readonly isCode01Capped: boolean;
	readonly receiptsCount: number;
}

export interface PlanServiceItemForTax {
	readonly id?: string | undefined;
	readonly code804n?: string | undefined;
	readonly serviceName?: string | undefined;
	readonly name?: string | undefined;
	readonly priceRub?: number | undefined;
	readonly priceKopecks?: number | undefined;
	readonly quantity?: number | undefined;
	readonly taxCode?: "1" | "2" | undefined;
}

export interface PlanTaxItemDeduction {
	readonly id?: string | undefined;
	readonly code804n?: string | undefined;
	readonly serviceName: string;
	readonly categoryCode: "1" | "2";
	readonly isExpensive: boolean;
	readonly totalRub: number;
	readonly totalKopecks: number;
	readonly eligibleRub: number;
	readonly eligibleKopecks: number;
	readonly refund13Rub: number;
	readonly refund13Kopecks: number;
}

export interface PlanTaxDeductionCalculation {
	readonly code01TotalRub: number;
	readonly code01TotalKopecks: number;
	readonly code01EligibleRub: number;
	readonly code01EligibleKopecks: number;
	readonly code01Refund13Rub: number;
	readonly code01Refund13Kopecks: number;
	readonly code01StatutoryLimitRub: number;
	readonly isCode01Capped: boolean;

	readonly code02TotalRub: number;
	readonly code02TotalKopecks: number;
	readonly code02EligibleRub: number;
	readonly code02EligibleKopecks: number;
	readonly code02Refund13Rub: number;
	readonly code02Refund13Kopecks: number;

	readonly grandTotalRub: number;
	readonly grandTotalKopecks: number;
	readonly grandTotalRefund13Rub: number;
	readonly grandTotalRefund13Kopecks: number;
	readonly netPriceWithRefundRub: number;
	readonly netPriceWithRefundKopecks: number;

	readonly items: readonly PlanTaxItemDeduction[];
	readonly hasCode02ExpensiveServices: boolean;
}

export interface StagedPaymentScheduleBreakdown {
	readonly totalKopecks: number;
	readonly totalRub: number;
	readonly stage1AdvanceTherapyKopecks: number; // 30%
	readonly stage1AdvanceTherapyRub: number;
	readonly stage2SurgeryImplantKopecks: number; // 40%
	readonly stage2SurgeryImplantRub: number;
	readonly stage3OrthopedicsKopecks: number; // 30%
	readonly stage3OrthopedicsRub: number;
	readonly isBalanced: boolean;
	readonly partsKopecks: readonly [number, number, number];
}
