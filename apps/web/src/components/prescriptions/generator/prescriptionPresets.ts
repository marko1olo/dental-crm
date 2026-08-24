/**
 * DENTE Dental CRM — Russian Dental Pharmacopeia & Form 107-1/u Presets
 */

import {
	DENTAL_PRESCRIPTION_DRUG_CATALOG,
	type DentalPrescriptionDrugPreset,
} from "@dental/shared";

export interface DentalMedicationPreset {
	readonly id: string;
	readonly tradeNameRu: string;
	readonly activeSubstanceRu: string;
	readonly category: "antibiotic" | "nsaid" | "antiseptic" | "dental_gel" | "antihistamine" | "controlled_pku" | "hemostatic" | "gastroprotective" | "preferential_somatic" | "other";
	readonly categoryLabelRu: string;
	readonly latinRp: string;
	readonly formRu: string;
	readonly dosageRu: string;
	readonly quantityLabel: string;
	readonly dispenseLatin: string;
	readonly signaRu: string;
	readonly validityDays: 15 | 30 | 60 | 365;
}

export const DENTAL_MEDICATIONS_CATALOG: readonly DentalMedicationPreset[] = [
	{
		id: "amoxiclav_875",
		tradeNameRu: "Амоксиклав (Аугментин)",
		activeSubstanceRu: "Амоксициллин + Клавулановая кислота",
		category: "antibiotic",
		categoryLabelRu: "Антибиотик (Пенициллины)",
		latinRp: "Rp.: Tab. Amoxicillini et Acidi clavulanici 875/125 mg",
		formRu: "таблетки диспергируемые",
		dosageRu: "875/125 мг",
		quantityLabel: "N. 14",
		dispenseLatin: "D.t.d. N 14 in tab.",
		signaRu: "S. Внутрь по 1 таблетке 2 раза в сутки во время еды, курс 7 дней.",
		validityDays: 60,
	},
	{
		id: "amoxicillin_500",
		tradeNameRu: "Амоксициллин 500 мг (Флемоксин)",
		activeSubstanceRu: "Амоксициллин",
		category: "antibiotic",
		categoryLabelRu: "Антибиотик (Пенициллины)",
		latinRp: "Rp.: Amoxicillini 500 mg",
		formRu: "капсулы / таблетки",
		dosageRu: "500 мг",
		quantityLabel: "N. 20 (капсулы)",
		dispenseLatin: "D.t.d. N 20 in caps.",
		signaRu: "S. Внутрь по 1 капсуле (500 мг) 3 раза в день через каждые 8 часов, курс 5–7 дней.",
		validityDays: 60,
	},
	{
		id: "nimesil_100",
		tradeNameRu: "Нимесил (Нимесулид)",
		activeSubstanceRu: "Нимесулид",
		category: "nsaid",
		categoryLabelRu: "НПВП / Анальгетик",
		latinRp: "Rp.: Nimesulidi 100 mg",
		formRu: "гранулы для суспензии",
		dosageRu: "100 мг",
		quantityLabel: "N. 9 (пакетики)",
		dispenseLatin: "D.t.d. N 9 in gran.",
		signaRu: "S. Внутрь по 1 пакетику (100 мг) 2 раза в день после еды, растворив в 100 мл воды, при болях (3–5 дней).",
		validityDays: 60,
	},
	{
		id: "chlorhexidine_005",
		tradeNameRu: "Хлоргексидин 0.05%",
		activeSubstanceRu: "Хлоргексидина биглюконат",
		category: "antiseptic",
		categoryLabelRu: "Антисептик",
		latinRp: "Rp.: Sol. Chlorhexidini bigluconatis 0.05% - 100 ml",
		formRu: "раствор для местного применения",
		dosageRu: "0.05%",
		quantityLabel: "N. 1 (флакон)",
		dispenseLatin: "D.t.d. N 1",
		signaRu: "S. Ротовые ванночки по 1 минуте 3 раза в день после еды, 7 дней (не полоскать активно!).",
		validityDays: 60,
	},
	{
		id: "holisal_gel",
		tradeNameRu: "Холисал гель",
		activeSubstanceRu: "Холина салицилат + Цеталкония хлорид",
		category: "dental_gel",
		categoryLabelRu: "Стоматологический гель",
		latinRp: "Rp.: Gel. 'Cholisal' 10.0",
		formRu: "гель стоматологический",
		dosageRu: "10 г",
		quantityLabel: "N. 1 (туба)",
		dispenseLatin: "D.t.d. N 1 in gel.",
		signaRu: "S. Наносить на десну чистым пальцем полоской 1 см 2–3 раза в день за 15 минут до еды.",
		validityDays: 60,
	},
	{
		id: "cetirizine_10",
		tradeNameRu: "Цетрин (Цетиризин)",
		activeSubstanceRu: "Цетиризин",
		category: "antihistamine",
		categoryLabelRu: "Антигистаминное (противоотечное)",
		latinRp: "Rp.: Tab. Cetirizini 10 mg",
		formRu: "таблетки",
		dosageRu: "10 мг",
		quantityLabel: "N. 10",
		dispenseLatin: "D.t.d. N 10 in tab.",
		signaRu: "S. Внутрь по 1 таблетке 1 раз в сутки вечером, 3–5 дней для уменьшения постоперационного отека.",
		validityDays: 60,
	},
	{
		id: "tramadol_50",
		tradeNameRu: "Трамадол (Трамал)",
		activeSubstanceRu: "Трамадол",
		category: "controlled_pku",
		categoryLabelRu: "Опиоидный анальгетик (ПКУ)",
		latinRp: "Rp.: Tramadoli 50 mg",
		formRu: "капсулы",
		dosageRu: "50 мг",
		quantityLabel: "N. 10 (капсулы)",
		dispenseLatin: "D.t.d. N 10 in caps.",
		signaRu: "S. Внутрь по 1 капсуле (50 мг) при выраженном болевом синдроме (строго ПКУ).",
		validityDays: 15,
	},
	{
		id: "tranexamic_500",
		tradeNameRu: "Транексам (Транексамовая кислота)",
		activeSubstanceRu: "Транексамовая кислота",
		category: "hemostatic",
		categoryLabelRu: "Гемостатик",
		latinRp: "Rp.: Acidi tranexamici 500 mg",
		formRu: "таблетки, покрытые оболочкой",
		dosageRu: "500 мг",
		quantityLabel: "N. 10",
		dispenseLatin: "D.t.d. N 10 in tab.",
		signaRu: "S. Внутрь по 1 таблетке 3 раза в день при кровоточивости лунки, 2-3 дня.",
		validityDays: 60,
	},
];
