/**
 * Кого пора пригласить обратно.
 *
 * ЗАЧЕМ ЭТО КЛИНИКЕ. Профилактический осмотр и гигиена — раз в полгода. Пациент
 * пролечился, ушёл довольный и забыл; через год приходит уже с болью, а мог бы
 * прийти на чистку. Возврат «спящих» пациентов — самый дешёвый источник записи:
 * человек уже знает клинику, врача и дорогу, его не нужно привлекать заново.
 *
 * ЧТО БЫЛО. Таблица lost_patients_filters существует, маршрут
 * /api/analytics/lost-patients-filters её читает, виджет LostPatientsFiltersWidget
 * его показывает — а НИ ОДНОГО места, где в эту таблицу что-то пишется, в
 * проекте нет: проверено поиском по всем исходникам, кроме объявления схемы.
 * То есть экран показывает снимок, который никогда не обновляется. Строка,
 * которая там сейчас лежит, попала туда из демонстрационных данных.
 *
 * РЕШЕНИЕ ТО ЖЕ, ЧТО С ДУБЛЯМИ: считать по текущим данным, а не хранить снимок.
 * Снимок устаревает молча — пациент записался вчера, а список продолжает звать
 * его «вернуться». Расчёт на месте всегда точен.
 *
 * ГРАНИЦА С ЗАКОНОМ. Приглашение прийти на профосмотр — это ПРОДВИЖЕНИЕ УСЛУГИ,
 * а не сообщение по действующему договору: пациент никуда не записан и ничего
 * не ждёт. Значит по ФЗ «О рекламе» ст. 18 ч. 1 требуется предварительное
 * согласие, и такие сообщения ставятся с областью marketing. Здесь считается
 * только СПИСОК; отправка проходит обычный путь через очередь, где согласие
 * проверяется перед каждым сообщением. Пациенты без согласия из списка не
 * убираются: администратор вправе им ПОЗВОНИТЬ — телефонный звонок конкретному
 * человеку рассылкой не является.
 */

import { and, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import {
	recallBandSchema,
	recallCandidateSchema,
	recallCohortSchema,
	recallReportSchema,
	type RecallBand,
	type RecallCandidate,
	type RecallCohort,
	type RecallReport,
} from "@dental/shared/recalls";
import { db } from "../../db/client.js";
import {
	appointments,
	patientImplantInstallations,
	patients,
	users,
} from "../../db/schema.js";

export {
	recallBandSchema,
	recallCandidateSchema,
	recallCohortSchema,
	recallReportSchema,
	type RecallBand,
	type RecallCandidate,
	type RecallCohort,
	type RecallReport,
};

const BAND_LABELS: Readonly<Record<RecallBand, string>> = {
	due: "Полгода без осмотра — пора на профилактику.",
	overdue: "Больше года не был: пропущен как минимум один осмотр.",
	probably_lost:
		"Больше двух лет не был — скорее всего лечится в другом месте.",
	never_arrived: "Записывался, но ни разу не дошёл до кресла.",
};

/**
 * Полных календарных месяцев между датами.
 *
 * Через средний месяц в 30.4375 суток получалось «7 месяцев» для приёма ровно
 * восемь месяцев назад: округление съедало почти месяц, и администратор видел
 * на экране не то число, которое стоит в карточке.
 */
function monthsBetween(from: Date, to: Date): number {
	const wholeMonths =
		(to.getFullYear() - from.getFullYear()) * 12 +
		(to.getMonth() - from.getMonth());
	// Если день месяца ещё не наступил, последний месяц не полный.
	return Math.max(
		0,
		to.getDate() < from.getDate() ? wholeMonths - 1 : wholeMonths,
	);
}

function bandFor(
	monthsSince: number | null,
	hadAnyAppointment: boolean,
): RecallBand | null {
	if (monthsSince === null) {
		// Ни одного завершённого приёма. Интересен только тот, кто записывался:
		// карточка, заведённая по звонку и брошенная, — это не «потерянный
		// пациент», а незавершённое обращение.
		return hadAnyAppointment ? "never_arrived" : null;
	}
	if (monthsSince >= 24) return "probably_lost";
	if (monthsSince >= 12) return "overdue";
	if (monthsSince >= 6) return "due";
	return null;
}

export type RecallOptions = {
	/** С какого срока считать, что пора звать. По умолчанию — полгода. */
	readonly minMonths?: number;
	readonly limit?: number;
	/** Включать ли тех, кто ни разу не дошёл. */
	readonly includeNeverArrived?: boolean;
	/** Фильтр по полосе контрольного профосмотра (due, overdue, probably_lost, never_arrived). */
	readonly band?: RecallBand;
	readonly filterBand?: RecallBand;
};

export async function findRecallCandidates(
	organizationId: string,
	options: RecallOptions = {},
): Promise<RecallReport> {
	const minMonths = Math.max(1, Math.min(60, options.minMonths ?? 6));
	const limit = Math.max(1, Math.min(1000, options.limit ?? 200));
	const includeNeverArrived = options.includeNeverArrived ?? true;
	const targetBand = options.band ?? options.filterBand;

	const now = new Date();

	/*
	 * Один запрос вместо выборки всех пациентов в память: клиника с историей —
	 * это десятки тысяч карточек, и тянуть их в Node, чтобы посчитать максимум
	 * даты, значит однажды упереться в память на ровном месте.
	 *
	 * Агрегаты по приёмам считаются подзапросами: последний завершённый приём,
	 * ближайший будущий и было ли вообще хоть что-то.
	 *
	 * ССЫЛКА НА ВНЕШНЮЮ ТАБЛИЦУ ПИШЕТСЯ КАК ${patients}."id", А НЕ ${patients.id}.
	 * Второе подставляется просто как «id», без имени таблицы, — и внутри
	 * подзапроса это разрешается в appointments.id, потому что там тоже есть
	 * колонка id. Условие превращалось в a.patient_id = a.id: синтаксически
	 * верно, всегда ложно, ошибки нет. Список молча выходил пустым при 27 приёмах
	 * в базе; нашлось только печатью сгенерированного SQL.
	 */
	const lastCompleted = sql<Date | null>`(
		SELECT max(a.starts_at) FROM ${appointments} a
		WHERE a.patient_id = ${patients}."id" AND a.status = 'completed'
	)`;
	const lastDoctorId = sql<string | null>`(
		SELECT a.doctor_user_id FROM ${appointments} a
		WHERE a.patient_id = ${patients}."id" AND a.status = 'completed'
		ORDER BY a.starts_at DESC LIMIT 1
	)`;
	const lastReason = sql<string | null>`(
		SELECT a.reason FROM ${appointments} a
		WHERE a.patient_id = ${patients}."id" AND a.status = 'completed'
		ORDER BY a.starts_at DESC LIMIT 1
	)`;
	const implantCount = sql<number>`(
		SELECT count(*) FROM ${patientImplantInstallations} pii
		WHERE pii.patient_id = ${patients}."id"
	)`;
	const futureCount = sql<number>`(
		SELECT count(*) FROM ${appointments} a
		WHERE a.patient_id = ${patients}."id"
		  AND a.starts_at > now()
		  AND a.status IN ('planned', 'confirmed', 'arrived', 'in_treatment')
	)`;
	const anyAppointment = sql<number>`(
		SELECT count(*) FROM ${appointments} a WHERE a.patient_id = ${patients}."id"
	)`;

	const rows = await db
		.select({
			patientId: patients.id,
			fullName: patients.fullName,
			phone: patients.phone,
			email: patients.email,
			/*
			 * Псевдонимы обязательны. Без .as() выражение возвращается драйвером под
			 * служебным именем вида «?column?», и поле в объекте оказывается пустым.
			 */
			lastCompletedAt: lastCompleted.as("last_completed_at"),
			lastDoctorId: lastDoctorId.as("last_doctor_id"),
			lastReason: lastReason.as("last_reason"),
			implantCount: implantCount.as("implant_count"),
			futureAppointments: futureCount.as("future_appointments"),
			totalAppointments: anyAppointment.as("total_appointments"),
		})
		.from(patients)
		.where(
			and(
				eq(patients.organizationId, organizationId),
				eq(patients.status, "active"),
				// Объединённая карточка — это ссылка на другую, звать по ней некого.
				isNull(patients.mergedIntoPatientId),
				// Кто уже записан — не «потерянный»: его ждут.
				sql`${futureCount} = 0`,
				// Либо завершённых приёмов не было вовсе, либо последний давно.
				or(
					sql`${lastCompleted} IS NULL`,
					lte(
						lastCompleted,
						sql`now() - (${minMonths} || ' months')::interval`,
					),
				),
			),
		)
		.limit(limit + 50);

	const doctorIds = [
		...new Set(
			rows
				.map((r) => r.lastDoctorId)
				.filter((id): id is string => Boolean(id)),
		),
	];
	const doctorRows =
		doctorIds.length > 0
			? await db
					.select({ id: users.id, fullName: users.fullName })
					.from(users)
					.where(inArray(users.id, doctorIds))
			: [];
	const doctorById = new Map(doctorRows.map((d) => [d.id, d.fullName]));

	const candidates: RecallCandidate[] = [];
	const byBand: Record<RecallBand, number> = {
		due: 0,
		overdue: 0,
		probably_lost: 0,
		never_arrived: 0,
	};

	for (const row of rows) {
		const lastAt = row.lastCompletedAt ? new Date(row.lastCompletedAt) : null;
		const monthsSince = lastAt ? monthsBetween(lastAt, now) : null;

		const band = bandFor(monthsSince, Number(row.totalAppointments) > 0);
		if (!band) continue;
		if (band === "never_arrived" && !includeNeverArrived) continue;

		byBand[band] = (byBand[band] ?? 0) + 1;
		if (targetBand && band !== targetBand) continue;

		const hasImplants = Number(row.implantCount) > 0;
		const reasonText = (row.lastReason ?? "").toLowerCase();
		const isOrtho =
			reasonText.includes("ортодонт") ||
			reasonText.includes("брекет") ||
			reasonText.includes("ретейнер") ||
			reasonText.includes("элайнер") ||
			reasonText.includes("retention");

		let cohortType: RecallCohort = "hygiene_therapy";
		let suggestedIntervalMonths = 6;
		let clinicalReason = BAND_LABELS[band] || "Плановый осмотр";

		if (band === "never_arrived") {
			clinicalReason = BAND_LABELS.never_arrived;
			cohortType = "general";
		} else if (hasImplants) {
			cohortType = "implant";
			suggestedIntervalMonths = monthsSince !== null && monthsSince <= 5 ? 3 : 6;
			clinicalReason =
				suggestedIntervalMonths === 3
					? "Осмотр остеоинтеграции и состояния периимплантных тканей (3 мес)."
					: "Контроль остеоинтеграции и профилактика периимплантита (6 мес).";
		} else if (isOrtho) {
			cohortType = "orthodontic_retention";
			suggestedIntervalMonths = 3;
			clinicalReason =
				"Контрольный осмотр ортодонтического ретейнера / ретенционного аппарата (3 мес).";
		} else {
			cohortType = "hygiene_therapy";
			suggestedIntervalMonths = 6;
			clinicalReason =
				BAND_LABELS[band] ||
				"Плановая профессиональная гигиена полости рта и профилактический осмотр.";
		}

		candidates.push({
			patientId: row.patientId,
			fullName: row.fullName,
			phone: row.phone,
			email: row.email,
			lastCompletedAt: lastAt ? lastAt.toISOString() : null,
			monthsSinceLastVisit: monthsSince,
			band,
			reason: clinicalReason,
			cohortType,
			suggestedIntervalMonths,
			attendingDoctorId: row.lastDoctorId ?? null,
			attendingDoctorName: row.lastDoctorId
				? (doctorById.get(row.lastDoctorId) ?? null)
				: null,
			lastProcedureCategory: hasImplants
				? "implant"
				: isOrtho
					? "orthodontics"
					: "hygiene_therapy",
		});
	}

	// Сначала те, кого зовут по делу: «пора на профилактику» важнее, чем
	// «ушёл два года назад». Внутри полосы — кто дольше не был.
	const order: Record<RecallBand, number> = {
		due: 0,
		overdue: 1,
		never_arrived: 2,
		probably_lost: 3,
	};
	candidates.sort(
		(left, right) =>
			order[left.band] - order[right.band] ||
			(right.monthsSinceLastVisit ?? 0) - (left.monthsSinceLastVisit ?? 0),
	);

	return {
		candidates: candidates.slice(0, limit),
		byBand,
		examinedPatients: rows.length,
		note:
			"Список считается по текущим данным при каждом запросе. Записанные на будущее не показываются. " +
			"Приглашение — это реклама услуги: по закону оно требует согласия, поэтому в очереди такие сообщения " +
			"проверяются на согласие отдельно. Позвонить можно любому.",
	};
}

/** Количество без выборки строк — для плитки на экране расписания. */
async function _countRecallCandidates(
	organizationId: string,
	minMonths = 6,
): Promise<number> {
	const report = await findRecallCandidates(organizationId, {
		minMonths,
		limit: 1000,
	});
	return report.candidates.length;
}

/** Ярлык полосы — чтобы интерфейс не собирал текст сам и не расходился с сервером. */
function _recallBandLabel(band: RecallBand): string {
	return BAND_LABELS[band] || "Плановый осмотр";
}

/** Проверка принадлежности пациента клинике — нужна маршрутам отправки. */
export async function recallCandidateBelongsTo(
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

/** Экспортируется для тестов: границы полос — часть договорённости, а не деталь. */
const _RECALL_BANDS = {
	dueMonths: 6,
	overdueMonths: 12,
	probablyLostMonths: 24,
} as const;
