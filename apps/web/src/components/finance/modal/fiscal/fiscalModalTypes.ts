import type { TreatmentPlanItem } from "../../../treatment-plans/types";
import type { FiscalItemDraft } from "../../fiscal/fiscal54fzEngine";

export type FlexibleFiscalItem =
	| FiscalItemDraft
	| TreatmentPlanItem
	| {
			id: string;
			name: string;
			priceRub: number;
			quantity?: number | undefined;
			unitPriceRub?: number | undefined;
			code804n?: string | null | undefined;
			toothNumber?: number | undefined;
			toothFdiNumber?: number | null | undefined;
			discountRub?: number | undefined;
			category?: string | undefined;
			stageKind?: string | undefined;
			phase?: number | undefined;
			vatRate?: any;
			paymentSubject?: any;
			barcode?: string | undefined;
			sku?: string | undefined;
			isRetail?: boolean | undefined;
	  };

export type FiscalModalTab =
	| "payment"
	| "act"
	| "certificate"
	| "oneC"
	| "refund"
	| "correction"
	| "preview";

export interface FiscalReceipt54FzModalProps {
	readonly isOpen: boolean;
	readonly items?: readonly (TreatmentPlanItem | FlexibleFiscalItem)[] | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly familyPayerName?: string | undefined;
	readonly cashierFullName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly initialTab?: FiscalModalTab | undefined;
	readonly initialOperationType?: "income" | "income_return" | undefined;
	readonly clinicLicense?: string | undefined;
	readonly onClose: () => void;
	readonly onReceiptFiscalized?: ((receiptNumber: string) => void) | undefined;
	readonly totalDueRub?: number | undefined;
	readonly amountRub?: number | undefined;
	readonly totalBillRub?: number | undefined;
	readonly totalBillKop?: number | undefined;
	readonly patientDebtRub?: number | undefined;
	readonly defaultMethod?: any;
}

export type FiscalReceiptModalProps = FiscalReceipt54FzModalProps;
