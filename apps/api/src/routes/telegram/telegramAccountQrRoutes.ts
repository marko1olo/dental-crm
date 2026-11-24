import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import { TelegramAccountService } from "../../services/telegram/TelegramAccountService.js";

export function registerTelegramAccountQrRoutes(app: FastifyInstance) {
	app.post("/api/telegram/account/request-qr", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"telegram account request-qr",
		);
		if (!orgId) return;

		const identity = getRequestIdentity(request);
		const userId = identity.userId || null;
		const headerClinicId = request.headers["x-clinic-id"];
		const clinicId = (typeof headerClinicId === "string" ? headerClinicId : Array.isArray(headerClinicId) ? headerClinicId[0] : null) || null;

		const qr = await TelegramAccountService.requestQr({
			organizationId: orgId,
			userId,
			clinicId,
		});

		return reply.code(200).send({
			ok: true,
			token: qr.token,
			qrPayload: qr.qrPayload,
			qrSvg: qr.qrSvg,
			expiresIn: qr.expiresIn,
		});
	});

	app.post("/api/telegram/account/confirm-qr", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"telegram account confirm-qr",
		);
		if (!orgId) return;

		const schema = z.object({
			token: z.string().trim().min(1, "Токен QR обязателен"),
			phone: z.string().trim().optional(),
		});

		const parsed = schema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				ok: false,
				error: "ValidationError",
				message: "Некорректный токен QR.",
			});
		}

		const identity = getRequestIdentity(request);
		const userId = identity.userId || null;
		const headerClinicId = request.headers["x-clinic-id"];
		const clinicId = (typeof headerClinicId === "string" ? headerClinicId : Array.isArray(headerClinicId) ? headerClinicId[0] : null) || null;

		const result = await TelegramAccountService.confirmQr({
			organizationId: orgId,
			token: parsed.data.token,
			phone: parsed.data.phone ?? null,
			userId,
			clinicId,
		});

		if (!result.ok) {
			return reply.code(400).send({
				ok: false,
				error: "QrConfirmFailed",
				message: result.error || "Не удалось подтвердить авторизацию по QR-коду.",
			});
		}

		return reply.code(200).send({
			ok: true,
			connected: true,
			account: result.account,
			message: "Авторизация по QR-коду успешно завершена.",
		});
	});
}
