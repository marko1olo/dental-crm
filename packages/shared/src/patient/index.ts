/**
 * packages/shared/src/patient/index.ts
 *
 * Canonical unified export facade for patient domain models,
 * family relationships, somatic safety schemas, and family wallet contracts.
 * (Mandate 8s: Universal Single-Source & Anti-Duplication Law)
 */

export * from "../patients/index.js";
export * from "../clinical/patientRelationshipsEngine.js";
export { INVERSE_RELATIONSHIP_MAP } from "../clinical/patientRelationshipsEngine.js";
