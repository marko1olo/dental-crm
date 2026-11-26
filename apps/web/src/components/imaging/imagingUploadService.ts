/**
 * imagingUploadService.ts — Сервис загрузки снимков и интеграции с бэкендом Fastify
 * Mandate 8b: строго <= 120 строк.
 */

import { isDemoShowcaseMode } from "../../lib/demoMode.js";
import { denteClinicalMutationHeaders } from "../../lib/denteRequestHeaders.js";
import { showToast } from "../GlobalToast.js";
import { inferStudyKind, type InferredImagingKind } from "./upload/inferStudyKind.js";
import { createLocalFallbackStudy } from "./upload/localFallbackStudy.js";
import { uploadImagingScanChunked } from "./upload/chunkedImagingUpload.js";
import type { ImagingStudy } from "./types.js";

const CHUNKED_UPLOAD_THRESHOLD_BYTES = 2 * 1024 * 1024;

export { inferStudyKind };
export type { InferredImagingKind };

export interface UploadImagingOptions {
	patientId?: string | null | undefined;
	visitId?: string | null | undefined;
	doctorId?: string | null | undefined;
	kind?: string | undefined;
	title?: string | undefined;
	toothCode?: string | null | undefined;
	region?: string | null | undefined;
	onProgress?: ((pct: number) => void) | undefined;
}

export interface UploadImagingResult {
	success: boolean;
	study?: ImagingStudy | undefined;
	error?: string | undefined;
}

export async function uploadImagingScanFile(
	file: File,
	options: UploadImagingOptions,
): Promise<UploadImagingResult> {
	const kind = options.kind || inferStudyKind(file.name);
	const title = options.title || file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").trim() || "Рентгеновский снимок";
	const effectivePatientId = options.patientId || (isDemoShowcaseMode() ? "demo-patient-active" : null);

	if (!effectivePatientId) {
		showToast("Выберите пациента перед загрузкой рентгеновского снимка", "warning");
		return { success: false, error: "Пациент не выбран" };
	}

	try {
		if (
			file.size > CHUNKED_UPLOAD_THRESHOLD_BYTES &&
			typeof crypto !== "undefined" &&
			typeof crypto.subtle?.digest === "function"
		) {
			const chunkRes = await uploadImagingScanChunked({
				file,
				patientId: effectivePatientId,
				visitId: options.visitId,
				kind,
				title,
				toothCode: options.toothCode,
				region: options.region,
				onProgress: options.onProgress,
			});
			if (chunkRes.success && chunkRes.study) {
				showToast(`Снимок «${title}» успешно загружен`, "success");
				return { success: true, study: chunkRes.study };
			}
			if (!isDemoShowcaseMode() && navigator.onLine) {
				const errText = chunkRes.error || "Ошибка чанковой передачи снимка";
				showToast(`Не удалось загрузить снимок: ${errText}`, "error");
				return { success: false, error: errText };
			}
		}

		options.onProgress?.(25);
		const formData = new FormData();
		formData.append("file", file, file.name);
		formData.append("patientId", effectivePatientId);
		if (options.visitId) formData.append("visitId", options.visitId);
		if (options.doctorId) formData.append("doctorId", options.doctorId);
		formData.append("kind", kind);
		formData.append("title", title);
		if (options.toothCode) formData.append("toothCode", options.toothCode);
		if (options.region) formData.append("region", options.region);

		const idempotencyKey = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
			? crypto.randomUUID()
			: `imaging-upload-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

		const res = await fetch("/api/imaging/upload", {
			method: "POST",
			headers: denteClinicalMutationHeaders({
				"Idempotency-Key": idempotencyKey,
			}),
			body: formData,
		});

		if (res.ok) {
			const rawData = await res.json();
			const data = rawData?.data ?? rawData;
			options.onProgress?.(100);
			showToast(`Снимок «${title}» успешно загружен`, "success");
			return { success: true, study: data.study };
		}

		if (isDemoShowcaseMode() || !navigator.onLine) {
			const fallbackStudy = createLocalFallbackStudy(file, { patientId: effectivePatientId, visitId: options.visitId, kind, title, toothCode: options.toothCode, region: options.region });
			showToast(`Снимок «${title}» добавлен локально`, "info");
			return { success: true, study: fallbackStudy };
		}

		let rawErrData: { data?: { message?: string }; message?: string } | null = null;
		let parseDetail = "";
		try {
			rawErrData = (await res.json()) as { data?: { message?: string }; message?: string };
		} catch (parseErr) {
			parseDetail = parseErr instanceof Error ? `: ${parseErr.message}` : "";
		}
		const errData = rawErrData?.data ?? rawErrData;
		const errorMsg = errData?.message || `Ошибка сервера (${res.status})${parseDetail}`;
		showToast(`Не удалось загрузить снимок: ${errorMsg}`, "error");
		return { success: false, error: errorMsg };
	} catch (err: unknown) {
		if (isDemoShowcaseMode() || !navigator.onLine) {
			const fallbackStudy = createLocalFallbackStudy(file, { patientId: effectivePatientId, visitId: options.visitId, kind, title, toothCode: options.toothCode, region: options.region });
			showToast(`Снимок «${title}» добавлен локально`, "info");
			return { success: true, study: fallbackStudy };
		}
		const msg = err instanceof Error ? err.message : "Ошибка сетевого соединения при загрузке снимка";
		showToast(msg, "error");
		return { success: false, error: msg };
	}
}
