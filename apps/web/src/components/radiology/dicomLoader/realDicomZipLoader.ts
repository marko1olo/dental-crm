/**
 * realDicomZipLoader.ts — Загрузка серий DICOM из файлов и распаковка ZIP-архивов (Мандат 8b).
 */

import * as fflate from "fflate";
import type { CbctVoxelVolume } from "../cbctMprMath";
import { type DicomVolumeIngestionOptions, yieldToEventLoop } from "./realDicomTypes";
import { buildVolumeFromDicomBuffers } from "./realDicomVoxelIngestion";

export async function buildVolumeFromDicomFiles(
	files: File[],
	options?: ((percent: number, message: string) => void) | DicomVolumeIngestionOptions,
): Promise<CbctVoxelVolume> {
	if (!files || files.length === 0) throw new Error("Не передано ни одного файла DICOM для загрузки");
	const onProgress = typeof options === "function" ? options : options?.onProgress;
	const concurrency = typeof options === "object" && options?.concurrency && options.concurrency > 0 ? options.concurrency : 10;
	const total = files.length;
	const items: Array<{ buffer: ArrayBuffer; fileName: string }> = new Array(total);

	for (let i = 0; i < total; i += concurrency) {
		const chunk = files.slice(i, i + concurrency);
		const bufs = await Promise.all(chunk.map((f) => f.arrayBuffer()));
		for (let j = 0; j < bufs.length; j++) {
			items[i + j] = { buffer: bufs[j]!, fileName: chunk[j]!.name };
		}
		if (onProgress) {
			const pct = Math.round(((i + chunk.length) / total) * 35);
			onProgress(pct, `Параллельное чтение срезов КТ (${i + chunk.length}/${total})...`);
		}
		await yieldToEventLoop();
	}

	return buildVolumeFromDicomBuffers(items, options);
}

export async function buildVolumeFromDicomZip(
	zipBuffer: ArrayBuffer,
	options?: ((percent: number, message: string) => void) | DicomVolumeIngestionOptions,
): Promise<CbctVoxelVolume> {
	const onProgress = typeof options === "function" ? options : options?.onProgress;
	onProgress?.(5, "Распаковка ZIP-архива КЛКТ в памяти...");
	const unzipped = fflate.unzipSync(new Uint8Array(zipBuffer), {
		filter: (file) => {
			const lower = file.name.toLowerCase();
			return (
				!lower.includes("__macosx") &&
				!lower.startsWith("._") &&
				!file.name.toUpperCase().includes("DICOMDIR") &&
				(lower.endsWith(".dcm") || lower.endsWith(".dicom") || !lower.includes("."))
			);
		},
	});
	const fileKeys = Object.keys(unzipped);
	if (fileKeys.length === 0) throw new Error("В переданном ZIP-архиве не найдено файлов DICOM (.dcm)");
	const items: Array<{ buffer: ArrayBuffer; fileName: string }> = [];
	for (const key of fileKeys) {
		const u8 = unzipped[key]!;
		items.push({ buffer: u8.buffer, fileName: key });
		delete unzipped[key];
	}
	return buildVolumeFromDicomBuffers(items, options);
}
