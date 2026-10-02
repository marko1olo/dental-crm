/**
 * dicomPatientMatcher.ts — Стохастический и нечеткий матчер папок и пациентов томографов.
 *
 * ФУНКЦИОНАЛ:
 * 1. Интеллектуальный парсинг имен папок популярных томографов:
 *    - Vatech EzDent-i: "Иванов_И_И_19851214_CT", "EzDent-i_Export_20261002_001_Ivanov_Ivan"
 *    - Planmeca Romexis: "IVANOV_IVAN_14121985", "Romexis_109283_Kuznetsov_A_V"
 *    - Dentsply Sirona Sidexis: "10482_Petrov_20261002", "SIDEXIS_PAT_003849_Petrov_Petr_19910520"
 *    - KaVo, Morita, Gendex: "SMILE_DENTAL_002948_Sidorov", "Smirnova_19900315_3D"
 * 2. Нечеткое сопоставление (Fuzzy Levenshtein + Bigram/Trigram + фонетическая транслитерация ГОСТ 7.79 / МВД).
 * 3. Парсинг дат рождения во всех форматах: YYYYMMDD, DDMMYYYY, YYYY-MM-DD, DD.MM.YYYY, YYYY.MM.DD.
 * 4. Скоринг и градации уверенности (Confidence Score 0..100%):
 *    - > 85%: "auto_bound" (авто-привязка к карточке пациента и ЭМК 043/у)
 *    - 60–85%: "pending_review" (1-клик подтверждение врачу «Обнаружено КТ для пациента Иванов И.И. Связать? [Да / Выбрать другого]»)
 *    - < 60%: "unassigned" (входящая очередь нераспознанных снимков)
 */

export type TomographMatchStatus = "auto_bound" | "pending_review" | "unassigned";

export interface TomographFolderHint {
	rawName: string;
	extractedName: string | null;
	extractedBirthDate: string | null; // ISO YYYY-MM-DD
	extractedStudyDate: string | null; // ISO YYYY-MM-DD
	extractedPatientId: string | null;
	detectedManufacturer: string | null;
	modalityHint: string | null;
}

export interface PatientCandidateItem {
	id: string;
	fullName: string;
	birthDate?: string | null;
	phone?: string | null;
}

export interface MatchScoreResult {
	patientId: string | null;
	patientFullName: string | null;
	confidence: number; // 0..100
	status: TomographMatchStatus;
	matchMethod: string;
	matchDetails: string;
	candidates: Array<{
		patientId: string;
		patientFullName: string;
		confidence: number;
		matchDetails: string;
	}>;
}

// ─── 1. ТРАНСЛИТЕРАЦИЯ ГОСТ 7.79 / МВД / ICAO ───────────────────────────────────

const RU_TO_EN_MAP: Record<string, string> = {
	а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e",
	ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
	н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
	ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch",
	ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export function transliterateRuToEn(text: string): string {
	let res = "";
	const lower = text.toLowerCase();
	for (let i = 0; i < lower.length; i++) {
		const ch = lower[i]!;
		res += RU_TO_EN_MAP[ch] !== undefined ? RU_TO_EN_MAP[ch] : ch;
	}
	return res;
}

const PHONETIC_EN_REPLACEMENTS: Array<[RegExp, string]> = [
	[/shch/gi, "щ"],
	[/sch/gi, "щ"],
	[/yo/gi, "е"],
	[/zh/gi, "ж"],
	[/kh/gi, "х"],
	[/ts/gi, "ц"],
	[/tz/gi, "ц"],
	[/tc/gi, "ц"],
	[/ch/gi, "ч"],
	[/sh/gi, "ш"],
	[/yu/gi, "ю"],
	[/ju/gi, "ю"],
	[/ya/gi, "я"],
	[/ja/gi, "я"],
	[/ye/gi, "е"],
	[/je/gi, "е"],
	[/iy\b/gi, "ий"],
	[/ij\b/gi, "ий"],
	[/yy\b/gi, "ый"],
	[/yj\b/gi, "ый"],
	[/y\b/gi, "ий"],
];

const SINGLE_EN_TO_RU: Record<string, string> = {
	a: "а", b: "б", v: "в", w: "в", g: "г", d: "д", e: "е",
	z: "з", i: "и", j: "й", k: "к", l: "л", m: "м", n: "н",
	o: "о", p: "п", r: "р", s: "с", t: "т", u: "у", f: "ф",
	h: "х", c: "к", x: "кс", y: "и",
};

export function transliterateEnToRu(text: string): string {
	let lower = text.toLowerCase();
	for (const [re, sub] of PHONETIC_EN_REPLACEMENTS) {
		lower = lower.replace(re, sub);
	}
	let res = "";
	for (let i = 0; i < lower.length; i++) {
		const ch = lower[i]!;
		res += SINGLE_EN_TO_RU[ch] !== undefined ? SINGLE_EN_TO_RU[ch] : ch;
	}
	return res;
}

// ─── 2. РАССТОЯНИЕ ЛЕВЕНШТЕЙНА И ДВУГРАММЫ (N-GRAMS) ──────────────────────────

export function levenshteinDistance(a: string, b: string): number {
	const la = a.length;
	const lb = b.length;
	if (la === 0) return lb;
	if (lb === 0) return la;

	const dp: number[][] = [];
	for (let i = 0; i <= la; i++) dp[i] = [i];
	for (let j = 0; j <= lb; j++) dp[0]![j] = j;

	for (let i = 1; i <= la; i++) {
		for (let j = 1; j <= lb; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			dp[i]![j] = Math.min(
				dp[i - 1]![j]! + 1,
				dp[i]![j - 1]! + 1,
				dp[i - 1]![j - 1]! + cost,
			);
		}
	}
	return dp[la]![lb]!;
}

export function stringSimilarity(a: string, b: string): number {
	const sa = a.trim().toLowerCase();
	const sb = b.trim().toLowerCase();
	if (sa === sb) return 1.0;
	if (!sa.length || !sb.length) return 0.0;
	const dist = levenshteinDistance(sa, sb);
	const maxLen = Math.max(sa.length, sb.length);
	return Math.max(0, 1 - dist / maxLen);
}

/**
 * Dice coefficient по биграммам для устойчивости к перестановкам и мелким опечаткам
 */
export function diceBigramSimilarity(a: string, b: string): number {
	const sa = a.trim().toLowerCase();
	const sb = b.trim().toLowerCase();
	if (sa === sb) return 1.0;
	if (sa.length < 2 || sb.length < 2) return stringSimilarity(sa, sb);

	const getBigrams = (str: string) => {
		const s = new Set<string>();
		for (let i = 0; i < str.length - 1; i++) {
			s.add(str.slice(i, i + 2));
		}
		return s;
	};

	const bgA = getBigrams(sa);
	const bgB = getBigrams(sb);
	let intersection = 0;
	for (const bg of bgA) {
		if (bgB.has(bg)) intersection++;
	}

	return (2 * intersection) / (bgA.size + bgB.size);
}

/**
 * Нечеткое сравнение двух слов с учетом транслитерации и опечаток
 */
export function matchWordsFuzzy(w1: string, w2: string): number {
	const s1 = w1.trim().toLowerCase();
	const s2 = w2.trim().toLowerCase();
	if (s1 === s2) return 1.0;

	// Прямой скор
	const simDirect = Math.max(stringSimilarity(s1, s2), diceBigramSimilarity(s1, s2));
	if (simDirect > 0.88) return simDirect;

	// Сравнение через латиницу
	const en1 = transliterateRuToEn(s1);
	const en2 = transliterateRuToEn(s2);
	const simEn = Math.max(stringSimilarity(en1, en2), diceBigramSimilarity(en1, en2));

	// Сравнение через кириллицу
	const ru1 = transliterateEnToRu(s1);
	const ru2 = transliterateEnToRu(s2);
	const simRu = Math.max(stringSimilarity(ru1, ru2), diceBigramSimilarity(ru1, ru2));

	return Math.max(simDirect, simEn, simRu);
}

// ─── 3. ИНТЕЛЛЕКТУАЛЬНЫЙ ПАРСИНГ ПАПОК ТОМОГРАФОВ ──────────────────────────────

const TOMOGRAPH_MANUFACTURER_PATTERNS: Array<[RegExp, string]> = [
	[/ezdent|vatech|ez3d/i, "Vatech EzDent-i"],
	[/romexis|planmeca/i, "Planmeca Romexis"],
	[/sidexis|sirona|dentsply/i, "Dentsply Sirona Sidexis"],
	[/kavo|exam|op3d|infinix/i, "KaVo"],
	[/morita|veraview/i, "J. Morita"],
	[/gendex|gx/i, "Gendex"],
	[/carestream|cs\s*\d{4}/i, "Carestream CS"],
];

const TOMOGRAPH_STOP_WORDS = new Set([
	"ct", "cbct", "3d", "opg", "rvg", "dcm", "dicom",
	"ezdent", "ez3d", "romexis", "sidexis", "morita", "kavo", "gendex",
	"vatech", "planmeca", "sirona", "carestream",
	"export", "study", "series", "patient", "pat", "scan", "scans",
	"smile", "dental", "clinic", "cabinet", "doctor", "dr", "dent",
	"exam", "examination", "volume", "image", "images", "data",
]);

/**
 * Парсер даты в строке (поддержка YYYYMMDD, DDMMYYYY, YYYY-MM-DD, DD.MM.YYYY, YYYY.MM.DD)
 */
export function parseDateFromString(str: string): { fullIso: string | null; year: number | null } {
	if (!str) return { fullIso: null, year: null };
	const normalized = str.replace(/[_+]/g, " ");

	// 1. Формат с точками или дефисами: DD.MM.YYYY или DD-MM-YYYY
	const dmyMatch = normalized.match(/\b([0-3]?\d)[._/-]([0-1]?\d)[._/-](19\d{2}|20\d{2})\b/);
	if (dmyMatch && dmyMatch[1] && dmyMatch[2] && dmyMatch[3]) {
		const d = Number.parseInt(dmyMatch[1], 10);
		const m = Number.parseInt(dmyMatch[2], 10);
		const y = Number.parseInt(dmyMatch[3], 10);
		if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
			const mm = m.toString().padStart(2, "0");
			const dd = d.toString().padStart(2, "0");
			return { fullIso: `${y}-${mm}-${dd}`, year: y };
		}
	}

	// 2. Формат с точками или дефисами: YYYY.MM.DD или YYYY-MM-DD
	const ymdMatch = normalized.match(/\b(19\d{2}|20\d{2})[._/-]([0-1]?\d)[._/-]([0-3]?\d)\b/);
	if (ymdMatch && ymdMatch[1] && ymdMatch[2] && ymdMatch[3]) {
		const y = Number.parseInt(ymdMatch[1], 10);
		const m = Number.parseInt(ymdMatch[2], 10);
		const d = Number.parseInt(ymdMatch[3], 10);
		if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
			const mm = m.toString().padStart(2, "0");
			const dd = d.toString().padStart(2, "0");
			return { fullIso: `${y}-${mm}-${dd}`, year: y };
		}
	}

	// 3. Компактный 8-значный формат: YYYYMMDD
	const compactYmd = normalized.match(/\b(19\d{2}|20\d{2})([0-1]\d)([0-3]\d)\b/);
	if (compactYmd && compactYmd[1] && compactYmd[2] && compactYmd[3]) {
		const y = Number.parseInt(compactYmd[1], 10);
		const m = Number.parseInt(compactYmd[2], 10);
		const d = Number.parseInt(compactYmd[3], 10);
		if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
			return { fullIso: `${y}-${compactYmd[2]}-${compactYmd[3]}`, year: y };
		}
	}

	// 4. Компактный 8-значный формат: DDMMYYYY
	const compactDmy = normalized.match(/\b([0-3]\d)([0-1]\d)(19\d{2}|20\d{2})\b/);
	if (compactDmy && compactDmy[1] && compactDmy[2] && compactDmy[3]) {
		const d = Number.parseInt(compactDmy[1], 10);
		const m = Number.parseInt(compactDmy[2], 10);
		const y = Number.parseInt(compactDmy[3], 10);
		if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
			return { fullIso: `${y}-${compactDmy[2]}-${compactDmy[1]}`, year: y };
		}
	}

	// 5. Одиночный 4-значный год (1920..2028)
	const yearOnly = normalized.match(/\b(19\d{2}|20[0-2]\d)\b/);
	if (yearOnly && yearOnly[1]) {
		return { fullIso: null, year: Number.parseInt(yearOnly[1], 10) };
	}

	return { fullIso: null, year: null };
}

/**
 * Извлечение клинических подсказок из названия папки томографа
 */
export function parseTomographFolderHint(folderPathOrName: string): TomographFolderHint {
	// Берем базовое имя последней папки
	const baseName = folderPathOrName.split(/[/\\]/).filter(Boolean).pop() ?? folderPathOrName;
	let working = baseName.trim();

	// 1. Определение томографа
	let detectedManufacturer: string | null = null;
	for (const [re, name] of TOMOGRAPH_MANUFACTURER_PATTERNS) {
		if (re.test(working)) {
			detectedManufacturer = name;
			break;
		}
	}

	// 2. Модальность
	let modalityHint: string | null = null;
	if (/cbct|клкт|3d|cone\s*beam/i.test(working)) modalityHint = "CBCT";
	else if (/opg|оптг|pan/i.test(working)) modalityHint = "OPG";
	else if (/rvg|визио/i.test(working)) modalityHint = "RVG";
	else if (/ceph|трг/i.test(working)) modalityHint = "CEPH";
	else if (/(?:^|[^a-zA-Zа-яА-Я0-9])(?:ct|кт)(?:$|[^a-zA-Zа-яА-Я0-9])/i.test(working)) modalityHint = "CT";

	// 3. Извлечение дат
	const currentYear = new Date().getFullYear();
	let extractedBirthDate: string | null = null;
	let extractedStudyDate: string | null = null;

	const normalizedFolder = working.replace(/[_+]/g, " ");

	// Ищем все даты
	const allDateMatches = Array.from(normalizedFolder.matchAll(/\b(?:19\d{2}|20\d{2})[._/-]?[0-1]?\d[._/-]?[0-3]?\d\b|\b[0-3]?\d[._/-]?[0-1]?\d[._/-]?(?:19\d{2}|20\d{2})\b/g));
	for (const m of allDateMatches) {
		const parsed = parseDateFromString(m[0]);
		if (parsed.fullIso && parsed.year) {
			if (parsed.year <= currentYear - 3) {
				// Дата рождения (пациент родился хотя бы 3 года назад)
				extractedBirthDate ??= parsed.fullIso;
			} else {
				// Скорее всего дата съемки (недавняя дата)
				extractedStudyDate ??= parsed.fullIso;
			}
		}
	}

	// Если не нашли через регулярку, пробуем 8-значные компактные даты
	if (!extractedBirthDate && !extractedStudyDate) {
		const dateObj = parseDateFromString(normalizedFolder);
		if (dateObj.fullIso && dateObj.year) {
			if (dateObj.year <= currentYear - 3) {
				extractedBirthDate = dateObj.fullIso;
			} else {
				extractedStudyDate = dateObj.fullIso;
			}
		}
	}

	// 4. Извлечение ID пациента (например "002948" или "10482")
	const idMatch = normalizedFolder.match(/\b(?:\d{4,8}|pat(?:ient)?[-_]?\d{3,8}|id[-_]?\d{3,8})\b/i);
	const extractedPatientId = idMatch ? idMatch[0].replace(/\D/g, "") : null;

	// 5. Очистка имени пациента: заменяем составные бренды и разделители на пробелы
	let nameClean = working
		.replace(/\0/g, "")
		.replace(/[[\](){}]/g, " ")
		.replace(/ezdent[-_]?i|ez3d[-_]?i/gi, " ")
		.replace(/sidexis[-_]?\d*|romexis[-_]?\d*/gi, " ")
		.replace(/[._\-+]/g, " ");

	// Удаляем найденные даты
	if (extractedBirthDate) {
		const compact = extractedBirthDate.replace(/-/g, "");
		nameClean = nameClean.replace(new RegExp(compact, "g"), " ");
		nameClean = nameClean.replace(new RegExp(extractedBirthDate, "g"), " ");
	}
	if (extractedStudyDate) {
		const compact = extractedStudyDate.replace(/-/g, "");
		nameClean = nameClean.replace(new RegExp(compact, "g"), " ");
		nameClean = nameClean.replace(new RegExp(extractedStudyDate, "g"), " ");
	}

	// Удаляем ID
	if (extractedPatientId) {
		nameClean = nameClean.replace(new RegExp(`\\b${extractedPatientId}\\b`, "g"), " ");
	}

	// Разбиваем на токены и фильтруем стоп-слова
	const tokens = nameClean
		.split(/\s+/)
		.map((t) => t.trim())
		.filter((t) => {
			if (t.length < 2 && !/^[A-ZА-ЯЁ]$/i.test(t)) return false;
			if (TOMOGRAPH_STOP_WORDS.has(t.toLowerCase())) return false;
			if (/^\d+$/.test(t)) return false; // чистые числа отбрасываем
			return true;
		});

	const extractedName = tokens.length > 0 ? tokens.join(" ") : null;

	return {
		rawName: baseName,
		extractedName,
		extractedBirthDate,
		extractedStudyDate,
		extractedPatientId,
		detectedManufacturer,
		modalityHint,
	};
}

// ─── 4. СТОХАСТИЧЕСКИЙ МАТЧИНГ С БАЗОЙ ПАЦИЕНТОВ ───────────────────────────────

/**
 * Сравнение токенов двух ФИО независимо от порядка слов
 */
export function compareFioTokens(dicomFio: string, patientFio: string): number {
	const cleanD = dicomFio.replace(/[^a-zA-Zа-яА-ЯёЁ\s]/g, " ").trim().toLowerCase();
	const cleanP = patientFio.replace(/[^a-zA-Zа-яА-ЯёЁ\s]/g, " ").trim().toLowerCase();
	if (!cleanD || !cleanP) return 0;

	const dTokens = cleanD.split(/\s+/).filter(Boolean);
	const pTokens = cleanP.split(/\s+/).filter(Boolean);

	if (dTokens.length === 0 || pTokens.length === 0) return 0;

	// Точное совпадение после транслитерации
	if (transliterateRuToEn(cleanD) === transliterateRuToEn(cleanP)) {
		return 100;
	}

	// Если в источнике только одно слово (только фамилия, например "Иванов" или "Petrov")
	if (dTokens.length === 1) {
		const singleWord = dTokens[0]!;
		let bestScore = 0;
		for (const pt of pTokens) {
			const sc = matchWordsFuzzy(singleWord, pt);
			if (sc > bestScore) bestScore = sc;
		}
		// Одиночное совпадение фамилии без имени дает максимум 75% уверенности
		return Math.round(bestScore * 75);
	}

	// Жадное сопоставление токенов
	let totalMatchedScore = 0;
	const usedPatientIndices = new Set<number>();

	for (const dt of dTokens) {
		let bestWordScore = 0;
		let bestIdx = -1;

		for (let pi = 0; pi < pTokens.length; pi++) {
			if (usedPatientIndices.has(pi)) continue;
			const pt = pTokens[pi]!;

			// Инициал: если токен 1 символ (например "И" или "I")
			if (dt.length === 1 && pt.length > 1) {
				const charD = transliterateRuToEn(dt);
				const charP = transliterateRuToEn(pt[0]!);
				if (charD === charP) {
					if (bestWordScore < 0.88) {
						bestWordScore = 0.88;
						bestIdx = pi;
					}
					continue;
				}
			}

			const score = matchWordsFuzzy(dt, pt);
			if (score > bestWordScore) {
				bestWordScore = score;
				bestIdx = pi;
			}
		}

		if (bestIdx !== -1 && bestWordScore >= 0.6) {
			totalMatchedScore += bestWordScore;
			usedPatientIndices.add(bestIdx);
		}
	}

	const totalTokens = dTokens.length + pTokens.length;
	if (totalTokens === 0) return 0;

	const ratio = (2 * totalMatchedScore) / totalTokens;
	return Math.min(100, Math.round(ratio * 100));
}

/**
 * Оценка совпадения даты рождения
 */
export function evaluateBirthDateBonus(
	dicomBirthDate: string | null | undefined,
	patientBirthDate: string | null | undefined,
): { bonus: number; conflict: boolean; explanation: string } {
	const d = parseDateFromString(dicomBirthDate ?? "");
	const p = parseDateFromString(patientBirthDate ?? "");

	if (!d.year || !p.year) {
		return { bonus: 0, conflict: false, explanation: "Дата рождения не указана в одном из источников" };
	}

	// Полное точное совпадение YYYY-MM-DD
	if (d.fullIso && p.fullIso && d.fullIso === p.fullIso) {
		return { bonus: 30, conflict: false, explanation: `Точное совпадение даты рождения (${d.fullIso})` };
	}

	// Совпадение года
	if (d.year === p.year) {
		return { bonus: 15, conflict: false, explanation: `Совпадение года рождения (${d.year})` };
	}

	// Разница > 1 года — жесткий конфликт
	if (Math.abs(d.year - p.year) > 1) {
		return {
			bonus: -45,
			conflict: true,
			explanation: `Конфликт года рождения (исследование: ${d.year} vs карта: ${p.year})`,
		};
	}

	return { bonus: 0, conflict: false, explanation: "Близкие даты рождения" };
}

/**
 * Стохастический расчет доверительного скоринга для кандидата
 */
export function scorePatientCandidate(
	studyInfo: {
		patientName?: string | null | undefined;
		patientId?: string | null | undefined;
		birthDate?: string | null | undefined;
		folderHint?: TomographFolderHint | null | undefined;
	},
	patient: PatientCandidateItem,
): { confidence: number; details: string; status: TomographMatchStatus } {
	// 1. Точное совпадение по ID
	const studyPid = studyInfo.patientId?.trim().toLowerCase();
	const hintPid = studyInfo.folderHint?.extractedPatientId?.trim().toLowerCase();
	const patId = patient.id.trim().toLowerCase();

	if ((studyPid && studyPid === patId) || (hintPid && hintPid === patId)) {
		return {
			confidence: 100,
			details: "100% прямое совпадение PatientID / номера карты в CRM",
			status: "auto_bound",
		};
	}

	// 2. Имя для сравнения: берем из DICOM тега или из имени папки
	const nameSource = studyInfo.patientName || studyInfo.folderHint?.extractedName || "";
	const fioScore = compareFioTokens(nameSource, patient.fullName);

	// 3. Дата рождения: берем из DICOM тега или из папки
	const birthDateSource = studyInfo.birthDate || studyInfo.folderHint?.extractedBirthDate;
	const birthEval = evaluateBirthDateBonus(birthDateSource, patient.birthDate);

	let total = fioScore + birthEval.bonus;

	// При конфликте даты рождения исключаем авто-привязку
	if (birthEval.conflict) {
		total = Math.min(total, 50);
	}

	total = Math.max(0, Math.min(100, total));

	let status: TomographMatchStatus = "unassigned";
	if (total > 85) {
		status = "auto_bound";
	} else if (total >= 60) {
		status = "pending_review";
	} else {
		status = "unassigned";
	}

	const details = `ФИО: ${fioScore}%. ${birthEval.explanation}. Итог: ${total}%`;
	return { confidence: total, details, status };
}

/**
 * Поиск лучшего совпадения среди списка пациентов клиники
 */
export function matchStudyToPatients(
	studyInfo: {
		patientName?: string | null;
		patientId?: string | null;
		birthDate?: string | null;
		folderPath?: string | null;
	},
	patients: PatientCandidateItem[],
): MatchScoreResult {
	const folderHint = studyInfo.folderPath ? parseTomographFolderHint(studyInfo.folderPath) : null;
	const enrichedStudy = {
		patientName: studyInfo.patientName ?? folderHint?.extractedName,
		patientId: studyInfo.patientId ?? folderHint?.extractedPatientId,
		birthDate: studyInfo.birthDate ?? folderHint?.extractedBirthDate,
		folderHint,
	};

	if (!enrichedStudy.patientName && !enrichedStudy.patientId) {
		return {
			patientId: null,
			patientFullName: null,
			confidence: 0,
			status: "unassigned",
			matchMethod: "no_data",
			matchDetails: "В заголовках снимка и имени папки нет идентификаторов пациента",
			candidates: [],
		};
	}

	const scoredList: Array<{
		patientId: string;
		patientFullName: string;
		confidence: number;
		matchDetails: string;
		status: TomographMatchStatus;
	}> = [];

	for (const p of patients) {
		const { confidence, details, status } = scorePatientCandidate(enrichedStudy, p);
		if (confidence >= 40) {
			scoredList.push({
				patientId: p.id,
				patientFullName: p.fullName,
				confidence,
				matchDetails: details,
				status,
			});
		}
	}

	// Сортировка по убыванию уверенности
	scoredList.sort((a, b) => b.confidence - a.confidence);

	if (scoredList.length === 0) {
		const searched = enrichedStudy.patientName ?? enrichedStudy.patientId ?? "";
		return {
			patientId: null,
			patientFullName: null,
			confidence: 0,
			status: "unassigned",
			matchMethod: "no_candidate_found",
			matchDetails: `Пациент "${searched}" не найден в базе клиники`,
			candidates: [],
		};
	}

	const best = scoredList[0]!;

	// Если есть второй кандидат с близким скором (разница < 7%), требуем ручной подтверждения (pending_review)
	if (scoredList.length > 1) {
		const second = scoredList[1]!;
		if (best.confidence - second.confidence < 7) {
			return {
				patientId: best.patientId,
				patientFullName: best.patientFullName,
				confidence: best.confidence,
				status: "pending_review",
				matchMethod: "ambiguous_fio_candidates",
				matchDetails: `Несколько похожих пациентов (${best.patientFullName} и ${second.patientFullName}). Требуется подтверждение врача.`,
				candidates: scoredList.slice(0, 5),
			};
		}
	}

	return {
		patientId: best.status === "unassigned" ? null : best.patientId,
		patientFullName: best.patientFullName,
		confidence: best.confidence,
		status: best.status,
		matchMethod: best.confidence > 85 ? "high_confidence_auto" : "partial_similarity",
		matchDetails: best.matchDetails,
		candidates: scoredList.slice(0, 5),
	};
}
