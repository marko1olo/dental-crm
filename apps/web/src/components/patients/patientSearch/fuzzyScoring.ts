/**
 * fuzzyScoring.ts — Layer 1: Нечеткое сопоставление токенов, расчет скоринга и подсветка совпадений.
 */

import { levenshteinDistance } from "../../../lib/stringUtils";
import type {
	PatientSearchableFields,
	PatientSearchScoredResult,
	SearchMatchHighlightPart,
} from "./types";
import {
	normalizePhoneToNational,
	transliterateLatinToCyrillic,
	convertKeyboardMistype,
	normalizeCyrillicText,
	extractPatientCardNumbers,
	extractPatientPhones,
	normalizeCardQuery,
} from "./stringNormalizers";

// ============================================================================
// 1. НЕЧЕТКОЕ СОПОСТАВЛЕНИЕ ТОКЕНОВ И ФИО (ЛЕВЕНШТЕЙН И ТРАНСЛИТ)
// ============================================================================

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

	// Проверяем прямое совпадение, а также через транслитерацию и конвертацию раскладки
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
		// 1. Точное совпадение или вхождение
		if (t === q) {
			return { isMatch: true, distance: 0, isExact: true };
		}
		if (t.startsWith(q) || q.startsWith(t) || t.includes(q)) {
			return { isMatch: true, distance: 0, isExact: true };
		}

		// 2. Строгая защита коротких фамилий: длина <= 3 не терпит опечаток!
		const minLen = Math.min(q.length, t.length);
		if (minLen <= 3) {
			continue;
		}

		// 3. Допуск опечаток по длине
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
			bestMatch = {
				isMatch: true,
				distance: dist,
				isExact: false,
			};
		}
	}

	return bestMatch;
}

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
	const transliteratedQuery = normalizeCyrillicText(
		transliterateLatinToCyrillic(rawQuery),
	);
	const keyboardQuery = normalizeCyrillicText(
		convertKeyboardMistype(rawQuery),
	);

	const queriesToTest = [
		normalizedQuery,
		transliteratedQuery,
		keyboardQuery,
	].filter(Boolean);

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

// ============================================================================
// 2. СКОРИНГ И РАНЖИРОВАНИЕ РЕЗУЛЬТАТОВ ПОИСКА
// ============================================================================

/**
 * Оценивает соответствие пациента запросу и возвращает детальный скоринг и метаданные.
 */
export function scorePatientSearch(
	patient: PatientSearchableFields | null | undefined,
	rawQuery: string,
): PatientSearchScoredResult {
	if (!patient) {
		return {
			isMatch: false,
			score: 0,
			matchedBy: "name",
			isExact: false,
			isFuzzy: false,
		};
	}

	const query = rawQuery.trim();
	if (!query) {
		return {
			isMatch: true,
			score: 0,
			matchedBy: "name",
			isExact: true,
			isFuzzy: false,
		};
	}

	const queryDigits = query.replace(/\D/g, "");
	const queryNational = normalizePhoneToNational(query);
	const normalizedQuery = normalizeCyrillicText(query);
	const normalizedFullName = normalizeCyrillicText(patient.fullName);

	// 1. Поиск по номеру телефона пациента и представителя
	const patientPhones = extractPatientPhones(patient);
	if (queryDigits.length >= 3) {
		for (const pPhone of patientPhones) {
			const pPhoneDigits = pPhone.replace(/\D/g, "");
			const pNational = normalizePhoneToNational(pPhone);

			if (queryDigits.length >= 10 && pNational === queryNational) {
				return {
					isMatch: true,
					score: 100,
					matchedBy: "phone",
					isExact: true,
					isFuzzy: false,
				};
			}
			if (queryDigits.length >= 4 && pPhoneDigits.endsWith(queryDigits)) {
				return {
					isMatch: true,
					score: 85,
					matchedBy: "phone",
					isExact: true,
					isFuzzy: false,
				};
			}
			if (
				pPhoneDigits.includes(queryDigits) ||
				(queryNational.length >= 3 && pNational.includes(queryNational))
			) {
				return {
					isMatch: true,
					score: 60,
					matchedBy: "phone",
					isExact: true,
					isFuzzy: false,
				};
			}
		}

		// Телефон законного представителя
		const repPhone = patient.administrativeProfile?.legalRepresentativePhone;
		if (repPhone) {
			const repPhoneDigits = repPhone.replace(/\D/g, "");
			const repNational = normalizePhoneToNational(repPhone);
			if (
				repPhoneDigits.includes(queryDigits) ||
				(queryNational.length >= 3 && repNational.includes(queryNational))
			) {
				return {
					isMatch: true,
					score: 50,
					matchedBy: "rep_phone",
					isExact: true,
					isFuzzy: false,
				};
			}
		}
	}

	// 2. Номер медицинской карты 043/у (проверяем все варианты: cardNumber, chartNumber, medicalCardNumber)
	const patientCards = extractPatientCardNumbers(patient);
	if (patientCards.length > 0) {
		const cardQuery = normalizeCardQuery(query);

		for (const card of patientCards) {
			const normCard = normalizeCyrillicText(card);
			const cardDigits = card.replace(/\D/g, "");

			// Точное или почти точное совпадение очищенного номера карты
			if (
				normCard === normalizedQuery ||
				(cardQuery.cleanCardToken && normCard === cardQuery.cleanCardToken)
			) {
				return {
					isMatch: true,
					score: 80,
					matchedBy: "card",
					isExact: true,
					isFuzzy: false,
				};
			}

			// Если запрос явно содержит маркер карты 043/у («043/у-1001», «карта 1001»)
			if (cardQuery.isCardExplicit && cardQuery.cardDigits.length >= 1) {
				if (cardDigits === cardQuery.cardDigits || cardDigits.endsWith(cardQuery.cardDigits)) {
					return {
						isMatch: true,
						score: 80,
						matchedBy: "card",
						isExact: true,
						isFuzzy: false,
					};
				}
			}

			// Подстрока в номере карты
			if (
				normCard.includes(normalizedQuery) ||
				(cardQuery.cleanCardToken && normCard.includes(cardQuery.cleanCardToken))
			) {
				return {
					isMatch: true,
					score: 80,
					matchedBy: "card",
					isExact: true,
					isFuzzy: false,
				};
			}

			// Поиск по цифрам карты
			if (
				(queryDigits.length >= 2 && cardDigits && cardDigits.includes(queryDigits)) ||
				(cardQuery.cardDigits.length >= 2 && cardDigits && cardDigits.includes(cardQuery.cardDigits))
			) {
				return {
					isMatch: true,
					score: 80,
					matchedBy: "card",
					isExact: true,
					isFuzzy: false,
				};
			}
		}
	}

	// 3. Дата рождения (ГГГГ, ДД.ММ.ГГГГ)
	if (patient.birthDate && queryDigits.length >= 2) {
		const [year, month, day] = patient.birthDate.split("-");
		const formattedDot = day && month && year ? `${day}.${month}.${year}` : "";
		if (
			patient.birthDate.includes(queryDigits) ||
			(formattedDot &&
				(formattedDot.includes(query) ||
					formattedDot.replace(/\D/g, "").includes(queryDigits)))
		) {
			return {
				isMatch: true,
				score: 55,
				matchedBy: "birth_date",
				isExact: true,
				isFuzzy: false,
			};
		}
	}

	// 4. Точные проверки ФИО
	if (normalizedFullName && normalizedQuery) {
		if (normalizedFullName === normalizedQuery) {
			return {
				isMatch: true,
				score: 95,
				matchedBy: "name",
				isExact: true,
				isFuzzy: false,
			};
		}
		if (normalizedFullName.startsWith(normalizedQuery)) {
			return {
				isMatch: true,
				score: 90,
				matchedBy: "name",
				isExact: true,
				isFuzzy: false,
			};
		}
		if (normalizedFullName.includes(normalizedQuery)) {
			return {
				isMatch: true,
				score: 70,
				matchedBy: "name",
				isExact: true,
				isFuzzy: false,
			};
		}
	}

	// 5. ФИО законного представителя
	const repName = patient.administrativeProfile?.legalRepresentativeFullName;
	if (repName && normalizedQuery) {
		const normRepName = normalizeCyrillicText(repName);
		if (normRepName.includes(normalizedQuery)) {
			return {
				isMatch: true,
				score: 65,
				matchedBy: "name",
				isExact: true,
				isFuzzy: false,
			};
		}
	}

	// 6. Нечеткий токенизированный поиск по ФИО (Левенштейн + Транслит)
	const nameMatch = isFuzzyNameMatch(patient.fullName, query);
	if (nameMatch.isMatch) {
		if (nameMatch.isExact) {
			return {
				isMatch: true,
				score: 70,
				matchedBy: "name",
				isExact: true,
				isFuzzy: false,
			};
		}
		const fuzzyScore = nameMatch.maxDistance === 1 ? 45 : 35;
		return {
			isMatch: true,
			score: fuzzyScore,
			matchedBy: "fuzzy_name",
			isExact: false,
			isFuzzy: true,
			suggestedName: patient.fullName || undefined,
		};
	}

	// 7. Нечеткий поиск по ФИО представителя
	if (repName) {
		const repMatch = isFuzzyNameMatch(repName, query);
		if (repMatch.isMatch) {
			return {
				isMatch: true,
				score: repMatch.isExact ? 50 : 30,
				matchedBy: repMatch.isExact ? "name" : "fuzzy_name",
				isExact: repMatch.isExact,
				isFuzzy: !repMatch.isExact,
				suggestedName: repName,
			};
		}
	}

	// 8. Поиск по СНИЛС (11 цифр или фрагмент от 3 цифр)
	const snilsVal = patient.snils || patient.administrativeProfile?.snils;
	if (snilsVal && queryDigits.length >= 3) {
		const snilsDigits = snilsVal.replace(/\D/g, "");
		if (snilsDigits.includes(queryDigits)) {
			return {
				isMatch: true,
				score: 85,
				matchedBy: "snils",
				isExact: snilsDigits === queryDigits,
				isFuzzy: false,
			};
		}
	}

	// 9. Поиск по номеру полиса ОМС/ДМС
	const policyVal =
		patient.insurancePolicyNumber ||
		patient.policyNumber ||
		patient.omsPolicy ||
		patient.dmsPolicyNumber ||
		patient.administrativeProfile?.insurancePolicyNumber;
	if (policyVal) {
		const normPolicy = normalizeCyrillicText(policyVal);
		const policyDigits = policyVal.replace(/\D/g, "");
		if (
			normPolicy.includes(normalizedQuery) ||
			(queryDigits.length >= 3 && policyDigits.includes(queryDigits))
		) {
			return {
				isMatch: true,
				score: 80,
				matchedBy: "policy",
				isExact: normPolicy === normalizedQuery || (queryDigits.length >= 6 && policyDigits === queryDigits),
				isFuzzy: false,
			};
		}
	}

	// 10. Поиск по тегам
	if (patient.tags) {
		const tagsList = Array.isArray(patient.tags) ? patient.tags : [String(patient.tags)];
		for (const t of tagsList) {
			const normTag = normalizeCyrillicText(t);
			if (normTag.includes(normalizedQuery)) {
				return {
					isMatch: true,
					score: 75,
					matchedBy: "tag",
					isExact: normTag === normalizedQuery,
					isFuzzy: false,
				};
			}
		}
	}

	// 11. Поиск по заметкам (notes)
	if (patient.notes && normalizedQuery.length >= 3) {
		const normNotes = normalizeCyrillicText(patient.notes);
		if (normNotes.includes(normalizedQuery)) {
			return {
				isMatch: true,
				score: 60,
				matchedBy: "notes",
				isExact: false,
				isFuzzy: false,
			};
		}
	}

	return {
		isMatch: false,
		score: 0,
		matchedBy: "name",
		isExact: false,
		isFuzzy: false,
	};
}

export function matchesPatientSearch(
	patient: PatientSearchableFields | null | undefined,
	rawQuery: string,
): boolean {
	return scorePatientSearch(patient, rawQuery).isMatch;
}

// ============================================================================
// 3. ПОДСВЕТКА СОВПАДЕНИЙ (<mark>)
// ============================================================================

export function highlightSearchMatches(
	text: string | null | undefined,
	query: string,
): SearchMatchHighlightPart[] {
	if (!text) return [];
	const q = query.trim();
	if (!q) return [{ text, isMatch: false }];

	const normalizedSource = text.toLowerCase().replaceAll("ё", "е");
	const normalizedQ = q.toLowerCase().replaceAll("ё", "е");
	const translitQ = transliterateLatinToCyrillic(normalizedQ);
	const keyboardQ = convertKeyboardMistype(normalizedQ);

	const cardInfo = normalizeCardQuery(q);
	const queryTokens = Array.from(
		new Set(
			[normalizedQ, translitQ, keyboardQ, cardInfo.cleanCardToken, cardInfo.cardDigits]
				.flatMap((item) => (item ? item.split(/\s+/) : []))
				.filter(Boolean),
		),
	);

	// 1. Прямое совпадение подстроки
	if (normalizedSource.includes(normalizedQ)) {
		const singleIndex = normalizedSource.indexOf(normalizedQ);
		const parts: SearchMatchHighlightPart[] = [];
		if (singleIndex > 0) {
			parts.push({ text: text.slice(0, singleIndex), isMatch: false });
		}
		parts.push({
			text: text.slice(singleIndex, singleIndex + q.length),
			isMatch: true,
		});
		if (singleIndex + q.length < text.length) {
			parts.push({ text: text.slice(singleIndex + q.length), isMatch: false });
		}
		return parts;
	}

	const intervals: { start: number; end: number }[] = [];

	// 2. Поиск по цифрам телефона
	const queryDigits = q.replace(/\D/g, "");
	const sourceDigits = text.replace(/\D/g, "");
	if (queryDigits.length >= 3 && sourceDigits.length >= 3) {
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
	}

	// 3. Токенизированные слова и нечеткое соответствие
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
			} else {
				const fMatch = fuzzyMatchToken(qTok, w.word);
				if (fMatch.isMatch) {
					intervals.push({ start: w.start, end: w.end });
				}
			}
		}
	}

	if (intervals.length === 0) {
		return [{ text, isMatch: false }];
	}

	intervals.sort((a, b) => a.start - b.start || b.end - a.end);
	const merged: { start: number; end: number }[] = [];
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
