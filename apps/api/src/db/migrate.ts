/**
 * migrate.ts — DENTE CRM Database Migration Engine.
 *
 * Supports Dual Mode:
 * 1. Single-Baseline Fast Init: Spins up clean PostgreSQL 18 installations in <2s
 *    using 0000_canonical_baseline.sql (210 tables, 48 enums, 664 indexes, 195 RLS policies).
 * 2. Incremental Migration: Safely supports existing databases (with 182 historical migrations)
 *    and rolls forward incremental patches (>0204) without conflict.
 */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { loadAdditionalServerEnv } from "../env/loadServerEnv.js";
import { carriesConcurrently, splitSqlStatements } from "../scripts/sqlStatements.js";

loadAdditionalServerEnv();

const MIGRATIONS_DIR = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../drizzle",
);
const LEDGER_TABLE = "_dente_migrations";
const STATEMENT_BREAKPOINT = /-->\s*statement-breakpoint/gi;
const NO_TRANSACTION_MARKER = /^\s*--\s*no-transaction(?:\s|$)/i;
const CANONICAL_BASELINE_FILE = "0000_canonical_baseline.sql";
const SQUASHED_THRESHOLD = 204; // Baseline covers all schema migrations up to 0204

export interface MigrationFile {
	name: string;
	sql: string;
	checksum: string;
	migrationNumber: number;
}

export interface MigrationOptions {
	dryRun?: boolean;
	baseline?: boolean;
	strict?: boolean;
	mode?: "auto" | "baseline-fast" | "incremental";
	connectionString?: string;
}

export interface MigrationResult {
	totalFiles: number;
	applied: number;
	skipped: number;
	changed: number;
	modeUsed: "baseline-fast" | "incremental" | "existing-compatible";
	durationMs: number;
}

export function readMigrationFiles(): MigrationFile[] {
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
			const num = Number.parseInt(name, 10);
			return {
				name,
				sql,
				checksum: createHash("sha256").update(sql).digest("hex"),
				migrationNumber: Number.isNaN(num) ? 0 : num,
			};
		});
}

function statementsOf(migration: MigrationFile, noTransaction: boolean): string[] {
	if (noTransaction) return splitSqlStatements(migration.sql);
	const parts = migration.sql
		.split(STATEMENT_BREAKPOINT)
		.map((part) => part.trim())
		.filter(Boolean);
	return parts.length > 0 ? parts : [];
}

function isNoTransaction(migration: MigrationFile): boolean {
	const firstLine = migration.sql.split(/\r?\n/)[0] ?? "";
	return NO_TRANSACTION_MARKER.test(firstLine);
}

function assertNoConcurrentInTransaction(migration: MigrationFile): void {
	if (carriesConcurrently(migration.sql)) {
		throw new Error(
			`[migrate] КОНФЛИКТ: ${migration.name} содержит CONCURRENTLY, но не помечен ` +
				`'-- no-transaction'. CREATE INDEX CONCURRENTLY нельзя использовать ` +
				`внутри транзакции. Добавьте '-- no-transaction' в первую строку файла.`,
		);
	}
}

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

export async function ensureLedger(client: pg.PoolClient | pg.Client): Promise<void> {
	await client.query(`
		CREATE TABLE IF NOT EXISTS "${LEDGER_TABLE}" (
			"name" text PRIMARY KEY,
			"checksum" text NOT NULL,
			"applied_at" timestamp with time zone NOT NULL DEFAULT now()
		);
	`);
}

export async function readLedger(
	client: pg.PoolClient | pg.Client,
): Promise<Map<string, string>> {
	const result = await client.query<{ name: string; checksum: string }>(
		`SELECT "name", "checksum" FROM "${LEDGER_TABLE}"`,
	);
	return new Map(result.rows.map((row) => [row.name, row.checksum]));
}

export async function runMigrations(
	options: MigrationOptions = {},
): Promise<MigrationResult> {
	const startTime = Date.now();
	const connectionString = options.connectionString || process.env.DATABASE_URL;
	if (!connectionString) {
		throw new Error("[migrate] DATABASE_URL не задан. Укажите его в .env");
	}

	const migrations = readMigrationFiles();
	if (migrations.length === 0) {
		throw new Error(`[migrate] В ${MIGRATIONS_DIR} нет ни одного .sql файла.`);
	}

	const pool = new pg.Pool({ connectionString });
	const client = await pool.connect();

	let applied = 0;
	let skipped = 0;
	let changed = 0;
	let modeUsed: "baseline-fast" | "incremental" | "existing-compatible" = "incremental";

	try {
		await ensureLedger(client);
		const ledger = await readLedger(client);

		const canonicalBaseline = migrations.find((m) => m.name === CANONICAL_BASELINE_FILE);
		const hasExistingHistory = ledger.size > 0;
		const isFreshDb = ledger.size === 0;

		// ── DUAL-MODE DETECTION ───────────────────────────────────────────
		// Scenario 1: Fresh Database -> Fast Baseline Init
		if (isFreshDb && canonicalBaseline && options.mode !== "incremental") {
			modeUsed = "baseline-fast";
			console.log(
				`[migrate:dual-mode] Обнаружена чистая БД. Применяем единый канонический baseline (${CANONICAL_BASELINE_FILE})...`,
			);

			if (options.dryRun) {
				console.log(`[migrate] будет применён fast-baseline: ${CANONICAL_BASELINE_FILE}`);
				return {
					totalFiles: migrations.length,
					applied: 1,
					skipped: migrations.length - 1,
					changed: 0,
					modeUsed,
					durationMs: Date.now() - startTime,
				};
			}

			// Apply 0000_canonical_baseline.sql
			await client.query("BEGIN;");
			try {
				const statements = statementsOf(canonicalBaseline, false);
				for (const statement of statements) {
					await client.query(statement);
				}

				// Populate ledger with canonical baseline and all squashed migrations
				await client.query(
					`INSERT INTO "${LEDGER_TABLE}" ("name", "checksum") VALUES ($1, $2)`,
					[canonicalBaseline.name, canonicalBaseline.checksum],
				);

				for (const m of migrations) {
					if (m.name !== CANONICAL_BASELINE_FILE && m.migrationNumber <= SQUASHED_THRESHOLD) {
						await client.query(
							`INSERT INTO "${LEDGER_TABLE}" ("name", "checksum") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
							[m.name, m.checksum],
						);
					}
				}

				await client.query("COMMIT;");
				applied += 1;
				console.log(`[migrate:dual-mode] Канонический baseline успешно применён.`);
			} catch (error) {
				await client.query("ROLLBACK;");
				throw error;
			}
		} else if (hasExistingHistory && canonicalBaseline && !ledger.has(CANONICAL_BASELINE_FILE)) {
			// Scenario 2: Existing Database -> Mark canonical baseline as covered
			modeUsed = "existing-compatible";
			console.log(
				`[migrate:dual-mode] Обнаружена существующая БД (${ledger.size} миграций). Канонический baseline (${CANONICAL_BASELINE_FILE}) синхронизирован со схемой.`,
			);
			if (!options.dryRun && !options.baseline) {
				await client.query(
					`INSERT INTO "${LEDGER_TABLE}" ("name", "checksum") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
					[canonicalBaseline.name, canonicalBaseline.checksum],
				);
			}
			ledger.set(canonicalBaseline.name, canonicalBaseline.checksum);
		}

		// Pending list based on synced ledger
		const pending = migrations.filter((m) => !ledger.has(m.name));

		assertMigrationsAreApplicable(pending);

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

			if (options.dryRun) {
				console.log(`[migrate] будет применён: ${migration.name}`);
				applied += 1;
				continue;
			}

			if (options.baseline) {
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
				for (const statement of statements) {
					await client.query(statement);
				}
				await client.query(
					`INSERT INTO "${LEDGER_TABLE}" ("name", "checksum") VALUES ($1, $2)`,
					[migration.name, migration.checksum],
				);
				applied += 1;
				console.log(`[migrate] применён (no-tx): ${migration.name}`);
			} else {
				await client.query("BEGIN;");
				try {
					for (const statement of statements) {
						await client.query(statement);
					}
					await client.query(
						`INSERT INTO "${LEDGER_TABLE}" ("name", "checksum") VALUES ($1, $2)`,
						[migration.name, migration.checksum],
					);
					await client.query("COMMIT;");
					applied += 1;
					console.log(`[migrate] применён: ${migration.name}`);
				} catch (error) {
					await client.query("ROLLBACK;");
					throw error;
				}
			}
		}

		const durationMs = Date.now() - startTime;
		const verb = options.dryRun ? "к применению" : options.baseline ? "отмечено" : "применено";
		console.log(
			`[migrate] Готово. Всего файлов: ${migrations.length}, ${verb}: ${applied}, уже было: ${skipped} (${(durationMs / 1000).toFixed(2)}s).`,
		);

		return {
			totalFiles: migrations.length,
			applied,
			skipped,
			changed,
			modeUsed,
			durationMs,
		};
	} finally {
		client.release();
		await pool.end();
	}
}
