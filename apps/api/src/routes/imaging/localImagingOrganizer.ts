import { access, readdir, stat } from "node:fs/promises";
import type { Dirent } from "node:fs";
import {
	type DentalModelFileCandidate,
	type DicomSeriesPreviewGroup,
	localImagingOrganizerResponseSchema,
	dicomFolderSeriesPreviewResponseSchema,
	dicomFolderWorkupPlanResponseSchema
} from "@dental/shared";
import {
	isApiDicomScanAbortError
} from "./imagingHelpers.js";
import {
	folderHintScore,
	shouldSkipDicomDiscoveryDirectory
} from "./localFolderDiscovery.js";
import {
	dicomArchiveExtensions,
	imagingFileExtensions,
	dicomPixelFileExtensions,
	dentalModelFileExtensions
} from "./imagingConstants.js";
import {
	hasDentalModelFileHint,
	hasDentalModelArchiveHint,
	scoreDentalModelFile
} from "./dentalModelWorkbench.js";
import {
	isDicomPixelPath,
	hasDicomMagic
} from "./dicomParsing.js";
import {
	collectDicomHeaderFiles
} from "./folderScanManifest.js";
import {
	buildDicomWorkstationReadiness
} from "./workstationReadiness.js";
import {
	buildDicomRenderCachePlan
} from "./renderCachePlan.js";
import path from "node:path";
import type {
	LocalImagingOrganizerCase,
	LocalImagingOrganizerRequest,
	DicomFolderWorkupPath,
	DicomFolderWorkupPlanRequest,
} from "@dental/shared";
import {
	type ApiDicomScanOptions,
	throwIfApiDicomScanAborted,
	maybeYieldApiDicomScan,
	createApiDicomScanYieldState,
} from "./imagingHelpers.js";
import {
	discoverLocalDicomFolders,
	classifyLocalImagingSource,
	safeLocalImagingAlias,
	fingerprintLocalPath,
	defaultDicomDiscoveryRoots,
} from "./localFolderDiscovery.js";
import { parseDicomSeriesManifest } from "./dicomSeries.js";
import { buildDicomHeaderManifest } from "./folderScanManifest.js";
import {
	detectDentalModelFormat,
	detectDentalModelRole,
	organizerFolderHintScore,
	isLikelySoftwareResourceFolder,
	buildOrganizerCaseId,
	latestIso,
	recommendLocalImagingAction,
	buildDentalModelWorkbenchManifest,
	normalizeOrganizerText,
} from "./dentalModelWorkbench.js";

export async function organizeLocalImagingSources(
	input: LocalImagingOrganizerRequest,
	options: ApiDicomScanOptions = {},
) {
	const fromManualRoot = Boolean(input.rootPaths?.length);
	const rawRoots = input.rootPaths?.length
		? input.rootPaths
		: defaultDicomDiscoveryRoots();
	const uniqueRoots = Array.from(
		new Set(rawRoots.map((root) => path.resolve(root))),
	);
	const roots: string[] = [];
	const BATCH_SIZE = 50;

	for (let i = 0; i < uniqueRoots.length; i += BATCH_SIZE) {
		const batch = uniqueRoots.slice(i, i + BATCH_SIZE);
		const results = await Promise.all(
			batch.map(async (root) => {
				try {
					await access(root);
					return root;
				} catch (err) {
					console.error("[Dente] Failed to access root path:", err);
					return null;
				}
			}),
		);
		for (const res of results) {
			if (res !== null) roots.push(res);
		}
	}

	const warnings = new Set<string>();
	const cases: LocalImagingOrganizerCase[] = [];
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
				`Одна папка в разделе «${source.sourceLabel}» недоступна для чтения. Органайзер продолжил проверку остальных папок.`,
			);
			continue;
		}

		let filesInspected = 0;
		let dicomLikeFiles = 0;
		let archiveFiles = 0;
		let imageFiles = 0;
		let modelFiles = 0;
		let latestModifiedAt: string | null = null;
		const modelCandidates: DentalModelFileCandidate[] = [];
		const folderWarnings = new Set<string>();
		const folderHasDicomHint = folderHintScore(item.folderPath) > 0;

		const statPromises: Promise<{
			fullPath: string;
			entryName: string;
			isModelFileOrArchive: boolean;
			confidence: number | undefined;
			format: ReturnType<typeof detectDentalModelFormat> | undefined;
			role: ReturnType<typeof detectDentalModelRole> | undefined;
			stats: { size: number; mtime: Date } | null;
		}>[] = [];

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
			const hasModelExtension = dentalModelFileExtensions.has(extension);
			const isModelFile =
				hasModelExtension && hasDentalModelFileHint(entryName, item.folderPath);
			const isModelArchive =
				extension === ".zip" &&
				hasDentalModelArchiveHint(entryName, item.folderPath);
			const shouldProbeDicomMagic =
				input.includeDicom &&
				!isArchive &&
				!isImage &&
				!hasModelExtension &&
				(folderHasDicomHint ||
					!extension ||
					dicomPixelFileExtensions.has(extension) ||
					/^DICOMDIR$/i.test(entryName));
			const isDicomFile =
				input.includeDicom &&
				(isDicomPixelPath(fullPath) ||
					/^DICOMDIR$/i.test(entryName) ||
					(shouldProbeDicomMagic && hasDicomMagic(fullPath)));

			if (isArchive) archiveFiles += 1;
			if (isImage) imageFiles += 1;
			if (isDicomFile) dicomLikeFiles += 1;

			const isModelFileOrArchive = Boolean(
				input.includeDentalModels && (isModelFile || isModelArchive),
			);
			if (isModelFileOrArchive) {
				modelFiles += 1;
			}

			const confidence = isModelFileOrArchive
				? scoreDentalModelFile(entryName, item.folderPath)
				: undefined;
			const format = isModelFileOrArchive
				? detectDentalModelFormat(entryName)
				: undefined;
			const role = isModelFileOrArchive
				? detectDentalModelRole(entryName, item.folderPath)
				: undefined;

			statPromises.push(
				stat(fullPath)
					.then((s) => ({
						fullPath,
						entryName,
						isModelFileOrArchive,
						confidence,
						format,
						role,
						stats: s,
					}))
					.catch(() => ({
						fullPath,
						entryName,
						isModelFileOrArchive,
						confidence,
						format,
						role,
						stats: null,
					})),
			);
		}

		const statResults = await Promise.all(statPromises);
		for (const result of statResults) {
			if (result.stats) {
				latestModifiedAt = latestIso(
					latestModifiedAt,
					result.stats.mtime.toISOString(),
				);
			}

			if (result.isModelFileOrArchive) {
				if (!result.stats) {
					folderWarnings.add(
						"Не удалось прочитать сведения об одном файле модели; он мог измениться во время сканирования.",
					);
				}
				const sizeBytes = result.stats ? result.stats.size : 0;
				modelCandidates.push({
					filePath: result.fullPath,
					fileName: result.entryName,
					// biome-ignore lint/style/noNonNullAssertion: automated suppression
					format: result.format!,
					// biome-ignore lint/style/noNonNullAssertion: automated suppression
					role: result.role!,
					sizeBytes,
					// biome-ignore lint/style/noNonNullAssertion: automated suppression
					confidence: result.confidence!,
					warnings:
						sizeBytes > 250 * 1024 * 1024
							? [
									"Крупная сетка/архив: предпросмотр должен оставаться только с метаданными, пока не подключен локальный 3D-обработчик.",
								]
							: [],
				});
			}
		}

		const folderScore = organizerFolderHintScore(item.folderPath);
		const dicomConfidence =
			input.includeDicom && (dicomLikeFiles > 0 || archiveFiles > 0)
				? Math.min(
						1,
						(dicomLikeFiles >= 2 ? 0.58 : dicomLikeFiles > 0 ? 0.32 : 0) +
							(archiveFiles > 0 ? 0.12 : 0) +
							folderScore,
					)
				: 0;
		const modelConfidence =
			input.includeDentalModels && modelFiles > 0
				? Math.min(
						1,
						(modelFiles >= 2 ? 0.55 : modelFiles > 0 ? 0.36 : 0) +
							Math.min(
								0.25,
								modelCandidates.reduce(
									(sum, item) => sum + item.confidence,
									0,
								) / 6,
							) +
							folderScore,
					)
				: 0;
		const combinedConfidence = Math.min(
			1,
			Math.max(dicomConfidence, modelConfidence) +
				(dicomLikeFiles > 0 && modelFiles > 0 ? 0.12 : 0),
		);
		const candidateLooksUseful =
			dicomLikeFiles > 0 ||
			modelFiles > 0 ||
			(archiveFiles > 0 && combinedConfidence >= 0.35) ||
			(imageFiles >= 8 && combinedConfidence >= 0.35);

		if (!candidateLooksUseful) continue;
		if (
			dicomLikeFiles === 0 &&
			archiveFiles === 0 &&
			modelFiles > 0 &&
			isLikelySoftwareResourceFolder(item.folderPath)
		)
			continue;

		const reasons: string[] = [];
		if (dicomLikeFiles) reasons.push(`${dicomLikeFiles} файлов снимков`);
		if (modelFiles)
			reasons.push(`${modelFiles} кандидатов стоматологических 3D-моделей`);
		if (archiveFiles) reasons.push(`${archiveFiles} архивных файлов`);
		if (imageFiles >= 8) reasons.push(`${imageFiles} файлов изображений`);
		if (folderScore > 0)
			reasons.push("имя папки похоже на экспорт снимков/моделей");

		const recommendedAction = recommendLocalImagingAction({
			dicomLikeFiles,
			modelFiles,
			archiveFiles,
			combinedConfidence,
		});
		if (modelFiles > 0) {
			folderWarnings.add(
				"Файлы 3D-моделей пока являются только метаданными органайзера; рендер/хранение сеток остается вне состояния CRM.",
			);
		}

		const source = classifyLocalImagingSource(
			item.root,
			item.folderPath,
			fromManualRoot,
		);
		const folderFingerprint = fingerprintLocalPath(item.folderPath);
		const sortedModelCandidates = modelCandidates
			.sort(
				(left, right) =>
					right.confidence - left.confidence ||
					right.sizeBytes - left.sizeBytes,
			)
			.slice(0, 8);
		const modelWorkbenchManifest = buildDentalModelWorkbenchManifest({
			folderFingerprint,
			dicomLikeFiles,
			modelCandidates: sortedModelCandidates,
		});
		cases.push({
			id: buildOrganizerCaseId(item.folderPath),
			displayName: path.basename(item.folderPath) || item.folderPath,
			safeDisplayName: safeLocalImagingAlias("Кейс снимков", item.folderPath),
			sourceLabel: source.sourceLabel,
			sourceKind: source.sourceKind,
			folderFingerprint,
			folderPath: item.folderPath,
			latestModifiedAt,
			dicomLikeFiles,
			archiveFiles,
			imageFiles,
			modelFiles,
			dicomConfidence: Number(dicomConfidence.toFixed(2)),
			modelConfidence: Number(modelConfidence.toFixed(2)),
			combinedConfidence: Number(combinedConfidence.toFixed(2)),
			recommendedAction,
			modelCandidates: sortedModelCandidates,
			modelWorkbenchManifest,
			reasons,
			warnings: Array.from(folderWarnings),
		});
	}

	if (queue.length)
		warnings.add(
			`Органайзер остановлен на maxFolders=${input.maxFolders}. Сузьте корни или увеличьте лимит.`,
		);
	if (!roots.length)
		warnings.add("Нет доступных для чтения корневых папок органайзера.");

	const sortedCases = cases
		.sort(
			(left, right) =>
				right.combinedConfidence - left.combinedConfidence ||
				right.dicomLikeFiles - left.dicomLikeFiles ||
				right.modelFiles - left.modelFiles ||
				(right.latestModifiedAt ?? "").localeCompare(
					left.latestModifiedAt ?? "",
				),
		)
		.slice(0, input.maxCandidates);

	if (!sortedCases.length)
		warnings.add(
			"В выбранных корнях не найдены кандидаты КТ/снимков или стоматологических 3D-моделей.",
		);

	const best = sortedCases[0] ?? null;
	const nextAction = best
		? best.recommendedAction === "review_3d_models"
			? "Откройте лучшую папку как 3D-кейс; держите сетки локально, пока не подключен отдельный 3D-просмотрщик/обработчик."
			: best.recommendedAction === "mixed_case_workup"
				? "Используйте лучшую папку для разбора снимков и проверьте связанные 3D-модели как вложения только с метаданными."
				: "Используйте лучшую папку для разбора снимков; тяжелые данные держите локально и сохраняйте только план просмотра."
		: "Укажите известную папку КТ/снимков/моделей или настройте корни поиска в серверных настройках.";

	return localImagingOrganizerResponseSchema.parse({
		version: "dental-crm-local-imaging-organizer-v1",
		generatedAt: new Date().toISOString(),
		roots,
		scannedFolders,
		cases: sortedCases,
		warnings: Array.from(warnings),
		nextAction,
	});
}

export async function buildDicomFolderSeriesPreview(
	input: {
		folderPath: string;
		recursive: boolean;
		sourceName: string;
		maxFiles: number;
		maxFolders: number;
		maxEntriesPerFolder: number;
		maxHeaderBytes: number;
	},
	options: ApiDicomScanOptions = {},
	organizationId: string = "",
) {
	// Организация ПЕРЕДАЁТСЯ вызывающим обработчиком: раньше функция сама брала
	// «первую строку таблицы organizations» и в мультиклинике разбирала папку
	// от имени чужой клиники.
	const scan = await collectDicomHeaderFiles(
		input.folderPath,
		input.recursive,
		input.maxFiles,
		options,
		{
			maxFolders: input.maxFolders,
			maxEntriesPerFolder: input.maxEntriesPerFolder,
		},
	);
	const manifest = await buildDicomHeaderManifest(
		{
			files: scan.files,
			sourceName: input.sourceName,
			maxHeaderBytes: input.maxHeaderBytes,
		},
		options,
	);
	const orgId = organizationId;
	const preview = await parseDicomSeriesManifest(orgId, {
		sourceName: input.sourceName,
		sourceKind: "dicom_file",
		rawText: manifest.rawText,
	});

	return dicomFolderSeriesPreviewResponseSchema.parse({
		folderPath: path.resolve(input.folderPath),
		recursive: input.recursive,
		filesFound: scan.files.length,
		filesParsed: manifest.filesParsed,
		metadataRows: manifest.metadataRows,
		rawText: manifest.rawText,
		preview,
		warnings: [...scan.warnings, ...manifest.warnings],
	});
}

export function recommendDicomFolderWorkupPath(
	readiness: ReturnType<typeof buildDicomWorkstationReadiness>,
	series: DicomSeriesPreviewGroup,
): DicomFolderWorkupPath {
	if (
		readiness.renderPlan.textureStrategy === "metadata_only" ||
		readiness.runtimeProfile.executionLane === "metadata_only"
	) {
		return "metadata_only";
	}
	if (
		readiness.canOpenInBrowser &&
		(readiness.effectiveLoadStrategy === "mpr_downsampled" ||
			readiness.renderPlan.downsampleFactor > 1 ||
			readiness.renderPlan.qualityMode === "interactive_low")
	) {
		return "downsampled_mpr";
	}
	if (readiness.canOpenInBrowser && series.mprReadiness.canOpenMpr)
		return "open_mpr";
	if (readiness.shouldUseExternalViewer) return "external_viewer";
	return "metadata_only";
}

export function nextDicomFolderAction(pathKind: DicomFolderWorkupPath) {
	switch (pathKind) {
		case "open_mpr":
			return "Откройте отдельное рабочее место КТ-срезов; экран приема оставьте только для заметок и состояния.";
		case "downsampled_mpr":
			return "Откройте КТ-срезы с первым проходом в пониженном разрешении, затем разрешайте полное качество только по запросу врача.";
		case "external_viewer":
			return "Используйте внешний или настольный КТ-просмотрщик; CRM хранит метаданные, восстановление и аннотации.";
		default:
			return "Оставьте предпросмотр только с метаданными и попросите администратора выбрать более подходящую станцию или источник.";
	}
}

export async function buildDicomFolderWorkupPlan(
	input: DicomFolderWorkupPlanRequest,
	options: ApiDicomScanOptions = {},
	organizationId = "",
) {
	const folder = await buildDicomFolderSeriesPreview(
		input,
		options,
		organizationId,
	);
	const warnings = new Set<string>(folder.warnings);
	const eligibleSeries = folder.preview.series
		.filter((series) => series.status !== "blocked")
		.slice(0, 12);

	if (folder.preview.series.length > eligibleSeries.length) {
		warnings.add(
			"Планируются только первые 12 незаблокированных серий, чтобы разбор папки оставался быстрым и ограниченным.",
		);
	}
	if (!eligibleSeries.length) {
		warnings.add("В выбранной папке не найдены пригодные серии снимков.");
	}

	const plans = eligibleSeries.map((series) => {
		const readiness = buildDicomWorkstationReadiness({
			series,
			client: input.client,
			connector: null,
		});
		const renderCachePlan = buildDicomRenderCachePlan({
			series,
			renderPlan: readiness.renderPlan,
			viewerState: input.viewerState ?? null,
		});
		const recommendedPath = recommendDicomFolderWorkupPath(readiness, series);
		const planWarnings = new Set<string>([
			...series.warnings,
			...series.mprReadiness.warnings,
			...readiness.warnings,
			...renderCachePlan.warnings,
		]);

		return {
			series,
			readiness,
			renderCachePlan,
			recommendedPath,
			doctorBlocking: false,
			warnings: Array.from(planWarnings),
			nextAction: nextDicomFolderAction(recommendedPath),
		};
	});

	const bestPlan =
		plans.find((plan) => plan.recommendedPath === "open_mpr") ??
		plans.find((plan) => plan.recommendedPath === "downsampled_mpr") ??
		plans[0];
	const nextAction = bestPlan
		? bestPlan.nextAction
		: "В разборе папки нет открываемых серий; сохраните импорт как метаданные и проверьте путь источника.";

	return dicomFolderWorkupPlanResponseSchema.parse({
		version: "dental-crm-dicom-folder-workup-v1",
		generatedAt: new Date().toISOString(),
		folder,
		selectedSeriesCount: plans.length,
		plans,
		warnings: Array.from(warnings),
		nextAction,
	});
}
