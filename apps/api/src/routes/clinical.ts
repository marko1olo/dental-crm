import {
	clinicalRuleEvaluationInputSchema,
	clinicalRuleEvaluationResponseSchema,
	clinicalRuleSchema,
	createClinicalRuleSchema,
	updateClinicalRuleSchema,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	resolveOrganizationId,
} from "../accessGuard.js";
import {
	createClinicalRuleInDb,
	evaluateClinicalRulesInDb,
	updateClinicalRuleInDb,
	deleteClinicalRuleInDb,
} from "../db/clinicalQuery.js";

type ClinicalPayloadSchema<T> = {
	safeParse: (
		value: unknown,
	) => { success: true; data: T } | { success: false };
};

const clinicalRuleEvaluationValidationMessage =
	"Ошибка валидации: запрос не соответствует формату.";
const clinicalRuleMutationValidationMessage =
	"Ошибка валидации: данные правила некорректны.";

function parseClinicalPayload<T>(
	schema: ClinicalPayloadSchema<T>,
	value: unknown,
) {
	const parsed = schema.safeParse(value);
	if (!parsed.success) return null;
	return parsed.data;
}

export async function registerClinicalRoutes(app: FastifyInstance) {
	app.post("/api/clinical/rules/evaluate", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"clinical rule evaluate",
			))
		)
			return;
		const input = parseClinicalPayload(
			clinicalRuleEvaluationInputSchema,
			request.body,
		);
		if (!input) {
			return reply.code(400).send({
				error: "ClinicalRuleValidationError",
				message: clinicalRuleEvaluationValidationMessage,
			});
		}
		const orgId = await resolveOrganizationId(request);
		if (!orgId) {
			return reply.code(403).send({
				error: "OrganizationRequired",
				message: "Организация не определена",
			});
		}
		return clinicalRuleEvaluationResponseSchema.parse(
			await evaluateClinicalRulesInDb(orgId, input),
		);
	});

	app.post("/api/clinical/rules", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"clinical rule create",
			))
		)
			return;
		const input = parseClinicalPayload(createClinicalRuleSchema, request.body);
		if (!input) {
			return reply.code(400).send({
				error: "ClinicalRuleValidationError",
				message: clinicalRuleMutationValidationMessage,
			});
		}
		const orgId = await resolveOrganizationId(request);
		if (!orgId) {
			return reply.code(403).send({
				error: "OrganizationRequired",
				message: "Организация не определена",
			});
		}
		return clinicalRuleSchema.parse(await createClinicalRuleInDb(orgId, input));
	});

	app.patch("/api/clinical/rules/:ruleId", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"clinical rule update",
			))
		)
			return;
		const params = request.params as { ruleId: string };
		const body =
			request.body && typeof request.body === "object" ? request.body : {};
		const input = parseClinicalPayload(updateClinicalRuleSchema, {
			...body,
			id: params.ruleId,
		});
		if (!input) {
			return reply.code(400).send({
				error: "ClinicalRuleValidationError",
				message: clinicalRuleMutationValidationMessage,
			});
		}
		const orgId = await resolveOrganizationId(request);
		if (!orgId) {
			return reply.code(403).send({
				error: "OrganizationRequired",
				message: "Организация не определена",
			});
		}
		return clinicalRuleSchema.parse(await updateClinicalRuleInDb(orgId, input));
	});

		app.delete("/api/clinical/rules/:ruleId", async (request, reply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "clinical rule delete"))) return;
		const params = request.params as { ruleId: string };
		const orgId = await resolveOrganizationId(request);
		if (!orgId) return reply.code(403).send({ error: "OrganizationRequired", message: "Организация не определена" });
		await deleteClinicalRuleInDb(orgId, params.ruleId);
		return reply.send({ success: true });
	});

app.post("/api/clinical/post-op-care", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"trigger post op care",
			))
		)
			return;
		const body = request.body as { patientId?: string; itemTitle?: string };
		if (!body.patientId || !body.itemTitle) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "patientId and itemTitle are required",
			});
		}
		const orgId = await resolveOrganizationId(request);
		if (!orgId) return reply.code(403).send({ error: "OrganizationRequired" });

		// Verify patient belongs to org
		const { db } = await import("../db/client.js");
		const { patients } = await import("../db/schema.js");
		const { eq, and } = await import("drizzle-orm");
		const [patient] = await db
			.select({ id: patients.id })
			.from(patients)
			.where(
				and(
					eq(patients.id, body.patientId),
					eq(patients.organizationId, orgId),
				),
			)
			.limit(1);
		if (!patient)
			return reply.code(403).send({
				error: "Forbidden",
				message: "Patient not found in this organization",
			});

		// Dynamically import the service to avoid circular deps if any
		const { triggerPostOpCare } = await import(
			"../services/postOpCareTrigger.js"
		);
		await triggerPostOpCare(orgId, body.patientId, body.itemTitle);

		return reply.send({ success: true });
	});

	// COMPETITOR FEATURE #19: прием::пользовательские_справочники_бланков_форма_043у
	app.get("/api/clinical/custom-examination-form-catalogs", async (request, reply) => {
		const rawOrgId = request.headers["x-organization-id"];
		if (rawOrgId === "") {
			return reply.status(400).send({ error: "Invalid organization ID: header cannot be empty string" });
		}
		const orgId = (rawOrgId as string) || "00000000-0000-0000-0000-000000000001";
		const { getCustomExaminationFormCatalogsFromDb } = await import("../db/customExaminationFormCatalogsQuery.js");
		const items = await getCustomExaminationFormCatalogsFromDb(orgId);
		return reply.status(200).send(items);
	});
}

