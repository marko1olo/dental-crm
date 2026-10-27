import type { SberPosTransactionResponse, CashBoxType, CashReceiptTypeAlias } from "@dental/shared";
import type { PayerType, PaymentDiscountCalculation } from "../../../cashboxOperations.js";
import type { PaymentMethodTab, PaymentModalProps } from "../paymentModalTypes.js";
import type { ReceiptItem } from "../../../../billing/ReceiptPreview.js";
import type { InterruptedPaymentState } from "./paymentRequestTypes.js";

export * from "./paymentRequestTypes.js";

export interface UsePaymentExecutionParams {
	readonly patientId: string;
	readonly patientName: string;
	readonly patientPhone?: string | undefined;
	readonly visitId?: string | undefined;
	readonly documentId?: string | undefined;
	readonly invoiceId?: string | undefined;
	readonly clinicLegalName: string;
	readonly effectiveCashier: string;
	readonly totalDueRub: number;
	readonly rawTotalDueRub: number;
	readonly isWarranty100: boolean;
	readonly discountCalc: PaymentDiscountCalculation;
	readonly discountReason: string;
	readonly discountRub: number;
	readonly effectiveDiscountPercent: number;
	readonly activeMethod: PaymentMethodTab;
	readonly setActiveMethod: (m: PaymentMethodTab) => void;
	readonly selectedCashBoxType: CashBoxType;
	readonly selectedReceiptAlias: CashReceiptTypeAlias;
	readonly payerType: PayerType;
	readonly buyerInn: string;
	readonly setBuyerInnError: (err: string | null) => void;
	readonly receivedCashRub: number;
	readonly cashChange: { changeRub: number };
	readonly splitCardRub: number;
	readonly setSplitCardRub: (v: number) => void;
	readonly splitCashRub: number;
	readonly setSplitCashRub: (v: number) => void;
	readonly splitDepositRub: number;
	readonly setSplitDepositRub: (v: number) => void;
	readonly splitSbpRub: number;
	readonly setSplitSbpRub: (v: number) => void;
	readonly splitCertificateRub: number;
	readonly splitBonusRub: number;
	readonly splitDmsRub?: number | undefined;
	readonly setSplitDmsRub?: ((v: number) => void) | undefined;
	readonly guaranteeLetterId?: string | undefined;
	readonly isBalanced: boolean;
	readonly patientDepositRub: number;
	readonly patientFamilyBalanceRub: number;
	readonly effectiveSbpOrderId: string;
	readonly effectiveSbpKopecks: number;
	readonly sbpStatus: "pending" | "paid";
	readonly setSbpStatus: (s: "pending" | "paid") => void;
	readonly isCheckingSbp: boolean;
	readonly setIsCheckingSbp: (v: boolean) => void;
	readonly setSbpCheckMessage: (msg: string | null) => void;
	readonly sbpQrData?: any | null | undefined;
	readonly items?: readonly ReceiptItem[] | undefined;
	readonly toothNumber?: number | string | undefined;
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onSuccess: NonNullable<PaymentModalProps["onSuccess"]>;
}

export interface PaymentExecutionHookResult {
	readonly isSubmittingCash: boolean;
	readonly isSubmittingSplit: boolean;
	readonly isSubmittingDeposit: boolean;
	readonly isMoreMenuOpen: boolean;
	readonly setIsMoreMenuOpen: (v: boolean) => void;
	readonly interruptedPaymentState: InterruptedPaymentState;
	readonly setInterruptedPaymentState: (s: InterruptedPaymentState) => void;
	readonly isSubmittingManualCard: boolean;
	readonly fiscalizationRetryPending: boolean;
	readonly setFiscalizationRetryPending: (v: boolean) => void;
	readonly isRetryingFiscalization: boolean;
	readonly handleCashSubmit: () => Promise<void>;
	readonly handleSplitSubmit: () => Promise<void>;
	readonly handleDepositSubmit: (source: "deposit" | "family") => Promise<void>;
	readonly handleDepositOrPartialCombo: (source: "deposit" | "family") => void;
	readonly handleManualCardTerminalConfirm: () => Promise<void>;
	readonly handleRetryFiscalization: () => Promise<void>;
	readonly handleSbpExecutePayment: () => Promise<void>;
	readonly handleCheckSbpStatus: (manual?: boolean) => void;
	readonly handleConfirmSbpManual: () => void;
	readonly handleSberSuccess: (posRes: SberPosTransactionResponse) => void;
}

export interface PaymentExecutorContext {
	readonly handleBroadcastSuccess: NonNullable<UsePaymentExecutionParams["onSuccess"]>;
	readonly setInterruptedPaymentState: (state: InterruptedPaymentState) => void;
}
