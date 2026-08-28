/**
 * Clinical Prophylaxis & Recall Interval Calculator Engine (DOMAIN: RECALLS)
 *
 * Диспансеризация, диспансерный учет и профилактические вызовы пациентов.
 * Соответствует клиническим рекомендациям Стоматологической Ассоциации России (СтАР),
 * принципам доказательной пародонтологии (EFP/AAP) и протоколам контроля остеоинтеграции.
 */

export type RecallCycleType =
	| "caries_high_risk"
	| "periodontal_maintenance"
	| "implant_monitoring"
	| "orthodontic_retention"
	| "standard_prophylaxis"
	| "pediatric_fluoridation";

export type RecallUrgencyStatus =
	| "upcoming"
	| "due_now"
	| "overdue_30"
	| "overdue_90"
	| "completed";

export type RecallContactStatus =
	| "pending"
	| "contacted"
	| "scheduled"
	| "completed"
	| "declined";

export type RecallChannel = "whatsapp" | "telegram" | "sms" | "phone";

export interface RecallCycleDefinition {
	readonly id: RecallCycleType;
	readonly title: string;
	readonly shortTitle: string;
	readonly defaultIntervalMonths: number;
	readonly allowedIntervalsMonths: readonly number[];
	readonly clinicalRationale: string;
	readonly targetProcedures: readonly string[];
	readonly requiresRadiologyCheck: boolean;
	readonly preservesWarranty: boolean;
	readonly badgeColorToken: string;
}

/**
 * Каталог клинических протоколов диспансерного наблюдения и профилактических циклов.
 */
export const RECALL_CYCLE_CATALOG: Readonly<Record<RecallCycleType, RecallCycleDefinition>> = {
	caries_high_risk: {
		id: "caries_high_risk",
		title: "Высокий кариесогенный риск (множественные поражения)",
		shortTitle: "Кариес-контроль",
		defaultIntervalMonths: 3,
		allowedIntervalsMonths: [2, 3, 4],
		clinicalRationale:
			"Декомпенсированная форма кариеса, активные очаги деминерализации, КПУ > 12. " +
			"Требуется 3-месячный цикл минерализации эмали, контроль гигиены и ревизия краевого прилегания реставраций.",
		targetProcedures: [
			"Осмотр и индексная оценка гигиены (OHI-S, КПИ)",
			"Глубокое фторирование эмали и ремотерапия (Clinpro / Bifluorid 12)",
			"Атравматичная чистка Air-Flow порошком на основе глицина/эритритола",
			"Контроль краевого прилегания композитных пломб",
		],
		requiresRadiologyCheck: false,
		preservesWarranty: true,
		badgeColorToken: "danger",
	},
	periodontal_maintenance: {
		id: "periodontal_maintenance",
		title: "Поддерживающая пародонтальная терапия (SPT / Пародонтит)",
		shortTitle: "Пародонтология",
		defaultIntervalMonths: 3,
		allowedIntervalsMonths: [3, 4],
		clinicalRationale:
			"Хронический генерализованный пародонтит, глубина пародонтальных карманов >= 4 мм, кровоточивость при зондировании (BOP > 15%). " +
			"Профилактика рецидива костной деструкции и потери зубов каждые 3–4 месяца.",
		targetProcedures: [
			"Пародонтальное картирование (глубина карманов, рецессия, BOP, подвижность)",
			"Ультразвуковой поддесневой скейлинг (Vector / EMS Piezon no-pain)",
			"Кюретаж пародонтальных карманов кюретами Грейси",
			"Антисептическая обработка и пародонтальная повязка",
		],
		requiresRadiologyCheck: true,
		preservesWarranty: true,
		badgeColorToken: "warning",
	},
	implant_monitoring: {
		id: "implant_monitoring",
		title: "Диспансерный контроль остеоинтеграции и имплантатов",
		shortTitle: "Импланты",
		defaultIntervalMonths: 4,
		allowedIntervalsMonths: [4, 6],
		clinicalRationale:
			"Профилактика мукозита и периимплантита. Контроль уровня маргинальной кости вокруг имплантатов, " +
			"проверка стабильности винтовой фиксации абатментов и целостности окклюзионных контактов.",
		targetProcedures: [
			"Прицельная рентгенография / КЛКТ области имплантатов (контроль краевой кости)",
			"Проверка окклюзионной стабильности и отсутствия суперконтактов (T-Scan / фольга 8мкм)",
			"Профессиональная гигиена супраструктур имплантов титановыми/полимерными кюретами",
			"Очистка абатментов порошком эритритола Air-Flow Perio",
		],
		requiresRadiologyCheck: true,
		preservesWarranty: true,
		badgeColorToken: "primary",
	},
	orthodontic_retention: {
		id: "orthodontic_retention",
		title: "Ортодонтический ретенционный контроль",
		shortTitle: "Ортодонтия",
		defaultIntervalMonths: 3,
		allowedIntervalsMonths: [1, 3, 6, 12],
		clinicalRationale:
			"Ретенционный период после снятия брекет-системы или лечения на элайнерах. " +
			"Контроль фиксации несъемных проволочных ретейнеров, прилегания ретенционных капп и стабильности зубных дуг.",
		targetProcedures: [
			"Осмотр целостности композитной фиксации ретейнера (фронтальный отдел 13-23, 33-43)",
			"Оценка стабильности окклюзионных контактов и фиссурно-бугоркового смыкания",
			"Контроль адаптации ретенционной ночной каппы",
			"Удаление зубных отложений в труднодоступных зонах ретейнера",
		],
		requiresRadiologyCheck: false,
		preservesWarranty: true,
		badgeColorToken: "info",
	},
	standard_prophylaxis: {
		id: "standard_prophylaxis",
		title: "Плановый полугодовой осмотр и профессиональная гигиена",
		shortTitle: "Профгигиена 6 мес.",
		defaultIntervalMonths: 6,
		allowedIntervalsMonths: [6, 12],
		clinicalRationale:
			"Золотой стандарт стоматологической профилактики. Снятие над- и поддесневых отложений, " +
			"онкоскрининг слизистой оболочки рта, диагностика скрытого апроксимального кариеса и сохранение гарантий клиники.",
		targetProcedures: [
			"Комплексная профессиональная гигиена полости рта (УЗ-скейлинг + Air-Flow + полировка)",
			"Онкоскрининг слизистой оболочки полости рта (визуальный + люминесцентный АФС)",
			"Реминерализующая терапия и глубокое фторирование",
			"Плановый фотопротокол и ревизия гарантийных обязательств",
		],
		requiresRadiologyCheck: false,
		preservesWarranty: true,
		badgeColorToken: "success",
	},
	pediatric_fluoridation: {
		id: "pediatric_fluoridation",
		title: "Детская профилактика, герметизация и минерализация",
		shortTitle: "Детская (3 мес.)",
		defaultIntervalMonths: 3,
		allowedIntervalsMonths: [3, 6],
		clinicalRationale:
			"Несозревшая эмаль временных и постоянных зубов у детей требует 3-месячного цикла реминерализации. " +
			"Контроль герметизации фиссур моляров и формирование устойчивого навыка чистки зубов.",
		targetProcedures: [
			"Окрашивание налета индикатором зубных отложений (Curaprox / Miradent)",
			"Урок гигиены в игровой форме с подбором детской пасты и щетки",
			"Атравматичная чистка мягким порошком на основе глицина",
			"Герметизация фиссур прорезавшихся постоянных моляров (Fissurit FX / Clinpro Sealant)",
			"Аппликация фторлака / минерализующего геля (Tooth Mousse)",
		],
		requiresRadiologyCheck: false,
		preservesWarranty: true,
		badgeColorToken: "accent",
	},
};

export interface PatientRecallCandidate {
	readonly id: string;
	readonly patientId: string;
	readonly fullName: string;
	readonly phone: string | null;
	readonly email?: string | null | undefined;
	readonly cycleType: RecallCycleType;
	readonly customIntervalMonths?: number | undefined;
	readonly lastVisitDate: string; // ISO date string YYYY-MM-DD
	readonly dueDate: string; // ISO date string YYYY-MM-DD
	readonly daysOverdue: number; // positive = overdue, negative = remaining days until due
	readonly urgencyStatus: RecallUrgencyStatus;
	readonly attendingDoctorId?: string | undefined;
	readonly attendingDoctorName?: string | undefined;
	readonly lastProcedures?: readonly string[] | undefined;
	readonly clinicalNotes?: string | undefined;
	readonly periodontalPocketMaxMm?: number | undefined;
	readonly implantsCount?: number | undefined;
	readonly status: RecallContactStatus;
	readonly lastContactedAt?: string | undefined;
	readonly lastContactChannel?: RecallChannel | undefined;
	readonly scheduledAppointmentId?: string | undefined;
	readonly scheduledDate?: string | undefined;
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
	readonly conversionRatePercent: number;
	readonly contactResponseRatePercent: number;
	readonly retentionRatePercent: number;
	readonly byCycle: Readonly<Record<RecallCycleType, number>>;
	readonly overdueEstimatedLostRevenueRub: number;
}

export interface RecallFilterOptions {
	readonly urgencyStatus?: RecallUrgencyStatus | "all" | undefined;
	readonly cycleType?: RecallCycleType | "all" | undefined;
	readonly doctorId?: string | "all" | undefined;
	readonly searchQuery?: string | undefined;
	readonly sortBy?: "daysOverdue" | "dueDate" | "fullName" | "lastVisitDate" | undefined;
	readonly sortDirection?: "asc" | "desc" | undefined;
}

/**
 * Безопасное сложение календарных месяцев без сноса дат через край месяца.
 * Пример: 31 августа + 6 месяцев = 28/29 февраля (а не 3 марта).
 */
export function addCalendarMonthsSafe(fromDate: Date | string, months: number): Date {
	const parsed = typeof fromDate === "string" ? new Date(fromDate) : new Date(fromDate.getTime());
	if (Number.isNaN(parsed.getTime())) {
		return new Date();
	}

	const originalDay = parsed.getDate();
	// Переходим на 1-е число целевого месяца для предотвращения переполнения
	parsed.setDate(1);
	parsed.setMonth(parsed.getMonth() + months);

	// Находим последний день целевого месяца (день 0 следующего месяца)
	const daysInTargetMonth = new Date(
		parsed.getFullYear(),
		parsed.getMonth() + 1,
		0,
	).getDate();

	parsed.setDate(Math.min(originalDay, daysInTargetMonth));
	return parsed;
}

/**
 * Форматирование даты в формат YYYY-MM-DD.
 */
export function formatIsoDateOnly(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * Расчет разницы в полных календарных днях (referenceDate - dueDate).
 * Положительное число = просрочено на N дней.
 * Отрицательное число = осталось N дней до срока.
 */
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

/**
 * Определение степени срочности вызова на основе дней просрочки.
 */
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
		return "upcoming"; // Срок еще не наступил
	}
	if (days <= 29) {
		return "due_now"; // 0..29 дней — окно активного вызова
	}
	if (days <= 89) {
		return "overdue_30"; // 30..89 дней — просрочено 1-3 месяца
	}
	return "overdue_90"; // >= 90 дней — критическая потеря пациента (> 3 месяцев)
}

/**
 * Расчет полного клинического профиля вызова пациента.
 */
export function calculateRecallProfile(params: {
	readonly lastVisitDate: Date | string;
	readonly cycleType: RecallCycleType;
	readonly customIntervalMonths?: number | undefined;
	readonly referenceDate?: Date | string | undefined;
	readonly isCompleted?: boolean | undefined;
}): {
	readonly dueDate: Date;
	readonly formattedDueDate: string;
	readonly daysOverdue: number;
	readonly urgencyStatus: RecallUrgencyStatus;
	readonly intervalMonths: number;
} {
	const cycleDef = RECALL_CYCLE_CATALOG[params.cycleType];
	const intervalMonths =
		params.customIntervalMonths && params.customIntervalMonths > 0
			? params.customIntervalMonths
			: cycleDef.defaultIntervalMonths;

	const dueDate = addCalendarMonthsSafe(params.lastVisitDate, intervalMonths);
	const formattedDueDate = formatIsoDateOnly(dueDate);
	const refDate = params.referenceDate ?? new Date();
	const daysOverdue = calculateDaysOverdue(dueDate, refDate);
	const urgencyStatus = resolveUrgencyStatus(dueDate, refDate, params.isCompleted);

	return {
		dueDate,
		formattedDueDate,
		daysOverdue,
		urgencyStatus,
		intervalMonths,
	};
}

/**
 * Автоматический клинический классификатор: подбирает оптимальный цикл диспансеризации
 * на основе данных осмотра, пародонтального статуса и анамнеза.
 */
export function evaluateClinicalCycleSuggestion(clinicalData: {
	readonly hasDeepCaries?: boolean | undefined;
	readonly decayedTeethCount?: number | undefined;
	readonly maxPocketDepthMm?: number | undefined;
	readonly hasBleedingOnProbing?: boolean | undefined;
	readonly hasImplants?: boolean | undefined;
	readonly monthsSinceImplantSurgery?: number | undefined;
	readonly hasBracesOrAligners?: boolean | undefined;
	readonly orthodonticStageMonth?: number | undefined;
	readonly isChildUnder14?: boolean | undefined;
	readonly hasActiveRetention?: boolean | undefined;
}): {
	readonly suggestedCycle: RecallCycleType;
	readonly reason: string;
	readonly recommendedIntervalMonths: number;
} {
	// 1. Пародонтологический риск (наивысший приоритет по риску потери зубов)
	if (
		(clinicalData.maxPocketDepthMm && clinicalData.maxPocketDepthMm >= 4) ||
		clinicalData.hasBleedingOnProbing
	) {
		return {
			suggestedCycle: "periodontal_maintenance",
			reason: `Пародонтит: глубина ПК ${clinicalData.maxPocketDepthMm ?? 4} мм, кровоточивость BOP. Требуется поддерживающая терапия раз в 3–4 месяца.`,
			recommendedIntervalMonths: 3,
		};
	}

	// 2. Диспансерный контроль имплантатов
	if (clinicalData.hasImplants) {
		const interval = (clinicalData.monthsSinceImplantSurgery ?? 12) <= 12 ? 4 : 6;
		return {
			suggestedCycle: "implant_monitoring",
			reason: "Наличие дентальных имплантатов. Необходим рентген-контроль маргинальной кости и профилактика периимплантита.",
			recommendedIntervalMonths: interval,
		};
	}

	// 3. Ортодонтический ретенционный период
	if (clinicalData.hasActiveRetention || clinicalData.hasBracesOrAligners) {
		return {
			suggestedCycle: "orthodontic_retention",
			reason: "Ретенционный контроль: проверка проволочных ретейнеров, ретенционных капп и стабильности зубных дуг.",
			recommendedIntervalMonths: 3,
		};
	}

	// 4. Детская стоматология и минерализация
	if (clinicalData.isChildUnder14) {
		return {
			suggestedCycle: "pediatric_fluoridation",
			reason: "Детский возраст (<14 лет): профилактика кариеса временных и постоянных зубов, глубокое фторирование эмали раз в 3 месяца.",
			recommendedIntervalMonths: 3,
		};
	}

	// 5. Высокий кариесогенный риск
	if (clinicalData.hasDeepCaries || (clinicalData.decayedTeethCount ?? 0) >= 3) {
		return {
			suggestedCycle: "caries_high_risk",
			reason: `Высокий КПУ (поражений: ${clinicalData.decayedTeethCount ?? "множественные"}). Требуется ревизия пломб и ремотерапия каждые 3 месяца.`,
			recommendedIntervalMonths: 3,
		};
	}

	// 6. Стандартная полугодовая профгигиена
	return {
		suggestedCycle: "standard_prophylaxis",
		reason: "Плановая диспансеризация: комплексная профессиональная гигиена и онкоскрининг каждые 6 месяцев.",
		recommendedIntervalMonths: 6,
	};
}

/**
 * Расчет агрегированных метрик конверсии и возвращаемости пациентов.
 */
export function calculateRecallMetrics(
	candidates: readonly PatientRecallCandidate[],
	estimatedHygieneRevenueRub = 6500,
): RecallMetrics {
	let upcomingCount = 0;
	let dueNowCount = 0;
	let overdue30Count = 0;
	let overdue90Count = 0;
	let completedCount = 0;
	let contactedCount = 0;
	let scheduledCount = 0;

	const byCycle: Record<RecallCycleType, number> = {
		caries_high_risk: 0,
		periodontal_maintenance: 0,
		implant_monitoring: 0,
		orthodontic_retention: 0,
		standard_prophylaxis: 0,
		pediatric_fluoridation: 0,
	};

	for (const candidate of candidates) {
		byCycle[candidate.cycleType] = (byCycle[candidate.cycleType] || 0) + 1;

		if (candidate.status === "completed") {
			completedCount++;
		} else if (candidate.status === "scheduled") {
			scheduledCount++;
		}

		if (candidate.status === "contacted" || candidate.lastContactedAt) {
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
				// already counted
				break;
		}
	}

	const totalCandidates = candidates.length;
	const activeEligible = totalCandidates > 0 ? totalCandidates : 1;

	// Конверсия: пациенты, которые записались или уже завершили визит
	const totalRetained = scheduledCount + completedCount;
	const conversionRatePercent = Math.round((totalRetained / activeEligible) * 1000) / 10;

	// Отклик на контакт: записались из числа тех, с кем связались
	const contactedBase = contactedCount > 0 ? contactedCount : 1;
	const contactResponseRatePercent =
		Math.round((totalRetained / contactedBase) * 1000) / 10;

	// Возвращаемость: завершенные визиты среди тех, у кого подошел срок
	const pastDueBase = totalCandidates - upcomingCount;
	const retentionRatePercent =
		pastDueBase > 0
			? Math.round((completedCount / pastDueBase) * 1000) / 10
			: 0;

	// Оценка упущенной выручки по критически просроченным пациентам (>30 и >90 дней)
	const lostPatientsCount = overdue30Count + overdue90Count;
	const overdueEstimatedLostRevenueRub = lostPatientsCount * estimatedHygieneRevenueRub;

	return {
		totalCandidates,
		upcomingCount,
		dueNowCount,
		overdue30Count,
		overdue90Count,
		completedCount,
		contactedCount,
		scheduledCount,
		conversionRatePercent: Math.min(100, conversionRatePercent),
		contactResponseRatePercent: Math.min(100, contactResponseRatePercent),
		retentionRatePercent: Math.min(100, retentionRatePercent),
		byCycle,
		overdueEstimatedLostRevenueRub,
	};
}

/**
 * Фильтрация и сортировка пациентов в диспансерном списке.
 */
export function filterAndSortRecallCandidates(
	candidates: readonly PatientRecallCandidate[],
	options: RecallFilterOptions,
): PatientRecallCandidate[] {
	const rawQuery = (options.searchQuery ?? "").trim();
	const queryLower = rawQuery.toLowerCase();
	const queryDigits = rawQuery.replace(/\D/g, "");

	const filtered = candidates.filter((c) => {
		// Фильтр по срочности
		if (options.urgencyStatus && options.urgencyStatus !== "all") {
			if (c.urgencyStatus !== options.urgencyStatus) {
				return false;
			}
		}

		// Фильтр по клиническому циклу
		if (options.cycleType && options.cycleType !== "all") {
			if (c.cycleType !== options.cycleType) {
				return false;
			}
		}

		// Фильтр по лечащему врачу
		if (options.doctorId && options.doctorId !== "all") {
			if (c.attendingDoctorId !== options.doctorId) {
				return false;
			}
		}

		// Поиск по ФИО, телефону, доктору
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
		return 0;
	});
}
