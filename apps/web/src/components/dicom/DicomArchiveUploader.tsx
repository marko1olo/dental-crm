import cornerstoneDICOMImageLoader from "@cornerstonejs/dicom-image-loader";
import * as fflate from "fflate";
import { Archive, Folder } from "lucide-react";
import type React from "react";
import { useCallback, useRef, useState } from "react";
import { actionFailureToast } from "../../lib/panelStateText";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";

interface DicomArchiveUploaderProps {
	onImagesLoaded: (imageIds: string[]) => void;
}

const MAX_SAFE_FILE_SIZE_BYTES = 1.5 * 1024 * 1024 * 1024; // 1.5 GB
const BATCH_PROCESSING_CHUNK_SIZE = 50;

/**
 * Checks if a byte buffer or filename represents a valid DICOM slice.
 * Standard DICOM has 128-byte preamble followed by "DICM" magic string.
 * Non-preamble DICOM or raw files identified by .dcm/.dicom extensions.
 */
function isDicomEntry(filename: string, byteArray: Uint8Array): boolean {
	const lower = filename.toLowerCase();
	if (
		lower.includes("__macosx") ||
		lower.includes("/._") ||
		lower.startsWith("._") ||
		lower.endsWith(".ds_store") ||
		lower.endsWith("thumbs.db") ||
		lower.endsWith("desktop.ini")
	) {
		return false;
	}

	if (byteArray.length >= 132) {
		const dicmPrefix = String.fromCharCode(
			byteArray[128] ?? 0,
			byteArray[129] ?? 0,
			byteArray[130] ?? 0,
			byteArray[131] ?? 0,
		);
		if (dicmPrefix === "DICM") {
			return true;
		}
	}

	if (lower.endsWith(".dcm") || lower.endsWith(".dicom")) {
		return byteArray.length > 32;
	}

	// DICOM without preamble typically begins with Group 0x0002 or Group 0x0008 tag
	if (byteArray.length >= 4) {
		const tagGroup = (byteArray[0] ?? 0) | ((byteArray[1] ?? 0) << 8);
		if (tagGroup === 0x0002 || tagGroup === 0x0008) {
			return true;
		}
	}

	return false;
}

export function DicomArchiveUploader({
	onImagesLoaded,
}: DicomArchiveUploaderProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [loading, setLoading] = useState(false);
	const [status, setStatus] = useState<string>(
		"Перетащите ZIP-архив КЛКТ, папку со снимками или отдельные файлы .dcm",
	);
	const [progressPercent, setProgressPercent] = useState<number | null>(null);

	const folderInputRef = useRef<HTMLInputElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const processFile = useCallback(
		async (file: File): Promise<string | null> => {
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
						resolve(imageId);
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
		async (zipFile: File): Promise<string[]> => {
			if (zipFile.size > MAX_SAFE_FILE_SIZE_BYTES) {
				setStatus(
					"Файл слишком велик для обработки в памяти браузера (>1.5 ГБ). Используйте просмотр по папке со срезами.",
				);
				return [];
			}

			setStatus(`Распаковка архива ${zipFile.name}...`);
			setProgressPercent(0);
			const buffer = new Uint8Array(await zipFile.arrayBuffer());

			return new Promise<string[]>((resolve, reject) => {
				fflate.unzip(buffer, (err, unzipped) => {
					if (err) {
						reject(err);
						return;
					}

					const entries = Object.keys(unzipped);
					const totalFiles = entries.length;
					const imageIds: string[] = [];

					if (totalFiles === 0) {
						resolve([]);
						return;
					}

					let currentIndex = 0;

					const processNextBatch = () => {
						const batchEnd = Math.min(
							currentIndex + BATCH_PROCESSING_CHUNK_SIZE,
							totalFiles,
						);

						for (let i = currentIndex; i < batchEnd; i++) {
							const filename = entries[i];
							if (!filename) continue;
							const fileData = unzipped[filename];
							if (!fileData) continue;

							if (isDicomEntry(filename, fileData)) {
								const file = new File([fileData], filename);
								const imageId =
									cornerstoneDICOMImageLoader.wadouri.fileManager.add(file);
								imageIds.push(imageId);
							}
						}

						currentIndex = batchEnd;
						const pct = Math.round((currentIndex / totalFiles) * 100);
						setProgressPercent(pct);
						setStatus(`Обработка срезов КЛКТ: ${currentIndex}/${totalFiles} (${imageIds.length} DICOM)...`);

						if (currentIndex < totalFiles) {
							// Yield to event loop to keep UI responsive
							setTimeout(processNextBatch, 0);
						} else {
							setProgressPercent(null);
							resolve(imageIds);
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
				const validImageIds: string[] = [];
				const zipFiles = files.filter((f) =>
					f.name.toLowerCase().endsWith(".zip"),
				);
				const nonZipFiles = files.filter(
					(f) => !f.name.toLowerCase().endsWith(".zip"),
				);

				// Process ZIP files
				for (const zipFile of zipFiles) {
					const zipImageIds = await processZip(zipFile);
					validImageIds.push(...zipImageIds);
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
							const imageId = await processFile(f);
							if (imageId) validImageIds.push(imageId);
						}
					}
				}

				if (validImageIds.length > 0) {
					setStatus(`Успешно загружено объектов DICOM: ${validImageIds.length}`);
					onImagesLoaded(validImageIds);
				} else {
					setStatus("Подходящие файлы DICOM (.dcm) или срезы КЛКТ не найдены.");
				}
			} catch (error) {
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
				setLoading(false);
				setProgressPercent(null);
			}
		},
		[loading, onImagesLoaded, processFile, processZip],
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
			className={`w-full flex flex-col items-center justify-center p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl transition-all dicom-dropzone ${
				isDragging ? "dicom-dropzone--dragging" : ""
			}`}
			style={{
				background: isDragging
					? "var(--teal-soft, rgba(20,184,166,0.12))"
					: "var(--paper, rgba(255,255,255,0.05))",
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

			<div className="flex flex-col items-center gap-2 mb-2">
				<div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-1 shrink-0">
					<Archive size={24} />
				</div>
				<div
					style={{
						color: "var(--ink)",
						fontWeight: 700,
						fontSize: "15px",
						textAlign: "center",
					}}
				>
					{status}
				</div>
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

			<div className="flex flex-wrap items-center justify-center gap-3 mt-3">
				<button
					type="button"
					disabled={loading}
					onClick={() => fileInputRef.current?.click()}
					className="px-4 py-2 text-xs font-semibold rounded-lg shadow-sm border transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
					style={{
						background: "var(--surface-50, #f8fafc)",
						borderColor: "var(--line, #cbd5e1)",
						color: "var(--ink, #0f172a)",
					}}
				>
					<Archive size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span>Выбрать ZIP-архив / .DCM</span>
				</button>
				<button
					type="button"
					disabled={loading}
					onClick={() => folderInputRef.current?.click()}
					className="px-4 py-2 text-xs font-semibold rounded-lg shadow-sm border transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
					style={{
						background: "var(--surface-50, #f8fafc)",
						borderColor: "var(--line, #cbd5e1)",
						color: "var(--ink, #0f172a)",
					}}
				>
					<Folder size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span>Выбрать папку КЛКТ</span>
				</button>
			</div>

			<div
				style={{
					color: "var(--muted, #64748b)",
					fontSize: "11px",
					marginTop: "10px",
					textAlign: "center",
				}}
			>
				Локальная обработка в браузере. Конфиденциальные данные исследования не
				передаются на сторонние серверы.
			</div>
		</div>
	);
}

