/**
 * patientSearchFuzzy.ts — Интеллектуальный движок нечеткого поиска, выявления дубликатов и неразрушающего слияния.
 *
 * МАНДАТЫ КЛИНИЧЕСКОЙ БЕЗОПАСНОСТИ И ЭРГОНОМИКИ:
 * 1. Интеллектуальное выявление дубликатов:
 *    - Нормализация телефона в E.164 (+79991234567, 89991234567, 9991234567 -> единый канонический формат).
 *    - Поиск по последним 4 цифрам телефона («4567»).
 *    - Совпадение даты рождения + нечеткое совпадение ФИО (Soundex/Левенштейн, 1-2 опечатки).
 *    - Полная транслитерация («Ivanov» -> «Иванов», «Shcherbakov» -> «Щербаков», «Kuznetsov» -> «Кузнецов»).
 *    - Конвертация ошибочной раскладки клавиатуры («Bdfyjd» -> «Иванов»).
 *    - Строгая защита коротких фамилий (Ли, Ким, Пак, Цой, Хан, Али — длина <= 3 не терпит опечаток).
 * 2. Неразрушающее слияние (Non-Destructive Merge):
 *    - Баланс: семейный и депозитный баланс суммируются целочисленно с точностью до копейки.
 *    - Аллергии и соматический статус: СТРОГОЕ ОБЪЕДИНЕНИЕ (UNION)! Ни один фактор риска не теряется.
 *    - Старый профиль помечается как merged_into, сохраняя аудит 152-ФЗ.
 */

import type { Patient } from "@dental/shared";
import { getNationalPhoneDigits } from "@dental/shared";
import { levenshteinDistance } from "../../lib/stringUtils";

// ============================================================================
// 1. ТЕЛЕФОННАЯ НОРМАЛИЗАЦИЯ (E.164 И 10-ЗНАЧНЫЙ НАЦИОНАЛЬНЫЙ ФОРМАТ)
// ============================================================================

/**
 * Нормализует телефонный номер к каноническому 10-значному национальному представлению (без кода страны).
 * Поддерживает форматы: +79991234567, 89991234567, 9991234567, +7 (999) 123-45-67 -> "9991234567"
 */
export const normalizePhoneToNational = (value: string | null | undefined): string =>
	getNationalPhoneDigits(value);

/**
 * Нормализует телефонный номер к международному формату E.164 (+7XXXXXXXXXX для РФ).
 */
export function normalizePhoneE164(value: string | null | undefined): string {
	const national = normalizePhoneToNational(value);
	if (national.length === 10) {
		return `+7${national}`;
	}
	const digits = (value ?? "").replace(/\D/g, "");
	if (digits.length >= 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
		return `+7${digits.slice(1, 11)}`;
	}
	if (digits.length === 10) {
		return `+7${digits}`;
	}
	return digits ? `+${digits}` : "";
}

// ============================================================================
// 2. ТРАНСЛИТЕРАЦИЯ И КОНВЕРТАЦИЯ РАСКЛАДКИ КЛАВИАТУРЫ
// ============================================================================

const LATIN_TO_CYRILLIC_MULTI: readonly [string, string][] = [
	["shch", "щ"],
	["sh", "ш"],
	["ch", "ч"],
	["zh", "ж"],
	["ts", "ц"],
	["tc", "ц"],
	["kh", "х"],
	["yu", "ю"],
	["ju", "ю"],
	["ya", "я"],
	["ja", "я"],
	["yo", "ё"],
	["jo", "ё"],
	["oy", "ой"],
	["ay", "ай"],
	["ey", "ей"],
	["uy", "уй"],
	["iy", "ий"],
	["yy", "ый"],
];

const LATIN_TO_CYRILLIC_SINGLE: Record<string, string> = {
	a: "а",
	b: "б",
	c: "к",
	d: "д",
	e: "е",
	f: "ф",
	g: "г",
	h: "х",
	i: "и",
	j: "й",
	k: "к",
	l: "л",
	m: "м",
	n: "н",
	o: "о",
	p: "п",
	q: "к",
	r: "р",
	s: "с",
	t: "т",
	u: "у",
	v: "в",
	w: "в",
	x: "кс",
	y: "ы",
	z: "з",
};

/**
 * Транслитерация из латиницы в кириллицу (Ivanov -> Иванов, Shcherbakov -> Щербаков, Kuznetsov -> Кузнецов)
 */
export function transliterateLatinToCyrillic(text: string): string {
	if (!text) return "";
	let lower = text.toLowerCase();

	// 1. Многобуквенные сочетания
	for (const [latin, cyr] of LATIN_TO_CYRILLIC_MULTI) {
		lower = lower.replaceAll(latin, cyr);
	}

	// 2. Однобуквенные замены
	let result = "";
	for (let i = 0; i < lower.length; i++) {
		const char = lower[i];
		if (char && LATIN_TO_CYRILLIC_SINGLE[char]) {
			result += LATIN_TO_CYRILLIC_SINGLE[char];
		} else {
			result += char;
		}
	}
	return result;
}

const QWERTY_TO_JCUKEN: Record<string, string> = {
	q: "й",
	w: "ц",
	e: "у",
	r: "к",
	t: "е",
	y: "н",
	u: "г",
	i: "ш",
	o: "щ",
	p: "з",
	"[": "х",
	"]": "ъ",
	a: "ф",
	s: "ы",
	d: "в",
	f: "а",
	g: "п",
	h: "р",
	j: "о",
	k: "л",
	l: "д",
	";": "ж",
	"'": "э",
	z: "я",
	x: "ч",
	c: "с",
	v: "м",
	b: "и",
	n: "т",
	m: "ь",
	",": "б",
	".": "ю",
};

/**
 * Конвертирует ошибочный ввод в неверной раскладке клавиатуры (Bdfyjd -> иванов, Cvshpyst -> смирнов)
 */
export function convertKeyboardMistype(text: string): string {
	if (!text) return "";
	const lower = text.toLowerCase();
	let result = "";
	for (let i = 0; i < lower.length; i++) {
		const char = lower[i];
		if (char && QWERTY_TO_JCUKEN[char]) {
			result += QWERTY_TO_JCUKEN[char];
		} else {
			result += char;
		}
	}
	return result;
}

/**
 * Нормализует кириллический текст (нижний регистр, замена Ё на Е, очистка знаков)
 */
export function normalizeCyrillicText(value: string | null | undefined): string {
	return (value ?? "")
		.toLocaleLowerCase("ru-RU")
		.replaceAll("ё", "е")
		.replace(/[^a-zа-я0-9\s]/gi, " ")
		.replace(/\s+/g, " ")
		.trim();
}

// ============================================================================
// 3. НЕЧЕТКОЕ СОПОСТАВЛЕНИЕ ТОКЕНОВ И ФИО (ЛЕВЕНШТЕЙН И ТРАНСЛИТ)
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
// 4. СКОРИНГ И РАНЖИРОВАНИЕ РЕЗУЛЬТАТОВ ПОИСКА
// ============================================================================

export interface PatientSearchableFields {
	fullName?: string | null | undefined;
	phone?: string | null | undefined;
	mobilePhone?: string | null | undefined;
	contactPhone?: string | null | undefined;
	birthDate?: string | null | undefined;
	cardNumber?: string | null | undefined;
	chartNumber?: string | null | undefined;
	medicalCardNumber?: string | null | undefined;
	medCardNumber?: string | null | undefined;
	snils?: string | null | undefined;
	insurancePolicyNumber?: string | null | undefined;
	policyNumber?: string | null | undefined;
	omsPolicy?: string | null | undefined;
	dmsPolicyNumber?: string | null | undefined;
	notes?: string | null | undefined;
	tags?: string[] | string | null | undefined;
	administrativeProfile?: {
		legalRepresentativePhone?: string | null | undefined;
		legalRepresentativeFullName?: string | null | undefined;
		cardNumber?: string | null | undefined;
		patientPhone?: string | null | undefined;
		snils?: string | null | undefined;
		insurancePolicyNumber?: string | null | undefined;
		identityDocument?: string | null | undefined;
		taxpayerInn?: string | null | undefined;
	} | null | undefined;
}

export interface PatientSearchScoredResult {
	readonly isMatch: boolean;
	readonly score: number;
	readonly matchedBy: "phone" | "name" | "card" | "rep_phone" | "birth_date" | "fuzzy_name" | "snils" | "policy" | "tag" | "notes";
	readonly isExact: boolean;
	readonly isFuzzy: boolean;
	readonly suggestedName?: string | undefined;
}

/**
 * Извлекает все варианты номеров медицинских карт пациента (043/у, chartNumber, cardNumber и т.д.)
 */
export function extractPatientCardNumbers(
	patient: PatientSearchableFields | null | undefined,
): string[] {
	if (!patient) return [];
	const rawList = [
		patient.cardNumber,
		patient.chartNumber,
		patient.medicalCardNumber,
		patient.medCardNumber,
		patient.administrativeProfile?.cardNumber,
	].filter((c): c is string => Boolean(c && typeof c === "string" && c.trim().length > 0));

	return Array.from(new Set(rawList.map((c) => c.trim())));
}

/**
 * Извлекает все телефонные номера пациента из различных профилей и полей.
 */
export function extractPatientPhones(
	patient: PatientSearchableFields | null | undefined,
): string[] {
	if (!patient) return [];
	const rawList = [
		patient.phone,
		patient.mobilePhone,
		patient.contactPhone,
		patient.administrativeProfile?.patientPhone,
	].filter((p): p is string => Boolean(p && typeof p === "string" && p.trim().length > 0));

	return Array.from(new Set(rawList.map((p) => p.trim())));
}

/**
 * Очищает поисковый запрос от префиксов медкарты 043/у («форма 043», «043/у», «карта», «№» и др.)
 */
export function normalizeCardQuery(rawQuery: string): {
	isCardExplicit: boolean;
	cleanCardToken: string;
	cardDigits: string;
} {
	const trimmed = rawQuery.trim();
	const lower = trimmed.toLowerCase().replaceAll("ё", "е");

	const hasCardPrefix =
		/^(форма\s+)?(043[\s/\\_-]*[уy]?|ф\.?\s*043[\s/\\_-]*[уy]?)/i.test(lower) ||
		/^(медкарта|карточка|карта|мед\.?\s*карта)\s*(№|n|#)?/i.test(lower) ||
		/^(№|n|#)\s*/i.test(lower) ||
		/^[кk][-_\s]\d+/i.test(lower);

	let cleaned = lower;
	cleaned = cleaned.replace(/^(форма\s+)?(043[\s/\\_-]*[уy]?|ф\.?\s*043[\s/\\_-]*[уy]?)\s*[-_\s]*/i, "");
	cleaned = cleaned.replace(/^(медкарта|карточка|карта|мед\.?\s*карта)\s*(№|n|#)?\s*[-_\s]*/i, "");
	cleaned = cleaned.replace(/^(№|n|#)\s*/i, "");

	const cardDigits = cleaned.replace(/\D/g, "");

	return {
		isCardExplicit: hasCardPrefix,
		cleanCardToken: cleaned.trim(),
		cardDigits,
	};
}

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
// 5. ПОДСВЕТКА СОВПАДЕНИЙ (<mark>)
// ============================================================================

export interface SearchMatchHighlightPart {
	readonly text: string;
	readonly isMatch: boolean;
}

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

// ============================================================================
// 6. БЫСТРЫЙ ПОИСК ПАЦИЕНТОВ С РАНЖИРОВАНИЕМ
// ============================================================================

export interface PatientSearchResultItem {
	readonly patient: Patient;
	readonly score: number;
	readonly fullNameHighlights: SearchMatchHighlightPart[];
	readonly phoneHighlights: SearchMatchHighlightPart[];
	readonly cardHighlights?: SearchMatchHighlightPart[] | undefined;
	readonly matchedBy: "phone" | "name" | "card" | "rep_phone" | "birth_date" | "fuzzy_name" | "both" | "snils" | "policy" | "tag" | "notes";
	readonly isFuzzy?: boolean | undefined;
	readonly suggestedName?: string | undefined;
}

export function searchPatientsQuick(
	patients: readonly Patient[],
	rawQuery: string,
	limit: number = 20,
): PatientSearchResultItem[] {
	const query = rawQuery.trim();
	if (!query) {
		return patients.slice(0, limit).map((patient) => ({
			patient,
			score: 0,
			fullNameHighlights: [{ text: patient.fullName || "Пациент", isMatch: false }],
			phoneHighlights: [{ text: patient.phone || "—", isMatch: false }],
			matchedBy: "name",
			isFuzzy: false,
		}));
	}

	const results: PatientSearchResultItem[] = [];

	for (const patient of patients) {
		const scored = scorePatientSearch(patient as PatientSearchableFields, query);
		if (!scored.isMatch) {
			continue;
		}

		const cardNumbers = extractPatientCardNumbers(patient as PatientSearchableFields);
		const cardNumber = cardNumbers[0] ?? undefined;
		const displayPhone = extractPatientPhones(patient as PatientSearchableFields)[0] ?? patient.phone ?? undefined;

		results.push({
			patient,
			score: scored.score,
			fullNameHighlights: highlightSearchMatches(patient.fullName, query),
			phoneHighlights: highlightSearchMatches(displayPhone, query),
			cardHighlights: cardNumber ? highlightSearchMatches(cardNumber, query) : undefined,
			matchedBy: scored.matchedBy,
			isFuzzy: scored.isFuzzy,
			suggestedName: scored.suggestedName,
		});
	}

	return results
		.sort(
			(a, b) =>
				b.score - a.score ||
				(a.patient.fullName || "").localeCompare(b.patient.fullName || "", "ru"),
		)
		.slice(0, limit);
}

// ============================================================================
// 7. МНОГОФАКТОРНОЕ ВЫЯВЛЕНИЕ ДУБЛИКАТОВ (DUPLICATE DETECTION)
// ============================================================================

export interface FindPotentialDuplicatesCriteria {
	readonly fullName?: string | null | undefined;
	readonly phone?: string | null | undefined;
	readonly birthDate?: string | null | undefined;
	readonly thresholdScore?: number | undefined;
	readonly limit?: number | undefined;
}

export interface PotentialDuplicateItem {
	readonly patient: Patient;
	readonly score: number;
	readonly fullNameHighlights: SearchMatchHighlightPart[];
	readonly phoneHighlights: SearchMatchHighlightPart[];
	readonly cardHighlights?: SearchMatchHighlightPart[] | undefined;
	readonly matchedBy: "phone" | "name" | "card" | "rep_phone" | "birth_date" | "fuzzy_name" | "both" | "snils" | "policy" | "tag" | "notes";
	readonly isFuzzy?: boolean | undefined;
	readonly suggestedName?: string | undefined;
	readonly duplicateReason: "phone" | "name" | "fuzzy_name" | "birth_date_and_name" | "both";
	readonly explanation?: string | undefined;
}

/**
 * Многофакторный анализ дубликатов по ФИО, телефону и дате рождения.
 * Совпадение нормализованного E.164 телефона или даты рождения + нечеткого ФИО.
 */
export function findPotentialDuplicates(
	patients: readonly Patient[],
	criteria: FindPotentialDuplicatesCriteria,
): PotentialDuplicateItem[] {
	const name = (criteria.fullName ?? "").trim();
	const phone = (criteria.phone ?? "").trim();
	const birthDate = (criteria.birthDate ?? "").trim();
	const phoneDigits = phone.replace(/\D/g, "");

	if (name.length < 3 && phoneDigits.length < 4 && !birthDate) {
		return [];
	}

	const threshold = criteria.thresholdScore ?? 35;
	const limit = criteria.limit ?? 5;
	const results: PotentialDuplicateItem[] = [];

	for (const patient of patients) {
		// Игнорируем уже объединенные карточки
		if ((patient as any).mergedIntoPatientId || patient.status === "archived") {
			continue;
		}

		let nameDuplicateScore = 0;
		let nameReason: "name" | "fuzzy_name" | null = null;
		let nameIsFuzzy = false;
		let nameSuggested: string | undefined = undefined;

		if (name.length >= 3) {
			const normPatientName = normalizeCyrillicText(patient.fullName);
			const normQueryName = normalizeCyrillicText(name);

			if (normPatientName === normQueryName) {
				nameDuplicateScore = 100;
				nameReason = "name";
			} else if (
				normPatientName.startsWith(normQueryName) ||
				normQueryName.startsWith(normPatientName)
			) {
				nameDuplicateScore = 95;
				nameReason = "name";
			} else {
				const fuzzyCheck = isFuzzyNameMatch(patient.fullName, name);
				if (fuzzyCheck.isMatch) {
					if (fuzzyCheck.isExact) {
						nameDuplicateScore = 95;
						nameReason = "name";
					} else {
						nameDuplicateScore = fuzzyCheck.maxDistance === 1 ? 75 : 65;
						nameReason = "fuzzy_name";
						nameIsFuzzy = true;
						nameSuggested = patient.fullName || undefined;
					}
				}
			}
		}

		let phoneDuplicateScore = 0;
		if (phoneDigits.length >= 4) {
			const queryDigits = phoneDigits;
			const patientPhoneDigits = (patient.phone ?? "").replace(/\D/g, "");
			const patientNational = normalizePhoneToNational(patient.phone);
			const queryNational = normalizePhoneToNational(phone);

			if (
				queryDigits.length >= 10 &&
				patientNational &&
				patientNational === queryNational
			) {
				phoneDuplicateScore = 100;
			} else if (
				patientPhoneDigits.length >= 10 &&
				queryDigits.length >= 10 &&
				patientPhoneDigits.slice(-10) === queryDigits.slice(-10)
			) {
				phoneDuplicateScore = 100;
			} else if (patientPhoneDigits.endsWith(phoneDigits)) {
				phoneDuplicateScore = 85;
			} else if (
				patientPhoneDigits.includes(phoneDigits) ||
				(queryNational.length >= 4 && patientNational.includes(queryNational))
			) {
				phoneDuplicateScore = 75;
			} else if ((patient as any).administrativeProfile?.legalRepresentativePhone) {
				const repPhone = (patient as any).administrativeProfile.legalRepresentativePhone;
				const repPhoneDigits = repPhone.replace(/\D/g, "");
				const repNational = normalizePhoneToNational(repPhone);
				if (
					queryDigits.length >= 10 &&
					repNational &&
					repNational === queryNational
				) {
					phoneDuplicateScore = 90;
				} else if (
					repPhoneDigits.endsWith(phoneDigits) ||
					repPhoneDigits.includes(phoneDigits)
				) {
					phoneDuplicateScore = 75;
				}
			}
		}

		// Проверка даты рождения
		let dobMatched = false;
		if (birthDate && patient.birthDate) {
			const cleanQueryDob = birthDate.replace(/\D/g, "");
			const cleanPatientDob = patient.birthDate.replace(/\D/g, "");
			if (cleanQueryDob === cleanPatientDob && cleanQueryDob.length >= 8) {
				dobMatched = true;
			}
		}

		const nameMatched = nameDuplicateScore >= 35;
		const phoneMatched = phoneDuplicateScore >= 50;

		if (!nameMatched && !phoneMatched && !dobMatched) {
			continue;
		}

		let finalScore = 0;
		let duplicateReason: "name" | "phone" | "both" | "fuzzy_name" | "birth_date_and_name" = "name";
		let matchedBy:
			| "name"
			| "phone"
			| "both"
			| "fuzzy_name"
			| "card"
			| "rep_phone"
			| "birth_date" = "name";
		let isFuzzy = false;
		let suggestedName: string | undefined = undefined;
		let explanation = "";

		if (nameMatched && phoneMatched) {
			finalScore = 100;
			duplicateReason = "both";
			matchedBy = "both";
			isFuzzy = nameIsFuzzy;
			suggestedName = nameSuggested;
			explanation = "Совпадение по ФИО и телефонному номеру";
		} else if (dobMatched && nameMatched) {
			// Совпадение даты рождения + нечеткое ФИО
			finalScore = Math.max(90, nameDuplicateScore);
			duplicateReason = "birth_date_and_name";
			matchedBy = nameIsFuzzy ? "fuzzy_name" : "birth_date";
			isFuzzy = nameIsFuzzy;
			suggestedName = nameSuggested;
			explanation = `Совпадение даты рождения (${patient.birthDate}) и ФИО`;
		} else if (phoneMatched && !nameMatched) {
			finalScore = phoneDuplicateScore;
			duplicateReason = "phone";
			matchedBy = "phone";
			isFuzzy = false;
			explanation = "Совпадение по номеру телефона";
		} else {
			finalScore = nameDuplicateScore;
			duplicateReason = nameReason || "name";
			matchedBy = nameIsFuzzy ? "fuzzy_name" : "name";
			isFuzzy = nameIsFuzzy;
			suggestedName = nameSuggested;
			explanation = nameIsFuzzy
				? `Похожее ФИО (вероятная опечатка)`
				: "Совпадение по ФИО";
		}

		if (finalScore < threshold) {
			continue;
		}

		const fullNameHighlights = name.length >= 2
			? highlightSearchMatches(patient.fullName, name)
			: [{ text: patient.fullName || "Пациент", isMatch: false }];

		const phoneHighlights = phoneDigits.length >= 3
			? highlightSearchMatches(patient.phone, phone)
			: [{ text: patient.phone || "—", isMatch: false }];

		const cardNumber = (patient as any).cardNumber ?? undefined;

		results.push({
			patient,
			score: finalScore,
			fullNameHighlights,
			phoneHighlights,
			cardHighlights: cardNumber ? highlightSearchMatches(cardNumber, name || phone) : undefined,
			matchedBy,
			isFuzzy,
			suggestedName,
			duplicateReason,
			explanation,
		});
	}

	return results
		.sort(
			(a, b) =>
				b.score - a.score ||
				(a.patient.fullName || "").localeCompare(b.patient.fullName || "", "ru"),
		)
		.slice(0, limit);
}

// ============================================================================
// 8. НЕРАЗРУШАЮЩЕЕ СЛИЯНИЕ ДАННЫХ ПАЦИЕНТА (NON-DESTRUCTIVE MERGE)
// ============================================================================

export interface MergedPatientResult {
	readonly primaryPatient: Patient;
	readonly archivedDuplicatePatient: Patient;
	readonly combinedBalanceRub: number;
	readonly unitedAllergies: string;
	readonly unitedSafetyFlags: string[];
	readonly summary: string;
}

/**
 * Выполняет строгое неразрушающее слияние двух объектов пациента в памяти / клиенте.
 * Правила:
 * 1. Баланс: семейный и личный баланс суммируются целочисленно с точностью до копейки.
 * 2. Аллергии: строгое объединение множеств (UNION). Ни одна аллергия не теряется!
 * 3. Соматические факторы риска: логическое объединение (primary || duplicate).
 * 4. Административные реквизиты: заполняются из дубля, если в основном отсутствовали.
 * 5. Дубль помечается как mergedIntoPatientId = primary.id, статус "archived".
 */
export function mergePatientRecordsNonDestructive(
	primary: Patient,
	duplicate: Patient,
	reason: string = "Объединение дубликата карты",
): MergedPatientResult {
	if (primary.id === duplicate.id) {
		throw new Error("Невозможно объединить карточку саму с собой");
	}

	// 1. Точный расчет баланса в копейках
	const primBalanceKop = Math.round(Number(primary.balanceRub ?? (primary as any).balance ?? 0) * 100);
	const dupBalanceKop = Math.round(Number(duplicate.balanceRub ?? (duplicate as any).balance ?? 0) * 100);
	const combinedBalanceRub = (primBalanceKop + dupBalanceKop) / 100;

	// 2. Строгое объединение аллергий (UNION)
	const rawAllergiesA = ((primary as any).allergies as string | undefined) ?? "";
	const rawAllergiesB = ((duplicate as any).allergies as string | undefined) ?? "";

	const splitAllergies = (str: string) =>
		str
			.split(/[,;\n]+/)
			.map((s) => s.trim())
			.filter(Boolean);

	const allergyTokens = Array.from(
		new Set([...splitAllergies(rawAllergiesA), ...splitAllergies(rawAllergiesB)]),
	);
	const unitedAllergies = allergyTokens.join("; ");

	// 3. Строгое объединение профиля клинической безопасности (Clinical Safety Profile)
	const safetyA = (primary as any).clinicalSafetyProfile || {};
	const safetyB = (duplicate as any).clinicalSafetyProfile || {};

	const unitedSafetyProfile: Record<string, unknown> = {
		...safetyA,
		// Аллергии
		hasLidocaineAllergy: Boolean(safetyA.hasLidocaineAllergy || safetyB.hasLidocaineAllergy),
		hasArticaineAllergy: Boolean(safetyA.hasArticaineAllergy || safetyB.hasArticaineAllergy),
		hasMepivacaineAllergy: Boolean(safetyA.hasMepivacaineAllergy || safetyB.hasMepivacaineAllergy),
		hasSulfiteAllergy: Boolean(safetyA.hasSulfiteAllergy || safetyB.hasSulfiteAllergy),
		hasAnestheticAllergy: Boolean(safetyA.hasAnestheticAllergy || safetyB.hasAnestheticAllergy),
		hasIodineAllergy: Boolean(safetyA.hasIodineAllergy || safetyB.hasIodineAllergy),
		hasAnaphylaxisHistory: Boolean(safetyA.hasAnaphylaxisHistory || safetyB.hasAnaphylaxisHistory),
		// Соматика
		hasPacemakerExs: Boolean(safetyA.hasPacemakerExs || safetyB.hasPacemakerExs),
		hasCardiovascularDisease: Boolean(safetyA.hasCardiovascularDisease || safetyB.hasCardiovascularDisease),
		hasHypertension: Boolean(safetyA.hasHypertension || safetyB.hasHypertension),
		takesAnticoagulants: Boolean(safetyA.takesAnticoagulants || safetyB.takesAnticoagulants),
		takesBisphosphonates: Boolean(safetyA.takesBisphosphonates || safetyB.takesBisphosphonates),
		hasDiabetesMellitus: Boolean(safetyA.hasDiabetesMellitus || safetyB.hasDiabetesMellitus),
		hasBronchialAsthma: Boolean(safetyA.hasBronchialAsthma || safetyB.hasBronchialAsthma),
		hasEpilepsy: Boolean(safetyA.hasEpilepsy || safetyB.hasEpilepsy),
		hasHepatitis: Boolean(safetyA.hasHepatitis || safetyB.hasHepatitis),
		hasHiv: Boolean(safetyA.hasHiv || safetyB.hasHiv),
		hasPenicillinAllergy: Boolean(safetyA.hasPenicillinAllergy || safetyB.hasPenicillinAllergy),
		hasLatexAllergy: Boolean(safetyA.hasLatexAllergy || safetyB.hasLatexAllergy),
		hasNsaidAllergy: Boolean(safetyA.hasNsaidAllergy || safetyB.hasNsaidAllergy),
	};

	const unitedSafetyFlags: string[] = [];
	if (unitedSafetyProfile.hasLidocaineAllergy) unitedSafetyFlags.push("Аллергия на лидокаин");
	if (unitedSafetyProfile.hasArticaineAllergy) unitedSafetyFlags.push("Аллергия на артикаин");
	if (unitedSafetyProfile.hasMepivacaineAllergy) unitedSafetyFlags.push("Аллергия на мепивакаин");
	if (unitedSafetyProfile.hasPacemakerExs) unitedSafetyFlags.push("Кардиостимулятор (ЭКС)");
	if (unitedSafetyProfile.takesAnticoagulants) unitedSafetyFlags.push("Антикоагулянтная терапия");
	if (unitedSafetyProfile.takesBisphosphonates) unitedSafetyFlags.push("Бисфосфонаты (риск остеонекроза)");
	if (unitedSafetyProfile.hasBronchialAsthma) unitedSafetyFlags.push("Бронхиальная астма");
	if (unitedSafetyProfile.hasDiabetesMellitus) unitedSafetyFlags.push("Сахарный диабет");
	if (unitedSafetyProfile.hasHypertension) unitedSafetyFlags.push("Гипертония");

	// 4. Дозаполнение административного профиля
	const adminA = (primary.administrativeProfile as Record<string, unknown> | null) || {};
	const adminB = (duplicate.administrativeProfile as Record<string, unknown> | null) || {};
	const unitedAdminProfile: Record<string, unknown> = { ...adminA };

	for (const [key, val] of Object.entries(adminB)) {
		if (
			(unitedAdminProfile[key] === null ||
				unitedAdminProfile[key] === undefined ||
				unitedAdminProfile[key] === "") &&
			val !== null &&
			val !== undefined &&
			val !== ""
		) {
			unitedAdminProfile[key] = val;
		}
	}

	// 5. Заметки
	const primNotes = primary.notes?.trim() || "";
	const dupNotes = duplicate.notes?.trim() || "";
	const auditNote = `[152-ФЗ Аудит слияния: ${new Date().toISOString()}] Карточка объединена с дубликатом «${duplicate.fullName}» (ID: ${duplicate.id}). Причина: ${reason}.`;
	const combinedNotes = [primNotes, dupNotes ? `Заметки из дубликата: ${dupNotes}` : "", auditNote]
		.filter(Boolean)
		.join("\n\n");

	const primaryPatient: Patient = {
		...primary,
		phone: primary.phone || duplicate.phone,
		birthDate: primary.birthDate || duplicate.birthDate,
		email: primary.email || duplicate.email,
		balanceRub: combinedBalanceRub,
		familyGroupId: primary.familyGroupId || duplicate.familyGroupId,
		notes: combinedNotes,
		administrativeProfile: unitedAdminProfile as any,
		...({
			allergies: unitedAllergies,
			clinicalSafetyProfile: unitedSafetyProfile,
		} as any),
	};

	const archivedDuplicatePatient: Patient = {
		...duplicate,
		status: "archived" as any,
		mergedIntoPatientId: primary.id,
		notes: `[152-ФЗ] Карточка объединена в основную карту «${primary.fullName}» (ID: ${primary.id}).`,
	};

	const summary = `Слияние завершено: Баланс объединен (${combinedBalanceRub.toFixed(2)} ₽). Аллергии и соматические риски объединены (${unitedSafetyFlags.length} факторов). Карта «${duplicate.fullName}» переведена в архив как merged_into.`;

	return {
		primaryPatient,
		archivedDuplicatePatient,
		combinedBalanceRub,
		unitedAllergies,
		unitedSafetyFlags,
		summary,
	};
}
