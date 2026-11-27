/**
 * MAX (VK Max) messenger bot routes
 *
 * MAX is the Russian national messenger platform (business.max.ru).
 * Requires a verified business account and approved bot token.
 * The API pattern mirrors VK Teams Bot API.
 *
 * Docs: https://business.max.ru (requires business account login)
 */
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireNonDoctorAccess,
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { onTenantTxCommit, withSuperuserBypass, withTenantCtx } from "../db/rls.js";
import {
	communicationEvents,
	denteMaxBotConfigs,
	patients,
} from "../db/schema.js";
import { sendMaxTextMessage } from "../maxTransport.js";
import { safeLogError } from "../observability/logger.js";
import { verifyWebhookSecret } from "../security/webhookAuth.js";
import { OmnichannelTokenVault } from "../services/bots/OmnichannelTokenVault.js";
import {
	checkWebhookTimestampFreshness,
	persistInboundWebhookEventIfNew,
	resolveDecryptedWebhookSecret,
} from "../services/bots/webhookSecretAndReplay.js";
import { resolveRecipientAddress } from "../services/communications/dispatch/channelAdapters.js";
import { processInboundEvents } from "../services/messengerIngestion.js";
import { wsBroker } from "../services/websocketBroker.js";
import { timingSafeSecretEqual } from "../utils/timingSafeSecretEqual.js";

const updateMaxConfigSchema = z
	.object({
		botId: z.string().trim().max(128).nullable().optional(),
		// Raw API token — hashed and stored as tokenSecretRef, never returned
		apiToken: z.string().trim().max(512).optional(),
		webhookUrl: z.string().trim().max(512).nullable().optional(),
		enabledFeatures: z.array(z.string()).optional(),
		staffRouting: z
			.object({
				defaultUserId: z.string().uuid().nullable(),
				rules: z
					.array(
						z
							.object({
								intent: z.string(),
								assignToUserId: z.string().uuid().nullable(),
							})
							.strict(),
					)
					.default([]),
			})
			.strict()
			.optional(),
		isActive: z.boolean().optional(),
	})
	.strict();

const maxSendBodySchema = z
	.object({
		patientId: z.string().uuid(),
		message: z.string().min(1),
	})
	.strict();

function parseJsonSafe<T>(value: unknown, fallback: T, logger?: { error: (obj: unknown, msg?: string) => void }): T {
	if (!value) return fallback;
	if (typeof value === "string") {
		try {
			return JSON.parse(value) as T;
		} catch (err) {
			logger?.error({ err }, "[Dente] parseJsonSafe failed");
			return fallback;
		}
	}
	return value as T;
}

/** Точная проверка пути вебхука (без учёта query-строки). */
function isWebhookPath(url: string): boolean {
	const pathname = (url.split("?")[0] ?? "").replace(/\/+$/, "");
	return pathname.endsWith("/webhook");
}

export async function registerMaxRoutes(app: FastifyInstance): Promise<void> {
	app.addHook("preHandler", async (request, reply) => {
		if (isWebhookPath(request.url)) {
			const hasGlobalSecret = Boolean(
				process.env.MAX_WEBHOOK_SECRET?.trim() ||
					process.env.DENTE_WEBHOOK_SECRET?.trim(),
			);
			if (!hasGlobalSecret) {
				const botIdRaw =
					request.headers["x-max-bot-id"] ??
					(request.query as Record<string, string>)?.botId;
				const botId = Array.isArray(botIdRaw) ? botIdRaw[0] : botIdRaw;
				const secretHeader =
					request.headers["x-dente-webhook-secret"] ??
					request.headers["x-max-bot-api-secret"];
				const providedSecret = Array.isArray(secretHeader)
					? secretHeader[0]
					: secretHeader;

				if (botId?.trim() && providedSecret?.trim()) {
					const matchedConfigs = await withSuperuserBypass(async (tx) =>
						tx
							.select({
								organizationId: denteMaxBotConfigs.organizationId,
								tokenSecretRef: denteMaxBotConfigs.tokenSecretRef,
								maxBotToken: denteMaxBotConfigs.maxBotToken,
							})
							.from(denteMaxBotConfigs)
							.where(eq(denteMaxBotConfigs.botId, botId.trim()))
							.limit(2),
					);
					if (matchedConfigs.length > 1) {
						request.log.error(
							{ botId: botId.trim() },
							"MAX webhook rejected: ambiguous botId shared across multiple organizations",
						);
						return reply.code(409).send({
							error: "AmbiguousBotId",
							message: "Идентификатор бота MAX привязан более чем к одной организации.",
						});
					}
					const orgConfig = matchedConfigs[0];
					const storedSecret = OmnichannelTokenVault.resolveOperationalToken(
						orgConfig?.tokenSecretRef ?? orgConfig?.maxBotToken,
						orgConfig?.organizationId ?? "default",
					);
					if (storedSecret && timingSafeSecretEqual(providedSecret.trim(), storedSecret)) {
						return;
					}
					if (orgConfig) {
						return reply.code(401).send({
							error: "UnauthorizedWebhook",
							message: "Неверный секрет MAX вебхука.",
						});
					}
				}
			}

			if (
				!verifyWebhookSecret(request, reply, {
					channel: "max",
					secretEnvNames: ["MAX_WEBHOOK_SECRET", "DENTE_WEBHOOK_SECRET"],
				})
			) {
				return reply;
			}
			return;
		}
		const allowed = await requireNonDoctorAccess(request, reply);
		if (!allowed) {
			return reply;
		}
	});

	/**
	 * GET /api/max/settings
	 * Returns the MAX bot config. Raw API token never returned.
	 */
	app.get("/api/max/settings", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"max settings read",
		);
		if (!orgId) return;

		const config = await withTenantCtx(orgId, async (tx) => {
			const [row] = await tx
				.select()
				.from(denteMaxBotConfigs)
				.where(eq(denteMaxBotConfigs.organizationId, orgId))
				.limit(1);
			return row ?? null;
		});

		if (!config) {
			return reply.code(404).send({
				error: "MaxConfigNotFound",
				message: "MAX-бот не настроен для этой организации.",
			});
		}

		return {
			id: config.id,
			organizationId: config.organizationId,
			botId: config.botId ?? null,
			hasToken: Boolean(config.tokenSecretRef),
			webhookUrl: config.webhookUrl ?? null,
			enabledFeatures: parseJsonSafe<string[]>(config.enabledFeaturesJson, [], request.log),
			staffRouting: parseJsonSafe(
				config.staffRoutingJson,
				{
					defaultUserId: null,
					rules: [],
				},
				request.log,
			),
			isActive: config.isActive,
			updatedAt: (config.updatedAt ?? new Date()).toISOString(),
		};
	});

	/**
	 * PUT /api/max/settings
	 * Creates or updates the MAX bot config.
	 */
	app.put("/api/max/settings", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"max settings write",
		);
		if (!orgId) return;

		const parsed = updateMaxConfigSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "MaxConfigValidationError",
				message: "Проверьте параметры настройки MAX.",
			});
		}

		const input = parsed.data;
		const now = new Date();

		await withTenantCtx(orgId, async (tx) => {
			const [existing] = await tx
				.select({ id: denteMaxBotConfigs.id })
				.from(denteMaxBotConfigs)
				.where(eq(denteMaxBotConfigs.organizationId, orgId))
				.limit(1);

			if (existing) {
				const updateValues: Partial<typeof denteMaxBotConfigs.$inferInsert> = {
					updatedAt: now,
				};

				if (input.botId !== undefined) updateValues.botId = input.botId;
				if (input.apiToken) {
					const encToken = OmnichannelTokenVault.isEncrypted(input.apiToken)
						? input.apiToken
						: OmnichannelTokenVault.encrypt(input.apiToken, orgId);
					updateValues.maxBotToken = encToken;
					updateValues.tokenSecretRef = encToken;
				}
				if (input.webhookUrl !== undefined) updateValues.webhookUrl = input.webhookUrl;
				if (input.enabledFeatures !== undefined) {
					updateValues.enabledFeaturesJson = JSON.stringify(input.enabledFeatures);
				}
				if (input.staffRouting !== undefined) {
					updateValues.staffRoutingJson = JSON.stringify(input.staffRouting);
				}
				if (input.isActive !== undefined) {
					updateValues.isActive = input.isActive;
					updateValues.isEnabled = input.isActive;
				}

				await tx
					.update(denteMaxBotConfigs)
					.set(updateValues)
					.where(eq(denteMaxBotConfigs.organizationId, orgId));
			} else {
				const encToken = input.apiToken
					? OmnichannelTokenVault.isEncrypted(input.apiToken)
						? input.apiToken
						: OmnichannelTokenVault.encrypt(input.apiToken, orgId)
					: null;

				await tx.insert(denteMaxBotConfigs).values({
					organizationId: orgId,
					botId: input.botId ?? null,
					maxBotToken: encToken,
					tokenSecretRef: encToken,
					webhookUrl: input.webhookUrl ?? null,
					enabledFeaturesJson: JSON.stringify(input.enabledFeatures ?? []),
					staffRoutingJson: JSON.stringify(
						input.staffRouting ?? { defaultUserId: null, rules: [] },
					),
					isActive: input.isActive ?? false,
					isEnabled: input.isActive ?? false,
				});
			}
		});

		return reply.code(200).send({ ok: true });
	});

	/**
	 * GET /api/max/status
	 * Returns whether MAX bot config is present and active.
	 */
	app.get("/api/max/status", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"max status",
		);
		if (!orgId) return;

		const config = await withTenantCtx(orgId, async (tx) => {
			const [row] = await tx
				.select()
				.from(denteMaxBotConfigs)
				.where(eq(denteMaxBotConfigs.organizationId, orgId))
				.limit(1);
			return row ?? null;
		});

		if (!config?.botId || (!config.tokenSecretRef && !config.maxBotToken)) {
			return {
				channel: "max",
				connected: false,
				detail:
					"MAX не настроен: нужны Bot ID и API Token из панели business.max.ru.",
			};
		}

		return {
			channel: "max",
			connected: config.isActive,
			detail: config.isActive
				? `MAX-бот ${config.botId} настроен.`
				: "MAX-бот неактивен.",
		};
	});

	async function processMaxInboundEvent(
		body: Record<string, unknown>,
		botIdHeader: string,
		request: FastifyRequest,
	): Promise<boolean> {
		const payloadRaw = body.payload;
		if (
			!payloadRaw ||
			typeof payloadRaw !== "object" ||
			Array.isArray(payloadRaw)
		) {
			return false;
		}
		const payload = payloadRaw as Record<string, unknown>;

		const chatRaw = payload.chat;
		const chat =
			chatRaw && typeof chatRaw === "object" && !Array.isArray(chatRaw)
				? (chatRaw as Record<string, unknown>)
				: undefined;
		const textValue = payload.text;
		const text = typeof textValue === "string" ? textValue : null;
		const chatId = typeof chat?.chatId === "string" ? chat.chatId : "unknown";

		const freshness = checkWebhookTimestampFreshness(
			payload.timestamp ?? body.timestamp,
			300,
		);
		if (!freshness.fresh) {
			request.log.warn(
				{ msgTsSec: freshness.msgTsSec, nowSec: freshness.nowSec },
				"MAX webhook timestamp drift > 300s, skipping ingestion",
			);
			return false;
		}

		const msgIdRaw =
			payload.msgId ??
			payload.msg_id ??
			payload.messageId ??
			body.msgId ??
			body.eventId ??
			body.event_id;
		const msgId =
			typeof msgIdRaw === "string" || typeof msgIdRaw === "number"
				? String(msgIdRaw).trim()
				: null;

		const matchedConfigs = await withSuperuserBypass(async (tx) =>
			tx
				.select({ organizationId: denteMaxBotConfigs.organizationId })
				.from(denteMaxBotConfigs)
				.where(eq(denteMaxBotConfigs.botId, botIdHeader))
				.limit(2),
		);
		if (matchedConfigs.length > 1) {
			request.log.error(
				{ botId: botIdHeader },
				"MAX webhook skipped: ambiguous botId configured across multiple organizations",
			);
			return false;
		}
		const orgConfig = matchedConfigs[0];

		if (!orgConfig) return false;

		const inboundOrganizationId = orgConfig.organizationId;
		await withTenantCtx(inboundOrganizationId, async (tx) => {
			const { isReplay } = await persistInboundWebhookEventIfNew(tx, {
				organizationId: inboundOrganizationId,
				channel: "max",
				externalId: msgId,
				externalChatId: chatId,
				messageText: text,
				rawPayload: body as Record<string, unknown>,
			});
			if (isReplay) {
				request.log.info(
					{ msgId, inboundOrganizationId },
					"MAX message already ingested (replay skipped)",
				);
			}
		});
		return true;
	}

	/**
	 * POST /api/max/webhook
	 * Receives inbound events from MAX messenger platform.
	 * Always responds 200 immediately.
	 */
	// door-validation: none — Входящий вебхук MAX Messenger с динамической сигнатурой и асинхронной обработкой событий
	app.post(
		"/api/max/webhook",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			reply.code(200).send({ ok: true });

			if (!request.body || typeof request.body !== "object") {
				return;
			}

			const botIdRaw =
				request.headers["x-max-bot-id"] ??
				(request.query as Record<string, string>).botId;
			const botIdHeader = Array.isArray(botIdRaw) ? botIdRaw[0] : botIdRaw;

			if (!botIdHeader) return;

			const rawEvents: unknown[] = Array.isArray(request.body)
				? request.body
				: [request.body];

			let hasPersistedEvent = false;
			for (const rawItem of rawEvents) {
				if (rawItem && typeof rawItem === "object" && !Array.isArray(rawItem)) {
					try {
						const persisted = await processMaxInboundEvent(
							rawItem as Record<string, unknown>,
							botIdHeader,
							request,
						);
						if (persisted) {
							hasPersistedEvent = true;
						}
					} catch (err) {
						request.log.warn(
							{ err: safeLogError(err), botIdHeader },
							"MAX webhook item processing failed",
						);
					}
				}
			}

			if (hasPersistedEvent) {
				void processInboundEvents().catch((err) =>
					request.log.error({ err: safeLogError(err) }, "[Dente] MAX inbound ingestion error"),
				);
			}
		},
	);

	/**
	 * POST /api/max/send
	 * Sends an outbound VK Max message to a patient (HTTP outside PG TX).
	 */
	app.post(
		"/api/max/send",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"max message send",
			);
			if (!orgId) return;

			const parsed = maxSendBodySchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Укажите ID пациента и текст сообщения.",
				});
			}

			const { patientId, message } = parsed.data;

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
					.from(denteMaxBotConfigs)
					.where(eq(denteMaxBotConfigs.organizationId, orgId))
					.limit(1);
				return { kind: "ok" as const, config: config ?? null };
			});

			if (preflight.kind === "no_patient") {
				return reply.code(404).send({
					error: "PatientNotFound",
					message: "Пациент не найден.",
				});
			}

			const config = preflight.config;
			if (!config?.isActive) {
				return reply.code(400).send({
					error: "MaxInactive",
					message: "Интеграция VK Max неактивна или не настроена.",
				});
			}

			const rawStoredToken = config.maxBotToken || config.tokenSecretRef;
			if (!rawStoredToken) {
				return reply.code(400).send({
					error: "MaxTokenMissing",
					message: "В конфигурации MAX не указан токен бота.",
				});
			}

			const botToken = resolveDecryptedWebhookSecret(rawStoredToken, orgId, request.log);
			if (!botToken) {
				return reply.code(400).send({
					error: "MaxTokenInvalid",
					message: "Не удалось расшифровать токен бота MAX.",
				});
			}

			const { address: recipientAddress, reason: addressReason } =
				await resolveRecipientAddress(orgId, "max", patientId);

			if (!recipientAddress) {
				return reply.code(422).send({
					error: "RecipientUnavailable",
					message:
						addressReason ||
						"У пациента нет переписки в MAX: отправить первым может только бот, которому пациент уже написал.",
				});
			}

			// Исходящий HTTP строго вне транзакции PostgreSQL
			const sendResult = await sendMaxTextMessage({
				botToken,
				recipient: { kind: "chat", id: recipientAddress },
				text: message,
			});

			const event = await withTenantCtx(orgId, async (tx) => {
				const [inserted] = await tx
					.insert(communicationEvents)
					.values({
						organizationId: orgId,
						patientId,
						channel: "max",
						direction: "outbound",
						status: sendResult.ok ? "sent" : "failed",
						message,
					})
					.returning();

				if (sendResult.ok && inserted) {
					onTenantTxCommit(() => {
						wsBroker.broadcastToOrganization(orgId, {
							type: "INBOX_NEW_MESSAGE",
							payload: { patientId, event: inserted },
						});
					});
				}

				return inserted;
			});

			if (!sendResult.ok) {
				return reply.code(502).send({
					ok: false,
					error: "MaxDeliveryFailed",
					message: sendResult.errorMessage,
					event,
				});
			}

			return reply.send({
				ok: true,
				providerMessageId: sendResult.providerMessageId,
				event,
			});
		},
	);
}

void patients;
