/**
 * whatsappInteractiveActions.ts
 *
 * Canonical resolver and state-machine transitions for WhatsApp interactive button replies:
 * - Appointment confirmations (confirm_appointment_<uuid> / APPT_CONFIRM / "да")
 * - Appointment cancellations (cancel_appointment_<uuid> / APPT_CANCEL / "нет")
 * - Reschedule requests (APPT_RESCHEDULE)
 * - Preventative recall quick booking (recall_book_<id> / recall_snooze_<id>)
 */

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	appointments,
	communicationEvents,
	communicationTasks,
	denteWhatsappBotConfigs,
	patients,
} from "../../db/schema.js";
import { wsBroker } from "../websocketBroker.js";
import {
	normalizeWhatsappRecipient,
	readWhatsappCredentials,
	sendWhatsappTextMessage,
} from "../../whatsappTransport.js";

export interface ParsedWebhookAction {
	type:
		| "confirm_appointment"
		| "cancel_appointment"
		| "reschedule_request"
		| "recall_book"
		| "recall_snooze"
		| "general_message";
	appointmentId?: string | null;
	recallId?: string | null;
	buttonId?: string | null;
	rawText: string;
	fromPhone: string;
	messageId: string;
	timestamp: Date;
}

/**
 * Parses interactive button reply ID or text into normalized appointment action.
 */
export function parseIncomingAction(
	buttonId: string | null | undefined,
	bodyText: string,
	fromPhone: string,
	messageId: string,
	timestamp: Date = new Date(),
): ParsedWebhookAction {
	const rawBtn = (buttonId || "").trim();
	const cleanText = (bodyText || "").trim().toLowerCase();

	// Explicit recall action buttons: RECALL_BOOK_<id> or RECALL_SNOOZE_<id>
	const recallBookMatch = rawBtn.match(/^recall_book[-_:](.+)$/i);
	if (recallBookMatch) {
		return {
			type: "recall_book",
			recallId: recallBookMatch[1] ?? null,
			buttonId: rawBtn,
			rawText: bodyText,
			fromPhone,
			messageId,
			timestamp,
		};
	}

	const recallSnoozeMatch = rawBtn.match(/^recall_snooze[-_:](.+)$/i);
	if (recallSnoozeMatch) {
		return {
			type: "recall_snooze",
			recallId: recallSnoozeMatch[1] ?? null,
			buttonId: rawBtn,
			rawText: bodyText,
			fromPhone,
			messageId,
			timestamp,
		};
	}

	// Explicit appointment confirmation button: confirm_appointment_<id> or APPT_CONFIRM_<id>
	const confirmMatch = rawBtn.match(
		/^(?:confirm_appointment|appt_confirm)[-_:]([0-9a-f-]{36})$/i,
	);
	if (confirmMatch) {
		return {
			type: "confirm_appointment",
			appointmentId: confirmMatch[1] ?? null,
			buttonId: rawBtn,
			rawText: bodyText,
			fromPhone,
			messageId,
			timestamp,
		};
	}

	// Explicit appointment cancellation button: cancel_appointment_<id> or APPT_CANCEL_<id>
	const cancelMatch = rawBtn.match(
		/^(?:cancel_appointment|appt_cancel)[-_:]([0-9a-f-]{36})$/i,
	);
	if (cancelMatch) {
		return {
			type: "cancel_appointment",
			appointmentId: cancelMatch[1] ?? null,
			buttonId: rawBtn,
			rawText: bodyText,
			fromPhone,
			messageId,
			timestamp,
		};
	}

	const isConfirm =
		rawBtn === "APPT_CONFIRM" ||
		rawBtn === "CONFIRM_YES" ||
		cleanText === "1" ||
		cleanText === "да" ||
		cleanText === "si" ||
		cleanText === "yes" ||
		cleanText.includes("подтвержд") ||
		cleanText.startsWith("да,") ||
		cleanText.startsWith("да ") ||
		cleanText.includes("буду");

	const isCancel =
		rawBtn === "APPT_CANCEL" ||
		rawBtn === "CONFIRM_NO" ||
		cleanText === "2" ||
		cleanText === "нет" ||
		cleanText === "no" ||
		cleanText.includes("отмен") ||
		cleanText.includes("отказ") ||
		cleanText.includes("не смогу") ||
		cleanText.startsWith("нет,") ||
		cleanText.startsWith("нет ");

	const isReschedule =
		rawBtn === "APPT_RESCHEDULE" ||
		cleanText.includes("перенес") ||
		cleanText.includes("другое время") ||
		cleanText.includes("перенести");

	if (isConfirm && !isCancel && !isReschedule) {
		return {
			type: "confirm_appointment",
			appointmentId: null,
			buttonId: rawBtn || "TEXT_CONFIRM",
			rawText: bodyText,
			fromPhone,
			messageId,
			timestamp,
		};
	}

	if (isCancel) {
		return {
			type: "cancel_appointment",
			appointmentId: null,
			buttonId: rawBtn || "TEXT_CANCEL",
			rawText: bodyText,
			fromPhone,
			messageId,
			timestamp,
		};
	}

	if (isReschedule) {
		return {
			type: "reschedule_request",
			appointmentId: null,
			buttonId: rawBtn || "TEXT_RESCHEDULE",
			rawText: bodyText,
			fromPhone,
			messageId,
			timestamp,
		};
	}

	return {
		type: "general_message",
		appointmentId: null,
		buttonId: rawBtn || null,
		rawText: bodyText,
		fromPhone,
		messageId,
		timestamp,
	};
}

/**
 * Finds target appointment by ID or locates the patient's next upcoming planned appointment.
 */
export async function findTargetAppointment(
	organizationId: string,
	patientId: string,
	specificAppointmentId?: string | null,
) {
	if (specificAppointmentId) {
		const [appt] = await db
			.select()
			.from(appointments)
			.where(
				and(
					eq(appointments.id, specificAppointmentId),
					eq(appointments.organizationId, organizationId),
				),
			)
			.limit(1);
		if (appt) return appt;
	}

	// Find earliest upcoming planned appointment for this patient
	const [nextAppt] = await db
		.select()
		.from(appointments)
		.where(
			and(
				eq(appointments.organizationId, organizationId),
				eq(appointments.patientId, patientId),
				eq(appointments.status, "planned"),
			),
		)
		.orderBy(desc(appointments.startsAt))
		.limit(1);

	return nextAppt ?? null;
}

/**
 * Executes appointment confirmation, updates database, and dispatches confirmation receipt.
 */
export async function processAppointmentConfirmation(
	organizationId: string,
	patient: { id: string; fullName: string; phone: string | null },
	action: ParsedWebhookAction,
	config: typeof denteWhatsappBotConfigs.$inferSelect | null,
) {
	const targetAppt = await findTargetAppointment(
		organizationId,
		patient.id,
		action.appointmentId,
	);

	if (targetAppt) {
		await db
			.update(appointments)
			.set({
				status: "confirmed",
			})
			.where(
				and(
					eq(appointments.id, targetAppt.id),
					eq(appointments.organizationId, organizationId),
				),
			);

		// Format formatted appointment time
		const dateStr = new Date(targetAppt.startsAt).toLocaleString("ru-RU", {
			day: "numeric",
			month: "long",
			hour: "2-digit",
			minute: "2-digit",
		});

		const receiptText = `Спасибо, ${patient.fullName}! Ваша запись на ${dateStr} успешно подтверждена. Ждём вас в клинике ДЕНТЕ!`;

		// Dispatch confirmation message via WhatsApp if credentials exist
		if (config && patient.phone) {
			const creds = readWhatsappCredentials(config);
			const recipient = normalizeWhatsappRecipient(patient.phone);
			if (creds && recipient) {
				await sendWhatsappTextMessage({
					...creds,
					toPhoneE164: recipient,
					text: receiptText,
				}).catch(() => null);
			}
		}

		// Log communication events
		await db.insert(communicationEvents).values({
			organizationId,
			patientId: patient.id,
			channel: "whatsapp",
			direction: "outbound",
			status: "sent",
			message: receiptText,
		});

		// Broadcast to reception via WebSocket
		wsBroker.broadcastToOrganization(organizationId, {
			type: "APPOINTMENT_CONFIRMED",
			payload: {
				appointmentId: targetAppt.id,
				patientId: patient.id,
				patientName: patient.fullName,
				startsAt: targetAppt.startsAt,
				confirmedVia: "whatsapp_interactive",
			},
		});

		return {
			status: "confirmed",
			appointmentId: targetAppt.id,
			receiptSent: true,
		};
	}

	return {
		status: "no_matching_appointment",
		appointmentId: null,
		receiptSent: false,
	};
}

/**
 * Executes appointment cancellation, updates database, and notifies clinic reception.
 */
export async function processAppointmentCancellation(
	organizationId: string,
	patient: { id: string; fullName: string; phone: string | null },
	action: ParsedWebhookAction,
	config: typeof denteWhatsappBotConfigs.$inferSelect | null,
) {
	const targetAppt = await findTargetAppointment(
		organizationId,
		patient.id,
		action.appointmentId,
	);

	if (targetAppt) {
		await db
			.update(appointments)
			.set({
				status: "cancelled",
				comment: sql`COALESCE(comment, '') || ' [Отменено пациентом через WhatsApp]'`,
			})
			.where(
				and(
					eq(appointments.id, targetAppt.id),
					eq(appointments.organizationId, organizationId),
				),
			);

		const receiptText = `Ваша запись была отменена. Если вы хотите подобрать другое время, позвоните нам или напишите в этот чат.`;

		if (config && patient.phone) {
			const creds = readWhatsappCredentials(config);
			const recipient = normalizeWhatsappRecipient(patient.phone);
			if (creds && recipient) {
				await sendWhatsappTextMessage({
					...creds,
					toPhoneE164: recipient,
					text: receiptText,
				}).catch(() => null);
			}
		}

		await db.insert(communicationEvents).values({
			organizationId,
			patientId: patient.id,
			channel: "whatsapp",
			direction: "outbound",
			status: "sent",
			message: receiptText,
		});

		wsBroker.broadcastToOrganization(organizationId, {
			type: "APPOINTMENT_CANCELLED",
			payload: {
				appointmentId: targetAppt.id,
				patientId: patient.id,
				patientName: patient.fullName,
				startsAt: targetAppt.startsAt,
				cancelledVia: "whatsapp_interactive",
			},
		});

		return {
			status: "cancelled",
			appointmentId: targetAppt.id,
			receiptSent: true,
		};
	}

	return {
		status: "no_matching_appointment",
		appointmentId: null,
		receiptSent: false,
	};
}

/**
 * Executes recall quick booking request from WhatsApp button.
 */
export async function processRecallBooking(
	organizationId: string,
	patient: { id: string; fullName: string; phone: string | null },
	action: ParsedWebhookAction,
	config: typeof denteWhatsappBotConfigs.$inferSelect | null,
) {
	if (action.recallId) {
		await db
			.update(communicationTasks)
			.set({
				status: "delivered",
				lastEventAt: new Date(),
			})
			.where(
				and(
					eq(communicationTasks.id, action.recallId),
					eq(communicationTasks.organizationId, organizationId),
				),
			)
			.catch(() => null);
	}

	const receiptText = `Спасибо, ${patient.fullName}! Мы приняли вашу заявку на профилактический осмотр. Администратор клиники ДЕНТЕ свяжется с вами для согласования удобного времени.`;

	if (config && patient.phone) {
		const creds = readWhatsappCredentials(config);
		const recipient = normalizeWhatsappRecipient(patient.phone);
		if (creds && recipient) {
			await sendWhatsappTextMessage({
				...creds,
				toPhoneE164: recipient,
				text: receiptText,
			}).catch(() => null);
		}
	}

	await db.insert(communicationEvents).values({
		organizationId,
		patientId: patient.id,
		channel: "whatsapp",
		direction: "outbound",
		status: "sent",
		message: receiptText,
	});

	wsBroker.broadcastToOrganization(organizationId, {
		type: "RECALL_BOOKING_REQUESTED",
		payload: {
			recallId: action.recallId,
			patientId: patient.id,
			patientName: patient.fullName,
			requestedVia: "whatsapp_interactive",
		},
	});

	return {
		status: "booking_requested",
		receiptSent: true,
	};
}

/**
 * Executes recall snooze (postpone by 30 days) from WhatsApp button.
 */
export async function processRecallSnooze(
	organizationId: string,
	patient: { id: string; fullName: string; phone: string | null },
	action: ParsedWebhookAction,
	config: typeof denteWhatsappBotConfigs.$inferSelect | null,
) {
	const newDueDate = new Date();
	newDueDate.setDate(newDueDate.getDate() + 30);

	if (action.recallId) {
		await db
			.update(communicationTasks)
			.set({
				status: "queued",
				dueAt: newDueDate,
				lastEventAt: new Date(),
			})
			.where(
				and(
					eq(communicationTasks.id, action.recallId),
					eq(communicationTasks.organizationId, organizationId),
				),
			)
			.catch(() => null);
	}

	const receiptText = `Хорошо, ${patient.fullName}! Мы отложили напоминание и свяжемся с вами через месяц. Желаем здоровья вашим зубам!`;

	if (config && patient.phone) {
		const creds = readWhatsappCredentials(config);
		const recipient = normalizeWhatsappRecipient(patient.phone);
		if (creds && recipient) {
			await sendWhatsappTextMessage({
				...creds,
				toPhoneE164: recipient,
				text: receiptText,
			}).catch(() => null);
		}
	}

	await db.insert(communicationEvents).values({
		organizationId,
		patientId: patient.id,
		channel: "whatsapp",
		direction: "outbound",
		status: "sent",
		message: receiptText,
	});

	wsBroker.broadcastToOrganization(organizationId, {
		type: "RECALL_SNOOZED",
		payload: {
			recallId: action.recallId,
			patientId: patient.id,
			patientName: patient.fullName,
			snoozeDays: 30,
			snoozedVia: "whatsapp_interactive",
		},
	});

	return {
		status: "snoozed",
		receiptSent: true,
	};
}
