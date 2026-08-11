/*
 * ВРЕМЕННЫЙ ПАТЧЕР №2. Кроме сообщения записывает САМУ needle и ИМЯ источника,
 * в котором её искали. Без needle классифицировать падение нельзя.
 */
import { readFileSync, writeFileSync } from "node:fs";

const ROOT = "C:/Clinic_MVP/dental-crm";

function emitPrelude() {
	return [
		"globalThis.__FAILS = [];",
		"globalThis.__SRCNAMES = new Map();",
		"globalThis.__nameOf = (s) => globalThis.__SRCNAMES.get(s) ?? ('len' + (s?.length ?? -1));",
		'process.on("exit", () => {',
		'  console.log("@@@JSON " + JSON.stringify(globalThis.__FAILS));',
		"});",
		"",
	].join("\n");
}

// ---------- settings ----------
{
	let s = readFileSync(`${ROOT}/scripts/smoke-settings-view-source.mjs`, "utf8");
	s = s.replace(
		"const exercisedKnownMissing = new Set();",
		`const exercisedKnownMissing = new Set();
globalThis.__SRCNAMES.set(appSource, "appSource");
globalThis.__SRCNAMES.set(settingsSource, "settingsSource");
globalThis.__SRCNAMES.set(cssSource, "cssSource");
globalThis.__SRCNAMES.set(sharedSource, "sharedSource");
globalThis.__SRCNAMES.set(settingsStaticDataSource, "settingsStaticDataSource");
globalThis.__SRCNAMES.set(workspaceUiLabelsSource, "workspaceUiLabelsSource");
globalThis.__SRCNAMES.set(imagingUiLabelsSource, "imagingUiLabelsSource");
globalThis.__SRCNAMES.set(mprClinicalSource, "mprClinicalSource");
globalThis.__SRCNAMES.set(mprControlMathSource, "mprControlMathSource");
globalThis.__SRCNAMES.set(smartImportsRoutesSource, "smartImportsRoutesSource");
globalThis.__SRCNAMES.set(systemRoutesSource, "systemRoutesSource");
globalThis.__SRCNAMES.set(persistentStateSource, "persistentStateSource");
globalThis.__SRCNAMES.set(sampleDataSource, "sampleDataSource");
globalThis.__SRCNAMES.set(accessGuardSource, "accessGuardSource");
globalThis.__SRCNAMES.set(scheduleRoutesSource, "scheduleRoutesSource");
globalThis.__SRCNAMES.set(settingsRoutesSource, "settingsRoutesSource");
globalThis.__SRCNAMES.set(imagingRoutesSource, "imagingRoutesSource");
globalThis.__SRCNAMES.set(telegramRoutesSource, "telegramRoutesSource");`,
	);
	s = s.replace(
		"\t\tthrow new Error(message);\n\t}\n\tif (debtReason) {\n\t\tthrow new Error(\n",
		'\t\tglobalThis.__FAILS.push({kind:"require",message,needle,src:globalThis.__nameOf(source)});\n\t\treturn;\n\t}\n\tif (debtReason) {\n\t\tglobalThis.__FAILS.push(\n',
	);
	s = s.replace(
		"function forbidIn(source, needle, message) {\n\tif (source.includes(needle)) throw new Error(message);",
		'function forbidIn(source, needle, message) {\n\tif (source.includes(needle)) globalThis.__FAILS.push({kind:"forbid",message,needle,src:globalThis.__nameOf(source)});',
	);
	s = s.replace(
		"function requirePattern(source, pattern, message) {\n\tif (!pattern.test(source)) throw new Error(message);",
		'function requirePattern(source, pattern, message) {\n\tif (!pattern.test(source)) globalThis.__FAILS.push({kind:"pattern",message,needle:String(pattern),src:globalThis.__nameOf(source)});',
	);
	s = s.replace(
		"if (rawExceptionLeaks.length > RAW_EXCEPTION_LEAK_DEBT) {\n\tthrow new Error(",
		'if (rawExceptionLeaks.length > RAW_EXCEPTION_LEAK_DEBT) {\n\tglobalThis.__FAILS.push({kind:"ratchet",message:',
	);
	s = s.replace(
		"if (rawExceptionLeaks.length < RAW_EXCEPTION_LEAK_DEBT) {\n\tthrow new Error(",
		'if (rawExceptionLeaks.length < RAW_EXCEPTION_LEAK_DEBT) {\n\tglobalThis.__FAILS.push({kind:"ratchet",message:',
	);
	s = s.replace(
		"if (staleDebtEntries.length > 0) {\n\tthrow new Error(",
		'if (staleDebtEntries.length > 0) {\n\tglobalThis.__FAILS.push({kind:"debt-stale",message:',
	);
	// закрыть объектные литералы: заменяем закрывающую скобку throw-блоков
	s = s.replace(
		/globalThis\.__FAILS\.push\(\{kind:"ratchet",message:([\s\S]*?)\n\t\);/g,
		'globalThis.__FAILS.push({kind:"ratchet",message:$1\n\t});',
	);
	s = s.replace(
		/globalThis\.__FAILS\.push\(\{kind:"debt-stale",message:([\s\S]*?)\n\t\);/g,
		'globalThis.__FAILS.push({kind:"debt-stale",message:$1\n\t});',
	);
	s = s.replace(
		/globalThis\.__FAILS\.push\(\n\t\t\t`Долг закрыт \(\$\{debtReason\}\)([\s\S]*?)\n\t\t\);/,
		'globalThis.__FAILS.push({kind:"debt-closed",message,needle,src:globalThis.__nameOf(source)});//$1\n',
	);
	writeFileSync(
		`${ROOT}/scripts/_tmpdiag2-settings.mjs`,
		emitPrelude() + s,
	);
	console.log("wrote settings");
}

// ---------- onboarding ----------
{
	let s = readFileSync(
		`${ROOT}/scripts/smoke-onboarding-configuration-source.mjs`,
		"utf8",
	);
	s = s.replace(
		"function assert(condition, message) {\n\tif (!condition) throw new Error(message);",
		'function assert(condition, message) {\n\tif (!condition) globalThis.__FAILS.push({kind:"assert",message});',
	);
	s = s.replace(
		"function assertLoose(source, needle, message) {",
		'function assertLoose(source, needle, message) {\n\tif (!collapseSpace(source).includes(collapseSpace(needle))) { globalThis.__FAILS.push({kind:"loose",message,needle}); return; }',
	);
	writeFileSync(
		`${ROOT}/scripts/_tmpdiag2-onboarding.mjs`,
		emitPrelude() + s,
	);
	console.log("wrote onboarding");
}

// ---------- ui prefs ----------
{
	let s = readFileSync(`${ROOT}/scripts/smoke-ui-preferences.mjs`, "utf8");
	s = s.replace(
		"function fail(message) {\n\tthrow new Error(message);\n}",
		'function fail(message) {\n\tglobalThis.__FAILS.push({kind:"fail",message});\n}',
	);
	writeFileSync(`${ROOT}/scripts/_tmpdiag2-uiprefs.mjs`, emitPrelude() + s);
	console.log("wrote uiprefs");
}
