/**
 * Barrel re-export for decomposed pricelist routes module.
 * Structured per DAG Layering Invariants (Layer 0..3 -> Layer 5).
 */

export * from "./types.js";
export * from "./spreadsheetImport.js";
export * from "./catalogOperations.js";
export * from "./routeHandlers.js";

export { registerPricelistRoutes as default } from "./routeHandlers.js";
