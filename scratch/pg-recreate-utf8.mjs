/**
 * Recreate the app database with UTF8 encoding.
 *
 * WHY: initdb inherited the host's Russian Windows locale, so the cluster
 * default became WIN1251. Migration 0000 contains the ruble sign ₽ (U+20BD),
 * which has no WIN1251 equivalent, and every apply aborted with
 * "character with byte sequence 0xe2 0x82 0xbd ... has no equivalent".
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const raw = readFileSync(".env", "utf8")
	.split(/\r?\n/)
	.find((l) => l.startsWith("DATABASE_URL="))
	.slice("DATABASE_URL=".length)
	.trim();
const url = new URL(raw);
const target = url.pathname.replace(/^\//, "");

const adminUrl = new URL(raw);
adminUrl.pathname = "/postgres";

const client = new pg.Client({ connectionString: adminUrl.toString() });
await client.connect();

const before = await client.query(
	"select pg_encoding_to_char(encoding) as enc from pg_database where datname=$1",
	[target],
);
console.log(`current encoding of ${target}: ${before.rows[0]?.enc ?? "(absent)"}`);

await client.query(
	`select pg_terminate_backend(pid) from pg_stat_activity where datname='${target}' and pid <> pg_backend_pid()`,
);
await client.query(`DROP DATABASE IF EXISTS "${target}"`);
await client.query(
	`CREATE DATABASE "${target}" WITH ENCODING 'UTF8' TEMPLATE template0 LC_COLLATE 'C' LC_CTYPE 'C'`,
);

const after = await client.query(
	"select pg_encoding_to_char(encoding) as enc from pg_database where datname=$1",
	[target],
);
console.log(`new encoding of ${target}: ${after.rows[0].enc}`);
await client.end();
