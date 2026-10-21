/**
 * apps/web/src/components/finance/paymentModalModules/types.ts
 *
 * Layer 0: Payment Types, Method Contracts, and Subcomponent Prop Interfaces.
 * Strictly 0 runtime dependencies, pure type contracts.
 * Governed by Mandates 8b (<=120 lines limit), 8d (Studio HIG), 8e (Doctor Autonomy).
 */

import type React from "react";
import type { PaymentDiscountCalculation } from "../cashboxOperations.js";
import type { PaymentMethodTab, PaymentModalProps } from "../modal/payment/paymentModalTypes.js";
import type { usePaymentModalLogic } from "../modal/payment/usePaymentModalLogic.js";

export {
	type PaymentDiscountCalculation,
	type PaymentMethodTab,
	type PaymentModalProps,
};

export type PaymentLogicResult = ReturnType<typeof usePaymentModalLogic>;

/** 1. PaymentHeader Props */
export interface PaymentHeaderProps {
	readonly title?: string | undefined;
	readonly patientName: string;
	readonly patientPhone?: string | undefined;
	readonly effectiveCashier: string;
	readonly rawTotalDueRub: number;
	readonly discountsHook: PaymentLogicResult["discountsHook"];
	readonly showReceiptSidePanel: boolean;
	readonly setShowReceiptSidePanel: React.Dispatch<React.SetStateAction<boolean>>;
	readonly mobileTab: "checkout" | "receipt";
	readonly setMobileTab: React.Dispatch<React.SetStateAction<"checkout" | "receipt">>;
	readonly onClose: () => void;
}

/** 2. PaymentMethodSelector Props */
export interface PaymentMethodSelectorProps {
	readonly activeMethod: PaymentMethodTab;
	readonly setActiveMethod: (method: PaymentMethodTab) => void;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly onOpenSplitPayment?: (() => void) | undefined;
}

/** 3. PaymentBanners Props (Warranty Remake, Debt, Deposit chip) */
export interface PaymentBannersProps {
	readonly totalDueRub: number;
	readonly rawTotalDueRub: number;
	readonly patientDebtRub?: number | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly discountsHook: PaymentLogicResult["discountsHook"];
	readonly execHook: PaymentLogicResult["execHook"];
	readonly tendersHook?: PaymentLogicResult["tendersHook"] | undefined;
	readonly onClose: () => void;
	readonly onSuccess?: ((payload: any) => void) | undefined;
}

/** 4. PaymentCashCalculator Props */
export interface PaymentCashCalculatorProps {
	readonly totalDueRub: number;
	readonly receivedCashRub: number;
	readonly setReceivedCashRub: React.Dispatch<React.SetStateAction<number>>;
	readonly cashChange: {
		readonly changeRub: number;
		readonly isExact: boolean;
		readonly shortageRub: number;
	};
	readonly handleCashSubmit: () => void;
	readonly isSubmittingCash: boolean;
}

/** 5. PaymentDiscountsPresets Props */
export interface PaymentDiscountsPresetsProps {
	readonly discountsHook: PaymentLogicResult["discountsHook"];
	readonly tendersHook: PaymentLogicResult["tendersHook"];
	readonly patientDepositRub?: number | undefined;
}

/** 6. PaymentFiscalPreview Props */
export interface PaymentFiscalPreviewProps {
	readonly clinicLegalName: string;
	readonly totalDueRub: number;
	readonly patientName: string;
	readonly patientPhone?: string | undefined;
	readonly patientEmail?: string | undefined;
	readonly effectiveCashier: string;
	readonly isWarranty100: boolean;
	readonly tendersHook: PaymentLogicResult["tendersHook"];
	readonly discountsHook: PaymentLogicResult["discountsHook"];
	readonly showReceiptSidePanel: boolean;
	readonly mobileTab: "checkout" | "receipt";
	readonly items?: readonly import("../../billing/ReceiptPreview.js").ReceiptItem[] | undefined;
	readonly toothNumber?: number | string | undefined;
}

/** 7. PaymentFooterActions Props */
export interface PaymentFooterActionsProps {
	readonly mobileTab: "checkout" | "receipt";
	readonly totalDueRub: number;
	readonly discountRub: number;
	readonly rawTotalDueRub: number;
	readonly activeMethod: PaymentMethodTab;
	readonly discountsHook: PaymentLogicResult["discountsHook"];
	readonly tendersHook: PaymentLogicResult["tendersHook"];
	readonly execHook: PaymentLogicResult["execHook"];
	readonly onClose: () => void;
	readonly onSuccess?: ((payload: any) => void) | undefined;
}
