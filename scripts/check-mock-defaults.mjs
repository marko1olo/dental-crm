/**
 * @file check-mock-defaults.mjs
 * @description Охотник за фейковыми моками в дефолтных пропсах компонентов (Мандат 8bh).
 *
 * НАЗНАЧЕНИЕ:
 * Запрещает зашивать вымышленных пациентов («Иванов Иван Иванович», «Петров», «Тест»)
 * и фейковые суммы в дефолтные параметры компонентов и представления в apps/web/src.
 * Читает лимиты из `.data/code-health-ratchet.json`. При флаге `--tighten` автоматически
 * снижает лимит до актуального при устранении моков.
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { printFailureManifesto } from "./manifests/failure-manifestos.mjs";

const ROOT_DIR = process.cwd();
const RATCHET_LEDGER_PATH = join(ROOT_DIR, ".data/code-health-ratchet.json");
const TARGET_DIRS = ["apps/web/src/components", "apps/web/src/views", "apps/web/src/appModules"];

const SHOULD_TIGHTEN = process.argv.includes("--tighten");

function loadRatchetLedger() {
	if (!existsSync(RATCHET_LEDGER_PATH)) {
		return {
			version: 1,
			limits: { "apps/web/src": { maxMockDefaults: 19 } },
		};
	}
	try {
		return JSON.parse(readFileSync(RATCHET_LEDGER_PATH, "utf8"));
	} catch (e) {
		console.error(`[ERROR] Не удалось прочитать ${RATCHET_LEDGER_PATH}:`, e);
		process.exit(1);
	}
}

const SUSPICIOUS_MOCK_PATTERNS = [
	/(?:patientName|patientFullName|fullName|payerFullName)\s*=\s*["'](Иванов|Петров|Сидоров|Тест)[^"']*["']/g,
	/(?:patientName|patientFullName|fullName|payerFullName)\s*(?:\|\||\?\?)\s*["'](Иванов|Петров|Сидоров)[^"']*["']/g,
	/patientName:\s*patient\?\.(?:fullName|name)\s*(?:\|\||\?\?)\s*["'](Иванов|Петров|Сидоров)[^"']*["']/g,
	/const\s+fallbackPatient\s*=\s*\{[^}]*fullName:\s*["'](Иванов|Петров|Сидоров)[^"']*["']/g,
];

function isTestOrMockFile(path) {
	const normalized = path.replace(/\\/g, "/");
	return (
		normalized.includes("/__tests__/") ||
		normalized.includes("/tests/") ||
		normalized.includes(".test.") ||
		normalized.includes(".spec.") ||
		normalized.includes("/sampleData/") ||
		normalized.includes("/demo/") ||
		normalized.includes("/storybook/")
	);
}

function collectSourceFiles(dir, extensions = [".ts", ".tsx"]) {
	const results = [];
	if (!existsSync(dir)) return results;

	function walk(currentDir) {
		const entries = readdirSync(currentDir);
		for (const entry of entries) {
			if (entry === "node_modules" || entry === "dist" || entry === ".git") continue;
			const fullPath = join(currentDir, entry);
			try {
				const stat = statSync(fullPath);
				if (stat.isDirectory()) {
					walk(fullPath);
				} else if (stat.isFile() && extensions.includes(extname(entry))) {
					if (!isTestOrMockFile(fullPath)) {
						results.push(fullPath);
					}
				}
			} catch (_) {}
		}
	}

	walk(dir);
	return results;
}

function auditMockDefaults() {
	const ledger = loadRatchetLedger();
	const maxMockDefaults = ledger.limits?.["apps/web/src"]?.maxMockDefaults ?? 19;

	console.log("🔒 [MOCK DEFAULTS] Проверка боевых компонентов на вымышленные данные по реестру...");
	const violations = [];
	let totalFiles = 0;

	for (const targetDir of TARGET_DIRS) {
		const files = collectSourceFiles(join(ROOT_DIR, targetDir));
		totalFiles += files.length;

		for (const file of files) {
			try {
				const content = readFileSync(file, "utf8");
				const lines = content.split("\n");

				lines.forEach((line, index) => {
					// Игнорируем строки с явной проверкой isDemoShowcaseMode
					if (line.includes("isDemoShowcaseMode") || line.includes("isDemoPatientId")) {
						return;
					}

					for (const pattern of SUSPICIOUS_MOCK_PATTERNS) {
						pattern.lastIndex = 0;
						if (pattern.test(line)) {
							violations.push({
								file: relative(ROOT_DIR, file).replace(/\\/g, "/"),
								line: index + 1,
								snippet: line.trim(),
							});
							break;
						}
					}
				});
			} catch (_) {}
		}
	}

	console.log(`  Просканировано ${totalFiles} боевых файлов UI.`);

	if (violations.length > maxMockDefaults) {
		console.error(`\n❌ [MOCK DEFAULTS BREACH] Найдено ${violations.length} нарушений (лимит: ${maxMockDefaults})!`);
		for (const v of violations) {
			console.error(`   ${v.file}:${v.line} -> ${v.snippet}`);
		}
		printFailureManifesto("MOCK_DEFAULTS", {
			details: `Найдено ${violations.length} захардкоженных вымышленных пациентов/сумм в UI (лимит: ${maxMockDefaults}).`,
		});
		process.exit(1);
	} else {
		console.log(
			`  ✓ Найдено ${violations.length}/${maxMockDefaults} легаси-дефолтов с моками (рост заблокирован храповиком)`,
		);

		if (SHOULD_TIGHTEN && violations.length < maxMockDefaults) {
			console.log(`  ⚡ [TIGHTEN] Потолок mock-defaults снижен: ${maxMockDefaults} -> ${violations.length}`);
			if (!ledger.limits["apps/web/src"]) ledger.limits["apps/web/src"] = {};
			ledger.limits["apps/web/src"].maxMockDefaults = violations.length;
			ledger.updatedAt = new Date().toISOString();
			writeFileSync(RATCHET_LEDGER_PATH, JSON.stringify(ledger, null, 2) + "\n", "utf8");
			console.log(`💾 [RATCHET LEDGER UPDATED] Реестр ${RATCHET_LEDGER_PATH} зафиксировал снижение моков.`);
		}

		console.log("✅ [MOCK DEFAULTS PASSED] Все проверки дефолтных значений пройдены.\n");
	}
}

auditMockDefaults();
