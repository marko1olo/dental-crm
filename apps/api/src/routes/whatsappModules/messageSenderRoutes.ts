/**
 * whatsappModules/messageSenderRoutes.ts — Outbound WhatsApp Message Dispatcher Routes.
 *
 * Handles outbound messaging to patients, test message verification, PostgreSQL advisory lock
 * concurrency protection (with external Meta HTTP strictly OUTSIDE PG transactions), and WebSocket dispatch.
 */

import { and, eq, gt, or, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { onTenantTxCommit, withTenantCtx } from "../../db/rls.js";
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
	 * TX-split: short advisory lock & queued insert -> external HTTP -> short status update + post-commit WS.
	 */
	app.post(
		"/api/whatsapp/send",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
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

			const preflight = await withTenantCtx(orgId, async (tx) => {
				const [patient] = await tx
					.select()
					.from(patients)
					.where(
						and(eq(patients.id, patientId), eq(patients.organizationId, orgId)),
					)
					.limit(1);
				if (!patient) return { kind: "no_patient" as const };

				const [config] = await tx
					.select()
					.from(denteWhatsappBotConfigs)
					.where(eq(denteWhatsappBotConfigs.organizationId, orgId))
					.limit(1);

				return { kind: "ok" as const, patient, config: config ?? null };
			});

			if (preflight.kind === "no_patient") {
				reply.code(404);
				return {
					error: "PatientNotFound",
					message: "Пациент не найден.",
				};
			}

			const { patient, config } = preflight;

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

			// Фаза 1: короткая транзакция с advisory lock для дедупликации и резервирования события
			const reserveOutcome = await withTenantCtx(orgId, async (tx) => {
				await tx.execute(
					sql`SELECT pg_advisory_xact_lock(hashtext('whatsapp:send:' || ${orgId} || ':' || ${patientId}));`,
				);

				const sixtySecondsAgo = new Date(Date.now() - 60_000);
				const duplicateCondition = idempotencyKey
					? or(
							and(
								eq(communicationEvents.message, message),
								gt(communicationEvents.createdAt, sixtySecondsAgo),
							),
							eq(communicationEvents.idempotencyKey, idempotencyKey),
						)
					: and(
							eq(communicationEvents.message, message),
							gt(communicationEvents.createdAt, sixtySecondsAgo),
						);

				const [recentDuplicate] = await tx
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
					return { isDuplicate: true as const };
				}

				const [inserted] = await tx
					.insert(communicationEvents)
					.values({
						organizationId: orgId,
						patientId,
						channel: "whatsapp",
						direction: "outbound",
						status: "queued",
						message,
						idempotencyKey: idempotencyKey ?? null,
					})
					.returning({ id: communicationEvents.id });

				return { isDuplicate: false as const, eventId: inserted?.id ?? null };
			});

			if (reserveOutcome.isDuplicate) {
				reply.code(409);
				return {
					error: "DuplicateMessage",
					message:
						"Идентичное сообщение этому пациенту уже было отправлено менее минуты назад.",
				};
			}

			// Фаза 2: внешний HTTP-запрос строго ВНЕ PG-транзакции
			const sendResult = await sendWhatsappTextMessage({
				...credentials,
				toPhoneE164: recipient,
				text: message,
			});

			// Фаза 3: короткая транзакция фиксации результата и post-commit WS
			await withTenantCtx(orgId, async (tx) => {
				if (reserveOutcome.eventId) {
					await tx
						.update(communicationEvents)
						.set({
							status: sendResult.ok ? "sent" : "failed",
							providerCallId: sendResult.providerMessageId ?? null,
						})
						.where(
							and(
								eq(communicationEvents.id, reserveOutcome.eventId),
								eq(communicationEvents.organizationId, orgId),
							),
						);
				} else {
					await tx.insert(communicationEvents).values({
						organizationId: orgId,
						patientId,
						channel: "whatsapp",
						direction: "outbound",
						status: sendResult.ok ? "sent" : "failed",
						message,
						idempotencyKey: idempotencyKey ?? null,
						providerCallId: sendResult.providerMessageId ?? null,
					});
				}

				if (sendResult.ok) {
					onTenantTxCommit(() => {
						wsBroker.broadcastToOrganization(orgId, {
							type: "INBOX_NEW_MESSAGE",
							payload: {
								channel: "whatsapp",
								patientId,
								text: message,
								direction: "outbound",
							},
						});
					});
				}
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

			return { ok: true, providerMessageId: sendResult.providerMessageId };
		},
	);

	/**
	 * POST /api/whatsapp/test-message
	 * Отправка тестового проверочного сообщения на номер WhatsApp без привязки к карточке пациента.
	 */
	app.post(
		"/api/whatsapp/test-message",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
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

			const config = await withTenantCtx(orgId, async (tx) => {
				const [row] = await tx
					.select()
					.from(denteWhatsappBotConfigs)
					.where(eq(denteWhatsappBotConfigs.organizationId, orgId))
					.limit(1);
				return row ?? null;
			});

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
		},
	);
}
