/**
 * duplicateTypes.ts
 *
 * Канонические типы дубликатов пациентов (MPI / Duplicate Detection).
 * Единый источник истины (SSOT) для фронтенда и бэкенда.
 * Мандаты: 8b (<=800 строк), 8s (SSOT).
 */

export type DuplicateReason =
	/** Совпали фамилия, имя, отчество и дата рождения. */
	| "same_name_and_birth_date"
	/** Совпало полное имя, дата рождения есть только у одного. */
	| "same_name_birth_date_unknown"
	/** Совпал телефон и фамилия. */
	| "same_phone_and_surname"
	/** Совпал только телефон — чаще всего это родственники. */
	| "same_phone_only"
	/** Совпала электронная почта. */
	| "same_email"
	/** Совпал государственный СНИЛС (11 цифр). */
	| "same_snils";

/** Карточка в паре. Телефон и дата рождения нужны, чтобы человек мог сверить. */
export type DuplicateSide = {
	patientId: string;
	fullName: string;
	phone: string | null;
	birthDate: string | null;
	email: string | null;
	snils?: string | null;
};

export type DuplicateCandidate = {
	leftPatientId: string;
	leftName: string;
	left: DuplicateSide;
	rightPatientId: string;
	rightName: string;
	right: DuplicateSide;
	reason: DuplicateReason;
	/** 0…1. Ниже 0.5 объединять без проверки человеком нельзя. */
	confidence: number;
	/** Человеческое объяснение — его видит администратор. */
	explanation: string;
	/** Предупреждение, если совпадение может оказаться роднёй. */
	caution: string | null;
};

export type DuplicateReport = {
	candidates: DuplicateCandidate[];
	examinedPatients: number;
	dismissedPairs: number;
	note: string;
};

/** Ниже этого порога пара показывается как сомнительная и требует сверки. */
export const DOUBTFUL_BELOW = 0.6;

/** Вычисление канонического ключа пары пациентов */
export function duplicatePairKey(candidate: {
	leftPatientId: string;
	rightPatientId: string;
}): string {
	return `${candidate.leftPatientId}|${candidate.rightPatientId}`;
}
