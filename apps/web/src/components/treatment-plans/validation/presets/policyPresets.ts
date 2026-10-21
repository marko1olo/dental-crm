/**
 * apps/web/src/components/treatment-plans/validation/presets/policyPresets.ts
 *
 * Стандартные клинико-финансовые пресеты клиники DENTE CRM.
 */

import type { PlanPricePolicyPreset, PlanPricePolicyPresetId } from "./validationTypes";

export const PLAN_PRICE_POLICY_PRESETS: Readonly<
	Record<PlanPricePolicyPresetId, PlanPricePolicyPreset>
> = {
	standard_30: {
		id: "standard_30",
		title: "Стандартный терапевтический (30 дней)",
		subtitle: "Гарантия цен 30 календарных дней с даты утверждения плана лечения",
		validityDays: 30,
		inflationThresholdPercent: 10,
		allowAutoLockWithinValidity: true,
		disallowArchivedServices: true,
		requireManagerOverrideAboveThreshold: true,
		maxDoctorDiscountPercent: 10,
		defaultResolutionForPriceIncrease: "LOCK_ORIGINAL_PRICE",
		defaultResolutionForPriceDecrease: "UPDATE_TO_CURRENT_PRICE",
		defaultResolutionForExpiredPlan: "LOCK_ORIGINAL_PRICE",
	},
	ortho_implant_90: {
		id: "ortho_implant_90",
		title: "Хирургия & Ортопедия (90 дней)",
		subtitle: "Расширенная фиксация цен на 3 месяца для комплексных и этапных операций",
		validityDays: 90,
		inflationThresholdPercent: 15,
		allowAutoLockWithinValidity: true,
		disallowArchivedServices: true,
		requireManagerOverrideAboveThreshold: true,
		maxDoctorDiscountPercent: 15,
		defaultResolutionForPriceIncrease: "LOCK_ORIGINAL_PRICE",
		defaultResolutionForPriceDecrease: "UPDATE_TO_CURRENT_PRICE",
		defaultResolutionForExpiredPlan: "LOCK_ORIGINAL_PRICE",
	},
	long_term_vip_180: {
		id: "long_term_vip_180",
		title: "VIP / Тотальная реабилитация (180 дней)",
		subtitle: "Полугодовая заморозка цен по депозитному или VIP-договору клиники",
		validityDays: 180,
		inflationThresholdPercent: 20,
		allowAutoLockWithinValidity: true,
		disallowArchivedServices: false,
		requireManagerOverrideAboveThreshold: true,
		maxDoctorDiscountPercent: 20,
		defaultResolutionForPriceIncrease: "LOCK_ORIGINAL_PRICE",
		defaultResolutionForPriceDecrease: "UPDATE_TO_CURRENT_PRICE",
		defaultResolutionForExpiredPlan: "LOCK_ORIGINAL_PRICE",
	},
	flexible_clinic: {
		id: "flexible_clinic",
		title: "Гибкая адаптация (Актуальный прайс)",
		subtitle: "Автоматический пересчет всех позиций по текущему каталогу клиники",
		validityDays: 14,
		inflationThresholdPercent: 5,
		allowAutoLockWithinValidity: false,
		disallowArchivedServices: true,
		requireManagerOverrideAboveThreshold: false,
		maxDoctorDiscountPercent: 5,
		defaultResolutionForPriceIncrease: "UPDATE_TO_CURRENT_PRICE",
		defaultResolutionForPriceDecrease: "UPDATE_TO_CURRENT_PRICE",
		defaultResolutionForExpiredPlan: "UPDATE_TO_CURRENT_PRICE",
	},
};
