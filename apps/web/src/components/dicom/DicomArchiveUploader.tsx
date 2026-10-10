import cornerstoneDICOMImageLoader from "@cornerstonejs/dicom-image-loader";
import * as fflate from "fflate";
import { Archive, Folder } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { actionFailureToast } from "../../lib/panelStateText";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";

import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	extractDicomHeaderInfo,
	markStudyAsSynced,
	markStudySyncFailed,
	saveLocalDicomStudy,
	startDicomOfflineSyncWatcher,
} from "./dicomOfflineSync";

export interface DicomArchiveUploaderProps {
	onImagesLoaded: (imageIds: string[]) => void;
	className?: string;
	uploadToServer?: boolean;
	patientId?: string | null;
	doctorId?: string | null;
}

export async function uploadDicomFileToStow(
	file: File | Blob,
	patientId?: string | null,
	doctorId?: string | null,
): Promise<boolean> {
	try {
		const arrayBuf = await file.arrayBuffer();
		const params = new URLSearchParams();
		if (patientId) params.set("patientId", patientId);
		if (doctorId) params.set("doctorId", doctorId);
		const qs = params.toString() ? `?${params.toString()}` : "";
		const res = await fetch(`/api/dicomweb/studies${qs}`, {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({
				"Content-Type": "application/dicom",
			}),
			body: arrayBuf,
		});
		return res.ok;
	} catch (err) {
		logger.warn("[DicomArchiveUploader] STOW-RS upload failed:", err);
		return false;
	}
}

const MAX_SAFE_FILE_SIZE_BYTES = 1.5 * 1024 * 1024 * 1024; // 1.5 GB
const BATCH_PROCESSING_CHUNK_SIZE = 50;

/**
 * DicomArchiveUploader.tsx — Asynchronous DICOM & CBCT archive uploader and parser.
 * Supports KaVo Instrumentarium OP300 and CyberMed OnDemand3D CBCT ZIP archives
 * by automatically filtering out DICOMDIR directory index files per Mandate 8e.
 */
import {
	filterDicomArchiveEntries,
	isDicomEntry,
	isDicomdirEntry,
	sortDicomEntries,
} from "./dicomArchiveFilter";

export { filterDicomArchiveEntries, isDicomEntry, isDicomdirEntry, sortDicomEntries };

export function DicomArchiveUploader({
	onImagesLoaded,
	className,
	uploadToServer = true,
	patientId,
	doctorId,
}: DicomArchiveUploaderProps) {
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
			try {
				cornerstoneDICOMImageLoader.wadouri.fileManager.purge();
			} catch {
				// Ignore
			}
		};
	}, []);

	interface ParsedDicomResult {
		imageId: string;
		file: File;
	}

	const processFile = useCallback(
		async (file: File): Promise<ParsedDicomResult | null> => {
			if (isDicomdirEntry(file.name)) {
				return null;
			}
			return new Promise((resolve) => {
				const reader = new FileReader();
				reader.onload = () => {
					try {
						const arrayBuffer = reader.result as ArrayBuffer;
						const byteArray = new Uint8Array(arrayBuffer);

						if (!isDicomEntry(file.name, byteArray)) {
							resolve(null);
							return;
						}

						const imageId =
							cornerstoneDICOMImageLoader.wadouri.fileManager.add(file);
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
				reader.readAsArrayBuffer(file.slice(0, 1024)); // Only read first 1KB for DICOM header check
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
					// Immediately release compressed archive buffer from V8 heap
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

					const processNextBatch = () => {
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

						for (let i = currentIndex; i < batchEnd; i++) {
							const filename = entries[i];
							if (!filename) continue;

							// Filter out DICOMDIR index files immediately (KaVo OP300, CyberMed OnDemand3D)
							if (isDicomdirEntry(filename)) {
								delete unzipped[filename];
								continue;
							}

							const fileData = unzipped[filename];
							if (!fileData) continue;

							if (isDicomEntry(filename, fileData)) {
								const file = new File([fileData], filename);
								const imageId =
									cornerstoneDICOMImageLoader.wadouri.fileManager.add(file);
								results.push({ imageId, file });
							}
							// Zero-leak GC: immediately free this slice's uncompressed Uint8Array buffer
							delete unzipped[filename];
						}

						currentIndex = batchEnd;
						const pct = Math.round((currentIndex / totalFiles) * 100);
						if (isMountedRef.current) {
							setProgressPercent(pct);
							setStatus(`Обработка срезов КЛКТ: ${currentIndex}/${totalFiles} (${results.length} DICOM)...`);
						}

						if (currentIndex < totalFiles) {
							// Yield to event loop to keep UI responsive
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

				// Process ZIP files
				for (const zipFile of zipFiles) {
					const zipParsed = await processZip(zipFile);
					parsedResults.push(...zipParsed);
				}

				// Process individual / folder files
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

				// Mandate 8l: Двухуровневое хранение КТ (Tier 1: Local IndexedDB + Tier 2: PACS STOW-RS)
				// 1. Первичное мгновенное сохранение на локальном ПК (Tier 1 Workstation)
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
						// Честный прогресс-бар отправки на бэкенд (POST /api/dicomweb/studies / STOW-RS)
						setStatus(`Синхронизация с PACS: 0/${validFiles.length} (0%)...`);
						setProgressPercent(0);
						let uploadedCount = 0;
						const failedFiles: File[] = [];

						// Пул параллельной отправки (4 конкурентных потока для STOW-RS)
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

	return (
		<div
			aria-label="Зона загрузки DICOM и КЛКТ"
			onDragOver={(e) => {
				e.preventDefault();
				setIsDragging(true);
			}}
			onDragLeave={() => setIsDragging(false)}
			onDrop={onDrop}
			className={`w-full h-full flex-1 flex flex-col items-center justify-center p-3 sm:p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-teal-500/60 dark:hover:border-teal-500/60 rounded-xl transition-all dicom-dropzone ${
				isDragging ? "dicom-dropzone--dragging" : ""
			} ${className ?? ""}`}
			style={{
				background: isDragging
					? "var(--teal-soft, rgba(20,184,166,0.12))"
					: "var(--paper-soft, rgba(0,0,0,0.02))",
				borderColor: isDragging
					? "var(--teal, #14b8a6)"
					: undefined,
				color: "var(--ink, #0f172a)",
			}}
		>
			<input
				ref={folderInputRef}
				id="dicom-folder-input"
				type="file"
				webkitdirectory="true"
				directory="true"
				multiple
				style={{ display: "none" }}
				onChange={async (e) => {
					if (!e.target.files) return;
					const files = Array.from(e.target.files);
					e.target.value = "";
					await handleIncomingFiles(files);
				}}
			/>
			<input
				ref={fileInputRef}
				id="dicom-file-input"
				type="file"
				accept=".zip,.dcm,.dicom,application/zip,application/x-zip-compressed"
				multiple
				style={{ display: "none" }}
				onChange={async (e) => {
					if (!e.target.files) return;
					const files = Array.from(e.target.files);
					e.target.value = "";
					await handleIncomingFiles(files);
				}}
			/>

			<div className="flex flex-col items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
				<div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-0.5 sm:mb-1 shrink-0">
					<Archive className="w-4 h-4 sm:w-6 sm:h-6" />
				</div>
				<div
					style={{
						color: "var(--ink)",
						fontWeight: 700,
						fontSize: "13px",
						textAlign: "center",
					}}
					className="sm:text-[15px]"
				>
					{status}
				</div>
				{syncBadge && (
					<div
						className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mt-1 transition-all"
						style={{
							background:
								syncBadge.type === "synced"
									? "var(--teal-soft, rgba(20,184,166,0.12))"
									: "var(--amber-soft, rgba(245,158,11,0.12))",
							color:
								syncBadge.type === "synced"
									? "var(--teal, #14b8a6)"
									: "var(--amber, #d97706)",
							border: `1px solid ${
								syncBadge.type === "synced"
									? "var(--teal-soft, rgba(20,184,166,0.3))"
									: "var(--amber-soft, rgba(245,158,11,0.3))"
							}`,
						}}
					>
						<span className="w-1.5 h-1.5 rounded-full bg-current" />
						<span>{syncBadge.text}</span>
					</div>
				)}
			</div>

			{loading && (
				<div className="w-full max-w-xs my-2 flex flex-col items-center gap-2">
					<div className="w-6 h-6 border-2 border-[var(--teal)] border-t-transparent rounded-full animate-spin"></div>
					{progressPercent !== null && (
						<div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
							<div
								className="bg-[var(--teal)] h-full transition-all duration-150"
								style={{ width: `${progressPercent}%` }}
							></div>
						</div>
					)}
				</div>
			)}

			<div className="flex flex-wrap items-center justify-center gap-2.5 mt-2 sm:mt-3">
				<button
					type="button"
					onClick={() => {
						if (!loading) fileInputRef.current?.click();
					}}
					className="secondary-button h-8 min-h-[32px] px-3 text-xs font-semibold rounded-lg border transition-colors inline-flex items-center gap-1.5 cursor-pointer"
					style={{
						background: "var(--paper, #ffffff)",
						borderColor: "var(--line, #cbd5e1)",
						color: "var(--ink, #0f172a)",
						padding: "0 12px",
						opacity: loading ? 0.7 : 1,
					}}
				>
					<Archive size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span>Выбрать ZIP-архив / .DCM</span>
				</button>
				<button
					type="button"
					onClick={() => {
						if (!loading) folderInputRef.current?.click();
					}}
					className="secondary-button h-8 min-h-[32px] px-3 text-xs font-semibold rounded-lg border transition-colors inline-flex items-center gap-1.5 cursor-pointer"
					style={{
						background: "var(--paper, #ffffff)",
						borderColor: "var(--line, #cbd5e1)",
						color: "var(--ink, #0f172a)",
						padding: "0 12px",
						opacity: loading ? 0.7 : 1,
					}}
				>
					<Folder size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span>Выбрать папку КЛКТ</span>
				</button>
			</div>

			<div
				style={{
					color: "var(--muted, #64748b)",
					fontSize: "10px",
					marginTop: "6px",
					textAlign: "center",
				}}
				className="hidden sm:block"
			>
				Локальная обработка в браузере. Конфиденциальные данные исследования не
				передаются на сторонние серверы.
			</div>
		</div>
	);
}

