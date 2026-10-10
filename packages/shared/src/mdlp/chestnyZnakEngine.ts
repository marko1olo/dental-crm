/**
 * @file chestnyZnakEngine.ts
 * @description Canonical Facade for Chestny ZNAK / MDLP Engine.
 *
 * Preserves 100% backward-compatible public API by transparently delegating
 * to decomposed modules in `./chestnyZnak/`.
 *
 * Architecture DAG:
 * - Layer 0: ./chestnyZnak/types.js
 * - Layer 1: ./chestnyZnak/gs1DataMatrixParser.js
 * - Layer 1: ./chestnyZnak/xmlDocumentBuilder.js
 * - Layer 1: ./chestnyZnak/disposalEngineCore.js
 * - Barrel:  ./chestnyZnak/index.js
 */

export * from "./chestnyZnak/index.js";
