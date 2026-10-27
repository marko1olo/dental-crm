import { useEffect, useMemo } from "react";
import {
	buildFastCheckoutSbpQrData, calculateBaseStageAmountKop, calculateSplitRemainingKop,
	computeCashChange, computeCheckoutValidation, computeStageAdvanceCalc,
	computeStageDiscountCalc, computeTargetBillAmounts, splitStateToCheckoutPayments,
} from "./fastCheckoutCalculations";
import { assignFullAmountToMethod, resetAllSplitAmounts } from "./fastCheckoutSplitAssignments";
import { useFastCheckoutExecutionHandlers } from "./useFastCheckoutExecutionHandlers";
import { useFastCheckoutRemainderHandlers } from "./useFastCheckoutRemainderHandlers";
import { useFastCheckoutTenderState } from "./useFastCheckoutTenderState";
import type { CheckoutSplitItem, UseFastCheckoutLogicProps } from "./types";

export { assignFullAmountToMethod, resetAllSplitAmounts };

export function useFastCheckoutStateMachine(props: UseFastCheckoutLogicProps) {
	const t = useFastCheckoutTenderState(props);

	const baseStageAmountKop = useMemo(() => {
		const configuredKop = calculateBaseStageAmountKop(t.selectedStageId, t.initialTotalBillKop, t.stages);
		if (configuredKop > 0) return configuredKop;
		const splitSumKop = Math.round((t.cardAmountRub + t.cashAmountRub + t.sbpAmountRub + t.depositAmountRub + t.loyaltyAmountRub + t.dmsAmountRub) * 100);
		return splitSumKop > 0 ? splitSumKop : 0;
	}, [t.selectedStageId, t.initialTotalBillKop, t.stages, t.cardAmountRub, t.cashAmountRub, t.sbpAmountRub, t.depositAmountRub, t.loyaltyAmountRub, t.dmsAmountRub]);

	const discountCalc = useMemo(() => computeStageDiscountCalc(baseStageAmountKop, t.discountPreset, t.customDiscountPercent), [baseStageAmountKop, t.discountPreset, t.customDiscountPercent]);
	const stageCalc = useMemo(() => computeStageAdvanceCalc(discountCalc.netKop, t.stagePaymentMode, t.advanceAlreadyPaidRub), [discountCalc.netKop, t.stagePaymentMode, t.advanceAlreadyPaidRub]);
	const { effectiveBillKop, targetBillKop, targetBillRub, effectiveTotalRub } = computeTargetBillAmounts(discountCalc.netKop, t.stagePaymentMode, stageCalc);

	const effectiveSbpAmountRub = t.sbpAmountRub > 0 ? t.sbpAmountRub : targetBillRub;
	const effectiveSbpKopecks = Math.round(effectiveSbpAmountRub * 100);
	const effectiveSbpOrderId = t.orderId?.trim() || `ORD-${Math.abs(t.initialTotalBillKop || 1000)}`;
	const sbpQrData = useMemo(() => buildFastCheckoutSbpQrData(effectiveSbpAmountRub, effectiveSbpKopecks, effectiveSbpOrderId), [effectiveSbpAmountRub, effectiveSbpKopecks, effectiveSbpOrderId]);

	useEffect(() => {
		if (!props.isOpen) return;
		if (t.stagePaymentMode === "advance_offset_tag1215") {
			resetAllSplitAmounts(t.splitSetters);
			t.setDepositAmountRub(stageCalc.advanceOffsetTag1215Kop / 100);
			assignFullAmountToMethod(t.activeMethod, stageCalc.requiredAmountKop / 100, t.splitSetters, false);
		} else if (t.isSimpleCashierMode) {
			resetAllSplitAmounts(t.splitSetters);
			assignFullAmountToMethod(t.activeMethod, targetBillRub, t.splitSetters, true);
		} else {
			const total = t.cardAmountRub + t.cashAmountRub + t.sbpAmountRub + t.depositAmountRub + t.loyaltyAmountRub + t.dmsAmountRub;
			if (total === 0 && targetBillRub > 0) assignFullAmountToMethod(t.activeMethod, targetBillRub, t.splitSetters, true);
		}
	}, [props.isOpen, targetBillKop, targetBillRub, t.isSimpleCashierMode, t.stagePaymentMode, stageCalc.advanceOffsetTag1215Kop, stageCalc.requiredAmountKop]);

	const payments = useMemo<readonly CheckoutSplitItem[]>(() => splitStateToCheckoutPayments({
		cardRub: t.cardAmountRub, cashRub: t.cashAmountRub, sbpRub: t.sbpAmountRub, depositRub: t.depositAmountRub, loyaltyRub: t.loyaltyAmountRub, dmsRub: t.dmsAmountRub,
	}), [t.cardAmountRub, t.cashAmountRub, t.sbpAmountRub, t.depositAmountRub, t.loyaltyAmountRub, t.dmsAmountRub]);

	const remainingKop = useMemo(() => calculateSplitRemainingKop(targetBillKop, payments), [targetBillKop, payments]);
	const remainingRub = useMemo(() => +(remainingKop / 100).toFixed(2), [remainingKop]);
	const cashChange = useMemo(() => computeCashChange(t.cashTenderedRub, t.cashAmountRub), [t.cashTenderedRub, t.cashAmountRub]);

	const validation = useMemo(() => computeCheckoutValidation({
		orderId: t.orderId, targetBillKop, payments, cashTenderedRub: t.cashTenderedRub, patientPhone: props.patientPhone || "",
		patientEmail: props.patientEmail || "", clientType: t.clientType, buyerInn: t.buyerInn, buyerName: t.buyerName, isElectronicReceiptOnly: t.isElectronicReceiptOnly,
	}), [t.orderId, targetBillKop, payments, t.cashTenderedRub, props.patientPhone, props.patientEmail, t.clientType, t.buyerInn, t.buyerName, t.isElectronicReceiptOnly]);

	const remainderHandlers = useFastCheckoutRemainderHandlers({
		remainingKop, targetBillKop, targetBillRub, patientDepositRub: t.patientDepositRub, patientFamilyBalanceRub: t.patientFamilyBalanceRub,
		depositAmountRub: t.depositAmountRub, cashAmountRub: t.cashAmountRub, cashTenderedRub: t.cashTenderedRub, availableLoyaltyPointsRub: t.availableLoyaltyPointsRub,
		activeMethod: t.activeMethod, splitSetters: t.splitSetters, stages: t.stages, setSelectedStageId: t.setSelectedStageId, setCashTenderedRub: t.setCashTenderedRub,
		setStagePaymentMode: t.setStagePaymentMode, setActiveMethod: t.setActiveMethod, setCardAmountRub: t.setCardAmountRub, setCashAmountRub: t.setCashAmountRub,
		setSbpAmountRub: t.setSbpAmountRub, setDepositAmountRub: t.setDepositAmountRub, setLoyaltyAmountRub: t.setLoyaltyAmountRub, setDmsAmountRub: t.setDmsAmountRub,
		setDiscountPreset: t.setDiscountPreset,
	});

	const execHandlers = useFastCheckoutExecutionHandlers({
		targetBillKop, targetBillRub, effectiveTotalRub, cardAmountRub: t.cardAmountRub, cashAmountRub: t.cashAmountRub, sbpAmountRub: t.sbpAmountRub,
		depositAmountRub: t.depositAmountRub, loyaltyAmountRub: t.loyaltyAmountRub, dmsAmountRub: t.dmsAmountRub, cashTenderedRub: t.cashTenderedRub,
		remainingRub, activeMethod: t.activeMethod, validation, clientType: t.clientType, buyerInn: t.buyerInn, buyerName: t.buyerName,
		isElectronicReceiptOnly: t.isElectronicReceiptOnly, patientId: props.patientId, visitId: props.visitId, patientPhone: props.patientPhone || "",
		patientEmail: props.patientEmail || "", orderId: t.orderId, effectiveCashierFullName: t.effectiveCashierFullName, stageCalc,
		onPaymentComplete: props.onPaymentComplete, onSuccess: props.onSuccess, onClose: props.onClose, isPrinting: t.isPrinting,
		setIsPrinting: t.setIsPrinting, setIsOfflineBuffered: t.setIsOfflineBuffered, setInterruptedPaymentState: t.setInterruptedPaymentState,
		setCardAmountRub: t.setCardAmountRub, setCashAmountRub: t.setCashAmountRub, setCashTenderedRub: t.setCashTenderedRub, setSbpAmountRub: t.setSbpAmountRub,
		setDepositAmountRub: t.setDepositAmountRub, setLoyaltyAmountRub: t.setLoyaltyAmountRub, setDmsAmountRub: t.setDmsAmountRub, isCheckingSbp: t.isCheckingSbp,
		sbpStatus: t.sbpStatus, effectiveSbpKopecks, effectiveSbpOrderId, sbpQrData, setIsCheckingSbp: t.setIsCheckingSbp, setSbpStatus: t.setSbpStatus,
		setSbpCheckMessage: t.setSbpCheckMessage, setIsFlushingQueue: t.setIsFlushingQueue, setIsSubmittingManualCard: t.setIsSubmittingManualCard,
	});

	return {
		...t, baseStageAmountKop, discountCalc, stageCalc, effectiveBillKop, targetBillKop, targetBillRub,
		effectiveSbpAmountRub, sbpQrData, remainingKop, remainingRub, cashChange, validation,
		...remainderHandlers, ...execHandlers,
	};
}

export const useFastCheckoutLogic = useFastCheckoutStateMachine;
