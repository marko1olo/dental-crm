/**
 * Проверяет, теряются ли копейки в итогах отчётов уже сейчас.
 *
 * В отчётах сумма строк плана считается так:
 *   coalesce(sum(greatest(unit_price_rub * greatest(quantity,1) - discount_rub, 0)), 0)::int
 *
 * `quantity` объявлена numeric(10,2), то есть дробная. Значит произведение
 * дробное, а приведение `::int` округляет его до целых рублей. Копейки
 * теряются независимо от типа колонки цены — и потеряются ещё заметнее, когда
 * цена станет numeric(12,2).
 *
 * Скрипт считает то же выражение двумя способами на живой базе и печатает
 * разницу. Ничего не меняет.
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

const rows = await client.query(`
	select
		count(*)::int as items,
		coalesce(sum(greatest(unit_price_rub * greatest(quantity, 1) - discount_rub, 0)), 0)::int as as_int,
		coalesce(sum(greatest(unit_price_rub * greatest(quantity, 1) - discount_rub, 0)), 0)::numeric(14,2) as as_numeric
	from treatment_items
`);
const { items, as_int, as_numeric } = rows.rows[0];
const difference = Number(as_numeric) - Number(as_int);
console.log(`строк плана лечения в базе: ${items}`);
console.log(`итог с приведением ::int      : ${as_int}`);
console.log(`итог без приведения numeric   : ${as_numeric}`);
console.log(`потеряно приведением          : ${difference.toFixed(2)}`);

console.log("\nдробные количества в базе:");
const fractional = await client.query(`
	select id, title, quantity, unit_price_rub, discount_rub,
	       (unit_price_rub * greatest(quantity,1) - discount_rub)::numeric(14,2) as exact,
	       (unit_price_rub * greatest(quantity,1) - discount_rub)::int as rounded
	from treatment_items
	where quantity <> round(quantity)
	limit 10
`);
if (fractional.rows.length === 0) {
	console.log("  сейчас все количества целые — потери не видно на этих данных");
} else {
	for (const row of fractional.rows) {
		console.log(
			`  ${row.title}: ${row.quantity} × ${row.unit_price_rub} = ${row.exact}, в отчёте ${row.rounded}`,
		);
	}
}

// Показательный расчёт: половина услуги ценой с копейками.
const demo = await client.query(`
	select (6805.50::numeric(12,2) * 0.5)::numeric(14,2) as exact,
	       (6805.50::numeric(12,2) * 0.5)::int as rounded
`);
console.log(
	`\nпоказательно: половина услуги за 6805,50 ₽ = ${demo.rows[0].exact}, ` +
		`в отчёте ${demo.rows[0].rounded} — расхождение ${(Number(demo.rows[0].exact) - Number(demo.rows[0].rounded)).toFixed(2)}`,
);

await client.end();
