/**
 * Смотрит, что осталось в базе после проверочных прогонов: приёмы, кресла и
 * черновики приёмов с пометкой «Проверка экрана смены».
 */
import { readFileSync } from "node:fs";
import pg from "pg";

function databaseUrl() {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	for (const file of [".env", "apps/api/.env", ".env.local"]) {
		let env;
		try {
			env = readFileSync(file, "utf8");
		} catch {
			continue;
		}
		const line = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
		if (line) return line.slice("DATABASE_URL=".length).trim();
	}
	throw new Error("DATABASE_URL не найден");
}

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();

const appointments = await client.query(
	`select id, patient_id, doctor_user_id, chair_id, starts_at, reason, status from appointments order by starts_at`,
);
console.log("appointments:", appointments.rows.length);
for (const row of appointments.rows) console.log("  ", JSON.stringify(row));

const chairs = await client.query(`select id, name, is_active from chairs`);
console.log("chairs:", chairs.rows.length);
for (const row of chairs.rows) console.log("  ", JSON.stringify(row));

const visits = await client.query(
	`select id, patient_id, status, complaint from visits order by updated_at desc limit 10`,
);
console.log("visits:", visits.rows.length);
for (const row of visits.rows) console.log("  ", JSON.stringify(row).slice(0, 200));

if (process.argv.includes("--clean")) {
	const delA = await client.query(`delete from appointments where reason = 'Проверка экрана смены'`);
	const delV = await client.query(`delete from visits where complaint like 'Проверка экрана смены%'`);
	const delC = await client.query(`delete from chairs where name = 'Проверка экрана смены'`);
	console.log(`удалено: приёмов ${delA.rowCount}, приёмов-черновиков ${delV.rowCount}, кресел ${delC.rowCount}`);
}

await client.end();
