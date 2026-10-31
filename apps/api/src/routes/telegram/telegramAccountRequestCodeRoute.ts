import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { TelegramAccountService } from "../../services/telegram/TelegramAccountService.js";

export function registerTelegramAccountRequestCodeRoute(app: FastifyInstance) {
	app.post("/api/telegram/account/request-code", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"telegram account request-code",
		);
		if (!orgId) return;

		const schema = z.object({
			phone: z.string().trim().min(5, "Укажите номер телефона"),
		});

		const parsed = schema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				ok: false,
				error: "ValidationError",
				message: parsed.error.errors[0]?.message || "Укажите корректный номер телефона.",
			});
		}

		const userId = (request.headers["x-user-id"] as string) || null;
		const clinicId = (request.headers["x-clinic-id"] as string) || null;

		const result = await TelegramAccountService.requestCode({
			organizationId: orgId,
			phone: parsed.data.phone,
			userId,
			clinicId,
		});

		if (!result.ok) {
			return reply.code(400).send({
				ok: false,
				error: "RequestCodeFailed",
				message: result.error || "Не удалось отправить код подтверждения.",
			});
		}

		return reply.code(200).send({
			ok: true,
			phoneCodeHash: result.phoneCodeHash,
			timeoutSeconds: result.timeoutSeconds,
			formattedPhone: result.formattedPhone,
			testCode: result.testCode,
			message: `Код подтверждения отправлен на номер ${result.formattedPhone}.`,
		});
	});
}
