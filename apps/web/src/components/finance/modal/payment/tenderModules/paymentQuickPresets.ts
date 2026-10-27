import { rubToKopecks } from "@dental/shared";
import { allocateRemainderToTender, type TenderAllocationTarget } from "../../../cashboxOperations.js";
import { applyQuickCheckoutPreset, paymentsToSplitState } from "../../../../payments/checkout/fastCheckoutEngine.js";
import { showToast } from "../../../../GlobalToast.js";
import type { PaymentQuickPresetsParams } from "./paymentQuickPresetsTypes.js";

export type { PaymentQuickPresetsParams };

export function usePaymentQuickPresets(params: PaymentQuickPresetsParams) {
	const {
		totalDueRub, rawTotalDueRub, isWarranty100, setIsWarranty100, setDiscountPercent, setDiscountReason,
		patientDepositRub, patientFamilyBalanceRub, availableDmsCoverageRub, splitCardRub, splitCashRub,
		splitDepositRub, splitSbpRub, splitCertificateRub, splitBonusRub, splitDmsRub, resetSplitTenders,
		setActiveMethod, setReceivedCashRub,
	} = params;

	const clearWarranty = () => {
		if (isWarranty100) {
			setIsWarranty100(false);
			setDiscountPercent(0);
			setDiscountReason("");
		}
	};

	const applySplitRemainder = (targetTender: TenderAllocationTarget) => {
		const next = allocateRemainderToTender({
			totalDueRub, currentTenders: { cardRub: splitCardRub, cashRub: splitCashRub, sbpRub: splitSbpRub, depositRub: splitDepositRub, familyRub: 0, certificateRub: splitCertificateRub, bonusRub: splitBonusRub, dmsRub: splitDmsRub },
			targetTender, patientDepositRub, patientFamilyBalanceRub, availableDmsCoverageRub,
		});
		resetSplitTenders({ card: next.cardRub, cash: next.cashRub, deposit: next.depositRub + next.familyRub, sbp: next.sbpRub, certificate: next.certificateRub || 0, bonus: next.bonusRub || 0, dms: next.dmsRub || 0 });
	};

	const applyExactCashPreset = () => {
		clearWarranty();
		setActiveMethod("cash");
		const effectiveTotal = isWarranty100 ? rawTotalDueRub : totalDueRub;
		const res = applyQuickCheckoutPreset({ totalBillKop: rubToKopecks(effectiveTotal), preset: "100_cash" });
		const splitState = paymentsToSplitState(res.payments);
		const exactRub = splitState.cashRub > 0 ? splitState.cashRub : effectiveTotal;
		setReceivedCashRub(exactRub);
		resetSplitTenders({ cash: exactRub });
		showToast(`Без сдачи (${exactRub.toLocaleString("ru-RU")} ₽)`, "info", 2000);
	};

	const applyFullCardPreset = () => {
		clearWarranty();
		setActiveMethod("card_terminal");
		const effectiveTotal = isWarranty100 ? rawTotalDueRub : totalDueRub;
		const res = applyQuickCheckoutPreset({ totalBillKop: rubToKopecks(effectiveTotal), preset: "100_card" });
		const splitState = paymentsToSplitState(res.payments);
		resetSplitTenders({ card: splitState.cardRub > 0 ? splitState.cardRub : effectiveTotal });
		showToast(`Оплата картой 100% (${effectiveTotal.toLocaleString("ru-RU")} ₽)`, "info", 2000);
	};

	const apply5050CashCardPreset = () => {
		setIsWarranty100(false);
		const res = applyQuickCheckoutPreset({ totalBillKop: rubToKopecks(totalDueRub), preset: "split_50_50" });
		const s = paymentsToSplitState(res.payments);
		resetSplitTenders({ cash: s.cashRub, card: s.cardRub });
		setActiveMethod("split");
		showToast(`50/50 Нал (${s.cashRub.toLocaleString("ru-RU")} ₽) + Карта (${s.cardRub.toLocaleString("ru-RU")} ₽)`, "info", 2500);
	};

	const applyDepositPlusCardPreset = () => {
		clearWarranty();
		const available = Math.min(totalDueRub, Math.max(0, patientDepositRub));
		const remainder = Number((totalDueRub - available).toFixed(2));
		resetSplitTenders({ deposit: available, card: remainder });
		setActiveMethod("split");
		showToast(`Аванс ${available.toLocaleString("ru-RU")} ₽ + Карта ${remainder.toLocaleString("ru-RU")} ₽`, "info", 3000);
	};

	const applyThreeWayCashCardAdvancePreset = () => {
		clearWarranty();
		const maxAvail = Math.max(patientDepositRub > 0 ? patientDepositRub : 0, patientFamilyBalanceRub > 0 ? patientFamilyBalanceRub : 0);
		const res = applyQuickCheckoutPreset({ totalBillKop: rubToKopecks(totalDueRub), preset: "split_three_way", availableDepositKop: rubToKopecks(maxAvail) });
		const s = paymentsToSplitState(res.payments);
		resetSplitTenders({ deposit: s.depositRub, cash: s.cashRub, card: s.cardRub });
		setActiveMethod("split");
		showToast(`Аванс ${s.depositRub.toLocaleString("ru-RU")} ₽ + Нал ${s.cashRub.toLocaleString("ru-RU")} ₽ + Карта ${s.cardRub.toLocaleString("ru-RU")} ₽`, "info", 2500);
	};

	const applySpendAllDepositBonusPreset = () => {
		setIsWarranty100(false);
		const maxAvail = Math.max(patientDepositRub > 0 ? patientDepositRub : 0, patientFamilyBalanceRub > 0 ? patientFamilyBalanceRub : 0);
		const depositKop = rubToKopecks(maxAvail);
		const totalKop = rubToKopecks(totalDueRub);
		if (depositKop >= totalKop && totalKop > 0) {
			setActiveMethod("family_deposit");
			resetSplitTenders({ deposit: totalDueRub });
			showToast(`Списан весь аванс (${totalDueRub.toLocaleString("ru-RU")} ₽)`, "info", 2500);
		} else if (depositKop > 0) {
			const res = applyQuickCheckoutPreset({ totalBillKop: totalKop, preset: "use_deposit", availableDepositKop: depositKop });
			const s = paymentsToSplitState(res.payments);
			resetSplitTenders({ deposit: s.depositRub, card: s.cardRub });
			setActiveMethod("split");
			showToast(`Аванс ${s.depositRub.toLocaleString("ru-RU")} ₽ + Карта ${s.cardRub.toLocaleString("ru-RU")} ₽`, "info", 2500);
		} else {
			setActiveMethod("split");
			const bonusAmount = Math.min(totalDueRub, 500);
			resetSplitTenders({ bonus: bonusAmount, card: Math.max(0, Number((totalDueRub - bonusAmount).toFixed(2))) });
			showToast(`Списано бонусов (${bonusAmount} ₽)`, "info", 2500);
		}
	};

	return {
		applySplitRemainder, applyExactCashPreset, applyFullCardPreset,
		apply5050CashCardPreset, applyDepositPlusCardPreset,
		applyThreeWayCashCardAdvancePreset, applySpendAllDepositBonusPreset,
	};
}
