import { clinicalRuleEvaluationInputSchema, clinicalRuleEvaluationResponseSchema, clinicalRuleSchema, createClinicalRuleSchema, updateClinicalRuleSchema } from "@dental/shared";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../accessGuard.js";
import { evaluateClinicalRulesInDb, createClinicalRuleInDb, updateClinicalRuleInDb } from "../db/clinicalQuery.js";
import { getDefaultOrganizationId } from "../db/pricelistQuery.js";
const clinicalRuleEvaluationValidationMessage = "Ошибка валидации: запрос не соответствует формату.";
const clinicalRuleMutationValidationMessage = "Ошибка валидации: данные правила некорректны.";
function parseClinicalPayload(schema, value) {
    const parsed = schema.safeParse(value);
    if (!parsed.success)
        return null;
    return parsed.data;
}
export async function registerClinicalRoutes(app) {
    app.post("/api/clinical/rules/evaluate", async (request, reply) => {
        if (!(await requireClinicalReadAccess(request, reply, "clinical rule evaluate")))
            return;
        const input = parseClinicalPayload(clinicalRuleEvaluationInputSchema, request.body);
        if (!input) {
            return reply.code(400).send({ error: "ClinicalRuleValidationError", message: clinicalRuleEvaluationValidationMessage });
        }
        const orgId = await getDefaultOrganizationId();
        if (!orgId) {
            return reply.code(500).send({ error: "NoOrganizationFound", message: "Организация не найдена" });
        }
        return clinicalRuleEvaluationResponseSchema.parse(await evaluateClinicalRulesInDb(orgId, input));
    });
    app.post("/api/clinical/rules", async (request, reply) => {
        if (!(await requireClinicalMutationAccess(request, reply, "clinical rule create")))
            return;
        const input = parseClinicalPayload(createClinicalRuleSchema, request.body);
        if (!input) {
            return reply.code(400).send({ error: "ClinicalRuleValidationError", message: clinicalRuleMutationValidationMessage });
        }
        const orgId = await getDefaultOrganizationId();
        if (!orgId) {
            return reply.code(500).send({ error: "NoOrganizationFound", message: "Организация не найдена" });
        }
        return clinicalRuleSchema.parse(await createClinicalRuleInDb(orgId, input));
    });
    app.patch("/api/clinical/rules/:ruleId", async (request, reply) => {
        if (!(await requireClinicalMutationAccess(request, reply, "clinical rule update")))
            return;
        const params = request.params;
        const body = request.body && typeof request.body === "object" ? request.body : {};
        const input = parseClinicalPayload(updateClinicalRuleSchema, { ...body, id: params.ruleId });
        if (!input) {
            return reply.code(400).send({ error: "ClinicalRuleValidationError", message: clinicalRuleMutationValidationMessage });
        }
        const orgId = await getDefaultOrganizationId();
        if (!orgId) {
            return reply.code(500).send({ error: "NoOrganizationFound", message: "Организация не найдена" });
        }
        return clinicalRuleSchema.parse(await updateClinicalRuleInDb(orgId, input));
    });
}
