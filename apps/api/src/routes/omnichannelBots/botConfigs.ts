import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
	requireNonDoctorAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	denteMaxBotConfigs,
	denteTelegramBotConfigs,
	denteVkBotConfigs,
	denteWhatsappBotConfigs,
	organizations,
} from "../../db/schema.js";
import { BotSourceExporter } from "../../services/bots/BotSourceExporter.js";
import { omnichannelBotEngine } from "../../services/bots/OmnichannelBotEngine.js";
import { OmnichannelTokenVault } from "../../services/bots/OmnichannelTokenVault.js";
import type { BotChannel } from "../../services/bots/types.js";
import { saveBotConfigSchema } from "./schemas.js";

/**
 * GET /api/bots/configs
 * Получение настроек всех ботов клиники (токены отдаются в замаскированном виде).
 */
export async function getBotConfigsHandler(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedOrganizationId(request, reply, "bots configs read");
	if (!orgId) return;

	const [tgConfigs, vkConfigs, waConfigs, maxConfigs] = await Promise.all([
		db
			.select()
			.from(denteTelegramBotConfigs)
			.where(eq(denteTelegramBotConfigs.organizationId, orgId)),
		db
			.select()
			.from(denteVkBotConfigs)
			.where(eq(denteVkBotConfigs.organizationId, orgId)),
		db
			.select()
			.from(denteWhatsappBotConfigs)
			.where(eq(denteWhatsappBotConfigs.organizationId, orgId)),
		db
			.select()
			.from(denteMaxBotConfigs)
			.where(eq(denteMaxBotConfigs.organizationId, orgId)),
	]);

	const tg = tgConfigs[0];
	const vk = vkConfigs[0];
	const wa = waConfigs[0];
	const mx = maxConfigs[0];

	return reply.send({
		telegram: tg
			? {
					id: tg.id,
					botConfigId: tg.botConfigId,
					botUsername: tg.botUsername || tg.ownBotUsername,
					tokenMasked: OmnichannelTokenVault.maskToken(tg.tokenSecretRef),
					mode: tg.mode,
					isActive: tg.mode !== "disabled",
				}
			: null,
		vk: vk
			? {
					id: vk.id,
					botConfigId: vk.botConfigId,
					groupId: vk.groupId,
					tokenMasked: OmnichannelTokenVault.maskToken(vk.groupToken || vk.tokenSecretRef),
					confirmationCode: vk.confirmationCode,
					secretKeyMasked: OmnichannelTokenVault.maskToken(vk.secretKey),
					isActive: vk.isActive ?? vk.isEnabled,
					isEnabled: vk.isEnabled,
				}
			: null,
		whatsapp: wa
			? {
					id: wa.id,
					phoneNumberId: wa.phoneNumberId,
					provider: wa.provider,
					greenApiInstanceId: wa.greenApiInstanceId,
					tokenMasked: OmnichannelTokenVault.maskToken(
						wa.accessToken || wa.tokenSecretRef || wa.greenApiToken,
					),
					isActive: wa.isActive ?? wa.isEnabled,
					isEnabled: wa.isEnabled,
				}
			: null,
		max: mx
			? {
					id: mx.id,
					botId: mx.botId,
					tokenMasked: OmnichannelTokenVault.maskToken(mx.maxBotToken || mx.tokenSecretRef),
					isActive: mx.isActive ?? mx.isEnabled,
					isEnabled: mx.isEnabled,
				}
			: null,
	});
}

/**
 * POST /api/bots/configs
 * Сохранение / обновление конфигурации бота любого канала в 2 клика с шифрованием AES-256-GCM.
 */
export async function saveBotConfigHandler(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedOrganizationId(request, reply, "bots config save");
	if (!orgId) return;

	const allowed = await requireNonDoctorAccess(request, reply);
	if (!allowed) return reply;

	const parseResult = saveBotConfigSchema.safeParse(request.body);
	if (!parseResult.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры настройки бота.",
			details: parseResult.error.format(),
		});
	}

	const body = parseResult.data;
	let encryptedToken: string | undefined;
	if (body.token && !body.token.includes("****")) {
		encryptedToken = OmnichannelTokenVault.isEncrypted(body.token)
			? body.token
			: OmnichannelTokenVault.encrypt(body.token, orgId);
	}

	let encryptedSecretKey: string | undefined;
	if (body.secretKey && !body.secretKey.includes("****")) {
		encryptedSecretKey = OmnichannelTokenVault.isEncrypted(body.secretKey)
			? body.secretKey
			: OmnichannelTokenVault.encrypt(body.secretKey, orgId);
	}

	let encryptedGreenApiToken: string | undefined;
	if (body.greenApiToken && !body.greenApiToken.includes("****")) {
		encryptedGreenApiToken = OmnichannelTokenVault.isEncrypted(body.greenApiToken)
			? body.greenApiToken
			: OmnichannelTokenVault.encrypt(body.greenApiToken, orgId);
	}

	if (body.channel === "vk") {
		const existing = await db
			.select({ id: denteVkBotConfigs.id })
			.from(denteVkBotConfigs)
			.where(
				and(
					eq(denteVkBotConfigs.organizationId, orgId),
					eq(denteVkBotConfigs.botConfigId, body.botConfigId),
				),
			)
			.limit(1);

		if (existing.length > 0) {
			await db
				.update(denteVkBotConfigs)
				.set({
					clinicId: body.clinicId || null,
					groupId: body.groupId,
					...(encryptedToken ? { groupToken: encryptedToken, tokenSecretRef: encryptedToken } : {}),
					...(encryptedSecretKey ? { secretKey: encryptedSecretKey } : {}),
					...(body.confirmationCode ? { confirmationCode: body.confirmationCode } : {}),
					isActive: body.isActive,
					isEnabled: body.isActive,
					updatedAt: new Date(),
				})
				.where(eq(denteVkBotConfigs.id, existing[0]!.id));
		} else {
			await db.insert(denteVkBotConfigs).values({
				organizationId: orgId,
				clinicId: body.clinicId || null,
				botConfigId: body.botConfigId,
				groupId: body.groupId,
				groupToken: encryptedToken,
				tokenSecretRef: encryptedToken,
				secretKey: encryptedSecretKey,
				confirmationCode: body.confirmationCode,
				isActive: body.isActive,
				isEnabled: body.isActive,
			});
		}
	} else if (body.channel === "whatsapp") {
		const existing = await db
			.select({ id: denteWhatsappBotConfigs.id })
			.from(denteWhatsappBotConfigs)
			.where(eq(denteWhatsappBotConfigs.organizationId, orgId))
			.limit(1);

		if (existing.length > 0) {
			await db
				.update(denteWhatsappBotConfigs)
				.set({
					phoneNumberId: body.phoneNumberId,
					provider: body.provider || "cloud_api",
					greenApiInstanceId: body.greenApiInstanceId,
					...(encryptedGreenApiToken ? { greenApiToken: encryptedGreenApiToken } : {}),
					...(encryptedToken ? { accessToken: encryptedToken, tokenSecretRef: encryptedToken } : {}),
					isActive: body.isActive,
					isEnabled: body.isActive,
					updatedAt: new Date(),
				})
				.where(eq(denteWhatsappBotConfigs.id, existing[0]!.id));
		} else {
			await db.insert(denteWhatsappBotConfigs).values({
				organizationId: orgId,
				phoneNumberId: body.phoneNumberId,
				provider: body.provider || "cloud_api",
				greenApiInstanceId: body.greenApiInstanceId,
				greenApiToken: encryptedGreenApiToken,
				accessToken: encryptedToken,
				tokenSecretRef: encryptedToken,
				isActive: body.isActive,
				isEnabled: body.isActive,
			});
		}
	} else if (body.channel === "telegram") {
		const existing = await db
			.select({ id: denteTelegramBotConfigs.id })
			.from(denteTelegramBotConfigs)
			.where(
				and(
					eq(denteTelegramBotConfigs.organizationId, orgId),
					eq(denteTelegramBotConfigs.botConfigId, body.botConfigId),
				),
			)
			.limit(1);

		if (existing.length > 0) {
			await db
				.update(denteTelegramBotConfigs)
				.set({
					clinicId: body.clinicId || null,
					mode: body.isActive ? "clinic_owned_bot" : "disabled",
					...(encryptedToken ? { tokenSecretRef: encryptedToken } : {}),
					updatedAt: new Date(),
				})
				.where(eq(denteTelegramBotConfigs.id, existing[0]!.id));
		} else {
			await db.insert(denteTelegramBotConfigs).values({
				organizationId: orgId,
				clinicId: body.clinicId || null,
				botConfigId: body.botConfigId,
				mode: body.isActive ? "clinic_owned_bot" : "disabled",
				tokenSecretRef: encryptedToken,
			});
		}
	} else if (body.channel === "max") {
		const existing = await db
			.select({ id: denteMaxBotConfigs.id })
			.from(denteMaxBotConfigs)
			.where(eq(denteMaxBotConfigs.organizationId, orgId))
			.limit(1);

		if (existing.length > 0) {
			await db
				.update(denteMaxBotConfigs)
				.set({
					botId: body.maxBotId,
					...(encryptedToken ? { maxBotToken: encryptedToken, tokenSecretRef: encryptedToken } : {}),
					isActive: body.isActive,
					isEnabled: body.isActive,
					updatedAt: new Date(),
				})
				.where(eq(denteMaxBotConfigs.id, existing[0]!.id));
		} else {
			await db.insert(denteMaxBotConfigs).values({
				organizationId: orgId,
				botId: body.maxBotId,
				maxBotToken: encryptedToken,
				tokenSecretRef: encryptedToken,
				isActive: body.isActive,
				isEnabled: body.isActive,
			});
		}
	}

	// Обновляем рантайм в памяти движка
	const runtime = omnichannelBotEngine.registerBot({
		channel: body.channel,
		organizationId: orgId,
		clinicId: body.clinicId ?? null,
		botConfigId: body.botConfigId,
		token: encryptedToken || "encrypted_token",
		secretToken: encryptedSecretKey ?? null,
		isActive: body.isActive,
		enabledPlugins: body.enabledPlugins,
	});

	return reply.send({
		ok: true,
		botId: runtime.botId,
		channel: runtime.channel,
		isActive: runtime.isActive,
		tokenMasked: OmnichannelTokenVault.maskToken(encryptedToken),
	});
}

/**
 * GET /api/bots/:botId/status
 * Телеметрия, состояние задержек и счетчики сообщений рантайма бота.
 */
export async function getBotStatusHandler(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedOrganizationId(request, reply, "bot status read");
	if (!orgId) return;

	const { botId } = request.params as { botId: string };
	const parts = botId.split(":");
	const channel = (parts[0] || "telegram") as BotChannel;
	const targetOrgId = parts.length >= 3 ? parts[1] : orgId;
	const botConfigId = parts.length >= 3 ? parts[2] : "default";

	if (targetOrgId !== orgId) {
		return reply.code(403).send({
			error: "AccessDenied",
			message: "Доступ к телеметрии бота чужой организации запрещён.",
		});
	}

	const runtime =
		omnichannelBotEngine.getBot(botId) ||
		omnichannelBotEngine.getBotByChannel(channel, orgId, botConfigId);

	if (!runtime) {
		return reply.send({
			botId,
			channel,
			organizationId: orgId,
			isActive: false,
			status: "inactive",
			metrics: {
				totalMessages: 0,
				successMessages: 0,
				failedMessages: 0,
				rateLimitedMessages: 0,
				avgLatencyMs: 0,
				lastLatencyMs: 0,
			},
			memoryEstimatedKb: 2.5,
		});
	}

	return reply.send({
		botId: runtime.botId,
		channel: runtime.channel,
		organizationId: runtime.organizationId,
		isActive: runtime.isActive,
		status: runtime.isActive ? "running" : "stopped",
		enabledPlugins: runtime.enabledPlugins,
		registeredAt: runtime.registeredAt,
		lastActiveAt: runtime.lastActiveAt,
		lastError: runtime.lastError,
		metrics: runtime.metrics,
		memoryEstimatedKb: 2.5,
	});
}

/**
 * GET /api/bots/metrics
 * Общие метрики движка ботов по всей системе.
 */
export async function getEngineMetricsHandler(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedOrganizationId(request, reply, "bots engine metrics");
	if (!orgId) return;

	const metrics = omnichannelBotEngine.getEngineMetrics();
	return reply.send(metrics);
}

/**
 * GET /api/bots/:botId/export-source & GET /api/bots/:botId/export-zip
 * Выгрузка автономного ZIP-архива с исходным кодом демона бота (Node.js/Docker/Systemd).
 */
export async function exportZipHandler(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedOrganizationId(request, reply, "export bot source");
	if (!orgId) return;

	const { botId } = request.params as { botId: string };
	const parts = botId.split(":");
	const channel = (parts[0] || "telegram") as BotChannel;
	const targetOrgId = parts.length >= 3 ? parts[1] : orgId;

	if (targetOrgId !== orgId) {
		return reply.code(403).send({
			error: "AccessDenied",
			message: "Нельзя экспортировать исходный код бота чужой организации.",
		});
	}

	let clinicName = "Клиника ДЕНТЕ";
	const orgRecords = await db
		.select({ name: organizations.name })
		.from(organizations)
		.where(eq(organizations.id, orgId))
		.limit(1);

	if (orgRecords.length > 0 && orgRecords[0]?.name) {
		clinicName = orgRecords[0].name;
	}

	const zipBuffer = BotSourceExporter.exportStandaloneBotPackage({
		botId,
		organizationId: orgId,
		clinicName,
		channel,
	});

	const safeSlug = clinicName
		.toLowerCase()
		.replace(/[^a-z0-9а-яё]+/gi, "-")
		.slice(0, 25);

	reply.header("Content-Type", "application/zip");
	reply.header(
		"Content-Disposition",
		`attachment; filename="dente-bot-${safeSlug}-${channel}.zip"`,
	);
	reply.header("Content-Length", zipBuffer.length);
	reply.header("Cache-Control", "no-cache, no-store, must-revalidate");

	return reply.send(zipBuffer);
}
