import type { BotPreset } from "./botPresetTypes";
import { soloDoctorPreset } from "./doctorBotPresets";
import { familyPreset, orthodonticsPreset } from "./patientBotPresets";
import { standardClinicPreset, premiumPreset } from "./adminBotPresets";
export * from "./botPresetTypes";
export * from "./doctorBotPresets";
export * from "./patientBotPresets";
export * from "./adminBotPresets";

export const CLINICAL_BOT_PRESETS: Record<BotPreset["id"], BotPreset> = {
	premium: premiumPreset, family: familyPreset, orthodontics: orthodonticsPreset,
	solo_doctor: soloDoctorPreset, standard_clinic: standardClinicPreset,
};
