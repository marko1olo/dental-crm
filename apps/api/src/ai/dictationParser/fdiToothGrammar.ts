import { extractFdiTeethNumbers } from "../dentalSpeechGrammar.js";
import { parseWordNumber } from "./clinicalFieldsExtractor.js";

export const TOOTH_REGEX =
	/(?:^|[^0-9])([1-4][1-8]|[5-8][1-5])(?=[^0-9]|$)(?!\s*[:.-]\s*\d+)/gi;

export function expandToothRanges(text: string): string[] {
	const allTeeth = new Set<string>();

	const grammarTeeth = extractFdiTeethNumbers(text);
	for (const t of grammarTeeth) {
		allTeeth.add(t.toString());
	}

	if (
		text.includes("все зубы") ||
		text.includes("обе челюсти") ||
		text.includes("санаци")
	) {
		for (let i = 11; i <= 18; i++) allTeeth.add(i.toString());
		for (let i = 21; i <= 28; i++) allTeeth.add(i.toString());
		for (let i = 31; i <= 38; i++) allTeeth.add(i.toString());
		for (let i = 41; i <= 48; i++) allTeeth.add(i.toString());
		return Array.from(allTeeth);
	}

	if (text.includes("верхняя челюсть") || text.includes("вч")) {
		for (let i = 11; i <= 18; i++) allTeeth.add(i.toString());
		for (let i = 21; i <= 28; i++) allTeeth.add(i.toString());
	}

	if (text.includes("нижняя челюсть") || text.includes("нч")) {
		for (let i = 31; i <= 38; i++) allTeeth.add(i.toString());
		for (let i = 41; i <= 48; i++) allTeeth.add(i.toString());
	}

	if (text.includes("фронтальн") || text.includes("зона улыбки")) {
		for (let i = 11; i <= 13; i++) allTeeth.add(i.toString());
		for (let i = 21; i <= 23; i++) allTeeth.add(i.toString());
		for (let i = 31; i <= 33; i++) allTeeth.add(i.toString());
		for (let i = 41; i <= 43; i++) allTeeth.add(i.toString());
	}

	const rangeMatches = [
		...text.matchAll(
			/(?:с|от)\s*([1-4][1-8]|[5-8][1-5])\s*(?:по|до)\s*([1-4][1-8]|[5-8][1-5])/gi,
		),
	];
	for (const m of rangeMatches) {
		const start = parseInt(m[1] ?? "", 10);
		const end = parseInt(m[2] ?? "", 10);
		if (Math.floor(start / 10) === Math.floor(end / 10)) {
			const min = Math.min(start, end);
			const max = Math.max(start, end);
			for (let i = min; i <= max; i++) allTeeth.add(i.toString());
		}
	}
	const individualMatches = [...text.matchAll(TOOTH_REGEX)];
	for (const m of individualMatches) {
		if (m[1] !== undefined) allTeeth.add(m[1]);
	}

	const wordMatches = [
		...text.matchAll(/(?:на|зуб|зубе)\s+([а-яё]+)\s+([а-яё]+)/gi),
	];
	for (const m of wordMatches) {
		const dec = parseWordNumber(m[1] as string);
		const unit = parseWordNumber(m[2] ?? "");
		if (dec && unit && dec >= 10 && dec <= 80 && unit >= 1 && unit <= 8) {
			allTeeth.add((dec + unit).toString());
		}
	}

	return Array.from(allTeeth);
}
