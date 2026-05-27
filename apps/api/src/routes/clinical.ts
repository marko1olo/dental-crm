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

export async function registerClinicalRoutes(app: FastifyInstance) {
  app.post("/api/clinical/rules/evaluate", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "clinical rule evaluate"))) return;
    const input = clinicalRuleEvaluationInputSchema.parse(request.body);
    return clinicalRuleEvaluationResponseSchema.parse(evaluateClinicalRules(input));
  });

  app.post("/api/clinical/rules", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "clinical rule create"))) return;
    const input = createClinicalRuleSchema.parse(request.body);
    return clinicalRuleSchema.parse(createClinicalRule(input));
  });

  app.patch("/api/clinical/rules/:ruleId", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "clinical rule update"))) return;
    const params = request.params as { ruleId: string };
    const input = updateClinicalRuleSchema.parse({ ...((request.body ?? {}) as object), id: params.ruleId });
    return clinicalRuleSchema.parse(updateClinicalRule(input));
  });
}
