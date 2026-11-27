import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { TelegramAccountService } from "../../services/telegram/TelegramAccountService.js";

const disconnectAccountBodySchema = z
	.object({
		phone: z.string().trim().optional().nullable(),
		accountId: z.string().trim().optional().nullable(),
	})
	.strict();

export function registerTelegramAccountSessionRoutes(app: FastifyInstance) {
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/telegram/account/status",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"telegram account status",
			);
			if (!orgId) return;

			const phone = (request.query as Record<string, string | undefined>)?.phone;
			const status = await TelegramAccountService.getAccountStatus({
				organizationId: orgId,
				phone: phone ?? null,
			});

			return reply.code(200).send(status);
		},
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/telegram/account/disconnect",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"telegram account disconnect",
			);
			if (!orgId) return;

			const parsed = disconnectAccountBodySchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				return reply.code(400).send({
					ok: false,
					error: "ValidationError",
					message: "Некорректные параметры отключения аккаунта Telegram.",
				});
			}

			await TelegramAccountService.disconnectAccount({
				organizationId: orgId,
				phone: parsed.data.phone ?? null,
			});

			return reply.code(200).send({
				ok: true,
				disconnected: true,
				message: "Личный аккаунт Telegram успешно отключен.",
			});
		},
	});
}
