import {
	DENTAL_PRESCRIPTION_DRUG_CATALOG,
	DENTAL_CANONICAL_SSOT_MEDICATIONS,
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
		id: "post_surgery_periodontitis",
		label: "«После хирургии / периодонтита»",
		desc: "Амоксиклав 875/125 мг 2 р/д 5 дней + Нимесил 100 мг при болях + Хлоргексидин 0.05% ротовые ванночки",
		drugIds: ["amoxiclav_875_125", "nimesulide_100", "chlorhexidine_005"],
	},
	{
		id: "penicillin_allergy",
		label: "«При аллергии на пенициллины»",
		desc: "Ципрофлоксацин 500 мг 2 р/д (или Линкомицин) + Ибупрофен 400 мг при болях",
		drugIds: ["ciprofloxacin_500", "ibuprofen_400"],
	},
	{
		id: "anti_inflammatory_course",
		label: "«Противовоспалительный курс»",
		desc: "Нимесулид 100 мг 2 р/д 3-5 дней + Супрастин 25 мг на ночь (купирование отека)",
		drugIds: ["nimesulide_100", "suprastin_25"],
	},
	{
		id: "pediatric_dental",
		label: "«Детский стоматологический»",
		desc: "Ибупрофен суспензия 100 мг/5 мл с авторасчетом дозы по весу ребенка (10 мг/кг)",
		drugIds: ["ibuprofen_suspension_100_5ml"],
	},
	{
		id: "post_op_implant_surgery",
		label: "«После сложного удаления / имплантации»",
		desc: "Амоксиклав 875/125 мг №14 + Нимесил 100 мг №9 + Хлоргексидин 0.05% 100 мл + Омепразол 20 мг №20 (хирургический протокол)",
		drugIds: ["amoxiclav_875_125", "nimesulide_100", "chlorhexidine_005", "omeprazole_20"],
	},
	{
		id: "acute_pericoronitis_periodontitis",
		label: "«Острый перикоронит / периодонтит»",
		desc: "Цифран СТ (500+600 мг) №10 + Нимесил 100 мг №9 + Холисал гель 10 г + Хлоргексидин 0.05% 100 мл",
		drugIds: ["cyfran_st", "nimesulide_100", "cholisal_gel", "chlorhexidine_005"],
	},
	{
		id: "stomatitis_gingivitis",
		label: "«Стоматит / гингивит (слизистая)»",
		desc: "Хлоргексидин 0.05% 100 мл + Холисал стоматологический гель 10 г + Метрогил Дента 20 г",
		drugIds: ["cholisal_gel", "chlorhexidine_005", "metrogyl_denta"],
	},
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
	{
		id: "standard_anti_inflammatory_course",
		label: "«Стандартный противовоспалительный курс»",
		desc: "Амоксиклав 875/125 мг + Нимесил 100 мг + Хлоргексидин 0.05% (комплексная терапия)",
		drugIds: ["amoxiclav_875_125", "nimesulide_100", "chlorhexidine_005"],
	},
	{
		id: "post_extraction_surgery",
		label: "«После удаления / хирургии»",
		desc: "Амоксиклав 875/125 мг + Нимесил 100 мг + Супрастин 25 мг (хирургический протокол)",
		drugIds: ["amoxiclav_875_125", "nimesulide_100", "suprastin_25"],
	},
	{
		id: "anti_inflammatory",
		label: "«Противовоспалительный»",
		desc: "Ибупрофен 400 мг + Хлоргексидин 0.05%",
		drugIds: ["ibuprofen_400", "chlorhexidine_005"],
	},
	{
		id: "antiseptic_rinsing",
		label: "«Антисептический / полоскания»",
		desc: "Мирамистин 0.01% + Стоматофит",
		drugIds: ["miramistin_001", "stomatophyt_100"],
	},
	{
		id: "periostitis_osteotropic",
		label: "«Периостит / Остеотропный комплекс»",
		desc: "Линкомицин 500 мг + Метронидазол 500 мг",
		drugIds: ["lincomycin_500", "metronidazole_500"],
	},
	{
		id: "pediatric_analgesic",
		label: "«Детский / Стоматит & Боль»",
		desc: "Ибупрофен 400 мг + Холисал гель",
		drugIds: ["ibuprofen_400", "cholisal_gel"],
	},
];

import { DENTAL_DRUG_ID_ALIASES } from "@dental/shared";

export const DENTAL_OUTPATIENT_EXTENDED_DRUGS: readonly DentalPrescriptionDrugPreset[] = [];

/**
 * Canonical SSOT Prescription Catalog builder.
 * Aggregates all outpatient dental drugs from @dental/shared SSOT with zero frontend hardcoded arrays.
 */
export function buildMergedPrescriptionCatalog(): DentalPrescriptionDrugPreset[] {
	const map = new Map<string, DentalPrescriptionDrugPreset>();

	// 1. Primary: Canonical SSOT Outpatient Medications from @dental/shared
	for (const ssot of DENTAL_CANONICAL_SSOT_MEDICATIONS) {
		const preset: DentalPrescriptionDrugPreset = {
			id: ssot.id,
			tradeNameRu: ssot.tradeNameRu,
			activeSubstanceRu: ssot.activeSubstanceRu,
			category: ssot.category as any,
			categoryLabel: ssot.categoryLabelRu,
			categoryLabelRu: ssot.categoryLabelRu,
			latinRp: ssot.latinRp,
			formRu: ssot.formRu,
			dosageRu: ssot.dosageRu,
			quantityLabel: ssot.quantityDefault,
			dispenseLatin: ssot.dispenseLatin,
			signaRu: ssot.signaRu,
			validityDays: (ssot.validityDays as any) || 60,
			recommendedForIcd10: ["K02", "K04", "K05", "K10", "T81"],
		};
		map.set(ssot.id, preset);
	}

	// 2. Secondary: DENTAL_PRESCRIPTION_DRUG_CATALOG from @dental/shared
	for (const drug of DENTAL_PRESCRIPTION_DRUG_CATALOG) {
		if (!map.has(drug.id)) {
			map.set(drug.id, drug);
		}
	}

	// 3. Register aliases from DENTAL_DRUG_ID_ALIASES so legacy IDs resolve seamlessly
	for (const [alias, canonicalId] of Object.entries(DENTAL_DRUG_ID_ALIASES)) {
		const target = map.get(canonicalId);
		if (target && !map.has(alias)) {
			map.set(alias, { ...target, id: alias });
		}
	}

	return Array.from(map.values());
}

