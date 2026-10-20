/**
 * treatmentConsumables.ts — Canonical Thin Facade for Treatment Consumables & Stock Auto-Deductions Routes.
 * Re-exports the complete route plugin from the consolidated inventory authority in `./inventory/consumables/index.js`.
 */

export * from "./inventory/consumables/index.js";
export {
	registerTreatmentConsumablesRoutes,
	treatmentConsumablesRoutes,
} from "./inventory/consumables/index.js";
