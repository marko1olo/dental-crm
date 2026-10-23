import type { DentalSpecialty, ServiceCategory } from "../index.js";
import { resolveCategoryFallback } from "./matcherCategoryFallback.js";
import { scoreLexicalNomenclature } from "./matcherLexicalScoring.js";
import {
	normalizeStatutoryCode,
	type NomenclatureMatchResult,
} from "./matcherTypesAndUtils.js";
import { ORDER_804N_STATUTORY_REGISTRY } from "./order804nRegistry.js";

export * from "./matcherTypesAndUtils.js";
export * from "./matcherLexicalScoring.js";
export * from "./matcherCategoryFallback.js";

/**
 * 2-Tier matcher from raw line / title to canonical Minzdrav Order 804n entry.
 */
export function matchOrder804nNomenclature(
	rawText: string,
	options?: {
		readonly codeHint?: string | undefined;
		readonly categoryHint?: string | undefined;
		readonly specialtyHint?: string | undefined;
	},
): NomenclatureMatchResult {
	const text = (rawText || "").trim();
	const codeHint = (options?.codeHint || "").trim();
	const categoryHint = (options?.categoryHint || "").toLowerCase().trim();
	const specialtyHint = (options?.specialtyHint || "").toLowerCase().trim();

	let cleanedTitle = text
		.replace(/^[|•*▪\-\—\–\s]+/, "")
		.replace(/^[\d\.\)\-\—\–\s]+/, "")
		.trim();

	// ─── TIER 1: Statutory Code Regex Detection ──────────────────────────────
	const explicitCodeRegex = /\b([A-ZА-Я]\d{2}\.\d{2}\.\d{3}(?:\.\d{3})?)\b/i;
	let foundExplicitCode: string | null = null;

	if (codeHint && explicitCodeRegex.test(codeHint)) {
		const m = codeHint.match(explicitCodeRegex);
		if (m && m[1]) foundExplicitCode = m[1];
	} else if (explicitCodeRegex.test(text)) {
		const m = text.match(explicitCodeRegex);
		if (m && m[1]) foundExplicitCode = m[1];
	}

	if (foundExplicitCode) {
		const normalizedCode = normalizeStatutoryCode(foundExplicitCode);

		cleanedTitle = cleanedTitle
			.replace(new RegExp(foundExplicitCode, "gi"), "")
			.replace(/^[\s\-–—:=.]+/, "")
			.replace(/[\-–—:=.]+\s*$/, "")
			.trim();

		const entry = ORDER_804N_STATUTORY_REGISTRY.find(
			(e) => e.code === normalizedCode || normalizedCode.startsWith(e.code),
		);

		if (entry) {
			return {
				code804n: normalizedCode,
				statutoryTitle804n: entry.title,
				category: entry.category,
				specialty: entry.specialty,
				confidence: 0.98,
				confidenceKind: "exact_code",
				cleanedTitle: cleanedTitle || entry.title,
				matchedKeywords: [normalizedCode],
			};
		}

		let deducedCategory: ServiceCategory = "therapy";
		let deducedSpecialty: DentalSpecialty = "therapist";
		if (normalizedCode.startsWith("A06")) {
			deducedCategory = "imaging";
			deducedSpecialty = "radiologist";
		} else if (normalizedCode.startsWith("B01.065")) {
			deducedCategory = "consultation";
			deducedSpecialty = "therapist";
		} else if (normalizedCode.startsWith("B01.003")) {
			deducedCategory = "other";
			deducedSpecialty = "universal";
		}

		return {
			code804n: normalizedCode,
			statutoryTitle804n: cleanedTitle || `Медицинская услуга (${normalizedCode})`,
			category: deducedCategory,
			specialty: deducedSpecialty,
			confidence: 0.92,
			confidenceKind: "exact_code",
			cleanedTitle: cleanedTitle || `Медицинская услуга (${normalizedCode})`,
			matchedKeywords: [normalizedCode],
		};
	}

	// ─── TIER 2: Semantic Lexical Scoring ────────────────────────────────────
	const lexicalResult = scoreLexicalNomenclature(cleanedTitle, categoryHint, specialtyHint);
	if (lexicalResult) return lexicalResult;

	// ─── TIER 3: Category Fallback ───────────────────────────────────────────
	return resolveCategoryFallback(categoryHint, cleanedTitle);
}
