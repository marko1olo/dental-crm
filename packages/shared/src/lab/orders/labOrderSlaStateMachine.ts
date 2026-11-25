import {
	STAGE_TO_CANONICAL_PG_STATUS,
} from "./labOrderLabelsAndShades.js";
import type {
	Canonical5LabStatus,
	CanonicalPgLabStatus,
	LabOrder,
	LabOrderRecord,
	LabOrderStatus,
	LabWorkType,
} from "./labOrderSchemasAndEnums.js";

/** Default SLA turnaround days by lab work type. */
export const DEFAULT_LAB_TURNAROUND_DAYS: Record<LabWorkType, number> = {
	crown: 7,
	bridge: 10,
	denture: 14,
	implant: 10,
	veneer: 7,
	orthodontic: 10,
	inlay_onlay: 5,
	splint_nightguard: 5,
	repair: 2,
	other: 7,
};

/**
 * Adds business working days to a start date, skipping weekends (Saturday & Sunday).
/** Default SLA turnaround days by lab work type. */
export function addBusinessDays(startDate: Date | string, daysToAdd: number): Date {
	const start = typeof startDate === "string" ? new Date(startDate) : new Date(startDate);
	const safeDays = Math.max(0, Math.round(daysToAdd));
	const result = new Date(start.getTime());
	let added = 0;
	while (added < safeDays) {
		result.setDate(result.getDate() + 1);
		const day = result.getDay();
		// Skip weekends (0 = Sunday, 6 = Saturday)
		if (day !== 0 && day !== 6) {
			added++;
		}
	}
	return result;
}

/**
 * Calculates default expected delivery date based on work type and business days.
/** Default SLA turnaround days by lab work type. */
export function calculateExpectedDeliveryDate(
	sentDate: Date | string,
	workType: LabWorkType,
	customTurnaroundDays?: number,
): Date {
	const daysToAdd = customTurnaroundDays ?? DEFAULT_LAB_TURNAROUND_DAYS[workType] ?? 7;
	return addBusinessDays(sentDate, daysToAdd);
}

/**
 * Evaluates whether a lab order is delayed based on current date.
/** Default SLA turnaround days by lab work type. */
export function isLabOrderDelayed(order: LabOrder, now: Date = new Date()): boolean {
	if (
		order.status === "received" ||
		order.status === "ready" ||
		order.status === "ready_in_clinic" ||
		order.status === "fitted" ||
		order.status === "completed" ||
		order.status === "cancelled"
	) {
		return false;
	}
	if (!order.expectedDate) return false;
	const expected = new Date(order.expectedDate);
	return now.getTime() > expected.getTime();
}

/**
 * Validates allowed state transitions for lab orders.
/** Default SLA turnaround days by lab work type. */
export function canTransitionLabOrderStatus(
	current: LabOrderStatus,
	target: LabOrderStatus,
): boolean {
	if (current === target) return true;

	const transitions: Record<LabOrderStatus, LabOrderStatus[]> = {
		draft: ["sent", "cancelled"],
		sent: ["in_progress", "ready", "ready_in_clinic", "fitting", "shipped", "received", "cancelled"],
		in_progress: ["ready", "ready_in_clinic", "fitting", "shipped", "received", "cancelled", "rejected_remake", "refitting"],
		shipped: ["received", "ready", "ready_in_clinic", "fitting", "cancelled", "rejected_remake", "refitting"],
		ready: ["received", "ready_in_clinic", "fitting", "fitted", "completed", "cancelled", "rejected_remake"],
		ready_in_clinic: ["received", "ready", "fitting", "fitted", "completed", "cancelled", "rejected_remake", "refitting"],
		fitting: ["fitted", "ready_in_clinic", "ready", "received", "refitting", "completed", "cancelled", "rejected_remake"],
		received: ["fitted", "in_progress", "ready", "ready_in_clinic", "fitting", "completed", "rejected_remake", "refitting", "cancelled"],
		refitting: ["in_progress", "shipped", "received", "ready", "ready_in_clinic", "fitting", "completed", "cancelled"],
		fitted: ["completed", "in_progress", "received", "rejected_remake", "refitting", "cancelled"],
		completed: ["rejected_remake", "refitting"],
		cancelled: ["draft", "sent"],
		rejected_remake: ["draft", "sent", "cancelled"],
	};

	return transitions[current]?.includes(target) ?? false;
}

// ─── KOPECK-EXACT FINANCIAL CLEARING (NO FLOATS) ─────────────────────────────

/**
 * Maps any granular raw status / stage key into the canonical 5-step clinical progression.
 * Progression: Отправлен -> В работе -> Примерка -> Готов -> Сдан
/** Default SLA turnaround days by lab work type. */
export function mapTo5StageLabStatus(rawStatus?: string | null): Canonical5LabStatus {
	if (!rawStatus) return "sent";
	const s = rawStatus.toLowerCase().trim();
	if (s === "draft" || s === "sent" || s === "sent_to_lab" || s === "impression_sent" || s === "impression_scan") {
		return "sent";
	}
	if (
		s === "in_progress" ||
		s === "cad_design" ||
		s === "model_cad_design" ||
		s === "cad_modeling" ||
		s === "milling_wax_up" ||
		s === "framework_wax_milling" ||
		s === "framework_production" ||
		s === "sintering_ceramic_layering" ||
		s === "ceramic_layering" ||
		s === "ceramic_glazing"
	) {
		return "in_progress";
	}
	if (
		s === "fitting" ||
		s === "refitting" ||
		s === "try_in_fitting" ||
		s === "fitting_in_mouth" ||
		s === "fitting_scheduled" ||
		s === "framework_fitting"
	) {
		return "fitting";
	}
	if (
		s === "ready" ||
		s === "ready_in_clinic" ||
		s === "in_clinic" ||
		s === "shipped" ||
		s === "received" ||
		s === "delivered" ||
		s === "final_glaze" ||
		s === "glaze_finish" ||
		s === "delivered_to_clinic" ||
		s === "ready_fixation" ||
		s === "otk_control" ||
		s === "clinic_delivery"
	) {
		return "ready";
	}
	if (s === "completed" || s === "fitted" || s === "installed_in_mouth" || s === "delivered_completed") {
		return "completed";
	}
	return "sent";
}

/**
 * Двусторонний канонический маппер: преобразует любой входной этап/стадию в канонический статус PostgreSQL (12 статусов).
/** Default SLA turnaround days by lab work type. */
export function mapStageToCanonicalPgStatus(rawStage?: string | null): CanonicalPgLabStatus {
	if (!rawStage) return "sent";
	const s = rawStage.toLowerCase().trim();
	if (s === "draft") return "draft";
	if (s === "cancelled") return "cancelled";
	if (s === "rejected_remake") return "rejected_remake";
	if (
		s === "refitting" ||
		s === "rework" ||
		s === "correction_remake" ||
		s === "warranty_rework" ||
		s === "переделка" ||
		s === "рекламация"
	) {
		return "refitting";
	}
	if (
		s === "completed" ||
		s === "fitted" ||
		s === "seated" ||
		s === "installed" ||
		s === "installed_completed" ||
		s === "delivered_completed" ||
		s === "installed_in_mouth" ||
		s === "delivered" ||
		s === "фиксация" ||
		s === "сдан" ||
		s === "установлен"
	) {
		return s === "fitted" ? "fitted" : "completed";
	}
	if (
		s === "fitting" ||
		s === "fitting_ready" ||
		s === "framework_fitting" ||
		s === "fitting_scheduled" ||
		s === "fitting_in_mouth" ||
		s === "примерка" ||
		s === "примерка во рту"
	) {
		return "fitting";
	}
	if (
		s === "ready_in_clinic" ||
		s === "in_clinic" ||
		s === "delivered_to_clinic" ||
		s === "ready_fixation" ||
		s === "clinic_delivery" ||
		s === "готов в клинике" ||
		s === "готовая работа"
	) {
		return "ready_in_clinic";
	}
	if (s === "ready" || s === "final_glaze" || s === "glaze_finish" || s === "otk_control" || s === "готов в зтл" || s === "отк") {
		return "ready";
	}
	if (s === "received" || s === "доставлен в клинику" || s === "получен клиникой") {
		return "received";
	}
	if (s === "shipped" || s === "shipped_to_clinic" || s === "в пути" || s === "отправлен лабораторией") {
		return "shipped";
	}
	if (
		s === "in_progress" ||
		s === "in_production" ||
		s === "cad_design" ||
		s === "cad_cam" ||
		s === "model_cad_design" ||
		s === "cad_modeling" ||
		s === "milling_wax_up" ||
		s === "framework_wax_milling" ||
		s === "framework_production" ||
		s === "sintering_ceramic_layering" ||
		s === "ceramic_layering" ||
		s === "ceramic_glazing" ||
		s === "нанесение керамики" ||
		s === "в работе"
	) {
		return "in_progress";
	}
	return "sent";
}

/**
 * Двусторонний канонический маппер: преобразует статус PostgreSQL (8 или 12 статусов)
 * в каноническую 5-стадийную модель UI (Canonical5LabStatus: sent -> in_progress -> fitting -> ready -> completed).
/** Default SLA turnaround days by lab work type. */
export function mapPgStatusTo5Stage(rawStatus?: string | null): Canonical5LabStatus {
	return mapTo5StageLabStatus(rawStatus);
}

export function isLabOrderOverdue(
	order: LabOrderRecord,
	referenceDate: Date = new Date(),
): boolean {
	if (
		order.status === "received" ||
		order.status === "ready" ||
		order.status === "ready_in_clinic" ||
		order.status === "fitted" ||
		order.status === "completed" ||
		order.status === "cancelled"
	) {
		return false;
	}

	if (!order.expectedDate) {
		return false;
	}

	const [expY, expM, expD] = order.expectedDate.split("-").map(Number);
	if (!expY || !expM || !expD) {
		return false;
	}

	const expectedEndOfDayUtc = Date.UTC(expY, expM - 1, expD, 23, 59, 59, 999);
	return referenceDate.getTime() > expectedEndOfDayUtc;
}

export function calculateLabTurnaroundDays(
	sentDate: string,
	receivedDate: string,
): number {
	const [sY, sM, sD] = sentDate.split("-").map(Number);
	const [rY, rM, rD] = receivedDate.split("-").map(Number);

	if (!sY || !sM || !sD || !rY || !rM || !rD) {
		return 0;
	}

	const sentUtc = Date.UTC(sY, sM - 1, sD);
	const recvUtc = Date.UTC(rY, rM - 1, rD);

	if (recvUtc < sentUtc) {
		return 0;
	}

	const msPerDay = 24 * 60 * 60 * 1000;
	return Math.round((recvUtc - sentUtc) / msPerDay);
}
