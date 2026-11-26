import { and, desc, eq, isNotNull } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { onTenantTxCommit, withTenantCtx } from "../../db/rls.js";
import {
	communicationEvents,
	denteVkBotConfigs,
	messengerInboundEvents,
	patients,
} from "../../db/schema.js";
import { safeLogError } from "../../observability/logger.js";
import { verifyWebhookSecret } from "../../security/webhookAuth.js";
import { omnichannelBotEngine } from "../../services/bots/OmnichannelBotEngine.js";
import {
	checkWebhookTimestampFreshness,
	isValidWebhookOrganizationId,
	persistInboundWebhookEventIfNew,
	resolveDecryptedWebhookSecret,
} from "../../services/bots/webhookSecretAndReplay.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { timingSafeSecretEqual } from "../../utils/timingSafeSecretEqual.js";
import { type VkWebhookBody, vkWebhookBodySchema, vkWebhookParamsSchema } from "./schemas.js";

export function registerVkWebhookRoute(server: FastifyInstance): void {
	/**
	 * POST /api/public/:organizationId/vk/webhook
	 * Публичный вебхук Callback API ВКонтакте.
	 */
	server.post<{
		Params: { organizationId: string };
		Body: VkWebhookBody;
	}>(
		"/api/public/:organizationId/vk/webhook",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			const parsedParams = vkWebhookParamsSchema.safeParse(request.params);
			const organizationId = parsedParams.success
				? parsedParams.data.organizationId
				: request.params?.organizationId;
			if (!organizationId || !isValidWebhookOrganizationId(organizationId)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный UUID организации в пути вебхука.",
				});
			}

			// 1. Поиск настроек клиники под тенант-контекстом; сбой БД никогда не откатывается к env-фоллбэку
			let clinicConfig: typeof denteVkBotConfigs.$inferSelect | null = null;
			try {
				clinicConfig = await withTenantCtx<typeof denteVkBotConfigs.$inferSelect | null>(
					organizationId,
					async (tx) => {
						const [cfg] = await tx
							.select()
							.from(denteVkBotConfigs)
							.where(eq(denteVkBotConfigs.organizationId, organizationId))
							.limit(1);
						return cfg ?? null;
					},
				);
			} catch (err) {
				request.log.error(
					{ err: safeLogError(err), organizationId },
					"Failed to load VK bot config for webhook",
				);
				return reply.code(503).send({
					error: "ServiceUnavailable",
					message: "Временная ошибка чтения настроек интеграции ВКонтакте.",
				});
			}

			// 2. Проверка секретного ключа: если конфиг клиники есть в БД, запрещён откат к глобальным env
			const rawBody = request.body as unknown;
			const bodyCandidate =
				rawBody && typeof rawBody === "object" && !Array.isArray(rawBody)
					? (rawBody as VkWebhookBody)
					: undefined;
			const incomingSecret =
				bodyCandidate?.secret ||
				(request.headers["x-vk-secret"] as string | undefined);

			if (clinicConfig) {
				const configuredSecret = resolveDecryptedWebhookSecret(
					clinicConfig.secretKey,
					organizationId,
					request.log,
				);
				if (
					!configuredSecret ||
					!timingSafeSecretEqual(incomingSecret ?? null, configuredSecret)
				) {
					request.log.warn(
						{ organizationId },
						"VK Callback API secret mismatch for organization",
					);
					return reply.code(403).send({
						error: "Unauthorized",
						message: "Неверный секретный ключ Callback API ВКонтакте",
					});
				}
			} else {
				if (
					!verifyWebhookSecret(request, reply, {
						channel: "vk",
						secretEnvNames: ["VK_WEBHOOK_SECRET", "DENTE_WEBHOOK_SECRET"],
						extraHeaderNames: ["x-vk-secret"],
					})
				) {
					return reply;
				}
			}

			// Shape guard (отсекаем null, массивы и скаляры с 200 ok)
			if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
				return reply.code(200).send("ok");
			}
			const parsedBody = vkWebhookBodySchema.safeParse(rawBody);
			if (!parsedBody.success) {
				return reply.code(200).send("ok");
			}
			const body: VkWebhookBody = parsedBody.data;

			// 3. Callback API Server Confirmation
			if (body.type === "confirmation") {
				const confirmationToken = clinicConfig
					? clinicConfig.confirmationCode?.trim() || null
					: process.env.VK_CONFIRMATION_TOKEN?.trim() || null;

				if (!confirmationToken) {
					request.log.error(
						{ organizationId },
						"Подтверждение сервера Callback API ВКонтакте отклонено: код подтверждения не задан",
					);
					return reply.code(503).send({
						error: "VkConfirmationTokenMissing",
						message:
							"Приём сообщений из ВКонтакте не настроен: код подтверждения не задан.",
					});
				}
				return reply.code(200).send(confirmationToken);
			}

			// 4. Новое сообщение (message_new)
			if (body.type === "message_new") {
				const vkId = body.object?.message?.from_id?.toString();
				const text = body.object?.message?.text || "";

				if (!vkId) return reply.code(200).send("ok");

				const freshness = checkWebhookTimestampFreshness(
					body.object?.message?.date ?? body.date,
					300,
				);
				if (!freshness.fresh) {
					request.log.warn(
						{ msgTsSec: freshness.msgTsSec, nowSec: freshness.nowSec },
						"VK webhook message timestamp drift > 300s, skipping ingestion",
					);
					return reply.code(200).send("ok");
				}

				const rawExternalId =
					body.object?.message?.id != null
						? String(body.object.message.id).trim()
						: body.event_id
							? String(body.event_id).trim()
							: null;
				const externalId =
					rawExternalId && rawExternalId.length > 0 ? rawExternalId : null;

				await withTenantCtx(organizationId, async (tx) => {
					if (externalId) {
						const { isReplay } = await persistInboundWebhookEventIfNew(tx, {
							organizationId,
							channel: "vk",
							externalId,
							externalChatId: vkId,
							messageText: text,
							rawPayload: rawBody as Record<string, unknown>,
						});
						if (isReplay) {
							request.log.info(
								{ externalId, organizationId },
								"VK message already ingested (replay skipped)",
							);
							return;
						}
					}

					// Реляционный поиск пациента через messengerInboundEvents.externalChatId + patientId
					let patient: typeof patients.$inferSelect | null = null;
					const [linkedInbound] = await tx
						.select({ patientId: messengerInboundEvents.patientId })
						.from(messengerInboundEvents)
						.where(
							and(
								eq(messengerInboundEvents.organizationId, organizationId),
								eq(messengerInboundEvents.channel, "vk"),
								eq(messengerInboundEvents.externalChatId, vkId),
								isNotNull(messengerInboundEvents.patientId),
							),
						)
						.orderBy(desc(messengerInboundEvents.createdAt))
						.limit(1);

					if (linkedInbound?.patientId) {
						const [found] = await tx
							.select()
							.from(patients)
							.where(
								and(
									eq(patients.organizationId, organizationId),
									eq(patients.id, linkedInbound.patientId),
								),
							)
							.limit(1);
						patient = found ?? null;
					}

					if (!patient) {
						const insertedPatients = await tx
							.insert(patients)
							.values({
								organizationId,
								fullName: `Пациент VK ${vkId}`,
								notes: "Создан автоматически из ВКонтакте.",
								status: "active",
							})
							.returning();
						patient = insertedPatients[0] || null;
					}

					if (!patient) return;

					if (externalId) {
						await tx
							.update(messengerInboundEvents)
							.set({ patientId: patient.id })
							.where(
								and(
									eq(messengerInboundEvents.organizationId, organizationId),
									eq(messengerInboundEvents.channel, "vk"),
									eq(messengerInboundEvents.externalId, externalId),
								),
							);
					} else {
						await tx.insert(messengerInboundEvents).values({
							organizationId,
							channel: "vk",
							externalChatId: vkId,
							patientId: patient.id,
							messageText: text,
							eventKind: "message",
							rawPayload: rawBody as Record<string, unknown>,
						});
					}

					const [newEvent] = await tx
						.insert(communicationEvents)
						.values({
							organizationId,
							patientId: patient.id,
							channel: "vk",
							direction: "inbound",
							status: "delivered",
							message: text,
						})
						.returning();

					if (newEvent) {
						const savedPatient = patient;
						onTenantTxCommit(() => {
							wsBroker.broadcastToOrganization(organizationId, {
								type: "INBOX_NEW_MESSAGE",
								payload: {
									id: newEvent.id,
									channel: "vk",
									patientId: savedPatient.id,
									patientName: savedPatient.fullName,
									text,
									direction: "inbound",
									createdAt: newEvent.createdAt.toISOString(),
								},
							});
						});
					}
				});

				try {
					await omnichannelBotEngine.dispatchInboundMessage({
						channel: "vk",
						organizationId,
						botConfigId: "default",
						senderId: vkId,
						messageId: externalId,
						text,
						timestamp: Date.now(),
						rawEvent: rawBody as Record<string, unknown>,
					});
				} catch (err) {
					request.log.warn(
						{ err: safeLogError(err), organizationId },
						"VK bot engine auto-reply failed",
					);
				}
			}

			return reply.code(200).send("ok");
		},
	);
}
