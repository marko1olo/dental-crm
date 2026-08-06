#!/usr/bin/env node
/**
 * ci-provision-db.mjs — заводит в сервисном контейнере CI роль и базу, ПОХОЖИЕ
 * на боевые. Запускается только из .github/workflows/ci.yml.
 *
 * ПОЧЕМУ ЭТОТ ФАЙЛ ВООБЩЕ НУЖЕН — ДВЕ НЕЗАВИСИМЫЕ ПРИЧИНЫ, ОБЕ ИЗМЕРЕНЫ.
 *
 * 1. МИГРАЦИЯ 0161 ЖЁСТКО НАЗЫВАЕТ РОЛЬ `dental`. В
 *    apps/api/drizzle/0161_audit_append_only.sql четыре ИСПОЛНЯЕМЫХ оператора:
 *      REVOKE UPDATE, DELETE, TRUNCATE ON "audit_events" FROM dental;
 *      REVOKE UPDATE, DELETE, TRUNCATE ON "clinical_audit_logs" FROM dental;
 *      GRANT UPDATE ("organization_id", "actor_user_id") ON "audit_events" TO dental;
 *      GRANT UPDATE ("patient_id") ON "clinical_audit_logs" TO dental;
 *    На стандартном контейнере postgres роли `dental` нет, и все четыре падают с
 *    «role "dental" does not exist». Миграция выполняется в транзакции, runner
 *    останавливается с EXIT=1 — то есть БЕЗ этой подготовки схема в CI не
 *    накатывается вообще, и всё задание тестов API бессмысленно.
 *
 * 2. РОЛЬ ОБЯЗАНА БЫТЬ НЕ СУПЕРПОЛЬЗОВАТЕЛЕМ, И ЭТО ВАЖНЕЕ ПЕРВОГО.
 *    По .agents/DATABASE.md приложение подключается ролью `dental`, которая НЕ
 *    суперпользователь и не имеет BYPASSRLS, но ВЛАДЕЕТ всеми таблицами. Именно
 *    поэтому в миграции 0159 стоит FORCE ROW LEVEL SECURITY: без FORCE владелец
 *    таблицы освобождён от её же политик. А суперпользователь обходит RLS ВСЕГДА,
 *    FORCE или нет.
 *    Значит соблазнительный короткий путь — поднять контейнер с
 *    POSTGRES_USER=dental — даёт роль-суперпользователя, RLS в CI молча
 *    выключается, и все тесты арендной изоляции начинают проверять пустоту,
 *    оставаясь зелёными. Это худший из возможных исходов: гейт, который врёт.
 *    Поэтому роль создаётся отдельно и явно как NOSUPERUSER NOBYPASSRLS.
 *
 * База отдаётся во владение `dental`: миграции накатываются ею же, значит она
 * становится владельцем таблиц — как на боевой машине. Владение нужно и для
 * CREATE EXTENSION btree_gist из миграции 0154.
 *
 * ЗАПУСК: node .github/workflows/ci-provision-db.mjs
 * Читает ADMIN_DATABASE_URL (суперпользователь), CI_DB_NAME, CI_DB_ROLE,
 * CI_DB_PASSWORD. Идемпотентен: повторный запуск ничего не ломает.
 */

import pg from "pg";

const adminUrl = process.env.ADMIN_DATABASE_URL;
const dbName = process.env.CI_DB_NAME;
const roleName = process.env.CI_DB_ROLE;
const rolePassword = process.env.CI_DB_PASSWORD;

for (const [name, value] of Object.entries({ ADMIN_DATABASE_URL: adminUrl, CI_DB_NAME: dbName, CI_DB_ROLE: roleName, CI_DB_PASSWORD: rolePassword })) {
	if (!value) {
		console.error(`[provision] ${name} не задан.`);
		process.exit(1);
	}
}

// Идентификаторы приходят из ci.yml, но подставлять их в SQL склейкой всё равно
// нельзя: это ровно тот приём, который .agents/AGENTS.md запрещает. Ни роль, ни
// имя базы нельзя передать параметром ($1) — PostgreSQL не принимает параметры в
// DDL, — поэтому они проверяются по белому списку символов и цитируются.
const SAFE_IDENTIFIER = /^[a-z_][a-z0-9_]*$/;
for (const [name, value] of Object.entries({ CI_DB_NAME: dbName, CI_DB_ROLE: roleName })) {
	if (!SAFE_IDENTIFIER.test(value)) {
		console.error(`[provision] ${name}="${value}" не является безопасным идентификатором.`);
		process.exit(1);
	}
}

const client = new pg.Client({ connectionString: adminUrl });
await client.connect();

try {
	const existingRole = await client.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [roleName]);
	if (existingRole.rowCount === 0) {
		// NOSUPERUSER и NOBYPASSRLS — не косметика, см. причину 2 в шапке файла.
		await client.query(
			`CREATE ROLE "${roleName}" LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE PASSWORD $1`,
			[rolePassword],
		);
		console.log(`[provision] создана роль ${roleName} (NOSUPERUSER, NOBYPASSRLS)`);
	} else {
		console.log(`[provision] роль ${roleName} уже существует`);
	}

	const existingDb = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
	if (existingDb.rowCount === 0) {
		await client.query(`CREATE DATABASE "${dbName}" OWNER "${roleName}"`);
		console.log(`[provision] создана база ${dbName}, владелец ${roleName}`);
	} else {
		console.log(`[provision] база ${dbName} уже существует`);
	}

	// Контроль: если роль оказалась суперпользователем, RLS в этом прогоне не
	// работает, и любой зелёный тест изоляции — ложь. Падаем громко.
	const check = await client.query(
		"SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1",
		[roleName],
	);
	const { rolsuper, rolbypassrls } = check.rows[0];
	if (rolsuper || rolbypassrls) {
		console.error(
			`[provision] ОТКАЗ: роль ${roleName} имеет rolsuper=${rolsuper}, rolbypassrls=${rolbypassrls}. ` +
			"При таких правах RLS не применяется и тесты арендной изоляции зеленеют впустую.",
		);
		process.exit(1);
	}
	console.log(`[provision] проверено: ${roleName} rolsuper=false, rolbypassrls=false — RLS будет применяться`);
} finally {
	await client.end();
}
