import type { CheckoutPaymentMethodType } from "../fastCheckoutPresets.js";

export type ClientLegalType = "physical_person" | "legal_entity" | "individual_entrepreneur";

export interface CheckoutSplitItem {
	readonly method: CheckoutPaymentMethodType;
	readonly amountKop: number;
}
export interface FastCheckoutSplitState {
	readonly cardRub: number;
	readonly cashRub: number;
	readonly sbpRub: number;
	readonly depositRub: number;
	readonly loyaltyRub: number;
	readonly dmsRub?: number | undefined;
}
export interface FastCheckoutInput {
	readonly orderId: string;
	readonly totalBillKop: number;
	readonly payments: readonly CheckoutSplitItem[];
	readonly cashTenderedKop?: number | undefined;
	readonly patientEmail?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly taxSystem?: "usn_income_outcome" | "patent" | "osno" | undefined;
	readonly idempotencyKey?: string | undefined;
	readonly clientType?: ClientLegalType | undefined;
	readonly buyerInn?: string | undefined;
	readonly buyerName?: string | undefined;
	readonly isElectronicReceiptOnly?: boolean | undefined;
}

export interface TreatmentPlanStageOption {
	readonly id: string;
	readonly titleRu: string;
	readonly stageKind: string;
	readonly amountKop: number;
	readonly itemsCount: number;
	readonly advanceAlreadyPaidKop?: number | undefined;
	readonly advanceAlreadyPaidRub?: number | undefined;
	readonly paidAmountKop?: number | undefined;
	readonly paidAmountRub?: number | undefined;
	readonly remainingDueKop?: number | undefined;
	readonly remainingDueRub?: number | undefined;
}

export type StagePaymentMode = "full" | "advance_30" | "advance_50" | "advance_offset_tag1215";

export interface StageAdvanceCalculation {
	readonly mode: StagePaymentMode;
	readonly totalStageAmountKop: number;
	readonly requiredAmountKop: number;
	readonly advanceOffsetTag1215Kop: number;
	readonly remainingDueKop: number;
	readonly ffdTag1214: number;
	readonly ffdTag1214NameRu: string;
	readonly ffdTag1212: number;
	readonly ffdTag1212NameRu: string;
	readonly isAdvanceReceipt: boolean;
	readonly isAdvanceOffsetReceipt: boolean;
}

export interface BuyerInnValidationResult {
	readonly isValid: boolean;
	readonly isRequired: boolean;
	readonly errorRu?: string | undefined;
}

export type QuickCheckoutPresetType =
	| "100_card" | "100_cash" | "100_sbp" | "use_deposit"
	| "deposit_cash" | "deposit_sbp" | "split_50_50" | "split_three_way" | "warranty_100";

export interface QuickCheckoutPresetResult {
	readonly payments: readonly CheckoutSplitItem[];
	readonly cashTenderedKop: number;
	readonly activeMethod: CheckoutPaymentMethodType;
}

export interface FastCheckoutValidationResult {
	readonly isValid: boolean;
	readonly totalPaidKop: number;
	readonly totalBillKop: number;
	readonly remainingDueKop: number;
	readonly cashChangeDueKop: number;
	readonly errorMessageRu?: string | undefined;
}

export interface CashChangeCalculation {
	readonly cashTenderedKop: number;
	readonly cashRequiredKop: number;
	readonly changeDueKop: number;
	readonly isUnderpaid: boolean;
	readonly missingKop: number;
}

export interface FiscalReceiptPayload {
	readonly ffdVersion?: "1.2" | undefined;
	readonly orderId: string;
	readonly idempotencyKey?: string | undefined;
	readonly totalSumKop: number;
	readonly paymentMethodTag1214: number;
	readonly paymentSubjectTag1212: number;
	readonly paymentsDistribution: {
		readonly cashKop: number;
		readonly electronicKop: number;
		readonly advancePrepaymentKop: number;
		readonly creditKop: number;
		readonly barterOtherKop: number;
	};
	readonly clientContact?: string | undefined;
	readonly isElectronicReceiptOnly: boolean;
	readonly clientType: ClientLegalType;
	readonly buyerInn?: string | undefined;
	readonly buyerName?: string | undefined;
	readonly taxSystem: string;
	readonly calculationType: 1;
	readonly offlineBuffered?: boolean | undefined;
}

export type Ffd12FiscalPayload = FiscalReceiptPayload;
