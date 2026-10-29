/**
 * insuranceCatalogs.ts — Canonical re-export facade from insuranceData SSOT.
 */

export * from "./insuranceData.js";
export type DmsInsurerDefinition = import("./insuranceData.js").DmsInsurer;
