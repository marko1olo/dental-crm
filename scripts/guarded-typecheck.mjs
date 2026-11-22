#!/usr/bin/env node
/**
 * @file guarded-typecheck.mjs
 * @description Защищённый запуск проверки типов TypeScript с выводом Failure Manifesto при ошибках.
 */

import { spawnSync } from "node:child_process";
import { printFailureManifesto } from "./manifests/failure-manifestos.mjs";

const STEPS = [
	{ name: "@dental/shared (build)", cmd: "npm", args: ["run", "build", "-w", "@dental/shared"] },
	{ name: "@dental/shared (typecheck)", cmd: "npm", args: ["run", "typecheck", "-w", "@dental/shared"] },
	{ name: "@dental/shared (tests typecheck)", cmd: "npm", args: ["run", "typecheck:tests", "-w", "@dental/shared"] },
	{ name: "@dental/api (typecheck)", cmd: "npm", args: ["run", "typecheck", "-w", "@dental/api"] },
	{ name: "@dental/api (tests typecheck)", cmd: "npm", args: ["run", "typecheck:tests", "-w", "@dental/api"] },
	{ name: "@dental/web (typecheck)", cmd: "npm", args: ["run", "typecheck", "-w", "@dental/web"] },
];

console.log("🛡️ [GUARDED TYPECHECK] Запуск сквозной проверки типов во всех пакетах монорепозитория...\n");

for (const step of STEPS) {
	console.log(`⏳ Проверка пакета: ${step.name}...`);
	const result = spawnSync(step.cmd, step.args, {
		stdio: "inherit",
		shell: true,
	});

	if (result.status !== 0) {
		console.error(`\n❌ [TYPECHECK FAILED] Пакет '${step.name}' упал с кодом ${result.status}!`);
		printFailureManifesto("TYPESCRIPT_COMPILER", {
			details: `Сбой компилятора TypeScript в пакете '${step.name}'. Команда: ${step.cmd} ${step.args.join(" ")}`,
		});
		process.exit(result.status || 1);
	}
}

console.log("\n✅ [GUARDED TYPECHECK: EXIT 0] Все пакеты успешно скомпилированы. 0 ошибок типов!\n");
