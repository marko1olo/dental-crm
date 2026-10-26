/**
 * imagingUploadService.ts — Сервис загрузки снимков и интеграции с бэкендом Fastify
 * Mandate 8b: строго <= 120 строк.
 */

import { isDemoShowcaseMode } from "../../lib/demoMode.js";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders.js";
import { showToast } from "../GlobalToast.js";
import { inferStudyKind, type InferredImagingKind } from "./upload/inferStudyKind.js";
import { createLocalFallbackStudy } from "./upload/localFallbackStudy.js";

export { inferStudyKind };
export type { InferredImagingKind };

export interface UploadImagingOptions {
	patientId?: string | null;
	visitId?: string | null;
	doctorId?: string | null;
	kind?: string;
	title?: string;
	toothCode?: string | null;
	region?: string | null;
	onProgress?: (pct: number) => void;
}

export interface UploadImagingResult {
	success: boolean;
	study?: any;
	error?: string;
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
		const formData = new FormData();
		formData.append("file", file, file.name);
		formData.append("patientId", effectivePatientId);
		if (options.visitId) formData.append("visitId", options.visitId);
		if (options.doctorId) formData.append("doctorId", options.doctorId);
		formData.append("kind", kind);
		formData.append("title", title);
		if (options.toothCode) formData.append("toothCode", options.toothCode);
		if (options.region) formData.append("region", options.region);

		const res = await fetch("/api/imaging/upload", {
			method: "POST",
			headers: denteAdminSecretRequestHeaders(),
			body: formData,
		});

		if (res.ok) {
			const data = await res.json();
			showToast(`Снимок «${title}» успешно загружен`, "success");
			return { success: true, study: data.study };
		}

		if (isDemoShowcaseMode() || !navigator.onLine) {
			const fallbackStudy = createLocalFallbackStudy(file, { patientId: effectivePatientId, visitId: options.visitId, kind, title, toothCode: options.toothCode, region: options.region });
			showToast(`Снимок «${title}» добавлен локально`, "info");
			return { success: true, study: fallbackStudy };
		}

		const errData = await res.json().catch(() => null);
		const errorMsg = errData?.message || `Ошибка сервера (${res.status})`;
		showToast(`Не удалось загрузить снимок: ${errorMsg}`, "error");
		return { success: false, error: errorMsg };
	} catch (err: any) {
		if (isDemoShowcaseMode() || !navigator.onLine) {
			const fallbackStudy = createLocalFallbackStudy(file, { patientId: effectivePatientId, visitId: options.visitId, kind, title, toothCode: options.toothCode, region: options.region });
			showToast(`Снимок «${title}» добавлен локально`, "info");
			return { success: true, study: fallbackStudy };
		}
		const msg = err?.message || "Ошибка сетевого соединения при загрузке снимка";
		showToast(msg, "error");
		return { success: false, error: msg };
	}
}
