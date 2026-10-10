/**
 * DENTE Dental CRM — 1C:Enterprise (CommerceML 2.09) Submodule Barrel.
 * Layer 5: Module aggregator & Unified Export Layer.
 *
 * Decomposed per Mandate 8b:
 * - types.ts (Layer 0: Pure DTOs, Zod Schemas & Contracts)
 * - catalogXmlGenerator.ts (Layer 1: Medical Services import.xml Generator)
 * - offersXmlGenerator.ts (Layer 1: Clinical Inventory offers.xml Generator)
 * - reconciliationEngine.ts (Layer 2: 1C Settlement & ACID Reconciliation Engine)
 */

import { buildCatalogXml } from "./catalogXmlGenerator.js";
import { buildOffersXml } from "./offersXmlGenerator.js";
import { ReconciliationEngine } from "./reconciliationEngine.js";

export * from "./types.js";
export * from "./catalogXmlGenerator.js";
export * from "./offersXmlGenerator.js";
export * from "./reconciliationEngine.js";

/**
 * Unified CommerceML Service coordinator providing statutory 1C:Enterprise integration.
 */
export class CommerceMlService {
	static buildCommerceMlPackage = ReconciliationEngine.buildCommerceMlPackage;
	static syncFrom1C = ReconciliationEngine.syncFrom1C;
	static checkDoublePosting = ReconciliationEngine.checkDoublePosting;
	static buildCatalogXml = buildCatalogXml;
	static buildOffersXml = buildOffersXml;
}
