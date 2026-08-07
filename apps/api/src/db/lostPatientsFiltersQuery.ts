/**
 * «Потерянные пациенты» — те, у кого нет ни одной будущей записи.
 *
 * ПОЧЕМУ ЗДЕСЬ ОДИН ЗАПРОС, А НЕ ЦИКЛ. Раньше файл читал всю картотеку
 * организации, а затем в цикле `for` делал отдельный запрос к приёмам НА КАЖДОГО
 * пациента: 1 + N обращений к базе на один вход в раздел. На клинике с тремя
 * тысячами пациентов это 3001 запрос, и каждый из них занимал соединение из
 * пула, общего с интерактивными запросами администраторов — то есть отчёт
 * руководителя тормозил запись пациентов на приём.
 *
 * Теперь это один LEFT JOIN с условием «совпадения не нашлось»
 * (`appointments.id IS NULL`). Результат тот же по построению: строка остаётся
 * ровно тогда, когда для пациента не нашлось ни одного приёма этой организации
 * со временем начала позже текущего момента — то есть ровно при том условии,
 * которое проверял прежний цикл. Дублей LEFT JOIN не создаёт: у пациента с
 * будущими приёмами все строки соединения имеют непустой `appointments.id` и
 * отбрасываются целиком, а у пациента без них соединение даёт ровно одну строку.
 *
 * Соединение опирается на индекс appointments_org_patient_starts_idx
 * (organization_id, patient_id, starts_at) из миграции 0141 — до неё каждая из N
 * проверок была полным чтением таблицы приёмов.
 *
 * daysSinceLastVisit — НЕ константа.
 *
 * БЫЛО: `daysSinceLastVisit: 90` для каждой строки. Панель аналитики писала
 * «Без визита ~90 дней» и пациенту, которого вчера выписали без новой записи, и
 * тому, кто не приходил два года. Руководитель сортировал/приоритизировал обзвон
 * по выдуманному числу и звонил «срочным» случайным людям.
 *
 * СТАЛО: подзапрос max(starts_at) по прошлым приёмам той же org; если приёмов
 * не было — считаем от даты создания карточки (человек записан в базу, но в
 * кресло не попал). Округление вниз до целых суток.
 *
 * Пустой ответ честный.
 *
 * БЫЛО: при lostRows.length === 0 — второй SELECT из lost_patients_filters.
 * В эту таблицу в дереве не пишет никто (DECLARED_EMPTY_PATH в
 * noFabricatedDataFallback). Сегодня снимок пуст и дефект скрыт; в день
 * импорта/сида раздел назовёт людей, у которых запись УЖЕ есть.
 *
 * СТАЛО: пустая выборка → []. Снимок не читаем.
 */

import { and, asc, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "./client.js";
import {
	appointments,
	appointmentWaitlists,
	patients,
	patientTaskTickets,
} from "./schema.js";

/** Строка списка в том виде, в каком её ждёт виджет «Потерянные пациенты». */
export type LostPatientRow = {
	id: string;
	organizationId: string;
	patientName: string;
	phone: string;
	daysSinceLastVisit: number;
	hasFutureAppointment: boolean;
	hasActiveCrmTask: boolean;
	createdAt: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(from: Date, to: Date): number {
	const ms = to.getTime() - from.getTime();
	if (!Number.isFinite(ms) || ms <= 0) return 0;
	return Math.floor(ms / MS_PER_DAY);
}

export async function getLostPatientsFiltersFromDb(orgId: string) {
	const now = new Date();

	/*
	 * Последний ПРОШЛЫЙ приём пациента. Пишем ${patients}."id", а не
	 * ${patients.id}: второе подставляется как голое «id» и внутри подзапроса
	 * резолвится в appointments.id (та же ловушка, что в recallCandidates.ts).
	 */
	const lastPastStartsAt = sql<Date | null>`(
		SELECT max(a.starts_at) FROM ${appointments} a
		WHERE a.organization_id = ${orgId}
		  AND a.patient_id = ${patients}."id"
		  AND a.starts_at <= ${now}
	)`.as("last_past_starts_at");

	const lostRows = await db
		.select({
			id: patients.id,
			fullName: patients.fullName,
			phone: patients.phone,
			createdAt: patients.createdAt,
			lastPastStartsAt,
		})
		.from(patients)
		.leftJoin(
			appointments,
			and(
				eq(appointments.organizationId, orgId),
				eq(appointments.patientId, patients.id),
				gt(appointments.startsAt, now),
				sql`${appointments.status} IN ('planned', 'confirmed', 'arrived', 'in_treatment')`,
			),
		)
		.leftJoin(
			appointmentWaitlists,
			and(
				eq(appointmentWaitlists.organizationId, orgId),
				eq(appointmentWaitlists.patientId, patients.id),
				eq(appointmentWaitlists.status, "active"),
			),
		)
		.leftJoin(
			patientTaskTickets,
			and(
				eq(patientTaskTickets.organizationId, orgId),
				eq(patientTaskTickets.patientId, patients.id),
				eq(patientTaskTickets.status, "pending"),
			),
		)
		.where(
			and(
				eq(patients.organizationId, orgId),
				eq(patients.status, "active"),
				isNull(patients.mergedIntoPatientId),
				isNull(appointments.id),
				isNull(appointmentWaitlists.id),
				isNull(patientTaskTickets.id),
			),
		)
		// Прежний вариант не задавал порядок вообще, поэтому список мог приходить
		// каждый раз в другом порядке — по алфавиту его хотя бы можно читать.
		.orderBy(asc(patients.fullName));

	const results: LostPatientRow[] = lostRows.map((row) => {
		const lastAt = row.lastPastStartsAt
			? new Date(row.lastPastStartsAt)
			: row.createdAt
				? new Date(row.createdAt)
				: now;
		return {
			id: row.id,
			organizationId: orgId,
			patientName: row.fullName,
			phone: row.phone || "Не указан",
			daysSinceLastVisit: daysBetween(lastAt, now),
			hasFutureAppointment: false,
			/*
			 * hasActiveCrmTask всегда false по определению потерянного пациента
			 */
			hasActiveCrmTask: false,
			createdAt: row.createdAt
				? row.createdAt.toISOString()
				: now.toISOString(),
		};
	});

	return results;
}
