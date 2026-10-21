import { economyBasicPreset } from "./economyBasicPreset.js";
import { optimumVipPreset } from "./optimumVipPreset.js";
import { standardRecommendedPreset } from "./standardRecommendedPreset.js";
import type { ComprehensivePlanVariant, PlanTierCode } from "./types.js";

export const DEFAULT_TREATMENT_PLAN_PRESETS: Readonly<Record<PlanTierCode, ComprehensivePlanVariant>> = {
	optimum_vip: optimumVipPreset,
	standard_recommended: standardRecommendedPreset,
	economy_basic: economyBasicPreset,
};

export * from "./types.js";
export * from "./optimumVipPreset.js";
export * from "./standardRecommendedPreset.js";
export * from "./economyBasicPreset.js";
