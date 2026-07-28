/**
 * Почему вход в кабинет отвечает 500: живая проверка ТОЛЬКО ЧТЕНИЕМ.
 *
 * Симптом: POST /api/auth/clinic/login → 500 с текстом «Failed query: insert
 * into audit_events ...». Подозрение из кода: routes/auth.ts при отсутствии
 * организации в базе ВЫДУМЫВАЕТ демо-организацию в памяти
 * (id 00000000-0000-0000-0000-000000000001), а затем пишет запись аудита, у
 * которой organization_id — внешний ключ на organizations.id. Ссылка в никуда.
 *
 * Здесь не угадывается: спрашиваем базу, есть ли эта строка и какое ограничение
 * стоит на колонке. Скрипт НИЧЕГО НЕ ПИШЕТ.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

function databaseUrl() {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	const env = readFileSync(".env", "utf8");
	const line = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
	if (!line) throw new Error("DATABASE_URL не найден в корневом .env");
	return line.slice("DATABASE_URL=".length).trim();
}

const DEMO_ORG = "00000000-0000-0000-0000-000000000001";
const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();

const orgs = await client.query("select id, name from organizations order by name");
console.log(`организаций в базе: ${orgs.rows.length}`);
for (const o of orgs.rows) console.log(`  ${o.id}  ${o.name}`);

const demo = orgs.rows.find((o) => o.id === DEMO_ORG);
console.log(`\nдемо-организация ${DEMO_ORG} в базе: ${demo ? "ЕСТЬ (" + demo.name + ")" : "НЕТ"}`);

/* Ограничения внешнего ключа на audit_events: подтверждаем, что ссылка реальна,
 * а не додумана по тексту схемы. */
const fks = await client.query(`
  select con.conname, pg_get_constraintdef(con.oid) as def
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'audit_events' and con.contype = 'f'
`);
console.log(`\nвнешние ключи audit_events: ${fks.rows.length}`);
for (const f of fks.rows) console.log(`  ${f.conname}: ${f.def}`);

/* Сколько карт пациентов у каждой организации: проверка рекламаций падала на
 * «нет карт», и надо знать, где они лежат. */
const pts = await client.query(`
  select organization_id, count(*)::int as n from patients group by organization_id
`);
console.log(`\nкарты пациентов по организациям:`);
for (const p of pts.rows) console.log(`  ${p.organization_id}  карт ${p.n}`);
if (pts.rows.length === 0) console.log("  (ни одной карты ни у кого)");

/* Пользователи: вход сотрудника ходит по OWNER-идентификатору из проверок. */
const users = await client.query(
	"select id, organization_id, full_name from users order by full_name limit 10",
);
console.log(`\nсотрудники (до 10):`);
for (const u of users.rows) console.log(`  ${u.id}  org=${u.organization_id}  ${u.full_name}`);

await client.end();
