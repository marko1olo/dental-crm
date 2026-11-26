/**
 * chunkedImagingUpload.ts — SHA-256 чанковая загрузка крупных снимков (CBCT / DICOM / OPG) с докачкой.
 * Mandate 8b: <= 200 строк, HDD-friendly throttle, concurrency <= 2, auto-resume on network drops.
 */

import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders.js";
import type { ImagingStudy } from "../types.js";

const DEFAULT_CHUNK_SIZE_BYTES = 2 * 1024 * 1024;
const HDD_YIELD_THROTTLE_MS = 25;
const MAX_PARALLEL_CHUNKS = 2;
const MAX_CHUNK_RETRIES = 3;

export interface ChunkedUploadParams {
	readonly file: File;
	readonly patientId: string;
	readonly visitId?: string | null | undefined;
	readonly kind: string;
	readonly title: string;
	readonly toothCode?: string | null | undefined;
	readonly region?: string | null | undefined;
	readonly chunkSizeBytes?: number | undefined;
	readonly onProgress?: ((pct: number) => void) | undefined;
}

export interface ChunkedUploadResult {
	success: boolean;
	study?: ImagingStudy | undefined;
	error?: string | undefined;
}

async function computeSha256Hex(buffer: ArrayBuffer): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", buffer);
	const bytes = new Uint8Array(digest);
	let hex = "";
	for (let i = 0; i < bytes.length; i++) {
		hex += (bytes[i] ?? 0).toString(16).padStart(2, "0");
	}
	return hex;
}

function makeUuid(): string {
	return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
		? crypto.randomUUID()
		: `chunk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function sleepMs(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function uploadImagingScanChunked(params: ChunkedUploadParams): Promise<ChunkedUploadResult> {
	const chunkSizeBytes = params.chunkSizeBytes || DEFAULT_CHUNK_SIZE_BYTES;
	const totalChunks = Math.max(1, Math.ceil(params.file.size / chunkSizeBytes));
	params.onProgress?.(2);

	const fullBuffer = await params.file.arrayBuffer();
	const fileSha256 = await computeSha256Hex(fullBuffer);
	params.onProgress?.(8);

	const initRes = await fetch("/api/imaging/chunks/init", {
		method: "POST",
		headers: denteClinicalMutationHeaders({
			"Content-Type": "application/json",
			"Idempotency-Key": makeUuid(),
		}),
		body: JSON.stringify({
			patientId: params.patientId,
			visitId: params.visitId ?? null,
			kind: params.kind,
			title: params.title,
			toothCode: params.toothCode ?? null,
			region: params.region ?? null,
			fileName: params.file.name,
			fileSizeBytes: params.file.size,
			totalChunks,
			chunkSizeBytes,
			fileSha256,
		}),
	});

	if (!initRes.ok) {
		const rawErr = (await initRes.json().catch(() => null)) as { data?: { message?: string }; message?: string } | null;
		const errJson = rawErr?.data ?? rawErr;
		return { success: false, error: errJson?.message || `Ошибка инициализации загрузки (${initRes.status})` };
	}

	const rawInit = (await initRes.json()) as { data?: { uploadId: string; uploadedChunks?: number[] }; uploadId?: string; uploadedChunks?: number[] };
	const initData = (rawInit?.data ?? rawInit) as { uploadId: string; uploadedChunks?: number[] };
	const uploadId = initData.uploadId;
	const completedSet = new Set<number>(initData.uploadedChunks || []);
	const pendingIndices: number[] = [];
	for (let i = 0; i < totalChunks; i++) {
		if (!completedSet.has(i)) pendingIndices.push(i);
	}

	let cursor = 0;
	const uploadSingleChunk = async (chunkIndex: number): Promise<void> => {
		const start = chunkIndex * chunkSizeBytes;
		const end = Math.min(params.file.size, start + chunkSizeBytes);
		const sliceBuf = fullBuffer.slice(start, end);
		const chunkSha = await computeSha256Hex(sliceBuf);

		let lastError = "Сбой передачи фрагмента";
		for (let attempt = 1; attempt <= MAX_CHUNK_RETRIES; attempt++) {
			try {
				const res = await fetch(
					`/api/imaging/chunks/${encodeURIComponent(uploadId)}/part?index=${chunkIndex}&sha256=${chunkSha}`,
					{
						method: "PUT",
						headers: denteClinicalMutationHeaders({
							"Content-Type": "application/octet-stream",
							"x-chunk-index": String(chunkIndex),
							"x-chunk-sha256": chunkSha,
						}),
						body: sliceBuf,
					},
				);
				if (res.ok) {
					completedSet.add(chunkIndex);
					const pct = Math.min(92, 10 + Math.round((completedSet.size / totalChunks) * 80));
					params.onProgress?.(pct);
					return;
				}
				const rawPartErr = (await res.json().catch(() => null)) as { data?: { message?: string }; message?: string } | null;
				const errJson = rawPartErr?.data ?? rawPartErr;
				lastError = errJson?.message || `HTTP ${res.status}`;
			} catch (err) {
				lastError = err instanceof Error ? err.message : String(err);
			}
			await sleepMs(200 * attempt);
		}
		throw new Error(`Чанк ${chunkIndex + 1}/${totalChunks}: ${lastError}`);
	};

	const workers = Array.from({ length: Math.min(MAX_PARALLEL_CHUNKS, Math.max(1, pendingIndices.length)) }, async () => {
		while (cursor < pendingIndices.length) {
			const idx = pendingIndices[cursor++];
			if (idx === undefined) break;
			await uploadSingleChunk(idx);
			await sleepMs(HDD_YIELD_THROTTLE_MS);
		}
	});

	try {
		await Promise.all(workers);
	} catch (err) {
		return { success: false, error: err instanceof Error ? err.message : String(err) };
	}

	const completeRes = await fetch(`/api/imaging/chunks/${encodeURIComponent(uploadId)}/complete`, {
		method: "POST",
		headers: denteClinicalMutationHeaders({
			"Content-Type": "application/json",
			"Idempotency-Key": makeUuid(),
		}),
		body: JSON.stringify({}),
	});

	if (!completeRes.ok) {
		const rawCompleteErr = (await completeRes.json().catch(() => null)) as { data?: { message?: string }; message?: string } | null;
		const errJson = rawCompleteErr?.data ?? rawCompleteErr;
		return { success: false, error: errJson?.message || `Ошибка финализации снимка (${completeRes.status})` };
	}

	const rawComplete = (await completeRes.json()) as { data?: { study?: ImagingStudy }; study?: ImagingStudy };
	const completeData = rawComplete?.data ?? rawComplete;
	params.onProgress?.(100);
	return { success: true, study: completeData.study };
}
