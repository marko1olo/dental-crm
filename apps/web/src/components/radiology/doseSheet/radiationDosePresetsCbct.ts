import type {
	StatutoryDosePreset,
	StatutoryRadiologyModality,
} from "./types.js";

export const CBCT_DOSE_PRESETS: Partial<
	Record<StatutoryRadiologyModality, StatutoryDosePreset>
> = {
	cbct_segmental: {
		id: "cbct_segmental",
		nameRu: "КЛКТ сегмента 5х5 см",
		shortNameRu: "КЛКТ 5х5",
		categoryRu: "Томография (3D КЛКТ)",
		typicalDoseMsv: 0.035,
		typicalDoseMicrosv: 35.0,
		minDoseMsv: 0.03,
		maxDoseMsv: 0.06,
		defaultKv: 90,
		defaultMa: 8,
		defaultExposureSec: 14.0,
	},
	cbct_full_jaws: {
		id: "cbct_full_jaws",
		nameRu: "КЛКТ обеих челюстей 8х8 см",
		shortNameRu: "КЛКТ 8х8",
		categoryRu: "Томография (3D КЛКТ)",
		typicalDoseMsv: 0.045,
		typicalDoseMicrosv: 45.0,
		minDoseMsv: 0.03,
		maxDoseMsv: 0.06,
		defaultKv: 95,
		defaultMa: 10,
		defaultExposureSec: 15.0,
	},
	cbct_maxillofacial: {
		id: "cbct_maxillofacial",
		nameRu: "КЛКТ челюстно-лицевой области 12х9 см",
		shortNameRu: "КЛКТ 12х9",
		categoryRu: "Томография (3D КЛКТ)",
		typicalDoseMsv: 0.055,
		typicalDoseMicrosv: 55.0,
		minDoseMsv: 0.03,
		maxDoseMsv: 0.06,
		defaultKv: 100,
		defaultMa: 10,
		defaultExposureSec: 18.0,
	},
};
