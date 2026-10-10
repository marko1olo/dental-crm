/**
 * packages/shared/src/clinical/stomtDefects/cariesDefectsData.ts
 *
 * Layer 1: Caries Tooth Defects Data & Black I..VI Clinical Presets.
 *
 * Compliant with:
 * - Supreme Law: THE HAMMER (Zero Mocks, Absolute Parity)
 * - Mandate 8b: Line count limit <= 800 lines
 * - Mandate 8e: Doctor Autonomy (1-click preset mapping to ICD-10 K02)
 */

import type { ClinicalDefectPreset, StomxToothDefect } from "./types.js";

/**
 * Кариес зуба (K02) - основной каталог StomX.
 */
export const STOMX_DEFECT_CARIES: StomxToothDefect = {
	id: 6,
	name: "кариес",
	alias: "С",
	color: "red",
	order: 1030,
	type: "outpatient",
	key: "require_treatment",
	require_treatment: true,
	crmToothState: "Caries",
	category: "pathology",
	description: "Кариес эмали / дентина (K02)",
};

/**
 * Кариес корня / цемента (K02.2).
 */
export const STOMX_DEFECT_ROOT_CARIES: StomxToothDefect = {
	id: 58,
	name: "кариес корня",
	alias: "CR",
	color: "red",
	order: 1070,
	type: "outpatient",
	key: "require_treatment",
	require_treatment: true,
	crmToothState: "Caries",
	category: "pathology",
	description: "Кариес корня / цемента зуба (K02.2)",
};

/**
 * Дефект пломбы / рецидивный кариес (K02.8).
 */
export const STOMX_DEFECT_FILLING_DEFECT: StomxToothDefect = {
	id: 60,
	name: "дефект пломбы",
	alias: "Дп",
	color: "red",
	order: 1100,
	type: "outpatient",
	key: "require_treatment",
	require_treatment: true,
	category: "pathology",
	description: "Нарушение краевого прилегания / вторичный кариес пломбы",
};

/**
 * Дефект искусственной коронки.
 */
export const STOMX_DEFECT_CROWN_DEFECT: StomxToothDefect = {
	id: 76,
	name: "дефект коронки",
	alias: "Дк",
	color: "red",
	order: 1110,
	type: "outpatient",
	key: "require_treatment",
	require_treatment: true,
	category: "pathology",
	description: "Скол облицовки или расцементировка коронки",
};

/**
 * Скрытый кариес по данным рентгенографии / КЛКТ.
 */
export const STOMX_DEFECT_CARIES_RADIOLOGY: StomxToothDefect = {
	id: 19,
	name: "кариес",
	alias: "С",
	color: null,
	order: 1260,
	type: "outpatient",
	key: "rg_klkt",
	require_treatment: true,
	crmToothState: "Caries",
	category: "radiology",
	description: "Скрытый проксимальный кариес по данным рентгена",
};

/**
 * Массив кариозных дефектов StomX.
 */
export const STOMX_CARIES_DEFECTS: readonly StomxToothDefect[] = [
	STOMX_DEFECT_CARIES,
	STOMX_DEFECT_ROOT_CARIES,
	STOMX_DEFECT_FILLING_DEFECT,
	STOMX_DEFECT_CROWN_DEFECT,
	STOMX_DEFECT_CARIES_RADIOLOGY,
] as const;

/**
 * Элементы кариеса для иерархического дерева дефектов StomX.
 */
export const STOMX_CARIES_TREE_ITEMS: readonly StomxToothDefect[] = [
	{ id: 6, name: "кариес", alias: "С", color: "red", order: 1030, type: "outpatient", key: "require_treatment", require_treatment: true, crmToothState: "Caries", category: "pathology" },
	{ id: 58, name: "кариес корня", alias: "CR", color: "red", order: 1070, type: "outpatient", key: "require_treatment", require_treatment: true, crmToothState: "Caries", category: "pathology" },
	{ id: 60, name: "дефект пломбы", alias: "Дп", color: "red", order: 1100, type: "outpatient", key: "require_treatment", require_treatment: true, category: "pathology" },
	{ id: 76, name: "дефект коронки", alias: "Дк", color: "red", order: 1110, type: "outpatient", key: "require_treatment", require_treatment: true, category: "pathology" },
	{ id: 19, name: "кариес", alias: "С", color: null, order: 1260, type: "outpatient", key: "rg_klkt", require_treatment: true, crmToothState: "Caries", category: "radiology" },
] as const;

/**
 * Клинические пресеты кариеса по Блэку (Black I..VI) и глубине поражения
 * с точной привязкой к МКБ-10 и номенклатуре Минздрава 804н.
 */
export const CLINICAL_CARIES_PRESETS: readonly ClinicalDefectPreset[] = [
	{
		id: 101,
		code: "CARIES_MACULA",
		mkb10: "K02.0",
		name: "Кариес эмали (стадия белого/пигментированного пятна)",
		shortName: "Кариес: пятно",
		alias: "К02.0-пятно",
		category: "pathology",
		description: "Очаговая деминерализация эмали без образования дефекта, тест с метиленовым синим положительный",
		recommended804nCodes: ["A11.07.012", "A16.07.025.001"],
		defaultTreatmentPlan: "Профессиональная гигиена, реминерализующая терапия, фторирование",
		doctorFastNoteTemplate: "На поверхности эмали выявлено матовое меловидное пятно без нарушения целостности поверхности. Зондирование безболезненное, гладкое. Реакция на холод отрицательная.",
	},
	{
		id: 102,
		code: "CARIES_SUPERFICIAL_BLACK_I",
		mkb10: "K02.0",
		name: "Кариес эмали поверхностный (Black I)",
		shortName: "Кариес поверхн. I класс",
		alias: "К02.0-I",
		category: "pathology",
		description: "Дефект в пределах эмали в фиссурах и естественных ямках жевательной поверхности",
		recommended804nCodes: ["A16.07.002.001", "A16.07.051"],
		defaultTreatmentPlan: "Препарирование эмалевого дефекта, травление, бондинг, пломбирование светоотверждаемым композитом",
		doctorFastNoteTemplate: "Дефект твердых тканей в пределах эмалево-дентинной границы. Дно шероховатое, зондирование слабо болезненно. Термометрия безболезненна.",
	},
	{
		id: 103,
		code: "CARIES_MODERATE_BLACK_I",
		mkb10: "K02.1",
		name: "Кариес дентина средний (Black I)",
		shortName: "Кариес средний I класс",
		alias: "К02.1-I",
		category: "pathology",
		description: "Кариозная полость средней глубины в фиссурах моляров/премоляров, дентин пигментирован",
		recommended804nCodes: ["A16.07.002.001", "B01.003.004.001"],
		defaultTreatmentPlan: "Анестезия, некрэктомия, формирование полости I класса, адгезивный протокол, послойная реставрация композитом",
		doctorFastNoteTemplate: "Кариозная полость средней глубины на окклюзионной поверхности, заполнена размягченным пигментированным дентином. Зондирование стенок и дна слабо болезненно по ЭДГ.",
	},
	{
		id: 104,
		code: "CARIES_MODERATE_BLACK_II",
		mkb10: "K02.1",
		name: "Кариес дентина средний апроксимальный (Black II)",
		shortName: "Кариес средний II класс",
		alias: "К02.1-II",
		category: "pathology",
		description: "Кариозная полость на контактной поверхности моляра/премоляра с нарушением контактного пункта",
		recommended804nCodes: ["A16.07.002.001", "A16.07.002.005"],
		defaultTreatmentPlan: "Анестезия, изоляция коффердамом, некрэктомия, установка матричной системы и клина, восстановление контактного пункта",
		doctorFastNoteTemplate: "Полость II класса на контактной поверхности. Контактный пункт разрушен. Дно плотное, зондирование безболезненное.",
	},
	{
		id: 105,
		code: "CARIES_DEEP_BLACK_I",
		mkb10: "K02.1",
		name: "Кариес дентина глубокий (Black I)",
		shortName: "Кариес глуб. I класс",
		alias: "К02.1-глуб-I",
		category: "pathology",
		description: "Глубокая кариозная полость, околопульпарный дентин истончен, кратковременная боль от температурных раздражителей",
		recommended804nCodes: ["A16.07.002.001", "A16.07.002.007", "B01.003.004.001"],
		defaultTreatmentPlan: "Анестезия, щадящее препарирование, лечебная прокладка (МТА/гидроксид кальция), изолирующая прокладка СИЦ, постоянная пломба",
		doctorFastNoteTemplate: "Глубокая кариозная полость на жевательной поверхности. Зондирование дна чувствительно в одной точке, полость зуба закрыта. Термометрия кратковременная.",
	},
	{
		id: 106,
		code: "CARIES_DEEP_BLACK_II",
		mkb10: "K02.1",
		name: "Кариес дентина глубокий (Black II)",
		shortName: "Кариес глуб. II класс",
		alias: "К02.1-глуб-II",
		category: "pathology",
		description: "Глубокая полость на контактной поверхности, истончение свода пульповой камеры",
		recommended804nCodes: ["A16.07.002.001", "A16.07.002.005", "A16.07.002.007"],
		defaultTreatmentPlan: "Проводниковая анестезия, коффердам, биодентин/лайнер, контурная матрица, композитная реставрация",
		doctorFastNoteTemplate: "Глубокая кариозная полость II класса МО/ОД. Зондирование дна чувствительное, перкуссия отрицательная.",
	},
	{
		id: 107,
		code: "CARIES_BLACK_III",
		mkb10: "K02.1",
		name: "Кариес фронтальной группы без режущего края (Black III)",
		shortName: "Кариес III класс",
		alias: "К02.1-III",
		category: "pathology",
		description: "Полость на контактной поверхности резцов и клыков без поражения угла и режущего края",
		recommended804nCodes: ["A16.07.002.001", "A16.07.003"],
		defaultTreatmentPlan: "Изоляция, некрэктомия с язычного доступа, подбор цвета по шкале VITA, эстетическая реставрация",
		doctorFastNoteTemplate: "Кариозный дефект на апроксимальной поверхности фронтального зуба. Режущий край интактен. Эстетическая реставрация композитом премиум-класса.",
	},
	{
		id: 108,
		code: "CARIES_BLACK_IV",
		mkb10: "K02.1",
		name: "Кариес фронтальной группы с режущим краем (Black IV)",
		shortName: "Кариес IV класс",
		alias: "К02.1-IV",
		category: "pathology",
		description: "Полость на контактной поверхности резцов/клыков с дефектом угла коронки и режущего края",
		recommended804nCodes: ["A16.07.002.001", "A16.07.003", "A16.07.002.009"],
		defaultTreatmentPlan: "Создание фальца эмали, силиконовый ключ, послойная стратификация дентинных и эмалевых масс, моделирование мамелонов",
		doctorFastNoteTemplate: "Дефект коронковой части зуба с отломом медиального/дистального угла и нарушением режущего края. Эстетико-функциональная реставрация.",
	},
	{
		id: 109,
		code: "CARIES_CERVICAL_BLACK_V",
		mkb10: "K02.1",
		name: "Кариес пришеечный (Black V)",
		shortName: "Кариес пришеечный V класс",
		alias: "К02.1-V",
		category: "pathology",
		description: "Кариозная полость в пришеечной трети вестибулярной или оральной поверхности любого зуба",
		recommended804nCodes: ["A16.07.002.001", "A16.07.049"],
		defaultTreatmentPlan: "Ретракция десны нитью, щадящая некрэктомия, микрогибридный или текучий композит, полировка до зеркального блеска",
		doctorFastNoteTemplate: "Полость V класса в пришеечной области. Дно пигментированное, зондирование слабо болезненно по краю десны. Ретракция проведена.",
	},
	{
		id: 110,
		code: "CARIES_ATYPICAL_BLACK_VI",
		mkb10: "K02.1",
		name: "Кариес бугров и режущих краев (Black VI)",
		shortName: "Кариес VI класс",
		alias: "К02.1-VI",
		category: "pathology",
		description: "Атипичное кариозное поражение вершин жевательных бугров или режущих краев зубов",
		recommended804nCodes: ["A16.07.002.001"],
		defaultTreatmentPlan: "Препарирование полостей на буграх, пломбирование высоконаполненным композитом с восстановлением анатомии",
		doctorFastNoteTemplate: "Дефект локализован на вершине жевательного бугра. Эмаль истончена, подлежащий дентин размягчен.",
	},
	{
		id: 111,
		code: "CARIES_ROOT_CEMENTUM",
		mkb10: "K02.2",
		name: "Кариес цемента / корня зуба",
		shortName: "Кариес корня",
		alias: "К02.2",
		category: "pathology",
		description: "Кариозный процесс обнаженного цемента корня зуба у пациентов с рецессией десны",
		recommended804nCodes: ["A16.07.002.001", "A16.07.002.006"],
		defaultTreatmentPlan: "Антисептическая обработка, СИЦ (стеклоиономерный цемент) для лучшей адгезии к дентину корня и фторовыделения",
		doctorFastNoteTemplate: "Обнажение шейки и корня зуба с образованием плоского поддесневого дефекта цемента. Дентин размягчен, зондирование болезненно.",
	},
	{
		id: 112,
		code: "CARIES_SECONDARY_RECURRENT",
		mkb10: "K02.8",
		name: "Вторичный (рецидивирующий) кариес под пломбой",
		shortName: "Вторичный кариес",
		alias: "К02.8-втор",
		category: "pathology",
		description: "Кариозный процесс, развившийся под ранее наложенной реставрацией при нарушении краевого прилегания",
		recommended804nCodes: ["A16.07.002.001", "A16.07.082"],
		defaultTreatmentPlan: "Снятие несостоятельной пломбы, иссечение рецидивного кариеса, антисептическая обработка, повторная реставрация",
		doctorFastNoteTemplate: "Краевое окрашивание и ступенька по периметру старой пломбы. Зонд погружается под край реставрации, дентин размягчен.",
	},
] as const;
