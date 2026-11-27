import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { withTenantReadCtx } from "../../db/rls.js";
import { clinics } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { TelegramAccountService } from "../../services/telegram/TelegramAccountService.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const requestQrBodySchema = z
	.object({
		clinicId: z.string().trim().optional().nullable(),
		userId: z.string().trim().optional().nullable(),
	})
	.strict();

const confirmQrBodySchema = z
	.object({
		token: z.string().trim().min(1, "Токен QR обязателен"),
		phone: z.string().trim().optional().nullable(),
		clinicId: z.string().trim().optional().nullable(),
		userId: z.string().trim().optional().nullable(),
	})
	.strict();

async function resolveVerifiedClinicId(
	request: FastifyRequest,
	reply: FastifyReply,
	orgId: string,
	bodyClinicId?: string | null,
): Promise<{ ok: true; clinicId: string | null } | { ok: false }> {
	const headerClinicId = request.headers["x-clinic-id"];
	const rawHeaderClinicId =
		typeof headerClinicId === "string"
			? headerClinicId
			: Array.isArray(headerClinicId)
				? headerClinicId[0]
				: null;
	const candidate = (bodyClinicId?.trim() || rawHeaderClinicId?.trim() || "").trim();
	if (!candidate) {
		return { ok: true, clinicId: null };
	}

	if (!UUID_PATTERN.test(candidate)) {
		reply.code(400).send({
			ok: false,
			error: "ValidationError",
			message: "Некорректный идентификатор клиники (ожидается формат UUID).",
		});
		return { ok: false };
	}

	const [ownedClinic] = await withTenantReadCtx(orgId, async (tx) =>
		tx
			.select({ id: clinics.id })
			.from(clinics)
			.where(and(eq(clinics.id, candidate), eq(clinics.organizationId, orgId)))
			.limit(1),
	);
	if (!ownedClinic) {
		reply.code(403).send({
			ok: false,
			error: "ForbiddenClinicAccess",
			message: "Указанный филиал не принадлежит текущей организации.",
		});
		return { ok: false };
	}

	return { ok: true, clinicId: ownedClinic.id };
}

export function registerTelegramAccountQrRoutes(app: FastifyInstance) {
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/telegram/account/request-qr",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"telegram account request-qr",
			);
			if (!orgId) return;

			const parsed = requestQrBodySchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				return reply.code(400).send({
					ok: false,
					error: "ValidationError",
					message: "Некорректные параметры запроса QR-кода.",
				});
			}

			const resolvedClinic = await resolveVerifiedClinicId(
				request,
				reply,
				orgId,
				parsed.data.clinicId,
			);
			if (!resolvedClinic.ok) return;

			const identity = getRequestIdentity(request);
			const userId = identity.userId || null;

			const qr = await TelegramAccountService.requestQr({
				organizationId: orgId,
				userId,
				clinicId: resolvedClinic.clinicId,
			});

			if (!qr.ok) {
				const statusCode = qr.configured === false ? 501 : 400;
				return reply.code(statusCode).send({
					ok: false,
					...(qr.configured === false ? { configured: false } : {}),
					error: qr.errorCode || "QrRequestFailed",
					message: qr.error || "Не удалось запросить QR-код авторизации Telegram.",
				});
			}

			return reply.code(200).send({
				ok: true,
				token: qr.token,
				qrPayload: qr.qrPayload,
				qrSvg: qr.qrSvg,
				expiresIn: qr.expiresIn,
			});
		},
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/telegram/account/confirm-qr",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"telegram account confirm-qr",
			);
			if (!orgId) return;

			const parsed = confirmQrBodySchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					ok: false,
					error: "ValidationError",
					message: "Некорректный токен QR.",
				});
			}

			const resolvedClinic = await resolveVerifiedClinicId(
				request,
				reply,
				orgId,
				parsed.data.clinicId,
			);
			if (!resolvedClinic.ok) return;

			const identity = getRequestIdentity(request);
			const userId = identity.userId || null;

			const result = await TelegramAccountService.confirmQr({
				organizationId: orgId,
				token: parsed.data.token,
				phone: parsed.data.phone ?? null,
				userId,
				clinicId: resolvedClinic.clinicId,
			});

			if (!result.ok) {
				const statusCode = result.configured === false ? 501 : 400;
				return reply.code(statusCode).send({
					ok: false,
					...(result.configured === false ? { configured: false } : {}),
					error: result.errorCode || "QrConfirmFailed",
					message: result.error || "Не удалось подтвердить авторизацию по QR-коду.",
				});
			}

			return reply.code(200).send({
				ok: true,
				connected: true,
				account: result.account,
				message: "Авторизация по QR-коду успешно завершена.",
			});
		},
	});
}
