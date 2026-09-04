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
	{
		id: "suprastin_25",
		tradeNameRu: "Супрастин (Хлоропирамин)",
		activeSubstanceRu: "Хлоропирамин",
		category: "antihistamine",
		categoryLabelRu: "Антигистаминное / Противоотечное",
		latinRp: "Rp.: Tab. Chloropyramini 25 mg",
		formRu: "таблетки",
		dosageRu: "25 мг",
		quantityLabel: "N. 20",
		dispenseLatin: "D.t.d. N 20 in tab.",
		signaRu: "S. Внутрь по 1 таблетке (25 мг) 2-3 раза в день во время еды, 3-5 дней для снятия постоперационного отека.",
		validityDays: 60,
	},
	{
		id: "ibuprofen_400",
		tradeNameRu: "Ибупрофен (Нурофен Форте)",
		activeSubstanceRu: "Ибупрофен",
		category: "nsaid",
		categoryLabelRu: "НПВП / Анальгетик",
		latinRp: "Rp.: Ibuprofeni 400 mg",
		formRu: "таблетки, покрытые оболочкой",
		dosageRu: "400 мг",
		quantityLabel: "N. 20",
		dispenseLatin: "D.t.d. N 20 in tab.",
		signaRu: "S. Внутрь по 1 таблетке (400 мг) 2-3 раза в день после еды, запивая водой. Не более 1200 мг в сутки, курс 3-5 дней.",
		validityDays: 60,
	},
	{
		id: "miramistin_001",
		tradeNameRu: "Мирамистин 0.01%",
		activeSubstanceRu: "Бензилдиметил-миристоиламино-пропиламмоний",
		category: "antiseptic",
		categoryLabelRu: "Антисептик широкого спектра",
		latinRp: "Rp.: Sol. 'Miramistin' 0.01% - 150 ml",
		formRu: "раствор для местного применения",
		dosageRu: "0.01%",
		quantityLabel: "N. 1 (флакон)",
		dispenseLatin: "D.t.d. N 1 in flac.",
		signaRu: "S. Орошать полость рта 3-4 раза в сутки путем 3-4 нажатий на насадку-распылитель после еды, 7 дней.",
		validityDays: 60,
	},
	{
		id: "stomatophyt_100",
		tradeNameRu: "Стоматофит",
		activeSubstanceRu: "Экстракт растительный",
		category: "antiseptic",
		categoryLabelRu: "Фитопрепарат / антисептик",
		latinRp: "Rp.: Extracti 'Stomatophyt' 100 ml",
		formRu: "экстракт для приготовления раствора для местного применения",
		dosageRu: "100 мл",
		quantityLabel: "N. 1 (флакон)",
		dispenseLatin: "D.t.d. N 1 in flac.",
		signaRu: "S. Развести 7.5 мл в 1/4 стакана теплой воды, полоскать полость рта 3-4 раза в день после еды, 7-10 дней.",
		validityDays: 60,
	},
	{
		id: "amoxiclav_875_125",
		tradeNameRu: "Амоксиклав (Аугментин 875/125 мг)",
		activeSubstanceRu: "Амоксициллин + Клавулановая кислота",
		category: "antibiotic",
		categoryLabelRu: "Антибиотик (Пенициллины)",
		latinRp: "Rp.: Tab. Amoxicillini et Acidi clavulanici 875/125 mg",
		formRu: "таблетки, покрытые оболочкой",
		dosageRu: "875/125 мг",
		quantityLabel: "N. 14",
		dispenseLatin: "D.t.d. N 14 in tab.",
		signaRu: "S. Внутрь по 1 таблетке 2 раза в сутки во время еды через каждые 12 часов, курс 7 дней.",
		validityDays: 60,
	},
	{
		id: "ketorolac_10",
		tradeNameRu: "Кетанов (Кеторолак 10 мг)",
		activeSubstanceRu: "Кеторолак",
		category: "nsaid",
		categoryLabelRu: "НПВП / Анальгетик (Острая боль)",
		latinRp: "Rp.: Tab. Ketorolaci 10 mg",
		formRu: "таблетки, покрытые пленочной оболочкой",
		dosageRu: "10 мг",
		quantityLabel: "N. 10 (таблетки)",
		dispenseLatin: "D.t.d. N 10 in tab.",
		signaRu: "S. Внутрь по 1 таблетке (10 мг) при острой боли (не более 4 таблеток в сутки, курс до 5 дней).",
		validityDays: 60,
	},
];

export interface DentalFastPrescriptionPackage {
	readonly id: string;
	readonly label: string;
	readonly desc: string;
	readonly drugIds: readonly string[];
	readonly badge?: string;
}

export const DENTAL_FAST_PRESCRIPTION_PACKAGES: readonly DentalFastPrescriptionPackage[] = [
	{
		id: "post_extraction_implant",
		label: "⚡ Комплект после удаления / имплантации (Нимесил 100мг + Хлоргексидин 0.05% + Амоксиклав 875/125)",
		desc: "Нимесил 100 мг №9 + Хлоргексидин 0.05% 100 мл + Амоксиклав 875/125 мг №14 (хирургический протокол)",
		drugIds: ["nimesil_100", "chlorhexidine_005", "amoxiclav_875_125"],
		badge: "Хирургия / Удаление",
	},
	{
		id: "endo_periodontitis",
		label: "⚡ Комплект: Эндодонтия / Периодонтит (Ибупрофен 400мг + Супрастин 25мг)",
		desc: "Ибупрофен 400 мг №20 + Супрастин 25 мг №20 (противовоспалительный и противоотечный комплекс)",
		drugIds: ["ibuprofen_400", "suprastin_25"],
		badge: "Эндодонтия / Периодонтит",
	},
	{
		id: "acute_pain_express",
		label: "⚡ Экспресс-обезболивание (Кетанов / Кеторолак 10мг при острой боли)",
		desc: "Кетанов (Кеторолак) 10 мг №10 (быстрое купирование выраженного болевого синдрома)",
		drugIds: ["ketorolac_10"],
		badge: "Острая боль",
	},
];
