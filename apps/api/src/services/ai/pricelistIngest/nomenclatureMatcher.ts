/**
 * nomenclatureMatcher.ts — Canonical Nomenclature Matcher Facade.
 * Pure Facade <= 15 lines (Mandates 8b, 8ap).
 */
export * from "./matcherModules/matcherTypes.js";
export * from "./matcherModules/codeNormalizer.js";
export * from "./matcherModules/textLevenshtein.js";
export * from "./matcherModules/clinicalKeywordMatcher.js";
export * from "./matcherModules/confidenceScorer.js";
export * from "./matcherModules/matcherCache.js";
export * from "./matcherModules/matchCoordinator.js";
export * from "./matcherModules/registry/index.js";
