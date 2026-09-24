/**
 * scripts/check-test-safety.mjs
 *
 * THE ANTI-RAM-HOG & HOST PROTECTION GATE (Mandate 8x & Rule 13)
 *
 * Scans all test files and package.json configurations to prevent:
 * 1. Recursive/cyclic handmade mock-DOM implementations (setupMockDom, createMockElement)
 * 2. createRoot mounting in Node test runners on non-standard mock DOMs
 * 3. Infinite test timeouts (--test-timeout=0 or missing timeout flags)
 * 4. Unbounded V8 memory allocations (missing --max-old-space-size in test scripts)
 *
 * Returns exit code 1 if any violation is found.
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { extname, join } from "node:path";

const SCAN_DIRS = ["apps", "packages", "scripts"];
const FORBIDDEN_TEST_PATTERNS = [
	{
		pattern: /setupMockDom\s*\(/i,
		rule: "Handmade recursive mock-DOM (setupMockDom) is strictly forbidden. Use SSR renderToString or pure logic tests (Mandate 8x)."
	},
	{
		pattern: /function\s+createMockElement\s*\(/i,
		rule: "Handmade cyclic mock DOM node factory (createMockElement) is forbidden (Mandate 8x)."
	},
	{
		pattern: /createRoot\s*\(/,
		rule: "createRoot in Node test runner triggers infinite Fiber allocations on mock DOMs. Use SSR renderToString from react-dom/server or pure logic tests (Mandate 8x)."
	}
];

function collectFiles(dir, filterFn) {
	const out = [];
	if (!existsSync(dir)) return out;
	for (const entry of readdirSync(dir)) {
		if (entry === "node_modules" || entry === "dist" || entry === ".git" || entry === ".data") continue;
		const full = join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) {
			out.push(...collectFiles(full, filterFn));
		} else if (filterFn(full)) {
			out.push(full);
		}
	}
	return out;
}

const violations = [];

// 1. Audit all test files for memory-hog patterns
const isTestFile = (path) => /\.test\.[tj]sx?$/.test(path);
const testFiles = SCAN_DIRS.flatMap((dir) => collectFiles(dir, isTestFile));

for (const filePath of testFiles) {
	const content = readFileSync(filePath, "utf-8");
	const lines = content.split("\n");

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		for (const check of FORBIDDEN_TEST_PATTERNS) {
			if (check.pattern.test(line)) {
				violations.push({
					file: filePath,
					line: i + 1,
					text: line.trim(),
					rule: check.rule
				});
			}
		}
	}
}

// 2. Audit all package.json files for memory ceilings and timeout flags
const packageJsonFiles = [
	"package.json",
	"apps/web/package.json",
	"apps/api/package.json",
	"packages/shared/package.json"
].filter(existsSync);

for (const pkgPath of packageJsonFiles) {
	try {
		const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
		const scripts = pkg.scripts || {};
		for (const [name, cmd] of Object.entries(scripts)) {
			if (name === "test" || name.startsWith("test:")) {
				if (cmd.includes("test-timeout=0")) {
					violations.push({
						file: pkgPath,
						line: 0,
						text: `"${name}": "${cmd}"`,
						rule: "Infinite test timeout (--test-timeout=0) is strictly forbidden (Mandate 8x)."
					});
				}
				if (cmd.includes("node ") && cmd.includes("--test")) {
					if (!cmd.includes("--max-old-space-size")) {
						violations.push({
							file: pkgPath,
							line: 0,
							text: `"${name}": "${cmd}"`,
							rule: "Node test script must enforce a V8 memory ceiling (--max-old-space-size=2048) (Mandate 8x)."
						});
					}
					if (!cmd.includes("--test-timeout")) {
						violations.push({
							file: pkgPath,
							line: 0,
							text: `"${name}": "${cmd}"`,
							rule: "Node test script must enforce an explicit timeout ceiling (--test-timeout=10000) (Mandate 8x)."
						});
					}
				}
			}
		}
	} catch (err) {
		violations.push({
			file: pkgPath,
			line: 0,
			text: "Failed to parse JSON",
			rule: String(err)
		});
	}
}

console.log(`[check:test-safety] Проверено тестовых файлов: ${testFiles.length}`);
console.log(`[check:test-safety] Проверено package.json файлов: ${packageJsonFiles.length}`);

if (violations.length > 0) {
	console.error(`\n❌ НАЙДЕНО ${violations.length} НАРУШЕНИЙ МАНДАТА 8x (ЗАЩИТА ОТ ЖОРА ОЗУ И ЗАВИСАНИЯ ХОСТА):`);
	for (const v of violations) {
		console.error(`  - ${v.file}${v.line > 0 ? `:${v.line}` : ""}`);
		console.error(`    Фрагмент: ${v.text}`);
		console.error(`    Правило:  ${v.rule}\n`);
	}
	process.exit(1);
}

console.log("✅ Все тесты и конфигурации соответствуют Мандату 8x. Жор ОЗУ и зависания исключены.");
process.exit(0);
