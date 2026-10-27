import { showToast } from "../../GlobalToast";
import {
	addKopToRubAmount, computeDepositPlusCardRemainderSplitKop, computeDepositRemainderTakeKop,
	computeFamilyRemainderTakeKop, computeHalfSplitRemainderKop, computeQuickPresetSplitResult,
} from "./fastCheckoutCalculations";
import { assignFullAmountToMethod, resetAllSplitAmounts } from "./fastCheckoutSplitAssignments";
import type { CheckoutPaymentMethodType, FastCheckoutDiscountPreset, FastCheckoutSplitAmountsSetters, QuickCheckoutPresetType, StagePaymentMode, TreatmentPlanStageOption } from "./types";

interface UseFastCheckoutRemainderHandlersParams {
	readonly remainingKop: number; readonly targetBillKop: number; readonly targetBillRub: number;
	readonly patientDepositRub: number; readonly patientFamilyBalanceRub: number; readonly depositAmountRub: number;
	readonly cashAmountRub: number; readonly cashTenderedRub: number; readonly availableLoyaltyPointsRub: number;
	readonly activeMethod: CheckoutPaymentMethodType; readonly splitSetters: FastCheckoutSplitAmountsSetters;
	readonly stages: readonly TreatmentPlanStageOption[]; readonly setSelectedStageId: (id: string) => void;
	readonly setCashTenderedRub: React.Dispatch<React.SetStateAction<number>>; readonly setStagePaymentMode: (mode: StagePaymentMode) => void;
	readonly setActiveMethod: (m: CheckoutPaymentMethodType) => void; readonly setCardAmountRub: React.Dispatch<React.SetStateAction<number>>;
	readonly setCashAmountRub: React.Dispatch<React.SetStateAction<number>>; readonly setSbpAmountRub: React.Dispatch<React.SetStateAction<number>>;
	readonly setDepositAmountRub: React.Dispatch<React.SetStateAction<number>>; readonly setLoyaltyAmountRub: React.Dispatch<React.SetStateAction<number>>;
	readonly setDmsAmountRub: React.Dispatch<React.SetStateAction<number>>; readonly setDiscountPreset: (p: FastCheckoutDiscountPreset) => void;
}

export function useFastCheckoutRemainderHandlers(p: UseFastCheckoutRemainderHandlersParams) {
	const handleQuickPreset = (preset: QuickCheckoutPresetType) => {
		if (preset === "warranty_100") {
			p.setDiscountPreset("warranty_100");
			resetAllSplitAmounts(p.splitSetters);
			showToast("Применено: 100% Гарантия / переделка (0 ₽)", "info", 2000);
			return;
		}
		const { activeMethod: nextMethod, splitState, cashTenderedRub: nextTendered } =
			computeQuickPresetSplitResult(preset, p.targetBillKop, p.patientDepositRub, p.patientFamilyBalanceRub);
		p.setActiveMethod(nextMethod);
		p.setCardAmountRub(splitState.cardRub);
		p.setCashAmountRub(splitState.cashRub);
		p.setSbpAmountRub(splitState.sbpRub);
		p.setDepositAmountRub(splitState.depositRub);
		p.setLoyaltyAmountRub(splitState.loyaltyRub);
		p.setDmsAmountRub(splitState.dmsRub ?? 0);
		p.setCashTenderedRub(nextTendered);
	};

	const handleStageSelect = (stageId: string) => {
		p.setSelectedStageId(stageId);
		p.setCashTenderedRub(0);
		const stg = p.stages.find((s) => s.id === stageId);
		const stgAdvancePaid = stg?.advanceAlreadyPaidRub ?? (stg?.advanceAlreadyPaidKop ? stg.advanceAlreadyPaidKop / 100 : undefined) ?? (stg?.paidAmountRub ?? (stg?.paidAmountKop ? stg.paidAmountKop / 100 : 0));
		if (stgAdvancePaid && stgAdvancePaid > 0) p.setStagePaymentMode("advance_offset_tag1215");
	};

	const handleSingle100Percent = (method: CheckoutPaymentMethodType) => {
		p.setActiveMethod(method);
		resetAllSplitAmounts(p.splitSetters);
		assignFullAmountToMethod(method, p.targetBillRub, p.splitSetters, true);
	};

	const handleAddRemainingToCard = () => { if (p.remainingKop > 0) p.setCardAmountRub((prev) => addKopToRubAmount(prev, p.remainingKop)); };
	const handleAddRemainingToCash = () => {
		if (p.remainingKop <= 0) return;
		const nextCash = addKopToRubAmount(p.cashAmountRub, p.remainingKop);
		p.setCashAmountRub(nextCash);
		if (p.cashTenderedRub < nextCash) p.setCashTenderedRub(nextCash);
	};
	const handleAddRemainingToSbp = () => { if (p.remainingKop > 0) p.setSbpAmountRub((prev) => addKopToRubAmount(prev, p.remainingKop)); };
	const handleAddRemainingToDeposit = () => {
		const toAddKop = computeDepositRemainderTakeKop(p.remainingKop, p.patientDepositRub, p.patientFamilyBalanceRub, p.depositAmountRub);
		if (toAddKop > 0) p.setDepositAmountRub((prev) => addKopToRubAmount(prev, toAddKop));
	};
	const handleAddRemainingDepositPlusCard = () => {
		if (p.remainingKop <= 0) return;
		const { depositTakeKop, cardTakeKop } = computeDepositPlusCardRemainderSplitKop(p.remainingKop, p.patientDepositRub, p.patientFamilyBalanceRub, p.depositAmountRub);
		if (depositTakeKop > 0) p.setDepositAmountRub((prev) => addKopToRubAmount(prev, depositTakeKop));
		if (cardTakeKop > 0) p.setCardAmountRub((prev) => addKopToRubAmount(prev, cardTakeKop));
	};
	const handleAddRemainingToLoyalty = () => { if (p.remainingKop > 0) p.setLoyaltyAmountRub((prev) => addKopToRubAmount(prev, p.remainingKop)); };
	const handleAddRemaining5050 = () => {
		if (p.remainingKop <= 0) return;
		const { halfCardKop, halfCashKop } = computeHalfSplitRemainderKop(p.remainingKop);
		p.setCardAmountRub((prev) => addKopToRubAmount(prev, halfCardKop));
		p.setCashAmountRub((prev) => {
			const nextCash = addKopToRubAmount(prev, halfCashKop);
			if (p.cashTenderedRub < nextCash) p.setCashTenderedRub(nextCash);
			return nextCash;
		});
	};
	const handleAddRemainingToFamily = () => {
		if (p.remainingKop <= 0) return;
		const toAddKop = computeFamilyRemainderTakeKop(p.remainingKop, p.patientFamilyBalanceRub);
		p.setDepositAmountRub((prev) => addKopToRubAmount(prev, toAddKop));
	};
	const handleApplyOneClickLoyaltyPoints = () => {
		if (p.availableLoyaltyPointsRub <= 0) return;
		const pointsToRedeem = Math.min(p.availableLoyaltyPointsRub, p.targetBillRub);
		if (pointsToRedeem >= p.targetBillRub) {
			handleSingle100Percent("loyalty_points");
		} else {
			p.setLoyaltyAmountRub(pointsToRedeem);
			const remaining = Number((p.targetBillRub - pointsToRedeem).toFixed(2));
			if (p.activeMethod === "cash") { p.setCashAmountRub(remaining); p.setCashTenderedRub(remaining); }
			else if (p.activeMethod === "sbp_qr") { p.setSbpAmountRub(remaining); }
			else { p.setCardAmountRub(remaining); }
		}
	};

	return {
		handleQuickPreset, handleStageSelect, handleSingle100Percent, handleAddRemainingToCard,
		handleAddRemainingToCash, handleAddRemainingToSbp, handleAddRemainingToDeposit,
		handleAddRemainingDepositPlusCard, handleAddRemainingToLoyalty, handleAddRemaining5050,
		handleAddRemainingToFamily, handleApplyOneClickLoyaltyPoints,
	};
}
