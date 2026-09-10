/**
 * packages/shared/src/clinical/stomtDefectsCatalog.ts
 *
 * StomX Tooth Defects, Position Anomalies, Tooth Anatomy & Surface Harmonizer.
 * Facade module re-exporting data and providing clinical lookup & mapping utilities.
 *
 * Compliant with:
 * - Supreme Law: THE HAMMER (Zero Mocks, Absolute Parity)
 * - Mandate 8e: Doctor Autonomy (No false blockers, instant preset application)
 * - Mandate 8i: Specialized Outpatient Bounded Context (Form 043/u, Nomenclature 804n)
 * - Mandate 8k: Friction-Killer Law (1-tap status application)
 * - Engineering Rule: Anti-monolith <= 800 lines (Facade < 400 lines)
 */

import { STOMX_POSITION_ANOMALIES } from "./stomtAnomaliesData.js";
import { STOMX_TOOTH_DEFECTS } from "./stomtDefectsData.js";

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
 * Словарь синонимов и алиасов дефектов StomX для универсального нечувствительного поиска.
 */
const ALIAS_NORMALIZATION_MAP: Record<string, string> = {
	// Здоров
	ok: "ok", ок: "ok", здоров: "ok", healthy: "ok", sound: "ok", норм: "ok", норма: "ok",
	// Кариес (C)
	с: "С", c: "С", caries: "С", кариес: "С",
	// Пульпит (P)
	р: "Р", p: "Р", pulpitis: "Р", пульпит: "Р", пт: "Р",
	// Периодонтит (Pt)
	pt: "Pt", пт_периодонтит: "Pt", периодонтит: "Pt", periodontitis: "Pt",
	// Корень (R) & Кариес корня (CR)
	r: "R", корень: "R", radix: "R", cr: "CR", "кариес корня": "CR",
	// Пародонтит (A / AI..AIII)
	a: "A", ai: "AI", aii: "AII", aiii: "AIII", пародонтит: "A",
	"пародонтит 1": "AI", "пародонтит 2": "AII", "пародонтит 3": "AIII",
	// Отсутствует (O / Absent)
	о: "О", o: "О", absent: "О", отс: "О", отсутствует: "О", missing: "О", удален: "О",
	// Пломба (Pl / П) & Каналы (Кл)
	п: "П", pl: "П", пломба: "П", filled: "П",
	кл: "Кл", "каналы лечены": "Кл", эндо: "Кл",
	// Коронка (К / Crown) & Искусственный (И / Art)
	к: "К", кр: "К", коронка: "К", crown: "К", art: "И", искусственный: "И",
	// Имплантат (ИМ / I / Implant)
	им: "ИМ", i: "ИМ", im: "ИМ", implant: "ИМ", имплант: "ИМ", имплантатат: "ИМ",
	// Реставрации: Винир, Вкладка, Накладка, Герметизация, Фасетка
	в: "В", v: "В", винир: "В", veneer: "В",
	вк: "ВК", inlay: "ВК", вкладка: "ВК",
	нк: "НК", onlay: "НК", overlay: "НК", накладка: "НК",
	гф: "Гф", "герм. фиссур": "Гф", герметизация: "Гф",
	ф: "Ф", f: "Ф", фас: "Ф", фасетка: "Ф",
	// Патологии твердых тканей: Пигментация, Дефекты, Клин, Гипоплазия, Флюороз
	пг: "Пг", пигментация: "Пг", дп: "Дп", "дефект пломбы": "Дп",
	дк: "Дк", "дефект коронки": "Дк", кд: "Кд", "клин дефект": "Кд", клиновидный: "Кд",
	г: "Г", гипоплазия: "Г", фл: "Фл", флюороз: "Фл",
	// Пародонтология: Рецессия десны (Рд / Рд1..Рд4), Гингивит, Зубной камень
	рд: "Рд", рд1: "Рд1", рд2: "Рд2", рд3: "Рд3", рд4: "Рд4", рецессия: "Рд",
	гн: "Гн", гингивит: "Гн", зк: "Зк", камень: "Зк", "зубной камень": "Зк",
	// Аномалии & Хирургия: Дистопия, Ретенция, Удаление
	дистопия: "Д", rt: "Rt", ретенция: "Rt", retained: "Rt",
	у: "У", u: "У", удаление: "У", extraction: "У",
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

// ─────────────────────────────────────────────────────────────────────────────
// DATA RE-EXPORTS (Full backwards compatibility)
// ─────────────────────────────────────────────────────────────────────────────
export * from "./stomtDefectsData.js";
export * from "./stomtAnomaliesData.js";
