/**
 * packages/shared/src/clinical/clinicalDefectsCatalog.ts
 *
 * Clinical Tooth Defects, Position Anomalies, Tooth Anatomy & Surface Harmonizer.
 * Facade module re-exporting data and providing clinical lookup & mapping utilities.
 *
 * Compliant with:
 * - Supreme Law: THE HAMMER (Zero Mocks, Absolute Parity)
 * - Mandate 8e: Doctor Autonomy (No false blockers, instant preset application)
 * - Mandate 8i: Specialized Outpatient Bounded Context (Form 043/u, Nomenclature 804n)
 * - Mandate 8k: Friction-Killer Law (1-tap status application)
 * - Mandate 8ap: Zero Foreign CRM Contamination
 * - Engineering Rule: Anti-monolith <= 800 lines (Facade < 400 lines)
 */

import {
	CLINICAL_POSITION_ANOMALIES,
	STOMX_POSITION_ANOMALIES,
} from "./clinicalAnomaliesData.js";
import {
	CLINICAL_TOOTH_DEFECTS,
	STOMX_TOOTH_DEFECTS,
} from "./clinicalDefectsData.js";

import type {
	ClinicalDefectCategory,
	ClinicalDefectColor,
	ClinicalDefectKey,
	ClinicalDefectType,
	ClinicalToothDefect,
	ClinicalToothDefectItem,
	CrmToothState,
	StomxDefectCategory,
	StomxDefectColor,
	StomxDefectKey,
	StomxDefectType,
	StomxToothDefect,
	StomxToothDefectItem,
} from "./clinicalDefects/types.js";

export type {
	ClinicalDefectCategory,
	ClinicalDefectColor,
	ClinicalDefectKey,
	ClinicalDefectType,
	ClinicalToothDefect,
	ClinicalToothDefectItem,
	CrmToothState,
	StomxDefectCategory,
	StomxDefectColor,
	StomxDefectKey,
	StomxDefectType,
	StomxToothDefect,
	StomxToothDefectItem,
};


export const CLINICAL_TOOTH_STATE_VALUES = [
	"Healthy",
	"Caries",
	"Pulpitis",
	"Periodontitis",
	"Root_Canal_Treated",
	"Filled",
	"Crown",
	"Planned_Crown",
	"Bridge",
	"Bridge_Abutment",
	"Implant",
	"Planned_Implant",
	"Missing",
	"Extracted",
	"Impacted",
	"Retained",
	"Root",
	"Mobility",
	"Mobility_I",
	"Mobility_II",
	"Mobility_III",
	"Mobility_IV",
	"Furcation_I",
	"Furcation_II",
	"Furcation_III",
] as const;

export type ClinicalToothState = (typeof CLINICAL_TOOTH_STATE_VALUES)[number];

export type ClinicalPositionAnomalyCode =
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

/** @deprecated Use ClinicalPositionAnomalyCode */
export type StomxPositionAnomalyCode = ClinicalPositionAnomalyCode;

export interface ClinicalPositionAnomaly {
	id: number;
	name: string;
	alias: ClinicalPositionAnomalyCode;
	latinAlias: string;
	color: "white";
	order: number;
	key: "position";
	type: "anomaly";
	description: string;
}

/** @deprecated Use ClinicalPositionAnomaly */
export type StomxPositionAnomaly = ClinicalPositionAnomaly;

export interface ClinicalAnatomicalTooth {
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

/** @deprecated Use ClinicalAnatomicalTooth */
export type StomxAnatomicalTooth = ClinicalAnatomicalTooth;

export interface ClinicalAnatomicalSurface {
	code: string;
	nameRu: string;
	descRu: string;
	latinCode: string;
}

/** @deprecated Use ClinicalAnatomicalSurface */
export type StomxAnatomicalSurface = ClinicalAnatomicalSurface;

/**
 * Словарь синонимов и алиасов дефектов для универсального нечувствительного поиска.
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
 * Находит клинический дефект по строковому алиасу (поддерживает русский/латинский регистр, синонимы).
 * В первую очередь проверяет клинические нозологии (type="outpatient"), затем аномалии.
 */
export function findClinicalDefectByAlias(alias: string): ClinicalToothDefect | undefined {
	if (!alias || typeof alias !== "string") {
		return undefined;
	}

	const trimmed = alias.trim();
	const lower = trimmed.toLowerCase();

	// 1. Поиск по словарю нормализации (приоритет outpatient нозологий)
	const canonicalAlias = ALIAS_NORMALIZATION_MAP[lower];
	if (canonicalAlias) {
		const normOutpatientMatch = CLINICAL_TOOTH_DEFECTS.find(
			(d) =>
				d.type === "outpatient" &&
				d.alias.toLowerCase() === canonicalAlias.toLowerCase(),
		);
		if (normOutpatientMatch) {
			return normOutpatientMatch;
		}

		// Поиск во вложенных поддефектах (например, AI, AII, AIII или Рд1..Рд4)
		for (const defect of CLINICAL_TOOTH_DEFECTS) {
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

		const normAnyMatch = CLINICAL_TOOTH_DEFECTS.find(
			(d) => d.alias.toLowerCase() === canonicalAlias.toLowerCase(),
		);
		if (normAnyMatch) {
			return normAnyMatch;
		}
	}

	// 2. Поиск прямого совпадения алиаса среди outpatient нозологий
	const directOutpatientMatch = CLINICAL_TOOTH_DEFECTS.find(
		(d) =>
			d.type === "outpatient" &&
			(d.alias.toLowerCase() === lower || d.name.toLowerCase() === lower),
	);
	if (directOutpatientMatch) {
		return directOutpatientMatch;
	}

	// 3. Поиск во вложенных элементах напрямую
	for (const defect of CLINICAL_TOOTH_DEFECTS) {
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
	const anyMatch = CLINICAL_TOOTH_DEFECTS.find(
		(d) => d.alias.toLowerCase() === lower || d.name.toLowerCase() === lower,
	);
	if (anyMatch) {
		return anyMatch;
	}

	return undefined;
}

/** @deprecated Use findClinicalDefectByAlias */
export const findStomxDefectByAlias = findClinicalDefectByAlias;

/**
 * Находит аномалию положения зуба по коду (В, О, Д, М, С, И, Т, Тр, Пр, Рт или латинским аналогам).
 */
export function findClinicalPositionAnomaly(
	codeOrAlias: string,
): ClinicalPositionAnomaly | undefined {
	if (!codeOrAlias || typeof codeOrAlias !== "string") {
		return undefined;
	}

	const trimmed = codeOrAlias.trim().toLowerCase();
	return CLINICAL_POSITION_ANOMALIES.find(
		(a) =>
			a.alias.toLowerCase() === trimmed ||
			a.latinAlias.toLowerCase() === trimmed ||
			a.name.toLowerCase() === trimmed,
	);
}

/** @deprecated Use findClinicalPositionAnomaly */
export const findStomxPositionAnomaly = findClinicalPositionAnomaly;

/**
 * Преобразует дефект к каноническому состоянию зуба нашей CRM (CrmToothState).
 */
export function mapClinicalDefectToToothState(
	aliasOrDefect: string | ClinicalToothDefect,
): CrmToothState | undefined {
	if (typeof aliasOrDefect === "object" && aliasOrDefect !== null) {
		return aliasOrDefect.crmToothState;
	}

	const defect = findClinicalDefectByAlias(aliasOrDefect);
	return defect?.crmToothState;
}

/** @deprecated Use mapClinicalDefectToToothState */
export const mapStomxDefectToCrmToothState = mapClinicalDefectToToothState;

/**
 * Преобразует состояние зуба CRM к соответствующему клиническому дефекту.
 */
export function mapToothStateToClinicalDefect(
	crmState: CrmToothState,
): ClinicalToothDefect | undefined {
	switch (crmState) {
		case "Healthy":
			return findClinicalDefectByAlias("ok");
		case "Caries":
			return findClinicalDefectByAlias("С");
		case "Pulpitis":
			return findClinicalDefectByAlias("Р");
		case "Periodontitis":
			return findClinicalDefectByAlias("Pt");
		case "Root":
			return findClinicalDefectByAlias("R");
		case "Missing":
			return findClinicalDefectByAlias("О");
		case "Filled":
			return findClinicalDefectByAlias("П");
		case "Crown":
		case "Planned_Crown":
			return findClinicalDefectByAlias("К");
		case "Implant":
		case "Planned_Implant":
			return findClinicalDefectByAlias("ИМ");
		case "Retained":
			return findClinicalDefectByAlias("Rt");
		default:
			return undefined;
	}
}

/** @deprecated Use mapToothStateToClinicalDefect */
export const mapCrmToothStateToStomxDefect = mapToothStateToClinicalDefect;

/**
 * Возвращает дефекты заданной категории.
 */
export function getClinicalDefectsByCategory(
	category: ClinicalDefectCategory,
): ClinicalToothDefect[] {
	return CLINICAL_TOOTH_DEFECTS.filter((d) => d.category === category);
}

/** @deprecated Use getClinicalDefectsByCategory */
export const getStomxDefectsByCategory = getClinicalDefectsByCategory;

/**
 * Фильтрует все дефекты, требующие активного стоматологического вмешательства.
 */
export function filterClinicalDefectsRequiringTreatment(): ClinicalToothDefect[] {
	return CLINICAL_TOOTH_DEFECTS.filter((d) => d.require_treatment);
}

/** @deprecated Use filterClinicalDefectsRequiringTreatment */
export const filterStomxDefectsRequiringTreatment = filterClinicalDefectsRequiringTreatment;

/**
 * Проверяет, является ли зуб клинически здоровым по набору назначенных дефектов.
 */
export function isClinicalToothHealthy(defects: readonly string[]): boolean {
	if (!defects || defects.length === 0) {
		return true;
	}
	if (defects.length === 1 && (defects[0] === "ok" || defects[0] === "здоров")) {
		return true;
	}
	return false;
}

/** @deprecated Use isClinicalToothHealthy */
export const isStomxToothHealthy = isClinicalToothHealthy;

// ─────────────────────────────────────────────────────────────────────────────
// DATA RE-EXPORTS (Full backwards compatibility)
// ─────────────────────────────────────────────────────────────────────────────
export * from "./clinicalDefectsData.js";
export * from "./clinicalAnomaliesData.js";
