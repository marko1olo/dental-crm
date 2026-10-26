import type { ThreeTierTreatmentPlanModel } from "../../patientCabinet/patientCabinetEngine.js";
import { BASIC_TIER_OPTION } from "./tierBasic";
import { STANDARD_TIER_OPTION } from "./tierStandard";
import { PREMIUM_TIER_OPTION } from "./tierPremium";

export const DEFAULT_THREE_TIER_PLAN_MODEL: ThreeTierTreatmentPlanModel = {
	selectedTier: "standard",
	tiers: [
		BASIC_TIER_OPTION,
		STANDARD_TIER_OPTION,
		PREMIUM_TIER_OPTION,
	],
};

export { BASIC_TIER_OPTION, STANDARD_TIER_OPTION, PREMIUM_TIER_OPTION };
