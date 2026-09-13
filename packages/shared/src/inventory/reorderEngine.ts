/**
 * reorderEngine.ts — Transparent Facade over canonical SSOT warehouse/inventoryReorderEngine.ts.
 *
 * Implements Mandate 8s (Law of Single Undivided Authority).
 * All reorder calculation algorithms, constants, and batch evaluators are consolidated in
 * packages/shared/src/warehouse/inventoryReorderEngine.ts.
 *
 * @see {@link ../warehouse/inventoryReorderEngine.ts}
 */

export * from "../warehouse/inventoryReorderEngine.js";

export {
	computeInventoryReorderSuggestion as computeReorderSuggestion,
	type InventoryReorderSuggestion as ReorderSuggestion,
	inventoryReorderSuggestionSchema as reorderSuggestionSchema,
} from "../warehouse/inventoryReorderEngine.js";

