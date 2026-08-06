/**
 * smoke-schema-missing-declarations.test.mjs
 *
 * Доказывает, что страж ПАДАЕТ на искусственном пропуске объявления, а не только
 * написан. Без этого «страж работает» ничем не отличается от «страж написан»:
 * в этой кампании уже доказано, что другой страж проходил бы и будучи сломанным.
 *
 * Каждая проверка запускает НАСТОЯЩИЙ страж отдельным процессом и смотрит на
 * настоящий код возврата. Логику стража тест не повторяет — повторённая логика
 * подтверждает саму себя, а не проверяемый файл.
 *
 * ЗАПУСК: node --test scripts/smoke-schema-missing-declarations.test.mjs
 * Нужна живая база (только select). Если базы нет, тест ПАДАЕТ, а не пропускается:
 * молчаливый пропуск — это и есть страж, который проходит будучи сломанным.
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GUARD = join("scripts", "smoke-schema-missing-declarations.mjs");

/** Объявления, на которых строятся проверки. Переименуют — тест скажет об этом прямо. */
const LIVE_TABLE = "patients";
const LIVE_COLUMN = "phone";

function runGuard(...args) {
	const result = spawnSync(process.execPath, [GUARD, ...args], {
		cwd: REPO_ROOT,
		encoding: "utf8",
	});
	const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
	assert.notEqual(
		result.status,
		2,
		`страж не дошёл до живой базы — доказательства нет, а не «проверено»:\n${output}`,
	);
	return { status: result.status, output };
}

test("на нетронутой схеме страж проходит: реестр исключений точно описывает базу", () => {
	const { status, output } = runGuard("--json");
	const report = JSON.parse(output);
	assert.equal(status, 0, `страж упал на нетронутой схеме:\n${output}`);
	assert.equal(report.ok, true);
	assert.ok(
		report.tablesInDatabase > 100,
		`таблиц в базе неправдоподобно мало: ${report.tablesInDatabase}`,
	);
	assert.ok(
		report.tablesDeclared > 100,
		`объявлений неправдоподобно мало: ${report.tablesDeclared}`,
	);
});

test("пропуск объявления ТАБЛИЦЫ валит страж — это класс дефекта egisz_logs", () => {
	const { status, output } = runGuard(`--simulate-missing=${LIVE_TABLE}`);
	assert.equal(
		status,
		1,
		`страж НЕ упал на скрытом объявлении таблицы ${LIVE_TABLE} — он бесполезен:\n${output}`,
	);
	assert.match(output, new RegExp(`таблица "${LIVE_TABLE}" есть в живой базе`));
	assert.match(output, /причины в списке исключений нет/);
});

test("пропуск объявления КОЛОНКИ валит страж", () => {
	const { status, output } = runGuard(
		`--simulate-missing=${LIVE_TABLE}.${LIVE_COLUMN}`,
	);
	assert.equal(
		status,
		1,
		`страж НЕ упал на скрытой колонке ${LIVE_TABLE}.${LIVE_COLUMN} — если её переименовали, ` +
			`поправьте LIVE_COLUMN в этом тесте:\n${output}`,
	);
	assert.match(
		output,
		new RegExp(
			`колонки без объявления и вне записи списка исключений — ${LIVE_COLUMN}`,
		),
	);
});

test("реестр исключений не покрывает пропуск: скрытая таблица не оправдывается чужой записью", () => {
	const { output } = runGuard(`--simulate-missing=${LIVE_TABLE}`);
	// В реестре 19 таблиц; ни одна из них не должна «прикрыть» скрытую patients.
	assert.doesNotMatch(
		output,
		/_dente_migrations/,
		`реестр применён не к той таблице:\n${output}`,
	);
});

test("самопроверка не врёт: скрывать несуществующее объявление нельзя", () => {
	const result = spawnSync(
		process.execPath,
		[GUARD, "--simulate-missing=нет_такой_таблицы"],
		{
			cwd: REPO_ROOT,
			encoding: "utf8",
		},
	);
	const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
	assert.equal(
		result.status,
		2,
		`ожидался код 2 «скрывать нечего», получено ${result.status}:\n${output}`,
	);
	assert.match(output, /скрывать нечего/);
});
