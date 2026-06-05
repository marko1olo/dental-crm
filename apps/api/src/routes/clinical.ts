import type { FastifyInstance } from "fastify";
import {
  clinicalRuleEvaluationInputSchema,
  clinicalRuleEvaluationResponseSchema,
  clinicalRuleSchema,
  createClinicalRuleSchema,
  updateClinicalRuleSchema
} from "@dental/shared";
import { createClinicalRule, evaluateClinicalRules, updateClinicalRule } from "../sampleData.js";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../accessGuard.js";

type ClinicalPayloadSchema<T> = {
  safeParse: (value: unknown) => { success: true; data: T } | { success: false };
};

const clinicalRuleEvaluationValidationMessage =
  "Клинические правила не проверены: передайте пациента, визит и факты приема.";
const clinicalRuleMutationValidationMessage =
  "Клиническое правило не сохранено: заполните название, условие и действие правила.";

function parseClinicalPayload<T>(schema: ClinicalPayloadSchema<T>, value: unknown) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) return null;
  return parsed.data;
}

export async function registerClinicalRoutes(app: FastifyInstance) {
  app.post("/api/clinical/rules/evaluate", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "clinical rule evaluate"))) return;
    const input = parseClinicalPayload(clinicalRuleEvaluationInputSchema, request.body);
    if (!input) {
      return reply.code(400).send({ error: "ClinicalRuleValidationError", message: clinicalRuleEvaluationValidationMessage });
    }
    return clinicalRuleEvaluationResponseSchema.parse(evaluateClinicalRules(input));
  });

  app.post("/api/clinical/rules", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "clinical rule create"))) return;
    const input = parseClinicalPayload(createClinicalRuleSchema, request.body);
    if (!input) {
      return reply.code(400).send({ error: "ClinicalRuleValidationError", message: clinicalRuleMutationValidationMessage });
    }
    return clinicalRuleSchema.parse(createClinicalRule(input));
  });

  app.patch("/api/clinical/rules/:ruleId", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "clinical rule update"))) return;
    const params = request.params as { ruleId: string };
    const body = request.body && typeof request.body === "object" ? request.body : {};
    const input = parseClinicalPayload(updateClinicalRuleSchema, { ...body, id: params.ruleId });
    if (!input) {
      return reply.code(400).send({ error: "ClinicalRuleValidationError", message: clinicalRuleMutationValidationMessage });
    }
    return clinicalRuleSchema.parse(updateClinicalRule(input));
  });
}
