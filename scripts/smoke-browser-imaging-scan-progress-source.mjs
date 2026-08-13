import { readFile } from "node:fs/promises";
import { readAppLogicSource } from "./lib/app-logic-source.mjs";

const appSource =
	(await readFile("apps/web/src/App.tsx", "utf8")) +
	"\n" +
	(await readAppLogicSource()) +
	"\n" +
	(await readFile("apps/web/src/AppHelpers.tsx", "utf8"));
/*
 * ЭКРАН ИМПОРТА БОЛЬШЕ НЕ ЛЕЖИТ В SettingsView.tsx — ЭТО ВСЯ ПРИЧИНА КРАСНОТЫ.
 *
 * Замерено: из 12 требований к разметке сканирования папки восемь не выполнялись,
 * потому что проверка читала только SettingsView.tsx, а кнопка отмены, полоса
 * прогресса и счётчики лимитов переехали в components/settings/SettingsImportsTab.tsx
 * при разборе монолита настроек. Поведение на месте и это НАСТОЯЩАЯ разметка:
 *   apps/web/src/components/settings/SettingsImportsTab.tsx:3179
 *     data-testid="browser-cancel-local-imaging-folder-scan"
 *   там же:3259 data-testid="browser-imaging-scan-progress"
 *   там же:3289-3296 browserImagingScanProgress.fileLimit/.folderLimit/
 *                    .magicReadLimit/.processedUnits
 *
 * ДОБАВЛЕН РОВНО ОДИН ФАЙЛ — владелец этого экрана, а не весь каталог настроек:
 * иначе требование к экрану импорта начнёт «выполняться» чужой вкладкой.
 *
 * useSettingsDerivations.tsx НЕ ДОБАВЛЕН СОЗНАТЕЛЬНО. В нём лежит стена строк
 * «// Compliance: …», и маркер, объявленный в комментарии, покрасил бы стража
 * зелёным подписью, которой нет на экране. Здесь этот случай проверен отдельно:
 * оба testid отмены найдены в JSX, в комментариях их нет.
 */
const settingsSource = (
	await Promise.all(
		[
			"apps/web/src/SettingsView.tsx",
			"apps/web/src/components/settings/SettingsImportsTab.tsx",
		].map((file) => readFile(file, "utf8")),
	)
).join("\n");
const stylesSource = await readFile("apps/web/src/styles/main.css", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));

function assertIncludes(source, marker, label) {
	if (!source.includes(marker)) {
		throw new Error(`${label} missing marker: ${marker}`);
	}
}

function assertNotIncludes(source, marker, label) {
	if (source.includes(marker)) {
		throw new Error(`${label} still includes forbidden marker: ${marker}`);
	}
}

[
	"type BrowserImagingScanProgress",
	"elapsedMs: number",
	"processedUnits: number",
	"fileLimit: number",
	"folderLimit: number",
	"magicReadLimit: number",
	"type BrowserImagingScanOptions",
	"const browserImagingScanFileLimit = 900",
	"const browserImagingScanFolderLimit = 260",
	"const browserImagingScanDirectoryEntryLimit = 1600",
	"const browserImagingScanMagicReadLimit = 180",
	"const browserImagingScanYieldEveryUnits = 24",
	"const browserImagingScanProgressEveryMs = 96",
	"browserImagingScanAbortRef",
	"new AbortController()",
	"cancelBrowserImagingFolderScan",
	"signal?: AbortSignal",
	"throwIfBrowserImagingScanAborted",
	"browserImagingScanElapsedFromIso",
	"startedAtMs: now",
	"fileLimit: browserImagingScanFileLimit",
	"browserImagingScanYield",
	"scheduler?: { yield?: () => Promise<void> }",
	"setTimeout(resolve, 0)",
	"publishBrowserImagingScanProgress",
	"maybeYieldBrowserImagingScan",
	"runBrowserImagingFolderScan",
	"scanBrowserDirectoryHandle(directoryHandle, options)",
	"scanBrowserFileList(fileList, options)",
	"const selectedFileCount = fileList.length",
	"const scanCount = Math.min(selectedFileCount, browserImagingScanFileLimit)",
	"fileList.item(fileIndex)",
	"inspectedDirectoryEntries > browserImagingScanDirectoryEntryLimit",
	"setBrowserImagingScanProgress",
].forEach((marker) =>
	assertIncludes(appSource, marker, "App browser imaging scan contract"),
);

[
	"CircleStop",
	"browserImagingScanProgress",
	/*
	 * ОБА ОБРАЗЦА — С АТРИБУТОМ И ЗАКРЫВАЮЩЕЙ КАВЫЧКОЙ, И ЭТО НЕ ПЕДАНТИЗМ.
	 *
	 * Раньше здесь стояли голые идентификаторы. Первый из них —
	 * "browser-cancel-local-imaging-folder-scan" — является ПРЕФИКСОМ второго,
	 * поэтому требование к верхней кнопке отмены выполнялось одной только
	 * встроенной кнопкой «…-inline». Проверено искусственной поломкой копии: с
	 * убранным data-testid верхней кнопки страж оставался зелёным (код выхода 0).
	 * С атрибутом и кавычкой обе кнопки требуются независимо.
	 */
	'data-testid="browser-cancel-local-imaging-folder-scan"',
	'data-testid="browser-cancel-local-imaging-folder-scan-inline"',
	"browser-imaging-scan-progress",
	'aria-live="polite"',
	"Интерфейс остается доступным: обработка идет короткими порциями.",
	"formatBrowserImagingScanElapsed",
	"browserImagingScanProgress.fileLimit",
	"browserImagingScanProgress.folderLimit",
	"browserImagingScanProgress.magicReadLimit",
	"browserImagingScanProgress.processedUnits",
].forEach((marker) =>
	assertIncludes(settingsSource, marker, "Settings browser imaging scan UI"),
);

["browser-imaging-scan-progress", "browser-scan-stop-button"].forEach(
	(marker) =>
		assertIncludes(stylesSource, marker, "Browser imaging scan styles"),
);

[
	"const maxFiles = 900",
	"const maxFolders = 260",
	"const maxMagicReads = 180",
].forEach((marker) =>
	assertNotIncludes(
		appSource,
		marker,
		"Browser imaging scan hardcoded local limit",
	),
);

["Array.from(fileList)", "files.slice(0, browserImagingScanFileLimit)"].forEach(
	(marker) =>
		assertNotIncludes(
			appSource,
			marker,
			"Browser imaging scan must not materialize full FileList",
		),
);

const smokeCommand =
	packageJson.scripts?.["smoke:browser-imaging-scan-progress-source"];
if (
	smokeCommand !== "node scripts/smoke-browser-imaging-scan-progress-source.mjs"
) {
	throw new Error(
		"package.json missing smoke:browser-imaging-scan-progress-source",
	);
}

console.log("browser imaging scan progress source smoke passed");
