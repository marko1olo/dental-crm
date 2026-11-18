/**
 * @file pre-commit.mjs
 * @description Железный автоматический pre-commit барьер DENTE CRM.
 *
 * Блокирует любой git commit, если:
 * 1. Есть файлы с некорректной кодировкой / UTF-8 BOM.
 * 2. Есть битые динамические импорты.
 * 3. Нарушен потолок храповика типов (any / biome-ignore / fastify routes).
 * 4. Захардкожены вымышленные пациенты в дефолтных пропсах UI.
 */

import { execSync } from "node:child_process";

const CHECKS = [
	{ name: "UTF-8 Encoding", cmd: "node --max-old-space-size=2048 scripts/check-encoding.mjs" },
	{ name: "Dynamic Imports", cmd: "node --max-old-space-size=2048 scripts/check-dynamic-imports.mjs" },
	{ name: "Type Ratchet (Mandate 8bh)", cmd: "node --max-old-space-size=2048 scripts/check-type-ratchet.mjs" },
	{ name: "Mock Defaults Hunter (Mandate 8bh)", cmd: "node --max-old-space-size=2048 scripts/check-mock-defaults.mjs" },
];

console.log("🛡️ [PRE-COMMIT GATE] Запуск автоматических машинных замков...");

let failed = false;

for (const check of CHECKS) {
	try {
		console.log(`\n⏳ Проверка: ${check.name}...`);
		execSync(check.cmd, { stdio: "inherit", encoding: "utf8" });
	} catch (e) {
		console.error(`\n❌ [FAILED] Проверка '${check.name}' завершилась с ошибкой!`);
		failed = true;
		break;
	}
}

if (failed) {
	console.error("\n💥 [COMMIT REJECTED] Коммит отклонен автоматическим гейтом качества!");
	console.error("Устраните выявленные нарушения перед выполнением git commit.");
	process.exit(1);
}

console.log("\n✅ [PRE-COMMIT PASSED] Все машинные проверки успешно пройдены. Коммит разрешен.\n");
