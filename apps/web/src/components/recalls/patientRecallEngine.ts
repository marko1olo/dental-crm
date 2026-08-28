/**
 * Clinical Patient Recalls & Hygiene Dispensary Engine (DOMAIN: RECALLS)
 *
 * Диспансерный учет, профилактические осмотры и когортный возврат пациентов.
 * Соответствует клиническим рекомендациям Стоматологической Ассоциации России (СтАР),
 * протоколам периодонтологии (EFP/AAP), этапам остеоинтеграции имплантатов и стандартам ортодонтии.
 */

export type RecallCycleType =
	| "standard_prophylaxis"
	| "periodontal_maintenance"
	| "implant_monitoring"
	| "orthodontic_braces"
	| "orthodontic_aligners"
	| "orthodontic_retention"
	| "pediatric_fluoridation"
	| "caries_high_risk"
	| "prosthetic_check";

export type RecallUrgencyStatus =
	| "upcoming"
	| "due_now"
	| "overdue_30"
	| "overdue_90"
	| "completed";

export type RecallContactStatus =
	| "due_now"
	| "invited"
	| "scheduled"
	| "completed"
	| "declined"
	| "pending"
	| "contacted";

export type RecallChannel = "whatsapp" | "telegram" | "sms" | "phone";

export interface RecallCycleDefinition {
	readonly id: RecallCycleType;
	readonly title: string;
	readonly shortTitle: string;
	readonly intervalUnit: "months" | "weeks" | "milestone_sequence";
	readonly defaultIntervalValue: number;
	readonly allowedIntervals: readonly number[];
	readonly clinicalRationale: string;
	readonly targetProcedures: readonly string[];
	readonly requiresRadiologyCheck: boolean;
	readonly preservesWarranty: boolean;
	readonly badgeColorToken: string;
	readonly estimatedAverageCheckRub: number;
}

/**
 * Каталог клинических циклов диспансерного наблюдения и профилактических вызовов.
 */
export const RECALL_CYCLE_CATALOG: Readonly<Record<RecallCycleType, RecallCycleDefinition>> = {
	standard_prophylaxis: {
		id: "standard_prophylaxis",
		title: "Плановый полугодовой осмотр и профессиональная гигиена",
		shortTitle: "Профгигиена 6 мес.",
		intervalUnit: "months",
		defaultIntervalValue: 6,
		allowedIntervals: [6, 12],
		clinicalRationale:
			"Золотой стандарт стоматологической профилактики. Снятие над- и поддесневых отложений (УЗ + Air-Flow), " +
			"онкоскрининг слизистой оболочки рта, диагностика скрытого кариеса и сохранение гарантийных обязательств.",
		targetProcedures: [
			"Комплексная профессиональная гигиена полости рта (УЗ-скейлинг + Air-Flow + полировка)",
			"Онкоскрининг слизистой оболочки полости рта (визуальный + люминесцентный АФС)",
			"Реминерализующая терапия и глубокое фторирование эмали",
			"Плановый фотопротокол и ревизия гарантийных обязательств",
		],
		requiresRadiologyCheck: false,
		preservesWarranty: true,
		badgeColorToken: "success",
		estimatedAverageCheckRub: 6500,
	},

	periodontal_maintenance: {
		id: "periodontal_maintenance",
		title: "Поддерживающая пародонтальная терапия (SPT / Пародонтит)",
		shortTitle: "Пародонтология 3-4 мес.",
		intervalUnit: "months",
		defaultIntervalValue: 3,
		allowedIntervals: [3, 4],
		clinicalRationale:
			"Хронический пародонтит, глубина ПК >= 4 мм, кровоточивость при зондировании (BOP > 15%). " +
			"Профилактика деструкции альвеолярной кости и рецидива воспаления каждые 3–4 месяца.",
		targetProcedures: [
			"Пародонтальное картирование (глубина карманов, рецессия, BOP, подвижность зубов)",
			"Ультразвуковой поддесневой скейлинг (Vector / EMS Piezon no-pain)",
			"Атравматичная обработка поддесневых карманов порошком эритритола",
			"Антисептическая инстилляция и наложение пародонтальной лечебной повязки",
		],
		requiresRadiologyCheck: true,
		preservesWarranty: true,
		badgeColorToken: "warning",
		estimatedAverageCheckRub: 8500,
	},

	implant_monitoring: {
		id: "implant_monitoring",
		title: "Диспансерный контроль остеоинтеграции и имплантатов",
		shortTitle: "Импланты (1, 3, 6, 12 мес.)",
		intervalUnit: "milestone_sequence",
		defaultIntervalValue: 3,
		allowedIntervals: [1, 3, 6, 12],
		clinicalRationale:
			"Контроль остеоинтеграции и маргинального уровня кости по протоколу СтАР/ITI: " +
			"через 1 месяц (ранняя нагрузка), 3 месяца (остеоинтеграция), 6 месяцев (адаптация окклюзии) и 12 месяцев (годовой аудит). " +
			"Профилактика мукозита и периимплантита.",
		targetProcedures: [
			"Прицельная рентгенография / КЛКТ области имплантатов (контроль краевой кости)",
			"Проверка окклюзионной стабильности и отсутствия суперконтактов (T-Scan / фольга 8мкм)",
			"Профессиональная гигиена супраструктур титановыми/полимерными кюретами",
			"Очистка абатментов порошком эритритола Air-Flow Perio",
		],
		requiresRadiologyCheck: true,
		preservesWarranty: true,
		badgeColorToken: "primary",
		estimatedAverageCheckRub: 9000,
	},

	orthodontic_braces: {
		id: "orthodontic_braces",
		title: "Ортодонтический контроль: плановая активация брекет-системы",
		shortTitle: "Брекеты (каждые 4 нед.)",
		intervalUnit: "weeks",
		defaultIntervalValue: 4,
		allowedIntervals: [3, 4, 5],
		clinicalRationale:
			"Плановая смена и активация ортодонтических дуг (NiTi / TMA / SS), замена лигатур, " +
			"контроль анкоража и гигиены вокруг брекетов строго каждые 4 недели (28 дней).",
		targetProcedures: [
			"Снятие лигатур и смена ортодонтических дуг",
			"Активация пружин, эластических цепочек (Power Chain) и межчелюстной тяги",
			"Очистка налета в зоне замков и брекетов",
			"Фотопротокол динамики перемещения зубных рядов",
		],
		requiresRadiologyCheck: false,
		preservesWarranty: true,
		badgeColorToken: "info",
		estimatedAverageCheckRub: 6000,
	},

	orthodontic_aligners: {
		id: "orthodontic_aligners",
		title: "Ортодонтический контроль: ревизия элайнеров и сепарация",
		shortTitle: "Элайнеры (каждые 6-8 нед.)",
		intervalUnit: "weeks",
		defaultIntervalValue: 6,
		allowedIntervals: [6, 8],
		clinicalRationale:
			"Контроль трекинга элайнеров, состояния аттачментов, проведение плановой интерпроксимальной редукции (IPR/сепарации) " +
			"и выдача следующего сета капп каждые 6–8 недель (42–56 дней).",
		targetProcedures: [
			"Оценка точности прилегания текущего сета элайнеров (трекинг зубов)",
			"Проверка целостности композитных аттачментов",
			"Интерпроксимальная сепарация эмали по сетапу",
			"Выдача следующего комплекта элайнеров",
		],
		requiresRadiologyCheck: false,
		preservesWarranty: true,
		badgeColorToken: "accent",
		estimatedAverageCheckRub: 7500,
	},

	orthodontic_retention: {
		id: "orthodontic_retention",
		title: "Ортодонтический ретенционный контроль",
		shortTitle: "Ретенция (1, 3, 6, 12 мес.)",
		intervalUnit: "months",
		defaultIntervalValue: 3,
		allowedIntervals: [1, 3, 6, 12],
		clinicalRationale:
			"Ретенционный период после снятия брекетов / элайнеров. " +
			"Контроль фиксации несъемных проволочных ретейнеров, прилегания ретенционных капп и стабильности окклюзии.",
		targetProcedures: [
			"Осмотр целостности композитной фиксации ретейнера (фронтальный отдел 13-23, 33-43)",
			"Оценка стабильности окклюзионных контактов и смыкания",
			"Контроль адаптации ретенционной ночной каппы",
			"Удаление зубных отложений в зоне ретейнера",
		],
		requiresRadiologyCheck: false,
		preservesWarranty: true,
		badgeColorToken: "info",
		estimatedAverageCheckRub: 4500,
	},

	pediatric_fluoridation: {
		id: "pediatric_fluoridation",
		title: "Детская профилактика, герметизация фиссур и минерализация",
		shortTitle: "Детская (3-6 мес.)",
		intervalUnit: "months",
		defaultIntervalValue: 3,
		allowedIntervals: [3, 6],
		clinicalRationale:
			"Несозревшая эмаль временных и постоянных зубов у детей требует 3-месячного цикла реминерализации. " +
			"Контроль герметизации фиссур прорезавшихся моляров и формирование устойчивого навыка чистки зубов.",
		targetProcedures: [
			"Окрашивание налета индикатором зубных отложений (Curaprox / Miradent)",
			"Урок гигиены в игровой форме с подбором детской пасты и щетки",
			"Атравматичная чистка мягким глициновым порошком",
			"Герметизация фиссур постоянных моляров (Clinpro Sealant / Fissurit)",
			"Аппликация фторлака / реминерализующего геля (Tooth Mousse / Clinpro White Varnish)",
		],
		requiresRadiologyCheck: false,
		preservesWarranty: true,
		badgeColorToken: "accent",
		estimatedAverageCheckRub: 4200,
	},

	caries_high_risk: {
		id: "caries_high_risk",
		title: "Высокий кариесогенный риск (множественный кариес / КПУ > 12)",
		shortTitle: "Кариес-контроль (3 мес.)",
		intervalUnit: "months",
		defaultIntervalValue: 3,
		allowedIntervals: [2, 3, 4],
		clinicalRationale:
			"Декомпенсированная форма кариеса, активные очаги деминерализации, КПУ > 12. " +
			"Требуется 3-месячный цикл минерализации эмали, контроль гигиены и ревизия краевого прилегания реставраций.",
		targetProcedures: [
			"Осмотр и индексная оценка гигиены (OHI-S, КПИ)",
			"Глубокое фторирование эмали и ремотерапия (Bifluorid 12 / Clinpro)",
			"Атравматичная чистка Air-Flow порошком на основе глицина/эритритола",
			"Контроль краевого прилегания композитных пломб микрозондом",
		],
		requiresRadiologyCheck: false,
		preservesWarranty: true,
		badgeColorToken: "danger",
		estimatedAverageCheckRub: 5500,
	},

	prosthetic_check: {
		id: "prosthetic_check",
		title: "Контрольный осмотр ортопедических конструкций (коронки, мосты, виниры)",
		shortTitle: "Ортопедия (6-12 мес.)",
		intervalUnit: "months",
		defaultIntervalValue: 6,
		allowedIntervals: [6, 12],
		clinicalRationale:
			"Контроль окклюзии, краевого прилегания керамических реставраций, состояния цементной фиксации и десневого края вокруг коронок.",
		targetProcedures: [
			"Окклюзионный анализ и пришлифовка суперконтактов",
			"Ревизия пришеечного краевого прилегания виниров и коронок",
			"Профессиональная полировка керамики алмазными пастами",
			"Пролонгация гарантийных обязательств клиники",
		],
		requiresRadiologyCheck: true,
		preservesWarranty: true,
		badgeColorToken: "primary",
		estimatedAverageCheckRub: 6000,
	},
};

/**
 * Интерфейс карточки диспансерного пациента.
 */
export interface PatientRecallRecord {
	readonly id: string;
	readonly patientId: string;
	readonly fullName: string;
	readonly phone: string | null;
	readonly email?: string | null | undefined;
	readonly birthDate?: string | null | undefined;
	readonly age?: number | undefined;
	readonly cycleType: RecallCycleType;
	readonly customIntervalValue?: number | undefined;
	readonly lastVisitDate: string; // ISO YYYY-MM-DD
	readonly dueDate: string; // ISO YYYY-MM-DD
	readonly daysOverdue: number; // >0 = просрочено, <0 = осталось дней
	readonly urgencyStatus: RecallUrgencyStatus;
	readonly status: RecallContactStatus;
	readonly attendingDoctorId?: string | undefined;
	readonly attendingDoctorName?: string | undefined;
	readonly implantSurgeryDate?: string | undefined;
	readonly implantMilestoneMonth?: number | undefined; // 1, 3, 6, 12
	readonly orthoDeviceType?: ("braces" | "aligners" | "retainer") | undefined;
	readonly periodontalPocketMaxMm?: number | undefined;
	readonly decayedTeethCount?: number | undefined;
	readonly lastProcedures?: readonly string[] | undefined;
	readonly clinicalNotes?: string | undefined;
	readonly lastContactedAt?: string | undefined;
	readonly lastContactChannel?: RecallChannel | undefined;
	readonly scheduledAppointmentId?: string | undefined;
	readonly scheduledDate?: string | undefined;
	readonly historicalRevenueRub?: number | undefined; // LTV накопительный
	readonly visitsCount?: number | undefined;
}

// Алиас для обратной совместимости
export type PatientRecallCandidate = PatientRecallRecord;

export interface RecallTemplateVariables {
	readonly patientFirstName: string;
	readonly patientFullName: string;
	readonly doctorName: string;
	readonly clinicName: string;
	readonly serviceName: string;
	readonly lastVisitDateFormatted: string;
	readonly dueDateFormatted: string;
	readonly intervalDescription: string;
	readonly bookingUrl: string;
	readonly phone: string;
}

export interface RecallMetrics {
	readonly totalCandidates: number;
	readonly upcomingCount: number;
	readonly dueNowCount: number;
	readonly overdue30Count: number;
	readonly overdue90Count: number;
	readonly completedCount: number;
	readonly contactedCount: number;
	readonly scheduledCount: number;
	readonly declinedCount: number;
	readonly conversionRatePercent: number;
	readonly contactResponseRatePercent: number;
	readonly retentionRatePercent: number;
	readonly totalHistoricalLtvRub: number;
	readonly averageRecallLtvRub: number;
	readonly byCycle: Readonly<Record<RecallCycleType, number>>;
	readonly overdueEstimatedLostRevenueRub: number;
	readonly retainedRevenueRub: number;
}

export interface CohortRetentionGroup {
	readonly cohortKey: string; // "2026-Q1" | "2026-05"
	readonly cohortLabel: string;
	readonly totalPatients: number;
	readonly dueCount: number;
	readonly contactedCount: number;
	readonly scheduledCount: number;
	readonly completedCount: number;
	readonly declinedCount: number;
	readonly retentionRatePercent: number;
	readonly conversionRatePercent: number;
	readonly averageLtvRub: number;
	readonly totalRevenueRub: number;
	readonly estimatedLostRevenueRub: number;
}

export interface CohortRetentionReport {
	readonly cohorts: readonly CohortRetentionGroup[];
	readonly overallRetentionRatePercent: number;
	readonly overallConversionRatePercent: number;
	readonly overallAverageLtvRub: number;
	readonly totalRecallRevenueRub: number;
	readonly totalLostRevenueRub: number;
}

export interface RecallFilterOptions {
	readonly status?: (RecallContactStatus | "all") | undefined;
	readonly urgencyStatus?: (RecallUrgencyStatus | "all") | undefined;
	readonly cycleType?: (RecallCycleType | "all") | undefined;
	readonly doctorId?: (string | "all") | undefined;
	readonly searchQuery?: string | undefined;
	readonly sortBy?: ("daysOverdue" | "dueDate" | "fullName" | "lastVisitDate" | "ltv") | undefined;
	readonly sortDirection?: ("asc" | "desc") | undefined;
}

/* ==========================================================================
   1. БЕЗОПАСНАЯ КАЛЕНДАРНАЯ МАТЕМАТИКА И РАСЧЕТ ИНТЕРВАЛОВ
   ========================================================================== */

export function addCalendarMonthsSafe(fromDate: Date | string, months: number): Date {
	const parsed = typeof fromDate === "string" ? new Date(fromDate) : new Date(fromDate.getTime());
	if (Number.isNaN(parsed.getTime())) {
		return new Date();
	}

	const originalDay = parsed.getDate();
	parsed.setDate(1);
	parsed.setMonth(parsed.getMonth() + months);

	const daysInTargetMonth = new Date(
		parsed.getFullYear(),
		parsed.getMonth() + 1,
		0,
	).getDate();

	parsed.setDate(Math.min(originalDay, daysInTargetMonth));
	return parsed;
}

export function addWeeksSafe(fromDate: Date | string, weeks: number): Date {
	const parsed = typeof fromDate === "string" ? new Date(fromDate) : new Date(fromDate.getTime());
	if (Number.isNaN(parsed.getTime())) {
		return new Date();
	}
	parsed.setDate(parsed.getDate() + weeks * 7);
	return parsed;
}

export function addDaysSafe(fromDate: Date | string, days: number): Date {
	const parsed = typeof fromDate === "string" ? new Date(fromDate) : new Date(fromDate.getTime());
	if (Number.isNaN(parsed.getTime())) {
		return new Date();
	}
	parsed.setDate(parsed.getDate() + days);
	return parsed;
}

export function formatIsoDateOnly(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function calculateDaysOverdue(
	dueDate: Date | string,
	referenceDate: Date | string = new Date(),
): number {
	const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
	const ref = typeof referenceDate === "string" ? new Date(referenceDate) : referenceDate;

	const dueUtc = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
	const refUtc = Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate());

	const diffMs = refUtc - dueUtc;
	return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function resolveUrgencyStatus(
	dueDate: Date | string,
	referenceDate: Date | string = new Date(),
	isCompleted = false,
): RecallUrgencyStatus {
	if (isCompleted) {
		return "completed";
	}

	const days = calculateDaysOverdue(dueDate, referenceDate);

	if (days < 0) {
		return "upcoming";
	}
	if (days <= 29) {
		return "due_now";
	}
	if (days <= 89) {
		return "overdue_30";
	}
	return "overdue_90";
}

/* ==========================================================================
   2. СПЕЦИАЛИЗИРОВАННЫЕ КЛИНИЧЕСКИЕ КАЛЬКУЛЯТОРЫ ИНТЕРВАЛОВ
   ========================================================================== */

export function calculateHygieneRecallDate(
	lastVisitDate: Date | string,
	isPeriodontalRisk = false,
	customMonths?: number | undefined,
): { nextDueDate: Date; formattedDueDate: string; intervalMonths: number; cycleType: RecallCycleType } {
	const cycleType: RecallCycleType = isPeriodontalRisk ? "periodontal_maintenance" : "standard_prophylaxis";
	const defaultInterval = isPeriodontalRisk ? 3 : 6;
	const intervalMonths = customMonths && customMonths > 0 ? customMonths : defaultInterval;
	const nextDueDate = addCalendarMonthsSafe(lastVisitDate, intervalMonths);
	return {
		nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate),
		intervalMonths,
		cycleType,
	};
}

export function calculateImplantRecallMilestones(
	surgeryDate: Date | string,
	referenceDate: Date | string = new Date(),
): {
	milestones: readonly {
		month: number;
		dueDate: Date;
		formattedDueDate: string;
		isPassed: boolean;
		isCurrent: boolean;
	}[];
	nextMilestoneMonth: number;
	nextDueDate: Date;
	formattedNextDueDate: string;
} {
	const milestoneMonths = [1, 3, 6, 12] as const;
	const ref = typeof referenceDate === "string" ? new Date(referenceDate) : referenceDate;
	const refIso = formatIsoDateOnly(ref);

	let foundNext = false;
	let nextMilestoneMonth = 12;
	let nextDueDate = addCalendarMonthsSafe(surgeryDate, 12);

	const milestones = milestoneMonths.map((m) => {
		const dueDate = addCalendarMonthsSafe(surgeryDate, m);
		const formatted = formatIsoDateOnly(dueDate);
		const isPassed = formatted < refIso;
		let isCurrent = false;

		if (!isPassed && !foundNext) {
			foundNext = true;
			nextMilestoneMonth = m;
			nextDueDate = dueDate;
			isCurrent = true;
		}

		return {
			month: m,
			dueDate,
			formattedDueDate: formatted,
			isPassed,
			isCurrent,
		};
	});

	if (!foundNext) {
		const annualDue = addCalendarMonthsSafe(surgeryDate, 24);
		nextMilestoneMonth = 24;
		nextDueDate = annualDue;
	}

	return {
		milestones,
		nextMilestoneMonth,
		nextDueDate,
		formattedNextDueDate: formatIsoDateOnly(nextDueDate),
	};
}

export function calculateOrthoRecallDate(
	lastAdjustmentDate: Date | string,
	deviceType: "braces" | "aligners" | "retainer",
	customWeeksOrMonths?: number | undefined,
): {
	nextDueDate: Date;
	formattedDueDate: string;
	intervalDescription: string;
	cycleType: RecallCycleType;
} {
	if (deviceType === "braces") {
		const weeks = customWeeksOrMonths && customWeeksOrMonths > 0 ? customWeeksOrMonths : 4;
		const nextDueDate = addWeeksSafe(lastAdjustmentDate, weeks);
		return {
			nextDueDate,
			formattedDueDate: formatIsoDateOnly(nextDueDate),
			intervalDescription: `${weeks} нед. (${weeks * 7} дн.)`,
			cycleType: "orthodontic_braces",
		};
	}

	if (deviceType === "aligners") {
		const weeks = customWeeksOrMonths && customWeeksOrMonths > 0 ? customWeeksOrMonths : 6;
		const nextDueDate = addWeeksSafe(lastAdjustmentDate, weeks);
		return {
			nextDueDate,
			formattedDueDate: formatIsoDateOnly(nextDueDate),
			intervalDescription: `${weeks} нед. (${weeks * 7} дн.)`,
			cycleType: "orthodontic_aligners",
		};
	}

	const months = customWeeksOrMonths && customWeeksOrMonths > 0 ? customWeeksOrMonths : 3;
	const nextDueDate = addCalendarMonthsSafe(lastAdjustmentDate, months);
	return {
		nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate),
		intervalDescription: `${months} мес.`,
		cycleType: "orthodontic_retention",
	};
}

export function calculatePediatricRecallDate(
	lastVisitDate: Date | string,
	isHighRisk = true,
	customMonths?: number | undefined,
): { nextDueDate: Date; formattedDueDate: string; intervalMonths: number; cycleType: RecallCycleType } {
	const defaultInterval = isHighRisk ? 3 : 6;
	const intervalMonths = customMonths && customMonths > 0 ? customMonths : defaultInterval;
	const nextDueDate = addCalendarMonthsSafe(lastVisitDate, intervalMonths);
	return {
		nextDueDate,
		formattedDueDate: formatIsoDateOnly(nextDueDate),
		intervalMonths,
		cycleType: "pediatric_fluoridation",
	};
}

export function calculateRecallProfile(params: {
	readonly lastVisitDate: Date | string;
	readonly cycleType: RecallCycleType;
	readonly customIntervalValue?: number | undefined;
	readonly referenceDate?: (Date | string) | undefined;
	readonly isCompleted?: boolean | undefined;
	readonly implantSurgeryDate?: (Date | string) | undefined;
}): {
	readonly dueDate: Date;
	readonly formattedDueDate: string;
	readonly daysOverdue: number;
	readonly urgencyStatus: RecallUrgencyStatus;
	readonly intervalDescription: string;
} {
	const refDate = params.referenceDate ?? new Date();
	const cycleDef = RECALL_CYCLE_CATALOG[params.cycleType];

	let dueDate: Date;
	let intervalDescription: string;

	if (params.cycleType === "orthodontic_braces") {
		const weeks = params.customIntervalValue && params.customIntervalValue > 0 ? params.customIntervalValue : 4;
		dueDate = addWeeksSafe(params.lastVisitDate, weeks);
		intervalDescription = `${weeks} нед.`;
	} else if (params.cycleType === "orthodontic_aligners") {
		const weeks = params.customIntervalValue && params.customIntervalValue > 0 ? params.customIntervalValue : 6;
		dueDate = addWeeksSafe(params.lastVisitDate, weeks);
		intervalDescription = `${weeks} нед.`;
	} else if (params.cycleType === "implant_monitoring" && params.implantSurgeryDate) {
		const implantCalc = calculateImplantRecallMilestones(params.implantSurgeryDate, refDate);
		dueDate = implantCalc.nextDueDate;
		intervalDescription = `${implantCalc.nextMilestoneMonth} мес. с операции`;
	} else {
		const months =
			params.customIntervalValue && params.customIntervalValue > 0
				? params.customIntervalValue
				: (cycleDef?.defaultIntervalValue ?? 6);
		dueDate = addCalendarMonthsSafe(params.lastVisitDate, months);
		intervalDescription = `${months} мес.`;
	}

	const formattedDueDate = formatIsoDateOnly(dueDate);
	const daysOverdue = calculateDaysOverdue(dueDate, refDate);
	const urgencyStatus = resolveUrgencyStatus(dueDate, refDate, params.isCompleted);

	return {
		dueDate,
		formattedDueDate,
		daysOverdue,
		urgencyStatus,
		intervalDescription,
	};
}

export function evaluateClinicalCycleSuggestion(clinicalData: {
	readonly maxPocketDepthMm?: number | undefined;
	readonly hasBleedingOnProbing?: boolean | undefined;
	readonly hasImplants?: boolean | undefined;
	readonly monthsSinceImplantSurgery?: number | undefined;
	readonly hasBraces?: boolean | undefined;
	readonly hasAligners?: boolean | undefined;
	readonly hasActiveRetention?: boolean | undefined;
	readonly isChildUnder14?: boolean | undefined;
	readonly hasDeepCaries?: boolean | undefined;
	readonly decayedTeethCount?: number | undefined;
	readonly hasCrownsOrVeneers?: boolean | undefined;
}): {
	readonly suggestedCycle: RecallCycleType;
	readonly reason: string;
	readonly recommendedIntervalValue: number;
	readonly intervalUnit: "months" | "weeks";
} {
	if (
		(clinicalData.maxPocketDepthMm && clinicalData.maxPocketDepthMm >= 4) ||
		clinicalData.hasBleedingOnProbing
	) {
		return {
			suggestedCycle: "periodontal_maintenance",
			reason: `Пародонтит: глубина ПК ${clinicalData.maxPocketDepthMm ?? 4} мм, кровоточивость BOP. Поддерживающая терапия раз в 3–4 месяца.`,
			recommendedIntervalValue: 3,
			intervalUnit: "months",
		};
	}

	if (clinicalData.hasImplants) {
		return {
			suggestedCycle: "implant_monitoring",
			reason: "Контроль остеоинтеграции и краевой кости имплантатов по этапам 1, 3, 6, 12 месяцев.",
			recommendedIntervalValue: (clinicalData.monthsSinceImplantSurgery ?? 6) <= 6 ? 3 : 6,
			intervalUnit: "months",
		};
	}

	if (clinicalData.hasBraces) {
		return {
			suggestedCycle: "orthodontic_braces",
			reason: "Брекет-система: плановая смена дуг и активация каждые 4 недели (28 дней).",
			recommendedIntervalValue: 4,
			intervalUnit: "weeks",
		};
	}

	if (clinicalData.hasAligners) {
		return {
			suggestedCycle: "orthodontic_aligners",
			reason: "Лечение на элайнерах: ревизия трекинга и выдача капп каждые 6–8 недель.",
			recommendedIntervalValue: 6,
			intervalUnit: "weeks",
		};
	}

	if (clinicalData.hasActiveRetention) {
		return {
			suggestedCycle: "orthodontic_retention",
			reason: "Ретенционный контроль: проверка проволочных ретейнеров и капп раз в 3 месяца.",
			recommendedIntervalValue: 3,
			intervalUnit: "months",
		};
	}

	if (clinicalData.isChildUnder14) {
		return {
			suggestedCycle: "pediatric_fluoridation",
			reason: "Детский возраст (<14 лет): фторирование эмали и герметизация фиссур каждые 3–6 месяцев.",
			recommendedIntervalValue: 3,
			intervalUnit: "months",
		};
	}

	if (clinicalData.hasDeepCaries || (clinicalData.decayedTeethCount ?? 0) >= 3) {
		return {
			suggestedCycle: "caries_high_risk",
			reason: `Высокий КПУ (${clinicalData.decayedTeethCount ?? "множественный"}). Ремотерапия и ревизия пломб каждые 3 месяца.`,
			recommendedIntervalValue: 3,
			intervalUnit: "months",
		};
	}

	if (clinicalData.hasCrownsOrVeneers) {
		return {
			suggestedCycle: "prosthetic_check",
			reason: "Контроль окклюзии и краевого прилегания коронок/виниров каждые 6 месяцев.",
			recommendedIntervalValue: 6,
			intervalUnit: "months",
		};
	}

	return {
		suggestedCycle: "standard_prophylaxis",
		reason: "Плановая диспансеризация: комплексная гигиена и онкоскрининг каждые 6 месяцев.",
		recommendedIntervalValue: 6,
		intervalUnit: "months",
	};
}

/* ==========================================================================
   3. ГЕНЕРАТОР ПЕРСОНАЛИЗИРОВАННЫХ СООБЩЕНИЙ (WHATSAPP / TELEGRAM / SMS)
   ========================================================================== */

export function extractFirstName(fullName: string): string {
	const trimmed = fullName.trim();
	if (!trimmed) return "Пациент";
	const parts = trimmed.split(/\s+/);
	if (parts.length >= 2 && parts[1]) {
		return parts[1];
	}
	return parts[0] || "Пациент";
}

export function sanitizePhoneNumber(phone: string | null | undefined): string {
	if (!phone) return "";
	const digits = phone.replace(/\D/g, "");
	if (digits.startsWith("8") && digits.length === 11) {
		return `7${digits.slice(1)}`;
	}
	return digits;
}

export function generate1ClickBookingLink(options: {
	readonly baseUrl?: string | undefined;
	readonly patientId: string;
	readonly doctorId?: string | undefined;
	readonly cycleType?: RecallCycleType | undefined;
	readonly source?: string | undefined;
	readonly campaign?: string | undefined;
}): string {
	const base = options.baseUrl ? options.baseUrl.replace(/\/+$/, "") : "";
	const path = `${base}/booking`;
	const params = new URLSearchParams();

	params.set("patient_id", options.patientId);
	if (options.doctorId) {
		params.set("doctor_id", options.doctorId);
	}
	if (options.cycleType) {
		params.set("recall_cycle", options.cycleType);
	}
	params.set("source", options.source ?? "recall_engine");
	params.set("utm_campaign", options.campaign ?? `recall_${options.cycleType ?? "general"}`);

	return `${path}?${params.toString()}`;
}

export function buildWhatsAppUrl(phone: string | null | undefined, text: string): string {
	const cleanPhone = sanitizePhoneNumber(phone);
	const encodedText = encodeURIComponent(text);
	return cleanPhone
		? `https://wa.me/${cleanPhone}?text=${encodedText}`
		: `https://wa.me/?text=${encodedText}`;
}

export function buildTelegramUrl(phoneOrUsername: string | null | undefined, text: string): string {
	const encodedText = encodeURIComponent(text);
	if (!phoneOrUsername) {
		return `https://t.me/share/url?url=&text=${encodedText}`;
	}
	const clean = phoneOrUsername.trim().replace(/^@/, "");
	if (/^\+?\d+$/.test(clean)) {
		return `https://t.me/+${sanitizePhoneNumber(clean)}?text=${encodedText}`;
	}
	return `https://t.me/${clean}?text=${encodedText}`;
}

export function interpolateRecallTemplate(
	template: string,
	variables: RecallTemplateVariables,
): string {
	return template
		.replace(/\{\{PATIENT_FIRST_NAME\}\}/g, variables.patientFirstName)
		.replace(/\{\{PATIENT_FULL_NAME\}\}/g, variables.patientFullName)
		.replace(/\{\{DOCTOR_NAME\}\}/g, variables.doctorName)
		.replace(/\{\{CLINIC_NAME\}\}/g, variables.clinicName)
		.replace(/\{\{SERVICE_NAME\}\}/g, variables.serviceName)
		.replace(/\{\{LAST_VISIT_DATE\}\}/g, variables.lastVisitDateFormatted)
		.replace(/\{\{DUE_DATE\}\}/g, variables.dueDateFormatted)
		.replace(/\{\{INTERVAL_DESC\}\}/g, variables.intervalDescription)
		.replace(/\{\{BOOKING_URL\}\}/g, variables.bookingUrl)
		.replace(/\{\{PHONE\}\}/g, variables.phone);
}

const WHATSAPP_TEMPLATES: Record<RecallCycleType, string> = {
	standard_prophylaxis:
		"Здравствуйте, {{PATIENT_FIRST_NAME}}! " +
		"Стоматология «{{CLINIC_NAME}}». Ваш лечащий доктор {{DOCTOR_NAME}} напоминает: " +
		"прошло 6 месяцев с Вашего прошлого визита ({{LAST_VISIT_DATE}}). " +
		"Подошел срок плановой профгигиены Air-Flow и осмотра для сохранения здоровья зубов и гарантии.\n\n" +
		"✨ Записаться онлайн в 1 клик:\n{{BOOKING_URL}}\n\n" +
		"Или просто ответьте на это сообщение, и мы подберем удобный слот!",

	periodontal_maintenance:
		"Добрый день, {{PATIENT_FIRST_NAME}}! " +
		"Клиника «{{CLINIC_NAME}}». Доктор {{DOCTOR_NAME}} напоминает: " +
		"прошло {{INTERVAL_DESC}} с курса пародонтального лечения (визит {{LAST_VISIT_DATE}}). " +
		"Чтобы закрепить ремиссию и не допустить воспаления десен, важно провести поддерживающую гигиену.\n\n" +
		"🌿 Запись на прием:\n{{BOOKING_URL}}",

	implant_monitoring:
		"Здравствуйте, {{PATIENT_FIRST_NAME}}! " +
		"«{{CLINIC_NAME}}» заботится о Вашей улыбке. " +
		"Подошел срок контрольного рентген-осмотра имплантатов у доктора {{DOCTOR_NAME}} (прошлый визит {{LAST_VISIT_DATE}}). " +
		"Это необходимо для контроля остеоинтеграции и сохранения гарантийного сертификата.\n\n" +
		"🦷 Записаться к доктору:\n{{BOOKING_URL}}",

	orthodontic_braces:
		"Здравствуйте, {{PATIENT_FIRST_NAME}}! " +
		"Клиника «{{CLINIC_NAME}}». Ваш ортодонт {{DOCTOR_NAME}} ждет Вас на плановую активацию брекет-системы и смену дуг. " +
		"Прошло 4 недели с прошлой коррекции ({{LAST_VISIT_DATE}}).\n\n" +
		"📅 Выбрать слот онлайн:\n{{BOOKING_URL}}",

	orthodontic_aligners:
		"Здравствуйте, {{PATIENT_FIRST_NAME}}! " +
		"Клиника «{{CLINIC_NAME}}». Подошел срок ревизии элайнеров у доктора {{DOCTOR_NAME}} (прошло {{INTERVAL_DESC}}). " +
		"Доктор оценит трекинг зубов и выдаст следующий комплект капп.\n\n" +
		"✨ Онлайн-запись:\n{{BOOKING_URL}}",

	orthodontic_retention:
		"Здравствуйте, {{PATIENT_FIRST_NAME}}! " +
		"Клиника «{{CLINIC_NAME}}». Доктор {{DOCTOR_NAME}} приглашает на ретенционный контроль (проверка ретейнеров и капп после визита {{LAST_VISIT_DATE}}).\n\n" +
		"✨ Записаться онлайн:\n{{BOOKING_URL}}",

	pediatric_fluoridation:
		"Здравствуйте! Детская стоматология «{{CLINIC_NAME}}». " +
		"Прошло {{INTERVAL_DESC}} с последнего осмотра {{PATIENT_FIRST_NAME}} ({{LAST_VISIT_DATE}}). " +
		"Детский доктор {{DOCTOR_NAME}} приглашает на минерализацию эмали и урок гигиены!\n\n" +
		"🎈 Запись к детскому доктору:\n{{BOOKING_URL}}",

	caries_high_risk:
		"Здравствуйте, {{PATIENT_FIRST_NAME}}! " +
		"Стоматология «{{CLINIC_NAME}}». Прошло 3 месяца с лечения кариеса у доктора {{DOCTOR_NAME}} ({{LAST_VISIT_DATE}}). " +
		"Для защиты эмали и контроля краевого прилегания пломб рекомендована плановая ремотерапия.\n\n" +
		"📅 Онлайн-запись:\n{{BOOKING_URL}}",

	prosthetic_check:
		"Здравствуйте, {{PATIENT_FIRST_NAME}}! " +
		"«{{CLINIC_NAME}}». Подошел срок контрольного осмотра ортопедических конструкций у доктора {{DOCTOR_NAME}} для пролонгации гарантии.\n\n" +
		"🦷 Записаться:\n{{BOOKING_URL}}",
};

const SMS_TEMPLATES: Record<RecallCycleType, string> = {
	standard_prophylaxis:
		"{{PATIENT_FIRST_NAME}}, прошло 6 мес с визита в {{CLINIC_NAME}}. Пора на профгигиену для сохранения гарантии: {{BOOKING_URL}}",
	periodontal_maintenance:
		"{{PATIENT_FIRST_NAME}}, подошел срок пародонтологического контроля в {{CLINIC_NAME}} у доктора {{DOCTOR_NAME}}: {{BOOKING_URL}}",
	implant_monitoring:
		"{{PATIENT_FIRST_NAME}}, плановый рентген-контроль имплантов в {{CLINIC_NAME}} (д-р {{DOCTOR_NAME}}). Запись: {{BOOKING_URL}}",
	orthodontic_braces:
		"{{PATIENT_FIRST_NAME}}, плановая активация брекетов в {{CLINIC_NAME}} (д-р {{DOCTOR_NAME}}). Запись: {{BOOKING_URL}}",
	orthodontic_aligners:
		"{{PATIENT_FIRST_NAME}}, ревизия элайнеров и выдача капп в {{CLINIC_NAME}}. Запись: {{BOOKING_URL}}",
	orthodontic_retention:
		"{{PATIENT_FIRST_NAME}}, контроль ретейнеров в {{CLINIC_NAME}} (д-р {{DOCTOR_NAME}}): {{BOOKING_URL}}",
	pediatric_fluoridation:
		"Осмотр и фторирование зубов для {{PATIENT_FIRST_NAME}} в {{CLINIC_NAME}} (д-р {{DOCTOR_NAME}}): {{BOOKING_URL}}",
	caries_high_risk:
		"{{PATIENT_FIRST_NAME}}, плановый осмотр и ремотерапия эмали в {{CLINIC_NAME}}: {{BOOKING_URL}}",
	prosthetic_check:
		"{{PATIENT_FIRST_NAME}}, гарантийный осмотр коронок в {{CLINIC_NAME}}: {{BOOKING_URL}}",
};

export function generateWhatsAppRecallMessage(
	candidate: PatientRecallRecord,
	options: { readonly clinicName?: string | undefined; readonly baseUrl?: string | undefined } = {},
): string {
	const clinicName = options.clinicName || "Стоматология ДЕНТЕ";
	const doctorName = candidate.attendingDoctorName || "Ваш лечащий врач";
	const firstName = extractFirstName(candidate.fullName);
	const cycleDef = RECALL_CYCLE_CATALOG[candidate.cycleType] || RECALL_CYCLE_CATALOG.standard_prophylaxis;

	const bookingUrl = generate1ClickBookingLink({
		baseUrl: options.baseUrl,
		patientId: candidate.patientId,
		doctorId: candidate.attendingDoctorId,
		cycleType: candidate.cycleType,
		source: "whatsapp",
		campaign: `recall_${candidate.cycleType}`,
	});

	const template = WHATSAPP_TEMPLATES[candidate.cycleType] || WHATSAPP_TEMPLATES.standard_prophylaxis;

	const intervalDescription =
		cycleDef.intervalUnit === "weeks"
			? `${cycleDef.defaultIntervalValue} нед.`
			: `${cycleDef.defaultIntervalValue} мес.`;

	const vars: RecallTemplateVariables = {
		patientFirstName: firstName,
		patientFullName: candidate.fullName,
		doctorName,
		clinicName,
		serviceName: cycleDef.title,
		lastVisitDateFormatted: candidate.lastVisitDate,
		dueDateFormatted: candidate.dueDate,
		intervalDescription,
		bookingUrl,
		phone: candidate.phone || "",
	};

	return interpolateRecallTemplate(template, vars);
}

export function generateTelegramRecallMessage(
	candidate: PatientRecallRecord,
	options: { readonly clinicName?: string | undefined; readonly baseUrl?: string | undefined } = {},
): string {
	return generateWhatsAppRecallMessage(candidate, options);
}

export function generateSmsRecallMessage(
	candidate: PatientRecallRecord,
	options: { readonly clinicName?: string | undefined; readonly baseUrl?: string | undefined } = {},
): string {
	const clinicName = options.clinicName || "DENTE";
	const doctorName = candidate.attendingDoctorName || "Врач";
	const firstName = extractFirstName(candidate.fullName);
	const cycleDef = RECALL_CYCLE_CATALOG[candidate.cycleType] || RECALL_CYCLE_CATALOG.standard_prophylaxis;

	const bookingUrl = generate1ClickBookingLink({
		baseUrl: options.baseUrl,
		patientId: candidate.patientId,
		doctorId: candidate.attendingDoctorId,
		cycleType: candidate.cycleType,
		source: "sms",
		campaign: `recall_sms_${candidate.cycleType}`,
	});

	const template = SMS_TEMPLATES[candidate.cycleType] || SMS_TEMPLATES.standard_prophylaxis;

	const intervalDescription =
		cycleDef.intervalUnit === "weeks"
			? `${cycleDef.defaultIntervalValue} нед.`
			: `${cycleDef.defaultIntervalValue} мес.`;

	const vars: RecallTemplateVariables = {
		patientFirstName: firstName,
		patientFullName: candidate.fullName,
		doctorName,
		clinicName,
		serviceName: cycleDef.shortTitle,
		lastVisitDateFormatted: candidate.lastVisitDate,
		dueDateFormatted: candidate.dueDate,
		intervalDescription,
		bookingUrl,
		phone: candidate.phone || "",
	};

	return interpolateRecallTemplate(template, vars);
}

/* ==========================================================================
   4. РАСЧЕТ КОГОРТ ВОЗВРАЩАЕМОСТИ (RETENTION RATE & LTV METRICS)
   ========================================================================== */

export function calculateRecallMetrics(
	candidates: readonly PatientRecallRecord[],
	estimatedHygieneRevenueRub = 6500,
): RecallMetrics {
	let upcomingCount = 0;
	let dueNowCount = 0;
	let overdue30Count = 0;
	let overdue90Count = 0;
	let completedCount = 0;
	let contactedCount = 0;
	let scheduledCount = 0;
	let declinedCount = 0;
	let totalHistoricalLtvRub = 0;

	const byCycle: Record<RecallCycleType, number> = {
		standard_prophylaxis: 0,
		periodontal_maintenance: 0,
		implant_monitoring: 0,
		orthodontic_braces: 0,
		orthodontic_aligners: 0,
		orthodontic_retention: 0,
		pediatric_fluoridation: 0,
		caries_high_risk: 0,
		prosthetic_check: 0,
	};

	for (const candidate of candidates) {
		if (byCycle[candidate.cycleType] !== undefined) {
			byCycle[candidate.cycleType]++;
		} else {
			byCycle.standard_prophylaxis++;
		}

		totalHistoricalLtvRub += candidate.historicalRevenueRub || 0;

		if (candidate.status === "completed") {
			completedCount++;
		} else if (candidate.status === "scheduled") {
			scheduledCount++;
		} else if (candidate.status === "declined") {
			declinedCount++;
		}

		if (
			candidate.status === "invited" ||
			candidate.status === "contacted" ||
			candidate.lastContactedAt
		) {
			contactedCount++;
		}

		switch (candidate.urgencyStatus) {
			case "upcoming":
				upcomingCount++;
				break;
			case "due_now":
				dueNowCount++;
				break;
			case "overdue_30":
				overdue30Count++;
				break;
			case "overdue_90":
				overdue90Count++;
				break;
			case "completed":
				break;
		}
	}

	const totalCandidates = candidates.length;
	const activeEligible = totalCandidates > 0 ? totalCandidates : 1;

	const totalRetained = scheduledCount + completedCount;
	const conversionRatePercent = Math.round((totalRetained / activeEligible) * 1000) / 10;

	const contactedBase = contactedCount > 0 ? contactedCount : 1;
	const contactResponseRatePercent = Math.round((totalRetained / contactedBase) * 1000) / 10;

	const pastDueBase = totalCandidates - upcomingCount;
	const retentionRatePercent =
		pastDueBase > 0
			? Math.round((completedCount / pastDueBase) * 1000) / 10
			: 0;

	const completedOrHistoricalBase = completedCount > 0 ? completedCount : (totalCandidates > 0 ? totalCandidates : 1);
	const averageRecallLtvRub = Math.round(totalHistoricalLtvRub / completedOrHistoricalBase);

	const lostPatientsCount = overdue30Count + overdue90Count + declinedCount;
	const overdueEstimatedLostRevenueRub = lostPatientsCount * estimatedHygieneRevenueRub;

	const retainedRevenueRub = totalRetained * estimatedHygieneRevenueRub;

	return {
		totalCandidates,
		upcomingCount,
		dueNowCount,
		overdue30Count,
		overdue90Count,
		completedCount,
		contactedCount,
		scheduledCount,
		declinedCount,
		conversionRatePercent: Math.min(100, conversionRatePercent),
		contactResponseRatePercent: Math.min(100, contactResponseRatePercent),
		retentionRatePercent: Math.min(100, retentionRatePercent),
		totalHistoricalLtvRub,
		averageRecallLtvRub,
		byCycle,
		overdueEstimatedLostRevenueRub,
		retainedRevenueRub,
	};
}

export function calculateCohortRetention(
	candidates: readonly PatientRecallRecord[],
	options: {
		readonly grouping?: ("month" | "quarter") | undefined;
		readonly defaultAverageCheckRub?: number | undefined;
	} = {},
): CohortRetentionReport {
	const grouping = options.grouping || "month";
	const defaultCheck = options.defaultAverageCheckRub || 6500;

	const groupsMap = new Map<
		string,
		{
			label: string;
			patients: PatientRecallRecord[];
		}
	>();

	for (const candidate of candidates) {
		const visitDate = candidate.lastVisitDate || "2026-01-01";
		let cohortKey = "";
		let cohortLabel = "";

		if (grouping === "quarter") {
			const year = visitDate.slice(0, 4);
			const month = Number.parseInt(visitDate.slice(5, 7), 10);
			const quarter = Math.ceil(month / 3);
			cohortKey = `${year}-Q${quarter}`;
			cohortLabel = `${quarter} кв. ${year}`;
		} else {
			cohortKey = visitDate.slice(0, 7);
			const [year, monthStr] = cohortKey.split("-");
			const monthNames = [
				"Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
				"Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
			];
			const mIndex = Number.parseInt(monthStr || "1", 10) - 1;
			cohortLabel = `${monthNames[mIndex] || monthStr} ${year}`;
		}

		if (!groupsMap.has(cohortKey)) {
			groupsMap.set(cohortKey, { label: cohortLabel, patients: [] });
		}
		groupsMap.get(cohortKey)!.patients.push(candidate);
	}

	const cohorts: CohortRetentionGroup[] = [];
	let totalAllPatients = 0;
	let totalAllCompleted = 0;
	let totalAllScheduled = 0;
	let totalAllDue = 0;
	let totalAllRevenue = 0;
	let totalAllLost = 0;
	let totalAllHistoricalLtv = 0;

	const sortedKeys = Array.from(groupsMap.keys()).sort();

	for (const key of sortedKeys) {
		const entry = groupsMap.get(key)!;
		const list = entry.patients;
		const totalPatients = list.length;

		let dueCount = 0;
		let contactedCount = 0;
		let scheduledCount = 0;
		let completedCount = 0;
		let declinedCount = 0;
		let groupHistoricalLtv = 0;

		for (const p of list) {
			groupHistoricalLtv += p.historicalRevenueRub || 0;
			if (p.urgencyStatus !== "upcoming") {
				dueCount++;
			}
			if (p.status === "invited" || p.status === "contacted" || p.lastContactedAt) {
				contactedCount++;
			}
			if (p.status === "scheduled") {
				scheduledCount++;
			} else if (p.status === "completed") {
				completedCount++;
			} else if (p.status === "declined") {
				declinedCount++;
			}
		}

		const retainedCount = scheduledCount + completedCount;
		const retentionRatePercent =
			dueCount > 0 ? Math.round((completedCount / dueCount) * 1000) / 10 : 0;
		const conversionRatePercent =
			totalPatients > 0 ? Math.round((retainedCount / totalPatients) * 1000) / 10 : 0;

		const totalRevenueRub = retainedCount * defaultCheck;
		const estimatedLostRevenueRub = (dueCount - retainedCount) * defaultCheck;
		const averageLtvRub =
			totalPatients > 0 ? Math.round(groupHistoricalLtv / totalPatients) : 0;

		cohorts.push({
			cohortKey: key,
			cohortLabel: entry.label,
			totalPatients,
			dueCount,
			contactedCount,
			scheduledCount,
			completedCount,
			declinedCount,
			retentionRatePercent,
			conversionRatePercent,
			averageLtvRub,
			totalRevenueRub,
			estimatedLostRevenueRub,
		});

		totalAllPatients += totalPatients;
		totalAllCompleted += completedCount;
		totalAllScheduled += scheduledCount;
		totalAllDue += dueCount;
		totalAllRevenue += totalRevenueRub;
		totalAllLost += estimatedLostRevenueRub;
		totalAllHistoricalLtv += groupHistoricalLtv;
	}

	const overallRetentionRatePercent =
		totalAllDue > 0 ? Math.round((totalAllCompleted / totalAllDue) * 1000) / 10 : 0;
	const overallConversionRatePercent =
		totalAllPatients > 0
			? Math.round(((totalAllScheduled + totalAllCompleted) / totalAllPatients) * 1000) / 10
			: 0;
	const overallAverageLtvRub =
		totalAllPatients > 0 ? Math.round(totalAllHistoricalLtv / totalAllPatients) : 0;

	return {
		cohorts,
		overallRetentionRatePercent,
		overallConversionRatePercent,
		overallAverageLtvRub,
		totalRecallRevenueRub: totalAllRevenue,
		totalLostRevenueRub: totalAllLost,
	};
}

/* ==========================================================================
   5. ФИЛЬТРАЦИЯ И СОРТИРОВКА ПАЦИЕНТОВ В РЕЕСТРЕ
   ========================================================================== */

export function filterAndSortRecallCandidates(
	candidates: readonly PatientRecallRecord[],
	options: RecallFilterOptions,
): PatientRecallRecord[] {
	const rawQuery = (options.searchQuery ?? "").trim();
	const queryLower = rawQuery.toLowerCase();
	const queryDigits = rawQuery.replace(/\D/g, "");

	const filtered = candidates.filter((c) => {
		if (options.status && options.status !== "all") {
			if (options.status === "due_now") {
				const isPending = c.status === "pending" || c.status === "due_now";
				const isDue = c.urgencyStatus === "due_now" || c.urgencyStatus === "overdue_30" || c.urgencyStatus === "overdue_90";
				if (!isPending || !isDue) {
					return false;
				}
			} else if (options.status === "invited") {
				if (c.status !== "invited" && c.status !== "contacted") {
					return false;
				}
			} else if (c.status !== options.status) {
				return false;
			}
		}

		if (options.urgencyStatus && options.urgencyStatus !== "all") {
			if (c.urgencyStatus !== options.urgencyStatus) {
				return false;
			}
		}

		if (options.cycleType && options.cycleType !== "all") {
			if (c.cycleType !== options.cycleType) {
				return false;
			}
		}

		if (options.doctorId && options.doctorId !== "all") {
			if (c.attendingDoctorId !== options.doctorId) {
				return false;
			}
		}

		if (rawQuery) {
			const nameMatch = c.fullName.toLowerCase().includes(queryLower);
			const phoneDigits = c.phone ? c.phone.replace(/\D/g, "") : "";
			const phoneMatch =
				queryDigits.length > 0 && phoneDigits.length > 0
					? phoneDigits.includes(queryDigits)
					: false;
			const doctorMatch = c.attendingDoctorName
				? c.attendingDoctorName.toLowerCase().includes(queryLower)
				: false;

			if (!nameMatch && !phoneMatch && !doctorMatch) {
				return false;
			}
		}

		return true;
	});

	const sortBy = options.sortBy ?? "daysOverdue";
	const sortDirection = options.sortDirection ?? "desc";
	const dirMultiplier = sortDirection === "asc" ? 1 : -1;

	return filtered.slice().sort((a, b) => {
		if (sortBy === "daysOverdue") {
			return (a.daysOverdue - b.daysOverdue) * dirMultiplier;
		}
		if (sortBy === "dueDate") {
			return a.dueDate.localeCompare(b.dueDate) * dirMultiplier;
		}
		if (sortBy === "lastVisitDate") {
			return a.lastVisitDate.localeCompare(b.lastVisitDate) * dirMultiplier;
		}
		if (sortBy === "fullName") {
			return a.fullName.localeCompare(b.fullName, "ru") * dirMultiplier;
		}
		if (sortBy === "ltv") {
			return ((a.historicalRevenueRub || 0) - (b.historicalRevenueRub || 0)) * dirMultiplier;
		}
		return 0;
	});
}
