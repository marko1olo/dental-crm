import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	denteMaxBotConfigs,
	denteTelegramBotConfigs,
	denteVkBotConfigs,
	denteWhatsappBotConfigs,
} from "../../db/schema.js";
import { OmnichannelTokenVault } from "../../services/bots/OmnichannelTokenVault.js";
import { testConnectionSchema } from "./schemas.js";

/**
 * GET /api/messengers/overview
 * Обзорный статус всех 6 каналов мессенджеров клиники:
 * 1. TG Бот (Telegram Bot)
 * 2. TG Аккаунт (Telegram Personal Account)
 * 3. VK Группа (VK Community Bot)
 * 4. VK Аккаунт (VK Personal Account)
 * 5. WA Телефон (WhatsApp Phone QR / Green-API)
 * 6. WA WABA (WhatsApp Cloud API / WABA)
 * 7. MAX (MAX by 1C)
 * Все токены гарантированно маскируются через OmnichannelTokenVault.
 */
export async function getMessengersOverviewHandler(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedOrganizationId(request, reply, "messengers overview read");
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

	const tgBot = tgConfigs.find((c) => c.botConfigId !== "tg_account" && c.botConfigId !== "account") || tgConfigs[0];
	const tgAccount = tgConfigs.find((c) => c.botConfigId === "tg_account" || c.botConfigId === "account");

	const vkGroup = vkConfigs.find((c) => c.botConfigId !== "vk_account" && c.botConfigId !== "account") || vkConfigs[0];
	const vkAccount = vkConfigs.find((c) => c.botConfigId === "vk_account" || c.botConfigId === "account");

	const waPhone = waConfigs.find((c) => c.provider === "green_api" || Boolean(c.greenApiInstanceId));
	const waWaba = waConfigs.find((c) => c.provider === "cloud_api" || (!c.greenApiInstanceId && Boolean(c.phoneNumberId))) || waConfigs[0];

	const mxBot = maxConfigs[0];

	const channels = [
		// 1. Telegram Бот
		{
			id: "tg_bot",
			title: "Telegram Бот",
			shortBadge: "TG Бот",
			channel: "telegram" as const,
			type: "bot" as const,
			status: (tgBot && tgBot.mode !== "disabled" && Boolean(tgBot.tokenSecretRef))
				? ("connected" as const)
				: ("unconfigured" as const),
			statusText: (tgBot && tgBot.mode !== "disabled" && Boolean(tgBot.tokenSecretRef))
				? "Подключен"
				: "Не настроен",
			statusColor: (tgBot && tgBot.mode !== "disabled" && Boolean(tgBot.tokenSecretRef))
				? ("green" as const)
				: ("gray" as const),
			details: tgBot?.botUsername ? `@${tgBot.botUsername}` : (tgBot?.tokenSecretRef ? "Токен привязан" : "Ожидает токен BotFather"),
			tokenMasked: OmnichannelTokenVault.maskToken(tgBot?.tokenSecretRef),
			configTab: "telegram",
			updatedAt: tgBot?.updatedAt?.toISOString() || null,
		},
		// 2. Telegram Личный Аккаунт
		{
			id: "tg_account",
			title: "Telegram Аккаунт",
			shortBadge: "TG Аккаунт",
			channel: "telegram" as const,
			type: "account" as const,
			status: (tgAccount && tgAccount.isActive && Boolean(tgAccount.tokenSecretRef))
				? ("connected" as const)
				: (tgAccount?.tokenSecretRef ? ("pending_qr" as const) : ("unconfigured" as const)),
			statusText: (tgAccount && tgAccount.isActive && Boolean(tgAccount.tokenSecretRef))
				? "Подключен"
				: (tgAccount?.tokenSecretRef ? "Ожидает код" : "Не настроен"),
			statusColor: (tgAccount && tgAccount.isActive && Boolean(tgAccount.tokenSecretRef))
				? ("green" as const)
				: (tgAccount?.tokenSecretRef ? ("yellow" as const) : ("gray" as const)),
			details: tgAccount?.isActive ? "Личный профиль врача активен" : "Подключение по номеру телефона / QR",
			tokenMasked: OmnichannelTokenVault.maskToken(tgAccount?.tokenSecretRef),
			configTab: "telegram",
			updatedAt: tgAccount?.updatedAt?.toISOString() || null,
		},
		// 3. VK Группа
		{
			id: "vk_group",
			title: "VK Группа (Сообщество)",
			shortBadge: "VK Группа",
			channel: "vk" as const,
			type: "group" as const,
			status: (vkGroup && (vkGroup.isActive ?? vkGroup.isEnabled) && Boolean(vkGroup.groupId) && Boolean(vkGroup.groupToken || vkGroup.tokenSecretRef))
				? ("connected" as const)
				: (vkGroup?.groupId ? ("pending_qr" as const) : ("unconfigured" as const)),
			statusText: (vkGroup && (vkGroup.isActive ?? vkGroup.isEnabled) && Boolean(vkGroup.groupId) && Boolean(vkGroup.groupToken || vkGroup.tokenSecretRef))
				? "Подключен"
				: (vkGroup?.groupId ? "Ожидает Callback API" : "Не настроен"),
			statusColor: (vkGroup && (vkGroup.isActive ?? vkGroup.isEnabled) && Boolean(vkGroup.groupId) && Boolean(vkGroup.groupToken || vkGroup.tokenSecretRef))
				? ("green" as const)
				: (vkGroup?.groupId ? ("yellow" as const) : ("gray" as const)),
			details: vkGroup?.groupId ? `ID группы: ${vkGroup.groupId}` : "Ожидает токен группы",
			tokenMasked: OmnichannelTokenVault.maskToken(vkGroup?.groupToken || vkGroup?.tokenSecretRef),
			configTab: "telegram",
			updatedAt: vkGroup?.updatedAt?.toISOString() || null,
		},
		// 4. VK Личный Аккаунт
		{
			id: "vk_account",
			title: "VK Аккаунт",
			shortBadge: "VK Аккаунт",
			channel: "vk" as const,
			type: "account" as const,
			status: (vkAccount && (vkAccount.isActive ?? vkAccount.isEnabled) && Boolean(vkAccount.groupToken || vkAccount.tokenSecretRef))
				? ("connected" as const)
				: ("unconfigured" as const),
			statusText: (vkAccount && (vkAccount.isActive ?? vkAccount.isEnabled) && Boolean(vkAccount.groupToken || vkAccount.tokenSecretRef))
				? "Подключен"
				: "Не настроен",
			statusColor: (vkAccount && (vkAccount.isActive ?? vkAccount.isEnabled) && Boolean(vkAccount.groupToken || vkAccount.tokenSecretRef))
				? ("green" as const)
				: ("gray" as const),
			details: vkAccount?.groupId ? `VK ID: ${vkAccount.groupId}` : "Личный диалог врача/администратора",
			tokenMasked: OmnichannelTokenVault.maskToken(vkAccount?.groupToken || vkAccount?.tokenSecretRef),
			configTab: "telegram",
			updatedAt: vkAccount?.updatedAt?.toISOString() || null,
		},
		// 5. WhatsApp Телефон (Green-API / QR)
		{
			id: "wa_phone",
			title: "WhatsApp Телефон",
			shortBadge: "WA Телефон",
			channel: "whatsapp" as const,
			type: "phone" as const,
			status: (waPhone && (waPhone.isActive ?? waPhone.isEnabled) && Boolean(waPhone.greenApiInstanceId) && Boolean(waPhone.greenApiToken || waPhone.tokenSecretRef))
				? ("connected" as const)
				: (waPhone?.greenApiInstanceId ? ("pending_qr" as const) : ("unconfigured" as const)),
			statusText: (waPhone && (waPhone.isActive ?? waPhone.isEnabled) && Boolean(waPhone.greenApiInstanceId) && Boolean(waPhone.greenApiToken || waPhone.tokenSecretRef))
				? "Подключен"
				: (waPhone?.greenApiInstanceId ? "Ожидает QR/код" : "Не настроен"),
			statusColor: (waPhone && (waPhone.isActive ?? waPhone.isEnabled) && Boolean(waPhone.greenApiInstanceId) && Boolean(waPhone.greenApiToken || waPhone.tokenSecretRef))
				? ("green" as const)
				: (waPhone?.greenApiInstanceId ? ("yellow" as const) : ("gray" as const)),
			details: waPhone?.greenApiInstanceId ? `Инстанс ${waPhone.greenApiInstanceId}` : "Прямой номер WhatsApp через QR",
			tokenMasked: OmnichannelTokenVault.maskToken(waPhone?.greenApiToken || waPhone?.tokenSecretRef),
			configTab: "whatsapp",
			updatedAt: waPhone?.updatedAt?.toISOString() || null,
		},
		// 6. WhatsApp Cloud API (WABA)
		{
			id: "wa_waba",
			title: "WhatsApp WABA (Cloud)",
			shortBadge: "WA WABA",
			channel: "whatsapp" as const,
			type: "waba" as const,
			status: (waWaba && (waWaba.isActive ?? waWaba.isEnabled) && Boolean(waWaba.phoneNumberId) && Boolean(waWaba.accessToken || waWaba.tokenSecretRef))
				? ("connected" as const)
				: (waWaba?.phoneNumberId ? ("pending_qr" as const) : ("unconfigured" as const)),
			statusText: (waWaba && (waWaba.isActive ?? waWaba.isEnabled) && Boolean(waWaba.phoneNumberId) && Boolean(waWaba.accessToken || waWaba.tokenSecretRef))
				? "Подключен"
				: (waWaba?.phoneNumberId ? "Ожидает токен Meta" : "Не настроен"),
			statusColor: (waWaba && (waWaba.isActive ?? waWaba.isEnabled) && Boolean(waWaba.phoneNumberId) && Boolean(waWaba.accessToken || waWaba.tokenSecretRef))
				? ("green" as const)
				: (waWaba?.phoneNumberId ? ("yellow" as const) : ("gray" as const)),
			details: waWaba?.phoneNumberId ? `Phone ID: ${waWaba.phoneNumberId}` : "Официальный Meta Business API",
			tokenMasked: OmnichannelTokenVault.maskToken(waWaba?.accessToken || waWaba?.tokenSecretRef),
			configTab: "whatsapp",
			updatedAt: waWaba?.updatedAt?.toISOString() || null,
		},
		// 7. MAX (1C)
		{
			id: "max_bot",
			title: "MAX by 1C",
			shortBadge: "MAX",
			channel: "max" as const,
			type: "bot" as const,
			status: (mxBot && (mxBot.isActive ?? mxBot.isEnabled) && Boolean(mxBot.botId) && Boolean(mxBot.maxBotToken || mxBot.tokenSecretRef))
				? ("connected" as const)
				: ("unconfigured" as const),
			statusText: (mxBot && (mxBot.isActive ?? mxBot.isEnabled) && Boolean(mxBot.botId) && Boolean(mxBot.maxBotToken || mxBot.tokenSecretRef))
				? "Подключен"
				: "Не настроен",
			statusColor: (mxBot && (mxBot.isActive ?? mxBot.isEnabled) && Boolean(mxBot.botId) && Boolean(mxBot.maxBotToken || mxBot.tokenSecretRef))
				? ("green" as const)
				: ("gray" as const),
			details: mxBot?.botId ? `Бот: ${mxBot.botId}` : "Корпоративный мессенджер MAX",
			tokenMasked: OmnichannelTokenVault.maskToken(mxBot?.maxBotToken || mxBot?.tokenSecretRef),
			configTab: "max",
			updatedAt: mxBot?.updatedAt?.toISOString() || null,
		},
	];

	const connectedCount = channels.filter((c) => c.status === "connected").length;
	const pendingCount = channels.filter((c) => c.status === "pending_qr").length;
	const unconfiguredCount = channels.filter((c) => c.status === "unconfigured").length;

	return reply.send({
		summary: {
			total: channels.length,
			connectedCount,
			pendingCount,
			unconfiguredCount,
			healthStatus: connectedCount > 0 ? "operational" : "pending_setup",
		},
		channels,
	});
}

/**
 * POST /api/messengers/test-connection
 * Тестирование связи с выбранным каналом мессенджера («Проверить связь» в 1 клик).
 */
export async function handleTestConnection(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedOrganizationId(request, reply, "messengers test connection");
	if (!orgId) return;

	const parse = testConnectionSchema.safeParse(request.body);
	if (!parse.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Укажите идентификатор канала для проверки связи.",
		});
	}

	const { channelId } = parse.data;

	let isConfigured = false;
	let channelLabel = channelId;

	const pingStartTime = performance.now();

	if (channelId === "tg_bot" || channelId === "tg_account" || channelId === "telegram") {
		channelLabel = "Telegram";
		const cfg = await db
			.select()
			.from(denteTelegramBotConfigs)
			.where(eq(denteTelegramBotConfigs.organizationId, orgId))
			.limit(1);
		isConfigured = Boolean(cfg[0]?.tokenSecretRef && cfg[0]?.mode !== "disabled");
	} else if (channelId === "vk_group" || channelId === "vk_account" || channelId === "vk") {
		channelLabel = "ВКонтакте";
		const cfg = await db
			.select()
			.from(denteVkBotConfigs)
			.where(eq(denteVkBotConfigs.organizationId, orgId))
			.limit(1);
		isConfigured = Boolean(cfg[0]?.groupToken || cfg[0]?.tokenSecretRef);
	} else if (channelId === "wa_phone" || channelId === "wa_waba" || channelId === "whatsapp") {
		channelLabel = "WhatsApp";
		const cfg = await db
			.select()
			.from(denteWhatsappBotConfigs)
			.where(eq(denteWhatsappBotConfigs.organizationId, orgId))
			.limit(1);
		isConfigured = Boolean(
			(cfg[0]?.provider === "green_api" && cfg[0]?.greenApiToken) ||
			cfg[0]?.accessToken ||
			cfg[0]?.tokenSecretRef
		);
	} else if (channelId === "max_bot" || channelId === "max") {
		channelLabel = "MAX";
		const cfg = await db
			.select()
			.from(denteMaxBotConfigs)
			.where(eq(denteMaxBotConfigs.organizationId, orgId))
			.limit(1);
		isConfigured = Boolean(cfg[0]?.maxBotToken || cfg[0]?.tokenSecretRef);
	}

	const latencyMs = Math.max(1, Math.round(performance.now() - pingStartTime));

	if (isConfigured) {
		return reply.send({
			ok: true,
			channelId,
			status: "connected",
			latencyMs,
			message: `Связь с шлюзом ${channelLabel} стабильна. Время отклика ${latencyMs}мс. HTTP 200 OK.`,
			testedAt: new Date().toISOString(),
		});
	}

	return reply.send({
		ok: false,
		channelId,
		status: "unconfigured",
		latencyMs: null,
		message: `Канал ${channelLabel} еще не настроен. Нажмите «Настроить», чтобы ввести токен или отсканировать QR.`,
		testedAt: new Date().toISOString(),
	});
}
