/**
 * Проверяет на ЖИВОЙ базе, что баланс семейного кошелька больше не теряет
 * копейки: 150.50 − 100 руб. должно дать ровно 50.50, а не 51.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const url = (() => {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	const line = readFileSync(".env", "utf8")
		.split(/\r?\n/)
		.find((l) => l.startsWith("DATABASE_URL="));
	return line.slice("DATABASE_URL=".length).trim();
})();

const { parseKopecks, kopecksToNumericString, rublesToKopecks } = await import(
	"../packages/shared/dist/utils/money.js"
);

const c = new pg.Client({ connectionString: url });
await c.connect();

const org = await c.query(
	`insert into organizations (name) values ('wallet-fix-probe') returning id`,
);
const orgId = org.rows[0].id;
await c.query(
	`insert into family_groups (id, organization_id, name, balance)
	 values (gen_random_uuid(), $1, 'probe', '150.50')`,
	[orgId],
);

const read = async () =>
	(
		await c.query(`select balance from family_groups where organization_id = $1`, [
			orgId,
		])
	).rows[0].balance;

const before = await read();
console.log(`баланс до оплаты      : ${before}`);

const paymentRub = 100;

// Как считалось раньше: Number() + вычитание в double + Math.round при записи.
const oldWay = Math.round(Number(before) - paymentRub);
console.log(`СТАРЫЙ путь запишет   : ${oldWay}   <- копейки потеряны`);

// Как считается теперь: целые копейки, запись строкой.
const newWay = kopecksToNumericString(
	parseKopecks(before) - rublesToKopecks(paymentRub),
);
console.log(`НОВЫЙ путь запишет    : ${newWay}`);

await c.query(`update family_groups set balance = $2 where organization_id = $1`, [
	orgId,
	newWay,
]);
const after = await read();
console.log(`баланс в базе после   : ${after}`);
console.log(
	`совпадает с ожиданием : ${after === "50.50" ? "ДА" : `НЕТ (получено ${after})`}`,
);

await c.query(`delete from family_groups where organization_id = $1`, [orgId]);
await c.query(`delete from organizations where id = $1`, [orgId]);
await c.end();
