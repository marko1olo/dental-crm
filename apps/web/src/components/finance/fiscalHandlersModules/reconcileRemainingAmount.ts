import { showToast } from "../../GlobalToast.js";
import type { FiscalExecutionParams } from "./types.js";

export function reconcileRemainingAmount(
	params: FiscalExecutionParams,
	eff: { card: number; cash: number; sbp: number; dep: number; loyalty: number; dms: number },
): boolean {
	const {
		validation, clientType, remainingRub, activeMethod, cashAmountRub, cashTenderedRub,
		sbpAmountRub, depositAmountRub, loyaltyAmountRub, dmsAmountRub, cardAmountRub,
		setCashAmountRub, setCashTenderedRub, setSbpAmountRub, setDepositAmountRub,
		setLoyaltyAmountRub, setDmsAmountRub, setCardAmountRub,
	} = params;

	if (validation.isValid) return true;

	const errorMsg = validation.errorMessageRu || "Скорректируйте сумму оплаты перед пробитием чека";
	if (clientType !== "physical_person" && validation.errorMessageRu?.includes("ИНН")) {
		showToast(errorMsg, "warning");
		return false;
	}
	if (clientType === "physical_person" && validation.errorMessageRu?.includes("ИНН") && remainingRub === 0) {
		return true;
	}
	if (remainingRub > 0) {
		const m = activeMethod || "bank_card";
		if (m === "cash") {
			eff.cash = +(cashAmountRub + remainingRub).toFixed(2);
			setCashAmountRub(eff.cash);
			if (cashTenderedRub < eff.cash) setCashTenderedRub(eff.cash);
		} else if (m === "sbp_qr") {
			eff.sbp = +(sbpAmountRub + remainingRub).toFixed(2);
			setSbpAmountRub(eff.sbp);
		} else if (m === "patient_deposit") {
			eff.dep = +(depositAmountRub + remainingRub).toFixed(2);
			setDepositAmountRub(eff.dep);
		} else if (m === "loyalty_points") {
			eff.loyalty = +(loyaltyAmountRub + remainingRub).toFixed(2);
			setLoyaltyAmountRub(eff.loyalty);
		} else if (m === "dms_insurance") {
			eff.dms = +(dmsAmountRub + remainingRub).toFixed(2);
			setDmsAmountRub(eff.dms);
		} else {
			eff.card = +(cardAmountRub + remainingRub).toFixed(2);
			setCardAmountRub(eff.card);
		}
		showToast("Недостающая сумма автоматически добавлена к оплате!", "info");
		return true;
	}
	showToast(errorMsg, "warning");
	return false;
}
