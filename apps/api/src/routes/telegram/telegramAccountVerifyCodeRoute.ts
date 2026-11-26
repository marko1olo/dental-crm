import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
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
		}).strict();

		const parsed = schema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				ok: false,
				error: "ValidationError",
				message: parsed.error.issues[0]?.message || "Некорректные параметры верификации.",
			});
		}

		const identity = getRequestIdentity(request);
		const userId = identity.verified ? identity.userId : null;
		const clinicId = identity.verified ? identity.organizationId : null;

		const result = await TelegramAccountService.verifyCode({
			organizationId: orgId,
			phone: parsed.data.phone,
			phoneCodeHash: parsed.data.phoneCodeHash,
			code: parsed.data.code,
			userId,
			clinicId,
		});

		if (!result.ok) {
			const statusCode = result.configured === false ? 501 : 400;
			return reply.code(statusCode).send({
				ok: false,
				...(result.configured === false ? { configured: false } : {}),
				error: result.errorCode || "VerificationFailed",
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
