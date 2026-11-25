import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireClinicalReadAccess,
} from "../../accessGuard.js";
import { requireOrganizationId } from "../../security/identity.js";
import { NdflTaxService } from "../../services/documents/ndflTaxService.js";
import { fnsTaxPayloadSchema } from "@dental/shared";

const ndflParamsSchema = z
	.object({
		patientId: z.string().uuid("Некорректный идентификатор пациента (ожидается UUID)"),
	})
	.strict();

const ndflQuerySchema = z
	.object({
		patientId: z.string().uuid().optional(),
		year: z.coerce.number().int().min(2000).max(2100).optional(),
		startDate: z.string().min(4).max(40).optional(),
		endDate: z.string().min(4).max(40).optional(),
	})
	.strict();

export async function register(app: FastifyInstance) {
	// 1. GET /api/v1/documents/tax-deduction/preview/:patientId (Feature #5)
	const handlePreview = async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalReadAccess(request, reply, "document read")))
			return;
		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;

		const paramsParsed = ndflParamsSchema.safeParse(request.params);
		if (!paramsParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор пациента (ожидается UUID).",
			});
		}
		const { patientId } = paramsParsed.data;

		const queryParsed = ndflQuerySchema.safeParse(request.query ?? {});
		if (!queryParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры запроса расчета налогового вычета.",
				issues: queryParsed.error.issues,
			});
		}
		const query = queryParsed.data;

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
			const errorCode =
				err && typeof err === "object" && "code" in err
					? (err as { code?: unknown }).code
					: undefined;
			if (
				errorCode === "TaxPayerRequisitesRequiredError" ||
				errorCode === "TaxDeductionIdentificationRequiredError"
			) {
				return reply.code(422).send({
					error: "TaxPayerRequisitesRequiredError",
					message:
						(err as { message?: string }).message ??
						"Для оформления справки по форме КНД 1151156 в соответствии со ст. 219 НК РФ требуются паспортные данные и ИНН налогоплательщика.",
				});
			}
			if (errorCode === "InvalidDateRangeError") {
				return reply.code(400).send({
					error: "InvalidDateRangeError",
					message: "Некорректный диапазон дат для расчета налогового вычета.",
				});
			}
			if (errorCode === "PatientNotFoundError") {
				return reply.code(404).send({
					error: "PatientNotFoundError",
					message: "Пациент не найден.",
				});
			}
			request.log.error(
				{ err, organizationId, patientId },
				"[NDFL] Ошибка расчета предварительной суммы налогового вычета",
			);
			return reply.code(500).send({
				error: "NdflCalculationError",
				message: "Не удалось рассчитать предварительную сумму налогового вычета.",
			});
		}
	};

	app.get("/api/documents/tax-deduction/preview/:patientId", handlePreview);

function asPlainRecord(value: unknown): Record<string, unknown> | null {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? Object.fromEntries(Object.entries(value))
		: null;
}

function extractPersonFamilyText(personObj: Record<string, unknown> | null): string {
	if (!personObj) return "";
	const fullNameObj = asPlainRecord(personObj.fullName);
	if (fullNameObj) {
		return typeof fullNameObj.family === "string" ? fullNameObj.family : "";
	}
	return typeof personObj.fullName === "string" ? personObj.fullName : "";
}

	// 2. POST /api/v1/documents/tax-deduction/xml (Feature #33)
	const handleGenerateXml = async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalReadAccess(request, reply, "document tax xml")))
			return;
		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;

		const rawBody = asPlainRecord(request.body);
		const payerObj = asPlainRecord(rawBody?.payer);
		const patientObj = asPlainRecord(rawBody?.patient);
		const payerFamily = extractPersonFamilyText(payerObj);
		const patientFamily = extractPersonFamilyText(patientObj);

		const isAnon =
			Boolean(rawBody?.isAnonymous) ||
			Boolean(payerObj?.isAnonymous) ||
			Boolean(patientObj?.isAnonymous) ||
			payerFamily.includes("UUID_ANON") ||
			patientFamily.includes("UUID_ANON") ||
			payerFamily.toLowerCase().includes("аноним") ||
			patientFamily.toLowerCase().includes("аноним");

		if (isAnon) {
			return reply.code(422).send({
				error: "TaxDeductionIdentificationRequiredError",
				message:
					"Для оформления справки по форме КНД 1151156 в соответствии со ст. 219 НК РФ требуются паспортные данные и ИНН налогоплательщика.",
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
				((err as { code?: string }).code === "TaxPayerRequisitesRequiredError" ||
				 (err as { code?: string }).code === "TaxDeductionIdentificationRequiredError")
			) {
				return reply.code(422).send({
					error: "TaxPayerRequisitesRequiredError",
					message:
						(err as { message?: string }).message ??
						"Для оформления справки по форме КНД 1151156 в соответствии со ст. 219 НК РФ требуются паспортные данные и ИНН налогоплательщика.",
				});
			}
			request.log.error(
				{ err, organizationId },
				"[NDFL] Ошибка генерации XML ФНС КНД 1151156",
			);
			return reply.code(500).send({
				error: "NdflXmlGenerationError",
				message: "Ошибка формирования XML-документа ФНС.",
			});
		}
	};

	// 2. POST /api/documents/tax-deduction/xml (Feature #33 - Каноническая генерация XML)
	app.post("/api/documents/tax-deduction/xml", handleGenerateXml);
}
