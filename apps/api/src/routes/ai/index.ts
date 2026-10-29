/**
 * @file apps/api/src/routes/ai/index.ts
 * @description Master Fastify plugin facade for AI routes (Mandate 8b modular decomposition).
 */

import type { FastifyInstance } from "fastify";
import { registerDictationRoutes } from "./dictationRoutes.js";
import { registerNoShowRoutes } from "./noShowRoutes.js";
import { registerRecognitionRoutes } from "./recognitionRoutes.js";
import { registerTreatmentPlanAiRoutes } from "./treatmentPlanAiRoutes.js";
import { registerVisitFlowRoutes } from "./visitFlowRoutes.js";

export async function registerAiRoutes(app: FastifyInstance): Promise<void> {
	await registerRecognitionRoutes(app);
	await registerVisitFlowRoutes(app);
	await registerTreatmentPlanAiRoutes(app);
	await registerDictationRoutes(app);
	await registerNoShowRoutes(app);
}

export default registerAiRoutes;
