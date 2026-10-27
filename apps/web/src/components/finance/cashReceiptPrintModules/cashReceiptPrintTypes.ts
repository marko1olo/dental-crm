import type { BillingInvoice } from "../../billing/invoiceTypes.js";
import type { FiscalReceipt54FzResult } from "../fiscalReceiptEngine.js";

export interface CashReceiptPrintModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly receipt?: FiscalReceipt54FzResult | undefined;
	readonly invoice?: BillingInvoice | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly cashierFullName?: string | undefined;
	readonly attendingDoctorName?: string | undefined;
	readonly defaultFormat?: "80mm" | "a4" | undefined;
}
