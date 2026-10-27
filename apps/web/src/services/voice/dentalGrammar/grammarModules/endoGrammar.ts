/**
 * endoGrammar.ts — Распознавание замеров эндодонтических каналов (WL, MAF, конусность, силер)
 */

import type { EndoCanalVoiceItem } from "../types";

export function extractEndoCanalMeasurements(text: string): EndoCanalVoiceItem[] {
	if (!text || typeof text !== "string") return [];
	const lower = text.toLowerCase().replace(/ё/g, "е");
	if (!/(?:канал|упор|стоп|маф|maf|конус|силер|апекс|working\s*length|wl)/i.test(lower)) {
		return [];
	}
	const results: EndoCanalVoiceItem[] = [];

	const canalPatterns = [
		{ name: "MB1", aliases: ["мв1", "mb1", "медиально-щечный 1", "медиально щечный первый", "медиально щечный 1", "медиальный 1", "мб1", "мб 1"] },
		{ name: "MB2", aliases: ["мв2", "mb2", "медиально-щечный 2", "медиально щечный второй", "медиально щечный 2", "медиальный 2", "мб2", "мб 2"] },
		{ name: "MB", aliases: ["мв", "mb", "медиально-щечный", "медиально щечный", "медиальный щечный", "мезиально-щечный", "мб", "медиальный", "медиального", "mesial"] },
		{ name: "DB", aliases: ["дв", "db", "дистально-щечный", "дистально щечный", "дистальный щечный", "дб"] },
		{ name: "ML", aliases: ["мл", "ml", "медиально-язычный", "медиально-небный"] },
		{ name: "DL", aliases: ["дл", "dl", "дистально-язычный", "дистально-небный"] },
		{ name: "P", aliases: ["небный", "небного", "palatal", "палатальный"] },
		{ name: "D", aliases: ["дистальный", "дистального", "distal"] },
		{ name: "L", aliases: ["язычный", "язычного", "lingual"] },
	];

	for (const pattern of canalPatterns) {
		let matched = false;
		for (const alias of pattern.aliases) {
			const aliasRegex = new RegExp(`(?:канал\\s*)?(?:^|[^a-zа-я0-9])${alias}(?:$|[^a-zа-я0-9])`, "i");
			if (aliasRegex.test(lower)) {
				matched = true;
				break;
			}
		}

		if (matched) {
			let workingLengthMm: number | undefined;
			const bodyAfterAlias = lower.replace(
				/(?:канал\s*)?(?:mb1|mb2|mb|db|ml|dl|p|d|m|l|мв1|мв2|мв|дв|мл|дл|мб1|мб2|мб|медиально[-\s]?щечн\w*\s*[12]?|дистально[-\s]?щечн\w*|медиально[-\s]?язычн\w*|дистально[-\s]?язычн\w*|небн\w*|дистальн\w*|медиальн\w*|язычн\w*)/i,
				"",
			);
			const lenMatch = bodyAfterAlias.match(/(?:длина|рабочая длина|рл)?\s*(\d+(?:[,.]\d+)?)\s*(?:мм|миллиметр[а-я]*)?/i);
			if (lenMatch && lenMatch[1]) {
				workingLengthMm = Number.parseFloat(lenMatch[1].replace(",", "."));
			} else if (lower.includes("двадцать один")) workingLengthMm = 21;
			else if (lower.includes("двадцать два")) workingLengthMm = 22;
			else if (lower.includes("двадцать три")) workingLengthMm = 23;
			else if (lower.includes("двадцать четыре")) workingLengthMm = 24;
			else if (lower.includes("двадцать пять")) workingLengthMm = 25;
			else if (lower.includes("двадцать")) workingLengthMm = 20;

			let masterApicalFile: string | undefined;
			const mafMatch = lower.match(/(?:маф|maf|упор|стоп|файл|инструмент)\s*(?:iso\s*)?([a-z0-9#]+|двадцать\s*пять|двадцать|тридцать\s*пять|тридцать|сорок)/i);
			if (mafMatch && mafMatch[1]) {
				const rawMaf = mafMatch[1].trim();
				if (/^\d+$/.test(rawMaf)) masterApicalFile = `ISO ${rawMaf}`;
				else if (rawMaf.includes("двадцать пять")) masterApicalFile = "ISO 25";
				else if (rawMaf.includes("тридцать пять")) masterApicalFile = "ISO 35";
				else if (rawMaf.includes("тридцать")) masterApicalFile = "ISO 30";
				else if (rawMaf.includes("двадцать")) masterApicalFile = "ISO 20";
				else if (rawMaf.includes("сорок")) masterApicalFile = "ISO 40";
				else masterApicalFile = rawMaf;
			}

			let taper: string | undefined;
			const taperMatch = lower.match(/(?:конус|конусность)\s*([.\d]+|шесть|четыре|два)/i);
			if (taperMatch && taperMatch[1]) {
				const rawT = taperMatch[1].trim();
				if (rawT === "06" || rawT === "6" || rawT === "шесть" || rawT === ".06") taper = ".06 (Конусность 6%)";
				else if (rawT === "04" || rawT === "4" || rawT === "четыре" || rawT === ".04") taper = ".04 (Конусность 4%)";
				else if (rawT === "02" || rawT === "2" || rawT === "два" || rawT === ".02") taper = ".02 (Стандартная 2%)";
				else taper = rawT;
			}

			let sealer: string | undefined;
			const sealerMatch = lower.match(/(?:силер|паста)\s*([a-zа-я0-9\s+]+)/i);
			if (sealerMatch && sealerMatch[1]) {
				const rawS = sealerMatch[1].trim();
				if (/аш\s*плюс|ah\s*plus/i.test(rawS)) sealer = "AH Plus";
				else if (/биорут|bioroot/i.test(rawS)) sealer = "BioRoot RCS";
				else if (/тоталфилл|totalfill/i.test(rawS)) sealer = "TotalFill BC";
				else sealer = rawS;
			}

			results.push({
				canalName: pattern.name,
				...(workingLengthMm !== undefined ? { workingLengthMm } : {}),
				...(masterApicalFile ? { masterApicalFile } : {}),
				...(taper ? { taper } : {}),
				...(sealer ? { sealer } : {}),
			});
			break;
		}
	}

	return results;
}
