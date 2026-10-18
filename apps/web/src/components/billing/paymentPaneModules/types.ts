/**
 * apps/web/src/components/billing/paymentPaneModules/types.ts
 *
 * Types for CashRegisterPaymentPane modules.
 * Governed by Mandate 8b (strictly <= 120 lines).
 */

import type { ExtendedTenderType } from "@dental/shared";
import type { ShiftReceiptEntry } from "../CashRegisterDrawer.js";

export type CashierPaymentMethod = Extract<
	ExtendedTenderType,
	"sbp" | "card" | "cash" | "split" | "deposit"
>;

export interface CashRegisterPaymentPaneProps {
	readonly defaultAmountRub?: number | undefined;
	readonly cashierFullName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly onPaymentCompleted?: ((receipt: ShiftReceiptEntry) => void) | undefined;
	readonly onOpenFullSplitModal?: (() => void) | undefined;
	readonly activeInvoice?: any | undefined;
	readonly invoices?: readonly any[] | undefined;
	readonly onSelectInvoice?: ((inv: any) => void) | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly initialMethod?: CashierPaymentMethod | undefined;
}
