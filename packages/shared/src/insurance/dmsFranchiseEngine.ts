/**
 * DENTE Dental CRM — Strict Mathematical DMS & Franchise Billing Engine.
 *
 * Implements:
 * 1. Integer Kopeck Arithmetic (type Kopecks = number) with ZERO floating-point rounding errors.
 * 2. Statutory Russian DMS Franchise Split (Сплитование чека):
 *      patientKopecks = Math.round((totalKopecks * franchisePercent) / 100)
 *      insurerKopecks = totalKopecks - patientKopecks
 *    Guarantee: patientKopecks + insurerKopecks === totalKopecks (to the exact kopeck).
 * 3. Standard Russian corporate franchise tiers: 0%, 10%, 20%, 30%, 50%, 80%.
 * 4. Multi-item invoice breakdown with per-item franchise overrides and non-covered service exclusions.
 * 5. Guarantee letter limit overflow handling: insurer share above remaining limit automatically
 *    converts to patient portion with penny-exact balance preservation.
 */

export * from "./dmsModules/dmsFranchisePresets.js";
export * from "./dmsModules/dmsItemSplitEngine.js";
export * from "./dmsModules/dmsGuaranteeSplitEngine.js";
export * from "./dmsModules/dmsCoPaymentEngine.js";
