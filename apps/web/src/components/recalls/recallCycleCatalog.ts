import type { StomxTaskCallType } from "@dental/shared";

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

export type CanonicalRecallWorkflowStatus =
	| "not_called"
	| "reached"
	| "declined"
	| "scheduled";

export const CANONICAL_RECALL_STATUS_CONFIG: Readonly<
	Record<
		CanonicalRecallWorkflowStatus,
		{
			readonly id: CanonicalRecallWorkflowStatus;
			readonly label: string;
			readonly badgeColorToken: string;
		}
	>
> = {
	not_called: { id: "not_called", label: "Не звонили", badgeColorToken: "warning" },
	reached: { id: "reached", label: "Дозвонились", badgeColorToken: "info" },
	declined: { id: "declined", label: "Отказ", badgeColorToken: "danger" },
	scheduled: { id: "scheduled", label: "Записан", badgeColorToken: "success" },
};

export function toCanonicalRecallStatus(status: RecallContactStatus): CanonicalRecallWorkflowStatus {
	switch (status) {
		case "due_now":
		case "pending":
			return "not_called";
		case "invited":
		case "contacted":
			return "reached";
		case "declined":
			return "declined";
		case "scheduled":
		case "completed":
			return "scheduled";
		default:
			return "not_called";
	}
}

export function fromCanonicalRecallStatus(canonical: CanonicalRecallWorkflowStatus): RecallContactStatus {
	switch (canonical) {
		case "not_called":
			return "due_now";
		case "reached":
			return "contacted";
		case "declined":
			return "declined";
		case "scheduled":
			return "scheduled";
	}
}

export type ClinicalRecallTriggerType =
	| "hygiene_6m"
	| "implant_prosthetic_12m"
	| "ortho_activation_1m"
	| "pediatric_3_4m";

export interface ClinicalRecallTriggerInfo {
	readonly triggerType: ClinicalRecallTriggerType;
	readonly title: string;
	readonly shortTitle: string;
	readonly intervalMonths: number;
	readonly intervalWeeks?: number | undefined;
	readonly nextDueDate: Date;
	readonly formattedDueDate: string;
	readonly clinicalRationale: string;
	readonly mappedCycleType: RecallCycleType;
}

export type RecallPeriodFilter =
	| "all"
	| "overdue"
	| "this_month"
	| "next_month"
	| "next_30_days";

export type RecallChannel = "whatsapp" | "telegram" | "sms" | "phone";

export interface RecallCycleDefinition {
	readonly id: RecallCycleType;
	readonly title: string;
	readonly shortTitle: string;
	readonly intervalUnit: "months" | "weeks" | "milestone_sequence";
	readonly defaultIntervalValue: number;
	readonly allowedIntervals: readonly number[];
	readonly defaultIntervalMonths: number;
	readonly allowedIntervalsMonths: readonly number[];
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
		defaultIntervalMonths: 6,
		allowedIntervalsMonths: [6, 12],
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
		defaultIntervalMonths: 3,
		allowedIntervalsMonths: [3, 4],
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
		defaultIntervalMonths: 4,
		allowedIntervalsMonths: [4, 6],
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
		defaultIntervalMonths: 1,
		allowedIntervalsMonths: [1],
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
		defaultIntervalMonths: 2,
		allowedIntervalsMonths: [2],
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
		defaultIntervalMonths: 3,
		allowedIntervalsMonths: [1, 3, 6, 12],
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
		defaultIntervalMonths: 3,
		allowedIntervalsMonths: [3, 6],
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
		defaultIntervalMonths: 3,
		allowedIntervalsMonths: [2, 3, 4],
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
		defaultIntervalMonths: 6,
		allowedIntervalsMonths: [6, 12],
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
	readonly clinicalTriggerType?: ClinicalRecallTriggerType | undefined;
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
	readonly taskCallType?: StomxTaskCallType | undefined;
	readonly lastContactedAt?: string | undefined;
	readonly lastContactChannel?: RecallChannel | undefined;
	readonly scheduledAppointmentId?: string | undefined;
	readonly scheduledDate?: string | undefined;
	readonly historicalRevenueRub?: number | undefined; // LTV накопительный
	readonly visitsCount?: number | undefined;
}

// Алиас для обратной совместимости
export type PatientRecallCandidate = PatientRecallRecord;

/**
 * Определяет канонический тип сервисного звонка StomX для кандидата диспансерного учета
 */
export function determineTaskCallTypeForCandidate(c: PatientRecallRecord): StomxTaskCallType {
	if (c.taskCallType) return c.taskCallType;
	if (c.implantSurgeryDate || (c.clinicalNotes && /удалени|имплант|операци/i.test(c.clinicalNotes))) {
		return "learn_health";
	}
	if (c.clinicalNotes && /план лечения не начат/i.test(c.clinicalNotes)) {
		return "medplan_not_started";
	}
	if (c.clinicalNotes && /план лечения не закончен/i.test(c.clinicalNotes)) {
		return "medplan_not_finished";
	}
	if (c.status === "scheduled") {
		return "appointment_confirmation";
	}
	if (c.status === "declined") {
		return "appointment_refuse";
	}
	return "preventive_inspection";
}

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

export interface RecallFilterOptions {
	readonly status?: (RecallContactStatus | "all") | undefined;
	readonly canonicalStatus?: (CanonicalRecallWorkflowStatus | "all") | undefined;
	readonly urgencyStatus?: (RecallUrgencyStatus | "all") | undefined;
	readonly cycleType?: (RecallCycleType | "all") | undefined;
	readonly triggerType?: (ClinicalRecallTriggerType | "all") | undefined;
	readonly doctorId?: (string | "all") | undefined;
	readonly period?: (RecallPeriodFilter) | undefined;
	readonly referenceDate?: (Date | string) | undefined;
	readonly searchQuery?: string | undefined;
	readonly sortBy?: ("daysOverdue" | "dueDate" | "fullName" | "lastVisitDate" | "ltv") | undefined;
	readonly sortDirection?: ("asc" | "desc") | undefined;
}
