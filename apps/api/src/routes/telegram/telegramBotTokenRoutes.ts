import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { TelegramBotHostingService } from "../../services/telegram/TelegramBotHostingService.js";

export function registerTelegramBotTokenRoutes(app: FastifyInstance) {
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/telegram/bot-token",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"telegram bot token save",
			);
			if (!orgId) return;

			const bodySchema = z
				.object({
					token: z.string().trim().min(5, "Токен бота обязателен"),
					webhookUrl: z.string().trim().url().optional().nullable(),
					clinicId: z.string().uuid().optional().nullable(),
				})
				.strict();

			const parsed = bodySchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					ok: false,
					error: "ValidationError",
					message: parsed.error.issues[0]?.message || "Некорректный формат токена бота.",
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
		},
	});

	defineStreamRoute(app, {
		method: "GET",
		path: "/api/telegram/bot-token",
		permission: "public",
		handler: async ({ request, reply }) => {
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
		},
	});

	defineStreamRoute(app, {
		method: "GET",
		path: "/api/telegram/bot/status",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedOrganizationId(request, reply, "telegram bot status");
			if (!orgId) return;
			const status = await TelegramBotHostingService.getBotStatus({ organizationId: orgId });
			return reply.code(200).send(status);
		},
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/telegram/bot/test",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedOrganizationId(request, reply, "telegram bot test");
			if (!orgId) return;

			const bodySchema = z
				.object({ token: z.string().trim().optional() })
				.strict();
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
		},
	});
}
