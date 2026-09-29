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
 *   «Работа из ЗТЛ еще не поступила в клинику!»
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
	"delayed",
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
	readonly isWarrantyRework?: boolean | undefined;
	readonly warrantyLiabilityType?: "clinic_warranty" | "lab_defect" | "patient_fault" | undefined;
	readonly warrantyLiabilityKopecks?: number | undefined;
	readonly warrantyLiabilityRub?: number | undefined;
	readonly warrantyLiabilityLabelRu?: string | undefined;
}

export interface CalculateZtlFinancialsParams {
	readonly unitsCount: number;
	readonly patientPriceRub?: number | undefined;
	readonly patientPriceKopecks?: number | undefined;
	readonly ztlCostRub?: number | undefined;
	readonly ztlCostKopecks?: number | undefined;
	readonly doctorSharePercent?: number | undefined; // По умолчанию 20%
	readonly isWarrantyRework?: boolean | undefined;
	readonly warrantyLiabilityType?: "clinic_warranty" | "lab_defect" | "patient_fault" | undefined;
}

/**
 * Рассчитывает сдельную оплату врача-ортопеда с гарантированным вычетом себестоимости ЗТЛ.
 * Инвариант: doctorWageKopecks + clinicMarginKopecks === doctorWageBaseKopecks.
 * Гарантийный протокол: пациент СТРОГО 0 ₽, учет затрат как обязательства клиники или брак ЗТЛ.
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

	const isWarranty = Boolean(params.isWarrantyRework);
	const liabilityType = params.warrantyLiabilityType || "clinic_warranty";

	if (isWarranty) {
		// При гарантийной переделке пациент платит строго 0 ₽
		let effectiveZtlCostKop = unitCostKop * count;
		let warrantyLiabilityKopecks = effectiveZtlCostKop;
		let liabilityLabelRu = "Гарантийные обязательства клиники";

		if (liabilityType === "lab_defect") {
			effectiveZtlCostKop = 0;
			warrantyLiabilityKopecks = 0;
			liabilityLabelRu = "Брак ЗТЛ (переделка за счет лаборатории 0 ₽)";
		}

		const clinicMarginKopecks = effectiveZtlCostKop === 0 ? 0 : -effectiveZtlCostKop;

		return {
			unitsCount: count,
			patientPriceKopecks: 0,
			ztlCostKopecks: effectiveZtlCostKop,
			doctorWageBaseKopecks: 0,
			doctorSharePercent: docPct,
			doctorWageKopecks: 0,
			clinicMarginKopecks,
			patientPriceRub: 0,
			ztlCostRub: effectiveZtlCostKop / 100,
			doctorWageBaseRub: 0,
			doctorWageRub: 0,
			clinicMarginRub: clinicMarginKopecks === 0 ? 0 : clinicMarginKopecks / 100,
			isBalanced: true,
			isWarrantyRework: true,
			warrantyLiabilityType: liabilityType,
			warrantyLiabilityKopecks,
			warrantyLiabilityRub: warrantyLiabilityKopecks / 100,
			warrantyLiabilityLabelRu: liabilityLabelRu,
		};
	}

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
		isWarrantyRework: false,
	};
}

// ─── 6. АЛЕРТ ДЕДЛАЙНА И КОНТРОЛЬ ПРИХОДА РАБОТЫ ─────────────────────────────

export type LabDeadlineAlertSeverity = "CRITICAL_TODAY" | "OVERDUE" | "URGENT_TODAY" | "INFO" | "OK" | "VISIT_CONFLICT";

export interface LabDeadlineAlertResult {
	readonly hasAlert: boolean;
	readonly isDelayedAlert: boolean;
	readonly severity: LabDeadlineAlertSeverity;
	readonly badgeTextRu: string;
	readonly messageRu: string;
	readonly actionRu: string;
	readonly daysUntilDeadline: number;
	readonly badgeLabelRu?: string;
	readonly actionPromptRu?: string;
	readonly warningRu?: string;
}

export interface CheckLabOrderAlertParams {
	readonly status: DentalLabOrderStatus;
	readonly deadlineDate?: string | Date | undefined;
	readonly dueDate?: string | Date | undefined;
	readonly scheduledVisitDate?: string | Date | null | undefined;
	readonly todayDate?: string | Date | undefined;
	readonly patientName?: string | undefined;
	readonly toothNotation?: string | undefined;
	readonly orderId?: string | undefined;
	readonly orderNumber?: string | undefined;
}

export function parseDateOnly(val?: string | Date | null): Date {
	if (!val) {
		const d = new Date();
		d.setHours(0, 0, 0, 0);
		return d;
	}
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
 * Добавление рабочих дней ЗТЛ с пропуском суббот и воскресений.
 */
export function addWorkingDaysRu(startDate: Date | string, daysToAdd: number): Date {
	const result = parseDateOnly(startDate);
	let added = 0;
	while (added < daysToAdd) {
		result.setDate(result.getDate() + 1);
		const dayOfWeek = result.getDay();
		if (dayOfWeek !== 0 && dayOfWeek !== 6) {
			added++;
		}
	}
	return result;
}

/**
 * Расчет плановой даты готовности ЗТЛ с учетом рабочих дней лаборатории.
 */
export function calculateLabReadinessDate(
	startDate: Date | string = new Date(),
	turnaroundWorkingDays = 5,
): string {
	const d = addWorkingDaysRu(startDate, Math.max(1, turnaroundWorkingDays));
	return toIsoDate(d);
}

export interface FittingCollisionGuardResult {
	readonly hasCollision: boolean;
	readonly warningRu: string | null;
	readonly daysGap: number;
	readonly deadlineDateIso: string;
	readonly scheduledVisitDateIso: string | null;
}

/**
 * Защита от коллизий визита примерки и срока готовности ЗТЛ:
 * Если визит на примерку/фиксацию в расписании назначен РАНЬШЕ расчетного срока готовности ЗТЛ,
 * формируется тревожное предупреждение: «Внимание: прием на примерку назначен раньше готовности лаборатории!».
 */
export function checkFittingAppointmentCollision(
	deadlineDate: string | Date,
	scheduledVisitDate?: string | Date | null,
): FittingCollisionGuardResult {
	const deadline = parseDateOnly(deadlineDate);
	const deadlineIso = toIsoDate(deadline);
	if (!scheduledVisitDate) {
		return {
			hasCollision: false,
			warningRu: null,
			daysGap: 0,
			deadlineDateIso: deadlineIso,
			scheduledVisitDateIso: null,
		};
	}
	const visit = parseDateOnly(scheduledVisitDate);
	const visitIso = toIsoDate(visit);
	const diffMs = deadline.getTime() - visit.getTime();
	const daysGap = Math.round(diffMs / (1000 * 60 * 60 * 24));
	const hasCollision = daysGap > 0;

	return {
		hasCollision,
		warningRu: hasCollision
			? `Внимание: прием на примерку назначен раньше готовности лаборатории! (дефицит: ${daysGap} дн., готовность: ${deadlineIso}, визит: ${visitIso})`
			: null,
		daysGap: hasCollision ? daysGap : 0,
		deadlineDateIso: deadlineIso,
		scheduledVisitDateIso: visitIso,
	};
}

/**
 * Проверяет дедлайн наряда ЗТЛ и выявляет критический алерт:
 * 1. Коллизия графика: визит назначен РАНЬШЕ готовности ЗТЛ.
 * 2. Прием на сегодня, а работа еще не в клинике.
 * 3. Задержка или просрочка со стороны лаборатории.
 */
export function detectLabDeadlineAlert(params: CheckLabOrderAlertParams): LabDeadlineAlertResult {
	const today = params.todayDate ? parseDateOnly(params.todayDate) : parseDateOnly(new Date());
	const todayIso = toIsoDate(today);

	// Если статус «Задерживается» — немедленно формируется тревожный янтарный алерт
	if (params.status === "delayed") {
		return {
			hasAlert: true,
			isDelayedAlert: true,
			severity: "CRITICAL_TODAY",
			badgeTextRu: "Задерживается ЗТЛ",
			badgeLabelRu: "Задерживается ЗТЛ",
			messageRu: "Лаборатория задерживает изготовление работы. Требуется перенос приема пациента.",
			warningRu: "Лаборатория задерживает изготовление работы. Требуется перенос приема пациента.",
			actionRu: "Перенести прием пациента в расписании (1 клик).",
			actionPromptRu: "Перенести прием пациента в расписании (1 клик).",
			daysUntilDeadline: -1,
		};
	}

	// Если работа уже в клинике, на примерке или сдана — алерта непоступления нет
	if (params.status === "ready_in_clinic") {
		return {
			hasAlert: false,
			isDelayedAlert: false,
			severity: "OK",
			badgeTextRu: "В клинике (Готов)",
			badgeLabelRu: "В клинике (Готов)",
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
			badgeLabelRu: "Примерка",
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
			badgeLabelRu: "Сдан пациенту",
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
			badgeLabelRu: "Переделка (гарантия)",
			messageRu: "Наряд находится на гарантийной переделке / доработке.",
			actionRu: "Ожидайте повторной доставки из ЗТЛ.",
			daysUntilDeadline: 0,
		};
	}

	// Статусы: "sent_to_lab" или "in_progress" (работа НЕ в клинике)
	const rawDeadline = params.deadlineDate || params.dueDate;
	if (!rawDeadline) {
		return {
			hasAlert: false,
			isDelayedAlert: false,
			severity: "OK",
			badgeTextRu: "Срок не задан",
			badgeLabelRu: "Срок не задан",
			messageRu: "",
			warningRu: "",
			actionRu: "",
			actionPromptRu: "",
			daysUntilDeadline: 0,
		};
	}

	const visitDate = params.scheduledVisitDate ? parseDateOnly(params.scheduledVisitDate) : null;
	const visitIso = visitDate ? toIsoDate(visitDate) : null;

	const deadline = parseDateOnly(rawDeadline);
	const deadlineIso = toIsoDate(deadline);
	const diffMs = deadline.getTime() - today.getTime();
	const daysUntilDeadline = Math.round(diffMs / (1000 * 60 * 60 * 24));

	// 1. ЗАЩИТА ОТ КОЛЛИЗИЙ (Fitting Appointment Guard):
	// Если визит на примерку назначен РАНЬШЕ расчетного срока готовности ЗТЛ
	if (visitDate && visitDate.getTime() < deadline.getTime()) {
		const collisionDays = Math.round((deadline.getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24));
		return {
			hasAlert: true,
			isDelayedAlert: true,
			severity: "CRITICAL_TODAY",
			badgeTextRu: "Прием раньше готовности ЗТЛ!",
			badgeLabelRu: "Прием раньше готовности ЗТЛ!",
			messageRu: `Внимание: прием на примерку назначен раньше готовности лаборатории! (дефицит: ${collisionDays} дн.)`,
			warningRu: `Внимание: прием на примерку назначен раньше готовности лаборатории! (дефицит: ${collisionDays} дн.)`,
			actionRu: `Перенести прием на дату не ранее расчетной готовности лаборатории (${formatRuDate(deadlineIso)}, разница ${collisionDays} дн.).`,
			actionPromptRu: `Перенести прием на дату не ранее расчетной готовности лаборатории (${formatRuDate(deadlineIso)}, разница ${collisionDays} дн.).`,
			daysUntilDeadline,
		};
	}

	// 2. ГЛАВНЫЙ КЛИНИЧЕСКИЙ АЛЕРТ: визит пациента назначен на СЕГОДНЯ (или раньше), а работа еще в ЗТЛ!
	if (visitIso && visitIso <= todayIso) {
		const toothLabel = params.toothNotation ? ` (зуб ${params.toothNotation})` : "";
		return {
			hasAlert: true,
			isDelayedAlert: true,
			severity: "CRITICAL_TODAY",
			badgeTextRu: "Работа еще не поступила в клинику!",
			badgeLabelRu: "Работа еще не поступила в клинику!",
			messageRu: `Работа из ЗТЛ еще не поступила в клинику! У пациента ${params.patientName || ""}${toothLabel} назначен прием на ${formatRuDate(visitIso)}, а статус в ЗТЛ еще «${DENTAL_LAB_STATUSES[params.status].labelRu}».`,
			actionRu: "Срочно связаться с лабораторией/курьером или предупредить врача и регистратора!",
			daysUntilDeadline,
		};
	}

	// 3. Дедлайн ЗТЛ просрочен (сегодня > дата дедлайна)
	if (daysUntilDeadline < 0) {
		const overdueDays = Math.abs(daysUntilDeadline);
		return {
			hasAlert: true,
			isDelayedAlert: true,
			severity: "OVERDUE",
			badgeTextRu: `Просрочен ЗТЛ на ${overdueDays} дн.`,
			badgeLabelRu: `Просрочен ЗТЛ на ${overdueDays} дн.`,
			messageRu: `Лаборатория не сдала работу к плановому сроку ${formatRuDate(deadlineIso)} (задержка ${overdueDays} дн.).`,
			warningRu: `Лаборатория не сдала работу к плановому сроку ${formatRuDate(deadlineIso)} (задержка ${overdueDays} дн.).`,
			actionRu: "Перенести прием пациента и запросить у техника статус изготовления.",
			actionPromptRu: "Перенести прием пациента и запросить у техника статус изготовления.",
			daysUntilDeadline,
		};
	}

	// 4. Срок сдачи сегодня
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
	readonly teeth?: readonly (number | string)[] | undefined;
	readonly constructionType: DentalLabConstructionType;
	readonly materialRu: string;
	readonly material?: string | undefined;
	readonly vitaShade: string;
	readonly colorVita?: string | undefined;
	readonly shadeSystem?: "classical" | "3d_master" | "bleach" | undefined;
	readonly translucency?: string | undefined;
	readonly stumpShade?: string | undefined;
	readonly sentDate: string;     // YYYY-MM-DD
	readonly deadlineDate: string; // YYYY-MM-DD (дата примерки/сдачи)
	readonly dueDate?: string | undefined;
	readonly status: DentalLabOrderStatus;
	readonly patientPriceKopecks: number;
	readonly priceRub?: number | undefined;
	readonly ztlCostKopecks: number;
	readonly doctorSharePercent: number;
	readonly scheduledVisitDate?: string | undefined; // YYYY-MM-DD
	readonly appointmentId?: string | undefined;
	readonly isWarrantyRemake?: boolean | undefined;
	readonly isWarrantyRework?: boolean | undefined;
	readonly warrantyReason?: string | undefined;
	readonly reworkReason?: string | undefined;
	readonly clinicalNotes?: string | undefined;
	readonly attachedScanUrl?: string | undefined;
	// Поддержка частичной поставки и гарантийной переделки
	readonly deliveredTeeth?: readonly number[] | undefined;
	readonly reworkTeeth?: readonly number[] | undefined;
	readonly isPartialDelivery?: boolean | undefined;
	readonly originalOrderId?: string | undefined;
	readonly originalOrderNumber?: string | undefined;
	readonly warrantyLiabilityType?: "clinic_warranty" | "lab_defect" | "patient_fault" | undefined;
	readonly fittingCollisionWarning?: string | undefined;
	readonly anatomicalFeatures?: {
		readonly opalescence?: boolean | undefined;
		readonly mamelons?: boolean | undefined;
		readonly calcifications?: boolean | undefined;
		readonly translucencyLevel?: string | undefined;
		readonly stumpShade?: string | undefined;
	} | undefined;
	readonly createdAt: string;
	readonly updatedAt: string;
}

export interface PartialDeliveryParams {
	readonly order?: DentalLabOrderRecord | undefined;
	readonly originalOrder?: DentalLabOrderRecord | undefined;
	readonly readyTeeth?: readonly (number | string)[] | undefined;
	readonly deliveredTeeth?: readonly (number | string)[] | undefined;
	readonly reworkTeeth: readonly (number | string)[];
	readonly reworkReason: string;
	readonly liabilityType?: "clinic_warranty" | "lab_defect" | "patient_fault" | undefined;
	readonly warrantyLiabilityType?: "clinic_warranty" | "lab_defect" | "patient_fault" | undefined;
}

export interface PartialDeliveryResult {
	readonly deliveredOrder: DentalLabOrderRecord;
	readonly reworkOrder: DentalLabOrderRecord;
	readonly summaryRu: string;
	readonly summaryMessageRu: string;
}

/**
 * Обработка сценария частичной поставки и гарантийной переделки:
 * Из наряда на несколько единиц (например 4 коронки) готовые (3 ед.) принимаются в клинике
 * и могут быть сданы пациенту, а дефектная (1 ед.) отправляется на гарантийную переделку (0 ₽ для пациента).
 * Заказ не зависает в мертвом тупике.
 */
export function processPartialDeliveryAndRework(params: PartialDeliveryParams): PartialDeliveryResult {
	const order = params.originalOrder || params.order;
	if (!order) {
		throw new Error("processPartialDeliveryAndRework: missing order or originalOrder parameter");
	}
	const readyRaw = params.readyTeeth || params.deliveredTeeth || [];
	const reworkRaw = params.reworkTeeth || [];
	const readyTeeth: number[] = readyRaw.map((t) => typeof t === "number" ? t : Number.parseInt(String(t), 10) || 0).filter(Boolean);
	const reworkTeeth: number[] = reworkRaw.map((t) => typeof t === "number" ? t : Number.parseInt(String(t), 10) || 0).filter(Boolean);
	const liabilityType = params.warrantyLiabilityType || params.liabilityType || "lab_defect";
	const reworkReason = params.reworkReason || "Гарантийная рекламация";

	const allTeeth = order.teethFdi || (order.teeth as readonly number[]) || [16];
	const totalCount = Math.max(1, allTeeth.length);
	const readyCount = readyTeeth.length;
	const reworkCount = reworkTeeth.length;

	const pricePerUnitKop = Math.round(order.patientPriceKopecks / totalCount);
	const costPerUnitKop = Math.round(order.ztlCostKopecks / totalCount);

	const deliveredPatientPriceKop = pricePerUnitKop * readyCount;
	const deliveredZtlCostKop = costPerUnitKop * readyCount;

	const now = new Date().toISOString();

	// 1. Принятая часть наряда: доступна для записи и фиксации
	const deliveredOrder: DentalLabOrderRecord = {
		...order,
		teethFdi: readyTeeth,
		teeth: readyTeeth,
		deliveredTeeth: readyTeeth,
		reworkTeeth,
		isPartialDelivery: true,
		patientPriceKopecks: deliveredPatientPriceKop,
		priceRub: Math.round(deliveredPatientPriceKop / 100),
		ztlCostKopecks: deliveredZtlCostKop,
		status: "ready_in_clinic",
		clinicalNotes: `${order.clinicalNotes || ""}\n• ЧАСТИЧНАЯ ПРИЕМКА: Зубы [${readyTeeth.join(", ")}] готовы в клинике к фиксации. Зубы [${reworkTeeth.join(", ")}] направлены на гарантийную переделку.`.trim(),
		updatedAt: now,
	};

	// 2. Гарантийная переделка: строго 0 ₽ для пациента!
	const reworkZtlCostKop = liabilityType === "lab_defect" ? 0 : costPerUnitKop * reworkCount;

	const reworkOrder: DentalLabOrderRecord = {
		...order,
		id: `${order.id}-REW-1`,
		orderNumber: `${order.orderNumber}-REW-1`,
		teethFdi: reworkTeeth,
		teeth: reworkTeeth,
		deliveredTeeth: undefined,
		reworkTeeth,
		isPartialDelivery: true,
		originalOrderId: order.id,
		originalOrderNumber: order.orderNumber,
		status: "warranty_rework",
		patientPriceKopecks: 0, // 0 ₽ для пациента
		priceRub: 0,
		ztlCostKopecks: reworkZtlCostKop,
		isWarrantyRemake: true,
		isWarrantyRework: true,
		warrantyReason: reworkReason || "Гарантийная доработка одиночной единицы",
		reworkReason: reworkReason || "Гарантийная доработка одиночной единицы",
		warrantyLiabilityType: liabilityType,
		clinicalNotes: `• ГАРАНТИЙНАЯ ПЕРЕДЕЛКА ЕДИНИЦЫ (0 ₽ ДЛЯ ПАЦИЕНТА)\n• Исходный наряд ЗТЛ: № ${order.orderNumber}\n• Зубы на доработку: [${reworkTeeth.join(", ")}]\n• Причина рекламации: ${reworkReason || "Коррекция прилегания/окклюзии/оттенка"}\n• Тип ответственности: ${liabilityType === "lab_defect" ? "Брак ЗТЛ (0 ₽)" : "Гарантия клиники"}`,
		createdAt: now,
		updatedAt: now,
	};

	const summaryRu = `Частичная приемка оформлена: наряд № ${order.orderNumber}, зубы ${readyTeeth.join(", ")} готовы к примерке/фиксации, зуб(ы) ${reworkTeeth.join(", ")} направлены на гарантийную переделку (0 ₽ для пациента).`;

	return {
		deliveredOrder,
		reworkOrder,
		summaryRu,
		summaryMessageRu: summaryRu,
	};
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

export function createDentalLabOrderRecord(partial: any): DentalLabOrderRecord {
	const construction = partial.constructionType || "crown_zirconia";
	const def = DENTAL_LAB_CONSTRUCTIONS[construction];
	const sentDate = partial.sentDate || toIsoDate(new Date());
	const deadline = partial.deadlineDate || partial.dueDate || calculateLabReadinessDate(sentDate, def?.standardTurnaroundDays ?? 5);
	const collision = checkFittingAppointmentCollision(deadline, partial.scheduledVisitDate);

	const rawTeeth = partial.teethFdi || partial.teeth || [16];
	const teeth: number[] = Array.isArray(rawTeeth)
		? rawTeeth.map((t: any) => typeof t === "number" ? t : Number.parseInt(String(t), 10) || 16)
		: [16];

	const totalPatientPriceKop = partial.patientPriceKopecks ?? (partial.priceRub != null ? partial.priceRub * 100 : (def?.defaultPatientPriceKopecks ?? 2400000) * teeth.length);
	const unitPatientPriceKop = Math.round(totalPatientPriceKop / Math.max(1, teeth.length));
	const totalZtlCostKop = partial.ztlCostKopecks ?? (def?.defaultZtlCostKopecks ?? 750000) * teeth.length;
	const unitZtlCostKop = Math.round(totalZtlCostKop / Math.max(1, teeth.length));

	const financials = calculateZtlWageFinancials({
		unitsCount: teeth.length,
		patientPriceKopecks: unitPatientPriceKop,
		ztlCostKopecks: unitZtlCostKop,
		doctorSharePercent: partial.doctorSharePercent ?? 20,
		isWarrantyRework: partial.isWarrantyRemake || partial.isWarrantyRework,
		warrantyLiabilityType: partial.warrantyLiabilityType,
	});

	const shade = partial.vitaShade || partial.colorVita || "A2";
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
		teeth,
		constructionType: construction,
		materialRu: partial.materialRu || partial.material || def?.defaultMaterialRu || "Диоксид циркония Katana ML",
		material: partial.material || partial.materialRu || def?.defaultMaterialRu || "Диоксид циркония Katana ML",
		vitaShade: shade,
		colorVita: shade,
		shadeSystem: partial.shadeSystem || "classical",
		translucency: partial.translucency || "MT",
		stumpShade: partial.stumpShade || "ND2",
		sentDate,
		deadlineDate: deadline,
		dueDate: deadline,
		status: partial.status || "sent_to_lab",
		patientPriceKopecks: financials.patientPriceKopecks,
		priceRub: Math.round(financials.patientPriceKopecks / 100),
		ztlCostKopecks: financials.ztlCostKopecks,
		doctorSharePercent: financials.doctorSharePercent,
		scheduledVisitDate: partial.scheduledVisitDate,
		appointmentId: partial.appointmentId,
		isWarrantyRemake: partial.isWarrantyRemake || partial.isWarrantyRework || false,
		isWarrantyRework: partial.isWarrantyRemake || partial.isWarrantyRework || false,
		warrantyReason: partial.warrantyReason || partial.reworkReason,
		reworkReason: partial.warrantyReason || partial.reworkReason,
		clinicalNotes: partial.clinicalNotes,
		attachedScanUrl: partial.attachedScanUrl,
		deliveredTeeth: partial.deliveredTeeth,
		reworkTeeth: partial.reworkTeeth,
		isPartialDelivery: partial.isPartialDelivery || false,
		originalOrderId: partial.originalOrderId,
		originalOrderNumber: partial.originalOrderNumber,
		warrantyLiabilityType: partial.warrantyLiabilityType,
		fittingCollisionWarning: collision.warningRu ?? partial.fittingCollisionWarning,
		anatomicalFeatures: {
			translucencyLevel: partial.translucency || partial.anatomicalFeatures?.translucencyLevel || "MT",
			mamelons: partial.mamelons ?? partial.anatomicalFeatures?.mamelons ?? false,
			opalescence: partial.opalescence ?? partial.anatomicalFeatures?.opalescence ?? false,
			calcifications: partial.calcifications ?? partial.anatomicalFeatures?.calcifications ?? false,
			stumpShade: partial.stumpShade || partial.anatomicalFeatures?.stumpShade,
		},
		createdAt: partial.createdAt || now,
		updatedAt: partial.updatedAt || now,
	};
}
export { getDemoDentalLabOrderRecords, getDemoDentalLabOrderData } from "./dentalLabDemoData";
