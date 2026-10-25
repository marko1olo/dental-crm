/**
 * Clinical Recall Triggers Facade (SSOT)
 * Decomposed into:
 *  - clinicalProcedureCheckers.ts (Procedure identifiers and detection)
 *  - clinicalTriggerCalculators.ts (Evidence-based recall interval calculators)
 *  - clinicalTriggerEvaluators.ts (Multi-channel evaluation & trigger resolving)
 */

export * from "./clinicalProcedureCheckers";
export * from "./clinicalTriggerCalculators";
export * from "./clinicalTriggerEvaluators";
