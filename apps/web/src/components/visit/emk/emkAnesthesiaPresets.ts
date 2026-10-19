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
		title: "Ультракаин Д-С 1:200k (1 карп.)",
		shortLabel: "Ультракаин Д-С 1:200k",
		clinicalNote:
			"Анестезия: инфильтрационная Sol. Ultracaini D-S 1:200 000 — 1.7 мл (1 карпула). Аспирационная проба отрицательная. Обезболивание глубокое.",
		procedureCode: "anes-infiltration-standard",
		priceRub: 950,
	},
	{
		key: "ultracain_ds_forte",
		title: "Ультракаин Форте 1:100k (1 карп.)",
		shortLabel: "Ультракаин Форте 1:100k",
		clinicalNote:
			"Анестезия: проводниковая/инфильтрационная Sol. Ultracaini D-S Forte 1:100 000 — 1.7 мл (1 карпула). Аспирационная проба отрицательная. Обезболивание глубокое.",
		procedureCode: "anes-conduction-forte",
		priceRub: 1100,
	},
	{
		key: "scandonest_3",
		title: "Скандонест 3% (без адреналина)",
		shortLabel: "Скандонест 3% (кардио)",
		clinicalNote:
			"Анестезия: инфильтрационная Sol. Scandonest 3% (без адреналина) — 1.7 мл (1 карпула). Аспирационная проба отрицательная. Обезболивание достаточное.",
		procedureCode: "anes-plain-mepivacaine",
		priceRub: 1050,
		isAdrenalineFree: true,
	},
];
