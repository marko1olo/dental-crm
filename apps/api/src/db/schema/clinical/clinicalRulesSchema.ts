/**
 * clinicalRulesSchema.ts — Layer 5: Canonical Facade & Re-export Hub.
 *
 * Decomposed into modular units under ./clinicalRulesModules/:
 * - clinicalRulesTypes.ts: Layer 0 contracts, onco-triggers, stop factors & inferred types.
 * - clinicalProtocolsTables.ts: Layer 0 Drizzle tables for rules, tasks, CAD/CAM lab orders & implants.
 * - clinicalStopFactorsTables.ts: Layer 0 Drizzle tables for anesthesia logs, allergies & DMS contracts.
 *
 * Strict constraint: <= 100 lines (currently ~25 lines).
 */

export * from "./clinicalRulesModules/clinicalProtocolsTables.js";
export * from "./clinicalRulesModules/clinicalStopFactorsTables.js";
export * from "./clinicalRulesModules/clinicalRulesTypes.js";
