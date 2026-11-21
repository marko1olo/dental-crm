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

export interface FileSystemEntry {
	readonly isFile: boolean;
	readonly isDirectory: boolean;
	readonly name: string;
}

export interface FileSystemFileEntry extends FileSystemEntry {
	file(successCallback: (file: File) => void, errorCallback?: (error: unknown) => void): void;
}

export interface FileSystemDirectoryReader {
	readEntries(
		successCallback: (entries: FileSystemEntry[]) => void,
		errorCallback?: (error: unknown) => void,
	): void;
}

export interface FileSystemDirectoryEntry extends FileSystemEntry {
	createReader(): FileSystemDirectoryReader;
}

function isFileSystemFileEntry(entry: FileSystemEntry): entry is FileSystemFileEntry {
	return entry.isFile && "file" in entry && typeof entry.file === "function";
}

function isFileSystemDirectoryEntry(entry: FileSystemEntry): entry is FileSystemDirectoryEntry {
	return entry.isDirectory && "createReader" in entry && typeof entry.createReader === "function";
}

export async function traverseFileSystemEntry(
	item: FileSystemEntry | null | undefined,
	path = "",
): Promise<File[]> {
	if (!item) return [];

	return new Promise((resolve) => {
		if (isFileSystemFileEntry(item)) {
			item.file(
				(file: File) => resolve([file]),
				() => resolve([]),
			);
		} else if (isFileSystemDirectoryEntry(item)) {
			const dirReader = item.createReader();
			const files: File[] = [];
			const readBatch = () => {
				dirReader.readEntries(
					async (entries: FileSystemEntry[]) => {
						if (!entries || entries.length === 0) {
							resolve(files);
							return;
						}
						for (let i = 0; i < entries.length; i++) {
							const entry = entries[i];
							if (!entry) continue;
							const nested = await traverseFileSystemEntry(entry, `${path + item.name}/`);
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
