/**
 * DENTE Dental CRM — Leads Kanban Booking Autonomy Helpers
 * Mandate 8e (Doctor Autonomy) & Mandate 8n (Solo Doctor Scale Sovereignty)
 */

export type BookableDoctor = {
	id: string;
	fullName?: string;
	name?: string;
	role?: string;
	active?: boolean;
};

export type BookableChair = { id: string; name: string };

export const FALLBACK_SOLO_DOCTOR: BookableDoctor = {
	id: "default-doctor",
	fullName: "Дежурный врач (соло-практика)",
	name: "Дежурный врач (соло-практика)",
	role: "doctor",
	active: true,
};

export const FALLBACK_DEFAULT_CHAIR: BookableChair = {
	id: "default-chair",
	name: "Кресло №1 (Основное)",
};

export const DEFAULT_LEAD_VISIT_MINUTES = 30;

export function resolveLeadBookingStaff(
	staff: BookableDoctor[] | null | undefined,
): BookableDoctor[] {
	return staff && staff.length > 0 ? staff : [FALLBACK_SOLO_DOCTOR];
}

export function resolveLeadBookingChairs(
	chairs: BookableChair[] | null | undefined,
): BookableChair[] {
	return chairs && chairs.length > 0 ? chairs : [FALLBACK_DEFAULT_CHAIR];
}

export function resolveLeadVisitMinutes(
	visitMinutes: number | null | undefined,
): number {
	return visitMinutes && visitMinutes > 0
		? visitMinutes
		: DEFAULT_LEAD_VISIT_MINUTES;
}

export function isLeadBookingDisabled(isBooking: boolean): boolean {
	return isBooking;
}

export async function bookingFailureMessage(response: Response): Promise<string> {
	let payload: { error?: unknown; message?: unknown } = {};
	try {
		payload = (await response.json()) as typeof payload;
	} catch {
		// no body
	}
	if (
		typeof payload.message === "string" &&
		payload.message.trim() &&
		payload.message !== "Internal Server Error"
	) {
		return payload.message;
	}
	const code = typeof payload.error === "string" ? payload.error : "";
	if (code === "DoctorNotFound") {
		return "Выбранный врач больше не работает в клинике: выберите другого в списке.";
	}
	if (code === "ChairNotFound") {
		return "Выбранное кресло удалено из настроек клиники: выберите другое.";
	}
	if (code === "Lead not found" || response.status === 404) {
		return "Обращение уже удалено или записано кем-то другим: обновите доску.";
	}
	if (response.status === 401 || response.status === 403) {
		return "Нет прав на запись пациентов: войдите под сотрудником с доступом к расписанию.";
	}
	return `Запись не создана, код ${response.status}. Обращение осталось в прежнем столбце.`;
}
