import { rubToKopecks, kopecksToRub } from "@dental/shared";
import type { CheckoutPaymentMethodType } from "../fastCheckoutPresets.js";
import type { CheckoutSplitItem, FastCheckoutSplitState } from "./types.js";

/**
 * Преобразование рублевого сплит-состояния в строго типизированный список платежей в копейках.
 */
export function splitStateToCheckoutPayments(
	split: Partial<FastCheckoutSplitState>,
): CheckoutSplitItem[] {
	const items: CheckoutSplitItem[] = [];
	const cardKop = split.cardRub !== undefined ? Math.max(0, rubToKopecks(split.cardRub)) : 0;
	const cashKop = split.cashRub !== undefined ? Math.max(0, rubToKopecks(split.cashRub)) : 0;
	const sbpKop = split.sbpRub !== undefined ? Math.max(0, rubToKopecks(split.sbpRub)) : 0;
	const depositKop = split.depositRub !== undefined ? Math.max(0, rubToKopecks(split.depositRub)) : 0;
	const loyaltyKop = split.loyaltyRub !== undefined ? Math.max(0, rubToKopecks(split.loyaltyRub)) : 0;
	const dmsKop = split.dmsRub !== undefined ? Math.max(0, rubToKopecks(split.dmsRub)) : 0;

	if (cardKop > 0) items.push({ method: "bank_card", amountKop: cardKop });
	if (cashKop > 0) items.push({ method: "cash", amountKop: cashKop });
	if (sbpKop > 0) items.push({ method: "sbp_qr", amountKop: sbpKop });
	if (depositKop > 0) items.push({ method: "patient_deposit", amountKop: depositKop });
	if (loyaltyKop > 0) items.push({ method: "loyalty_points", amountKop: loyaltyKop });
	if (dmsKop > 0) items.push({ method: "dms_insurance", amountKop: dmsKop });

	return items;
}

/**
 * Преобразование платежей в рубли со строгой точностью до 2 знаков.
 */
export function paymentsToSplitState(
	payments: readonly CheckoutSplitItem[],
): FastCheckoutSplitState {
	let cardRub = 0;
	let cashRub = 0;
	let sbpRub = 0;
	let depositRub = 0;
	let loyaltyRub = 0;
	let dmsRub = 0;

	for (const p of payments) {
		const rub = kopecksToRub(p.amountKop);
		switch (p.method) {
			case "bank_card":
				cardRub += rub;
				break;
			case "cash":
				cashRub += rub;
				break;
			case "sbp_qr":
				sbpRub += rub;
				break;
			case "patient_deposit":
				depositRub += rub;
				break;
			case "loyalty_points":
				loyaltyRub += rub;
				break;
			case "dms_insurance":
				dmsRub += rub;
				break;
		}
	}

	return {
		cardRub: kopecksToRub(rubToKopecks(cardRub)),
		cashRub: kopecksToRub(rubToKopecks(cashRub)),
		sbpRub: kopecksToRub(rubToKopecks(sbpRub)),
		depositRub: kopecksToRub(rubToKopecks(depositRub)),
		loyaltyRub: kopecksToRub(rubToKopecks(loyaltyRub)),
		dmsRub: kopecksToRub(rubToKopecks(dmsRub)),
	};
}

/**
 * Расчет оставшейся нераспределенной суммы в копейках.
 */
export function calculateSplitRemainingKop(
	totalBillKop: number,
	payments: readonly CheckoutSplitItem[],
): number {
	const totalPaidKop = payments.reduce((acc, p) => acc + Math.max(0, p.amountKop), 0);
	return totalBillKop - totalPaidKop;
}

/**
 * Балансировщик остатка в 1 клик: переносит остаток на целевой способ оплаты.
 */
export function balanceRemainderToSplitMethod(params: {
	readonly totalBillKop: number;
	readonly currentPayments: readonly CheckoutSplitItem[];
	readonly targetMethod: CheckoutPaymentMethodType;
}): readonly CheckoutSplitItem[] {
	const sanitizedTotal = Math.max(0, params.totalBillKop);
	const otherPayments = params.currentPayments.filter((p) => p.method !== params.targetMethod);
	const otherSumKop = otherPayments.reduce((acc, p) => acc + Math.max(0, p.amountKop), 0);
	const remainingForTargetKop = Math.max(0, sanitizedTotal - otherSumKop);

	const result: CheckoutSplitItem[] = [...otherPayments];
	if (remainingForTargetKop > 0) {
		result.push({
			method: params.targetMethod,
			amountKop: remainingForTargetKop,
		});
	}
	return result;
}
