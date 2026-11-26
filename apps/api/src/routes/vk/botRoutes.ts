import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { denteVkBotConfigs } from "../../db/schema.js";
import { OmnichannelTokenVault } from "../../services/bots/OmnichannelTokenVault.js";
import { VkApiClient } from "../../services/bots/VkApiClient.js";
import { resolveDecryptedWebhookSecret } from "../../services/bots/webhookSecretAndReplay.js";
import { connectBotSchema, testVkMessageSchema, verifyBotSchema } from "./schemas.js";

export function registerVkBotRoutes(server: FastifyInstance): void {
	/**
	 * GET /api/vk/bot/settings
	 * Получение текущей конфигурации сообщества ВКонтакте (токены и секреты замаскированы).
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
				secretKeyMasked: null,
				confirmationCode: VkApiClient.generateConfirmationCode(),
				confirmationCodeMasked: null,
				webhookUrl: defaultWebhookUrl,
				isEnabled: false,
				isActive: false,
				updatedAt: null,
			});
		}

		const rawToken = config.tokenSecretRef || config.groupToken;
		let tokenMasked: string | null = null;
		if (rawToken) {
			const decryptedToken = resolveDecryptedWebhookSecret(rawToken, orgId, request.log);
			tokenMasked = OmnichannelTokenVault.maskToken(decryptedToken ?? rawToken);
		}

		const decryptedSecret = resolveDecryptedWebhookSecret(config.secretKey, orgId, request.log);
		const secretKeyMasked = config.secretKey
			? OmnichannelTokenVault.maskToken(decryptedSecret ?? config.secretKey)
			: null;
		const confirmationCodeMasked = config.confirmationCode
			? OmnichannelTokenVault.maskToken(config.confirmationCode)
			: null;

		return reply.send({
			configured: Boolean(config.groupId && (config.groupToken || config.tokenSecretRef)),
			groupId: config.groupId,
			tokenMasked,
			secretKey: null,
			secretKeyMasked,
			hasSecretKey: Boolean(config.secretKey),
			confirmationCode: null,
			confirmationCodeMasked,
			hasConfirmationCode: Boolean(config.confirmationCode),
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
						message:
							"Сохранённый токен сообщества не найден или повреждён. Введите новый токен доступа.",
					});
				}
				effectiveGroupToken = resolved;
			}

			// Проверка токена и сообщества через VK API (строго вне PG TX)
			let groupProfile;
			try {
				groupProfile = await VkApiClient.getGroupById(groupId, effectiveGroupToken);
			} catch (err) {
				const message =
					err instanceof Error ? err.message : "Не удалось проверить сообщество ВКонтакте";
				return reply.code(400).send({
					error: "VkVerificationFailed",
					message,
				});
			}

			// Шифрование токена и secretKey через AES-256-GCM с привязкой к organizationId
			const encryptedToken = OmnichannelTokenVault.encrypt(effectiveGroupToken, orgId);
			const reqHost = request.headers.host || "crm.dente.app";
			const webhookUrl = VkApiClient.buildWebhookUrl(reqHost, orgId);
			const effectiveSecretKey = secretKey?.trim() || VkApiClient.generateSecretKey();
			const encryptedSecretKey = OmnichannelTokenVault.encrypt(effectiveSecretKey, orgId);
			const effectiveConfirmationCode =
				confirmationCode?.trim() || VkApiClient.generateConfirmationCode();

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
							secretKey: encryptedSecretKey,
							confirmationCode: effectiveConfirmationCode,
							webhookUrl,
							isEnabled,
							isActive: isEnabled,
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(denteVkBotConfigs.id, existing.id),
								eq(denteVkBotConfigs.organizationId, orgId),
							),
						);
				} else {
					await tx.insert(denteVkBotConfigs).values({
						organizationId: orgId,
						botConfigId: "default",
						groupId: String(groupProfile.id),
						groupToken: encryptedToken,
						tokenSecretRef: encryptedToken,
						secretKey: encryptedSecretKey,
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
				secretKeyMasked: OmnichannelTokenVault.maskToken(effectiveSecretKey),
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
					message:
						parsed.error.issues[0]?.message ||
						"Неверные параметры проверки сообщества ВКонтакте",
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
				const message =
					err instanceof Error ? err.message : "Ошибка проверки сообщества ВКонтакте";
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
				const result = await VkApiClient.sendMessage(
					groupToken,
					parsed.data.recipientId,
					parsed.data.message,
				);
				return reply.send({
					ok: true,
					messageId: result.messageId,
					message: "Тестовое сообщение успешно отправлено в ВКонтакте",
				});
			} catch (err) {
				const message =
					err instanceof Error ? err.message : "Ошибка отправки сообщения ВКонтакте";
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
}
