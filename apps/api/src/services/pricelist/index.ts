/**
 * apps/api/src/services/pricelist/index.ts
 *
 * Canonical facade for Dental CRM pricelist analyzer and
 * Order 804n nomenclature ingestion engine.
 *
 * Mandate 8b: All pricelist operations must be exact to the kopeck.
 */

export * from "../../pricelist/analyzer.js";
export * from "../ai/priceListIngestionService.js";
