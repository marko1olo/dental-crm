/**
 * Canonical Facade for Speech & LLM Gateway Key Pool.
 * Preserves 100% backward compatibility for all existing call sites.
 * Architectural Decomposition: Layer 5 Facade (<= 50 lines).
 */
export type * from "./keys/types.js";
export * from "./keys/index.js";
