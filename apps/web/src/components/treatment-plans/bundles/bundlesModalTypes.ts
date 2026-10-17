import type { InvoiceServiceItem } from "../../finance/invoiceEngine";
import type { ClinicalBundleDefinition } from "../treatmentPlanBundlesEngine";
import type { TreatmentPlanItem } from "../types";

export interface ClinicalServiceBundlesModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onApplyToPlan?: (
		items: TreatmentPlanItem[],
		bundle: ClinicalBundleDefinition,
		toothNumber?: number,
	) => void;
	readonly onApplyToInvoice?: (
		items: InvoiceServiceItem[],
		bundle: ClinicalBundleDefinition,
		toothNumber?: number,
	) => void;
	readonly initialToothNumber?: number | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly targetMode?: "plan" | "invoice" | "both" | undefined;
}

export const COMMON_FDI_TEETH = [11, 16, 21, 26, 36, 46, 14, 24, 34, 44, 38, 48];
