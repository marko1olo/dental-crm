/**
 * emkAnesthesiaPresets.ts — Chairside 1-click anesthesia presets for EMK
 * Mandates 8e (Doctor Autonomy), 8n (Solo Doctor), 8x (Clear Clinical Language)
 */

export interface EmkAnesthesiaPreset {
	readonly key: string;
	readonly title: string;
	readonly shortLabel: string;
	readonly clinicalNote: string;
	readonly procedureCode: string;
	readonly priceRub: number;
	readonly isAdrenalineFree?: boolean;
}

export const EMK_ANESTHESIA_PRESETS: readonly EmkAnesthesiaPreset[] = [
	{
		key: "ultracain_ds",
		title: "Ультракаин Д-С (1:200 000) 1.7 мл",
		shortLabel: "Ультракаин Д-С (1:200 000) 1.7 мл",
		clinicalNote:
			"Инфильтрационная анестезия Sol. Ultracaini D-S 1:200 000 — 1.7 мл. Анестезия наступила через 3 минуты, без осложнений.",
		procedureCode: "anes-infiltration-standard",
		priceRub: 950,
	},
	{
		key: "ultracain_ds_forte",
		title: "Ультракаин Д-С форте (1:100 000) 1.7 мл",
		shortLabel: "Ультракаин Д-С форте (1:100 000) 1.7 мл",
		clinicalNote:
			"Инфильтрационная анестезия Sol. Ultracaini D-S Forte 1:100 000 — 1.7 мл. Анестезия наступила через 3 минуты, без осложнений.",
		procedureCode: "anes-conduction-forte",
		priceRub: 1100,
	},
	{
		key: "scandonest_3",
		title: "Скандонест 3% (без адреналина) 1.8 мл",
		shortLabel: "Скандонест 3% (без адреналина) 1.8 мл",
		clinicalNote:
			"Инфильтрационная анестезия Sol. Scandonest 3% (без адреналина) — 1.8 мл. Анестезия наступила через 3 минуты, без осложнений.",
		procedureCode: "anes-plain-mepivacaine",
		priceRub: 1050,
		isAdrenalineFree: true,
	},
	{
		key: "ubistesin_1_7",
		title: "Убистезин 1.7 мл",
		shortLabel: "Убистезин 1.7 мл",
		clinicalNote:
			"Инфильтрационная анестезия Sol. Ubistesin 1:200 000 — 1.7 мл. Анестезия наступила через 3 минуты, без осложнений.",
		procedureCode: "anes-ubistesin-standard",
		priceRub: 1000,
	},
];
