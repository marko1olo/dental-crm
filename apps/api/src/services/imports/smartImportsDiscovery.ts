/**
 * Local source filesystem crawler and discovery engine.
 */
import { type Dirent } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import type {
  MigrationLocalSourceDiscoveryRequest,
  MigrationLocalSourceDiscoveryResponse,
  MigrationLocalSourceDiscoveryCandidate
} from "@dental/shared";
import { migrationLocalSourceDiscoveryResponseSchema } from "@dental/shared";
import {
  migrationDatabaseExtensions,
  migrationDumpExtensions,
  migrationTableExtensions,
  migrationArchiveExtensions,
  migrationImageExtensions,
  migrationDicomExtensions,
  migrationWorkstationProfiles,
  migrationClinicDataContainerHint
} from "./smartImportsConstants.js";
import {
  migrationDiscoveryDefaultRoots,
  safeMigrationDiscoveryRoots,
  shouldSkipMigrationDiscoveryDirectory,
  migrationDiscoveryEntryPriority,
  migrationDirectoryPriority,
  migrationWorkstationProfileMatches,
  migrationFolderHintScore,
  migrationSourceKindFromCounts,
  migrationDbfFolderSourceRequired,
  migrationProfileSafeAlias,
  migrationSafeAlias,
  registerMigrationSourceRoute,
  migrationFingerprint,
  migrationDiscoveryDepth,
  migrationDriveDataRoots,
  migrationRootExists
} from "./smartImportsRoots.js";
import {
  migrationRootsFromWorkstationProfiles,
  migrationRootsFromWorkstationSignals,
  readWindowsMigrationMappedRoots,
  collectMigrationWorkstationSignals,
  migrationCandidateFromWorkstationSignal
} from "./smartImportsSignals.js";

export interface MigrationDiscoveryQueueItem {
  root: string;
  folderPath: string;
  depth: number;
}

const legacySourceTitles: Record<string, string> = {
  mis_database: "База данных МИС",
  mis_backup: "Резервная копия МИС",
  mis_export: "Табличная выгрузка",
  mis_archive: "Архив данных",
  imaging_study: "КТ / Снимки",
  imaging_archive: "Архив снимков",
  unknown_legacy_source: "Неизвестный источник"
};

export async function inspectMigrationDiscoveryFolder(
	item: MigrationDiscoveryQueueItem,
	input: MigrationLocalSourceDiscoveryRequest,
	queue: MigrationDiscoveryQueueItem[],
	candidates: MigrationLocalSourceDiscoveryCandidate[],
	warnings: Set<string>,
) {
	let entries: Dirent[];
	try {
		entries = await readdir(item.folderPath, { withFileTypes: true });
	} catch (err) {
		console.error("[Dente] context:", err);
		warnings.add(
			"Одну локальную папку миграционного поиска не удалось прочитать; она пропущена.",
		);
		return;
	}

	let filesInspected = 0;
	let databaseFiles = 0;
	let dumpFiles = 0;
	let tableFiles = 0;
	let archiveFiles = 0;
	let dicomLikeFiles = 0;
	let imageFiles = 0;
	let hasDicomDir = false;
	let firstMatchPath = "";
	let firstProfileEvidencePath = "";
	let latestModifiedAt: string | null = null;
	const folderWarnings = new Set<string>();
	const fileProfileMatches = new Map<
		string,
		(typeof migrationWorkstationProfiles)[number]
	>();

	const orderedEntries = [...entries].sort(
		(left, right) =>
			migrationDiscoveryEntryPriority(right, item.folderPath) -
				migrationDiscoveryEntryPriority(left, item.folderPath) ||
			left.name.toString().localeCompare(right.name.toString()),
	);
	for (const entry of orderedEntries) {
		const entryName = entry.name.toString();
		const fullPath = path.join(item.folderPath, entryName);
		if (entry.isDirectory()) {
			if (shouldSkipMigrationDiscoveryDirectory(entryName)) continue;
			const nextDepth = item.depth + 1;
			if (nextDepth <= input.maxDepth) {
				const nextItem = {
					root: item.root,
					folderPath: fullPath,
					depth: nextDepth,
				};
				if (migrationDirectoryPriority(fullPath) >= 2) queue.unshift(nextItem);
				else queue.push(nextItem);
			}
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
		const profilesForFile = migrationWorkstationProfileMatches(fullPath);
		if (profilesForFile.length) {
			if (!firstProfileEvidencePath) firstProfileEvidencePath = fullPath;
			for (const profile of profilesForFile)
				fileProfileMatches.set(profile.label, profile);
		}
		const extension = path.extname(entryName).toLowerCase();
		const isDicomDir = /^DICOMDIR$/i.test(entryName);
		const isDatabase = migrationDatabaseExtensions.has(extension);
		const isDump = migrationDumpExtensions.has(extension);
		const isTable = migrationTableExtensions.has(extension);
		const isArchive = migrationArchiveExtensions.has(extension);
		const isDicom = migrationDicomExtensions.has(extension) || isDicomDir;
		const isImage = migrationImageExtensions.has(extension);
		if (isDatabase) databaseFiles += 1;
		if (isDump) dumpFiles += 1;
		if (isTable) tableFiles += 1;
		if (isArchive) archiveFiles += 1;
		if (isDicom) dicomLikeFiles += 1;
		if (isImage) imageFiles += 1;
		if (isDicomDir) hasDicomDir = true;
		if (
			!firstMatchPath &&
			(isDatabase || isDump || isTable || isArchive || isDicom || isImage)
		)
			firstMatchPath = fullPath;
		try {
			const modified = (await stat(fullPath)).mtime.toISOString();
			if (!latestModifiedAt || modified > latestModifiedAt)
				latestModifiedAt = modified;
		} catch (err) {
			console.error("[Dente] context:", err);
			// Best-effort metadata only.
		}
	}

	const hintScore = migrationFolderHintScore(item.folderPath);
	const hasGenericDataContainerHint = migrationClinicDataContainerHint(
		item.folderPath,
	);
	const profileMatches = Array.from(
		new Map(
			[
				...migrationWorkstationProfileMatches(
					`${item.folderPath} ${firstMatchPath}`,
				),
				...fileProfileMatches.values(),
			].map((profile) => [profile.label, profile]),
		).values(),
	);
	const matchedFiles =
		databaseFiles +
		dumpFiles +
		tableFiles +
		archiveFiles +
		dicomLikeFiles +
		imageFiles;
	const confidence = Math.min(
		1,
		hintScore +
			(databaseFiles ? 0.5 : 0) +
			(dumpFiles ? 0.42 : 0) +
			(tableFiles ? 0.28 : 0) +
			(archiveFiles ? 0.2 : 0) +
			(dicomLikeFiles ? 0.46 : 0) +
			(hasDicomDir ? 0.24 : 0) +
			(imageFiles >= 8 ? 0.22 : imageFiles > 0 ? 0.08 : 0),
	);
	const isCandidate =
		matchedFiles > 0
			? confidence >= 0.24
			: hintScore >= 0.28 || profileMatches.length > 0;
	if (!isCandidate) return;
	const profileOnly = matchedFiles === 0 && profileMatches.length > 0;
	const rawSourceRef =
		firstMatchPath ||
		(profileOnly && firstProfileEvidencePath
			? `workstation-profile:${migrationFingerprint(firstProfileEvidencePath)}`
			: item.folderPath);
	const detectedSourceKind = migrationSourceKindFromCounts({
		folderPath: item.folderPath,
		firstMatchPath: firstMatchPath || firstProfileEvidencePath || rawSourceRef,
		databaseFiles,
		dumpFiles,
		tableFiles,
		archiveFiles,
		dicomLikeFiles,
		imageFiles,
		hasDicomDir,
	});
	const sourceKind =
		matchedFiles === 0 && hasGenericDataContainerHint && !profileMatches.length
			? ("unknown_legacy_source" as const)
			: detectedSourceKind;
	const shouldUseFolderSource =
		sourceKind === "mis_database" && firstMatchPath
			? migrationDbfFolderSourceRequired(item.folderPath, firstMatchPath)
			: false;
	const sourceRef = shouldUseFolderSource ? item.folderPath : rawSourceRef;
	const reasons: string[] = [];
	if (databaseFiles) reasons.push(`${databaseFiles} файлов старой базы`);
	if (dumpFiles) reasons.push(`${dumpFiles} файлов резервной копии`);
	if (tableFiles) reasons.push(`${tableFiles} табличных выгрузок`);
	if (archiveFiles) reasons.push(`${archiveFiles} архивов`);
	if (dicomLikeFiles) reasons.push(`${dicomLikeFiles} признаков КТ/снимков`);
	if (imageFiles) reasons.push(`${imageFiles} изображений`);
	if (hintScore > 0)
		reasons.push("имя папки похоже на старую CRM/снимки/миграцию");
	if (hasGenericDataContainerHint)
		reasons.push(
			"имя папки похоже на контейнер резервных копий, выгрузок или данных клиники",
		);
	if (shouldUseFolderSource)
		reasons.push(
			"DBF/FoxPro нужно переносить всей папкой, чтобы не потерять memo и index файлы",
		);
	profileMatches.slice(0, 3).forEach((profile) => {
		reasons.push(`${profile.label}: ${profile.reason}`);
	});
	if (!matchedFiles && hasGenericDataContainerHint) {
		folderWarnings.add(
			"Папка похожа на контейнер старой клиники, но на этом уровне нет явных баз, таблиц или снимков: откройте план, увеличьте глубину или выберите вложенную папку с данными, выгрузкой или резервной копией.",
		);
	}
	if (!matchedFiles && profileMatches.length) {
		folderWarnings.add(
			"Найден след старой системы без явных файлов базы или снимков на этом уровне: нужен локальный модуль только для чтения, штатная выгрузка или более глубокая корневая папка.",
		);
	}
	const isProfileToken = sourceRef.startsWith("workstation-profile:");
	const primaryProfile = profileMatches[0] ?? null;
	const safeDisplayName = primaryProfile
		? migrationProfileSafeAlias(primaryProfile.label, sourceKind, sourceRef)
		: migrationSafeAlias(sourceKind, sourceRef);
	const sourceRouteRef = registerMigrationSourceRoute(
		sourceRef,
		sourceKind,
		safeDisplayName,
	);
	candidates.push({
		sourceRef: sourceRouteRef,
		safeDisplayName,
		sourceKind,
		sourceLabel: isProfileToken
			? "След установленной системы"
			: sourceRef === item.folderPath
				? profileMatches.length
					? "Папка профиля старой системы"
					: "Папка-кандидат"
				: "Файл-кандидат",
		sourceFingerprint: migrationFingerprint(sourceRef),
		depth: migrationDiscoveryDepth(item.root, item.folderPath),
		confidence: Number(confidence.toFixed(2)),
		matchedFiles,
		databaseFiles,
		dumpFiles,
		tableFiles,
		archiveFiles,
		dicomLikeFiles,
		imageFiles,
		hasDicomDir,
		latestModifiedAt,
		reasons,
		warnings: Array.from(folderWarnings),
		smartImportLine: `${legacySourceTitles[sourceKind]} ${sourceRouteRef}`,
	});
}


export async function discoverLocalMigrationSources(
	input: MigrationLocalSourceDiscoveryRequest,
) {
	const warnings = new Set<string>();
	const workstationSignals = await collectMigrationWorkstationSignals(
		input,
		warnings,
	);
	const workstationSignalRoots =
		migrationRootsFromWorkstationSignals(workstationSignals);
	const baseRoots = input.rootPaths?.length
		? input.rootPaths
		: migrationDiscoveryDefaultRoots();
	const mappedRoots = input.rootPaths?.length
		? []
		: await readWindowsMigrationMappedRoots(warnings);
	const candidateRoots = [
		...workstationSignalRoots,
		...baseRoots,
		...migrationDriveDataRoots(mappedRoots),
	].map((root) => path.resolve(root));
	const roots = Array.from(new Set(candidateRoots)).filter((root) =>
		migrationRootExists(root),
	);
	const candidates: MigrationLocalSourceDiscoveryCandidate[] = [];
	const visited = new Set<string>();
	const queue = roots.map((root) => ({ root, folderPath: root, depth: 0 }));
	let scannedFolders = 0;

	while (queue.length && scannedFolders < input.maxFolders) {
		const item = queue.shift();
		if (!item) break;
		const key = item.folderPath.toLowerCase();
		if (visited.has(key)) continue;
		visited.add(key);
		scannedFolders += 1;

		await inspectMigrationDiscoveryFolder(
			item,
			input,
			queue,
			candidates,
			warnings,
		);
	}

	if (queue.length)
		warnings.add(
			`Поиск остановлен после ${input.maxFolders} папок. Выберите папку ближе к старой программе или увеличьте лимит проверки.`,
		);
	for (const signal of workstationSignals) {
		const candidate = migrationCandidateFromWorkstationSignal(signal);
		if (candidate) candidates.push(candidate);
	}
	if (!roots.length)
		warnings.add("Нет доступных корневых папок для миграционного поиска.");
	if (!candidates.length)
		warnings.add(
			"Старые базы, выгрузки, архивы или папки снимков не найдены в выбранных корнях.",
		);
	const sortedCandidates = candidates
		.sort(
			(left, right) =>
				right.confidence - left.confidence ||
				right.matchedFiles - left.matchedFiles ||
				(right.latestModifiedAt ?? "").localeCompare(
					left.latestModifiedAt ?? "",
				),
		)
		.slice(0, input.maxCandidates);

	return migrationLocalSourceDiscoveryResponseSchema.parse({
		version: "dental-crm-migration-local-discovery-v1",
		generatedAt: new Date().toISOString(),
		roots: safeMigrationDiscoveryRoots(roots),
		scannedFolders,
		candidates: sortedCandidates,
		warnings: Array.from(warnings),
		nextAction: sortedCandidates.length
			? "Добавьте найденные источники в умный парсер. CRM построит черновой план и предпросмотр до любой записи."
			: "Укажите корневую папку вручную или подключите внешний диск со старой МИС/снимками.",
	});
}

