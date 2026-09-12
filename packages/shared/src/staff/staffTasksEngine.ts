/**
 * packages/shared/src/staff/staffTasksEngine.ts
 * Clinic Staff Tasks & Clinical Assignment Engine.
 * Reverse-engineered and adapted from DentalPin (staff_tasks module) for DENTE Dental CRM.
 *
 * Wave 137 — Production Staff Tasks & Automated Clinical Assignments.
 *
 * Invariants:
 * - Strictly < 800 lines of code.
 * - 100% typed with strict Zod schemas.
 * - Zero mocks, zero synthetic stubs.
 * - Zero cartoon emojis in clinical/operational outputs (Mandate 8d point 7).
 * - Adheres to Doctor Autonomy (Mandate 8e) & Solo Doctor Sovereignty (Mandate 8n).
 */

import { z } from "zod";

// ============================================================================
// 1. SCHEMAS & TYPES
// ============================================================================

export const staffTaskStatusSchema = z.enum([
	"open",
	"claimed",
	"in_progress",
	"done",
	"cancelled",
]);
export type StaffTaskStatus = z.infer<typeof staffTaskStatusSchema>;

export const staffTaskPrioritySchema = z.enum([
	"low",
	"normal",
	"high",
	"urgent",
]);
export type StaffTaskPriority = z.infer<typeof staffTaskPrioritySchema>;

export const staffTaskCategorySchema = z.enum([
	"clinical",
	"reception",
	"sterilization",
	"lab",
	"inventory",
	"equipment",
]);
export type StaffTaskCategory = z.infer<typeof staffTaskCategorySchema>;

export const staffTaskRoleSchema = z.enum([
	"doctor",
	"assistant",
	"nurse",
	"admin",
	"all",
]);
export type StaffTaskRole = z.infer<typeof staffTaskRoleSchema>;

export const staffTaskSlaStatusSchema = z.enum([
	"on_track",
	"warning",
	"overdue",
]);
export type StaffTaskSlaStatus = z.infer<typeof staffTaskSlaStatusSchema>;

export const staffTaskItemSchema = z.object({
	id: z.string().min(1),
	clinicId: z.string().min(1),
	title: z.string().min(1).max(250),
	details: z.string().nullable().optional(),
	category: staffTaskCategorySchema,
	priority: staffTaskPrioritySchema,
	status: staffTaskStatusSchema,
	assignedRole: staffTaskRoleSchema,
	assigneeId: z.string().nullable().optional(),
	assigneeName: z.string().nullable().optional(),
	createdById: z.string().nullable().optional(),
	createdByName: z.string().nullable().optional(),
	patientId: z.string().nullable().optional(),
	dueDate: z.string().nullable().optional(),
	slaMinutes: z.number().int().nonnegative().nullable().optional(),
	completedAt: z.string().nullable().optional(),
	completedEvidence: z.string().nullable().optional(),
	createdAt: z.string(),
	updatedAt: z.string(),
});
export type StaffTaskItem = z.infer<typeof staffTaskItemSchema>;

// ============================================================================
// 2. RUSSIAN LABELS (LOCALIZATION DICTIONARIES)
// ============================================================================

export const STAFF_TASK_STATUS_LABELS_RU: Record<StaffTaskStatus, string> = {
	open: "Открыта",
	claimed: "Взята в работу",
	in_progress: "В процессе",
	done: "Выполнена",
	cancelled: "Отменена",
};

export const STAFF_TASK_PRIORITY_LABELS_RU: Record<StaffTaskPriority, string> = {
	low: "Низкий",
	normal: "Обычный",
	high: "Высокий",
	urgent: "Экстренный",
};

export const STAFF_TASK_CATEGORY_LABELS_RU: Record<StaffTaskCategory, string> = {
	clinical: "Клиническая помощь",
	reception: "Регистратура и сервис",
	sterilization: "Стерилизация и ЦСО",
	lab: "Зуботехническая лаборатория",
	inventory: "Склад и медикаменты",
	equipment: "Оборудование и ТО",
};

export const STAFF_TASK_ROLE_LABELS_RU: Record<StaffTaskRole, string> = {
	doctor: "Врач-стоматолог",
	assistant: "Ассистент врача",
	nurse: "Медицинская сестра",
	admin: "Администратор",
	all: "Любой сотрудник",
};

export const STAFF_TASK_SLA_LABELS_RU: Record<StaffTaskSlaStatus, string> = {
	on_track: "В графике",
	warning: "Истекает срок (<30 мин)",
	overdue: "Просрочено",
};

// ============================================================================
// 3. STATE MACHINE & TASK TRANSITIONS
// ============================================================================

const ALLOWED_TASK_TRANSITIONS: Record<StaffTaskStatus, readonly StaffTaskStatus[]> = {
	open: ["claimed", "in_progress", "done", "cancelled"],
	claimed: ["in_progress", "done", "cancelled", "open"],
	in_progress: ["done", "cancelled", "claimed", "open"],
	done: ["open"],
	cancelled: ["open"],
};

/**
 * Validates if the requested status transition is allowed by the staff task finite state machine.
 */
export function validateTaskStatusTransition(
	currentStatus: StaffTaskStatus,
	newStatus: StaffTaskStatus,
): boolean {
	if (currentStatus === newStatus) {
		return true;
	}
	const allowed = ALLOWED_TASK_TRANSITIONS[currentStatus];
	return allowed ? allowed.includes(newStatus) : false;
}

export interface TransitionTaskStatusOptions {
	actorId?: string | undefined;
	actorName?: string | undefined;
	completedEvidence?: string | undefined;
	now?: string | Date | undefined;
}

/**
 * Executes a verified state transition on a staff task item.
 * Throws an Error if the transition is prohibited.
 */
export function transitionTaskStatus(
	task: StaffTaskItem,
	newStatus: StaffTaskStatus,
	options?: TransitionTaskStatusOptions | undefined,
): StaffTaskItem {
	if (!validateTaskStatusTransition(task.status, newStatus)) {
		throw new Error(
			`Недопустимый переход статуса задачи из "${task.status}" в "${newStatus}"`,
		);
	}

	const isoNow = options?.now
		? (typeof options.now === "string" ? options.now : options.now.toISOString())
		: new Date().toISOString();

	const updated: StaffTaskItem = {
		...task,
		status: newStatus,
		updatedAt: isoNow,
	};

	if (newStatus === "done") {
		updated.completedAt = isoNow;
		if (options?.completedEvidence !== undefined) {
			updated.completedEvidence = options.completedEvidence;
		}
		if (options?.actorId && !updated.assigneeId) {
			updated.assigneeId = options.actorId;
			updated.assigneeName = options.actorName ?? null;
		}
	} else if (newStatus === "open") {
		updated.completedAt = null;
		updated.completedEvidence = null;
		if (!options?.actorId) {
			updated.assigneeId = null;
			updated.assigneeName = null;
		}
	} else if (newStatus === "claimed") {
		if (options?.actorId) {
			updated.assigneeId = options.actorId;
			updated.assigneeName = options.actorName ?? null;
		}
	}

	return updated;
}

/**
 * Automatically claims an open task on behalf of an employee.
 */
export function claimStaffTask(
	task: StaffTaskItem,
	employeeId: string,
	employeeName: string,
	now?: string | Date | undefined,
): StaffTaskItem {
	if (task.status === "done" || task.status === "cancelled") {
		throw new Error(
			`Невозможно взять в работу задачу в статусе "${STAFF_TASK_STATUS_LABELS_RU[task.status]}"`,
		);
	}

	const options: TransitionTaskStatusOptions = {
		actorId: employeeId,
		actorName: employeeName,
	};
	if (now !== undefined) {
		options.now = now;
	}

	return transitionTaskStatus(task, "claimed", options);
}

// ============================================================================
// 4. SLA COMPUTATION & OVERDUE MONITORING
// ============================================================================

/**
 * Computes SLA deadline and overdue status for a given task.
 * Returns:
 * - 'on_track': Within healthy time limits.
 * - 'warning': Remaining time is positive but <= 30 minutes before deadline.
 * - 'overdue': Deadline has passed.
 */
export function computeTaskSlaStatus(
	task: StaffTaskItem,
	currentTime: string | Date = new Date(),
): StaffTaskSlaStatus {
	if (task.status === "cancelled") {
		return "on_track";
	}

	let deadlineMs: number | null = null;

	if (task.dueDate) {
		if (task.dueDate.includes("T")) {
			deadlineMs = new Date(task.dueDate).getTime();
		} else {
			// Date only (e.g. YYYY-MM-DD), set to end of that calendar day
			deadlineMs = new Date(`${task.dueDate}T23:59:59.999Z`).getTime();
		}
	}

	if (task.slaMinutes != null && task.slaMinutes > 0 && task.createdAt) {
		const slaCalculatedMs =
			new Date(task.createdAt).getTime() + task.slaMinutes * 60 * 1000;
		if (deadlineMs === null || slaCalculatedMs < deadlineMs) {
			deadlineMs = slaCalculatedMs;
		}
	}

	if (deadlineMs === null || Number.isNaN(deadlineMs)) {
		return "on_track";
	}

	if (task.status === "done") {
		if (task.completedAt) {
			const completedMs = new Date(task.completedAt).getTime();
			return completedMs > deadlineMs ? "overdue" : "on_track";
		}
		return "on_track";
	}

	const currentMs =
		typeof currentTime === "string"
			? new Date(currentTime).getTime()
			: currentTime.getTime();

	const diffMinutes = (deadlineMs - currentMs) / (60 * 1000);

	if (diffMinutes < 0) {
		return "overdue";
	}
	if (diffMinutes <= 30) {
		return "warning";
	}
	return "on_track";
}

// ============================================================================
// 5. CLINICAL AUTOMATION TRIGGERS
// ============================================================================

export interface TriggerPayloadLabOrder {
	trigger: "lab_order_received";
	clinicId: string;
	patientId: string;
	patientName: string;
	patientPhone?: string;
	orderId: string;
	workTypeTitle: string;
	labName: string;
	createdById?: string;
	createdByName?: string;
}

export interface TriggerPayloadSterilization {
	trigger: "sterilization_cycle_complete";
	clinicId: string;
	autoclaveId: string;
	autoclaveName: string;
	cycleNumber: number | string;
	programName?: string;
	createdById?: string;
	createdByName?: string;
}

export interface TriggerPayloadInventory {
	trigger: "inventory_low_stock";
	clinicId: string;
	itemId: string;
	itemName: string;
	currentQuantity: number;
	minThreshold: number;
	unit: string;
	createdById?: string;
	createdByName?: string;
}

export interface TriggerPayloadRecall {
	trigger: "overdue_patient_recall";
	clinicId: string;
	patientId: string;
	patientName: string;
	patientPhone?: string;
	daysOverdue: number;
	lastVisitDate?: string;
	recommendedProcedure?: string;
	createdById?: string;
	createdByName?: string;
}

export type CreateTriggeredStaffTaskPayload =
	| TriggerPayloadLabOrder
	| TriggerPayloadSterilization
	| TriggerPayloadInventory
	| TriggerPayloadRecall;

function generateTaskId(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Creates an automated clinic staff task from standard clinical and operational events.
 */
export function createTriggeredStaffTask(
	payload: CreateTriggeredStaffTaskPayload,
	now: string | Date = new Date(),
): StaffTaskItem {
	const isoNow = typeof now === "string" ? now : now.toISOString();
	const baseId = generateTaskId();

	switch (payload.trigger) {
		case "lab_order_received": {
			const phoneInfo = payload.patientPhone ? `, тел: ${payload.patientPhone}` : "";
			const slaMinutes = 120; // 2 hours SLA for patient contact
			const dueMs = new Date(isoNow).getTime() + slaMinutes * 60 * 1000;

			return {
				id: baseId,
				clinicId: payload.clinicId,
				title: `Пригласить пациента ${payload.patientName}: поступила работа из ЗТЛ (${payload.workTypeTitle})`,
				details: `Заказ №${payload.orderId} от "${payload.labName}" доставлен в клинику. Необходимо связаться с пациентом (${payload.patientName}${phoneInfo}) и согласовать визит для примерки / постоянной фиксации ортопедической конструкции.`,
				category: "reception",
				priority: "high",
				status: "open",
				assignedRole: "admin",
				assigneeId: null,
				assigneeName: null,
				createdById: payload.createdById ?? null,
				createdByName: payload.createdByName ?? "Система (ЗТЛ Триггер)",
				patientId: payload.patientId,
				dueDate: new Date(dueMs).toISOString(),
				slaMinutes,
				completedAt: null,
				completedEvidence: null,
				createdAt: isoNow,
				updatedAt: isoNow,
			};
		}

		case "sterilization_cycle_complete": {
			const progInfo = payload.programName ? ` (режим: ${payload.programName})` : "";
			const slaMinutes = 30; // 30 mins to register azopyram test strip
			const dueMs = new Date(isoNow).getTime() + slaMinutes * 60 * 1000;

			return {
				id: baseId,
				clinicId: payload.clinicId,
				title: `Внести пробу азопирам/тест-полоски: цикл автоклава №${payload.cycleNumber} (${payload.autoclaveName})`,
				details: `Автоклав "${payload.autoclaveName}" успешно завершил цикл стерилизации №${payload.cycleNumber}${progInfo}. Медицинской сестре ЦСО необходимо зарегистрировать тест-полоски (интеграторы 4-5 класса) в журнале СанПиН 3.3686-21 и провести азопирамовую пробу.`,
				category: "sterilization",
				priority: "high",
				status: "open",
				assignedRole: "nurse",
				assigneeId: null,
				assigneeName: null,
				createdById: payload.createdById ?? null,
				createdByName: payload.createdByName ?? "Система (Автоклав Триггер)",
				patientId: null,
				dueDate: new Date(dueMs).toISOString(),
				slaMinutes,
				completedAt: null,
				completedEvidence: null,
				createdAt: isoNow,
				updatedAt: isoNow,
			};
		}

		case "inventory_low_stock": {
			const slaMinutes = 240; // 4 hours to submit purchase order
			const dueMs = new Date(isoNow).getTime() + slaMinutes * 60 * 1000;

			return {
				id: baseId,
				clinicId: payload.clinicId,
				title: `Сформировать заказ поставщику: критический остаток "${payload.itemName}"`,
				details: `Текущий остаток препарата/материала "${payload.itemName}" составляет ${payload.currentQuantity} ${payload.unit} (минимальный неснижаемый порог: ${payload.minThreshold} ${payload.unit}). Старшей медсестре / завскладом сформировать наряд-заказ поставщику для предотвращения дефицита.`,
				category: "inventory",
				priority: "urgent",
				status: "open",
				assignedRole: "nurse",
				assigneeId: null,
				assigneeName: null,
				createdById: payload.createdById ?? null,
				createdByName: payload.createdByName ?? "Система (Складской Триггер)",
				patientId: null,
				dueDate: new Date(dueMs).toISOString(),
				slaMinutes,
				completedAt: null,
				completedEvidence: null,
				createdAt: isoNow,
				updatedAt: isoNow,
			};
		}

		case "overdue_patient_recall": {
			const lastVisitInfo = payload.lastVisitDate ? ` Последний приём: ${payload.lastVisitDate}.` : "";
			const procInfo = payload.recommendedProcedure ? ` Рекомендовано: ${payload.recommendedProcedure}.` : "";
			const phoneInfo = payload.patientPhone ? ` (тел. ${payload.patientPhone})` : "";
			const slaMinutes = 480; // 8 hours (work shift)
			const dueMs = new Date(isoNow).getTime() + slaMinutes * 60 * 1000;

			return {
				id: baseId,
				clinicId: payload.clinicId,
				title: `Обзвон диспансерного пациента: ${payload.patientName} (просрочка ${payload.daysOverdue} дн.)`,
				details: `Диспансерный профилактический осмотр пациента ${payload.patientName} просрочен на ${payload.daysOverdue} дн.${lastVisitInfo}${procInfo} Администратору регистратуры связаться с пациентом${phoneInfo} и предложить запись на плановый приём.`,
				category: "reception",
				priority: "normal",
				status: "open",
				assignedRole: "admin",
				assigneeId: null,
				assigneeName: null,
				createdById: payload.createdById ?? null,
				createdByName: payload.createdByName ?? "Система (Recall Триггер)",
				patientId: payload.patientId,
				dueDate: new Date(dueMs).toISOString(),
				slaMinutes,
				completedAt: null,
				completedEvidence: null,
				createdAt: isoNow,
				updatedAt: isoNow,
			};
		}
	}
}

// ============================================================================
// 6. STATUTORY A4 DAILY STAFF TASKS LOG (STRICTLY 0 EMOJIS - MANDATE 8d POINT 7)
// ============================================================================

export interface FormatStaffTasksDailyLogA4Options {
	clinicName: string;
	date: string;
	tasks: readonly StaffTaskItem[];
	signedBy?: string;
	now?: string | Date;
}

/**
 * Formats a statutory A4 daily log of clinic staff assignments and operational tasks.
 * STRICTLY 0 cartoon emojis per Mandate 8d item 7!
 */
export function formatStaffTasksDailyLogA4(
	options: FormatStaffTasksDailyLogA4Options,
): string {
	const { clinicName, date, tasks, signedBy, now } = options;
	const currentIso = now
		? (typeof now === "string" ? now : now.toISOString())
		: new Date().toISOString();

	const totalTasks = tasks.length;
	const doneTasks = tasks.filter((t) => t.status === "done").length;
	const inProgressTasks = tasks.filter(
		(t) => t.status === "in_progress" || t.status === "claimed",
	).length;
	const openTasks = tasks.filter((t) => t.status === "open").length;
	const cancelledTasks = tasks.filter((t) => t.status === "cancelled").length;

	const overdueTasks = tasks.filter(
		(t) => computeTaskSlaStatus(t, currentIso) === "overdue",
	).length;

	const lines: string[] = [];

	lines.push("================================================================================");
	lines.push("          ЖУРНАЛ УЧЕТА ПРОИЗВОДСТВЕННЫХ ЗАДАЧ И ПОРУЧЕНИЙ ПЕРСОНАЛА             ");
	lines.push("           (СУТОЧНЫЙ РЕГЛАМЕНТНЫЙ ПРОТОКОЛ ОПЕРАЦИОННОЙ ДЕЯТЕЛЬНОСТИ)           ");
	lines.push("================================================================================");
	lines.push(`Организация: ${clinicName}`);
	lines.push(`Дата смены:  ${date}`);
	lines.push(`Время отчета: ${currentIso.replace("T", " ").slice(0, 19)} UTC`);
	lines.push("--------------------------------------------------------------------------------");
	lines.push("СВОДНЫЕ ПОКАЗАТЕЛИ СМЕНЫ:");
	lines.push(`  Всего зарегистрировано задач: ${totalTasks}`);
	lines.push(`  - Выполнено:                  ${doneTasks}`);
	lines.push(`  - В процессе / назначено:     ${inProgressTasks}`);
	lines.push(`  - Открыто (ожидают захвата):  ${openTasks}`);
	lines.push(`  - Отменено:                   ${cancelledTasks}`);
	lines.push(`  - С нарушением SLA (просрочено): ${overdueTasks}`);
	lines.push("================================================================================");
	lines.push("РЕЕСТР ЗАДАЧ И РЕЗУЛЬТАТЫ ВЫПОЛНЕНИЯ:");
	lines.push("--------------------------------------------------------------------------------");

	if (tasks.length === 0) {
		lines.push("  На указанную смену поручений и производственных задач не зарегистрировано.");
	} else {
		tasks.forEach((task, index) => {
			const slaStatus = computeTaskSlaStatus(task, currentIso);
			let slaMarker = "[В ГРАФИКЕ]";
			if (slaStatus === "overdue") {
				slaMarker = "[!] ПРОСРОЧЕНО";
			} else if (slaStatus === "warning") {
				slaMarker = "[?] ИСТЕКАЕТ СРОК";
			}

			const roleLabel = STAFF_TASK_ROLE_LABELS_RU[task.assignedRole] || task.assignedRole;
			const categoryLabel = STAFF_TASK_CATEGORY_LABELS_RU[task.category] || task.category;
			const priorityLabel = STAFF_TASK_PRIORITY_LABELS_RU[task.priority] || task.priority;
			const statusLabel = STAFF_TASK_STATUS_LABELS_RU[task.status] || task.status;

			lines.push(`№ ${index + 1}. [${task.id.slice(0, 8)}] ${task.title}`);
			lines.push(`    Категория:    ${categoryLabel} | Приоритет: ${priorityLabel}`);
			lines.push(`    Исполнитель:  ${roleLabel} -> ${task.assigneeName ? task.assigneeName : "Не назначен"}`);
			lines.push(`    Статус:       ${statusLabel.toUpperCase()} | SLA: ${slaMarker}`);

			if (task.dueDate) {
				lines.push(`    Дедлайн:      ${task.dueDate.replace("T", " ").slice(0, 19)}`);
			}
			if (task.details) {
				lines.push(`    Детали:       ${task.details}`);
			}
			if (task.status === "done") {
				lines.push(`    Завершено:    ${task.completedAt ? task.completedAt.replace("T", " ").slice(0, 19) : "Да"}`);
				if (task.completedEvidence) {
					lines.push(`    Подтверждение: ${task.completedEvidence}`);
				}
			}
			lines.push("--------------------------------------------------------------------------------");
		});
	}

	lines.push("");
	lines.push("ОТМЕТКИ О ПРОВЕРКЕ И ЗАКРЫТИИ СМЕНЫ:");
	lines.push(`Дежурный администратор / Старшая медсестра: ${signedBy ? signedBy : "_______________________ (подпись)"}`);
	lines.push("Штамп организации / Дата проверки:           [ М.П. ]      «____» ____________ 202_ г.");
	lines.push("================================================================================");
	lines.push("Конец суточного регламентного протокола поручений персонала.");

	return lines.join("\n");
}

// ============================================================================
// 7. LEGACY / DENTALPIN ADAPTERS & STATUS TRANSITION HELPERS
// ============================================================================

export const staffRoleSchema = z.enum([
	"doctor",
	"administrator",
	"assistant",
	"nurse",
	"coordinator",
	"technician",
	"management",
]);
export type StaffRole = z.infer<typeof staffRoleSchema>;

export const taskPrioritySchema = z.enum(["urgent", "normal", "low"]);
export type TaskPriority = z.infer<typeof taskPrioritySchema>;

export const taskStatusSchema = z.enum([
	"pending",
	"in_progress",
	"completed",
	"cancelled",
]);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export interface LegacyStaffTaskItem {
	id?: string | undefined;
	organizationId: string;
	clinicId?: string | null | undefined;
	title: string;
	description?: string | null | undefined;
	patientId?: string | null | undefined;
	patientFullName?: string | null | undefined;
	assignedStaffId?: string | null | undefined;
	assignedStaffName?: string | null | undefined;
	assignedRole?: StaffRole | null | undefined;
	priority: TaskPriority;
	status: TaskStatus;
	dueDate?: string | null | undefined;
	completedAt?: string | null | undefined;
	createdByStaffId?: string | null | undefined;
	createdAt?: string | undefined;
	updatedAt?: string | undefined;
}

export interface StaffTaskFilters {
	readonly role?: StaffRole | undefined;
	readonly staffId?: string | undefined;
	readonly status?: TaskStatus | undefined;
	readonly priority?: TaskPriority | undefined;
	readonly overdueOnly?: boolean | undefined;
	readonly patientId?: string | undefined;
}

/**
 * Validates allowed state transitions for clinic staff tasks (DentalPin compatibility).
 */
export function canTransitionStaffTaskStatus(
	current: TaskStatus,
	target: TaskStatus,
): boolean {
	if (current === target) return true;

	const transitions: Record<TaskStatus, TaskStatus[]> = {
		pending: ["in_progress", "completed", "cancelled"],
		in_progress: ["completed", "cancelled", "pending"],
		completed: ["pending"], // Re-opening
		cancelled: ["pending"],
	};

	return transitions[current]?.includes(target) ?? false;
}

/**
 * Determines whether a staff task is overdue relative to a reference date.
 */
export function isStaffTaskOverdue(
	task: LegacyStaffTaskItem | StaffTaskItem,
	now: Date = new Date(),
): boolean {
	if ("status" in task && (task.status === "completed" || task.status === "cancelled" || task.status === "done")) {
		return false;
	}
	if (!task.dueDate) return false;

	const todayIso = now.toISOString().slice(0, 10);
	return task.dueDate < todayIso;
}

/**
 * Filters and sorts staff tasks according to clinic operational criteria.
 */
export function filterStaffTasks(
	tasks: readonly LegacyStaffTaskItem[],
	filters: StaffTaskFilters = {},
	now: Date = new Date(),
): LegacyStaffTaskItem[] {
	return tasks.filter((task) => {
		if (filters.status && task.status !== filters.status) return false;
		if (filters.priority && task.priority !== filters.priority) return false;
		if (filters.role && task.assignedRole !== filters.role) return false;
		if (filters.staffId && task.assignedStaffId !== filters.staffId) return false;
		if (filters.patientId && task.patientId !== filters.patientId) return false;
		if (filters.overdueOnly && !isStaffTaskOverdue(task, now)) return false;
		return true;
	});
}
