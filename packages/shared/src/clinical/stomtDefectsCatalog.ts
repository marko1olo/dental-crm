/**
 * packages/shared/src/clinical/stomtDefectsCatalog.ts
 *
 * StomX Tooth Defects, Position Anomalies, Tooth Anatomy & Surface Harmonizer.
 * Parity with StomX catalogs: tooth_defects.json, tooth_defects_tree.json, teeth_adult.json, teeth_child.json.
 *
 * Compliant with:
 * - Supreme Law: THE HAMMER (Zero Mocks, Absolute Parity)
 * - Mandate 8e: Doctor Autonomy (No false blockers, instant preset application)
 * - Mandate 8i: Specialized Outpatient Bounded Context (Form 043/u, Nomenclature 804n)
 * - Mandate 8k: Friction-Killer Law (1-tap status application)
 */

export type StomxDefectColor =
	| "green"
	| "red"
	| "yellow"
	| "white"
	| "orange"
	| "blue"
	| "purple"
	| null;

export type StomxDefectType = "outpatient" | "anomaly" | "orthodontic";

export type StomxDefectKey =
	| "require_treatment"
	| "cured_teeth"
	| "rg_klkt"
	| "position"
	| "time_cut"
	| "amount"
	| "colors"
	| "tvtk"
	| "forms"
	| "md"
	| "removal"
	| null;

export type StomxDefectCategory =
	| "healthy"
	| "position_anomaly"
	| "time_cut_anomaly"
	| "amount_anomaly"
	| "structure_anomaly"
	| "pathology"
	| "restoration"
	| "radiology"
	| "surgery";

export type CrmToothState =
	| "Caries"
	| "Pulpitis"
	| "Periodontitis"
	| "Missing"
	| "Crown"
	| "Implant"
	| "Filled"
	| "Healthy"
	| "Planned_Implant"
	| "Retained"
	| "Root";

export type StomxPositionAnomalyCode =
	| "В"
	| "О"
	| "Д"
	| "М"
	| "С"
	| "И"
	| "Т"
	| "Тр"
	| "Пр"
	| "Рт";

export interface StomxPositionAnomaly {
	id: number;
	name: string;
	alias: StomxPositionAnomalyCode;
	latinAlias: string;
	color: "white";
	order: number;
	key: "position";
	type: "anomaly";
	description: string;
}

export interface StomxToothDefectItem {
	id: number;
	alias: string;
	name?: string | undefined;
	color: StomxDefectColor;
	order: number;
	type: StomxDefectType;
	number?: string | undefined;
}

export interface StomxToothDefect {
	id: number;
	name: string;
	alias: string;
	color: StomxDefectColor;
	order: number;
	type: StomxDefectType;
	key: StomxDefectKey;
	require_treatment: boolean;
	crmToothState?: CrmToothState | undefined;
	category: StomxDefectCategory;
	description?: string | undefined;
	items?: StomxToothDefectItem[] | undefined;
	medplan_only?: boolean | undefined;
	display_as?: string | undefined;
	image_alias?: string | undefined;
}

export interface StomxAnatomicalTooth {
	id: number;
	name: string; // FDI code e.g. "18", "55"
	quoter: 1 | 2 | 3 | 4; // FDI Quadrant 1..4
	quoter_order: number;
	is_child: 0 | 1 | 2; // 0 = permanent, 1 = deciduous, 2 = jaw structure
	type: "T" | "J"; // Tooth or Jaw
	horizontal_align: "left" | "right";
	vertical_align: "top" | "bottom";
	jaw: "upper" | "lower";
}

export interface StomxAnatomicalSurface {
	code: string;
	nameRu: string;
	descRu: string;
	latinCode: string;
}

/**
 * Аномалии положения зуба (StomX type="anomaly", key="position")
 */
export const STOMX_POSITION_ANOMALIES: readonly StomxPositionAnomaly[] = [
	{
		id: 38,
		name: "вестибулярное",
		alias: "В",
		latinAlias: "V",
		color: "white",
		order: 200,
		key: "position",
		type: "anomaly",
		description: "Вестибулярное положение (смещение/наклон зуба щечно или губно)",
	},
	{
		id: 39,
		name: "оральное",
		alias: "О",
		latinAlias: "O",
		color: "white",
		order: 201,
		key: "position",
		type: "anomaly",
		description: "Оральное положение (смещение/наклон зуба нёбно или язычно)",
	},
	{
		id: 40,
		name: "дистальное",
		alias: "Д",
		latinAlias: "D",
		color: "white",
		order: 202,
		key: "position",
		type: "anomaly",
		description: "Дистальное положение (смещение зуба назад по зубной дуге)",
	},
	{
		id: 41,
		name: "мезиальное",
		alias: "М",
		latinAlias: "M",
		color: "white",
		order: 203,
		key: "position",
		type: "anomaly",
		description: "Мезиальное положение (смещение зуба вперед к средней линии)",
	},
	{
		id: 42,
		name: "супраположение",
		alias: "С",
		latinAlias: "S",
		color: "white",
		order: 204,
		key: "position",
		type: "anomaly",
		description: "Супраположение (выдвижение зуба выше окклюзионной плоскости)",
	},
	{
		id: 43,
		name: "инфраположение",
		alias: "И",
		latinAlias: "I",
		color: "white",
		order: 205,
		key: "position",
		type: "anomaly",
		description: "Инфраположение (расположение зуба ниже окклюзионной плоскости)",
	},
	{
		id: 44,
		name: "тортоаномалия",
		alias: "Т",
		latinAlias: "T",
		color: "white",
		order: 206,
		key: "position",
		type: "anomaly",
		description: "Тортоаномалия / тортоокклюзия (поворот зуба вокруг продольной оси)",
	},
	{
		id: 45,
		name: "транспозиция",
		alias: "Тр",
		latinAlias: "Tr",
		color: "white",
		order: 207,
		key: "position",
		type: "anomaly",
		description: "Транспозиция (взаимная перестановка зубов в зубном ряду)",
	},
	{
		id: 46,
		name: "протрузия",
		alias: "Пр",
		latinAlias: "Pr",
		color: "white",
		order: 208,
		key: "position",
		type: "anomaly",
		description: "Протрузия (вестибулярный наклон передних зубов)",
	},
	{
		id: 47,
		name: "ретрузия",
		alias: "Рт",
		latinAlias: "Rt",
		color: "white",
		order: 209,
		key: "position",
		type: "anomaly",
		description: "Ретрузия (оральный наклон передних зубов)",
	},
] as const;

/**
 * Полный каталог дефектов StomX с привязкой к CRM-состояниям зубной формулы.
 * Клинические нозологии (outpatient) и реставрации имеют приоритет перед аномалиями положения.
 */
export const STOMX_TOOTH_DEFECTS: readonly StomxToothDefect[] = [
	// 1. Здоров (Healthy)
	{
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
	},

	// 2. Нозологии, требующие лечения (require_treatment, color="red")
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
	},
	{
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
	},
	{
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
	},
	{
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
	},
	{
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
	},
	{
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
	},
	{
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
	},
	{
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
	},
	{
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
	},
	{
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
	},
	{
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
	},
	{
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
	},
	{
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
	},
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
	},
	{
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
	},
	{
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
	},

	// 3. Вылеченные / Восстановленные зубы (cured_teeth, color="yellow")
	{
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
	},
	{
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
	},
	{
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
	},
	{
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
	},
	{
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
	},
	{
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
	},
	{
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
	},
	{
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
	},
	{
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
	},
	{
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
	},

	// 4. Рентген / КЛКТ (rg_klkt, color=null)
	{
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
	},
	{
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
	},
	{
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
	},
	{
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
	},
	{
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
	},

	// 5. Хирургическое удаление (medplan_only)
	{
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
	},

	// 6. Аномалии положения зуба (type="anomaly", key="position")
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

	// 7. Аномалии прорезывания (time_cut)
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

	// 8. Аномалии количества (amount)
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
 * Иерархическое дерево дефектов StomX (tooth_defects_tree.json)
 */
export const STOMX_DEFECTS_TREE: readonly StomxToothDefect[] = [
	{
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
	},
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
			{
				id: 10,
				alias: "AI",
				name: "пародонтит I ст.",
				color: "red",
				order: 1000,
				type: "outpatient",
				number: "I",
			},
			{
				id: 11,
				alias: "AII",
				name: "пародонтит II ст.",
				color: "red",
				order: 1010,
				type: "outpatient",
				number: "II",
			},
			{
				id: 12,
				alias: "AIII",
				name: "пародонтит III ст.",
				color: "red",
				order: 1020,
				type: "outpatient",
				number: "III",
			},
		],
	},
	{
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
	},
	{
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
	},
	{
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
	},
	{
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
	},
	{
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
	},
	{
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
	},
	{
		id: 59,
		name: "пигментация",
		alias: "Пг",
		color: "red",
		order: 1090,
		type: "outpatient",
		key: "require_treatment",
		require_treatment: true,
		category: "pathology",
	},
	{
		id: 60,
		name: "дефект пломбы",
		alias: "Дп",
		color: "red",
		order: 1100,
		type: "outpatient",
		key: "require_treatment",
		require_treatment: true,
		category: "pathology",
	},
	{
		id: 76,
		name: "дефект коронки",
		alias: "Дк",
		color: "red",
		order: 1110,
		type: "outpatient",
		key: "require_treatment",
		require_treatment: true,
		category: "pathology",
	},
	{
		id: 61,
		name: "клин дефект",
		alias: "Кд",
		color: "red",
		order: 1120,
		type: "outpatient",
		key: "require_treatment",
		require_treatment: true,
		category: "pathology",
	},
	{
		id: 62,
		name: "гипоплазия",
		alias: "Г",
		color: "red",
		order: 1130,
		type: "outpatient",
		key: "require_treatment",
		require_treatment: true,
		category: "pathology",
	},
	{
		id: 63,
		name: "флюороз",
		alias: "Фл",
		color: "red",
		order: 1140,
		type: "outpatient",
		key: "require_treatment",
		require_treatment: true,
		category: "pathology",
	},
	{
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
	},
	{
		id: 90,
		name: "каналы лечены",
		alias: "Кл",
		color: "yellow",
		order: 1155,
		type: "outpatient",
		key: "cured_teeth",
		require_treatment: false,
		category: "restoration",
	},
	{
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
	},
	{
		id: 5,
		name: "искусственный",
		alias: "И",
		color: "yellow",
		order: 1170,
		type: "outpatient",
		key: "cured_teeth",
		require_treatment: false,
		category: "restoration",
	},
	{
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
	},
	{
		id: 14,
		name: "винир",
		alias: "В",
		color: "yellow",
		order: 1190,
		type: "outpatient",
		key: "cured_teeth",
		require_treatment: false,
		category: "restoration",
	},
	{
		id: 15,
		name: "вкладка",
		alias: "ВК",
		color: "yellow",
		order: 1200,
		type: "outpatient",
		key: "cured_teeth",
		require_treatment: false,
		category: "restoration",
	},
	{
		id: 91,
		name: "накладка",
		alias: "НК",
		color: "yellow",
		order: 1205,
		type: "outpatient",
		key: "cured_teeth",
		require_treatment: false,
		category: "restoration",
	},
	{
		id: 64,
		name: "герм. фиссур",
		alias: "Гф",
		color: "yellow",
		order: 1210,
		type: "outpatient",
		key: "cured_teeth",
		require_treatment: false,
		category: "restoration",
	},
	{
		id: 65,
		name: "фасетка",
		alias: "Ф",
		color: "yellow",
		order: 1220,
		type: "outpatient",
		key: "cured_teeth",
		require_treatment: false,
		category: "restoration",
	},
	{
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
	},
	{
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
	},
	{
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
	},
	{
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
	},
	{
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
	},
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
			{
				id: 78,
				alias: "Рд1",
				name: "рецессия 1 класс",
				color: "red",
				order: 1271,
				type: "outpatient",
				number: "1",
			},
			{
				id: 79,
				alias: "Рд2",
				name: "рецессия 2 класс",
				color: "red",
				order: 1272,
				type: "outpatient",
				number: "2",
			},
			{
				id: 80,
				alias: "Рд3",
				name: "рецессия 3 класс",
				color: "red",
				order: 1273,
				type: "outpatient",
				number: "3",
			},
			{
				id: 81,
				alias: "Рд4",
				name: "рецессия 4 класс",
				color: "red",
				order: 1274,
				type: "outpatient",
				number: "4",
			},
		],
	},
	{
		id: 82,
		name: "гингивит",
		alias: "Гн",
		color: "red",
		order: 1275,
		type: "outpatient",
		key: "require_treatment",
		require_treatment: true,
		category: "pathology",
	},
	{
		id: 83,
		name: "зубной камень",
		alias: "Зк",
		color: "red",
		order: 1276,
		type: "outpatient",
		key: "require_treatment",
		require_treatment: true,
		category: "pathology",
	},
	{
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
	},
] as const;

/**
 * 32 постоянных зуба взрослого человека (FDI 11..48) из StomX teeth_adult.json
 */
export const STOMX_ADULT_TEETH: readonly StomxAnatomicalTooth[] = [
	// Квадрант 1: верхний правый (18–11)
	{ id: 1, name: "18", quoter: 1, quoter_order: 0, is_child: 0, type: "T", horizontal_align: "left", vertical_align: "top", jaw: "upper" },
	{ id: 2, name: "17", quoter: 1, quoter_order: 1, is_child: 0, type: "T", horizontal_align: "left", vertical_align: "top", jaw: "upper" },
	{ id: 3, name: "16", quoter: 1, quoter_order: 2, is_child: 0, type: "T", horizontal_align: "left", vertical_align: "top", jaw: "upper" },
	{ id: 4, name: "15", quoter: 1, quoter_order: 3, is_child: 0, type: "T", horizontal_align: "left", vertical_align: "top", jaw: "upper" },
	{ id: 5, name: "14", quoter: 1, quoter_order: 4, is_child: 0, type: "T", horizontal_align: "left", vertical_align: "top", jaw: "upper" },
	{ id: 6, name: "13", quoter: 1, quoter_order: 5, is_child: 0, type: "T", horizontal_align: "left", vertical_align: "top", jaw: "upper" },
	{ id: 7, name: "12", quoter: 1, quoter_order: 6, is_child: 0, type: "T", horizontal_align: "left", vertical_align: "top", jaw: "upper" },
	{ id: 8, name: "11", quoter: 1, quoter_order: 7, is_child: 0, type: "T", horizontal_align: "left", vertical_align: "top", jaw: "upper" },

	// Квадрант 2: верхний левый (21–28)
	{ id: 9, name: "21", quoter: 2, quoter_order: 0, is_child: 0, type: "T", horizontal_align: "right", vertical_align: "top", jaw: "upper" },
	{ id: 10, name: "22", quoter: 2, quoter_order: 1, is_child: 0, type: "T", horizontal_align: "right", vertical_align: "top", jaw: "upper" },
	{ id: 11, name: "23", quoter: 2, quoter_order: 2, is_child: 0, type: "T", horizontal_align: "right", vertical_align: "top", jaw: "upper" },
	{ id: 12, name: "24", quoter: 2, quoter_order: 3, is_child: 0, type: "T", horizontal_align: "right", vertical_align: "top", jaw: "upper" },
	{ id: 13, name: "25", quoter: 2, quoter_order: 4, is_child: 0, type: "T", horizontal_align: "right", vertical_align: "top", jaw: "upper" },
	{ id: 14, name: "26", quoter: 2, quoter_order: 5, is_child: 0, type: "T", horizontal_align: "right", vertical_align: "top", jaw: "upper" },
	{ id: 15, name: "27", quoter: 2, quoter_order: 6, is_child: 0, type: "T", horizontal_align: "right", vertical_align: "top", jaw: "upper" },
	{ id: 16, name: "28", quoter: 2, quoter_order: 7, is_child: 0, type: "T", horizontal_align: "right", vertical_align: "top", jaw: "upper" },

	// Квадрант 3: нижний правый (48–41)
	{ id: 17, name: "48", quoter: 3, quoter_order: 0, is_child: 0, type: "T", horizontal_align: "left", vertical_align: "bottom", jaw: "lower" },
	{ id: 18, name: "47", quoter: 3, quoter_order: 1, is_child: 0, type: "T", horizontal_align: "left", vertical_align: "bottom", jaw: "lower" },
	{ id: 19, name: "46", quoter: 3, quoter_order: 2, is_child: 0, type: "T", horizontal_align: "left", vertical_align: "bottom", jaw: "lower" },
	{ id: 20, name: "45", quoter: 3, quoter_order: 3, is_child: 0, type: "T", horizontal_align: "left", vertical_align: "bottom", jaw: "lower" },
	{ id: 21, name: "44", quoter: 3, quoter_order: 4, is_child: 0, type: "T", horizontal_align: "left", vertical_align: "bottom", jaw: "lower" },
	{ id: 22, name: "43", quoter: 3, quoter_order: 5, is_child: 0, type: "T", horizontal_align: "left", vertical_align: "bottom", jaw: "lower" },
	{ id: 23, name: "42", quoter: 3, quoter_order: 6, is_child: 0, type: "T", horizontal_align: "left", vertical_align: "bottom", jaw: "lower" },
	{ id: 24, name: "41", quoter: 3, quoter_order: 7, is_child: 0, type: "T", horizontal_align: "left", vertical_align: "bottom", jaw: "lower" },

	// Квадрант 4: нижний левый (31–38)
	{ id: 25, name: "31", quoter: 4, quoter_order: 0, is_child: 0, type: "T", horizontal_align: "right", vertical_align: "bottom", jaw: "lower" },
	{ id: 26, name: "32", quoter: 4, quoter_order: 1, is_child: 0, type: "T", horizontal_align: "right", vertical_align: "bottom", jaw: "lower" },
	{ id: 27, name: "33", quoter: 4, quoter_order: 2, is_child: 0, type: "T", horizontal_align: "right", vertical_align: "bottom", jaw: "lower" },
	{ id: 28, name: "34", quoter: 4, quoter_order: 3, is_child: 0, type: "T", horizontal_align: "right", vertical_align: "bottom", jaw: "lower" },
	{ id: 29, name: "35", quoter: 4, quoter_order: 4, is_child: 0, type: "T", horizontal_align: "right", vertical_align: "bottom", jaw: "lower" },
	{ id: 30, name: "36", quoter: 4, quoter_order: 5, is_child: 0, type: "T", horizontal_align: "right", vertical_align: "bottom", jaw: "lower" },
	{ id: 31, name: "37", quoter: 4, quoter_order: 6, is_child: 0, type: "T", horizontal_align: "right", vertical_align: "bottom", jaw: "lower" },
	{ id: 32, name: "38", quoter: 4, quoter_order: 7, is_child: 0, type: "T", horizontal_align: "right", vertical_align: "bottom", jaw: "lower" },
] as const;

/**
 * 20 молочных зубов ребенка (FDI 51..85) из StomX teeth_child.json
 */
export const STOMX_CHILD_TEETH: readonly StomxAnatomicalTooth[] = [
	// Верхний правый (55–51)
	{ id: 33, name: "55", quoter: 1, quoter_order: 0, is_child: 1, type: "T", horizontal_align: "left", vertical_align: "top", jaw: "upper" },
	{ id: 34, name: "54", quoter: 1, quoter_order: 1, is_child: 1, type: "T", horizontal_align: "left", vertical_align: "top", jaw: "upper" },
	{ id: 35, name: "53", quoter: 1, quoter_order: 2, is_child: 1, type: "T", horizontal_align: "left", vertical_align: "top", jaw: "upper" },
	{ id: 36, name: "52", quoter: 1, quoter_order: 3, is_child: 1, type: "T", horizontal_align: "left", vertical_align: "top", jaw: "upper" },
	{ id: 37, name: "51", quoter: 1, quoter_order: 4, is_child: 1, type: "T", horizontal_align: "left", vertical_align: "top", jaw: "upper" },

	// Верхний левый (61–65)
	{ id: 38, name: "61", quoter: 2, quoter_order: 0, is_child: 1, type: "T", horizontal_align: "right", vertical_align: "top", jaw: "upper" },
	{ id: 39, name: "62", quoter: 2, quoter_order: 1, is_child: 1, type: "T", horizontal_align: "right", vertical_align: "top", jaw: "upper" },
	{ id: 40, name: "63", quoter: 2, quoter_order: 2, is_child: 1, type: "T", horizontal_align: "right", vertical_align: "top", jaw: "upper" },
	{ id: 41, name: "64", quoter: 2, quoter_order: 3, is_child: 1, type: "T", horizontal_align: "right", vertical_align: "top", jaw: "upper" },
	{ id: 42, name: "65", quoter: 2, quoter_order: 4, is_child: 1, type: "T", horizontal_align: "right", vertical_align: "top", jaw: "upper" },

	// Нижний правый (85–81)
	{ id: 43, name: "85", quoter: 3, quoter_order: 0, is_child: 1, type: "T", horizontal_align: "left", vertical_align: "bottom", jaw: "lower" },
	{ id: 44, name: "84", quoter: 3, quoter_order: 1, is_child: 1, type: "T", horizontal_align: "left", vertical_align: "bottom", jaw: "lower" },
	{ id: 45, name: "83", quoter: 3, quoter_order: 2, is_child: 1, type: "T", horizontal_align: "left", vertical_align: "bottom", jaw: "lower" },
	{ id: 46, name: "82", quoter: 3, quoter_order: 3, is_child: 1, type: "T", horizontal_align: "left", vertical_align: "bottom", jaw: "lower" },
	{ id: 47, name: "81", quoter: 3, quoter_order: 4, is_child: 1, type: "T", horizontal_align: "left", vertical_align: "bottom", jaw: "lower" },

	// Нижний левый (71–75)
	{ id: 48, name: "71", quoter: 4, quoter_order: 0, is_child: 1, type: "T", horizontal_align: "right", vertical_align: "bottom", jaw: "lower" },
	{ id: 49, name: "72", quoter: 4, quoter_order: 1, is_child: 1, type: "T", horizontal_align: "right", vertical_align: "bottom", jaw: "lower" },
	{ id: 50, name: "73", quoter: 4, quoter_order: 2, is_child: 1, type: "T", horizontal_align: "right", vertical_align: "bottom", jaw: "lower" },
	{ id: 51, name: "74", quoter: 4, quoter_order: 3, is_child: 1, type: "T", horizontal_align: "right", vertical_align: "bottom", jaw: "lower" },
	{ id: 52, name: "75", quoter: 4, quoter_order: 4, is_child: 1, type: "T", horizontal_align: "right", vertical_align: "bottom", jaw: "lower" },
] as const;

/**
 * Анатомические поверхности зубов (StomX + Black/FDI standard)
 */
export const STOMX_ANATOMICAL_SURFACES: readonly StomxAnatomicalSurface[] = [
	{ code: "O", latinCode: "O", nameRu: "Окклюзионная", descRu: "Жевательная поверхность премоляров и моляров" },
	{ code: "M", latinCode: "M", nameRu: "Мезиальная", descRu: "Передняя контактная грань, обращенная к центру" },
	{ code: "D", latinCode: "D", nameRu: "Дистальная", descRu: "Задняя контактная грань, обращенная от центра" },
	{ code: "V", latinCode: "V", nameRu: "Вестибулярная", descRu: "Щёчная / губная поверхность зуба" },
	{ code: "L", latinCode: "L", nameRu: "Язычная / Нёбная", descRu: "Внутренняя оральная грань (L — нижняя, P — верхняя)" },
	{ code: "K", latinCode: "K", nameRu: "Контактная", descRu: "Аппроксимальная контактная поверхность" },
	{ code: "A", latinCode: "A", nameRu: "Апикальная / Пришеечная", descRu: "Пришеечная область и корень зуба" },
	{ code: "I", latinCode: "I", nameRu: "Имплантационная зона", descRu: "Ложе остеоинтеграции имплантата" },
] as const;

/**
 * Словарь синонимов и алиасов дефектов StomX для универсального нечувствительного поиска.
 */
const ALIAS_NORMALIZATION_MAP: Record<string, string> = {
	// Здоров
	ok: "ok",
	ок: "ok",
	здоров: "ok",
	healthy: "ok",
	sound: "ok",
	норм: "ok",
	норма: "ok",

	// Кариес (C)
	с: "С", // cyrillic С
	c: "С", // latin C
	caries: "С",
	кариес: "С",

	// Пульпит (P)
	р: "Р", // cyrillic Р
	p: "Р", // latin P
	pulpitis: "Р",
	пульпит: "Р",
	пт: "Р",

	// Периодонтит (Pt)
	pt: "Pt",
	пт_периодонтит: "Pt",
	периодонтит: "Pt",
	periodontitis: "Pt",

	// Корень (R)
	r: "R",
	корень: "R",
	radix: "R",

	// Кариес корня (CR)
	cr: "CR",
	"кариес корня": "CR",

	// Пародонтит (A / AI..AIII)
	a: "A",
	ai: "AI",
	aii: "AII",
	aiii: "AIII",
	пародонтит: "A",
	"пародонтит 1": "AI",
	"пародонтит 2": "AII",
	"пародонтит 3": "AIII",

	// Отсутствует (O / Absent)
	о: "О", // cyrillic О
	o: "О", // latin O
	absent: "О",
	отс: "О",
	отсутствует: "О",
	missing: "О",
	удален: "О",

	// Пломба (Pl / П)
	п: "П",
	pl: "П",
	пломба: "П",
	filled: "П",

	// Каналы лечены (Кл)
	кл: "Кл",
	"каналы лечены": "Кл",
	эндо: "Кл",

	// Коронка (К / Crown)
	к: "К",
	кр: "К",
	коронка: "К",
	crown: "К",

	// Искусственный (И / Art)
	art: "И",
	искусственный: "И",

	// Имплантат (ИМ / I / Implant)
	им: "ИМ",
	i: "ИМ",
	im: "ИМ",
	implant: "ИМ",
	имплант: "ИМ",
	имплантат: "ИМ",

	// Винир (В / Veneer)
	в: "В",
	v: "В",
	винир: "В",
	veneer: "В",

	// Вкладка (ВК / Inlay)
	вк: "ВК",
	inlay: "ВК",
	вкладка: "ВК",

	// Накладка (НК / Onlay)
	нк: "НК",
	onlay: "НК",
	overlay: "НК",
	накладка: "НК",

	// Герметизация фиссур (Гф)
	гф: "Гф",
	"герм. фиссур": "Гф",
	герметизация: "Гф",

	// Фасетка (Ф / Facet / F)
	ф: "Ф",
	f: "Ф",
	фас: "Ф",
	фасетка: "Ф",

	// Пигментация (Пг)
	пг: "Пг",
	пигментация: "Пг",

	// Дефект пломбы (Дп)
	дп: "Дп",
	"дефект пломбы": "Дп",

	// Дефект коронки (Дк)
	дк: "Дк",
	"дефект коронки": "Дк",

	// Клиновидный дефект (Кд)
	кд: "Кд",
	"клин дефект": "Кд",
	клиновидный: "Кд",

	// Гипоплазия (Г)
	г: "Г",
	гипоплазия: "Г",

	// Флюороз (Фл)
	фл: "Фл",
	флюороз: "Фл",

	// Рецессия десны (Рд / Рд1..Рд4)
	рд: "Рд",
	рд1: "Рд1",
	рд2: "Рд2",
	рд3: "Рд3",
	рд4: "Рд4",
	рецессия: "Рд",

	// Гингивит (Гн)
	гн: "Гн",
	гингивит: "Гн",

	// Зубной камень (Зк)
	зк: "Зк",
	камень: "Зк",
	"зубной камень": "Зк",

	// Дистопия (Д)
	дистопия: "Д",

	// Ретенция (Rt)
	rt: "Rt",
	ретенция: "Rt",
	retained: "Rt",

	// Удаление (У / U)
	у: "У",
	u: "У",
	удаление: "У",
	extraction: "У",
};

/**
 * Находит дефект StomX по строковому алиасу (поддерживает русский/латинский регистр, синонимы).
 * В первую очередь проверяет клинические нозологии (type="outpatient"), затем аномалии.
 */
export function findStomxDefectByAlias(alias: string): StomxToothDefect | undefined {
	if (!alias || typeof alias !== "string") {
		return undefined;
	}

	const trimmed = alias.trim();
	const lower = trimmed.toLowerCase();

	// 1. Поиск по словарю нормализации (приоритет outpatient нозологий)
	const canonicalAlias = ALIAS_NORMALIZATION_MAP[lower];
	if (canonicalAlias) {
		const normOutpatientMatch = STOMX_TOOTH_DEFECTS.find(
			(d) =>
				d.type === "outpatient" &&
				d.alias.toLowerCase() === canonicalAlias.toLowerCase(),
		);
		if (normOutpatientMatch) {
			return normOutpatientMatch;
		}

		// Поиск во вложенных поддефектах (например, AI, AII, AIII или Рд1..Рд4)
		for (const defect of STOMX_TOOTH_DEFECTS) {
			if (defect.items) {
				const sub = defect.items.find(
					(it) => it.alias.toLowerCase() === canonicalAlias.toLowerCase(),
				);
				if (sub) {
					return {
						...defect,
						id: sub.id,
						alias: sub.alias,
						name: sub.name ?? defect.name,
						color: sub.color,
						order: sub.order,
						crmToothState: defect.crmToothState,
					};
				}
			}
		}

		const normAnyMatch = STOMX_TOOTH_DEFECTS.find(
			(d) => d.alias.toLowerCase() === canonicalAlias.toLowerCase(),
		);
		if (normAnyMatch) {
			return normAnyMatch;
		}
	}

	// 2. Поиск прямого совпадения алиаса среди outpatient нозологий
	const directOutpatientMatch = STOMX_TOOTH_DEFECTS.find(
		(d) =>
			d.type === "outpatient" &&
			(d.alias.toLowerCase() === lower || d.name.toLowerCase() === lower),
	);
	if (directOutpatientMatch) {
		return directOutpatientMatch;
	}

	// 3. Поиск во вложенных элементах напрямую
	for (const defect of STOMX_TOOTH_DEFECTS) {
		if (defect.items) {
			const sub = defect.items.find(
				(it) => it.alias.toLowerCase() === lower || (it.name && it.name.toLowerCase() === lower),
			);
			if (sub) {
				return {
					...defect,
					id: sub.id,
					alias: sub.alias,
					name: sub.name ?? defect.name,
					color: sub.color,
					order: sub.order,
					crmToothState: defect.crmToothState,
				};
			}
		}
	}

	// 4. Любое совпадение (включая аномалии положения)
	const anyMatch = STOMX_TOOTH_DEFECTS.find(
		(d) => d.alias.toLowerCase() === lower || d.name.toLowerCase() === lower,
	);
	if (anyMatch) {
		return anyMatch;
	}

	return undefined;
}

/**
 * Находит аномалию положения зуба по коду (В, О, Д, М, С, И, Т, Тр, Пр, Рт или латинским аналогам).
 */
export function findStomxPositionAnomaly(
	codeOrAlias: string,
): StomxPositionAnomaly | undefined {
	if (!codeOrAlias || typeof codeOrAlias !== "string") {
		return undefined;
	}

	const trimmed = codeOrAlias.trim().toLowerCase();
	return STOMX_POSITION_ANOMALIES.find(
		(a) =>
			a.alias.toLowerCase() === trimmed ||
			a.latinAlias.toLowerCase() === trimmed ||
			a.name.toLowerCase() === trimmed,
	);
}

/**
 * Преобразует дефект StomX к каноническому состоянию зуба нашей CRM (CrmToothState).
 */
export function mapStomxDefectToCrmToothState(
	aliasOrDefect: string | StomxToothDefect,
): CrmToothState | undefined {
	if (typeof aliasOrDefect === "object" && aliasOrDefect !== null) {
		return aliasOrDefect.crmToothState;
	}

	const defect = findStomxDefectByAlias(aliasOrDefect);
	return defect?.crmToothState;
}

/**
 * Преобразует состояние зуба CRM к соответствующему дефекту StomX.
 */
export function mapCrmToothStateToStomxDefect(
	crmState: CrmToothState,
): StomxToothDefect | undefined {
	switch (crmState) {
		case "Healthy":
			return findStomxDefectByAlias("ok");
		case "Caries":
			return findStomxDefectByAlias("С");
		case "Pulpitis":
			return findStomxDefectByAlias("Р");
		case "Periodontitis":
			return findStomxDefectByAlias("Pt");
		case "Root":
			return findStomxDefectByAlias("R");
		case "Missing":
			return findStomxDefectByAlias("О");
		case "Filled":
			return findStomxDefectByAlias("П");
		case "Crown":
			return findStomxDefectByAlias("К");
		case "Implant":
		case "Planned_Implant":
			return findStomxDefectByAlias("ИМ");
		case "Retained":
			return findStomxDefectByAlias("Rt");
		default:
			return undefined;
	}
}

/**
 * Возвращает дефекты заданной категории.
 */
export function getStomxDefectsByCategory(
	category: StomxDefectCategory,
): StomxToothDefect[] {
	return STOMX_TOOTH_DEFECTS.filter((d) => d.category === category);
}

/**
 * Фильтрует все дефекты, требующие активного стоматологического вмешательства.
 */
export function filterStomxDefectsRequiringTreatment(): StomxToothDefect[] {
	return STOMX_TOOTH_DEFECTS.filter((d) => d.require_treatment);
}

/**
 * Проверяет, является ли зуб клинически здоровым по набору назначенных дефектов.
 */
export function isStomxToothHealthy(defects: readonly string[]): boolean {
	if (!defects || defects.length === 0) {
		return true;
	}
	if (defects.length === 1 && (defects[0] === "ok" || defects[0] === "здоров")) {
		return true;
	}
	return false;
}
