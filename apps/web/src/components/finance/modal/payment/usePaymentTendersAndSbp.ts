/**
 * apps/web/src/components/finance/modal/payment/usePaymentTendersAndSbp.ts
 *
 * Multi-tender split allocation, SBP QR generator, cash change, and quick presets.
 * Mandate 8b: <= 120 lines.
 */

import type { PaymentMethodTab } from "./paymentModalTypes.js";
import { usePaymentTenderState } from "./tenderModules/paymentTenderState.js";
import { usePaymentSbpQrState } from "./tenderModules/paymentSbpQrState.js";
import { usePaymentQuickPresets } from "./tenderModules/paymentQuickPresets.js";

export interface UsePaymentTendersAndSbpParams {
	readonly isOpen: boolean;
	readonly defaultMethod?: PaymentMethodTab | undefined;
	readonly initialSplit5050?: boolean | undefined;
	readonly totalDueRub: number;
	readonly rawTotalDueRub: number;
	readonly isWarranty100: boolean;
	readonly setIsWarranty100: (val: boolean) => void;
	readonly setDiscountPercent: (val: number) => void;
	readonly setDiscountReason: (val: string) => void;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly availableDmsCoverageRub?: number | undefined;
	readonly initialSplitDmsRub?: number | undefined;
	readonly invoiceId?: string | undefined;
	readonly documentId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly patientName: string;
	readonly clinicLegalName: string;
}

export function usePaymentTendersAndSbp(params: UsePaymentTendersAndSbpParams) {
	const tenderState = usePaymentTenderState({
		isOpen: params.isOpen,
		defaultMethod: params.defaultMethod,
		initialSplit5050: params.initialSplit5050,
		totalDueRub: params.totalDueRub,
		initialSplitDmsRub: params.initialSplitDmsRub,
	});

	const sbpState = usePaymentSbpQrState({
		activeMethod: tenderState.activeMethod,
		splitSbpRub: tenderState.splitSbpRub,
		totalDueRub: params.totalDueRub,
		invoiceId: params.invoiceId,
		documentId: params.documentId,
		visitId: params.visitId,
		patientName: params.patientName,
		clinicLegalName: params.clinicLegalName,
	});

	const presets = usePaymentQuickPresets({
		totalDueRub: params.totalDueRub,
		rawTotalDueRub: params.rawTotalDueRub,
		isWarranty100: params.isWarranty100,
		setIsWarranty100: params.setIsWarranty100,
		setDiscountPercent: params.setDiscountPercent,
		setDiscountReason: params.setDiscountReason,
		patientDepositRub: params.patientDepositRub ?? 0,
		patientFamilyBalanceRub: params.patientFamilyBalanceRub ?? 0,
		availableDmsCoverageRub: params.availableDmsCoverageRub,
		splitCardRub: tenderState.splitCardRub,
		splitCashRub: tenderState.splitCashRub,
		splitDepositRub: tenderState.splitDepositRub,
		splitSbpRub: tenderState.splitSbpRub,
		splitCertificateRub: tenderState.splitCertificateRub,
		splitBonusRub: tenderState.splitBonusRub,
		splitDmsRub: tenderState.splitDmsRub,
		resetSplitTenders: tenderState.resetSplitTenders,
		setActiveMethod: tenderState.setActiveMethod,
		setReceivedCashRub: tenderState.setReceivedCashRub,
	});

	return {
		...tenderState,
		...sbpState,
		...presets,
	};
}
