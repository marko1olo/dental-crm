/**
 * packages/shared/src/clinical/stomtDefects/endodonticDefectsData.ts
 *
 * Layer 1: Endodontic Tooth Defects Data (Pulpitis, Apical Periodontitis, Resorption, Treated Canals).
 *
 * Compliant with:
 * - Supreme Law: THE HAMMER (Zero Mocks, Absolute Parity)
 * - Mandate 8b: Line count limit <= 800 lines
 * - Mandate 8e: Doctor Autonomy (1-click preset mapping to ICD-10 K04)
 */

import type { ClinicalDefectPreset, StomxToothDefect } from "./types.js";

/**
 * Пульпит зуба (K04.0).
 */
export const STOMX_DEFECT_PULPITIS: StomxToothDefect = {
	id: 7,
	name: "пульпит",
	alias: "Р",
	color: "red",
	order: 1040,
	type: "outpatient",
	key: "require_treatment",
	require_treatment: true,
	crmToothState: "Pulpitis",
	category: "pathology",
	description: "Пульпит зуба (K04.0)",
};

/**
 * Апикальный периодонтит (K04.4, K04.5).
 */
export const STOMX_DEFECT_PERIODONTITIS: StomxToothDefect = {
	id: 8,
	name: "периодонтит",
	alias: "Pt",
	color: "red",
	order: 1050,
	type: "outpatient",
	key: "require_treatment",
	require_treatment: true,
	crmToothState: "Periodontitis",
	category: "pathology",
	description: "Апикальный периодонтит (K04.4, K04.5)",
};

/**
 * Разрушенный корень зуба.
 */
export const STOMX_DEFECT_ROOT: StomxToothDefect = {
	id: 9,
	name: "корень",
	alias: "R",
	color: "red",
	order: 1060,
	type: "outpatient",
	key: "require_treatment",
	require_treatment: true,
	crmToothState: "Root",
	category: "pathology",
	description: "Разрушенный корень зуба, подлежащий лечению или удалению",
};

/**
 * Ранее качественно пролеченные корневые каналы.
 */
export const STOMX_DEFECT_TREATED_CANALS: StomxToothDefect = {
	id: 90,
	name: "каналы лечены",
	alias: "Кл",
	color: "yellow",
	order: 1155,
	type: "outpatient",
	key: "cured_teeth",
	require_treatment: false,
	category: "restoration",
	description: "Ранее качественно обтурированные корневые каналы",
};

/**
 * Периодонтит / костная деструкция по данным рентгена / КЛКТ.
 */
export const STOMX_DEFECT_PERIODONTITIS_RADIOLOGY: StomxToothDefect = {
	id: 18,
	name: "периодонтит",
	alias: "Pt",
	color: null,
	order: 1250,
	type: "outpatient",
	key: "rg_klkt",
	require_treatment: true,
	crmToothState: "Periodontitis",
	category: "radiology",
	description: "Периодонтит / деструкция кости по данным КЛКТ",
};

/**
 * Массив эндодонтических дефектов StomX.
 */
export const STOMX_ENDODONTIC_DEFECTS: readonly StomxToothDefect[] = [
	STOMX_DEFECT_PULPITIS,
	STOMX_DEFECT_PERIODONTITIS,
	STOMX_DEFECT_ROOT,
	STOMX_DEFECT_TREATED_CANALS,
	STOMX_DEFECT_PERIODONTITIS_RADIOLOGY,
] as const;

/**
 * Элементы эндодонтии для иерархического дерева дефектов StomX.
 */
export const STOMX_ENDODONTIC_TREE_ITEMS: readonly StomxToothDefect[] = [
	{ id: 7, name: "пульпит", alias: "Р", color: "red", order: 1040, type: "outpatient", key: "require_treatment", require_treatment: true, crmToothState: "Pulpitis", category: "pathology" },
	{ id: 8, name: "периодонтит", alias: "Pt", color: "red", order: 1050, type: "outpatient", key: "require_treatment", require_treatment: true, crmToothState: "Periodontitis", category: "pathology" },
	{ id: 9, name: "корень", alias: "R", color: "red", order: 1060, type: "outpatient", key: "require_treatment", require_treatment: true, crmToothState: "Root", category: "pathology" },
	{ id: 90, name: "каналы лечены", alias: "Кл", color: "yellow", order: 1155, type: "outpatient", key: "cured_teeth", require_treatment: false, category: "restoration" },
	{ id: 18, name: "периодонтит", alias: "Pt", color: null, order: 1250, type: "outpatient", key: "rg_klkt", require_treatment: true, crmToothState: "Periodontitis", category: "radiology" },
] as const;

/**
 * Клинические пресеты эндодонтических патологий
 * с точной привязкой к МКБ-10 и номенклатуре Минздрава 804н.
 */
export const CLINICAL_ENDODONTIC_PRESETS: readonly ClinicalDefectPreset[] = [
	{
		id: 301,
		code: "PULPITIS_ACUTE_FOCAL",
		mkb10: "K04.01",
		name: "Острый очаговый пульпит",
		shortName: "Пульпит острый очаговый",
		alias: "К04.01",
		category: "pathology",
		description: "Приступообразная самопроизвольная боль с короткими приступами (10-20 мин) и длительными светлыми промежутками, ночные боли",
		recommended804nCodes: ["A16.07.030.001", "A16.07.030.002", "A16.07.030.003", "B01.003.004.001"],
		defaultTreatmentPlan: "Анестезия, коффердам, раскрытие полости, витальная экстирпация, механическая/медикаментозная обработка Ni-Ti, обтурация гуттаперчей",
		doctorFastNoteTemplate: "Глубокая кариозная полость. Зондирование резко болезненно в одной точке проекции рога пульпы. Перкуссия безболезненная. ЭОД 15-20 мкА.",
	},
	{
		id: 302,
		code: "PULPITIS_ACUTE_DIFFUSE",
		mkb10: "K04.02",
		name: "Острый диффузный пульпит",
		shortName: "Пульпит острый диффузный",
		alias: "К04.02",
		category: "pathology",
		description: "Интенсивная иррадиирующая боль по ветвям тройничного нерва, длительные приступы, усиливающиеся от тепла, ночные кризы",
		recommended804nCodes: ["A16.07.030.001", "A16.07.030.002", "A16.07.030.003", "A06.07.007"],
		defaultTreatmentPlan: "Проводниковая анестезия, витальная экстирпация, определение рабочей длины апекслокатором, ультразвуковая ирригация NaOCl 3%, обтурация",
		doctorFastNoteTemplate: "Боль иррадиирует в ухо/висок. Зондирование дна болезненно по всей поверхности, вскрыта точка с каплей геморрагического экссудата. Перкуссия слабо чувствительна.",
	},
	{
		id: 303,
		code: "PULPITIS_CHRONIC_FIBROUS",
		mkb10: "K04.03",
		name: "Хронический фиброзный пульпит",
		shortName: "Пульпит хрон. фиброзный",
		alias: "К04.03",
		category: "pathology",
		description: "Ноющие боли от температурных раздражителей (особенно при перемене температуры), медленно проходящие после устранения",
		recommended804nCodes: ["A16.07.030.001", "A16.07.030.002", "A16.07.030.003"],
		defaultTreatmentPlan: "Инструментальная обработка корневых каналов, ирригация ЭДТА 17% + NaOCl, постоянная обтурация методом латеральной/вертикальной конденсации",
		doctorFastNoteTemplate: "Кариозная полость сообщается с полостью зуба. Зондирование вскрытой пульпы умеренно болезненно, пульпа кровоточит. Перкуссия отрицательная.",
	},
	{
		id: 304,
		code: "PERIODONTITIS_ACUTE_APICAL",
		mkb10: "K04.4",
		name: "Острый апикальный периодонтит пульпарного происхождения",
		shortName: "Периодонтит острый апик.",
		alias: "К04.4",
		category: "pathology",
		description: "Постоянная локализованная ноющая боль, усиливающаяся при накусывании, симптом 'выросшего зуба'",
		recommended804nCodes: ["A16.07.030.002", "A16.07.030.004", "A06.07.007", "B01.003.004.001"],
		defaultTreatmentPlan: "Девитализация/удаление путридных масс, механическое расширение каналов, временное пломбирование гидроксидом кальция на 10-14 дней",
		doctorFastNoteTemplate: "Резкая болезненность при вертикальной перкуссии. Переходная складка гиперемирована, пальпация верхушки корня болезненна. На рентгене расширение периодонтальной щели.",
	},
	{
		id: 305,
		code: "PERIODONTITIS_CHRONIC_APICAL",
		mkb10: "K04.5",
		name: "Хронический апикальный периодонтит (гранулирующий / гранулематозный)",
		shortName: "Периодонтит хрон. апик.",
		alias: "К04.5",
		category: "pathology",
		description: "Бессимптомное течение либо периодический дискомфорт, наличие свища с серозным отделяемым, деструкция кости у верхушки корня",
		recommended804nCodes: ["A16.07.030.002", "A16.07.030.004", "A16.07.030.003", "A06.07.012"],
		defaultTreatmentPlan: "Эндодонтическое перелечивание, ультразвуковая активация гипохлорита, лечебная повязка с кальцием, обтурация после регресса очага",
		doctorFastNoteTemplate: "Коронка зуба изменена в цвете, пломба/кариозная полость. Перкуссия безболезненная. На прицельном снимке деструкция костной ткани с четкими/нечеткими контурами у апекса.",
	},
	{
		id: 306,
		code: "ENDODONTIC_ROOT_RESORPTION",
		mkb10: "K03.3",
		name: "Патологическая резорбция твердых тканей зуба (внутренняя / внешняя)",
		shortName: "Резорбция корня",
		alias: "К03.3",
		category: "pathology",
		description: "Идиопатическое рассасывание дентина со стороны пульповой камеры ('розовое пятно') или со стороны периодонта",
		recommended804nCodes: ["A16.07.030.002", "A16.07.030.003", "A06.07.012"],
		defaultTreatmentPlan: "КЛКТ локализации очага, экстирпация пульпы, пломбирование биокерамическим силером / МТА",
		doctorFastNoteTemplate: "На рентгенограмме неравномерное расширение просвета корневого канала округлой формы / дефект наружного контура корня. Симптом розового зуба.",
	},
] as const;
