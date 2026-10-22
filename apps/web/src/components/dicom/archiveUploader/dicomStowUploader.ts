/**
 * dicomStowUploader.ts — отправка DICOM срезов на PACS / STOW-RS эндпоинт сервера.
 * Mandate 8b: Модульность, строго < 120 строк.
 */

import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { logger } from "../../../utils/logger";

let dicomImageLoaderPromise: Promise<any> | null = null;

export async function getDicomImageLoader() {
	if (!dicomImageLoaderPromise) {
		dicomImageLoaderPromise = import("@cornerstonejs/dicom-image-loader").then(
			(mod) => mod.default ?? mod,
		);
	}
	return dicomImageLoaderPromise;
}

export function purgeDicomImageLoader(): void {
	try {
		if (dicomImageLoaderPromise) {
			void dicomImageLoaderPromise.then((loader) => {
				loader?.wadouri?.fileManager?.purge?.();
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
			headers: denteAdminSecretRequestHeaders({
				"Content-Type": "application/dicom",
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
