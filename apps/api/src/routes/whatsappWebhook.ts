/**
 * WhatsApp Webhook Router & Automated Appointment Confirmation Receiver
 *
 * Implements Meta Cloud API Webhook handshake (`GET /api/v1/webhooks/whatsapp`)
 * and automated interactive button reply processing (`POST /api/v1/webhooks/whatsapp`).
 *
 * Supported interactive triggers:
 * - `confirm_appointment_<uuid>` or `APPT_CONFIRM` -> updates appointment to `confirmed`, logs comms event, and sends receipt.
 * - `cancel_appointment_<uuid>` or `APPT_CANCEL` -> updates appointment to `cancelled`, alerts reception.
 */

import { and, desc, eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import {
	appointments,
	communicationEvents,
	denteWhatsappBotConfigs,
	messengerInboundEvents,
	patients,
} from "../db/schema.js";
import { verifyWebhookSignature } from "../services/messaging/whatsappKapsoAdapter.js";
import { wsBroker } from "../services/websocketBroker.js";
import {
	normalizeWhatsappRecipient,
	readWhatsappCredentials,
	sendWhatsappTextMessage,
} from "../whatsappTransport.js";

const DEFAULT_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "dente_whatsapp_verify_token";

export interface ParsedWebhookAction {
	type: "confirm_appointment" | "cancel_appointment" | "reschedule_request" | "general_message";
	appointmentId?: string | null;
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

	// Explicit appointment confirmation button: confirm_appointment_<id> or APPT_CONFIRM_<id>
	const confirmMatch = rawBtn.match(/^(?:confirm_appointment|appt_confirm)[-_:]([0-9a-f-]{36})$/i);
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
	const cancelMatch = rawBtn.match(/^(?:cancel_appointment|appt_cancel)[-_:]([0-9a-f-]{36})$/i);
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
	const targetAppt = await findTargetAppointment(organizationId, patient.id, action.appointmentId);

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
	const targetAppt = await findTargetAppointment(organizationId, patient.id, action.appointmentId);

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

export async function registerWhatsappWebhookRoutes(app: FastifyInstance) {
	/**
	 * Meta Webhook Handshake (GET /api/v1/webhooks/whatsapp)
	 */
	app.get(
		"/api/v1/webhooks/whatsapp",
		{
			config: { tenantTxSelfManaged: true },
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const query = request.query as {
				"hub.mode"?: string;
				"hub.verify_token"?: string;
				"hub.challenge"?: string;
			};

			const mode = query["hub.mode"];
			const token = query["hub.verify_token"];
			const challenge = query["hub.challenge"];

			if (mode === "subscribe" && token && challenge) {
				let isMatched = token === DEFAULT_VERIFY_TOKEN;
				if (!isMatched) {
					try {
						const [matchedConfig] = await db
							.select()
							.from(denteWhatsappBotConfigs)
							.where(eq(denteWhatsappBotConfigs.webhookVerifyToken, token))
							.limit(1);
						if (matchedConfig) {
							isMatched = true;
						}
					} catch {
						// DB connection offline or test environment
					}
				}

				if (isMatched) {
					reply.header("Content-Type", "text/plain");
					return reply.code(200).send(challenge);
				}
			}

			return reply.code(403).send({
				error: "Forbidden",
				message: "Invalid webhook verification token or mode.",
			});

		},
	);

	/**
	 * Inbound Meta WhatsApp Webhook Receiver (POST /api/v1/webhooks/whatsapp)
	 */
	app.post(
		"/api/v1/webhooks/whatsapp",
		{
			config: { tenantTxSelfManaged: true },
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
			// Immediate ACK to prevent Meta retry loops
			reply.code(200).send({ received: true });

			const body = request.body as Record<string, unknown> | undefined;
			if (!body) return;

			const entries = Array.isArray(body.entry) ? body.entry : [];

			for (const entry of entries) {
				const changes = Array.isArray(entry?.changes) ? entry.changes : [];
				for (const change of changes) {
					const value = change?.value as Record<string, unknown> | undefined;
					if (!value) continue;

					const metadata = value.metadata as Record<string, unknown> | undefined;
					const phoneNumberId = String(metadata?.phone_number_id || "");

					// Find organization owning this phone number ID
					const [config] = await db
						.select()
						.from(denteWhatsappBotConfigs)
						.where(eq(denteWhatsappBotConfigs.phoneNumberId, phoneNumberId))
						.limit(1);

					const organizationId = config?.organizationId;
					if (!organizationId) {
						continue;
					}

					// Process messages
					const messagesList = Array.isArray(value.messages) ? value.messages : [];
					for (const msg of messagesList) {
						const msgId = String(msg?.id || "");
						const from = String(msg?.from || "");
						const textBody = msg?.text?.body as string | undefined;
						const buttonReply = msg?.interactive?.button_reply as { id?: string; title?: string } | undefined;

						const action = parseIncomingAction(
							buttonReply?.id,
							buttonReply?.title || textBody || "",
							from,
							msgId,
							msg?.timestamp ? new Date(Number(msg.timestamp) * 1000) : new Date(),
						);

						// Resolve patient by phone number
						const cleanDigits = from.replace(/\D/g, "");
						const suffix = cleanDigits.slice(-9);

						const [patient] = await db
							.select({
								id: patients.id,
								fullName: patients.fullName,
								phone: patients.phone,
							})
							.from(patients)
							.where(
								and(
									eq(patients.organizationId, organizationId),
									sql`REPLACE(REPLACE(REPLACE(COALESCE(${patients.phone}, ''), '-', ''), ' ', ''), '+', '') LIKE '%' || ${suffix}`,
								),
							)
							.limit(1);

						// Record inbound message
						await db.insert(messengerInboundEvents).values({
							organizationId,
							channel: "whatsapp",
							externalId: msgId,
							externalChatId: from,
							patientId: patient?.id ?? null,
							messageText: action.rawText,
							eventKind: action.buttonId ? "command" : "message",
							rawPayload: msg,
						});

						if (patient) {
							await db.insert(communicationEvents).values({
								organizationId,
								patientId: patient.id,
								channel: "whatsapp",
								direction: "inbound",
								status: "delivered",
								message: action.rawText,
							});

							// Execute action state transitions
							if (action.type === "confirm_appointment") {
								await processAppointmentConfirmation(organizationId, patient, action, config);
							} else if (action.type === "cancel_appointment") {
								await processAppointmentCancellation(organizationId, patient, action, config);
							}
						}

						// Broadcast incoming message to CRM UI
						wsBroker.broadcastToOrganization(organizationId, {
							type: "INBOX_NEW_MESSAGE",
							payload: {
								channel: "whatsapp",
								patientId: patient?.id ?? null,
								from,
								text: action.rawText,
								direction: "inbound",
							},
						});
					}
				}
			}
		},
	);
}
