import type { Appointment } from "@dental/shared";

/**
 * Checks if appointment status is currently active in the dental chair.
 */
export function isAppointmentInChair(status: string | undefined | null): boolean {
	if (!status) return false;
	const s = String(status).toLowerCase();
	return s === "in_treatment" || s === "in_progress";
}

/**
 * Checks whether an appointment is an acute CITO / emergency appointment.
 */
export function isAppointmentCito(appointment?: Appointment | null): boolean {
	if (!appointment) return false;
	return Boolean(
		(appointment as any)?.isCito ||
		(appointment as any)?.cito ||
		(appointment?.reason ?? "").toLowerCase().includes("cito") ||
		(appointment?.reason ?? "").toLowerCase().includes("острая боль") ||
		(appointment?.reason ?? "").toLowerCase().includes("срочн")
	);
}

/**
 * Normalizes appointment status label with human-friendly Russian medical terms.
 */
export function getNormalizedAppointmentStatusLabel(
	status: string | undefined | null,
	labels?: Record<string, string>,
): string {
	if (!status) return "";
	const s = String(status).toLowerCase();
	if (s === "completed") {
		return labels?.[s] && labels[s] !== "Готово" ? labels[s] : "Ожидает оплаты";
	}
	if (s === "in_treatment" || s === "in_chair" || s === "in_progress") return "На приёме";
	if (s === "arrived" || s === "in_clinic" || s === "waiting") return "В холле";
	if (s === "confirmed") return "Подтверждён";
	if (s === "planned") return "Запланирован";
	if (s === "cancelled") return "Отменён";
	if (s === "no_show") return "Не явился";
	if (labels) {
		if (labels[s]) return labels[s];
		if (labels[status]) return labels[status];
	}
	return status;
}

/**
 * Resolves CSS classes for appointment status badge on the card face.
 */
export function getAppointmentStatusBadgeClasses(status: string | undefined | null): string {
	const s = String(status || "").toLowerCase();
	if (s === "in_treatment" || s === "in_chair" || s === "in_progress") {
		return "bg-emerald-100 text-emerald-950 dark:bg-emerald-950/80 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-600 font-bold shadow-2xs";
	}
	if (s === "arrived" || s === "in_clinic" || s === "waiting") {
		return "bg-amber-100 text-amber-950 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300 dark:border-amber-600 font-bold shadow-2xs";
	}
	if (s === "confirmed") {
		return "bg-teal-100 text-teal-950 dark:bg-teal-950/80 dark:text-teal-200 border border-teal-300 dark:border-teal-600 font-bold shadow-2xs";
	}
	if (s === "completed") {
		return "bg-violet-100 text-violet-950 dark:bg-violet-950/80 dark:text-violet-200 border border-violet-300 dark:border-violet-600 font-bold shadow-2xs";
	}
	if (s === "cancelled" || s === "no_show") {
		return "bg-rose-100 text-rose-950 dark:bg-rose-950/80 dark:text-rose-200 border border-rose-300 dark:border-rose-600 font-bold shadow-2xs";
	}
	return "bg-sky-100 text-sky-950 dark:bg-sky-950/80 dark:text-sky-200 border border-sky-300 dark:border-sky-600 font-bold shadow-2xs";
}
