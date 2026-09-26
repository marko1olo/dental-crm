/**
 * apps/web/src/components/finance/modal/payment/usePaymentModalLogic.ts
 *
 * Master hook coordinating discounts, split tenders, SBP QR, and execution handlers.
 */

import type { PaymentModalProps } from "./paymentModalTypes.js";
import { usePaymentDiscountsAndPresets } from "./usePaymentDiscountsAndPresets.js";
import { usePaymentTendersAndSbp } from "./usePaymentTendersAndSbp.js";
import { usePaymentExecution } from "./usePaymentExecution.js";

export function usePaymentModalLogic(props: PaymentModalProps) {
	const {
		isOpen,
		patientId = "pat-walkin",
		patientName = "Пациент",
		patientPhone = "",
		amountKopecks,
		amountRub: propAmountRub,
		invoiceId,
		visitId,
		documentId,
		defaultMethod = "card_terminal",
		patientDepositRub = 0,
		patientFamilyBalanceRub = 0,
		patientDebtRub = 0,
		cashierName,
		doctorName,
		clinicLegalName = "ООО «ДЕНТЕ»",
		initialDiscountPercent = 0,
		initialCustomDiscountRub = 0,
		initialDiscountReason = "",
		initialWarranty100 = false,
		initialSplit5050 = false,
		onPrintInvoice,
		onPrintAct,
		onClose,
		onSuccess = () => {},
	} = props;

	const effectiveCashier = (cashierName || "").trim() || (doctorName || "").trim() || "Врач-стоматолог";

	const rawTotalDueRub =
		propAmountRub !== undefined
			? propAmountRub
			: amountKopecks !== undefined
				? Number((amountKopecks / 100).toFixed(2))
				: 0;

	// 1. Discounts & Presets Hook
	const discountsHook = usePaymentDiscountsAndPresets({
		rawTotalDueRub,
		initialWarranty100,
		initialDiscountPercent,
		initialCustomDiscountRub,
		initialDiscountReason,
		invoiceId,
		clinicLegalName,
		patientName,
		effectiveCashier,
		onPrintInvoice,
		onPrintAct,
		onDiscountChanged: (newTotal) => {
			tendersHook.syncSplitAndCashToTotal(newTotal);
		},
	});

	// 2. Tenders, Split & SBP Hook
	const tendersHook = usePaymentTendersAndSbp({
		isOpen,
		defaultMethod,
		initialSplit5050,
		totalDueRub: discountsHook.totalDueRub,
		rawTotalDueRub,
		isWarranty100: discountsHook.isWarranty100,
		setIsWarranty100: discountsHook.setIsWarranty100,
		setDiscountPercent: discountsHook.setDiscountPercent,
		setDiscountReason: discountsHook.setDiscountReason,
		patientDepositRub,
		patientFamilyBalanceRub,
		invoiceId,
		documentId,
		visitId,
		patientName,
		clinicLegalName,
	});

	// 3. Execution Hook
	const execHook = usePaymentExecution({
		patientId,
		patientName,
		patientPhone,
		visitId,
		documentId,
		invoiceId,
		clinicLegalName,
		effectiveCashier,
		totalDueRub: discountsHook.totalDueRub,
		rawTotalDueRub,
		isWarranty100: discountsHook.isWarranty100,
		discountCalc: discountsHook.discountCalc,
		discountReason: discountsHook.discountReason,
		discountRub: discountsHook.discountRub,
		effectiveDiscountPercent: discountsHook.effectiveDiscountPercent,
		activeMethod: tendersHook.activeMethod,
		setActiveMethod: tendersHook.setActiveMethod,
		selectedCashBoxType: tendersHook.selectedCashBoxType,
		selectedReceiptAlias: tendersHook.selectedReceiptAlias,
		payerType: tendersHook.payerType,
		buyerInn: tendersHook.buyerInn,
		setBuyerInnError: tendersHook.setBuyerInnError,
		receivedCashRub: tendersHook.receivedCashRub,
		cashChange: tendersHook.cashChange,
		splitCardRub: tendersHook.splitCardRub,
		setSplitCardRub: tendersHook.setSplitCardRub,
		splitCashRub: tendersHook.splitCashRub,
		setSplitCashRub: tendersHook.setSplitCashRub,
		splitDepositRub: tendersHook.splitDepositRub,
		setSplitDepositRub: tendersHook.setSplitDepositRub,
		splitSbpRub: tendersHook.splitSbpRub,
		setSplitSbpRub: tendersHook.setSplitSbpRub,
		splitCertificateRub: tendersHook.splitCertificateRub,
		splitBonusRub: tendersHook.splitBonusRub,
		isBalanced: tendersHook.isBalanced,
		patientDepositRub,
		patientFamilyBalanceRub,
		effectiveSbpOrderId: tendersHook.effectiveSbpOrderId,
		effectiveSbpKopecks: tendersHook.effectiveSbpKopecks,
		sbpStatus: tendersHook.sbpStatus,
		setSbpStatus: tendersHook.setSbpStatus,
		isCheckingSbp: tendersHook.isCheckingSbp,
		setIsCheckingSbp: tendersHook.setIsCheckingSbp,
		setSbpCheckMessage: tendersHook.setSbpCheckMessage,
		sbpQrData: tendersHook.sbpQrData,
		isOpen,
		onClose,
		onSuccess,
	});

	return {
		rawTotalDueRub,
		effectiveCashier,
		discountsHook,
		tendersHook,
		execHook,
	};
}
