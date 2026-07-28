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
 */

import { and, asc, eq, gt, isNull } from "drizzle-orm";
import { db } from "./client.js";
import { appointments, lostPatientsFilters, patients } from "./schema.js";

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

export async function getLostPatientsFiltersFromDb(orgId: string) {
	const now = new Date();

	const lostRows = await db
		.select({
			id: patients.id,
			fullName: patients.fullName,
			phone: patients.phone,
			createdAt: patients.createdAt
		})
		.from(patients)
		.leftJoin(
			appointments,
			and(
				eq(appointments.organizationId, orgId),
				eq(appointments.patientId, patients.id),
				gt(appointments.startsAt, now)
			)
		)
		.where(and(eq(patients.organizationId, orgId), isNull(appointments.id)))
		// Прежний вариант не задавал порядок вообще, поэтому список мог приходить
		// каждый раз в другом порядке — по алфавиту его хотя бы можно читать.
		.orderBy(asc(patients.fullName));

	if (lostRows.length > 0) {
		const results: LostPatientRow[] = lostRows.map((row) => ({
			id: row.id,
			organizationId: orgId,
			patientName: row.fullName,
			phone: row.phone || "Не указан",
			daysSinceLastVisit: 90,
			hasFutureAppointment: false,
			hasActiveCrmTask: false,
			createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString()
		}));
		return results;
	}

	return db.select().from(lostPatientsFilters).where(eq(lostPatientsFilters.organizationId, orgId));
}
