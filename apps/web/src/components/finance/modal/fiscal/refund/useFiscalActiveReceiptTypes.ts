import type { TreatmentPlanItem } from "../../../../treatment-plans/types";
import type { SplitPaymentInput } from "../../../fiscalReceiptEngine";
import type { FiscalModalTab } from "../fiscalModalTypes";

export interface UseFiscalActiveReceiptParams {
	readonly activeTab: FiscalModalTab;
	readonly activeItems: readonly TreatmentPlanItem[];
	readonly refundActiveItems: readonly TreatmentPlanItem[];
	readonly splitInput: SplitPaymentInput;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly cashierFullName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly customerContact: string;
	readonly payerType: "individual" | "legal_entity";
	readonly buyerLegalName: string;
	readonly buyerInn: string;
	readonly originalReceiptNumberForRefund: string;
	readonly refundReason: string;
	readonly correctionType: "self_initiated" | "by_instruction";
	readonly correctionDocDate: string;
	readonly correctionDocNumber: string;
	readonly correctionReason: string;
	readonly taxYear: number;
}
