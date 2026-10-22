/**
 * prescriptionFastSetsExtended.ts — Extended Clinical Prescription Sets
 * Conforms to Mandate 8b (<= 120 lines).
 */

import type { DentalFastPrescriptionSet } from "./prescriptionFastSetsCore";

export const EXTENDED_FAST_PRESCRIPTION_SETS: readonly DentalFastPrescriptionSet[] =
	[
		{
			id: "pericoronitis_cyfran",
			label: "«Периодонтит / сложная хирургия (Цифран СТ)»",
			desc: "Цифран СТ (500+600 мг) 2 р/д (5 дн.) + Найз 100 мг при болях + Хлоргексидин 0.05%",
			drugIds: ["cyfran_st", "nimesulide_100", "chlorhexidine_005"],
		},
		{
			id: "acute_pain_relief",
			label: "«Купирование острой боли (Кеторол Экспресс)»",
			desc: "Кеторол Экспресс 10 мг при острой боли (до 4 таб/сут) + Хлоргексидин 0.05%",
			drugIds: ["ketorolac_10", "chlorhexidine_005"],
		},
		{
			id: "standard_anti_inflammatory_course",
			label: "«Стандартный противовоспалительный курс»",
			desc: "Амоксиклав 875/125 мг 2 р/д + Нимесил 100 мг + Хлоргексидин 0.05%",
			drugIds: ["amoxiclav_875_125", "nimesulide_100", "chlorhexidine_005"],
		},
		{
			id: "post_extraction_surgery",
			label: "«После удаления / хирургии»",
			desc: "Амоксиклав 875/125 мг + Нимесил 100 мг + Супрастин 25 мг",
			drugIds: ["amoxiclav_875_125", "nimesulide_100", "suprastin_25"],
		},
		{
			id: "post_tooth_extraction",
			label: "«После удаления зуба (хирургический протокол)»",
			desc: "Ибупрофен 400 мг + Хлоргексидин 0.05% + Супрастин 25 мг",
			drugIds: ["ibuprofen_400", "chlorhexidine_005", "suprastin_25"],
		},
		{
			id: "amoxiclav_first_line",
			label: "«Антибиотик после удаления» (Амоксиклав)",
			desc: "Амоксиклав 875/125 мг по 1 таб. 2 раза в день 5–7 дней",
			drugIds: ["amoxiclav_875_125"],
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
			desc: "Мирамистин 0.01% + Стоматофит 100 мл",
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
			desc: "Ибупрофен 400 мг + Холисал стоматологический гель",
			drugIds: ["ibuprofen_400", "cholisal_gel"],
		},
		{
			id: "analgesia_nimesil",
			label: "«Анальгетик / НПВП (Нимесил)»",
			desc: "Нимесил 100 мг по 1 пакетику 2 раза в день при болях",
			drugIds: ["nimesulide_100"],
		},
		{
			id: "pulpitis_acute_relief",
			label: "«Пульпит (купирование острой боли)»",
			desc: "Нимесил 100 мг + Хлоргексидин 0.05%",
			drugIds: ["nimesulide_100", "chlorhexidine_005"],
		},
		{
			id: "alveolitis_dry_socket",
			label: "«Альвеолит / Сухая лунка»",
			desc: "Амоксиклав 875/125 мг + Нимесил 100 мг + Холисал гель + Хлоргексидин 0.05%",
			drugIds: [
				"amoxiclav_875_125",
				"nimesulide_100",
				"cholisal_gel",
				"chlorhexidine_005",
			],
		},
		{
			id: "post_op_implant_surgery",
			label: "«После сложного удаления / имплантации»",
			desc: "Амоксиклав 875/125 мг + Нимесил 100 мг + Хлоргексидин 0.05% + Омепразол 20 мг",
			drugIds: [
				"amoxiclav_875_125",
				"nimesulide_100",
				"chlorhexidine_005",
				"omeprazole_20",
			],
		},
		{
			id: "stomatitis_gingivitis",
			label: "«Стоматит / гингивит (слизистая)»",
			desc: "Хлоргексидин 0.05% + Холисал стоматологический гель + Метрогил Дента",
			drugIds: ["cholisal_gel", "chlorhexidine_005", "metrogyl_denta"],
		},
	];
