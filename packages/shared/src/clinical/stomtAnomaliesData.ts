/**
 * packages/shared/src/clinical/stomtAnomaliesData.ts
 *
 * StomX Position Anomalies & Dental Anatomy Data.
 * Sourced from StomX catalogs: teeth_adult.json, teeth_child.json, tooth_defects.json.
 *
 * Compliant with:
 * - Supreme Law: THE HAMMER (Zero Mocks, Absolute Parity)
 * - Mandate 8e: Doctor Autonomy
 * - Engineering Rule: Anti-monolith <= 800 lines
 */

import type {
	StomxAnatomicalSurface,
	StomxAnatomicalTooth,
	StomxPositionAnomaly,
} from "./stomtDefectsCatalog.js";

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
