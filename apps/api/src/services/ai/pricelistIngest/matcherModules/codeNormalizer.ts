/**
 * codeNormalizer.ts — Normalization of Service / Nomenclature Codes and Commercial Titles.
 * Mandate 8ap: Clean domain normalization, Cyrillic-to-Latin A/B unification.
 * Strictly <= 120 lines.
 */

import type { NormalizedCodeExtraction } from "./matcherTypes.js";

const STATUTORY_CODE_REGEX =
	/(?:^|[^a-zA-Zа-яА-Я0-9])([A-ZА-Я]\d{2}\.\d{2}\.\d{3}(?:\.\d{3})?)(?=[^a-zA-Zа-яА-Я0-9]|$)/i;

/**
 * Normalizes a statutory code by converting Cyrillic A/B to Latin and uppercasing.
 */
export function normalizeServiceCode(rawCode: string): string {
	if (!rawCode) return "";
	return rawCode
		.trim()
		.toUpperCase()
		.replace(/^А/, "A")
		.replace(/^В/, "B");
}

/**
 * Extracts statutory nomenclature code from combined line and cleaned title if present.
 */
export function extractStatutoryCode(
	rawLine: string,
	cleanedTitle: string,
): NormalizedCodeExtraction | null {
	const combinedText = `${rawLine} ${cleanedTitle}`;
	const match = combinedText.match(STATUTORY_CODE_REGEX);
	if (!match || !match[1]) return null;

	const rawCode = match[1];
	const normalizedCode = normalizeServiceCode(rawCode);

	let titleWithoutCode = cleanedTitle.replace(new RegExp(rawCode, "i"), "").trim();
	titleWithoutCode = titleWithoutCode.replace(/^[\s\-–—:=.]+/, "").trim();

	return {
		rawCode,
		normalizedCode,
		cleanedTitleWithoutCode: titleWithoutCode,
	};
}

/**
 * Strips technical noise and symbols from raw text.
 */
export function sanitizeTextForMatching(text: string): string {
	if (!text) return "";
	return text
		.toLowerCase()
		.replace(/[\t\r\n]+/g, " ")
		.replace(/[«»""'']/g, "")
		.replace(/\s+/g, " ")
		.trim();
}
