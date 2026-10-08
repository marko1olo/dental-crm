/**
 * @file apps/api/src/routes/patients.ts
 * @description Canonical Facade for Patients Routes (Decomposed into ./patients/)
 *
 * All route handlers, schemas, and guards have been decomposed into modular
 * submodules under apps/api/src/routes/patients/ while preserving 100% of the
 * public API exports, types, behavior, and security invariants.
 */

export {
	registerPatientRoutes,
	selectPatientArchiveRows,
	patientArchiveRowsBlockBooking,
} from "./patients/index.js";

export type * from "./patients/types.js";
export * from "./patients/helpers.js";
