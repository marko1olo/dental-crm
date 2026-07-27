/**
 * Есть ли в базе уникальность на (organization_id, client_mutation_id).
 *
 * Маршрут приёма оплаты сначала ищет платёж по clientMutationId, и только
 * потом вставляет — двумя разными запросами, вне транзакции. Если
 * уникального индекса нет, два одновременных запроса с одним ключом оба
 * увидят «платежа нет» и оба вставят: пациент заплатит дважды. Ключ
 * идемпотентности только для этого и нужен.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const line = readFileSync(".env", "utf8")
	.split(/\r?\n/)
	.find((l) => l.startsWith("DATABASE_URL="));
const c = new pg.Client({ connectionString: line.slice("DATABASE_URL=".length).trim() });
await c.connect();

const r = await c.query(
	`select i.relname as index_name,
	        ix.indisunique as is_unique,
	        pg_get_indexdef(i.oid) as definition
	   from pg_class t
	   join pg_index ix on t.oid = ix.indrelid
	   join pg_class i on i.oid = ix.indexrelid
	  where t.relname = $1
	  order by ix.indisunique desc, i.relname`,
	["payments"],
);

console.log(`Индексы таблицы payments: ${r.rows.length}\n`);
for (const row of r.rows) {
	console.log(`${row.is_unique ? "УНИКАЛЬНЫЙ" : "обычный   "}  ${row.index_name}`);
	console.log(`            ${row.definition}`);
}

const hasKeyIndex = r.rows.some((row) => row.is_unique && /client_mutation_id/.test(row.definition));
console.log(`\nУникальность по ключу идемпотентности: ${hasKeyIndex ? "ЕСТЬ" : "ОТСУТСТВУЕТ"}`);

const cons = await c.query(
	`select conname, pg_get_constraintdef(oid) as definition
	   from pg_constraint
	  where conrelid = 'payments'::regclass
	  order by conname`,
);
console.log(`\nОграничения таблицы payments: ${cons.rows.length}`);
for (const row of cons.rows) console.log(`  ${row.conname}: ${row.definition}`);

await c.end();
