import { levenshteinDistance } from "../../../lib/stringUtils";
import {
	convertKeyboardMistype,
	transliterateLatinToCyrillic,
} from "./stringNormalizers";

/**
 * Проверяет соответствие отдельного токена запроса и токена имени с толерантностью к опечаткам.
 *
 * Защита от ложных срабатываний (Anti-False-Positive Rules):
 * - Для коротких слов (длина <= 3, например: «Ли», «Ким», «Пак», «Цой», «Хан», «Ив»):
 *   допускаются ТОЛЬКО точные совпадения или точный префикс (distance === 0).
 * - Для слов средней длины (4-5 букв): допускается до 1 опечатки (distance <= 1).
 * - Для длинных слов (> 5 букв): допускается до 2 опечаток (distance <= 2).
 * - Поддерживает транслитерацию и неверную раскладку клавиатуры!
 */
export function fuzzyMatchToken(
	queryToken: string,
	targetToken: string,
): { isMatch: boolean; distance: number; isExact: boolean } {
	if (!queryToken || !targetToken) {
		return { isMatch: false, distance: 999, isExact: false };
	}

	const qRaw = queryToken.toLowerCase().replaceAll("ё", "е");
	const t = targetToken.toLowerCase().replaceAll("ё", "е");

	const candidateQueries = [qRaw];
	const translitQ = transliterateLatinToCyrillic(qRaw);
	if (translitQ && translitQ !== qRaw) {
		candidateQueries.push(translitQ);
	}
	const keyboardQ = convertKeyboardMistype(qRaw);
	if (keyboardQ && keyboardQ !== qRaw) {
		candidateQueries.push(keyboardQ);
	}

	let bestMatch = { isMatch: false, distance: 999, isExact: false };

	for (const q of candidateQueries) {
		if (t === q || t.startsWith(q) || q.startsWith(t) || t.includes(q)) {
			return { isMatch: true, distance: 0, isExact: true };
		}

		const minLen = Math.min(q.length, t.length);
		if (minLen <= 3) continue;

		const maxAllowedDistance = minLen <= 5 ? 1 : 2;
		let dist = levenshteinDistance(q, t);

		if (t.length >= q.length) {
			const dPrefix = levenshteinDistance(q, t.slice(0, q.length));
			dist = Math.min(dist, dPrefix);

			if (q.length + 1 <= t.length) {
				const dPrefixPlus = levenshteinDistance(q, t.slice(0, q.length + 1));
				dist = Math.min(dist, dPrefixPlus);
			}
			if (q.length - 1 >= 1) {
				const dPrefixMinus = levenshteinDistance(q, t.slice(0, q.length - 1));
				dist = Math.min(dist, dPrefixMinus);
			}
		}

		if (dist <= maxAllowedDistance && dist < bestMatch.distance) {
			bestMatch = { isMatch: true, distance: dist, isExact: false };
		}
	}

	return bestMatch;
}
