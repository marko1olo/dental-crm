/**
 * cashboxTenderTypes.ts — Layer 0: Contracts & Data Types for Multi-Tender Splits.
 *
 * DENTE Dental CRM — Cash Register 54-FZ, Discounts & Staff Autonomy Operations.
 */

export type TenderAllocationTarget =
	| "card"
	| "cash"
	| "sbp"
	| "deposit"
	| "family"
	| "certificate"
	| "bonus"
	| "dms"
	| "card_and_cash_5050";

export interface MultiTenderStateRub {
	readonly cardRub: number;
	readonly cashRub: number;
	readonly sbpRub: number;
	readonly depositRub: number;
	readonly familyRub: number;
	readonly certificateRub?: number | undefined;
	readonly bonusRub?: number | undefined;
	readonly dmsRub?: number | undefined;
}

export interface FastTenderPreset {
	readonly id: string;
	readonly title: string;
	readonly description: string;
	readonly tenders: MultiTenderStateRub;
}

export interface CashChangeResult {
	readonly totalDueRub: number;
	readonly receivedCashRub: number;
	readonly changeRub: number;
	readonly changeKopecks: number;
	readonly shortageRub: number;
	readonly shortageKopecks: number;
	readonly isExact: boolean;
	readonly isExactWithoutChange: boolean;
	readonly isInsufficient: boolean;
	readonly isShortage: boolean;
}

export interface CombinedSplitCalculationParams {
	readonly totalDueRub: number;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly availableBonusRub?: number | undefined;
	readonly preferFamilyAccount?: boolean | undefined;
	readonly customAdvanceDeductionRub?: number | undefined;
}

export interface CombinedSplitCalculationResult {
	readonly totalDueRub: number;
	readonly totalDueKop: number;
	readonly advanceDeductedRub: number;
	readonly advanceDeductedKop: number;
	readonly advanceSource: "deposit" | "family" | "bonus" | "none";
	readonly remainderToPayRub: number;
	readonly remainderToPayKop: number;
	readonly cardRub: number;
	readonly cardKop: number;
	readonly cashRub: number;
	readonly cashKop: number;
	readonly tenders: MultiTenderStateRub;
	readonly isPennyExact: boolean;
	readonly descriptionRu: string;
}
