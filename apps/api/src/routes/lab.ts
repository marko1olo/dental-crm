/**
 * @file lab.ts
 * @description Canonical Facade for Dental Lab routes, presets, and technician portal.
 * Decomposed into modular DAG architecture under `./lab/` (<800 lines per module).
 */

export {
	calculateBusinessDaysDueDate,
	CANONICAL_DENTAL_LAB_PRESETS,
	registerLabRoutes,
	registerLabOrderRoutes,
	registerDentalLabRoutes,
} from "./lab/index.js";

export * from "./lab/index.js";
