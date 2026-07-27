/** Показывает организации и распределение приёмов/кресел по ним. */
import { readFileSync } from "node:fs";
import pg from "pg";

const line = readFileSync(".env", "utf8")
	.split(/\r?\n/)
	.find((l) => l.startsWith("DATABASE_URL="));
const c = new pg.Client({ connectionString: line.slice("DATABASE_URL=".length).trim() });
await c.connect();
console.log("организации:", (await c.query("select id, name from organizations limit 5")).rows);
console.log("приёмы по организациям:", (await c.query("select organization_id, count(*) from appointments group by 1 limit 5")).rows);
console.log("кресла:", (await c.query("select id, organization_id, name from chairs limit 5")).rows);
console.log(
	"колонки chairs:",
	(await c.query("select column_name, is_nullable from information_schema.columns where table_name='chairs' order by ordinal_position")).rows
		.map((r) => `${r.column_name}${r.is_nullable === "NO" ? "*" : ""}`)
		.join(", "),
);
await c.end();
