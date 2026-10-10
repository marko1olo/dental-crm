/**
 * @file errorHelpers.ts
 * @description Canonical thin facade for clinical error normalization, extraction, translations, and classification.
 * Decomposed into modular DAG layers under ./errorHandlingModules/ (Wave 25).
 * Preserves 100% backward compatibility for all public exports.
 */

export * from "./errorHandlingModules/index.js";
