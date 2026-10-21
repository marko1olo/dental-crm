/**
 * letterTypes.ts — Контракты моделей гарантийных писем ДМС и строк счетов
 */

export interface DmsGuaranteeLetter {
	readonly id: string;
	readonly letterNumber: string;
	readonly issueDate: string;
	readonly validFrom?: string | undefined;
	readonly validUntil: string;
	readonly maxApprovedAmountKopecks?: number | undefined;
	readonly approvedAmountKopecks?: number | undefined;
	readonly maxCoverageRub?: number | undefined;
	readonly maxCoverageKopecks?: number | undefined;
	readonly usedAmountRub?: number | undefined;
	readonly usedAmountKopecks?: number | undefined;
	readonly franchisePct?: number | undefined;
	readonly franchisePercent?: number | undefined;
	readonly franchiseType?: "percent" | "fixed_rub" | "fixed_kopecks" | "fixed" | undefined;
	readonly franchiseFixedRub?: number | undefined;
	readonly franchiseFixedKopecks?: number | undefined;
	readonly insurerId?: string | undefined;
	readonly insurerKey?: string | undefined;
	readonly insurerName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientFullName: string;
	readonly policyNumber?: string | undefined;
	readonly patientPolicyNumber?: string | undefined;
	readonly approvedTeethFdi?: readonly string[] | undefined;
	readonly approvedServiceCodes804n?: readonly string[] | undefined;
	readonly approvedServiceCodes?: readonly string[] | undefined;
	readonly approvedDiagnosisCodes?: readonly string[] | undefined;
	readonly programExclusions?: readonly string[] | undefined;
	readonly diagnosisIcd10?: string | undefined;
	readonly curatorFullName?: string | undefined;
	readonly curatorPhone?: string | undefined;
	readonly notes?: string | undefined;
	readonly status?:
		| "draft"
		| "pending_approval"
		| "approved"
		| "active"
		| "billed"
		| "paid"
		| "exhausted"
		| "expired"
		| "cancelled"
		| undefined;
}

export interface DmsBillableLineItem {
	readonly id: string;
	readonly serviceCode: string;
	readonly serviceCode804n?: string | undefined;
	readonly serviceName: string;
	readonly toothNumber?: string | undefined;
	readonly quantity: number;
	readonly unitPriceKopecks: number;
	readonly discountPercent?: number | undefined;
}

export interface DmsSplitLineResult {
	readonly lineItemId: string;
	readonly id?: string | undefined;
	readonly serviceCode: string;
	readonly serviceCode804n?: string | undefined;
	readonly serviceName: string;
	readonly toothNumber?: string | undefined;
	readonly quantity: number;
	readonly unitPriceKopecks: number;
	readonly totalKopecks: number;
	readonly insuranceCoveredKopecks: number;
	readonly coveredByDmsKopecks?: number | undefined;
	readonly patientOutOfPocketKopecks: number;
	readonly patientTotalKopecks?: number | undefined;
	readonly insuranceCoveredRubles: number;
	readonly patientOutOfPocketRubles: number;
	readonly status: "full_dms" | "co_payment" | "patient_full";
	readonly splitReason: string;
	readonly isApprovedByLetter: boolean;
	readonly isExcludedByPolicy: boolean;
	readonly franchiseDeductionKopecks: number;
	readonly copayKopecks?: number | undefined;
	readonly patientExcludedKopecks?: number | undefined;
	readonly patientExceededLimitKopecks?: number | undefined;
}

export type PatientPaymentMethod = "cash" | "card" | "advance" | "mixed";

export interface PatientPaymentSplit {
	readonly paymentMethod: PatientPaymentMethod;
	readonly totalPatientKopecks: number;
	readonly totalPatientRubles: number;
	readonly cashKopecks: number;
	readonly cardKopecks: number;
	readonly advanceKopecks: number;
	readonly cashRubles: number;
	readonly cardRubles: number;
	readonly advanceRubles: number;
	readonly isBalanced: boolean;
	readonly balanceDiscrepancyKopecks: number;
}
export type PatientPaymentSplitResult = PatientPaymentSplit;
