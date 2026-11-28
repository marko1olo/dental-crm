#!/usr/bin/env node

/**
 * scripts/check-ui-purity.mjs
 *
 * AST-охранник чистоты UI, кнопок, палитры и русского языка фронтенда (DENTE CRM).
 * Аналог backend quality-ratchet.mjs для apps/web/src:
 *   - Разбирает TSX/JSX через официальный компилятор TypeScript AST (ts.createSourceFile),
 *     исключая комментарии, импорты, типы и тесты -> минимум ложных срабатываний.
 *   - Сверяет счётчики с scripts/config/ui-purity-baseline.json:
 *     любой рост долга или появление дефекта там, где потолок = 0, валит сборку с Exit Code 1
 *     и выводит UI_COPY_AND_BUTTON_PURITY манифест с координатами [ФАЙЛ:СТРОКА].
 *
 * Использование:
 *   node scripts/check-ui-purity.mjs                # Строгая проверка: любой оставшийся дефект (>0) даёт Exit Code 1!
 *   node scripts/check-ui-purity.mjs --ratchet      # Храповик (для pre-commit): падает на росте долга и правилах с порогом 0
 *   node scripts/check-ui-purity.mjs --list <rule>    # Показать точные строки [FILE:LINE] по правилу
 *   node scripts/check-ui-purity.mjs --write-baseline # Инициализация/затяжка потолков вниз
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { printFailureManifesto } from "./manifests/failure-manifestos.mjs";
import { scanCssUiPurity, scanTsxUiPurity, UI_PURITY_RULE_KEYS } from "./lib/ui-purity-rules.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..");
const webSrcRoot = join(repoRoot, "apps", "web", "src");
const baselinePath = join(__dirname, "config", "ui-purity-baseline.json");

const SKIP_DIRS = new Set(["node_modules", "dist", ".vite", "__tests__", "tests", "scratch", "test-utils"]);

function collectUiFiles(dir, extensions) {
	const results = [];
	if (!existsSync(dir)) return results;
	const entries = readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		if (entry.isDirectory()) {
			if (!SKIP_DIRS.has(entry.name)) {
				results.push(...collectUiFiles(join(dir, entry.name), extensions));
			}
		} else if (entry.isFile()) {
			if (/\.(?:test|spec)\.[jt]sx?$/.test(entry.name)) continue;
			for (const ext of extensions) {
				if (entry.name.endsWith(ext)) {
					results.push(join(dir, entry.name));
					break;
				}
			}
		}
	}
	return results;
}

export function scanWebUiTree(targetWebRoot = webSrcRoot, baseRoot = repoRoot) {
	const tsxFiles = collectUiFiles(targetWebRoot, [".tsx", ".jsx"]);
	const tsClientFiles = collectUiFiles(targetWebRoot, [".ts"]);
	const cssFiles = collectUiFiles(targetWebRoot, [".css"]);

	const findings = [];
	for (const file of tsxFiles) {
		const rel = relative(baseRoot, file).replace(/\\/g, "/");
		const content = readFileSync(file, "utf8");
		findings.push(...scanTsxUiPurity(rel, content));
	}
	for (const file of tsClientFiles) {
		const rel = relative(baseRoot, file).replace(/\\/g, "/");
		const content = readFileSync(file, "utf8");
		for (const f of scanTsxUiPurity(rel, content)) {
			if (
				f.rule === "reverse_auth_token_order" ||
				f.rule === "swallowed_fetch_or_json_fallback" ||
				f.rule === "browser_blocking_dialog"
			) {
				findings.push(f);
			}
		}
	}
	for (const file of cssFiles) {
		const rel = relative(baseRoot, file).replace(/\\/g, "/");
		const content = readFileSync(file, "utf8");
		findings.push(...scanCssUiPurity(rel, content));
	}

	const counts = Object.fromEntries(UI_PURITY_RULE_KEYS.map((k) => [k, 0]));
	for (const item of findings) {
		counts[item.rule] = (counts[item.rule] || 0) + 1;
	}

	return {
		scannedTsx: tsxFiles.length + tsClientFiles.length,
		scannedCss: cssFiles.length,
		counts,
		findings,
	};
}

function main() {
	const args = process.argv.slice(2);
	const isRatchetMode = args.includes("--ratchet");
	const isStrict = !isRatchetMode || args.includes("--strict");
	const writeBaseline = args.includes("--write-baseline");
	const noTighten = args.includes("--no-tighten");
	const listIdx = args.indexOf("--list");
	const listRule = listIdx >= 0 ? args[listIdx + 1] : null;

	const start = Date.now();
	const scan = scanWebUiTree();
	const elapsedSec = ((Date.now() - start) / 1000).toFixed(2);

	if (writeBaseline) {
		mkdirSync(dirname(baselinePath), { recursive: true });
		const payload = {
			version: 1,
			description: "DENTE Frontend UI Purity Ratchet (0-tolerance rules stay 0; remaining limits only fall).",
			updatedAt: new Date().toISOString(),
			limits: scan.counts,
		};
		writeFileSync(baselinePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
		console.log(`✅ Baseline written to ${relative(repoRoot, baselinePath)} (${elapsedSec}s):`);
		console.log(scan.counts);
		return;
	}

	let baseline = { limits: Object.fromEntries(UI_PURITY_RULE_KEYS.map((k) => [k, 0])) };
	if (existsSync(baselinePath)) {
		baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
	}

	if (listRule) {
		const matching = scan.findings.filter((f) => f.rule === listRule);
		console.log(`\n=== UI PURITY FINDINGS FOR RULE: ${listRule} (${matching.length}) ===`);
		for (const f of matching.slice(0, 80)) {
			console.log(`  - ${f.file}:${f.line} (${f.element}): ${f.snippet}`);
			console.log(`    ${f.message}`);
		}
		return;
	}

	const regressions = [];
	const tightened = [];
	let totalDebt = 0;

	for (const rule of UI_PURITY_RULE_KEYS) {
		const actual = scan.counts[rule] || 0;
		const limit = isStrict ? 0 : (baseline.limits?.[rule] ?? 0);
		totalDebt += actual;
		if (actual > limit) {
			regressions.push({ rule, actual, limit });
		} else if (!isStrict && actual < limit && !noTighten) {
			baseline.limits[rule] = actual;
			tightened.push({ rule, prev: limit, actual });
		}
	}

	if (tightened.length > 0 && existsSync(baselinePath)) {
		baseline.updatedAt = new Date().toISOString();
		writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
	}

	console.log(`\n================================================================`);
	console.log(`DENTE CRM — FRONTEND AST UI PURITY & COPY RATCHET`);
	console.log(`================================================================`);
	console.log(`Scanned TSX/JSX: ${scan.scannedTsx} | CSS: ${scan.scannedCss} | Time: ${elapsedSec}s`);
	for (const rule of UI_PURITY_RULE_KEYS) {
		const actual = scan.counts[rule] || 0;
		const limit = isStrict ? 0 : (baseline.limits?.[rule] ?? 0);
		const tag = actual > limit ? "❌ REGRESS" : actual === 0 ? "✅ 0" : `⚠️ ${actual}/${limit}`;
		console.log(`  ${rule.padEnd(26)} ${tag}`);
	}
	console.log(`================================================================`);

	if (tightened.length > 0) {
		console.log(`🔒 UI Ratchet tightened (${tightened.map((t) => `${t.rule}: ${t.prev}->${t.actual}`).join(", ")})`);
	}

	if (regressions.length > 0) {
		const regRules = new Set(regressions.map((r) => r.rule));
		const allRegFindings = scan.findings.filter((f) => regRules.has(f.rule));
		const sampleFindings = allRegFindings.slice(0, 45);
		console.error(`\n❌ СТОП! ОБНАРУЖЕНО ${allRegFindings.length} ДЕФЕКТОВ ЧИСТОТЫ UI В ${regressions.length} ПРАВИЛАХ (КОД ВЫХОДА 1 — ХАЛТУРА НЕ ПРОЙДЁТ!):\n`);
		for (const f of sampleFindings) {
			console.error(`  ✗ ${f.file}:${f.line} [${f.rule}] (${f.element})`);
			console.error(`    ПОЧЕМУ ЭТО БРАК И КАК ЧИНИТЬ: ${f.message}`);
			console.error(`    Фрагмент: ${f.snippet}\n`);
		}
		if (allRegFindings.length > sampleFindings.length) {
			console.error(`  ... и ещё ${allRegFindings.length - sampleFindings.length} нарушений. Посмотри все по правилу: node scripts/check-ui-purity.mjs --list <rule>\n`);
		}
		printFailureManifesto("UI_COPY_AND_BUTTON_PURITY", {
			details: regressions.map((r) => `${r.rule}: ${r.actual} > допустимого лимита ${r.limit}`).join("; "),
		});
		process.exit(1);
	}

	if (totalDebt > 0) {
		console.log(`\n🧹 BOY-SCOUT FRONTEND MANDATE: остался визуальный техдолг (${totalDebt} ед.).`);
		console.log(`   Попутно при правке любого TSX/CSS замени bg-[var(--teal)] -> bg-[var(--primary)] text-white и dark:bg-slate-800 -> var(--paper)!`);
		console.log(`   Детали по правилу: node scripts/check-ui-purity.mjs --list <rule>\n`);
	} else {
		console.log(`\n✅ [UI PURITY OK] 0 фронтенд-дефектов во всём дереве.\n`);
	}
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
	main();
}
