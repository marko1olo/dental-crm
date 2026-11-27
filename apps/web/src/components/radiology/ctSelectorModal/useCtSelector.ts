import { useCallback, useEffect, useRef, useState } from "react";
import * as fflate from "fflate";
import { showToast } from "../../GlobalToast";
import { denteClinicalReadHeaders } from "../../../lib/denteRequestHeaders";
import { logger } from "../../../utils/logger";
import {
	getDicomImageLoader,
	purgeDicomImageLoader,
} from "../../dicom/archiveUploader/dicomStowUploader";
import {
	isDicomEntry,
	isDicomdirEntry,
	sortDicomEntries,
} from "../../dicom/dicomArchiveFilter";
import {
	detectExternalCtViewers,
	isDesktopApp,
	openCbctPopoutWindow,
	openInExternalViewer,
	scanDownloadsForCt,
	type DesktopCtDownloadItem,
	type DesktopExternalViewerInfo,
} from "../../../native/desktopBridge";
import type { CtLaunchMode, CtRecentStudyItem, CtSelectorModalProps } from "./types";
import type { ImagingStudy } from "@dental/shared";

const BATCH_PROCESSING_CHUNK_SIZE = 50;

export function useCtSelector(props: CtSelectorModalProps) {
	const {
		isOpen,
		onClose,
		patientId,
		patientName,
		cardNumber,
		studies: propStudies,
		onSelectStudy,
		onOpenCbctStudio,
		onImagesLoaded,
	} = props;

	// Mode selector state
	const [launchMode, setLaunchMode] = useState<CtLaunchMode>("crm_window");

	// Downloads intake state
	const [downloads, setDownloads] = useState<DesktopCtDownloadItem[]>([]);
	const [isScanningDownloads, setIsScanningDownloads] = useState<boolean>(false);
	const [externalViewers, setExternalViewers] = useState<DesktopExternalViewerInfo[]>([]);
	const [selectedViewerId, setSelectedViewerId] = useState<string>("picasso");

	// Drag & Drop / Extraction state
	const [isDragOver, setIsDragOver] = useState<boolean>(false);
	const [isExtracting, setIsExtracting] = useState<boolean>(false);
	const [extractionStatus, setExtractionStatus] = useState<string>("");
	const [extractionPercent, setExtractionPercent] = useState<number | null>(null);

	// Recent Patient Studies State
	const [patientStudies, setPatientStudies] = useState<readonly CtRecentStudyItem[]>(propStudies ?? []);
	const [isLoadingStudies, setIsLoadingStudies] = useState<boolean>(false);

	const isDesktop = isDesktopApp();

	// Scan downloads
	const refreshDownloads = useCallback(async () => {
		setIsScanningDownloads(true);
		try {
			const items = await scanDownloadsForCt();
			const mapped: DesktopCtDownloadItem[] = items.map((it, idx) => ({
				id: `dl-${idx}-${it.fileName}`,
				fileName: it.fileName,
				filePath: it.path,
				fileSizeBytes: it.sizeBytes,
				detectedAtIso: it.createdAt,
				patientName: it.patientHint || "Неизвестный пациент",
				modality: "cbct",
				source: "downloads",
				isZip: it.fileName.toLowerCase().endsWith(".zip"),
			}));
			setDownloads(mapped);
		} catch (err) {
			logger.warn("[CtSelectorModal] Scan downloads error:", err);
			setDownloads([]);
		} finally {
			setIsScanningDownloads(false);
		}
	}, []);

	// Initial load + AbortController + DICOM memory cleanup on cancel/unmount
	const launchedInCrmRef = useRef(false);
	const fallbackBlobUrlsRef = useRef<Set<string>>(new Set());

	const revokeFallbackBlobUrls = useCallback(() => {
		if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
			for (const url of fallbackBlobUrlsRef.current) {
				URL.revokeObjectURL(url);
			}
		}
		fallbackBlobUrlsRef.current.clear();
	}, []);

	useEffect(() => {
		if (!isOpen) {
			if (!launchedInCrmRef.current) {
				purgeDicomImageLoader();
				revokeFallbackBlobUrls();
			}
			return;
		}

		launchedInCrmRef.current = false;
		const abortController = new AbortController();

		void refreshDownloads();

		void detectExternalCtViewers().then((viewers) => {
			if (abortController.signal.aborted) return;
			setExternalViewers(viewers);
			if (viewers.length > 0) {
				const available = viewers.find((v) => v.isAvailable);
				if (available) {
					setSelectedViewerId(available.id);
				} else if (viewers[0]) {
					setSelectedViewerId(viewers[0].id);
				}
			}
		});

		// Load patient studies if not passed via props
		if (!propStudies && patientId) {
			setIsLoadingStudies(true);
			fetch(`/api/imaging/studies?patientId=${encodeURIComponent(patientId)}`, {
				headers: denteClinicalReadHeaders(),
				signal: abortController.signal,
			})
				.then((res) => (res.ok ? res.json() : []))
				.then((data) => {
					if (abortController.signal.aborted) return;
					if (Array.isArray(data)) {
						const cbctOnly = data.filter(
							(s) => s.kind === "cbct" || s.kind === "ct" || s.modality === "CT",
						);
						setPatientStudies(cbctOnly.length > 0 ? cbctOnly : data);
					}
				})
				.catch((err) => {
					if (abortController.signal.aborted || (err instanceof Error && err.name === "AbortError")) {
						return;
					}
					logger.warn("[CtSelectorModal] Failed to fetch patient studies:", err);
				})
				.finally(() => {
					if (!abortController.signal.aborted) {
						setIsLoadingStudies(false);
					}
				});
		} else if (propStudies) {
			setPatientStudies(propStudies);
		}

		return () => {
			abortController.abort();
		};
	}, [isOpen, refreshDownloads, patientId, propStudies, revokeFallbackBlobUrls]);

	useEffect(() => {
		return () => {
			if (!launchedInCrmRef.current) {
				purgeDicomImageLoader();
				revokeFallbackBlobUrls();
			}
		};
	}, [revokeFallbackBlobUrls]);

	// Close on Escape
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.stopPropagation();
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	// Execute study opening according to chosen mode
	const launchStudy = useCallback(
		async (study: unknown, imageIds?: string[], filePath?: string) => {
			const studyRecord = study && typeof study === "object" ? (study as Record<string, unknown>) : null;
			if (launchMode === "crm_window") {
				launchedInCrmRef.current = true;
				if (onSelectStudy) {
					onSelectStudy(study, "crm_window");
				}
				if (onImagesLoaded && imageIds && imageIds.length > 0) {
					onImagesLoaded(imageIds, study);
				}
				if (onOpenCbctStudio) {
					onOpenCbctStudio(study, imageIds);
				}
				onClose();
			} else if (launchMode === "standalone_window") {
				const studyId = typeof studyRecord?.id === "string" ? studyRecord.id : "quick-ct";
				const res = await openCbctPopoutWindow({
					studyId,
					patientId: patientId || undefined,
					patientName: patientName || undefined,
					title: `3D КТ - ${patientName || "Исследование"}`,
				});
				if (!res.success && res.error) {
					showToast(res.error, "error");
				} else {
					showToast("Окно 3D КТ открыто для внешнего монитора", "success");
					onClose();
				}
			} else if (launchMode === "external_app") {
				const resolvedPath = filePath || (typeof studyRecord?.storagePath === "string" ? studyRecord.storagePath : undefined);
				const res = await openInExternalViewer({
					viewerId: selectedViewerId,
					filePath: resolvedPath,
				});
				if (res.success) {
					showToast("КТ запущено во внешнем просмотрщике", "success");
					onClose();
				} else {
					showToast(res.error || "Не удалось запустить внешний просмотрщик", "error");
				}
			}
		},
		[
			launchMode,
			onSelectStudy,
			onImagesLoaded,
			onOpenCbctStudio,
			onClose,
			patientId,
			patientName,
			selectedViewerId,
		],
	);

	// Parse individual files
	const processFileList = useCallback(
		async (fileList: FileList | File[]) => {
			const files = Array.from(fileList);
			if (files.length === 0) return;

			// Check if single zip file
			const zipFile = files.find(
				(f) =>
					f.name.toLowerCase().endsWith(".zip") ||
					f.type === "application/zip" ||
					f.type === "application/x-zip-compressed",
			);

			if (zipFile && files.length === 1) {
				await processZipFile(zipFile);
				return;
			}

			// Direct DICOM files processing
			setIsExtracting(true);
			setExtractionStatus(`Обработка файлов DICOM (${files.length} шт.)...`);
			setExtractionPercent(0);

			try {
				const imageIds: string[] = [];
				let processed = 0;
				const dicomLoader = await getDicomImageLoader();

				for (const file of files) {
					if (isDicomdirEntry(file.name)) continue;

					// Quick 1KB header check
					const slice = await file.slice(0, 1024).arrayBuffer();
					const u8 = new Uint8Array(slice);

					if (isDicomEntry(file.name, u8)) {
						try {
							let id = dicomLoader?.wadouri?.fileManager?.add(file);
							if (!id) {
								id = URL.createObjectURL(file);
								fallbackBlobUrlsRef.current.add(id);
							}
							imageIds.push(id);
						} catch (err) {
							logger.warn("[CtSelectorModal] Error adding DICOM file:", err);
						}
					}
					processed++;
					setExtractionPercent(Math.round((processed / files.length) * 100));
				}

				if (imageIds.length === 0) {
					showToast("В выбранных файлах не обнаружено валидных срезов DICOM", "error");
					return;
				}

				showToast(`Успешно загружено ${imageIds.length} срезов КТ`, "success");
				const meta = {
					id: `import-${Date.now()}`,
					title: `КТ: ${files[0]?.name || "Импортированная серия"} (${imageIds.length} срезов)`,
					kind: "cbct",
					sliceCount: imageIds.length,
					capturedAt: new Date().toISOString(),
				};

				await launchStudy(meta, imageIds);
			} catch (err) {
				logger.error("[CtSelectorModal] Error reading files:", err);
				showToast("Сбой при разборе файлов исследования", "error");
			} finally {
				setIsExtracting(false);
				setExtractionStatus("");
				setExtractionPercent(null);
			}
		},
		[launchStudy],
	);

	// Process ZIP archive
	const processZipFile = useCallback(
		async (zipFile: File) => {
			setIsExtracting(true);
			setExtractionStatus(`Распаковка архива КТ: ${zipFile.name}...`);
			setExtractionPercent(0);

			let archiveBuffer: Uint8Array | null = null;
			try {
				archiveBuffer = new Uint8Array(await zipFile.arrayBuffer());
			} catch (err) {
				logger.error("[CtSelectorModal] ArrayBuffer failed:", err);
				showToast("Не удалось прочитать файл архива", "error");
				setIsExtracting(false);
				return;
			}

			return new Promise<void>((resolve) => {
				fflate.unzip(archiveBuffer!, async (err: fflate.FlateError | null, unzipped: fflate.Unzipped) => {
					archiveBuffer = null; // Free compressed memory
					if (err) {
						logger.error("[CtSelectorModal] Unzip error:", err);
						showToast("Повреждённый ZIP-архив КТ. Проверьте целостность файла.", "error");
						setIsExtracting(false);
						setExtractionPercent(null);
						resolve();
						return;
					}

					const entries = sortDicomEntries(Object.keys(unzipped));
					const totalFiles = entries.length;

					if (totalFiles === 0) {
						showToast("Архив пуст или не содержит файлов", "error");
						setIsExtracting(false);
						resolve();
						return;
					}

					const imageIds: string[] = [];
					let currentIndex = 0;
					const dicomLoader = await getDicomImageLoader();

					const processNextBatch = () => {
						const batchEnd = Math.min(
							currentIndex + BATCH_PROCESSING_CHUNK_SIZE,
							totalFiles,
						);

						for (let i = currentIndex; i < batchEnd; i++) {
							const filename = entries[i];
							if (!filename) continue;

							if (isDicomdirEntry(filename)) {
								delete unzipped[filename];
								continue;
							}

							const fileData = unzipped[filename];
							if (!fileData) continue;

							if (isDicomEntry(filename, fileData)) {
								const file = new File([fileData.buffer as ArrayBuffer], filename);
								let id = dicomLoader?.wadouri?.fileManager?.add(file);
								if (!id) {
									id = URL.createObjectURL(file);
									fallbackBlobUrlsRef.current.add(id);
								}
								imageIds.push(id);
							}
							delete unzipped[filename]; // Zero-leak GC
						}

						currentIndex = batchEnd;
						const pct = Math.round((currentIndex / totalFiles) * 100);
						setExtractionPercent(pct);
						setExtractionStatus(
							`Обработка срезов КЛКТ: ${currentIndex}/${totalFiles} (найдено ${imageIds.length} DICOM)...`,
						);

						if (currentIndex < totalFiles) {
							setTimeout(processNextBatch, 0);
						} else {
							setIsExtracting(false);
							setExtractionPercent(null);
							setExtractionStatus("");

							if (imageIds.length === 0) {
								showToast(
									"В архиве не найдено корректных срезов КТ/DICOM. Убедитесь, что это архив томограммы.",
									"error",
								);
								resolve();
								return;
							}

							showToast(`Распаковано и загружено ${imageIds.length} срезов КТ`, "success");
							const studyMeta = {
								id: `zip-${Date.now()}`,
								title: `КТ из архива: ${zipFile.name} (${imageIds.length} срезов)`,
								kind: "cbct",
								sliceCount: imageIds.length,
								capturedAt: new Date().toISOString(),
							};

							void launchStudy(studyMeta, imageIds).then(() => resolve());
						}
					};

					processNextBatch();
				});
			});
		},
		[launchStudy],
	);

	// Drag & Drop handlers
	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (!isDragOver) setIsDragOver(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);
	};

	const handleDrop = async (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);

		const items = e.dataTransfer.items;
		if (items && items.length > 0) {
			const files: File[] = [];
			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				if (item && item.kind === "file") {
					const file = item.getAsFile();
					if (file) files.push(file);
				}
			}
			if (files.length > 0) {
				await processFileList(files);
				return;
			}
		}

		if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
			await processFileList(e.dataTransfer.files);
		}
	};


	return {
		launchMode,
		setLaunchMode,
		downloads,
		isScanningDownloads,
		refreshDownloads,
		externalViewers,
		selectedViewerId,
		setSelectedViewerId,
		isDragOver,
		isExtracting,
		extractionStatus,
		extractionPercent,
		patientStudies,
		isLoadingStudies,
		isDesktop,
		launchStudy,
		processFileList,
		processZipFile,
		handleDragOver,
		handleDragLeave,
		handleDrop,
	};
}
