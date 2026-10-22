/**
 * apps/web/src/components/finance/modal/payment/executionModules/paymentExecutionTypes.ts
 *
 * DENTE Dental CRM — Types for payment execution, fiscal responses, and cashier retries.
 * Governed by 54-FZ (FFD 1.2), Mandate 8e (Doctor Autonomy), Mandate 8i (Kopeck Precision).
 */

import type {
	SberPosTransactionResponse,
	CashBoxType,
	CashReceiptTypeAlias,
} from "@dental/shared";
import type { PayerType, PaymentDiscountCalculation } from "../../../cashboxOperations.js";
import type { PaymentMethodTab, PaymentModalProps } from "../paymentModalTypes.js";
import type { ReceiptItem } from "../../../../billing/ReceiptPreview.js";

export interface PaymentApiInvoiceItem {
	readonly name: string;
	readonly code804n?: string | undefined;
	readonly quantity: number;
	readonly priceRub: number;
	readonly amountRub: number;
	readonly toothNumber?: number | string | undefined;
}

export interface PaymentApiRequestBody {
	readonly patientId: string;
	readonly amountRub: number;
	readonly method: string;
	readonly cashBoxType?: CashBoxType | undefined;
	readonly receiptTypeAlias?: CashReceiptTypeAlias | undefined;
	readonly cashFlowCategory?: string | undefined;
	readonly visitId: string | null;
	readonly documentId: string | null;
	readonly clientMutationId: string;
	readonly toothNumber?: number | string | undefined;
	readonly invoiceItems?: readonly PaymentApiInvoiceItem[] | undefined;
	readonly note: string;
	readonly cashAmountKopecks?: number | undefined;
	readonly electronicAmountKopecks?: number | undefined;
	readonly dmsAmountKopecks?: number | undefined;
	readonly depositAmountKopecks?: number | undefined;
	readonly cashAmountRub?: number | undefined;
	readonly electronicAmountRub?: number | undefined;
	readonly dmsAmountRub?: number | undefined;
	readonly depositAmountRub?: number | undefined;
	readonly guaranteeLetterId?: string | undefined;
}

export type InterruptedPaymentState = {
	readonly isInterrupted: boolean;
	readonly reason: string;
	readonly method: string;
	readonly amountRub: number;
	readonly lastMutationId?: string;
} | null;



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
	// biome-ignore lint/suspicious/noExplicitAny: arbitrary SBP QR payload
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

