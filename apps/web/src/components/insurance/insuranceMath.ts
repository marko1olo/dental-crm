/**
 * insuranceMath.ts — Canonical re-export facade from insuranceData SSOT.
 */

export * from "./insuranceData.js";
export type DmsInsurerItem = import("./insuranceData.js").DmsInsurer;
export type DmsExclusionDefinition = import("./insuranceData.js").DmsExclusionRule;
