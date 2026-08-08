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

import { and, eq } from "drizzle-orm";
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
function phoneKey(raw: string | null): string | null {
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

function surnameOf(fullName: string): string {
	return nameKey(fullName).split(" ")[0] ?? "";
}

type PatientRow = {
	id: string;
	fullName: string;
	phone: string | null;
	email: string | null;
	birthDate: string | null;
};

/** Пара идентификаторов в устойчивом порядке — чтобы не считать дважды. */
function pairKey(left: string, right: string): string {
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
