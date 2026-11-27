/**
 * apps/api/src/routes/loyaltyModules/loyaltyCertificateRoutes.ts
 *
 * Statutory 54-FZ & Luhn Modulo-10 Gift Certificates Router.
 * Mandate 8b Sweet Spot Architecture (<= 150 lines).
 */

import {
	validateLuhn16Certificate,
	issueCertificateSchema,
	redeemCertificateSchema,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireOrganizationId } from "../../security/identity.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../../db/rls.js";
import { extractIdempotencyKey, isValidUuid } from "../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import {
	executeIssueGiftCertificate,
	lookupGiftCertificateBySerial,
} from "./certificateIssuance.js";
import {
	executeRedeemGiftCertificate,
	listGiftCertificates,
} from "./certificateRedemption.js";

const serialParamSchema = z
	.object({
		serial: z.string().trim().min(1),
	})
	.strict();

const validateCertificateBodySchema = z
	.object({
		serialNumber: z.string().trim().optional(),
		serial: z.string().trim().optional(),
	})
	.strict();

export async function registerLoyaltyCertificateRoutes(app: FastifyInstance) {
	/**
	 * Выпуск нового подарочного сертификата клиники (16-значный Luhn-серийный номер)
	 * Фискализация аванса по 54-ФЗ (тег 1214) и предмет расчета 1212 = 10
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/loyalty/certificates/issue",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const idempotencyKey = extractIdempotencyKey(request);
			if (idempotencyKey && !isValidUuid(idempotencyKey)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7)",
				});
			}

			const parsed = issueCertificateSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.status(400).send({
					message: "Некорректные параметры выпуска сертификата",
					errors: parsed.error.format(),
				});
			}

			return withTenantWriteCtx(orgId, async (tx) => {
				const certDto = await executeIssueGiftCertificate(orgId, parsed.data, idempotencyKey, tx);
				if (!certDto) {
					return reply.status(500).send({ message: "Не удалось выпустить сертификат" });
				}

				if (idempotencyKey && certDto.relatedPaymentId) {
					reply.header("idempotency-replayed", "true");
				}

				return reply.status(201).send({
					success: true,
					certificate: certDto,
				});
			});
		},
	});

	/**
	 * Проверка подлинности и текущего остатка подарочного сертификата
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/loyalty/certificates/verify/:serial",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const paramsParsed = serialParamSchema.safeParse(request.params);
			if (!paramsParsed.success) {
				return reply.status(400).send({
					valid: false,
					message: "Некорректный номер сертификата",
				});
			}
			const formattedSerial = paramsParsed.data.serial;

			if (!validateLuhn16Certificate(formattedSerial)) {
				return reply.status(400).send({
					valid: false,
					message: "Недействительный 16-значный номер сертификата (ошибка контрольной суммы Luhn)",
				});
			}

			return withTenantReadCtx(orgId, async (tx) => {
				const res = await lookupGiftCertificateBySerial(orgId, formattedSerial, tx);
				if (!res.found || !res.certificate) {
					return reply.status(404).send({
						valid: false,
						message: "Сертификат с указанным номером не найден в базе данных клиники",
					});
				}

				return reply.send({
					valid: true,
					certificate: res.certificate,
				});
			});
		},
	});

	/**
	 * Валидация подарочного сертификата через реальную базу (POST /api/loyalty/certificates/validate)
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/loyalty/certificates/validate",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const parsedBody = validateCertificateBodySchema.safeParse(request.body ?? {});
			if (!parsedBody.success) {
				return reply.status(400).send({
					valid: false,
					exists: false,
					message: "Некорректные параметры запроса валидации сертификата",
				});
			}
			const rawSerial = (parsedBody.data.serialNumber || parsedBody.data.serial || "").trim();

			if (!validateLuhn16Certificate(rawSerial)) {
				return reply.status(400).send({
					valid: false,
					exists: false,
					message: "Недействительный 16-значный номер сертификата (ошибка контрольной суммы Luhn)",
				});
			}

			return withTenantReadCtx(orgId, async (tx) => {
				const res = await lookupGiftCertificateBySerial(orgId, rawSerial, tx);
				if (!res.found || !res.certificate) {
					return reply.status(404).send({
						valid: true,
						exists: false,
						message: "Сертификат с указанным номером не найден в базе данных клиники",
					});
				}

				return reply.send({
					valid: true,
					exists: true,
					certificate: res.certificate,
				});
			});
		},
	});

	/**
	 * Списание средств с подарочного сертификата в счет оплаты лечения
	 * Фискальный зачёт аванса по 54-ФЗ (тег 1215), метод оплаты "certificate" (SEV-1)
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/loyalty/certificates/redeem",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const idempotencyKey = extractIdempotencyKey(request);
			if (idempotencyKey && !isValidUuid(idempotencyKey)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7)",
				});
			}

			const parsed = redeemCertificateSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.status(400).send({
					message: "Некорректные параметры списания сертификата",
					errors: parsed.error.format(),
				});
			}

			if (!validateLuhn16Certificate(parsed.data.serialNumber)) {
				return reply.status(400).send({
					message: "Недействительный номер сертификата (ошибка контрольной суммы Luhn)",
				});
			}

			return withTenantWriteCtx(orgId, async (tx) => {
				const result = await executeRedeemGiftCertificate(orgId, parsed.data, idempotencyKey, tx);

				if ("notFound" in result) {
					return reply.status(404).send({ message: result.message });
				}
				if ("error" in result) {
					return reply.status(result.code ?? 400).send({ message: result.message });
				}

				if (result.replayed) {
					reply.header("idempotency-replayed", "true");
				}

				return reply.status(200).send(result);
			});
		},
	});

	/**
	 * Журнал выпущенных подарочных сертификатов клиники
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/loyalty/certificates/list",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			return withTenantReadCtx(orgId, async (tx) => {
				const certificates = await listGiftCertificates(orgId, tx);
				return reply.send({ certificates });
			});
		},
	});
}
