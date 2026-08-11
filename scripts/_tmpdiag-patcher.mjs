/*
 * ВРЕМЕННЫЙ ДИАГНОСТИЧЕСКИЙ ПАТЧЕР. Создаёт копии стражей, которые НЕ БРОСАЮТ на
 * первом падении, а копят список. Копии кладутся в scripts/, потому что стражи
 * импортируют ./lib/*.mjs относительным путём. Копии удаляются вызывающим.
 */
import { readFileSync, writeFileSync } from "node:fs";

const ROOT = "C:/Clinic_MVP/dental-crm";

function patch(name, edits, header) {
	const src = readFileSync(`${ROOT}/scripts/${name}.mjs`, "utf8");
	let out = src;
	for (const [from, to] of edits) {
		if (!out.includes(from)) {
			console.error(`!! НЕ НАЙДЕНО в ${name}: ${JSON.stringify(from)}`);
			process.exitCode = 2;
			continue;
		}
		out = out.split(from).join(to);
	}
	// счётчик объявляем до всего остального
	const prelude = [
		"globalThis.__FAILS = [];",
		'process.on("exit", () => {',
		'  console.log("@@@TOTAL=" + globalThis.__FAILS.length);',
		"  for (const f of globalThis.__FAILS)",
		'    console.log("@@@FAIL|" + String(f).split("\\n").join(" ~ "));',
		"});",
		"",
	].join("\n");
	out = prelude + (header ?? "") + out;
	writeFileSync(`${ROOT}/scripts/_tmpdiag-${name}.mjs`, out);
	console.log(`ok ${name}`);
}

// ---- 1. settings ----
patch("smoke-settings-view-source", [
	[
		"\t\tthrow new Error(message);\n\t}\n\tif (debtReason) {\n\t\tthrow new Error(\n",
		"\t\tglobalThis.__FAILS.push(message);\n\t\treturn;\n\t}\n\tif (debtReason) {\n\t\tglobalThis.__FAILS.push(\n",
	],
	[
		"function forbidIn(source, needle, message) {\n\tif (source.includes(needle)) throw new Error(message);",
		"function forbidIn(source, needle, message) {\n\tif (source.includes(needle)) globalThis.__FAILS.push(`FORBID-HIT: ${message}`);",
	],
	[
		"function requirePattern(source, pattern, message) {\n\tif (!pattern.test(source)) throw new Error(message);",
		"function requirePattern(source, pattern, message) {\n\tif (!pattern.test(source)) globalThis.__FAILS.push(`PATTERN: ${message}`);",
	],
	[
		"if (rawExceptionLeaks.length > RAW_EXCEPTION_LEAK_DEBT) {\n\tthrow new Error(",
		"if (rawExceptionLeaks.length > RAW_EXCEPTION_LEAK_DEBT) {\n\tglobalThis.__FAILS.push(",
	],
	[
		"if (rawExceptionLeaks.length < RAW_EXCEPTION_LEAK_DEBT) {\n\tthrow new Error(",
		"if (rawExceptionLeaks.length < RAW_EXCEPTION_LEAK_DEBT) {\n\tglobalThis.__FAILS.push(",
	],
	[
		"if (staleDebtEntries.length > 0) {\n\tthrow new Error(",
		"if (staleDebtEntries.length > 0) {\n\tglobalThis.__FAILS.push(",
	],
]);

// ---- 2. onboarding ----
patch("smoke-onboarding-configuration-source", [
	[
		"function assert(condition, message) {\n\tif (!condition) throw new Error(message);",
		"function assert(condition, message) {\n\tif (!condition) globalThis.__FAILS.push(message);",
	],
]);

// ---- 3. ui preferences ----
patch("smoke-ui-preferences", [
	[
		"function fail(message) {\n\tthrow new Error(message);\n}",
		"function fail(message) {\n\tglobalThis.__FAILS.push(message);\n}",
	],
]);
