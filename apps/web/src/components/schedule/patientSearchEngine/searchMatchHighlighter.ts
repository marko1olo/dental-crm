/**
 * searchMatchHighlighter.ts — Highlight matching substrings in search text.
 */

import type { SearchMatchHighlightPart } from "./searchEngineTypes";
import { findDigitIntervals, findTokenIntervals, type MatchInterval } from "./searchMatchIntervals";

function mergeIntervals(intervals: MatchInterval[]): MatchInterval[] {
	intervals.sort((a, b) => a.start - b.start || b.end - a.end);
	const merged: MatchInterval[] = [];
	for (const interval of intervals) {
		if (merged.length === 0) {
			merged.push({ ...interval });
		} else {
			const last = merged[merged.length - 1];
			if (last && interval.start <= last.end) {
				last.end = Math.max(last.end, interval.end);
			} else {
				merged.push({ ...interval });
			}
		}
	}
	return merged;
}

export function highlightSearchMatches(
	text: string | null | undefined,
	query: string,
): SearchMatchHighlightPart[] {
	if (!text) return [];
	const q = query.trim();
	if (!q) return [{ text, isMatch: false }];

	const normalizedSource = text.toLowerCase().replaceAll("ё", "е");
	const normalizedQ = q.toLowerCase().replaceAll("ё", "е");
	const queryTokens = normalizedQ.split(/\s+/).filter(Boolean);

	if (queryTokens.length <= 1) {
		const singleIndex = normalizedSource.indexOf(normalizedQ);
		if (singleIndex >= 0) {
			const parts: SearchMatchHighlightPart[] = [];
			if (singleIndex > 0) {
				parts.push({ text: text.slice(0, singleIndex), isMatch: false });
			}
			parts.push({ text: text.slice(singleIndex, singleIndex + q.length), isMatch: true });
			if (singleIndex + q.length < text.length) {
				parts.push({ text: text.slice(singleIndex + q.length), isMatch: false });
			}
			return parts;
		}
	}

	const intervals = [
		...findDigitIntervals(text, q),
		...findTokenIntervals(text, queryTokens),
	];

	if (intervals.length === 0) {
		return [{ text, isMatch: false }];
	}

	const merged = mergeIntervals(intervals);
	const parts: SearchMatchHighlightPart[] = [];
	let cursor = 0;
	for (const { start, end } of merged) {
		if (start > cursor) {
			parts.push({ text: text.slice(cursor, start), isMatch: false });
		}
		parts.push({ text: text.slice(start, end), isMatch: true });
		cursor = end;
	}
	if (cursor < text.length) {
		parts.push({ text: text.slice(cursor), isMatch: false });
	}

	return parts;
}
