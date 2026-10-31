import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { TelegramAccountService } from "../../services/telegram/TelegramAccountService.js";

export function registerTelegramAccountSessionRoutes(app: FastifyInstance) {
	app.get("/api/telegram/account/status", async (request: FastifyRequest, reply: FastifyReply) => {
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
	});

	app.post("/api/telegram/account/disconnect", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"telegram account disconnect",
		);
		if (!orgId) return;

		const body = request.body as { phone?: string } | undefined;
		await TelegramAccountService.disconnectAccount({
			organizationId: orgId,
			phone: body?.phone ?? null,
		});

		return reply.code(200).send({
			ok: true,
			disconnected: true,
			message: "Личный аккаунт Telegram успешно отключен.",
		});
	});
}
