import {
	DENTAL_PRESCRIPTION_DRUG_CATALOG,
	type DentalPrescriptionDrugPreset,
} from "@dental/shared";
import { DENTAL_MEDICATIONS_CATALOG } from "./generator";

export interface DentalFastPrescriptionSet {
	readonly id: string;
	readonly label: string;
	readonly desc: string;
	readonly drugIds: readonly string[];
}

export const DENTAL_FAST_PRESCRIPTION_SETS: readonly DentalFastPrescriptionSet[] = [
	{
		id: "pulpitis_acute_relief",
		label: "«Пульпит (купирование острой боли и воспаления)»",
		desc: "Нимесил 100 мг №9 + Омепразол 20 мг №20 + Хлоргексидин 0.05% 100 мл (купирование острой боли и асептического воспаления пульпы)",
		drugIds: ["nimesulide_100", "chlorhexidine_005"],
	},
	{
		id: "alveolitis_dry_socket",
		label: "«Альвеолит / Сухая лунка (постэкстракционный синдром)»",
		desc: "Амоксиклав 875/125 мг №14 + Нимесил 100 мг №9 + Холисал гель 10 г + Хлоргексидин 0.05% 100 мл (протокол лечения альвеолита)",
		drugIds: ["amoxiclav_875_125", "nimesulide_100", "cholisal_gel", "chlorhexidine_005"],
	},
	{
		id: "post_tooth_extraction",
		label: "«После удаления зуба (хирургический протокол)»",
		desc: "Ибупрофен 400 мг №20 + Хлоргексидин 0.05% 100 мл + Супрастин 25 мг №20 (противоболевой, антисептический и противоотечный комплекс)",
		drugIds: ["ibuprofen_400", "chlorhexidine_005", "suprastin_25"],
	},
	{
		id: "amoxiclav_first_line",
		label: "«Антибиотик первого ряда (Амоксиклав 875+125 мг)»",
		desc: "Rp: Amoxicillini + Acidi clavulanici 875/125mg, D.t.d. N 14 in tab., S. По 1 таблетке 2 раза в день во время еды 7 дней.",
		drugIds: ["amoxiclav_875_125"],
	},
	{
		id: "cyfran_st_pericoronitis",
		label: "«Цифран СТ (500+600 мг) / Перикоронит»",
		desc: "Rp: Tab. 'Cifran ST' (Ciprofloxacini 500mg + Tinidazoli 600mg), D.t.d. N 10 in tab., S. По 1 таблетке 2 раза в сутки после еды (каждые 12 ч), 5 дней.",
		drugIds: ["cyfran_st"],
	},
	{
		id: "analgesia_nimesil",
		label: "«НПВП / Обезболивающее при острой боли (Нимесил 100 мг)»",
		desc: "Rp: Nimesulidi 100mg, D.t.d. N 10 in gran., S. По 1 пакетику 2 раза в день после еды, растворив в 100 мл воды, до 5 дней.",
		drugIds: ["nimesulide_100"],
	},
	{
		id: "ibuprofen_moderate_pain",
		label: "«Обезболивающее умеренное (Ибупрофен 400 мг)»",
		desc: "Rp: Ibuprofeni 400mg, D.t.d. N 20 in tab., S. По 1 таб. при болях, не более 3 таб. в сутки.",
		drugIds: ["ibuprofen_400"],
	},
	{
		id: "ketorolac_acute_pain",
		label: "«Кеторолак (Кетанов 10 мг) / Острая боль»",
		desc: "Rp: Ketorolaci 10mg, D.t.d. N 10 in tab., S. По 1 таблетке при острой боли (не более 4 таб./сутки, курс до 3-5 дней).",
		drugIds: ["ketorolac_10"],
	},
	{
		id: "chlorhexidine_antiseptic_rinse",
		label: "«Хлоргексидин 0.05% / Антисептическое полоскание»",
		desc: "Rp: Sol. Chlorhexidini bigluconatis 0.05% 100ml, D.t.d. N 1, S. Полоскать полость рта 10-15 мл в течение 1 мин 2-3 раза в день 5-7 дней.",
		drugIds: ["chlorhexidine_005"],
	},
	{
		id: "cholisal_mucosa_gel",
		label: "«Холисал стоматологический гель / Слизистая»",
		desc: "Rp: Gel 'Cholisal' 10.0, D.t.d. N 1 in tub., S. Наносить на десну полоску геля длиной 1 см 2-3 раза в день до еды или после чистки зубов.",
		drugIds: ["cholisal_gel"],
	},
	{
		id: "suprastin_edema_prophylaxis",
		label: "«Супрастин 25 мг / Противоотечный комплекс»",
		desc: "Rp: Chloropyramini 25mg, D.t.d. N 20 in tab., S. По 1 таблетке на ночь в течение 3 дней после хирургического вмешательства.",
		drugIds: ["suprastin_25"],
	},
	{
		id: "omeprazole_gi_protection",
		label: "«Омепразол 20 мг / Гастропротекция при приеме НПВП»",
		desc: "Rp: Omeprazoli 20mg, D.t.d. N 20 in caps., S. По 1 капсуле за 30 минут до завтрака 1 раз в сутки на весь период терапии НПВП.",
		drugIds: ["omeprazole_20"],
	},
];

export const DENTAL_OUTPATIENT_EXTENDED_DRUGS: readonly DentalPrescriptionDrugPreset[] = [
	{
		id: "cyfran_st",
		tradeNameRu: "Цифран СТ",
		activeSubstanceRu: "Ципрофлоксацин + Тинидазол",
		category: "antibiotic",
		categoryLabel: "Антибактериальные",
		categoryLabelRu: "Антибактериальные",

		latinRp: "Rp.: Tab. 'Cifran ST' (Ciprofloxacini 500 mg + Tinidazoli 600 mg)",
		formRu: "таблетки покрытые пленочной оболочкой",
		dosageRu: "500 мг + 600 мг",
		quantityLabel: "N. 10",
		dispenseLatin: "D.t.d. N 10 in tab.",
		signaRu: "S. Внутрь по 1 таблетке 2 раза в день (каждые 12 часов) после еды, запивая достаточным количеством воды. Курс 5 дней.",
		recommendedForIcd10: ["K05.2", "K05.3", "K04.7"],
		adultDosageStandard: "1 таб 2 раза в день (каждые 12 часов) 5 дней",
		pediatricDosageStandard: "Противопоказан детям и подросткам до 18 лет",
		validityDays: 60,
		specialInstructions: "Не разжевывать, запивать водой. Алкоголь категорически запрещен (тинидазол дает дисульфирамоподобную реакцию).",
	},
	{
		id: "cholisal_gel",
		tradeNameRu: "Холисал стоматологический гель",
		activeSubstanceRu: "Холина салицилат + Цеталкония хлорид",
		category: "antiseptic",
		categoryLabel: "Антисептики и регенерация",
		latinRp: "Rp.: Gel 'Cholisal' 10.0",
		formRu: "гель стоматологический для местного применения",
		dosageRu: "10 г",
		quantityLabel: "N. 1",
		dispenseLatin: "D.t.d. N 1 in tub.",
		signaRu: "S. Местно, полоску геля длиной 1 см наносить на болезненный участок десны чистым пальцем и слегка втирать 2-3 раза в день до еды или после чистки зубов.",
		recommendedForIcd10: ["K05.0", "K05.1", "K06.0", "K12.0"],
		adultDosageStandard: "Полоска 1 см 2-3 раза в день",
		pediatricDosageStandard: "Детям: полоска 0.5 см 2-3 раза в день (с 1 года)",
		validityDays: 60,
		specialInstructions: "Обезболивающий эффект наступает через 2-3 минуты и сохраняется от 2 до 8 часов.",
	},
	{
		id: "suprastin_25",
		tradeNameRu: "Супрастин",
		activeSubstanceRu: "Хлоропирамин",
		category: "antihistamine",
		categoryLabel: "Антигистаминные",
		latinRp: "Rp.: Chloropyramini 25 mg",
		formRu: "таблетки",
		dosageRu: "25 мг",
		quantityLabel: "N. 20",
		dispenseLatin: "D.t.d. N 20 in tab.",
		signaRu: "S. Внутрь по 1 таблетке 1 раз в день на ночь во время еды в течение 3 дней для уменьшения реактивного послеоперационного отека.",
		recommendedForIcd10: ["K04.7", "K10.2"],
		adultDosageStandard: "1 таб (25 мг) на ночь 3 дня",
		pediatricDosageStandard: "Детям 3-6 лет: по 1/2 таб 2 раза в день",
		validityDays: 60,
		specialInstructions: "Может вызывать седативный эффект и сонливость. Избегать управления автотранспортом.",
	},
	{
		id: "omeprazole_20",
		tradeNameRu: "Омепразол",
		activeSubstanceRu: "Омепразол",
		category: "gastroprotective",
		categoryLabel: "Гастропротекторы",
		latinRp: "Rp.: Omeprazoli 20 mg",
		formRu: "капсулы кишечнорастворимые",
		dosageRu: "20 мг",
		quantityLabel: "N. 20",
		dispenseLatin: "D.t.d. N 20 in caps.",
		signaRu: "S. Внутрь по 1 капсуле утром за 30 минут до завтрака 1 раз в сутки на весь период терапии НПВП (гастропротекция).",
		recommendedForIcd10: ["K04.0", "K04.4", "K05.2"],
		adultDosageStandard: "1 капс (20 мг) утром за 30 мин до еды",
		pediatricDosageStandard: "Детям старше 2 лет с массой тела более 20 кг: 20 мг 1 раз в сутки",
		validityDays: 60,
		specialInstructions: "Проглатывать целиком, не разжевывать и не измельчать.",
	},
];

export function buildMergedPrescriptionCatalog(): DentalPrescriptionDrugPreset[] {
	const base = DENTAL_PRESCRIPTION_DRUG_CATALOG;
	const combined = [...base];
	for (const extra of DENTAL_OUTPATIENT_EXTENDED_DRUGS) {
		if (!combined.some((d) => d.id === extra.id)) {
			combined.push(extra);
		}
	}
	for (const med of DENTAL_MEDICATIONS_CATALOG) {
		if (!combined.some((d) => d.id === med.id)) {
			combined.push({
				id: med.id,
				tradeNameRu: med.tradeNameRu,
				activeSubstanceRu: med.activeSubstanceRu,
				category: med.category as any,
				categoryLabel: med.categoryLabelRu,
				categoryLabelRu: med.categoryLabelRu,
				latinRp: med.latinRp,
				formRu: med.formRu,
				dosageRu: med.dosageRu,
				quantityLabel: med.quantityLabel,
				dispenseLatin: med.dispenseLatin,
				signaRu: med.signaRu,
				validityDays: med.validityDays,
			} as any);
		}
	}
	return combined;
}
