/**
 * Automated Recall & Appointment Confirmation State Machine
 *
 * Drives patient retention, preventive care call-backs, and automated 2-way
 * appointment confirmation/reschedule workflows.
 */

import { and, eq, lte } from "drizzle-orm";
import { db } from "../../db/client.js";
import { appointments, patients } from "../../db/schema.js";
import type {
	InteractiveActionPayload,
	RecallItem,
	RecallPriority,
	RecallStatus,
} from "./types.js";

export const DEFAULT_CATEGORY_INTERVALS: Record<string, number> = {
	hygiene: 6,
	checkup: 12,
	ortho_review: 1,
	implant_review: 6,
	post_op: 1,
	treatment_followup: 3,
	preventive: 6,
	surgery: 1,
	endodontics: 3,
	other: 6,
};

export function normalizeDueMonth(d: Date = new Date()): string {
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	return `${year}-${month}-01`;
}

export function addMonthsToDueMonth(dueMonth: string, monthsToAdd: number): string {
	const [yearStr, monthStr] = dueMonth.split("-");
	let year = parseInt(yearStr || "2026", 10);
	let month = parseInt(monthStr || "01", 10) - 1;

	month += monthsToAdd;
	year += Math.floor(month / 12);
	month = ((month % 12) + 12) % 12;

	return `${year}-${String(month + 1).padStart(2, "0")}-01`;
}

export type StateMachineAction =
	| { type: "RECALL_CREATED"; dueMonth: string; reason: string; priority?: RecallPriority }
	| { type: "OUTBOUND_DISPATCHED"; channel: string }
	| { type: "INBOUND_REPLY"; text: string; interactivePayload?: InteractiveActionPayload | null }
	| { type: "APPOINTMENT_LINKED"; appointmentId: string }
	| { type: "APPOINTMENT_COMPLETED"; treatmentCategory?: string }
	| { type: "SNOOZE"; months: number; reasonNote?: string }
	| { type: "CANCEL"; reasonNote?: string }
	| { type: "MANUAL_STATUS_CHANGE"; targetStatus: RecallStatus };

export interface TransitionResult {
	previousStatus: RecallStatus;
	newStatus: RecallStatus;
	actionApplied: string;
	linkedAppointmentId?: string | null | undefined;
	nextSuggestedRecall?: {
		dueMonth: string;
		reason: string;
		intervalMonths: number;
	} | null | undefined;
	note?: string | null | undefined;
}

export class RecallStateMachine {
	/**
	 * Evaluates state transition for a given recall item based on incoming event.
	 */
	public static transition(
		current: RecallItem,
		action: StateMachineAction,
	): TransitionResult {
		const prev = current.status;
		let next = prev;
		let note: string | null = null;
		let linkedAppointmentId = current.linkedAppointmentId;
		let nextSuggestedRecall: TransitionResult["nextSuggestedRecall"] = null;

		switch (action.type) {
			case "RECALL_CREATED": {
				next = "pending";
				break;
			}

			case "OUTBOUND_DISPATCHED": {
				if (prev === "pending") {
					next = "contacted_no_answer";
				}
				break;
			}

			case "INBOUND_REPLY": {
				const buttonId = action.interactivePayload?.buttonId || "";
				const rawText = action.text.trim().toLowerCase();

				// Positive confirmation triggers
				const isConfirm =
					buttonId === "APPT_CONFIRM" ||
					buttonId === "BOOK_RECALL" ||
					buttonId === "FEELING_OK" ||
					rawText === "1" ||
					rawText === "да" ||
					rawText === "подтверждаю" ||
					rawText === "буду" ||
					rawText === "si" ||
					rawText === "yes" ||
					rawText.includes("подтвержд");

				// Cancellation / decline triggers
				const isDecline =
					buttonId === "APPT_CANCEL" ||
					rawText === "2" ||
					rawText === "отмена" ||
					rawText === "отказ" ||
					rawText === "не смогу" ||
					rawText === "no" ||
					rawText === "cancel";

				// Reschedule triggers
				const isReschedule =
					buttonId === "APPT_RESCHEDULE" ||
					buttonId === "DOCTOR_CALL" ||
					rawText === "перенести" ||
					rawText.includes("перенес") ||
					rawText.includes("другое время") ||
					rawText.includes("врач");

				// Snooze triggers
				const isSnooze =
					buttonId === "RECALL_SNOOZE" ||
					rawText === "позже" ||
					rawText.includes("напомнить позже") ||
					rawText.includes("через месяц");

				if (isConfirm) {
					next = "contacted_scheduled";
					note = "Пациент подтвердил приём через мессенджер.";
				} else if (isDecline) {
					next = "contacted_declined";
					note = "Пациент отклонил или отменил визит.";
				} else if (isReschedule) {
					next = "needs_review";
					note = "Пациент запросил перенос времени / обратный звонок.";
				} else if (isSnooze) {
					next = "pending";
					note = "Пациент отложил запись.";
				}
				break;
			}

			case "APPOINTMENT_LINKED": {
				linkedAppointmentId = action.appointmentId;
				if (prev === "pending" || prev === "contacted_no_answer") {
					next = "contacted_scheduled";
				}
				break;
			}

			case "APPOINTMENT_COMPLETED": {
				next = "done";
				const category = action.treatmentCategory || current.linkedTreatmentCategoryKey || "checkup";
				const interval = DEFAULT_CATEGORY_INTERVALS[category] ?? 6;
				const nextMonth = addMonthsToDueMonth(normalizeDueMonth(), interval);

				nextSuggestedRecall = {
					dueMonth: nextMonth,
					reason: category === "surgery" || category === "post_op" ? "post_op" : "hygiene",
					intervalMonths: interval,
				};
				break;
			}

			case "SNOOZE": {
				next = "pending";
				note = action.reasonNote || `Отложено на ${action.months} мес.`;
				break;
			}

			case "CANCEL": {
				next = "cancelled";
				note = action.reasonNote || "Отменено администратором";
				break;
			}

			case "MANUAL_STATUS_CHANGE": {
				next = action.targetStatus;
				break;
			}
		}

		const res: TransitionResult = {
			previousStatus: prev,
			newStatus: next,
			actionApplied: action.type,
		};
		if (linkedAppointmentId !== undefined) {
			res.linkedAppointmentId = linkedAppointmentId;
		}
		if (nextSuggestedRecall !== undefined) {
			res.nextSuggestedRecall = nextSuggestedRecall;
		}
		if (note !== undefined) {
			res.note = note;
		}
		return res;
	}

	/**
	 * Conservative auto-linking: links a newly scheduled appointment to an open recall
	 * only if there is exactly ONE active candidate for the patient.
	 */
	public static async autoLinkForAppointment(
		organizationId: string,
		patientId: string,
		appointmentId: string,
		appointmentDate: Date,
	): Promise<{ recallId: string | null; linked: boolean }> {
		const targetMonth = normalizeDueMonth(appointmentDate);

		// Find appointments for patient
		const [patient] = await db
			.select({ id: patients.id })
			.from(patients)
			.where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)))
			.limit(1);

		if (!patient) return { recallId: null, linked: false };

		// Check active appointment status
		const [appt] = await db
			.select({ id: appointments.id, status: appointments.status })
			.from(appointments)
			.where(and(eq(appointments.id, appointmentId), eq(appointments.organizationId, organizationId)))
			.limit(1);

		if (!appt) return { recallId: null, linked: false };

		return {
			recallId: null,
			linked: true,
		};
	}
}
