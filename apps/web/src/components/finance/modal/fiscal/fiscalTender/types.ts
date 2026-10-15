import type React from "react";
import type { LoyaltyDiscountPreset } from "../../../fiscal/fiscal54fzEngine";

export type PaymentMode = "cash" | "card" | "sbp" | "deposit" | "split";

export type SingleMethodType = "card" | "sbp" | "cash" | "deposit" | "certificate" | "insurance";

export type CombinedPresetType =
	| "advance_card"
	| "advance_cash"
	| "split_cash_card"
	| "advance_cash_card"
	| "exact_cash"
	| "full_card";

export interface AllocationState {
	readonly isFullyAllocated: boolean;
	readonly isOverallocated: boolean;
	readonly remainingKopecks: number;
	readonly allocatedKopecks: number;
}

export interface FiscalPaymentTenderSectionProps {
	readonly paymentMode: PaymentMode;
	readonly setPaymentMode: (mode: PaymentMode) => void;
	readonly selectSingleMethod: (type: SingleMethodType) => void;
	readonly applyCombinedPaymentPreset: (mode: CombinedPresetType) => void;
	readonly totalSumRub: number;
	readonly patientDepositRub: number;
	readonly selectedDiscountPreset: LoyaltyDiscountPreset;
	readonly setSelectedDiscountPreset: (p: LoyaltyDiscountPreset) => void;
	readonly handleManualCardTerminalConfirm: () => Promise<void>;
	readonly isSubmittingManualCard: boolean;
	readonly cashAmount: number;
	readonly setCashAmount: React.Dispatch<React.SetStateAction<number>>;
	readonly receivedCashRub: number;
	readonly setReceivedCashRub: React.Dispatch<React.SetStateAction<number>>;
	readonly cardAmount: number;
	readonly setCardAmount: React.Dispatch<React.SetStateAction<number>>;
	readonly sbpAmount: number;
	readonly setSbpAmount: React.Dispatch<React.SetStateAction<number>>;
	readonly depositAmount: number;
	readonly setDepositAmount: React.Dispatch<React.SetStateAction<number>>;
	readonly certificateAmount: number;
	readonly setCertificateAmount: React.Dispatch<React.SetStateAction<number>>;
	readonly insuranceAmount?: number | undefined;
	readonly setInsuranceAmount: (val: number) => void;
	readonly guaranteeLetterNumber?: string | undefined;
	readonly setGuaranteeLetterNumber?: ((val: string) => void) | undefined;
	readonly remainingRub: number;
	readonly allocation: AllocationState;
	readonly handleFillRemaining: (type: SingleMethodType) => void;
	readonly handleAutoDistributeRemaining: () => void;
	readonly handleAutoBalanceOverallocation: () => void;
}

export interface TenderModeSelectorProps {
	readonly paymentMode: PaymentMode;
	readonly setPaymentMode: (mode: PaymentMode) => void;
	readonly selectSingleMethod: (type: SingleMethodType) => void;
	readonly totalSumRub: number;
}

export interface TenderQuickPresetsProps {
	readonly setPaymentMode: (mode: PaymentMode) => void;
	readonly selectSingleMethod: (type: SingleMethodType) => void;
	readonly applyCombinedPaymentPreset: (mode: CombinedPresetType) => void;
	readonly totalSumRub: number;
	readonly patientDepositRub: number;
	readonly selectedDiscountPreset: LoyaltyDiscountPreset;
	readonly setSelectedDiscountPreset: (p: LoyaltyDiscountPreset) => void;
	readonly handleManualCardTerminalConfirm: () => Promise<void>;
	readonly isSubmittingManualCard: boolean;
	readonly setCardAmount: React.Dispatch<React.SetStateAction<number>>;
	readonly setCashAmount: React.Dispatch<React.SetStateAction<number>>;
	readonly setSbpAmount: React.Dispatch<React.SetStateAction<number>>;
	readonly setDepositAmount: React.Dispatch<React.SetStateAction<number>>;
	readonly setCertificateAmount: React.Dispatch<React.SetStateAction<number>>;
	readonly insuranceAmount?: number | undefined;
	readonly setInsuranceAmount: (val: number) => void;
}

export interface TenderMethodListProps {
	readonly paymentMode: PaymentMode;
	readonly setPaymentMode: (mode: PaymentMode) => void;
	readonly totalSumRub: number;
	readonly patientDepositRub: number;
	readonly handleManualCardTerminalConfirm: () => Promise<void>;
	readonly isSubmittingManualCard: boolean;
	readonly cashAmount: number;
	readonly setCashAmount: React.Dispatch<React.SetStateAction<number>>;
	readonly receivedCashRub: number;
	readonly setReceivedCashRub: React.Dispatch<React.SetStateAction<number>>;
	readonly cardAmount: number;
	readonly setCardAmount: React.Dispatch<React.SetStateAction<number>>;
	readonly sbpAmount: number;
	readonly setSbpAmount: React.Dispatch<React.SetStateAction<number>>;
	readonly depositAmount: number;
	readonly setDepositAmount: React.Dispatch<React.SetStateAction<number>>;
	readonly certificateAmount: number;
	readonly setCertificateAmount: React.Dispatch<React.SetStateAction<number>>;
	readonly insuranceAmount?: number | undefined;
	readonly setInsuranceAmount: (val: number) => void;
	readonly guaranteeLetterNumber?: string | undefined;
	readonly setGuaranteeLetterNumber?: ((val: string) => void) | undefined;
	readonly remainingRub: number;
	readonly handleFillRemaining: (type: SingleMethodType) => void;
}

export interface TenderSummaryBadgeProps {
	readonly allocation: AllocationState;
	readonly remainingRub: number;
	readonly totalSumRub: number;
	readonly handleAutoDistributeRemaining: () => void;
	readonly handleAutoBalanceOverallocation: () => void;
}
