/**
 * whatsappWebhookRoutes.ts — Authoritative Single Source of Truth for Meta WhatsApp Webhook endpoints.
 *
 * Mandate 8s: Single Source of Truth / Indivisible Authority.
 * Consolidates Meta Cloud API Webhook handshake and inbound event processing:
 * - Handshake (GET /api/whatsapp/webhook & GET /api/v1/webhooks/whatsapp)
 * - HMAC-SHA256 signature verification (x-hub-signature-256)
 * - Inbound delivery receipts ingestion (statuses)
 * - Interactive button actions resolution (confirm_appointment, cancel_appointment, recall_book, recall_snooze)
 * - Unified storage in messengerInboundEvents and dispatch via processInboundEvents.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { namedDevelopmentModeActive } from "../accessGuard.js";
import { db } from "../db/client.js";
import { withSuperuserBypass, withTenantCtx } from "../db/rls.js";
import {
	appointments,
	communicationEvents,
	communicationTasks,
	denteWhatsappBotConfigs,
	messengerInboundEvents,
	patients,
} from "../db/schema.js";
import {
	applyReceipts,
	parseWhatsappStatuses,
} from "../services/communications/deliveryReceipts.js";
import { processInboundEvents } from "../services/messengerIngestion.js";
import { wsBroker } from "../services/websocketBroker.js";
import {
	normalizeWhatsappRecipient,
	readWhatsappCredentials,
	sendWhatsappTextMessage,
} from "../whatsappTransport.js";

const DEFAULT_VERIFY_TOKEN =
	process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "dente_whatsapp_verify_token";

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

		const dateStr = new Date(targetAppt.startsAt).toLocaleString("ru-RU", {
			day: "numeric",
			month: "long",
			hour: "2-digit",
			minute: "2-digit",
		});

		const receiptText = `Спасибо, ${patient.fullName}! Ваша запись на ${dateStr} успешно подтверждена. Ждём вас в клинике ДЕНТЕ!`;

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

/**
 * Meta App Secret used to verify the `x-hub-signature-256` header on inbound
 * webhook payloads. Stored server-side only via env (never in the DB or client
 * bundle).
 */
export function configuredWhatsappAppSecret(): string | null {
	const raw = process.env.WHATSAPP_APP_SECRET ?? process.env.META_APP_SECRET;
	const trimmed = typeof raw === "string" ? raw.trim() : "";
	return trimmed.length > 0 ? trimmed : null;
}

/**
 * Verifies Meta's `x-hub-signature-256` header: HMAC-SHA256 of the raw request
 * body keyed by the App Secret, hex-encoded and prefixed with `sha256=`.
 * Uses a constant-time comparison to avoid leaking the signature via timing.
 */
export function isValidWhatsappSignature(
	rawBody: Buffer | string,
	signatureHeader: string | null,
	appSecret: string,
): boolean {
	if (!signatureHeader?.startsWith("sha256=")) return false;
	const provided = signatureHeader.slice("sha256=".length).trim();
	if (!/^[0-9a-f]+$/i.test(provided)) return false;

	const expected = createHmac("sha256", appSecret)
		.update(rawBody)
		.digest("hex");

	const providedDigest = createHash("sha256")
		.update(provided.toLowerCase())
		.digest();
	const expectedDigest = createHash("sha256").update(expected).digest();
	return timingSafeEqual(providedDigest, expectedDigest);
}

/** Точная проверка пути вебхука (без учёта query-строки). */
export function isWebhookPath(url: string): boolean {
	const pathname = (url.split("?")[0] ?? "").replace(/\/+$/, "");
	return pathname.endsWith("/webhook") || pathname.endsWith("/webhooks/whatsapp");
}

const REGISTERED_APPS = new WeakSet<object>();

export async function registerWhatsappWebhookRoutes(
	app: FastifyInstance,
): Promise<void> {
	if (REGISTERED_APPS.has(app)) {
		return;
	}
	REGISTERED_APPS.add(app);

	const webhookPaths = [
		"/api/whatsapp/webhook",
		"/api/v1/webhooks/whatsapp",
	] as const;

	/**
	 * Meta Webhook Handshake (GET /api/whatsapp/webhook & GET /api/v1/webhooks/whatsapp)
	 */
	const handleGetHandshake = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const query = request.query as Record<string, string>;
		const mode = query["hub.mode"];
		const token = query["hub.verify_token"];
		const challenge = query["hub.challenge"];

		if (mode !== "subscribe" || !token || !challenge) {
			reply.code(400);
			return { error: "BadWebhookRequest" };
		}

		let isMatched = token === DEFAULT_VERIFY_TOKEN;
		if (!isMatched) {
			try {
				const [config] = await withSuperuserBypass(async (tx) =>
					tx
						.select({
							webhookVerifyToken: denteWhatsappBotConfigs.webhookVerifyToken,
						})
						.from(denteWhatsappBotConfigs)
						.where(eq(denteWhatsappBotConfigs.webhookVerifyToken, token))
						.limit(1),
				);
				if (config) {
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

		return reply.code(403).send({
			error: "Forbidden",
			message: "Invalid webhook verification token or mode.",
		});
	};

	for (const path of webhookPaths) {
		app.get(
			path,
			{
				config: { tenantTxSelfManaged: true },
			},
			handleGetHandshake,
		);
	}

	/**
	 * Inbound Meta WhatsApp Webhook Receiver (POST)
	 */
	await app.register(async (webhookScope) => {
		webhookScope.addContentTypeParser(
			"application/json",
			{ parseAs: "buffer" },
			(request, body, done) => {
				(request as unknown as { rawBody?: Buffer }).rawBody = body as Buffer;
				try {
					const text = (body as Buffer).toString("utf8");
					done(null, text.length > 0 ? JSON.parse(text) : {});
				} catch (err) {
					done(err as Error, undefined);
				}
			},
		);

		const handlePostWebhook = async (
			request: FastifyRequest,
			reply: FastifyReply,
		) => {
			const appSecret = configuredWhatsappAppSecret();

			if (!appSecret) {
				if (!namedDevelopmentModeActive()) {
					request.log.error(
						{ requiredEnv: ["WHATSAPP_APP_SECRET"] },
						"Вебхук WhatsApp отклонён: секрет приложения не задан в окружении сервера",
					);
					reply.code(503);
					return {
						error: "WhatsappAppSecretRequired",
						message:
							"Приём сообщений WhatsApp на этом сервере не настроен: секрет приложения не задан, и подпись вебхука проверить нечем.",
					};
				}
			} else {
				const rawBody =
					(request as unknown as { rawBody?: Buffer }).rawBody ??
					Buffer.from(
						typeof request.body === "string"
							? request.body
							: JSON.stringify(request.body ?? {}),
						"utf8",
					);
				const signature =
					(request.headers["x-hub-signature-256"] as string | undefined) ??
					null;

				if (!isValidWhatsappSignature(rawBody, signature, appSecret)) {
					reply.code(401);
					return {
						error: "WhatsappSignatureMismatch",
						message: "Подпись вебхука WhatsApp недействительна.",
					};
				}
			}

			// Immediate ACK to prevent Meta retry loops
			reply.code(200).send({ received: true });

			if (
				!request.body ||
				typeof request.body !== "object" ||
				Array.isArray(request.body)
			) {
				return;
			}
			const body = request.body as Record<string, unknown>;
			const entries = Array.isArray(body.entry) ? body.entry : [];

			for (const entry of entries) {
				if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
					continue;
				}
				const e = entry as Record<string, unknown>;
				const changes = Array.isArray(e.changes)
					? (e.changes as unknown[])
					: [];

				for (const change of changes) {
					if (!change || typeof change !== "object" || Array.isArray(change)) {
						continue;
					}
					const c = change as Record<string, unknown>;
					const valueRaw = c.value;
					if (
						!valueRaw ||
						typeof valueRaw !== "object" ||
						Array.isArray(valueRaw)
					) {
						continue;
					}
					const value = valueRaw as Record<string, unknown>;

					const metadataRaw = value.metadata;
					const metadata =
						metadataRaw &&
						typeof metadataRaw === "object" &&
						!Array.isArray(metadataRaw)
							? (metadataRaw as Record<string, unknown>)
							: undefined;
					const phoneNumberId =
						typeof metadata?.phone_number_id === "string"
							? metadata.phone_number_id
							: null;
					if (!phoneNumberId) continue;

					const [orgConfig] = await withSuperuserBypass(async (tx) =>
						tx
							.select()
							.from(denteWhatsappBotConfigs)
							.where(eq(denteWhatsappBotConfigs.phoneNumberId, phoneNumberId))
							.limit(1),
					);

					if (!orgConfig) continue;
					const inboundOrganizationId = orgConfig.organizationId;

					const receipts = parseWhatsappStatuses(value.statuses);
					if (receipts.length > 0) {
						try {
							const report = await applyReceipts(receipts);
							if (report.unmatched > 0) {
								console.warn(
									`Whatsapp: квитанций без своего сообщения в очереди: ${report.unmatched}`,
								);
							}
						} catch (receiptError) {
							console.error("Whatsapp: квитанции не применены:", receiptError);
						}
					}

					const messages = Array.isArray(value.messages)
						? (value.messages as unknown[])
						: [];

					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
					const newEvents: any[] = [];
					await withTenantCtx(inboundOrganizationId, async (tx) => {
						for (const msg of messages) {
							if (!msg || typeof msg !== "object" || Array.isArray(msg)) {
								continue;
							}
							const m = msg as Record<string, unknown>;
							const fromId = typeof m.from === "string" ? m.from : "unknown";
							const textRaw = m.text;
							const textObj =
								textRaw &&
								typeof textRaw === "object" &&
								!Array.isArray(textRaw)
									? (textRaw as Record<string, unknown>)
									: undefined;
							const textBody =
								typeof textObj?.body === "string" ? textObj.body : null;

							let resolvedBody = textBody;
							const msgType = typeof m.type === "string" ? m.type : null;
							if (!resolvedBody && msgType) {
								if (msgType === "image") {
									const img = m.image as Record<string, unknown> | undefined;
									const caption =
										typeof img?.caption === "string" && img.caption.trim()
											? ` (${img.caption.trim()})`
											: "";
									resolvedBody = `[Фото]${caption}`;
								} else if (msgType === "document") {
									const doc = m.document as Record<string, unknown> | undefined;
									const filename =
										typeof doc?.filename === "string" && doc.filename.trim()
											? ` ${doc.filename.trim()}`
											: "";
									const caption =
										typeof doc?.caption === "string" && doc.caption.trim()
											? ` (${doc.caption.trim()})`
											: "";
									resolvedBody = `[Документ${filename}]${caption}`;
								} else if (msgType === "audio" || msgType === "voice") {
									resolvedBody = "[Голосовое сообщение / Аудио]";
								} else if (msgType === "video") {
									const vid = m.video as Record<string, unknown> | undefined;
									const caption =
										typeof vid?.caption === "string" && vid.caption.trim()
											? ` (${vid.caption.trim()})`
											: "";
									resolvedBody = `[Видео]${caption}`;
								} else if (msgType === "sticker") {
									resolvedBody = "[Стикер]";
								} else if (msgType === "location") {
									resolvedBody = "[Геолокация]";
								} else if (msgType === "contacts") {
									resolvedBody = "[Контактная карточка]";
								}
							}

							const rawTs =
								typeof m.timestamp === "number"
									? m.timestamp
									: typeof m.timestamp === "string"
										? Number.parseInt(m.timestamp, 10)
										: Number.NaN;
							if (!Number.isNaN(rawTs) && rawTs > 0) {
								const msgTsSec =
									rawTs > 1e11 ? Math.floor(rawTs / 1000) : rawTs;
								const nowSec = Math.floor(Date.now() / 1000);
								if (Math.abs(nowSec - msgTsSec) > 300) {
									request.log.warn(
										{ msgTsSec, nowSec },
										"WhatsApp webhook message timestamp drift > 300s, skipping ingestion",
									);
									continue;
								}
							}

							const msgId =
								typeof m.id === "string" && m.id.trim().length > 0
									? m.id.trim()
									: null;

							if (msgId) {
								const existing = await tx
									.select({ id: messengerInboundEvents.id })
									.from(messengerInboundEvents)
									.where(
										and(
											eq(
												messengerInboundEvents.organizationId,
												inboundOrganizationId,
											),
											eq(messengerInboundEvents.externalId, msgId),
										),
									)
									.limit(1);
								if (existing.length > 0) {
									request.log.info(
										{ msgId, inboundOrganizationId },
										"WhatsApp message already ingested (replay skipped)",
									);
									continue;
								}
							}

							const buttonReply = m.interactive
								? ((m.interactive as Record<string, unknown>)
										.button_reply as { id?: string; title?: string } | undefined)
								: undefined;

							const action = parseIncomingAction(
								buttonReply?.id,
								buttonReply?.title || resolvedBody || "",
								fromId,
								msgId ?? "unknown",
								rawTs && !Number.isNaN(rawTs)
									? new Date(rawTs > 1e11 ? rawTs : rawTs * 1000)
									: new Date(),
							);

							// Resolve patient by phone number suffix
							const cleanDigits = fromId.replace(/\D/g, "");
							const suffix = cleanDigits.slice(-9);

							const [patient] = await tx
								.select({
									id: patients.id,
									fullName: patients.fullName,
									phone: patients.phone,
								})
								.from(patients)
								.where(
									and(
										eq(patients.organizationId, inboundOrganizationId),
										sql`REPLACE(REPLACE(REPLACE(COALESCE(${patients.phone}, ''), '-', ''), ' ', ''), '+', '') LIKE '%' || ${suffix}`,
									),
								)
								.limit(1);

							newEvents.push({
								organizationId: inboundOrganizationId,
								channel: "whatsapp" as const,
								externalId: msgId,
								externalChatId: fromId,
								patientId: patient?.id ?? null,
								messageText: action.rawText || resolvedBody,
								eventKind: action.buttonId ? "command" : "message",
								rawPayload: m as Record<string, unknown>,
							});

							if (patient) {
								await tx.insert(communicationEvents).values({
									organizationId: inboundOrganizationId,
									patientId: patient.id,
									channel: "whatsapp",
									direction: "inbound",
									status: "delivered",
									message: action.rawText || resolvedBody || "",
								});

								if (action.type === "confirm_appointment") {
									await processAppointmentConfirmation(
										inboundOrganizationId,
										patient,
										action,
										orgConfig,
									);
								} else if (action.type === "cancel_appointment") {
									await processAppointmentCancellation(
										inboundOrganizationId,
										patient,
										action,
										orgConfig,
									);
								} else if (action.type === "recall_book") {
									await processRecallBooking(
										inboundOrganizationId,
										patient,
										action,
										orgConfig,
									);
								} else if (action.type === "recall_snooze") {
									await processRecallSnooze(
										inboundOrganizationId,
										patient,
										action,
										orgConfig,
									);
								}
							}
						}

						if (newEvents.length > 0) {
							await tx.insert(messengerInboundEvents).values(newEvents);
						}
					});
				}
			}

			void processInboundEvents().catch((err) =>
				console.error("Whatsapp ingestion error:", err),
			);
		};

		for (const path of webhookPaths) {
			webhookScope.post(
				path,
				{
					config: { tenantTxSelfManaged: true },
				},
				handlePostWebhook,
			);
		}
	});
}
