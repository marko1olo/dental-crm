/**
 * @file visitDraftHelpers.ts
 * @description Canonical facade for doctor visit drafts, offline resilience, and persistence queue.
 * Decomposed into modular layers under ./visitDraft/ in accordance with Safe Monolith Decomposition.
 * Preserves 100% backward compatibility for all public exports.
 */
export * from "./visitDraft";
export type * from "./visitDraft";
