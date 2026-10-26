/**
 * useDicomArchiveUploader.ts — хук загрузки, распаковки и синхронизации DICOM/КЛКТ архивов.
 * Mandate 8b: строго <= 120 строк.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import { startDicomOfflineSyncWatcher } from "../dicomOfflineSync";
import { sortDicomEntries } from "../dicomArchiveFilter";
import { purgeDicomImageLoader } from "./dicomStowUploader";
import type { ParsedDicomResult, SyncBadgeState, UseDicomArchiveUploaderProps } from "./types";
import { processSingleDicomFile, traverseFileSystemEntry } from "./dicomFileScanner";
import { extractZipArchive } from "./dicomZipExtractor";
import { persistAndSyncDicomStudy } from "./dicomServerSync";

export type { ParsedDicomResult, UseDicomArchiveUploaderProps };

export function useDicomArchiveUploader({
	onImagesLoaded, uploadToServer = true, patientId, doctorId,
}: UseDicomArchiveUploaderProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [loading, setLoading] = useState(false);
	const [status, setStatus] = useState("Перетащите ZIP-архив КЛКТ, папку со снимками или отдельные файлы .dcm");
	const [progressPercent, setProgressPercent] = useState<number | null>(null);
	const [syncBadge, setSyncBadge] = useState<SyncBadgeState | null>(null);

	const folderInputRef = useRef<HTMLInputElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const isMountedRef = useRef(true);

	useEffect(() => {
		const stopWatcher = startDicomOfflineSyncWatcher();
		return () => {
			stopWatcher();
			isMountedRef.current = false;
			purgeDicomImageLoader();
		};
	}, []);

	const handleIncomingFiles = useCallback(async (files: File[]) => {
		if (files.length === 0 || loading) return;
		setLoading(true);
		setProgressPercent(null);

		try {
			const parsedResults: ParsedDicomResult[] = [];
			const zipFiles = files.filter((f) => f.name.toLowerCase().endsWith(".zip"));
			const nonZip = sortDicomEntries(files.filter((f) => !f.name.toLowerCase().endsWith(".zip")));

			for (const zip of zipFiles) {
				const res = await extractZipArchive(zip, {
					onProgress: (pct, msg) => { if (isMountedRef.current) { setProgressPercent(pct); setStatus(msg); } },
					isMounted: () => isMountedRef.current,
				});
				parsedResults.push(...res);
			}

			if (nonZip.length > 0) {
				for (let i = 0; i < nonZip.length; i++) {
					const f = nonZip[i];
					if (f) {
						const parsed = await processSingleDicomFile(f);
						if (parsed) parsedResults.push(parsed);
					}
				}
			}

			if (!isMountedRef.current) return;
			if (parsedResults.length === 0) {
				setStatus("Подходящие файлы DICOM (.dcm) или срезы КЛКТ не найдены.");
				return;
			}

			await persistAndSyncDicomStudy({
				validFiles: parsedResults.map((r) => r.file),
				patientId, doctorId, uploadToServer,
				setStatus: (msg) => { if (isMountedRef.current) setStatus(msg); },
				setProgressPercent: (pct) => { if (isMountedRef.current) setProgressPercent(pct); },
				setSyncBadge: (badge) => { if (isMountedRef.current) setSyncBadge(badge); },
				isMounted: () => isMountedRef.current,
			});

			if (isMountedRef.current) onImagesLoaded(parsedResults.map((r) => r.imageId));
		} catch (error) {
			logger.error("[DicomArchiveUploader] Ошибка обработки:", error);
			if (isMountedRef.current) setStatus("Не удалось прочитать файлы: архив повреждён или не содержит DICOM.");
		} finally {
			if (isMountedRef.current) { setLoading(false); setProgressPercent(null); }
		}
	}, [loading, onImagesLoaded, uploadToServer, patientId, doctorId]);

	const onDrop = useCallback(async (e: React.DragEvent<HTMLElement>) => {
		e.preventDefault();
		setIsDragging(false);
		if (loading) return;
		try {
			const items = e.dataTransfer.items;
			let allFiles: File[] = [];
			if (items && items.length > 0) {
				for (let i = 0; i < items.length; i++) {
					const entry = items[i]?.webkitGetAsEntry();
					if (entry) allFiles.push(...await traverseFileSystemEntry(entry));
				}
			} else if (e.dataTransfer.files) {
				allFiles = Array.from(e.dataTransfer.files);
			}
			await handleIncomingFiles(allFiles);
		} catch (error) {
			logger.error("[DicomArchiveUploader] Drop failed:", error);
		}
	}, [loading, handleIncomingFiles]);

	return {
		isDragging, setIsDragging, loading, status, progressPercent,
		syncBadge, folderInputRef, fileInputRef, handleIncomingFiles, onDrop,
	};
}
