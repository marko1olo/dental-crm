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
import { handleMaxWebhook } from "./channelMax.js";
import { getMessengersOverviewHandler, handleTestConnection } from "./channelOverview.js";
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
import { handleWebhookGetHandshake } from "../../security/webhookAuth.js";
import {
	bookAppointmentBodySchema,
	linkPatientBodySchema,
	releaseBodySchema,
	takeoverBodySchema,
} from "./schemas.js";

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
	 * Тестирование связи с выбранным каналом мессенджера с реальной HTTP-пробой вне PG TX.
	 */
	app.post(
		"/api/messengers/test-connection",
		{ config: { tenantTxSelfManaged: true } },
		handleTestConnection,
	);

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
			const incomingSecret =
				(typeof body.secret === "string" ? body.secret : null) ||
				(typeof request.headers["x-vk-secret"] === "string" ? request.headers["x-vk-secret"] : null) ||
				(typeof request.headers["x-dente-webhook-secret"] === "string" ? request.headers["x-dente-webhook-secret"] : null) ||
				((request.query as Record<string, string> | undefined)?.secret ?? null);
			const res = await handleVkWebhook(body, organizationId, incomingSecret);
			return reply.code(res.statusCode).send(res.payload);
		}

		if (channel === "telegram") {
			// Канонический шлюз Telegram — /api/telegram/webhook/:organizationId (DEF-TEL-07)
			return reply.code(400).send({
				ok: false,
				error: "UseCanonicalTelegramWebhook",
				message:
					"Входящие вебхуки Telegram принимаются на каноническом эндпоинте /api/telegram/webhook/:organizationId.",
			});
		}

		if (channel === "whatsapp") {
			// Канонический шлюз WhatsApp — /api/whatsapp/webhook (DEF-MSG-06)
			return reply.code(400).send({
				ok: false,
				error: "UseCanonicalWhatsAppWebhook",
				message:
					"Входящие вебхуки WhatsApp принимаются на каноническом эндпоинте /api/whatsapp/webhook.",
			});
		}

		if (channel === "max") {
			const incomingSecret =
				(typeof body.secret === "string" ? body.secret : null) ||
				(typeof body.token === "string" ? body.token : null) ||
				(typeof request.headers["x-max-secret"] === "string" ? request.headers["x-max-secret"] : null) ||
				(typeof request.headers["x-dente-webhook-secret"] === "string" ? request.headers["x-dente-webhook-secret"] : null) ||
				(typeof request.headers.authorization === "string" ? request.headers.authorization.replace(/^Bearer\s+/i, "") : null) ||
				((request.query as Record<string, string> | undefined)?.secret ?? null);
			const res = await handleMaxWebhook(body, organizationId, incomingSecret);
			if (res.statusCode && res.statusCode !== 200) {
				return reply.code(res.statusCode).send(res);
			}
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
		Body: unknown;
	}>("/api/bots/chats/:senderId/takeover", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "bots takeover");
		if (!orgId) return;

		const parsed = takeoverBodySchema.safeParse(request.body ?? {});
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: parsed.error.issues[0]?.message || "Некорректные параметры перехвата диалога.",
			});
		}

		const { senderId } = request.params;
		const user = request.user as { name?: string; fullName?: string } | undefined;
		const operatorName = parsed.data.operatorName || user?.name || user?.fullName || "Оператор клиники";

		const result = handleTakeoverChat(parsed.data.channel, orgId, senderId, operatorName);
		return reply.send(result);
	});

	/**
	 * POST /api/bots/chats/:senderId/release
	 * Возврат диалога боту (снимает паузу с автоответчика).
	 */
	app.post<{
		Params: { senderId: string };
		Body: unknown;
	}>("/api/bots/chats/:senderId/release", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "bots release");
		if (!orgId) return;

		const parsed = releaseBodySchema.safeParse(request.body ?? {});
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: parsed.error.issues[0]?.message || "Некорректные параметры возврата диалога.",
			});
		}

		const { senderId } = request.params;
		const result = handleReleaseChat(parsed.data.channel, orgId, senderId);
		return reply.send(result);
	});

	/**
	 * POST /api/bots/test-incoming
	 * Симуляция входящего сообщения (для тестов, отладки и телефона-симулятора).
	 * DEF-TEL-06: Защита боевого режима от несанкционированной симуляции входящих сообщений.
	 */
	app.post("/api/bots/test-incoming", async (request, reply) => {
		const isDemoMode =
			request.headers["x-demo-mode"] === "true" ||
			process.env.DENTE_DEMO_MODE === "true";
		if (process.env.NODE_ENV === "production" && !isDemoMode) {
			return reply.status(403).send({
				error: "Forbidden",
				message: "Симуляция входящих сообщений запрещена в боевом режиме.",
			});
		}

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
		Body: unknown;
	}>("/api/bots/chats/:senderId/link-patient", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "bots link patient");
		if (!orgId) return;

		const parsed = linkPatientBodySchema.safeParse(request.body ?? {});
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: parsed.error.issues[0]?.message || "Некорректные параметры привязки пациента.",
			});
		}

		const { senderId } = request.params;
		const { channel, patientId, createNew } = parsed.data;

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
	}>("/api/bots/chats/:senderId/book-appointment", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "bots book appointment");
		if (!orgId) return;

		const rawIdempotencyKey = (request.headers["idempotency-key"] ||
			request.headers["x-idempotency-key"]) as string | undefined;
		const idempotencyKey = typeof rawIdempotencyKey === "string" ? rawIdempotencyKey.trim() : "";
		if (
			idempotencyKey &&
			!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idempotencyKey)
		) {
			return reply.code(400).send({
				error: "InvalidIdempotencyKey",
				message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
			});
		}
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		const parsed = bookAppointmentBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: parsed.error.issues[0]?.message || "Не заполнены параметры записи на приём.",
			});
		}

		const { senderId } = request.params;
		const res = await handleBookAppointment(orgId, senderId, parsed.data);
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
export { handleWebhookGetHandshake, getVkConfirmationCode } from "../../security/webhookAuth.js";
export * from "./botConfigs.js";
export * from "./channelOverview.js";
export * from "./channelVk.js";
export * from "./channelMax.js";
export * from "./channelWebWidget.js";
export * from "./triageAndBooking.js";
