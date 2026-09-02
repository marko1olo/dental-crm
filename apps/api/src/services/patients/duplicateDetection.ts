/**
 * Поиск дублей пациентов.
 *
 * ЗАЧЕМ ЭТО НУЖНО КЛИНИКЕ
 * Дубли появляются сами: пациент звонит — администратор создаёт «Иванов И.»,
 * через месяц тот же человек приходит и заводится как «Иванов Иван Иванович».
 * Дальше у одного человека две карточки: в одной снимки, в другой оплаты,
 * долг не виден ни там, ни там, напоминание уходит дважды. Через два года
 * работы таких пар в базе сотни.
 *
 * ЧТО БЫЛО. Таблица patient_duplicate_merge_queues существует, виджет
 * PatientDuplicateMergeQueuesWidget её читает, но маршрута
 * /api/crm/patient-duplicate-merge-queues не существует — проверено живым
 * запросом, отвечает 404. Заполнять очередь тоже нечем: ни одного места, где
 * дубли ищутся, в проекте нет. Таблица пуста.
 *
 * РЕШЕНИЕ: искать на месте, а не держать очередь.
 * Очередь устаревает: пациента объединили руками, переименовали, удалили — а
 * запись в очереди осталась и предлагает объединить то, чего уже нет. Поиск по
 * текущим данным всегда точен, а в таблице хранится только человеческое
 * решение «это не дубли, больше не предлагать».
 *
 * ГЛАВНОЕ ПРАВИЛО: совпадение телефона САМО ПО СЕБЕ дублем не является.
 * Муж и жена, мать и ребёнок сплошь записаны на один номер. Такая пара
 * показывается с низкой уверенностью и отдельной пометкой, и объединять её
 * автоматически нельзя ни при каких условиях.
 */

import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../db/client.js";
import { patientDuplicateDecisions } from "../../db/patientsSchema.js";
import { patients } from "../../db/schema.js";

type DuplicateReason =
	/** Совпали фамилия, имя, отчество и дата рождения. */
	| "same_name_and_birth_date"
	/** Совпало полное имя, дата рождения есть только у одного. */
	| "same_name_birth_date_unknown"
	/** Совпал телефон и фамилия. */
	| "same_phone_and_surname"
	/** Совпал только телефон — чаще всего это родственники. */
	| "same_phone_only"
	/** Совпала электронная почта. */
	| "same_email";

/**
 * Карточка в паре. Телефон и дата рождения обязательны в ответе: администратор
 * решает, один это человек или два, и без этих полей решение принимается
 * вслепую — по одним именам отличить дубль от тёзки невозможно.
 */
type DuplicateSide = {
	readonly patientId: string;
	readonly fullName: string;
	readonly phone: string | null;
	readonly birthDate: string | null;
	readonly email: string | null;
};

export type DuplicateCandidate = {
	readonly leftPatientId: string;
	readonly leftName: string;
	readonly left: DuplicateSide;
	readonly rightPatientId: string;
	readonly rightName: string;
	readonly right: DuplicateSide;
	readonly reason: DuplicateReason;
	/** 0…1. Ниже 0.5 объединять без проверки человеком нельзя. */
	readonly confidence: number;
	/** Человеческое объяснение — его видит администратор. */
	readonly explanation: string;
	/** Предупреждение, если совпадение может оказаться роднёй. */
	readonly caution: string | null;
};

const REASON_META: Readonly<
	Record<
		DuplicateReason,
		{ confidence: number; explanation: string; caution: string | null }
	>
> = {
	same_name_and_birth_date: {
		confidence: 0.95,
		explanation: "Полностью совпали фамилия, имя, отчество и дата рождения.",
		caution: null,
	},
	same_name_birth_date_unknown: {
		confidence: 0.75,
		explanation:
			"Совпало полное имя, дата рождения указана только в одной карточке.",
		caution: "Полные тёзки бывают. Сверьте телефон и историю приёмов.",
	},
	same_phone_and_surname: {
		confidence: 0.8,
		explanation: "Совпал номер телефона и фамилия.",
		caution:
			"Родственники с одной фамилией часто указывают один номер. Сверьте имя и дату рождения.",
	},
	same_phone_only: {
		confidence: 0.35,
		explanation: "Совпал только номер телефона, имена разные.",
		caution:
			"Скорее всего это родственники: муж и жена, мать и ребёнок. Объединять нельзя без проверки.",
	},
	same_email: {
		confidence: 0.55,
		explanation: "Совпал адрес электронной почты.",
		caution: "Семья нередко указывает один адрес почты.",
	},
};

/** «+7 (916) 123-45-67» и «89161234567» — один номер. Сравниваем последние 10 цифр. */
export function phoneKey(raw: string | null): string | null {
	const digits = (raw ?? "").replace(/\D/g, "");
	return digits.length >= 10 ? digits.slice(-10) : null;
}

/** Нормализация имени: регистр, «ё», двойные пробелы, дефисы в фамилиях. */
export function nameKey(raw: string): string {
	return raw
		.toLowerCase()
		.replace(/ё/g, "е")
		.replace(/[^\p{L}\s-]/gu, "")
		.replace(/\s+/g, " ")
		.trim();
}

export function surnameOf(fullName: string): string {
	return nameKey(fullName).split(" ")[0] ?? "";
}

/**
 * Вычисляет расстояние Дамерау — Левенштейна между двумя строками.
 * Учитывает вставки, удаления, замены и транспозиции двух соседних символов.
 */
export function damerauLevenshteinDistance(a: string, b: string): number {
	const aLen = a.length;
	const bLen = b.length;
	if (aLen === 0) return bLen;
	if (bLen === 0) return aLen;
	if (a === b) return 0;

	const maxDist = aLen + bLen;
	const da = new Map<string, number>();
	const d: number[][] = Array.from({ length: aLen + 2 }, () =>
		new Array<number>(bLen + 2).fill(0),
	);

	d[0]![0] = maxDist;
	for (let i = 0; i <= aLen; i += 1) {
		d[i + 1]![0] = maxDist;
		d[i + 1]![1] = i;
	}
	for (let j = 0; j <= bLen; j += 1) {
		d[0]![j + 1] = maxDist;
		d[1]![j + 1] = j;
	}

	for (let i = 1; i <= aLen; i += 1) {
		let dbCol = 0;
		const aChar = a[i - 1]!;
		for (let j = 1; j <= bLen; j += 1) {
			const bChar = b[j - 1]!;
			const k = da.get(bChar) ?? 0;
			const l = dbCol;
			const cost = aChar === bChar ? 0 : 1;
			if (cost === 0) dbCol = j;

			d[i + 1]![j + 1] = Math.min(
				d[i]![j + 1]! + 1, // удаление
				d[i + 1]![j]! + 1, // вставка
				d[i]![j]! + cost, // замена
				d[k]![l]! + (i - k - 1) + 1 + (j - l - 1), // транспозиция
			);
		}
		da.set(aChar, i);
	}

	return d[aLen + 1]![bLen + 1]!;
}

/** Сходство строк по Дамерау — Левенштейну (0..1). */
export function stringLevenshteinSimilarity(a: string, b: string): number {
	if (a === b) return 1.0;
	const maxLen = Math.max(a.length, b.length);
	if (maxLen === 0) return 1.0;
	const dist = damerauLevenshteinDistance(a, b);
	return Math.max(0, 1 - dist / maxLen);
}

/** Построение набора триграмм с граничными маркерами. */
export function buildTrigrams(str: string): Set<string> {
	const set = new Set<string>();
	const padded = `  ${str}  `;
	for (let i = 0; i < padded.length - 2; i += 1) {
		set.add(padded.slice(i, i + 3));
	}
	return set;
}

/** Коэффициент Сёренсена — Дайса по триграммам (0..1). */
export function trigramSimilarity(a: string, b: string): number {
	if (a === b) return 1.0;
	if (!a || !b) return 0.0;
	const triA = buildTrigrams(a);
	const triB = buildTrigrams(b);
	let intersection = 0;
	for (const tri of triA) {
		if (triB.has(tri)) intersection += 1;
	}
	const total = triA.size + triB.size;
	return total === 0 ? 1.0 : (2 * intersection) / total;
}

/**
 * Нечеткое сходство ФИО с комбинированием Дамерау — Левенштейна,
 * триграмм, перестановки слов (token-sort) и частичного совпадения (отсутствие отчества).
 */
export function nameFuzzySimilarity(rawA: string, rawB: string): number {
	const normA = nameKey(rawA);
	const normB = nameKey(rawB);
	if (!normA || !normB) return 0.0;
	if (normA === normB) return 1.0;

	// 1. Прямое сходство по Левенштейну
	const levSim = stringLevenshteinSimilarity(normA, normB);
	// 2. Сходство по триграммам
	const triSim = trigramSimilarity(normA, normB);

	// 3. Token-sort: сортировка слов (например «Иван Иванович Иванов» == «Иванов Иван Иванович»)
	const tokensA = normA.split(" ").filter(Boolean);
	const tokensB = normB.split(" ").filter(Boolean);
	const sortedA = [...tokensA].sort().join(" ");
	const sortedB = [...tokensB].sort().join(" ");
	const tokenSortSim =
		sortedA === sortedB ? 1.0 : stringLevenshteinSimilarity(sortedA, sortedB);

	// 4. Частичное совпадение слов (например фамилия + имя совпали, а отчество отсутствует)
	let matchedWords = 0;
	for (const wordA of tokensA) {
		if (
			tokensB.some((wordB) => stringLevenshteinSimilarity(wordA, wordB) >= 0.85)
		) {
			matchedWords += 1;
		}
	}
	const minTokens = Math.min(tokensA.length, tokensB.length);
	const tokenCoverage = minTokens > 0 ? matchedWords / minTokens : 0;
	const tokenOverlapSim =
		tokensA.length !== tokensB.length && tokenCoverage === 1.0 ? 0.85 : 0;

	return Math.max(levSim, triSim, tokenSortSim, tokenOverlapSim);
}

/** Нормализация СНИЛС (11 цифр). */
export function snilsKey(raw: string | null | undefined): string | null {
	const digits = (raw ?? "").replace(/\D/g, "");
	return digits.length === 11 ? digits : null;
}

/** Сходство СНИЛС (1.0 при точном совпадении 11 цифр, 0.85 при опечатке в 1 цифру, иначе 0.0). */
export function snilsFuzzySimilarity(
	snilsA: string | null | undefined,
	snilsB: string | null | undefined,
): number | null {
	const a = snilsKey(snilsA);
	const b = snilsKey(snilsB);
	if (!a || !b) return null;
	if (a === b) return 1.0;
	if (damerauLevenshteinDistance(a, b) === 1) return 0.85;
	return 0.0;
}

/** Сходство телефона (1.0 при совпадении последних 10 цифр, 0.85 при опечатке в 1 цифру). */
export function phoneFuzzySimilarity(
	phoneA: string | null | undefined,
	phoneB: string | null | undefined,
): number | null {
	const a = phoneKey(phoneA ?? null);
	const b = phoneKey(phoneB ?? null);
	if (!a || !b) return null;
	if (a === b) return 1.0;
	if (damerauLevenshteinDistance(a, b) === 1) return 0.85;
	return 0.0;
}

/** Сходство даты рождения. */
export function birthDateFuzzySimilarity(
	dobA: string | null | undefined,
	dobB: string | null | undefined,
): number | null {
	const a = (dobA ?? "").trim();
	const b = (dobB ?? "").trim();
	if (!a || !b) return null;
	if (a === b) return 1.0;
	// День и месяц перепутаны (YYYY-MM-DD vs YYYY-DD-MM)
	const matchA = a.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	const matchB = b.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (matchA && matchB) {
		if (
			matchA[1] === matchB[1] &&
			matchA[2] === matchB[3] &&
			matchA[3] === matchB[2]
		) {
			return 0.85;
		}
	}
	if (damerauLevenshteinDistance(a, b) === 1) return 0.8;
	return 0.0;
}

export type PatientCandidateData = {
	readonly id: string;
	readonly fullName: string;
	readonly birthDate?: string | null | undefined;
	readonly phone?: string | null | undefined;
	readonly snils?: string | null | undefined;
	readonly status?: string | null | undefined;
	readonly mergedIntoPatientId?: string | null | undefined;
	readonly administrativeProfile?: Record<string, unknown> | null | undefined;
};

export type IncomingPatientData = {
	readonly fullName: string;
	readonly birthDate?: string | null | undefined;
	readonly phone?: string | null | undefined;
	readonly snils?: string | null | undefined;
	readonly administrativeProfile?: Record<string, unknown> | null | undefined;
};

export type PatientMatchEvaluation = {
	readonly isDuplicate: boolean;
	readonly isNameOnlyDuplicate: boolean;
	readonly matchScore: number;
	readonly matchConfidencePercent: number;
	readonly reasons: string[];
	readonly explanation: string;
	readonly caution: string | null;
	readonly existingPatient: PatientCandidateData;
};

/**
 * Строгий нечеткий многофакторный анализ дубля пациента (MPI).
 * Оценивает ФИО + Дата рождения + Телефон + СНИЛС.
 */
export function evaluatePatientMatch(
	existing: PatientCandidateData,
	incoming: IncomingPatientData,
	options: { requireDistinguishingData?: boolean } = {},
): PatientMatchEvaluation | null {
	if (existing.status !== "active" || existing.mergedIntoPatientId) {
		return null;
	}

	const existingSnils =
		existing.snils ??
		(existing.administrativeProfile?.snils as string | undefined) ??
		null;
	const incomingSnils =
		incoming.snils ??
		(incoming.administrativeProfile?.snils as string | undefined) ??
		null;

	const nameScore = nameFuzzySimilarity(existing.fullName, incoming.fullName);
	const dobScore = birthDateFuzzySimilarity(existing.birthDate, incoming.birthDate);
	const phoneScore = phoneFuzzySimilarity(existing.phone, incoming.phone);
	const snilsScore = snilsFuzzySimilarity(existingSnils, incomingSnils);

	const hasIncomingDob = Boolean((incoming.birthDate ?? "").trim());
	const hasIncomingPhone = Boolean(phoneKey(incoming.phone ?? null));
	const hasIncomingSnils = Boolean(snilsKey(incomingSnils));

	const nothingToDistinguishBy =
		!hasIncomingDob && !hasIncomingPhone && !hasIncomingSnils;

	const reasons: string[] = [];
	let caution: string | null = null;
	let matchScore = 0;
	let isNameOnly = false;

	// Сценарий 1: У нового пациента указано ТОЛЬКО имя
	if (nothingToDistinguishBy) {
		if (nameScore >= 0.98) {
			if (options.requireDistinguishingData === true) {
				isNameOnly = true;
				matchScore = 0.90;
				reasons.push(
					"Полное совпадение ФИО при отсутствии телефона, даты рождения и СНИЛС",
				);
			} else {
				matchScore = 0.75;
				reasons.push("Совпало полное имя, дата рождения не указана");
				caution = "Полные тёзки бывают. Сверьте телефон и историю приёмов.";
			}
		} else {
			return null;
		}

		return {
			isDuplicate: matchScore > 0.85,
			isNameOnlyDuplicate: isNameOnly,
			matchScore,
			matchConfidencePercent: Math.round(matchScore * 100),
			reasons,
			explanation: reasons.join(". "),
			caution,
			existingPatient: existing,
		};
	}

	// Сценарий 2: Проверка СНИЛС (государственный уникальный идентификатор)
	if (snilsScore !== null) {
		if (snilsScore === 1.0) {
			if (nameScore >= 0.70) {
				matchScore = 0.98;
				reasons.push("Полное совпадение СНИЛС (11 цифр)");
				reasons.push(`Совпадение ФИО (${Math.round(nameScore * 100)}%)`);
				if (dobScore === 1.0) reasons.push("Полное совпадение даты рождения");
				if (phoneScore === 1.0) reasons.push("Полное совпадение номера телефона");
			} else if (nameScore >= 0.40) {
				matchScore = 0.90;
				reasons.push(
					"Полное совпадение СНИЛС при частичном изменении ФИО (возможна смена фамилии)",
				);
			}
		} else if (
			snilsScore === 0.0 &&
			snilsKey(existingSnils) &&
			snilsKey(incomingSnils)
		) {
			// У обоих указан валидный СНИЛС и они разные — это разные граждане
			return null;
		}
	}

	// Сценарий 3: Проверка даты рождения
	if (matchScore === 0) {
		if (dobScore !== null && dobScore === 0.0) {
			// Даты рождения указаны у обоих и они РАЗНЫЕ -> разные люди (тёзки или родственники)
			return null;
		}

		if (dobScore !== null && dobScore >= 0.80) {
			// Даты рождения совпадают (или опечатка в 1 день)
			if (nameScore >= 0.80) {
				if (phoneScore !== null && phoneScore >= 0.80) {
					// Имя + ДР + Телефон
					matchScore = 0.98;
					reasons.push(
						`Высокое совпадение ФИО (${Math.round(nameScore * 100)}%)`,
					);
					reasons.push("Совпадение даты рождения");
					reasons.push("Совпадение номера телефона");
				} else if (phoneScore === null) {
					// Имя + ДР (телефон не указан в одном или обоих)
					matchScore = 0.95;
					reasons.push(
						`Высокое совпадение ФИО (${Math.round(nameScore * 100)}%)`,
					);
					reasons.push("Совпадение даты рождения");
				} else if (
					phoneScore === 0.0 &&
					nameScore >= 0.95 &&
					dobScore === 1.0
				) {
					// Полное совпадение ФИО и даты рождения при сменившемся номере
					matchScore = 0.92;
					reasons.push(
						"Полное совпадение ФИО и даты рождения (новый номер телефона)",
					);
				}
			}
		}
	}

	// Сценарий 4: Совпадение телефона
	if (matchScore === 0) {
		if (phoneScore !== null && phoneScore >= 0.80) {
			if (nameScore >= 0.80) {
				// Телефон + Имя (ДР не указана)
				matchScore = 0.90;
				reasons.push("Совпадение номера телефона");
				reasons.push(
					`Высокое совпадение ФИО (${Math.round(nameScore * 100)}%)`,
				);
			} else {
				// Телефон совпал, а имена разные — родственники!
				matchScore = 0.35;
				caution =
					"Совпал только номер телефона, имена разные. Чаще всего это родственники (родитель и ребёнок, супруги).";
				reasons.push("Совпал только номер телефона, имена разные");
			}
		}
	}

	// Сценарий 5: Совпадение только ФИО при заведомо разном телефоне (тёзка с другим номером)
	if (matchScore === 0 && nameScore >= 0.95) {
		if (phoneScore === 0.0 && dobScore === null) {
			// Тёзка с другим телефоном — не блокируем!
			return null;
		}
	}

	if (matchScore === 0) return null;

	const isDuplicate = matchScore > 0.85;
	return {
		isDuplicate,
		isNameOnlyDuplicate: false,
		matchScore,
		matchConfidencePercent: Math.round(matchScore * 100),
		reasons,
		explanation: reasons.join(". "),
		caution,
		existingPatient: existing,
	};
}

type PatientRow = {
	id: string;
	fullName: string;
	phone: string | null;
	email: string | null;
	birthDate: string | null;
};

/** Пара идентификаторов в устойчивом порядке — чтобы не считать дважды. */
export function pairKey(left: string, right: string): string {
	return left < right ? `${left}|${right}` : `${right}|${left}`;
}

export type FindDuplicatesOptions = {
	/** Не показывать совпадения слабее этого порога. */
	readonly minConfidence?: number;
	readonly limit?: number;
};

export type DuplicateReport = {
	readonly candidates: DuplicateCandidate[];
	/** Сколько карточек просмотрено. */
	readonly examinedPatients: number;
	/** Сколько пар скрыто решением «это не дубли». */
	readonly dismissedPairs: number;
	readonly note: string;
};

export async function findDuplicateCandidates(
	organizationId: string,
	options: FindDuplicatesOptions = {},
): Promise<DuplicateReport> {
	const minConfidence = Math.max(0, Math.min(1, options.minConfidence ?? 0.3));
	const limit = Math.max(1, Math.min(500, options.limit ?? 100));

	const rows: PatientRow[] = await db
		.select({
			id: patients.id,
			fullName: patients.fullName,
			phone: patients.phone,
			email: patients.email,
			birthDate: patients.birthDate,
		})
		.from(patients)
		.where(
			and(
				eq(patients.organizationId, organizationId),
				eq(patients.status, "active"),
				isNull(patients.mergedIntoPatientId),
			),
		);

	// Пары, про которые человек уже сказал «это не дубли» или которые объединены.
	const decisions = await db
		.select({
			leftPatientId: patientDuplicateDecisions.leftPatientId,
			rightPatientId: patientDuplicateDecisions.rightPatientId,
		})
		.from(patientDuplicateDecisions)
		.where(eq(patientDuplicateDecisions.organizationId, organizationId));
	const hidden = new Set(
		decisions.map((row) => pairKey(row.leftPatientId, row.rightPatientId)),
	);

	const byName = new Map<string, PatientRow[]>();
	const byPhone = new Map<string, PatientRow[]>();
	const byEmail = new Map<string, PatientRow[]>();

	for (const row of rows) {
		const name = nameKey(row.fullName);
		if (name) {
			const bucket = byName.get(name) ?? [];
			bucket.push(row);
			byName.set(name, bucket);
		}
		const phone = phoneKey(row.phone);
		if (phone) {
			const bucket = byPhone.get(phone) ?? [];
			bucket.push(row);
			byPhone.set(phone, bucket);
		}
		const email = row.email?.trim().toLowerCase();
		if (email) {
			const bucket = byEmail.get(email) ?? [];
			bucket.push(row);
			byEmail.set(email, bucket);
		}
	}

	/** Сильнейшая причина на пару: одна пара не должна показываться трижды. */
	const strongest = new Map<string, DuplicateCandidate>();

	const consider = (
		left: PatientRow,
		right: PatientRow,
		reason: DuplicateReason,
	) => {
		const key = pairKey(left.id, right.id);
		if (hidden.has(key)) return;

		const meta = REASON_META[reason];
		if (meta.confidence < minConfidence) return;

		const existing = strongest.get(key);
		if (existing && existing.confidence >= meta.confidence) return;

		// Порядок в паре устойчив, чтобы список не «прыгал» между запросами.
		const [first, second] = left.id < right.id ? [left, right] : [right, left];
		const side = (row: PatientRow): DuplicateSide => ({
			patientId: row.id,
			fullName: row.fullName,
			phone: row.phone,
			birthDate: row.birthDate,
			email: row.email,
		});
		strongest.set(key, {
			leftPatientId: first.id,
			leftName: first.fullName,
			left: side(first),
			rightPatientId: second.id,
			rightName: second.fullName,
			right: side(second),
			reason,
			confidence: meta.confidence,
			explanation: meta.explanation,
			caution: meta.caution,
		});
	};

	for (const bucket of byName.values()) {
		if (bucket.length < 2) continue;
		for (let i = 0; i < bucket.length; i += 1) {
			for (let j = i + 1; j < bucket.length; j += 1) {
				const left = bucket[i];
				const right = bucket[j];
				if (!left || !right) continue;
				if (left.birthDate && right.birthDate) {
					if (left.birthDate === right.birthDate)
						consider(left, right, "same_name_and_birth_date");
					// Одинаковое имя и РАЗНЫЕ даты рождения — это два разных человека,
					// а не дубль. Такую пару не предлагаем вовсе.
					continue;
				}
				consider(left, right, "same_name_birth_date_unknown");
			}
		}
	}

	for (const bucket of byPhone.values()) {
		if (bucket.length < 2) continue;
		for (let i = 0; i < bucket.length; i += 1) {
			for (let j = i + 1; j < bucket.length; j += 1) {
				const left = bucket[i];
				const right = bucket[j];
				if (!left || !right) continue;
				// Разные даты рождения при одном телефоне — почти наверняка родня.
				if (
					left.birthDate &&
					right.birthDate &&
					left.birthDate !== right.birthDate
				)
					continue;
				const sameSurname =
					surnameOf(left.fullName) === surnameOf(right.fullName);
				consider(
					left,
					right,
					sameSurname ? "same_phone_and_surname" : "same_phone_only",
				);
			}
		}
	}

	for (const bucket of byEmail.values()) {
		if (bucket.length < 2) continue;
		for (let i = 0; i < bucket.length; i += 1) {
			for (let j = i + 1; j < bucket.length; j += 1) {
				const left = bucket[i];
				const right = bucket[j];
				if (!left || !right) continue;
				if (
					left.birthDate &&
					right.birthDate &&
					left.birthDate !== right.birthDate
				)
					continue;
				consider(left, right, "same_email");
			}
		}
	}

	const candidates = [...strongest.values()]
		.sort(
			(a, b) =>
				b.confidence - a.confidence || a.leftName.localeCompare(b.leftName),
		)
		.slice(0, limit);

	return {
		candidates,
		examinedPatients: rows.length,
		dismissedPairs: hidden.size,
		note:
			/*
			 * Формулировка исправлена после просмотра снимка экрана. Было:
			 * «Совпадение телефона само по себе дублем не является… такие пары не
			 * предлагаются» — и прямо над этой строкой стояли две пары, найденные
			 * ровно по телефону. Система в одном экране объявляла правило и тут же
			 * его нарушала; после такого перестают верить и остальным пояснениям.
			 * На деле пары по телефону предлагаются намеренно — с низкой
			 * уверенностью и предупреждением, — а не предлагаются только тёзки с
			 * разными датами рождения. Текст теперь говорит именно это.
			 */
			"Пары по одному телефону показываются с низкой уверенностью и пометкой: чаще всего это " +
			"родственники, а не один человек. Не предлагаются вовсе только полные тёзки с разными " +
			"датами рождения — это заведомо разные люди.",
	};
}

/** Сводка для карточки пациента: есть ли у него вероятные дубли. */
export async function duplicatesForPatient(
	organizationId: string,
	patientId: string,
): Promise<DuplicateCandidate[]> {
	const report = await findDuplicateCandidates(organizationId, {
		limit: 500,
		minConfidence: 0.3,
	});
	return report.candidates.filter(
		(candidate) =>
			candidate.leftPatientId === patientId ||
			candidate.rightPatientId === patientId,
	);
}

/** Проверка существования пациента в организации — нужна маршрутам. */
export async function patientBelongsToOrganization(
	organizationId: string,
	patientId: string,
): Promise<boolean> {
	const [row] = await db
		.select({ id: patients.id })
		.from(patients)
		.where(
			and(
				eq(patients.id, patientId),
				eq(patients.organizationId, organizationId),
			),
		)
		.limit(1);
	return Boolean(row);
}
