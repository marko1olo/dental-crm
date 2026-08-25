/**
 * patientSearchUtils.ts — Robust Patient Search & Levenshtein Fuzzy Typo-Tolerance Engine.
 *
 * Provides:
 * 1. Fast phone normalization & last 4 digits matching;
 * 2. Medical card and birth date search;
 * 3. Tokenized name search (word permutations and prefix matches);
 * 4. Levenshtein fuzzy matching with strict short-surname defense (Ли, Ким, Пак);
 * 5. Scored results ranking exact & phone/card matches at the top.
 */

import { levenshteinDistance } from "../lib/stringUtils";

/**
 * Нормализует телефонный номер к каноническому 10-значному национальному представлению
 * Поддерживает форматы: +79991234567, 89991234567, 9991234567, +7 (999) 123-45-67
 */
export function normalizePhoneToNational(value: string | null | undefined): string {
	const digits = (value ?? "").replace(/\D/g, "");
	if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
		return digits.slice(1);
	}
	if (digits.length === 10) {
		return digits;
	}
	return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * Нормализует кириллический текст (регистр, замена Ё на Е, удаление лишних знаков)
 */
export function normalizeCyrillicText(value: string | null | undefined): string {
	return (value ?? "")
		.toLocaleLowerCase("ru-RU")
		.replaceAll("ё", "е")
		.replace(/[^a-zа-я0-9\s]/gi, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export interface PatientSearchableFields {
	fullName?: string | null | undefined;
	phone?: string | null | undefined;
	birthDate?: string | null | undefined;
	cardNumber?: string | null | undefined;
	administrativeProfile?: {
		legalRepresentativePhone?: string | null | undefined;
		legalRepresentativeFullName?: string | null | undefined;
	} | null | undefined;
}

export interface PatientSearchScoredResult {
	readonly isMatch: boolean;
	readonly score: number;
	readonly matchedBy: "phone" | "name" | "card" | "rep_phone" | "birth_date" | "fuzzy_name";
	readonly isExact: boolean;
	readonly isFuzzy: boolean;
	readonly suggestedName?: string | undefined;
}

/**
 * Проверяет соответствие отдельного токена запроса и токена имени.
 *
 * Защита от ложных срабатываний (Anti-False-Positive Rules):
 * - Для коротких слов (длина <= 3, например: «Ли», «Ким», «Пак», «Цой», «Хан», «Ив»):
 *   допускаются ТОЛЬКО точные совпадения или точный префикс (distance === 0).
 * - Для слов средней длины (4-5 букв): допускается до 1 опечатки (distance <= 1).
 * - Для длинных слов (> 5 букв): допускается до 2 опечаток (distance <= 2).
 */
export function fuzzyMatchToken(
	queryToken: string,
	targetToken: string,
): { isMatch: boolean; distance: number; isExact: boolean } {
	if (!queryToken || !targetToken) {
		return { isMatch: false, distance: 999, isExact: false };
	}

	const q = queryToken.toLowerCase().replaceAll("ё", "е");
	const t = targetToken.toLowerCase().replaceAll("ё", "е");

	// 1. Точное совпадение или префикс
	if (t === q) {
		return { isMatch: true, distance: 0, isExact: true };
	}
	if (t.startsWith(q)) {
		return { isMatch: true, distance: 0, isExact: true };
	}
	if (q.startsWith(t)) {
		return { isMatch: true, distance: 0, isExact: true };
	}
	if (t.includes(q)) {
		return { isMatch: true, distance: 0, isExact: true };
	}

	// 2. Строгая защита коротких фамилий: длина <= 3 не терпит опечаток!
	const minLen = Math.min(q.length, t.length);
	if (minLen <= 3) {
		return { isMatch: false, distance: 999, isExact: false };
	}

	// 3. Допуск опечаток по длине
	const maxAllowedDistance = minLen <= 5 ? 1 : 2;

	let bestDistance = levenshteinDistance(q, t);

	if (t.length >= q.length) {
		const dPrefix = levenshteinDistance(q, t.slice(0, q.length));
		bestDistance = Math.min(bestDistance, dPrefix);

		if (q.length + 1 <= t.length) {
			const dPrefixPlus = levenshteinDistance(q, t.slice(0, q.length + 1));
			bestDistance = Math.min(bestDistance, dPrefixPlus);
		}
		if (q.length - 1 >= 1) {
			const dPrefixMinus = levenshteinDistance(q, t.slice(0, q.length - 1));
			bestDistance = Math.min(bestDistance, dPrefixMinus);
		}
	}

	if (bestDistance <= maxAllowedDistance) {
		return {
			isMatch: true,
			distance: bestDistance,
			isExact: false,
		};
	}

	return { isMatch: false, distance: bestDistance, isExact: false };
}

/**
 * Проверяет соответствие ФИО строке запроса с учетом перестановок слов и нечеткого сравнения.
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
	if (!normalizedQuery) {
		return { isMatch: false, isExact: false, isFuzzy: false, maxDistance: 999 };
	}

	// 1. Полное точное совпадение
	if (normalizedFullName === normalizedQuery) {
		return { isMatch: true, isExact: true, isFuzzy: false, maxDistance: 0 };
	}

	// 2. Вхождение подстроки
	if (normalizedFullName.includes(normalizedQuery)) {
		return { isMatch: true, isExact: true, isFuzzy: false, maxDistance: 0 };
	}

	const queryTokens = normalizedQuery.split(" ").filter(Boolean);
	const nameTokens = normalizedFullName.split(" ").filter(Boolean);
	if (queryTokens.length === 0 || nameTokens.length === 0) {
		return { isMatch: false, isExact: false, isFuzzy: false, maxDistance: 999 };
	}

	let totalDistance = 0;
	let hasFuzzy = false;

	// Каждый токен запроса должен сопоставиться хотя бы с одним словом из ФИО
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
			return { isMatch: false, isExact: false, isFuzzy: false, maxDistance: 999 };
		}

		totalDistance += minTokenDistance;
		if (!tokenIsExact) {
			hasFuzzy = true;
		}
	}

	return {
		isMatch: true,
		isExact: !hasFuzzy && totalDistance === 0,
		isFuzzy: hasFuzzy || totalDistance > 0,
		maxDistance: totalDistance,
	};
}

/**
 * Оценивает соответствие пациента запросу и возвращает детальный скоринг и метаданные.
 *
 * Ранжирование:
 * 1. Совпадение по полному номеру телефона (10 цифр) -> 100 баллов
 * 2. Совпадение по ФИО (точное совпадение строки) -> 95 баллов
 * 3. Совпадение по ФИО (префикс строки) -> 90 баллов
 * 4. Совпадение по 4 последним цифрам телефона -> 85 баллов
 * 5. Совпадение по номеру карты -> 80 баллов
 * 6. Точное совпадение токенов ФИО -> 70 баллов
 * 7. Совпадение по 3 цифрам телефона -> 60 баллов
 * 8. Совпадение по дате рождения -> 55 баллов
 * 9. Нечеткое совпадение по ФИО (1 опечатка) -> 45 баллов
 * 10. Нечеткое совпадение по ФИО (2 опечатки) -> 35 баллов
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
	if (queryDigits.length >= 3) {
		const patientPhoneDigits = (patient.phone ?? "").replace(/\D/g, "");
		const patientNational = normalizePhoneToNational(patient.phone);

		if (queryDigits.length >= 10 && patientNational === queryNational) {
			return {
				isMatch: true,
				score: 100,
				matchedBy: "phone",
				isExact: true,
				isFuzzy: false,
			};
		}
		if (queryDigits.length >= 4 && patientPhoneDigits.endsWith(queryDigits)) {
			return {
				isMatch: true,
				score: 85,
				matchedBy: "phone",
				isExact: true,
				isFuzzy: false,
			};
		}
		if (
			patientPhoneDigits.includes(queryDigits) ||
			(queryNational.length >= 3 && patientNational.includes(queryNational))
		) {
			return {
				isMatch: true,
				score: 60,
				matchedBy: "phone",
				isExact: true,
				isFuzzy: false,
			};
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

	// 2. Номер медицинской карты
	if (patient.cardNumber) {
		const normCard = normalizeCyrillicText(patient.cardNumber);
		const cardDigits = patient.cardNumber.replace(/\D/g, "");
		if (
			normCard.includes(normalizedQuery) ||
			(queryDigits.length >= 2 && cardDigits && cardDigits.includes(queryDigits))
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

	// 6. Нечеткий токенизированный поиск по ФИО (Левенштейн)
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
		// Нечеткое совпадение с опечатками
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

	return {
		isMatch: false,
		score: 0,
		matchedBy: "name",
		isExact: false,
		isFuzzy: false,
	};
}

/**
 * Проверяет соответствие пациента строке поиска:
 * 1. По номеру телефона (включая последние 4 цифры «9912», 3+ цифры, национальный формат);
 * 2. По телефону законного представителя (для детей / опекаемых);
 * 3. По номеру карты пациента;
 * 4. По дате рождения (ГГГГ, ДД.ММ.ГГГГ);
 * 5. По ФИО (точно, перестановки, префиксы);
 * 6. По ФИО с опечатками (нечеткий поиск Левенштейна).
 */
export function matchesPatientSearch(
	patient: PatientSearchableFields | null | undefined,
	rawQuery: string,
): boolean {
	return scorePatientSearch(patient, rawQuery).isMatch;
}
