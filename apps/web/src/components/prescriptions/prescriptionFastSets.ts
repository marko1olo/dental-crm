/**
 * prescriptionFastSets.ts — Clinical 1-Click Fast Prescription Packages
 * DENTE Dental CRM (Doctor Autonomy Mandates 8e, 8n, 8x, 8y & Mandate 8b Sweet Spot 200–350 lines).
 */

export interface DentalFastPrescriptionSet {
	readonly id: string;
	readonly label: string;
	readonly desc: string;
	readonly drugIds: readonly string[];
}

export const CORE_FAST_PRESCRIPTION_SETS: readonly DentalFastPrescriptionSet[] = [
	{
		id: "post_surgery_periodontitis",
		label: "«После сложного удаления»",
		desc: "Нимесил 100 мг 2 р/д (3 дня) + Хлоргексидин 0.05% ротовые ванночки",
		drugIds: ["nimesulide_100", "chlorhexidine_005"],
	},
	{
		id: "antibiotic_periodontitis",
		label: "«Антибиотикотерапия (Периостит / Периодонтит)»",
		desc: "Амоксиклав 1000 мг 2 р/д (7 дн.) + Линекс Форте (пробиотик)",
		drugIds: ["amoxiclav_875_125", "linex_forte"],
	},
	{
		id: "anti_inflammatory_course",
		label: "«Обезболивание (НПВС)»",
		desc: "Кеторол Экспресс 10 мг / Ибупрофен 400 мг при болях",
		drugIds: ["ketorolac_10", "ibuprofen_400"],
	},
	{
		id: "penicillin_allergy",
		label: "При аллергии на пенициллины (Азитромицин)",
		desc: "Азитромицин 500 мг 1 р/д (3 дн.) + Ибупрофен 400 мг + Мирамистин 0.01%",
		drugIds: ["azithromycin_500", "ibuprofen_400", "miramistin_001"],
	},
	{
		id: "pediatric_dental",
		label: "Детский стоматологический (Ибупрофен)",
		desc: "Ибупрофен суспензия 100 мг/5 мл с авторасчетом по весу (10 мг/кг)",
		drugIds: ["ibuprofen_suspension_100_5ml"],
	},
	{
		id: "full_dental_quad_complex",
		label: "Комплекс: Антибиотик + Пробиотик + НПВС + Антисептик",
		desc: "Амоксиклав 875/125 мг + Линекс Форте + Найз 100 мг + Хлоргексидин 0.05% ванночки",
		drugIds: [
			"amoxiclav_875_125",
			"linex_forte",
			"nimesulide_100",
			"chlorhexidine_005",
		],
	},
	{
		id: "amoxicillin_standard_course",
		label: "Стандартный курс: Амоксициллин 500 мг + Ибупрофен 400 мг",
		desc: "Амоксициллин 500 мг 3 р/д (7 дн.) + Ибупрофен 400 мг + Хлоргексидин 0.05%",
		drugIds: [
			"amoxicillin_500",
			"ibuprofen_400",
			"chlorhexidine_005",
		],
	},
	{
		id: "amoxiclav_625_course",
		label: "Курс: Амоксиклав 625 мг + Линекс + Нимесулид",
		desc: "Амоксиклав 625 мг 3 р/д (5 дн.) + Линекс Форте + Нимесулид 100 мг при болях",
		drugIds: ["amoxiclav_625", "linex_forte", "nimesulide_100"],
	},
	{
		id: "penicillin_allergy_reserve",
		label: "Резерв при аллергии на пенициллины (Кларитромицин)",
		desc: "Кларитромицин 500 мг 1 р/д (5-7 дн.) + Найз 100 мг + Хлоргексидин 0.05%",
		drugIds: ["clarithromycin_500", "nimesulide_100", "chlorhexidine_005"],
	},
	{
		id: "post_extraction_complex",
		label: "После сложного удаления (Амоксиклав + Нимесил + Хлоргексидин)",
		desc: "Амоксиклав 875/125 мг 2 р/д (7 дн.) + Нимесил 100 мг при болях + Хлоргексидин 0.05% ванночки",
		drugIds: ["amoxiclav_875_125", "nimesulide_100", "chlorhexidine_005"],
	},
	{
		id: "acute_periodontitis",
		label: "При остром периодонтите",
		desc: "Амоксиклав 875/125 мг + Нимесил 100 мг + Хлоргексидин 0.05% (купирование острой одонтогенной инфекции)",
		drugIds: ["amoxiclav_875_125", "nimesulide_100", "chlorhexidine_005"],
	},
];

export const EXTENDED_FAST_PRESCRIPTION_SETS: readonly DentalFastPrescriptionSet[] = [
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

export const DENTAL_FAST_PRESCRIPTION_SETS: readonly DentalFastPrescriptionSet[] = [
	...CORE_FAST_PRESCRIPTION_SETS,
	...EXTENDED_FAST_PRESCRIPTION_SETS,
];
