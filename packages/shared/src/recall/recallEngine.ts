/**
 * Clinical Dispensary Recall & Patient Retention Engine (DOMAIN: RECALL)
 *
 * Диспансерный учет, клинические протоколы профилактических осмотров и возврат пациентов.
 * Соответствует клиническим рекомендациям Стоматологической Ассоциации России (СтАР),
 * стандартам доказательной пародонтологии (EFP/AAP), гарантийным регламентам клиники
 * и требованиям ФЗ «О рекламе» / Закона РФ «О защите прав потребителей».
 *
 * Основные клинические интервалы:
 * 1. Профгигиена / Air-Flow: каждые 6 месяцев.
 * 2. Контрольный осмотр имплантов / КЛКТ-контроль: каждые 12 месяцев (условие сохранения гарантии).
 * 3. Ортодонтия (активация брекетов / смена элайнеров): каждые 4 недели (28 дней).
 * 4. Эндодонтия (рентген-контроль очага периапикальной деструкции): через 6 месяцев.
 * 5. Кариес-контроль / ремотерапия: каждые 3-6 месяцев.
 * 6. Поддерживающая пародонтальная терапия (SPT): каждые 3-4 месяца.
 *
 * Статусы диспансеризации:
 * - UPCOMING: за 14 дней до наступления срока (окно предварительного напоминания).
 * - DUE_NOW: срок наступил (0..30 дней с даты срока).
 * - OVERDUE: просрочено >30 дней (критическая потеря контакта / риск осложнений).
 * - CONTACTED: уведомление отправлено (контакт зафиксирован).
 * - BOOKED: записан на прием (целевая конверсия).
 * - PLANNED: плановый статус (>14 дней до срока).
 * - COMPLETED: диспансерный визит успешно завершен.
 * - CANCELLED: отменено.
 * - SNOOZED: отложено пациентом.
 */

import { z } from "zod";

// ============================================================================
// 1. КЛИНИЧЕСКИЕ КАТЕГОРИИ И ТИПЫ ДИСПАНСЕРИЗАЦИИ
// ============================================================================

export const clinicalRecallCategorySchema = z.enum([
	"hygiene_airflow",       // Профгигиена / Air-Flow (каждые 6 месяцев)
	"implant_cbct_control",  // Контрольный осмотр имплантов / КЛКТ-контроль (каждые 12 месяцев, условие гарантии)
	"ortho_activation",      // Ортодонтия: активация брекетов / элайнеров (каждые 4 недели)
	"endo_xray_control",     // Эндодонтия: рентген-контроль очага деструкции (через 6 месяцев)
	"caries_control",        // Кариес-контроль / глубокое фторирование (каждые 3-6 месяцев)
	"perio_maintenance",     // Пародонтологический поддерживающий визит SPT (каждые 3-4 месяца)
	"pediatric_fluoridation",// Детская профилактика и минерализация (каждые 3 месяца)
	"prosthetic_check",      // Контроль ортопедических конструкций / окклюзии (каждые 12 месяцев)
	"general_checkup",       // Общий профилактический осмотр (каждые 6-12 месяцев)
	"other",                 // Индивидуальный клинический интервал
]);
export type ClinicalRecallCategory = z.infer<typeof clinicalRecallCategorySchema>;

export type ClinicalRecallType = ClinicalRecallCategory;

export interface RecallIntervalConfig {
	readonly months?: number | undefined;
	readonly weeks?: number | undefined;
	readonly days?: number | undefined;
}

export interface RecallCadenceDefinition {
	readonly category: ClinicalRecallCategory;
	readonly title: string;
	readonly shortTitle: string;
	readonly defaultIntervalMonths?: number;
	readonly defaultIntervalWeeks?: number;
	readonly defaultIntervalDays?: number;
	readonly clinicalRationale: string;
	readonly targetProcedures: readonly string[];
	readonly requiresRadiologyCheck: boolean;
	readonly preservesWarranty: boolean;
	readonly defaultRecallReasonRu: string;
	readonly priority: "low" | "normal" | "high" | "urgent";
}

/**
 * Регламент клинических интервалов диспансеризации Стоматологической Клиники.
 */
export const CLINICAL_RECALL_CADENCES: Readonly<Record<ClinicalRecallCategory, RecallCadenceDefinition>> = {
	hygiene_airflow: {
		category: "hygiene_airflow",
		title: "Профессиональная гигиена полости рта и Air-Flow",
		shortTitle: "Профгигиена (6 мес.)",
		defaultIntervalMonths: 6,
		defaultIntervalDays: 180,
		clinicalRationale:
			"Удаление над- и поддесневого зубного камня, полировка эмали Air-Flow, " +
			"онкоскрининг слизистой оболочки рта, диагностика скрытого кариеса и сохранение гарантийных обязательств клиники.",
		targetProcedures: [
			"Ультразвуковой скейлинг над- и поддесневых отложений",
			"Атравматичная воздушно-абразивная обработка Air-Flow (порошок глицин/эритритол)",
			"Полировка пастами разной абразивности",
			"Реминерализующая терапия и глубокое фторирование",
		],
		requiresRadiologyCheck: false,
		preservesWarranty: true,
		defaultRecallReasonRu: "Плановая профессиональная гигиена полости рта и Air-Flow (раз в 6 месяцев)",
		priority: "normal",
	},
	implant_cbct_control: {
		category: "implant_cbct_control",
		title: "Контрольный осмотр дентальных имплантатов и КЛКТ-контроль",
		shortTitle: "Импланты / КЛКТ (12 мес.)",
		defaultIntervalMonths: 12,
		defaultIntervalDays: 365,
		clinicalRationale:
			"Рентгенологический контроль остеоинтеграции, измерение уровня маргинальной кости вокруг имплантатов, " +
			"проверка стабильности винтовой фиксации абатментов, окклюзионных контактов и профилактика периимплантита. " +
			"Обязательное условие сохранения гарантии клиники и производителя имплантатов.",
		targetProcedures: [
			"Контрольная конусно-лучевая томография (КЛКТ) / прицельная визиография зоны имплантации",
			"Оценка состояния периимплантной слизистой (индекс BOP, глубина зондирования)",
			"Проверка окклюзионных суперконтактов (фольга 8 мкм / T-Scan)",
			"Специализированная гигиена супраструктур титановыми/пластиковыми кюретами",
		],
		requiresRadiologyCheck: true,
		preservesWarranty: true,
		defaultRecallReasonRu: "Контрольный осмотр имплантатов и КЛКТ-контроль для сохранения гарантии (каждые 12 месяцев)",
		priority: "high",
	},
	ortho_activation: {
		category: "ortho_activation",
		title: "Ортодонтия: плановая активация аппаратуры и смена элайнеров",
		shortTitle: "Ортодонтия (4 нед.)",
		defaultIntervalWeeks: 4,
		defaultIntervalDays: 28,
		clinicalRationale:
			"Замена ортодонтических дуг, эластических цепочек, активация пружин или выдача новых сетов элайнеров. " +
			"Интервал в 4 недели необходим для поддержания оптимальной биомеханической силы и непрерывного перемещения зубов.",
		targetProcedures: [
			"Смена никель-титановых / стальных дуг и лигатур",
			"Контроль фиксации брекетов и аттачментов элайнеров",
			"3D-сканирование трекинга перемещения зубов (ClinCheck контрольный чек)",
			"Сепарация апроксимальных контактов по протоколу",
		],
		requiresRadiologyCheck: false,
		preservesWarranty: true,
		defaultRecallReasonRu: "Плановая активация брекет-системы / контроль элайнеров (каждые 4 недели)",
		priority: "high",
	},
	endo_xray_control: {
		category: "endo_xray_control",
		title: "Эндодонтия: рентген-контроль очага деструкции",
		shortTitle: "Эндодонтия / Рентген (6 мес.)",
		defaultIntervalMonths: 6,
		defaultIntervalDays: 180,
		clinicalRationale:
			"Прицельная рентгенография/КЛКТ через 6 месяцев после пломбирования корневых каналов для оценки динамики " +
			"заживления периапикального очага деструкции (апикальный периодонтит, радикулярная кистогранулема) и плотности костной ткани.",
		targetProcedures: [
			"Прицельный радиовизиографический снимок зуба в параллельной технике",
			"Сравнительная оценка размеров периапикального просветления с исходным снимком",
			"Пальпация переходной складки и перкуссия зуба",
			"Оценка герметизма коронковой реставрации",
		],
		requiresRadiologyCheck: true,
		preservesWarranty: true,
		defaultRecallReasonRu: "Рентген-контроль очага деструкции после лечения каналов (через 6 месяцев)",
		priority: "high",
	},
	caries_control: {
		category: "caries_control",
		title: "Диспансерный кариес-мониторинг и ремотерапия",
		shortTitle: "Кариес-контроль (6 мес.)",
		defaultIntervalMonths: 6,
		defaultIntervalDays: 180,
		clinicalRationale:
			"Контроль краевого прилегания реставраций, выявление кариеса в стадии белого пятна, глубокое фторирование.",
		targetProcedures: [
			"Осмотр с трансиллюминацией и кариес-маркером",
			"Глубокое фторирование эмали (Bifluorid / Clinpro White Varnish)",
			"Шлифовка и полировка композитных реставраций",
		],
		requiresRadiologyCheck: false,
		preservesWarranty: true,
		defaultRecallReasonRu: "Диспансерный осмотр и кариес-контроль",
		priority: "normal",
	},
	perio_maintenance: {
		category: "perio_maintenance",
		title: "Поддерживающая пародонтальная терапия (SPT)",
		shortTitle: "Пародонтология (3 мес.)",
		defaultIntervalMonths: 3,
		defaultIntervalDays: 90,
		clinicalRationale:
			"Профилактика рецидива пародонтита каждые 3 месяца: поддесневой скейлинг и контроль глубины карманов.",
		targetProcedures: [
			"Пародонтальное зондирование (PSR / карта карманов)",
			"Поддесневая обработка аппаратом Vector / EMS Piezon",
			"Антисептическая инстилляция пародонтальных карманов",
		],
		requiresRadiologyCheck: true,
		preservesWarranty: true,
		defaultRecallReasonRu: "Поддерживающий пародонтологический осмотр (каждые 3 месяца)",
		priority: "high",
	},
	pediatric_fluoridation: {
		category: "pediatric_fluoridation",
		title: "Детская диспансеризация, герметизация и минерализация",
		shortTitle: "Детская (3 мес.)",
		defaultIntervalMonths: 3,
		defaultIntervalDays: 90,
		clinicalRationale:
			"Контроль созревания эмали временных и постоянных зубов у детей, герметизация фиссур и формирование гигиенических навыков.",
		targetProcedures: [
			"Индикация зубного налета",
			"Мягкая чистка порошком на основе глицина",
			"Аппликация минерализующего геля Tooth Mousse",
		],
		requiresRadiologyCheck: false,
		preservesWarranty: true,
		defaultRecallReasonRu: "Детский профилактический осмотр и минерализация (каждые 3 месяца)",
		priority: "normal",
	},
	prosthetic_check: {
		category: "prosthetic_check",
		title: "Гарантийный осмотр ортопедических конструкций",
		shortTitle: "Ортопедия (12 мес.)",
		defaultIntervalMonths: 12,
		defaultIntervalDays: 365,
		clinicalRationale:
			"Контроль краевого прилегания коронок, виниров, мостовидных протезов, проверка окклюзионного баланса.",
		targetProcedures: [
			"Оценка окклюзионных контактов артикуляционной фольгой",
			"Проверка герметизма цементной фиксации",
			"Гигиеническая чистка труднодоступных зон под промывными частями",
		],
		requiresRadiologyCheck: false,
		preservesWarranty: true,
		defaultRecallReasonRu: "Гарантийный осмотр коронок и ортопедических конструкций (через 12 месяцев)",
		priority: "normal",
	},
	general_checkup: {
		category: "general_checkup",
		title: "Плановый профилактический осмотр стоматолога",
		shortTitle: "Профосмотр (12 мес.)",
		defaultIntervalMonths: 12,
		defaultIntervalDays: 365,
		clinicalRationale: "Комплексный осмотр всех групп зубов, слизистой и онкоскрининг.",
		targetProcedures: ["Визуальный и инструментальный осмотр", "Фотопротокол"],
		requiresRadiologyCheck: false,
		preservesWarranty: false,
		defaultRecallReasonRu: "Плановый профилактический осмотр полости рта",
		priority: "low",
	},
	other: {
		category: "other",
		title: "Индивидуальный диспансерный вызов",
		shortTitle: "Индивидуальный",
		defaultIntervalMonths: 6,
		defaultIntervalDays: 180,
		clinicalRationale: "Индивидуальный срок вызова, назначенный лечащим врачом.",
		targetProcedures: ["Индивидуальный протокол приема"],
		requiresRadiologyCheck: false,
		preservesWarranty: false,
		defaultRecallReasonRu: "Плановый контрольный визит к стоматологу",
		priority: "normal",
	},
};

/**
 * Нормализация синонимов и ключей клинических категорий вызова.
 */
export function normalizeRecallCategory(rawInput: string): ClinicalRecallCategory {
	const key = rawInput.trim().toLowerCase();
	switch (key) {
		case "hygiene_airflow":
		case "hygiene":
		case "air_flow":
		case "airflow":
		case "standard_prophylaxis":
		case "prophylaxis":
		case "гигиена":
		case "профгигиена":
		case "чистка":
			return "hygiene_airflow";

		case "implant_cbct_control":
		case "implant_check":
		case "implant_monitoring":
		case "implant_cbct":
		case "implant":
		case "implants":
		case "имплант":
		case "импланты":
		case "клкт_имплантов":
			return "implant_cbct_control";

		case "ortho_activation":
		case "orthodontics":
		case "ortho_adjustment":
		case "ortho":
		case "braces":
		case "aligners":
		case "ортодонтия":
		case "брекеты":
		case "элайнеры":
		case "активация_брекетов":
			return "ortho_activation";

		case "endo_xray_control":
		case "endodontics":
		case "endo_review":
		case "endo":
		case "periapical_control":
		case "эндодонтия":
		case "лечение_каналов":
		case "рентген_каналов":
			return "endo_xray_control";

		case "caries_control":
		case "caries":
		case "кариес":
			return "caries_control";

		case "perio_maintenance":
		case "periodontics":
		case "perio":
		case "пародонтология":
		case "десны":
			return "perio_maintenance";

		case "pediatric_fluoridation":
		case "pediatric":
		case "детская":
		case "фторирование":
			return "pediatric_fluoridation";

		case "prosthetic_check":
		case "prosthetics":
		case "коронки":
		case "протезирование":
			return "prosthetic_check";

		case "general_checkup":
		case "checkup":
		case "осмотр":
			return "general_checkup";

		default:
			return "other";
	}
}

// ============================================================================
// 2. СТАТУСЫ ДИСПАНСЕРИЗАЦИИ (UPCOMING, DUE_NOW, OVERDUE, CONTACTED, BOOKED)
// ============================================================================

export const recallDispensaryStatusSchema = z.enum([
	"PLANNED",   // Запланирован (>14 дней до срока)
	"UPCOMING",  // За 14 дней до наступления срока
	"DUE_NOW",   // Срок наступил (0..30 дней)
	"OVERDUE",   // Просрочено >30 дней
	"CONTACTED", // Уведомление отправлено / звонок совершен
	"BOOKED",    // Пациент записан на прием
	"COMPLETED", // Диспансерный визит завершен
	"CANCELLED", // Отменено
	"SNOOZED",   // Отложено по просьбе пациента
]);
export type RecallDispensaryStatus = z.infer<typeof recallDispensaryStatusSchema>;

export const RECALL_STATUS_LABELS_RU: Readonly<Record<RecallDispensaryStatus, string>> = {
	PLANNED: "Запланирован",
	UPCOMING: "Срок приближается (за 14 дней)",
	DUE_NOW: "Срок наступил",
	OVERDUE: "Просрочено (>30 дней)",
	CONTACTED: "Уведомление отправлено",
	BOOKED: "Записан на прием",
	COMPLETED: "Визит завершен",
	CANCELLED: "Отменено",
	SNOOZED: "Отложено",
};

// ============================================================================
// 3. МАТЕМАТИЧЕСКИЕ И КАЛЕНДАРНЫЕ РАСЧЕТЫ
// ============================================================================

/**
 * Безопасное сложение календарных месяцев без скачков в следующий месяц при краевых днях.
 * Пример: 31 августа + 6 месяцев = 28 февраля (а не 3 марта).
 */
export function addCalendarMonthsSafe(fromDate: Date | string, months: number): Date {
	const parsed = typeof fromDate === "string" ? new Date(fromDate) : new Date(fromDate.getTime());
	if (Number.isNaN(parsed.getTime())) {
		return new Date();
	}

	const originalDay = parsed.getUTCDate();
	const result = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1, 0, 0, 0));
	result.setUTCMonth(result.getUTCMonth() + months);

	// Находим последний день целевого месяца
	const daysInTargetMonth = new Date(
		Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
	).getUTCDate();

	result.setUTCDate(Math.min(originalDay, daysInTargetMonth));
	return result;
}

/**
 * Безопасное добавление дней к дате (UTC).
 */
export function addDaysSafe(fromDate: Date | string, days: number): Date {
	const parsed = typeof fromDate === "string" ? new Date(fromDate) : new Date(fromDate.getTime());
	if (Number.isNaN(parsed.getTime())) {
		return new Date();
	}
	const result = new Date(parsed.getTime());
	result.setUTCDate(result.getUTCDate() + days);
	return result;
}

/**
 * Безопасное добавление недель к дате (UTC).
 */
export function addWeeksSafe(fromDate: Date | string, weeks: number): Date {
	return addDaysSafe(fromDate, weeks * 7);
}

/**
 * Форматирование даты в формат YYYY-MM-DD.
 */
export function formatIsoDateOnly(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date;
	if (Number.isNaN(d.getTime())) {
		return "";
	}
	const year = d.getUTCFullYear();
	const month = String(d.getUTCMonth() + 1).padStart(2, "0");
	const day = String(d.getUTCDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * Расчет разницы в полных календарных днях (referenceDate - dueDate).
 * Положительное значение: просрочено на N дней.
 * Отрицательное значение: осталось N дней до наступления срока.
 */
export function calculateDaysOverdue(
	dueDate: Date | string,
	referenceDate: Date | string = new Date(),
): number {
	const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
	const ref = typeof referenceDate === "string" ? new Date(referenceDate) : referenceDate;

	const dueUtc = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
	const refUtc = Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate());

	const diffMs = refUtc - dueUtc;
	return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Расчет количества дней ДО наступления срока (dueDate - referenceDate).
 * Положительное значение: осталось N дней до срока.
 * Отрицательное значение: просрочено на N дней.
 */
export function calculateDaysUntilDue(
	dueDate: Date | string,
	referenceDate: Date | string = new Date(),
): number {
	return -calculateDaysOverdue(dueDate, referenceDate);
}

/**
 * Автоматический расчет даты следующего вызова на основе категории лечения.
 */
export function calculateRecallDueDate(
	treatmentCompletedDate: Date | string,
	category: ClinicalRecallCategory | string,
	customInterval?: RecallIntervalConfig,
): Date {
	const normalized = normalizeRecallCategory(category);
	const cadence = CLINICAL_RECALL_CADENCES[normalized];

	// Если передан кастомный интервал в днях/неделях/месяцах
	if (customInterval) {
		if (customInterval.days !== undefined) {
			return addDaysSafe(treatmentCompletedDate, customInterval.days);
		}
		if (customInterval.weeks !== undefined) {
			return addWeeksSafe(treatmentCompletedDate, customInterval.weeks);
		}
		if (customInterval.months !== undefined) {
			return addCalendarMonthsSafe(treatmentCompletedDate, customInterval.months);
		}
	}

	// Стандартные интервалы по клиническим регламентам:
	if (cadence.defaultIntervalWeeks !== undefined) {
		return addWeeksSafe(treatmentCompletedDate, cadence.defaultIntervalWeeks);
	}
	if (cadence.defaultIntervalMonths !== undefined) {
		return addCalendarMonthsSafe(treatmentCompletedDate, cadence.defaultIntervalMonths);
	}
	if (cadence.defaultIntervalDays !== undefined) {
		return addDaysSafe(treatmentCompletedDate, cadence.defaultIntervalDays);
	}

	// Дефолт: 6 месяцев
	return addCalendarMonthsSafe(treatmentCompletedDate, 6);
}

/**
 * Расчет даты следующего вызова в формате строки YYYY-MM-DD.
 */
export function calculateRecallDueDateString(
	treatmentCompletedDate: Date | string,
	category: ClinicalRecallCategory | string,
	customInterval?: RecallIntervalConfig,
): string {
	const target = calculateRecallDueDate(treatmentCompletedDate, category, customInterval);
	return formatIsoDateOnly(target);
}

/**
 * Определение текущего статуса диспансеризации:
 * - UPCOMING: за 14 дней до срока (-14 <= daysOverdue < 0)
 * - DUE_NOW: срок наступил (0 <= daysOverdue <= 30)
 * - OVERDUE: просрочено > 30 дней (daysOverdue > 30)
 * - CONTACTED: зафиксирован контакт
 * - BOOKED: пациент записан
 */
export function determineRecallStatus(params: {
	dueDate: Date | string;
	referenceDate?: Date | string;
	isBooked?: boolean;
	isContacted?: boolean;
	isCompleted?: boolean;
	isCancelled?: boolean;
	isSnoozed?: boolean;
	manualStatus?: RecallDispensaryStatus;
}): RecallDispensaryStatus {
	if (params.isCompleted || params.manualStatus === "COMPLETED") {
		return "COMPLETED";
	}
	if (params.isCancelled || params.manualStatus === "CANCELLED") {
		return "CANCELLED";
	}
	if (params.isBooked || params.manualStatus === "BOOKED") {
		return "BOOKED";
	}
	if (params.isContacted || params.manualStatus === "CONTACTED") {
		return "CONTACTED";
	}
	if (params.isSnoozed || params.manualStatus === "SNOOZED") {
		return "SNOOZED";
	}

	const overdueDays = calculateDaysOverdue(params.dueDate, params.referenceDate ?? new Date());

	if (overdueDays < -14) {
		return "PLANNED";
	}
	if (overdueDays >= -14 && overdueDays < 0) {
		return "UPCOMING";
	}
	if (overdueDays >= 0 && overdueDays <= 30) {
		return "DUE_NOW";
	}
	return "OVERDUE";
}

// ============================================================================
// 4. ГЕНЕРАТОР ПЕРСОНАЛИЗИРОВАННЫХ ШАБЛОНОВ И ТЕГОВ
// ============================================================================

export interface RecallTemplateContext {
	readonly patientName?: string | null | undefined;
	readonly doctorName?: string | null | undefined;
	readonly recallReason?: string | null | undefined;
	readonly bookingUrl?: string | null | undefined;
	readonly clinicName?: string | null | undefined;
	readonly dueDate?: string | null | undefined;
	readonly phone?: string | null | undefined;
	readonly [key: string]: unknown;
}

/**
 * Автоподстановка тегов в шаблон сообщения.
 * Поддерживает:
 * - {{ИмяПациента}} / {{patientName}} / {{PATIENT_NAME}}
 * - {{ИмяВрача}} / {{doctorName}} / {{DOCTOR_NAME}}
 * - {{ПричинаВызова}} / {{recallReason}} / {{RECALL_REASON}}
 * - {{СсылкаНаОнлайнЗапись}} / {{bookingUrl}} / {{BOOKING_URL}}
 * - {{Клиника}} / {{clinicName}}
 * - {{ДатаСрока}} / {{dueDate}}
 * - {{Телефон}} / {{phone}}
 *
 * Поддерживает как двойные {{...}}, так и одинарные {...} фигурные скобки,
 * нечувствительность к регистру и пробелам внутри тега.
 */
export function renderRecallMessageTemplate(
	template: string,
	context: RecallTemplateContext = {},
): string {
	const patientName = String(context.patientName || context["ИмяПациента"] || context["Пациент"] || "Уважаемый пациент").trim();
	const doctorName = String(context.doctorName || context["ИмяВрача"] || context["Врач"] || "Ваш лечащий врач").trim();
	const recallReason = String(context.recallReason || context["ПричинаВызова"] || context["Причина"] || context["Процедура"] || "Плановый осмотр").trim();
	const bookingUrl = String(context.bookingUrl || context["СсылкаНаОнлайнЗапись"] || context["Ссылка"] || "").trim();
	const clinicName = String(context.clinicName || context["Клиника"] || "Стоматологическая клиника ДЕНТЕ").trim();
	const dueDate = String(context.dueDate || context["ДатаСрока"] || "").trim();
	const phone = String(context.phone || context["Телефон"] || "").trim();

	const tagMap: Record<string, string> = {
		// Имя пациента
		имяпациента: patientName,
		patientname: patientName,
		patient_name: patientName,
		пациент: patientName,
		фио: patientName,
		имя: patientName,

		// Имя врача
		имяврача: doctorName,
		doctorname: doctorName,
		doctor_name: doctorName,
		врач: doctorName,
		доктор: doctorName,

		// Причина вызова
		причинавызова: recallReason,
		recallreason: recallReason,
		recall_reason: recallReason,
		причина: recallReason,
		процедура: recallReason,
		диагноз: recallReason,

		// Ссылка на запись
		ссылканаонлайнзапись: bookingUrl,
		bookingurl: bookingUrl,
		booking_url: bookingUrl,
		ссылка: bookingUrl,
		url: bookingUrl,

		// Клиника
		клиника: clinicName,
		clinicname: clinicName,
		clinic_name: clinicName,

		// Дата и телефон
		датасрока: dueDate,
		duedate: dueDate,
		телефон: phone,
		phone: phone,
	};

	// Замена паттернов {{TAG}} и {TAG}
	return template.replace(/\{{1,2}\s*([^}]+?)\s*\}{1,2}/g, (match, rawKey) => {
		const cleanKey = String(rawKey).trim().toLowerCase().replace(/[\s_-]+/g, "");
		if (cleanKey in tagMap) {
			return tagMap[cleanKey] ?? match;
		}
		// Проверка произвольных ключей из context
		if (rawKey in context && context[rawKey] !== undefined && context[rawKey] !== null) {
			return String(context[rawKey]);
		}
		return match;
	});
}

/**
 * Базовые клинические шаблоны сообщений по умолчанию для каналов связи.
 */
export const DEFAULT_CLINICAL_TEMPLATES: Readonly<Record<ClinicalRecallCategory, { whatsapp: string; sms: string }>> = {
	hygiene_airflow: {
		whatsapp:
			"Здравствуйте, {{ИмяПациента}}! Стоматология «{{Клиника}}» заботится о Вашем здоровье. " +
			"Прошло 6 месяцев с Вашего прошлого визита. Напоминаем о необходимости плановой профессиональной гигиены полости рта и Air-Flow у доктора {{ИмяВрача}} для сохранения чистоты зубов и гарантии.\n\n" +
			"Причина вызова: {{ПричинаВызова}}.\n\n" +
			"📅 Выбрать удобное время онлайн в 1 клик:\n{{СсылкаНаОнлайнЗапись}}",
		sms:
			"{{ИмяПациента}}, подошел срок профгигиены (6 мес). {{Клиника}}, врач {{ИмяВрача}}. Запись: {{СсылкаНаОнлайнЗапись}}",
	},
	implant_cbct_control: {
		whatsapp:
			"Добрый день, {{ИмяПациента}}! Клиника «{{Клиника}}». " +
			"Прошло 12 месяцев с момента установки дентальных имплантатов. Доктор {{ИмяВрача}} ждет Вас на контрольный рентген-осмотр (КЛКТ-контроль) для оценки остеоинтеграции и сохранения гарантии на имплантаты.\n\n" +
			"Причина вызова: {{ПричинаВызова}}.\n\n" +
			"🦷 Записаться на прием:\n{{СсылкаНаОнлайнЗапись}}",
		sms:
			"{{ИмяПациента}}, плановый осмотр имплантов и КЛКТ для гарантии (12 мес). {{Клиника}}: {{СсылкаНаОнлайнЗапись}}",
	},
	ortho_activation: {
		whatsapp:
			"Здравствуйте, {{ИмяПациента}}! Стоматология «{{Клиника}}». " +
			"Подошел срок плановой активации аппаратуры / смены элайнеров у Вашего ортодонта {{ИмяВрача}} (прошло 4 недели). " +
			"Своевременная активация необходима для непрерывного перемещения зубов.\n\n" +
			"Причина: {{ПричинаВызова}}.\n\n" +
			"✨ Онлайн-запись:\n{{СсылкаНаОнлайнЗапись}}",
		sms:
			"{{ИмяПациента}}, подошел срок активации брекетов/элайнеров у доктора {{ИмяВрача}}. Запись: {{СсылкаНаОнлайнЗапись}}",
	},
	endo_xray_control: {
		whatsapp:
			"Здравствуйте, {{ИмяПациента}}! Клиника «{{Клиника}}». " +
			"Прошло 6 месяцев после лечения корневых каналов. Доктор {{ИмяВрача}} приглашает Вас на контрольный рентгеновский снимок для оценки заживления очага деструкции в костной ткани.\n\n" +
			"Причина вызова: {{ПричинаВызова}}.\n\n" +
			"📸 Записаться на контрольный снимок:\n{{СсылкаНаОнлайнЗапись}}",
		sms:
			"{{ИмяПациента}}, контрольный рентген после лечения каналов у доктора {{ИмяВрача}}. {{Клиника}}: {{СсылкаНаОнлайнЗапись}}",
	},
	caries_control: {
		whatsapp:
			"Здравствуйте, {{ИмяПациента}}! Клиника «{{Клиника}}». " +
			"Подошел срок планового кариес-контроля и глубокого фторирования у доктора {{ИмяВрача}}.\n\n" +
			"Запись: {{СсылкаНаОнлайнЗапись}}",
		sms:
			"{{ИмяПациента}}, плановый кариес-контроль в {{Клиника}}. Запись: {{СсылкаНаОнлайнЗапись}}",
	},
	perio_maintenance: {
		whatsapp:
			"Добрый день, {{ИмяПациента}}! Клиника «{{Клиника}}». " +
			"Подошел 3-месячный срок поддерживающей пародонтальной терапии у доктора {{ИмяВрача}}.\n\n" +
			"Запись: {{СсылкаНаОнлайнЗапись}}",
		sms:
			"{{ИмяПациента}}, срок пародонтологического контроля в {{Клиника}}. Запись: {{СсылкаНаОнлайнЗапись}}",
	},
	pediatric_fluoridation: {
		whatsapp:
			"Здравствуйте! Стоматология «{{Клиника}}». " +
			"Приглашаем маленького пациента {{ИмяПациента}} на минерализацию эмали и урок гигиены к детскому доктору {{ИмяВрача}}!\n\n" +
			"Запись: {{СсылкаНаОнлайнЗапись}}",
		sms:
			"Осмотр и фторирование зубов для {{ИмяПациента}} в {{Клиника}}. Запись: {{СсылкаНаОнлайнЗапись}}",
	},
	prosthetic_check: {
		whatsapp:
			"Здравствуйте, {{ИмяПациента}}! Клиника «{{Клиника}}». " +
			"Подошел срок гарантийного осмотра ортопедических конструкций у доктора {{ИмяВрача}}.\n\n" +
			"Запись: {{СсылкаНаОнлайнЗапись}}",
		sms:
			"{{ИмяПациента}}, гарантийный осмотр коронок в {{Клиника}}. Запись: {{СсылкаНаОнлайнЗапись}}",
	},
	general_checkup: {
		whatsapp:
			"Здравствуйте, {{ИмяПациента}}! Стоматология «{{Клиника}}». " +
			"Приглашаем Вас на плановый профилактический осмотр к доктору {{ИмяВрача}}.\n\n" +
			"Запись: {{СсылкаНаОнлайнЗапись}}",
		sms:
			"{{ИмяПациента}}, плановый осмотр в {{Клиника}}. Запись: {{СсылкаНаОнлайнЗапись}}",
	},
	other: {
		whatsapp:
			"Здравствуйте, {{ИмяПациента}}! Стоматология «{{Клиника}}». " +
			"Подошел срок планового визита к доктору {{ИмяВрача}} по причине: {{ПричинаВызова}}.\n\n" +
			"Запись: {{СсылкаНаОнлайнЗапись}}",
		sms:
			"{{ИмяПациента}}, плановый визит в {{Клиника}}. Запись: {{СсылкаНаОнлайнЗапись}}",
	},
};

export interface GenerateRecallMessageParams {
	readonly category: ClinicalRecallCategory | string;
	readonly patientName: string;
	readonly doctorName?: string | undefined;
	readonly recallReason?: string | undefined;
	readonly bookingUrl?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly dueDate?: string | undefined;
	readonly channel?: "whatsapp" | "sms" | "telegram" | "email";
	readonly customTemplate?: string | undefined;
}

/**
 * Генерация готового персонализированного сообщения с автоподстановкой всех тегов.
 */
export function generateRecallMessage(params: GenerateRecallMessageParams): {
	readonly title: string;
	readonly body: string;
	readonly channel: string;
} {
	const normalizedCategory = normalizeRecallCategory(params.category);
	const cadence = CLINICAL_RECALL_CADENCES[normalizedCategory];
	const channel = params.channel ?? "whatsapp";

	const reason = params.recallReason ?? cadence.defaultRecallReasonRu;
	const clinicName = params.clinicName ?? "Стоматологическая клиника ДЕНТЕ";

	const context: RecallTemplateContext = {
		patientName: params.patientName,
		doctorName: params.doctorName ?? "Ваш лечащий врач",
		recallReason: reason,
		bookingUrl: params.bookingUrl ?? "https://dente.clinic/booking",
		clinicName,
		dueDate: params.dueDate ?? "",
	};

	let rawTemplate = params.customTemplate;
	if (!rawTemplate) {
		const templates = DEFAULT_CLINICAL_TEMPLATES[normalizedCategory] || DEFAULT_CLINICAL_TEMPLATES.general_checkup;
		rawTemplate = channel === "sms" ? templates.sms : templates.whatsapp;
	}

	const body = renderRecallMessageTemplate(rawTemplate, context);
	const title = `Напоминание: ${cadence.title}`;

	return {
		title,
		body,
		channel,
	};
}

// ============================================================================
// 5. МОДЕЛЬ ДАННЫХ ДИСПАНСЕРНОГО УЧЕТА И ВАЛИДАЦИЯ ПЕРЕХОДОВ
// ============================================================================

export const recallDispensaryRecordSchema = z.object({
	id: z.string().uuid().optional(),
	organizationId: z.string().uuid(),
	patientId: z.string().uuid(),
	patientFullName: z.string().min(1),
	patientPhone: z.string().optional().nullable(),
	patientEmail: z.string().email().optional().nullable(),
	category: clinicalRecallCategorySchema,
	treatmentCompletedDate: z.string(), // YYYY-MM-DD
	dueDate: z.string(),                // YYYY-MM-DD
	daysOverdue: z.number().int().optional().default(0),
	status: recallDispensaryStatusSchema.default("PLANNED"),
	priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
	assignedDoctorId: z.string().uuid().optional().nullable(),
	assignedDoctorName: z.string().optional().nullable(),
	recallReason: z.string().optional().nullable(),
	preservesWarranty: z.boolean().default(false),
	requiresRadiologyCheck: z.boolean().default(false),
	contactAttemptsCount: z.number().int().nonnegative().default(0),
	lastContactedAt: z.string().datetime().optional().nullable(),
	bookingAppointmentId: z.string().uuid().optional().nullable(),
	bookedAt: z.string().datetime().optional().nullable(),
	completedAt: z.string().datetime().optional().nullable(),
	notes: z.string().max(1000).optional().nullable(),
	createdAt: z.string().datetime().optional(),
	updatedAt: z.string().datetime().optional(),
});
export type RecallDispensaryRecord = z.infer<typeof recallDispensaryRecordSchema>;

/**
 * Проверка допустимости перехода состояний диспансеризации (State Machine).
 */
export function canTransitionRecallStatus(
	from: RecallDispensaryStatus,
	to: RecallDispensaryStatus,
): boolean {
	if (from === to) return true;

	const allowedTransitions: Record<RecallDispensaryStatus, RecallDispensaryStatus[]> = {
		PLANNED: ["UPCOMING", "DUE_NOW", "OVERDUE", "CONTACTED", "BOOKED", "CANCELLED", "SNOOZED"],
		UPCOMING: ["DUE_NOW", "OVERDUE", "CONTACTED", "BOOKED", "CANCELLED", "SNOOZED"],
		DUE_NOW: ["OVERDUE", "CONTACTED", "BOOKED", "COMPLETED", "CANCELLED", "SNOOZED"],
		OVERDUE: ["CONTACTED", "BOOKED", "COMPLETED", "CANCELLED", "SNOOZED"],
		CONTACTED: ["BOOKED", "DUE_NOW", "OVERDUE", "COMPLETED", "CANCELLED", "SNOOZED"],
		BOOKED: ["COMPLETED", "CANCELLED", "DUE_NOW", "OVERDUE"],
		COMPLETED: ["PLANNED"], // Переход на следующий цикл диспансеризации
		CANCELLED: ["PLANNED", "UPCOMING", "DUE_NOW"],
		SNOOZED: ["PLANNED", "UPCOMING", "DUE_NOW", "BOOKED", "CANCELLED"],
	};

	return allowedTransitions[from]?.includes(to) ?? false;
}

// ============================================================================
// 6. ФИЛЬТРАЦИЯ И АГРЕГАЦИЯ КОГОРТ ДИСПАНСЕРИЗАЦИИ
// ============================================================================

export function filterDueRecalls(
	records: readonly RecallDispensaryRecord[],
	referenceDate: Date | string = new Date(),
): RecallDispensaryRecord[] {
	const refIso = formatIsoDateOnly(referenceDate);
	return records.filter((r) => {
		if (r.status === "COMPLETED" || r.status === "CANCELLED") return false;
		return r.dueDate <= refIso;
	});
}

export function filterUpcomingRecalls(
	records: readonly RecallDispensaryRecord[],
	referenceDate: Date | string = new Date(),
): RecallDispensaryRecord[] {
	return records.filter((r) => {
		if (r.status === "COMPLETED" || r.status === "CANCELLED") return false;
		const status = determineRecallStatus({
			dueDate: r.dueDate,
			referenceDate,
			manualStatus: r.status,
		});
		return status === "UPCOMING";
	});
}

export function filterOverdueRecalls(
	records: readonly RecallDispensaryRecord[],
	referenceDate: Date | string = new Date(),
): RecallDispensaryRecord[] {
	return records.filter((r) => {
		if (r.status === "COMPLETED" || r.status === "CANCELLED") return false;
		const days = calculateDaysOverdue(r.dueDate, referenceDate);
		return days > 30;
	});
}

export interface RecallCohortMetrics {
	readonly totalCount: number;
	readonly plannedCount: number;
	readonly upcomingCount: number;
	readonly dueNowCount: number;
	readonly overdueCount: number;
	readonly contactedCount: number;
	readonly bookedCount: number;
	readonly completedCount: number;
	readonly conversionRatePercent: number;
	readonly warrantyPreservationCount: number;
}

/**
 * Расчет сводных метрик эффективности диспансерного учета и возврата.
 */
export function calculateRecallCohortMetrics(
	records: readonly RecallDispensaryRecord[],
	referenceDate: Date | string = new Date(),
): RecallCohortMetrics {
	let plannedCount = 0;
	let upcomingCount = 0;
	let dueNowCount = 0;
	let overdueCount = 0;
	let contactedCount = 0;
	let bookedCount = 0;
	let completedCount = 0;
	let warrantyCount = 0;

	for (const r of records) {
		if (r.preservesWarranty) {
			warrantyCount++;
		}

		if (r.status === "COMPLETED") {
			completedCount++;
			continue;
		}
		if (r.status === "BOOKED") {
			bookedCount++;
			continue;
		}
		if (r.status === "CONTACTED") {
			contactedCount++;
			continue;
		}

		const resolved = determineRecallStatus({
			dueDate: r.dueDate,
			referenceDate,
			manualStatus: r.status,
		});

		switch (resolved) {
			case "PLANNED":
				plannedCount++;
				break;
			case "UPCOMING":
				upcomingCount++;
				break;
			case "DUE_NOW":
				dueNowCount++;
				break;
			case "OVERDUE":
				overdueCount++;
				break;
		}
	}

	const totalCount = records.length;
	const retainedCount = bookedCount + completedCount;
	const conversionRatePercent =
		totalCount > 0 ? Math.round((retainedCount / totalCount) * 1000) / 10 : 0;

	return {
		totalCount,
		plannedCount,
		upcomingCount,
		dueNowCount,
		overdueCount,
		contactedCount,
		bookedCount,
		completedCount,
		conversionRatePercent,
		warrantyPreservationCount: warrantyCount,
	};
}

export {
	canTransitionRecallStatus as canTransitionDispensaryRecallStatus,
	filterDueRecalls as filterDueDispensaryRecalls,
};
