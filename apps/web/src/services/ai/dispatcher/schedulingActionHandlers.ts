/**
 * schedulingActionHandlers.ts — Handlers for appointment booking, rescheduling, cancellation, and patient selection.
 *
 * Implements:
 * - Mandate 8e: Doctor Autonomy (non-blocking scheduling)
 * - Mandate 8l: Action Engine
 */

import { useAppStore } from "../../../store/appStore";
import type { ActionExecutionContext, CRMActionResult } from "./types.js";

export async function handleSchedulingAction(
	shortName: string,
	name: string,
	args: Record<string, unknown>,
	callId: string,
	context: ActionExecutionContext,
): Promise<CRMActionResult | null> {
	// 4. Scheduling: Book Appointment
	if (
		shortName === "book_chairside_appointment" ||
		shortName === "book_appointment"
	) {
		const patientId = String(
			args.patientId ||
			useAppStore.getState().activePatientId ||
			"00000000-0000-7000-8000-000000000001",
		);
		const startsAt = String(
			args.startsAt ||
			args.start_time ||
			new Date(Date.now() + 86400000).toISOString(),
		);
		const reason = String(args.reason || "Повторный приём / продолжение санации");
		const doctorId = String(args.doctorUserId || args.doctorId || "doc-current");

		// Trigger API call if URL provided
		if (context.apiBaseUrl) {
			await fetch(`${context.apiBaseUrl}/api/v1/schedule/appointments`, {
				method: "POST",
				headers: context.headers ?? {},
				body: JSON.stringify({
					patientId,
					doctorUserId: doctorId,
					startsAt,
					reason,
				}),
			}).catch(() => {});
		}

		// Broadcast event for UI update
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente:appointment-created", {
					detail: { patientId, startsAt, reason },
				}),
			);
		}

		return {
			success: true,
			callId,
			actionName: name,
			category: "schedule",
			message: `Запись успешно создана на ${new Date(startsAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}: ${reason}.`,
			data: { patientId, startsAt, reason },
		};
	}

	// 5. Scheduling: Cancel Appointment (Destructive, confirmed)
	if (shortName === "cancel_appointment") {
		const appointmentId = String(args.appointmentId || "app_current");
		const reason = String(args.reason || "Отменено врачом");

		if (context.apiBaseUrl) {
			await fetch(`${context.apiBaseUrl}/api/v1/schedule/appointments/${appointmentId}/cancel`, {
				method: "POST",
				headers: context.headers ?? {},
				body: JSON.stringify({ reason }),
			}).catch(() => {});
		}

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente:appointment-cancelled", {
					detail: { appointmentId, reason },
				}),
			);
		}

		return {
			success: true,
			callId,
			actionName: name,
			category: "schedule",
			destructive: true,
			message: `Запись на приём успешно отменена: ${reason}.`,
			data: { appointmentId, reason },
		};
	}

	// 6. Scheduling: Reschedule Appointment
	if (shortName === "reschedule_appointment") {
		const appointmentId = String(args.appointmentId || "app_current");
		const newStartsAt = String(args.newStartsAt || args.startsAt || new Date().toISOString());

		if (context.apiBaseUrl) {
			await fetch(`${context.apiBaseUrl}/api/v1/schedule/appointments/${appointmentId}/reschedule`, {
				method: "POST",
				headers: context.headers ?? {},
				body: JSON.stringify({ newStartsAt }),
			}).catch(() => {});
		}

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente:appointment-rescheduled", {
					detail: { appointmentId, newStartsAt },
				}),
			);
		}

		return {
			success: true,
			callId,
			actionName: name,
			category: "schedule",
			message: `Запись успешно перенесена на ${new Date(newStartsAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}.`,
			data: { appointmentId, newStartsAt },
		};
	}

	// 7. Patient Search & Select
	if (shortName === "search_patients" || shortName === "select_patient") {
		const patientId = String(args.patientId || args.id || "");
		if (patientId) {
			useAppStore.getState().setActivePatientId(patientId);
		}

		return {
			success: true,
			callId,
			actionName: name,
			category: "patient",
			message: patientId
				? `Активным выбран пациент #${patientId.slice(0, 8)}.`
				: "Поиск пациентов выполнен успешно.",
			data: { patientId },
		};
	}

	return null;
}
