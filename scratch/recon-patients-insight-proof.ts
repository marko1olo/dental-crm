/**
 * ЗАМЕР для разведки экрана картотеки: одинаков ли значок риска и подсказка
 * «следующее действие» у ВСЕХ пациентов, или только у шести видимых на снимке.
 *
 * Свой процесс, а не общий dev-сервер: сервер на 4100 отдаёт устаревший код.
 * Считается ровно то, что уходит в браузер: hydrateDomainStateFromDb -> buildDashboard,
 * та же цепочка, что в db/dashboardQuery.ts:53-58.
 *
 * ЗАПУСК (cwd apps/api — оттуда загрузчик поднимает DATABASE_URL):
 *   cd apps/api && node --import tsx ../../scratch/recon-patients-insight-proof.ts
 *
 * Только чтение. Ни одной записи в базу.
 */

import { sql } from "drizzle-orm";
import { db, pool } from "../apps/api/src/db/client.js";
import { getDashboardFromDb } from "../apps/api/src/db/dashboardQuery.js";

function tally<T extends string>(values: readonly T[]): Array<[T, number]> {
	const counts = new Map<T, number>();
	for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
	return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

async function main(): Promise<void> {
	process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";

	const orgs = await db.execute(sql`select id::text as id, name from organizations order by name`);
	console.log(`организаций в базе: ${orgs.rows.length}`);

	const docKinds = await db.execute(sql`
		select kind, status, count(*)::int as n
		  from generated_documents
		 group by kind, status
		 order by n desc
	`);
	console.log("\n=== документы в базе (kind/status/шт) ===");
	for (const row of docKinds.rows) console.log(`  ${row.kind} / ${row.status} / ${row.n}`);

	for (const org of orgs.rows as Array<{ id: string; name: string }>) {
		console.log(`\n=== КЛИНИКА «${org.name}» (${org.id}) ===`);
		const dashboard = await getDashboardFromDb(org.id);
		const patients = dashboard.patients ?? [];
		const insights = dashboard.patientInsights ?? [];
		console.log(`пациентов в сводке: ${patients.length}, строк patientInsights: ${insights.length}`);

		const withInsight = patients.filter((p) => insights.some((i) => i.patientId === p.id)).length;
		console.log(`пациентов, у которых есть insight (значит есть строка .patient-row-meta): ${withInsight}`);

		console.log("\n  riskLevel:");
		for (const [level, n] of tally(insights.map((i) => i.riskLevel))) {
			console.log(`    ${level}: ${n} из ${insights.length} (${((n / (insights.length || 1)) * 100).toFixed(1)} %)`);
		}

		console.log("\n  nextBestAction:");
		for (const [action, n] of tally(insights.map((i) => i.nextBestAction))) {
			console.log(`    «${action}»: ${n} из ${insights.length} (${((n / (insights.length || 1)) * 100).toFixed(1)} %)`);
		}

		console.log("\n  пары riskLevel + nextBestAction:");
		for (const [pair, n] of tally(insights.map((i) => `${i.riskLevel} | ${i.nextBestAction}`))) {
			console.log(`    ${pair}: ${n}`);
		}

		const missingCounts = tally(insights.map((i) => String(i.missingDocumentKinds.length)));
		console.log("\n  сколько обязательных документов не хватает (0..3):");
		for (const [n, count] of missingCounts) console.log(`    не хватает ${n}: у ${count} пациентов`);

		console.log("\n  balanceDueRub > 0:", insights.filter((i) => i.balanceDueRub > 0).length);
		console.log("  openTasks > 0:", insights.filter((i) => i.openTasks > 0).length);

		console.log("\n  ПЕРВЫЕ 10 СТРОК СПИСКА как их рисует PatientsView (ФИО | значок | подсказка | остаток):");
		for (const patient of patients.slice(0, 10)) {
			const insight = insights.find((i) => i.patientId === patient.id);
			const label = insight
				? { low: "спокойно", watch: "контроль", high: "срочно" }[insight.riskLevel]
				: "—";
			console.log(
				`    ${patient.fullName} | ${label} | ${insight?.nextBestAction ?? "—"} | ${insight?.balanceDueRub ?? 0}`,
			);
		}

		// Повтор фильтра из hooks/domains/usePatientLogic.ts:183-192, без React.
		const filter = (query: string) => {
			const normalized = query.trim().toLowerCase();
			if (!normalized) return patients;
			return patients.filter((p) =>
				`${p.fullName} ${p.phone ?? ""}`.toLowerCase().includes(normalized),
			);
		};
		console.log("\n  фильтр списка:");
		console.log(`    пустой запрос -> ${filter("").length} (весь список)`);
		console.log(`    только пробелы "   " -> ${filter("   ").length}`);
		const firstName = patients[0]?.fullName ?? "";
		const surname = firstName.split(" ")[0] ?? "";
		console.log(`    «${surname}» -> ${filter(surname).length}`);
		console.log(`    «ZZZZ» (заведомо нет) -> ${filter("ZZZZ").length}`);
		console.log(`    «+7» -> ${filter("+7").length} (телефоны в базе как +7… ?)`);
		console.log(`    «7» -> ${filter("7").length}`);
		const withPhone = patients.filter((p) => (p.phone ?? "").trim().length > 0).length;
		console.log(`    пациентов с телефоном: ${withPhone} из ${patients.length}`);
	}

	await pool.end();
}

main().catch(async (error) => {
	console.error(error);
	await pool.end().catch(() => undefined);
	process.exitCode = 1;
});
