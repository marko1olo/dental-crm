/**
 * paymentDiscountMath.ts — Layer 1: Kopeck-Exact Discounts Math.
 *
 * DENTE Dental CRM — Cash Register 54-FZ, Discounts & Staff Autonomy Operations.
 * Compliant with:
 * - Mandate 8e (Doctor Autonomy: discounts up to 100% without admin passwords)
 * - Kopeck-exact math (integer kopecks arithmetic without float drift)
 */

import { kopecksToRub, rubToKopecks } from "@dental/shared";
import type {
	FastCheckoutDiscountPreset,
	FastCheckoutDiscountResult,
	PaymentDiscountCalculation,
} from "../cashboxTypes.js";

/**
 * Calculates doctor discounts and multi-tier discounts (Mandate 8e, 8b).
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
 * Fast checkout discount calculations (SSOT for fast checkout, invoices, payment modal).
 */
export function calculateFastCheckoutDiscount(params: {
	readonly grossKop: number;
	readonly preset: FastCheckoutDiscountPreset;
	readonly customPercent?: number | undefined;
}): FastCheckoutDiscountResult {
	const gross = Math.max(0, Math.round(params.grossKop));
	if (gross === 0 || params.preset === "none") {
		return { grossKop: gross, discountKop: 0, netKop: gross, discountRub: 0, netRub: gross / 100, savingsText: "0.00 ₽", effectivePercent: 0 };
	}

	let discountKop = 0;
	if (params.preset === "round_hundreds") {
		const divisor = gross >= 10000 ? 10000 : 100;
		discountKop = gross - Math.floor(gross / divisor) * divisor;
	} else if (params.preset === "discount_3") discountKop = Math.round((gross * 3) / 100);
	else if (params.preset === "discount_5") discountKop = Math.round((gross * 5) / 100);
	else if (params.preset === "discount_10") discountKop = Math.round((gross * 10) / 100);
	else if (params.preset === "discount_15") discountKop = Math.round((gross * 15) / 100);
	else if (params.preset === "discount_20") discountKop = Math.round((gross * 20) / 100);
	else if (params.preset === "discount_50") discountKop = Math.round((gross * 50) / 100);
	else if (params.preset === "warranty_100" || params.preset === "colleague_100") discountKop = gross;
	else if (params.preset === "manual_percent") {
		const pct = Math.max(0, Math.min(100, params.customPercent ?? 0));
		discountKop = Math.round((gross * pct) / 100);
	}

	discountKop = Math.max(0, Math.min(gross, discountKop));
	const netKop = gross - discountKop;
	const effectivePercent = gross > 0 ? Math.round((discountKop / gross) * 100) : 0;
	const discountRub = discountKop / 100;

	return {
		grossKop: gross,
		discountKop,
		netKop,
		discountRub,
		netRub: netKop / 100,
		savingsText: `${discountRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`,
		effectivePercent,
	};
}
