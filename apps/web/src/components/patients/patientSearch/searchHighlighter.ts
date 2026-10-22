import type { SearchMatchHighlightPart } from "./types";
import { convertKeyboardMistype, normalizeCardQuery, transliterateLatinToCyrillic } from "./stringNormalizers";
import { fuzzyMatchToken } from "./tokenMatcher";

function collectQueryTokens(q: string): string[] {
	const normQ = q.toLowerCase().replaceAll("ё", "е");
	const card = normalizeCardQuery(q);
	const raw = [normQ, transliterateLatinToCyrillic(normQ), convertKeyboardMistype(normQ), card.cleanCardToken, card.cardDigits];
	return Array.from(new Set(raw.flatMap((x) => (x ? x.split(/\s+/) : [])).filter(Boolean)));
}

function findPhoneDigitInterval(text: string, q: string): { start: number; end: number } | null {
	const queryDigits = q.replace(/\D/g, "");
	const sourceDigits = text.replace(/\D/g, "");
	if (queryDigits.length < 3 || sourceDigits.length < 3) return null;
	let idx = sourceDigits.indexOf(queryDigits);
	let matchLen = queryDigits.length;
	if (idx === -1 && queryDigits.length === 11 && (queryDigits.startsWith("7") || queryDigits.startsWith("8")) && sourceDigits.length === 11 && (sourceDigits.startsWith("7") || sourceDigits.startsWith("8"))) {
		idx = 1; matchLen = 10;
	}
	if (idx === -1 && queryDigits.length >= 4 && sourceDigits.endsWith(queryDigits)) {
		idx = sourceDigits.length - queryDigits.length; matchLen = queryDigits.length;
	}
	if (idx < 0) return null;
	let counter = 0; let start = -1; let end = -1;
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (ch && /\d/.test(ch)) {
			if (counter === idx && start === -1) start = i;
			counter++;
			if (counter === idx + matchLen) { end = i + 1; break; }
		}
	}
	return start >= 0 && end > start ? { start, end } : null;
}

export function highlightSearchMatches(text: string | null | undefined, query: string): SearchMatchHighlightPart[] {
	if (!text) return [];
	const q = query.trim();
	if (!q) return [{ text, isMatch: false }];

	const normSource = text.toLowerCase().replaceAll("ё", "е");
	const normQ = q.toLowerCase().replaceAll("ё", "е");
	if (normSource.includes(normQ)) {
		const idx = normSource.indexOf(normQ);
		const parts: SearchMatchHighlightPart[] = [];
		if (idx > 0) parts.push({ text: text.slice(0, idx), isMatch: false });
		parts.push({ text: text.slice(idx, idx + q.length), isMatch: true });
		if (idx + q.length < text.length) parts.push({ text: text.slice(idx + q.length), isMatch: false });
		return parts;
	}

	const intervals: { start: number; end: number }[] = [];
	const phoneInterval = findPhoneDigitInterval(text, q);
	if (phoneInterval) intervals.push(phoneInterval);

	const wordRegex = /[a-zA-Zа-яА-ЯёЁ0-9]+/g;
	const words: { word: string; normalized: string; start: number; end: number }[] = [];
	let w: RegExpExecArray | null;
	while ((w = wordRegex.exec(text)) !== null) {
		words.push({ word: w[0], normalized: w[0].toLowerCase().replaceAll("ё", "е"), start: w.index, end: w.index + w[0].length });
	}

	for (const tok of collectQueryTokens(q)) {
		if (tok.length < 2) continue;
		for (const item of words) {
			if (item.normalized === tok || item.normalized.startsWith(tok)) {
				intervals.push({ start: item.start, end: item.start + Math.min(tok.length, item.word.length) });
			} else if (tok.startsWith(item.normalized) || fuzzyMatchToken(tok, item.word).isMatch) {
				intervals.push({ start: item.start, end: item.end });
			}
		}
	}

	if (intervals.length === 0) return [{ text, isMatch: false }];
	intervals.sort((a, b) => a.start - b.start || b.end - a.end);
	const merged: { start: number; end: number }[] = [];
	for (const it of intervals) {
		const last = merged[merged.length - 1];
		if (last && it.start <= last.end) { last.end = Math.max(last.end, it.end); } else { merged.push({ ...it }); }
	}

	const parts: SearchMatchHighlightPart[] = [];
	let cur = 0;
	for (const { start, end } of merged) {
		if (start > cur) parts.push({ text: text.slice(cur, start), isMatch: false });
		parts.push({ text: text.slice(start, end), isMatch: true });
		cur = end;
	}
	if (cur < text.length) parts.push({ text: text.slice(cur), isMatch: false });
	return parts;
}
