/**
 * apps/api/src/services/agent/tools/clinicalTools.ts
 * Layer 5 Facade: Canonical entry point maintaining 100% backward compatibility.
 * Re-exports all clinical tools, schemas, formatters, and types from ./clinical/
 */

export * from "./clinical/index.js";
export type * from "./clinical/types.js";
