/**
 * Canonical facade for Dental Lab Types, Presets, and Validation Schemas.
 * Decomposed under /decomposer architecture into modular sub-layers in ./labTypesModules/.
 */

export type { LabOrderStatus } from "../../db/labQuery.js";

// Layer 0: Material types, Vita shades, FDI validations, presets and item schemas
export * from "./labTypesModules/labMaterialAndShadeTypes.js";

// Layer 0: Order status transitions, tracking milestones, and SLA business date calculator
export * from "./labTypesModules/labOrderStatusAndTrackingTypes.js";
