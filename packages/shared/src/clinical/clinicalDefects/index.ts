/**
 * packages/shared/src/clinical/stomtDefects/index.ts
 *
 * Layer 5: Master Barrel & Harmonized Catalog Composer.
 * Aggregates all clinical defect domains into the canonical StomX catalog and tree.
 *
 * Compliant with:
 * - Supreme Law: THE HAMMER (Zero Mocks, Absolute Parity)
 * - Mandate 8b: Line count limit <= 800 lines
 * - Mandate 8e: Doctor Autonomy
 */

import type { ClinicalToothDefect } from "./types.js";
import {
	CLINICAL_DEFECT_CARIES,
	CLINICAL_DEFECT_CARIES_RADIOLOGY,
	CLINICAL_DEFECT_CROWN_DEFECT,
	CLINICAL_DEFECT_FILLING_DEFECT,
	CLINICAL_DEFECT_ROOT_CARIES,
} from "./cariesDefectsData.js";
import {
	CLINICAL_DEFECT_FLUOROSIS,
	CLINICAL_DEFECT_HYPOPLASIA,
	CLINICAL_DEFECT_PIGMENTATION,
	CLINICAL_DEFECT_WEDGE,
} from "./nonCariesDefectsData.js";
import {
	CLINICAL_DEFECT_PERIODONTITIS,
	CLINICAL_DEFECT_PERIODONTITIS_RADIOLOGY,
	CLINICAL_DEFECT_PULPITIS,
	CLINICAL_DEFECT_ROOT,
	CLINICAL_DEFECT_TREATED_CANALS,
} from "./endodonticDefectsData.js";
import {
	CLINICAL_AMOUNT_DEFECTS,
	CLINICAL_DEFECT_ARTIFICIAL,
	CLINICAL_DEFECT_CALCULUS,
	CLINICAL_DEFECT_CROWN,
	CLINICAL_DEFECT_DYSTOPIA_RADIOLOGY,
	CLINICAL_DEFECT_FACET,
	CLINICAL_DEFECT_FILLING,
	CLINICAL_DEFECT_GINGIVITIS,
	CLINICAL_DEFECT_HEALTHY,
	CLINICAL_DEFECT_IMPLANT,
	CLINICAL_DEFECT_INLAY,
	CLINICAL_DEFECT_MISSING,
	CLINICAL_DEFECT_MISSING_RADIOLOGY,
	CLINICAL_DEFECT_ONLAY,
	CLINICAL_DEFECT_PARODONTITIS,
	CLINICAL_DEFECT_RECESSION,
	CLINICAL_DEFECT_REMOVAL,
	CLINICAL_DEFECT_RETENTION_RADIOLOGY,
	CLINICAL_DEFECT_SEALANT,
	CLINICAL_DEFECT_VENEER,
	CLINICAL_ERUPTION_DEFECTS,
	CLINICAL_POSITION_DEFECTS,
} from "./periodontalAndSurgicalDefectsData.js";

// Re-export Layer 0 Types
export type * from "./types.js";

// Re-export Domain Data Modules
export * from "./cariesDefectsData.js";
export * from "./nonCariesDefectsData.js";
export * from "./endodonticDefectsData.js";
export * from "./periodontalAndSurgicalDefectsData.js";

/**
 * Полный канонический каталог клинических дефектов DENTE с привязкой к CRM-состояниям зубной формулы.
 * Клинические нозологии (outpatient) и реставрации имеют приоритет перед аномалиями положения.
 * Ровно 49 гармонизированных дефектов (100% AST Parity).
 */
export const CLINICAL_TOOTH_DEFECTS: readonly ClinicalToothDefect[] = [
	// 1. Здоров (Healthy)
	CLINICAL_DEFECT_HEALTHY,

	// 2. Нозологии, требующие лечения (require_treatment, color="red")
	CLINICAL_DEFECT_PARODONTITIS,
	CLINICAL_DEFECT_CARIES,
	CLINICAL_DEFECT_PULPITIS,
	CLINICAL_DEFECT_PERIODONTITIS,
	CLINICAL_DEFECT_ROOT,
	CLINICAL_DEFECT_ROOT_CARIES,
	CLINICAL_DEFECT_MISSING,
	CLINICAL_DEFECT_PIGMENTATION,
	CLINICAL_DEFECT_FILLING_DEFECT,
	CLINICAL_DEFECT_CROWN_DEFECT,
	CLINICAL_DEFECT_WEDGE,
	CLINICAL_DEFECT_HYPOPLASIA,
	CLINICAL_DEFECT_FLUOROSIS,
	CLINICAL_DEFECT_RECESSION,
	CLINICAL_DEFECT_GINGIVITIS,
	CLINICAL_DEFECT_CALCULUS,

	// 3. Вылеченные / Восстановленные зубы (cured_teeth, color="yellow")
	CLINICAL_DEFECT_FILLING,
	CLINICAL_DEFECT_TREATED_CANALS,
	CLINICAL_DEFECT_CROWN,
	CLINICAL_DEFECT_ARTIFICIAL,
	CLINICAL_DEFECT_IMPLANT,
	CLINICAL_DEFECT_VENEER,
	CLINICAL_DEFECT_INLAY,
	CLINICAL_DEFECT_ONLAY,
	CLINICAL_DEFECT_SEALANT,
	CLINICAL_DEFECT_FACET,

	// 4. Рентген / КЛКТ (rg_klkt, color=null)
	CLINICAL_DEFECT_DYSTOPIA_RADIOLOGY,
	CLINICAL_DEFECT_RETENTION_RADIOLOGY,
	CLINICAL_DEFECT_PERIODONTITIS_RADIOLOGY,
	CLINICAL_DEFECT_CARIES_RADIOLOGY,
	CLINICAL_DEFECT_MISSING_RADIOLOGY,

	// 5. Хирургическое удаление (medplan_only)
	CLINICAL_DEFECT_REMOVAL,

	// 6. Аномалии положения зуба (type="anomaly", key="position") (10 шт.)
	...CLINICAL_POSITION_DEFECTS,

	// 7. Аномалии прорезывания (time_cut) (3 шт.)
	...CLINICAL_ERUPTION_DEFECTS,

	// 8. Аномалии количества (amount) (3 шт.)
	...CLINICAL_AMOUNT_DEFECTS,
] as const;

/** @deprecated Use CLINICAL_TOOTH_DEFECTS (Mandate 8ap) */
export const STOMX_TOOTH_DEFECTS = CLINICAL_TOOTH_DEFECTS;

/**
 * Иерархическое дерево дефектов (канонический доменный стандарт DENTE).
 */
export const CLINICAL_DEFECTS_TREE: readonly ClinicalToothDefect[] = [
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
	{ id: 6, name: "кариес", alias: "С", color: "red", order: 1030, type: "outpatient", key: "require_treatment", require_treatment: true, crmToothState: "Caries", category: "pathology" },
	{ id: 7, name: "пульпит", alias: "Р", color: "red", order: 1040, type: "outpatient", key: "require_treatment", require_treatment: true, crmToothState: "Pulpitis", category: "pathology" },
	{ id: 8, name: "периодонтит", alias: "Pt", color: "red", order: 1050, type: "outpatient", key: "require_treatment", require_treatment: true, crmToothState: "Periodontitis", category: "pathology" },
	{ id: 9, name: "корень", alias: "R", color: "red", order: 1060, type: "outpatient", key: "require_treatment", require_treatment: true, crmToothState: "Root", category: "pathology" },
	{ id: 58, name: "кариес корня", alias: "CR", color: "red", order: 1070, type: "outpatient", key: "require_treatment", require_treatment: true, crmToothState: "Caries", category: "pathology" },
	{ id: 1, name: "отсутствует", alias: "О", color: "white", order: 1080, type: "outpatient", key: "require_treatment", require_treatment: true, crmToothState: "Missing", category: "pathology" },
	{ id: 59, name: "пигментация", alias: "Пг", color: "red", order: 1090, type: "outpatient", key: "require_treatment", require_treatment: true, category: "pathology" },
	{ id: 60, name: "дефект пломбы", alias: "Дп", color: "red", order: 1100, type: "outpatient", key: "require_treatment", require_treatment: true, category: "pathology" },
	{ id: 76, name: "дефект коронки", alias: "Дк", color: "red", order: 1110, type: "outpatient", key: "require_treatment", require_treatment: true, category: "pathology" },
	{ id: 61, name: "клин дефект", alias: "Кд", color: "red", order: 1120, type: "outpatient", key: "require_treatment", require_treatment: true, category: "pathology" },
	{ id: 62, name: "гипоплазия", alias: "Г", color: "red", order: 1130, type: "outpatient", key: "require_treatment", require_treatment: true, category: "pathology" },
	{ id: 63, name: "флюороз", alias: "Фл", color: "red", order: 1140, type: "outpatient", key: "require_treatment", require_treatment: true, category: "pathology" },
	{ id: 3, name: "пломба", alias: "П", color: "yellow", order: 1150, type: "outpatient", key: "cured_teeth", require_treatment: false, crmToothState: "Filled", category: "restoration" },
	{ id: 90, name: "каналы лечены", alias: "Кл", color: "yellow", order: 1155, type: "outpatient", key: "cured_teeth", require_treatment: false, category: "restoration" },
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
	{ id: 18, name: "периодонтит", alias: "Pt", color: null, order: 1250, type: "outpatient", key: "rg_klkt", require_treatment: true, crmToothState: "Periodontitis", category: "radiology" },
	{ id: 19, name: "кариес", alias: "С", color: null, order: 1260, type: "outpatient", key: "rg_klkt", require_treatment: true, crmToothState: "Caries", category: "radiology" },
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

/** @deprecated Use CLINICAL_DEFECTS_TREE (Mandate 8ap) */
export const STOMX_DEFECTS_TREE = CLINICAL_DEFECTS_TREE;
