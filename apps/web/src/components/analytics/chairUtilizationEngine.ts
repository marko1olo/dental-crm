/**
 * apps/web/src/components/analytics/chairUtilizationEngine.ts
 *
 * ДВИЖОК РЕАЛЬНОЙ ЗАГРУЗКИ СТОМАТОЛОГИЧЕСКИХ КРЕСЕЛ (CHAIR UTILIZATION ENGINE).
 *
 * Формула:
 *   Utilization Rate = (∑ минуты реальных приемов + санобработка 15 мин) / минуты рабочих смен * 100%
 *
 * Стандарты:
 * - 100% Zero Mocks: расчет строится на реальных записях расписания (appointments).
 * - Учет санитарной обработки между пациентами по СанПиН 3.3686-21 (10-15 минут на проветривание и дезинфекцию поверхностей).
 * - Учет простоев (Idle Minutes) и коэффициента отдачи с кресло-часа (Capacity Yield).
 * - Разделение по креслам: Кресло 1 (Терапевтическое), Кресло 2 (Ортопедическое), Хирургический кабинет и т.д.
 */

export interface RawAppointmentItem {
	readonly id: string;
	readonly chairId?: string | null | undefined;
	readonly chairName?: string | null | undefined;
	readonly startsAt: string | Date;
	readonly endsAt: string | Date;
	readonly status: "completed" | "in_treatment" | "arrived" | "booked" | "cancelled" | "no_show";
	readonly revenueKopecks?: number | undefined;
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly patientId?: string | undefined;
}

export interface ChairDefinition {
	readonly id: string;
	readonly name: string;
	readonly cabinet: string;
	readonly workingHoursPerDay?: number | undefined; // По умолчанию 12 часов (720 минут)
	readonly sanitationMinutesPerVisit?: number | undefined; // По умолчанию 15 минут
	readonly isActive?: boolean | undefined;
}

export interface SingleChairUtilizationMetrics {
	readonly chairId: string;
	readonly chairName: string;
	readonly cabinet: string;
	readonly totalAppointments: number;
	readonly completedCount: number;
	readonly cancelledCount: number;
	readonly noShowCount: number;
	readonly occupiedMinutes: number;           // Чистые минуты приемов
	readonly sanitationMinutes: number;         // Минуты регламентной санобработки
	readonly effectiveOccupiedMinutes: number;  // Приемы + санобработка
	readonly availableMinutes: number;          // Доступные минуты рабочих смен
	readonly idleMinutes: number;               // Минуты простоя
	readonly pureOccupancyPercent: number;      // Чистая загрузка (%)
	readonly effectiveUtilizationPercent: number;// Загрузка с учетом санобработки (%)
	readonly totalRevenueKopecks: number;       // Выручка кресла
	readonly revenuePerHourKopecks: number;     // Выручка на отработанный кресло-час
	readonly capacityYieldPerHourKopecks: number; // Выручка на доступный кресло-час
	readonly cancellationRatePercent: number;   // Процент срывов расписания
	readonly isOverloaded: boolean;             // > 90% загрузки (риск задержек)
}

export interface ClinicChairUtilizationSummary {
	readonly periodLabel: string;
	readonly daysCount: number;
	readonly totalChairsCount: number;
	readonly chairs: readonly SingleChairUtilizationMetrics[];
	readonly totalOccupiedMinutes: number;
	readonly totalSanitationMinutes: number;
	readonly totalEffectiveOccupiedMinutes: number;
	readonly totalAvailableMinutes: number;
	readonly totalIdleMinutes: number;
	readonly overallUtilizationPercent: number;
	readonly overallPureOccupancyPercent: number;
	readonly totalRevenueKopecks: number;
	readonly averageRevenuePerChairKopecks: number;
	readonly averageHourlyYieldKopecks: number;
	readonly isEmpty: boolean;
}

/** Канонические рабочие кресла клиники по умолчанию */
export const DEFAULT_CLINIC_CHAIRS: readonly ChairDefinition[] = [
	{
		id: "chair-1",
		name: "Кресло 1 (Терапия)",
		cabinet: "Кабинет №1",
		workingHoursPerDay: 12,
		sanitationMinutesPerVisit: 15,
		isActive: true,
	},
	{
		id: "chair-2",
		name: "Кресло 2 (Ортопедия)",
		cabinet: "Кабинет №2",
		workingHoursPerDay: 12,
		sanitationMinutesPerVisit: 15,
		isActive: true,
	},
	{
		id: "chair-surg",
		name: "Хирургический кабинет",
		cabinet: "Операционная",
		workingHoursPerDay: 12,
		sanitationMinutesPerVisit: 20, // Повышенный норматив на хирургию
		isActive: true,
	},
];

/**
 * Вычисляет длительность приема в минутах по датам начала и окончания.
 */
export function getAppointmentDurationMinutes(startsAt: string | Date, endsAt: string | Date): number {
	const start = typeof startsAt === "string" ? new Date(startsAt) : startsAt;
	const end = typeof endsAt === "string" ? new Date(endsAt) : endsAt;

	const startMs = start.getTime();
	const endMs = end.getTime();

	if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
		return 30; // Дефолтный 30-минутный квант при поврежденных метках
	}

	const diffMinutes = Math.round((endMs - startMs) / (1000 * 60));
	return Math.max(5, Math.min(720, diffMinutes));
}

/**
 * Главный калькулятор загрузки кресел клиники.
 */
export function calculateClinicChairUtilization(params: {
	readonly appointments: readonly RawAppointmentItem[];
	readonly chairsConfig?: readonly ChairDefinition[];
	readonly daysCount?: number;
	readonly periodLabel?: string;
}): ClinicChairUtilizationSummary {
	const {
		appointments,
		chairsConfig = DEFAULT_CLINIC_CHAIRS,
		daysCount = 1,
		periodLabel = "Текущий период",
	} = params;

	const safeDays = Math.max(1, Math.round(daysCount));

	// Собираем карту конфигураций кресел
	const chairMap = new Map<string, ChairDefinition>();
	for (const ch of chairsConfig) {
		chairMap.set(ch.id, ch);
	}

	// Группируем приемы по креслам
	const appointmentsByChair = new Map<string, RawAppointmentItem[]>();

	for (const appt of appointments) {
		let chairId = appt.chairId || "";
		if (!chairId) {
			// Если chairId не указан, пытаемся сопоставить по имени или отнести к первому креслу
			const found = chairsConfig.find((c) => c.name.toLowerCase() === (appt.chairName || "").toLowerCase());
			chairId = found ? found.id : chairsConfig[0]?.id || "chair-1";
		}

		const list = appointmentsByChair.get(chairId) || [];
		list.push(appt);
		appointmentsByChair.set(chairId, list);
	}

	// Рассчитываем метрики для каждого известного кресла
	const chairMetricsList: SingleChairUtilizationMetrics[] = [];
	let totalOccupiedMin = 0;
	let totalSanitationMin = 0;
	let totalAvailableMin = 0;
	let totalRevenueKop = 0;

	for (const ch of chairsConfig) {
		const appts = appointmentsByChair.get(ch.id) || [];
		const workingHours = ch.workingHoursPerDay || 12;
		const availableMinutes = safeDays * workingHours * 60;
		const sanPerVisit = ch.sanitationMinutesPerVisit || 15;

		let occupiedMinutes = 0;
		let completedCount = 0;
		let cancelledCount = 0;
		let noShowCount = 0;
		let chairRevKop = 0;

		for (const appt of appts) {
			const dur = getAppointmentDurationMinutes(appt.startsAt, appt.endsAt);
			const rev = Math.max(0, Math.round(appt.revenueKopecks || 0));

			if (appt.status === "cancelled") {
				cancelledCount += 1;
				continue;
			}
			if (appt.status === "no_show") {
				noShowCount += 1;
				continue;
			}

			// Действительные приемы (completed, in_treatment, arrived, booked)
			occupiedMinutes += dur;
			chairRevKop += rev;

			if (appt.status === "completed") {
				completedCount += 1;
			}
		}

		// Санитарная обработка после каждого реального приема
		const validVisitsCount = appts.length - cancelledCount - noShowCount;
		const sanitationMinutes = Math.max(0, validVisitsCount * sanPerVisit);

		// Эффективно занятое время (не может превышать доступное время)
		const effectiveOccupiedMinutes = Math.min(availableMinutes, occupiedMinutes + sanitationMinutes);
		const idleMinutes = Math.max(0, availableMinutes - effectiveOccupiedMinutes);

		// Проценты утилизации
		const pureOccupancyPercent =
			availableMinutes > 0
				? Math.min(100, Number(((occupiedMinutes / availableMinutes) * 100).toFixed(1)))
				: 0;
		const effectiveUtilizationPercent =
			availableMinutes > 0
				? Math.min(100, Number(((effectiveOccupiedMinutes / availableMinutes) * 100).toFixed(1)))
				: 0;

		// Выручка на час
		const occupiedHours = occupiedMinutes / 60;
		const availableHours = availableMinutes / 60;
		const revenuePerHourKopecks =
			occupiedHours > 0 ? Math.round(chairRevKop / occupiedHours) : 0;
		const capacityYieldPerHourKopecks =
			availableHours > 0 ? Math.round(chairRevKop / availableHours) : 0;

		const totalApptsCount = appts.length;
		const cancellationRatePercent =
			totalApptsCount > 0
				? Number((((cancelledCount + noShowCount) / totalApptsCount) * 100).toFixed(1))
				: 0;

		chairMetricsList.push({
			chairId: ch.id,
			chairName: ch.name,
			cabinet: ch.cabinet,
			totalAppointments: totalApptsCount,
			completedCount,
			cancelledCount,
			noShowCount,
			occupiedMinutes,
			sanitationMinutes,
			effectiveOccupiedMinutes,
			availableMinutes,
			idleMinutes,
			pureOccupancyPercent,
			effectiveUtilizationPercent,
			totalRevenueKopecks: chairRevKop,
			revenuePerHourKopecks,
			capacityYieldPerHourKopecks,
			cancellationRatePercent,
			isOverloaded: effectiveUtilizationPercent >= 90,
		});

		totalOccupiedMin += occupiedMinutes;
		totalSanitationMin += sanitationMinutes;
		totalAvailableMin += availableMinutes;
		totalRevenueKop += chairRevKop;
	}

	const totalEffectiveOccupiedMinutes = Math.min(totalAvailableMin, totalOccupiedMin + totalSanitationMin);
	const totalIdleMinutes = Math.max(0, totalAvailableMin - totalEffectiveOccupiedMinutes);

	const overallUtilizationPercent =
		totalAvailableMin > 0
			? Math.min(100, Number(((totalEffectiveOccupiedMinutes / totalAvailableMin) * 100).toFixed(1)))
			: 0;

	const overallPureOccupancyPercent =
		totalAvailableMin > 0
			? Math.min(100, Number(((totalOccupiedMin / totalAvailableMin) * 100).toFixed(1)))
			: 0;

	const activeChairsCount = chairsConfig.length;
	const averageRevenuePerChairKopecks =
		activeChairsCount > 0 ? Math.round(totalRevenueKop / activeChairsCount) : 0;

	const totalAvailableHours = totalAvailableMin / 60;
	const averageHourlyYieldKopecks =
		totalAvailableHours > 0 ? Math.round(totalRevenueKop / totalAvailableHours) : 0;

	const isEmpty = appointments.length === 0;

	return {
		periodLabel,
		daysCount: safeDays,
		totalChairsCount: activeChairsCount,
		chairs: chairMetricsList,
		totalOccupiedMinutes: totalOccupiedMin,
		totalSanitationMinutes: totalSanitationMin,
		totalEffectiveOccupiedMinutes,
		totalAvailableMinutes: totalAvailableMin,
		totalIdleMinutes,
		overallUtilizationPercent,
		overallPureOccupancyPercent,
		totalRevenueKopecks: totalRevenueKop,
		averageRevenuePerChairKopecks,
		averageHourlyYieldKopecks,
		isEmpty,
	};
}
