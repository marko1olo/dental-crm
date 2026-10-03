/**
 * labScheduleIntegration.ts — Клиническая связка нарядов ЗТЛ с расписанием и визитами.
 *
 * Требования:
 * 1. В слоте записи пациента (Schedule Grid) и в карточке приёма (Visit) отображается статус наряда ЗТЛ:
 *    - «В лаборатории» (желтый / янтарный)
 *    - «Поступил в клинику» (зеленый / изумрудный)
 *    - «Просрочен» (красный / rose)
 * 2. Врач и администратор ДО визита видят, поступила ли работа из лаборатории!
 */

import { z } from "zod";

export const appointmentLabBadgeStateSchema = z.enum([
	"in_lab",          // «В лаборатории» — в производстве у техника, срок еще не наступил
	"ready_in_clinic", // «Поступил в клинику» — работа доставлена в клинику, готова к примерке/фиксации
	"overdue",         // «Просрочен» — плановый срок сдачи ЗТЛ истек, работа не поступила в клинику
]);
export type AppointmentLabBadgeState = z.infer<typeof appointmentLabBadgeStateSchema>;

export interface AppointmentLabStatusInfo {
	readonly state: AppointmentLabBadgeState;
	readonly labelRu: string;
	readonly shortLabelRu: string;
	readonly badgeClass: string;
	readonly borderClass: string;
	readonly textClass: string;
	readonly bgClass: string;
	readonly orderId?: string | undefined;
	readonly orderNumber?: string | undefined;
	readonly toothFdi?: string | null;
	readonly workTypeRu?: string | null;
	readonly materialRu?: string | null;
	readonly colorVita?: string | null;
	readonly dueDateIso?: string | null;
	readonly isOverdue: boolean;
	readonly daysOverdue: number;
}

export interface MinimalLabOrderForSchedule {
	readonly id?: string | null;
	readonly orderNumber?: string | null;
	readonly patientId?: string | null;
	readonly toothFdi?: string | null;
	readonly material?: string | null;
	readonly colorVita?: string | null;
	readonly status?: string | null;
	readonly stage?: string | null;
	readonly dueDate?: string | Date | null;
	readonly expectedDate?: string | Date | null;
	readonly receivedDate?: string | Date | null;
	readonly workType?: string | null;
}

/**
 * Нормализует дату к началу дня UTC для календарного сравнения дедлайнов.
 */
function normalizeDateToUtcMidnight(d: Date | string | number): number {
	const dateObj = typeof d === "string" || typeof d === "number" ? new Date(d) : d;
	if (Number.isNaN(dateObj.getTime())) return 0;
	return Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
}

/**
 * Оценивает статус наряда ЗТЛ для отображения в слоте записи календаря и в карте приёма.
 */
export function evaluateAppointmentLabStatus(
	order: MinimalLabOrderForSchedule | null | undefined,
	referenceDate: Date | string = new Date(),
): AppointmentLabStatusInfo | null {
	if (!order) return null;

	const rawStatus = (order.status || "").toLowerCase().trim();
	const rawStage = (order.stage || "").toLowerCase().trim();

	// Закрытые или отмененные наряды не требуют индикатора в текущем расписании
	if (
		rawStatus === "completed" ||
		rawStatus === "cancelled" ||
		rawStatus === "installed" ||
		rawStatus === "delivered_to_patient" ||
		rawStage === "patient_fixation"
	) {
		return null;
	}

	const orderId = order.id || undefined;
	const orderNumber =
		order.orderNumber || (order.id ? `ЗТЛ-${order.id.slice(0, 6).toUpperCase()}` : "ЗТЛ");

	// 1. Статус «Поступил в клинику» (работа уже в клинике, готова к приёму)
	const isReadyInClinic =
		rawStatus === "ready" ||
		rawStatus === "ready_in_clinic" ||
		rawStatus === "received" ||
		rawStatus === "delivered" ||
		rawStatus === "shipped" ||
		rawStage === "ready_in_clinic" ||
		rawStage === "ready_fixation" ||
		Boolean(order.receivedDate);

	if (isReadyInClinic) {
		return {
			state: "ready_in_clinic",
			labelRu: "Поступил в клинику",
			shortLabelRu: "В клинике",
			badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40",
			borderClass: "border-emerald-500",
			textClass: "text-emerald-700 dark:text-emerald-300",
			bgClass: "bg-emerald-500/15",
			orderId,
			orderNumber,
			toothFdi: order.toothFdi ?? null,
			workTypeRu: order.workType ?? null,
			materialRu: order.material ?? null,
			colorVita: order.colorVita ?? null,
			dueDateIso: order.dueDate ? new Date(order.dueDate).toISOString() : null,
			isOverdue: false,
			daysOverdue: 0,
		};
	}

	// 2. Проверка дедлайна сдачи ЗТЛ (Due Date)
	const rawDueDate = order.dueDate || order.expectedDate;
	const refMidnight = normalizeDateToUtcMidnight(referenceDate);
	const dueMidnight = rawDueDate ? normalizeDateToUtcMidnight(rawDueDate) : 0;

	const isOverdue = dueMidnight > 0 && refMidnight > dueMidnight;
	const daysOverdue = isOverdue
		? Math.max(1, Math.round((refMidnight - dueMidnight) / (24 * 3600 * 1000)))
		: 0;

	if (isOverdue) {
		return {
			state: "overdue",
			labelRu: `Просрочен на ${daysOverdue} дн. (не поступил из ЗТЛ)`,
			shortLabelRu: "Просрочен",
			badgeClass: "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/50",
			borderClass: "border-rose-500",
			textClass: "text-rose-700 dark:text-rose-300",
			bgClass: "bg-rose-500/20",
			orderId,
			orderNumber,
			toothFdi: order.toothFdi ?? null,
			workTypeRu: order.workType ?? null,
			materialRu: order.material ?? null,
			colorVita: order.colorVita ?? null,
			dueDateIso: rawDueDate ? new Date(rawDueDate).toISOString() : null,
			isOverdue: true,
			daysOverdue,
		};
	}

	// 3. Статус «В лаборатории» (в работе у техника, в пределах планового срока)
	return {
		state: "in_lab",
		labelRu: "В лаборатории (изготавливается)",
		shortLabelRu: "В ЗТЛ",
		badgeClass: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40",
		borderClass: "border-amber-500",
		textClass: "text-amber-800 dark:text-amber-300",
		bgClass: "bg-amber-500/15",
		orderId,
		orderNumber,
		toothFdi: order.toothFdi ?? null,
		workTypeRu: order.workType ?? null,
		materialRu: order.material ?? null,
		colorVita: order.colorVita ?? null,
		dueDateIso: rawDueDate ? new Date(rawDueDate).toISOString() : null,
		isOverdue: false,
		daysOverdue: 0,
	};
}

/**
 * Находит активный наряд ЗТЛ для пациента и вычисляет его статус готовности к визиту.
 */
export function getPatientActiveLabStatus(
	orders: readonly MinimalLabOrderForSchedule[] | null | undefined,
	patientId: string | null | undefined,
	appointmentDate: Date | string = new Date(),
): AppointmentLabStatusInfo | null {
	if (!orders || !patientId) return null;

	const matchingOrders = orders.filter((o) => o && o.patientId === patientId);
	if (matchingOrders.length === 0) return null;

	// Приоритет оценки:
	// 1. Просроченный наряд (overdue) — самый критический алерт для врача/администратора
	// 2. Готовый в клинике (ready_in_clinic)
	// 3. Находящийся в ЗТЛ (in_lab)
	let bestStatus: AppointmentLabStatusInfo | null = null;

	for (const order of matchingOrders) {
		const evaluated = evaluateAppointmentLabStatus(order, appointmentDate);
		if (!evaluated) continue;

		if (!bestStatus) {
			bestStatus = evaluated;
			continue;
		}

		if (evaluated.state === "overdue") {
			bestStatus = evaluated;
			break; // Критическая авария — максимальный приоритет
		}

		if (evaluated.state === "ready_in_clinic" && bestStatus.state !== "overdue") {
			bestStatus = evaluated;
		}
	}

	return bestStatus;
}
