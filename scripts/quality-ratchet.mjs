#!/usr/bin/env node

/**
 * quality-ratchet.mjs — Monotonic Quality Ratchet for DENTE Dental CRM.
 *
 * Authority: MANDATE 8ai (Type Ratchet Doctrine), MANDATE 8bk (Demining & Dual-Counter),
 *            MANDATE 8am (Uppercase Ban & Design Tokens), MANDATE 8bm (Money DTOs)
 *
 * Principles (The Timaert Experience):
 *   "Даже один незаметный костыль убивает архитектуру в долгосрочном каскаде сессий с агентом.
 *    Пора перестать писать промпты в .md и начинать физически закручивать гайки в коде."
 *
 * Enforced Sanitary Invariants (Production Code Only: shared/src, api/src, web/src):
 *   1. maxExplicitAny: Explicit TypeScript `any` (`:\s*any\b`, `as\s+any\b`, `<any>`).
 *   2. maxLinterSuppressions: Linter suppressions (`biome-ignore`, `eslint-disable`).
 *   3. maxRawFloatDivisions: Raw float divisions by 100 in UI (`/ 100`) instead of money.ts.
 *   4. maxUppercaseButtons: Uppercase classes/styles on buttons, chips, tabs (UPPERCASE BAN).
 *
 * Usage:
 *   node scripts/quality-ratchet.mjs               # Verify against sanitary-baseline.json
 *   node scripts/quality-ratchet.mjs --update      # Ratchet down baseline when metrics improve
 *   node scripts/quality-ratchet.mjs --json        # Machine-readable output
 *
 * Exit code:
 *   0: All indicators <= baseline limits.
 *   1: Regression detected (technical debt increased).
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const DEFAULT_REPO_ROOT = resolve(__dirname, "..");
export const DEFAULT_BASELINE_PATH = join(__dirname, "config", "sanitary-baseline.json");

/**
 * Exclude test files, test mocks, test fixtures and helpers.
 * In accordance with Mandate 8bk: demining is tracked STRICTLY in production code.
 */
export function isTestFile(relPath) {
	const norm = relPath.replace(/\\/g, "/");
	if (/\.test\.[cm]?[jt]sx?$/.test(norm)) return true;
	if (/\.spec\.[cm]?[jt]sx?$/.test(norm)) return true;
	if (/[Tt]estHelpers?\.[cm]?[jt]sx?$/.test(norm)) return true;
	if (/\/__tests__\//.test(norm)) return true;
	if (/\/tests\//.test(norm)) return true;
	if (/\/__mocks__\//.test(norm)) return true;
	if (/\/testUtils\.[cm]?[jt]sx?$/.test(norm)) return true;
	if (/\/setupTests\.[cm]?[jt]sx?$/.test(norm)) return true;
	return false;
}

/**
 * Recursively collect files with specified extensions.
 */
export function collectFiles(dir, extensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]) {
	const files = [];
	try {
		const entries = readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			const full = join(dir, entry.name);
			if (entry.isDirectory()) {
				if (
					entry.name !== "node_modules" &&
					entry.name !== "dist" &&
					entry.name !== ".git" &&
					entry.name !== ".data" &&
					entry.name !== ".vite" &&
					entry.name !== "build" &&
					entry.name !== "scratch"
				) {
					files.push(...collectFiles(full, extensions));
				}
			} else if (entry.isFile()) {
				if (extensions.some((ext) => entry.name.endsWith(ext))) {
					files.push(full);
				}
			}
		}
	} catch {
		// Directory does not exist or is unreadable
	}
	return files;
}

/**
 * Strip string literals to prevent matching inside quotes.
 */
export function stripStringLiterals(line) {
	return line
		.replace(/"(?:[^"\\]|\\.)*"/g, '""')
		.replace(/'(?:[^'\\]|\\.)*'/g, "''")
		.replace(/`(?:[^`\\]|\\.)*`/g, "``");
}

/**
 * Indicator 1: Scan for explicit TypeScript `any` in production code.
 * Matches: `:\s*any\b`, `\bas\s+any\b`, `<\s*any\s*>`
 * Excludes comments and non-any words like company, many, anyhow.
 */
export function scanExplicitAny(files, repoRoot = DEFAULT_REPO_ROOT) {
	const anyRegex = /(:\s*any\b|\bas\s+any\b|<\s*any\s*>)/;
	const matches = [];

	for (const file of files) {
		const relPath = relative(repoRoot, file).replace(/\\/g, "/");
		const content = readFileSync(file, "utf8");
		const lines = content.split("\n");
		let inBlockComment = false;

		for (let i = 0; i < lines.length; i++) {
			const rawLine = lines[i];
			const trimmed = rawLine.trim();

			if (inBlockComment) {
				if (trimmed.includes("*/")) inBlockComment = false;
				continue;
			}
			if (trimmed.startsWith("/*")) {
				if (!trimmed.includes("*/")) inBlockComment = true;
				continue;
			}
			if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;

			const codePart = rawLine.split("//")[0];
			if (anyRegex.test(codePart)) {
				matches.push({
					file: relPath,
					line: i + 1,
					text: codePart.trim(),
					rule: "explicit-any",
				});
			}
		}
	}

	return matches;
}

/**
 * Indicator 2: Scan for linter suppressions (biome-ignore, eslint-disable).
 */
export function scanLinterSuppressions(files, repoRoot = DEFAULT_REPO_ROOT) {
	const linterRegex = /(?:biome-ignore|eslint-disable)/;
	const matches = [];

	for (const file of files) {
		const relPath = relative(repoRoot, file).replace(/\\/g, "/");
		const content = readFileSync(file, "utf8");
		const lines = content.split("\n");

		for (let i = 0; i < lines.length; i++) {
			const rawLine = lines[i];
			if (linterRegex.test(rawLine)) {
				matches.push({
					file: relPath,
					line: i + 1,
					text: rawLine.trim(),
					rule: "linter-suppression",
				});
			}
		}
	}

	return matches;
}

/**
 * Indicator 3: Scan for raw float divisions by 100 (`/ 100`) in UI code (apps/web/src).
 * Code must use canonical `@dental/shared/src/money.ts` utilities.
 */
export function scanRawFloatDivisions(webFiles, repoRoot = DEFAULT_REPO_ROOT) {
	const divRegex = /\/\s*100(?![0-9.])/;
	const matches = [];

	for (const file of webFiles) {
		const relPath = relative(repoRoot, file).replace(/\\/g, "/");
		const content = readFileSync(file, "utf8");
		const lines = content.split("\n");
		let inBlockComment = false;

		for (let i = 0; i < lines.length; i++) {
			const rawLine = lines[i];
			const trimmed = rawLine.trim();

			if (inBlockComment) {
				if (trimmed.includes("*/")) inBlockComment = false;
				continue;
			}
			if (trimmed.startsWith("/*")) {
				if (!trimmed.includes("*/")) inBlockComment = true;
				continue;
			}
			if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;

			// Strip quotes so that strings like "100% скидка" don't match
			const codeWithoutComments = rawLine.split("//")[0];
			const codePart = stripStringLiterals(codeWithoutComments);

			if (divRegex.test(codePart)) {
				matches.push({
					file: relPath,
					line: i + 1,
					text: codeWithoutComments.trim(),
					rule: "raw-float-division",
				});
			}
		}
	}

	return matches;
}

/**
 * Indicator 4: Scan for uppercase on buttons, chips, tabs (Mandate 8am UPPERCASE BAN).
 * Evaluates both CSS rules and TSX element classes.
 */
export function scanUppercaseButtons(webCodeFiles, webCssFiles, repoRoot = DEFAULT_REPO_ROOT) {
	const matches = [];
	const buttonTabChipSelectorRegex =
		/(?:^|[^\w-])(?:button|\.dente-btn|\.primary-button|\.secondary-button|\.cw-btn|\[role=["']button["']|\[role=["']tab["']|\.tab(?:-[a-z0-9_-]+)?|\.chip(?:-[a-z0-9_-]+)?|\.pill(?:-[a-z0-9_-]+)?|[a-z0-9_-]+-(?:pill|chip|tab|btn|button))(?:[^\w-]|$)/i;

	// Check CSS files
	for (const file of webCssFiles) {
		const relPath = relative(repoRoot, file).replace(/\\/g, "/");
		const content = readFileSync(file, "utf8");
		const clean = content.replace(/\/\*[\s\S]*?\*\//g, "");
		const ruleRegex = /([^{}]+)\{([^}]+)\}/g;
		let m;
		while ((m = ruleRegex.exec(clean)) !== null) {
			const selector = m[1].trim();
			const body = m[2];
			if (/text-transform\s*:\s*uppercase/i.test(body)) {
				const cleanSel = selector.replace(/\b(?:table|tbody|thead|tfoot|th|td)\b/gi, "");
				if (buttonTabChipSelectorRegex.test(cleanSel)) {
					const lineNum = content.slice(0, m.index).split("\n").length;
					matches.push({
						file: relPath,
						line: lineNum,
						text: `${selector} { text-transform: uppercase; }`,
						element: selector.replace(/\s+/g, " "),
						rule: "uppercase-button-css",
					});
				}
			}
		}
	}

	// Check TSX / JSX files
	for (const file of webCodeFiles) {
		if (!file.endsWith(".tsx") && !file.endsWith(".jsx")) continue;
		const relPath = relative(repoRoot, file).replace(/\\/g, "/");
		const content = readFileSync(file, "utf8");
		const lines = content.split("\n");

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (/\buppercase\b/.test(line)) {
				if (
					/<button\b|role=["'](?:button|tab)["']|\b(?:dente-btn|cw-btn|primary-button|secondary-button)\b|<(?:Button|Tab|TabsTrigger|Chip)\b/i.test(
						line,
					)
				) {
					matches.push({
						file: relPath,
						line: i + 1,
						text: line.trim(),
						rule: "uppercase-button-tsx",
					});
				}
			}
		}
	}

	return matches;
}

/**
 * Load baseline limits from JSON file.
 */
export function getBaseline(baselinePath = DEFAULT_BASELINE_PATH) {
	if (!existsSync(baselinePath)) {
		throw new Error(`Sanitary baseline configuration file not found at: ${baselinePath}`);
	}
	const content = readFileSync(baselinePath, "utf8");
	return JSON.parse(content);
}

/**
 * Save updated baseline limits to JSON file.
 */
export function saveBaseline(baselinePath = DEFAULT_BASELINE_PATH, newBaseline) {
	const dir = dirname(baselinePath);
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
	const formatted = `${JSON.stringify(newBaseline, null, 2)}\n`;
	writeFileSync(baselinePath, formatted, "utf8");
}

/**
 * Count all 4 sanitary metrics in the monorepo.
 */
export function countSanitaryMetrics(options = {}) {
	const repoRoot = options.repoRoot || DEFAULT_REPO_ROOT;
	const scanRoots = [
		join(repoRoot, "packages", "shared", "src"),
		join(repoRoot, "apps", "api", "src"),
		join(repoRoot, "apps", "web", "src"),
	];

	const prodCodeFiles = [];
	for (const root of scanRoots) {
		const files = collectFiles(root, [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
		for (const file of files) {
			const rel = relative(repoRoot, file);
			if (!isTestFile(rel)) {
				prodCodeFiles.push(file);
			}
		}
	}

	const webCodeFiles = prodCodeFiles.filter((f) =>
		relative(repoRoot, f).replace(/\\/g, "/").startsWith("apps/web/src/"),
	);

	const webCssFiles = collectFiles(join(repoRoot, "apps", "web", "src"), [".css"]);

	const anyMatches = scanExplicitAny(prodCodeFiles, repoRoot);
	const linterMatches = scanLinterSuppressions(prodCodeFiles, repoRoot);
	const divMatches = scanRawFloatDivisions(webCodeFiles, repoRoot);
	const uppercaseMatches = scanUppercaseButtons(webCodeFiles, webCssFiles, repoRoot);

	return {
		counts: {
			maxExplicitAny: anyMatches.length,
			maxLinterSuppressions: linterMatches.length,
			maxRawFloatDivisions: divMatches.length,
			maxUppercaseButtons: uppercaseMatches.length,
		},
		matches: {
			maxExplicitAny: anyMatches,
			maxLinterSuppressions: linterMatches,
			maxRawFloatDivisions: divMatches,
			maxUppercaseButtons: uppercaseMatches,
		},
		stats: {
			prodCodeFilesCount: prodCodeFiles.length,
			webCodeFilesCount: webCodeFiles.length,
			webCssFilesCount: webCssFiles.length,
		},
	};
}

/**
 * Core Ratchet Logic:
 * Compare current metrics against baseline limits.
 * Returns { ok, regressions, improvements, current, baseline }.
 */
export function evaluateRatchet(currentCounts, baseline) {
	const metrics = [
		"maxExplicitAny",
		"maxLinterSuppressions",
		"maxRawFloatDivisions",
		"maxUppercaseButtons",
	];

	const regressions = [];
	const improvements = [];

	for (const key of metrics) {
		const current = currentCounts[key] ?? 0;
		const limit = baseline[key] ?? 0;
		const delta = current - limit;

		if (delta > 0) {
			regressions.push({
				metric: key,
				current,
				limit,
				delta,
			});
		} else if (delta < 0) {
			improvements.push({
				metric: key,
				current,
				limit,
				delta,
			});
		}
	}

	return {
		ok: regressions.length === 0,
		regressions,
		improvements,
		current: currentCounts,
		baseline,
	};
}

/**
 * Main execution routine.
 */
export function checkRatchet(options = {}) {
	const repoRoot = options.repoRoot || DEFAULT_REPO_ROOT;
	const baselinePath = options.baselinePath || DEFAULT_BASELINE_PATH;
	const autoRatchet = options.autoRatchet ?? false;

	const baseline = getBaseline(baselinePath);
	const { counts, matches, stats } = countSanitaryMetrics({ repoRoot });
	const result = evaluateRatchet(counts, baseline);

	let updated = false;
	if (result.improvements.length > 0 && autoRatchet) {
		const newBaseline = { ...baseline };
		for (const imp of result.improvements) {
			newBaseline[imp.metric] = imp.current;
		}
		saveBaseline(baselinePath, newBaseline);
		updated = true;
	}

	return {
		...result,
		matches,
		stats,
		updated,
	};
}

/**
 * Format metric label for human display.
 */
function formatMetricLabel(metric) {
	switch (metric) {
		case "maxExplicitAny":
			return "Явные any (: any, as any, <any>)";
		case "maxLinterSuppressions":
			return "Супрессии линтера (biome / eslint)";
		case "maxRawFloatDivisions":
			return "Голые деления / 100 в UI";
		case "maxUppercaseButtons":
			return "Uppercase на кнопках/чипах/табах";
		default:
			return metric;
	}
}

/**
 * CLI runner.
 */
function runCli() {
	const args = process.argv.slice(2);
	const noAutoRatchet = args.includes("--no-auto-ratchet") || args.includes("--dry-run");
	const autoRatchet = !noAutoRatchet;
	const jsonOutput = args.includes("--json");

	const startTime = Date.now();
	const baseline = getBaseline(DEFAULT_BASELINE_PATH);
	const { counts, matches, stats } = countSanitaryMetrics();
	const evaluation = evaluateRatchet(counts, baseline);
	const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

	if (jsonOutput) {
		console.log(JSON.stringify({ ...evaluation, elapsedSeconds: elapsed }, null, 2));
		if (!evaluation.ok) {
			process.exit(1);
		}
		process.exit(0);
	}

	console.log("\n================================================================================");
	console.log("🏛️  DENTE CRM — САНИТАРНЫЙ ХРАПОВИК КАЧЕСТВА (QUALITY RATCHET DOCTRINE)");
	console.log("================================================================================");
	console.log(`Базовый снимок:       scripts/config/sanitary-baseline.json`);
	console.log(`Боевых файлов ядра:   ${stats.prodCodeFilesCount} (UI: ${stats.webCodeFilesCount}, CSS: ${stats.webCssFilesCount})`);
	console.log(`Время проверки:       ${elapsed}s | Режим: ${autoRatchet ? "Авто-подгонка (Monotonic Auto-Ratchet)" : "Без авто-подгонки"}`);
	console.log("--------------------------------------------------------------------------------");
	console.log(
		"Метрика                                  | Факт | Лимит | Статус                 ",
	);
	console.log("-----------------------------------------+------+-------+------------------------");

	const metricKeys = [
		"maxExplicitAny",
		"maxLinterSuppressions",
		"maxRawFloatDivisions",
		"maxUppercaseButtons",
	];

	for (const key of metricKeys) {
		const current = counts[key];
		const limit = baseline[key];
		const delta = current - limit;
		const label = formatMetricLabel(key).padEnd(40);
		const curStr = String(current).padStart(4);
		const limStr = String(limit).padStart(5);

		let status = "";
		if (delta > 0) {
			status = `❌ РЕГРЕССИЯ (+${delta})`;
		} else if (delta < 0) {
			status = `✨ ЧИЩЕ НА ${Math.abs(delta)} (авто-подгонка)`;
		} else {
			status = `✓ В НОРМЕ (0)`;
		}

		console.log(`${label} | ${curStr} | ${limStr} | ${status}`);
	}

	console.log("================================================================================");

	// If there are regressions, report failure and list offending lines
	if (!evaluation.ok) {
		console.error("\n❌ ОШИБКА: ОБНАРУЖЕНА РЕГРЕССИЯ САНИТАРНОГО ХРАПОВИКА!");
		console.error("Закон Храповика (Мандат 8ai / Опыт Тимаэрта) категорически запрещает рост долга:\n");

		for (const reg of evaluation.regressions) {
			console.error(`🔴 ${formatMetricLabel(reg.metric)}: факт ${reg.current} > лимит ${reg.limit} (+${reg.delta})`);
			const fileMatches = matches[reg.metric] || [];
			const sample = fileMatches.slice(-Math.min(fileMatches.length, Math.max(reg.delta, 5)));
			for (const m of sample) {
				console.error(`   - ${m.file}:${m.line} -> ${m.text || m.element}`);
			}
		}

		console.error("\nСлужебный подлог или добавление костылей заблокированы храповиком.");
		console.error("Сдаче подлежат только решения с монотонным сокращением технического долга.\n");
		process.exit(1);
	}

	// If improvements occurred, automatically ratchet down the baseline
	if (evaluation.improvements.length > 0) {
		if (autoRatchet) {
			const newBaseline = { ...baseline, ...counts };
			saveBaseline(DEFAULT_BASELINE_PATH, newBaseline);
			console.log("\n🔒 АВТО-ХРАПОВИК ЗАКРУЧЕН: Базовые лимиты автоматически снижены и навечно зафиксированы:");
			for (const imp of evaluation.improvements) {
				console.log(`   ✓ ${imp.metric}: ${imp.limit} ➔ ${imp.current} (-${Math.abs(imp.delta)})`);
			}
			console.log(`Обновлён файл: ${DEFAULT_BASELINE_PATH}\n`);
		} else {
			console.log("\n💡 ЗАМЕЧЕН ПРОГРЕСС: Кодовая база стала чище (auto-ratchet отключен):");
			for (const imp of evaluation.improvements) {
				console.log(`   - ${imp.metric}: ${imp.current} < ${imp.limit} (чище на ${Math.abs(imp.delta)})`);
			}
		}
	} else {
		console.log("\n✅ САНИТАРНЫЙ ХРАПОВИК ЧИСТ: Регрессий нет, лимиты строго соблюдены (Exit Code 0).\n");
	}

	process.exit(0);
}

// Execute CLI when run directly
if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
	runCli();
}
