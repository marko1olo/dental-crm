/**
 * Таблицы, из которых читают, но в которые никто никогда не пишет.
 *
 * В коде есть узор: заводится таблица, к ней запрос `getXFromDb`, маршрут
 * `GET /api/...` и виджет на экране. Записи не заводится нигде — ни в одном
 * обработчике нет insert в эту таблицу. Такой виджет показывает «пусто»
 * всегда, в любой клинике, сколько бы она ни работала. Снаружи это выглядит
 * как «функция есть, просто данных пока нет».
 *
 * Скрипт сверяет по исходникам сервера: для каждой таблицы из схемы считает,
 * есть ли хоть один insert, и есть ли чтение. Только чтение, ничего не меняет.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";

const API = "apps/api/src";
const WEB = "apps/web/src";

function sources(dir) {
	const out = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			out.push(...sources(full));
			continue;
		}
		if ([".ts", ".tsx"].includes(extname(entry))) out.push(full);
	}
	return out;
}

const apiFiles = sources(API).filter((f) => !f.includes("tests"));
const apiText = new Map(apiFiles.map((f) => [f, readFileSync(f, "utf8")]));
const schema = readFileSync(join(API, "db", "schema.ts"), "utf8");

/** Имена таблиц в схеме: `export const someTable = pgTable("some_table", ...`. */
const tables = [];
const declaration = /export const (\w+)\s*=\s*pgTable\(\s*["'`]([\w]+)["'`]/g;
let match;
while ((match = declaration.exec(schema)) !== null) {
	tables.push({ symbol: match[1], name: match[2] });
}

/** Файлы, где символ таблицы вообще упоминается (кроме самой схемы). */
function mentions(symbol) {
	const out = [];
	for (const file of apiFiles) {
		if (file.endsWith(join("db", "schema.ts"))) continue;
		if (new RegExp(`\\b${symbol}\\b`).test(apiText.get(file))) out.push(file);
	}
	return out;
}

/*
 * Обращения к таблице пишут двумя способами: прямым символом
 * `db.insert(clinicChairs)` и через пространство имён
 * `db.insert(schema.clinicChairs)`. Первая редакция проверки знала только
 * первый и объявила незаполняемой таблицу clinic_chairs — а кресла заводятся
 * в настройках, и я это видел своими глазами. Проверка, обвиняющая невиновных,
 * хуже отсутствующей: по её списку начинают выпиливать работающее.
 */
const reference = (symbol) => `(?:\\w+\\.)?${symbol}`;

/** Есть ли вставка в таблицу. */
function hasInsert(symbol) {
	const pattern = new RegExp(`insert\\s*\\(\\s*${reference(symbol)}\\s*[),]`);
	for (const file of apiFiles) {
		if (pattern.test(apiText.get(file))) return file;
	}
	return null;
}

/** Есть ли чтение. */
function hasSelect(symbol) {
	const pattern = new RegExp(`from\\s*\\(\\s*${reference(symbol)}\\s*[),]`);
	for (const file of apiFiles) {
		if (pattern.test(apiText.get(file))) return file;
	}
	return null;
}

/** Виден ли экран: есть ли в вебе виджет, зовущий маршрут этой таблицы. */
const webText = sources(WEB)
	.map((f) => readFileSync(f, "utf8"))
	.join("\n");

const readOnly = [];
for (const { symbol, name } of tables) {
	const used = mentions(symbol);
	if (used.length === 0) continue;
	const select = hasSelect(symbol);
	if (!select) continue;
	if (hasInsert(symbol)) continue;
	// Маршрут обычно повторяет имя таблицы через дефисы.
	const route = name.replace(/_/g, "-");
	const onScreen = webText.includes(route);
	readOnly.push({ symbol, name, onScreen });
}

console.log(`таблиц в схеме: ${tables.length}`);
console.log(`из них читаются, но никогда не заполняются: ${readOnly.length}`);
const visible = readOnly.filter((t) => t.onScreen);
console.log(`  из них показаны пользователю: ${visible.length}`);

/*
 * Сверка с живой базой.
 *
 * Разбор исходников говорит только о том, что вставки нет в коде. Живая база
 * отвечает на другой вопрос: набралось ли там хоть что-нибудь за всё время
 * работы. Ноль строк рядом с отсутствующей вставкой — это уже не подозрение.
 * Ненулевая таблица означает, что разбор чего-то не увидел, и такую строку
 * надо разбирать руками, а не заносить в обвинительный список.
 */
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
	return null;
}

const url = databaseUrl();
const counts = new Map();
if (url) {
	const pg = (await import("pg")).default;
	const client = new pg.Client({ connectionString: url });
	await client.connect();
	for (const table of readOnly) {
		try {
			const result = await client.query(`select count(*)::int as n from "${table.name}"`);
			counts.set(table.name, result.rows[0].n);
		} catch {
			counts.set(table.name, "нет таблицы");
		}
	}
	await client.end();
}

const withCount = (t) => (counts.has(t.name) ? `  ${t.name} — строк: ${counts.get(t.name)}` : `  ${t.name}`);

console.log("\nпоказаны пользователю и всегда пусты:");
for (const t of visible) console.log(withCount(t));
console.log("\nне показаны (мёртвая схема и маршрут):");
for (const t of readOnly.filter((x) => !x.onScreen)) console.log(withCount(t));

const suspicious = readOnly.filter((t) => typeof counts.get(t.name) === "number" && counts.get(t.name) > 0);
if (suspicious.length > 0) {
	console.log("\nвнимание: строки есть, значит разбор исходников что-то упустил —");
	console.log("проверьте руками, прежде чем считать эти таблицы мёртвыми:");
	for (const t of suspicious) console.log(`  ${t.name} — ${counts.get(t.name)}`);
}
void relative;
