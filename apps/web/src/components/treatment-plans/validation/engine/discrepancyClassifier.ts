import type {
	PlanPricePolicyPreset,
	PriceDiscrepancyKind,
	PriceLockResolutionPolicy,
	ValidationSeverity,
} from "../planPriceValidationPresets";

export interface ItemDiscrepancyResult {
	discrepancyKind: PriceDiscrepancyKind;
	severity: ValidationSeverity;
	statusBadgeText: string;
	requiresAdminOverride: boolean;
	suggestedResolution: PriceLockResolutionPolicy;
}

export function classifyItemDiscrepancy(
	isNotFound: boolean,
	isArchived: boolean,
	unitPriceDeltaRub: number,
	unitPriceDeltaPercent: number,
	planDiscountPercent: number,
	preset: PlanPricePolicyPreset,
	isPlanExpired: boolean,
): ItemDiscrepancyResult {
	if (isNotFound) {
		return {
			discrepancyKind: "SERVICE_NOT_FOUND",
			severity: "warning",
			statusBadgeText: "Не найдено в прайсе",
			requiresAdminOverride: true,
			suggestedResolution: "LOCK_ORIGINAL_PRICE",
		};
	}
	if (isArchived) {
		return {
			discrepancyKind: "SERVICE_ARCHIVED",
			severity: "error",
			statusBadgeText: "Услуга в архиве",
			requiresAdminOverride: preset.disallowArchivedServices,
			suggestedResolution: "REQUIRE_ADMIN_OVERRIDE",
		};
	}
	if (unitPriceDeltaRub > 0) {
		const isAboveInflationThreshold = unitPriceDeltaPercent > preset.inflationThresholdPercent;
		if (isAboveInflationThreshold && preset.requireManagerOverrideAboveThreshold) {
			return {
				discrepancyKind: "PRICE_INCREASED",
				severity: "warning",
				requiresAdminOverride: true,
				suggestedResolution: "REQUIRE_ADMIN_OVERRIDE",
				statusBadgeText: `Подорожало +${unitPriceDeltaRub.toLocaleString("ru-RU")} ₽ (+${unitPriceDeltaPercent}%) [Согласование]`,
			};
		}
		return {
			discrepancyKind: "PRICE_INCREASED",
			severity: "info",
			statusBadgeText: `Подорожало +${unitPriceDeltaRub.toLocaleString("ru-RU")} ₽ (+${unitPriceDeltaPercent}%)`,
			suggestedResolution: isPlanExpired ? preset.defaultResolutionForExpiredPlan : preset.defaultResolutionForPriceIncrease,
			requiresAdminOverride: false,
		};
	}
	if (unitPriceDeltaRub < 0) {
		return {
			discrepancyKind: "PRICE_DECREASED",
			severity: "success",
			statusBadgeText: `Подешевело ${unitPriceDeltaRub.toLocaleString("ru-RU")} ₽ (${unitPriceDeltaPercent}%)`,
			suggestedResolution: preset.defaultResolutionForPriceDecrease,
			requiresAdminOverride: false,
		};
	}
	if (planDiscountPercent > preset.maxDoctorDiscountPercent) {
		return {
			discrepancyKind: "DISCOUNT_EXPIRED_OR_INVALID",
			severity: "info",
			statusBadgeText: "Скидка согласована врачом",
			requiresAdminOverride: false,
			suggestedResolution: "LOCK_ORIGINAL_PRICE",
		};
	}
	return {
		discrepancyKind: "PRICE_MATCH",
		severity: "success",
		statusBadgeText: "Цена актуальна",
		suggestedResolution: "LOCK_ORIGINAL_PRICE",
		requiresAdminOverride: false,
	};
}
