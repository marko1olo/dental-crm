/**
 * treatmentPlanValidatorAndCommenter.ts — Clinical Validation & Copilot Suite (Facade)
 *
 * Decomposed into modular architecture under apps/api/src/ai/treatmentPlan/ per Mandate 8b:
 * - anatomicalCanalBaseline.ts: FDI root canal baseline and tooth classification
 * - clinicalValidator.ts: Deterministic clinical validator and compliance scoring
 * - financialArgumentation.ts: 13% NDFL deduction, installments, and payment schedules
 * - neuralCommentaryCascade.ts: Multi-provider LLM cascade with prompt generation
 * - treatmentPlanSuite.ts: Main orchestration engine merging clinical rules & neural polish
 */

export {
	getAnatomicalRootCanalCount,
	isDeciduousTooth,
} from "./treatmentPlan/anatomicalCanalBaseline.js";

export {
	runDeterministicClinicalValidation,
	type DeterministicClinicalValidationResult,
} from "./treatmentPlan/clinicalValidator.js";

export {
	calculateDeterministicFinancialArgumentation,
} from "./treatmentPlan/financialArgumentation.js";

export {
	AI_MODEL_CASCADE,
	buildTreatmentPlanPrompt,
	callLlmJson,
} from "./treatmentPlan/neuralCommentaryCascade.js";

export {
	validateAndCommentTreatmentPlan,
} from "./treatmentPlan/treatmentPlanSuite.js";
