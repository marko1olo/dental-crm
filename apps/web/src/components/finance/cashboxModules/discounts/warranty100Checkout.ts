/**
 * warranty100Checkout.ts — Layer 2: 100% Warranty Rework & Staff Checkout.
 *
 * DENTE Dental CRM — Cash Register 54-FZ, Discounts & Staff Autonomy Operations.
 * Compliant with:
 * - Mandate 8e, п. 7 (Doctor Autonomy: 100% warranty discounts, no KKT 0.00 ₽ error)
 */

import { kopecksToRub, rubToKopecks } from "@dental/shared";
import type { ZeroDiscountCheckoutResult } from "../cashboxTypes.js";
import { calculatePaymentDiscount } from "./paymentDiscountMath.js";

/**
 * Мандат 8e, п. 7: Свобода скидок и гарантийных переделок.
 * Если итог к оплате после 100% скидки равен 0 ₽:
 * - оформление закрытия («Гарантийный прием / 100% скидка»)
 * - статус оплаты выставляется в «Оплачено (скидка 100%)»
 * - физический фискальный регистратор ограждается от вызова с суммой 0 (защита от ошибки ККТ «Сумма чека не может быть 0»)
 */
export function process100PercentDiscountCheckout(params: {
	readonly totalGrossRub: number;
	readonly discountPercent?: number | undefined;
	readonly isWarrantyRework?: boolean | undefined;
	readonly isStaffColleague?: boolean | undefined;
	readonly customDiscountRub?: number | undefined;
}): ZeroDiscountCheckoutResult {
	const is100Percent =
		Boolean(params.isWarrantyRework) ||
		Boolean(params.isStaffColleague) ||
		(typeof params.discountPercent === "number" && params.discountPercent >= 100);

	const calc = calculatePaymentDiscount(params.totalGrossRub, {
		isWarranty100: is100Percent,
		customDiscountRub: params.customDiscountRub,
		discountPercent: params.discountPercent,
	});

	const grossKop = rubToKopecks(calc.rawTotalDueRub);
	const discountKop = calc.discountKopecks;
	const netKop = calc.totalDueKopecks;
	const isZeroDue = netKop === 0;

	if (isZeroDue) {
		const bannerReason = params.isStaffColleague
			? "Лечение персонала / 100% скидка"
			: "Гарантийный прием / 100% скидка";
		return {
			isZeroDue: true,
			totalGrossRub: kopecksToRub(grossKop),
			totalDiscountRub: kopecksToRub(discountKop),
			totalNetRub: 0,
			totalNetKop: 0,
			status: "completed",
			paymentStatus: "Оплачено (скидка 100%)",
			statusBannerText: `${bannerReason} • Оплачено (скидка 100%)`,
			bypassKktZeroReceipt: true,
			fiscalSign: "WARRANTY-100-GUARANTEE",
			receiptDocNumber: 0,
		};
	}

	return {
		isZeroDue: false,
		totalGrossRub: kopecksToRub(grossKop),
		totalDiscountRub: kopecksToRub(discountKop),
		totalNetRub: kopecksToRub(netKop),
		totalNetKop: netKop,
		status: "ready_for_payment",
		paymentStatus: "Ожидает оплаты",
		statusBannerText: `К оплате: ${kopecksToRub(netKop).toLocaleString("ru-RU")} ₽`,
		bypassKktZeroReceipt: false,
		fiscalSign: "",
		receiptDocNumber: 0,
	};
}
