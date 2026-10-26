/**
 * dicomFileScanner.ts — Чтение отдельных файлов DICOM и рекурсивный обход папок (Мандат 8b <= 120 строк).
 */

import { logger } from "../../../utils/logger";
import { isDicomEntry, isDicomdirEntry } from "../dicomArchiveFilter";
import { getDicomImageLoader } from "./dicomStowUploader";
import type { ParsedDicomResult } from "./types";

export async function processSingleDicomFile(file: File): Promise<ParsedDicomResult | null> {
	if (isDicomdirEntry(file.name)) return null;

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
				logger.error("Failed to parse file", file.name, e);
				resolve(null);
			}
		};
		reader.onerror = () => resolve(null);
		reader.readAsArrayBuffer(file.slice(0, 1024));
	});
}

export async function traverseFileSystemEntry(item: any, path: string = ""): Promise<File[]> {
	return new Promise((resolve) => {
		if (item.isFile) {
			item.file((file: File) => resolve([file]));
		} else if (item.isDirectory) {
			const dirReader = item.createReader();
			const files: File[] = [];
			const readBatch = () => {
				dirReader.readEntries(
					async (entries: any[]) => {
						if (!entries || entries.length === 0) {
							resolve(files);
							return;
						}
						for (let i = 0; i < entries.length; i++) {
							const nested = await traverseFileSystemEntry(entries[i], `${path + item.name}/`);
							files.push(...nested);
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
}
