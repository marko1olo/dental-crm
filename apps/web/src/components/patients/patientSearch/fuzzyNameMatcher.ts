import {
	convertKeyboardMistype,
	normalizeCyrillicText,
	transliterateLatinToCyrillic,
} from "./stringNormalizers";
import { fuzzyMatchToken } from "./tokenMatcher";

/**
 * Проверяет соответствие ФИО строке запроса с учетом перестановок слов, транслитерации и нечеткого сравнения.
 */
export function isFuzzyNameMatch(
	fullName: string | null | undefined,
	rawQuery: string,
): { isMatch: boolean; isExact: boolean; isFuzzy: boolean; maxDistance: number } {
	if (!fullName || !rawQuery) {
		return { isMatch: false, isExact: false, isFuzzy: false, maxDistance: 999 };
	}

	const normalizedFullName = normalizeCyrillicText(fullName);
	const normalizedQuery = normalizeCyrillicText(rawQuery);
	const transliteratedQuery = normalizeCyrillicText(transliterateLatinToCyrillic(rawQuery));
	const keyboardQuery = normalizeCyrillicText(convertKeyboardMistype(rawQuery));

	const queriesToTest = [normalizedQuery, transliteratedQuery, keyboardQuery].filter(Boolean);

	for (const q of queriesToTest) {
		if (normalizedFullName === q || normalizedFullName.includes(q)) {
			return { isMatch: true, isExact: true, isFuzzy: false, maxDistance: 0 };
		}

		const queryTokens = q.split(" ").filter(Boolean);
		const nameTokens = normalizedFullName.split(" ").filter(Boolean);
		if (queryTokens.length === 0 || nameTokens.length === 0) continue;

		let totalDistance = 0;
		let hasFuzzy = false;
		let allTokensMatched = true;

		for (const qToken of queryTokens) {
			let tokenMatched = false;
			let minTokenDistance = 999;
			let tokenIsExact = false;

			for (const nToken of nameTokens) {
				const res = fuzzyMatchToken(qToken, nToken);
				if (res.isMatch) {
					tokenMatched = true;
					if (res.distance < minTokenDistance) {
						minTokenDistance = res.distance;
						tokenIsExact = res.isExact;
					}
				}
			}

			if (!tokenMatched) {
				allTokensMatched = false;
				break;
			}

			totalDistance += minTokenDistance;
			if (!tokenIsExact) {
				hasFuzzy = true;
			}
		}

		if (allTokensMatched) {
			return {
				isMatch: true,
				isExact: !hasFuzzy && totalDistance === 0,
				isFuzzy: hasFuzzy || totalDistance > 0,
				maxDistance: totalDistance,
			};
		}
	}

	return { isMatch: false, isExact: false, isFuzzy: false, maxDistance: 999 };
}
