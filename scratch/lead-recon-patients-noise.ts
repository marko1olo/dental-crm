/**
 * ЗАМЕР ДАННЫХ для разведки шума в списке пациентов (наблюдения ведущего 2 и 3).
 *
 * Отвечает на три вопроса числами, а не картинкой:
 *   1. Одинаковы ли значок риска и подсказка «следующее действие» у ВСЕХ
 *      пациентов, или только у шести, попавших в кадр.
 *   2. Чем эти значения определяются (остаток, документы, задачи, снимки).
 *   3. В каком виде ФИО лежит В БАЗЕ — строчными или с заглавных. Это
 *      разделяет «долг сидера» и «экран показывает сырое значение».
 *
 * Свой процесс, а не живой сервер на 4100: тот работает под tsx watch и отдаёт
 * устаревший код. Считается ровно та цепочка, что уходит в браузер:
 * hydrateDomainStateFromDb -> buildDashboard (db/dashboardQuery.ts).
 *
 * ЗАПУСК (cwd apps/api — оттуда загрузчик поднимает DATABASE_URL из корневого .env):
 *   cd apps/api && node --import tsx ../../scratch/lead-recon-patients-noise.ts
 *
 * ТОЛЬКО ЧТЕНИЕ. Ни одного INSERT/UPDATE/DELETE.
 */

import { sql } from "drizzle-orm";
import { db, pool } from "../apps/api/src/db/client.js";
import { getDashboardFromDb } from "../apps/api/src/db/dashboardQuery.js";

function tally<T extends string>(values: readonly T[]): Array<[T, number]> {
	const counts = new Map<T, number>();
	for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
	return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

/** Метки риска — копия AppHelpers.patientInsightRiskLabels, чтобы видеть текст строки. */
const riskLabels: Record<string, string> = {
	low: "спокойно",
	watch: "контроль",
	high: "срочно",
};

function caseShape(name: string): string {
	const words = name.trim().split(/\s+/).filter(Boolean);
	if (!words.length) return "пусто";
	const firstLetters = words.map((word) => word[0] ?? "");
	const allLower = firstLetters.every((letter) => letter === letter.toLowerCase() && letter !== letter.toUpperCase());
	const allUpper = firstLetters.every((letter) => letter === letter.toUpperCase() && letter !== letter.toLowerCase());
	if (allUpper) return "каждое слово с заглавной";
	if (allLower) return "все слова строчными";
	return "смешанно";
}

async function main(): Promise<void> {
	process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";

	const orgs = await db.execute(sql`select id::text as id, name from organizations order by name`);
	console.log(`организаций в базе: ${orgs.rows.length}`);

	console.log("\n=== СЫРЫЕ ФИО В ТАБЛИЦЕ patients (первые 15, как лежат в базе) ===");
	const rawNames = await db.execute(sql`
		select full_name, organization_id::text as org
		  from patients
		 order by created_at asc nulls last
		 limit 15
	`);
	for (const row of rawNames.rows as Array<{ full_name: string; org: string }>) {
		console.log(`  «${row.full_name}» -> ${caseShape(row.full_name)}`);
	}

	const caseStats = await db.execute(sql`
		select count(*)::int as total,
		       count(*) filter (where full_name <> initcap(full_name))::int as not_initcap,
		       count(*) filter (where full_name = lower(full_name))::int as fully_lower,
		       count(*) filter (where left(full_name, 1) = lower(left(full_name, 1))
		                          and left(full_name, 1) <> upper(left(full_name, 1)))::int as starts_lower
		  from patients
	`);
	console.log("\n=== РЕГИСТР ФИО ПО ВСЕЙ ТАБЛИЦЕ patients ===");
	console.log(JSON.stringify(caseStats.rows[0]));

	for (const org of orgs.rows as Array<{ id: string; name: string }>) {
		console.log(`\n=== КЛИНИКА «${org.name}» (${org.id}) ===`);
		const dashboard = await getDashboardFromDb(org.id);
		const patients = dashboard.patients ?? [];
		const insights = dashboard.patientInsights ?? [];
		console.log(`пациентов в сводке: ${patients.length}, строк patientInsights: ${insights.length}`);
		if (!patients.length) continue;

		const withInsight = patients.filter((patient) => insights.some((insight) => insight.patientId === patient.id));
		console.log(`пациентов со строкой .patient-row-meta (есть insight): ${withInsight.length}`);

		console.log("\n  ЗНАЧОК РИСКА (первый span в строке):");
		for (const [level, n] of tally(insights.map((insight) => insight.riskLevel))) {
			const share = ((n / insights.length) * 100).toFixed(1);
			console.log(`    ${level} («${riskLabels[level]}»): ${n} из ${insights.length} — ${share} %`);
		}

		console.log("\n  ПОДСКАЗКА «следующее действие» (strong.patient-next-action):");
		for (const [action, n] of tally(insights.map((insight) => insight.nextBestAction))) {
			const share = ((n / insights.length) * 100).toFixed(1);
			console.log(`    «${action}»: ${n} из ${insights.length} — ${share} %`);
		}

		console.log("\n  ПАРЫ значок + подсказка (то, что физически стоит в строке):");
		for (const [pair, n] of tally(insights.map((insight) => `${riskLabels[insight.riskLevel]} | ${insight.nextBestAction}`))) {
			console.log(`    ${pair}: ${n}`);
		}

		console.log("\n  ЧЕМ ОПРЕДЕЛЯЕТСЯ (входы ветвления nextBestAction, sampleData.ts:1935-1945):");
		console.log(`    остаток > 0: ${insights.filter((insight) => insight.balanceDueRub > 0).length}`);
		console.log(`    открытых задач > 0: ${insights.filter((insight) => insight.openTasks > 0).length}`);
		console.log(`    задача recall есть (recallDueAt): ${insights.filter((insight) => insight.recallDueAt).length}`);
		for (const [n, count] of tally(insights.map((insight) => String(insight.missingDocumentKinds.length)))) {
			console.log(`    не хватает обязательных документов ${n}: у ${count} пациентов`);
		}
		const kinds = tally(insights.flatMap((insight) => insight.missingDocumentKinds));
		console.log("    какие именно документы отсутствуют:");
		for (const [kind, n] of kinds) console.log(`      ${kind}: у ${n} пациентов`);

		console.log("\n  ПЕРВЫЕ 12 СТРОК СПИСКА как их рисует PatientsView (ФИО | значок | подсказка | остаток):");
		for (const patient of patients.slice(0, 12)) {
			const insight = insights.find((entry) => entry.patientId === patient.id);
			console.log(
				`    ${patient.fullName} | ${insight ? riskLabels[insight.riskLevel] : "—"} | ${insight?.nextBestAction ?? "—"} | ${insight?.balanceDueRub ?? 0}`,
			);
		}

		console.log("\n  ФИО В СВОДКЕ (то, что рисуют и список, и заголовок карточки):");
		for (const [shape, n] of tally(patients.map((patient) => caseShape(patient.fullName ?? "")))) {
			console.log(`    ${shape}: ${n} из ${patients.length}`);
		}
		const firstPatient = patients[0];
		if (firstPatient) {
			console.log(
				`    первый в списке: список печатает «${firstPatient.fullName}», заголовок карточки печатает «${firstPatient.fullName}» (один и тот же patient.fullName)`,
			);
		}

		console.log("\n  ДОКУМЕНТЫ ЭТОЙ КЛИНИКИ В БАЗЕ (kind/status/шт):");
		const docs = await db.execute(sql`
			select kind, status, count(*)::int as n
			  from generated_documents
			 where organization_id = ${org.id}::uuid
			 group by kind, status
			 order by n desc
		`);
		if (!docs.rows.length) console.log("    ни одного документа");
		for (const row of docs.rows) console.log(`    ${row.kind} / ${row.status} / ${row.n}`);
	}

	await pool.end();
}

main().catch(async (error) => {
	console.error(error);
	await pool.end().catch(() => undefined);
	process.exitCode = 1;
});
