import { createHash } from "node:crypto";
import { type Dirent, existsSync } from "node:fs";
import { access, opendir, readdir, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	type CtSurfaceModelManifest,
	type DentalModelFileCandidate,
	type DentalModelFileFormat,
	type DentalModelFileRole,
	type DentalModelWorkbenchLoadTarget,
	type DentalModelWorkbenchPairingHint,
	type DicomLocalFolderDiscoveryCandidate,
	type DicomLocalFolderDiscoveryRequest,
	dicomLocalFolderDiscoveryResponseSchema,
	type ImagingImportPreviewRow,
	type ImagingSourceKind,
	imagingImportPreviewResponseSchema,
	type LocalImagingOrganizerCase,
	type LocalImagingOrganizerRecommendedAction,
	type LocalImagingOrganizerRequest,
	localImagingOrganizerResponseSchema,
	normalizeDate,
	splitLine,
} from "@dental/shared";
import { getPatientsFromDb } from "../../db/patientsQuery.js";
import {
	type ApiDicomFolderTraversalLimits,
	type ApiDicomScanOptions,
	apiDicomDefaultMaxEntriesPerFolder,
	apiDicomDefaultMaxFolders,
	createApiDicomScanYieldState,
	detectDelimiter,
	detectKind,
	detectSourceKind,
	hasDicomMagic,
	isApiDicomScanAbortError,
	kindLabels,
	matchPatient,
	maybeYieldApiDicomScan,
	normalizeHeader,
	normalizePhone,
	parseManifestLine,
} from "../../modules/imaging/dicomDecoder.js";
import {
	dicomArchiveExtensions,
	dicomPixelFileExtensions,
	isDicomPixelPath,
} from "../../modules/imaging/hardwarePlanner.js";

export const headerAliases: Record<
	string,
	keyof Pick<
		ImagingImportPreviewRow,
		| "patientName"
		| "phone"
		| "kind"
		| "title"
		| "toothCode"
		| "region"
		| "capturedAt"
		| "filePath"
		| "sourceName"
	>
> = {
	fio: "patientName",
	fullname: "patientName",
	name: "patientName",
	patient: "patientName",
	"patient name": "patientName",
	фио: "patientName",
	пациент: "patientName",
	клиент: "patientName",
	phone: "phone",
	tel: "phone",
	telephone: "phone",
	телефон: "phone",
	номер: "phone",
	modality: "kind",
	модальность: "kind",
	type: "kind",
	kind: "kind",
	тип: "kind",
	вид: "kind",
	title: "title",
	название: "title",
	tooth: "toothCode",
	зуб: "toothCode",
	region: "region",
	область: "region",
	date: "capturedAt",
	captured: "capturedAt",
	дата: "capturedAt",
	file: "filePath",
	path: "filePath",
	filepath: "filePath",
	файл: "filePath",
	путь: "filePath",
	source: "sourceName",
	источник: "sourceName",
};
export const imagingFileExtensions = new Set([
	".dcm",
	".dicom",
	".ima",
	".jpg",
	".jpeg",
	".png",
	".tif",
	".tiff",
	".bmp",
	".webp",
	...dicomArchiveExtensions,
]);
export const dentalModelFileExtensions = new Set([
	".stl",
	".obj",
	".ply",
	".glb",
	".gltf",
	".3mf",
]);
export const dicomDiscoverySkipDirectoryNames = new Set([
	".cache",
	".codex",
	".edge-debug",
	".git",
	".next",
	".nuxt",
	".venv",
	"__pycache__",
	"build",
	"coverage",
	"dist",
	"node_modules",
	"site-packages",
	"target",
	"venv",
]);
export async function parseImagingManifest(
	orgIdOrInput:
		| { sourceName?: string; sourceKind?: ImagingSourceKind; rawText?: string }
		| string,
	maybeInput?:
		| { sourceName?: string; sourceKind?: ImagingSourceKind; rawText?: string }
		| string,
) {
	const orgId =
		typeof orgIdOrInput === "string" && maybeInput ? orgIdOrInput : "default";
	const input =
		typeof orgIdOrInput === "object"
			? orgIdOrInput
			: (maybeInput ?? orgIdOrInput);
	const rawText = typeof input === "string" ? input : (input?.rawText ?? "");
	const sourceName =
		typeof input === "string" ? "Manifest" : (input?.sourceName ?? "Manifest");
	const sourceKind =
		typeof input === "string"
			? "folder_watch"
			: (input?.sourceKind ?? "folder_watch");
	const lines = rawText
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
	if (!lines.length) {
		return imagingImportPreviewResponseSchema.parse({
			sourceName,
			sourceKind,
			totalRows: 0,
			readyRows: 0,
			warningRows: 0,
			blockedRows: 0,
			rows: [],
			parserNotes: ["Нет строк для разбора."],
		});
	}

	const delimiter = detectDelimiter(lines[0] ?? "");
	const headers = splitLine(lines[0] ?? "", delimiter).map(
		(cell) => headerAliases[normalizeHeader(cell)] ?? null,
	);
	const patients = await getPatientsFromDb(orgId);
	const hasHeader = headers.some(Boolean);
	const rows: ImagingImportPreviewRow[] = await Promise.all(
		(hasHeader ? lines.slice(1) : lines).map(async (line, index) => {
			if (!hasHeader)
				return parseManifestLine(
					patients,
					line,
					index + 1,
					sourceKind,
					sourceName,
				);
			const cells = splitLine(line, delimiter);
			const draft: Partial<ImagingImportPreviewRow> = {
				rowNumber: index + 2,
				sourceKind: sourceKind,
				sourceName: sourceName,
				warnings: [],
			};
			headers.forEach((field, cellIndex) => {
				if (!field) return;
				const value = cells[cellIndex]?.trim() || null;
				if (field === "phone") draft.phone = normalizePhone(value);
				else if (field === "kind") draft.kind = detectKind(value);
				else if (field === "capturedAt")
					draft.capturedAt = normalizeDate(value);
				else draft[field] = value as never;
			});
			const { patient, ambiguous, weakMatch } = matchPatient(
				patients,
				draft.patientName ?? null,
				draft.phone ?? null,
			);
			const kind = draft.kind ?? detectKind(draft.filePath ?? "");
			const source = detectSourceKind(
				draft.filePath ?? draft.sourceName ?? "",
				sourceKind,
			);
			const warnings: string[] = [];
			if (ambiguous)
				warnings.push(
					"Найдено несколько пациентов с такими данными — выберите нужного вручную",
				);
			else if (!patient)
				warnings.push("Пациент не найден, нужно сопоставление");
			else if (weakMatch)
				warnings.push(
					"Пациент найден только по ФИО (без телефона) — подтвердите совпадение",
				);
			if (!kind) warnings.push("Тип снимка не распознан");
			if (!draft.filePath) warnings.push("Нет пути к файлу снимка");
			const blocked = !draft.filePath || !kind;
			return {
				rowNumber: draft.rowNumber ?? index + 2,
				patientId: patient?.id ?? null,
				patientName: patient?.fullName ?? draft.patientName ?? null,
				phone: draft.phone ?? null,
				kind,
				title:
					draft.title ??
					(kind
						? `${kindLabels[kind]}${draft.toothCode ? ` ${draft.toothCode}` : ""}`
						: null),
				toothCode: draft.toothCode ?? null,
				region: draft.region ?? null,
				capturedAt: draft.capturedAt ?? null,
				filePath: draft.filePath ?? null,
				sourceKind: source,
				sourceName: draft.sourceName ?? sourceName,
				// Автоматический импорт (status "ready") только при надёжном совпадении:
				// слабое совпадение по одному ФИО и неоднозначность требуют человека.
				status: blocked
					? "blocked"
					: patient && !weakMatch
						? "ready"
						: "warning",
				warnings,
			};
		}),
	);

	return imagingImportPreviewResponseSchema.parse({
		sourceName,
		sourceKind,
		totalRows: rows.length,
		readyRows: rows.filter((row) => row.status === "ready").length,
		warningRows: rows.filter((row) => row.status === "warning").length,
		blockedRows: rows.filter((row) => row.status === "blocked").length,
		rows,
		parserNotes: [
			"Парсер списка поддерживает CSV/TSV/текст с разделителем |, пути к КТ/снимкам, экспорты JPG/PNG/TIFF/BMP/WebP, подсказки RVG и синонимы ОПТГ/ТРГ/КЛКТ/прицельного снимка.",
			"Готовые строки можно позже провести через локальный обработчик: он скопирует файлы, рассчитает хэши и привяжет их к картам пациентов.",
		],
	});
}
export async function collectImagingFiles(
	root: string,
	recursive: boolean,
	maxFiles: number,
	options: ApiDicomScanOptions = {},
	limits: ApiDicomFolderTraversalLimits = {},
) {
	const files: string[] = [];
	const warnings: string[] = [];
	const queue = [path.resolve(root)];
	const maxFolders = Math.max(
		1,
		Math.floor(limits.maxFolders ?? apiDicomDefaultMaxFolders),
	);
	const maxEntriesPerFolder = Math.max(
		1,
		Math.floor(
			limits.maxEntriesPerFolder ?? apiDicomDefaultMaxEntriesPerFolder,
		),
	);
	const yieldState = createApiDicomScanYieldState();
	let queueIndex = 0;
	let foldersScanned = 0;
	let folderQueueLimitHit = false;

	const concurrencyLimit = 15;
	let activeWorkers = 0;
	let isDone = false;
	let errorToThrow: unknown = null;

	await new Promise<void>((resolve, reject) => {
		function spawnWorkers() {
			if (errorToThrow || isDone) return;

			while (
				activeWorkers < concurrencyLimit &&
				queueIndex < queue.length &&
				files.length < maxFiles &&
				foldersScanned < maxFolders
			) {
				const current = queue[queueIndex];
				queueIndex += 1;
				foldersScanned += 1;
				activeWorkers += 1;

				if (!current) {
					activeWorkers -= 1;
					continue;
				}

				processFolder(current).finally(() => {
					activeWorkers -= 1;
					if (errorToThrow) return;

					if (
						files.length >= maxFiles ||
						foldersScanned >= maxFolders ||
						queueIndex >= queue.length
					) {
						if (activeWorkers === 0 && !isDone) {
							isDone = true;
							resolve();
						}
					} else {
						spawnWorkers();
					}
				});
			}

			if (
				activeWorkers === 0 &&
				(queueIndex >= queue.length ||
					files.length >= maxFiles ||
					foldersScanned >= maxFolders)
			) {
				if (!isDone) {
					isDone = true;
					resolve();
				}
			}
		}

		async function processFolder(current: string) {
			try {
				await maybeYieldApiDicomScan(yieldState, options.signal);
				let entriesInspected = 0;
				const directory = await opendir(current);
				for await (const entry of directory) {
					if (files.length >= maxFiles) break;

					await maybeYieldApiDicomScan(yieldState, options.signal);
					entriesInspected += 1;
					if (entriesInspected > maxEntriesPerFolder) {
						warnings.push(
							`Проверка папки ограничена ${maxEntriesPerFolder} элементами: ${current}`,
						);
						break;
					}
					const entryName = entry.name.toString();
					const fullPath = path.join(current, entryName);
					if (entry.isDirectory()) {
						if (recursive) {
							const queuedFolders = queue.length - queueIndex;
							if (foldersScanned + queuedFolders < maxFolders) {
								queue.push(fullPath);
							} else {
								folderQueueLimitHit = true;
							}
						}
						continue;
					}
					if (!entry.isFile()) continue;
					if (!imagingFileExtensions.has(path.extname(entryName).toLowerCase()))
						continue;

					if (files.length < maxFiles) {
						files.push(fullPath);
						if (files.length >= maxFiles) {
							warnings.push(`Остановлено на лимите ${maxFiles} файлов.`);
							break;
						}
					}
				}
			} catch (error) {
				if (isApiDicomScanAbortError(error)) {
					errorToThrow = error;
					reject(error);
					return;
				}
				warnings.push(`Не удалось прочитать папку: ${current}`);
			}
		}

		spawnWorkers();
	});

	if (errorToThrow) throw errorToThrow;
	if (
		foldersScanned >= maxFolders ||
		folderQueueLimitHit ||
		queueIndex < queue.length
	) {
		warnings.push(`Сканирование папок остановлено на лимите ${maxFolders}.`);
	}

	return { files, warnings };
}
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
export function normalizeOrganizerText(value: string) {
	return value.toLowerCase().replace(/[._()[\]{}-]+/g, " ");
}
export function detectDentalModelFormat(
	fileName: string,
): DentalModelFileFormat {
	const extension = path.extname(fileName).toLowerCase();
	if (extension === ".stl") return "stl";
	if (extension === ".obj") return "obj";
	if (extension === ".ply") return "ply";
	if (extension === ".glb") return "glb";
	if (extension === ".gltf") return "gltf";
	if (extension === ".3mf") return "3mf";
	if (extension === ".zip") return "zip_archive";
	return "unknown";
}
export function detectDentalSurfaceModelRole(
	text: string,
): DentalModelFileRole | null {
	const surfaceHint =
		/surface|bone|skull|cranium|cranial|segmentation|segmented|mesh|volumetric|ct\s*model|cbct|klkt|череп|кость|костн|сегментац/.test(
			text,
		);
	if (/skull|cranium|cranial|череп/.test(text)) return "skull_surface";
	if (
		surfaceHint &&
		/maxilla|maxillary|upper jaw|u[ _-]?jaw|верхн|верхняя/.test(text)
	)
		return "maxilla_surface";
	if (
		surfaceHint &&
		/mandible|mandibular|lower jaw|l[ _-]?jaw|нижн|нижняя/.test(text)
	)
		return "mandible_surface";
	if (
		/ct\s*bone|cbct\s*bone|klkt\s*bone|bone\s*surface|surface\s*bone|segmented\s*bone|bone\s*segmentation|костн|кость/.test(
			text,
		)
	) {
		return "ct_bone_surface";
	}
	return null;
}
export function detectDentalModelRole(
	fileName: string,
	folderPath: string,
): DentalModelFileRole {
	const fromText = (text: string): DentalModelFileRole | null => {
		const surfaceRole = detectDentalSurfaceModelRole(text);
		if (surfaceRole) return surfaceRole;
		if (/scan\s*body|scanbody|scan-body|transfer|abutment scan/.test(text))
			return "scan_body";
		if (/upper|maxilla|maxillary|verk+h|up\b|u[ _-]?jaw/.test(text))
			return "upper_arch";
		if (/lower|mandible|mandibular|niz|low\b|l[ _-]?jaw/.test(text))
			return "lower_arch";
		if (/bite|occlusion|occlusal|prikus/.test(text)) return "bite";
		if (/bridge|pontic|most/.test(text)) return "bridge";
		if (/crown|koron|veneer|inlay|onlay/.test(text)) return "crown";
		if (/aligner|eliner|kap+|cap+|tray/.test(text)) return "aligner";
		if (
			/implant.*guide|guide.*implant|surgical.*guide|surg.*guide|pilot.*guide|implant/i.test(
				text,
			)
		)
			return "implant_guide";
		if (/guide|sleeve|template|sablon|shablon|surgical/.test(text))
			return "surgical_guide";
		return null;
	};
	const fileRole = fromText(normalizeOrganizerText(fileName));
	if (fileRole) return fileRole;
	const text = normalizeOrganizerText(folderPath);
	if (/scan\s*body|scanbody|scan-body|transfer|abutment scan/.test(text))
		return "scan_body";
	if (
		/implant.*guide|guide.*implant|surgical.*guide|surg.*guide|pilot.*guide|implant/i.test(
			text,
		)
	)
		return "implant_guide";
	if (/guide|sleeve|template|sablon|shablon|surgical/.test(text))
		return "surgical_guide";
	if (/aligner|eliner|kap+|cap+|tray/.test(text)) return "aligner";
	if (/bridge|pontic|most/.test(text)) return "bridge";
	if (/crown|koron|veneer|inlay|onlay/.test(text)) return "crown";
	if (/bite|occlusion|occlusal|prikus/.test(text)) return "bite";
	if (/upper|maxilla|maxillary|verk+h|up\b|u[ _-]?jaw/.test(text))
		return "upper_arch";
	if (/lower|mandible|mandibular|niz|low\b|l[ _-]?jaw/.test(text))
		return "lower_arch";
	return "unknown";
}
export function hasDentalModelArchiveHint(
	fileName: string,
	folderPath: string,
) {
	const _text = normalizeOrganizerText(`${folderPath} ${fileName}`);
	return hasDentalModelFileHint(fileName, folderPath);
}
export function hasDentalModelFileHint(fileName: string, folderPath: string) {
	const text = normalizeOrganizerText(`${folderPath} ${fileName}`);
	return /skull|cranium|cranial|surface|bone|segmentation|segmented|upper|lower|maxilla|maxillary|mandible|mandibular|u[ _-]?jaw|l[ _-]?jaw|bite|occlusion|occlusal|crown|bridge|veneer|inlay|onlay|implant|guide|sleeve|aligner|tray|scanbody|scan body|abutment|intraoral|ios|exocad|3shape|medit|cerec|dental|tooth|teeth|orthodont|surgical|череп|кость|костн|сегментац/.test(
		text,
	);
}
export function scoreDentalModelFile(fileName: string, folderPath: string) {
	const format = detectDentalModelFormat(fileName);
	if (format === "unknown") return 0;
	const role = detectDentalModelRole(fileName, folderPath);
	const text = normalizeOrganizerText(`${folderPath} ${fileName}`);
	let score = format === "zip_archive" ? 0.32 : 0.5;
	if (role !== "unknown") score += 0.22;
	if (
		/intraoral|ios|scan|cad|cam|exocad|3shape|medit|cerec|mesh|model|stl|implant|guide|surface|segmentation/.test(
			text,
		)
	)
		score += 0.18;
	if (
		/upper|lower|maxilla|mandible|skull|bone|crown|bridge|aligner|bite|scanbody|scan body/.test(
			text,
		)
	)
		score += 0.1;
	return Math.min(1, Number(score.toFixed(2)));
}
export function organizerFolderHintScore(folderPath: string) {
	const normalized = normalizeOrganizerText(folderPath);
	let score = folderHintScore(folderPath);
	if (
		/intraoral|ios|exocad|3shape|medit|cerec|implant|guide|aligner|scanbody|crown|bridge|maxilla|mandible|skull|bone|surface|segmentation|dental|tooth|teeth|orthodont|surgical/.test(
			normalized,
		)
	)
		score += 0.2;
	if (/patient|case|study|export|clinic|lab|laboratory/.test(normalized))
		score += 0.05;
	return Math.min(0.35, Number(score.toFixed(2)));
}
export function isLikelySoftwareResourceFolder(folderPath: string) {
	const normalized = normalizeOrganizerText(folderPath);
	return /portable tools|portable_tools|program files|node modules|packagecache|resources|resource|viewer|cdviewer|examples?|samples?|demo|assets|library|sdk|toolkit|game|gamedev|kenney|template/.test(
		normalized,
	);
}
export function buildOrganizerCaseId(folderPath: string) {
	return `local-imaging-${createHash("sha256").update(folderPath).digest("hex").slice(0, 14)}`;
}
export function latestIso(left: string | null, right: string | null) {
	if (!left) return right;
	if (!right) return left;
	return left > right ? left : right;
}
export function recommendLocalImagingAction(caseCandidate: {
	dicomLikeFiles: number;
	modelFiles: number;
	archiveFiles: number;
	combinedConfidence: number;
}): LocalImagingOrganizerRecommendedAction {
	if (caseCandidate.dicomLikeFiles > 0 && caseCandidate.modelFiles > 0)
		return "mixed_case_workup";
	if (
		caseCandidate.dicomLikeFiles > 0 ||
		(caseCandidate.archiveFiles > 0 && caseCandidate.combinedConfidence >= 0.45)
	)
		return "open_ct_workup";
	if (caseCandidate.modelFiles > 0) return "review_3d_models";
	return "manual_review";
}
export function isCtSurfaceModelRole(role: DentalModelFileRole) {
	return (
		role === "skull_surface" ||
		role === "maxilla_surface" ||
		role === "mandible_surface" ||
		role === "ct_bone_surface"
	);
}
export function buildCtSurfaceModelManifest(input: {
	model: DentalModelFileCandidate;
	folderFingerprint: string;
	pairingHint: DentalModelWorkbenchPairingHint;
	loadTarget: DentalModelWorkbenchLoadTarget;
	sizeMb: number;
}): CtSurfaceModelManifest | null {
	if (!isCtSurfaceModelRole(input.model.role)) return null;
	const archiveOrUnknown =
		input.model.format === "zip_archive" || input.model.format === "unknown";
	const readiness: CtSurfaceModelManifest["readiness"] = archiveOrUnknown
		? "metadata_only"
		: input.loadTarget === "local_bridge"
			? "pending_local_bridge"
			: input.loadTarget === "external_model_viewer"
				? "ready_external"
				: "blocked";
	const warnings = [...input.model.warnings];
	warnings.push(
		"CRM хранит только связь КТ-поверхности и статус проверки; геометрия сетки остается в локальном 3D-мосте или внешнем просмотрщике моделей.",
	);
	if (archiveOrUnknown) {
		warnings.push(
			"Архив или неизвестный формат поверхности хранится только как метаданные, пока локальный мост не проверит сетку.",
		);
	}
	return {
		role: input.model.role,
		format: input.model.format,
		sourceKind: archiveOrUnknown ? "unknown" : "imported_surface_file",
		sourceSeriesRef: {
			folderFingerprint: input.folderFingerprint,
			pairingHint: input.pairingHint,
			studyInstanceUid: null,
			seriesInstanceUid: null,
		},
		frameOfReferenceUid: null,
		registrationStatus:
			input.pairingHint === "same_folder_ct_series"
				? "same_folder_inferred"
				: "unknown",
		readiness,
		loadTarget: input.loadTarget,
		sizeMb: input.sizeMb,
		checksum: null,
		meshStats: null,
		containsMeshGeometry: false,
		warnings,
		nextAction:
			readiness === "pending_local_bridge"
				? "Передайте эту КТ-поверхность в локальный 3D-мост для регистрации, статистики сетки и клинической проверки; CRM не хранит payload сетки."
				: readiness === "ready_external"
					? "Откройте эту поверхность во внешнем просмотрщике моделей; CRM оставит слой пациента, связи с КТ и заметок."
					: "Оставьте эту поверхность как метаданные, пока локальный мост не проверит архив, формат и регистрацию с КТ.",
	};
}
export function chooseDentalModelWorkbenchTarget(
	model: DentalModelFileCandidate,
): DentalModelWorkbenchLoadTarget {
	if (model.format === "unknown" || model.format === "zip_archive")
		return "metadata_only";
	if (isCtSurfaceModelRole(model.role)) return "local_bridge";
	if (model.sizeBytes >= 80 * 1024 * 1024) return "local_bridge";
	return "external_model_viewer";
}
export function buildDentalModelWorkbenchManifest(input: {
	folderFingerprint: string;
	dicomLikeFiles: number;
	modelCandidates: DentalModelFileCandidate[];
}) {
	const warnings = new Set<string>();
	const items = input.modelCandidates.map((model) => {
		const loadTarget = chooseDentalModelWorkbenchTarget(model);
		const sizeMb = Math.ceil(model.sizeBytes / 1024 / 1024);
		const itemWarnings = [...model.warnings];
		if (isCtSurfaceModelRole(model.role)) {
			itemWarnings.push(
				"КТ-поверхность требует локальный 3D-модуль или внешний просмотр; CRM не загружает сетку в карточку приема.",
			);
		}
		if (loadTarget === "metadata_only") {
			itemWarnings.push(
				"Файл остается записью органайзера до разбора формата во внешнем или локальном модуле.",
			);
		}
		if (sizeMb >= 80) {
			itemWarnings.push(
				"Крупная сетка должна открываться локально; браузерная карточка хранит только маршрут и метаданные.",
			);
		}
		itemWarnings.forEach((warning) => {
			warnings.add(warning);
		});
		const pairingHint: DentalModelWorkbenchPairingHint =
			input.dicomLikeFiles > 0 ? "same_folder_ct_series" : "model_only_folder";
		const ctSurfaceManifest = buildCtSurfaceModelManifest({
			model: { ...model, warnings: itemWarnings },
			folderFingerprint: input.folderFingerprint,
			pairingHint,
			loadTarget,
			sizeMb,
		});
		const nextAction =
			loadTarget === "local_bridge"
				? "Передайте модель локальному 3D-модулю рядом с КТ-серией; CRM хранит роль, размер и связь с папкой."
				: loadTarget === "external_model_viewer"
					? "Откройте модель во внешнем 3D-просмотре и держите CRM как слой пациента, заметок и маршрута."
					: "Сохраните модель как метаданные органайзера, пока внешний модуль не подтвердит формат.";
		return {
			fileName: model.fileName,
			format: model.format,
			role: model.role,
			sizeBytes: model.sizeBytes,
			sizeMb,
			loadTarget,
			pairingHint,
			ctSurfaceManifest,
			warnings: itemWarnings,
			nextAction,
		};
	});
	const targetRank: Record<DentalModelWorkbenchLoadTarget, number> = {
		metadata_only: 0,
		external_model_viewer: 1,
		local_bridge: 2,
	};
	const recommendedTarget = items.reduce<DentalModelWorkbenchLoadTarget>(
		(target, item) =>
			targetRank[item.loadTarget] > targetRank[target]
				? item.loadTarget
				: target,
		"metadata_only",
	);
	const ctSurfaceModels = items.filter((item) =>
		isCtSurfaceModelRole(item.role),
	).length;
	const largestModelMb = items.reduce(
		(largest, item) => Math.max(largest, item.sizeMb),
		0,
	);
	const nextAction =
		items.length === 0
			? "3D-модели не найдены; оставайтесь в маршруте снимков."
			: recommendedTarget === "local_bridge"
				? "Для КТ-поверхностей и крупных сеток используйте локальный 3D-модуль; CRM хранит no-mesh маршрут."
				: recommendedTarget === "external_model_viewer"
					? "Используйте внешний 3D-просмотр и связывайте модель с КТ-кейсом по метке папки."
					: "Держите модели как метаданные, пока формат или архив не разобран внешним модулем.";
	return {
		version: "dental-crm-model-workbench-v1" as const,
		folderFingerprint: input.folderFingerprint,
		totalModels: items.length,
		ctSurfaceModels,
		largestModelMb,
		recommendedTarget,
		items,
		warnings: Array.from(warnings),
		nextAction,
	};
}
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
