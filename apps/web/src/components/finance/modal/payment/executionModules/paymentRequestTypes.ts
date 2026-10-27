import type { CashBoxType, CashReceiptTypeAlias } from "@dental/shared";

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
