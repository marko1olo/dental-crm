/**
 * Проверяет, каким типом numeric-колонка выходит в JSON API.
 *
 * node-postgres по умолчанию отдаёт numeric строкой, и в проекте нет ни одного
 * setTypeParser. Значит колонки numeric(12,2) могут утекать в ответы строками
 * «1500.00», тогда как integer-колонки выходят числами. Это надо знать до
 * миграции денежных колонок: копировать образец можно только если он рабочий.
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

const orgRow = await client.query(`select id from organizations limit 1`);
const orgId = orgRow.rows[0]?.id;

// Тип numeric смотрим приведением в SELECT: таблицы с внешними ключами для
// этого не нужны, а драйвер тот же, каким читает API.
const read = await client.query(`select 1500.50::numeric(12,2) as amount_rub`);
const value = read.rows[0]?.amount_rub;
console.log(`numeric(12,2) читается как: ${typeof value} ${JSON.stringify(value)}`);
console.log(`в JSON это выглядит так: ${JSON.stringify({ amountRub: value })}`);

const intRead = await client.query(`select amount_rub from payments limit 1`);
console.log(
	`integer читается как: ${typeof intRead.rows[0]?.amount_rub} ${JSON.stringify(intRead.rows[0]?.amount_rub)}`,
);

// Точность: выдержит ли numeric деление без потерь на уровне базы.
const split = await client.query(
	`select (1000.00::numeric(12,2) / 3)::numeric(12,2) as third,
	        (1000.00::numeric(12,2) - 2 * (1000.00::numeric(12,2) / 3)::numeric(12,2))::numeric(12,2) as remainder`,
);
console.log(`деление 1000,00 на три: по ${split.rows[0].third}, остаток ${split.rows[0].remainder}`);

console.log(`организация: ${orgId ? "найдена" : "не найдена"}`);
await client.end();
