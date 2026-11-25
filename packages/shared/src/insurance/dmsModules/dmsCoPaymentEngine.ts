import { formatKopecksToRub } from "../../money.js";

/**
 * Billable line item for DMS invoice splitting and co-payment calculation.
 */
export interface DmsBillableItem {
	readonly id?: string | undefined;
	readonly serviceCode?: string | undefined;
	readonly serviceCode804n?: string | undefined;
	readonly serviceName?: string | undefined;
	readonly toothNumber?: string | number | undefined;
	readonly quantity?: number | undefined;
	readonly unitPriceKopecks?: number | undefined;
	readonly unitPriceRub?: number | undefined;
	readonly discountPercent?: number | undefined;
	readonly isExcluded?: boolean | undefined;
}

export interface DmsCoPaymentGuaranteeLetterInput {
	readonly maxApprovedAmountKopecks?: number | undefined;
	readonly maxCoverageKopecks?: number | undefined;
	readonly limitKopecks?: number | undefined;
	readonly maxCoverageRub?: number | undefined;
	readonly usedKopecks?: number | undefined;
	readonly usedAmountKopecks?: number | undefined;
	readonly usedAmountRub?: number | undefined;
	readonly remainingLimitKopecks?: number | undefined;
	readonly defaultFranchisePercent?: number | undefined;
	readonly franchisePct?: number | undefined;
	readonly franchisePercent?: number | undefined;
}

/**
 * Method used by patient to pay their co-payment portion at the clinic cash desk.
 */
export type PatientPaymentMethod = "cash" | "card" | "advance" | "mixed";

/**
 * Formats integer kopecks to Russian currency string with rubles ("1 500 ₽").
 */
export function formatCurrencyKopecks(kopecks: number | null | undefined): string {
	return formatKopecksToRub(kopecks);
}

export interface DmsCoPaymentSplitItemResult {
	readonly lineItemId: string;
	readonly id: string;
	readonly serviceCode: string;
	readonly serviceCode804n: string;
	readonly serviceName: string;
	readonly toothNumber?: string | undefined;
	readonly quantity: number;
	readonly unitPriceKopecks: number;
	readonly totalKopecks: number;
	readonly insuranceCoveredKopecks: number;
	readonly coveredByDmsKopecks: number;
	readonly patientOutOfPocketKopecks: number;
	readonly patientTotalKopecks: number;
	readonly insuranceCoveredRubles: number;
	readonly patientOutOfPocketRubles: number;
	readonly status: "full_dms" | "co_payment" | "patient_full";
	readonly splitReason: string;
	readonly isApprovedByLetter: boolean;
	readonly isExcludedByPolicy: boolean;
	readonly franchiseDeductionKopecks: number;
	readonly copayKopecks: number;
}

export interface DmsCoPaymentSplitResult {
	readonly totalBillKopecks: number;
	readonly dmsCoveredKopecks: number;
	readonly patientCoPayKopecks: number;
	readonly lineItems: readonly DmsCoPaymentSplitItemResult[];
	readonly isFullyCovered: boolean;
	readonly hasExcludedServices: boolean;
	readonly remainingLetterLimitKopecks: number | null;
	readonly remainingLimitKopecks: number;

	// Backward compatibility aliases (deprecated)
	/** @deprecated Use lineItems */
	readonly splitResults?: readonly DmsCoPaymentSplitItemResult[] | undefined;
	/** @deprecated Use lineItems */
	readonly items?: readonly DmsCoPaymentSplitItemResult[] | undefined;
	/** @deprecated Use lineItems */
	readonly lines?: readonly DmsCoPaymentSplitItemResult[] | undefined;
	/** @deprecated Use totalBillKopecks */
	readonly totalKopecks?: number | undefined;
	/** @deprecated Use totalBillKopecks */
	readonly totalAmountKopecks?: number | undefined;
	/** @deprecated Use dmsCoveredKopecks */
	readonly insuranceCoveredKopecks?: number | undefined;
	/** @deprecated Use dmsCoveredKopecks */
	readonly totalCoveredByDmsKopecks?: number | undefined;
	/** @deprecated Use dmsCoveredKopecks */
	readonly totalInsuranceCoveredKopecks?: number | undefined;
	/** @deprecated Use patientCoPayKopecks */
	readonly patientOutOfPocketKopecks?: number | undefined;
	/** @deprecated Use patientCoPayKopecks */
	readonly totalPatientOutOfPocketKopecks?: number | undefined;
	/** @deprecated Use patientCoPayKopecks */
	readonly totalPatientCoPayKopecks?: number | undefined;
	/** @deprecated Use patientCoPayKopecks */
	readonly patientTotalKopecks?: number | undefined;
	/** @deprecated Format via formatKopecksToRub */
	readonly totalBillRubles?: number | undefined;
	/** @deprecated Format via formatKopecksToRub */
	readonly insuranceCoveredRubles?: number | undefined;
	/** @deprecated Format via formatKopecksToRub */
	readonly totalInsuranceCoveredRubles?: number | undefined;
	/** @deprecated Format via formatKopecksToRub */
	readonly patientOutOfPocketRubles?: number | undefined;
	/** @deprecated Format via formatKopecksToRub */
	readonly totalPatientOutOfPocketRubles?: number | undefined;
}
