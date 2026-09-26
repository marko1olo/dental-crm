import { dicomLocalFolderDiscoveryResponseSchema } from "@dental/shared";
import {
	isApiDicomScanAbortError
} from "./imagingHelpers.js";
import {
	imagingFileExtensions
} from "./imagingConstants.js";
import {
	isDicomPixelPath
} from "./dicomParsing.js";
import { access, opendir, stat, readdir } from "node:fs/promises";
import type { Dirent, Stats } from "node:fs";
import { createHash } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type {
	DicomLocalFolderDiscoveryCandidate,
	DicomLocalFolderDiscoveryRequest,
} from "@dental/shared";
import {
	dicomArchiveExtensions,
	dicomPixelFileExtensions,
	dentalModelFileExtensions,
	dicomDiscoverySkipDirectoryNames,
} from "./imagingConstants.js";
import {
	apiDicomDefaultMaxFolders,
	apiDicomDefaultMaxEntriesPerFolder,
	type ApiDicomScanOptions,
	type ApiDicomFolderTraversalLimits,
	createApiDicomScanYieldState,
	maybeYieldApiDicomScan,
	throwIfApiDicomScanAborted,
} from "./imagingHelpers.js";
import {
	isDicomArchivePath,
	isDicomHeaderCandidatePath,
	hasDicomMagic,
} from "./dicomParsing.js";

export function defaultDicomDiscoveryRoots() {
	const configured =
		process.env.DENTAL_DICOM_DISCOVERY_ROOTS?.split(/[;|]/)
			.map((root) => root.trim())
			.filter(Boolean) ?? [];
	const home = os.homedir();
	const oneDrive = path.join(home, "OneDrive");
	const roots = [
		...configured,
		path.join(home, "Downloads"),
		path.join(home, "Desktop"),
		path.join(home, "Documents"),
		path.join(home, "Pictures"),
		path.join(oneDrive, "Downloads"),
		path.join(oneDrive, "Documents"),
		path.join(oneDrive, "Pictures"),
	];
	return Array.from(
		new Set(
			roots
				.map((root) => path.resolve(root))
				.filter((root) => existsSync(root)),
		),
	);
}

export function fingerprintLocalPath(folderPath: string) {
	return createHash("sha256")
		.update(path.resolve(folderPath))
		.digest("hex")
		.slice(0, 10);
}

export function classifyLocalImagingSource(
	root: string,
	folderPath: string,
	fromManualRoot: boolean,
) {
	const text = `${root} ${folderPath}`.toLowerCase();
	if (fromManualRoot)
		return {
			sourceKind: "selected_root",
			sourceLabel: "Выбранная локальная папка",
		};
	if (/downloads|загруз/.test(text))
		return { sourceKind: "downloads", sourceLabel: "Загрузки" };
	if (/desktop|рабоч/.test(text))
		return { sourceKind: "desktop", sourceLabel: "Рабочий стол" };
	if (/documents|документ/.test(text))
		return { sourceKind: "documents", sourceLabel: "Документы" };
	if (/pictures|photos|images|dcim|camera|фото|изображ/.test(text)) {
		return {
			sourceKind: "pictures",
			sourceLabel: "Изображения / экспорт с телефона",
		};
	}
	if (/onedrive|icloud|google drive|dropbox/.test(text))
		return {
			sourceKind: "cloud_sync",
			sourceLabel: "Локальная папка облачной синхронизации",
		};
	return {
		sourceKind: "configured_root",
		sourceLabel: "Настроенный локальный корень",
	};
}

export function safeLocalImagingAlias(prefix: string, folderPath: string) {
	return `${prefix} #${fingerprintLocalPath(folderPath).toUpperCase()}`;
}

export function folderHintScore(folderPath: string) {
	const normalized = folderPath.toLowerCase();
	let score = 0;
	if (
		/dicom|dcm|cbct|ct|кт|ккт|opg|rvg|sidexis|romexis|pacs|study|series/.test(
			normalized,
		)
	)
		score += 0.16;
	if (/downloads|загруз/.test(normalized)) score += 0.03;
	return score;
}

export function discoveryDepth(root: string, folderPath: string) {
	const relative = path.relative(root, folderPath);
	if (!relative || relative === ".") return 0;
	return relative.split(path.sep).filter(Boolean).length;
}

export function shouldSkipDicomDiscoveryDirectory(directoryName: string) {
	return dicomDiscoverySkipDirectoryNames.has(directoryName.toLowerCase());
}

export async function discoverLocalDicomFolders(
	input: DicomLocalFolderDiscoveryRequest,
	options: ApiDicomScanOptions = {},
) {
	const fromManualRoot = Boolean(input.rootPaths?.length);
	const rawRoots = (
		input.rootPaths?.length ? input.rootPaths : defaultDicomDiscoveryRoots()
	).map((root) => path.resolve(root));

	const uniqueRoots = Array.from(new Set(rawRoots));
	const existsChecks = await Promise.all(
		uniqueRoots.map(async (root) => {
			try {
				await stat(root);
				return true;
			} catch (err) {
				console.error("[Dente] Failed to stat root path:", err);
				return false;
			}
		}),
	);
	const roots = uniqueRoots.filter((_, index) => existsChecks[index]);
	const warnings = new Set<string>();
	const candidates: DicomLocalFolderDiscoveryCandidate[] = [];
	const visited = new Set<string>();
	const queue = roots.map((root) => ({ root, folderPath: root, depth: 0 }));
	let scannedFolders = 0;
	const yieldState = createApiDicomScanYieldState();

	while (queue.length && scannedFolders < input.maxFolders) {
		await maybeYieldApiDicomScan(yieldState, options.signal);
		const item = queue.shift();
		if (!item) break;
		const currentKey = item.folderPath.toLowerCase();
		if (visited.has(currentKey)) continue;
		visited.add(currentKey);
		scannedFolders += 1;

		let entries: Dirent[];
		try {
			entries = await readdir(item.folderPath, { withFileTypes: true });
		} catch (error) {
			if (isApiDicomScanAbortError(error)) throw error;
			const source = classifyLocalImagingSource(
				item.root,
				item.folderPath,
				fromManualRoot,
			);
			warnings.add(
				`Одна папка в разделе «${source.sourceLabel}» недоступна для чтения. Поиск продолжен по остальным папкам.`,
			);
			continue;
		}

		let filesInspected = 0;
		let dicomLikeFiles = 0;
		let archivesFound = 0;
		let imageFiles = 0;
		let hasDicomDir = false;
		let firstFilePath: string | null = null;
		let latestModifiedAt: string | null = null;
		const folderWarnings = new Set<string>();

		const statPromises: Promise<string | null>[] = [];

		for (const entry of entries) {
			await maybeYieldApiDicomScan(yieldState, options.signal);
			const entryName = entry.name.toString();
			const fullPath = path.join(item.folderPath, entryName);
			if (entry.isDirectory()) {
				if (shouldSkipDicomDiscoveryDirectory(entryName)) continue;
				const nextDepth = item.depth + 1;
				if (nextDepth <= input.maxDepth)
					queue.push({
						root: item.root,
						folderPath: fullPath,
						depth: nextDepth,
					});
				continue;
			}
			if (!entry.isFile()) continue;
			if (filesInspected >= input.maxFilesPerFolder) {
				folderWarnings.add(
					`Проверка файлов в этой папке ограничена ${input.maxFilesPerFolder} файлами.`,
				);
				continue;
			}
			filesInspected += 1;
			const extension = path.extname(entryName).toLowerCase();
			const isArchive = dicomArchiveExtensions.has(extension);
			const isImage =
				imagingFileExtensions.has(extension) &&
				!isArchive &&
				!dicomPixelFileExtensions.has(extension);
			const isDicomDir = /^DICOMDIR$/i.test(entryName);
			const isDicomFile =
				isDicomPixelPath(fullPath) ||
				(!isArchive && !isImage && hasDicomMagic(fullPath));

			if (isDicomDir) hasDicomDir = true;
			if (isArchive) archivesFound += 1;
			if (isImage) imageFiles += 1;
			if (isDicomFile) {
				dicomLikeFiles += 1;
				firstFilePath ??= fullPath;
			}
			if (isArchive && !firstFilePath) firstFilePath = fullPath;

			statPromises.push(
				stat(fullPath)
					.then((s) => s.mtime.toISOString())
					.catch(() => null),
			);
		}

		const statResults = await Promise.all(statPromises);
		for (const modified of statResults) {
			if (modified && (!latestModifiedAt || modified > latestModifiedAt)) {
				latestModifiedAt = modified;
			}
		}

		const reasons: string[] = [];
		if (dicomLikeFiles) reasons.push(`${dicomLikeFiles} файлов снимков`);
		if (hasDicomDir) reasons.push("найден служебный каталог снимков");
		if (archivesFound) reasons.push(`${archivesFound} архивов`);
		if (folderHintScore(item.folderPath) > 0)
			reasons.push("имя папки похоже на стоматологический экспорт снимков");

		const confidence = Math.min(
			1,
			(dicomLikeFiles >= input.minDicomFiles
				? 0.56
				: dicomLikeFiles > 0
					? 0.28
					: 0) +
				(hasDicomDir ? 0.28 : 0) +
				(archivesFound > 0 ? 0.16 : 0) +
				folderHintScore(item.folderPath) +
				(imageFiles >= 20 && dicomLikeFiles > 0 ? 0.05 : 0),
		);

		const isCandidate =
			dicomLikeFiles >= input.minDicomFiles ||
			hasDicomDir ||
			(archivesFound > 0 && confidence >= 0.24) ||
			(dicomLikeFiles > 0 && confidence >= 0.34);

		if (isCandidate) {
			const source = classifyLocalImagingSource(
				item.root,
				item.folderPath,
				fromManualRoot,
			);
			candidates.push({
				folderPath: item.folderPath,
				displayName: path.basename(item.folderPath) || item.folderPath,
				safeDisplayName: safeLocalImagingAlias("Кандидат КТ", item.folderPath),
				sourceLabel: source.sourceLabel,
				sourceKind: source.sourceKind,
				folderFingerprint: fingerprintLocalPath(item.folderPath),
				depth: discoveryDepth(item.root, item.folderPath),
				dicomLikeFiles,
				archivesFound,
				imageFiles,
				hasDicomDir,
				latestModifiedAt,
				firstFilePath,
				confidence: Number(confidence.toFixed(2)),
				reasons,
				warnings: Array.from(folderWarnings),
			});
		}
	}

	if (queue.length)
		warnings.add(
			`Поиск остановлен на maxFolders=${input.maxFolders}. Сузьте корневые папки или увеличьте лимит.`,
		);
	if (!roots.length)
		warnings.add("Нет доступных для чтения корневых папок поиска.");
	if (!candidates.length)
		warnings.add(
			"В выбранных корневых папках не найдены папки, похожие на КТ/снимки.",
		);

	const sortedCandidates = candidates
		.sort(
			(left, right) =>
				right.confidence - left.confidence ||
				right.dicomLikeFiles - left.dicomLikeFiles ||
				right.archivesFound - left.archivesFound ||
				(right.latestModifiedAt ?? "").localeCompare(
					left.latestModifiedAt ?? "",
				),
		)
		.slice(0, input.maxCandidates);

	const nextAction = sortedCandidates[0]
		? "Выберите папку-кандидат, затем запустите разбор снимков. Поиск читает только имена папок и малые заголовки, тяжелые данные не загружает."
		: "Вставьте известный путь к папке КЛКТ/снимков или настройте корни поиска снимков в серверных настройках.";

	return dicomLocalFolderDiscoveryResponseSchema.parse({
		version: "dental-crm-dicom-local-discovery-v1",
		generatedAt: new Date().toISOString(),
		roots,
		scannedFolders,
		candidates: sortedCandidates,
		warnings: Array.from(warnings),
		nextAction,
	});
}
