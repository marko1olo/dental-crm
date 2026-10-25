import { PROMO_CODE_PRESETS } from "../presets/index";
import type { PromoCodeEvaluationResult } from "./loyaltyTypes";

/**
 * Evaluates promo codes against invoice amounts and category exclusions
 */
export function evaluatePromoCode(
	code: string,
	invoiceAmountKop: number,
	serviceCategories: readonly string[] = ["therapy"],
	serviceCodes: readonly string[] = []
): PromoCodeEvaluationResult {
	const normalizedCode = code.trim().toUpperCase();
	const preset = PROMO_CODE_PRESETS.find((p) => p.code.toUpperCase() === normalizedCode);

	if (!preset) {
		return {
			isValid: false,
			code: normalizedCode,
			titleRu: "Промокод не найден",
			discountKop: 0,
			discountRub: 0,
			bonusPointsToAddRub: 0,
			finalPayableKop: invoiceAmountKop,
			messageRu: "Указанный промокод не зарегистрирован в маркетинговой системе клиники.",
		};
	}

	if (invoiceAmountKop < preset.minInvoiceAmountKop) {
		const minRub = preset.minInvoiceAmountKop / 100;
		return {
			isValid: false,
			code: preset.code,
			titleRu: preset.titleRu,
			discountKop: 0,
			discountRub: 0,
			bonusPointsToAddRub: 0,
			finalPayableKop: invoiceAmountKop,
			messageRu: `Минимальная сумма чека для применения акции: ${minRub.toLocaleString("ru-RU")} ₽.`,
			promoCodePreset: preset,
		};
	}

	const hasApplicableCategory =
		preset.applicableCategories.includes("all") ||
		preset.applicableCategories.some((cat) => serviceCategories.includes(cat));

	if (!hasApplicableCategory) {
		return {
			isValid: false,
			code: preset.code,
			titleRu: preset.titleRu,
			discountKop: 0,
			discountRub: 0,
			bonusPointsToAddRub: 0,
			finalPayableKop: invoiceAmountKop,
			messageRu: `Промокод «${preset.code}» применим только к услугам категорий: ${preset.applicableCategories.join(", ")}.`,
			promoCodePreset: preset,
		};
	}

	const hasExcludedCode = preset.excludedServiceCodes.some((exCode) =>
		serviceCodes.includes(exCode)
	);
	if (hasExcludedCode) {
		return {
			isValid: false,
			code: preset.code,
			titleRu: preset.titleRu,
			discountKop: 0,
			discountRub: 0,
			bonusPointsToAddRub: 0,
			finalPayableKop: invoiceAmountKop,
			messageRu: "В счете присутствуют позиции, исключенные из данной маркетинговой акции.",
			promoCodePreset: preset,
		};
	}

	let discountKop = 0;
	let bonusPointsToAddRub = 0;

	if (preset.discountType === "percentage") {
		discountKop = Math.round((invoiceAmountKop * preset.value) / 100);
	} else if (preset.discountType === "fixed_rub") {
		discountKop = Math.min(invoiceAmountKop, preset.value * 100);
	} else if (preset.discountType === "welcome_bonus_points") {
		bonusPointsToAddRub = preset.value;
	}

	const finalPayableKop = Math.max(0, invoiceAmountKop - discountKop);

	return {
		isValid: true,
		code: preset.code,
		titleRu: preset.titleRu,
		discountKop,
		discountRub: discountKop / 100,
		bonusPointsToAddRub,
		finalPayableKop,
		messageRu: preset.descriptionRu,
		promoCodePreset: preset,
	};
}
