/**
 * DENTE Dental CRM — DMS Health Insurance & Franchise Billing Engine.
 *
 * Module exports:
 * 1. dmsFranchiseEngine — Mathematical franchise splitting, standard RF corporate rates, limit overflow handling.
 * 2. dmsGuaranteeLetters — Russian insurance company catalog, letter limits, 80% warning threshold, patient overflow.
 * 3. dmsRegistryExport — Electronic XML standard, CSV with UTF-8 BOM, and printable A4 Landscape Invoice-Registry.
 */

export * from "./dmsFranchiseEngine.js";
export * from "./dmsGuaranteeLetters.js";
export * from "./dmsRegistryExport.js";
