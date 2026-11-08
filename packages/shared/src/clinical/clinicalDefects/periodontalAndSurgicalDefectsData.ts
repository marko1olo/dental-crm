/**
 * packages/shared/src/clinical/stomtDefects/periodontalAndSurgicalDefectsData.ts
 *
 * Layer 1: Periodontal, Surgical, Restoration, Anomaly & Healthy Tooth Defects Data.
 *
 * Compliant with:
 * - Supreme Law: THE HAMMER (Zero Mocks, Absolute Parity)
 * - Mandate 8b: Line count limit <= 800 lines
 * - Mandate 8e: Doctor Autonomy (1-click preset mapping to ICD-10 K05, K06, K08)
 */

import type { ClinicalDefectPreset, StomxToothDefect } from "./types.js";

/**
 * 1. Здоровый интактный зуб (Healthy).
 */
export const STOMX_DEFECT_HEALTHY: StomxToothDefect = {
	id: 2,
	name: "здоров",
	alias: "ok",
	color: "green",
	order: 4,
	type: "outpatient",
	key: null,
	require_treatment: false,
	crmToothState: "Healthy",
	category: "healthy",
	description: "Здоровый интактный зуб без признаков патологии",
};

/**
 * 2. Пародонтит (стадии I–III).
 */
export const STOMX_DEFECT_PARODONTITIS: StomxToothDefect = {
	id: 10,
	name: "пародонтит",
	alias: "A",
	color: "red",
	order: 1000,
	type: "outpatient",
	key: "require_treatment",
	require_treatment: true,
	crmToothState: "Periodontitis",
	category: "pathology",
	description: "Пародонтит (стадии I–III)",
	items: [
		{
			id: 10,
			alias: "AI",
			name: "Пародонтит I степени",
			color: "red",
			order: 1000,
			type: "outpatient",
			number: "I",
		},
		{
			id: 11,
			alias: "AII",
			name: "Пародонтит II степени",
			color: "red",
			order: 1010,
			type: "outpatient",
			number: "II",
		},
		{
			id: 12,
			alias: "AIII",
			name: "Пародонтит III степени",
			color: "red",
			order: 1020,
			type: "outpatient",
			number: "III",
		},
	],
};

/**
 * Рецессия десны по Миллеру (классы 1–4).
 */
export const STOMX_DEFECT_RECESSION: StomxToothDefect = {
	id: 78,
	name: "рецессия десны",
	alias: "Рд",
	color: "red",
	order: 1271,
	type: "outpatient",
	key: "require_treatment",
	require_treatment: true,
	category: "pathology",
	description: "Рецессия десны по Миллеру (классы 1–4)",
	items: [
		{
			id: 78,
			alias: "Рд1",
			name: "Рецессия десны 1 класс",
			color: "red",
			order: 1271,
			type: "outpatient",
			number: "1",
		},
		{
			id: 79,
			alias: "Рд2",
			name: "Рецессия десны 2 класс",
			color: "red",
			order: 1272,
			type: "outpatient",
			number: "2",
		},
		{
			id: 80,
			alias: "Рд3",
			name: "Рецессия десны 3 класс",
			color: "red",
			order: 1273,
			type: "outpatient",
			number: "3",
		},
		{
			id: 81,
			alias: "Рд4",
			name: "Рецессия десны 4 класс",
			color: "red",
			order: 1274,
			type: "outpatient",
			number: "4",
		},
	],
};

/**
 * Гингивит (K05.0, K05.1).
 */
export const STOMX_DEFECT_GINGIVITIS: StomxToothDefect = {
	id: 82,
	name: "гингивит",
	alias: "Гн",
	color: "red",
	order: 1275,
	type: "outpatient",
	key: "require_treatment",
	require_treatment: true,
	category: "pathology",
	description: "Катаральный или гипертрофический гингивит (K05.0, K05.1)",
};

/**
 * Зубной камень и отложения.
 */
export const STOMX_DEFECT_CALCULUS: StomxToothDefect = {
	id: 83,
	name: "зубной камень",
	alias: "Зк",
	color: "red",
	order: 1276,
	type: "outpatient",
	key: "require_treatment",
	require_treatment: true,
	category: "pathology",
	description: "Наддесневые и поддесневые зубные отложения",
};

/**
 * Отсутствующий зуб (outpatient).
 */
export const STOMX_DEFECT_MISSING: StomxToothDefect = {
	id: 1,
	name: "отсутствует",
	alias: "О",
	color: "white",
	order: 1080,
	type: "outpatient",
	key: "require_treatment",
	require_treatment: true,
	crmToothState: "Missing",
	category: "pathology",
	description: "Отсутствующий зуб, требующий протезирования/имплантации",
};

/**
 * Запланированное хирургическое удаление.
 */
export const STOMX_DEFECT_REMOVAL: StomxToothDefect = {
	id: 1,
	name: "удаление",
	alias: "У",
	image_alias: "U",
	display_as: "removal",
	medplan_only: true,
	color: "white",
	key: "removal",
	order: 9999,
	type: "outpatient",
	require_treatment: true,
	crmToothState: "Missing",
	category: "surgery",
	description: "Назначено / запланировано удаление зуба",
};

// --- Ортопедические и реставрационные дефекты ---
export const STOMX_DEFECT_FILLING: StomxToothDefect = {
	id: 3,
	name: "пломба",
	alias: "П",
	color: "yellow",
	order: 1150,
	type: "outpatient",
	key: "cured_teeth",
	require_treatment: false,
	crmToothState: "Filled",
	category: "restoration",
	description: "Состоятельная пломба из композита или амальгамы",
};

export const STOMX_DEFECT_CROWN: StomxToothDefect = {
	id: 4,
	name: "коронка",
	alias: "К",
	color: "yellow",
	order: 1160,
	type: "outpatient",
	key: "cured_teeth",
	require_treatment: false,
	crmToothState: "Crown",
	category: "restoration",
	description: "Искусственная коронка (металлокерамика, цирконий, e.max)",
};

export const STOMX_DEFECT_ARTIFICIAL: StomxToothDefect = {
	id: 5,
	name: "искусственный",
	alias: "И",
	color: "yellow",
	order: 1170,
	type: "outpatient",
	key: "cured_teeth",
	require_treatment: false,
	category: "restoration",
	description: "Искусственный зуб мостовидного или съемного протеза",
};

export const STOMX_DEFECT_IMPLANT: StomxToothDefect = {
	id: 13,
	name: "имплантат",
	alias: "ИМ",
	color: "yellow",
	order: 1180,
	type: "outpatient",
	key: "cured_teeth",
	require_treatment: false,
	crmToothState: "Implant",
	category: "restoration",
	description: "Остеоинтегрированный дентальный имплантат",
};

export const STOMX_DEFECT_VENEER: StomxToothDefect = {
	id: 14,
	name: "винир",
	alias: "В",
	color: "yellow",
	order: 1190,
	type: "outpatient",
	key: "cured_teeth",
	require_treatment: false,
	category: "restoration",
	description: "Керамический или композитный винир",
};

export const STOMX_DEFECT_INLAY: StomxToothDefect = {
	id: 15,
	name: "вкладка",
	alias: "ВК",
	color: "yellow",
	order: 1200,
	type: "outpatient",
	key: "cured_teeth",
	require_treatment: false,
	category: "restoration",
	description: "Культевая или восстановительная вкладка (inlay)",
};

export const STOMX_DEFECT_ONLAY: StomxToothDefect = {
	id: 91,
	name: "накладка",
	alias: "НК",
	color: "yellow",
	order: 1205,
	type: "outpatient",
	key: "cured_teeth",
	require_treatment: false,
	category: "restoration",
	description: "Окклюзионная накладка (onlay/overlay)",
};

export const STOMX_DEFECT_SEALANT: StomxToothDefect = {
	id: 64,
	name: "герм. фиссур",
	alias: "Гф",
	color: "yellow",
	order: 1210,
	type: "outpatient",
	key: "cured_teeth",
	require_treatment: false,
	category: "restoration",
	description: "Герметизация фиссур силантом",
};

export const STOMX_DEFECT_FACET: StomxToothDefect = {
	id: 65,
	name: "фасетка",
	alias: "Ф",
	color: "yellow",
	order: 1220,
	type: "outpatient",
	key: "cured_teeth",
	require_treatment: false,
	category: "restoration",
	description: "Фасетка мостовидного протеза",
};

// --- Рентгенологические аномалии ---
export const STOMX_DEFECT_DYSTOPIA_RADIOLOGY: StomxToothDefect = {
	id: 16,
	name: "дистопия",
	alias: "Д",
	color: null,
	order: 1230,
	type: "outpatient",
	key: "rg_klkt",
	require_treatment: true,
	crmToothState: "Retained",
	category: "radiology",
	description: "Дистопия зуба по рентгенологическим данным / КЛКТ",
};

export const STOMX_DEFECT_RETENTION_RADIOLOGY: StomxToothDefect = {
	id: 17,
	name: "ретенция",
	alias: "Rt",
	color: null,
	order: 1240,
	type: "outpatient",
	key: "rg_klkt",
	require_treatment: true,
	crmToothState: "Retained",
	category: "radiology",
	description: "Ретенция зуба по рентгенологическим данным / КЛКТ",
};

export const STOMX_DEFECT_MISSING_RADIOLOGY: StomxToothDefect = {
	id: 20,
	name: "отсутствует",
	alias: "О",
	color: null,
	order: 1270,
	type: "outpatient",
	key: "rg_klkt",
	require_treatment: true,
	crmToothState: "Missing",
	category: "radiology",
	description: "Отсутствие зуба / зачатка по рентгену",
};

// --- Аномалии положения зуба (ids 38..47) ---
export const STOMX_POSITION_DEFECTS: readonly StomxToothDefect[] = [
	{
		id: 38,
		name: "вестибулярное",
		alias: "В",
		color: "white",
		order: 200,
		type: "anomaly",
		key: "position",
		require_treatment: false,
		category: "position_anomaly",
		description: "Вестибулярное положение зуба",
	},
	{
		id: 39,
		name: "оральное",
		alias: "О",
		color: "white",
		order: 201,
		type: "anomaly",
		key: "position",
		require_treatment: false,
		category: "position_anomaly",
		description: "Оральное положение зуба",
	},
	{
		id: 40,
		name: "дистальное",
		alias: "Д",
		color: "white",
		order: 202,
		type: "anomaly",
		key: "position",
		require_treatment: false,
		category: "position_anomaly",
		description: "Дистальное положение зуба",
	},
	{
		id: 41,
		name: "мезиальное",
		alias: "М",
		color: "white",
		order: 203,
		type: "anomaly",
		key: "position",
		require_treatment: false,
		category: "position_anomaly",
		description: "Мезиальное положение зуба",
	},
	{
		id: 42,
		name: "супраположение",
		alias: "С",
		color: "white",
		order: 204,
		type: "anomaly",
		key: "position",
		require_treatment: false,
		category: "position_anomaly",
		description: "Супраположение зуба",
	},
	{
		id: 43,
		name: "инфраположение",
		alias: "И",
		color: "white",
		order: 205,
		type: "anomaly",
		key: "position",
		require_treatment: false,
		category: "position_anomaly",
		description: "Инфраположение зуба",
	},
	{
		id: 44,
		name: "тортоаномалия",
		alias: "Т",
		color: "white",
		order: 206,
		type: "anomaly",
		key: "position",
		require_treatment: false,
		category: "position_anomaly",
		description: "Тортоаномалия / тортоокклюзия зуба",
	},
	{
		id: 45,
		name: "транспозиция",
		alias: "Тр",
		color: "white",
		order: 207,
		type: "anomaly",
		key: "position",
		require_treatment: false,
		category: "position_anomaly",
		description: "Транспозиция зуба",
	},
	{
		id: 46,
		name: "протрузия",
		alias: "Пр",
		color: "white",
		order: 208,
		type: "anomaly",
		key: "position",
		require_treatment: false,
		category: "position_anomaly",
		description: "Протрузия резцов",
	},
	{
		id: 47,
		name: "ретрузия",
		alias: "Рт",
		color: "white",
		order: 209,
		type: "anomaly",
		key: "position",
		require_treatment: false,
		category: "position_anomaly",
		description: "Ретрузия резцов",
	},
] as const;

// --- Аномалии прорезывания (ids 48..50) ---
export const STOMX_ERUPTION_DEFECTS: readonly StomxToothDefect[] = [
	{
		id: 48,
		name: "ретенция",
		alias: "Rt",
		color: "white",
		order: 210,
		type: "anomaly",
		key: "time_cut",
		require_treatment: true,
		crmToothState: "Retained",
		category: "time_cut_anomaly",
		description: "Ретенция зуба",
	},
	{
		id: 49,
		name: "персистентный",
		alias: "П",
		color: "white",
		order: 211,
		type: "anomaly",
		key: "time_cut",
		require_treatment: false,
		category: "time_cut_anomaly",
		description: "Персистентный (задержавшийся) молочный зуб",
	},
	{
		id: 50,
		name: "ранее удаленный",
		alias: "РУ",
		color: "white",
		order: 212,
		type: "anomaly",
		key: "time_cut",
		require_treatment: false,
		crmToothState: "Missing",
		category: "time_cut_anomaly",
		description: "Ранее удаленный постоянный или молочный зуб",
	},
] as const;

// --- Аномалии количества (ids 51..53) ---
export const STOMX_AMOUNT_DEFECTS: readonly StomxToothDefect[] = [
	{
		id: 51,
		name: "адентия первичная",
		alias: "АД",
		color: "white",
		order: 213,
		type: "anomaly",
		key: "amount",
		require_treatment: true,
		crmToothState: "Missing",
		category: "amount_anomaly",
		description: "Врожденная первичная адентия",
	},
	{
		id: 52,
		name: "адентия вторичная",
		alias: "АВ",
		color: "white",
		order: 214,
		type: "anomaly",
		key: "amount",
		require_treatment: true,
		crmToothState: "Missing",
		category: "amount_anomaly",
		description: "Вторичная приобретенная адентия (потеря зуба)",
	},
	{
		id: 53,
		name: "сверхкомплектный",
		alias: "СК",
		color: "white",
		order: 215,
		type: "anomaly",
		key: "amount",
		require_treatment: true,
		category: "amount_anomaly",
		description: "Сверхкомплектный зуб",
	},
] as const;

/**
 * Элементы для иерархического дерева дефектов StomX (пародонтология, хирургия, ортопедия).
 */
export const STOMX_PERIODONTAL_AND_SURGICAL_TREE_ITEMS: readonly StomxToothDefect[] = [
	{ id: 2, name: "здоров", alias: "ok", color: "green", order: 4, type: "outpatient", key: null, require_treatment: false, crmToothState: "Healthy", category: "healthy" },
	{
		id: 10,
		name: "пародонтит",
		alias: "A",
		color: "red",
		order: 1000,
		type: "outpatient",
		key: "require_treatment",
		require_treatment: true,
		crmToothState: "Periodontitis",
		category: "pathology",
		items: [
			{ id: 10, alias: "AI", name: "пародонтит I ст.", color: "red", order: 1000, type: "outpatient", number: "I" },
			{ id: 11, alias: "AII", name: "пародонтит II ст.", color: "red", order: 1010, type: "outpatient", number: "II" },
			{ id: 12, alias: "AIII", name: "пародонтит III ст.", color: "red", order: 1020, type: "outpatient", number: "III" },
		],
	},
	{ id: 1, name: "отсутствует", alias: "О", color: "white", order: 1080, type: "outpatient", key: "require_treatment", require_treatment: true, crmToothState: "Missing", category: "pathology" },
	{ id: 3, name: "пломба", alias: "П", color: "yellow", order: 1150, type: "outpatient", key: "cured_teeth", require_treatment: false, crmToothState: "Filled", category: "restoration" },
	{ id: 4, name: "коронка", alias: "К", color: "yellow", order: 1160, type: "outpatient", key: "cured_teeth", require_treatment: false, crmToothState: "Crown", category: "restoration" },
	{ id: 5, name: "искусственный", alias: "И", color: "yellow", order: 1170, type: "outpatient", key: "cured_teeth", require_treatment: false, category: "restoration" },
	{ id: 13, name: "имплантат", alias: "ИМ", color: "yellow", order: 1180, type: "outpatient", key: "cured_teeth", require_treatment: false, crmToothState: "Implant", category: "restoration" },
	{ id: 14, name: "винир", alias: "В", color: "yellow", order: 1190, type: "outpatient", key: "cured_teeth", require_treatment: false, category: "restoration" },
	{ id: 15, name: "вкладка", alias: "ВК", color: "yellow", order: 1200, type: "outpatient", key: "cured_teeth", require_treatment: false, category: "restoration" },
	{ id: 91, name: "накладка", alias: "НК", color: "yellow", order: 1205, type: "outpatient", key: "cured_teeth", require_treatment: false, category: "restoration" },
	{ id: 64, name: "герм. фиссур", alias: "Гф", color: "yellow", order: 1210, type: "outpatient", key: "cured_teeth", require_treatment: false, category: "restoration" },
	{ id: 65, name: "фасетка", alias: "Ф", color: "yellow", order: 1220, type: "outpatient", key: "cured_teeth", require_treatment: false, category: "restoration" },
	{ id: 16, name: "дистопия", alias: "Д", color: null, order: 1230, type: "outpatient", key: "rg_klkt", require_treatment: true, crmToothState: "Retained", category: "radiology" },
	{ id: 17, name: "ретенция", alias: "Rt", color: null, order: 1240, type: "outpatient", key: "rg_klkt", require_treatment: true, crmToothState: "Retained", category: "radiology" },
	{ id: 20, name: "отсутствует", alias: "О", color: null, order: 1270, type: "outpatient", key: "rg_klkt", require_treatment: true, crmToothState: "Missing", category: "radiology" },
	{
		id: 78,
		name: "рецессия десны",
		alias: "Рд",
		color: "red",
		order: 1271,
		type: "outpatient",
		key: "require_treatment",
		require_treatment: true,
		category: "pathology",
		items: [
			{ id: 78, alias: "Рд1", name: "рецессия 1 класс", color: "red", order: 1271, type: "outpatient", number: "1" },
			{ id: 79, alias: "Рд2", name: "рецессия 2 класс", color: "red", order: 1272, type: "outpatient", number: "2" },
			{ id: 80, alias: "Рд3", name: "рецессия 3 класс", color: "red", order: 1273, type: "outpatient", number: "3" },
			{ id: 81, alias: "Рд4", name: "рецессия 4 класс", color: "red", order: 1274, type: "outpatient", number: "4" },
		],
	},
	{ id: 82, name: "гингивит", alias: "Гн", color: "red", order: 1275, type: "outpatient", key: "require_treatment", require_treatment: true, category: "pathology" },
	{ id: 83, name: "зубной камень", alias: "Зк", color: "red", order: 1276, type: "outpatient", key: "require_treatment", require_treatment: true, category: "pathology" },
	{ id: 1, name: "удаление", alias: "У", image_alias: "U", display_as: "removal", medplan_only: true, color: "white", key: "removal", order: 9999, type: "outpatient", require_treatment: true, crmToothState: "Missing", category: "surgery" },
] as const;

/**
 * Клинические пресеты пародонтологии и хирургии
 * с точной привязкой к МКБ-10 и номенклатуре Минздрава 804н.
 */
export const CLINICAL_PERIODONTAL_PRESETS: readonly ClinicalDefectPreset[] = [
	{
		id: 401,
		code: "PERIODONTITIS_CHRONIC_MILD",
		mkb10: "K05.3",
		name: "Хронический генерализованный пародонтит легкой степени",
		shortName: "Пародонтит легкий",
		alias: "К05.3-легк",
		category: "pathology",
		description: "Глубина пародонтальных карманов до 3.5 мм, резорбция межальвеолярных перегородок до 1/3, подвижность 0-I степени",
		recommended804nCodes: ["A16.07.039", "A16.07.051", "A22.07.002"],
		defaultTreatmentPlan: "УЗ-скейлинг, кюретаж закрытый, антисептическая обработка хлоргексидином 0.2%, обучение гигиене",
		doctorFastNoteTemplate: "Десна гиперемирована, отечна, кровоточит при зондировании. Зубодесневые карманы 3-3.5 мм. На наддесневых и поддесневых поверхностях обильный зубной камень.",
	},
	{
		id: 402,
		code: "PERIODONTITIS_CHRONIC_MODERATE",
		mkb10: "K05.3",
		name: "Хронический генерализованный пародонтит средней степени",
		shortName: "Пародонтит средний",
		alias: "К05.3-сред",
		category: "pathology",
		description: "Глубина карманов 4-5 мм, деструкция кости до 1/2 длины корня, патологическая подвижность I-II степени, смещение зубов",
		recommended804nCodes: ["A16.07.039", "A16.07.019", "A16.07.040"],
		defaultTreatmentPlan: "Vector-терапия, закрытый/открытый кюретаж, шинирование подвижных зубов стекловолокном, плазмолифтинг десны",
		doctorFastNoteTemplate: "Пародонтальные карманы 4.5-5 мм с серозно-гнойным экссудатом. Подвижность II степени. На рентгенограмме деструкция костной ткани альвеолы на 1/2.",
	},
	{
		id: 403,
		code: "PERIODONTITIS_CHRONIC_SEVERE",
		mkb10: "K05.3",
		name: "Хронический генерализованный пародонтит тяжелой степени",
		shortName: "Пародонтит тяжелый",
		alias: "К05.3-тяж",
		category: "pathology",
		description: "Глубина карманов более 6 мм, деструкция кости > 1/2 длины корня, подвижность III степени, веерообразное расхождение",
		recommended804nCodes: ["A16.07.040", "A16.07.001", "A16.07.042"],
		defaultTreatmentPlan: "Лоскутные операции с костной пластикой, удаление безнадежных зубов, временное шинирование и протезирование",
		doctorFastNoteTemplate: "Глубокие пародонтальные карманы до 7 мм. Подвижность III степени. Выраженная рецессия десны. Показано комплексное хирургическое и ортопедическое лечение.",
	},
	{
		id: 404,
		code: "GINGIVITIS_CATARRHAL",
		mkb10: "K05.0",
		name: "Хронический катаральный гингивит",
		shortName: "Гингивит катаральный",
		alias: "К05.0",
		category: "pathology",
		description: "Воспаление маргинальной десны и межзубных сосочков без нарушения зубодесневого прикрепления",
		recommended804nCodes: ["A16.07.051", "A11.07.010"],
		defaultTreatmentPlan: "Профессиональная гигиена полости рта (AirFlow + ультразвук), противовоспалительные аппликации (Метрогил Дента)",
		doctorFastNoteTemplate: "Межзубные десневые сосочки застойной гиперемии, отечны, валик десны утолщен. Кровоточивость при зондировании индекс PMA 35%. Целостность зубодесневого прикрепления сохранена.",
	},
	{
		id: 405,
		code: "GINGIVAL_RECESSION_MILLER",
		mkb10: "K06.0",
		name: "Рецессия десны (по классификации Миллера)",
		shortName: "Рецессия десны",
		alias: "К06.0",
		category: "pathology",
		description: "Апикальное смещение десневого края относительно эмалево-цементной границы с обнажением поверхности корня",
		recommended804nCodes: ["A16.07.042", "A16.07.026"],
		defaultTreatmentPlan: "Пластика рецессии десны соединительнотканным трансплантатом с неба (туннельная методика / коронально смещенный лоскут)",
		doctorFastNoteTemplate: "Обнажение корня зуба на 2.5 мм. Слизисто-десневая граница не пересечена (I класс Миллера). Межзубные сосочки интактны. Проведена подготовка к мукогингивальной хирургии.",
	},
] as const;

export const CLINICAL_SURGICAL_PRESETS: readonly ClinicalDefectPreset[] = [
	{
		id: 501,
		code: "SURGERY_EXTRACTION_SIMPLE",
		mkb10: "K08.1",
		name: "Операция удаления постоянного зуба (простое)",
		shortName: "Удаление простое",
		alias: "К08.1-прост",
		category: "surgery",
		description: "Удаление однокорневого или подвижного многокорневого зуба щипцами/элеватором без выпиливания кости",
		recommended804nCodes: ["A16.07.001.001", "B01.003.004.001", "A25.07.001"],
		defaultTreatmentPlan: "Анестезия, синденсмотомия, наложение щипцов, люксация, тракция, ревизия лунки, гемостаз губкой",
		doctorFastNoteTemplate: "Под инфильтрационной/проводниковой анестезией зуб удален щипцами без осложнений. Лунка кюретирована, заполнен гемостатической коллагеновой губкой. Рекомендации даны.",
	},
	{
		id: 502,
		code: "SURGERY_EXTRACTION_COMPLEX",
		mkb10: "K08.1",
		name: "Операция сложного удаления зуба с разъединением корней",
		shortName: "Удаление сложное",
		alias: "К08.1-сложн",
		category: "surgery",
		description: "Удаление многокорневого зуба с разрушенной коронкой, искривленными корнями или гиперцементозом, сепарация бором",
		recommended804nCodes: ["A16.07.001.002", "A16.07.001.003", "A16.07.097"],
		defaultTreatmentPlan: "Анестезия, рассечение бифуркации бором, элевация корней по отдельности, сглаживание костных краев, шов Vicryl 4-0",
		doctorFastNoteTemplate: "Сложное удаление: коронковая часть разрушена ниже уровня десны. Проведена сепарация корней твердосплавным бором. Корни извлечены элеватором. Наложены 2 узловых шва.",
	},
	{
		id: 503,
		code: "SURGERY_IMPLANT_PLACEMENT",
		mkb10: "K08.1",
		name: "Дентальная имплантация (установка имплантата)",
		shortName: "Имплантация",
		alias: "К08.1-имплант",
		category: "surgery",
		description: "Хирургическая установка внутрикостного винтового имплантата в альвеолярный гребень",
		recommended804nCodes: ["A16.07.006", "A16.07.006.002", "A06.07.012"],
		defaultTreatmentPlan: "Разрез, отслаивание лоскута, ступенчатое препарирование костного ложа по протоколу, установка имплантата с торком >= 35 Нсм, ушивание",
		doctorFastNoteTemplate: "Установлен дентальный имплантат в позицию отсутствующего зуба. Первичная стабильность 40 Нсм (ISQ 75). Установлен винт-заглушка/ФДМ, наглухо ушито.",
	},
] as const;
