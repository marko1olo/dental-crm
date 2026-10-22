/**
 * useDicomArchiveUploader.ts — хук загрузки, распаковки и синхронизации DICOM/КЛКТ архивов.
 * Mandate 8b: Модульность, строго < 400 строк.
 */

import * as fflate from "fflate";
import { useCallback, useEffect, useRef, useState } from "react";
import { actionFailureToast } from "../../../lib/panelStateText";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import {
	extractDicomHeaderInfo,
	markStudyAsSynced,
	markStudySyncFailed,
	saveLocalDicomStudy,
	startDicomOfflineSyncWatcher,
} from "../dicomOfflineSync";
import {
	isDicomEntry,
	isDicomdirEntry,
	sortDicomEntries,
} from "../dicomArchiveFilter";
import {
	getDicomImageLoader,
	purgeDicomImageLoader,
	uploadDicomFileToStow,
	MAX_SAFE_FILE_SIZE_BYTES,
	BATCH_PROCESSING_CHUNK_SIZE,
} from "./dicomStowUploader";

export interface ParsedDicomResult {
	imageId: string;
	file: File;
}

export interface UseDicomArchiveUploaderProps {
	onImagesLoaded: (imageIds: string[]) => void;
	uploadToServer?: boolean | undefined;
	patientId?: string | null | undefined;
	doctorId?: string | null | undefined;
}

export function useDicomArchiveUploader({
	onImagesLoaded,
	uploadToServer = true,
	patientId,
	doctorId,
}: UseDicomArchiveUploaderProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [loading, setLoading] = useState(false);
	const [status, setStatus] = useState<string>(
		"Перетащите ZIP-архив КЛКТ, папку со снимками или отдельные файлы .dcm",
	);
	const [progressPercent, setProgressPercent] = useState<number | null>(null);
	const [syncBadge, setSyncBadge] = useState<{
		type: "synced" | "pending";
		text: string;
	} | null>(null);

	const folderInputRef = useRef<HTMLInputElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const isMountedRef = useRef<boolean>(true);
	const batchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		const stopWatcher = startDicomOfflineSyncWatcher();
		return () => {
			stopWatcher();
			isMountedRef.current = false;
			if (batchTimerRef.current) {
				clearTimeout(batchTimerRef.current);
				batchTimerRef.current = null;
			}
			purgeDicomImageLoader();
		};
	}, []);

	const processFile = useCallback(
		async (file: File): Promise<ParsedDicomResult | null> => {
			if (isDicomdirEntry(file.name)) {
				return null;
			}
			return new Promise((resolve) => {
				const reader = new FileReader();
				reader.onload = async () => {
					try {
						const arrayBuffer = reader.result as ArrayBuffer;
						const byteArray = new Uint8Array(arrayBuffer);

						if (!isDicomEntry(file.name, byteArray)) {
							resolve(null);
							return;
						}

						const loader = await getDicomImageLoader();
						const imageId = loader.wadouri.fileManager.add(file);
						resolve({ imageId, file });
					} catch (e) {
						showToast(
							actionFailureToast(
								"Ошибка выполнения операции",
								(e as { status?: number })?.status ?? null,
							),
							"error",
						);
						logger.error("Failed to parse file", file.name, e);
						resolve(null);
					}
				};
				reader.onerror = () => resolve(null);
				reader.readAsArrayBuffer(file.slice(0, 1024));
			});
		},
		[],
	);

	const processZip = useCallback(
		async (zipFile: File): Promise<ParsedDicomResult[]> => {
			if (zipFile.size > MAX_SAFE_FILE_SIZE_BYTES) {
				setStatus(
					"Файл слишком велик для обработки в памяти браузера (>1.5 ГБ). Используйте просмотр по папке со срезами.",
				);
				return [];
			}

			setStatus(`Распаковка архива ${zipFile.name}...`);
			setProgressPercent(0);
			let archiveBuffer: Uint8Array | null = new Uint8Array(await zipFile.arrayBuffer());

			return new Promise<ParsedDicomResult[]>((resolve, reject) => {
				fflate.unzip(archiveBuffer!, (err, unzipped) => {
					archiveBuffer = null;
					if (err) {
						reject(err);
						return;
					}

					const entries = sortDicomEntries(Object.keys(unzipped));
					const totalFiles = entries.length;
					const results: ParsedDicomResult[] = [];

					if (totalFiles === 0) {
						resolve([]);
						return;
					}

					let currentIndex = 0;

					const processNextBatch = async () => {
						if (!isMountedRef.current) {
							batchTimerRef.current = null;
							for (const k of Object.keys(unzipped)) {
								delete unzipped[k];
							}
							resolve([]);
							return;
						}

						const batchEnd = Math.min(
							currentIndex + BATCH_PROCESSING_CHUNK_SIZE,
							totalFiles,
						);

						const loader = await getDicomImageLoader();

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
								const file = new File([fileData], filename);
								const imageId = loader.wadouri.fileManager.add(file);
								results.push({ imageId, file });
							}
							delete unzipped[filename];
						}

						currentIndex = batchEnd;
						const pct = Math.round((currentIndex / totalFiles) * 100);
						if (isMountedRef.current) {
							setProgressPercent(pct);
							setStatus(`Обработка срезов КЛКТ: ${currentIndex}/${totalFiles} (${results.length} DICOM)...`);
						}

						if (currentIndex < totalFiles) {
							batchTimerRef.current = setTimeout(processNextBatch, 0);
						} else {
							batchTimerRef.current = null;
							if (isMountedRef.current) {
								setProgressPercent(null);
							}
							resolve(results);
						}
					};

					processNextBatch();
				});
			});
		},
		[],
	);

	const traverseFileTree = useCallback(
		// biome-ignore lint/suspicious/noExplicitAny: FileSystemEntry abstraction
		async (item: any, path: string = ""): Promise<File[]> => {
			return new Promise((resolve) => {
				if (item.isFile) {
					item.file((file: File) => {
						resolve([file]);
					});
				} else if (item.isDirectory) {
					const dirReader = item.createReader();
					const files: File[] = [];
					const readBatch = () => {
						dirReader.readEntries(
							// biome-ignore lint/suspicious/noExplicitAny: FileSystemEntry entries
							async (entries: any[]) => {
								if (!entries || entries.length === 0) {
									resolve(files);
									return;
								}
								for (let i = 0; i < entries.length; i++) {
									const nestedFiles = await traverseFileTree(
										entries[i],
										`${path + item.name}/`,
									);
									files.push(...nestedFiles);
								}
								readBatch();
							},
							() => resolve(files),
						);
					};
					readBatch();
				} else {
					resolve([]);
				}
			});
		},
		[],
	);

	const handleIncomingFiles = useCallback(
		async (files: File[]) => {
			if (files.length === 0) return;
			if (loading) return;

			setLoading(true);
			setProgressPercent(null);

			try {
				const parsedResults: ParsedDicomResult[] = [];
				const zipFiles = files.filter((f) =>
					f.name.toLowerCase().endsWith(".zip"),
				);
				const nonZipFiles = sortDicomEntries(
					files.filter((f) => !f.name.toLowerCase().endsWith(".zip")),
				);

				for (const zipFile of zipFiles) {
					const zipParsed = await processZip(zipFile);
					parsedResults.push(...zipParsed);
				}

				if (nonZipFiles.length > 0) {
					setStatus(`Сканирование файлов: ${nonZipFiles.length}...`);
					for (let i = 0; i < nonZipFiles.length; i++) {
						if (i % 25 === 0) {
							setStatus(`Сканирование файлов: ${i}/${nonZipFiles.length}`);
							setProgressPercent(Math.round((i / nonZipFiles.length) * 100));
						}
						const f = nonZipFiles[i];
						if (f) {
							if (isDicomdirEntry(f.name)) continue;
							const parsed = await processFile(f);
							if (parsed) {
								parsedResults.push(parsed);
							}
						}
					}
				}

				if (!isMountedRef.current) return;
				if (parsedResults.length === 0) {
					setStatus("Подходящие файлы DICOM (.dcm) или срезы КЛКТ не найдены.");
					return;
				}

				const validImageIds = parsedResults.map((r) => r.imageId);
				const validFiles = parsedResults.map((r) => r.file);

				let studyUid = `1.2.643.5.1.13.2.${Date.now()}`;
				let studySeriesUid: string | undefined;
				let patientNameFromDicom: string | undefined;
				let patientIdFromDicom: string | undefined;
				let studyDateFromDicom: string | undefined;

				try {
					const firstSliceBuf = await validFiles[0]!.arrayBuffer();
					const headerInfo = extractDicomHeaderInfo(firstSliceBuf);
					studyUid = headerInfo.studyInstanceUid || studyUid;
					studySeriesUid = headerInfo.seriesUid;
					patientNameFromDicom = headerInfo.patientName;
					patientIdFromDicom = headerInfo.patientId;
					studyDateFromDicom = headerInfo.studyDate;

					const sliceBuffers = await Promise.all(
						validFiles.map(async (f) => ({
							name: f.name,
							buffer: await f.arrayBuffer(),
						})),
					);

					await saveLocalDicomStudy({
						studyInstanceUid: studyUid,
						seriesUid: studySeriesUid,
						patientId: patientId || patientIdFromDicom || null,
						sliceCount: validFiles.length,
						studyDate: studyDateFromDicom,
						title: patientNameFromDicom
							? `КЛКТ — ${patientNameFromDicom}`
							: `КЛКТ исследование ${studyUid.slice(-8)}`,
						slices: sliceBuffers,
					});
					setSyncBadge({
						type: "pending",
						text: "Сохранено локально на этом ПК • Ожидает синхронизации",
					});
				} catch (tier1Err) {
					logger.warn("[DicomArchiveUploader] Ошибка сохранения в IndexedDB:", tier1Err);
				}

				const effectivePatientId = patientId || patientIdFromDicom || null;

				if (uploadToServer) {
					const isOnline = typeof navigator === "undefined" || navigator.onLine !== false;
					if (!isOnline) {
						setStatus(`Офлайн: сохранено локально (${validFiles.length} срезов). «Ожидает синхронизации»`);
						setSyncBadge({
							type: "pending",
							text: "Сохранено локально на этом ПК • Ожидает синхронизации",
						});
						showToast(`Офлайн: ${validFiles.length} срезов сохранено в IndexedDB (Ожидает синхронизации)`, "info");
					} else {
						setStatus(`Синхронизация с PACS: 0/${validFiles.length} (0%)...`);
						setProgressPercent(0);
						let uploadedCount = 0;
						const failedFiles: File[] = [];

						const totalUploads = validFiles.length;
						let uploadIndex = 0;
						const workerCount = Math.min(4, totalUploads);
						const uploadWorkers = Array.from({ length: workerCount }, async () => {
							while (uploadIndex < totalUploads) {
								if (!isMountedRef.current) break;
								const taskIdx = uploadIndex++;
								const file = validFiles[taskIdx]!;
								const ok = await uploadDicomFileToStow(file, effectivePatientId, doctorId);
								if (!ok) {
									failedFiles.push(file);
								}
								uploadedCount++;
								const pct = Math.round((uploadedCount / totalUploads) * 100);
								if (isMountedRef.current) {
									setProgressPercent(pct);
									setStatus(`Синхронизация с PACS: ${uploadedCount}/${totalUploads} (${pct}%)...`);
								}
							}
						});
						await Promise.all(uploadWorkers);

						if (failedFiles.length > 0) {
							await markStudySyncFailed(studyUid, `Не удалось отправить ${failedFiles.length} из ${totalUploads} срезов`);
							setStatus(`Сохранено локально (${validFiles.length} срезов) • Ожидает синхронизации (${failedFiles.length} не отправлено)`);
							setSyncBadge({
								type: "pending",
								text: "Сохранено локально на этом ПК • Ожидает синхронизации",
							});
							showToast(`Связь нестабильна: ${failedFiles.length} срезов КТ сохранены локально и ожидают отправки`, "warning");
						} else {
							await markStudyAsSynced(studyUid);
							setStatus(`Сохранено локально на этом ПК • Синхронизировано с сервером клиники (${validFiles.length} срезов)`);
							setSyncBadge({
								type: "synced",
								text: "Сохранено локально на этом ПК • Синхронизировано с сервером клиники",
							});
							showToast(`Исследование (${validFiles.length} срезов) сохранено локально и синхронизировано с сервером`, "success");
						}
					}
				} else {
					setStatus(`Сохранено локально на этом ПК: ${validImageIds.length} срезов`);
				}

				if (!isMountedRef.current) return;
				onImagesLoaded(validImageIds);
			} catch (error) {
				if (!isMountedRef.current) return;
				showToast(
					actionFailureToast(
						"Ошибка обработки архива DICOM",
						(error as { status?: number })?.status ?? null,
					),
					"error",
				);
				logger.error("[DicomArchiveUploader] Ошибка обработки:", error);
				setStatus(
					"Не удалось прочитать файлы: архив повреждён, зашифрован или не содержит DICOM. Попробуйте распаковать вручную.",
				);
			} finally {
				if (isMountedRef.current) {
					setLoading(false);
					setProgressPercent(null);
				}
			}
		},
		[loading, onImagesLoaded, processFile, processZip, uploadToServer, patientId, doctorId],
	);

	const onDrop = useCallback(
		async (e: React.DragEvent<HTMLElement>) => {
			e.preventDefault();
			setIsDragging(false);

			if (loading) return;

			try {
				const items = e.dataTransfer.items;
				let allFiles: File[] = [];

				setStatus("Чтение выбранных файлов...");

				if (items && items.length > 0) {
					for (let i = 0; i < items.length; i++) {
						const item = items[i]?.webkitGetAsEntry();
						if (item) {
							const files = await traverseFileTree(item);
							allFiles = allFiles.concat(files);
						}
					}
				} else if (e.dataTransfer.files) {
					allFiles = Array.from(e.dataTransfer.files);
				}

				await handleIncomingFiles(allFiles);
			} catch (error) {
				logger.error("[DicomArchiveUploader] Drop failed:", error);
				setStatus("Ошибка при перетаскивании файлов.");
			}
		},
		[loading, traverseFileTree, handleIncomingFiles],
	);

	return {
		isDragging,
		setIsDragging,
		loading,
		status,
		progressPercent,
		syncBadge,
		folderInputRef,
		fileInputRef,
		handleIncomingFiles,
		onDrop,
	};
}
