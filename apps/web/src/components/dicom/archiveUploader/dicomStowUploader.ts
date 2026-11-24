/**
 * dicomStowUploader.ts — отправка DICOM срезов на PACS / STOW-RS эндпоинт сервера.
 * Mandate 8b: Модульность, строго < 120 строк.
 */

import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders";
import { logger } from "../../../utils/logger";

export interface DicomWadoLoader {
	wadouri: {
		fileManager: {
			add: (file: File | Blob) => string;
			purge?: () => void;
		};
	};
}

function isDicomWadoLoader(val: unknown): val is DicomWadoLoader {
	if (!val || typeof val !== "object" || !("wadouri" in val)) return false;
	const wadouri = val.wadouri;
	if (!wadouri || typeof wadouri !== "object" || !("fileManager" in wadouri)) return false;
	const fm = wadouri.fileManager;
	return Boolean(fm && typeof fm === "object" && "add" in fm && typeof fm.add === "function");
}

let dicomImageLoaderPromise: Promise<DicomWadoLoader> | null = null;

export async function getDicomImageLoader(): Promise<DicomWadoLoader> {
	if (!dicomImageLoaderPromise) {
		dicomImageLoaderPromise = import("@cornerstonejs/dicom-image-loader").then(
			(mod) => {
				const candidate: unknown = mod.default ?? mod;
				if (isDicomWadoLoader(candidate)) {
					return candidate;
				}
				throw new Error("DICOM WADO image loader does not expose wadouri.fileManager");
			},
		);
	}
	return dicomImageLoaderPromise;
}

export function purgeDicomImageLoader(): void {
	try {
		if (dicomImageLoaderPromise) {
			void dicomImageLoaderPromise.then((loader) => {
				loader.wadouri.fileManager.purge?.();
			});
		}
	} catch {
		// Ignore
	}
}

export async function uploadDicomFileToStow(
	file: File | Blob,
	patientId?: string | null,
	doctorId?: string | null,
): Promise<boolean> {
	try {
		const arrayBuf = await file.arrayBuffer();
		const params = new URLSearchParams();
		if (patientId) params.set("patientId", patientId);
		if (doctorId) params.set("doctorId", doctorId);
		const qs = params.toString() ? `?${params.toString()}` : "";
		const res = await fetch(`/api/dicomweb/studies${qs}`, {
			method: "POST",
			headers: denteClinicalMutationHeaders({
				"Content-Type": "application/dicom",
				"Idempotency-Key": crypto.randomUUID(),
			}),
			body: arrayBuf,
		});
		return res.ok;
	} catch (err) {
		logger.warn("[DicomArchiveUploader] STOW-RS upload failed:", err);
		return false;
	}
}

export const MAX_SAFE_FILE_SIZE_BYTES = 1.5 * 1024 * 1024 * 1024; // 1.5 GB
export const BATCH_PROCESSING_CHUNK_SIZE = 50;
