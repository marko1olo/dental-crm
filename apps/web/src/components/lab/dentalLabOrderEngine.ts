/**
 * dentalLabOrderEngine.ts — Канонический доменный движок нарядов в зуботехническую лабораторию (ЗТЛ).
 *
 * СТРОГИЙ СТОМАТОЛОГИЧЕСКИЙ ДОМЕН (БЕЗ ОБЩЕМЕДИЦИНСКОГО БЛОАТА):
 * • В стоматологии «Лаборатория» — это исключительно ЗТЛ (зуботехническая лаборатория:
 *   коронки, мосты, виниры, элайнеры, бюгели, культевые вкладки, хирургические шаблоны).
 * • Никакой биохимии крови, онкомаркеров, цитологии и мазков.
 *
 * 6 КАНОНИЧЕСКИХ СТАТУСОВ НАРЯДА ЗТЛ:
 * 1. sent_to_lab           — «Отправлен в ЗТЛ»
 * 2. in_progress           — «В работе»
 * 3. ready_in_clinic       — «Готов / В клинике»
 * 4. try_in                — «Примерка»
 * 5. delivered_to_patient  — «Сдан пациенту»
 * 6. warranty_rework       — «Переделка (гарантия)»
 *
 * 5 КАНОНИЧЕСКИХ КЛИНИЧЕСКИХ ЭТАПОВ (CANONICAL_5_CLINICAL_LAB_STATUSES):
 * Оттиск (sent) -> В лаборатории (in_progress) -> Примерка (fitting) -> Готово (ready) -> Фиксация (completed)
 *
 * 6 ВИДОВ СТОМАТОЛОГИЧЕСКИХ ОРТОПЕДИЧЕСКИХ КОНСТРУКЦИЙ:
 * 1. crown_zirconia        — Коронка цирконий (Multi-Layer Katana/Prettau)
 * 2. crown_emax            — E-max пресс (дисиликат лития IPS e.max)
 * 3. metal_ceramic         — Металлокерамика (Co-Cr фрезерованный/литой)
 * 4. clasp_denture         — Бюгельный протез (замковый Bredent / кламмерный)
 * 5. aligner_splint        — Каппа / элайнер / сплинт
 * 6. surgical_guide        — Хирургический шаблон для имплантации
 *
 * РАСЦВЕТКА VITA И ХАРАКТЕРИСТИКИ:
 * • VITA Classical: A1–A4, B1–B4, C1–C4, D2–D4 (16 оттенков)
 * • VITA Bleach: BL1, BL2, BL3, BL4, 0M1, 0M2, 0M3 (ультрасветлые)
 * • Прозрачность эмали: HT (High), MT (Medium), LT (Low), MO (Med Opacity), HO (High Opacity)
 * • Оттенок культи (IPS Natural Die): ND1 .. ND9
 *
 * ФИНАНСОВЫЙ УЧЕТ В ЦЕЛОЧИСЛЕННЫХ КОПЕЙКАХ:
 * • Себестоимость ЗТЛ (ztlCostKopecks) вычитается из валовой стоимости пациента при расчете сдельной базы врача:
 *   doctorWageBaseKopecks = max(0, patientPriceKopecks - ztlCostKopecks)
 *   doctorWageKopecks = round(doctorWageBaseKopecks * (doctorSharePercent / 100))
 *   clinicMarginKopecks = patientPriceKopecks - ztlCostKopecks - doctorWageKopecks
 *
 * АЛЕРТ ДЕДЛАЙНА (КЛИНИЧЕСКИЙ ТРИГГЕР):
 * • Если у пациента на сегодня назначен визит на сдачу/примерку коронки,
 *   а статус наряда в ЗТЛ еще «В работе» или «Отправлен в ЗТЛ» — выставляется алерт:
 *   «⚠️ Работа из ЗТЛ еще не поступила в клинику!»
 */

import {
	CANONICAL_5_CLINICAL_LAB_STATUSES,
	type Canonical5LabStatus,
	type Canonical5LabStatusItem,
} from "./labMath";

export {
	CANONICAL_5_CLINICAL_LAB_STATUSES,
	type Canonical5LabStatus,
	type Canonical5LabStatusItem,
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
	| "warranty_rework";     // 6. «Переделка (гарантия)»

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

// ─── 5. ФИНАНСОВЫЙ РАСЧЕТ С УДЕРЖАНИЕМ СЕБЕСТОИМОСТИ ЗТЛ (EXACT KOPECKS) ──────

export interface ZtlWageFinancials {
	readonly unitsCount: number;
	readonly patientPriceKopecks: number;
	readonly ztlCostKopecks: number;
	readonly doctorWageBaseKopecks: number; // Валовая выручка минус себестоимость ЗТЛ
	readonly doctorSharePercent: number;
	readonly doctorWageKopecks: number;     // Сдельная ЗП врача
	readonly clinicMarginKopecks: number;   // Чистая маржа клиники
	// Форматированные значения в рублях для UI
	readonly patientPriceRub: number;
	readonly ztlCostRub: number;
	readonly doctorWageBaseRub: number;
	readonly doctorWageRub: number;
	readonly clinicMarginRub: number;
	readonly isBalanced: boolean;
}

export interface CalculateZtlFinancialsParams {
	readonly unitsCount: number;
	readonly patientPriceRub?: number | undefined;
	readonly patientPriceKopecks?: number | undefined;
	readonly ztlCostRub?: number | undefined;
	readonly ztlCostKopecks?: number | undefined;
	readonly doctorSharePercent?: number | undefined; // По умолчанию 20%
}

/**
 * Рассчитывает сдельную оплату врача-ортопеда с гарантированным вычетом себестоимости ЗТЛ.
 * Инвариант: doctorWageKopecks + clinicMarginKopecks === doctorWageBaseKopecks.
 */
export function calculateZtlWageFinancials(params: CalculateZtlFinancialsParams): ZtlWageFinancials {
	const count = Math.max(1, Math.round(params.unitsCount || 1));

	const unitPriceKop = Math.max(
		0,
		Math.round(
			params.patientPriceKopecks ??
				(params.patientPriceRub != null ? params.patientPriceRub * 100 : 2400000),
		),
	);

	const unitCostKop = Math.max(
		0,
		Math.round(
			params.ztlCostKopecks ??
				(params.ztlCostRub != null ? params.ztlCostRub * 100 : 750000),
		),
	);

	const docPct = Math.max(0, Math.min(100, params.doctorSharePercent ?? 20));

	const patientPriceKopecks = unitPriceKop * count;
	const ztlCostKopecks = unitCostKop * count;

	// Сдельная база врача: строго выручка минус себестоимость ЗТЛ
	const doctorWageBaseKopecks = Math.max(0, patientPriceKopecks - ztlCostKopecks);

	// Зарплата врача
	const doctorWageKopecks = Math.round((doctorWageBaseKopecks * docPct) / 100);

	// Маржа клиники
	const clinicMarginKopecks = Math.max(0, doctorWageBaseKopecks - doctorWageKopecks);

	return {
		unitsCount: count,
		patientPriceKopecks,
		ztlCostKopecks,
		doctorWageBaseKopecks,
		doctorSharePercent: docPct,
		doctorWageKopecks,
		clinicMarginKopecks,
		patientPriceRub: patientPriceKopecks / 100,
		ztlCostRub: ztlCostKopecks / 100,
		doctorWageBaseRub: doctorWageBaseKopecks / 100,
		doctorWageRub: doctorWageKopecks / 100,
		clinicMarginRub: clinicMarginKopecks / 100,
		isBalanced: doctorWageKopecks + clinicMarginKopecks === doctorWageBaseKopecks,
	};
}

// ─── 6. АЛЕРТ ДЕДЛАЙНА И КОНТРОЛЬ ПРИХОДА РАБОТЫ ─────────────────────────────

export type LabDeadlineAlertSeverity = "CRITICAL_TODAY" | "OVERDUE" | "URGENT_TODAY" | "INFO" | "OK";

export interface LabDeadlineAlertResult {
	readonly hasAlert: boolean;
	readonly isDelayedAlert: boolean;
	readonly severity: LabDeadlineAlertSeverity;
	readonly badgeTextRu: string;
	readonly messageRu: string;
	readonly actionRu: string;
	readonly daysUntilDeadline: number;
}

export interface CheckLabOrderAlertParams {
	readonly status: DentalLabOrderStatus;
	readonly deadlineDate: string | Date; // Дата примерки / сдачи
	readonly scheduledVisitDate?: string | Date | null | undefined; // Дата приема пациента
	readonly todayDate?: string | Date | undefined;
	readonly patientName?: string | undefined;
	readonly toothNotation?: string | undefined;
}

export function parseDateOnly(val: string | Date): Date {
	const d = typeof val === "string" ? new Date(val) : new Date(val.getTime());
	d.setHours(0, 0, 0, 0);
	return d;
}

export function toIsoDate(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

export function formatRuDate(iso: string): string {
	if (!iso) return "—";
	const p = iso.slice(0, 10).split("-");
	return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : iso;
}

/**
 * Проверяет дедлайн наряда ЗТЛ и выявляет критический алерт:
 * «⚠️ Работа из ЗТЛ еще не поступила в клинику!», если у пациента назначен визит на сегодня,
 * а статус все еще «В работе» или «Отправлен в ЗТЛ».
 */
export function detectLabDeadlineAlert(params: CheckLabOrderAlertParams): LabDeadlineAlertResult {
	const today = params.todayDate ? parseDateOnly(params.todayDate) : parseDateOnly(new Date());
	const todayIso = toIsoDate(today);

	// Если работа уже в клинике, на примерке или сдана — алерта непоступления нет
	if (params.status === "ready_in_clinic") {
		return {
			hasAlert: false,
			isDelayedAlert: false,
			severity: "OK",
			badgeTextRu: "В клинике (Готов)",
			messageRu: "Работа доставлена в клинику и готова к примерке или фиксации.",
			actionRu: "Пригласить пациента на прием.",
			daysUntilDeadline: 0,
		};
	}

	if (params.status === "try_in") {
		return {
			hasAlert: false,
			isDelayedAlert: false,
			severity: "OK",
			badgeTextRu: "Примерка",
			messageRu: "Конструкция на этапе клинической примерки в полости рта.",
			actionRu: "Зафиксировать результат примерки.",
			daysUntilDeadline: 0,
		};
	}

	if (params.status === "delivered_to_patient") {
		return {
			hasAlert: false,
			isDelayedAlert: false,
			severity: "OK",
			badgeTextRu: "Сдан пациенту",
			messageRu: "Работа успешно установлена и сдана пациенту.",
			actionRu: "Наряд закрыт.",
			daysUntilDeadline: 0,
		};
	}

	if (params.status === "warranty_rework") {
		return {
			hasAlert: true,
			isDelayedAlert: true,
			severity: "INFO",
			badgeTextRu: "Переделка (гарантия)",
			messageRu: "Наряд находится на гарантийной переделке / доработке.",
			actionRu: "Ожидайте повторной доставки из ЗТЛ.",
			daysUntilDeadline: 0,
		};
	}

	// Статусы: "sent_to_lab" или "in_progress" (работа НЕ в клинике)
	const visitDate = params.scheduledVisitDate ? parseDateOnly(params.scheduledVisitDate) : null;
	const visitIso = visitDate ? toIsoDate(visitDate) : null;

	const deadline = parseDateOnly(params.deadlineDate);
	const deadlineIso = toIsoDate(deadline);
	const diffMs = deadline.getTime() - today.getTime();
	const daysUntilDeadline = Math.round(diffMs / (1000 * 60 * 60 * 24));

	// ГЛАВНЫЙ КЛИНИЧЕСКИЙ АЛЕРТ: визит пациента назначен на СЕГОДНЯ (или раньше), а работа еще в ЗТЛ!
	if (visitIso && visitIso <= todayIso) {
		const toothLabel = params.toothNotation ? ` (зуб ${params.toothNotation})` : "";
		return {
			hasAlert: true,
			isDelayedAlert: true,
			severity: "CRITICAL_TODAY",
			badgeTextRu: "⚠️ Работа еще не поступила в клинику!",
			messageRu: `⚠️ Работа из ЗТЛ еще не поступила в клинику! У пациента ${params.patientName || ""}${toothLabel} назначен прием на ${formatRuDate(visitIso)}, а статус в ЗТЛ еще «${DENTAL_LAB_STATUSES[params.status].labelRu}».`,
			actionRu: "Срочно связаться с лабораторией/курьером или предупредить врача и регистратора!",
			daysUntilDeadline,
		};
	}

	// Дедлайн ЗТЛ просрочен (сегодня > дата дедлайна)
	if (daysUntilDeadline < 0) {
		const overdueDays = Math.abs(daysUntilDeadline);
		return {
			hasAlert: true,
			isDelayedAlert: true,
			severity: "OVERDUE",
			badgeTextRu: `Просрочено ЗТЛ на ${overdueDays} дн.`,
			messageRu: `Лаборатория не сдала работу к плановому сроку ${formatRuDate(deadlineIso)} (задержка ${overdueDays} дн.).`,
			actionRu: "Запросить у техника статус изготовления.",
			daysUntilDeadline,
		};
	}

	// Срок сдачи сегодня
	if (daysUntilDeadline === 0) {
		return {
			hasAlert: true,
			isDelayedAlert: false,
			severity: "URGENT_TODAY",
			badgeTextRu: "Сдача из ЗТЛ сегодня",
			messageRu: `Плановая дата сдачи из лаборатории — сегодня (${formatRuDate(deadlineIso)}). Ожидается доставка курьером.`,
			actionRu: "Принять работу у курьера и зарегистрировать поступление.",
			daysUntilDeadline: 0,
		};
	}

	// В графике
	return {
		hasAlert: false,
		isDelayedAlert: false,
		severity: "OK",
		badgeTextRu: `В графике (${daysUntilDeadline} дн.)`,
		messageRu: `Работа изготавливается в плановом режиме. Срок сдачи: ${formatRuDate(deadlineIso)}.`,
		actionRu: "Действий не требуется.",
		daysUntilDeadline,
	};
}

// ─── 7. МОДЕЛЬ ДАННЫХ И НАВИГАЦИЯ СТАТУСОВ ──────────────────────────────────

export interface DentalLabOrderRecord {
	readonly id: string;
	readonly orderNumber: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly doctorId: string;
	readonly doctorName: string;
	readonly labName: string;
	readonly technicianName?: string | undefined;
	readonly teethFdi: readonly number[];
	readonly constructionType: DentalLabConstructionType;
	readonly materialRu: string;
	readonly vitaShade: string;
	readonly translucency?: string | undefined;
	readonly stumpShade?: string | undefined;
	readonly sentDate: string;     // YYYY-MM-DD
	readonly deadlineDate: string; // YYYY-MM-DD (дата примерки/сдачи)
	readonly status: DentalLabOrderStatus;
	readonly patientPriceKopecks: number;
	readonly ztlCostKopecks: number;
	readonly doctorSharePercent: number;
	readonly scheduledVisitDate?: string | undefined; // YYYY-MM-DD
	readonly appointmentId?: string | undefined;
	readonly isWarrantyRemake?: boolean | undefined;
	readonly warrantyReason?: string | undefined;
	readonly clinicalNotes?: string | undefined;
	readonly attachedScanUrl?: string | undefined;
	readonly createdAt: string;
	readonly updatedAt: string;
}

/**
 * Возвращает следующий канонический статус в цепочке ортопедического протокола.
 */
export function getNextLabStatus(current: DentalLabOrderStatus): DentalLabOrderStatus | null {
	switch (current) {
		case "sent_to_lab":
			return "in_progress";
		case "in_progress":
			return "ready_in_clinic";
		case "ready_in_clinic":
			return "try_in";
		case "try_in":
			return "delivered_to_patient";
		case "warranty_rework":
			return "sent_to_lab";
		case "delivered_to_patient":
			return null;
		default:
			return null;
	}
}

/**
 * Проверка допустимости перехода между статусами наряда ЗТЛ.
 */
export function canTransitionLabStatus(from: DentalLabOrderStatus, to: DentalLabOrderStatus): boolean {
	if (from === to) return true;
	if (to === "warranty_rework") {
		// Рекламацию можно оформить после сдачи, примерки или готовности
		return from === "delivered_to_patient" || from === "try_in" || from === "ready_in_clinic";
	}
	if (from === "warranty_rework") {
		return to === "sent_to_lab" || to === "in_progress" || to === "ready_in_clinic";
	}
	return true; // Свобода врача и администратора
}

/**
 * Фабрика наряда ЗТЛ с клиническими значениями по умолчанию.
 */
export function createDentalLabOrderRecord(partial: Partial<DentalLabOrderRecord>): DentalLabOrderRecord {
	const construction = partial.constructionType || "crown_zirconia";
	const def = DENTAL_LAB_CONSTRUCTIONS[construction];

	const sentDate = partial.sentDate || toIsoDate(new Date());
	const deadline = partial.deadlineDate || (() => {
		const d = new Date();
		d.setDate(d.getDate() + (def?.standardTurnaroundDays ?? 5));
		return toIsoDate(d);
	})();

	const teeth = partial.teethFdi && partial.teethFdi.length > 0 ? partial.teethFdi : [16];
	const units = teeth.length;

	const financials = calculateZtlWageFinancials({
		unitsCount: units,
		patientPriceKopecks: partial.patientPriceKopecks ?? (def?.defaultPatientPriceKopecks ?? 2400000),
		ztlCostKopecks: partial.ztlCostKopecks ?? (def?.defaultZtlCostKopecks ?? 750000),
		doctorSharePercent: partial.doctorSharePercent ?? 20,
	});

	const now = new Date().toISOString();

	return {
		id: partial.id || `ztl-ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		orderNumber: partial.orderNumber || `ЗТЛ-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`,
		patientId: partial.patientId || "pat-default",
		patientName: partial.patientName || "Пациент",
		doctorId: partial.doctorId || "doc-ortho",
		doctorName: partial.doctorName || "Врач-ортопед",
		labName: partial.labName || "CAD/CAM Центр Дентал-Мастер",
		technicianName: partial.technicianName,
		teethFdi: teeth,
		constructionType: construction,
		materialRu: partial.materialRu || def?.defaultMaterialRu || "Диоксид циркония Katana ML",
		vitaShade: partial.vitaShade || "A2",
		translucency: partial.translucency || "MT",
		stumpShade: partial.stumpShade || "ND2",
		sentDate,
		deadlineDate: deadline,
		status: partial.status || "sent_to_lab",
		patientPriceKopecks: financials.patientPriceKopecks,
		ztlCostKopecks: financials.ztlCostKopecks,
		doctorSharePercent: financials.doctorSharePercent,
		scheduledVisitDate: partial.scheduledVisitDate,
		appointmentId: partial.appointmentId,
		isWarrantyRemake: partial.isWarrantyRemake || false,
		warrantyReason: partial.warrantyReason,
		clinicalNotes: partial.clinicalNotes,
		attachedScanUrl: partial.attachedScanUrl,
		createdAt: partial.createdAt || now,
		updatedAt: partial.updatedAt || now,
	};
}
