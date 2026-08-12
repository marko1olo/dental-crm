/**
 * browserImagingFolderScan.ts — обход выбранной в браузере папки со снимками.
 *
 * ЭТО ВОССТАНОВЛЕНИЕ УДАЛЁННОГО КОДА, А НЕ НОВАЯ РЕАЛИЗАЦИЯ.
 *
 * Замерено 2026-08-11: коммит 57d904b0a вырезал из useAppLogic.tsx три функции
 * обхода папки (297 строк). До него они были на месте — 57d904b0a~1 содержит их
 * целиком. Каркас при этом выжил: utils/browserScanUtils.ts (1032 строки, 50
 * экспортов) держит лимиты, счётчики прогресса, отмену, распознавание DICOM по
 * магическому числу и сборку предпросмотра. Удалили ровно ОБХОД, оставив леса.
 *
 * Чем это было для человека: кнопка «Выбрать папку» на экране импорта снимков
 * вызывала пустую заглушку `async (_files: any) => {}`, а кнопка «Остановить»
 * получала onClick={false}. Экран выглядел рабочим и не делал ничего.
 *
 * ПОЧЕМУ ОТДЕЛЬНЫЙ МОДУЛЬ. Обе функции ЧИСТЫЕ: принимают options, возвращают
 * предпросмотр, состояния не касаются. Внутри хука они были лишь потому, что
 * там жил весь монолит. Связка с состоянием (сеттеры, AbortController) остаётся
 * в хуке — здесь только обход.
 *
 * Тела перенесены ДОСЛОВНО, изменён единственный аспект — уровень отступа и
 * добавлен `export`. Никакой «попутной оптимизации»: восстановление обязано
 * быть сверяемым с исходником построчно.
 */
import type {
	BrowserFileSystemDirectoryHandle,
	BrowserImagingScanOptions,
	BrowserPickedImagingFolderPreview,
	BrowserPickedImagingScanStats,
} from "../AppConstants";
import {
	browserFileHasDicomMagic,
	browserImagingScanDirectoryEntryLimit,
	browserImagingScanFileLimit,
	browserImagingScanFolderLimit,
	browserImagingScanMagicReadLimit,
	buildBrowserPickedImagingFolderPreview,
	classifyBrowserImagingFileName,
	createBrowserImagingScanRuntime,
	isBrowserImagingScanAbortError,
	maybeYieldBrowserImagingScan,
	publishBrowserImagingScanProgress,
	throwIfBrowserImagingScanAborted,
} from "./browserScanUtils";

export async function scanBrowserDirectoryHandle(
	directoryHandle: BrowserFileSystemDirectoryHandle,
	options: BrowserImagingScanOptions,
): Promise<BrowserPickedImagingFolderPreview> {
	const runtime = createBrowserImagingScanRuntime(options.startedAt);
	const stats: BrowserPickedImagingScanStats = {
		rootName: "Выбранная папка браузера",
		sourceKind: "browser_directory_picker",
		scannedFiles: 0,
		scannedFolders: 0,
		dicomLikeFiles: 0,
		archiveFiles: 0,
		modelFiles: 0,
		imageFiles: 0,
		totalBytes: 0,
		warnings: [],
	};
	let magicReads = 0;
	const stack: BrowserFileSystemDirectoryHandle[] = [directoryHandle];

	publishBrowserImagingScanProgress(
		stats,
		options,
		runtime,
		"проверка выбранной папки",
		"scanning",
		true,
	);

	while (
		stack.length > 0 &&
		stats.scannedFolders < browserImagingScanFolderLimit &&
		stats.scannedFiles < browserImagingScanFileLimit
	) {
		throwIfBrowserImagingScanAborted(options.signal);
		const current = stack.pop();
		if (!current) break;
		stats.scannedFolders += 1;
		runtime.processedUnits += 1;
		publishBrowserImagingScanProgress(
			stats,
			options,
			runtime,
			"проверка подпапок",
		);
		await maybeYieldBrowserImagingScan(runtime, options.signal);
		try {
			let inspectedDirectoryEntries = 0;
			for await (const [, handle] of current.entries()) {
				throwIfBrowserImagingScanAborted(options.signal);
				inspectedDirectoryEntries += 1;
				if (inspectedDirectoryEntries > browserImagingScanDirectoryEntryLimit) {
					stats.warnings.push(
						`Браузерное сканирование ограничило одну папку ${browserImagingScanDirectoryEntryLimit} элементами для отзывчивости интерфейса.`,
					);
					break;
				}
				if (handle.kind === "directory") {
					if (
						stats.scannedFolders + stack.length <
						browserImagingScanFolderLimit
					)
						stack.push(handle);
					continue;
				}
				if (stats.scannedFiles >= browserImagingScanFileLimit) break;
				stats.scannedFiles += 1;
				const file = await handle.getFile();
				stats.totalBytes += file.size;
				let kind = classifyBrowserImagingFileName(handle.name);
				if (kind === "other" && magicReads < browserImagingScanMagicReadLimit) {
					magicReads += 1;
					if (await browserFileHasDicomMagic(file)) kind = "dicom";
				}
				throwIfBrowserImagingScanAborted(options.signal);
				if (kind === "dicom") stats.dicomLikeFiles += 1;
				else if (kind === "archive") stats.archiveFiles += 1;
				else if (kind === "model") stats.modelFiles += 1;
				else if (kind === "image") stats.imageFiles += 1;
				runtime.processedUnits += 1;
				publishBrowserImagingScanProgress(
					stats,
					options,
					runtime,
					"проверка файлов КТ и 3D",
				);
				await maybeYieldBrowserImagingScan(runtime, options.signal);
			}
		} catch (scanError) {
			if (isBrowserImagingScanAbortError(scanError)) throw scanError;
			stats.warnings.push(
				"Одну выбранную в браузере подпапку не удалось прочитать, она пропущена.",
			);
		}
	}

	if (stats.scannedFiles >= browserImagingScanFileLimit) {
		stats.warnings.push(
			`Браузерное сканирование ограничено ${browserImagingScanFileLimit} файлами для отзывчивости интерфейса.`,
		);
	}
	if (stats.scannedFolders >= browserImagingScanFolderLimit) {
		stats.warnings.push(
			`Браузерное сканирование ограничено ${browserImagingScanFolderLimit} папками для отзывчивости интерфейса.`,
		);
	}
	stats.warnings.push(
		"Браузер проверил выбранную папку без передачи полного пути. Для полноценного открытия тяжелой КТ выберите эту же папку в локальном модуле клиники или укажите путь на рабочем ПК.",
	);
	publishBrowserImagingScanProgress(
		stats,
		options,
		runtime,
		null,
		"done",
		true,
	);

	return buildBrowserPickedImagingFolderPreview(stats);
}

export async function scanBrowserFileList(
	fileList: FileList,
	options: BrowserImagingScanOptions,
): Promise<BrowserPickedImagingFolderPreview> {
	const runtime = createBrowserImagingScanRuntime(options.startedAt);
	const folders = new Set<string>();
	const selectedFileCount = fileList.length;
	const scanCount = Math.min(selectedFileCount, browserImagingScanFileLimit);
	let magicReads = 0;
	const stats: BrowserPickedImagingScanStats = {
		rootName: "Выбранные файлы браузера",
		sourceKind: "browser_file_input",
		scannedFiles: 0,
		scannedFolders: 1,
		dicomLikeFiles: 0,
		archiveFiles: 0,
		modelFiles: 0,
		imageFiles: 0,
		totalBytes: 0,
		warnings: [],
	};

	publishBrowserImagingScanProgress(
		stats,
		options,
		runtime,
		"проверка выбранных файлов",
		"scanning",
		true,
	);

	for (let fileIndex = 0; fileIndex < scanCount; fileIndex += 1) {
		const file = fileList.item(fileIndex);
		if (!file) continue;
		throwIfBrowserImagingScanAborted(options.signal);
		stats.scannedFiles += 1;
		stats.totalBytes += file.size;
		const relativePath = file.webkitRelativePath || file.name;
		const parts = relativePath.split(/[\\/]+/).filter(Boolean);
		for (let index = 0; index < Math.max(1, parts.length - 1); index += 1) {
			folders.add(parts.slice(0, index + 1).join("/"));
		}
		stats.scannedFolders = Math.max(1, folders.size);
		let kind = classifyBrowserImagingFileName(file.name);
		if (kind === "other" && magicReads < browserImagingScanMagicReadLimit) {
			magicReads += 1;
			if (await browserFileHasDicomMagic(file)) kind = "dicom";
		}
		throwIfBrowserImagingScanAborted(options.signal);
		if (kind === "dicom") stats.dicomLikeFiles += 1;
		else if (kind === "archive") stats.archiveFiles += 1;
		else if (kind === "model") stats.modelFiles += 1;
		else if (kind === "image") stats.imageFiles += 1;
		runtime.processedUnits += 1;
		publishBrowserImagingScanProgress(
			stats,
			options,
			runtime,
			"проверка файлов КТ и 3D",
		);
		await maybeYieldBrowserImagingScan(runtime, options.signal);
	}

	if (selectedFileCount > browserImagingScanFileLimit) {
		stats.warnings.push(
			`Браузерное сканирование ограничено ${browserImagingScanFileLimit} файлами для отзывчивости интерфейса.`,
		);
	}
	stats.warnings.push(
		"Файлы выбраны через запасной режим браузера. После обновления страницы их нужно выбрать заново; для постоянной привязки лучше выбрать папку или локальный модуль клиники.",
	);
	publishBrowserImagingScanProgress(
		stats,
		options,
		runtime,
		null,
		"done",
		true,
	);

	return buildBrowserPickedImagingFolderPreview(stats);
}
