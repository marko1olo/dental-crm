/**
 * ДОКАЗАТЕЛЬСТВО, ЧТО ВСЕ ДЕВЯТЬ ОТЧЁТОВ РУКОВОДИТЕЛЯ ОТВЕЧАЮТ НА ЖИВЫХ ДАННЫХ.
 *
 * ЗАЧЕМ ЭТОТ СКРИПТ, ЕСЛИ ЕСТЬ tests/routes/managerReports.test.ts. Тот набор
 * заводит СВОЮ организацию с известными числами и сверяет арифметику — это
 * проверка расчёта. Здесь вопрос другой: отвечает ли маршрут на данных, которые
 * реально лежат в базе этой установки, и в той форме запроса, которой ходит
 * панель отчётов, — календарной датой `YYYY-MM-DD` без часов и смещения.
 *
 * ПОЧЕМУ В СВОЁМ ПРОЦЕССЕ. Общий сервер разработки на 4100 отдаёт СТАРУЮ сборку:
 * проверять по нему то, что только что появилось в файле, нельзя. `app.inject`
 * поднимает маршруты этого дерева в этом процессе.
 *
 * ТОЛЬКО ЧТЕНИЕ. Девять GET и несколько SELECT для выбора периода. Скрипт не
 * пишет в базу ни одной строки и ничего не удаляет.
 *
 * ЗАПУСК (cwd apps/api):
 *   node --import tsx src/tests/routes/managerReportsReachabilityProof.ts
 *
 * Не тест: имя без `.test.ts`, `npm test` его не подхватывает.
 */

import { sql } from "drizzle-orm";
import Fastify from "fastify";
import { db, pool } from "../../db/client.js";
import { registerReportRoutes } from "../../routes/reports.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { getRequestIdentity } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";

async function firstRow<T extends Record<string, unknown>>(
	query: ReturnType<typeof sql>,
): Promise<T | null> {
	const result = await db.execute(query);
	return ((result.rows as T[])[0] ?? null) as T | null;
}

/** Календарная дата — ровно та форма, которую посылает `<input type="date">`. */
function calendarDate(value: Date): string {
	return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
}

/** Непустое тело: ответ есть, и в нём есть что показать человеку. */
function describe(body: unknown): string {
	if (body === null || typeof body !== "object") return String(body);
	const record = body as Record<string, unknown>;
	const parts: string[] = [];
	for (const [key, value] of Object.entries(record)) {
		if (key === "period") continue;
		if (Array.isArray(value)) parts.push(`${key}=[${value.length}]`);
		else if (value !== null && typeof value === "object")
			parts.push(`${key}={${Object.keys(value).length}}`);
		else parts.push(`${key}=${String(value)}`);
	}
	return parts.join(" ");
}

async function main(): Promise<void> {
	// Периметр открыт только для своего процесса: секрета администратора у
	// скрипта нет, а мягкий режим чтения разрешён вне production
	// (apps/api/src/accessGuard.ts).
	process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";

	const org = await firstRow<{
		id: string;
		name: string;
		payments: number;
		appointments: number;
	}>(
		sql`select o.id::text as id,
		           o.name,
		           (select count(*)::int from payments p where p.organization_id = o.id) as payments,
		           (select count(*)::int from appointments a where a.organization_id = o.id) as appointments
		      from organizations o
		     order by (select count(*) from appointments a where a.organization_id = o.id) desc,
		              (select count(*) from payments p where p.organization_id = o.id) desc
		     limit 1`,
	);
	if (!org)
		throw new Error(
			"В базе нет ни одной организации — отчёты строить не на чем.",
		);
	if (org.appointments === 0 && org.payments === 0) {
		throw new Error(
			`У организации «${org.name}» нет ни приёмов, ни платежей: пустой ответ ничего не докажет.`,
		);
	}

	const span = await firstRow<{
		first_at: string | null;
		last_at: string | null;
	}>(
		sql`select to_char(min(moment), 'YYYY-MM-DD') as first_at, to_char(max(moment), 'YYYY-MM-DD') as last_at
		      from (
		            select starts_at as moment from appointments where organization_id = ${org.id}
		            union all
		            select paid_at as moment from payments where organization_id = ${org.id} and status = 'paid'
		           ) moments`,
	);
	if (!span?.first_at || !span?.last_at)
		throw new Error("Не удалось определить период с данными.");

	// Маршрут отвергает период длиннее 400 дней. Берём последние 365 суток с
	// данными: обрезать молча нельзя, а отчёт должен считаться на настоящем окне.
	const last = new Date(`${span.last_at}T00:00:00Z`);
	const first = new Date(`${span.first_at}T00:00:00Z`);
	const yearBack = new Date(last.getTime() - 364 * 86_400_000);
	const from = calendarDate(first > yearBack ? first : yearBack);
	const to = calendarDate(last);

	const doctor = await firstRow<{ id: string }>(
		sql`select id::text as id from users where organization_id = ${org.id} order by created_at limit 1`,
	);
	const clinicToken = signToken({ organizationId: org.id }, authTokenSecret());
	const staffToken = signToken(
		{ organizationId: org.id, userId: doctor?.id ?? org.id, role: "owner" },
		authTokenSecret(),
	);
	const headers = {
		"x-dente-clinic-token": clinicToken,
		"x-dente-staff-token": staffToken,
	};

	console.log(`КЛИНИКА «${org.name}» (${org.id})`);
	console.log(`приёмов в базе: ${org.appointments}, платежей: ${org.payments}`);
	console.log(`период запроса (как посылает панель): from=${from} to=${to}`);
	console.log("");

	const app = Fastify();
	app.addHook("onRequest", async (request) => {
		getRequestIdentity(request);
	});
	await registerReportRoutes(app);

	// Девять отчётов управляющего ровно в том порядке, в котором они объявлены в
	// routes/reports.ts, плюс сводка — её панель зовёт и без этой правки.
	const targets = [
		`/api/reports/revenue?from=${from}&to=${to}&granularity=month`,
		`/api/reports/doctors?from=${from}&to=${to}`,
		`/api/reports/chairs?from=${from}&to=${to}`,
		`/api/reports/appointments?from=${from}&to=${to}`,
		`/api/reports/reminder-effect?from=${from}&to=${to}`,
		`/api/reports/patient-flow?from=${from}&to=${to}`,
		`/api/reports/services?from=${from}&to=${to}`,
		`/api/reports/schedule-load?from=${from}&to=${to}`,
		"/api/reports/receivables",
		`/api/reports/summary?from=${from}&to=${to}&granularity=month`,
	];

	let failures = 0;
	try {
		for (const url of targets) {
			const response = await app.inject({ method: "GET", url, headers });
			const ok = response.statusCode === 200 && response.body.length > 2;
			if (!ok) failures += 1;
			let parsed: unknown = null;
			try {
				parsed = JSON.parse(response.body);
			} catch {
				parsed = response.body;
			}
			console.log(
				`${ok ? "OK " : "НЕТ"} ${response.statusCode} ${response.body.length} байт  ${url.split("?")[0]}`,
			);
			console.log(`      ${describe(parsed)}`);
		}
	} finally {
		await app.close();
		await pool.end();
	}

	console.log("");
	console.log(
		failures === 0
			? "ВСЕ ОТВЕТИЛИ 200 С НЕПУСТЫМ ТЕЛОМ"
			: `ПРОВАЛОВ: ${failures}`,
	);
	if (failures > 0) process.exitCode = 1;
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
