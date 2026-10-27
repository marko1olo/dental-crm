/**
 * perioGrammar.ts — Распознавание замеров пародонтологической карты (глубины карманов, BOP, подвижность)
 */

import type { PerioToothVoiceItem } from "../types";
import { extractFdiTeethNumbers } from "../toothNumberParser";
import { parsePerioDepthNumber } from "./perioDepthParser";

export function extractPerioVoiceMeasurements(text: string): PerioToothVoiceItem[] {
	if (!text || typeof text !== "string") return [];
	const lower = text.toLowerCase().replace(/ё/g, "е");
	if (!/(?:карман|глубин|пародонт|перио|bop|боп|кровоточив|кровит|рецесси|подвижност|фуркаци|удален|отсутствует|адентия)/i.test(lower)) {
		return [];
	}
	const teeth = extractFdiTeethNumbers(text);
	if (teeth.length === 0) return [];

	const results: PerioToothVoiceItem[] = [];

	for (const toothNum of teeth) {
		let mbDepth: number | undefined;
		let bDepth: number | undefined;
		let dbDepth: number | undefined;
		let mlDepth: number | undefined;
		let lDepth: number | undefined;
		let dlDepth: number | undefined;

		const mbMatch = lower.match(/(?:медиально-щечн[а-я]*|мезиально-щечн[а-я]*|мб|mb|медиально|медиальный)\s*(\d+|один|два|три|четыре|пять|шесть|семь|восемь|девять|десять)/i);
		if (mbMatch && mbMatch[1]) mbDepth = parsePerioDepthNumber(mbMatch[1]);

		const bMatch = lower.match(/(?:щечн[а-я]*|вестибулярн[а-я]*|щечно)\s*(\d+|один|два|три|четыре|пять|шесть|семь|восемь|девять|десять)/i);
		if (bMatch && bMatch[1]) bDepth = parsePerioDepthNumber(bMatch[1]);

		const dbMatch = lower.match(/(?:дистально-щечн[а-я]*|дистально|дб|db|дистальный)\s*(\d+|один|два|три|четыре|пять|шесть|семь|восемь|девять|десять)/i);
		if (dbMatch && dbMatch[1]) dbDepth = parsePerioDepthNumber(dbMatch[1]);

		const mlMatch = lower.match(/(?:медиально-язычн[а-я]*|медиально-небн[а-я]*|мл|ml)\s*(\d+|один|два|три|четыре|пять|шесть|семь|восемь|девять|десять)/i);
		if (mlMatch && mlMatch[1]) mlDepth = parsePerioDepthNumber(mlMatch[1]);

		const lMatch = lower.match(/(?:язычн[а-я]*|небн[а-я]*|небно|язычно)\s*(\d+|один|два|три|четыре|пять|шесть|семь|восемь|девять|десять)/i);
		if (lMatch && lMatch[1]) lDepth = parsePerioDepthNumber(lMatch[1]);

		const dlMatch = lower.match(/(?:дистально-язычн[а-я]*|дистально-небн[а-я]*|дл|dl)\s*(\d+|один|два|три|четыре|пять|шесть|семь|восемь|девять|десять)/i);
		if (dlMatch && dlMatch[1]) dlDepth = parsePerioDepthNumber(dlMatch[1]);

		const seqMatch = lower.match(/(?:карман[а-я]*|глубин[а-я]*|зондирование)\s*(\d+|один|два|три|четыре|пять|шесть|семь|восемь|девять|десять)\s+(\d+|один|два|три|четыре|пять|шесть|семь|восемь|девять|десять)\s+(\d+|один|два|три|четыре|пять|шесть|семь|восемь|девять|десять)/i);
		if (seqMatch && seqMatch[1] && seqMatch[2] && seqMatch[3]) {
			mbDepth = parsePerioDepthNumber(seqMatch[1]);
			bDepth = parsePerioDepthNumber(seqMatch[2]);
			dbDepth = parsePerioDepthNumber(seqMatch[3]);
		}

		let recessionMm: number | undefined;
		const recMatch = lower.match(/рецесси[а-я]*\s*(\d+|один|два|три|четыре|пять|шесть|семь|восемь)/i);
		if (recMatch && recMatch[1]) recessionMm = parsePerioDepthNumber(recMatch[1]);

		const hasBop = lower.includes("кровоточивость") || lower.includes("кровь") || lower.includes("bop") || lower.includes("плюс") || lower.includes("кровит");
		const hasPlaque = lower.includes("налет") || lower.includes("бляшка") || lower.includes("plaque");
		const hasSuppuration = lower.includes("гной") || lower.includes("экссудация") || lower.includes("нагноение");
		const hasCalculus = lower.includes("камень") || lower.includes("зубной камень");
		const isMissing = lower.includes("удален") || lower.includes("отсутствует") || lower.includes("адентия");

		let mobility: number | undefined;
		const mobMatch = lower.match(/подвижност[а-я]*\s*(?:степен[а-я]*|ст\b|)?\s*(\d+|один|два|три|первая|вторая|третья|i{1,3})/i);
		if (mobMatch && mobMatch[1]) {
			const m = parsePerioDepthNumber(mobMatch[1]);
			if (m !== undefined && m >= 1 && m <= 3) mobility = m;
			else if (mobMatch[1].includes("i")) mobility = mobMatch[1].length;
		}

		let furcation: number | undefined;
		const furcMatch = lower.match(/фуркаци[а-я]*\s*(?:класс[а-я]*|ст\b|)?\s*(\d+|один|два|три|первая|вторая|третья|i{1,3})/i);
		if (furcMatch && furcMatch[1]) {
			const f = parsePerioDepthNumber(furcMatch[1]);
			if (f !== undefined && f >= 1 && f <= 3) furcation = f;
		}

		const hasAnyMeasure = mbDepth !== undefined || bDepth !== undefined || dbDepth !== undefined ||
			mlDepth !== undefined || lDepth !== undefined || dlDepth !== undefined ||
			recessionMm !== undefined || hasBop || hasPlaque || hasSuppuration || hasCalculus ||
			mobility !== undefined || furcation !== undefined || isMissing;

		if (hasAnyMeasure) {
			results.push({
				toothNumber: toothNum,
				...(mbDepth !== undefined || recessionMm !== undefined ? { mesioBuccal: { probingDepthMm: mbDepth ?? 0, gingivalMarginMm: recessionMm, bleedingOnProbing: hasBop, plaque: hasPlaque, suppuration: hasSuppuration, calculus: hasCalculus } } : {}),
				...(bDepth !== undefined ? { midBuccal: { probingDepthMm: bDepth, gingivalMarginMm: recessionMm, bleedingOnProbing: hasBop, plaque: hasPlaque, suppuration: hasSuppuration, calculus: hasCalculus } } : {}),
				...(dbDepth !== undefined ? { distoBuccal: { probingDepthMm: dbDepth, gingivalMarginMm: recessionMm, bleedingOnProbing: hasBop, plaque: hasPlaque, suppuration: hasSuppuration, calculus: hasCalculus } } : {}),
				...(mlDepth !== undefined ? { mesioLingual: { probingDepthMm: mlDepth, bleedingOnProbing: hasBop, plaque: hasPlaque } } : {}),
				...(lDepth !== undefined ? { midLingual: { probingDepthMm: lDepth, bleedingOnProbing: hasBop, plaque: hasPlaque } } : {}),
				...(dlDepth !== undefined ? { distoLingual: { probingDepthMm: dlDepth, bleedingOnProbing: hasBop, plaque: hasPlaque } } : {}),
				...(mobility !== undefined ? { mobility } : {}),
				...(furcation !== undefined ? { furcation } : {}),
				...(hasBop ? { bleedingOnProbing: true } : {}),
				...(isMissing ? { isMissing: true } : {}),
			});
		}
	}

	return results;
}
