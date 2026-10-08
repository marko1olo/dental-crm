/**
 * Canonical facade for the decomposed pricelist analyzer module.
 * Preserves 100% backward compatibility for all existing callers and test suites.
 *
 * Decomposed into modular single-responsibility units under `./analyzer/`:
 * - types.ts: Layer 0 domain contracts, thresholds, and clock calendar
 * - textNormalizers.ts: Layer 1 text normalization and regex price scanners
 * - categoryClassifiers.ts: Layer 1 clinical category/material/brand rules
 * - similarityMatcher.ts: Layer 2 token matching and confidence scoring
 * - tableExtractor.ts: Layer 2 tabular line parsing and deterministic pipeline
 * - aiParser.ts: Layer 2/3 Groq AI extraction and resilient fallbacks
 * - index.ts: Layer 5 master orchestrator and barrel export
 */

export {
	analyzePricelist,
	analyzePricelistDeterministic,
	parseMoney,
	safeParseJsonObject,
	itemFromGroq,
	type PricelistCalendar,
} from "./analyzer/index.js";

export * from "./analyzer/index.js";
