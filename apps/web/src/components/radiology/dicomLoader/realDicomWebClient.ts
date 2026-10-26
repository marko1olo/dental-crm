/**
 * realDicomWebClient.ts — Загрузка серий КЛКТ из PACS через DICOMweb WADO-RS (Мандат 8b).
 */

import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders";
import type { CbctVoxelVolume } from "../cbctMprMath";
import type { CbctWorkerBridge } from "../mpr/cbctWorkerBridge";
import type { DicomStreamingUploadTarget, DicomVolumeIngestionOptions } from "./realDicomTypes";
import { buildVolumeFromDicomBuffers } from "./realDicomVoxelIngestion";

function getViteApiUrl(): string {
	try {
		const meta = import.meta as unknown as { env?: Record<string, string> };
		if (meta && meta.env && typeof meta.env.VITE_API_URL === "string") {
			return meta.env.VITE_API_URL;
		}
	} catch {}
	return "";
}

export function buildDicomwebWadoUrl(studyUid: string, seriesUid: string, instanceUid: string, baseUrl?: string): string {
	const apiBase = (baseUrl ?? getViteApiUrl()).replace(/\/+$/, "");
	return `${apiBase}/api/dicomweb/studies/${encodeURIComponent(studyUid)}/series/${encodeURIComponent(seriesUid)}/instances/${encodeURIComponent(instanceUid)}`;
}

export function buildCornerstoneWadoImageId(studyUid: string, seriesUid: string, instanceUid: string, baseUrl?: string): string {
	return `wadouri:${buildDicomwebWadoUrl(studyUid, seriesUid, instanceUid, baseUrl)}`;
}

export async function buildVolumeFromDicomweb(
	studyUid: string,
	seriesUid: string,
	options?: {
		onProgress?: (percent: number, message: string) => void;
		headers?: Record<string, string>;
		baseUrl?: string;
		onProgressiveVolumeReady?: (previewVolume: CbctVoxelVolume) => void;
		workerBridge?: CbctWorkerBridge | null;
		enableProgressiveLOD?: boolean;
		gpuUploadTarget?: DicomStreamingUploadTarget | null;
		concurrency?: number;
	},
): Promise<CbctVoxelVolume> {
	const onProgress = options?.onProgress;
	onProgress?.(5, "Запрос метаданных серии из PACS WADO-RS...");
	const apiBase = (options?.baseUrl ?? getViteApiUrl()).replace(/\/+$/, "");
	const defaultAuth = getDenteAuthHeaders();
	const headers: Record<string, string> = { ...defaultAuth, ...(options?.headers ?? {}) };

	const metaUrl = `${apiBase}/api/dicomweb/studies/${encodeURIComponent(studyUid)}/series/${encodeURIComponent(seriesUid)}/metadata`;
	const metaRes = await fetch(metaUrl, { headers: { Accept: "application/dicom+json", ...headers } });
	if (!metaRes.ok) throw new Error(`PACS WADO-RS metadata request failed: HTTP ${metaRes.status}`);

	const metaJson = (await metaRes.json()) as Array<Record<string, { Value?: unknown[] }>>;
	if (!Array.isArray(metaJson) || metaJson.length === 0) throw new Error("В серии PACS не найдено снимков DICOM");

	const validEntries: Array<{ sopUid: string; index: number }> = [];
	for (let i = 0; i < metaJson.length; i++) {
		const sopUid = metaJson[i]?.["00080018"]?.Value?.[0] as string | undefined;
		if (sopUid) validEntries.push({ sopUid, index: i });
	}
	if (validEntries.length === 0) throw new Error("В серии PACS не найдено снимков DICOM");

	const total = validEntries.length;
	const concurrency = options?.concurrency && options.concurrency > 0 ? options.concurrency : 8;
	const items: Array<{ buffer: ArrayBuffer; fileName: string }> = new Array(total);
	let downloadedCount = 0;
	let currentIndex = 0;

	const workerCount = Math.min(concurrency, total);
	const workers = Array.from({ length: workerCount }, async () => {
		while (currentIndex < total) {
			const taskIndex = currentIndex++;
			const entry = validEntries[taskIndex]!;
			const frameUrl = `${apiBase}/api/dicomweb/studies/${encodeURIComponent(studyUid)}/series/${encodeURIComponent(seriesUid)}/instances/${encodeURIComponent(entry.sopUid)}`;
			const frameRes = await fetch(frameUrl, { headers: { Accept: "application/dicom", ...headers } });
			if (!frameRes.ok) throw new Error(`PACS download failed (${entry.sopUid}): HTTP ${frameRes.status}`);
			items[taskIndex] = { buffer: await frameRes.arrayBuffer(), fileName: `${entry.sopUid}.dcm` };
			downloadedCount++;
			if (downloadedCount % 5 === 0 || downloadedCount === total) {
				onProgress?.(10 + Math.round((downloadedCount / total) * 35), `Загрузка DICOM кадров (${downloadedCount}/${total})...`);
			}
		}
	});

	await Promise.all(workers);
	const ingestionOptions: DicomVolumeIngestionOptions = {
		onProgress,
		onProgressiveVolumeReady: options?.onProgressiveVolumeReady,
		workerBridge: options?.workerBridge,
		enableProgressiveLOD: options?.enableProgressiveLOD,
		gpuUploadTarget: options?.gpuUploadTarget,
	};
	return buildVolumeFromDicomBuffers(items, ingestionOptions);
}
