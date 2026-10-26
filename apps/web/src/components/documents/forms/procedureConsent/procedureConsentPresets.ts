/**
 * forms/procedureConsent/procedureConsentPresets.ts
 * Clinical preset categories for procedure consent (Mandate 8b <= 120 lines, Mandate 8x)
 */

import type { ProcedureSpecificConsentProcedure } from "@dental/shared";

export interface PresetButtonDef {
	type: ProcedureSpecificConsentProcedure;
	label: string;
}

export interface PresetCategoryDef {
	id: string;
	title: string;
	buttons: PresetButtonDef[];
}

export const PRESET_CATEGORIES: PresetCategoryDef[] = [
	{
		id: "therapy",
		title: "Терапия & Эндодонтия",
		buttons: [
			{ type: "superficial_medium_caries", label: "Кариес (пов./средний)" },
			{ type: "deep_caries", label: "Глубокий кариес" },
			{ type: "pulpitis_endodontics", label: "Пульпит & Эндодонтия" },
			{ type: "therapy_endo_restoration", label: "Терапия / Реставрация" },
		],
	},
	{
		id: "surgery",
		title: "Хирургия & Имплантация",
		buttons: [
			{ type: "surgery_extraction", label: "Удаление зуба" },
			{ type: "implantation", label: "Имплантация" },
			{ type: "sinus_lifting", label: "Синус-лифтинг" },
			{ type: "bone_grafting", label: "Костная пластика / НКР" },
			{ type: "sedation", label: "Седация (ЗАКС / в/в)" },
			{ type: "local_anesthesia", label: "Местная анестезия" },
		],
	},
	{
		id: "prosthetics",
		title: "Ортопедия & Эстетика",
		buttons: [
			{ type: "veneers", label: "Виниры" },
			{ type: "fixed_prosthetics", label: "Несъемные коронки/мосты" },
			{ type: "removable_prosthetics", label: "Съемные протезы" },
		],
	},
	{
		id: "periodontics_hygiene",
		title: "Пародонтология, Гигиена & Ортодонтия",
		buttons: [
			{ type: "professional_hygiene", label: "Проф.гигиена" },
			{ type: "teeth_whitening", label: "Отбеливание зубов" },
			{ type: "periodontology", label: "Пародонтология" },
			{ type: "orthodontics", label: "Брекет-система" },
			{ type: "aligners", label: "Элайнеры (каппы)" },
		],
	},
	{
		id: "diagnostics_legal",
		title: "Диагностика, Дети & Правовые формы",
		buttons: [
			{ type: "xray_cbct", label: "Рентген & КЛКТ" },
			{ type: "photoprotocol", label: "Фотопротокол" },
			{ type: "minor_general", label: "Несовершеннолетний (представитель)" },
			{ type: "egisz_refusal", label: "Отказ от передачи в ЕГИСЗ" },
			{ type: "medical_intervention_refusal", label: "Отказ от медвмешательства" },
			{ type: "warranty_policy", label: "Гарантийные обязательства" },
		],
	},
];
