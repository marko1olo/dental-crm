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
 *   • setup-fresh-db.ts применяет ровно один файл (0000) и снова к PGlite;
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
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { loadAdditionalServerEnv } from "../env/loadServerEnv.js";

loadAdditionalServerEnv();

const MIGRATIONS_DIR = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../drizzle",
);
const LEDGER_TABLE = "_dente_migrations";
const STATEMENT_BREAKPOINT = /-->\s*statement-breakpoint/gi;

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

/** Разбивает файл на выполняемые куски. */
function statementsOf(migration: MigrationFile): string[] {
	// Файлы, сгенерированные drizzle-kit, размечены маркером statement-breakpoint.
	// Написанные руками — обычные скрипты, их Postgres выполняет целиком.
	const parts = migration.sql
		.split(STATEMENT_BREAKPOINT)
		.map((part) => part.trim())
		.filter(Boolean);
	return parts.length > 0 ? parts : [];
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

			const statements = statementsOf(migration);
			// Файл целиком в одной транзакции: половина применённой миграции
			// хуже, чем неприменённая — её нельзя ни докатить, ни откатить.
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
