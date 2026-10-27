import { CLINICAL_FEATURE_TOGGLES } from "./clinicalFeatureToggles";
import { SYSTEM_FEATURE_TOGGLES } from "./systemFeatureToggles";
import type { FeatureToggleDef } from "./featureToggleTypes";

export { type FeatureToggleDef };

export const FEATURE_TOGGLES: FeatureToggleDef[] = [
	...CLINICAL_FEATURE_TOGGLES,
	...SYSTEM_FEATURE_TOGGLES,
];
