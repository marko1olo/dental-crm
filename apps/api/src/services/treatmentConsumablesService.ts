/**
 * treatmentConsumablesService.ts — Canonical Facade for Treatment Consumables & Stock Auto-Deductions.
 *
 * Re-exports the complete public API and contracts from the decomposed modular package:
 * - Layer 0: types.ts (DbExecutor, InsufficientStockError, TreatmentConsumablesServiceError)
 * - Layer 2: recipeService.ts, stockAvailability.ts, stockDeduction.ts, inventoryReports.ts,
 *            quickWriteoffService.ts, bundleWriteoffService.ts, manualDeduction.ts
 * - Layer 5: index.ts (TreatmentConsumablesService class aggregator)
 */

export {
	InsufficientStockError,
	type DbExecutor,
	TreatmentConsumablesServiceError,
	TreatmentConsumablesService,
	treatmentConsumablesService,
} from "./treatmentConsumables/index.js";

export * from "./treatmentConsumables/index.js";
