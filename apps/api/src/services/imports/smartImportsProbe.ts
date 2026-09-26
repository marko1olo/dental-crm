import { statSync } from "node:fs";
/**
 * Deep source inspection, binary signature analysis, and probe diagnostics.
 */
import { open, stat, readdir } from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";
import type {
  MigrationLocalSourceProbeRequest,
  MigrationLocalSourceProbeResponse,
  MigrationProbeArtifact,
  MigrationProbeArtifactKind,
  MigrationProbeAdapter,
  SmartImportLegacySource
} from "@dental/shared";
import {
  migrationDiscoveryEntryPriority,
  shouldSkipMigrationDiscoveryDirectory,
  migrationDirectoryPriority,
  migrationSafeAlias,
  migrationVendorGuidanceMatches
} from "./smartImportsRoots.js";
import { detectLegacySourceKind, legacySourcePlaybook } from "./smartImportsLegacyPlans.js";
import { migrationWorkupHandoffs, buildMigrationReadiness } from "./smartImportsReadiness.js";
import { buildMigrationBridgeKit } from "./smartImportsWorkup.js";
import { migrationLocalSourceProbeResponseSchema } from "@dental/shared";
import {
  migrationDatabaseExtensions,
  migrationDumpExtensions,
  migrationTableExtensions,
  migrationArchiveExtensions,
  migrationImageExtensions,
  migrationDicomExtensions
} from "./smartImportsConstants.js";
import { resolveMigrationSourceRoute, migrationFingerprint } from "./smartImportsRoots.js";

import { migrationProbeVendorMatchers, migrationProbeArtifactKindTitles } from "./smartImportsProbeMatchers.js";

export function uniqueStrings(values: string[]) {
	return Array.from(new Set(values.filter((value) => value.trim())));
}

export function migrationProbeArtifactKind(
	filePath: string,
): MigrationProbeArtifactKind {
	const name = path.basename(filePath);
	const extension = path.extname(name).toLowerCase();
	if (/^DICOMDIR$/i.test(name) || migrationDicomExtensions.has(extension))
		return "dicom";
	if (migrationDatabaseExtensions.has(extension)) return "database";
	if (migrationDumpExtensions.has(extension)) return "dump";
	if (migrationTableExtensions.has(extension)) return "table";
	if (migrationArchiveExtensions.has(extension)) return "archive";
	if ([".stl", ".obj", ".ply", ".glb", ".gltf", ".3mf"].includes(extension))
		return "model";
	if (migrationImageExtensions.has(extension)) return "image";
	return "unknown";
}

export async function readMigrationProbeHeader(
	filePath: string,
	maxBytes: number,
): Promise<Buffer> {
	const handle = await open(filePath, "r");
	try {
		const buffer = Buffer.alloc(maxBytes);
		const { bytesRead } = await handle.read(buffer, 0, maxBytes, 0);
		return buffer.subarray(0, bytesRead);
	} finally {
		await handle.close();
	}
}

export function migrationProbeFormatSignals(
	filePath: string,
	header: Buffer,
	kind: MigrationProbeArtifactKind,
): string[] {
	const name = path.basename(filePath);
	const extension = path.extname(name).toLowerCase();
	const latin = header.toString("latin1");
	const utf8 = header.toString("utf8");
	const signals: string[] = [];

	if (extension) signals.push(`расширение ${extension}`);
	if (/^DICOMDIR$/i.test(name)) signals.push("служебный каталог снимков");
	if (
		header.length >= 132 &&
		header.subarray(128, 132).toString("latin1") === "DICM"
	)
		signals.push("сигнатура файла снимков");
	if (latin.startsWith("SQLite format 3\u0000"))
		signals.push("локальная база программы");
	if (latin.startsWith("PK\u0003\u0004")) signals.push("архив или Office-файл");
	if (/Standard (?:Jet|ACE) DB/i.test(latin))
		signals.push("Microsoft Access база");
	if (extension === ".fdb" || extension === ".gdb" || extension === ".ib")
		signals.push("серверная база старой программы");
	if (extension === ".fbk" || extension === ".ibk" || extension === ".gbk")
		signals.push("резервная копия серверной базы");
	if (extension === ".1cd") signals.push("1C база");
	if (extension === ".dt") signals.push("1C выгрузка");
	if (extension === ".mdf" || extension === ".ldf")
		signals.push("SQL Server файлы данных");
	if (extension === ".sdf") signals.push("SQL Server Compact база");
	if (extension === ".dbf") signals.push("DBF/FoxPro таблица");
	if (
		extension === ".dbt" ||
		extension === ".fpt" ||
		extension === ".cdx" ||
		extension === ".idx" ||
		extension === ".ntx" ||
		extension === ".ndx" ||
		extension === ".mdx"
	) {
		signals.push("DBF/FoxPro сопутствующий файл");
	}
	if (
		extension === ".sql" ||
		/^\s*(?:create|insert|copy|backup|restore|set)\s+/i.test(utf8)
	)
		signals.push("SQL текстовая выгрузка");
	if (
		extension === ".xlsx" ||
		extension === ".xlsm" ||
		extension === ".xlsb" ||
		extension === ".docx" ||
		extension === ".pptx"
	)
		signals.push("Office таблица/документ");
	if (kind === "model") signals.push("Стоматологическая 3D-модель");
	if (kind === "image") signals.push("2D снимок или фото");
	return uniqueStrings(signals);
}

export function detectMigrationProbeVendors(values: string[]) {
	const text = values.join(" ");
	return migrationProbeVendorMatchers
		.filter(([, pattern]) => pattern.test(text))
		.map(([label]) => label);
}

export function migrationProbeSafeArtifact(
	filePath: string,
	kind: MigrationProbeArtifactKind,
	depth: number,
	signals: string[],
): MigrationProbeArtifact {
	let byteSize: number | null = null;
	let modifiedAt: string | null = null;
	try {
		const stat = statSync(filePath);
		byteSize = stat.size;
		modifiedAt = stat.mtime.toISOString();
	} catch (err) {
		console.error("[Dente] context:", err);
		// Probe output stays best-effort; unreadable files are reported as warnings by caller.
	}
	const extension = path.extname(filePath).toLowerCase() || null;
	const id = migrationFingerprint(filePath).toUpperCase();
	return {
		id,
		safeName: `${migrationProbeArtifactKindTitles[kind]} #${id}${extension ?? ""}`,
		kind,
		extension,
		byteSize,
		modifiedAt,
		depth,
		signals,
	};
}

export function emptyMigrationProbeCounts() {
	return {
		databases: 0,
		dumps: 0,
		tables: 0,
		archives: 0,
		dicom: 0,
		images: 0,
		models: 0,
		unknown: 0,
	};
}

export function incrementMigrationProbeCount(
	counts: ReturnType<typeof emptyMigrationProbeCounts>,
	kind: MigrationProbeArtifactKind,
) {
	if (kind === "database") counts.databases += 1;
	else if (kind === "dump") counts.dumps += 1;
	else if (kind === "table") counts.tables += 1;
	else if (kind === "archive") counts.archives += 1;
	else if (kind === "dicom") counts.dicom += 1;
	else if (kind === "image") counts.images += 1;
	else if (kind === "model") counts.models += 1;
	else counts.unknown += 1;
}

export function migrationProbeAdapters(input: {
	sourceKind: SmartImportLegacySource["kind"];
	sourceExists: boolean;
	counts: ReturnType<typeof emptyMigrationProbeCounts>;
	formatSignals: string[];
}): MigrationProbeAdapter[] {
	const privacy =
		"Работать только для чтения: старые базы, пациентские строки и снимки не уходят в публичные карты, поиск или LLM.";
	if (!input.sourceExists) {
		return [
			{
				id: "source_unavailable",
				title: "Источник недоступен",
				status: "blocked",
				confidence: 0.98,
				input: "alias/fingerprint",
				output: "нет чернового списка до подключения диска/сетевой папки",
				privacy,
				nextAction:
					"Подключить внешний диск, сетевую папку или открыть доступ с машины администратора, затем повторить проверку.",
			},
		];
	}

	const adapters: MigrationProbeAdapter[] = [];
	if (
		input.counts.dicom > 0 ||
		input.sourceKind === "dicom_folder" ||
		input.sourceKind === "vendor_imaging_system" ||
		input.sourceKind === "pacs_dicom"
	) {
		adapters.push({
			id: "dicom_folder_workup",
			title: "Проверка КЛКТ/КТ",
			status: "built_in",
			confidence: 0.9,
			input: "папка исследования/серии или адрес архива снимков",
			output: "список серий снимков и план просмотра",
			privacy,
			nextAction:
				"Передать папку в проверку снимков; тяжелые данные остаются локально до явного выбора исследования.",
		});
	}
	if (input.counts.images > 0 || input.sourceKind === "xray_image_archive") {
		adapters.push({
			id: "xray_folder_manifest",
			title: "Список RVG/ОПТГ/фото",
			status: "built_in",
			confidence: 0.78,
			input: "папка снимков или список изображений",
			output: "предпросмотр импорта снимков",
			privacy,
			nextAction:
				"Собрать список снимков и вручную подтвердить спорные совпадения пациентов.",
		});
	}
	if (
		input.counts.tables > 0 ||
		input.counts.archives > 0 ||
		input.sourceKind === "csv_export" ||
		input.sourceKind === "spreadsheet_export" ||
		input.sourceKind === "archive_export"
	) {
		adapters.push({
			id: "document_table_extractor",
			title: "Разбор таблиц и документов",
			status: "built_in",
			confidence: 0.76,
			input: "таблицы, документы, архивы или извлеченный текст",
			output: "нормализованный текст и таблицы для предпросмотра импорта",
			privacy,
			nextAction:
				"Извлечь таблицы в черновой текст; запись разрешать только после предпросмотра.",
		});
	}
	if (
		input.counts.databases > 0 ||
		input.counts.dumps > 0 ||
		[
			"firebird_database",
			"access_database",
			"sqlite_database",
			"sql_dump",
			"mis_database",
		].includes(input.sourceKind)
	) {
		const needsExport = input.formatSignals.some((signal) =>
			/1C|SQL Server.*данн|Access/i.test(signal),
		);
		adapters.push({
			id: "legacy_db_staging_bridge",
			title: "Локальный разбор старой базы",
			status: needsExport ? "needs_export" : "needs_local_bridge",
			confidence: 0.84,
			input:
				"отдельная копия базы или резервная копия плюс доступ только для чтения при необходимости",
			output:
				"табличный список пациентов, визитов, оплат, документов и снимков",
			privacy,
			nextAction: needsExport
				? "Сначала получить штатную выгрузку или резервную копию старой системы, затем прогнать локальный модуль."
				: "Прогнать локальный модуль миграции на копии базы; прямая запись из старой базы запрещена.",
		});
	}
	if (!adapters.length) {
		adapters.push({
			id: "manual_manifest",
			title: "Ручной список для проверки",
			status: "manual",
			confidence: 0.52,
			input: "неизвестный источник",
			output: "ручной табличный список для предпросмотра",
			privacy,
			nextAction:
				"Попросить администратора выбрать конкретный файл экспорта или папку снимков; не импортировать вслепую.",
		});
	}
	return adapters;
}

export async function inspectMigrationProbeFile(input: {
	filePath: string;
	depth: number;
	readHeaderBytes: number;
	counts: ReturnType<typeof emptyMigrationProbeCounts>;
	formatSignals: Set<string>;
	artifactSamples: MigrationProbeArtifact[];
	maxSampleArtifacts: number;
	warnings: Set<string>;
}) {
	const kind = migrationProbeArtifactKind(input.filePath);
	incrementMigrationProbeCount(input.counts, kind);

	let signals: string[] = [];
	if (
		kind !== "unknown" ||
		input.artifactSamples.length < Math.min(6, input.maxSampleArtifacts)
	) {
		try {
			const header = await readMigrationProbeHeader(
				input.filePath,
				input.readHeaderBytes,
			);
			signals = migrationProbeFormatSignals(input.filePath, header, kind);
			signals.forEach((signal) => {
				input.formatSignals.add(signal);
			});
		} catch (err) {
			console.error("[Dente] context:", err);
			input.warnings.add(
				"Один файл-кандидат не удалось прочитать даже для заголовка; он учтен без сигнатуры.",
			);
		}
	}

	if (
		(kind !== "unknown" || signals.length > 0) &&
		input.artifactSamples.length < input.maxSampleArtifacts
	) {
		input.artifactSamples.push(
			migrationProbeSafeArtifact(input.filePath, kind, input.depth, signals),
		);
	}
}

export function addMigrationProbeWarnings(
	warnings: Set<string>,
	flags: {
		routeExpired: boolean;
		routeToken?: string | null;
		isBrowserManifest: boolean;
		isSmartPreviewSource: boolean;
		isWorkstationProfile: boolean;
		isWorkstationSignal: boolean;
		isUrl: boolean;
	},
) {
	if (flags.routeExpired) {
		warnings.add(
			"Внутренний номер источника устарел или был создан в другой серверной сессии: повторите автопоиск или выбор папки, чтобы получить новый номер.",
		);
	} else if (flags.routeToken) {
		warnings.add(
			"Источник передан через внутренний номер: сырой локальный путь не возвращается в браузер и отчеты.",
		);
	}

	if (flags.isBrowserManifest) {
		warnings.add(
			"Браузерный список не раскрывает серверу полный путь и не дает читать файлы повторно; проверка строит план разбора по типу источника и внутреннему отпечатку.",
		);
	} else if (flags.isSmartPreviewSource) {
		warnings.add(
			"Источник получен из текста/Excel/OCR; проверка строит план разбора по распознанному типу, а не сканирует файловую систему.",
		);
	} else if (flags.isWorkstationProfile) {
		warnings.add(
			"След установленной системы не является путем к данным; проверка строит план разбора по типу старого приложения и внутреннему отпечатку.",
		);
	} else if (flags.isWorkstationSignal) {
		warnings.add(
			"Системный след рабочей станции не является путем к данным; проверка строит план разбора по профилю старой программы и внутреннему отпечатку.",
		);
	} else if (flags.isUrl) {
		warnings.add(
			"Сетевой адрес не сканируется как локальный диск; проверка строит только план разбора.",
		);
	}
}

export async function scanMigrationProbeDirectory(
	normalizedSourceRef: string,
	input: MigrationLocalSourceProbeRequest,
	counts: ReturnType<typeof emptyMigrationProbeCounts>,
	formatSignals: Set<string>,
	artifactSamples: MigrationProbeArtifact[],
	warnings: Set<string>,
	vendorInputs: string[],
	initialLatestModifiedAt: string | null,
	initialScannedFolders: number,
	initialScannedFiles: number,
) {
	let latestModifiedAt = initialLatestModifiedAt;
	let scannedFolders = initialScannedFolders;
	let scannedFiles = initialScannedFiles;

	const queue = [{ folderPath: normalizedSourceRef, depth: 0 }];
	const visited = new Set<string>();

	while (
		queue.length &&
		scannedFolders < input.maxFolders &&
		scannedFiles < input.maxFiles
	) {
		const current = queue.shift();
		if (!current) break;
		const key = current.folderPath.toLowerCase();
		if (visited.has(key)) continue;
		visited.add(key);
		scannedFolders += 1;

		let entries: Dirent[];
		try {
			entries = await readdir(current.folderPath, { withFileTypes: true });
		} catch (err) {
			console.error("[Dente] context:", err);
			warnings.add(
				"Одну подпапку проверки не удалось прочитать; она пропущена.",
			);
			continue;
		}

		const orderedEntries = [...entries].sort(
			(left, right) =>
				migrationDiscoveryEntryPriority(right, current.folderPath) -
					migrationDiscoveryEntryPriority(left, current.folderPath) ||
				left.name.toString().localeCompare(right.name.toString()),
		);
		for (const entry of orderedEntries) {
			const entryName = entry.name.toString();
			const fullPath = path.join(current.folderPath, entryName);
			vendorInputs.push(entryName);
			if (entry.isDirectory()) {
				if (shouldSkipMigrationDiscoveryDirectory(entryName)) continue;
				if (
					current.depth < input.maxDepth &&
					queue.length + scannedFolders < input.maxFolders
				) {
					const nextItem = { folderPath: fullPath, depth: current.depth + 1 };
					if (migrationDirectoryPriority(fullPath) >= 2)
						queue.unshift(nextItem);
					else queue.push(nextItem);
				}
				continue;
			}
			if (!entry.isFile()) continue;
			if (scannedFiles >= input.maxFiles) {
				warnings.add(
					`Проверка источника остановлена после ${input.maxFiles} файлов; выберите папку ближе к старой программе для более точной инвентаризации.`,
				);
				break;
			}
			scannedFiles += 1;
			try {
				const modified = (await stat(fullPath)).mtime.toISOString();
				if (!latestModifiedAt || modified > latestModifiedAt)
					latestModifiedAt = modified;
			} catch (err) {
				console.error("[Dente] context:", err);
				// Metadata is best-effort only.
			}
			await inspectMigrationProbeFile({
				filePath: fullPath,
				depth: current.depth,
				readHeaderBytes: input.readHeaderBytes,
				counts,
				formatSignals,
				artifactSamples,
				maxSampleArtifacts: input.maxSampleArtifacts,
				warnings,
			});
		}
	}
	if (queue.length)
		warnings.add(
			`Проверка источника остановлена после ${input.maxFolders} папок; выберите папку ближе к старой программе для более точной инвентаризации.`,
		);

	return { latestModifiedAt, scannedFolders, scannedFiles };
}

export async function buildMigrationLocalSourceProbe(
	input: MigrationLocalSourceProbeRequest,
) {
	const routeRef = resolveMigrationSourceRoute(input.sourceRef);
	const sourceRef = routeRef.sourceRef;
	const isUrl = /^https?:\/\//i.test(sourceRef);
	const isBrowserManifest = /^browser-local:[a-f0-9]{8,12}$/i.test(sourceRef);
	const isSmartPreviewSource = /^smart-preview:[a-f0-9]{8,12}$/i.test(
		sourceRef,
	);
	const isWorkstationProfile = /^workstation-profile:[a-f0-9]{8,12}$/i.test(
		sourceRef,
	);
	const isWorkstationSignal = /^workstation-signal:[a-f0-9]{8,12}$/i.test(
		sourceRef,
	);
	const isWorkstationTrace = isWorkstationProfile || isWorkstationSignal;
	const isBrowserLikeManifest = isBrowserManifest || isSmartPreviewSource;
	const normalizedSourceRef =
		isUrl ||
		sourceRef.startsWith("\\\\") ||
		isBrowserLikeManifest ||
		isWorkstationTrace ||
		routeRef.routeExpired
			? sourceRef
			: path.resolve(sourceRef);
	const inferredKind =
		input.sourceKind ??
		routeRef.route?.sourceKind ??
		detectLegacySourceKind(normalizedSourceRef, normalizedSourceRef);
	const playbook = legacySourcePlaybook(inferredKind);
	const sourceFingerprint = migrationFingerprint(normalizedSourceRef);
	const safeDisplayName =
		input.safeDisplayName?.trim() ||
		routeRef.route?.safeDisplayName ||
		migrationSafeAlias(inferredKind, normalizedSourceRef);
	const vendorGuidance = migrationVendorGuidanceMatches(
		`${safeDisplayName} ${routeRef.routeExpired ? "" : normalizedSourceRef}`,
	).slice(0, 2);
	const counts = emptyMigrationProbeCounts();
	const warnings = new Set<string>();
	const formatSignals = new Set<string>();
	const artifactSamples: MigrationProbeArtifact[] = [];
	const vendorInputs: string[] = routeRef.routeExpired
		? [safeDisplayName]
		: [normalizedSourceRef];
	let sourceExists =
		!routeRef.routeExpired &&
		(isUrl || isBrowserLikeManifest || isWorkstationTrace);
	let sourceIsDirectory = false;
	let sourceByteSize: number | null = null;
	let latestModifiedAt: string | null = null;
	let scannedFolders = 0;
	let scannedFiles = 0;

	addMigrationProbeWarnings(warnings, {
		routeExpired: routeRef.routeExpired,
		routeToken: routeRef.routeToken,
		isBrowserManifest,
		isSmartPreviewSource,
		isWorkstationProfile,
		isWorkstationSignal,
		isUrl,
	});

	if (
		!routeRef.routeExpired &&
		!isBrowserManifest &&
		!isSmartPreviewSource &&
		!isWorkstationProfile &&
		!isWorkstationSignal &&
		!isUrl
	) {
		try {
			const stat = statSync(normalizedSourceRef);
			sourceExists = true;
			sourceIsDirectory = stat.isDirectory();
			sourceByteSize = stat.isFile() ? stat.size : null;
			latestModifiedAt = stat.mtime.toISOString();
		} catch (err) {
			console.error("[Dente] context:", err);
			sourceExists = false;
			warnings.add(
				"Источник сейчас недоступен; подключите диск/сетевую папку и повторите проверку.",
			);
		}
	}

	if (
		sourceExists &&
		!isUrl &&
		!isBrowserLikeManifest &&
		!isWorkstationTrace &&
		!sourceIsDirectory
	) {
		scannedFiles = 1;
		await inspectMigrationProbeFile({
			filePath: normalizedSourceRef,
			depth: 0,
			readHeaderBytes: input.readHeaderBytes,
			counts,
			formatSignals,
			artifactSamples,
			maxSampleArtifacts: input.maxSampleArtifacts,
			warnings,
		});
	}

	if (
		sourceExists &&
		!isUrl &&
		!isBrowserLikeManifest &&
		!isWorkstationTrace &&
		sourceIsDirectory
	) {
		const scanResult = await scanMigrationProbeDirectory(
			normalizedSourceRef,
			input,
			counts,
			formatSignals,
			artifactSamples,
			warnings,
			vendorInputs,
			latestModifiedAt,
			scannedFolders,
			scannedFiles,
		);
		latestModifiedAt = scanResult.latestModifiedAt;
		scannedFolders = scanResult.scannedFolders;
		scannedFiles = scanResult.scannedFiles;
	}

	const formatSignalList = uniqueStrings(Array.from(formatSignals));
	vendorGuidance.forEach((guidance) => {
		formatSignalList.push(`профиль старой программы ${guidance.label}`);
		warnings.add(`Профиль ${guidance.label}: ${guidance.nextAction}`);
	});
	const adapters = migrationProbeAdapters({
		sourceKind: inferredKind,
		sourceExists,
		counts,
		formatSignals: formatSignalList,
	});
	const sourceLabel = isUrl
		? "Сетевой адрес"
		: isBrowserManifest
			? "Браузерный список"
			: isSmartPreviewSource
				? "Строка предпросмотра"
				: isWorkstationProfile
					? "След установленной системы"
					: isWorkstationSignal
						? "Системный след рабочей станции"
						: sourceIsDirectory
							? "Локальная папка"
							: sourceExists
								? "Локальный файл"
								: "Недоступный источник";
	const bestAdapter = adapters[0];
	const handoffs = migrationWorkupHandoffs(inferredKind);
	const readiness = buildMigrationReadiness({
		sourceKind: inferredKind,
		sourceExists,
		sourceLabel,
		sourceIsDirectory,
		automationLevel: playbook.automationLevel,
		adapters,
		handoffs,
		counts,
		scannedFiles,
		isBrowserManifest: isBrowserLikeManifest,
		isSmartPreviewSource,
		isWorkstationProfile: isWorkstationTrace,
		isUrl,
		nextAction: bestAdapter?.nextAction ?? playbook.nextAction,
	});
	const bridgeKit = buildMigrationBridgeKit({
		sourceKind: inferredKind,
		sourceLabel,
		sourceExists,
		safeDisplayName,
		readiness,
		adapters,
		handoffs,
		isBrowserManifest,
		isSmartPreviewSource,
		isWorkstationProfile: isWorkstationTrace,
		isUrl,
	});

	return migrationLocalSourceProbeResponseSchema.parse({
		version: "dental-crm-migration-source-probe-v1",
		generatedAt: new Date().toISOString(),
		safeDisplayName,
		sourceKind: inferredKind,
		sourceFingerprint,
		sourceLabel,
		sourceExists,
		sourceIsDirectory,
		sourceByteSize,
		latestModifiedAt,
		scannedFolders,
		scannedFiles,
		counts,
		formatSignals: formatSignalList,
		detectedVendors: detectMigrationProbeVendors(vendorInputs),
		artifactSamples,
		adapters,
		handoffs,
		warnings: Array.from(warnings),
		privacyWarnings: [
			playbook.privacy,
			"Проверка читает только ограниченный список и заголовки; публичный поиск клиники не получает пациентов, снимки, файлы базы или локальные пути.",
		],
		recommendedRoute: bestAdapter
			? `${bestAdapter.title}: ${bestAdapter.output}`
			: playbook.recommendedRoute,
		readiness,
		bridgeKit,
		nextAction: bestAdapter?.nextAction ?? playbook.nextAction,
	});
}

