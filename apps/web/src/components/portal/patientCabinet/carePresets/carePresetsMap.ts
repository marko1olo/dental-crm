import type { CareInterventionType, CarePresetData } from "./careTypes.js";
import { CARIES_CARE_PRESET, ENDODONTICS_CARE_PRESET } from "./therapyCarePresets.js";
import { EXTRACTION_CARE_PRESET } from "./surgeryExtractionPreset.js";
import { SINUS_LIFT_CARE_PRESET, IMPLANTATION_CARE_PRESET } from "./surgeryImplantSinusPreset.js";
import { WHITENING_CARE_PRESET, ORTHODONTICS_CARE_PRESET } from "./whiteningOrthoPreset.js";
import { HYGIENE_CARE_PRESET } from "./hygienePreset.js";

export const CARE_PRESETS_MAP: Record<CareInterventionType, CarePresetData> = {
	caries: CARIES_CARE_PRESET,
	extraction: EXTRACTION_CARE_PRESET,
	sinus_lift: SINUS_LIFT_CARE_PRESET,
	implantation: IMPLANTATION_CARE_PRESET,
	endodontics: ENDODONTICS_CARE_PRESET,
	whitening: WHITENING_CARE_PRESET,
	orthodontics: ORTHODONTICS_CARE_PRESET,
	hygiene: HYGIENE_CARE_PRESET,
	custom: CARIES_CARE_PRESET,
};
