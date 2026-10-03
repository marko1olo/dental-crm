import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";

/**
 * Статусы привязки исследования КТ/DICOM к пациенту
 */
export type BindingStatus =
	| "auto_bound"
	| "manual_bound"
	| "pending_review"
	| "unassigned";

export interface PatientBindingCandidate {
	patientId: string;
	patientFullName: string;
	confidence: number;
	status: BindingStatus;
	matchMethod: string;
	matchDetails: string;
}

export interface PatientFioBindingResult {
	patientId: string | null;
	patientFullName: string | null;
	confidence: number;
	status: BindingStatus;
	matchMethod: string;
	matchDetails: string;
	candidates?: Array<{
		patientId: string;
		patientFullName: string;
		confidence: number;
	}>;
}

export interface AutoBindScanSummary {
	scanned: number;
	autoBound: number;
	pendingReview: number;
	unassigned: number;
	results: Array<{
		studyId: string;
		patientId: string | null;
		patientFullName: string | null;
		status: BindingStatus;
		confidence: number;
		matchMethod: string;
	}>;
}

// ─── 1. ТРАНСЛИТЕРАЦИЯ И НОРМАЛИЗАЦИЯ ИМЕНИ ─────────────────────────────────────

const RU_TO_EN_MAP: Record<string, string> = {
	а: "a",
	б: "b",
	в: "v",
	г: "g",
	д: "d",
	е: "e",
	ё: "yo",
	ж: "zh",
	з: "z",
	и: "i",
	й: "y",
	к: "k",
	л: "l",
	м: "m",
	н: "n",
	о: "o",
	п: "p",
	р: "r",
	с: "s",
	т: "t",
	у: "u",
	ф: "f",
	х: "kh",
	ц: "ts",
	ч: "ch",
	ш: "sh",
	щ: "shch",
	ъ: "",
	ы: "y",
	ь: "",
	э: "e",
	ю: "yu",
	я: "ya",
};

const EN_MULTI_TO_RU: Array<[RegExp, string]> = [
	[/shch/gi, "щ"],
	[/sch/gi, "щ"],
	[/shh/gi, "щ"],
	[/yo/gi, "ё"],
	[/jo/gi, "ё"],
	[/zh/gi, "ж"],
	[/kh/gi, "х"],
	[/ts/gi, "ц"],
	[/tz/gi, "ц"],
	[/tc/gi, "ц"],
	[/ch/gi, "ч"],
	[/tch/gi, "ч"],
	[/sh/gi, "ш"],
	[/yu/gi, "ю"],
	[/iu/gi, "ю"],
	[/ju/gi, "ю"],
	[/ya/gi, "я"],
	[/ia/gi, "я"],
	[/ja/gi, "я"],
	[/ye/gi, "е"],
	[/je/gi, "е"],
	[/ks/gi, "кс"],
	[/iy\b/gi, "ий"],
	[/ij\b/gi, "ий"],
	[/yy\b/gi, "ый"],
	[/y\b/gi, "ий"],
];

const EN_SINGLE_TO_RU: Record<string, string> = {
	a: "а",
	b: "б",
	v: "в",
	w: "в",
	g: "г",
	d: "д",
	e: "е",
	z: "з",
	i: "и",
	j: "й",
	k: "к",
	l: "л",
	m: "м",
	n: "н",
	o: "о",
	p: "п",
	r: "р",
	s: "с",
	t: "т",
	u: "у",
	f: "ф",
	h: "х",
	c: "к",
	x: "кс",
	y: "и",
};

/**
 * Каноническая фонетическая нормализация латиницы для устранения вариаций транслита (ГОСТ 7.79 / ISO 9 / ICAO)
 */
export function canonicalizeTranslit(word: string): string {
	let s = word.toLowerCase().trim();
	s = s.replace(/shch|sch|shh/g, "shch");
	s = s.replace(/kh/g, "h");
	s = s.replace(/ts|tz|tc/g, "c");
	s = s.replace(/ch|tch/g, "ch");
	s = s.replace(/ya|ia|ja/g, "ya");
	s = s.replace(/yu|iu|ju/g, "yu");
	s = s.replace(/ye|je/g, "e");
	s = s.replace(/yo|jo/g, "yo");
	s = s.replace(/w/g, "v");
	s = s.replace(/ph/g, "f");
	s = s.replace(/x/g, "ks");
	s = s.replace(/y|j/g, "i");
	// Схлопываем сдвоенные согласные (ff -> f, ll -> l, mm -> m, nn -> n, ss -> s)
	s = s.replace(/([a-z])\1+/g, "$1");
	return s;
}

/**
 * Транслитерация русского текста в латиницу (ГОСТ 7.79 / ICAO)
 */
export function transliterateRuToEn(input: string): string {
	let result = "";
	const lower = input.toLowerCase();
	for (let i = 0; i < lower.length; i++) {
		const char = lower[i]!;
		result += RU_TO_EN_MAP[char] !== undefined ? RU_TO_EN_MAP[char] : char;
	}
	return result;
}

/**
 * Транслитерация латиницы в кириллицу
 */
export function transliterateEnToRu(input: string): string {
	let lower = input.toLowerCase();
	for (const [regex, replacement] of EN_MULTI_TO_RU) {
		lower = lower.replace(regex, replacement);
	}
	let result = "";
	for (let i = 0; i < lower.length; i++) {
		const char = lower[i]!;
		result +=
			EN_SINGLE_TO_RU[char] !== undefined ? EN_SINGLE_TO_RU[char] : char;
	}
	return result;
}

/**
 * Очистка и нормализация имени из DICOM тега (0010,0010) PatientName
 * Поддерживает нормализацию разделителей DICOM (^, ,, /, \, _, ;, |) и точек в инициалах
 */
export function cleanDicomName(raw: string | null | undefined): string {
	if (!raw || typeof raw !== "string") return "";

	let name = raw
		.replace(/\0+$/u, "")
		.replace(/[\^,/\_\\;|]+/g, " ")
		.replace(/\./g, " ")
		.replace(/\s+/g, " ")
		.trim();

	// Удаляем префиксы званий/обращений (MR, MRS, MS, DR, DOCTOR, ПАЦИЕНТ, ПАЦИЕНТКА, РЕБЕНОК)
	name = name.replace(/^(mr|mrs|ms|dr|doctor|пациент|пациентка|ребенок)\b\.?\s+/iu, "");

	// Удаляем постфиксы исследований в скобках, например "(CT)", "(3D)", "[OPG]"
	name = name.replace(/[\(\[][^()\[\]]*[\)\]]/g, " ");

	// Очищаем от спецсимволов, оставляя только буквы, дефисы и пробелы
	name = name.replace(/[^a-zA-Zа-яА-ЯёЁ0-9\s-]/g, " ");
	return name.replace(/\s+/g, " ").trim();
}

/**
 * Токенизация полного имени (разделение на отдельные слова и инициалы)
 */
export function tokenizeName(name: string): string[] {
	return cleanDicomName(name)
		.toLowerCase()
		.split(/\s+/)
		.filter((t) => t.length > 0);
}

// ─── 2. МЕТРИКИ СХОЖЕСТИ (LEVENSHTEIN & TOKEN OVERLAP) ──────────────────────────

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

// ─── 3. СОПОСТАВЛЕНИЕ ДАТЫ РОЖДЕНИЯ ─────────────────────────────────────────────

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

// ─── 4. РАСЧЕТ ИТОГОВОГО СКОРИНГА И СТАТУСА ПРИВЯЗКИ ─────────────────────────────

export interface ScoredMatch {
	patientId: string;
	patientFullName: string;
	confidence: number;
	rawScore: number;
	exactBirthDateMatch: boolean;
	status: BindingStatus;
	matchMethod: string;
	matchDetails: string;
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

// ─── 5. БАЗОВЫЙ ДВИЖОК ПОИСКА И АВТОПРИВЯЗКИ ─────────────────────────────────────

/**
 * Поиск наиболее подходящего пациента для исследования DICOM в рамках организации
 */
export async function matchPatientForDicom(
	organizationId: string,
	dicomData: {
		dicomPatientName?: string | null;
		dicomPatientId?: string | null;
		dicomBirthDate?: string | null;
	},
): Promise<PatientFioBindingResult> {
	// 1. Поиск по прямому PatientID (только если значение является валидным UUID)
	if (dicomData.dicomPatientId) {
		const trimmedId = dicomData.dicomPatientId.trim();
		const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedId);
		if (isUuid) {
			const [patientById] = await db
				.select({
					id: schema.patients.id,
					fullName: schema.patients.fullName,
					birthDate: schema.patients.birthDate,
					mergedIntoPatientId: schema.patients.mergedIntoPatientId,
				})
				.from(schema.patients)
				.where(
					and(
						eq(schema.patients.organizationId, organizationId),
						eq(schema.patients.id, trimmedId),
					),
				)
				.limit(1);

			if (patientById) {
				const targetId = patientById.mergedIntoPatientId ?? patientById.id;
				return {
					patientId: targetId,
					patientFullName: patientById.fullName,
					confidence: 100,
					status: "auto_bound",
					matchMethod: "dicom_patient_id",
					matchDetails: "Прямое совпадение по номеру/ID карты пациента",
				};
			}
		}

		// 1b. Поиск по номеру карты / ID аппарата (не-UUID безопасный поиск)
		if (!isUuid && trimmedId.length > 0) {
			const [patientByChart] = await db
				.select({
					id: schema.patients.id,
					fullName: schema.patients.fullName,
					birthDate: schema.patients.birthDate,
					mergedIntoPatientId: schema.patients.mergedIntoPatientId,
				})
				.from(schema.patients)
				.where(
					and(
						eq(schema.patients.organizationId, organizationId),
						sql`(${schema.patients.administrativeProfile}->>'chartNumber' = ${trimmedId} 
							OR ${schema.patients.administrativeProfile}->>'vatechPatId' = ${trimmedId}
							OR ${schema.patients.administrativeProfile}->>'medicalCardNumber' = ${trimmedId})`,
					),
				)
				.limit(1);

			if (patientByChart) {
				const targetId = patientByChart.mergedIntoPatientId ?? patientByChart.id;
				return {
					patientId: targetId,
					patientFullName: patientByChart.fullName,
					confidence: 100,
					status: "auto_bound",
					matchMethod: "dicom_chart_number",
					matchDetails: `Точное совпадение по номеру карты/ID аппарата (${trimmedId}): ${patientByChart.fullName}`,
				};
			}
		}
	}

	const cleanedName = cleanDicomName(dicomData.dicomPatientName);
	if (!cleanedName) {
		return {
			patientId: null,
			patientFullName: null,
			confidence: 0,
			status: "unassigned",
			matchMethod: "no_dicom_identity",
			matchDetails: "В заголовке DICOM отсутствует PatientName и PatientID",
		};
	}

	// 2. Получение пациентов клиники для скоринга
	// Выбираем активных пациентов организации
	const allPatients = await db
		.select({
			id: schema.patients.id,
			fullName: schema.patients.fullName,
			birthDate: schema.patients.birthDate,
			mergedIntoPatientId: schema.patients.mergedIntoPatientId,
		})
		.from(schema.patients)
		.where(eq(schema.patients.organizationId, organizationId));

	if (allPatients.length === 0) {
		return {
			patientId: null,
			patientFullName: null,
			confidence: 0,
			status: "unassigned",
			matchMethod: "empty_patient_directory",
			matchDetails: "В клинике нет зарегистрированных пациентов",
		};
	}

	// 3. Вычисление скоров для всех кандидатов
	const candidates: ScoredMatch[] = [];

	for (const p of allPatients) {
		const targetId = p.mergedIntoPatientId ?? p.id;
		const scored = calculateMatchScore(dicomData, {
			id: targetId,
			fullName: p.fullName,
			birthDate: p.birthDate,
		});

		if (scored.confidence >= 50) {
			candidates.push(scored);
		}
	}

	// Сортировка кандидатов по убыванию rawScore и точного соответствия даты рождения
	candidates.sort((a, b) => {
		if (b.rawScore !== a.rawScore) return b.rawScore - a.rawScore;
		if (b.exactBirthDateMatch !== a.exactBirthDateMatch) {
			return b.exactBirthDateMatch ? 1 : -1;
		}
		return b.confidence - a.confidence;
	});

	if (candidates.length === 0) {
		return {
			patientId: null,
			patientFullName: null,
			confidence: 0,
			status: "unassigned",
			matchMethod: "no_matching_candidate",
			matchDetails: `Пациент с именем "${cleanedName}" не найден среди пациентов клиники`,
		};
	}

	const bestCandidate = candidates[0]!;

	// Разруливание полных тезок (гомонимов) по дате рождения:
	// Если есть второй кандидат с близким скором (разница < 8%), проверяем, подтверждена ли дата рождения у лучшего
	if (candidates.length > 1) {
		const secondCandidate = candidates[1]!;
		const isDisambiguatedByBirthDate =
			bestCandidate.exactBirthDateMatch &&
			!secondCandidate.exactBirthDateMatch &&
			bestCandidate.confidence >= 90;

		if (
			!isDisambiguatedByBirthDate &&
			bestCandidate.confidence >= 90 &&
			bestCandidate.confidence - secondCandidate.confidence < 8
		) {
			return {
				patientId: bestCandidate.patientId,
				patientFullName: bestCandidate.patientFullName,
				confidence: bestCandidate.confidence,
				status: "pending_review",
				matchMethod: "homonym_collision_pending_review",
				matchDetails: `Найдено несколько похожих пациентов (${bestCandidate.patientFullName} и ${secondCandidate.patientFullName}). Требуется подтверждение врача.`,
				candidates: candidates.slice(0, 5),
			};
		}
	}

	return {
		patientId:
			bestCandidate.status === "unassigned" ? null : bestCandidate.patientId,
		patientFullName: bestCandidate.patientFullName,
		confidence: bestCandidate.confidence,
		status: bestCandidate.status,
		matchMethod: bestCandidate.matchMethod,
		matchDetails: bestCandidate.matchDetails,
		candidates: candidates.slice(0, 5),
	};
}

/**
 * Пакетное сканирование и автопривязка неразобранных КТ по базе пациентов клиники
 */
export async function autoBindUnassignedStudies(
	organizationId: string,
): Promise<AutoBindScanSummary> {
	// Выбираем неразобранные исследования ('unassigned' или 'pending_review' или patient_id IS NULL)
	const studies = await db
		.select({
			id: schema.imagingStudies.id,
			patientId: schema.imagingStudies.patientId,
			dicomPatientName: schema.imagingStudies.dicomPatientName,
			dicomPatientId: schema.imagingStudies.dicomPatientId,
			dicomBirthDate: schema.imagingStudies.dicomBirthDate,
			bindingStatus: schema.imagingStudies.bindingStatus,
		})
		.from(schema.imagingStudies)
		.where(
			and(
				eq(schema.imagingStudies.organizationId, organizationId),
				or(
					isNull(schema.imagingStudies.patientId),
					inArray(schema.imagingStudies.bindingStatus, [
						"unassigned",
						"pending_review",
					]),
				),
			),
		);

	const summary: AutoBindScanSummary = {
		scanned: studies.length,
		autoBound: 0,
		pendingReview: 0,
		unassigned: 0,
		results: [],
	};

	for (const study of studies) {
		const matchResult = await matchPatientForDicom(organizationId, {
			dicomPatientName: study.dicomPatientName,
			dicomPatientId: study.dicomPatientId,
			dicomBirthDate: study.dicomBirthDate,
		});

		let newStatus: BindingStatus = matchResult.status;
		let assignedPatientId = matchResult.patientId;

		if (matchResult.status === "auto_bound" && assignedPatientId) {
			summary.autoBound++;
			await db
				.update(schema.imagingStudies)
				.set({
					patientId: assignedPatientId,
					bindingStatus: "auto_bound",
					bindingConfidence: matchResult.confidence,
					aiSummary: `Автопривязано к пациенту: ${matchResult.patientFullName} (${matchResult.matchMethod}). ${matchResult.matchDetails}`,
				})
				.where(eq(schema.imagingStudies.id, study.id));
		} else if (matchResult.status === "pending_review") {
			summary.pendingReview++;
			await db
				.update(schema.imagingStudies)
				.set({
					patientId: assignedPatientId ?? study.patientId,
					bindingStatus: "pending_review",
					bindingConfidence: matchResult.confidence,
					aiSummary: `Требует подтверждения врача: кандидат ${matchResult.patientFullName ?? "не определен"} (${matchResult.confidence}%). ${matchResult.matchDetails}`,
				})
				.where(eq(schema.imagingStudies.id, study.id));
		} else {
			summary.unassigned++;
			newStatus = "unassigned";
			assignedPatientId = null;
		}

		summary.results.push({
			studyId: study.id,
			patientId: assignedPatientId,
			patientFullName: matchResult.patientFullName,
			status: newStatus,
			confidence: matchResult.confidence,
			matchMethod: matchResult.matchMethod,
		});
	}

	return summary;
}
