import { and, desc, eq, ilike } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../accessGuard.js";
import { onTenantTxCommit, withTenantCtx } from "../db/rls.js";
import {
	communicationEvents,
	denteVkBotConfigs,
	denteVkUserAccounts,
	patients,
} from "../db/schema.js";
import { safeLogError } from "../observability/logger.js";
import { getRequestIdentity } from "../security/identity.js";
import { verifyWebhookSecret } from "../security/webhookAuth.js";
import { omnichannelBotEngine } from "../services/bots/OmnichannelBotEngine.js";
import { OmnichannelTokenVault } from "../services/bots/OmnichannelTokenVault.js";
import { VkApiClient } from "../services/bots/VkApiClient.js";
import {
	checkWebhookTimestampFreshness,
	isValidWebhookOrganizationId,
	persistInboundWebhookEventIfNew,
	resolveDecryptedWebhookSecret,
} from "../services/bots/webhookSecretAndReplay.js";
import { wsBroker } from "../services/websocketBroker.js";
import { timingSafeSecretEqual } from "../utils/timingSafeSecretEqual.js";

type VkWebhookBody = {
	type?: string;
	event_id?: string;
	secret?: string;
	object?: {
		message?: {
			id?: number | string;
			from_id?: number | string;
			text?: string;
			date?: number;
		};
	};
};

const connectBotSchema = z
	.object({
		groupId: z.string().trim().min(1, "Укажите ID или короткое имя сообщества"),
		groupToken: z.string().trim().min(1, "Укажите ключ доступа (токен) сообщества"),
		secretKey: z.string().trim().optional(),
		confirmationCode: z.string().trim().optional(),
		isEnabled: z.boolean().default(true),
	})
	.strict();

const verifyBotSchema = z
	.object({
		groupId: z.string().trim().optional(),
		groupToken: z.string().trim().optional(),
	})
	.strict();

const connectAccountSchema = z
	.object({
		accessToken: z.string().trim().min(1, "Укажите Access Token пользователя ВКонтакте"),
		vkUserId: z.string().trim().optional(),
	})
	.strict();

const testVkMessageSchema = z
	.object({
		recipientId: z.string().trim().min(1, "Укажите ID получателя"),
		message: z.string().trim().min(1, "Укажите текст сообщения"),
	})
	.strict();

export async function registerVkRoutes(server: FastifyInstance) {
	/**
	 * GET /api/vk/bot/settings
	 * Получение текущей конфигурации сообщества ВКонтакте.
	 */
	server.get("/api/vk/bot/settings", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "vk bot settings read");
		if (!orgId) return;

		const config = await withTenantCtx(orgId, async (tx) => {
			const [cfg] = await tx
				.select()
				.from(denteVkBotConfigs)
				.where(eq(denteVkBotConfigs.organizationId, orgId))
				.limit(1);
			return cfg || null;
		});

		const reqHost = request.headers.host || "crm.dente.app";
		const defaultWebhookUrl = VkApiClient.buildWebhookUrl(reqHost, orgId);

		if (!config) {
			return reply.send({
				configured: false,
				groupId: null,
				tokenMasked: null,
				secretKey: VkApiClient.generateSecretKey(),
				confirmationCode: VkApiClient.generateConfirmationCode(),
				webhookUrl: defaultWebhookUrl,
				isEnabled: false,
				isActive: false,
				updatedAt: null,
			});
		}

		let tokenMasked: string | null = null;
		const rawToken = config.tokenSecretRef || config.groupToken;
		if (rawToken) {
			tokenMasked = OmnichannelTokenVault.maskToken(rawToken);
		}

		return reply.send({
			configured: Boolean(config.groupId && (config.groupToken || config.tokenSecretRef)),
			groupId: config.groupId,
			tokenMasked,
			secretKey: config.secretKey || VkApiClient.generateSecretKey(),
			confirmationCode: config.confirmationCode || VkApiClient.generateConfirmationCode(),
			webhookUrl: config.webhookUrl || defaultWebhookUrl,
			isEnabled: config.isEnabled,
			isActive: config.isActive,
			updatedAt: config.updatedAt ? config.updatedAt.toISOString() : null,
		});
	});

	/**
	 * POST /api/vk/bot/connect
	 * Сохранение и валидация подключения сообщества ВКонтакте.
	 * При передаче groupToken === "KEEP_EXISTING" подставляется расшифрованный токен из БД.
	 */
	server.post(
		"/api/vk/bot/connect",
		{ config: { tenantTxSelfManaged: true } },
		async (request: FastifyRequest, reply: FastifyReply) => {
			const orgId = await requireResolvedOrganizationId(request, reply, "vk bot connect");
			if (!orgId) return;

			const parsed = connectBotSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: parsed.error.issues[0]?.message || "Неверные параметры запроса",
				});
			}

			const { groupId, groupToken, secretKey, confirmationCode, isEnabled } = parsed.data;

			let effectiveGroupToken = groupToken;
			if (groupToken === "KEEP_EXISTING") {
				const existingCfg = await withTenantCtx(orgId, async (tx) => {
					const [record] = await tx
						.select({
							groupToken: denteVkBotConfigs.groupToken,
							tokenSecretRef: denteVkBotConfigs.tokenSecretRef,
						})
						.from(denteVkBotConfigs)
						.where(eq(denteVkBotConfigs.organizationId, orgId))
						.limit(1);
					return record ?? null;
				});

				const storedEncrypted = existingCfg?.tokenSecretRef || existingCfg?.groupToken;
				const resolved = resolveDecryptedWebhookSecret(storedEncrypted, orgId, request.log);
				if (!resolved) {
					return reply.code(400).send({
						error: "ValidationError",
						message: "Сохранённый токен сообщества не найден или повреждён. Введите новый токен доступа.",
					});
				}
				effectiveGroupToken = resolved;
			}

			// Проверка токена и сообщества через VK API (строго вне PG TX)
			let groupProfile;
			try {
				groupProfile = await VkApiClient.getGroupById(groupId, effectiveGroupToken);
			} catch (err) {
				const message = err instanceof Error ? err.message : "Не удалось проверить сообщество ВКонтакте";
				return reply.code(400).send({
					error: "VkVerificationFailed",
					message,
				});
			}

			// Безопасное шифрование токена AES-256-GCM
			const encryptedToken = OmnichannelTokenVault.encrypt(effectiveGroupToken, orgId);
			const reqHost = request.headers.host || "crm.dente.app";
			const webhookUrl = VkApiClient.buildWebhookUrl(reqHost, orgId);
			const effectiveSecretKey = secretKey?.trim() || VkApiClient.generateSecretKey();
			const effectiveConfirmationCode = confirmationCode?.trim() || VkApiClient.generateConfirmationCode();

			await withTenantCtx(orgId, async (tx) => {
				const [existing] = await tx
					.select({ id: denteVkBotConfigs.id })
					.from(denteVkBotConfigs)
					.where(eq(denteVkBotConfigs.organizationId, orgId))
					.limit(1);

				if (existing) {
					await tx
						.update(denteVkBotConfigs)
						.set({
							groupId: String(groupProfile.id),
							groupToken: encryptedToken,
							tokenSecretRef: encryptedToken,
							secretKey: effectiveSecretKey,
							confirmationCode: effectiveConfirmationCode,
							webhookUrl,
							isEnabled,
							isActive: isEnabled,
							updatedAt: new Date(),
						})
						.where(eq(denteVkBotConfigs.id, existing.id));
				} else {
					await tx.insert(denteVkBotConfigs).values({
						organizationId: orgId,
						botConfigId: "default",
						groupId: String(groupProfile.id),
						groupToken: encryptedToken,
						tokenSecretRef: encryptedToken,
						secretKey: effectiveSecretKey,
						confirmationCode: effectiveConfirmationCode,
						webhookUrl,
						isEnabled,
						isActive: isEnabled,
					});
				}
			});

			return reply.send({
				ok: true,
				group: groupProfile,
				webhookUrl,
				secretKey: effectiveSecretKey,
				confirmationCode: effectiveConfirmationCode,
				tokenMasked: OmnichannelTokenVault.maskToken(effectiveGroupToken),
			});
		},
	);

	/**
	 * POST /api/vk/bot/verify
	 * Проверка статуса связи сообщества ВКонтакте.
	 */
	server.post(
		"/api/vk/bot/verify",
		{ config: { tenantTxSelfManaged: true } },
		async (request: FastifyRequest, reply: FastifyReply) => {
			const orgId = await requireResolvedOrganizationId(request, reply, "vk bot verify");
			if (!orgId) return;

			const parsed = verifyBotSchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: parsed.error.issues[0]?.message || "Неверные параметры проверки сообщества ВКонтакте",
				});
			}

			let groupId = parsed.data.groupId;
			let groupToken = parsed.data.groupToken;

			if (!groupId || !groupToken || groupToken === "KEEP_EXISTING") {
				const cfg = await withTenantCtx(orgId, async (tx) => {
					const [record] = await tx
						.select()
						.from(denteVkBotConfigs)
						.where(eq(denteVkBotConfigs.organizationId, orgId))
						.limit(1);
					return record || null;
				});

				if (!cfg || !cfg.groupId || (!cfg.groupToken && !cfg.tokenSecretRef)) {
					return reply.code(400).send({
						error: "VkNotConfigured",
						message: "Сообщество ВКонтакте ещё не настроено. Укажите ID и токен для проверки.",
					});
				}

				groupId = groupId || cfg.groupId;
				const storedEncrypted = (cfg.tokenSecretRef || cfg.groupToken) as string;
				const resolved = resolveDecryptedWebhookSecret(storedEncrypted, orgId, request.log);
				if (!resolved) {
					return reply.code(400).send({
						error: "VkTokenInvalid",
						message: "Не удалось расшифровать токен сообщества ВКонтакте.",
					});
				}
				groupToken = resolved;
			}

			try {
				const group = await VkApiClient.getGroupById(groupId, groupToken);
				return reply.send({
					ok: true,
					group,
				});
			} catch (err) {
				const message = err instanceof Error ? err.message : "Ошибка проверки сообщества ВКонтакте";
				return reply.code(400).send({
					error: "VkVerificationFailed",
					message,
				});
			}
		},
	);

	/**
	 * POST /api/vk/bot/test-message
	 * Отправка тестового сообщения клиенту через сообщество ВКонтакте.
	 */
	server.post(
		"/api/vk/bot/test-message",
		{ config: { tenantTxSelfManaged: true } },
		async (request: FastifyRequest, reply: FastifyReply) => {
			const orgId = await requireResolvedOrganizationId(request, reply, "vk bot test message");
			if (!orgId) return;

			const parsed = testVkMessageSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: parsed.error.issues[0]?.message || "Неверные параметры запроса",
				});
			}

			const cfg = await withTenantCtx(orgId, async (tx) => {
				const [record] = await tx
					.select()
					.from(denteVkBotConfigs)
					.where(eq(denteVkBotConfigs.organizationId, orgId))
					.limit(1);
				return record || null;
			});

			if (!cfg || (!cfg.groupToken && !cfg.tokenSecretRef)) {
				return reply.code(400).send({
					error: "VkNotConfigured",
					message: "Сообщество ВКонтакте не настроено: сначала сохраните токен доступа.",
				});
			}

			const storedEncrypted = (cfg.tokenSecretRef || cfg.groupToken) as string;
			const groupToken = resolveDecryptedWebhookSecret(storedEncrypted, orgId, request.log);
			if (!groupToken) {
				return reply.code(400).send({
					error: "VkTokenInvalid",
					message: "Не удалось расшифровать токен сообщества ВКонтакте.",
				});
			}

			try {
				const result = await VkApiClient.sendMessage(groupToken, parsed.data.recipientId, parsed.data.message);
				return reply.send({
					ok: true,
					messageId: result.messageId,
					message: "Тестовое сообщение успешно отправлено в ВКонтакте",
				});
			} catch (err) {
				const message = err instanceof Error ? err.message : "Ошибка отправки сообщения ВКонтакте";
				return reply.code(400).send({
					error: "VkSendFailed",
					message,
				});
			}
		},
	);

	/**
	 * POST /api/vk/bot/disconnect
	 * Отключение сообщества ВКонтакте.
	 */
	server.post("/api/vk/bot/disconnect", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "vk bot disconnect");
		if (!orgId) return;

		await withTenantCtx(orgId, async (tx) => {
			await tx
				.update(denteVkBotConfigs)
				.set({
					isEnabled: false,
					isActive: false,
					updatedAt: new Date(),
				})
				.where(eq(denteVkBotConfigs.organizationId, orgId));
		});

		return reply.send({ ok: true });
	});

	/**
	 * GET /api/vk/account/status
	 * Получение статуса подключенного личного аккаунта ВКонтакте.
	 */
	server.get("/api/vk/account/status", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "vk account status");
		if (!orgId) return;

		const account = await withTenantCtx(orgId, async (tx) => {
			const accounts = await tx
				.select()
				.from(denteVkUserAccounts)
				.where(eq(denteVkUserAccounts.organizationId, orgId))
				.orderBy(desc(denteVkUserAccounts.createdAt))
				.limit(1);
			return accounts[0] || null;
		});

		if (!account || !account.isActive || account.status === "disconnected") {
			return reply.send({
				connected: false,
				account: null,
			});
		}

		return reply.send({
			connected: true,
			account: {
				id: account.id,
				vkUserId: account.vkUserId,
				firstName: account.firstName,
				lastName: account.lastName,
				screenName: account.screenName,
				photoUrl: account.photoUrl,
				status: account.status,
				isActive: account.isActive,
				lastSyncAt: account.lastSyncAt ? account.lastSyncAt.toISOString() : null,
			},
		});
	});

	/**
	 * POST /api/vk/account/connect
	 * Подключение личной страницы врача / администратора ВКонтакте.
	 */
	server.post(
		"/api/vk/account/connect",
		{ config: { tenantTxSelfManaged: true } },
		async (request: FastifyRequest, reply: FastifyReply) => {
			const orgId = await requireResolvedOrganizationId(request, reply, "vk account connect");
			if (!orgId) return;

			const identity = getRequestIdentity(request);

			const parsed = connectAccountSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: parsed.error.issues[0]?.message || "Неверные параметры запроса",
				});
			}

			const { accessToken, vkUserId } = parsed.data;

			// Проверка токена пользователя через VK API (строго вне PG TX)
			let profile;
			try {
				profile = await VkApiClient.getUserProfile(accessToken, vkUserId);
			} catch (err) {
				const message = err instanceof Error ? err.message : "Не удалось проверить личную страницу ВКонтакте";
				return reply.code(400).send({
					error: "VkUserVerificationFailed",
					message,
				});
			}

			// Шифрование токена пользователя AES-256-GCM
			const encryptedToken = OmnichannelTokenVault.encrypt(accessToken, orgId);
			const vkIdStr = String(profile.id);

			await withTenantCtx(orgId, async (tx) => {
				const [existing] = await tx
					.select({ id: denteVkUserAccounts.id })
					.from(denteVkUserAccounts)
					.where(
						and(
							eq(denteVkUserAccounts.organizationId, orgId),
							eq(denteVkUserAccounts.vkUserId, vkIdStr),
						),
					)
					.limit(1);

				if (existing) {
					await tx
						.update(denteVkUserAccounts)
						.set({
							accessToken: encryptedToken,
							tokenSecretRef: encryptedToken,
							firstName: profile.first_name,
							lastName: profile.last_name,
							screenName: profile.screen_name || null,
							photoUrl: profile.photo_200 || profile.photo_100 || null,
							status: "connected",
							isActive: true,
							lastSyncAt: new Date(),
							updatedAt: new Date(),
						})
						.where(eq(denteVkUserAccounts.id, existing.id));
				} else {
					await tx.insert(denteVkUserAccounts).values({
						organizationId: orgId,
						userId: identity.userId || undefined,
						vkUserId: vkIdStr,
						accessToken: encryptedToken,
						tokenSecretRef: encryptedToken,
						firstName: profile.first_name,
						lastName: profile.last_name,
						screenName: profile.screen_name || null,
						photoUrl: profile.photo_200 || profile.photo_100 || null,
						status: "connected",
						isActive: true,
						lastSyncAt: new Date(),
					});
				}
			});

			return reply.send({
				ok: true,
				profile: {
					id: profile.id,
					firstName: profile.first_name,
					lastName: profile.last_name,
					first_name: profile.first_name,
					last_name: profile.last_name,
					screenName: profile.screen_name,
					photoUrl: profile.photo_200 || profile.photo_100,
				},
			});
		},
	);

	/**
	 * POST /api/vk/account/disconnect
	 * Отключение личной страницы ВКонтакте.
	 */
	server.post("/api/vk/account/disconnect", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "vk account disconnect");
		if (!orgId) return;

		await withTenantCtx(orgId, async (tx) => {
			await tx
				.update(denteVkUserAccounts)
				.set({
					status: "disconnected",
					isActive: false,
					updatedAt: new Date(),
				})
				.where(eq(denteVkUserAccounts.organizationId, orgId));
		});

		return reply.send({ ok: true });
	});

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
			const { organizationId } = request.params;
			if (!isValidWebhookOrganizationId(organizationId)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный UUID организации в пути вебхука.",
				});
			}

			// 1. Поиск настроек клиники под тенант-контекстом
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
				request.log.warn(
					{ err: safeLogError(err), organizationId },
					"Failed to load VK bot config for webhook",
				);
			}

			// 2. Проверка секретного ключа (расшифровка enc:v1:... + timingSafeSecretEqual)
			const configuredSecret = resolveDecryptedWebhookSecret(
				clinicConfig?.secretKey,
				organizationId,
				request.log,
			);
			const incomingBody = request.body as VkWebhookBody | undefined;
			const incomingSecret =
				incomingBody?.secret ||
				(request.headers["x-vk-secret"] as string | undefined);

			if (configuredSecret) {
				if (!timingSafeSecretEqual(incomingSecret ?? null, configuredSecret)) {
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
				// Fallback: глобальная проверка секретов окружения
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

			// Shape guard
			if (
				!request.body ||
				typeof request.body !== "object" ||
				Array.isArray(request.body)
			) {
				return reply.code(200).send("ok");
			}
			const body = request.body as VkWebhookBody;

			// 3. Callback API Server Confirmation
			if (body.type === "confirmation") {
				const confirmationToken =
					clinicConfig?.confirmationCode ||
					process.env.VK_CONFIRMATION_TOKEN?.trim();

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
					body.object?.message?.date ?? (body as { date?: number }).date,
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
							rawPayload: body as Record<string, unknown>,
						});
						if (isReplay) {
							request.log.info(
								{ externalId, organizationId },
								"VK message already ingested (replay skipped)",
							);
							return;
						}
					}

					let patient: typeof patients.$inferSelect | null = null;
					const searchResult = await tx
						.select()
						.from(patients)
						.where(
							and(
								eq(patients.organizationId, organizationId),
								ilike(patients.notes, `%VK:${vkId}%`),
							),
						)
						.limit(1);

					if (searchResult.length > 0) {
						patient = searchResult[0] || null;
					} else {
						const insertedPatients = await tx
							.insert(patients)
							.values({
								organizationId,
								fullName: `Пациент VK ${vkId}`,
								notes: `Создан автоматически из ВКонтакте. VK:${vkId}`,
								status: "active",
							})
							.returning();
						patient = insertedPatients[0] || null;
					}

					if (!patient) return;

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
						rawEvent: body as Record<string, unknown>,
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
