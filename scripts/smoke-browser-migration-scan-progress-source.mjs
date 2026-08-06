import { readFile } from "node:fs/promises";
import { readAppLogicSource } from "./lib/app-logic-source.mjs";

const appSource =
	(await readFile("apps/web/src/App.tsx", "utf8")) +
	"\n" +
	(await readAppLogicSource()) +
	"\n" +
	(await readFile("apps/web/src/AppHelpers.tsx", "utf8"));

/*
 * НАБОР ФАЙЛОВ НАСТРОЕК: МОНОЛИТ ПЛЮС ЖИВЫЕ ВКЛАДКИ.
 *
 * Класс STALE. Восемь требований к интерфейсу сканирования краснели за переезд:
 * SettingsView.tsx разобран на вкладки, и вся разметка прогресса переноса лежит
 * теперь в apps/web/src/components/settings/SettingsImportsTab.tsx. Замер
 * 29.07.2026 — все восемь маркеров нашлись там одним файлом:
 *
 *   rg -l 'browser-cancel-migration-source-scan' apps/web/src
 *     -> apps/web/src/components/settings/SettingsImportsTab.tsx
 *
 * Вкладка ЖИВАЯ, а не мёртвая копия: SettingsView.tsx:1894 рендерит
 * `<SettingsImportsTab {...settingsProps} settingsTab={settingsTab} />` под
 * условием активной вкладки. Поэтому набор расширен, а не требования ослаблены.
 */
const settingsSource = [
	await readFile("apps/web/src/SettingsView.tsx", "utf8"),
	await readFile(
		"apps/web/src/components/settings/SettingsImportsTab.tsx",
		"utf8",
	),
].join("\n");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));

/*
 * СТРАЖ БОЛЬШЕ НЕ УМИРАЕТ НА ПЕРВОМ НЕСОВПАДЕНИИ.
 *
 * Было: `assertIncludes` бросал исключение, и из 50 проверок наружу выходила
 * ОДНА строка. Замер 29.07.2026: страж падал на маркере №31 из 34, а за ним
 * молча не исполнялись ни остальные требования к логике, ни ВСЕ 11 требований к
 * интерфейсу, ни 5 запретов. Настоящее число несовпадений было 10, а видно было
 * одно — по такому докладу нельзя отличить переезд текста от снесённой функции.
 * Теперь собираются все, и запреты исполняются всегда.
 */
const failures = [];

function assertIncludes(source, marker, label) {
	if (!source.includes(marker)) {
		failures.push(`${label} missing marker: ${marker}`);
	}
}

function assertMatches(source, pattern, label, requirement) {
	if (!pattern.test(source)) {
		failures.push(`${label}: ${requirement} (образец ${pattern})`);
	}
}

function assertNotIncludes(source, marker, label) {
	if (source.includes(marker)) {
		failures.push(`${label} still includes forbidden marker: ${marker}`);
	}
}

[
	"type BrowserMigrationScanStats",
	"type BrowserMigrationScanProgress",
	"type BrowserMigrationScanOptions",
	"type BrowserMigrationScanRuntime",
	"const browserMigrationScanFileLimit = 1200",
	"const browserMigrationScanFolderLimit = 320",
	"const browserMigrationScanDirectoryEntryLimit = 1600",
	"const browserMigrationScanMagicReadLimit = 220",
	"const browserMigrationScanYieldEveryUnits = 24",
	"const browserMigrationScanYieldEveryMs = 20",
	"const browserMigrationScanProgressEveryUnits = 12",
	"const browserMigrationScanProgressEveryMs = 96",
	"browserMigrationScanAbortRef",
	"new AbortController()",
	"cancelBrowserMigrationScan",
	"signal?: AbortSignal",
	"throwIfBrowserMigrationScanAborted",
	"isBrowserMigrationScanAbortError",
	"createBrowserMigrationScanRuntime",
	"browserMigrationScanProgressFromStats",
	"publishBrowserMigrationScanProgress",
	"maybeYieldBrowserMigrationScan",
	"await browserImagingScanYield()",
	"runBrowserMigrationSourceScan",
	"setBrowserMigrationScanProgress",
	"scanBrowserMigrationDirectoryHandle(directoryHandle, options)",
	"scanBrowserMigrationFileList(fileList, options)",
	"onProgress: setBrowserMigrationScanProgress",
	"if (controller.signal.aborted) return",
	"await runMigrationAutopilot(discovery)",
	"fileList.item(fileIndex)",
	"inspectedDirectoryEntries > browserMigrationScanDirectoryEntryLimit",
].forEach((marker) =>
	assertIncludes(
		appSource,
		marker,
		"App browser migration scan progress contract",
	),
);

/*
 * ДВА ТРЕБОВАНИЯ ПЕРЕВЕДЕНЫ НА ОБРАЗЕЦ. КЛАСС BRITTLE — ОТЛИЧИЕ ТОЛЬКО В ПРОБЕЛАХ.
 *
 * Оба ограничения в продукте ЖИВЫ, форматирование перенесло их на несколько
 * строк. Замер 29.07.2026 по useAppLogic.tsx:
 *
 *   требовалось (одной строкой)
 *     const scanCount = Math.min(selectedFileCount, browserMigrationScanFileLimit)
 *   в продукте 9166-9169
 *     const scanCount = Math.min(
 *       selectedFileCount,
 *       browserMigrationScanFileLimit,
 *     );
 *
 *   требовалось (одной строкой)
 *     scannedFolders < browserMigrationScanFolderLimit && scannedFiles < browserMigrationScanFileLimit
 *   в продукте 9044-9045
 *     scannedFolders < browserMigrationScanFolderLimit &&
 *     scannedFiles < browserMigrationScanFileLimit
 *
 * Доказательство, что дело в переносе строк, а не в поведении: близнец этой
 * проверки smoke:browser-imaging-scan-progress-source ЗЕЛЁНЫЙ, и его
 * `const scanCount = Math.min(selectedFileCount, browserImagingScanFileLimit);`
 * стоит в том же файле на строке 9455 — одной строкой, потому что имя лимита на
 * четыре символа короче и строка влезла в ширину. Требование краснело за ширину
 * печати, а не за снятое ограничение обхода.
 *
 * Образцы закрепляют СВЯЗЬ: «число сканируемых файлов ограничено сверху лимитом»
 * и «обход продолжается, пока не исчерпаны оба лимита». Пробелы между лексемами
 * свободные, имена источников названы.
 */
assertMatches(
	appSource,
	/const scanCount = Math\.min\(\s*selectedFileCount,\s*browserMigrationScanFileLimit,?\s*\)/,
	"App browser migration scan progress contract",
	"число сканируемых файлов обрезается лимитом browserMigrationScanFileLimit",
);
assertMatches(
	appSource,
	/scannedFolders < browserMigrationScanFolderLimit &&\s*scannedFiles < browserMigrationScanFileLimit/,
	"App browser migration scan progress contract",
	"обход каталогов ограничен И лимитом папок, И лимитом файлов",
);

[
	"browserMigrationScanProgress",
	"cancelBrowserMigrationScan",
	"browser-cancel-migration-source-scan",
	"browser-cancel-migration-source-scan-inline",
	"browser-migration-scan-progress",
	'aria-live="polite"',
	"Интерфейс остается доступным: проверка идет короткими порциями и без загрузки содержимого файлов.",
	"browserMigrationScanProgress.fileLimit",
	"browserMigrationScanProgress.folderLimit",
	"browserMigrationScanProgress.magicReadLimit",
	"browserMigrationScanProgress.processedUnits",
].forEach((marker) =>
	assertIncludes(settingsSource, marker, "Settings browser migration scan UI"),
);

[
	"const maxFiles = 1200",
	"const maxFolders = 320",
	"const maxMagicReads = 220",
	"Array.from(fileList)",
	"files.slice(0, browserMigrationScanFileLimit)",
].forEach((marker) =>
	assertNotIncludes(
		appSource,
		marker,
		"Browser migration scan must keep bounded streaming iteration",
	),
);

const smokeCommand =
	packageJson.scripts?.["smoke:browser-migration-scan-progress-source"];
if (
	smokeCommand !==
	"node scripts/smoke-browser-migration-scan-progress-source.mjs"
) {
	failures.push(
		"package.json missing smoke:browser-migration-scan-progress-source",
	);
}

if (failures.length > 0) {
	console.error(
		`Browser migration scan progress source smoke failed (${failures.length}):`,
	);
	for (const failure of failures) console.error(`- ${failure}`);
	process.exit(1);
}

console.log("browser migration scan progress source smoke passed");
