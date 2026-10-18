/**
 * apps/web/src/components/billing/receiptPreview/receiptPreviewTypes.ts
 *
 * Types for ReceiptPreview and printable 54-FZ sales slip.
 * Strictly <= 120 lines per Mandate 8b.
 */

export interface ReceiptItem {
	readonly id?: string | undefined;
	readonly name: string;
	readonly code804n?: string | undefined;
	readonly toothNumber?: number | string | undefined;
	readonly quantity: number;
	readonly priceRub: number;
	readonly discountRub?: number | undefined;
	readonly amountRub: number;
	readonly vatRate?: "vat_none" | "vat_20" | "vat_10" | undefined;
	readonly isMarkedItem?: boolean | undefined;
	readonly taxDeductionCategory?: "1" | "2" | undefined;
}

export interface ReceiptPaymentDetails {
	readonly cardRub?: number | undefined;
	readonly sbpRub?: number | undefined;
	readonly cashRub?: number | undefined;
	readonly receivedCashRub?: number | undefined;
	readonly changeRub?: number | undefined;
	readonly depositRub?: number | undefined;
	readonly familyWalletRub?: number | undefined;
	readonly certificateRub?: number | undefined;
	readonly insuranceRub?: number | undefined;
}

export interface ReceiptPreviewProps {
	readonly receiptNumber?: string | undefined;
	readonly shiftNumber?: number | undefined;
	readonly receiptDateRu?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicKpp?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly taxationSystemName?: string | undefined;
	readonly cashierFullName?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly items?: readonly ReceiptItem[] | undefined;
	readonly toothNumber?: number | string | undefined;
	readonly totalDueRub: number;
	readonly payments?: ReceiptPaymentDetails | undefined;
	readonly isWarranty100?: boolean | undefined;
	readonly isPaid?: boolean | undefined;
	readonly fnSerial?: string | undefined;
	readonly fiscalDocumentNumber?: string | undefined;
	readonly fiscalSign?: string | undefined;
	readonly kktRegNumber?: string | undefined;
	readonly ofdName?: string | undefined;
	readonly ofdUrl?: string | undefined;
	readonly fnsUrl?: string | undefined;
	readonly defaultFormat?: "80mm" | "a4" | undefined;
	readonly className?: string | undefined;
	readonly showActionsBar?: boolean | undefined;
}
