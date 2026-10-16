/**
 * packages/shared/src/clinical/prescriptionRxSets.ts
 *
 * 1-Click Dental Prescription Presets (Clinical Protocols)
 * Standardized regimens for outpatient dental surgeries, pericoronitis, and oral mucosa diseases.
 */

export interface DentalRxPreset {
	readonly id: string;
	readonly code: string;
	readonly titleRu: string;
	readonly clinicalIndicationRu: string;
	readonly descriptionRu: string;
	readonly drugIds: readonly string[];
	readonly icd10Codes: readonly string[];
	readonly durationDays: number;
}

export const DENTAL_1CLICK_RX_SETS: readonly DentalRxPreset[] = [
	{
		id: "rx_set_surgery_periodontitis",
		code: "POST_SURGERY_PERIODONTITIS",
		titleRu: "«После хирургии / периодонтита»",
		clinicalIndicationRu: "Хирургическое удаление, альвеолотомия, пластика, обострение периодонтита",
		descriptionRu: "Амоксиклав 875/125 мг 2 р/д 5 дней + Нимесил 100 мг при болях + Хлоргексидин 0.05% ротовые ванночки",
		drugIds: [
			"amoxiclav_875_125",
			"nimesil_100_sachet",
			"chlorhexidine_005_sol",
		],
		icd10Codes: ["K04.7", "K05.2", "K08.1", "T81.0"],
		durationDays: 5,
	},
	{
		id: "rx_set_penicillin_allergy",
		code: "PENICILLIN_ALLERGY_ALTERNATIVE",
		titleRu: "«При аллергии на пенициллины»",
		clinicalIndicationRu: "Антибактериальная терапия у пациентов с непереносимостью пенициллинов / бета-лактамов",
		descriptionRu: "Ципрофлоксацин 500 мг 2 р/д (или Линкомицин 500 мг 3 р/д) + Ибупрофен 400 мг",
		drugIds: [
			"ciprofloxacin_500",
			"ibuprofen_400_tab",
		],
		icd10Codes: ["K04.7", "K05.2", "Z88.0"],
		durationDays: 5,
	},
	{
		id: "rx_set_anti_inflammatory",
		code: "ANTI_INFLAMMATORY_COURSE",
		titleRu: "«Противовоспалительный курс»",
		clinicalIndicationRu: "Асептическое воспаление, выраженный отек, послеоперационный период",
		descriptionRu: "Нимесулид 100 мг 2 р/д 3-5 дней + Супрастин 25 мг на ночь",
		drugIds: [
			"nimesil_100_sachet",
			"suprastin_25_tab",
		],
		icd10Codes: ["K04.0", "K05.0", "T81.0"],
		durationDays: 3,
	},
	{
		id: "rx_set_pediatric_dental",
		code: "PEDIATRIC_DENTAL",
		titleRu: "«Детский стоматологический»",
		clinicalIndicationRu: "Обезболивание и снятие воспаления у детей при пульпите, периодонтите или после удаления",
		descriptionRu: "Ибупрофен суспензия 100 мг/5 мл с авторасчетом дозы по весу ребенка (10 мг/кг)",
		drugIds: [
			"ibuprofen_suspension_100_5ml",
		],
		icd10Codes: ["K02.1", "K04.0", "K04.7"],
		durationDays: 3,
	},
	{
		id: "rx_set_post_op_implant_surgery",
		code: "POST_OP_IMPLANT",
		titleRu: "Назначение после сложного удаления / имплантации",
		clinicalIndicationRu: "Атипичное удаление зуба, костная пластика, синус-лифтинг, дентальная имплантация",
		descriptionRu: "Антибиотик (Амоксиклав 875+125 мг) + НПВП (Нимесил 100 мг) + Антисептик полоскание (Хлоргексидин 0.05%) + Гастропротекция (Омепразол 20 мг)",
		drugIds: [
			"amoxiclav_875_125",
			"nimesil_100_sachet",
			"chlorhexidine_005_sol",
			"omeprazole_20_caps",
		],
		icd10Codes: ["K08.1", "T81.0", "M27.8"],
		durationDays: 7,
	},
	{
		id: "rx_set_pericoronitis_periodontitis",
		code: "PERICORONITIS_PERIODONTITIS",
		titleRu: "Назначение при остром перикороните / периодонтите",
		clinicalIndicationRu: "Острый перикоронит нижнего третьего моляра (8-ки), обострение хронического периодонтита",
		descriptionRu: "Комбинированный антибиотик (Цифран СТ) + НПВП (Нимесил 100 мг) + Антисептические ванночки (Мирамистин 0.01%) + Стоматологический гель (Холисал)",
		drugIds: [
			"cyfran_st_500_600",
			"nimesil_100_sachet",
			"miramistin_001_sol",
			"cholisal_10_gel",
		],
		icd10Codes: ["K05.2", "K05.3", "K04.7"],
		durationDays: 5,
	},
	{
		id: "rx_set_stomatitis_gingivitis",
		code: "STOMATITIS_GINGIVITIS",
		titleRu: "Назначение при стоматите / гингивите",
		clinicalIndicationRu: "Катаральный и язвенный гингивит, афтозный стоматит, эрозии слизистой оболочки полости рта",
		descriptionRu: "Антисептическая обработка (Мирамистин 0.01%) + Обезболивающий гель (Холисал 10 г) + Противомикробный гель (Метрогил Дента 20 г)",
		drugIds: [
			"miramistin_001_sol",
			"cholisal_10_gel",
			"metrogyl_denta_20_gel",
		],
		icd10Codes: ["K05.0", "K05.1", "K12.0"],
		durationDays: 7,
	},
	{
		id: "rx_set_alveolitis_dry_socket",
		code: "ALVEOLITIS_DRY_SOCKET",
		titleRu: "Назначение при альвеолите / сухой лунке",
		clinicalIndicationRu: "Постэкстракционный альвеолит, распад кровяного сгустка, луночковая боль",
		descriptionRu: "Амоксиклав 875+125 мг + Кеторол 10 мг + Хлоргексидин 0.05% + Солкосерил дентальная адгезивная паста",
		drugIds: [
			"amoxiclav_875_125",
			"ketorol_10_tab",
			"chlorhexidine_005_sol",
			"solcoseryl_dental_5_paste",
		],
		icd10Codes: ["K10.3", "T81.0"],
		durationDays: 5,
	},
	{
		id: "rx_set_acute_pulpitis_relief",
		code: "PULPITIS_RELIEF",
		titleRu: "Купирование острой боли при пульпите",
		clinicalIndicationRu: "Острый очаговый и диффузный пульпит до эндодонтического вмешательства",
		descriptionRu: "Нимесил 100 мг + Супрастин 25 мг (снятие сосудистого отека пульпы) + Омепразол 20 мг",
		drugIds: [
			"nimesil_100_sachet",
			"suprastin_25_tab",
			"omeprazole_20_caps",
		],
		icd10Codes: ["K04.0"],
		durationDays: 3,
	},
] as const;
