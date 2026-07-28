/**
 * Почему пациент попадает или не попадает в список возврата.
 *
 * ЗАЧЕМ. Список считается тремя условиями сразу: нет будущей записи, последний
 * завершённый приём давно, полоса по числу месяцев. Когда список выходит
 * пустым, по самому списку не видно, какое из условий сработало, — а причин
 * может быть три, и каждая означает разное.
 *
 * Только чтение.
 *
 *   npx tsx src/scripts/inspectRecall.ts <organizationId>
 */

import { eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { appointments, patients } from "../db/schema.js";

const organizationId = process.argv[2];
if (!organizationId) {
	console.error("Укажите идентификатор организации: npx tsx src/scripts/inspectRecall.ts <organizationId>");
	process.exit(1);
}

const query = db
	.select({
		id: patients.id,
		fullName: patients.fullName,
		status: patients.status,
		lastCompletedAt: sql<
			Date | null
		>`(SELECT max(a.starts_at) FROM ${appointments} a WHERE a.patient_id = ${patients}."id" AND a.status = 'completed')`.as(
			"last_completed_at"
		),
		futureAppointments: sql<number>`(
			SELECT count(*) FROM ${appointments} a
			WHERE a.patient_id = ${patients}."id" AND a.starts_at > now()
			  AND a.status IN ('planned','confirmed','arrived','in_treatment')
		)`.as("future_appointments"),
		totalAppointments: sql<number>`(SELECT count(*) FROM ${appointments} a WHERE a.patient_id = ${patients}."id")`.as(
			"total_appointments"
		)
	})
	.from(patients)
	.where(eq(patients.organizationId, organizationId));

// Сгенерированный SQL печатается целиком: когда подзапрос возвращает нули при
// заведомо существующих данных, спорить можно только с текстом запроса.
console.log("SQL:", query.toSQL().sql, "\n");
const rows = await query;

// Контрольная цифра: если приёмы в клинике есть, а в строках ниже нули —
// значит не работает корреляция подзапроса, а не отсутствуют данные.
const [totals] = await db
	.select({
		total: sql<number>`count(*)::int`.as("total"),
		completed: sql<number>`count(*) FILTER (WHERE ${appointments.status} = 'completed')::int`.as("completed")
	})
	.from(appointments)
	.where(eq(appointments.organizationId, organizationId));
console.log(`Приёмов в клинике всего: ${totals?.total ?? 0}, из них завершённых: ${totals?.completed ?? 0}`);

console.log(`Пациентов в клинике: ${rows.length}`);
console.log("состояние | будущих | всего | последний завершённый | пациент");
console.log("----------|---------|-------|------------------------|--------");
for (const row of rows) {
	const last = row.lastCompletedAt ? new Date(row.lastCompletedAt).toISOString().slice(0, 10) : "нет";
	console.log(
		`${String(row.status).padEnd(9)} | ${String(row.futureAppointments).padStart(7)} | ${String(
			row.totalAppointments
		).padStart(5)} | ${last.padEnd(22)} | ${row.fullName}`
	);
}

process.exit(0);
