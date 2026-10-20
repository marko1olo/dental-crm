import type {
	MultiTenderStateRub,
	PayerLegalType,
	PaymentMethodTab,
	TenderAllocationTarget,
	validateBuyerInn54Fz,
	process100PercentDiscountCheckout,
} from "../cashboxOperations.js";
import type { CashBoxSummary, PendingInvoiceItem } from "./types.js";

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
	readonly handleInvoicePaymentSuccess: (receipt: unknown) => void;
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