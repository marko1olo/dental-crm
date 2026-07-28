/**
 * Тест переписи пустотелых модулей.
 *
 * Проверяет ровно те три места, где перепись уже давала ложь:
 *
 * 1. НАИВНЫЙ ПОДСЧЁТ. Совпадение `db.insert(<имя модуля>` объявляло пустотелым
 *    `auditQuery`, который делает настоящие вставки в `auditEvents`. Имя файла и
 *    имя таблицы не совпадают — и именно так родилось число 45 вместо 24.
 * 2. ДИНАМИЧЕСКИЙ ИМПОРТ. Первая версия этого же скрипта смотрела только
 *    статические `import`, поэтому девятнадцать модулей, подключённых через
 *    `await import(...)` в routes/clinical.ts, выглядели «никем не импортированы».
 *    Удаление по такому отчёту ломает HEAD — так уже дважды и произошло.
 * 3. ЧУЖИЕ ТАБЛИЦЫ. Модуль читает и `patients`, и свою мёртвую таблицу. Вердикт
 *    «есть хоть один писатель» назвал бы его живым, а панель всё равно пуста.
 *
 * ЗАПУСК: node --import tsx --test scripts/census-hollow-query-modules.test.mjs
 * Базу не трогает: перепись вызывается без `--db`.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPTS_DIR, "..");
const CENSUS = join(SCRIPTS_DIR, "census-hollow-query-modules.mjs");

const census = JSON.parse(
	execFileSync(process.execPath, [CENSUS, "--json"], {
		cwd: REPO_ROOT,
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
	}),
);

const byModule = new Map(census.report.map((entry) => [entry.module, entry]));

test("перепись видит РОВНО те модули db/*Query.ts, что лежат на диске", () => {
	/*
	 * Порог вида «модулей не меньше сорока» здесь стоял и был неверен по сути:
	 * он падал ровно тогда, когда уборка удавалась и мёртвые модули исчезали.
	 * Проверять надо согласованность с диском, а не текущее количество мусора.
	 */
	const onDisk = readdirSync(join(REPO_ROOT, "apps", "api", "src", "db"))
		.filter((name) => name.endsWith("Query.ts") && !name.endsWith(".test.ts"))
		.map((name) => name.replace(/\.ts$/, ""))
		.sort();
	assert.ok(onDisk.length > 0, "модулей *Query.ts на диске не осталось совсем");
	assert.deepEqual([...census.report.map((r) => r.module)].sort(), onDisk);
	assert.equal(census.totalModules, census.report.length);
	assert.ok(census.tablesInSchema > 100, `таблиц найдено ${census.tablesInSchema}`);
});

test("auditQuery НЕ пустотелый: имя файла не равно имени таблицы", () => {
	const audit = byModule.get("auditQuery");
	assert.ok(audit, "auditQuery отсутствует в переписи");
	assert.ok(audit.importedTables.includes("auditEvents"), `таблицы: ${audit.importedTables}`);
	const events = audit.perTable.find((t) => t.table === "auditEvents");
	assert.ok(events, "таблица auditEvents не попала в вердикт");
	assert.ok(events.runtimeWriters > 0, `писателей auditEvents: ${events.runtimeWriters}`);
	assert.equal(audit.verdict, "ЖИВОЙ");
});

test("динамический await import учтён как настоящий потребитель", () => {
	const dynamicOnly = ["patientServiceLineagesQuery", "prodoctorovSyncExportsQuery"];
	for (const name of dynamicOnly) {
		const entry = byModule.get(name);
		if (!entry) continue; // модуль мог быть уже удалён — тогда проверять нечего
		assert.ok(
			entry.importers.some((f) => f.endsWith("routes/clinical.ts")),
			`${name}: потребители = ${JSON.stringify(entry.importers)}`,
		);
	}
});

test("пустотелый вердикт означает ноль писателей у КАЖДОЙ читаемой таблицы", () => {
	const hollow = census.report.filter((r) => r.verdict === "ПУСТОТЕЛЫЙ");
	assert.ok(hollow.length > 0, "пустотелых не найдено — перепись сломана либо всё вычищено");
	for (const entry of hollow) {
		assert.ok(entry.perTable.length > 0, `${entry.module}: вердикт без таблиц`);
		for (const t of entry.perTable) {
			assert.equal(t.runtimeWriters, 0, `${entry.module}.${t.table} писателей ${t.runtimeWriters}`);
			assert.equal(t.migrationSeeds, 0, `${entry.module}.${t.table} наполняется миграцией`);
		}
	}
});

test("смешанный вердикт: живая таблица рядом с мёртвой не делает модуль живым", () => {
	const mixed = census.report.filter((r) => r.verdict === "СМЕШАННЫЙ");
	for (const entry of mixed) {
		assert.ok(
			entry.perTable.some((t) => t.runtimeWriters > 0),
			`${entry.module}: смешанный без единой живой таблицы`,
		);
		assert.ok(entry.deadTables.length > 0, `${entry.module}: смешанный без мёртвой таблицы`);
	}
});

test("каждый путь потребителя существует на диске", () => {
	for (const entry of census.report) {
		for (const importer of entry.importers) {
			assert.ok(existsSync(join(REPO_ROOT, importer)), `нет файла ${importer}`);
		}
		assert.ok(existsSync(join(REPO_ROOT, entry.path)), `нет файла ${entry.path}`);
	}
});
