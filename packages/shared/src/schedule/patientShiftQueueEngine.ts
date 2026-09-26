/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Patient Shift Queue & Live Operational Board Engine
 * StomX Operational Shift Queue Parity (Мандаты 8c, 8d, 8e, 8n)
 *
 * Core Functional Capabilities:
 * 1. Operational Shift Queue Categorization:
 *    - «Все на сегодня (XX)»
 *    - «Ожидают в холле / Пришли (XX)» — with wait timer («Ждет 8 мин», yellow/red when >15 min).
 *    - «В кресле у врача (XX)» — with appointment duration timer.
 *    - «Ожидают расчета на кассе (XX)».
 *    - «Прием завершен (XX)».
 * 2. 1-Click Status Progression Pipeline:
 *    - Reception: «Пациент пришел» -> status = 'arrived' (ожидает в холле).
 *    - Doctor: in doctor chair notification («Пациент в холле»), 1-click «Пригласить в кабинет» -> status = 'in_chair'.
 *    - Doctor/assistant: «Завершить прием и отправить на кассу» -> status = 'ready_for_checkout'.
 *    - Reception/cashier: «Чек пробит» -> status = 'completed'.
 * 3. Exact ISO Date & Live Timer Calculations (Integer Minutes, Zero Divide Safety).
 * 4. 100% Strict Russian Terminology & Zero Emojis (Mandate 8d).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Appointment, AppointmentStatus } from "../index.js";
import {
	type ChairDurationSeverity,
	type PatientOperationalStatus,
	type PatientQueueAction,
	type PatientQueueActionId,
	type PatientQueueItem,
	type PatientShiftQueueOptions,
	type PatientShiftQueueResult,
	type PatientShiftQueueSummary,
	type PatientShiftQueueTab,
	type QueueActionRole,
	type WaitSeverity,
	OPERATIONAL_STATUS_META,
	PATIENT_SHIFT_QUEUE_TABS_META,
	chairDurationSeveritySchema,
	patientOperationalStatusSchema,
	patientQueueActionIdSchema,
	patientQueueActionSchema,
	patientShiftQueueTabSchema,
	queueActionRoleSchema,
	waitSeveritySchema,
} from "./patientShiftQueueTypes.js";

export * from "./patientShiftQueueTypes.js";


// ─────────────────────────────────────────────────────────────────────────────
// 3. OPERATIONAL STATUS RESOLUTION & DB MAPPING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves an appointment's raw status and comments into canonical PatientOperationalStatus.
 * Handles synonyms:
 * - in_chair / in_treatment / in_progress -> 'in_chair'
 * - arrived / waiting -> 'arrived'
 * - ready_for_checkout / payment_pending / [ready_for_checkout] -> 'ready_for_checkout'
 * - completed / done -> 'completed'
 */
export function resolveOperationalStatus(
	rawStatus: string | null | undefined,
	comment?: string | null,
	_visitStatus?: string | null,
): PatientOperationalStatus {
	const normalized = String(rawStatus || "").trim().toLowerCase();
	const commentStr = String(comment || "").toLowerCase();

	// Explicit checkout marker in comment or status
	if (
		normalized === "ready_for_checkout" ||
		normalized === "payment_pending" ||
		normalized === "waiting_payment" ||
		commentStr.includes("[ready_for_checkout]") ||
		commentStr.includes("[ожидает расчета]") ||
		commentStr.includes("[на кассу]")
	) {
		return "ready_for_checkout";
	}

	if (
		normalized === "in_chair" ||
		normalized === "in_treatment" ||
		normalized === "in_progress"
	) {
		return "in_chair";
	}

	if (normalized === "arrived" || normalized === "waiting") {
		return "arrived";
	}

	if (
		normalized === "completed" ||
		normalized === "done" ||
		normalized === "finished" ||
		normalized === "paid"
	) {
		return "completed";
	}

	if (normalized === "cancelled" || normalized === "canceled") {
		return "cancelled";
	}

	if (normalized === "no_show" || normalized === "noshow") {
		return "no_show";
	}

	if (normalized === "confirmed") {
		return "confirmed";
	}

	return "planned";
}

/**
 * Maps operational status to PostgreSQL enum appointment_status.
 * Note: 'in_chair' and 'ready_for_checkout' are safely represented in DB as 'in_treatment'.
 */
export function mapOperationalStatusToDbStatus(
	operationalStatus: PatientOperationalStatus,
): AppointmentStatus {
	switch (operationalStatus) {
		case "arrived":
			return "arrived";
		case "in_chair":
			return "in_treatment";
		case "ready_for_checkout":
			return "in_treatment";
		case "completed":
			return "completed";
		case "cancelled":
			return "cancelled";
		case "no_show":
			return "no_show";
		case "confirmed":
			return "confirmed";
		case "planned":
		default:
			return "planned";
	}
}

/**
 * Maps operational status to queue tab.
 */
export function mapOperationalStatusToQueueTab(
	status: PatientOperationalStatus,
): "waiting" | "in_chair" | "checkout" | "completed" | "scheduled" | "cancelled" {
	switch (status) {
		case "arrived":
			return "waiting";
		case "in_chair":
			return "in_chair";
		case "ready_for_checkout":
			return "checkout";
		case "completed":
			return "completed";
		case "cancelled":
		case "no_show":
			return "cancelled";
		case "planned":
		case "confirmed":
		default:
			return "scheduled";
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. WAIT & DURATION TIMERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formats wait time in Russian without emojis.
 * Example: 8 -> "Ждет 8 мин", 21 -> "Ждет 21 мин"
 */
export function formatWaitTimeRu(minutes: number): string {
	const safeMin = Math.max(0, Math.floor(minutes));
	if (safeMin === 0) return "Только что прибыл";
	return `Ждет ${safeMin} мин`;
}

/**
 * Calculates waiting time in the hall.
 * - waitMinutes: integer minutes elapsed
 * - severity:
 *     * <= 15 min: 'normal'
 *     * 16..30 min: 'warning' (желтый)
 *     * > 30 min: 'critical' (красный)
 */
export function calculateWaitTime(
	startsAt: string,
	arrivedAtIso?: string | null,
	nowMs: number = Date.now(),
): { waitMinutes: number; waitSeverity: WaitSeverity; waitFormatted: string } {
	let arrivalMs: number;
	if (arrivedAtIso) {
		const parsed = new Date(arrivedAtIso).getTime();
		arrivalMs = Number.isFinite(parsed) ? parsed : new Date(startsAt).getTime();
	} else {
		// Operational default: if arrived, patient arrived at or shortly before appointment
		const scheduledMs = new Date(startsAt).getTime();
		arrivalMs = Number.isFinite(scheduledMs) ? scheduledMs : nowMs;
	}

	const elapsedMs = Math.max(0, nowMs - arrivalMs);
	const waitMinutes = Math.floor(elapsedMs / 60000);

	let waitSeverity: WaitSeverity = "normal";
	if (waitMinutes > 30) {
		waitSeverity = "critical";
	} else if (waitMinutes > 15) {
		waitSeverity = "warning";
	}

	return {
		waitMinutes,
		waitSeverity,
		waitFormatted: formatWaitTimeRu(waitMinutes),
	};
}

/**
 * Formats chair duration in Russian without emojis.
 * Example: (24, 30) -> "В кресле 24 мин (из 30)"
 */
export function formatChairDurationRu(
	durationMinutes: number,
	plannedDurationMinutes?: number,
): string {
	const safeMin = Math.max(0, Math.floor(durationMinutes));
	if (plannedDurationMinutes && plannedDurationMinutes > 0) {
		return `В кресле ${safeMin} мин (из ${plannedDurationMinutes})`;
	}
	return `В кресле ${safeMin} мин`;
}

/**
 * Calculates chair duration and overtime.
 */
export function calculateChairDuration(
	startsAt: string,
	endsAt: string,
	inChairSinceIso?: string | null,
	nowMs: number = Date.now(),
): {
	chairDurationMinutes: number;
	chairDurationSeverity: ChairDurationSeverity;
	chairDurationFormatted: string;
	isOvertime: boolean;
	overtimeMinutes: number;
	plannedDurationMinutes: number;
} {
	const startsMs = new Date(startsAt).getTime();
	const endsMs = new Date(endsAt).getTime();
	const plannedDurationMinutes =
		Number.isFinite(startsMs) && Number.isFinite(endsMs) && endsMs > startsMs
			? Math.round((endsMs - startsMs) / 60000)
			: 30;

	let chairStartMs = startsMs;
	if (inChairSinceIso) {
		const parsed = new Date(inChairSinceIso).getTime();
		if (Number.isFinite(parsed)) chairStartMs = parsed;
	}

	const elapsedMs = Math.max(0, nowMs - (Number.isFinite(chairStartMs) ? chairStartMs : nowMs));
	const chairDurationMinutes = Math.floor(elapsedMs / 60000);

	const isOvertime = chairDurationMinutes > plannedDurationMinutes;
	const overtimeMinutes = isOvertime ? chairDurationMinutes - plannedDurationMinutes : 0;

	let chairDurationSeverity: ChairDurationSeverity = "normal";
	if (overtimeMinutes > 15) {
		chairDurationSeverity = "overtime";
	} else if (overtimeMinutes > 0) {
		chairDurationSeverity = "warning";
	}

	return {
		chairDurationMinutes,
		chairDurationSeverity,
		chairDurationFormatted: formatChairDurationRu(
			chairDurationMinutes,
			plannedDurationMinutes,
		),
		isOvertime,
		overtimeMinutes,
		plannedDurationMinutes,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. 1-CLICK PROGRESSION ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns available primary and secondary 1-click status actions for an appointment.
 */
export function getAvailableQueueActions(
	status: PatientOperationalStatus,
): { primaryAction: PatientQueueAction | null; secondaryActions: PatientQueueAction[] } {
	switch (status) {
		case "planned":
		case "confirmed":
			return {
				primaryAction: {
					actionId: "mark_arrived",
					labelRu: "Пациент пришел",
					targetStatus: "arrived",
					roleRu: "Ресепшен",
					role: "reception",
					buttonVariant: "primary",
					iconName: "UserCheck",
					descriptionRu: "Пациент явился в клинику, ожидает вызова в холле",
				},
				secondaryActions: [
					{
						actionId: "mark_cancelled",
						labelRu: "Отменить запись",
						targetStatus: "cancelled",
						roleRu: "Ресепшен",
						role: "reception",
						buttonVariant: "secondary",
						iconName: "XCircle",
					},
					{
						actionId: "mark_no_show",
						labelRu: "Не явился",
						targetStatus: "no_show",
						roleRu: "Ресепшен",
						role: "reception",
						buttonVariant: "secondary",
						iconName: "UserX",
					},
				],
			};

		case "arrived":
			return {
				primaryAction: {
					actionId: "invite_to_chair",
					labelRu: "Пригласить в кабинет",
					targetStatus: "in_chair",
					roleRu: "Врач",
					role: "doctor",
					buttonVariant: "success",
					iconName: "DoorOpen",
					descriptionRu: "Пациент заходит в кабинет и садится в кресло",
				},
				secondaryActions: [
					{
						actionId: "revert_to_waiting",
						labelRu: "Вернуть в план",
						targetStatus: "confirmed",
						roleRu: "Ресепшен",
						role: "reception",
						buttonVariant: "secondary",
						iconName: "RotateCcw",
					},
					{
						actionId: "mark_no_show",
						labelRu: "Не дождался / Ушел",
						targetStatus: "no_show",
						roleRu: "Ресепшен",
						role: "reception",
						buttonVariant: "secondary",
						iconName: "UserX",
					},
				],
			};

		case "in_chair":
			return {
				primaryAction: {
					actionId: "send_to_checkout",
					labelRu: "Завершить прием и отправить на кассу",
					targetStatus: "ready_for_checkout",
					roleRu: "Врач",
					role: "doctor",
					buttonVariant: "warning",
					iconName: "CreditCard",
					descriptionRu: "Прием завершен, пациент направлен на кассу для оплаты",
				},
				secondaryActions: [
					{
						actionId: "revert_to_waiting",
						labelRu: "Вернуть в холл",
						targetStatus: "arrived",
						roleRu: "Врач",
						role: "doctor",
						buttonVariant: "secondary",
						iconName: "RotateCcw",
					},
					{
						actionId: "complete_checkout",
						labelRu: "Завершить прием (без кассы)",
						targetStatus: "completed",
						roleRu: "Врач",
						role: "doctor",
						buttonVariant: "secondary",
						iconName: "CheckCircle2",
					},
				],
			};

		case "ready_for_checkout":
			return {
				primaryAction: {
					actionId: "complete_checkout",
					labelRu: "Чек пробит",
					targetStatus: "completed",
					roleRu: "Кассир",
					role: "cashier",
					buttonVariant: "success",
					iconName: "CheckCircle2",
					descriptionRu: "Оплата принята, чек 54-ФЗ пробит, визит закрыт",
				},
				secondaryActions: [
					{
						actionId: "revert_to_chair",
						labelRu: "Вернуть в кресло",
						targetStatus: "in_chair",
						roleRu: "Врач",
						role: "doctor",
						buttonVariant: "secondary",
						iconName: "RotateCcw",
					},
				],
			};

		case "completed":
			return {
				primaryAction: null,
				secondaryActions: [
					{
						actionId: "revert_to_chair",
						labelRu: "Возобновить прием",
						targetStatus: "in_chair",
						roleRu: "Врач",
						role: "doctor",
						buttonVariant: "secondary",
						iconName: "RotateCcw",
					},
				],
			};

		case "cancelled":
		case "no_show":
		default:
			return {
				primaryAction: {
					actionId: "revert_to_waiting",
					labelRu: "Восстановить запись",
					targetStatus: "planned",
					roleRu: "Ресепшен",
					role: "reception",
					buttonVariant: "secondary",
					iconName: "RotateCcw",
				},
				secondaryActions: [],
			};
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. TIME FORMATTING HELPER
// ─────────────────────────────────────────────────────────────────────────────

export function formatTimeRangeRu(startsAt: string, endsAt: string): string {
	try {
		const s = new Date(startsAt);
		const e = new Date(endsAt);
		if (!Number.isFinite(s.getTime()) || !Number.isFinite(e.getTime())) {
			return "";
		}
		const sH = String(s.getHours()).padStart(2, "0");
		const sM = String(s.getMinutes()).padStart(2, "0");
		const eH = String(e.getHours()).padStart(2, "0");
		const eM = String(e.getMinutes()).padStart(2, "0");
		return `${sH}:${sM} – ${eH}:${eM}`;
	} catch {
		return "";
	}
}

function extractDateKey(isoString: string): string {
	try {
		const d = new Date(isoString);
		if (!Number.isFinite(d.getTime())) return "";
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, "0");
		const day = String(d.getDate()).padStart(2, "0");
		return `${y}-${m}-${day}`;
	} catch {
		return "";
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. BUILD PATIENT SHIFT QUEUE (MAIN CALCULATION ENGINE)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the complete live shift queue data structure for the today queue board.
 */
export function buildPatientShiftQueue(
	appointments: Array<
		(Omit<Partial<Appointment>, "status"> & {
			status?: AppointmentStatus | PatientOperationalStatus | string | null;
		}) &
			Record<string, any>
	>,
	options: PatientShiftQueueOptions = {},
): PatientShiftQueueResult {
	const nowMs = options.nowMs ?? Date.now();
	const todayDateKey =
		options.targetDateKey || extractDateKey(new Date(nowMs).toISOString());

	const queueItems: PatientQueueItem[] = [];

	for (const apt of appointments) {
		if (!apt || !apt.id) continue;
		const startsAt = String(apt.startsAt || "");
		if (!startsAt) continue;

		// Filter for target date
		const aptDateKey = extractDateKey(startsAt);
		if (todayDateKey && aptDateKey && aptDateKey !== todayDateKey) {
			continue;
		}

		// Doctor & Chair filters if specified
		if (
			options.selectedDoctorId &&
			apt.doctorUserId &&
			apt.doctorUserId !== options.selectedDoctorId
		) {
			continue;
		}
		if (
			options.selectedChairId &&
			apt.chairId &&
			apt.chairId !== options.selectedChairId
		) {
			continue;
		}

		const endsAt = String(apt.endsAt || startsAt);
		const rawStatus = String(apt.status || "");
		const operationalStatus = resolveOperationalStatus(
			rawStatus,
			apt.comment,
			apt.visitStatus,
		);
		const queueTab = mapOperationalStatusToQueueTab(operationalStatus);

		// Resolve patient info
		let patientName = apt.patientName || apt.patientFullName || "";
		let patientPhone = apt.patientPhone || "";
		if (apt.patientId && options.patientsById) {
			const p = options.patientsById.get(apt.patientId);
			if (p) {
				patientName = p.fullName || p.name || patientName;
				patientPhone = p.phone || patientPhone;
			}
		}
		if (!patientName) patientName = "Пациент клиники";

		// Resolve doctor info
		let doctorName = apt.doctorName || apt.doctorShortName || "";
		let doctorSpecialty: string | null = null;
		if (apt.doctorUserId && options.staffById) {
			const staff = options.staffById.get(apt.doctorUserId);
			if (staff) {
				doctorName = staff.name || staff.fullName || doctorName;
				doctorSpecialty = staff.specialty ?? null;
			}
		}
		if (!doctorName) doctorName = "Врач-стоматолог";

		// Resolve chair info
		let chairName = apt.chairName || "";
		if (apt.chairId && options.chairsById) {
			const c = options.chairsById.get(apt.chairId);
			if (c) {
				chairName = c.name || c.title || chairName;
			}
		}
		if (!chairName) chairName = "Кабинет";

		// Timers calculation
		let waitMinutes: number | null = null;
		let waitSeverity: WaitSeverity | null = null;
		let waitFormatted: string | null = null;

		if (operationalStatus === "arrived") {
			const waitCalc = calculateWaitTime(startsAt, apt.arrivedAt, nowMs);
			waitMinutes = waitCalc.waitMinutes;
			waitSeverity = waitCalc.waitSeverity;
			waitFormatted = waitCalc.waitFormatted;
		}

		let chairDurationMinutes: number | null = null;
		let chairDurationSeverity: ChairDurationSeverity | null = null;
		let chairDurationFormatted: string | null = null;
		let isOvertime = false;
		let overtimeMinutes = 0;
		const startsMs = new Date(startsAt).getTime();
		const endsMs = new Date(endsAt).getTime();
		const plannedDurationMinutes =
			Number.isFinite(startsMs) && Number.isFinite(endsMs) && endsMs > startsMs
				? Math.round((endsMs - startsMs) / 60000)
				: 30;

		if (operationalStatus === "in_chair") {
			const chairCalc = calculateChairDuration(
				startsAt,
				endsAt,
				apt.inChairSince || startsAt,
				nowMs,
			);
			chairDurationMinutes = chairCalc.chairDurationMinutes;
			chairDurationSeverity = chairCalc.chairDurationSeverity;
			chairDurationFormatted = chairCalc.chairDurationFormatted;
			isOvertime = chairCalc.isOvertime;
			overtimeMinutes = chairCalc.overtimeMinutes;
		}

		const { primaryAction, secondaryActions } =
			getAvailableQueueActions(operationalStatus);

		const item: PatientQueueItem = {
			id: apt.id,
			patientId: apt.patientId || null,
			patientName,
			patientPhone,
			doctorUserId: apt.doctorUserId || null,
			doctorName,
			doctorSpecialty,
			chairId: apt.chairId || null,
			chairName,
			startsAt,
			endsAt,
			timeRange: formatTimeRangeRu(startsAt, endsAt),
			rawStatus,
			operationalStatus,
			queueTab,
			waitMinutes,
			waitSeverity,
			waitFormatted,
			chairDurationMinutes,
			chairDurationSeverity,
			chairDurationFormatted,
			isOvertime,
			overtimeMinutes,
			plannedDurationMinutes,
			reason: apt.reason || apt.treatmentDescription || "Прием стоматолога",
			comment: apt.comment || null,
			primaryAction,
			secondaryActions,
		};

		queueItems.push(item);
	}

	// Sort items:
	// - Waiting items: longest wait first (descending waitMinutes)
	// - In-chair items: active chair first
	// - Scheduled items: chronological startsAt
	queueItems.sort((a, b) => {
		return a.startsAt.localeCompare(b.startsAt);
	});

	const waitingItems = queueItems
		.filter((i) => i.operationalStatus === "arrived")
		.sort((a, b) => (b.waitMinutes ?? 0) - (a.waitMinutes ?? 0));

	const inChairItems = queueItems.filter(
		(i) => i.operationalStatus === "in_chair",
	);

	const checkoutItems = queueItems.filter(
		(i) => i.operationalStatus === "ready_for_checkout",
	);

	const completedItems = queueItems.filter(
		(i) => i.operationalStatus === "completed",
	);

	// Summary statistics
	let totalWaitMin = 0;
	let waitOvertimeCount = 0;
	for (const w of waitingItems) {
		const m = w.waitMinutes ?? 0;
		totalWaitMin += m;
		if (m > 15) waitOvertimeCount++;
	}

	const avgWait =
		waitingItems.length > 0 ? Math.round(totalWaitMin / waitingItems.length) : 0;
	const chairOvertimeCount = inChairItems.filter((i) => i.isOvertime).length;
	const cancelledCount = queueItems.filter(
		(i) =>
			i.operationalStatus === "cancelled" || i.operationalStatus === "no_show",
	).length;

	const summary: PatientShiftQueueSummary = {
		totalToday: queueItems.length,
		waitingCount: waitingItems.length,
		waitingOvertimeCount: waitOvertimeCount,
		inChairCount: inChairItems.length,
		inChairOvertimeCount: chairOvertimeCount,
		checkoutCount: checkoutItems.length,
		completedCount: completedItems.length,
		cancelledCount,
		averageWaitMinutes: avgWait,
	};

	const counts: Record<PatientShiftQueueTab, number> = {
		all: queueItems.length,
		waiting: waitingItems.length,
		in_chair: inChairItems.length,
		checkout: checkoutItems.length,
		completed: completedItems.length,
	};

	return {
		itemsByTab: {
			all: queueItems,
			waiting: waitingItems,
			in_chair: inChairItems,
			checkout: checkoutItems,
			completed: completedItems,
		},
		counts,
		summary,
		waitingForDoctorAlerts: waitingItems,
	};
}
