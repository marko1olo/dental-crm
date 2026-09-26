/**
 * apps/web/src/components/finance/modal/payment/paymentModalTypes.ts
 *
 * Types for PaymentModal and its decomposed subcomponents.
 */

import {
	calculatePaymentDiscount,
	type PaymentDiscountCalculation,
} from "../../cashboxOperations.js";

export type PaymentMethodTab =
	| "card_terminal"
	| "sberpay_qr"
	| "sbp_qr"
	| "biometry"
	| "cash"
	| "family_deposit"
	| "split";

export interface PaymentModalProps {
	readonly isOpen: boolean;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly amountKopecks?: number | undefined;
	readonly amountRub?: number | undefined;
	readonly invoiceId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly documentId?: string | undefined;
	readonly defaultMethod?: PaymentMethodTab | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly patientDebtRub?: number | undefined;
	readonly cashierName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly initialDiscountPercent?: number | undefined;
	readonly initialCustomDiscountRub?: number | undefined;
	readonly initialDiscountReason?: string | undefined;
	readonly initialWarranty100?: boolean | undefined;
	readonly initialSplit5050?: boolean | undefined;
	readonly onPrintInvoice?: (() => void) | undefined;
	readonly onPrintAct?: (() => void) | undefined;
	readonly onClose: () => void;
	readonly onSuccess?: ((paymentData: {
		method: string;
		amountKopecks: number;
		rrn?: string | undefined;
		authCode?: string | undefined;
		discountRub?: number | undefined;
		discountPercent?: number | undefined;
		rawTotalRub?: number | undefined;
		discountReason?: string | undefined;
		[key: string]: unknown;
	}) => void) | undefined;
}

export {
	calculatePaymentDiscount,
	type PaymentDiscountCalculation,
};
