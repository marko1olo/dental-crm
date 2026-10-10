/**
 * packages/shared/src/clinical/stomtDefects/types.ts
 *
 * Layer 0: Pure Types, Interfaces & Clinical Defect Contracts.
 * Zero runtime dependencies, 100% DAG invariant compliant.
 *
 * Compliant with:
 * - Supreme Law: THE HAMMER (Zero Mocks, Absolute Parity)
 * - Mandate 8b: File Line Count Limit <= 800 lines
 * - Mandate 8e: Doctor Autonomy & Clinical ICD-10 (МКБ-10 K02..K05) / 804n integration
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

// --- Caries Specific Clinical Contracts ---
export type CariesDepth =
	| "initial" // Кариес в стадии пятна (K02.0)
	| "superficial" // Поверхностный кариес (K02.0)
	| "moderate" // Средний кариес (K02.1)
	| "deep" // Глубокий кариес (K02.1)
	| "root" // Кариес корня / цемента (K02.2)
	| "arrested"; // Приостановившийся кариес (K02.3)

export type BlackClassification =
	| "Class_I" // Фиссуры и естественные ямки моляров/премоляров
	| "Class_II" // Контактные поверхности моляров/премоляров
	| "Class_III" // Контактные поверхности резцов/клыков без нарушения режущего края
	| "Class_IV" // Контактные поверхности резцов/клыков с нарушением режущего края
	| "Class_V" // Пришеечная область всех групп зубов
	| "Class_VI"; // Режущие края резцов и бугры моляров/премоляров

export type CariesTopography =
	| "fissure"
	| "contact_surface"
	| "cervical"
	| "root"
	| "incisal_edge";

// --- Non-Caries Lesions Clinical Contracts ---
export type NonCariesLesionType =
	| "fluorosis" // Флюороз (K00.3)
	| "hypoplasia" // Гипоплазия эмали (K00.4)
	| "wedge_defect" // Клиновидный дефект (K03.1)
	| "erosion" // Эрозия эмали (K03.2)
	| "pathological_abrasion" // Патологическая стираемость (K03.0)
	| "hyperesthesia" // Гиперестезия твердых тканей (K03.8)
	| "pigmentation"; // Пигментация эмали

export type WedgeDefectStage =
	| "I" // Начальный (до 0.5 мм)
	| "II" // Поверхностный (до 1.0 мм)
	| "III" // Средний (до 2.0 мм)
	| "IV"; // Глубокий (> 2.0 мм с угрозой вскрытия пульпы)

export type FluorosisForm =
	| "dashed" // Штриховая форма
	| "spotted" // Пятнистая форма
	| "chalky_mottled" // Меловидно-крапчатая форма
	| "erosive" // Эрозивная форма
	| "destructive"; // Деструктивная форма

export type HypoplasiaForm =
	| "macular" // Пятнистая
	| "cup_shaped" // Чашеобразная
	| "furrowed" // Бороздчатая
	| "aplasia"; // Аплазия эмали

export type ToothAbrasionDegree =
	| "I" // В пределах эмали
	| "II" // В пределах дентина (до 1/3 высоты коронки)
	| "III"; // Более 1/3 до десневого края

// --- Endodontic Clinical Contracts ---
export type PulpitisType =
	| "acute_focal" // Острый очаговый пульпит (K04.01)
	| "acute_diffuse" // Острый диффузный пульпит (K04.02)
	| "chronic_fibrous" // Хронический фиброзный пульпит (K04.03)
	| "chronic_gangrenous" // Хронический гангренозный пульпит (K04.04)
	| "chronic_hypertrophic" // Хронический гипертрофический пульпит (K04.05)
	| "acute_exacerbation"; // Обострение хронического пульпита (K04.0)

export type PeriodontitisType =
	| "acute_apical" // Острый апикальный периодонтит (K04.4)
	| "chronic_granulating" // Хронический гранулирующий периодонтит (K04.5)
	| "chronic_granulomatous" // Хронический гранулематозный периодонтит (K04.5)
	| "chronic_fibrous" // Хронический фиброзный периодонтит (K04.5)
	| "acute_exacerbation"; // Обострение хронического периодонтита (K04.5)

export type RootResorptionType = "internal" | "external"; // Внутренняя/внешняя резорбция корня (K03.3)

// --- Periodontal & Surgical Clinical Contracts ---
export type GingivitisType =
	| "catarrhal" // Катаральный гингивит (K05.0)
	| "hypertrophic" // Гипертрофический гингивит (K05.1)
	| "ulcerative"; // Язвенный гингивит (K05.2)

export type PeriodontitisSeverity =
	| "mild" // Легкая степень (зубодесневые карманы до 3.5 мм)
	| "moderate" // Средняя степень (карманы 4-5 мм, деструкция кости до 1/3)
	| "severe"; // Тяжелая степень (карманы > 5 мм, деструкция кости > 1/2)

export type GingivalRecessionMiller =
	| "Class_I" // Рецессия в пределах свободной десны, межзубная перегородка сохранена
	| "Class_II" // Рецессия доходит до слизисто-десневой границы, перегородка сохранена
	| "Class_III" // Рецессия с потерей межзубной кости или мягких тканей
	| "Class_IV"; // Тяжелая циркулярная рецессия с массивной потерей кости

export type ToothMobilityDegree = "I" | "II" | "III" | "IV";

export type SurgicalToothStatus =
	| "indicated_for_extraction"
	| "extracted"
	| "retained"
	| "dystopic"
	| "adentia_primary"
	| "adentia_secondary"
	| "supernumerary";

/**
 * Расширенный клинический пресет дефекта для быстрого заполнения ЭМК 043/у врачом.
 * Связывает анатомический дефект с нозологией МКБ-10 и услугами 804н.
 */
export interface ClinicalDefectPreset {
	id: number;
	code: string;
	mkb10: string; // Нозология МКБ-10 (K02.0..K05.3)
	name: string;
	shortName: string;
	alias: string;
	category: StomxDefectCategory;
	description: string;
	recommended804nCodes?: readonly string[];
	defaultTreatmentPlan?: string;
	doctorFastNoteTemplate?: string;
}
