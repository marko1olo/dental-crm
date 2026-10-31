import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { TelegramAccountService } from "../../services/telegram/TelegramAccountService.js";

export function registerTelegramAccountVerify2faRoute(app: FastifyInstance) {
	app.post("/api/telegram/account/verify-2fa", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"telegram account verify-2fa",
		);
		if (!orgId) return;

		const schema = z.object({
			phone: z.string().trim().min(5, "Укажите номер телефона"),
			password: z.string().trim().min(1, "Укажите пароль 2FA"),
		});

		const parsed = schema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				ok: false,
				error: "ValidationError",
				message: parsed.error.errors[0]?.message || "Укажите пароль двухфакторной аутентификации.",
			});
		}

		const userId = (request.headers["x-user-id"] as string) || null;
		const clinicId = (request.headers["x-clinic-id"] as string) || null;

		const result = await TelegramAccountService.verify2fa({
			organizationId: orgId,
			phone: parsed.data.phone,
			password: parsed.data.password,
			userId,
			clinicId,
		});

		if (!result.ok) {
			return reply.code(400).send({
				ok: false,
				error: "2FaFailed",
				message: result.error || "Неверный облачный пароль Telegram.",
			});
		}

		return reply.code(200).send({
			ok: true,
			connected: true,
			account: result.account,
			message: "Двухфакторная аутентификация пройдена. Аккаунт подключен.",
		});
	});
}
