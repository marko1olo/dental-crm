/**
 * programsCatalog.ts — Каталог стандартных программ ДМС
 */

import type { DmsProgramDefinition, DmsProgramType } from "./types.js";

export const DMS_PROGRAMS: Record<DmsProgramType, DmsProgramDefinition> = {
	base: {
		type: "base",
		name: "Базовая стоматология",
		description: "Купирование острой боли, лечение кариеса и пульпита, простое удаление, прицельная радиовизиография.",
		defaultLimitKopecks: 6000000,
		allowedCategories: ["therapy_caries", "therapy_pulpitis", "surgery_simple", "radiology_periapical"],
		maxHygienePerYear: 1,
	},
	extended: {
		type: "extended",
		name: "Расширенная стоматология",
		description: "Базовый пакет + лечение периодонтита, сложное удаление, ОПТГ/КЛКТ, профгигиена 2 раза в год, физиотерапия.",
		defaultLimitKopecks: 15000000,
		allowedCategories: [
			"therapy_caries",
			"therapy_pulpitis",
			"therapy_periodontitis",
			"surgery_simple",
			"surgery_complex",
			"hygiene",
			"radiology_all",
		],
		maxHygienePerYear: 2,
	},
	vip: {
		type: "vip",
		name: "VIP / Премиум стоматология",
		description: "Полный терапевтический и хирургический комплекс, КЛКТ, седация, частичная ортопедия по травме, элитные материалы.",
		defaultLimitKopecks: 40000000,
		allowedCategories: [
			"therapy_caries",
			"therapy_pulpitis",
			"therapy_periodontitis",
			"surgery_simple",
			"surgery_complex",
			"hygiene",
			"radiology_all",
			"sedation",
			"prosthetics_limited",
		],
		maxHygienePerYear: 4,
	},
};
