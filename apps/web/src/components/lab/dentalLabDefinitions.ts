/**
 * dentalLabDefinitions.ts — Канонические типы, справочники и константы ЗТЛ.
 *
 * Mandate 8b: Декомпозиция монолита (строго <= 800 строк).
 * Mandate 8s: Single Source of Truth для конструкций, статусов, расцветок VITA и формулы FDI.
 */

import {
	CANONICAL_5_CLINICAL_LAB_STATUSES,
	type Canonical5LabStatus,
	type Canonical5LabStatusItem,
	type DentalLabOrderData,
} from "./labMath";

export {
	CANONICAL_5_CLINICAL_LAB_STATUSES,
	type Canonical5LabStatus,
	type Canonical5LabStatusItem,
	type DentalLabOrderData,
};

// ─── 1. ВИДЫ КОНСТРУКЦИЙ ЗТЛ ────────────────────────────────────────────────

export type DentalLabConstructionType =
	| "crown_zirconia"
	| "crown_emax"
	| "metal_ceramic"
	| "clasp_denture"
	| "aligner_splint"
	| "surgical_guide";

export interface DentalLabConstructionDef {
	readonly id: DentalLabConstructionType;
	readonly nameRu: string;
	readonly shortNameRu: string;
	readonly categoryRu: string;
	readonly defaultMaterialRu: string;
	readonly standardTurnaroundDays: number;
	readonly requiresVitaShade: boolean;
	readonly requiresStumpShade: boolean;
	readonly requiresTranslucency: boolean;
	readonly defaultPatientPriceKopecks: number;
	readonly defaultZtlCostKopecks: number;
	readonly descriptionRu: string;
}

export const DENTAL_LAB_CONSTRUCTIONS: Record<DentalLabConstructionType, DentalLabConstructionDef> = {
	crown_zirconia: {
		id: "crown_zirconia",
		nameRu: "Коронка из диоксида циркония (Katana ML / Prettau)",
		shortNameRu: "Коронка цирконий",
		categoryRu: "Несъемное протезирование",
		defaultMaterialRu: "Многослойный диоксид циркония Katana Zirconia HTML",
		standardTurnaroundDays: 5,
		requiresVitaShade: true,
		requiresStumpShade: true,
		requiresTranslucency: true,
		defaultPatientPriceKopecks: 2400000, // 24 000 руб
		defaultZtlCostKopecks: 750000,       // 7 500 руб себестоимость ЗТЛ
		descriptionRu: "Анатомическая монолитная коронка из высокопрочного диоксида циркония с плавным градиентом цвета.",
	},
	crown_emax: {
		id: "crown_emax",
		nameRu: "Коронка / винир IPS e.max Press (дисиликат лития)",
		shortNameRu: "E-max пресс",
		categoryRu: "Высокоэстетичная керамика",
		defaultMaterialRu: "Дисиликат лития IPS e.max Press (Ivoclar Vivadent)",
		standardTurnaroundDays: 5,
		requiresVitaShade: true,
		requiresStumpShade: true,
		requiresTranslucency: true,
		defaultPatientPriceKopecks: 2600000, // 26 000 руб
		defaultZtlCostKopecks: 850000,       // 8 500 руб себестоимость ЗТЛ
		descriptionRu: "Цельнокерамическая реставрация с естественной опалесценцией для фронтальной и жевательной зоны.",
	},
	metal_ceramic: {
		id: "metal_ceramic",
		nameRu: "Металлокерамическая коронка (Co-Cr фрезерованный / литой)",
		shortNameRu: "Металлокерамика",
		categoryRu: "Классическое протезирование",
		defaultMaterialRu: "Co-Cr сплав Bego Wiron light + керамика Noritake EX-3",
		standardTurnaroundDays: 6,
		requiresVitaShade: true,
		requiresStumpShade: false,
		requiresTranslucency: false,
		defaultPatientPriceKopecks: 1400000, // 14 000 руб
		defaultZtlCostKopecks: 450000,       // 4 500 руб себестоимость ЗТЛ
		descriptionRu: "Металлокерамическая коронка на прочном кобальт-хромовом каркасе с керамической облицовкой.",
	},
	clasp_denture: {
		id: "clasp_denture",
		nameRu: "Бюгельный протез (замковый Bredent / кламмерный)",
		shortNameRu: "Бюгельный протез",
		categoryRu: "Съемное протезирование",
		defaultMaterialRu: "Литой Co-Cr каркас + замки Bredent VKS-SG + гарнитур Ivoclar",
		standardTurnaroundDays: 10,
		requiresVitaShade: true,
		requiresStumpShade: false,
		requiresTranslucency: false,
		defaultPatientPriceKopecks: 4800000, // 48 000 руб
		defaultZtlCostKopecks: 1650000,      // 16 500 руб себестоимость ЗТЛ
		descriptionRu: "Дуговой протез с замковыми аттачменами или литыми удерживающими кламмерами.",
	},
	aligner_splint: {
		id: "aligner_splint",
		nameRu: "Ортодонтическая каппа / элайнер / сплинт",
		shortNameRu: "Каппа / элайнер",
		categoryRu: "Ортодонтия и гнатология",
		defaultMaterialRu: "Биосовместимый многослойный полимер Duran / Zendura FLX 0.75мм",
		standardTurnaroundDays: 4,
		requiresVitaShade: false,
		requiresStumpShade: false,
		requiresTranslucency: false,
		defaultPatientPriceKopecks: 1800000, // 18 000 руб
		defaultZtlCostKopecks: 550000,       // 5 500 руб себестоимость ЗТЛ
		descriptionRu: "Прозрачная индивидуальная каппа для ортодонтического перемещения или окклюзионной декомпрессии.",
	},
	surgical_guide: {
		id: "surgical_guide",
		nameRu: "Хирургический навигационный шаблон для имплантации",
		shortNameRu: "Хирургический шаблон",
		categoryRu: "Дентальная имплантация CAD/CAM",
		defaultMaterialRu: "Фотополимер Medical Clear 3D Print + титановые гильзы",
		standardTurnaroundDays: 3,
		requiresVitaShade: false,
		requiresStumpShade: false,
		requiresTranslucency: false,
		defaultPatientPriceKopecks: 1500000, // 15 000 руб
		defaultZtlCostKopecks: 500000,       // 5 000 руб себестоимость ЗТЛ
		descriptionRu: "Точный шаблон на основе совмещения КЛКТ и оптического скана со направляющими втулками.",
	},
};

// ─── 2. КАНОНИЧЕСКИЕ СТАТУСЫ ЗТЛ ────────────────────────────────────────────

export type DentalLabOrderStatus =
	| "sent_to_lab"          // 1. «Отправлен в ЗТЛ»
	| "in_progress"          // 2. «В работе»
	| "ready_in_clinic"      // 3. «Готов / В клинике»
	| "try_in"               // 4. «Примерка»
	| "delivered_to_patient" // 5. «Сдан пациенту»
	| "warranty_rework"      // 6. «Переделка (гарантия)»
	| "delayed";             // 7. «Задерживается»

export interface DentalLabStatusDef {
	readonly id: DentalLabOrderStatus;
	readonly stepIndex: number;
	readonly labelRu: string;
	readonly shortLabelRu: string;
	readonly descriptionRu: string;
	readonly badgeClass: string;
	readonly colorHex: string;
}

export const DENTAL_LAB_STATUSES: Record<DentalLabOrderStatus, DentalLabStatusDef> = {
	sent_to_lab: {
		id: "sent_to_lab",
		stepIndex: 1,
		labelRu: "Отправлен в ЗТЛ",
		shortLabelRu: "Отправлен",
		descriptionRu: "Слепок или цифровой скан передан курьеру и направлен в лабораторию.",
		badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-300 dark:border-blue-700",
		colorHex: "#3b82f6",
	},
	in_progress: {
		id: "in_progress",
		stepIndex: 2,
		labelRu: "В работе",
		shortLabelRu: "В производстве",
		descriptionRu: "Конструкция моделируется и фрезеруется зубным техником в CAD/CAM лаборатории.",
		badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 dark:border-amber-700",
		colorHex: "#f59e0b",
	},
	ready_in_clinic: {
		id: "ready_in_clinic",
		stepIndex: 3,
		labelRu: "Готов / В клинике",
		shortLabelRu: "В клинике",
		descriptionRu: "Работа доставлена курьером в клинику, прошла дезинфекцию и готова к приему.",
		badgeClass: "bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 border-teal-300 dark:border-teal-700",
		colorHex: "#0d9488",
	},
	try_in: {
		id: "try_in",
		stepIndex: 4,
		labelRu: "Примерка",
		shortLabelRu: "Примерка",
		descriptionRu: "Проводится клиническая примерка каркаса, посадки или цвета в кресле ортопеда.",
		badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border-purple-300 dark:border-purple-700",
		colorHex: "#8b5cf6",
	},
	delivered_to_patient: {
		id: "delivered_to_patient",
		stepIndex: 5,
		labelRu: "Сдан пациенту",
		shortLabelRu: "Сдан",
		descriptionRu: "Конструкция окончательно зафиксирована в полости рта пациента, акт подписан.",
		badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700",
		colorHex: "#10b981",
	},
	warranty_rework: {
		id: "warranty_rework",
		stepIndex: 6,
		labelRu: "Переделка (гарантия)",
		shortLabelRu: "Переделка",
		descriptionRu: "Работа направлена на гарантийную переделку или коррекцию цвета/окклюзии (0 ₽).",
		badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300 dark:border-rose-700",
		colorHex: "#f43f5e",
	},
	delayed: {
		id: "delayed",
		stepIndex: 7,
		labelRu: "Задерживается",
		shortLabelRu: "Задержка",
		descriptionRu: "Срок изготовления превышен или задерживается лабораторией. Требуется перенос приема.",
		badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-400 dark:border-amber-600",
		colorHex: "#f59e0b",
	},
};

export const DENTAL_LAB_STATUS_ORDER: readonly DentalLabOrderStatus[] = [
	"sent_to_lab",
	"in_progress",
	"ready_in_clinic",
	"try_in",
	"delivered_to_patient",
	"warranty_rework",
];

/**
 * Сопоставляет статус наряда ЗТЛ с каноническим 5-этапным клиническим маршрутом:
 * Оттиск -> В лаборатории -> Примерка -> Готово -> Фиксация
 */
export function mapOrderStatusToCanonical5(status: DentalLabOrderStatus): Canonical5LabStatus {
	switch (status) {
		case "sent_to_lab":
			return "sent";
		case "in_progress":
			return "in_progress";
		case "try_in":
			return "fitting";
		case "ready_in_clinic":
			return "ready";
		case "delivered_to_patient":
			return "completed";
		case "warranty_rework":
			return "sent";
		default:
			return "sent";
	}
}

/**
 * Сопоставляет канонический 5-этапный статус обратно со статусом наряда ЗТЛ.
 */
export function mapCanonical5ToOrderStatus(canonical: Canonical5LabStatus): DentalLabOrderStatus {
	switch (canonical) {
		case "sent":
			return "sent_to_lab";
		case "in_progress":
			return "in_progress";
		case "fitting":
			return "try_in";
		case "ready":
			return "ready_in_clinic";
		case "completed":
			return "delivered_to_patient";
		default:
			return "sent_to_lab";
	}
}

// ─── 3. ШКАЛЫ VITA И ХАРАКТЕРИСТИКИ ──────────────────────────────────────────

export const VITA_CLASSICAL_SHADES = [
	"A1", "A2", "A3", "A3.5", "A4",
	"B1", "B2", "B3", "B4",
	"C1", "C2", "C3", "C4",
	"D2", "D3", "D4",
] as const;

export const VITA_BLEACH_SHADES = [
	"BL1", "BL2", "BL3", "BL4",
	"0M1", "0M2", "0M3",
] as const;

export const ENAMEL_TRANSLUCENCY_OPTIONS = [
	{ id: "HT", labelRu: "HT — Высокая прозрачность (High Translucency)" },
	{ id: "MT", labelRu: "MT — Средняя прозрачность (Medium Translucency)" },
	{ id: "LT", labelRu: "LT — Низкая прозрачность (Low Translucency)" },
	{ id: "MO", labelRu: "MO — Опалесцентная средняя (Medium Opacity)" },
	{ id: "HO", labelRu: "HO — Высокая опаковость (High Opacity, маскировка)" },
] as const;

export const STUMP_NATURAL_DIE_SHADES = [
	{ id: "ND1", labelRu: "ND1 (Светлая витальная культя)" },
	{ id: "ND2", labelRu: "ND2 (Нормальная эмаль/дентин)" },
	{ id: "ND3", labelRu: "ND3 (Умеренно темный дентин)" },
	{ id: "ND4", labelRu: "ND4 (Депульпированный зуб)" },
	{ id: "ND5", labelRu: "ND5 (Теплый коричневый оттенок)" },
	{ id: "ND6", labelRu: "ND6 (Темный дисколорит)" },
	{ id: "ND7", labelRu: "ND7 (Выраженный дисколорит / резорцин)" },
	{ id: "ND8", labelRu: "ND8 (Металлическая культевая вкладка Co-Cr)" },
	{ id: "ND9", labelRu: "ND9 (Титановый темный абатмент)" },
] as const;

// ─── 4. ЗУБНАЯ ФОРМУЛА FDI (11-48) ──────────────────────────────────────────

/**
 * Валидные номера зубов взрослого прикуса по международной классификации FDI (ISO 3950).
 */
export const VALID_FDI_TEETH = new Set<number>([
	11, 12, 13, 14, 15, 16, 17, 18,
	21, 22, 23, 24, 25, 26, 27, 28,
	31, 32, 33, 34, 35, 36, 37, 38,
	41, 42, 43, 44, 45, 46, 47, 48,
]);

export function isValidFdiTooth(num: number): boolean {
	return VALID_FDI_TEETH.has(num);
}

export function parseFdiTeethString(raw: string | number | undefined | null): number[] {
	if (raw == null) return [];
	if (typeof raw === "number") {
		return isValidFdiTooth(raw) ? [raw] : [];
	}
	const str = String(raw).trim();
	if (!str) return [];
	const parts = str.split(/[\s,;+]+/).filter(Boolean);
	const result: number[] = [];
	for (const p of parts) {
		const n = parseInt(p, 10);
		if (!isNaN(n) && isValidFdiTooth(n)) {
			if (!result.includes(n)) result.push(n);
		}
	}
	return result.sort((a, b) => a - b);
}

export function formatFdiTeethDisplay(teeth: readonly number[] | string | undefined | null): string {
	if (!teeth) return "—";
	if (typeof teeth === "string") {
		const parsed = parseFdiTeethString(teeth);
		if (parsed.length === 0) return teeth;
		teeth = parsed;
	}
	if (!Array.isArray(teeth) || teeth.length === 0) return "—";
	return teeth.join(", ");
}
