import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { TelegramAccountService } from "../../services/telegram/TelegramAccountService.js";

export function registerTelegramAccountVerifyCodeRoute(app: FastifyInstance) {
	app.post("/api/telegram/account/verify-code", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"telegram account verify-code",
		);
		if (!orgId) return;

		const schema = z.object({
			phone: z.string().trim().min(5, "Укажите номер телефона"),
			phoneCodeHash: z.string().trim().min(1, "phoneCodeHash обязателен"),
			code: z.string().trim().min(3, "Укажите код из Telegram"),
		});

		const parsed = schema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				ok: false,
				error: "ValidationError",
				message: parsed.error.errors[0]?.message || "Некорректные параметры верификации.",
			});
		}

		const userId = (request.headers["x-user-id"] as string) || null;
		const clinicId = (request.headers["x-clinic-id"] as string) || null;

		const result = await TelegramAccountService.verifyCode({
			organizationId: orgId,
			phone: parsed.data.phone,
			phoneCodeHash: parsed.data.phoneCodeHash,
			code: parsed.data.code,
			userId,
			clinicId,
		});

		if (!result.ok) {
			return reply.code(400).send({
				ok: false,
				error: "VerificationFailed",
				message: result.error || "Неверный код подтверждения.",
			});
		}

		if (result.requires2fa) {
			return reply.code(200).send({
				ok: true,
				connected: false,
				requires2fa: true,
				message: "Учетная запись защищена облачным паролем 2FA. Введите пароль.",
			});
		}

		return reply.code(200).send({
			ok: true,
			connected: true,
			requires2fa: false,
			account: result.account,
			message: "Аккаунт Telegram успешно подключен.",
		});
	});
}
