#!/usr/bin/env node
/**
 * scripts/check-backend-rot.mjs
 *
 * AST-инквизитор скрытой гнили бэкенда (`apps/api/src`, `packages/shared/src`).
 * Ловит то, что компилятор `tsc` не видит:
 *   - вызов глобального `db.*` внутри `tx` (self-deadlock узкого пула PG18),
 *   - внешний `fetch()` / `readFileSync` внутри открытой PG-транзакции,
 *   - `SET session_replication_role` (`42501` в бою на PG18),
 *   - `FOR UPDATE` без `ORDER BY` (дедлоки `40P01`),
 *   - `.toISOString().slice(0, 10)` в роутах/сервисах (сдвиг дат по UTC),
 *   - `NODE_ENV === "test"` обходы авторизации/токенов в боевом коде,
 *   - неограниченные `select().from(...)` без `.where`/`.limit` в роутах.
 *
 * ПО УМОЛЧАНИЮ — ЖЁСТКИЙ РЕЖИМ: при любом дефекте падает с Exit Code 1 и печатает
 * подробный комментарий каждому работнику, почему это брак и как чинить по уму!
 *
 * Использование:
 *   node scripts/check-backend-rot.mjs                # Строгий прогон (Exit 1 при > 0 дефектов)
 *   node scripts/check-backend-rot.mjs --list <rule>  # Все срабатывания по одному правилу
 *   node scripts/check-backend-rot.mjs --report-only  # Только сводка (без exit 1, для обзора)
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BACKEND_ROT_GUIDANCE, BACKEND_ROT_RULE_KEYS, scanBackendRotAst } from "./lib/backend-rot-rules.mjs";
import { printFailureManifesto } from "./manifests/failure-manifestos.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..");

const SCAN_DIRS = [join(repoRoot, "apps", "api", "src"), join(repoRoot, "packages", "shared", "src")];
const SKIP_DIRS = new Set(["node_modules", "dist", "__tests__", "tests", "scratch", "seeds", "migrations"]);

function collectBackendFiles(dir) {
	const results = [];
	if (!existsSync(dir)) return results;
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (!SKIP_DIRS.has(entry.name)) {
				results.push(...collectBackendFiles(join(dir, entry.name)));
			}
		} else if (entry.isFile() && /\.(?:ts|js|mjs)$/.test(entry.name) && !/\.(?:test|spec|d)\.[jt]s$/.test(entry.name)) {
			results.push(join(dir, entry.name));
		}
	}
	return results;
}

export function scanBackendRotTree(targetDirs = SCAN_DIRS, baseRoot = repoRoot) {
	const files = targetDirs.flatMap((d) => collectBackendFiles(d));
	const findings = [];
	for (const file of files) {
		const rel = relative(baseRoot, file).replace(/\\/g, "/");
		const content = readFileSync(file, "utf8");
		findings.push(...scanBackendRotAst(rel, content));
	}
	const counts = Object.fromEntries(BACKEND_ROT_RULE_KEYS.map((k) => [k, 0]));
	for (const f of findings) {
		counts[f.rule] = (counts[f.rule] || 0) + 1;
	}
	return { scannedFiles: files.length, counts, findings };
}

function main() {
	const args = process.argv.slice(2);
	const reportOnly = args.includes("--report-only");
	const listIdx = args.indexOf("--list");
	const listRule = listIdx >= 0 ? args[listIdx + 1] : null;

	const start = Date.now();
	const scan = scanBackendRotTree();
	const elapsedSec = ((Date.now() - start) / 1000).toFixed(2);

	if (listRule) {
		const matching = scan.findings.filter((f) => f.rule === listRule);
		console.log(`\n=== BACKEND ROT FINDINGS: ${listRule} (${matching.length}) ===`);
		console.log(`ПОЧЕМУ ЭТО БРАК: ${BACKEND_ROT_GUIDANCE[listRule] || ""}\n`);
		for (const f of matching) {
			console.log(`  - ${f.file}:${f.line} -> ${f.snippet}`);
		}
		return;
	}

	let total = 0;
	console.log(`\n================================================================`);
	console.log(`DENTE CRM — BACKEND AST ROT INQUISITION (PG18 / TX / AUTH / TZ)`);
	console.log(`================================================================`);
	console.log(`Scanned TypeScript files: ${scan.scannedFiles} | Time: ${elapsedSec}s`);
	for (const rule of BACKEND_ROT_RULE_KEYS) {
		const count = scan.counts[rule] || 0;
		total += count;
		console.log(`  ${rule.padEnd(32)} ${count === 0 ? "✅ 0" : `❌ ${count}`}`);
	}
	console.log(`================================================================`);

	if (total > 0) {
		console.error(`\n🚨 СТОП! В БЭКЕНДЕ ВСКРЫТО ${total} СКРЫТЫХ БАГОВ И МИН ЗАМЕДЛЕННОГО ДЕЙСТВИЯ:\n`);
		for (const f of scan.findings.slice(0, 40)) {
			console.error(`  ✗ ${f.file}:${f.line} [${f.rule}]`);
			console.error(`    КОММЕНТАРИЙ РАБОТНИКУ: ${f.message}`);
			console.error(`    Код: ${f.snippet}\n`);
		}
		if (scan.findings.length > 40) {
			console.error(`  ... и ещё ${scan.findings.length - 40} срабатываний. Смотри всё: node scripts/check-backend-rot.mjs --list <rule>\n`);
		}
		printFailureManifesto("BACKEND_ROT_INQUISITION", {
			details: `Найдено ${total} архитектурных дефектов в ${scan.scannedFiles} файлах бэкенда. Никаких костылей — исправляй корень транзакций, таймзон и БД-запросов!`,
		});
		if (!reportOnly) process.exit(1);
	} else {
		console.log(`\n✅ [BACKEND ROT OK] Все ${scan.scannedFiles} файлов бэкенда прошли строгий AST-допрос чисто.\n`);
	}
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
	main();
}
