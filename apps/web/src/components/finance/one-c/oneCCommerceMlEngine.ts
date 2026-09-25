/**
 * DENTE Dental CRM — 1C:Enterprise (1С:Предприятие 8.3 / Бухгалтерия 3.0 / EnterpriseData)
 * Statutory CommerceML 2.09 & EnterpriseData v1.13 Multi-Document Package Export Engine.
 *
 * Re-exports decomposed modular architecture (Engineering Rule 1.1 & 1.5):
 * - oneCCommerceMlTypes: Data contracts, validation, accounts, and kopeck formatters.
 * - oneCCommerceMlXmlGenerators: CommerceML 2.09 & EnterpriseData 1.13 XML generators.
 * - oneCCommerceMlCsvGenerators: 1C universal exchange CSV tables and executive summaries.
 * - oneCCommerceMlMockPackage: Realistic shift package generator with exact kopeck math.
 */

export * from "./oneCCommerceMlTypes.js";
export * from "./oneCCommerceMlXmlGenerators.js";
export * from "./oneCCommerceMlCsvGenerators.js";
export * from "./oneCCommerceMlMockPackage.js";
