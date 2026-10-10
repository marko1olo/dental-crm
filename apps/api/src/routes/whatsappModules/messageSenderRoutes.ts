/**
 * whatsappModules/messageSenderRoutes.ts — Outbound WhatsApp Message Dispatcher Routes.
 *
 * Handles outbound messaging to patients, test message verification, PostgreSQL advisory lock
 * concurrency protection, idempotency guards, and WebSocket dispatch to CRM.
 */

import { and, eq, gt, ilike, or, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	communicationEvents,
	denteWhatsappBotConfigs,
	patients,
} from "../../db/schema.js";
import { wsBroker } from "../../services/websocketBroker.js";
import {
	normalizeWhatsappRecipient,
	readWhatsappCredentials,
	sendWhatsappTextMessage,
} from "../../whatsappTransport.js";
import {
	sendWhatsappMessageSchema,
	sendWhatsappTestMessageSchema,
} from "./types.js";

/**
 * Registers outbound WhatsApp message dispatch routes.
 */
export async function registerMessageSenderRoutes(
	app: FastifyInstance,
): Promise<void> {
	/**
	 * POST /api/whatsapp/send
	 * Sends an outbound WhatsApp message to a patient.
	 */
	app.post("/api/whatsapp/send", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"whatsapp message send",
		);
		if (!orgId) return;

		const parsed = sendWhatsappMessageSchema.safeParse(request.body);
		if (!parsed.success) {
			reply.code(400);
			return {
				error: "ValidationError",
				message: "Укажите ID пациента и текст сообщения.",
			};
		}

		const { patientId, message, idempotencyKey } = parsed.data;

		const [patient] = await db
			.select()
			.from(patients)
			.where(
				and(eq(patients.id, patientId), eq(patients.organizationId, orgId)),
			)
			.limit(1);

		if (!patient) {
			reply.code(404);
			return {
				error: "PatientNotFound",
				message: "Пациент не найден.",
			};
		}

		const [config] = await db
			.select()
			.from(denteWhatsappBotConfigs)
			.where(eq(denteWhatsappBotConfigs.organizationId, orgId))
			.limit(1);

		if (!config?.isActive) {
			reply.code(400);
			return {
				error: "WhatsappInactive",
				message: "Интеграция WhatsApp неактивна или не настроена.",
			};
		}

		const credentials = readWhatsappCredentials({
			...config,
			organizationId: orgId,
		});
		if (!credentials) {
			reply.code(400);
			return {
				error: "WhatsappNotConfigured",
				message:
					"Не заданы phone_number_id и токен доступа WhatsApp Cloud API. Сообщение не отправлено.",
			};
		}

		const recipient = normalizeWhatsappRecipient(patient.phone);
		if (!recipient) {
			reply.code(422);
			return {
				error: "PatientPhoneMissing",
				message:
					"У пациента не указан корректный номер телефона — отправить сообщение в WhatsApp некуда.",
			};
		}

		// PostgreSQL advisory lock to serialize concurrent sends to the same patient
		await db.execute(
			sql`SELECT pg_advisory_xact_lock(hashtext('whatsapp:send:' || ${orgId} || ':' || ${patientId}));`,
		);

		// Защита от дублей: если идентичное сообщение этому пациенту уже уходило за последние 60 секунд (или по idempotencyKey)
		const sixtySecondsAgo = new Date(Date.now() - 60_000);
		const duplicateCondition = idempotencyKey
			? or(
					and(
						eq(communicationEvents.message, message),
						gt(communicationEvents.createdAt, sixtySecondsAgo),
					),
					ilike(
						communicationEvents.message,
						`%[idempotency:${idempotencyKey}]%`,
					),
				)
			: and(
					eq(communicationEvents.message, message),
					gt(communicationEvents.createdAt, sixtySecondsAgo),
				);

		const [recentDuplicate] = await db
			.select({ id: communicationEvents.id })
			.from(communicationEvents)
			.where(
				and(
					eq(communicationEvents.organizationId, orgId),
					eq(communicationEvents.patientId, patientId),
					eq(communicationEvents.channel, "whatsapp"),
					eq(communicationEvents.direction, "outbound"),
					duplicateCondition,
				),
			)
			.limit(1);

		if (recentDuplicate) {
			reply.code(409);
			return {
				error: "DuplicateMessage",
				message:
					"Идентичное сообщение этому пациенту уже было отправлено менее минуты назад.",
			};
		}

		const sendResult = await sendWhatsappTextMessage({
			...credentials,
			toPhoneE164: recipient,
			text: message,
		});

		// Запись в историю коммуникаций делается по фактическому результату:
		// неудачная отправка сохраняется со статусом failed, а не как sent.
		const recordedMessage = idempotencyKey
			? `${message} [idempotency:${idempotencyKey}]`
			: message;
		await db.insert(communicationEvents).values({
			organizationId: orgId,
			patientId,
			channel: "whatsapp",
			direction: "outbound",
			status: sendResult.ok ? "sent" : "failed",
			message: recordedMessage,
		});

		if (!sendResult.ok) {
			request.log.warn(
				{ errorClass: sendResult.errorClass, errorCode: sendResult.errorCode },
				"WhatsApp Cloud API отклонил сообщение",
			);
			reply.code(502);
			return {
				error: "WhatsappSendFailed",
				errorClass: sendResult.errorClass,
				message: sendResult.errorMessage,
			};
		}

		// Событие в интерфейс рассылается только после подтверждения от Meta.
		wsBroker.broadcastToOrganization(orgId, {
			type: "INBOX_NEW_MESSAGE",
			payload: {
				channel: "whatsapp",
				patientId,
				text: message,
				direction: "outbound",
			},
		});

		return { ok: true, providerMessageId: sendResult.providerMessageId };
	});

	/**
	 * POST /api/whatsapp/test-message
	 * Отправка тестового проверочного сообщения на номер WhatsApp без привязки к карточке пациента.
	 */
	app.post("/api/whatsapp/test-message", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"whatsapp test message send",
		);
		if (!orgId) return;

		const parsed = sendWhatsappTestMessageSchema.safeParse(request.body);
		if (!parsed.success) {
			reply.code(400);
			return {
				error: "ValidationError",
				message:
					parsed.error.issues[0]?.message ||
					"Укажите номер телефона и текст сообщения.",
			};
		}

		const [config] = await db
			.select()
			.from(denteWhatsappBotConfigs)
			.where(eq(denteWhatsappBotConfigs.organizationId, orgId))
			.limit(1);

		const credentials = config
			? readWhatsappCredentials({ ...config, organizationId: orgId })
			: null;
		if (!credentials) {
			reply.code(400);
			return {
				error: "WhatsappNotConfigured",
				message: "WhatsApp не настроен или не заданы ключи доступа.",
			};
		}

		const recipient = normalizeWhatsappRecipient(parsed.data.phone);
		if (!recipient) {
			reply.code(422);
			return {
				error: "InvalidPhone",
				message: "Некорректный номер телефона получателя.",
			};
		}

		const sendResult = await sendWhatsappTextMessage({
			...credentials,
			toPhoneE164: recipient,
			text: parsed.data.message,
		});

		if (!sendResult.ok) {
			reply.code(502);
			return {
				error: "WhatsappSendFailed",
				message: sendResult.errorMessage,
			};
		}

		return {
			ok: true,
			providerMessageId: sendResult.providerMessageId,
			message: "Тестовое сообщение отправлено!",
		};
	});
}
