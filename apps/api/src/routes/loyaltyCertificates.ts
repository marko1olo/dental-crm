/**
 * apps/api/src/routes/loyaltyCertificates.ts
 *
 * Statutory 54-FZ & Luhn Modulo-10 Gift Certificates Router.
 * Mandate 8b Sweet Spot Architecture (<= 150 lines).
 * Domain transaction logic decoupled into loyaltyModules/certificateService.ts.
 */

import {
	validateLuhn16Certificate,
	issueCertificateSchema,
	redeemCertificateSchema,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { requireOrganizationId } from "../security/identity.js";
import { withTenantCtx } from "../db/rls.js";
import { extractIdempotencyKey } from "../plugins/idempotencyModules/idempotencyHeaderParser.js";
import {
	executeIssueGiftCertificate,
	lookupGiftCertificateBySerial,
	executeRedeemGiftCertificate,
	listGiftCertificates,
} from "./loyaltyModules/certificateService.js";

export async function registerLoyaltyCertificateRoutes(app: FastifyInstance) {
	/**
	 * Выпуск нового подарочного сертификата клиники (16-значный Luhn-серийный номер)
	 * Фискализация аванса по 54-ФЗ (тег 1214) и предмет расчета 1212 = 10
	 */
	app.post("/api/loyalty/certificates/issue", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const parsed = issueCertificateSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				message: "Некорректные параметры выпуска сертификата",
				errors: parsed.error.format(),
			});
		}

		const idempotencyKey = extractIdempotencyKey(request);

		return withTenantCtx(orgId, async () => {
			const certDto = await executeIssueGiftCertificate(orgId, parsed.data, idempotencyKey);
			if (!certDto) {
				return reply.status(500).send({ message: "Не удалось выпустить сертификат" });
			}

			return reply.status(201).send({
				success: true,
				certificate: certDto,
			});
		});
	});

	/**
	 * Проверка подлинности и текущего остатка подарочного сертификата
	 */
	app.get("/api/loyalty/certificates/verify/:serial", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const { serial } = request.params as { serial: string };
		const formattedSerial = serial.trim();

		if (!validateLuhn16Certificate(formattedSerial)) {
			return reply.status(400).send({
				valid: false,
				message: "Недействительный 16-значный номер сертификата (ошибка контрольной суммы Luhn)",
			});
		}

		return withTenantCtx(orgId, async () => {
			const res = await lookupGiftCertificateBySerial(orgId, formattedSerial);
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
	});

	/**
	 * Валидация подарочного сертификата через реальную базу (POST /api/loyalty/certificates/validate)
	 */
	app.post("/api/loyalty/certificates/validate", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const body = (request.body as { serialNumber?: string; serial?: string }) || {};
		const rawSerial = (body.serialNumber || body.serial || "").trim();

		if (!validateLuhn16Certificate(rawSerial)) {
			return reply.status(400).send({
				valid: false,
				exists: false,
				message: "Недействительный 16-значный номер сертификата (ошибка контрольной суммы Luhn)",
			});
		}

		return withTenantCtx(orgId, async () => {
			const res = await lookupGiftCertificateBySerial(orgId, rawSerial);
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
	});

	/**
	 * Списание средств с подарочного сертификата в счет оплаты лечения
	 * Фискальный зачёт аванса по 54-ФЗ (тег 1215), метод оплаты "certificate" (SEV-1)
	 */
	app.post("/api/loyalty/certificates/redeem", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

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

		const idempotencyKey = extractIdempotencyKey(request);

		return withTenantCtx(orgId, async () => {
			const result = await executeRedeemGiftCertificate(orgId, parsed.data, idempotencyKey);

			if ("notFound" in result) {
				return reply.status(404).send({ message: result.message });
			}
			if ("error" in result) {
				return reply.status(result.code ?? 400).send({ message: result.message });
			}

			return reply.status(200).send(result);
		});
	});

	/**
	 * Журнал выпущенных подарочных сертификатов клиники
	 */
	app.get("/api/loyalty/certificates/list", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		return withTenantCtx(orgId, async () => {
			const certificates = await listGiftCertificates(orgId);
			return reply.send({ certificates });
		});
	});
}
