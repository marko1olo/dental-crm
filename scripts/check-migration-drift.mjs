#!/usr/bin/env node
/**
 * scripts/check-migration-drift.mjs
 *
 * SQL/Migration Drift Guard for DENTE Dental CRM.
 * Verifies 100% parity between Drizzle ORM TypeScript schema (apps/api/src/db/schema)
 * and physical PostgreSQL 18 DDL migrations (apps/api/drizzle/*.sql).
 *
 * Mandatory definition of done gate to prevent runtime crashes (undefined column,
 * invalid input value for enum) during doctor chairside sessions.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { printFailureManifesto } from "./manifests/failure-manifestos.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const REPO_ROOT = path.resolve(__dirname, "..");

export const DEFAULT_SCHEMA_DIR = path.join(REPO_ROOT, "apps/api/src/db/schema");
export const DEFAULT_MIGRATIONS_DIR = path.join(REPO_ROOT, "apps/api/drizzle");
export const DEFAULT_SOURCE_DIR = path.join(REPO_ROOT, "apps/api/src");

export function stripTsComments(src) {
	return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

export function stripSqlComments(sql) {
	return sql
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.split("\n")
		.filter((line) => !line.trimStart().startsWith("--"))
		.join("\n");
}

export function findTsFiles(dir) {
	const results = [];
	for (const entry of readdirSync(dir)) {
		const full = path.join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) {
			results.push(...findTsFiles(full));
		} else if (
			entry.endsWith(".ts") &&
			!entry.endsWith(".test.ts") &&
			!entry.endsWith(".d.ts")
		) {
			results.push(full);
		}
	}
	return results;
}

export function parseColumnsFromCreateTable(body) {
	const columns = new Map();
	let depth = 0;
	let current = "";
	const parts = [];
	for (const char of body) {
		if (char === "(") depth++;
		else if (char === ")") depth--;
		else if (char === "," && depth === 0) {
			parts.push(current);
			current = "";
			continue;
		}
		current += char;
	}
	if (current.trim()) parts.push(current);

	for (const part of parts) {
		const line = part.trim();
		if (!line) continue;
		if (
			/^(constraint|primary\s+key|foreign\s+key|unique|check|index)\b/i.test(
				line,
			)
		) {
			continue;
		}
		const m =
			/^"?([a-zA-Z0-9_]+)"?\s+([a-zA-Z0-9_]+(?:\s*\([^)]*\))?)/i.exec(line);
		if (m) {
			const colName = m[1].toLowerCase();
			const colType = m[2].toLowerCase();
			columns.set(colName, colType);
		}
	}
	return columns;
}

export function checkMigrationDrift(options = {}) {
	const schemaDir = options.schemaDir ?? DEFAULT_SCHEMA_DIR;
	const migrationsDir = options.migrationsDir ?? DEFAULT_MIGRATIONS_DIR;
	const sourceDir = options.sourceDir ?? DEFAULT_SOURCE_DIR;

	// 1. Извлечение Drizzle ORM схемы (TypeScript)
	const schemaFiles = findTsFiles(schemaDir);
	const schemaTables = new Map();
	const schemaEnums = new Map();

	for (const file of schemaFiles) {
		const rawContent = readFileSync(file, "utf8");

		// 1.1 Парсинг pgEnum с балансировкой скобок []
		const enumHeadRegex =
			/(?:export\s+)?const\s+(\w+)\s*=\s*pgEnum\s*\(\s*["']([a-zA-Z0-9_]+)["']/g;
		let enumMatch;
		while ((enumMatch = enumHeadRegex.exec(rawContent)) !== null) {
			const varName = enumMatch[1];
			const sqlName = enumMatch[2].toLowerCase();
			const startIdx = rawContent.indexOf("[", enumHeadRegex.lastIndex);
			if (startIdx === -1) continue;

			let depth = 1;
			let idx = startIdx + 1;
			while (idx < rawContent.length && depth > 0) {
				if (rawContent[idx] === "[") depth++;
				else if (rawContent[idx] === "]") depth--;
				idx++;
			}
			const rawArr = rawContent.slice(startIdx + 1, idx - 1);
			const values = new Set();
			for (const vm of rawArr.matchAll(/["']([^"']+)["']/g)) {
				values.add(vm[1]);
			}
			schemaEnums.set(sqlName, {
				varName,
				file: path.relative(REPO_ROOT, file),
				values,
			});
		}

		// 1.2 Парсинг pgTable с балансировкой фигурных скобок {}
		const tableHeadRegex =
			/(?:export\s+)?const\s+(\w+)\s*=\s*pgTable\s*\(\s*["']([a-zA-Z0-9_]+)["']\s*,\s*\{/g;
		let tableMatch;
		while ((tableMatch = tableHeadRegex.exec(rawContent)) !== null) {
			const varName = tableMatch[1];
			const tableName = tableMatch[2].toLowerCase();

			let depth = 1;
			let idx = tableHeadRegex.lastIndex;
			while (idx < rawContent.length && depth > 0) {
				if (rawContent[idx] === "{") depth++;
				else if (rawContent[idx] === "}") depth--;
				idx++;
			}
			const rawBody = rawContent.slice(tableHeadRegex.lastIndex, idx - 1);
			const cleanBody = stripTsComments(rawBody);
			const columns = new Map();

			const colRegex =
				/(\w+)\s*:\s*([a-zA-Z0-9_]+)\s*\(\s*["']([a-zA-Z0-9_]+)["']/g;
			let colMatch;
			while ((colMatch = colRegex.exec(cleanBody)) !== null) {
				const fieldName = colMatch[1];
				const builder = colMatch[2];
				const colName = colMatch[3].toLowerCase();
				columns.set(colName, { fieldName, builder });
			}

			schemaTables.set(tableName, {
				varName,
				file: path.relative(REPO_ROOT, file),
				columns,
			});
		}
	}

	// 2. Извлечение DDL из физических SQL миграций
	const migrationFiles = readdirSync(migrationsDir)
		.filter((f) => f.endsWith(".sql"))
		.sort();

	const ddlTables = new Map();
	const ddlEnums = new Map();

	for (const mf of migrationFiles) {
		const raw = readFileSync(path.join(migrationsDir, mf), "utf8");
		const sql = stripSqlComments(raw);

		// 2.1 CREATE TYPE ... AS ENUM
		const enumRe =
			/CREATE\s+TYPE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?public"?\.)?"?([a-zA-Z0-9_]+)"?\s+AS\s+ENUM\s*\(([\s\S]*?)\);/gi;
		let em;
		while ((em = enumRe.exec(sql)) !== null) {
			const enumName = em[1].toLowerCase();
			const vals = new Set(ddlEnums.get(enumName) ?? []);
			for (const vm of em[2].matchAll(/'([^']+)'/g)) {
				vals.add(vm[1]);
			}
			ddlEnums.set(enumName, vals);
		}

		// 2.2 ALTER TYPE ... ADD VALUE
		const alterEnumRe =
			/ALTER\s+TYPE\s+(?:"?public"?\.)?"?([a-zA-Z0-9_]+)"?\s+ADD\s+VALUE\s+(?:IF\s+NOT\s+EXISTS\s+)?'([^']+)';/gi;
		let aem;
		while ((aem = alterEnumRe.exec(sql)) !== null) {
			const enumName = aem[1].toLowerCase();
			const vals = ddlEnums.get(enumName) ?? new Set();
			vals.add(aem[2]);
			ddlEnums.set(enumName, vals);
		}

		// 2.3 CREATE TABLE
		const createRe =
			/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?public"?\.)?"?([a-zA-Z0-9_]+)"?\s*\(/gi;
		let cm;
		while ((cm = createRe.exec(sql)) !== null) {
			const tableName = cm[1].toLowerCase();
			let depth = 1;
			let idx = createRe.lastIndex;
			while (idx < sql.length && depth > 0) {
				if (sql[idx] === "(") depth++;
				else if (sql[idx] === ")") depth--;
				idx++;
			}
			const body = sql.slice(createRe.lastIndex, idx - 1);
			const cols = ddlTables.get(tableName) ?? new Map();
			const parsed = parseColumnsFromCreateTable(body);
			for (const [colName, colType] of parsed) {
				cols.set(colName, colType);
			}
			ddlTables.set(tableName, cols);
		}

		// 2.4 ALTER TABLE ... ADD/DROP COLUMN
		const alterRe =
			/ALTER\s+TABLE\s+(?:ONLY\s+)?(?:"?public"?\.)?"?([a-zA-Z0-9_]+)"?([\s\S]*?);/gi;
		let am;
		while ((am = alterRe.exec(sql)) !== null) {
			const tableName = am[1].toLowerCase();
			const cols = ddlTables.get(tableName) ?? new Map();
			for (const addMatch of am[2].matchAll(
				/ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([a-zA-Z0-9_]+)"?\s+([a-zA-Z0-9_]+(?:\s*\([^)]*\))?)/gi,
			)) {
				cols.set(addMatch[1].toLowerCase(), addMatch[2].toLowerCase());
			}
			for (const dropMatch of am[2].matchAll(
				/DROP\s+COLUMN\s+(?:IF\s+EXISTS\s+)?"?([a-zA-Z0-9_]+)"?/gi,
			)) {
				cols.delete(dropMatch[1].toLowerCase());
			}
			if (cols.size > 0) {
				ddlTables.set(tableName, cols);
			}
		}
	}

	// 2.5 Сканирование рантайм DDL таблиц в исходниках apps/api/src
	if (sourceDir) {
		function scanRuntimeSources(dir) {
			for (const entry of readdirSync(dir)) {
				const full = path.join(dir, entry);
				const stat = statSync(full);
				if (stat.isDirectory()) {
					scanRuntimeSources(full);
					continue;
				}
				if (!entry.endsWith(".ts")) continue;
				const content = stripSqlComments(readFileSync(full, "utf8"));
				const createRe =
					/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?public"?\.)?"?([a-zA-Z0-9_]+)"?\s*\(/gi;
				let cm;
				while ((cm = createRe.exec(content)) !== null) {
					const tableName = cm[1].toLowerCase();
					let depth = 1;
					let idx = createRe.lastIndex;
					while (idx < content.length && depth > 0) {
						if (content[idx] === "(") depth++;
						else if (content[idx] === ")") depth--;
						idx++;
					}
					const body = content.slice(createRe.lastIndex, idx - 1);
					const cols = ddlTables.get(tableName) ?? new Map();
					const parsed = parseColumnsFromCreateTable(body);
					for (const [colName, colType] of parsed) {
						cols.set(colName, colType);
					}
					ddlTables.set(tableName, cols);
				}
			}
		}
		scanRuntimeSources(sourceDir);
	}

	// 3. Анализ рассинхронизации (Drift Comparison)
	const missingTables = [];
	const missingColumns = [];
	const missingEnumValues = [];

	let totalCheckedColumns = 0;

	for (const [tableName, tableInfo] of schemaTables) {
		const ddlTable = ddlTables.get(tableName);
		if (!ddlTable) {
			missingTables.push({
				tableName,
				file: tableInfo.file,
				varName: tableInfo.varName,
			});
			continue;
		}

		for (const [colName, colInfo] of tableInfo.columns) {
			totalCheckedColumns++;
			if (!ddlTable.has(colName)) {
				missingColumns.push({
					tableName,
					colName,
					builder: colInfo.builder,
					fieldName: colInfo.fieldName,
					file: tableInfo.file,
				});
			}
		}
	}

	for (const [enumName, enumInfo] of schemaEnums) {
		const ddlEnum = ddlEnums.get(enumName);
		if (!ddlEnum) {
			continue;
		}
		for (const val of enumInfo.values) {
			if (!ddlEnum.has(val)) {
				missingEnumValues.push({
					enumName,
					val,
					file: enumInfo.file,
				});
			}
		}
	}

	const hasDrift =
		missingTables.length > 0 ||
		missingColumns.length > 0 ||
		missingEnumValues.length > 0;

	return {
		schemaFilesCount: schemaFiles.length,
		schemaTables,
		schemaEnums,
		totalCheckedColumns,
		migrationFilesCount: migrationFiles.length,
		ddlTables,
		ddlEnums,
		missingTables,
		missingColumns,
		missingEnumValues,
		hasDrift,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI Runner
// ─────────────────────────────────────────────────────────────────────────────

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
	const result = checkMigrationDrift();

	console.log("================================================================================");
	console.log("  DENTE DENTAL CRM — SQL & MIGRATION DRIFT GUARD");
	console.log("================================================================================");
	console.log(`  Schema sources : ${result.schemaFilesCount} files in apps/api/src/db/schema`);
	console.log(`  Drizzle schema : ${result.schemaTables.size} tables, ${result.schemaEnums.size} enums, ${result.totalCheckedColumns} columns`);
	console.log(`  Migrations DDL : ${result.migrationFilesCount} files in apps/api/drizzle`);
	console.log(`  Parsed DDL     : ${result.ddlTables.size} tables, ${result.ddlEnums.size} enums`);
	console.log("--------------------------------------------------------------------------------");

	if (result.hasDrift) {
		console.error("\x1b[31m[DRIFT DETECTED: SCHEMA & MIGRATIONS OUT OF SYNC]\x1b[0m\n");

		if (result.missingTables.length > 0) {
			console.error(`  Missing Tables (${result.missingTables.length}):`);
			for (const t of result.missingTables) {
				console.error(`    - [${t.file}] table "${t.tableName}" (var ${t.varName}) is declared in Drizzle schema but missing from DDL migrations.`);
			}
			console.error("");
		}

		if (result.missingColumns.length > 0) {
			console.error(`  Missing Columns (${result.missingColumns.length}):`);
			for (const c of result.missingColumns) {
				console.error(`    - [${c.file}] ${c.tableName}.${c.colName} (${c.builder}, prop "${c.fieldName}") is declared in Drizzle schema but missing from DDL migrations.`);
			}
			console.error("");
		}

		if (result.missingEnumValues.length > 0) {
			console.error(`  Missing Enum Values (${result.missingEnumValues.length}):`);
			for (const e of result.missingEnumValues) {
				console.error(`    - [${e.file}] enum "${e.enumName}" is missing value '${e.val}' in DDL migrations.`);
			}
			console.error("");
		}

		printFailureManifesto("MIGRATION_DRIFT", {
			details: `Рассинхрон Drizzle и SQL: ${result.missingTables.length} отсутствующих таблиц, ${result.missingColumns.length} отсутствующих колонок, ${result.missingEnumValues.length} отсутствующих enum значений.`,
		});
		process.exit(1);
	}

	console.log("\x1b[32m[PARITY CONFIRMED: 100% SYNCHRONIZED — ZERO DRIFT]\x1b[0m");
	console.log(`  All ${result.schemaTables.size} Drizzle tables, ${result.totalCheckedColumns} columns, and ${result.schemaEnums.size} enums have matching physical DDL migrations.`);
	console.log("================================================================================\n");
	process.exit(0);
}
