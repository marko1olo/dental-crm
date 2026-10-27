/**
 * searchMatchIntervals.ts — Calculate match intervals for digits and fuzzy tokens.
 */

import { fuzzyMatchToken } from "../../../utils/patientSearchUtils";

export interface MatchInterval {
	start: number;
	end: number;
}

export function findDigitIntervals(text: string, q: string): MatchInterval[] {
	const intervals: MatchInterval[] = [];
	const queryDigits = q.replace(/\D/g, "");
	const sourceDigits = text.replace(/\D/g, "");
	if (queryDigits.length < 3 || sourceDigits.length < 3) return intervals;

	let digitIndex = sourceDigits.indexOf(queryDigits);
	let matchLen = queryDigits.length;

	if (
		digitIndex === -1 &&
		queryDigits.length === 11 &&
		(queryDigits.startsWith("7") || queryDigits.startsWith("8")) &&
		sourceDigits.length === 11 &&
		(sourceDigits.startsWith("7") || sourceDigits.startsWith("8"))
	) {
		digitIndex = 1;
		matchLen = 10;
	}

	if (digitIndex === -1 && queryDigits.length >= 4 && sourceDigits.endsWith(queryDigits)) {
		digitIndex = sourceDigits.length - queryDigits.length;
		matchLen = queryDigits.length;
	}

	if (digitIndex >= 0) {
		let digitCounter = 0;
		let startCharIdx = -1;
		let endCharIdx = -1;

		for (let i = 0; i < text.length; i++) {
			const char = text[i];
			if (char && /\d/.test(char)) {
				if (digitCounter === digitIndex && startCharIdx === -1) {
					startCharIdx = i;
				}
				digitCounter++;
				if (digitCounter === digitIndex + matchLen) {
					endCharIdx = i + 1;
					break;
				}
			}
		}

		if (startCharIdx >= 0 && endCharIdx > startCharIdx) {
			intervals.push({ start: startCharIdx, end: endCharIdx });
		}
	}
	return intervals;
}

export function findTokenIntervals(text: string, queryTokens: string[]): MatchInterval[] {
	const intervals: MatchInterval[] = [];
	const wordRegex = /[a-zA-Zа-яА-ЯёЁ0-9]+/g;
	const wordsInText: { word: string; normalized: string; start: number; end: number }[] = [];
	let wMatch: RegExpExecArray | null;
	while ((wMatch = wordRegex.exec(text)) !== null) {
		wordsInText.push({
			word: wMatch[0],
			normalized: wMatch[0].toLowerCase().replaceAll("ё", "е"),
			start: wMatch.index,
			end: wMatch.index + wMatch[0].length,
		});
	}

	for (const qTok of queryTokens) {
		if (qTok.length < 2) continue;
		for (const w of wordsInText) {
			if (w.normalized === qTok || w.normalized.startsWith(qTok)) {
				intervals.push({ start: w.start, end: w.start + Math.min(qTok.length, w.word.length) });
			} else if (qTok.startsWith(w.normalized)) {
				intervals.push({ start: w.start, end: w.end });
			} else if (fuzzyMatchToken(qTok, w.word).isMatch) {
				intervals.push({ start: w.start, end: w.end });
			}
		}
	}
	return intervals;
}
