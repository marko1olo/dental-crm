/**
 * UI Preferences Helpers Canonical Facade.
 *
 * Decomposed into modular layers under ./uiPreferences/:
 * - Layer 0 (types.ts): Theme & layout preferences contracts
 * - Layer 1 (storageAdapters.ts): Safe Local/Session storage with quota fallbacks
 * - Layer 2 (tableAndLayoutPreferences.ts): Column visibility, sidebar, registry meta
 * - Layer 2 (themePreferences.ts): Color scheme listeners, preference normalizers
 * - Layer 5 (index.ts): Aggregated barrel export
 *
 * Preserves 100% backward compatibility for all existing callers across DENTE CRM.
 */

export * from "./uiPreferences";
