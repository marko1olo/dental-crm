import type { Icd10ParsedQuery } from "./icd10Types";
import { isValidFdiTooth, normalizeCode } from "./icd10Normalization";

/**
 * Извлекает номер зуба FDI из текстовой строки поискового запроса.
 */
export function parseQuery(rawQuery: string): Icd10ParsedQuery {
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
		if (isValidFdiTooth(candidate)) {
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
			if (isValidFdiTooth(candidate)) {
				extractedTooth = candidate;
				extractedToothRaw = standaloneMatch[1];
				cleaned = cleaned.replace(standaloneRegex, " ").trim();
			}
		}
	}

	// 3. Удаляем двойные пробелы
	cleaned = cleaned.replace(/\s+/g, " ").trim();

	// 4. Проверяем, не является ли весь очищенный запрос кодом МКБ-10
	const normalizedCandidate = normalizeCode(cleaned);
	const isCodeCandidate = /^K\d{2}(\.\d{1,4})?$/i.test(normalizedCandidate);

	return {
		rawQuery: trimmed,
		cleanedQuery: cleaned,
		extractedToothNumber: extractedTooth,
		extractedToothRaw: extractedToothRaw,
		normalizedCodeCandidate: isCodeCandidate ? normalizedCandidate : null,
	};
}
