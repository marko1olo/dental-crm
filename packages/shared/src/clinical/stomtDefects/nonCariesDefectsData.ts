/**
 * packages/shared/src/clinical/stomtDefects/nonCariesDefectsData.ts
 *
 * Layer 1: Non-Caries Tooth Defects Data (Erosions, Hypoplasia, Wedge defects, Fluorosis, Abrasion).
 *
 * Compliant with:
 * - Supreme Law: THE HAMMER (Zero Mocks, Absolute Parity)
 * - Mandate 8b: Line count limit <= 800 lines
 * - Mandate 8e: Doctor Autonomy (1-click preset mapping to ICD-10 K00.3..K03.8)
 */

import type { ClinicalDefectPreset, StomxToothDefect } from "./types.js";

/**
 * Пигментация эмали твердых тканей.
 */
export const STOMX_DEFECT_PIGMENTATION: StomxToothDefect = {
	id: 59,
	name: "пигментация",
	alias: "Пг",
	color: "red",
	order: 1090,
	type: "outpatient",
	key: "require_treatment",
	require_treatment: true,
	category: "pathology",
	description: "Пигментация эмали / пятно",
};

/**
 * Клиновидный дефект твердых тканей зуба (K03.1).
 */
export const STOMX_DEFECT_WEDGE: StomxToothDefect = {
	id: 61,
	name: "клин дефект",
	alias: "Кд",
	color: "red",
	order: 1120,
	type: "outpatient",
	key: "require_treatment",
	require_treatment: true,
	category: "pathology",
	description: "Клиновидный дефект пришеечной области твердых тканей (K03.1)",
};

/**
 * Гипоплазия эмали (K00.4).
 */
export const STOMX_DEFECT_HYPOPLASIA: StomxToothDefect = {
	id: 62,
	name: "гипоплазия",
	alias: "Г",
	color: "red",
	order: 1130,
	type: "outpatient",
	key: "require_treatment",
	require_treatment: true,
	category: "pathology",
	description: "Гипоплазия эмали (K00.4)",
};

/**
 * Эндемический флюороз зубов (K00.3).
 */
export const STOMX_DEFECT_FLUOROSIS: StomxToothDefect = {
	id: 63,
	name: "флюороз",
	alias: "Фл",
	color: "red",
	order: 1140,
	type: "outpatient",
	key: "require_treatment",
	require_treatment: true,
	category: "pathology",
	description: "Эндемический флюороз зубов (K00.3)",
};

/**
 * Массив некариозных дефектов StomX.
 */
export const STOMX_NON_CARIES_DEFECTS: readonly StomxToothDefect[] = [
	STOMX_DEFECT_PIGMENTATION,
	STOMX_DEFECT_WEDGE,
	STOMX_DEFECT_HYPOPLASIA,
	STOMX_DEFECT_FLUOROSIS,
] as const;

/**
 * Элементы некариозных поражений для иерархического дерева дефектов StomX.
 */
export const STOMX_NON_CARIES_TREE_ITEMS: readonly StomxToothDefect[] = [
	{ id: 59, name: "пигментация", alias: "Пг", color: "red", order: 1090, type: "outpatient", key: "require_treatment", require_treatment: true, category: "pathology" },
	{ id: 61, name: "клин дефект", alias: "Кд", color: "red", order: 1120, type: "outpatient", key: "require_treatment", require_treatment: true, category: "pathology" },
	{ id: 62, name: "гипоплазия", alias: "Г", color: "red", order: 1130, type: "outpatient", key: "require_treatment", require_treatment: true, category: "pathology" },
	{ id: 63, name: "флюороз", alias: "Фл", color: "red", order: 1140, type: "outpatient", key: "require_treatment", require_treatment: true, category: "pathology" },
] as const;

/**
 * Клинические пресеты некариозных поражений твердых тканей зубов
 * с точной привязкой к МКБ-10 и номенклатуре Минздрава 804н.
 */
export const CLINICAL_NON_CARIES_PRESETS: readonly ClinicalDefectPreset[] = [
	{
		id: 201,
		code: "NON_CARIES_WEDGE_DEFECT_INITIAL",
		mkb10: "K03.1",
		name: "Клиновидный дефект I–II стадии (поверхностный/начальный)",
		shortName: "Клин. дефект нач.",
		alias: "К03.1-I-II",
		category: "pathology",
		description: "Клиновидная убыль эмали в пришеечной области глубиной до 1 мм, стенки гладкие блестящие",
		recommended804nCodes: ["A11.07.012", "A16.07.025.001"],
		defaultTreatmentPlan: "Устранение травмирующей окклюзии, глубокое фторирование дентина, десенситайзер",
		doctorFastNoteTemplate: "В пришеечной области вестибулярной поверхности дефект клиновидной формы глубиной до 0.8 мм. Стенки плотные, гладкие. Зондирование слабо чувствительно. Нанесение десенситайзера.",
	},
	{
		id: 202,
		code: "NON_CARIES_WEDGE_DEFECT_DEEP",
		mkb10: "K03.1",
		name: "Клиновидный дефект III–IV стадии (глубокий)",
		shortName: "Клин. дефект глуб.",
		alias: "К03.1-III-IV",
		category: "pathology",
		description: "Глубокий клиновидный дефект глубиной более 2 мм, угроза обнажения пульпы зуба",
		recommended804nCodes: ["A16.07.002.001", "A16.07.049"],
		defaultTreatmentPlan: "Ретракция, обработка без снятия интактного дентина, пломбирование текучим/микрофильным композитом",
		doctorFastNoteTemplate: "Глубокий V-образный дефект в пришеечной зоне с поражением глубоких слоев дентина. Дно плотное, зондирование безболезненное. Пломбирование эластичным композитом.",
	},
	{
		id: 203,
		code: "NON_CARIES_EROSION",
		mkb10: "K03.2",
		name: "Эрозия эмали зубов (чашеобразная)",
		shortName: "Эрозия эмали",
		alias: "К03.2",
		category: "pathology",
		description: "Прогрессирующая чашеобразная убыль твердых тканей на вестибулярной поверхности передних зубов",
		recommended804nCodes: ["A11.07.012", "A16.07.002.001"],
		defaultTreatmentPlan: "Исключение кислотных факторов, реминерализующая терапия, композитная реставрация при дефектах дентина",
		doctorFastNoteTemplate: "Чашеобразный дефект эмали с ровным дном желтоватого цвета на вестибулярной поверхности резца. Дно гладкое, полированное. Реакция на холод умеренная.",
	},
	{
		id: 204,
		code: "NON_CARIES_ABRASION_PATHOLOGICAL",
		mkb10: "K03.0",
		name: "Повышенное стирание зубов (патологическая стираемость)",
		shortName: "Стираемость патологич.",
		alias: "К03.0",
		category: "pathology",
		description: "Интенсивная убыль твердых тканей зубов со снижением высоты прикуса и обнажением заместительного дентина",
		recommended804nCodes: ["A16.07.004", "A16.07.025", "A16.07.003"],
		defaultTreatmentPlan: "Окклюзионная диагностика, сплинт-терапия, поднятие высоты прикуса композитными накладками / коронками",
		doctorFastNoteTemplate: "Стирание окклюзионных поверхностей моляров и режущих краев резцов до 1/3 коронки (I–II степень). Снижение окклюзионной высоты. Фасетки стирания блестящие.",
	},
	{
		id: 205,
		code: "NON_CARIES_ENAMEL_HYPOPLASIA",
		mkb10: "K00.4",
		name: "Системная/местная гипоплазия эмали",
		shortName: "Гипоплазия эмали",
		alias: "К00.4",
		category: "pathology",
		description: "Врожденное нарушение развития эмали: пятнистая, чашеобразная или бороздчатая форма",
		recommended804nCodes: ["A11.07.012", "A16.07.003"],
		defaultTreatmentPlan: "Реминерализация, микроабразия эмали, эстетическое микропротезирование / виниры",
		doctorFastNoteTemplate: "Симметричные белесоватые и желтоватые углубления эмали на вестибулярной поверхности. Зондирование гладкое, безболезненное. Нарушение амелогенеза в анамнезе.",
	},
	{
		id: 206,
		code: "NON_CARIES_FLUOROSIS",
		mkb10: "K00.3",
		name: "Эндемический флюороз зубов",
		shortName: "Флюороз зубов",
		alias: "К00.3",
		category: "pathology",
		description: "Крапчатость и пигментация эмали вследствие избытка фтора в питьевой воде (штриховая/пятнистая/эрозивная форма)",
		recommended804nCodes: ["A16.07.050", "A16.07.003"],
		defaultTreatmentPlan: "Отбеливание, микроабразия, прямое композитное винирование или ортопедические виниры",
		doctorFastNoteTemplate: "Множественные меловидные и коричневые полосы и пятна по всей коронке зубов. Поверхность эмали блестящая, зонд не задерживается. Эндемический очаг.",
	},
	{
		id: 207,
		code: "NON_CARIES_HYPERESTHESIA",
		mkb10: "K03.8",
		name: "Гиперестезия твердых тканей зуба (повышенная чувствительность)",
		shortName: "Гиперестезия дентина",
		alias: "К03.8",
		category: "pathology",
		description: "Резкая кратковременная боль от температурных, химических и механических раздражителей при обнажении шеек",
		recommended804nCodes: ["A11.07.012", "A16.07.025.001"],
		defaultTreatmentPlan: "Аппликация десенсибилизирующих паст, глубокое фторирование (эмаль-герметизирующий ликвид), лазерная терапия",
		doctorFastNoteTemplate: "Резкая болезненность при воздействии струи холодного воздуха и зондировании обнаженной шейки зуба. Видимых полостей нет. Проведена десенсибилизация.",
	},
] as const;
