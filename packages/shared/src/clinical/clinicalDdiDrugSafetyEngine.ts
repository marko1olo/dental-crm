/**
 * clinicalDdiDrugSafetyEngine.ts
 * Layer 5 Facade: Clinical Drug-Drug Interaction (DDI), Allergy Cross-Reactivity & Somatic Safety Engine.
 *
 * Preserves 100% backwards compatibility by re-exporting the decomposed DDI engine subsystem.
 * Canonical implementation now lives in packages/shared/src/clinical/ddi/
 */

export * from "./ddi/index.js";
