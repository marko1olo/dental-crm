/**
 * textLevenshtein.ts — Fuzzy String Distance & Jaccard Token Overlap.
 * Used for resilient matching of dirty commercial price list titles.
 * Strictly <= 120 lines.
 */

/**
 * Computes classic Levenshtein distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
	if (a === b) return 0;
	if (a.length === 0) return b.length;
	if (b.length === 0) return a.length;

	const matrix: number[][] = [];
	for (let i = 0; i <= b.length; i++) {
		matrix[i] = [i];
	}
	for (let j = 0; j <= a.length; j++) {
		matrix[0]![j] = j;
	}

	for (let i = 1; i <= b.length; i++) {
		for (let j = 1; j <= a.length; j++) {
			if (b.charAt(i - 1) === a.charAt(j - 1)) {
				matrix[i]![j] = matrix[i - 1]![j - 1]!;
			} else {
				matrix[i]![j] = Math.min(
					matrix[i - 1]![j - 1]! + 1, // substitution
					matrix[i]![j - 1]! + 1,     // insertion
					matrix[i - 1]![j]! + 1,     // deletion
				);
			}
		}
	}
	return matrix[b.length]![a.length]!;
}

/**
 * Returns similarity ratio between 0.0 and 1.0 based on Levenshtein distance.
 */
export function levenshteinSimilarity(a: string, b: string): number {
	const maxLen = Math.max(a.length, b.length);
	if (maxLen === 0) return 1.0;
	const distance = levenshteinDistance(a.toLowerCase().trim(), b.toLowerCase().trim());
	return Math.max(0, 1 - distance / maxLen);
}

/**
 * Calculates token-level word overlap (Jaccard similarity) between two titles.
 */
export function tokenOverlapScore(titleA: string, titleB: string): number {
	const tokensA = new Set(titleA.toLowerCase().split(/[\s,.;:/\-]+/).filter((t) => t.length > 2));
	const tokensB = new Set(titleB.toLowerCase().split(/[\s,.;:/\-]+/).filter((t) => t.length > 2));

	if (tokensA.size === 0 || tokensB.size === 0) return 0;

	let intersectionCount = 0;
	for (const token of tokensA) {
		if (tokensB.has(token)) intersectionCount++;
	}

	const unionCount = tokensA.size + tokensB.size - intersectionCount;
	return unionCount > 0 ? intersectionCount / unionCount : 0;
}
