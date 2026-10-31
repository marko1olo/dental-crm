import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { TelegramBotHostingService } from "../../services/telegram/TelegramBotHostingService.js";

export function registerTelegramBotTokenRoutes(app: FastifyInstance) {
	app.post("/api/telegram/bot-token", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"telegram bot token save",
		);
		if (!orgId) return;

		const bodySchema = z.object({
			token: z.string().trim().min(5, "Токен бота обязателен"),
			webhookUrl: z.string().trim().url().optional().nullable(),
			clinicId: z.string().uuid().optional().nullable(),
		});

		const parsed = bodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				ok: false,
				error: "ValidationError",
				message: parsed.error.errors[0]?.message || "Некорректный формат токена бота.",
			});
		}

		const result = await TelegramBotHostingService.connectBot({
			organizationId: orgId,
			botToken: parsed.data.token,
			webhookBaseUrl: parsed.data.webhookUrl || null,
			clinicId: parsed.data.clinicId || null,
			botConfigId: "default",
		});

		if (!result.ok) {
			return reply.code(400).send({
				ok: false,
				error: "BotConnectionFailed",
				message: result.error || "Не удалось подключить Telegram-бота.",
			});
		}

		return reply.code(200).send({
			ok: true,
			connected: true,
			bot: result.bot,
			message: "Токен Telegram-бота успешно сохранен и проверен.",
		});
	});

	app.get("/api/telegram/bot-token", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"telegram bot token status",
		);
		if (!orgId) return;

		const status = await TelegramBotHostingService.getBotStatus({
			organizationId: orgId,
		});
		return reply.code(200).send(status);
	});

	app.get("/api/telegram/bot/status", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "telegram bot status");
		if (!orgId) return;
		const status = await TelegramBotHostingService.getBotStatus({ organizationId: orgId });
		return reply.code(200).send(status);
	});

	app.post("/api/telegram/bot/test", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "telegram bot test");
		if (!orgId) return;

		const bodySchema = z.object({ token: z.string().trim().optional() });
		const parsed = bodySchema.safeParse(request.body || {});

		const res = await TelegramBotHostingService.testBotConnection({
			organizationId: orgId,
			botToken: (parsed.success && parsed.data.token) ? parsed.data.token : null,
		});

		if (!res.ok) {
			return reply.code(400).send({
				ok: false,
				error: "BotTestFailed",
				message: res.error || "Ошибка тестирования Telegram-бота.",
				details: res,
			});
		}

		return reply.code(200).send({
			ok: true,
			message: "Связь с Telegram Bot API установлена успешно.",
			details: res,
		});
	});
}
