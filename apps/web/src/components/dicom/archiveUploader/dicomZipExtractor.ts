/**
 * dicomZipExtractor.ts — Распаковка ZIP-архивов КЛКТ через fflate чанками (Мандат 8b <= 120 строк).
 */

import * as fflate from "fflate";
import { isDicomEntry, isDicomdirEntry, sortDicomEntries } from "../dicomArchiveFilter";
import {
	getDicomImageLoader,
	MAX_SAFE_FILE_SIZE_BYTES,
	BATCH_PROCESSING_CHUNK_SIZE,
} from "./dicomStowUploader";
import type { ParsedDicomResult } from "./types";

export interface ZipExtractorOptions {
	onProgress: (pct: number, status: string) => void;
	isMounted: () => boolean;
}

export async function extractZipArchive(
	zipFile: File,
	options: ZipExtractorOptions,
): Promise<ParsedDicomResult[]> {
	if (zipFile.size > MAX_SAFE_FILE_SIZE_BYTES) {
		options.onProgress(0, "Файл слишком велик (>1.5 ГБ). Используйте выбор папки со срезами.");
		return [];
	}

	options.onProgress(0, `Распаковка архива ${zipFile.name}...`);
	let archiveBuffer: Uint8Array | null = new Uint8Array(await zipFile.arrayBuffer());

	return new Promise<ParsedDicomResult[]>((resolve, reject) => {
		fflate.unzip(archiveBuffer!, (err, unzipped) => {
			archiveBuffer = null;
			if (err) return reject(err);

			const entries = sortDicomEntries(Object.keys(unzipped));
			const totalFiles = entries.length;
			const results: ParsedDicomResult[] = [];
			if (totalFiles === 0) return resolve([]);

			let currentIndex = 0;
			const processNextBatch = async () => {
				if (!options.isMounted()) {
					for (const k of Object.keys(unzipped)) delete unzipped[k];
					return resolve([]);
				}

				const batchEnd = Math.min(currentIndex + BATCH_PROCESSING_CHUNK_SIZE, totalFiles);
				const loader = await getDicomImageLoader();

				for (let i = currentIndex; i < batchEnd; i++) {
					const filename = entries[i];
					if (!filename || isDicomdirEntry(filename)) {
						if (filename) delete unzipped[filename];
						continue;
					}
					const fileData = unzipped[filename];
					if (fileData && isDicomEntry(filename, fileData)) {
						const file = new File([fileData], filename);
						const imageId = loader.wadouri.fileManager.add(file);
						results.push({ imageId, file });
					}
					delete unzipped[filename];
				}

				currentIndex = batchEnd;
				const pct = Math.round((currentIndex / totalFiles) * 100);
				options.onProgress(pct, `Обработка срезов КЛКТ: ${currentIndex}/${totalFiles} (${results.length} DICOM)...`);

				if (currentIndex < totalFiles) {
					setTimeout(processNextBatch, 0);
				} else {
					resolve(results);
				}
			};

			processNextBatch();
		});
	});
}
