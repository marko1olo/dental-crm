import type { CheckoutTenderMethod } from "./CashRegisterTendersSection";
import type { ReceiptDeliveryMethod } from "./CashRegisterFiscalSection";

export type { CheckoutTenderMethod, ReceiptDeliveryMethod };

export interface CashRegisterCheckoutModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly totalDueRub?: number | undefined;
	readonly amountRub?: number | undefined;
	readonly totalBillRub?: number | undefined;
	readonly totalBillKop?: number | undefined;
	readonly amountKopecks?: number | undefined;
	readonly initialAmountKopecks?: number | undefined;
	readonly invoiceDraftItems?: readonly any[] | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientEmail?: string | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly invoiceId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly orderId?: string | undefined;
	readonly cashierFullName?: string | undefined;
	readonly cashierName?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly attendingDoctorName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly defaultMethod?: CheckoutTenderMethod | string | undefined;
	readonly initialPaymentMethod?: string | undefined;
	readonly initialDiscountPercent?: number | undefined;
	readonly initialWarranty100?: boolean | undefined;
	readonly initialCustomDiscountRub?: number | undefined;
	readonly initialDiscountReason?: string | undefined;
	readonly containerTestId?: string | undefined;
	readonly title?: string | undefined;
	readonly onOpenSplitPayment?: (() => void) | undefined;
	readonly onOpenDepositTopup?: (() => void) | undefined;
	readonly onSuccess?: ((payload: any) => void) | undefined;
	readonly onPaymentComplete?: ((payload: any) => void) | undefined;
}
