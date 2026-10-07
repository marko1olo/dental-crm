/**
 * Базовые типы клинических протоколов Формы 043/у.
 * Декомпозиция по Мандату 8b (модуль <= 500 строк).
 */

export interface DiaryState {
	anamnesis: string;
	statusLocalis: string;
	diagnosisIcd10: string;
	diagnosisTooth: string;
	treatmentDescription: string;
	complications: string;
	comorbidities: string;
}

/** Поверхности зуба по стандарту стоматологической карты */
export type ToothSurfaceKey = "O" | "M" | "D" | "B" | "V" | "L" | "P";

export interface OdontogramFindingInput {
	/** Номер зуба по FDI (11–48, 51–85) */
	readonly toothNumber: number;
	/** Состояние из схемы одонтограммы или клинический статус */
	readonly state:
		| "Caries"
		| "Pulpitis"
		| "Periodontitis"
		| "Gingivitis"
		| "Filled"
		| "Crown"
		| "Implant"
		| "Planned_Implant"
		| "Missing"
		| "Healthy"
		| "Extraction"
		| "to_extract"
		| "Hygiene"
		| string;
	/** Поражённые поверхности (B, L, M, D, O, V, P) */
	readonly surfaces?: readonly string[] | readonly ToothSurfaceKey[] | undefined;
	/** Явный код МКБ-10 (если выбран вручную) */
	readonly icd10Override?: string;
	/** Степень / форма (например, "deep", "medium", "initial", "acute", "chronic", "root") */
	readonly subType?:
		| "initial"
		| "medium"
		| "deep"
		| "root"
		| "acute"
		| "chronic"
		| string;
	/** Глубина пародонтального кармана в мм (для K05) */
	readonly pocketDepthMm?: number;
}

export interface ClinicalProtocolSoap {
	readonly toothNumber: number;
	readonly toothNameRu: string;
	readonly diagnosisIcd10: string;
	readonly diagnosisIcd10Label: string;
	readonly diagnosisTooth: string;
	readonly anamnesis: string; // Жалобы и анамнез (Форма 043/у)
	readonly statusLocalis: string; // Данные объективного исследования / Status localis (Форма 043/у)
	readonly treatmentDescription: string; // Дневник проведенного лечения / План лечения (Форма 043/у)
	readonly recommendations?: string; // Рекомендации пациенту
	readonly complications?: string;
	readonly comorbidities?: string;
}

/** Алиас протокола дневника Формы 043/у */
export type ClinicalProtocol043 = ClinicalProtocolSoap;

export type MergeStrategy = "smart_append" | "fill_blanks_only" | "replace";

export interface MergeSoapOptions {
	readonly strategy?: MergeStrategy;
	readonly deduplicate?: boolean;
	readonly sectionHeader?: boolean;
}

/** Пресет рекомендации пациенту */
export interface PatientRecommendationItem {
	readonly id: string;
	readonly label: string;
	readonly category: "general" | "post_op" | "surgery" | "hygiene" | "perio";
	readonly text: string;
}

/** Набор стандартизированных клинических рекомендаций пациенту (0% эмодзи, чистый медицинский язык) */
export const PATIENT_RECOMMENDATIONS: readonly PatientRecommendationItem[] = [
	{
		id: "cold_pack",
		label: "Холод местно",
		category: "surgery",
		text: "Холод на область щеки (пакет со льдом через полотенце) по 15\u00A0минут с перерывами каждые 30\u00A0минут в течение первых 3-4\u00A0часов.",
	},
	{
		id: "nids_pain",
		label: "НПВС при боли",
		category: "post_op",
		text: "При болевом синдроме: Нимесил 100\u00A0мг или Ибупрофен 400\u00A0мг по 1 таб./пакетику после еды (не более 2-3 раз в сутки).",
	},
	{
		id: "soft_diet",
		label: "Щадящая диета",
		category: "general",
		text: "Щадящая диета: исключить грубую, острую, слишком горячую и холодную пищу, жевать на противоположной стороне 2-3\u00A0дня.",
	},
	{
		id: "no_rinse_clot",
		label: "Не полоскать активно",
		category: "surgery",
		text: "Категорически запрещено активное полоскание полости рта во избежание вымывания кровяного сгустка из лунки.",
	},
	{
		id: "white_diet",
		label: "Белая диета 48\u00A0ч",
		category: "hygiene",
		text: "«Белая диета» 48\u00A0часов: исключить чай, кофе, красное вино, ягоды, шоколад, свеклу и красящие соусы.",
	},
	{
		id: "antiseptic_baths",
		label: "Ванночки с антисептиком",
		category: "perio",
		text: "Ротовые ванночки с 0.05\u00A0% раствором Хлоргексидина или Мирамистина по 1\u00A0минуте 3 раза в день после еды (без активного бульканья) в течение 5-7\u00A0дней.",
	},
	{
		id: "soft_brush",
		label: "Мягкая зубная щетка",
		category: "hygiene",
		text: "Замена зубной щетки на мягкую (Soft), деликатная гигиеническая чистка без травматизации оперированной / леченной зоны.",
	},
	{
		id: "composite_warranty",
		label: "Гарантия на пломбу (12–24 мес)",
		category: "general",
		text: "Гарантийный срок на световую композитную реставрацию составляет 12–24 месяца (срок службы 24–36 месяцев) при условии соблюдения индивидуальной гигиены полости рта и прохождения профилактического осмотра не реже 1 раза в 6 месяцев.",
	},
	{
		id: "followup_check",
		label: "Контрольный осмотр",
		category: "general",
		text: "Явка на контрольный осмотр через 7-10\u00A0дней. При возникновении непроходящей боли, отека или кровотечения — немедленно связаться с клиникой.",
	},
];

/** Быстрый клинический шаблон (1-Click Fast Clinical Preset) */
export interface FastClinicalPreset {
	readonly id: string;
	readonly label: string;
	readonly badge: string;
	readonly description: string;
	readonly defaultIcd10: string;
	readonly anamnesis: string;
	readonly statusLocalis: string;
	readonly treatmentDescription: string;
	readonly recommendations?: string;
	readonly complications?: string;
	readonly comorbidities?: string;
}
