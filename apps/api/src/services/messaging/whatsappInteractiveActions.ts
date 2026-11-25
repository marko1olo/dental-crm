/**
 * whatsappInteractiveActions.ts
 *
 * Canonical resolver and state-machine transitions for WhatsApp interactive button replies:
 * - Appointment confirmations (confirm_appointment_<uuid> / APPT_CONFIRM / "да")
 * - Appointment cancellations (cancel_appointment_<uuid> / APPT_CANCEL / "нет")
 * - Reschedule requests (APPT_RESCHEDULE)
 * - Preventative recall quick booking (recall_book_<id> / recall_snooze_<id>)
 *
 * TX-SPLIT INVARIANT (DEF-W9-M04):
 * DB updates run inside short `withTenantCtx` transactions; external Meta HTTP calls run strictly OUTSIDE PG TX;
 * `"sent"` is persisted ONLY after confirmed delivery.
 */

import { and, asc, eq, gte, sql } from "drizzle-orm";
import { onTenantTxCommit, withSavepoint, withTenantCtx } from "../../db/rls.js";
import {
	appointments,
	communicationEvents,
	communicationTasks,
	denteWhatsappBotConfigs,
} from "../../db/schema.js";
import { createApiLogger, safeLogError } from "../../observability/logger.js";
import { wsBroker } from "../websocketBroker.js";
import {
	normalizeWhatsappRecipient,
	readWhatsappCredentials,
	sendWhatsappTextMessage,
} from "../../whatsappTransport.js";

const logger = createApiLogger("whatsappInteractiveActions");

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

	// Explicit recall action buttons: RECALL_BOOK_<id> or RECALL_SNOOZЕ_<id>
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
	return withTenantCtx(organizationId, async (tx) => {
		if (specificAppointmentId) {
			const [appt] = await tx
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

		const [nextAppt] = await tx
			.select()
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, organizationId),
					eq(appointments.patientId, patientId),
					eq(appointments.status, "planned"),
					gte(appointments.startsAt, new Date()),
				),
			)
			.orderBy(asc(appointments.startsAt))
			.limit(1);

		return nextAppt ?? null;
	});
}

async function dispatchAndFinalizeReceipt(params: {
	organizationId: string;
	patient: { id: string; phone: string | null };
	receiptText: string;
	config: typeof denteWhatsappBotConfigs.$inferSelect | null;
	eventId: string | null;
}): Promise<boolean> {
	const { organizationId, patient, receiptText, config, eventId } = params;
	let sent = false;
	let providerMessageId: string | null = null;

	if (config && patient.phone) {
		const creds = readWhatsappCredentials({ ...config, organizationId });
		const recipient = normalizeWhatsappRecipient(patient.phone);
		if (creds && recipient) {
			try {
				const res = await sendWhatsappTextMessage({
					...creds,
					toPhoneE164: recipient,
					text: receiptText,
				});
				sent = res.ok;
				providerMessageId = res.providerMessageId ?? null;
				if (!res.ok) {
					logger.warn(
						{ organizationId, errorClass: res.errorClass, errorCode: res.errorCode },
						"WhatsApp interactive receipt delivery failed",
					);
				}
			} catch (err) {
				logger.warn(
					{ err: safeLogError(err), organizationId },
					"WhatsApp interactive receipt transport threw error",
				);
			}
		}
	}

	if (eventId) {
		await withTenantCtx(organizationId, async (tx) => {
			await tx
				.update(communicationEvents)
				.set({
					status: sent ? "sent" : "failed",
					providerCallId: providerMessageId,
				})
				.where(
					and(
						eq(communicationEvents.id, eventId),
						eq(communicationEvents.organizationId, organizationId),
					),
				);
		});
	}

	return sent;
}

/**
 * Executes appointment confirmation, updates database in ACID transaction, and dispatches confirmation receipt outside TX.
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

	if (!targetAppt) {
		return {
			status: "no_matching_appointment",
			appointmentId: null,
			receiptSent: false,
		};
	}

	const dateStr = new Date(targetAppt.startsAt).toLocaleString("ru-RU", {
		day: "numeric",
		month: "long",
		hour: "2-digit",
		minute: "2-digit",
	});

	const receiptText = `Спасибо, ${patient.fullName}! Ваша запись на ${dateStr} успешно подтверждена. Ждём вас в клинике ДЕНТЕ!`;

	const eventId = await withTenantCtx(organizationId, async (tx) => {
		await tx
			.update(appointments)
			.set({ status: "confirmed" })
			.where(
				and(
					eq(appointments.id, targetAppt.id),
					eq(appointments.organizationId, organizationId),
				),
			);

		const [inserted] = await tx
			.insert(communicationEvents)
			.values({
				organizationId,
				patientId: patient.id,
				channel: "whatsapp",
				direction: "outbound",
				status: "queued",
				message: receiptText,
			})
			.returning({ id: communicationEvents.id });

		onTenantTxCommit(() => {
			wsBroker.broadcastToOrganization(organizationId, {
				type: "APPOINTMENT_UPDATED",
				payload: {
					id: targetAppt.id,
					appointmentId: targetAppt.id,
					patientId: patient.id,
					status: "confirmed",
					source: "messenger_callback",
				},
			});
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
		});

		return inserted?.id ?? null;
	});

	const receiptSent = await dispatchAndFinalizeReceipt({
		organizationId,
		patient,
		receiptText,
		config,
		eventId,
	});

	return {
		status: "confirmed",
		appointmentId: targetAppt.id,
		receiptSent,
	};
}

/**
 * Executes appointment cancellation, updates database in ACID transaction, and notifies clinic reception.
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

	if (!targetAppt) {
		return {
			status: "no_matching_appointment",
			appointmentId: null,
			receiptSent: false,
		};
	}

	const receiptText = `Ваша запись была отменена. Если вы хотите подобрать другое время, позвоните нам или напишите в этот чат.`;

	const eventId = await withTenantCtx(organizationId, async (tx) => {
		await tx
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

		const [inserted] = await tx
			.insert(communicationEvents)
			.values({
				organizationId,
				patientId: patient.id,
				channel: "whatsapp",
				direction: "outbound",
				status: "queued",
				message: receiptText,
			})
			.returning({ id: communicationEvents.id });

		onTenantTxCommit(() => {
			wsBroker.broadcastToOrganization(organizationId, {
				type: "APPOINTMENT_UPDATED",
				payload: {
					id: targetAppt.id,
					appointmentId: targetAppt.id,
					patientId: patient.id,
					status: "cancelled",
					source: "messenger_callback",
				},
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
		});

		return inserted?.id ?? null;
	});

	const receiptSent = await dispatchAndFinalizeReceipt({
		organizationId,
		patient,
		receiptText,
		config,
		eventId,
	});

	return {
		status: "cancelled",
		appointmentId: targetAppt.id,
		receiptSent,
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
	const receiptText = `Спасибо, ${patient.fullName}! Мы приняли вашу заявку на профилактический осмотр. Администратор клиники ДЕНТЕ свяжется с вами для согласования удобного времени.`;

	const eventId = await withTenantCtx(organizationId, async (tx) => {
		if (action.recallId) {
			try {
				await withSavepoint(tx, async (spTx) => {
					await spTx
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
						);
				});
			} catch (err) {
				logger.warn(
					{ err: safeLogError(err), organizationId, recallId: action.recallId },
					"Failed to update recall task status on booking",
				);
			}
		}

		const [inserted] = await tx
			.insert(communicationEvents)
			.values({
				organizationId,
				patientId: patient.id,
				channel: "whatsapp",
				direction: "outbound",
				status: "queued",
				message: receiptText,
			})
			.returning({ id: communicationEvents.id });

		onTenantTxCommit(() => {
			wsBroker.broadcastToOrganization(organizationId, {
				type: "RECALL_BOOKING_REQUESTED",
				payload: {
					recallId: action.recallId,
					patientId: patient.id,
					patientName: patient.fullName,
					requestedVia: "whatsapp_interactive",
				},
			});
		});

		return inserted?.id ?? null;
	});

	const receiptSent = await dispatchAndFinalizeReceipt({
		organizationId,
		patient,
		receiptText,
		config,
		eventId,
	});

	return {
		status: "booking_requested",
		receiptSent,
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

	const receiptText = `Хорошо, ${patient.fullName}! Мы отложили напоминание и свяжемся с вами через месяц. Желаем здоровья вашим зубам!`;

	const eventId = await withTenantCtx(organizationId, async (tx) => {
		if (action.recallId) {
			try {
				await withSavepoint(tx, async (spTx) => {
					await spTx
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
						);
				});
			} catch (err) {
				logger.warn(
					{ err: safeLogError(err), organizationId, recallId: action.recallId },
					"Failed to snooze recall task",
				);
			}
		}

		const [inserted] = await tx
			.insert(communicationEvents)
			.values({
				organizationId,
				patientId: patient.id,
				channel: "whatsapp",
				direction: "outbound",
				status: "queued",
				message: receiptText,
			})
			.returning({ id: communicationEvents.id });

		onTenantTxCommit(() => {
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
		});

		return inserted?.id ?? null;
	});

	const receiptSent = await dispatchAndFinalizeReceipt({
		organizationId,
		patient,
		receiptText,
		config,
		eventId,
	});

	return {
		status: "snoozed",
		receiptSent,
	};
}
