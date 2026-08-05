/**
 * migrate.ts — применение SQL-миграций к базе из DATABASE_URL.
 *
 * ЗАЧЕМ ЭТОТ ФАЙЛ СУЩЕСТВУЕТ
 * До него в проекте не было ни одной команды, которая создаёт схему в рабочем
 * Postgres:
 *
 *   • `npm run db:migrate` вызывал drizzle-kit, а drizzle.config.ts объявляет
 *     `driver: "pglite"` и `url: "./dente-db"` — то есть мигрировался локальный
 *     файловый PGlite, а не база из DATABASE_URL, к которой подключается сам
 *     сервер (db/client.ts, node-postgres);
 *   • drizzle/meta/_journal.json описывает 28 миграций, и НИ ОДНОГО из этих
 *     тегов нет среди 66 файлов drizzle/*.sql — журнал остался от удалённой
 *     линии миграций, поэтому drizzle-kit по нему всё равно ничего бы не нашёл;
 *   • единственный существовавший тогда скрипт первичной установки применял
 *     ровно один файл (0000) и снова к PGlite. По имени он здесь больше не
 *     называется: файл удалён с диска 2026-08-06 как мёртвый код эпохи PGlite,
 *     и ссылка на него отправляла бы читателя искать несуществующее;
 *   • фактическую схему в живой базе досоздавали 52 модуля выражениями
 *     `CREATE TABLE IF NOT EXISTS` прямо во время обработки запросов.
 *
 * Из-за этого разворачивание на чистый Postgres было невоспроизводимым, а
 * таблицы, у которых нет рантайм-DDL (clinic_chairs, services), просто
 * отсутствовали, и запросы к ним падали.
 *
 * ЧТО ДЕЛАЕТ
 * Применяет drizzle/*.sql по возрастанию номера, каждый файл — в отдельной
 * транзакции, и отмечает применённые в таблице учёта `_dente_migrations`.
 * Повторный запуск ничего не переприменяет.
 *
 * ЗАПУСК
 *   npm run db:migrate              — применить недостающие
 *   npm run db:migrate -- --dry-run — показать, что будет применено
 *   npm run db:migrate -- --baseline — отметить все файлы применёнными,
 *                                      ничего не выполняя. Это для базы,
 *                                      которая уже наполнена рантайм-DDL:
 *                                      иначе первый же CREATE TYPE упадёт
 *                                      на «already exists».
 *   npm run db:migrate -- --strict   — считать ошибкой изменение уже
 *                                      применённого файла (для CI).
 *
 * РЕЖИМЫ ОТЛИЧАЮТСЯ ТОЛЬКО ТЕМ, ПРИМЕНЯЮТСЯ ЛИ ИЗМЕНЕНИЯ.
 * Проверки недостающих файлов (assertMigrationsAreApplicable) выполняются
 * одинаково и до первого обращения к базе во всех трёх режимах. Так --dry-run
 * не может позеленеть там, где боевой запуск падает.
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { loadAdditionalServerEnv } from "../env/loadServerEnv.js";
import { carriesConcurrently, splitSqlStatements } from "./sqlStatements.js";

loadAdditionalServerEnv();

const MIGRATIONS_DIR = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../drizzle",
);
const LEDGER_TABLE = "_dente_migrations";
const STATEMENT_BREAKPOINT = /-->\s*statement-breakpoint/gi;

/**
 * Маркер в первой строке файла: миграция выполняется БЕЗ транзакции.
 *
 * ЗАЧЕМ:
 *   PostgreSQL запрещает CREATE INDEX CONCURRENTLY внутри транзакции:
 *   > ERROR: CREATE INDEX CONCURRENTLY cannot run inside a transaction block
 *
 *   Индексные миграции (0155, 0156 и аналогичные) должны использовать
 *   этот маркер. Runner выполнит их statement-by-statement через autocommit.
 *   При ошибке ledger запись НЕ делается, поэтому повторный запуск продолжит
 *   применение с этой же миграции. IF NOT EXISTS на каждом индексе
 *   гарантирует идемпотентность.
 *
 * ФОРМАТ: первая строка файла должна быть ровно:
 *   -- no-transaction
 */
const NO_TRANSACTION_MARKER = /^\s*--\s*no-transaction(?:\s|$)/i;

const flags = new Set(process.argv.slice(2));
const dryRun = flags.has("--dry-run");
const baseline = flags.has("--baseline");
const strict = flags.has("--strict");

interface MigrationFile {
	name: string;
	sql: string;
	checksum: string;
}

function readMigrations(): MigrationFile[] {
	// Имена начинаются с номера, дополненного нулями, поэтому лексикографический
	// порядок совпадает с числовым. Сортировка по числу отдельно всё равно
	// делается: если кто-то добавит файл без ведущих нулей, порядок не поедет.
	return readdirSync(MIGRATIONS_DIR)
		.filter((name) => name.endsWith(".sql"))
		.sort((left, right) => {
			const leftNumber = Number.parseInt(left, 10);
			const rightNumber = Number.parseInt(right, 10);
			if (Number.isNaN(leftNumber) || Number.isNaN(rightNumber)) {
				return left.localeCompare(right);
			}
			if (leftNumber !== rightNumber) return leftNumber - rightNumber;
			return left.localeCompare(right);
		})
		.map((name) => {
			const sql = readFileSync(path.join(MIGRATIONS_DIR, name), "utf8");
			return {
				name,
				sql,
				checksum: createHash("sha256").update(sql).digest("hex"),
			};
		});
}

/** Разбивает файл на выполняемые куски.
 *
 * В transactional-режиме — по маркеру statement-breakpoint (drizzle-kit формат).
 * Дальше кусок уходит в client.query() целиком, и если в нём несколько
 * выражений, их выполнит сам Postgres: node-postgres отправляет запрос без
 * параметров простым протоколом (Simple Query), а тот принимает несколько
 * выражений через ';'. Ручное разбиение здесь не нужно и только добавляло бы
 * класс ошибок, которого сейчас нет.
 *
 * В no-transaction-режиме разбиение ОБЯЗАТЕЛЬНО, и причина не та, что была
 * записана здесь раньше. Прежний комментарий утверждал, будто node-postgres
 * «выполнит только ПЕРВЫЙ оператор и молча проигнорирует остальные»; это
 * неверно, замерено на живом PostgreSQL 18.4: запрос
 * «CREATE ROLE …; CREATE DATABASE …;» выполнил ОБА выражения и упал на втором
 * сообщением «CREATE DATABASE cannot run inside a transaction block». Оно и
 * называет настоящую причину: несколько выражений в одном сообщении Query
 * Postgres оборачивает в НЕЯВНЫЙ транзакционный блок, а CREATE INDEX
 * CONCURRENTLY внутри транзакционного блока запрещён. Поэтому каждое выражение
 * такой миграции должно уйти отдельным вызовом client.query().
 *
 * КРИТИЧЕСКИЙ ИНВАРИАНТ (no-tx) описан в scripts/sqlStatements.ts: отбрасываются
 * ТОЛЬКО куски без единого символа SQL. Первый кусок файла содержит заголовочные
 * комментарии И первый DDL-оператор, поэтому проверяется проекция без
 * комментариев, а не первый символ.
 */
function statementsOf(migration: MigrationFile, noTransaction: boolean): string[] {
	if (noTransaction) return splitSqlStatements(migration.sql);
	// Файлы, сгенерированные drizzle-kit, размечены маркером statement-breakpoint.
	// Написанные руками — обычные скрипты, их Postgres выполняет целиком.
	const parts = migration.sql
		.split(STATEMENT_BREAKPOINT)
		.map((part) => part.trim())
		.filter(Boolean);
	return parts.length > 0 ? parts : [];
}

/** True если файл помечен как no-transaction (первая непустая строка содержит маркер). */
function isNoTransaction(migration: MigrationFile): boolean {
	const firstLine = migration.sql.split(/\r?\n/)[0] ?? "";
	return NO_TRANSACTION_MARKER.test(firstLine);
}

/**
 * Проверяет что транзакционный файл не содержит CONCURRENTLY.
 * CONCURRENTLY внутри BEGIN/COMMIT даст ERROR от PostgreSQL — лучше
 * обнаружить это сразу с чёткой диагностикой, а не получить откат.
 *
 * ПОЧЕМУ ПРОВЕРЯЕТСЯ codeOnly, А НЕ ИСХОДНЫЙ ТЕКСТ. Прежняя реализация гоняла
 * /\bCONCURRENTLY\b/i по сырому файлу вместе с комментариями и на этом сама себя
 * заблокировала: 0134 и 0141 не содержат ни одного CREATE INDEX CONCURRENTLY, но
 * у каждого есть раздел комментария «ПОЧЕМУ НЕ CONCURRENTLY», объясняющий, что
 * CONCURRENTLY здесь сознательно НЕ используется. Проверка срабатывала на
 * собственной документации файла и роняла раскатку чистой базы на 103-й
 * миграции из 129.
 *
 * Проекция codeOnly не видит комментарии и содержимое литералов. Плата за это —
 * CONCURRENTLY, спрятанный внутри строки или тела $$…$$ (например EXECUTE
 * 'CREATE INDEX CONCURRENTLY …'), этой проверкой не ловится; о нём сообщит сам
 * Postgres при выполнении, и его сообщение однозначно. Размен сознательный:
 * ложное срабатывание блокирует релиз целиком, пропуск — деградирует до штатной
 * ошибки базы.
 */
function assertNoConcurrentInTransaction(migration: MigrationFile): void {
	if (carriesConcurrently(migration.sql)) {
		throw new Error(
			`[migrate] КОНФЛИКТ: ${migration.name} содержит CONCURRENTLY, но не помечен ` +
			`'-- no-transaction'. CREATE INDEX CONCURRENTLY нельзя использовать ` +
			`внутри транзакции. Добавьте '-- no-transaction' в первую строку файла.`,
		);
	}
}

/**
 * Проверки, ОДИНАКОВЫЕ для всех режимов, выполняемые ДО первого обращения к базе.
 *
 * ЗАЧЕМ ОТДЕЛЬНОЙ ФУНКЦИЕЙ. Раньше единственная проверка файла
 * (assertNoConcurrentInTransaction) жила внутри ветки боевого применения, а
 * --dry-run и --baseline до неё не доходили — в обеих ветках стоит continue
 * выше. Из-за этого `npm run db:migrate:check` давал EXIT=0 и «к применению:
 * 129» ровно на том корпусе, на котором `npm run db:migrate` падал с EXIT=1.
 * Гейт, зеленеющий там, где боевой запуск падает, хуже отсутствующего гейта:
 * .agents/DATABASE.md прямо предписывает запускать db:migrate:check перед
 * db:migrate и приводить оба вывода.
 *
 * Второе следствие: проверка идёт по ВСЕМ недостающим файлам заранее, поэтому
 * конфликт в 0134 обнаруживается до того, как в базу уедут первые 103 миграции,
 * а не после.
 */
function assertMigrationsAreApplicable(pending: MigrationFile[]): void {
	for (const migration of pending) {
		const noTx = isNoTransaction(migration);
		if (!noTx) assertNoConcurrentInTransaction(migration);
		if (statementsOf(migration, noTx).length === 0) {
			throw new Error(
				`[migrate] ПУСТО: в ${migration.name} нет ни одного SQL-выражения. ` +
				`Файл был бы отмечен применённым, не изменив базу.`,
			);
		}
	}
}

async function ensureLedger(client: pg.PoolClient): Promise<void> {
	await client.query(`
		CREATE TABLE IF NOT EXISTS "${LEDGER_TABLE}" (
			"name" text PRIMARY KEY,
			"checksum" text NOT NULL,
			"applied_at" timestamp with time zone NOT NULL DEFAULT now()
		);
	`);
}

async function readLedger(client: pg.PoolClient): Promise<Map<string, string>> {
	const result = await client.query<{ name: string; checksum: string }>(
		`SELECT "name", "checksum" FROM "${LEDGER_TABLE}"`,
	);
	return new Map(result.rows.map((row) => [row.name, row.checksum]));
}

async function main(): Promise<void> {
	const connectionString = process.env.DATABASE_URL;
	if (!connectionString) {
		console.error(
			"[migrate] DATABASE_URL не задан. Укажите его в .env — тот же адрес, к которому подключается сервер.",
		);
		process.exit(1);
	}

	const migrations = readMigrations();
	if (migrations.length === 0) {
		console.error(`[migrate] В ${MIGRATIONS_DIR} нет ни одного .sql файла.`);
		process.exit(1);
	}

	const pool = new pg.Pool({ connectionString });
	const client = await pool.connect();

	let applied = 0;
	let skipped = 0;
	let changed = 0;

	try {
		await ensureLedger(client);
		const ledger = await readLedger(client);

		// Проверка ВСЕХ недостающих файлов до первой записи в базу. Одинакова для
		// --dry-run, --baseline и боевого прогона: режимы отличаются только тем,
		// применяются ли изменения, и ничем иным.
		const pending = migrations.filter(
			(migration) => !ledger.has(migration.name),
		);
		try {
			assertMigrationsAreApplicable(pending);
		} catch (error) {
			console.error((error as Error).message);
			console.error(
				"[migrate] Остановлено до применения. База не изменена.",
			);
			process.exitCode = 1;
			return;
		}

		for (const migration of migrations) {
			const known = ledger.get(migration.name);

			if (known !== undefined) {
				skipped += 1;
				if (known !== migration.checksum) {
					changed += 1;
					console.warn(
						`[migrate] ИЗМЕНЁН ПОСЛЕ ПРИМЕНЕНИЯ: ${migration.name}. ` +
							"Правка применённой миграции не догоняет базу — заведите новый файл.",
					);
				}
				continue;
			}

			if (dryRun) {
				console.log(`[migrate] будет применён: ${migration.name}`);
				applied += 1;
				continue;
			}

			if (baseline) {
				await client.query(
					`INSERT INTO "${LEDGER_TABLE}" ("name", "checksum") VALUES ($1, $2)`,
					[migration.name, migration.checksum],
				);
				applied += 1;
				continue;
			}

			const noTx = isNoTransaction(migration);
			const statements = statementsOf(migration, noTx);

			if (noTx) {
				// ── no-transaction mode ─────────────────────────────────────────
				// CREATE INDEX CONCURRENTLY и аналогичные DDL без транзакции.
				// Выполняем каждый statement в autocommit (без BEGIN).
				// IF NOT EXISTS на каждом индексе обеспечивает идемпотентность:
				// при повторном запуске уже созданные индексы пропускаются.
				try {
					for (const statement of statements) {
						await client.query(statement);
					}
					// Ledger запись вне транзакции — нет смысла оборачивать в BEGIN
					// когда сам DDL уже выполнен в autocommit.
					await client.query(
						`INSERT INTO "${LEDGER_TABLE}" ("name", "checksum") VALUES ($1, $2)`,
						[migration.name, migration.checksum],
					);
					applied += 1;
					console.log(`[migrate] применён (no-tx): ${migration.name}`);
				} catch (error) {
					console.error(
						`[migrate] ОШИБКА в ${migration.name}: ${(error as Error).message}`,
					);
					console.error(
						"[migrate] Остановлено. В режиме no-transaction частично созданные " +
						"индексы (IF NOT EXISTS) безопасны — повторный запуск продолжит.",
					);
					process.exitCode = 1;
					return;
				}
			} else {
				// ── transactional mode (стандартный) ────────────────────────────
				// Файл целиком в одной транзакции: половина применённой миграции
				// хуже, чем неприменённая — её нельзя ни докатить, ни откатить.
				// Проверка на CONCURRENTLY здесь НЕ повторяется: её выполняет
				// assertMigrationsAreApplicable до открытия первой транзакции, и
				// решение о применимости файла должно приниматься ровно в одном
				// месте — раздвоение этой проверки и породило зелёный --dry-run.
				await client.query("BEGIN");
				try {
					for (const statement of statements) {
						await client.query(statement);
					}
					await client.query(
						`INSERT INTO "${LEDGER_TABLE}" ("name", "checksum") VALUES ($1, $2)`,
						[migration.name, migration.checksum],
					);
					await client.query("COMMIT");
					applied += 1;
					console.log(`[migrate] применён: ${migration.name}`);
				} catch (error) {
					await client.query("ROLLBACK");
					console.error(
						`[migrate] ОШИБКА в ${migration.name}: ${(error as Error).message}`,
					);
					console.error(
						"[migrate] Остановлено. Следующие миграции не применялись — порядок важен.",
					);
					console.error(
						"[migrate] Если база уже наполнена (схему досоздавал рантайм-DDL), " +
							"выполните один раз: npm run db:migrate -- --baseline",
					);
					process.exitCode = 1;
					return;
				}
			}
		}

		const verb = dryRun ? "к применению" : baseline ? "отмечено" : "применено";
		console.log(
			`[migrate] Готово. Всего файлов: ${migrations.length}, ${verb}: ${applied}, уже было: ${skipped}.`,
		);
		if (changed > 0) {
			console.log(`[migrate] Изменённых после применения файлов: ${changed}.`);
			if (strict) process.exitCode = 1;
		}
	} finally {
		client.release();
		await pool.end();
	}
}

await main();
