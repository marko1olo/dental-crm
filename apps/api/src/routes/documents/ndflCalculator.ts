import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
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
			if (
				err &&
				typeof err === "object" &&
				"code" in err &&
				(err as { code?: string }).code === "Decree659TaxDeductionForbiddenError"
			) {
				return reply.code(422).send({
					error: "Decree659TaxDeductionForbiddenError",
					message:
						(err as { message?: string }).message ??
						"Отказ по Постановлению Правительства РФ №659 от 30.05.2026: формирование справки для анонимных карт запрещено.",
				});
			}
			const msg = err instanceof Error ? err.message : "Ошибка расчета вычета";
			return reply.code(400).send({
				error: "NdflCalculationError",
				message: msg,
			});
		}
	};

	app.get("/api/documents/tax-deduction/preview/:patientId", handlePreview);

	// 2. POST /api/v1/documents/tax-deduction/xml (Feature #33)
	const handleGenerateXml = async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalReadAccess(request, reply, "document tax xml")))
			return;
		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;

		const rawBody = request.body as Record<string, unknown> | null | undefined;
		const payerObj = rawBody?.payer as Record<string, unknown> | undefined;
		const patientObj = rawBody?.patient as Record<string, unknown> | undefined;
		const payerFamily = typeof payerObj?.fullName === "object" ? (payerObj.fullName as Record<string, unknown>)?.family : payerObj?.fullName;
		const patientFamily = typeof patientObj?.fullName === "object" ? (patientObj.fullName as Record<string, unknown>)?.family : patientObj?.fullName;

		const isAnon =
			Boolean(rawBody?.isAnonymous) ||
			Boolean(payerObj?.isAnonymous) ||
			Boolean(patientObj?.isAnonymous) ||
			String(payerFamily || "").includes("UUID_ANON") ||
			String(patientFamily || "").includes("UUID_ANON") ||
			String(payerFamily || "").toLowerCase().includes("аноним") ||
			String(patientFamily || "").toLowerCase().includes("аноним");

		if (isAnon) {
			return reply.code(422).send({
				error: "Decree659TaxDeductionForbiddenError",
				message:
					"Отказ по Постановлению Правительства РФ №659 от 30.05.2026 и ст. 219 НК РФ: формирование справок для налогового вычета по форме КНД 1151156 для анонимных пациентов категорически запрещено.",
			});
		}

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
			if (
				err &&
				typeof err === "object" &&
				"code" in err &&
				(err as { code?: string }).code === "Decree659TaxDeductionForbiddenError"
			) {
				return reply.code(422).send({
					error: "Decree659TaxDeductionForbiddenError",
					message:
						(err as { message?: string }).message ??
						"Отказ по Постановлению Правительства РФ №659: оформление налогового вычета (справки об оплате медицинских услуг для ФНС КНД 1151156) на анонимных пациентов категорически запрещено Налоговым кодексом РФ.",
				});
			}
			const msg = err instanceof Error ? err.message : "Ошибка генерации XML ФНС";
			return reply.code(500).send({
				error: "NdflXmlGenerationError",
				message: msg,
			});
		}
	};

	// 2. POST /api/documents/tax-deduction/xml (Feature #33 - Каноническая генерация XML)
	app.post("/api/documents/tax-deduction/xml", handleGenerateXml);
}
