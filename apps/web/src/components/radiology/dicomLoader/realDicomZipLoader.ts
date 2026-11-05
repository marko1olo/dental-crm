/**
 * realDicomZipLoader.ts — Асинхронная потоковая распаковка ZIP-архивов и серий DICOM (Мандат 8b <= 120 строк).
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
		for (let j = 0; j < bufs.length; j++) items[i + j] = { buffer: bufs[j]!, fileName: chunk[j]!.name };
		if (onProgress) onProgress(Math.round(((i + chunk.length) / total) * 35), `Параллельное чтение срезов КТ (${i + chunk.length}/${total})...`);
		await yieldToEventLoop();
	}
	return buildVolumeFromDicomBuffers(items, options);
}

function isDicomEntry(name: string): boolean {
	const l = name.toLowerCase();
	return !l.includes("__macosx") && !l.startsWith("._") && !name.toUpperCase().includes("DICOMDIR") && (l.endsWith(".dcm") || l.endsWith(".dicom") || !l.includes("."));
}

export async function buildVolumeFromDicomZip(
	zipBuffer: ArrayBuffer,
	options?: ((percent: number, message: string) => void) | DicomVolumeIngestionOptions,
): Promise<CbctVoxelVolume> {
	const onProgress = typeof options === "function" ? options : options?.onProgress;
	onProgress?.(2, "Подготовка асинхронного потока распаковки КТ...");

	const zipBytes = new Uint8Array(zipBuffer);
	const totalBytes = zipBytes.length;
	const items: Array<{ buffer: ArrayBuffer; fileName: string }> = [];

	await new Promise<void>((resolve, reject) => {
		const unzipper = new fflate.Unzip();
		try { unzipper.register(fflate.AsyncUnzipInflate); } catch { unzipper.register(fflate.UnzipInflate); }

		let activeFiles = 0;
		let streamEnded = false;
		const checkDone = () => { if (streamEnded && activeFiles === 0) resolve(); };

		unzipper.onfile = (file) => {
			if (!isDicomEntry(file.name)) return;
			activeFiles++;
			let chunks: Uint8Array[] = [];
			file.ondata = (err, chunk, final) => {
				if (err) { activeFiles--; reject(err); return; }
				if (chunk?.length) chunks.push(chunk);
				if (final) {
					let totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
					const u8 = new Uint8Array(totalLen);
					let offset = 0;
					for (const c of chunks) { u8.set(c, offset); offset += c.length; }
					items.push({ buffer: u8.buffer, fileName: file.name });
					chunks = [];
					activeFiles--;
					checkDone();
				}
			};
			file.start();
		};

		const CHUNK_SIZE = 2 * 1024 * 1024;
		(async () => {
			for (let offset = 0; offset < totalBytes; offset += CHUNK_SIZE) {
				const end = Math.min(offset + CHUNK_SIZE, totalBytes);
				unzipper.push(zipBytes.subarray(offset, end), end >= totalBytes);
				if (onProgress) onProgress(Math.round(5 + (offset / totalBytes) * 30), `Распаковка архива КТ (${Math.round((offset / totalBytes) * 100)}%, срезов: ${items.length})...`);
				await yieldToEventLoop();
			}
			streamEnded = true;
			checkDone();
		})().catch(reject);
	});

	if (items.length === 0) throw new Error("В переданном ZIP-архиве не найдено файлов DICOM (.dcm)");
	onProgress?.(35, `Распаковано ${items.length} срезов КТ. Построение 3D объема...`);

	const chainedOptions: DicomVolumeIngestionOptions = typeof options === "object" && options !== null ? { ...options } : {};
	chainedOptions.onProgress = (subPct, msg) => onProgress?.(Math.round(35 + (subPct / 100) * 65), msg);

	return buildVolumeFromDicomBuffers(items, chainedOptions);
}
