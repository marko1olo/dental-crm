/**
 * toothNumberParser.ts — Layer 1: Грамматический парсер номеров зубов взрослого и молочного прикуса (ISO 3950/FDI 11–85)
 */

import { isValidFdiToothNumber } from "@dental/shared";
import {
	TOOTH_ANATOMICAL_POSITIONS,
	TENS_WORDS,
	ONES_WORDS,
	TEEN_NUMBER_WORDS,
} from "./constants";

export function extractFdiTeethNumbers(text: string): number[] {
	if (!text || typeof text !== "string") return [];
	const found = new Set<number>();
	const normalized = text.toLowerCase().trim().replace(/ё/g, "е");

	const isUpper =
		normalized.includes("верхн") ||
		normalized.includes("максиллярн") ||
		normalized.includes("вч") ||
		normalized.includes("сверху");
	const isLower =
		normalized.includes("нижн") ||
		normalized.includes("мандибулярн") ||
		normalized.includes("нч") ||
		normalized.includes("снизу");
	const isRight = normalized.includes("прав") || normalized.includes("справа");
	const isLeft = normalized.includes("лев") || normalized.includes("слева");
	const isPrimary =
		normalized.includes("молочн") || normalized.includes("временн");

	if ((isUpper || isLower) && (isRight || isLeft)) {
		let quadrant = 0;
		if (!isPrimary) {
			if (isUpper && isRight) quadrant = 1;
			else if (isUpper && isLeft) quadrant = 2;
			else if (isLower && isLeft) quadrant = 3;
			else if (isLower && isRight) quadrant = 4;
		} else {
			if (isUpper && isRight) quadrant = 5;
			else if (isUpper && isLeft) quadrant = 6;
			else if (isLower && isLeft) quadrant = 7;
			else if (isLower && isRight) quadrant = 8;
		}

		if (quadrant > 0) {
			const entries = Object.entries(TOOTH_ANATOMICAL_POSITIONS).sort(
				(a, b) => b[0].length - a[0].length,
			);
			for (const [phrase, pos] of entries) {
				const normPhrase = phrase.replace(/ё/g, "е");
				if (normalized.includes(normPhrase)) {
					const tooth = quadrant * 10 + pos;
					if (isValidFdiToothNumber(tooth)) {
						found.add(tooth);
					}
				}
			}
		}
	}

	const words = normalized.split(/[\s,.;:!?\-/]+/).filter(Boolean);

	for (let i = 0; i < words.length; i++) {
		const current = words[i];
		const next = words[i + 1];

		if (current && TENS_WORDS[current] !== undefined) {
			const tens = TENS_WORDS[current];
			if (tens !== undefined && next && ONES_WORDS[next] !== undefined) {
				const ones = ONES_WORDS[next];
				if (ones !== undefined) {
					const tooth = tens + ones;
					if (isValidFdiToothNumber(tooth)) {
						found.add(tooth);
					}
				}
			} else if (tens !== undefined && isValidFdiToothNumber(tens)) {
				found.add(tens);
			}
		}

		if (current && TEEN_NUMBER_WORDS[current] !== undefined) {
			const tooth = TEEN_NUMBER_WORDS[current];
			if (tooth && isValidFdiToothNumber(tooth)) {
				found.add(tooth);
			}
		}

		// Поддержка произнесения цифрами: «зуб один шесть» -> 16, «два один» -> 21
		if (current && ONES_WORDS[current] !== undefined && next && ONES_WORDS[next] !== undefined) {
			const d1 = ONES_WORDS[current];
			const d2 = ONES_WORDS[next];
			if (d1 !== undefined && d2 !== undefined && d1 >= 1 && d1 <= 8 && d2 >= 1 && d2 <= 8) {
				const tooth = d1 * 10 + d2;
				if (isValidFdiToothNumber(tooth)) {
					found.add(tooth);
				}
			}
		}
	}

	const matches = normalized.matchAll(/(?:зуб[аеы]?|номер|#|d|№)?\s*([1-8][1-8])\b/g);
	for (const match of matches) {
		if (match[1]) {
			const tooth = parseInt(match[1], 10);
			if (isValidFdiToothNumber(tooth)) {
				found.add(tooth);
			}
		}
	}

	return Array.from(found);
}
