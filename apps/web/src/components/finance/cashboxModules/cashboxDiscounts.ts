/**
 * cashboxDiscounts.ts — Layer 1 & 2: Kopeck-Exact Discounts & Doctor Autonomy Math.
 *
 * DENTE Dental CRM — Cash Register 54-FZ, Discounts & Staff Autonomy Operations.
 * Compliant with:
 * - Mandate 8e (Doctor & Staff Autonomy: no disabled buttons, no obstacle INN for citizens, 100% warranty checkout)
 * - Kopeck-exact math (integer kopecks arithmetic without float drift)
 */

import { kopecksToRub, rubToKopecks } from "@dental/shared";
import type {
	FastCheckoutDiscountPreset,
	FastCheckoutDiscountResult,
	PaymentDiscountCalculation,
	ZeroDiscountCheckoutResult,
} from "./cashboxTypes.js";

/**
 * Wave 66 (Feature 255): Doctor Autonomy & Multi-Tier Discounts calculation (Mandates 8b, 8e п. 7, 8k, 8n).
 * Guarantees penny-exact integer kopeck calculations without IEEE-754 float drift.
 */
export function calculatePaymentDiscount(
	rawTotalDueRub: number,
	options: {
		isWarranty100?: boolean | undefined;
		customDiscountRub?: number | undefined;
		discountPercent?: number | undefined;
	} = {},
): PaymentDiscountCalculation {
	const rawKop = rubToKopecks(rawTotalDueRub);
	if (options.isWarranty100) {
		return { rawTotalDueRub, discountRub: rawTotalDueRub, discountKopecks: rawKop, totalDueRub: 0, totalDueKopecks: 0, effectiveDiscountPercent: 100, discountPercent: 100, isWarranty100: true };
	}
	let cappedDiscountKop = 0;
	let effPercent = 0;
	if (options.customDiscountRub !== undefined && options.customDiscountRub > 0) {
		const customKop = rubToKopecks(options.customDiscountRub);
		cappedDiscountKop = Math.min(rawKop, customKop);
		effPercent = rawKop > 0 ? Number(((cappedDiscountKop / rawKop) * 100).toFixed(2)) : 0;
	} else if (options.discountPercent !== undefined && options.discountPercent > 0) {
		const discountKop = Math.round((rawKop * options.discountPercent) / 100);
		cappedDiscountKop = Math.min(rawKop, discountKop);
		effPercent = options.discountPercent;
	}
	const dueKop = Math.max(0, rawKop - cappedDiscountKop);
	return {
		rawTotalDueRub,
		discountRub: kopecksToRub(cappedDiscountKop),
		discountKopecks: cappedDiscountKop,
		totalDueRub: kopecksToRub(dueKop),
		totalDueKopecks: dueKop,
		effectiveDiscountPercent: effPercent,
		discountPercent: effPercent,
		isWarranty100: false,
	};
}

/**
 * Calculates doctor discounts and 100% warranty rework with exact integer kopecks (Mandate 8e: Doctor Autonomy).
 * Canonical SSOT for fast checkout, invoices, and payment modal discount calculations.
 * - round_hundreds: rounds bill down to hundreds of rubles in favor of the patient
 * - warranty_100: 100% warranty rework discount (due 0 ₽) without admin passwords
 * - colleague_100: 100% staff / doctor treatment (due 0 ₽)
 * - discount_3 / discount_5 / discount_10: doctor discount presets
 * - manual_percent: arbitrary percentage (0..100)
 */
export function calculateFastCheckoutDiscount(params: {
	readonly grossKop: number;
	readonly preset: FastCheckoutDiscountPreset;
	readonly customPercent?: number | undefined;
}): FastCheckoutDiscountResult {
	const gross = Math.max(0, Math.round(params.grossKop));
	if (gross === 0 || params.preset === "none") {
		return {
			grossKop: gross,
			discountKop: 0,
			netKop: gross,
			discountRub: 0,
			netRub: gross / 100,
			savingsText: "0.00 ₽",
			effectivePercent: 0,
		};
	}

	let discountKop = 0;
	if (params.preset === "round_hundreds") {
		if (gross >= 10000) {
			const roundedKop = Math.floor(gross / 10000) * 10000;
			discountKop = gross - roundedKop;
		} else {
			const roundedKop = Math.floor(gross / 100) * 100;
			discountKop = gross - roundedKop;
		}
	} else if (params.preset === "discount_3") {
		discountKop = Math.round((gross * 3) / 100);
	} else if (params.preset === "discount_5") {
		discountKop = Math.round((gross * 5) / 100);
	} else if (params.preset === "discount_10") {
		discountKop = Math.round((gross * 10) / 100);
	} else if (params.preset === "warranty_100" || params.preset === "colleague_100") {
		discountKop = gross;
	} else if (params.preset === "manual_percent") {
		const pct = Math.max(0, Math.min(100, params.customPercent ?? 0));
		discountKop = Math.round((gross * pct) / 100);
	}

	discountKop = Math.max(0, Math.min(gross, discountKop));
	const netKop = gross - discountKop;
	const effectivePercent = gross > 0 ? Math.round((discountKop / gross) * 100) : 0;
	const discountRub = discountKop / 100;
	const netRub = netKop / 100;

	return {
		grossKop: gross,
		discountKop,
		netKop,
		discountRub,
		netRub,
		savingsText: `${discountRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`,
		effectivePercent,
	};
}

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
