/**
 * DentalLabOrderService.ts — Зуботехническая лаборатория (ЗТЛ), CAD/CAM
 * трекинг этапов изготовления ортопедических конструкций, контроль дедлайнов
 * и разделение себестоимости лабораторных заказ-нарядов.
 *
 * Feature #74: Лабораторные заказ-наряды зуботехнической лаборатории (ЗТЛ),
 * трекинг этапов и разделение расходов.
 *
 * ВОЗМОЖНОСТИ СЕРВИСА:
 * 1. Жизненный цикл и машина состояний заказ-нарядов ЗТЛ:
 *    - Статусы: 'draft' | 'sent_to_lab' | 'in_progress' | 'fitting_received' |
 *               'ready_for_installation' | 'installed_accepted' | 'rework_requested'.
 *    - Строгая валидация допустимости переходов (защита от перескока этапов,
 *      нельзя принять работу без отправки в лабораторию).
 *    - Аудит событий жизненного цикла (смена статуса, причины переделок/доработок,
 *      отметки примерок, комментарии техника и врача).
 *
 * 2. Финансовый расчет разделения себестоимости ЗТЛ (`computeLabExpenseSplit`):
 *    - Разделение расходов на лабораторию между клиникой и врачом-ортопедом
 *      согласно процентной ставке трудового договора (клиника % / врач %).
 *    - Копеечная точность на базе Decimal.js (ROUND_HALF_UP) с защитой от
 *      копеечного дисбаланса (penny drift invariant: clinic + doctor === total).
 *    - Расчет удержаний из начисленной заработной платы врача.
 *
 * 3. Контроль дедлайнов и оповещения о сроках:
 *    - Мониторинг даты промежуточной примерки (fitting date) и даты сдачи/фиксации (delivery date).
 *    - Детекция просрочек (overdue), критических сроков (<24ч) и приближения дедлайнов (<3 дней).
 *    - Формирование структурированных предупреждений для врача и куратора.
 */

import { Decimal } from "decimal.js";
import { z } from "zod";

// Высокая точность для финансовых вычислений без плавающей точки IEEE-754
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ─── 1. ТИПЫ И СТАТУСЫ ЗАКАЗ-НАРЯДОВ ЗТЛ ──────────────────────────────────────

export const DENTAL_LAB_ORDER_STATUSES = [
	"draft",
	"sent_to_lab",
	"in_progress",
	"fitting_received",
	"ready_for_installation",
	"installed_accepted",
	"rework_requested",
] as const;

export type DentalLabOrderStatus = (typeof DENTAL_LAB_ORDER_STATUSES)[number];

export const DENTAL_LAB_STATUS_LABELS: Readonly<Record<DentalLabOrderStatus, string>> = {
	draft: "Черновик заказ-наряда",
	sent_to_lab: "Отправлен в лабораторию",
	in_progress: "В производстве (CAD/CAM/Литье)",
	fitting_received: "Поступил на примерку",
	ready_for_installation: "Готов к установке (сдаче)",
	installed_accepted: "Установлен и принят пациентом",
	rework_requested: "Направлен на доработку/переделку",
} as const;

/**
 * Граф допустимых переходов жизненного цикла заказ-наряда ЗТЛ.
 * Защищает от логических нарушений (нельзя принять заказ без отправки,
 * нельзя установить не изготовленную конструкцию).
 */
export const DENTAL_LAB_STATUS_TRANSITIONS: Readonly<
	Record<DentalLabOrderStatus, readonly DentalLabOrderStatus[]>
> = {
	// Из черновика можно только отправить в лабораторию
	draft: ["sent_to_lab"],

	// Из отправленного лаборатория берет заказ в работу
	sent_to_lab: ["in_progress"],

	// Из работы лаборатория отправляет на промежуточную примерку или готовый заказ, либо фиксирует брак
	in_progress: ["fitting_received", "ready_for_installation", "rework_requested"],

	// После примерки в клинике: отправка на доработку, возврат в лабораторию на доводку/глазурь, либо готовность к сдаче
	fitting_received: [
		"in_progress",
		"ready_for_installation",
		"rework_requested",
		"sent_to_lab",
	],

	// Готовый к сдаче заказ: либо успешная фиксация в полости рта, либо запрос на переделку при дефектах
	ready_for_installation: ["installed_accepted", "rework_requested"],

	// При переделке заказ повторно передается в работу или пересылается в ЗТЛ с новыми оттисками/сканами
	rework_requested: ["sent_to_lab", "in_progress"],

	// Финальный завершенный статус (терминальное состояние успешной работы)
	installed_accepted: [],
} as const;

// ─── 2. ОШИБКИ И ИСКЛЮЧЕНИЯ СЕРВИСА ──────────────────────────────────────────

export type DentalLabOrderErrorCode =
	| "InvalidStatusTransition"
	| "InvalidExpenseAmount"
	| "InvalidPercentageSplit"
	| "InvalidOrderData"
	| "OrderAlreadyCompleted"
	| "DeadlineValidationError";

export class DentalLabOrderError extends Error {
	constructor(
		readonly code: DentalLabOrderErrorCode,
		message: string,
		readonly details?: Record<string, unknown> | undefined,
	) {
		super(message);
		this.name = "DentalLabOrderError";
	}
}

// ─── 3. ИНТЕРФЕЙСЫ ФИНАНСОВЫХ РАСЧЕТОВ ───────────────────────────────────────

export interface LabExpenseSplitResult {
	/** Общая стоимость лабораторных услуг (себестоимость ЗТЛ в рублях) */
	labCostRub: number;
	/** Доля клиники в % (0..100) */
	clinicSharePct: number;
	/** Доля врача в % (0..100) */
	doctorSharePct: number;
	/** Сумма расходов, относимая на клинику (в рублях, 2 знака) */
	clinicAmountRub: number;
	/** Сумма расходов, удерживаемая с врача (в рублях, 2 знака) */
	doctorAmountRub: number;
	/** Сумма расходов клиники в копейках */
	clinicAmountKopecks: number;
	/** Сумма расходов врача в копейках */
	doctorAmountKopecks: number;
	/** Общая сумма в копейках */
	totalKopecks: number;
	/** Проверка отсутствия копеечного дисбаланса: clinicAmountRub + doctorAmountRub === labCostRub */
	isBalanced: boolean;
}

export interface DoctorLabPayrollCalculation {
	/** Выручка врача по ортопедической услуге (руб) */
	grossRevenueRub: number;
	/** Базовая ставка начисления ЗП врача (% от выручки, например 25%) */
	doctorCommissionPct: number;
	/** Начисленный гонорар до вычета лаборатории (руб) */
	grossDoctorFeeRub: number;
	/** Себестоимость ЗТЛ (руб) */
	labCostRub: number;
	/** Доля лаборатории, удерживаемая с врача (% от себестоимости ЗТЛ) */
	doctorLabSharePct: number;
	/** Сумма удержания стоимости ЗТЛ с врача (руб) */
	labDeductionRub: number;
	/** Чистая выплата врачу к начислению (руб) */
	netDoctorPayoutRub: number;
}

// ─── 4. ИНТЕРФЕЙСЫ ДЕДЛАЙНОВ И ТРЕКИНГА ───────────────────────────────────────

export type DeadlineUrgencyLevel =
	| "normal"
	| "approaching"
	| "urgent"
	| "critical"
	| "overdue"
	| "completed";

export interface DentalLabOrderDeadlineInfo {
	id: string;
	orderNumber?: string | undefined;
	patientId: string;
	patientFullName?: string | undefined;
	doctorId?: string | undefined;
	doctorName?: string | undefined;
	status: DentalLabOrderStatus;
	createdAt: Date | string;
	/** Плановая дата промежуточной примерки */
	fittingDate?: Date | string | null | undefined;
	/** Плановая дата сдачи / окончательной установки работы */
	deliveryDate?: Date | string | null | undefined;
	/** Фактическая дата сдачи работы (если уже сдана) */
	completedAt?: Date | string | null | undefined;
}

export interface LabDeadlineAssessment {
	orderId: string;
	currentStatus: DentalLabOrderStatus;
	urgencyLevel: DeadlineUrgencyLevel;
	isFittingApproaching: boolean;
	isFittingOverdue: boolean;
	isDeliveryApproaching: boolean;
	isDeliveryOverdue: boolean;
	daysUntilFitting: number | null;
	hoursUntilFitting: number | null;
	daysUntilDelivery: number | null;
	hoursUntilDelivery: number | null;
	warningMessages: string[];
	requiresImmediateAction: boolean;
}

export interface StatusTransitionContext {
	actorUserId?: string | undefined;
	actorRole?: "doctor" | "technician" | "administrator" | "chief_physician" | "system" | undefined;
	reason?: string | undefined;
	notes?: string | undefined;
	timestamp?: Date | undefined;
	fittingSuccessful?: boolean | undefined;
	reworkDefectCategory?:
		| "shade_mismatch"
		| "occlusal_interference"
		| "marginal_gap"
		| "proximal_contact_tight"
		| "proximal_contact_open"
		| "aesthetic_shape_contour"
		| "impression_distortion"
		| "fracture_chipping"
		| "other"
		| undefined;
}

export interface LabOrderHistoryEntry {
	fromStatus: DentalLabOrderStatus | null;
	toStatus: DentalLabOrderStatus;
	changedAt: Date;
	actorUserId?: string | undefined;
	actorRole?: string | undefined;
	reason?: string | undefined;
	notes?: string | undefined;
}

export interface DentalLabOrderRecord {
	id: string;
	organizationId: string;
	patientId: string;
	patientFullName?: string | undefined;
	doctorId?: string | undefined;
	doctorName?: string | undefined;
	laboratoryName?: string | undefined;
	orderNumber: string;
	toothFdi?: string | undefined;
	restorationType?: string | undefined;
	material?: string | undefined;
	colorVita?: string | undefined;
	status: DentalLabOrderStatus;
	labCostRub: number;
	clinicSharePct: number;
	doctorSharePct: number;
	fittingDate?: Date | null | undefined;
	deliveryDate?: Date | null | undefined;
	clinicalNotes?: string | undefined;
	history: LabOrderHistoryEntry[];
	createdAt: Date;
	updatedAt: Date;
}

// ─── 5. СХЕМЫ ВАЛИДАЦИИ ZOD ──────────────────────────────────────────────────

export const labExpenseSplitInputSchema = z.object({
	labCostRub: z
		.union([z.number(), z.string(), z.instanceof(Decimal)])
		.refine(
			(val) => {
				try {
					const d = new Decimal(val instanceof Decimal ? val : val);
					return d.isFinite() && d.greaterThanOrEqualTo(0);
				} catch {
					return false;
				}
			},
			{ message: "Стоимость ЗТЛ должна быть неотрицательным конечным числом" },
		),
	clinicSharePct: z.number().min(0, "Доля клиники не может быть отрицательной").max(100, "Доля клиники не может превышать 100%"),
	doctorSharePct: z.number().min(0, "Доля врача не может быть отрицательной").max(100, "Доля врача не может превышать 100%"),
});

export const dentalLabOrderStatusSchema = z.enum(DENTAL_LAB_ORDER_STATUSES);

// ─── 6. ОСНОВНОЙ КЛАСС СЕРВИСА ───────────────────────────────────────────────

export class DentalLabOrderService {
	/**
	 * Валидация и округление суммы в рублях до 2 знаков (копеек).
	 */
	public static roundRub(amount: Decimal | number | string): number {
		const d = amount instanceof Decimal ? amount : new Decimal(amount);
		if (!d.isFinite()) {
			throw new DentalLabOrderError(
				"InvalidExpenseAmount",
				"Сумма должна быть конечным числом",
			);
		}
		return d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
	}

	/**
	 * Расчет разделения себестоимости лабораторного заказ-наряда ЗТЛ
	 * между клиникой и лечащим врачом с гарантией копеечной точности.
	 *
	 * @param labCostRub Себестоимость работ ЗТЛ в рублях (>= 0)
	 * @param clinicSharePct Доля клиники в процентах (0..100)
	 * @param doctorSharePct Доля врача в процентах (0..100)
	 * @returns Объект с суммами в рублях и копейках и подтверждением баланса
	 */
	public static computeLabExpenseSplit(
		labCostRub: number | string | Decimal,
		clinicSharePct: number,
		doctorSharePct: number,
	): LabExpenseSplitResult {
		// 1. Проверка входных данных через Zod
		const parsed = labExpenseSplitInputSchema.safeParse({
			labCostRub,
			clinicSharePct,
			doctorSharePct,
		});

		if (!parsed.success) {
			const issue = parsed.error.issues[0];
			throw new DentalLabOrderError(
				"InvalidExpenseAmount",
				issue?.message ?? "Некорректные параметры разделения расходов",
				{ issues: parsed.error.issues },
			);
		}

		// 2. Валидация суммы долей (должна быть строго 100%)
		const sumPct = new Decimal(clinicSharePct).plus(new Decimal(doctorSharePct));
		if (!sumPct.equals(100)) {
			throw new DentalLabOrderError(
				"InvalidPercentageSplit",
				`Сумма долей клиники (${clinicSharePct}%) и врача (${doctorSharePct}%) должна быть строго равна 100% (получено ${sumPct.toString()}%)`,
				{ clinicSharePct, doctorSharePct, sumPct: sumPct.toNumber() },
			);
		}

		const totalCost = new Decimal(labCostRub instanceof Decimal ? labCostRub : labCostRub);
		if (totalCost.isNegative()) {
			throw new DentalLabOrderError(
				"InvalidExpenseAmount",
				"Стоимость ЗТЛ не может быть отрицательной",
				{ labCostRub: totalCost.toNumber() },
			);
		}

		// Округляем общую стоимость до копеек
		const roundedTotalCost = totalCost.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
		const totalKopecks = roundedTotalCost.times(100).round().toNumber();

		if (roundedTotalCost.isZero()) {
			return {
				labCostRub: 0,
				clinicSharePct,
				doctorSharePct,
				clinicAmountRub: 0,
				doctorAmountRub: 0,
				clinicAmountKopecks: 0,
				doctorAmountKopecks: 0,
				totalKopecks: 0,
				isBalanced: true,
			};
		}

		// 3. Вычисление долей в копейках с защитой от копеечного дисбаланса (Penny drift protection)
		// Рассчитываем долю клиники в копейках с математическим округлением:
		const clinicKopecksDec = new Decimal(totalKopecks)
			.times(new Decimal(clinicSharePct))
			.dividedBy(100)
			.round();

		const clinicAmountKopecks = clinicKopecksDec.toNumber();
		// Доля врача рассчитывается как остаток от общей суммы в копейках,
		// что на 100% исключает потерю или появление лишней копейки при округлениях!
		const doctorAmountKopecks = totalKopecks - clinicAmountKopecks;

		const clinicAmountRub = new Decimal(clinicAmountKopecks).dividedBy(100).toNumber();
		const doctorAmountRub = new Decimal(doctorAmountKopecks).dividedBy(100).toNumber();
		const finalTotalRub = roundedTotalCost.toNumber();

		// Инвариант: clinicAmountRub + doctorAmountRub === finalTotalRub
		const isBalanced = clinicAmountKopecks + doctorAmountKopecks === totalKopecks;

		return {
			labCostRub: finalTotalRub,
			clinicSharePct,
			doctorSharePct,
			clinicAmountRub,
			doctorAmountRub,
			clinicAmountKopecks,
			doctorAmountKopecks,
			totalKopecks,
			isBalanced,
		};
	}

	/**
	 * Расчет начисления зарплаты врача с учетом вычета лабораторных расходов.
	 *
	 * Формула:
	 * 1. Gross Fee = Gross Revenue * (Doctor Commission % / 100)
	 * 2. Lab Deduction = Lab Cost * (Doctor Lab Share % / 100)
	 * 3. Net Payout = max(0, Gross Fee - Lab Deduction)
	 */
	public static calculateDoctorPayrollDeduction(
		grossRevenueRub: number,
		doctorCommissionPct: number,
		labCostRub: number,
		doctorLabSharePct: number,
	): DoctorLabPayrollCalculation {
		if (grossRevenueRub < 0 || labCostRub < 0) {
			throw new DentalLabOrderError(
				"InvalidExpenseAmount",
				"Суммы выручки и лаборатории не могут быть отрицательными",
			);
		}
		if (doctorCommissionPct < 0 || doctorCommissionPct > 100) {
			throw new DentalLabOrderError(
				"InvalidPercentageSplit",
				"Процент комиссии врача должен быть в диапазоне от 0 до 100",
			);
		}
		if (doctorLabSharePct < 0 || doctorLabSharePct > 100) {
			throw new DentalLabOrderError(
				"InvalidPercentageSplit",
				"Процент удержания ЗТЛ с врача должен быть в диапазоне от 0 до 100",
			);
		}

		const grossRevenueDec = new Decimal(grossRevenueRub).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
		const labCostDec = new Decimal(labCostRub).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

		const grossDoctorFee = grossRevenueDec
			.times(doctorCommissionPct)
			.dividedBy(100)
			.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

		const labDeduction = labCostDec
			.times(doctorLabSharePct)
			.dividedBy(100)
			.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

		const netPayoutDec = grossDoctorFee.minus(labDeduction);
		// Врач не может получить отрицательное начисление в рамках сдельной ведомости
		const finalNetPayout = netPayoutDec.isNegative() ? 0 : netPayoutDec.toNumber();

		return {
			grossRevenueRub: grossRevenueDec.toNumber(),
			doctorCommissionPct,
			grossDoctorFeeRub: grossDoctorFee.toNumber(),
			labCostRub: labCostDec.toNumber(),
			doctorLabSharePct,
			labDeductionRub: labDeduction.toNumber(),
			netDoctorPayoutRub: finalNetPayout,
		};
	}

	/**
	 * Проверка допустимости перехода статуса заказ-наряда.
	 */
	public static canTransition(
		currentStatus: DentalLabOrderStatus,
		targetStatus: DentalLabOrderStatus,
	): boolean {
		if (currentStatus === targetStatus) {
			return false; // Повторный переход в тот же статус не требуется
		}
		const allowed = DENTAL_LAB_STATUS_TRANSITIONS[currentStatus];
		return allowed ? allowed.includes(targetStatus) : false;
	}

	/**
	 * Получение списка разрешенных статусов для перехода.
	 */
	public static getAllowedTransitions(
		currentStatus: DentalLabOrderStatus,
	): readonly DentalLabOrderStatus[] {
		return DENTAL_LAB_STATUS_TRANSITIONS[currentStatus] ?? [];
	}

	/**
	 * Строгая валидация перехода статуса заказ-наряда.
	 * Выбрасывает исключение с детальным описанием при невалидном переходе.
	 */
	public static validateStatusTransition(
		currentStatus: DentalLabOrderStatus,
		targetStatus: DentalLabOrderStatus,
		context?: StatusTransitionContext,
	): void {
		if (!DENTAL_LAB_ORDER_STATUSES.includes(currentStatus)) {
			throw new DentalLabOrderError(
				"InvalidStatusTransition",
				`Неизвестный исходный статус заказ-наряда: "${currentStatus}"`,
				{ currentStatus, targetStatus },
			);
		}

		if (!DENTAL_LAB_ORDER_STATUSES.includes(targetStatus)) {
			throw new DentalLabOrderError(
				"InvalidStatusTransition",
				`Неизвестный целевой статус заказ-наряда: "${targetStatus}"`,
				{ currentStatus, targetStatus },
			);
		}

		if (currentStatus === "installed_accepted") {
			throw new DentalLabOrderError(
				"OrderAlreadyCompleted",
				"Заказ-наряд уже установлен и принят пациентом. Жизненный цикл завершен.",
				{ currentStatus, targetStatus },
			);
		}

		// Специфическое правило: нельзя принять заказ без отправки в лабораторию
		if (currentStatus === "draft" && (targetStatus === "installed_accepted" || targetStatus === "ready_for_installation" || targetStatus === "fitting_received")) {
			throw new DentalLabOrderError(
				"InvalidStatusTransition",
				`Недопустимый переход: невозможно перевести заказ из статуса "${DENTAL_LAB_STATUS_LABELS[currentStatus]}" сразу в "${DENTAL_LAB_STATUS_LABELS[targetStatus]}" без предварительной отправки в лабораторию ('sent_to_lab')`,
				{ currentStatus, targetStatus },
			);
		}

		const isAllowed = this.canTransition(currentStatus, targetStatus);
		if (!isAllowed) {
			const allowed = this.getAllowedTransitions(currentStatus);
			const allowedLabels = allowed.map((s) => `"${DENTAL_LAB_STATUS_LABELS[s]}" (${s})`).join(", ");
			throw new DentalLabOrderError(
				"InvalidStatusTransition",
				`Недопустимый переход статуса заказ-наряда из "${DENTAL_LAB_STATUS_LABELS[currentStatus]}" (${currentStatus}) в "${DENTAL_LAB_STATUS_LABELS[targetStatus]}" (${targetStatus}). Допустимые следующие статусы: ${allowedLabels || "нет (терминальное состояние)"}`,
				{
					currentStatus,
					targetStatus,
					allowedTransitions: allowed,
					context,
				},
			);
		}
	}

	/**
	 * Выполнение перехода статуса заказ-наряда с обновлением истории.
	 */
	public static transitionOrderStatus(
		order: DentalLabOrderRecord,
		newStatus: DentalLabOrderStatus,
		context?: StatusTransitionContext,
	): DentalLabOrderRecord {
		this.validateStatusTransition(order.status, newStatus, context);

		const now = context?.timestamp ?? new Date();
		const historyEntry: LabOrderHistoryEntry = {
			fromStatus: order.status,
			toStatus: newStatus,
			changedAt: now,
		};

		if (context?.actorUserId !== undefined) historyEntry.actorUserId = context.actorUserId;
		if (context?.actorRole !== undefined) historyEntry.actorRole = context.actorRole;
		if (context?.reason !== undefined) historyEntry.reason = context.reason;
		if (context?.notes !== undefined) historyEntry.notes = context.notes;

		return {
			...order,
			status: newStatus,
			history: [...order.history, historyEntry],
			updatedAt: now,
		};
	}

	/**
	 * Оценка дедлайнов заказ-наряда ЗТЛ (примерка и окончательная сдача).
	 *
	 * @param order Данные о сроках и статусе заказ-наряда
	 * @param referenceDate Дата, относительно которой оцениваются сроки (по умолчанию текущий момент)
	 * @param warningThresholdDays Порог приближения дедлайна в днях (по умолчанию 3 дня)
	 */
	public static evaluateDeadlines(
		order: DentalLabOrderDeadlineInfo,
		referenceDate: Date | string = new Date(),
		warningThresholdDays = 3,
	): LabDeadlineAssessment {
		const now = typeof referenceDate === "string" ? new Date(referenceDate) : referenceDate;
		const nowMs = now.getTime();

		if (Number.isNaN(nowMs)) {
			throw new DentalLabOrderError(
				"DeadlineValidationError",
				"Некорректная дата отсчета для оценки дедлайна",
			);
		}

		const warnings: string[] = [];
		let urgencyLevel: DeadlineUrgencyLevel = "normal";

		// Если заказ уже успешно завершен
		if (order.status === "installed_accepted") {
			return {
				orderId: order.id,
				currentStatus: order.status,
				urgencyLevel: "completed",
				isFittingApproaching: false,
				isFittingOverdue: false,
				isDeliveryApproaching: false,
				isDeliveryOverdue: false,
				daysUntilFitting: null,
				hoursUntilFitting: null,
				daysUntilDelivery: null,
				hoursUntilDelivery: null,
				warningMessages: [],
				requiresImmediateAction: false,
			};
		}

		// 1. Анализ даты примерки (Fitting Date)
		let daysUntilFitting: number | null = null;
		let hoursUntilFitting: number | null = null;
		let isFittingApproaching = false;
		let isFittingOverdue = false;

		if (order.fittingDate) {
			const fittingDate = typeof order.fittingDate === "string" ? new Date(order.fittingDate) : order.fittingDate;
			const fittingMs = fittingDate.getTime();

			if (!Number.isNaN(fittingMs)) {
				const diffMs = fittingMs - nowMs;
				hoursUntilFitting = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
				daysUntilFitting = Math.round((diffMs / (1000 * 60 * 60 * 24)) * 10) / 10;

				// Проверяем статус: если примерка еще не поступила в клинику
				const fittingNotDone = order.status === "draft" || order.status === "sent_to_lab" || order.status === "in_progress";

				if (fittingNotDone) {
					if (diffMs < 0) {
						isFittingOverdue = true;
						urgencyLevel = "overdue";
						const overdueDays = Math.abs(daysUntilFitting);
						warnings.push(
							`Просрочена дата примерки на ${overdueDays} дн. (план: ${fittingDate.toLocaleDateString("ru-RU")}). Статус: ${DENTAL_LAB_STATUS_LABELS[order.status]}`,
						);
					} else if (diffMs <= 24 * 60 * 60 * 1000) {
						isFittingApproaching = true;
						urgencyLevel = "critical";
						warnings.push(
							`Срочно: до примерки осталось менее 24 часов (${hoursUntilFitting} ч., дата: ${fittingDate.toLocaleDateString("ru-RU")})`,
						);
					} else if (diffMs <= warningThresholdDays * 24 * 60 * 60 * 1000) {
						isFittingApproaching = true;
						urgencyLevel = "urgent";
						warnings.push(
							`Приближается дата примерки: осталось ${daysUntilFitting} дн. (план: ${fittingDate.toLocaleDateString("ru-RU")})`,
						);
					}
				}
			}
		}

		// 2. Анализ даты окончательной сдачи (Delivery Date)
		let daysUntilDelivery: number | null = null;
		let hoursUntilDelivery: number | null = null;
		let isDeliveryApproaching = false;
		let isDeliveryOverdue = false;

		if (order.deliveryDate) {
			const deliveryDate = typeof order.deliveryDate === "string" ? new Date(order.deliveryDate) : order.deliveryDate;
			const deliveryMs = deliveryDate.getTime();

			if (!Number.isNaN(deliveryMs)) {
				const diffMs = deliveryMs - nowMs;
				hoursUntilDelivery = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
				daysUntilDelivery = Math.round((diffMs / (1000 * 60 * 60 * 24)) * 10) / 10;

				if (diffMs < 0) {
					isDeliveryOverdue = true;
					urgencyLevel = "overdue";
					const overdueDays = Math.abs(daysUntilDelivery);
					warnings.push(
						`Критическая просрочка сдачи работы на ${overdueDays} дн. (дедлайн сдачи: ${deliveryDate.toLocaleDateString("ru-RU")}). Текущий этап: ${DENTAL_LAB_STATUS_LABELS[order.status]}`,
					);
				} else if (diffMs <= 24 * 60 * 60 * 1000) {
					isDeliveryApproaching = true;
					if (urgencyLevel !== "overdue") urgencyLevel = "critical";
					warnings.push(
						`Внимание: дедлайн сдачи работы пациенту истекает через ${hoursUntilDelivery} ч. (${deliveryDate.toLocaleDateString("ru-RU")})`,
					);
				} else if (diffMs <= warningThresholdDays * 24 * 60 * 60 * 1000) {
					isDeliveryApproaching = true;
					if (urgencyLevel === "normal") urgencyLevel = "approaching";
					warnings.push(
						`Приближение дедлайна сдачи: осталось ${daysUntilDelivery} дн. (план: ${deliveryDate.toLocaleDateString("ru-RU")})`,
					);
				}
			}
		}

		const requiresImmediateAction =
			isFittingOverdue || isDeliveryOverdue || urgencyLevel === "critical" || urgencyLevel === "overdue";

		return {
			orderId: order.id,
			currentStatus: order.status,
			urgencyLevel,
			isFittingApproaching,
			isFittingOverdue,
			isDeliveryApproaching,
			isDeliveryOverdue,
			daysUntilFitting,
			hoursUntilFitting,
			daysUntilDelivery,
			hoursUntilDelivery,
			warningMessages: warnings,
			requiresImmediateAction,
		};
	}

	/**
	 * Фильтрация заказов, требующих внимания (срочные, критические, просроченные).
	 */
	public static filterUrgentOrders(
		orders: DentalLabOrderDeadlineInfo[],
		referenceDate: Date | string = new Date(),
		warningThresholdDays = 3,
	): Array<{ order: DentalLabOrderDeadlineInfo; assessment: LabDeadlineAssessment }> {
		const results: Array<{ order: DentalLabOrderDeadlineInfo; assessment: LabDeadlineAssessment }> = [];

		for (const order of orders) {
			const assessment = this.evaluateDeadlines(order, referenceDate, warningThresholdDays);
			if (assessment.requiresImmediateAction || (assessment.urgencyLevel !== "normal" && assessment.urgencyLevel !== "completed")) {
				results.push({ order, assessment });
			}
		}

		// Сортировка по степени критичности: overdue -> critical -> urgent -> approaching
		const priorityMap: Record<DeadlineUrgencyLevel, number> = {
			overdue: 1,
			critical: 2,
			urgent: 3,
			approaching: 4,
			normal: 5,
			completed: 6,
		};

		results.sort((a, b) => priorityMap[a.assessment.urgencyLevel] - priorityMap[b.assessment.urgencyLevel]);

		return results;
	}
}
