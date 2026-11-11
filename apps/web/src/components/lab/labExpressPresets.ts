export {
	type ExpressLabPreset,
	ONE_CLICK_LAB_DEFAULTS,
} from "./expressPresetsModules/expressPresetTypes";

export {
	type LabScheduleSlotInfo,
	buildLabAppointmentDraft,
} from "./expressPresetsModules/labAppointmentDraftHelper";

export {
	EXPRESS_PRESET_ZIRCONIA_CROWN,
	EXPRESS_PRESET_PMMA_TEMPORARY,
	EXPRESS_PRESET_PFM_DUCERAM,
} from "./expressPresetsModules/canonicalCrownPresets";

export {
	EXPRESS_PRESET_IMPLANT_SCREW_RETAINED,
	EXPRESS_PRESET_BRUXISM_SPLINT,
	EXPRESS_PRESET_CUSTOM_ABUTMENT,
	EXPRESS_PRESET_REMOVABLE_ACRY_FREE,
	EXPRESS_PRESET_REMOVABLE_NYLON,
} from "./expressPresetsModules/canonicalImplantSplintPresets";

import type { ExpressLabPreset } from "./expressPresetsModules/expressPresetTypes";
import {
	EXPRESS_PRESET_ZIRCONIA_CROWN,
	EXPRESS_PRESET_PMMA_TEMPORARY,
	EXPRESS_PRESET_PFM_DUCERAM,
} from "./expressPresetsModules/canonicalCrownPresets";
import {
	EXPRESS_PRESET_IMPLANT_SCREW_RETAINED,
	EXPRESS_PRESET_BRUXISM_SPLINT,
	EXPRESS_PRESET_CUSTOM_ABUTMENT,
	EXPRESS_PRESET_REMOVABLE_ACRY_FREE,
} from "./expressPresetsModules/canonicalImplantSplintPresets";
import { EXTENDED_EXPRESS_LAB_PRESETS } from "./expressPresetsModules/extendedExpressPresets";

export const CANONICAL_EXPRESS_LAB_PRESETS: readonly ExpressLabPreset[] = [
	EXPRESS_PRESET_ZIRCONIA_CROWN,
	EXPRESS_PRESET_PMMA_TEMPORARY,
	EXPRESS_PRESET_PFM_DUCERAM,
	EXPRESS_PRESET_IMPLANT_SCREW_RETAINED,
	EXPRESS_PRESET_BRUXISM_SPLINT,
	EXPRESS_PRESET_CUSTOM_ABUTMENT,
	EXPRESS_PRESET_REMOVABLE_ACRY_FREE,
] as const;

export const EXPRESS_LAB_PRESETS: ExpressLabPreset[] = [
	...CANONICAL_EXPRESS_LAB_PRESETS,
	...EXTENDED_EXPRESS_LAB_PRESETS,
];

export const EXPRESS_PRESET_EMAX_CROWN: ExpressLabPreset = {
	id: "emax_crown_express",
	title: "Коронка E.max CAD / Press",
	shortDesc: "Дисиликат лития E.max, цвет VITA A2, зазор 30 мкм, срок 5 раб. дней (22 000 ₽ / 6 500 ₽)",
	constructionType: "single_crown",
	materialId: "emax_lithium_disilicate",
	colorVita: "A2",
	workingDays: 5,
	priceRub: 22000,
	labCostRub: 6500,
	patientPriceRub: 22000,
	patientPriceKopecks: 2200000,
	labCostKopecks: 650000,
	occlusalScheme: "mutually_protected",
	contactTightness: "normal",
	surfaceTexture: "natural_anatomy",
	cementGapMicrons: 30,
	impressionType: "a_silicone",
	badge: "E.max (5 дн.)",
};

export const EXPRESS_PRESET_BRIDGE_ZIRCONIA: ExpressLabPreset = {
	id: "bridge_zirconia_express",
	title: "Мостовидный протез ZrO2",
	shortDesc: "Диоксид циркония Multi-Layer, цвет VITA A2, зазор 30 мкм, срок 7 раб. дней (48 000 ₽ / 15 000 ₽)",
	constructionType: "bridge",
	materialId: "zirconia_multilayer",
	colorVita: "A2",
	workingDays: 7,
	priceRub: 48000,
	labCostRub: 15000,
	patientPriceRub: 48000,
	patientPriceKopecks: 4800000,
	labCostKopecks: 1500000,
	occlusalScheme: "mutually_protected",
	contactTightness: "normal",
	surfaceTexture: "natural_anatomy",
	cementGapMicrons: 30,
	impressionType: "a_silicone",
	badge: "Мост ZrO2 (7 дн.)",
};

export const EXPRESS_PRESET_EMAX_INLAY: ExpressLabPreset = {
	id: "emax_inlay_express",
	title: "Вкладка E.max (Inlay/Onlay)",
	shortDesc: "Дисиликат лития IPS e.max Press, цвет VITA A2, зазор 20 мкм, срок 5 раб. дней (18 000 ₽ / 5 500 ₽)",
	constructionType: "inlay_onlay",
	materialId: "emax_lithium_disilicate",
	colorVita: "A2",
	workingDays: 5,
	priceRub: 18000,
	labCostRub: 5500,
	patientPriceRub: 18000,
	patientPriceKopecks: 1800000,
	labCostKopecks: 550000,
	occlusalScheme: "mutually_protected",
	contactTightness: "normal",
	surfaceTexture: "natural_anatomy",
	cementGapMicrons: 20,
	impressionType: "a_silicone",
	badge: "Вкладка E.max (5 дн.)",
};

export const MODAL_EXPRESS_LAB_PRESETS: readonly ExpressLabPreset[] = [
	EXPRESS_PRESET_ZIRCONIA_CROWN,
	EXPRESS_PRESET_BRIDGE_ZIRCONIA,
	EXPRESS_PRESET_EMAX_INLAY,
	EXPRESS_PRESET_EMAX_CROWN,
	EXPRESS_PRESET_PFM_DUCERAM,
	EXPRESS_PRESET_PMMA_TEMPORARY,
	...EXPRESS_LAB_PRESETS.filter(
		(p) =>
			p.id !== "zirconia_crown_express" &&
			p.id !== "bridge_zirconia_express" &&
			p.id !== "emax_inlay_express" &&
			p.id !== "pfm_duceram_express" &&
			p.id !== "pmma_temporary_express" &&
			p.id !== "emax_crown_express",
	),
];
