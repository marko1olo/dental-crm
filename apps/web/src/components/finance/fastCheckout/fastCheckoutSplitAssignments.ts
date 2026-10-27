import type { CheckoutPaymentMethodType, FastCheckoutSplitAmountsSetters } from "./types";

/** Сбрасывает все поля распределения сумм сплита в 0 ₽ */
export function resetAllSplitAmounts(setters: FastCheckoutSplitAmountsSetters): void {
	setters.setCardAmountRub(0);
	setters.setCashAmountRub(0);
	setters.setSbpAmountRub(0);
	setters.setDepositAmountRub(0);
	setters.setLoyaltyAmountRub(0);
	setters.setDmsAmountRub(0);
	setters.setCashTenderedRub(0);
}

/** Распределяет 100% целевой суммы на выбранный способ оплаты */
export function assignFullAmountToMethod(
	method: CheckoutPaymentMethodType,
	amountRub: number,
	setters: FastCheckoutSplitAmountsSetters,
	includeDepositMethod = true,
): void {
	if (method === "cash") {
		setters.setCashAmountRub(amountRub);
		setters.setCashTenderedRub(amountRub);
	} else if (method === "sbp_qr") {
		setters.setSbpAmountRub(amountRub);
	} else if (includeDepositMethod && method === "patient_deposit") {
		setters.setDepositAmountRub(amountRub);
	} else if (method === "loyalty_points") {
		setters.setLoyaltyAmountRub(amountRub);
	} else if (method === "dms_insurance") {
		setters.setDmsAmountRub(amountRub);
	} else {
		setters.setCardAmountRub(amountRub);
	}
}
