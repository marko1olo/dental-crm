import type { TreatmentPlanItem } from "../../../treatment-plans/types";
import type { SplitPaymentInput } from "../../fiscalReceiptEngine";
import type { FiscalModalTab } from "./fiscalModalTypes";
import { useRefundItemsSelection } from "./refund/useRefundItemsSelection";
import { useFiscalCorrectionState } from "./refund/useFiscalCorrectionState";
import { useCompletedWorksActAndSlipState } from "./refund/useCompletedWorksActAndSlipState";
import { useFiscalActiveReceipt } from "./refund/useFiscalActiveReceipt";
import { useTaxDeductionCertState } from "./refund/useTaxDeductionCertState";
import { useOneCEnterpriseExportState } from "./refund/useOneCEnterpriseExportState";

export interface UseFiscalRefundAndAuxTabsParams {
	readonly items: readonly TreatmentPlanItem[];
	readonly activeItems: readonly TreatmentPlanItem[];
	readonly activeTab: FiscalModalTab;
	readonly totalSumRub: number;
	readonly splitInput: SplitPaymentInput;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly cashierFullName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly customerContact: string;
	readonly payerType: "individual" | "legal_entity";
	readonly buyerLegalName: string;
	readonly buyerInn: string;
}

export function useFiscalRefundAndAuxTabs({
	items,
	activeItems,
	activeTab,
	totalSumRub,
	splitInput,
	patientId = "00000000-0000-0000-0000-000000000001",
	patientName = "Пациент",
	patientPhone = "+7 (___) ___-__-__",
	patientDepositRub = 0,
	cashierFullName = "Кассир-администратор",
	clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	customerContact,
	payerType,
	buyerLegalName,
	buyerInn,
}: UseFiscalRefundAndAuxTabsParams) {
	const refund = useRefundItemsSelection({ items, activeItems, patientDepositRub });
	const correction = useFiscalCorrectionState();
	const actAndSlip = useCompletedWorksActAndSlipState({
		activeItems,
		totalSumRub,
		patientId,
		patientName,
		patientPhone,
		cashierFullName,
		clinicName,
	});

	const fiscalReceipt = useFiscalActiveReceipt({
		activeTab,
		activeItems,
		refundActiveItems: refund.refundActiveItems,
		splitInput,
		patientId,
		patientName,
		patientPhone,
		cashierFullName,
		clinicName,
		customerContact,
		payerType,
		buyerLegalName,
		buyerInn,
		originalReceiptNumberForRefund: refund.originalReceiptNumberForRefund,
		refundReason: refund.refundReason,
		correctionType: correction.correctionType,
		correctionDocDate: correction.correctionDocDate,
		correctionDocNumber: correction.correctionDocNumber,
		correctionReason: correction.correctionReason,
		taxYear: new Date().getFullYear(),
	});

	const taxCert = useTaxDeductionCertState({
		activeItems,
		fiscalReceipt,
		patientName,
		clinicName,
		cashierFullName,
	});

	const oneC = useOneCEnterpriseExportState({
		activeItems,
		totalSumRub,
		clinicName,
		patientId,
		patientName,
		customerContact,
		patientPhone,
		cashierFullName,
		actNumber: actAndSlip.actNumber,
		contractNumber: actAndSlip.contractNumber,
	});

	return {
		...actAndSlip,
		...refund,
		...correction,
		...taxCert,
		...oneC,
		fiscalReceipt,
	};
}
