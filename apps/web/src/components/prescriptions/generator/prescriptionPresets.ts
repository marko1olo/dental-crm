/**
 * DENTE Dental CRM — Russian Dental Pharmacopeia & Form 107-1/u Presets
 */

export interface DentalMedicationPreset {
	readonly id: string;
	readonly tradeNameRu: string;
	readonly nameRu?: string | undefined;
	readonly activeSubstanceRu: string;
	readonly category:
		| "antibiotic"
		| "nsaid"
		| "antiseptic"
		| "dental_gel"
		| "antihistamine"
		| "controlled_pku"
		| "hemostatic"
		| "gastroprotective"
		| "preferential_somatic"
		| "anesthetic"
		| "other";
	readonly categoryLabelRu: string;
	readonly latinRp: string;
	readonly latinName?: string | undefined;
	readonly formRu: string;
	readonly dosageRu: string;
	readonly quantityLabel: string;
	readonly dispenseLatin: string;
	readonly dispenseFormula?: string | undefined;
	readonly signaRu: string;
	readonly validityDays: 15 | 30 | 60 | 365;
}

const DENTAL_MEDICATIONS_BASE: readonly DentalMedicationPreset[] = [
	{
		id: "amoxiclav_875_125",
		tradeNameRu: "Амоксиклав (Аугментин 875+125 мг)",
		activeSubstanceRu: "Амоксициллин + Клавулановая кислота",
		category: "antibiotic",
		categoryLabelRu: "Антибиотик (Пенициллины)",
		latinRp: "Rp.: Tab. Amoxicillini et Acidi clavulanici 875/125 mg",
		formRu: "таблетки диспергируемые",
		dosageRu: "875/125 мг",
		quantityLabel: "N. 14",
		dispenseLatin: "D.t.d. N 14 in tab.",
		signaRu:
			"S. Внутрь по 1 таблетке 2 раза в сутки во время еды, курс 7 дней.",
		validityDays: 60,
	},
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
		signaRu:
			"S. Внутрь по 1 таблетке 2 раза в сутки во время еды, курс 7 дней.",
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
		signaRu:
			"S. Внутрь по 1 капсуле (500 мг) 3 раза в день через каждые 8 часов, курс 5–7 дней.",
		validityDays: 60,
	},
	{
		id: "clarithromycin_500",
		tradeNameRu: "Кларитромицин 500 мг (Клацид)",
		activeSubstanceRu: "Кларитромицин",
		category: "antibiotic",
		categoryLabelRu: "Антибиотик резерва (Макролид при аллергии на пенициллин)",
		latinRp: "Rp.: Clarithromycini 500 mg",
		formRu: "таблетки, покрытые оболочкой",
		dosageRu: "500 мг",
		quantityLabel: "N. 10 (таблетки)",
		dispenseLatin: "D.t.d. N 10 in tab.",
		signaRu: "S. По 1 таблетке 1 раз в день 5-7 дней.",
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
		signaRu:
			"S. Внутрь по 1 пакетику (100 мг) 2 раза в день после еды, растворив в 100 мл воды, при болях (3–5 дней).",
		validityDays: 60,
	},
	{
		id: "nimesulide_100",
		tradeNameRu: "Нимесил (Нимесулид 100 мг)",
		activeSubstanceRu: "Нимесулид",
		category: "nsaid",
		categoryLabelRu: "НПВП / Анальгетик",
		latinRp: "Rp.: Nimesulidi 100 mg",
		formRu: "гранулы для суспензии",
		dosageRu: "100 мг",
		quantityLabel: "N. 9 (пакетики)",
		dispenseLatin: "D.t.d. N 9 in gran.",
		signaRu:
			"S. Внутрь по 1 пакетику (100 мг) 2 раза в день после еды, растворив в 100 мл воды, при болях (3–5 дней).",
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
		signaRu:
			"S. Ротовые ванночки по 1 минуте 3 раза в день после еды, 7 дней (не полоскать активно!).",
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
		signaRu:
			"S. Наносить на десну чистым пальцем полоской 1 см 2–3 раза в день за 15 минут до еды.",
		validityDays: 60,
	},
	{
		id: "cholisal_gel",
		tradeNameRu: "Холисал гель (Cholisal)",
		activeSubstanceRu: "Холина салицилат + Цеталкония хлорид",
		category: "dental_gel",
		categoryLabelRu: "Стоматологический гель",
		latinRp: "Rp.: Gel. 'Cholisal' 10.0",
		formRu: "гель стоматологический",
		dosageRu: "10 г",
		quantityLabel: "N. 1 (туба)",
		dispenseLatin: "D.t.d. N 1 in gel.",
		signaRu:
			"S. Наносить на десну чистым пальцем полоской 1 см 2–3 раза в день за 15 минут до еды.",
		validityDays: 60,
	},
	{
		id: "metrogyl_denta",
		tradeNameRu: "Метрогил Дента",
		activeSubstanceRu: "Метронидазол + Хлоргексидин",
		category: "dental_gel",
		categoryLabelRu: "Стоматологический антибактериальный гель",
		latinRp: "Rp.: Gel. 'Metrogyl Denta' 20.0",
		formRu: "гель стоматологический",
		dosageRu: "20 г",
		quantityLabel: "N. 1 (туба)",
		dispenseLatin: "D.t.d. N 1 in gel.",
		signaRu:
			"S. Наносить на область десен 2 раза в день после чистки зубов в течение 7-10 дней. После нанесения не пить и не принимать пищу 30 минут.",
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
		signaRu:
			"S. Внутрь по 1 таблетке 1 раз в сутки вечером, 3–5 дней для уменьшения постоперационного отека.",
		validityDays: 60,
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
		signaRu:
			"S. Внутрь по 1 таблетке 3 раза в день при кровоточивости лунки, 2-3 дня.",
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
		signaRu:
			"S. Внутрь по 1 таблетке (25 мг) 2-3 раза в день во время еды, 3-5 дней для снятия постоперационного отека.",
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
		signaRu:
			"S. Внутрь по 1 таблетке (400 мг) 2-3 раза в день после еды, запивая водой. Не более 1200 мг в сутки, курс 3-5 дней.",
		validityDays: 60,
	},
	{
		id: "ibuprofen_suspension_100_5ml",
		tradeNameRu: "Ибупрофен (Нурофен для детей) 100 мг/5 мл",
		activeSubstanceRu: "Ибупрофен",
		category: "nsaid",
		categoryLabelRu: "НПВП / Детский анальгетик",
		latinRp: "Rp.: Suspensionis Ibuprofeni 100 mg/5 ml - 100 ml",
		formRu: "суспензия для приема внутрь",
		dosageRu: "100 мг/5 мл (фл. 100 мл)",
		quantityLabel: "N. 1 (флакон)",
		dispenseLatin: "D.t.d. N 1 in flac.",
		signaRu:
			"S. Внутрь мерным шприцем из расчета 10 мг/кг (до 3 раз в сутки при боли или температуре с интервалом не менее 6 часов).",
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
		signaRu:
			"S. Орошать полость рта 3-4 раза в сутки путем 3-4 нажатий на насадку-распылитель после еды, 7 дней.",
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
		signaRu:
			"S. Развести 7.5 мл в 1/4 стакана теплой воды, полоскать полость рта 3-4 раза в день после еды, 7-10 дней.",
		validityDays: 60,
	},
	{
		id: "ketorolac_10",
		tradeNameRu: "Кеторол Экспресс / Кетанов (Кеторолак 10 мг)",
		activeSubstanceRu: "Кеторолак",
		category: "nsaid",
		categoryLabelRu: "НПВП / Анальгетик (Острая боль)",
		latinRp: "Rp.: Tab. Ketorolaci 10 mg",
		formRu: "таблетки, покрытые пленочной оболочкой",
		dosageRu: "10 мг",
		quantityLabel: "N. 10 (таблетки)",
		dispenseLatin: "D.t.d. N 10 in tab.",
		signaRu:
			"S. Внутрь по 1 таблетке (10 мг) при острой боли (не более 4 таблеток в сутки, курс до 5 дней).",
		validityDays: 60,
	},
	{
		id: "cyfran_st",
		tradeNameRu: "Цифран СТ (Ципрофлоксацин + Тинидазол)",
		activeSubstanceRu: "Ципрофлоксацин + Тинидазол",
		category: "antibiotic",
		categoryLabelRu: "Антибиотик комбинированный (фторхинолон + нитроимидазол)",
		latinRp:
			"Rp.: Tab. 'Cifran ST' (Ciprofloxacini 500 mg + Tinidazoli 600 mg)",
		formRu: "таблетки, покрытые оболочкой",
		dosageRu: "500 мг + 600 мг",
		quantityLabel: "N. 10 (таблетки)",
		dispenseLatin: "D.t.d. N 10 in tab.",
		signaRu:
			"S. Внутрь по 1 таблетке 2 раза в сутки после еды через 12 часов, запивая водой, курс 5 дней.",
		validityDays: 60,
	},
	{
		id: "linex_forte",
		tradeNameRu: "Линекс Форте (Пробиотик)",
		activeSubstanceRu: "Lactobacillus acidophilus + Bifidobacterium animalis",
		category: "gastroprotective",
		categoryLabelRu: "Эубиотик / Пробиотик (защита микробиоты)",
		latinRp: "Rp.: Caps. 'Linex Forte'",
		formRu: "капсулы",
		dosageRu: "стандартная",
		quantityLabel: "N. 14 (капсулы)",
		dispenseLatin: "D.t.d. N 14 in caps.",
		signaRu:
			"S. Внутрь по 1 капсуле 2 раза в день во время еды через 2 часа после приема антибиотика, курс 10-14 дней.",
		validityDays: 60,
	},
	{
		id: "omeprazole_20",
		tradeNameRu: "Омепразол (Омез 20 мг)",
		activeSubstanceRu: "Омепразол",
		category: "gastroprotective",
		categoryLabelRu: "Гастропротектор (ингибитор протонной помпы)",
		latinRp: "Rp.: Caps. Omeprazoli 20 mg",
		formRu: "капсулы кишечнорастворимые",
		dosageRu: "20 мг",
		quantityLabel: "N. 20 (капсулы)",
		dispenseLatin: "D.t.d. N 20 in caps.",
		signaRu:
			"S. Внутрь по 1 капсуле (20 мг) утром за 30 минут до завтрака на весь период приема НПВП, курс 5-10 дней.",
		validityDays: 60,
	},
	{
		id: "articaine_epinephrine_100",
		tradeNameRu: "Ультракаин Д-С форте (Артикаин 4% + Эпинефрин 1:100 000)",
		activeSubstanceRu: "Артикаин + Эпинефрин",
		category: "anesthetic",
		categoryLabelRu: "Местный анестетик (амидный ряд с вазоконстриктором)",
		latinRp: "Rp.: Sol. Articaini 4% cum Epinephrino 1:100 000 - 1.7 ml",
		formRu: "раствор для инъекций (карпулы)",
		dosageRu: "4% (68 мг/1.7 мл) + 1:100 000",
		quantityLabel: "N. 10 (карпулы)",
		dispenseLatin: "D.t.d. N 10 in carpp.",
		signaRu:
			"S. Для инфильтрационной и проводниковой анестезии в амбулаторной стоматологии (1-2 карпулы, 1.7-3.4 мл).",
		validityDays: 60,
	},
	{
		id: "articaine_epinephrine_200",
		tradeNameRu: "Ультракаин Д-С (Артикаин 4% + Эпинефрин 1:200 000)",
		activeSubstanceRu: "Артикаин + Эпинефрин",
		category: "anesthetic",
		categoryLabelRu:
			"Местный анестетик (пониженная концентрация вазоконстриктора)",
		latinRp: "Rp.: Sol. Articaini 4% cum Epinephrino 1:200 000 - 1.7 ml",
		formRu: "раствор для инъекций (карпулы)",
		dosageRu: "4% (68 мг/1.7 мл) + 1:200 000",
		quantityLabel: "N. 10 (карпулы)",
		dispenseLatin: "D.t.d. N 10 in carpp.",
		signaRu:
			"S. Для инфильтрационной и проводниковой анестезии у пациентов с сердечно-сосудистой патологией.",
		validityDays: 60,
	},
	{
		id: "ciprolet_500",
		tradeNameRu: "Ципролет 500 мг (Ципрофлоксацин)",
		activeSubstanceRu: "Ципрофлоксацин",
		category: "antibiotic",
		categoryLabelRu: "Антибиотик резерва (Фторхинолоны)",
		latinRp: "Rp.: Tab. Ciprofloxacini 500 mg",
		formRu: "таблетки, покрытые оболочкой",
		dosageRu: "500 мг",
		quantityLabel: "N. 10 (таблетки)",
		dispenseLatin: "D.t.d. N 10 in tab.",
		signaRu:
			"S. Внутрь по 1 таблетке (500 мг) 2 раза в сутки за 30 минут до еды, запивая стаканом воды, курс 5–7 дней.",
		validityDays: 60,
	},
	{
		id: "ketorol_10",
		tradeNameRu: "Кеторол (Кеторолак 10 мг)",
		activeSubstanceRu: "Кеторолак",
		category: "nsaid",
		categoryLabelRu: "НПВП / Анальгетик (Острая боль)",
		latinRp: "Rp.: Tab. Ketorolaci 10 mg",
		formRu: "таблетки, покрытые пленочной оболочкой",
		dosageRu: "10 мг",
		quantityLabel: "N. 10 (таблетки)",
		dispenseLatin: "D.t.d. N 10 in tab.",
		signaRu:
			"S. Внутрь по 1 таблетке (10 мг) при острой боли (не более 4 таблеток в сутки, курс до 5 дней).",
		validityDays: 60,
	},
	{
		id: "solcoseryl_dental",
		tradeNameRu: "Солкосерил (дентальная адгезивная паста 5 г)",
		activeSubstanceRu:
			"Депротеинизированный диализат из крови телят + Полидоканол",
		category: "dental_gel",
		categoryLabelRu: "Стоматологическая регенерирующая паста",
		latinRp: "Rp.: Pastae Solcoseryl dentalis adhesivae 5.0",
		formRu: "дентальная адгезивная паста",
		dosageRu: "5 г",
		quantityLabel: "N. 1 (туба)",
		dispenseLatin: "D.t.d. N 1 in tuba",
		signaRu:
			"S. Наносить тонким слоем на предварительно высушенный дефект слизистой оболочки рта 3–5 раз в сутки после еды и перед сном.",
		validityDays: 60,
	},
];

export const DENTAL_MEDICATIONS_CATALOG: readonly DentalMedicationPreset[] =
	DENTAL_MEDICATIONS_BASE.map((m) => ({
		...m,
		nameRu: m.tradeNameRu,
		latinName: m.latinRp,
		dispenseFormula: m.dispenseLatin,
	}));

export {
	type DentalFastPrescriptionPackage,
	DENTAL_FAST_PRESCRIPTION_PACKAGES_BASE,
	DENTAL_FAST_PRESCRIPTION_PACKAGES,
	calculatePediatricIbuprofenDose,
} from "./prescriptionPackages";
