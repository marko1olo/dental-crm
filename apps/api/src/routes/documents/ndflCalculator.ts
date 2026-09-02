import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
} from "../../accessGuard.js";
import { requireOrganizationId } from "../../security/identity.js";
import { NdflTaxService } from "../../services/documents/ndflTaxService.js";
import { fnsTaxPayloadSchema } from "@dental/shared";

const ndflQuerySchema = z.object({
	patientId: z.string().uuid().optional(),
	year: z.coerce.number().int().optional(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
});

export async function register(app: FastifyInstance) {
	// 1. GET /api/v1/documents/tax-deduction/preview/:patientId (Feature #5)
	const handlePreview = async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalReadAccess(request, reply, "document read")))
			return;
		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;

		const { patientId } = request.params as { patientId: string };
		const queryParsed = ndflQuerySchema.safeParse(request.query);
		const query = queryParsed.success ? queryParsed.data : {};

		const options: {
			taxYear?: number;
			startDate?: string;
			endDate?: string;
		} = {};
		if (query.year !== undefined) options.taxYear = query.year;
		if (query.startDate !== undefined) options.startDate = query.startDate;
		if (query.endDate !== undefined) options.endDate = query.endDate;

		try {
			const preview = await NdflTaxService.calculatePreview(
				organizationId,
				patientId,
				options,
			);
			return reply.send(preview);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Ошибка расчета вычета";
			return reply.code(400).send({
				error: "NdflCalculationError",
				message: msg,
			});
		}
	};

	app.get("/api/v1/documents/tax-deduction/preview/:patientId", handlePreview);
	app.get("/api/documents/tax-deduction/preview/:patientId", handlePreview);

	// 2. POST /api/v1/documents/tax-deduction/xml (Feature #33)
	const handleGenerateXml = async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalReadAccess(request, reply, "document tax xml")))
			return;
		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;

		const parsed = fnsTaxPayloadSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "NdflXmlPayloadValidationError",
				message: "Проверьте реквизиты справки НДФЛ",
				issues: parsed.error.issues,
			});
		}

		try {
			const xmlResult = NdflTaxService.generateXml(parsed.data);
			return reply.send(xmlResult);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Ошибка генерации XML ФНС";
			return reply.code(500).send({
				error: "NdflXmlGenerationError",
				message: msg,
			});
		}
	};

	app.post("/api/v1/documents/tax-deduction/xml", handleGenerateXml);
	app.post("/api/documents/tax-deduction/xml", handleGenerateXml);

	// 3. Legacy GET /api/documents/ndfl-calculator (backward compatibility)
	app.get("/api/documents/ndfl-calculator", async (request, reply) => {
		if (!(await requireClinicalReadAccess(request, reply, "document read")))
			return;
		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;

		const parsed = ndflQuerySchema.safeParse(request.query);
		if (!parsed.success || !parsed.data.patientId) {
			return reply.code(400).send({
				error: "NdflQueryValidationError",
				message: "Проверьте параметры запроса: требуется идентификатор пациента (patientId).",
			});
		}
		const query = parsed.data;
		const targetPatientId = query.patientId;
		if (!targetPatientId) {
			return reply.code(400).send({
				error: "NdflQueryValidationError",
				message: "Проверьте параметры запроса: требуется идентификатор пациента (patientId).",
			});
		}

		const options: {
			taxYear?: number;
			startDate?: string;
			endDate?: string;
		} = {};
		if (query.year !== undefined) options.taxYear = query.year;
		if (query.startDate !== undefined) options.startDate = query.startDate;
		if (query.endDate !== undefined) options.endDate = query.endDate;

		const orgId = organizationId as string;
		const patientIdStr = targetPatientId as string;

		try {
			const preview = await NdflTaxService.calculatePreview(
				orgId,
				patientIdStr,
				options,
			);


			return {
				isBlocked: preview.isBlocked,
				debtRub: preview.debtRub,
				blockReason: preview.blockReason,
				code1TotalRub: preview.code1TotalRub,
				code2TotalRub: preview.code2TotalRub,
				totalEligibleRub: preview.totalEligibleRub,
				estimatedRefund13Rub: preview.estimatedRefund13Rub,
				estimatedRefund15Rub: preview.estimatedRefund15Rub,
				excludedNonMedicalGoodsRub: preview.excludedNonMedicalGoodsRub,
				excludedDmsInsuranceRub: preview.excludedDmsInsuranceRub,
			};
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Ошибка расчета вычета";
			return reply.status(404).send({
				error: "PatientNotFound",
				message: msg,
			});
		}
	});
}
