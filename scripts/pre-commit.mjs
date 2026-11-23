/**
 * @file pre-commit.mjs
 * @description Железный автоматический pre-commit барьер DENTE CRM.
 *
 * Блокирует любой git commit, если:
 * 1. Есть файлы с некорректной кодировкой / UTF-8 BOM.
 * 2. Есть битые динамические импорты.
 * 3. Нарушен потолок храповика типов или санитарных норм (any / biome-ignore / /100 / uppercase).
 * 4. Захардкожены вымышленные пациенты в дефолтных пропсах UI.
 */

import { execSync } from "node:child_process";
import { printFailureManifesto } from "./manifests/failure-manifestos.mjs";

const CHECKS = [
	{ id: "DIFF_SAFETY", name: "Diff Safety Guard (Anti-Blind-Kitten Gate)", cmd: "node --max-old-space-size=2048 scripts/check-staged-safety.mjs" },
	{ id: "ENCODING_UTF8", name: "UTF-8 Encoding", cmd: "node --max-old-space-size=2048 scripts/check-encoding.mjs" },
	{ id: "DYNAMIC_IMPORTS", name: "Dynamic Imports", cmd: "node --max-old-space-size=2048 scripts/check-dynamic-imports.mjs" },
	{ id: "TYPE_RATCHET", name: "Type Ratchet (Mandate 8bh)", cmd: "node --max-old-space-size=2048 scripts/check-type-ratchet.mjs" },
	{ id: "TYPE_RATCHET", name: "Sanitary Quality Ratchet (0 any, 0 suppressions, 0 uppercase, <=21 float)", cmd: "node --max-old-space-size=2048 scripts/quality-ratchet.mjs" },
	{ id: "MOCK_DEFAULTS", name: "Mock Defaults Hunter (Mandate 8bh)", cmd: "node --max-old-space-size=2048 scripts/check-mock-defaults.mjs" },
	{ id: "SINGLE_DOORS", name: "Single-Door SSOT Guardian", cmd: "node --max-old-space-size=2048 scripts/check-single-doors.mjs" },
	{ id: "DICE_AUDIT", name: "Monte Carlo Dice Reality Audit (Кубик Тимаэрта)", cmd: "node --max-old-space-size=2048 scripts/dice-audit.mjs --strict" },
];

console.log("🛡️ [PRE-COMMIT GATE] Запуск автоматических машинных замков...");

let failed = false;
let failedCheck = null;

for (const check of CHECKS) {
	try {
		console.log(`\n⏳ Проверка: ${check.name}...`);
		execSync(check.cmd, { stdio: "inherit", encoding: "utf8" });
	} catch (e) {
		console.error(`\n❌ [FAILED] Проверка '${check.name}' завершилась с ошибкой!`);
		failed = true;
		failedCheck = check;
		break;
	}
}

if (failed && failedCheck) {
	printFailureManifesto(failedCheck.id, {
		details: `Провалился обязательный этап прекоммита: '${failedCheck.name}'. Команда: ${failedCheck.cmd}`,
	});
	process.exit(1);
}

console.log("\n✅ [PRE-COMMIT PASSED] Все машинные проверки успешно пройдены. Коммит разрешен.\n");
