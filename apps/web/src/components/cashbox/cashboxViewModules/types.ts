/**
 * apps/web/src/components/cashbox/cashboxViewModules/types.ts
 *
 * Layer 0: Contracts & DTOs for 54-FZ Cashbox Workspace.
 * Zero runtime dependencies, purely type-level definitions.
 */

import type {
	PayerLegalType,
	TenderAllocationTarget,
	MultiTenderStateRub,
	validateBuyerInn54Fz,
	process100PercentDiscountCheckout,
} from "../../finance/cashboxOperations.js";
import type { PaymentMethodTab } from "../../finance/PaymentModal.js";

export interface CashboxViewProps {
	readonly initialShiftOpen?: boolean | undefined;
	readonly cashierName?: string | undefined;
	readonly cashierInn?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly initialAmountRub?: number | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly visitId?: string | undefined;
	readonly invoiceId?: string | undefined;
	readonly documentId?: string | undefined;
	readonly onPaymentComplete?: ((receipt: any) => void) | undefined;
}

export interface CashBoxSummary {
	readonly id: string;
	readonly type: string;
	readonly name: string;
	readonly balanceRub: number;
	readonly isShiftOpen?: boolean;
}

export type CashboxShiftState = "open" | "closed";

export interface CashboxOperationItem {
	readonly id: string;
	readonly time: string;
	readonly type: "payment" | "refund" | "cash_in" | "cash_out" | "correction";
	readonly method: "cash" | "card" | "sbp" | "deposit" | "split";
	readonly amountRub: number;
	readonly patientName?: string;
	readonly receiptNumber?: string;
	readonly cashierFio?: string;
	readonly status: "completed" | "cancelled" | "pending";
}

export interface PendingInvoiceItem {
	readonly id: string;
	readonly number?: string | undefined;
	readonly invoiceNumber?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly visitId?: string | null | undefined;
	readonly totalAmountRub: number;
	readonly status: string;
	readonly date?: string | undefined;
	readonly createdAt?: string | undefined;
}

export type {
	PayerLegalType,
	TenderAllocationTarget,
	MultiTenderStateRub,
	PaymentMethodTab,
};

export type InnValidationResult = ReturnType<typeof validateBuyerInn54Fz>;
export type CheckoutResult = ReturnType<typeof process100PercentDiscountCheckout>;

export interface CashboxControllerReturn {
	readonly cashBoxes: readonly CashBoxSummary[];
	readonly isShiftOpen: boolean;
	readonly mainCashBoxId: string | null;
	readonly payerType: PayerLegalType;
	readonly setPayerType: (type: PayerLegalType) => void;
	readonly buyerInn: string;
	readonly setBuyerInn: (inn: string) => void;
	readonly grossAmountRub: number;
	readonly setGrossAmountRub: (amount: number) => void;
	readonly discountPercent: number;
	readonly setDiscountPercent: (discount: number) => void;
	readonly isWarranty: boolean;
	readonly setIsWarranty: (warranty: boolean) => void;
	readonly isStaffColleague: boolean;
	readonly setIsStaffColleague: (staff: boolean) => void;
	readonly isPaymentModalOpen: boolean;
	readonly setIsPaymentModalOpen: (open: boolean) => void;
	readonly isRetailModalOpen: boolean;
	readonly setIsRetailModalOpen: (open: boolean) => void;
	readonly activePaymentMethod: PaymentMethodTab;
	readonly setActivePaymentMethod: (method: PaymentMethodTab) => void;
	readonly isSubmittingZeroReceipt: boolean;
	readonly tenders: MultiTenderStateRub;
	readonly setTenders: (tenders: MultiTenderStateRub) => void;
	readonly effectiveDepositRub: number;
	readonly effectiveFamilyBalanceRub: number;
	readonly innValidation: InnValidationResult;
	readonly checkoutResult: CheckoutResult;
	readonly selectedInvoice: PendingInvoiceItem | null;
	readonly setSelectedInvoice: (inv: PendingInvoiceItem | null) => void;
	readonly handlePayInvoice: (inv: PendingInvoiceItem) => void;
	readonly handleInvoicePaymentSuccess: (receipt: any) => void;
	readonly handleOpenShift: () => Promise<void>;
	readonly handleCloseShift: () => Promise<void>;
	readonly handlePrintXReport: () => Promise<void>;
	readonly handleCashIn: (amountRub: number, basis: string) => Promise<void>;
	readonly handleCashOut: (amountRub: number, basis: string, recipientFio?: string) => Promise<void>;
	readonly handleAllocateAll: (target: TenderAllocationTarget) => void;
	readonly handleOpenPaymentWithMethod: (method: PaymentMethodTab) => void;
	readonly handleProcessZeroDiscountCheckout: () => Promise<void>;
	readonly handleAddAmountPreset: (rub: number) => void;
	readonly resetDiscount: () => void;
}
