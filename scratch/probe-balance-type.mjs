/**
 * Проверяет, что реально приходит из family_groups.balance и doctor_commissions
 * через drizzle, когда модель объявляет integer/numeric, а колонка другая.
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

const c = new pg.Client({ connectionString: url });
await c.connect();

const org = await c.query(
	`insert into organizations (name) values ('drift-probe') returning id`,
);
const orgId = org.rows[0].id;

await c.query(
	`insert into family_groups (id, organization_id, name, balance)
	 values (gen_random_uuid(), $1, 'probe', 150.50)`,
	[orgId],
);

const r = await c.query(
	`select balance from family_groups where organization_id = $1`,
	[orgId],
);
const balance = r.rows[0].balance;
console.log("balance value   :", JSON.stringify(balance));
console.log("typeof balance  :", typeof balance);
console.log("balance + 1000  :", JSON.stringify(balance + 1000));
console.log("Number(b) + 1000:", Number(balance) + 1000);

await c.query(`delete from family_groups where organization_id = $1`, [orgId]);
await c.query(`delete from organizations where id = $1`, [orgId]);
await c.end();
