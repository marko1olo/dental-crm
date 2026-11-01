/**
 * prescriptionCatalogData.ts — Canonical SSOT Outpatient Dental Pharmacopeia & Fast Sets
 * DENTE Dental CRM (Doctor Autonomy Mandates 8e, 8n, 8x, 8y & Sweet Spot 300–380 lines).
 * 6 Clinical Categories & 4 One-Click Express Presets for Outpatient Dentistry.
 */

export interface DentalOutpatientDrug {
	readonly id: string;
	readonly tradeName: string;
	readonly activeSubstanceRu: string;
	readonly latinName: string;
	readonly category: "antibiotic" | "nsaid" | "antiseptic" | "mucosa" | "antihistamine" | "gastro" | string;
	readonly categoryLabelRu: string;
	readonly formRu: string;
	readonly dosageRu: string;
	readonly quantityLabel: string;
	readonly dispenseLatin: string;
	readonly signaRussian: string;
	readonly memoInstruction: string;
	readonly isSpecialControl?: boolean;
	readonly form?: string;
	readonly dosage?: string;
	readonly quantity?: string;
}

export interface DentalFastPrescriptionSet {
	readonly id: string;
	readonly label: string;
	readonly desc: string;
	readonly drugIds: readonly string[];
}

export interface DentalPrescriptionCategory {
	readonly key: string;
	readonly labelRu: string;
	readonly description: string;
}

/** 6 Statutory Clinical Categories for Outpatient Dentistry in RF */
export const DENTAL_PRESCRIPTION_CATEGORIES: readonly DentalPrescriptionCategory[] = [
	{ key: "antibiotic", labelRu: "Антибиотики", description: "Пенициллины, фторхинолоны, линкозамиды" },
	{ key: "nsaid", labelRu: "НПВП и анальгетики", description: "Купирование боли и воспалительной реакции" },
	{ key: "antiseptic", labelRu: "Антисептики и полоскания", description: "Антисептическая обработка и ротовые ванночки" },
	{ key: "mucosa", labelRu: "Ранозаживляющие и гели", description: "Аппликации на десны и слизистую оболочку" },
	{ key: "antihistamine", labelRu: "Антигистаминные", description: "Снижение реактивного отёка тканей" },
	{ key: "gastro", labelRu: "Гастропротекторы", description: "Защита слизистой ЖКТ при курсе НПВП" },
];

/** Standard Patient Home Care Recommendations */
export const PATIENT_CARE_RECOMMENDATIONS = [
	"Холод к щеке на 15 минут с перерывами по 20 минут в первые 3 часа.",
	"Не греть оперированную область, исключить горячую ванну и баню на 3 дня.",
	"Не полоскать активно полость рта в первые сутки (не вымывать кровяной сгусток).",
	"Принимать мягкую, теплую пищу, пережевывать на противоположной стороне.",
	"При сохранении боли или нарастании отёка немедленно связаться с клиникой.",
];

/** 20 Canonical Dental Outpatient Medications (Pharmacopeia SSOT) */
export const CANONICAL_DENTAL_DRUGS: readonly DentalOutpatientDrug[] = [
	// [0] Антибиотики
	{
		id: "amoxiclav_875_125",
		tradeName: "Амоксиклав 1000 мг",
		activeSubstanceRu: "Амоксициллин + Клавулановая кислота",
		latinName: "Rp.: Tab. Amoxicillini et Acidi clavulanici 875/125 mg N. 14",
		category: "antibiotic",
		categoryLabelRu: "Антибиотики",
		formRu: "таблетки диспергируемые",
		dosageRu: "875 мг + 125 мг",
		quantityLabel: "N. 14",
		dispenseLatin: "D.t.d. N 14 in tab.",
		signaRussian: "По 1 таблетке 2 раза в день во время еды, курс 5–7 дней.",
		memoInstruction: "По 1 таб. 2 раза в день во время еды (5–7 дней)",
		form: "таблетки диспергируемые",
		dosage: "875 мг + 125 мг",
		quantity: "N. 14",
	},
	// [1]
	{
		id: "cifran_st_500_600",
		tradeName: "Цифран СТ 500/600 мг",
		activeSubstanceRu: "Ципрофлоксацин + Тинидазол",
		latinName: "Rp.: Tab. «Cifran ST» (Ciprofloxacini 500 mg + Tinidazoli 600 mg) N. 10",
		category: "antibiotic",
		categoryLabelRu: "Антибиотики",
		formRu: "таблетки п/о",
		dosageRu: "500 мг + 600 мг",
		quantityLabel: "N. 10",
		dispenseLatin: "D.t.d. N 10 in tab.",
		signaRussian: "По 1 таблетке 2 раза в день после еды, запивая стаканом воды, 5 дней.",
		memoInstruction: "По 1 таб. 2 раза в день после еды (5 дней)",
		form: "таблетки п/о",
		dosage: "500 мг + 600 мг",
		quantity: "N. 10",
	},
	// [2]
	{
		id: "clarithromycin_500",
		tradeName: "Кларитромицин 500 мг",
		activeSubstanceRu: "Кларитромицин",
		latinName: "Rp.: Tab. Clarithromycini 500 mg N. 10",
		category: "antibiotic",
		categoryLabelRu: "Антибиотики",
		formRu: "таблетки п/о",
		dosageRu: "500 мг",
		quantityLabel: "N. 10",
		dispenseLatin: "D.t.d. N 10 in tab.",
		signaRussian: "По 1 таблетке 2 раза в день во время еды, 5–7 дней (при аллергии на пенициллины).",
		memoInstruction: "По 1 таб. 2 раза в день во время еды (5–7 дней)",
		form: "таблетки п/о",
		dosage: "500 мг",
		quantity: "N. 10",
	},
	// [3] НПВП и анальгетики
	{
		id: "nimesulide_100",
		tradeName: "Нимесил 100 мг",
		activeSubstanceRu: "Нимесулид",
		latinName: "Rp.: Gran. Nimesulidi 100 mg N. 10",
		category: "nsaid",
		categoryLabelRu: "НПВП и анальгетики",
		formRu: "гранулы для суспензии",
		dosageRu: "100 мг",
		quantityLabel: "N. 10",
		dispenseLatin: "D.t.d. N 10 in sachet",
		signaRussian: "По 1 пакетику растворить в 100 мл воды, принимать 2 раза в день после еды при болях.",
		memoInstruction: "По 1 пакетику в 100 мл воды после еды при боли (до 2 раз в день)",
		form: "гранулы для суспензии",
		dosage: "100 мг",
		quantity: "N. 10",
	},
	// [4]
	{
		id: "ibuprofen_400",
		tradeName: "Ибупрофен 400 мг",
		activeSubstanceRu: "Ибупрофен",
		latinName: "Rp.: Tab. Ibuprofeni 400 mg N. 20",
		category: "nsaid",
		categoryLabelRu: "НПВП и анальгетики",
		formRu: "таблетки п/о",
		dosageRu: "400 мг",
		quantityLabel: "N. 20",
		dispenseLatin: "D.t.d. N 20 in tab.",
		signaRussian: "По 1 таблетке 2–3 раза в день после еды при болях.",
		memoInstruction: "По 1 таб. 2–3 раза в день после еды при боли",
		form: "таблетки п/о",
		dosage: "400 мг",
		quantity: "N. 20",
	},
	// [5]
	{
		id: "ketorolac_10",
		tradeName: "Кеторол Экспресс 10 мг",
		activeSubstanceRu: "Кеторолак",
		latinName: "Rp.: Tab. Ketorolaci 10 mg N. 20",
		category: "nsaid",
		categoryLabelRu: "НПВП и анальгетики",
		formRu: "таблетки диспергируемые",
		dosageRu: "10 мг",
		quantityLabel: "N. 20",
		dispenseLatin: "D.t.d. N 20 in tab.",
		signaRussian: "По 1 таблетке под язык при острой боли (не более 4 таб/сут, не дольше 5 дней).",
		memoInstruction: "По 1 таб. под язык при острой боли (максимум 4 таб/день, до 5 дней)",
		form: "таблетки диспергируемые",
		dosage: "10 мг",
		quantity: "N. 20",
	},
	// [6] Антисептики и полоскания
	{
		id: "chlorhexidine_005",
		tradeName: "Хлоргексидин 0.05%",
		activeSubstanceRu: "Хлоргексидина биглюконат",
		latinName: "Rp.: Sol. Chlorhexidini bigluconatis 0.05% 100 ml",
		category: "antiseptic",
		categoryLabelRu: "Антисептики и полоскания",
		formRu: "раствор для местного применения",
		dosageRu: "0.05% 100 мл",
		quantityLabel: "флакон 100 мл",
		dispenseLatin: "D.t.d. N 1 in flac.",
		signaRussian: "Ротовые ванночки по 1 минуте 3 раза в день после еды (не полоскать активно!).",
		memoInstruction: "Ротовые ванночки 3 раза в день (подержать во рту 1 мин, не булькать)",
		form: "раствор",
		dosage: "0.05% 100 мл",
		quantity: "флакон 100 мл",
	},
	// [7]
	{
		id: "miramistin_001",
		tradeName: "Мирамистин 0.01%",
		activeSubstanceRu: "Бензилдиметил-миристоиламино-пропиламмоний",
		latinName: "Rp.: Sol. Miramistini 0.01% 150 ml",
		category: "antiseptic",
		categoryLabelRu: "Антисептики и полоскания",
		formRu: "раствор с распылителем",
		dosageRu: "0.01% 150 мл",
		quantityLabel: "флакон 150 мл",
		dispenseLatin: "D.t.d. N 1 in flac.",
		signaRussian: "Орошать полость рта 3–4 раза в день после еды.",
		memoInstruction: "Орошение полости рта 3–4 раза в день после еды",
		form: "раствор",
		dosage: "0.01% 150 мл",
		quantity: "флакон 150 мл",
	},
	// [8] Ранозаживляющие и гели
	{
		id: "metrogyl_denta",
		tradeName: "Метрогил Дента гель",
		activeSubstanceRu: "Метронидазол + Хлоргексидин",
		latinName: "Rp.: Gel dentale «Metrogyl Denta» 20.0",
		category: "mucosa",
		categoryLabelRu: "Ранозаживляющие и гели",
		formRu: "стоматологический гель",
		dosageRu: "туба 20 г",
		quantityLabel: "туба 20 г",
		dispenseLatin: "D.t.d. N 1 in tuba",
		signaRussian: "Наносить на десны в области воспаления 2 раза в день (30 мин не есть и не пить).",
		memoInstruction: "Аппликации на десны 2 раза в день после чистки (30 мин не есть)",
		form: "гель",
		dosage: "туба 20 г",
		quantity: "туба 20 г",
	},
	// [9]
	{
		id: "cholisal_gel",
		tradeName: "Холисал гель",
		activeSubstanceRu: "Холина салицилат + Цеталкония хлорид",
		latinName: "Rp.: Gel dentale «Cholisal» 10.0",
		category: "mucosa",
		categoryLabelRu: "Ранозаживляющие и гели",
		formRu: "стоматологический гель",
		dosageRu: "туба 10 г",
		quantityLabel: "туба 10 г",
		dispenseLatin: "D.t.d. N 1 in tuba",
		signaRussian: "Полоску геля 1 см наносить на пораженные участки слизистой 2–3 раза в день.",
		memoInstruction: "Полоску геля 1 см наносить на болезненные участки слизистой 2–3 раза в день",
		form: "гель",
		dosage: "туба 10 г",
		quantity: "туба 10 г",
	},
	// [10] Антигистаминные
	{
		id: "loratadine_10",
		tradeName: "Лоратадин 10 мг",
		activeSubstanceRu: "Лоратадин",
		latinName: "Rp.: Tab. Loratadini 10 mg N. 10",
		category: "antihistamine",
		categoryLabelRu: "Антигистаминные",
		formRu: "таблетки",
		dosageRu: "10 мг",
		quantityLabel: "N. 10",
		dispenseLatin: "D.t.d. N 10 in tab.",
		signaRussian: "По 1 таблетке 1 раз в день на ночь для снижения послеоперационного отёка (3–5 дней).",
		memoInstruction: "По 1 таб. на ночь для уменьшения отёка (3–5 дней)",
		form: "таблетки",
		dosage: "10 мг",
		quantity: "N. 10",
	},
	// [11] Детский прием
	{
		id: "ibuprofen_suspension_100_5ml",
		tradeName: "Ибупрофен суспензия 100 мг/5 мл",
		activeSubstanceRu: "Ибупрофен",
		latinName: "Rp.: Susp. Ibuprofeni 100 mg/5 ml 100 ml",
		category: "nsaid",
		categoryLabelRu: "НПВП и анальгетики",
		formRu: "суспензия для приема внутрь",
		dosageRu: "100 мг / 5 мл",
		quantityLabel: "флакон 100 мл",
		dispenseLatin: "D.t.d. N 1 in flac.",
		signaRussian: "Детям по 10 мг/кг до 3 раз в день при болях и температуре.",
		memoInstruction: "Суспензия по весу ребенка (10 мг/кг) до 3 раз в день при боли",
		form: "суспензия",
		dosage: "100 мг / 5 мл",
		quantity: "флакон 100 мл",
	},
	// [12] Расширенный стоматологический спектр РФ
	{
		id: "ciprofloxacin_500",
		tradeName: "Ципролет 500 мг",
		activeSubstanceRu: "Ципрофлоксацин",
		latinName: "Rp.: Tab. Ciprofloxacini 500 mg N. 10",
		category: "antibiotic",
		categoryLabelRu: "Антибиотики",
		formRu: "таблетки п/о",
		dosageRu: "500 мг",
		quantityLabel: "N. 10",
		dispenseLatin: "D.t.d. N 10 in tab.",
		signaRussian: "По 1 таблетке 2 раза в день до еды, запивая водой, 5 дней.",
		memoInstruction: "По 1 таб. 2 раза в день за 30 мин до еды (5 дней)",
	},
	{
		id: "lincomycin_500",
		tradeName: "Линкомицин 500 мг",
		activeSubstanceRu: "Линкомицин",
		latinName: "Rp.: Caps. Lincomycini 500 mg N. 20",
		category: "antibiotic",
		categoryLabelRu: "Антибиотики",
		formRu: "капсулы",
		dosageRu: "500 мг",
		quantityLabel: "N. 20",
		dispenseLatin: "D.t.d. N 20 in caps.",
		signaRussian: "По 1 капсуле 3 раза в день за 1 час до еды, курс 5–7 дней.",
		memoInstruction: "По 1 капсуле 3 раза в день за 1 час до еды (5–7 дней)",
	},
	{
		id: "stomatophyt_50",
		tradeName: "Стоматофит 50 мл",
		activeSubstanceRu: "Экстракт коры дуба + ромашки + шалфея",
		latinName: "Rp.: Extr. «Stomatophyt» 50 ml",
		category: "antiseptic",
		categoryLabelRu: "Антисептики и полоскания",
		formRu: "экстракт жидкий",
		dosageRu: "50 мл",
		quantityLabel: "флакон 50 мл",
		dispenseLatin: "D.t.d. N 1 in flac.",
		signaRussian: "Развести 7.5 мл в 50 мл теплой воды, полоскать 3 раза в день 10 дней.",
		memoInstruction: "Полоскания 3 раза в день разведенным раствором (10 дней)",
	},
	{
		id: "solcoseryl_dental",
		tradeName: "Солкосерил дентальная паста",
		activeSubstanceRu: "Депротеинизированный гемодериват крови телят",
		latinName: "Rp.: Pasta dent. «Solcoseryl Dental» 5.0",
		category: "mucosa",
		categoryLabelRu: "Ранозаживляющие и гели",
		formRu: "адгезивная паста",
		dosageRu: "туба 5 г",
		quantityLabel: "туба 5 г",
		dispenseLatin: "D.t.d. N 1 in tuba",
		signaRussian: "Наносить тонким слоем на высушенную язву 3–4 раза в день после еды.",
		memoInstruction: "Наносить на язвочки тонким слоем после еды (3–4 раза в день)",
	},
	{
		id: "asepta_balm",
		tradeName: "Асепта бальзам для десен",
		activeSubstanceRu: "Метронидазол + Хлоргексидин адгезивный",
		latinName: "Rp.: Bals. «Asepta» 10.0",
		category: "mucosa",
		categoryLabelRu: "Ранозаживляющие и гели",
		formRu: "адгезивный бальзам",
		dosageRu: "туба 10 г",
		quantityLabel: "туба 10 г",
		dispenseLatin: "D.t.d. N 1 in tuba",
		signaRussian: "Наносить на пораженную десну 2 раза в день после чистки 7–10 дней.",
		memoInstruction: "Наносить на край десны 2 раза в день после чистки (7–10 дней)",
	},
	{
		id: "cetirizine_10",
		tradeName: "Цетрин 10 мг",
		activeSubstanceRu: "Цетиризин",
		latinName: "Rp.: Tab. Cetirizini 10 mg N. 20",
		category: "antihistamine",
		categoryLabelRu: "Антигистаминные",
		formRu: "таблетки п/о",
		dosageRu: "10 мг",
		quantityLabel: "N. 20",
		dispenseLatin: "D.t.d. N 20 in tab.",
		signaRussian: "По 1 таблетке 1 раз в сутки вечером для снятия отёка (3–5 дней).",
		memoInstruction: "По 1 таб. вечером 1 раз в день от отёка (3–5 дней)",
	},
	{
		id: "suprastin_25",
		tradeName: "Супрастин 25 мг",
		activeSubstanceRu: "Хлоропирамин",
		latinName: "Rp.: Tab. Chloropyramini 25 mg N. 20",
		category: "antihistamine",
		categoryLabelRu: "Антигистаминные",
		formRu: "таблетки",
		dosageRu: "25 мг",
		quantityLabel: "N. 20",
		dispenseLatin: "D.t.d. N 20 in tab.",
		signaRussian: "По 1 таблетке 2 раза в день во время еды при сильном отёке (3–4 дня).",
		memoInstruction: "По 1 таб. во время еды 2 раза в день от отёка (3–4 дня)",
	},
	{
		id: "omeprazole_20",
		tradeName: "Омепразол 20 мг",
		activeSubstanceRu: "Омепразол",
		latinName: "Rp.: Caps. Omeprazoli 20 mg N. 30",
		category: "gastro",
		categoryLabelRu: "Гастропротекторы",
		formRu: "капсулы",
		dosageRu: "20 мг",
		quantityLabel: "N. 30",
		dispenseLatin: "D.t.d. N 30 in caps.",
		signaRussian: "По 1 капсуле утром за 30 минут до еды при курсе НПВП (7–10 дней).",
		memoInstruction: "По 1 капсуле утром за 30 мин до еды для защиты желудка",
	},
];

/** Canonical 1-Click Outpatient Clinical Sets */
export const CLINICAL_FAST_SETS: readonly DentalFastPrescriptionSet[] = [
	{
		id: "post_tooth_extraction",
		label: "После сложного удаления зуба / имплантации",
		desc: "Нимесил 100 мг при болях + Хлоргексидин 0.05% ванночки + Лоратадин 10 мг от отёка",
		drugIds: ["nimesulide_100", "chlorhexidine_005", "loratadine_10"],
	},
	{
		id: "dental_implantation",
		label: "Дентальная имплантация и костная пластика",
		desc: "Амоксиклав 1000 мг 2 р/сут (7 дн.) + Нимесил 100 мг + Хлоргексидин 0.05% + Лоратадин 10 мг",
		drugIds: ["amoxiclav_875_125", "nimesulide_100", "chlorhexidine_005", "loratadine_10"],
	},
	{
		id: "acute_periodontitis",
		label: "Острый периодонтит / пульпит с отёком",
		desc: "Цифран СТ 500/600 мг 2 р/сут (5 дн.) + Нимесил 100 мг при болях + Хлоргексидин 0.05%",
		drugIds: ["cifran_st_500_600", "nimesulide_100", "chlorhexidine_005"],
	},
	{
		id: "alveolitis_dry_socket",
		label: "Альвеолит (воспаление лунки)",
		desc: "Амоксиклав 1000 мг + Нимесил 100 мг при болях + Холисал гель аппликации",
		drugIds: ["amoxiclav_875_125", "nimesulide_100", "cholisal_gel"],
	},
	{
		id: "periodontitis_mucosa",
		label: "Пародонтит / гингивит (местное лечение)",
		desc: "Метрогил Дента гель 2 р/сут + Мирамистин 0.01% орошения + Холисал гель при болях",
		drugIds: ["metrogyl_denta", "miramistin_001", "cholisal_gel"],
	},
	{
		id: "aphthous_stomatitis",
		label: "Афтозный стоматит",
		desc: "Холисал гель при болях + Солкосерил дентальная паста + Мирамистин 0.01%",
		drugIds: ["cholisal_gel", "solcoseryl_dental", "miramistin_001"],
	},
];

export const DENTAL_FAST_PRESCRIPTION_SETS = CLINICAL_FAST_SETS;

export function findDrugById(id: string): DentalOutpatientDrug | undefined {
	const direct = CANONICAL_DENTAL_DRUGS.find((d) => d.id === id);
	if (direct) return direct;

	// Alias lookups for legacy and shared identifiers
	if (id === "nimesil_100_sachet") return CANONICAL_DENTAL_DRUGS.find((d) => d.id === "nimesulide_100");
	if (id === "chlorhexidine_005_sol") return CANONICAL_DENTAL_DRUGS.find((d) => d.id === "chlorhexidine_005");
	if (id === "ibuprofen_400_tab") return CANONICAL_DENTAL_DRUGS.find((d) => d.id === "ibuprofen_400");
	if (id === "suprastin_25_tab" || id === "suprastin_25") return CANONICAL_DENTAL_DRUGS.find((d) => d.id === "suprastin_25") || CANONICAL_DENTAL_DRUGS.find((d) => d.id === "loratadine_10");
	if (id === "cetrin_10") return CANONICAL_DENTAL_DRUGS.find((d) => d.id === "cetirizine_10");
	if (id === "ciprolet_500") return CANONICAL_DENTAL_DRUGS.find((d) => d.id === "ciprofloxacin_500");
	if (id === "linex_forte") {
		return {
			id: "linex_forte",
			tradeName: "Линекс Форте",
			activeSubstanceRu: "Пробиотик (Lactobacillus acidophilus + Bifidobacterium animalis)",
			latinName: "Rp.: Caps. «Linex Forte» N. 14",
			category: "gastro",
			categoryLabelRu: "Гастропротекторы",
			formRu: "капсулы",
			dosageRu: "1 капсула",
			quantityLabel: "N. 14",
			dispenseLatin: "D.t.d. N 14 in caps.",
			signaRussian: "По 1 капсуле 1 раз в день во время еды при курсе антибиотиков.",
			memoInstruction: "По 1 капсуле 1 раз в день во время еды",
			form: "капсулы",
			dosage: "1 капсула",
			quantity: "N. 14",
		};
	}
	return undefined;
}

export function formatMessengerPatientMemo(params: {
	patientName: string;
	doctorName: string;
	clinicPhone?: string;
	drugs: readonly DentalOutpatientDrug[];
}): string {
	const firstName = params.patientName.split(" ")[1] || params.patientName;
	const lines = [`Здравствуйте, ${firstName}! Напоминаем рекомендации доктора после сегодняшнего приёма:`];
	params.drugs.forEach((d, idx) => lines.push(`${idx + 1}. ${d.tradeName} — ${d.memoInstruction}.`));
	lines.push("");
	lines.push("Рекомендации по уходу:");
	for (const care of PATIENT_CARE_RECOMMENDATIONS.slice(0, 3)) {
		lines.push(`• ${care}`);
	}
	const phone = params.clinicPhone || "+7 (495) 000-00-00";
	lines.push("");
	lines.push(`При вопросах звоните в клинику: ${phone}`);
	return lines.join("\n");
}

export function formatSoapPrescriptionText(drugs: readonly DentalOutpatientDrug[]): string {
	if (drugs.length === 0) return "";
	const lines = ["Назначения и рецепты (Rp):"];
	for (const d of drugs) {
		lines.push(`${d.latinName}\n${d.dispenseLatin}\n${d.signaRussian}`);
	}
	lines.push("\nРекомендации пациенту:");
	for (const care of PATIENT_CARE_RECOMMENDATIONS) {
		lines.push(`- ${care}`);
	}
	return lines.join("\n\n");
}
