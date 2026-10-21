import { CBCT_DOSE_PRESETS } from "./radiationDosePresetsCbct.js";
import type {
	StatutoryDosePreset,
	StatutoryRadiologyModality,
} from "./types.js";

export * from "./radiationDosePresetsCbct.js";
export * from "./radiationZoneDefinitions.js";

export const STATUTORY_RADIATION_DOSE_PRESETS: Record<
	StatutoryRadiologyModality,
	StatutoryDosePreset
> = {
	visiography_intraoral: {
		id: "visiography_intraoral",
		nameRu: "Прицельная радиовизиография",
		shortNameRu: "Визиограф",
		categoryRu: "Интраоральные",
		typicalDoseMsv: 0.002,
		typicalDoseMicrosv: 2.0,
		minDoseMsv: 0.001,
		maxDoseMsv: 0.003,
		defaultKv: 65,
		defaultMa: 7,
		defaultExposureSec: 0.08,
	},
	optg_panoramic: {
		id: "optg_panoramic",
		nameRu: "Ортопантомография (ОПТГ)",
		shortNameRu: "Панорама ОПТГ",
		categoryRu: "Панорамные",
		typicalDoseMsv: 0.013,
		typicalDoseMicrosv: 13.0,
		minDoseMsv: 0.01,
		maxDoseMsv: 0.015,
		defaultKv: 70,
		defaultMa: 10,
		defaultExposureSec: 12.0,
	},
	...(CBCT_DOSE_PRESETS as Record<
		"cbct_segmental" | "cbct_full_jaws" | "cbct_maxillofacial",
		StatutoryDosePreset
	>),
	teleradiography_trg: {
		id: "teleradiography_trg",
		nameRu: "Телерентгенография (ТРГ боковая)",
		shortNameRu: "ТРГ боковая",
		categoryRu: "Телерентгенография",
		typicalDoseMsv: 0.01,
		typicalDoseMicrosv: 10.0,
		minDoseMsv: 0.005,
		maxDoseMsv: 0.015,
		defaultKv: 75,
		defaultMa: 10,
		defaultExposureSec: 0.5,
	},
	teleradiography_trg_frontal: {
		id: "teleradiography_trg_frontal",
		nameRu: "Телерентгенография (ТРГ прямая)",
		shortNameRu: "ТРГ прямая",
		categoryRu: "Телерентгенография",
		typicalDoseMsv: 0.01,
		typicalDoseMicrosv: 10.0,
		minDoseMsv: 0.005,
		maxDoseMsv: 0.015,
		defaultKv: 75,
		defaultMa: 10,
		defaultExposureSec: 0.5,
	},
	bitewing_intraoral: {
		id: "bitewing_intraoral",
		nameRu: "Интерпроксимальная рентгенография",
		shortNameRu: "Интерпроксимал",
		categoryRu: "Интраоральные",
		typicalDoseMsv: 0.002,
		typicalDoseMicrosv: 2.0,
		minDoseMsv: 0.001,
		maxDoseMsv: 0.003,
		defaultKv: 65,
		defaultMa: 7,
		defaultExposureSec: 0.08,
	},
};

export function getStatutoryDosePreset(
	modalityId?: StatutoryRadiologyModality | string,
): StatutoryDosePreset {
	if (modalityId && modalityId in STATUTORY_RADIATION_DOSE_PRESETS) {
		return STATUTORY_RADIATION_DOSE_PRESETS[
			modalityId as StatutoryRadiologyModality
		];
	}
	return STATUTORY_RADIATION_DOSE_PRESETS.visiography_intraoral;
}
