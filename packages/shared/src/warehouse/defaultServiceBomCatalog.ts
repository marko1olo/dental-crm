/**
 * defaultServiceBomCatalog.ts — Canonical Standard Technological Maps (BOM) Facade.
 * Pure Facade <= 15 lines (Mandates 8b, 8ap).
 */
export * from "./bomModules/bomTypes.js";
export * from "./bomModules/bomDeductionCalculator.js";
export { THERAPEUTIC_BOM_LINKS } from "./bomModules/therapeuticBoms.js";
export { SURGICAL_BOM_LINKS } from "./bomModules/surgicalBoms.js";
export { ORTHOPEDIC_BOM_LINKS } from "./bomModules/orthopedicBoms.js";
export { ORTHODONTIC_BOM_LINKS } from "./bomModules/orthodonticBoms.js";
export { HYGIENE_BOM_LINKS } from "./bomModules/hygieneBoms.js";
