import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { TelegramBotHostingService } from "../../services/telegram/TelegramBotHostingService.js";

export function registerTelegramBotConnectionRoutes(app: FastifyInstance) {
	app.post("/api/telegram/bot/connect", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"telegram bot connect",
		);
		if (!orgId) return;

		const bodySchema = z.object({
			token: z.string().trim().min(5, "Токен бота обязателен"),
			webhookUrl: z.string().trim().url().optional().nullable(),
			clinicId: z.string().uuid().optional().nullable(),
			botConfigId: z.string().trim().optional(),
		});

		const parsed = bodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				ok: false,
				error: "ValidationError",
				message: parsed.error.errors[0]?.message || "Некорректные параметры подключения бота.",
			});
		}

		const result = await TelegramBotHostingService.connectBot({
			organizationId: orgId,
			botToken: parsed.data.token,
			webhookBaseUrl: parsed.data.webhookUrl || null,
			clinicId: parsed.data.clinicId || null,
			botConfigId: parsed.data.botConfigId || "default",
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
			message: "Telegram-бот успешно подключен и верифицирован.",
		});
	});

	app.post("/api/telegram/bot/disconnect", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"telegram bot disconnect",
		);
		if (!orgId) return;

		await TelegramBotHostingService.disconnectBot({
			organizationId: orgId,
		});

		return reply.code(200).send({
			ok: true,
			disconnected: true,
			message: "Telegram-бот успешно отключен.",
		});
	});
}
