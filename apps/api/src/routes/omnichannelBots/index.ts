import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import type { BotChannel } from "../../services/bots/types.js";
import {
	exportZipHandler,
	getBotConfigsHandler,
	getBotStatusHandler,
	getEngineMetricsHandler,
	saveBotConfigHandler,
} from "./botConfigs.js";
import { handleMaxWebhook, handleWhatsAppWebhook } from "./channelMax.js";
import { getMessengersOverviewHandler, handleTestConnection } from "./channelOverview.js";
import { handleTelegramWebhook } from "./channelTelegram.js";
import { handleVkWebhook } from "./channelVk.js";
import {
	handleReleaseChat,
	handleSendOperatorMessage,
	handleTakeoverChat,
	handleTestIncomingMessage,
} from "./channelWebWidget.js";
import {
	fetchInboxConversations,
	fetchInboxMessages,
	handleBookAppointment,
	handleLinkPatient,
} from "./triageAndBooking.js";
import { handleWebhookGetHandshake } from "./webhookAuth.js";

export async function registerOmnichannelBotRoutes(app: FastifyInstance): Promise<void> {
	/**
	 * GET /api/bots/configs
	 * Получение настроек всех ботов клиники (токены отдаются в замаскированном виде).
	 */
	app.get("/api/bots/configs", getBotConfigsHandler);

	/**
	 * GET /api/messengers/overview & GET /api/bots/overview
	 * Обзорный статус всех каналов мессенджеров клиники.
	 */
	app.get("/api/messengers/overview", getMessengersOverviewHandler);
	app.get("/api/bots/overview", getMessengersOverviewHandler);

	/**
	 * POST /api/messengers/test-connection
	 * Тестирование связи с выбранным каналом мессенджера («Проверить связь» в 1 клик).
	 */
	app.post("/api/messengers/test-connection", handleTestConnection);

	/**
	 * POST /api/bots/configs
	 * Сохранение / обновление конфигурации бота любого канала в 2 клика с шифрованием AES-256-GCM.
	 */
	app.post("/api/bots/configs", saveBotConfigHandler);

	/**
	 * GET /api/bots/:botId/status
	 * Телеметрия, состояние задержек и счетчики сообщений рантайма бота.
	 */
	app.get("/api/bots/:botId/status", getBotStatusHandler);

	/**
	 * GET /api/bots/metrics
	 * Общие метрики движка ботов по всей системе.
	 */
	app.get("/api/bots/metrics", getEngineMetricsHandler);

	/**
	 * GET /api/bots/:botId/export-source & GET /api/bots/:botId/export-zip
	 * Выгрузка автономного ZIP-архива с исходным кодом демона бота (Node.js/Docker/Systemd).
	 */
	app.get(
		"/api/bots/:botId/export-source",
		{ config: { tenantTxSelfManaged: true } },
		exportZipHandler,
	);

	app.get(
		"/api/bots/:botId/export-zip",
		{ config: { tenantTxSelfManaged: true } },
		exportZipHandler,
	);

	/**
	 * УНИФИЦИРОВАННЫЙ ВЕБХУК:
	 * GET /api/bots/webhook/:channel/:organizationId (Рукопожатия и валидация)
	 */
	app.get<{
		Params: { channel: string; organizationId: string };
		Querystring: Record<string, string>;
	}>("/api/bots/webhook/:channel/:organizationId", async (request, reply) => {
		const { channel, organizationId } = request.params;
		const query = request.query || {};

		const result = await handleWebhookGetHandshake(channel, organizationId, query);
		return reply.code(result.statusCode).send(result.payload);
	});

	/**
	 * УНИФИЦИРОВАННЫЙ ВЕБХУК:
	 * POST /api/bots/webhook/:channel/:organizationId (Приём входящих событий)
	 */
	app.post<{
		Params: { channel: string; organizationId: string };
		Body: Record<string, unknown>;
	}>("/api/bots/webhook/:channel/:organizationId", async (request, reply) => {
		const { channel, organizationId } = request.params;
		const body = request.body || {};

		if (channel === "vk") {
			const res = await handleVkWebhook(body, organizationId);
			return reply.code(res.statusCode).send(res.payload);
		}

		if (channel === "telegram") {
			const res = await handleTelegramWebhook(body, organizationId);
			return reply.code(200).send(res);
		}

		if (channel === "whatsapp") {
			const res = await handleWhatsAppWebhook(body, organizationId);
			return reply.code(200).send(res);
		}

		if (channel === "max") {
			const res = await handleMaxWebhook(body, organizationId);
			return reply.code(200).send(res);
		}

		return reply.code(200).send({ ok: true });
	});

	/**
	 * GET /api/bots/inbox
	 * Список активных диалогов во всех мессенджерах (Telegram, VK, WhatsApp, MAX).
	 */
	app.get("/api/bots/inbox", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "bots inbox read");
		if (!orgId) return;

		const result = await fetchInboxConversations(orgId);
		return reply.send(result);
	});

	/**
	 * GET /api/bots/inbox/:senderId/messages
	 * Полная хронологическая история переписки для выбранного контакта.
	 */
	app.get<{
		Params: { senderId: string };
		Querystring: { channel?: string };
	}>("/api/bots/inbox/:senderId/messages", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "bots inbox messages read");
		if (!orgId) return;

		const { senderId } = request.params;
		const channel = (request.query?.channel as BotChannel) || "telegram";

		const result = await fetchInboxMessages(orgId, senderId, channel);
		return reply.send(result);
	});

	/**
	 * POST /api/bots/send-message
	 * Отправка сообщения оператором пациенту с проверкой 152/323-ФЗ и фиксацией в БД.
	 */
	app.post("/api/bots/send-message", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "bots send message");
		if (!orgId) return;

		return handleSendOperatorMessage(request, reply, orgId);
	});

	/**
	 * POST /api/bots/chats/:senderId/takeover
	 * Перехват диалога оператором (ставит автоответчик бота на паузу).
	 */
	app.post<{
		Params: { senderId: string };
		Body: { channel: BotChannel; operatorName?: string };
	}>("/api/bots/chats/:senderId/takeover", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "bots takeover");
		if (!orgId) return;

		const { senderId } = request.params;
		const channel = (request.body?.channel as BotChannel) || "telegram";
		const operatorName = request.body?.operatorName || (request as any).user?.name || "Оператор клиники";

		const result = handleTakeoverChat(channel, orgId, senderId, operatorName);
		return reply.send(result);
	});

	/**
	 * POST /api/bots/chats/:senderId/release
	 * Возврат диалога боту (снимает паузу с автоответчика).
	 */
	app.post<{
		Params: { senderId: string };
		Body: { channel: BotChannel };
	}>("/api/bots/chats/:senderId/release", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "bots release");
		if (!orgId) return;

		const { senderId } = request.params;
		const channel = (request.body?.channel as BotChannel) || "telegram";

		const result = handleReleaseChat(channel, orgId, senderId);
		return reply.send(result);
	});

	/**
	 * POST /api/bots/test-incoming
	 * Симуляция входящего сообщения (для тестов, отладки и телефона-симулятора).
	 */
	app.post("/api/bots/test-incoming", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "bots test incoming");
		if (!orgId) return;

		return handleTestIncomingMessage(request, reply, orgId);
	});

	/**
	 * POST /api/bots/chats/:senderId/link-patient
	 * Привязка активного чата к существующей или новой карте пациента.
	 */
	app.post<{
		Params: { senderId: string };
		Body: {
			channel: BotChannel;
			patientId?: string;
			createNew?: { fullName: string; phone?: string | null };
		};
	}>("/api/bots/chats/:senderId/link-patient", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "bots link patient");
		if (!orgId) return;

		const { senderId } = request.params;
		const { channel = "telegram", patientId, createNew } = request.body || {};

		const res = await handleLinkPatient(orgId, senderId, channel, patientId, createNew);
		if (!res.ok) {
			return reply.code(res.statusCode || 400).send({ error: res.error, message: res.message });
		}
		return reply.send(res);
	});

	/**
	 * POST /api/bots/chats/:senderId/book-appointment
	 * Быстрая запись на приём прямо из рабочего стола оператора с авто-подтверждением в чат.
	 */
	app.post<{
		Params: { senderId: string };
		Body: {
			channel: BotChannel;
			patientId: string;
			doctorUserId?: string;
			startsAt: string;
			endsAt: string;
			reason?: string;
			sendConfirmationToChat?: boolean;
			operatorName?: string;
		};
	}>("/api/bots/chats/:senderId/book-appointment", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "bots book appointment");
		if (!orgId) return;

		const { senderId } = request.params;
		const res = await handleBookAppointment(orgId, senderId, request.body || ({} as any));
		if (!res.ok) {
			return reply.code(res.statusCode || 400).send({ error: res.error, message: res.message });
		}
		return reply.send(res);
	});
}

export const omnichannelBotsRoutes = registerOmnichannelBotRoutes;
export default registerOmnichannelBotRoutes;

export * from "./schemas.js";
export * from "./types.js";
export * from "./webhookAuth.js";
export * from "./botConfigs.js";
export * from "./channelOverview.js";
export * from "./channelTelegram.js";
export * from "./channelVk.js";
export * from "./channelMax.js";
export * from "./channelWebWidget.js";
export * from "./triageAndBooking.js";
