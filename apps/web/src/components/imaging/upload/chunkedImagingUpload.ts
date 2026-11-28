/**
 * chunkedImagingUpload.ts — SHA-256 чанковая загрузка крупных снимков (CBCT / DICOM / OPG) с докачкой.
 * Mandate 8b/8c: <= 250 строк, 4 MB чанки, concurrency = 1 для HDD, нулевое чтение всего файла в RAM (только file.slice).
 */

import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders.js";
import { clientLogger } from "../../../services/logging/clientLogger.js";
import type { ImagingStudy } from "../types.js";

export const DEFAULT_CHUNK_SIZE_BYTES = 4 * 1024 * 1024;
const HDD_YIELD_THROTTLE_MS = 25;
export const MAX_PARALLEL_CHUNKS = 1;
const MAX_CHUNK_RETRIES = 3;

const SHA256_K = new Uint32Array([
	0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
	0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
	0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
	0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
	0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
	0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
	0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
	0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

class StreamingSha256 {
	private h = new Uint32Array([
		0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
		0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
	]);
	private block = new Uint8Array(64);
	private blockOffset = 0;
	private totalBytes = 0;
	private w = new Uint32Array(64);

	private compress(buf: Uint8Array, offset: number): void {
		const w = this.w;
		for (let i = 0; i < 16; i++) {
			const j = offset + i * 4;
			const b0 = buf[j] ?? 0;
			const b1 = buf[j + 1] ?? 0;
			const b2 = buf[j + 2] ?? 0;
			const b3 = buf[j + 3] ?? 0;
			w[i] = ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0;
		}
		for (let i = 16; i < 64; i++) {
			const w15 = w[i - 15] ?? 0;
			const w2 = w[i - 2] ?? 0;
			const w16 = w[i - 16] ?? 0;
			const w7 = w[i - 7] ?? 0;
			const s0 = ((w15 >>> 7) | (w15 << 25)) ^ ((w15 >>> 18) | (w15 << 14)) ^ (w15 >>> 3);
			const s1 = ((w2 >>> 17) | (w2 << 15)) ^ ((w2 >>> 19) | (w2 << 13)) ^ (w2 >>> 10);
			w[i] = (w16 + s0 + w7 + s1) >>> 0;
		}
		let a = this.h[0] ?? 0;
		let b = this.h[1] ?? 0;
		let c = this.h[2] ?? 0;
		let d = this.h[3] ?? 0;
		let e = this.h[4] ?? 0;
		let f = this.h[5] ?? 0;
		let g = this.h[6] ?? 0;
		let h = this.h[7] ?? 0;
		for (let i = 0; i < 64; i++) {
			const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
			const ch = (e & f) ^ (~e & g);
			const kVal = SHA256_K[i] ?? 0;
			const wVal = w[i] ?? 0;
			const temp1 = (h + S1 + ch + kVal + wVal) >>> 0;
			const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
			const maj = (a & b) ^ (a & c) ^ (b & c);
			const temp2 = (S0 + maj) >>> 0;
			h = g; g = f; f = e; e = (d + temp1) >>> 0;
			d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
		}
		this.h[0] = ((this.h[0] ?? 0) + a) >>> 0;
		this.h[1] = ((this.h[1] ?? 0) + b) >>> 0;
		this.h[2] = ((this.h[2] ?? 0) + c) >>> 0;
		this.h[3] = ((this.h[3] ?? 0) + d) >>> 0;
		this.h[4] = ((this.h[4] ?? 0) + e) >>> 0;
		this.h[5] = ((this.h[5] ?? 0) + f) >>> 0;
		this.h[6] = ((this.h[6] ?? 0) + g) >>> 0;
		this.h[7] = ((this.h[7] ?? 0) + h) >>> 0;
	}

	update(data: Uint8Array): void {
		let pos = 0;
		this.totalBytes += data.length;
		if (this.blockOffset > 0) {
			const need = 64 - this.blockOffset;
			if (data.length < need) {
				this.block.set(data, this.blockOffset);
				this.blockOffset += data.length;
				return;
			}
			this.block.set(data.subarray(0, need), this.blockOffset);
			this.compress(this.block, 0);
			this.blockOffset = 0;
			pos = need;
		}
		while (pos + 64 <= data.length) {
			this.compress(data, pos);
			pos += 64;
		}
		if (pos < data.length) {
			this.block.set(data.subarray(pos), 0);
			this.blockOffset = data.length - pos;
		}
	}

	digestHex(): string {
		this.block[this.blockOffset++] = 0x80;
		if (this.blockOffset > 56) {
			this.block.fill(0, this.blockOffset, 64);
			this.compress(this.block, 0);
			this.blockOffset = 0;
		}
		this.block.fill(0, this.blockOffset, 56);
		const bitLen = this.totalBytes * 8;
		const hi = Math.floor(bitLen / 0x100000000);
		const lo = bitLen >>> 0;
		const view = new DataView(this.block.buffer, this.block.byteOffset, 64);
		view.setUint32(56, hi, false);
		view.setUint32(60, lo, false);
		this.compress(this.block, 0);
		let hex = "";
		for (let i = 0; i < 8; i++) {
			hex += (this.h[i] ?? 0).toString(16).padStart(8, "0");
		}
		return hex;
	}
}

export async function computeFileSha256Streaming(
	file: Blob,
	chunkSizeBytes: number = DEFAULT_CHUNK_SIZE_BYTES,
): Promise<string> {
	const hasher = new StreamingSha256();
	if (file.size === 0) {
		return hasher.digestHex();
	}
	for (let offset = 0; offset < file.size; offset += chunkSizeBytes) {
		const end = Math.min(file.size, offset + chunkSizeBytes);
		const sliceBuf = await file.slice(offset, end).arrayBuffer();
		hasher.update(new Uint8Array(sliceBuf));
	}
	return hasher.digestHex();
}

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

async function readChunkedImagingError(res: Response, fallback: string, stage: string): Promise<string> {
	let rawErr: { data?: { message?: string }; message?: string } | null = null;
	try {
		rawErr = (await res.json()) as { data?: { message?: string }; message?: string } | null;
	} catch (parseErr) {
		clientLogger.warn(`[chunkedImagingUpload] ${stage} error JSON parse failed`, {
			status: res.status,
			error: String(parseErr),
		});
	}
	const errJson = rawErr?.data ?? rawErr;
	return errJson?.message || fallback;
}

export async function uploadImagingScanChunked(params: ChunkedUploadParams): Promise<ChunkedUploadResult> {
	const chunkSizeBytes = params.chunkSizeBytes || DEFAULT_CHUNK_SIZE_BYTES;
	const totalChunks = Math.max(1, Math.ceil(params.file.size / chunkSizeBytes));
	params.onProgress?.(2);

	const fileSha256 = await computeFileSha256Streaming(params.file, chunkSizeBytes);
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
		const error = await readChunkedImagingError(
			initRes,
			`Ошибка инициализации загрузки (${initRes.status})`,
			"init",
		);
		return { success: false, error };
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
		const sliceBuf = await params.file.slice(start, end).arrayBuffer();
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
				const lastErrMsg = await readChunkedImagingError(res, `HTTP ${res.status}`, `part:${chunkIndex}`);
				lastError = lastErrMsg;
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
		const error = await readChunkedImagingError(
			completeRes,
			`Ошибка финализации снимка (${completeRes.status})`,
			"complete",
		);
		return { success: false, error };
	}

	const rawComplete = (await completeRes.json()) as { data?: { study?: ImagingStudy }; study?: ImagingStudy };
	const completeData = rawComplete?.data ?? rawComplete;
	params.onProgress?.(100);
	return { success: true, study: completeData.study };
}
