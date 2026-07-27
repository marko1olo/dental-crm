/**
 * READ-ONLY проверка запроса прибыльности против живой базы.
 *
 * Выполняется ТОЛЬКО SELECT из cronAnalyticsWorker. INSERT в
 * bi_analytics_snapshots сознательно не запускается: база общая, засорять её
 * срезами нельзя. runBiAnalyticsAggregation здесь не вызывается.
 *
 * Строки прогоняются через настоящую, импортированную buildDoctorProfitabilityRow,
 * поэтому видно ровно то, что ушло бы в снимок.
 */
import { sql } from "drizzle-orm";
import { db, pool } from "../../../../apps/api/src/db/client.js";
import { buildDoctorProfitabilityRow } from "../../../../apps/api/src/scripts/cronAnalyticsWorker.js";

const orgs = await db.execute(sql`SELECT id, name FROM organizations ORDER BY id`);

for (const org of orgs.rows as Array<{ id: string; name: string }>) {
	const orgId = org.id;

	// Текст запроса совпадает с cronAnalyticsWorker.ts, секция 4.
	const doctorProf = await db.execute(sql`
		WITH doctor_revenue AS (
			SELECT
				a.doctor_user_id AS doctor_id,
				SUM(i.total_amount_rub) AS revenue
			FROM appointments a
			JOIN visits v ON v.appointment_id = a.id
			JOIN patient_invoices i ON i.visit_id = v.id
			WHERE i.organization_id = ${orgId} AND i.status = 'paid'
			GROUP BY a.doctor_user_id
		),
		doctor_appointments AS (
			SELECT
				a.doctor_user_id AS doctor_id,
				COUNT(*) AS total_count,
				COUNT(*) FILTER (WHERE a.status = 'completed') AS completed_count
			FROM appointments a
			WHERE a.organization_id = ${orgId} AND a.doctor_user_id IS NOT NULL
			GROUP BY a.doctor_user_id
		)
		SELECT
			u.full_name AS name,
			COALESCE(r.revenue, 0) AS revenue,
			ap.total_count AS total_appointments,
			ap.completed_count AS completed_appointments
		FROM users u
		LEFT JOIN doctor_revenue r ON r.doctor_id = u.id
		LEFT JOIN doctor_appointments ap ON ap.doctor_id = u.id
		WHERE u.organization_id = ${orgId}
			AND (r.revenue IS NOT NULL OR ap.total_count IS NOT NULL)
		ORDER BY revenue DESC
		LIMIT 5
	`);

	console.log(`\n=== org ${org.name} (${orgId}) — ${doctorProf.rows.length} строк ===`);
	console.log("RAW   :", JSON.stringify(doctorProf.rows));

	const mapped = doctorProf.rows.map((row) =>
		buildDoctorProfitabilityRow(row as never),
	);
	console.log("SNAPSHOT WOULD BE:", JSON.stringify(mapped, null, 1));

	const fabricated = mapped.filter((r) => r.margin !== null);
	console.log(
		fabricated.length === 0
			? "OK: ни одной строки с числом в поле прибыли"
			: `FAIL: выдуманная прибыль в ${fabricated.length} строках`,
	);
}

await pool.end();
