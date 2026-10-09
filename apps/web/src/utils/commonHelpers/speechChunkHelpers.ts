/**
 * @file speechChunkHelpers.ts
 * @description Canonical facade for doctor speech chunk processing, VAD, audio DSP, and offline audio queue.
 * Decomposed into modular DAG layers under ./speechChunks/ in accordance with Safe Monolith Decomposition.
 * Preserves 100% backward compatibility for all public exports.
 */

export * from "./speechChunks";
export type * from "./speechChunks";
