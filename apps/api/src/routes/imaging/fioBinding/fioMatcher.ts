/**
 * @file fioMatcher.ts
 * @description Fuzzy matching algorithms, Levenshtein distance, token overlap heuristics,
 * and birth date disambiguation for radiology and DICOM patient identification.
 */

import type { BindingStatus, ScoredMatch } from "./types.js";
import {
	canonicalizeTranslit,
	cleanDicomName,
	tokenizeName,
	transliterateEnToRu,
	transliterateRuToEn,
} from "./translitUtils.js";

/**
 * Вычисление расстояния Левенштейна
 */
export function levenshteinDistance(s1: string, s2: string): number {
	const len1 = s1.length;
	const len2 = s2.length;
	if (len1 === 0) return len2;
	if (len2 === 0) return len1;

	const matrix: number[][] = [];
	for (let i = 0; i <= len1; i++) {
		matrix[i] = [i];
	}
	for (let j = 0; j <= len2; j++) {
		matrix[0]![j] = j;
	}

	for (let i = 1; i <= len1; i++) {
		for (let j = 1; j <= len2; j++) {
			const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
			matrix[i]![j] = Math.min(
				matrix[i - 1]![j]! + 1,
				matrix[i]![j - 1]! + 1,
				matrix[i - 1]![j - 1]! + cost,
			);
		}
	}

	return matrix[len1]![len2]!;
}

/**
 * Нормализованная схожесть двух строк (0.0 .. 1.0)
 */
export function stringSimilarity(s1: string, s2: string): number {
	const a = s1.trim().toLowerCase();
	const b = s2.trim().toLowerCase();
	if (a === b) return 1.0;
	if (a.length === 0 || b.length === 0) return 0.0;
	const dist = levenshteinDistance(a, b);
	const maxLen = Math.max(a.length, b.length);
	return Math.max(0, 1 - dist / maxLen);
}

/**
 * Сопоставление двух токенов с учетом транслитерации
 */
export function matchSingleWord(w1: string, w2: string): number {
	if (w1 === w2) return 1.0;

	// Сравнение напрямую
	const simDirect = stringSimilarity(w1, w2);
	if (simDirect > 0.85) return simDirect;

	// Сравнение через латиницу
	const en1 = transliterateRuToEn(w1);
	const en2 = transliterateRuToEn(w2);
	const simEn = stringSimilarity(en1, en2);
	if (simEn > 0.85) return simEn;

	// Сравнение через каноническую фонетическую нормализацию
	const can1 = canonicalizeTranslit(en1);
	const can2 = canonicalizeTranslit(en2);
	const simCan = stringSimilarity(can1, can2);
	if (simCan > 0.85) return simCan;

	// Сравнение через кириллицу
	const ru1 = transliterateEnToRu(w1);
	const ru2 = transliterateEnToRu(w2);
	const simRu = stringSimilarity(ru1, ru2);

	return Math.max(simDirect, simEn, simCan, simRu);
}

/**
 * Сравнение наборов токенов ФИО (независимо от порядка слов)
 */
export function compareFioTokens(dicomRaw: string, patientRaw: string): number {
	const dicomTokens = tokenizeName(dicomRaw);
	const patientTokens = tokenizeName(patientRaw);

	if (dicomTokens.length === 0 || patientTokens.length === 0) {
		return 0;
	}

	// 1. Прямая точная нормализация строк
	const directSim = stringSimilarity(
		transliterateRuToEn(dicomTokens.join(" ")),
		transliterateRuToEn(patientTokens.join(" ")),
	);
	if (directSim >= 0.95) return 100;

	// 1b. Сравнение с сортировкой токенов (независимость от порядка Фамилия Имя vs Имя Фамилия)
	const sortedDicom = [...dicomTokens].sort().join(" ");
	const sortedPatient = [...patientTokens].sort().join(" ");
	const sortedSim = stringSimilarity(
		canonicalizeTranslit(transliterateRuToEn(sortedDicom)),
		canonicalizeTranslit(transliterateRuToEn(sortedPatient)),
	);
	if (sortedSim >= 0.95) return 100;

	// 2. Если в DICOM только одно слово (например "Amirova" или "Захаров")
	if (dicomTokens.length === 1) {
		const singleWord = dicomTokens[0]!;
		let bestWordScore = 0;
		for (const pToken of patientTokens) {
			const score = matchSingleWord(singleWord, pToken);
			if (score > bestWordScore) bestWordScore = score;
		}
		// Одно слово дает максимум 80% уверенности, если нет даты рождения
		return Math.round(bestWordScore * 80);
	}

	// 3. Жадное сопоставление каждого токена DICOM с лучшим токеном пациента
	let matchedSum = 0;
	const usedPatientIndices = new Set<number>();

	for (const dToken of dicomTokens) {
		let bestScore = 0;
		let bestIdx = -1;

		for (let pIdx = 0; pIdx < patientTokens.length; pIdx++) {
			if (usedPatientIndices.has(pIdx)) continue;
			const pToken = patientTokens[pIdx]!;

			// Проверка на инициал: если токен DICOM длиной 1 символ (например "I")
			if (dToken.length === 1 && pToken.length > 1) {
				const dChar = transliterateRuToEn(dToken);
				const pChar = transliterateRuToEn(pToken[0]!);
				if (dChar === pChar) {
					if (bestScore < 0.9) {
						bestScore = 0.9;
						bestIdx = pIdx;
					}
					continue;
				}
			}

			const score = matchSingleWord(dToken, pToken);
			if (score > bestScore) {
				bestScore = score;
				bestIdx = pIdx;
			}
		}

		if (bestIdx !== -1 && bestScore >= 0.6) {
			matchedSum += bestScore;
			usedPatientIndices.add(bestIdx);
		}
	}

	const requiredTokens = Math.min(dicomTokens.length, patientTokens.length);
	if (requiredTokens === 0) return 0;

	const tokenOverlapRatio = matchedSum / requiredTokens;
	return Math.min(100, Math.round(tokenOverlapRatio * 100));
}

/**
 * Нормализация строки даты к виду { fullIso: "YYYY-MM-DD" | null, year: number | null }
 */
export function normalizeBirthDate(
	dateStr: string | null | undefined,
): { fullIso: string | null; year: number | null } {
	if (!dateStr || typeof dateStr !== "string") {
		return { fullIso: null, year: null };
	}

	const digitsOnly = dateStr.replace(/\D/g, "");

	// Формат DICOM: YYYYMMDD (например 19850412)
	if (digitsOnly.length === 8) {
		const year = Number.parseInt(digitsOnly.slice(0, 4), 10);
		const month = Number.parseInt(digitsOnly.slice(4, 6), 10);
		const day = Number.parseInt(digitsOnly.slice(6, 8), 10);

		if (year >= 1900 && year <= 2030 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
			const mStr = month.toString().padStart(2, "0");
			const dStr = day.toString().padStart(2, "0");
			return { fullIso: `${year}-${mStr}-${dStr}`, year };
		}

		// Формат DDMMYYYY
		const altDay = Number.parseInt(digitsOnly.slice(0, 2), 10);
		const altMonth = Number.parseInt(digitsOnly.slice(2, 4), 10);
		const altYear = Number.parseInt(digitsOnly.slice(4, 8), 10);
		if (altYear >= 1900 && altYear <= 2030 && altMonth >= 1 && altMonth <= 12 && altDay >= 1 && altDay <= 31) {
			const mStr = altMonth.toString().padStart(2, "0");
			const dStr = altDay.toString().padStart(2, "0");
			return { fullIso: `${altYear}-${mStr}-${dStr}`, year: altYear };
		}
	}

	// Попытка извлечь 4-значный год
	const yearMatch = dateStr.match(/\b(19\d{2}|20\d{2})\b/);
	if (yearMatch && yearMatch[1]) {
		const year = Number.parseInt(yearMatch[1], 10);
		return { fullIso: null, year };
	}

	return { fullIso: null, year: null };
}

/**
 * Оценка совпадения даты рождения
 */
export function evaluateBirthDateScore(
	dicomBirthDate: string | null | undefined,
	patientBirthDate: string | null | undefined,
): { bonus: number; conflict: boolean; explanation: string } {
	const dNorm = normalizeBirthDate(dicomBirthDate);
	const pNorm = normalizeBirthDate(patientBirthDate);

	if (!dNorm.year || !pNorm.year) {
		return {
			bonus: 0,
			conflict: false,
			explanation: "Дата рождения не указана в одном из источников",
		};
	}

	// Точное совпадение полной даты (день, месяц, год)
	if (dNorm.fullIso && pNorm.fullIso && dNorm.fullIso === pNorm.fullIso) {
		return {
			bonus: 30,
			conflict: false,
			explanation: `Точное совпадение даты рождения (${dNorm.fullIso})`,
		};
	}

	// Совпадение года рождения (день/месяц отличаются или не указаны в одном из источников)
	if (dNorm.year === pNorm.year) {
		return {
			bonus: 15,
			conflict: false,
			explanation: `Совпадение года рождения (${dNorm.year}), день/месяц отличаются или не указаны`,
		};
	}

	// Конфликт дат рождения (разные годы, разница > 1 года)
	if (Math.abs(dNorm.year - pNorm.year) > 1) {
		return {
			bonus: -40,
			conflict: true,
			explanation: `Конфликт года рождения: DICOM ${dNorm.year} vs Пациент ${pNorm.year}`,
		};
	}

	return { bonus: 0, conflict: false, explanation: "Близкие даты" };
}

/**
 * Расчет доверительного скоринга для конкретного пациента
 */
export function calculateMatchScore(
	dicom: {
		dicomPatientName?: string | null;
		dicomPatientId?: string | null;
		dicomBirthDate?: string | null;
	},
	patient: {
		id: string;
		fullName: string;
		birthDate?: string | null;
	},
): ScoredMatch {
	// 1. Проверка по DICOM PatientID (0010,0020)
	if (dicom.dicomPatientId) {
		const trimmedPid = dicom.dicomPatientId.trim().toLowerCase();
		if (trimmedPid === patient.id.toLowerCase()) {
			return {
				patientId: patient.id,
				patientFullName: patient.fullName,
				confidence: 100,
				rawScore: 100,
				exactBirthDateMatch: true,
				status: "auto_bound",
				matchMethod: "dicom_patient_id_exact",
				matchDetails: "Точное совпадение PatientID с UUID карты пациента в CRM",
			};
		}
	}

	// 2. Расчет сходства по ФИО
	const fioScore = compareFioTokens(
		dicom.dicomPatientName ?? "",
		patient.fullName,
	);

	// 3. Анализ даты рождения
	const birthDateEval = evaluateBirthDateScore(
		dicom.dicomBirthDate,
		patient.birthDate,
	);

	const exactBirthDateMatch = birthDateEval.bonus === 30 && !birthDateEval.conflict;
	let totalScore = fioScore + birthDateEval.bonus;

	// При конфликте даты рождения блокируем автопривязку
	if (birthDateEval.conflict) {
		totalScore = Math.min(totalScore, 50);
	}

	// Ограничиваем диапазон 0..100
	totalScore = Math.max(0, Math.min(100, totalScore));

	let status: BindingStatus = "unassigned";
	let matchMethod = "fio_similarity";

	if (totalScore >= 90) {
		status = "auto_bound";
		matchMethod =
			birthDateEval.bonus > 0 ? "fio_and_birthdate_exact" : "fio_high_confidence";
	} else if (totalScore >= 60) {
		status = "pending_review";
		matchMethod = "fio_partial_match";
	} else {
		status = "unassigned";
		matchMethod = "low_similarity";
	}

	const details = `ФИО схожесть: ${fioScore}%. ${birthDateEval.explanation}. Итоговый скор: ${totalScore}%`;

	return {
		patientId: patient.id,
		patientFullName: patient.fullName,
		confidence: totalScore,
		rawScore: fioScore + birthDateEval.bonus,
		exactBirthDateMatch,
		status,
		matchMethod,
		matchDetails: details,
	};
}
