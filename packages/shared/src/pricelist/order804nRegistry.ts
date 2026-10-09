/**
 * DENTE Dental CRM — Canonical Minzdrav Order 804n Statutory Nomenclature Registry Facade
 *
 * Implements Mandates 8b, 8c, 8e, 8l, 8n, 8s, 8t, 8z, 8ag.
 * Decomposed canonical facade preserving 100% backwards compatibility.
 * All implementations relocated to ./order804n/ strictly adhering to DAG layering.
 */

export type * from "./order804n/types.js";
export * from "./order804n/therapeuticAndDiagnosticCatalog.js";
export * from "./order804n/surgicalAndOrthoCatalog.js";
export * from "./order804n/order804nSearchCore.js";
export * from "./order804n/index.js";
