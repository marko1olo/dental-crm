/**
 * apps/web/src/components/cashbox/checkout/types.ts
 *
 * Strict TypeScript types for DENTE Canonical Cashbox Checkout SSOT.
 * Governed by:
 * - exactOptionalPropertyTypes: true compatibility (explicit undefined & null).
 * - Mandate 8b: Focused interface module < 100 lines.
 * - Mandate 8e: Doctor & Cashier Autonomy.
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (No forced citizen INN).
 * - Integer Kopeck Math: Strict BigInt amountKopecks support.
 */

import type {
	CashboxTenderType,
	ClientPayerType,
	ReceiptPrintFormat,
} from "../cashboxCatalogData.js";

export type CheckoutTenderMethod = CashboxTenderType;
export type CheckoutDeliveryMethod = "print" | "sms" | "email";

export interface SplitAllocationRubles {
	cardRub: number;
	cashRub: number;
	sbpRub: number;
	depositRub: number;
}

export interface SplitAllocationKopecks {
	cardKopecks: bigint;
	cashKopecks: bigint;
	sbpKopecks: bigint;
	depositKopecks: bigint;
}

export interface CashRegisterCheckoutModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly totalDueRub?: number | undefined;
	readonly amountRub?: number | undefined;
	readonly totalBillRub?: number | undefined;
	readonly totalBillKop?: number | undefined;
	readonly amountKopecks?: bigint | number | undefined;
	readonly initialAmountKopecks?: bigint | number | undefined;
	readonly patientId?: string | null | undefined;
	readonly patientName?: string | null | undefined;
	readonly patientPhone?: string | null | undefined;
	readonly patientEmail?: string | null | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly invoiceId?: string | null | undefined;
	readonly visitId?: string | null | undefined;
	readonly orderId?: string | null | undefined;
	readonly cashierFullName?: string | null | undefined;
	readonly cashierName?: string | null | undefined;
	readonly doctorFullName?: string | null | undefined;
	readonly doctorName?: string | null | undefined;
	readonly attendingDoctorName?: string | null | undefined;
	readonly clinicLegalName?: string | null | undefined;
	readonly defaultMethod?: CashboxTenderType | string | undefined;
	readonly initialPaymentMethod?: CashboxTenderType | string | undefined;
	readonly initialDiscountPercent?: number | undefined;
	readonly initialWarranty100?: boolean | undefined;
	readonly containerTestId?: string | undefined;
	readonly title?: string | undefined;
	readonly onOpenSplitPayment?: (() => void) | undefined;
	readonly submitButtonTestId?: string | undefined;
	readonly onSuccess?: ((data: unknown) => void) | undefined;
	readonly onPaymentComplete?: ((data: unknown) => void) | undefined;
}

export type CashCheckoutStudioModalProps = CashRegisterCheckoutModalProps;
