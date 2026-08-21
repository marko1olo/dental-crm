/**
 * icd10MatchingEngine.ts — Высокопроизводительный движок поиска, нечеткого матчинга (Fuzzy Match)
 * и автоопределения стоматологических диагнозов МКБ-10 с поддержкой контекста зубов FDI.
 *
 * ФУНКЦИОНАЛ:
 * 1. Интеллектуальный парсинг поискового запроса с автоматическим извлечением номера зуба FDI (11–48, 51–85).
 * 2. Нормализация кодов (устранение опечаток с русской «К»/«к», пробелов, точек и регистра).
 * 3. Многословный русскоязычный нечеткий поиск по коду, наименованию, синонимам и клиническим тегам.
 * 4. Автоматический подбор диагноза на основе клинических жалоб и анамнеза (autoMatchFromClinicalText).
 * 5. Строгая валидация обязательности привязки к зубу перед подписанием 043/у.
 */

import {
	DENTAL_ICD10_CATALOG,
	DENTAL_ICD10_MAP,
	DENTAL_ICD10_RUBRIC_MAP,
	type DentalIcd10Item,
	type DentalSpecialty,
	type ClinicalSeverity,
} from "./icd10DentalCatalog";

/**
 * Валидные номера зубов по двухцифровой системе FDI (ISO 3950).
 */
export const VALID_FDI_PERMANENT_TEETH = new Set<number>([
	11, 12, 13, 14, 15, 16, 17, 18,
	21, 22, 23, 24, 25, 26, 27, 28,
	31, 32, 33, 34, 35, 36, 37, 38,
	41, 42, 43, 44, 45, 46, 47, 48,
]);

export const VALID_FDI_PRIMARY_TEETH = new Set<number>([
	51, 52, 53, 54, 55,
	61, 62, 63, 64, 65,
	71, 72, 73, 74, 75,
	81, 82, 83, 84, 85,
]);

export const ALL_VALID_FDI_TEETH = new Set<number>([
	...VALID_FDI_PERMANENT_TEETH,
	...VALID_FDI_PRIMARY_TEETH,
]);

export interface Icd10SearchResult {
	readonly item: DentalIcd10Item;
	readonly score: number;
	readonly matchedBy: "code" | "title" | "synonym" | "rubric" | "fuzzy";
	readonly highlightedTerms: readonly string[];
}

export interface Icd10ParsedQuery {
	readonly rawQuery: string;
	readonly cleanedQuery: string;
	readonly extractedToothNumber: number | null;
	readonly extractedToothRaw: string | null;
	readonly normalizedCodeCandidate: string | null;
}

export interface Icd10SearchOptions {
	readonly specialty?: DentalSpecialty | undefined;
	readonly rubric?: string | undefined;
	readonly severity?: ClinicalSeverity | undefined;
	readonly requiresToothOnly?: boolean | undefined;
	readonly limit?: number | undefined;
	readonly selectedToothNumber?: number | null | undefined;
}

export interface Icd10ValidationSuccess {
	readonly isValid: true;
	readonly normalizedCode: string;
	readonly item?: DentalIcd10Item | undefined;
	readonly teeth: number[];
}

export interface Icd10ValidationFailure {
	readonly isValid: false;
	readonly errorCode: "Icd10Required" | "Icd10Invalid" | "ToothRequired" | "ToothInvalid";
	readonly errorMessage: string;
	readonly normalizedCode?: string | undefined;
	readonly item?: DentalIcd10Item | undefined;
	readonly teeth?: number[] | undefined;
}

export type Icd10ValidationResult = Icd10ValidationSuccess | Icd10ValidationFailure;

export class Icd10MatchingEngine {
	/**
	 * Нормализация кода МКБ-10 (преобразование русской 'К'/'к' в латинскую 'K', удаление пробелов, форматирование точек).
	 */
	public static normalizeCode(raw: unknown): string {
		if (typeof raw !== "string" && typeof raw !== "number") {
			return "";
		}
		let str = String(raw).trim();
		if (!str) return "";

		// Замена русских К/к на латинскую K
		str = str.replace(/^[Кк]/u, "K").toUpperCase();

		// Удаляем лишние спецсимволы по краям
		str = str.replace(/^[^\w]+|[^\w]+$/g, "");

		// Если код вида K021 или K0402 -> вставляем точку после первых 3 символов
		if (/^K\d{3,4}$/i.test(str)) {
			str = `${str.slice(0, 3)}.${str.slice(3)}`;
		}

		return str;
	}

	/**
	 * Проверка валидности номера зуба по стандарту FDI (ISO 3950).
	 */
	public static isValidFdiTooth(toothNumber: number): boolean {
		return Number.isInteger(toothNumber) && ALL_VALID_FDI_TEETH.has(toothNumber);
	}

	/**
	 * Извлекает номер зуба FDI из текстовой строки поискового запроса.
	 */
	public static parseQuery(rawQuery: string): Icd10ParsedQuery {
		const trimmed = rawQuery.trim();
		if (!trimmed) {
			return {
				rawQuery: "",
				cleanedQuery: "",
				extractedToothNumber: null,
				extractedToothRaw: null,
				normalizedCodeCandidate: null,
			};
		}

		let cleaned = trimmed;
		let extractedTooth: number | null = null;
		let extractedToothRaw: string | null = null;

		// 1. Поиск шаблонов с явным указанием зуба: "зуб 16", "зуба 46", "зуб №24", "d36", "#16"
		const explicitToothRegex = /(?:^|[^\p{L}\p{N}])(?:зубы?|зуба|зубов|teeth|tooth|dens|[dD]|№|#)\s*([1-8][1-8])(?=[^\p{L}\p{N}]|$)/iu;
		const explicitMatch = cleaned.match(explicitToothRegex);
		if (explicitMatch && explicitMatch[1]) {
			const candidate = Number.parseInt(explicitMatch[1], 10);
			if (Icd10MatchingEngine.isValidFdiTooth(candidate)) {
				extractedTooth = candidate;
				extractedToothRaw = explicitMatch[1];
				cleaned = cleaned.replace(explicitToothRegex, " ").trim();
			}
		}

		// 2. Если явного префикса не было, ищем отдельно стоящее двузначное число (11-48 или 51-85)
		if (extractedTooth === null) {
			const standaloneRegex = /(?:^|[^\p{L}\p{N}])([1-8][1-8])(?=[^\p{L}\p{N}]|$)/u;
			const standaloneMatch = cleaned.match(standaloneRegex);
			if (standaloneMatch && standaloneMatch[1]) {
				const candidate = Number.parseInt(standaloneMatch[1], 10);
				if (Icd10MatchingEngine.isValidFdiTooth(candidate)) {
					extractedTooth = candidate;
					extractedToothRaw = standaloneMatch[1];
					cleaned = cleaned.replace(standaloneRegex, " ").trim();
				}
			}
		}

		// 3. Удаляем двойные пробелы
		cleaned = cleaned.replace(/\s+/g, " ").trim();

		// 4. Проверяем, не является ли весь очищенный запрос кодом МКБ-10
		const normalizedCandidate = Icd10MatchingEngine.normalizeCode(cleaned);
		const isCodeCandidate = /^K\d{2}(\.\d{1,4})?$/i.test(normalizedCandidate);

		return {
			rawQuery: trimmed,
			cleanedQuery: cleaned,
			extractedToothNumber: extractedTooth,
			extractedToothRaw: extractedToothRaw,
			normalizedCodeCandidate: isCodeCandidate ? normalizedCandidate : null,
		};
	}

	/**
	 * Расчет расстояния Левенштейна для нечеткого поиска с опечатками.
	 */
	public static levenshteinDistance(a: string, b: string): number {
		if (a === b) return 0;
		if (a.length === 0) return b.length;
		if (b.length === 0) return a.length;

		const matrix: number[][] = [];

		for (let i = 0; i <= b.length; i++) {
			const row: number[] = [i];
			matrix[i] = row;
		}

		for (let j = 0; j <= a.length; j++) {
			const row0 = matrix[0];
			if (row0) {
				row0[j] = j;
			}
		}

		for (let i = 1; i <= b.length; i++) {
			const prevRow = matrix[i - 1];
			const currRow = matrix[i];
			if (!prevRow || !currRow) continue;

			for (let j = 1; j <= a.length; j++) {
				const charB = b.charAt(i - 1);
				const charA = a.charAt(j - 1);
				if (charB === charA) {
					currRow[j] = prevRow[j - 1] ?? 0;
				} else {
					const replaceCost = (prevRow[j - 1] ?? 0) + 1;
					const insertCost = (currRow[j - 1] ?? 0) + 1;
					const deleteCost = (prevRow[j] ?? 0) + 1;
					currRow[j] = Math.min(replaceCost, insertCost, deleteCost);
				}
			}
		}

		const lastRow = matrix[b.length];
		return lastRow?.[a.length] ?? Math.max(a.length, b.length);
	}

	/**
	 * Интеллектуальный многословный нечеткий поиск по каталогу МКБ-10.
	 */
	public static search(
		rawQuery: string,
		options: Icd10SearchOptions = {},
	): Icd10SearchResult[] {
		const parsed = Icd10MatchingEngine.parseQuery(rawQuery);
		const query = parsed.cleanedQuery.toLowerCase();
		const codeCandidate = parsed.normalizedCodeCandidate;

		const activeTooth = options.selectedToothNumber ?? parsed.extractedToothNumber;
		const limit = options.limit ?? 50;

		let catalog = DENTAL_ICD10_CATALOG;

		// Фильтрация по специальности
		if (options.specialty) {
			catalog = catalog.filter((item) => item.specialty === options.specialty);
		}

		// Фильтрация по базовой рубрике (K02, K04, K05 и т.д.)
		if (options.rubric) {
			const normalizedRubric = options.rubric.toUpperCase().replace(/^К/, "K");
			catalog = catalog.filter((item) => item.rubric === normalizedRubric);
		}

		// Фильтрация по тяжести
		if (options.severity) {
			catalog = catalog.filter((item) => item.severity === options.severity);
		}

		// Фильтрация только зубоспецифичных
		if (options.requiresToothOnly) {
			catalog = catalog.filter((item) => item.requiresTooth);
		}

		// Если строка поиска пуста, возвращаем отсортированный каталог по популярности
		if (!query && !codeCandidate) {
			return catalog
				.map((item) => {
					let score = item.popular ? 100 : 50;
					if (activeTooth && item.requiresTooth) {
						score += 20;
					}
					return {
						item,
						score,
						matchedBy: "title" as const,
						highlightedTerms: [],
					};
				})
				.sort((a, b) => b.score - a.score)
				.slice(0, limit);
		}

		// Фильтрация стоп-слов для клинического текста и многословных фраз
		const STOP_WORDS = new Set([
			"пациент", "жалуется", "жалобы", "жалоба", "на", "в", "во", "области", "область",
			"характера", "характер", "от", "и", "с", "со", "по", "для", "при", "после",
			"дня", "дней", "зуб", "зуба", "зубов", "полости", "рта", "также", "отмечает",
			"анамнез", "осмотр", "обнаружено", "обнаружена", "клиника", "симптомы",
		]);

		const rawWords = query.split(/[\s,.;:!?()/-]+/).filter((w) => w.length > 0);
		// Если все слова стоп-слова, оставляем исходные, иначе фильтруем
		const filteredWords = rawWords.filter((w) => !STOP_WORDS.has(w));
		const queryWords = filteredWords.length > 0 ? filteredWords : rawWords;

		const results: Icd10SearchResult[] = [];

		for (const item of catalog) {
			let maxScore = 0;
			let matchedBy: Icd10SearchResult["matchedBy"] = "fuzzy";
			const matchedTerms: string[] = [];

			const itemCodeNorm = item.code.toUpperCase();
			const itemRubricNorm = item.rubric.toUpperCase();
			const itemTitleLower = item.titleRu.toLowerCase();
			const itemShortLower = item.shortTitleRu.toLowerCase();
			const itemDescLower = item.description.toLowerCase();

			// 1. ПРЯМОЙ МАТЧ ПО КОДУ МКБ-10
			if (codeCandidate) {
				if (itemCodeNorm === codeCandidate) {
					maxScore = 2000;
					matchedBy = "code";
					matchedTerms.push(item.code);
				} else if (itemCodeNorm.startsWith(codeCandidate)) {
					maxScore = 1500;
					matchedBy = "code";
					matchedTerms.push(item.code);
				} else if (itemRubricNorm === codeCandidate || itemRubricNorm === codeCandidate.slice(0, 3)) {
					maxScore = 800;
					matchedBy = "rubric";
					matchedTerms.push(item.rubric);
				}
			}

			// 2. ПОИСК ПО КОДУ В ТЕКСТОВОМ ВИДЕ
			if (itemCodeNorm.toLowerCase().includes(query)) {
				const codeScore = 1200 + (itemCodeNorm.toLowerCase() === query ? 500 : 0);
				if (codeScore > maxScore) {
					maxScore = codeScore;
					matchedBy = "code";
					matchedTerms.push(item.code);
				}
			}

			// 3. МНОГОСЛОВНЫЙ ПОИСК ПО НАИМЕНОВАНИЮ И СИНОНИМАМ
			if (queryWords.length > 0) {
				let wordsMatchedCount = 0;
				let wordScoreAccumulator = 0;

				for (const qWord of queryWords) {
					let wordMatched = false;

					// Проверка точного вхождения слова в название
					if (itemTitleLower.includes(qWord) || itemShortLower.includes(qWord)) {
						wordMatched = true;
						wordScoreAccumulator += qWord.length >= 4 ? 300 : 150;
						if (itemShortLower.startsWith(qWord) || itemTitleLower.startsWith(qWord)) {
							wordScoreAccumulator += 100;
						}
						matchedTerms.push(qWord);
					}

					// Проверка совпадения со списком синонимов
					for (const syn of item.synonyms) {
						const synLower = syn.toLowerCase();
						if (synLower.includes(qWord)) {
							wordMatched = true;
							wordScoreAccumulator += 250;
							if (synLower === qWord || synLower.startsWith(qWord)) {
								wordScoreAccumulator += 150;
							}
							matchedTerms.push(qWord);
							break;
						}
					}

					// Проверка описания
					if (!wordMatched && itemDescLower.includes(qWord)) {
						wordMatched = true;
						wordScoreAccumulator += 120;
						matchedTerms.push(qWord);
					}

					// Нечеткий поиск (Fuzzy Levenshtein) для опечаток при длине слова >= 4
					if (!wordMatched && qWord.length >= 4) {
						const candidateWords = [
							...itemTitleLower.split(/[\s,()/-]+/),
							...itemShortLower.split(/[\s,()/-]+/),
							...item.synonyms.flatMap((s) => s.toLowerCase().split(/[\s,()/-]+/)),
						];

						for (const cWord of candidateWords) {
							if (Math.abs(cWord.length - qWord.length) <= 2) {
								const dist = Icd10MatchingEngine.levenshteinDistance(qWord, cWord);
								const maxAllowedDist = qWord.length >= 6 ? 2 : 1;
								if (dist <= maxAllowedDist) {
									wordMatched = true;
									wordScoreAccumulator += 150 - dist * 40;
									matchedTerms.push(qWord);
									break;
								}
							}
						}
					}

					if (wordMatched) {
						wordsMatchedCount++;
					}
				}

				// Если слова запроса совпали — даем взвешенный скор
				if (wordsMatchedCount === queryWords.length && queryWords.length > 0) {
					const totalTextScore = wordScoreAccumulator + 500;
					if (totalTextScore > maxScore) {
						maxScore = totalTextScore;
						matchedBy = matchedBy === "code" ? "code" : "title";
					}
				} else if (wordsMatchedCount > 0) {
					const matchRatio = wordsMatchedCount / queryWords.length;
					const partialScore = wordScoreAccumulator * (0.5 + 0.5 * matchRatio);
					if (partialScore > maxScore) {
						maxScore = partialScore;
						matchedBy = "title";
					}
				}
			}

			// Если есть совпадение, применяем контекстные веса
			if (maxScore > 0) {
				if (item.popular) {
					maxScore += 40;
				}

				if (activeTooth && item.requiresTooth) {
					maxScore += 60;
				}

				if (
					(item.severity === "critical" || item.severity === "high") &&
					/(остр|бол|гной|пульп|ночн|срочн|приступ)/i.test(query)
				) {
					maxScore += 150;
				}

				results.push({
					item,
					score: Math.round(maxScore),
					matchedBy,
					highlightedTerms: Array.from(new Set(matchedTerms)),
				});
			}
		}

		return results.sort((a, b) => b.score - a.score).slice(0, limit);
	}

	/**
	 * Автоматический анализ дневниковых записей врача или жалоб пациента для рекомендации диагноза МКБ-10.
	 */
	public static autoMatchFromClinicalText(clinicalText: string): {
		primaryMatch: DentalIcd10Item | null;
		detectedToothNumber: number | null;
		allMatches: Icd10SearchResult[];
		confidence: number;
	} {
		if (!clinicalText || !clinicalText.trim()) {
			return {
				primaryMatch: null,
				detectedToothNumber: null,
				allMatches: [],
				confidence: 0,
			};
		}

		const parsed = Icd10MatchingEngine.parseQuery(clinicalText);
		const searchResults = Icd10MatchingEngine.search(parsed.cleanedQuery, {
			selectedToothNumber: parsed.extractedToothNumber,
			limit: 10,
		});

		const top = searchResults[0];
		if (!top) {
			return {
				primaryMatch: null,
				detectedToothNumber: parsed.extractedToothNumber,
				allMatches: [],
				confidence: 0,
			};
		}

		const baseConfidence = top.score / 600;
		const confidence = Math.min(0.99, Math.max(0.2, Number(baseConfidence.toFixed(2))));

		return {
			primaryMatch: top.item,
			detectedToothNumber: parsed.extractedToothNumber,
			allMatches: searchResults,
			confidence,
		};
	}

	/**
	 * Клиническая валидация выбранного кода МКБ-10 и привязки к зубу FDI перед подписанием 043/у.
	 */
	public static validateSelection(
		code: unknown,
		toothInput?: unknown,
	): Icd10ValidationResult {
		const rawCodeStr = typeof code === "string" ? code.trim() : code != null ? String(code).trim() : "";

		if (!rawCodeStr) {
			return {
				isValid: false,
				errorCode: "Icd10Required",
				errorMessage: "Укажите код диагноза по МКБ-10 для заполнения протокола 043/у.",
			};
		}

		const normalized = Icd10MatchingEngine.normalizeCode(rawCodeStr);
		const item = DENTAL_ICD10_MAP.get(normalized);

		// Проверка стоматологического раздела K00-K14
		const isDental = /^K(0[0-9]|1[0-4])(\.\d{1,4})?$/i.test(normalized);
		if (!isDental) {
			return {
				isValid: false,
				errorCode: "Icd10Invalid",
				errorMessage: `Код «${rawCodeStr}» не входит в стоматологический раздел МКБ-10 (K00–K14).`,
				normalizedCode: normalized,
			};
		}

		const requiresTooth = item?.requiresTooth ?? ["K02", "K04", "K05"].includes(normalized.slice(0, 3));

		// Обработка номеров зубов
		let teeth: number[] = [];
		if (toothInput != null) {
			if (typeof toothInput === "number") {
				if (Icd10MatchingEngine.isValidFdiTooth(toothInput)) {
					teeth = [toothInput];
				} else {
					return {
						isValid: false,
						errorCode: "ToothInvalid",
						errorMessage: `Недопустимый номер зуба FDI: ${toothInput}. Допустимы 11–48 и 51–85.`,
						normalizedCode: normalized,
						item,
					};
				}
			} else {
				const strTooth = String(toothInput).trim();
				if (strTooth) {
					const parsedTooth = Icd10MatchingEngine.parseQuery(strTooth);
					if (parsedTooth.extractedToothNumber) {
						teeth = [parsedTooth.extractedToothNumber];
					} else {
						const num = Number(strTooth);
						if (Icd10MatchingEngine.isValidFdiTooth(num)) {
							teeth = [num];
						} else {
							return {
								isValid: false,
								errorCode: "ToothInvalid",
								errorMessage: `Недопустимый номер зуба «${strTooth}». Требуется двухзначный номер FDI (11–48, 51–85).`,
								normalizedCode: normalized,
								item,
							};
						}
					}
				}
			}
		}

		if (requiresTooth && teeth.length === 0) {
			return {
				isValid: false,
				errorCode: "ToothRequired",
				errorMessage: `Для диагноза ${normalized} (${item?.shortTitleRu ?? "стоматология"}) обязательно указание номера зуба по формуле FDI.`,
				normalizedCode: normalized,
				item,
			};
		}

		return {
			isValid: true,
			normalizedCode: normalized,
			item,
			teeth,
		};
	}

	/**
	 * Получение полной метаинформации о базовой рубрике МКБ-10.
	 */
	public static getRubricMeta(rubricCode: string) {
		const norm = rubricCode.toUpperCase().replace(/^К/, "K");
		return DENTAL_ICD10_RUBRIC_MAP[norm] ?? null;
	}
}
