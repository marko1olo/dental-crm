/**
 * emkAnesthesiaPresets.ts — Chairside 1-click anesthesia presets for EMK
 * Mandates 8e (Doctor Autonomy), 8n (Solo Doctor), 8x (Clear Clinical Language), 8y (Zero Pharma Paranoia)
 * Exactly 3 canonical presets: Articaine 1:100k, Articaine 1:200k, Mepivacaine 3% plain.
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
		key: "ultracain_ds_forte",
		title: "Септанест 1:100 000 (1.7 мл)",
		shortLabel: "Септанест 1:100 000",
		clinicalNote:
			"Инфильтрационная анестезия Sol. Septanest 1:100 000 (Артикаин 4% + Адреналин 1:100 000) — 1.7 мл. Анестезия наступила через 3 минуты, без осложнений.",
		procedureCode: "anes-conduction-forte",
		priceRub: 1100,
	},
	{
		key: "ultracain_ds",
		title: "Ультракаин Д-С 1:200 000 (1.7 мл)",
		shortLabel: "Ультракаин Д-С 1:200 000",
		clinicalNote:
			"Инфильтрационная анестезия Sol. Ultracaini D-S 1:200 000 (Артикаин 4% + Адреналин 1:200 000) — 1.7 мл. Анестезия наступила через 3 минуты, без осложнений.",
		procedureCode: "anes-infiltration-standard",
		priceRub: 950,
	},
	{
		key: "scandonest_3",
		title: "Скандонест 3% (без адреналина) 1.8 мл",
		shortLabel: "Скандонест 3% (без адреналина)",
		clinicalNote:
			"Инфильтрационная анестезия Sol. Scandonest 3% (без адреналина) — 1.8 мл. Анестезия наступила через 3 минуты, без осложнений.",
		procedureCode: "anes-plain-mepivacaine",
		priceRub: 1050,
		isAdrenalineFree: true,
	},
];
