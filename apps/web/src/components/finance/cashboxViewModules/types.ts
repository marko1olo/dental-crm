/**
 * apps/web/src/components/finance/cashboxViewModules/types.ts
 * Layer 0: Contracts & DTOs for Cashbox Workspace.
 * Mandate 8b: <= 120 lines.
 */

import type {
	MultiTenderStateRub,
	PayerLegalType,
	PaymentMethodTab,
	TenderAllocationTarget,
} from "../cashboxOperations.js";

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
	readonly onPaymentComplete?: ((receipt: unknown) => void) | undefined;
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

export type { MultiTenderStateRub, PayerLegalType, PaymentMethodTab, TenderAllocationTarget };
export * from "./controllerTypes.js";