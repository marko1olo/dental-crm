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
	doctorPreferences,
	patientImplantInstallations,
	patientRecalls,
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

function normalizeRecallStatus(
	rawStatus: string | null | undefined,
): "due_now" | "contacted" | "scheduled" | "declined" | undefined {
	if (!rawStatus) return undefined;
	const s = rawStatus.toLowerCase();
	if (s === "scheduled" || s === "completed" || s === "contacted_scheduled" || s === "done") return "scheduled";
	if (s === "contacted" || s === "reached" || s === "invited" || s === "contacted_no_answer") return "contacted";
	if (s === "declined" || s === "cancelled" || s === "contacted_declined") return "declined";
	if (s === "due_now" || s === "pending" || s === "not_called" || s === "snoozed" || s === "needs_review") return "due_now";
	return undefined;
}

function daysBetween(from: Date, to: Date): number {
	const diffMs = to.getTime() - from.getTime();
	return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function bandFor(
	monthsSince: number | null,
	hadAnyAppointment: boolean,
	intervalMonths = 6,
	daysSince?: number | null,
	intervalDays?: number,
): RecallBand | null {
	if (monthsSince === null) {
		// Ни одного завершённого приёма. Интересен только тот, кто записывался:
		// карточка, заведённая по звонку и брошенная, — это не «потерянный
		// пациент», а незавершённое обращение.
		return hadAnyAppointment ? "never_arrived" : null;
	}
	if (intervalDays !== undefined && daysSince !== undefined && daysSince !== null) {
		if (daysSince >= intervalDays * 4) return "probably_lost";
		if (daysSince >= intervalDays * 2) return "overdue";
		if (daysSince >= intervalDays) return "due";
		return null;
	}
	if (monthsSince >= 24) return "probably_lost";
	if (monthsSince >= Math.max(12, intervalMonths * 2)) return "overdue";
	if (monthsSince >= intervalMonths) return "due";
	return null;
}

export type RecallOptions = {
	/** С какого срока считать, что пора звать. По умолчанию — полгода. */
	readonly minMonths?: number;
	readonly minDays?: number;
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
	const minDays = options.minDays !== undefined
		? Math.max(0, Math.min(1800, options.minDays))
		: options.minMonths !== undefined
			? Math.max(0, Math.min(60, options.minMonths)) * 30
			: 7;
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
	const lastRecallStatus = sql<string | null>`(
		SELECT pr.status FROM ${patientRecalls} pr
		WHERE pr.patient_id = ${patients}."id" AND pr.organization_id = ${patients}."organization_id"
		ORDER BY pr.created_at DESC LIMIT 1
	)`;
	const lastRecallNotes = sql<string | null>`(
		SELECT pr.notes FROM ${patientRecalls} pr
		WHERE pr.patient_id = ${patients}."id" AND pr.organization_id = ${patients}."organization_id"
		ORDER BY pr.created_at DESC LIMIT 1
	)`;
	const lastRecallChannel = sql<string | null>`(
		SELECT pr.channel FROM ${patientRecalls} pr
		WHERE pr.patient_id = ${patients}."id" AND pr.organization_id = ${patients}."organization_id"
		ORDER BY pr.created_at DESC LIMIT 1
	)`;
	const lastDiagnosisMkb = sql<string | null>`(
		SELECT a.diagnosis_mkb10 FROM ${appointments} a
		WHERE a.patient_id = ${patients}."id" AND a.status = 'completed'
		ORDER BY a.starts_at DESC LIMIT 1
	)`;

	const rows = await db
		.select({
			patientId: patients.id,
			fullName: patients.fullName,
			phone: patients.phone,
			email: patients.email,
			birthDate: patients.birthDate,
			/*
			 * Псевдонимы обязательны. Без .as() выражение возвращается драйвером под
			 * служебным именем вида «?column?», и поле в объекте оказывается пустым.
			 */
			lastCompletedAt: lastCompleted.as("last_completed_at"),
			lastDoctorId: lastDoctorId.as("last_doctor_id"),
			lastReason: lastReason.as("last_reason"),
			lastDiagnosisMkb: lastDiagnosisMkb.as("last_diagnosis_mkb"),
			implantCount: implantCount.as("implant_count"),
			futureAppointments: futureCount.as("future_appointments"),
			totalAppointments: anyAppointment.as("total_appointments"),
			lastRecallStatus: lastRecallStatus.as("last_recall_status"),
			lastRecallNotes: lastRecallNotes.as("last_recall_notes"),
			lastRecallChannel: lastRecallChannel.as("last_recall_channel"),
		})
		.from(patients)
		.where(
			and(
				eq(patients.organizationId, organizationId),
				eq(patients.status, "active"),
				// Объединённая карточка — это ссылка на другую, звать по ней некого.
				isNull(patients.mergedIntoPatientId),
				// Кто уже записан — не «потерянный»: его ждут (но если статус реколла 'scheduled', показываем его в колонке «Записан на приём» Канбана!).
				or(
					sql`${futureCount} = 0`,
					sql`${lastRecallStatus} IN ('scheduled', 'completed')`,
				),
				// Либо завершённых приёмов не было вовсе, либо последний давно.
				or(
					sql`${lastCompleted} IS NULL`,
					lte(
						lastCompleted,
						sql`now() - (${minDays} || ' days')::interval`,
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

	const doctorPrefRows =
		doctorIds.length > 0
			? await db
					.select({
						doctorId: doctorPreferences.doctorId,
						specialty: doctorPreferences.specialty,
					})
					.from(doctorPreferences)
					.where(
						and(
							eq(doctorPreferences.organizationId, organizationId),
							inArray(doctorPreferences.doctorId, doctorIds),
						),
					)
			: [];
	const doctorSpecialtyById = new Map(
		doctorPrefRows
			.filter((dp): dp is { doctorId: string; specialty: string } => Boolean(dp.doctorId))
			.map((dp) => [dp.doctorId, dp.specialty]),
	);

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
		const daysSince = lastAt ? daysBetween(lastAt, now) : null;

		const hasImplants = Number(row.implantCount) > 0;
		const doctorSpecialty = row.lastDoctorId ? (doctorSpecialtyById.get(row.lastDoctorId) ?? null) : null;
		const mkb = (row.lastDiagnosisMkb ?? "").toUpperCase();

		// Проверяем детский возраст (< 14 лет)
		let isChildUnder14 = false;
		if (row.birthDate) {
			const bDate = new Date(row.birthDate);
			if (!Number.isNaN(bDate.getTime())) {
				const age = Math.floor((now.getTime() - bDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
				if (age < 14) isChildUnder14 = true;
			}
		}

		const isSurgical =
			doctorSpecialty === "surgeon" ||
			mkb.startsWith("K01") ||
			mkb.startsWith("K10") ||
			mkb.startsWith("K09") ||
			/удален|резекц|хирург|синус|шв[ыа]|пластик|костн.*пластик|экстракц|surgery|extraction|suture/i.test(row.lastReason ?? "");
		const isOrtho = doctorSpecialty === "orthodontist" || mkb.startsWith("K07");
		const isEndo = mkb.startsWith("K04");
		const isPerio = doctorSpecialty === "periodontist" || mkb.startsWith("K05");
		const isPediatric = isChildUnder14 || doctorSpecialty === "pediatric";

		let cohortType: RecallCohort = "hygiene_therapy";
		let suggestedIntervalMonths = 6;
		let suggestedIntervalDays: number | undefined;
		let clinicalReason = "";

		if (monthsSince === null) {
			cohortType = "general";
			suggestedIntervalMonths = 6;
			clinicalReason = BAND_LABELS.never_arrived;
		} else if ((isSurgical || hasImplants) && daysSince !== null && daysSince <= 30) {
			cohortType = "surgical_suture_removal";
			suggestedIntervalDays = 7;
			suggestedIntervalMonths = 0;
			clinicalReason =
				"Контрольный осмотр после хирургического вмешательства и снятие швов (7–10 дней).";
		} else if (isPediatric) {
			cohortType = "general";
			suggestedIntervalMonths = 3;
			clinicalReason =
				"Детский профилактический осмотр и минерализация эмали (3 мес).";
		} else if (isEndo) {
			cohortType = "endodontic";
			suggestedIntervalMonths = 1;
			clinicalReason =
				"Контрольная рентгенография/визиография периапикальных тканей после эндодонтии (1 мес).";
		} else if (isPerio) {
			cohortType = "periodontal";
			suggestedIntervalMonths = 3;
			clinicalReason =
				"Контрольный пародонтологический осмотр и поддерживающая терапия (3 мес).";
		} else if (hasImplants) {
			cohortType = "implant";
			if (monthsSince <= 2) {
				suggestedIntervalMonths = 1;
				clinicalReason =
					"Рентген-контроль и оценка заживления после установки имплантата (1 мес).";
			} else if (monthsSince <= 5) {
				suggestedIntervalMonths = 3;
				clinicalReason =
					"Осмотр остеоинтеграции и состояния периимплантных тканей перед протезированием (3 мес).";
			} else if (monthsSince <= 11) {
				suggestedIntervalMonths = 6;
				clinicalReason =
					"Контроль остеоинтеграции и профилактика периимплантита (6 мес).";
			} else {
				suggestedIntervalMonths = 12;
				clinicalReason =
					"Годовой контрольный рентген-осмотр стабильности костной ткани вокруг имплантата (12 мес).";
			}
		} else if (isOrtho) {
			cohortType = "orthodontic_retention";
			suggestedIntervalMonths = 1; // 4 недели / 28 дней
			clinicalReason =
				"Плановая активация аппаратуры и ортодонтический контроль (1 мес).";
		} else {
			cohortType = "hygiene_therapy";
			suggestedIntervalMonths = 6;
			clinicalReason =
				"Плановая профессиональная гигиена полости рта и профилактический осмотр (6 мес).";
		}

		const band = bandFor(monthsSince, Number(row.totalAppointments) > 0, suggestedIntervalMonths, daysSince, suggestedIntervalDays);
		if (!band) continue;
		if (band === "never_arrived" && !includeNeverArrived) continue;

		byBand[band] = (byBand[band] ?? 0) + 1;
		if (targetBand && band !== targetBand) continue;

		const savedStatus = normalizeRecallStatus(row.lastRecallStatus);

		candidates.push({
			patientId: row.patientId,
			fullName: row.fullName,
			phone: row.phone,
			email: row.email,
			lastCompletedAt: lastAt ? lastAt.toISOString() : null,
			monthsSinceLastVisit: monthsSince,
			daysSinceLastVisit: daysSince,
			band,
			reason: clinicalReason,
			cohortType,
			suggestedIntervalMonths,
			suggestedIntervalDays,
			status: savedStatus ?? "due_now",
			notes: row.lastRecallNotes ?? null,
			lastContactChannel: row.lastRecallChannel ?? null,
			attendingDoctorId: row.lastDoctorId ?? null,
			attendingDoctorName: row.lastDoctorId
				? (doctorById.get(row.lastDoctorId) ?? null)
				: null,
			lastProcedureCategory: (isSurgical || (hasImplants && daysSince !== null && daysSince <= 30))
				? "surgery"
				: isPediatric
					? "pediatric"
					: hasImplants
						? "implant"
						: isEndo
							? "endodontic"
							: isPerio
								? "periodontal"
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
