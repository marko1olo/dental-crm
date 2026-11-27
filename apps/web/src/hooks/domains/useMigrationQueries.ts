import type { ChangeEvent } from "react";
import type {
	DocumentIngestionResponse,
	MigrationLocalSourceDiscoveryCandidate,
	MigrationLocalSourceDiscoveryResponse,
	MigrationLocalSourceWorkupResponse,
	SmartImportLegacySourceKind,
	SmartImportPreviewResponse,
} from "@dental/shared";
import { useAppStore } from "../../store/appStore";
import { useDocumentStore } from "../../store/documentStore";
import { logger } from "../../utils/logger";
import { fetchWithHandling } from "../../utils/networkUtils";

export interface MigrationAuthOptions {
	denteClinicalMutationHeaders?: (extra?: Record<string, string>) => Record<string, string>;
	denteClinicalReadHeaders?: (extra?: Record<string, string>) => Record<string, string>;
	[key: string]: unknown;
}

export interface UseMigrationQueriesOptions {
	auth?: MigrationAuthOptions | null | undefined;
	clinicalMutationHeaders?: ((extra?: Record<string, string>) => Record<string, string>) | undefined;
	clinicalReadHeaders?: ((extra?: Record<string, string>) => Record<string, string>) | undefined;
}

export function useMigrationQueries(options?: UseMigrationQueriesOptions) {
	const auth = options?.auth;
	const clinicalMutationHeaders = options?.clinicalMutationHeaders;
	const clinicalReadHeaders = options?.clinicalReadHeaders;

	const getHeaders = (isMutation: boolean, extra?: Record<string, string>): Record<string, string> => {
		if (auth) {
			if (isMutation && typeof auth.denteClinicalMutationHeaders === "function") {
				return auth.denteClinicalMutationHeaders(extra);
			}
			if (!isMutation && typeof auth.denteClinicalReadHeaders === "function") {
				return auth.denteClinicalReadHeaders(extra);
			}
		}
		if (isMutation && clinicalMutationHeaders) {
			return clinicalMutationHeaders(extra);
		}
		if (!isMutation && clinicalReadHeaders) {
			return clinicalReadHeaders(extra);
		}
		return extra || {};
	};

	const uploadFile = async (file: File) => {
		return fetchWithHandling("/api/migration/upload", {
			method: "POST",
			headers: getHeaders(true, {
				"content-type": "application/octet-stream",
				"x-migration-file-name": encodeURIComponent(file.name),
			}),
			body: file,
		});
	};

	const mapColumns = async (runId: string, useLlm: boolean) => {
		return fetchWithHandling(`/api/migration/${runId}/map`, {
			method: "POST",
			headers: getHeaders(true, { "content-type": "application/json" }),
			body: JSON.stringify({ allowLlm: useLlm }),
		});
	};

	const getStatus = async (runId: string) => {
		return fetchWithHandling(`/api/migration/${runId}`, {
			headers: getHeaders(false),
		});
	};

	const getReconciliation = async (runId: string) => {
		return fetchWithHandling(`/api/migration/${runId}/reconciliation`, {
			headers: getHeaders(false),
		});
	};

	const execute = async (runId: string, dryRun: boolean) => {
		return fetchWithHandling(`/api/migration/${runId}/execute`, {
			method: "POST",
			headers: getHeaders(true, { "content-type": "application/json" }),
			body: JSON.stringify({ dryRun, sourceSystem: "legacy" }),
		});
	};

	const rollback = async (runId: string) => {
		return fetchWithHandling("/api/migration/rollback", {
			method: "POST",
			headers: getHeaders(true, { "content-type": "application/json" }),
			body: JSON.stringify({ runId, confirm: true }),
		});
	};

	const discover = async () => {
		return fetchWithHandling("/api/migration/discover", {
			method: "POST",
			headers: getHeaders(true, { "content-type": "application/json" }),
			body: JSON.stringify({ roots: [], maxDepth: 5, timeBudgetMs: 30000 }),
		});
	};

	const pickBrowserMigrationSource = () => {
		const el = document.querySelector<HTMLInputElement>(
			'[data-testid="browser-migration-folder-input"]',
		);
		if (el) el.click();
	};
	const planMigrationDiscoveryCandidate = async (candidate: unknown) => {
		return fetchWithHandling("/api/imports/smart/local-source-workup", {
			method: "POST",
			headers: getHeaders(true, { "content-type": "application/json" }),
			body: JSON.stringify({ candidate }),
		});
	};
	const previewMigrationDiscoveryCandidate = async (candidate: unknown) => {
		const store = useAppStore.getState();
		const c = (candidate && typeof candidate === "object" ? candidate : {}) as Partial<MigrationLocalSourceDiscoveryCandidate>;
		const rawText = String(c.smartImportLine ?? c.sourceLabel ?? "").trim();
		if (!rawText) return null;

		store.setIsSmartImportLoading(true);
		store.setError(null);
		try {
			const [workupRes, previewRes] = await Promise.all([
				fetchWithHandling("/api/imports/smart/local-source-workup", {
					method: "POST",
					headers: getHeaders(true, { "content-type": "application/json" }),
					body: JSON.stringify({ candidate }),
				}),
				fetchWithHandling("/api/imports/smart/preview", {
					method: "POST",
					headers: getHeaders(false, { "content-type": "application/json" }),
					body: JSON.stringify({
						sourceName: c.safeDisplayName || c.sourceLabel || "Локальный источник",
						rawText,
						mode: store.smartImportMode || "auto",
					}),
				}),
			]);
			if (workupRes.ok) {
				const wJson = (await workupRes.json()) as { data?: MigrationLocalSourceWorkupResponse } | MigrationLocalSourceWorkupResponse;
				const workup = ("data" in wJson && wJson.data ? wJson.data : wJson) as MigrationLocalSourceWorkupResponse;
				store.setMigrationSourceWorkup(workup);
			}
			if (!previewRes.ok) {
				throw new Error(`Ошибка предпросмотра источника (HTTP ${previewRes.status})`);
			}
			const pJson = (await previewRes.json()) as { data?: SmartImportPreviewResponse } | SmartImportPreviewResponse;
			const preview = ("data" in pJson && pJson.data ? pJson.data : pJson) as SmartImportPreviewResponse;
			store.setSmartImportText(rawText);
			store.setSmartImportPreview(preview);
			store.setSmartImportCommit(null);
			return preview;
		} catch (err) {
			const message = err instanceof Error ? err.message : "Не удалось построить предпросмотр источника";
			logger.error("previewMigrationDiscoveryCandidate error", err);
			store.setError(message);
			return null;
		} finally {
			useAppStore.getState().setIsSmartImportLoading(false);
		}
	};

	const previewMigrationAutopilotSources = async (
		sourceFingerprint?: string | null,
	) => {
		const store = useAppStore.getState();
		const candidates = [
			...(store.migrationSourceDiscovery?.candidates ?? []),
			...(store.browserMigrationDiscovery?.candidates ?? []),
		];
		const matched = sourceFingerprint
			? candidates.find((c) => c.sourceFingerprint === sourceFingerprint)
			: candidates[0];
		if (matched) {
			return previewMigrationDiscoveryCandidate(matched);
		}
		const fallbackText = store.smartImportText.trim();
		if (!fallbackText) return null;
		store.setIsSmartImportLoading(true);
		try {
			const res = await fetchWithHandling("/api/imports/smart/preview", {
				method: "POST",
				headers: getHeaders(false, { "content-type": "application/json" }),
				body: JSON.stringify({
					sourceName: "Автопилот миграции",
					rawText: fallbackText,
					mode: store.smartImportMode || "auto",
				}),
			});
			if (!res.ok) {
				throw new Error(`Ошибка предпросмотра автопилота (HTTP ${res.status})`);
			}
			const json = (await res.json()) as { data?: SmartImportPreviewResponse } | SmartImportPreviewResponse;
			const preview = ("data" in json && json.data ? json.data : json) as SmartImportPreviewResponse;
			store.setSmartImportPreview(preview);
			return preview;
		} catch (err) {
			logger.error("previewMigrationAutopilotSources error", err);
			store.setError(err instanceof Error ? err.message : "Ошибка предпросмотра автопилота");
			return null;
		} finally {
			useAppStore.getState().setIsSmartImportLoading(false);
		}
	};
	const probeMigrationDiscoveryCandidate = async (candidate: unknown) => {
		return fetchWithHandling("/api/imports/smart/local-source-probe", {
			method: "POST",
			headers: getHeaders(true, { "content-type": "application/json" }),
			body: JSON.stringify({ candidate }),
		});
	};
	const previewImport = async (payload?: unknown) => {
		return fetchWithHandling("/api/imports/patients/intake", {
			method: "POST",
			headers: getHeaders(false, { "content-type": "application/json" }),
			body: JSON.stringify(payload ?? {}),
		});
	};
	const previewSmartImport = async (payload?: unknown) => {
		return fetchWithHandling("/api/imports/smart/preview", {
			method: "POST",
			headers: getHeaders(false, { "content-type": "application/json" }),
			body: JSON.stringify(payload ?? {}),
		});
	};
	const commitImport = async (payload?: unknown) => {
		return fetchWithHandling("/api/imports/patients/commit", {
			method: "POST",
			headers: getHeaders(true, { "content-type": "application/json" }),
			body: JSON.stringify(payload ?? {}),
		});
	};
	const commitSmartImport = async (payload?: unknown) => {
		return fetchWithHandling("/api/imports/smart/commit", {
			method: "POST",
			headers: getHeaders(true, { "content-type": "application/json" }),
			body: JSON.stringify(payload ?? {}),
		});
	};
	const discoverMigrationSources = async () => {
		return fetchWithHandling("/api/imports/smart/local-source-discovery", {
			method: "POST",
			headers: getHeaders(true, { "content-type": "application/json" }),
		});
	};
	const downloadMigrationHandoffReport = async (payload?: unknown) => {
		try {
			const res = await fetchWithHandling(
				"/api/imports/smart/migration-autopilot/report.csv",
				{
					method: "POST",
					headers: getHeaders(true, { "content-type": "application/json" }),
					body: JSON.stringify(payload ?? {}),
				},
			);
			if (!res.ok) throw new Error("Failed to download report");
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "migration_autopilot_handoff.csv";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (e) {
			logger.error("downloadMigrationHandoffReport error", e);
		}
	};
	const downloadSmartImportSafeHandoffReport = async (payload?: unknown) => {
		try {
			const res = await fetchWithHandling(
				"/api/imports/smart/report.safe.csv",
				{
					method: "POST",
					headers: getHeaders(true, { "content-type": "application/json" }),
					body: JSON.stringify(payload ?? {}),
				},
			);
			if (!res.ok) throw new Error("Failed to download safe report");
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "smart_import_safe_handoff.csv";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (e) {
			logger.error("downloadSmartImportSafeHandoffReport error", e);
		}
	};
	const downloadSmartImportReport = async (payload?: unknown) => {
		try {
			const res = await fetchWithHandling("/api/imports/smart/report.csv", {
				method: "POST",
				headers: getHeaders(true, { "content-type": "application/json" }),
				body: JSON.stringify(payload ?? {}),
			});
			if (!res.ok) throw new Error("Failed to download report");
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "smart_import_report.csv";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (e) {
			logger.error("downloadSmartImportReport error", e);
		}
	};
	const handleBrowserMigrationInputChange = async (
		eventOrFiles: ChangeEvent<HTMLInputElement> | FileList | File[] | null | undefined,
	) => {
		const rawFiles =
			eventOrFiles &&
			typeof eventOrFiles === "object" &&
			"target" in eventOrFiles &&
			eventOrFiles.target
				? eventOrFiles.target.files
				: eventOrFiles;
		const fileList: File[] = rawFiles ? Array.from(rawFiles as ArrayLike<File>) : [];
		if (fileList.length === 0) return null;

		const store = useAppStore.getState();
		const scanStartedAtMs = Date.now();
		const scanStartedAt = new Date(scanStartedAtMs).toISOString();
		store.setIsBrowserMigrationScanning(true);
		store.setBrowserMigrationScanProgress({
			rootName: "Выбранная папка браузера",
			sourceKind: "browser_file_input",
			phase: "scanning",
			currentItem: "Выбранная папка браузера",
			scannedFolders: 0,
			scannedFiles: 0,
			databaseFiles: 0,
			dumpFiles: 0,
			tableFiles: 0,
			archiveFiles: 0,
			dicomLikeFiles: 0,
			imageFiles: 0,
			modelFiles: 0,
			totalBytes: 0,
			warnings: [],
			startedAt: scanStartedAt,
			updatedAt: scanStartedAt,
			elapsedMs: 0,
			processedUnits: 0,
			fileLimit: 1200,
			folderLimit: 320,
			magicReadLimit: 0,
		});

		try {
			const folderGroups = new Map<string, File[]>();
			for (const file of fileList) {
				const relPath =
					(file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
				const topFolder = relPath.includes("/") ? (relPath.split("/")[0] || "Выгрузка") : "Файлы";
				const group = folderGroups.get(topFolder) ?? [];
				group.push(file);
				folderGroups.set(topFolder, group);
			}

			const candidates: MigrationLocalSourceDiscoveryCandidate[] = [];
			let totalDatabaseFiles = 0;
			let totalDumpFiles = 0;
			let totalTableFiles = 0;
			let totalArchiveFiles = 0;
			let totalDicomLikeFiles = 0;
			let totalImageFiles = 0;
			let totalBytes = 0;
			let groupIdx = 0;
			for (const [folderName, files] of folderGroups.entries()) {
				groupIdx += 1;
				let databaseFiles = 0;
				let dumpFiles = 0;
				let tableFiles = 0;
				let archiveFiles = 0;
				let dicomLikeFiles = 0;
				let imageFiles = 0;
				let hasDicomDir = false;
				let latestMs = 0;

				for (const f of files) {
					totalBytes += f.size || 0;
					const lower = f.name.toLowerCase();
					if (f.lastModified > latestMs) latestMs = f.lastModified;
					if (lower === "dicomdir") hasDicomDir = true;
					if (/\.(fdb|gdb|mdb|accdb|db|sqlite|sqlite3|mdf|ldf|bak)$/.test(lower)) databaseFiles += 1;
					else if (/\.(sql|dump|bak)$/.test(lower)) dumpFiles += 1;
					else if (/\.(csv|tsv|xlsx|xls|ods)$/.test(lower)) tableFiles += 1;
					else if (/\.(zip|rar|7z|tar|gz)$/.test(lower)) archiveFiles += 1;
					else if (/\.(dcm|dicom|ima|rvg)$/.test(lower) || lower === "dicomdir") dicomLikeFiles += 1;
					else if (/\.(png|jpg|jpeg|webp|heic|tif|tiff|bmp)$/.test(lower)) imageFiles += 1;
				}

				totalDatabaseFiles += databaseFiles;
				totalDumpFiles += dumpFiles;
				totalTableFiles += tableFiles;
				totalArchiveFiles += archiveFiles;
				totalDicomLikeFiles += dicomLikeFiles;
				totalImageFiles += imageFiles;
				const matched = databaseFiles + dumpFiles + tableFiles + archiveFiles + dicomLikeFiles + imageFiles;
				let sourceKind: SmartImportLegacySourceKind = "unknown_legacy_source";
				if (dicomLikeFiles > 0) sourceKind = "dicom_folder";
				else if (databaseFiles > 0) sourceKind = "mis_database";
				else if (dumpFiles > 0) sourceKind = "sql_dump";
				else if (tableFiles > 0) sourceKind = "spreadsheet_export";
				else if (archiveFiles > 0) sourceKind = "archive_export";

				candidates.push({
					sourceRef: `browser-local:${folderName}`,
					safeDisplayName: folderName,
					sourceKind,
					sourceLabel: folderName,
					sourceFingerprint: `browser-${groupIdx}-${files.length}`,
					depth: 1,
					confidence: matched > 0 ? 0.85 : 0.4,
					matchedFiles: matched || files.length,
					databaseFiles,
					dumpFiles,
					tableFiles,
					archiveFiles,
					dicomLikeFiles,
					imageFiles,
					hasDicomDir,
					latestModifiedAt: latestMs > 0 ? new Date(latestMs).toISOString() : null,
					reasons: [
						`Отобрано файлов: ${files.length}`,
						...(tableFiles > 0 ? [`Таблицы: ${tableFiles}`] : []),
						...(dicomLikeFiles > 0 ? [`Снимки/DICOM: ${dicomLikeFiles}`] : []),
						...(databaseFiles > 0 ? [`Базы данных: ${databaseFiles}`] : []),
					],
					warnings: [],
					smartImportLine: `${sourceKind}:${folderName} (${files.length} файлов)`,
				});
			}

			const response: MigrationLocalSourceDiscoveryResponse = {
				version: "dental-crm-migration-local-discovery-v1",
				generatedAt: new Date().toISOString(),
				roots: Array.from(folderGroups.keys()),
				scannedFolders: folderGroups.size,
				candidates,
				warnings: [],
				nextAction:
					candidates.length > 0
						? "Выберите найденный источник для проверки или предпросмотра."
						: "В выбранной папке не обнаружено поддерживаемых файлов.",
			};

			const finishedAtMs = Date.now();
			store.setBrowserMigrationDiscovery(response);
			store.setBrowserMigrationScanProgress({
				rootName: "Выбранная папка браузера",
				sourceKind: "browser_file_input",
				phase: "done",
				currentItem: null,
				scannedFolders: folderGroups.size,
				scannedFiles: fileList.length,
				databaseFiles: totalDatabaseFiles,
				dumpFiles: totalDumpFiles,
				tableFiles: totalTableFiles,
				archiveFiles: totalArchiveFiles,
				dicomLikeFiles: totalDicomLikeFiles,
				imageFiles: totalImageFiles,
				modelFiles: 0,
				totalBytes,
				warnings: [],
				startedAt: scanStartedAt,
				updatedAt: new Date(finishedAtMs).toISOString(),
				elapsedMs: Math.max(1, finishedAtMs - scanStartedAtMs),
				processedUnits: fileList.length,
				fileLimit: 1200,
				folderLimit: 320,
				magicReadLimit: 0,
			});
			return response;
		} finally {
			useAppStore.getState().setIsBrowserMigrationScanning(false);
		}
	};

	const ingestImportFile = async (file: File | Blob | null | undefined) => {
		if (!file) return null;
		const appStore = useAppStore.getState();
		const docStore = useDocumentStore.getState();
		const target = docStore.documentIngestionTarget || "patients";
		const fileName = file instanceof File ? file.name : "import_document.txt";
		const mimeType = file.type || null;

		try {
			const buf = await file.arrayBuffer();
			let binary = "";
			const bytes = new Uint8Array(buf);
			const chunkSize = 0x8000;
			for (let i = 0; i < bytes.length; i += chunkSize) {
				binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
			}
			const fileBase64 = btoa(binary);

			const res = await fetchWithHandling("/api/ingestion/extract", {
				method: "POST",
				headers: getHeaders(true, { "content-type": "application/json" }),
				body: JSON.stringify({
					fileName,
					mimeType,
					fileBase64,
					target,
				}),
			});
			if (!res.ok) {
				throw new Error(`Ошибка разбора файла (HTTP ${res.status})`);
			}
			const json = (await res.json()) as { data?: DocumentIngestionResponse } | DocumentIngestionResponse;
			const ingestion = ("data" in json && json.data ? json.data : json) as DocumentIngestionResponse;
			docStore.setDocumentIngestion(ingestion);

			if (ingestion.extractedText) {
				if (target === "pricelist") {
					appStore.setPricelistText(ingestion.extractedText);
				} else if (target === "smart_import") {
					appStore.setSmartImportText(ingestion.extractedText);
				} else {
					appStore.setImportText(ingestion.extractedText);
					appStore.setImportPreview(null);
					appStore.setImportCommit(null);
				}
			}
			return ingestion;
		} catch (err) {
			logger.error("ingestImportFile error", err);
			appStore.setError(err instanceof Error ? err.message : "Не удалось разобрать загруженный файл");
			return null;
		}
	};

	const addMigrationDiscoveryCandidateToSmartImport = (candidate: unknown) => {
		const store = useAppStore.getState();
		const c = (candidate && typeof candidate === "object" ? candidate : {}) as Partial<MigrationLocalSourceDiscoveryCandidate>;
		const line = String(
			c.smartImportLine ||
				(c.sourceKind && c.sourceLabel ? `${c.sourceKind}:${c.sourceLabel}` : c.sourceLabel || ""),
		).trim();
		if (!line) return;
		const existing = store.smartImportText.trim();
		store.setSmartImportText(existing ? `${existing}\n${line}` : line);
		store.setSmartImportPreview(null);
		store.setSmartImportCommit(null);
	};
	const runMigrationAutopilot = async (
		knownDiscovery?: unknown,
		options?: unknown,
	) => {
		return fetchWithHandling("/api/imports/smart/migration-autopilot", {
			method: "POST",
			headers: getHeaders(true, { "content-type": "application/json" }),
			body: JSON.stringify({ knownDiscovery, options }),
		});
	};

	return {
		uploadFile,
		mapColumns,
		getStatus,
		getReconciliation,
		execute,
		rollback,
		discover,
		pickBrowserMigrationSource,
		planMigrationDiscoveryCandidate,
		previewMigrationDiscoveryCandidate,
		previewMigrationAutopilotSources,
		probeMigrationDiscoveryCandidate,
		previewImport,
		previewSmartImport,
		addMigrationDiscoveryCandidateToSmartImport,
		runMigrationAutopilot,
		commitImport,
		commitSmartImport,
		discoverMigrationSources,
		downloadMigrationHandoffReport,
		downloadSmartImportSafeHandoffReport,
		downloadSmartImportReport,
		handleBrowserMigrationInputChange,
		ingestImportFile,
	};
}
