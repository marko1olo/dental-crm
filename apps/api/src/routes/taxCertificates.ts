import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadAccess } from "../accessGuard.js";
import { requireOrganizationId } from "../security/identity.js";
import { NdflTaxService } from "../services/documents/ndflTaxService.js";
import { getPaymentsByPatientIdInDb } from "../db/billingQuery.js";
import { getPatientByIdFromDb } from "../db/patientsQuery.js";

/**
 * apps/api/src/routes/taxCertificates.ts
 *
 * Канонический Fastify-маршрут формирования справок об оплате медицинских услуг
 * для налогового вычета (ФНС / КНД 1151156).
 *
 * Инварианты:
 * 1. Прямое честное чтение платежей из реального PostgreSQL 18 на 127.0.0.1:5432.
 * 2. Полная изоляция по organizationId (Multi-Tenant Security).
 * 3. Ноль синтетических моков в боевом контуре.
 */

export async function registerTaxCertificateRoutes(app: FastifyInstance) {
	// Маршрут предварительного расчета и агрегации платежей для справки ФНС
	app.get("/api/tax-certificates/preview/:patientId", async (req: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalReadAccess(req, reply, "tax certificate preview"))) return;
		const organizationId = requireOrganizationId(req, reply);
		if (!organizationId) return;

		const { patientId } = req.params as { patientId: string };
		const query = req.query as { year?: string; startDate?: string; endDate?: string };
		const options = {
			taxYear: query.year ? Number(query.year) : new Date().getFullYear(),
			startDate: query.startDate,
			endDate: query.endDate,
		};

		try {
			const preview = await NdflTaxService.calculatePreview(organizationId, patientId, options);
			return reply.send(preview);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Ошибка расчета вычета";
			return reply.code(400).send({ error: "TaxCertificateError", message: msg });
		}
	});

	// Маршрут получения реальных платежей пациента из PostgreSQL 18 для налогового периода
	app.get("/api/tax-certificates/payments/:patientId", async (req: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalReadAccess(req, reply, "tax certificate payments"))) return;
		const organizationId = requireOrganizationId(req, reply);
		if (!organizationId) return;

		const { patientId } = req.params as { patientId: string };
		const patient = await getPatientByIdFromDb(organizationId, patientId);
		if (!patient) {
			return reply.code(404).send({ error: "NotFoundError", message: "Пациент не найден" });
		}

		const payments = await getPaymentsByPatientIdInDb(organizationId, patientId);
		return reply.send({ payments, patient });
	});
}
