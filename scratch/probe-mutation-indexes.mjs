/**
 * Какие таблицы имеют уникальность по ключу идемпотентности. Для каждой
 * такой таблицы маршрут обязан переводить нарушение уникальности в
 * «операция уже выполнена», а не в ошибку сервера.
 */
import { readFileSync } from "node:fs";
import pg from "pg";
const line = readFileSync(".env","utf8").split(/\r?\n/).find(l=>l.startsWith("DATABASE_URL="));
const c = new pg.Client({ connectionString: line.slice("DATABASE_URL=".length).trim() });
await c.connect();
const r = await c.query(`
  select t.relname as table_name, i.relname as index_name, pg_get_indexdef(i.oid) as definition
    from pg_class t
    join pg_index ix on t.oid = ix.indrelid
    join pg_class i on i.oid = ix.indexrelid
   where ix.indisunique
     and pg_get_indexdef(i.oid) like '%client_mutation%'
   order by t.relname`);
console.log(`Уникальных индексов по ключу идемпотентности: ${r.rows.length}\n`);
for (const row of r.rows) console.log(`  ${row.table_name}: ${row.index_name}`);
await c.end();
