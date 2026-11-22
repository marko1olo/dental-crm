#!/usr/bin/env node
/**
 * @file guarded-test.mjs
 * @description Защищённый запуск модульных и интеграционных тестов с выводом Failure Manifesto при ошибках.
 */

import { spawnSync } from "node:child_process";
import { printFailureManifesto } from "./manifests/failure-manifestos.mjs";

const STEPS = [
	{ name: "File limits guard", cmd: "node", args: ["scripts/check_file_limits.cjs"] },
	{ name: "Sandbox hunter guard", cmd: "node", args: ["scripts/sandbox_hunter.cjs"] },
	{ name: "@dental/shared unit tests", cmd: "npm", args: ["run", "test", "-w", "@dental/shared"] },
	{ name: "@dental/api integration tests", cmd: "npm", args: ["run", "test", "-w", "@dental/api"] },
	{ name: "@dental/web component tests", cmd: "npm", args: ["run", "test", "-w", "@dental/web"] },
];

console.log("🛡️ [GUARDED TESTS] Запуск сквозного набора тестов монорепозитория...\n");

for (const step of STEPS) {
	console.log(`⏳ Выполнение шага: ${step.name}...`);
	const result = spawnSync(step.cmd, step.args, {
		stdio: "inherit",
		shell: true,
	});

	if (result.status !== 0) {
		console.error(`\n❌ [TESTS FAILED] Шаг '${step.name}' упал с кодом ${result.status}!`);
		printFailureManifesto("UNIT_TESTS", {
			details: `Сбой тестового набора на шаге '${step.name}'. Команда: ${step.cmd} ${step.args.join(" ")}`,
		});
		process.exit(result.status || 1);
	}
}

console.log("\n✅ [GUARDED TESTS: EXIT 0] Все тесты успешно пройдены. Регрессий нет!\n");
