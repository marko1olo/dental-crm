/**
 * Типы структур данных отчётов руководителя клиники.
 */

export type ReportPeriod = {
	readonly from: Date;
	readonly to: Date;
};

export type ReportScope = ReportPeriod & {
	readonly organizationId: string;
	/**
	 * Часовой пояс клиники. Нужен там, где группировка делается в PostgreSQL:
	 * `date_trunc` и `extract` считают в поясе СЕССИИ, а не клиники.
	 *
	 * Необязателен намеренно: без него поведение прежнее, и ни один вызывающий
	 * не ломается. Отсутствие пояса — не ошибка, а «неизвестно»; выдумывать
	 * московский за клинику нельзя.
	 */
	readonly timeZone?: string | null;
};

export type TimelineGranularity = "day" | "week" | "month";

export type RevenueTimelinePoint = {
	readonly bucket: string;
	readonly revenueRub: number;
	readonly paymentCount: number;
	readonly payingPatients: number;
};

export type RevenueTimeline = {
	readonly granularity: TimelineGranularity;
	readonly points: RevenueTimelinePoint[];
	readonly totalRub: number;
	readonly isEmpty: boolean;
};

export type DoctorPerformanceRow = {
	readonly doctorUserId: string | null;
	readonly doctorName: string;
	readonly revenueRub: number;
	readonly appointmentsTotal: number;
	readonly appointmentsCompleted: number;
	readonly appointmentsCancelled: number;
	readonly appointmentsNoShow: number;
	/** Доля завершённых от всех записей, 0…1. null — записей не было. */
	readonly completionRate: number | null;
	/** Доля неявок, 0…1. null — записей не было. */
	readonly noShowRate: number | null;
	/** Средний чек: выручка на завершённый приём. null — завершённых не было. */
	readonly averageTicketRub: number | null;
	/**
	 * Маржа не считается: себестоимости материалов и процента врача в базе нет.
	 * Поле оставлено, чтобы интерфейс показывал прочерк осознанно.
	 */
	readonly marginRub: null;
};

export type DoctorPerformanceReport = {
	readonly rows: DoctorPerformanceRow[];
	/** Выручка, которую не удалось отнести к врачу (платёж без приёма). */
	readonly unattributedRevenueRub: number;
	/**
	 * Пояснение к «не отнесено». Молчаливая строка с суммой без причины выглядит
	 * как ошибка расчёта, хотя это ограничение связей в данных.
	 */
	readonly attributionNote: string;
	readonly isEmpty: boolean;
};

export type ChairLoadRow = {
	readonly chairId: string | null;
	readonly chairName: string;
	readonly appointments: number;
	readonly bookedMinutes: number;
	/**
	 * Занятость от расчётной базы, 0…1. null — базу определить нечем, и тогда
	 * показывать процент нельзя.
	 */
	readonly utilization: number | null;
};

export type ChairLoadReport = {
	readonly rows: ChairLoadRow[];
	/** Из чего считался знаменатель — обязательно к показу рядом с процентом. */
	readonly basis: {
		readonly workingDays: number;
		readonly minutesPerDay: number;
		readonly totalMinutesPerChair: number;
		readonly note: string;
	};
	readonly isEmpty: boolean;
};

export type AppointmentFunnelReport = {
	readonly byStatus: Readonly<Record<string, number>>;
	readonly total: number;
	/** Доля дошедших до кресла (arrived, in_treatment, completed). */
	readonly arrivalRate: number | null;
	readonly completionRate: number | null;
	readonly cancellationRate: number | null;
	readonly noShowRate: number | null;
	/**
	 * Потерянные приёмы: отмены плюс неявки. Именно этот показатель клиника
	 * может уменьшить напоминаниями, и именно его нужно смотреть до и после.
	 */
	readonly lostAppointments: number;
	readonly isEmpty: boolean;
};

export type ReminderEffectGroup = {
	/** Сколько приёмов в группе. */
	readonly appointments: number;
	readonly completed: number;
	readonly cancelled: number;
	readonly noShow: number;
	/** Отмены плюс неявки — то, что клиника теряет. */
	readonly lost: number;
	/** Доля потерь; null, если приёмов в группе нет. */
	readonly lostRate: number | null;
};

export type ReminderEffectReport = {
	/** Приёмы, до которых напоминание дошло (отправлено или доставлено). */
	readonly reminded: ReminderEffectGroup;
	/** Приёмы, до которых напоминание НЕ дошло: не ставилось, подавлено или упало. */
	readonly notReminded: ReminderEffectGroup;
	/**
	 * Разница долей потерь в процентных пунктах: notReminded − reminded.
	 * Положительное значение означает, что без напоминания теряется больше.
	 * null, если одна из групп пуста — сравнивать не с чем.
	 */
	readonly lostRateDifference: number | null;
	/**
	 * Почему это НЕ доказательство причинности. Группы различаются не только
	 * напоминанием: напоминание не уходит тем, у кого нет телефона, нет
	 * согласия или кто записан на сегодня. Такие пациенты и без напоминаний
	 * ведут себя иначе.
	 */
	readonly caveat: string;
	/**
	 * Размер меньшей из групп и хватает ли его, чтобы вообще смотреть на
	 * разницу.
	 *
	 * ЗАЧЕМ. На живых данных первый же прогон дал «напоминание дошло: 3 приёма,
	 * потерь 0» против «не дошло: 19 приёмов, потерь 26 %», то есть разницу в
	 * 26 процентных пунктов на выборке из трёх приёмов. Одна неявка в такой
	 * группе перевернула бы вывод на противоположный. Показывать такое число
	 * без предупреждения — значит подсунуть руководителю решение, основанное на
	 * случайности.
	 */
	readonly smallestGroupSize: number;
	readonly enoughData: boolean;
	readonly isEmpty: boolean;
};

export type PatientFlowPoint = {
	readonly bucket: string;
	readonly newPatients: number;
	readonly returningPatients: number;
};

export type PatientFlowReport = {
	readonly points: PatientFlowPoint[];
	readonly newTotal: number;
	readonly returningTotal: number;
	readonly isEmpty: boolean;
};

export type ServiceSalesRow = {
	readonly title: string;
	readonly quantity: number;
	readonly plannedRub: number;
	readonly averagePriceRub: number;
	readonly discountRub: number;
};

export type ServiceSalesReport = {
	readonly rows: ServiceSalesRow[];
	readonly plannedTotalRub: number;
	readonly discountTotalRub: number;
	readonly note: string;
	readonly isEmpty: boolean;
};

export type ReceivablesBucket =
	| "current"
	| "up_to_30"
	| "up_to_90"
	| "over_90"
	| "undated";

export type ReceivablesRow = {
	readonly patientId: string;
	readonly patientName: string;
	readonly debtRub: number;
	readonly oldestChargeAt: string | null;
	readonly bucket: ReceivablesBucket;
};

/** Пациент заплатил больше, чем ему назначено: клиника должна ему, а не он ей. */
export type ReceivablesPrepaymentRow = {
	readonly patientId: string;
	readonly patientName: string;
	readonly prepaidRub: number;
};

export type ReceivablesReport = {
	readonly rows: ReceivablesRow[];
	readonly totalDebtRub: number;
	readonly byBucket: Readonly<Record<ReceivablesBucket, number>>;
	/** Переплаты по каждому пациенту, суммой от крупной к мелкой. */
	readonly prepayments: ReceivablesPrepaymentRow[];
	/** Сколько всего клиника должна вернуть пациентам. */
	readonly totalPrepaidRub: number;
	readonly note: string;
	readonly isEmpty: boolean;
};

export type ScheduleLoadCell = {
	/** 1 — понедельник, 7 — воскресенье (ISO). */
	readonly weekday: number;
	readonly hour: number;
	readonly appointments: number;
	readonly bookedMinutes: number;
};

export type ScheduleLoadReport = {
	readonly cells: ScheduleLoadCell[];
	readonly busiestWeekday: number | null;
	readonly busiestHour: number | null;
	readonly isEmpty: boolean;
};
