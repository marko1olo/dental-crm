/**
 * packages/shared/src/clinical/dentalFormulaSsot.ts
 *
 * DENTE Dental CRM — Canonical Single Source of Truth (SSOT)
 * for Dental Formula, Tooth Meshes, Surfaces, Pathologies & Stamps.
 *
 * Modular Architecture (Mandate: < 500 lines per file):
 * 1. dentalFormulaFdi.ts      — FDI tooth constants (11..48, 51..85), arches, quadrants & Russian nomenclature.
 * 2. dentalFormulaSurfaces.ts — 5+1 anatomical surfaces, bidirectional RU <-> FDI parser & MOD decomposition.
 * 3. dentalFormulaStates.ts   — Canonical tooth states, stamp color matrix, DMFT (КПУ), 804n codes & prices.
 */

export * from "./dentalFormulaFdi.js";
export * from "./dentalFormulaSurfaces.js";
export * from "./dentalFormulaStates.js";
