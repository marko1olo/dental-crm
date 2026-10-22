import { isDemoShowcaseMode } from "../../lib/demoMode.js";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders.js";
import { showToast } from "../GlobalToast.js";

export type InferredImagingKind =
	| "periapical"
	| "bitewing"
	| "opg"
	| "cbct"
	| "photo_intraoral"
	| "photo_extraoral"
	| "other";

export function inferStudyKind(filename: string): InferredImagingKind {
	const lower = filename.toLowerCase();
	if (lower.includes("pano") || lower.includes("optg") || lower.includes("opg")) {
		return "opg";
	}
	if (
		lower.endsWith(".dcm") ||
		lower.endsWith(".dicom") ||
		lower.includes("cbct") ||
		lower.includes("ct") ||
		lower.includes("томограф")
	) {
		return "cbct";
	}
	if (
		lower.includes("photo") ||
		lower.includes("фото") ||
		lower.includes("intraoral") ||
		lower.includes("dsc_") ||
		lower.includes("img_")
	) {
		return "photo_intraoral";
	}
	if (lower.includes("bite") || lower.includes("прикус")) {
		return "bitewing";
	}
	return "periapical";
}

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

/**
 * Streaming drag-and-drop & file picker upload for digital radiology (RVG, CBCT, OPG, DICOM, Photo).
 * Connects directly to Fastify `/api/imaging/upload` with Mandate 8e Doctor Autonomy fallback.
 */
export async function uploadImagingScanFile(
	file: File,
	options: UploadImagingOptions,
): Promise<UploadImagingResult> {
	const kind = options.kind || inferStudyKind(file.name);
	const title =
		options.title ||
		file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").trim() ||
		"Рентгеновский снимок";

	// Handle DICOM zip archive directly in client-side processor if needed
	if (file.name.toLowerCase().endsWith(".zip")) {
		// Handled via DicomArchiveUploader or backend STOW
	}

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

		const headers = denteAdminSecretRequestHeaders();

		const res = await fetch("/api/imaging/upload", {
			method: "POST",
			headers,
			body: formData,
		});

		if (res.ok) {
			const data = await res.json();
			const study = data.study;
			showToast(`Снимок «${title}» успешно загружен`, "success");
			return { success: true, study };
		}

		// If server failed (e.g. offline standalone mode / demo), fallback gracefully (Mandate 8e)
		if (isDemoShowcaseMode() || !navigator.onLine) {
			const localBlobUrl = URL.createObjectURL(file);
			const fallbackStudy = {
				id: `local_scan_${Date.now()}`,
				patientId: effectivePatientId,
				visitId: options.visitId || null,
				kind,
				title,
				toothCode: options.toothCode || null,
				region: options.region || null,
				previewUrl: localBlobUrl,
				hasFile: true,
				capturedAt: new Date().toISOString(),
				sourceKind: "browser_local_upload",
				sourceName: file.name,
			};
			showToast(`Снимок «${title}» добавлен локально`, "info");
			return { success: true, study: fallbackStudy };
		}

		const errData = await res.json().catch(() => null);
		const errorMsg = errData?.message || `Ошибка сервера (${res.status})`;
		showToast(`Не удалось загрузить снимок: ${errorMsg}`, "error");
		return { success: false, error: errorMsg };
	} catch (err: any) {
		if (isDemoShowcaseMode() || !navigator.onLine) {
			const localBlobUrl = URL.createObjectURL(file);
			const fallbackStudy = {
				id: `local_scan_${Date.now()}`,
				patientId: effectivePatientId,
				visitId: options.visitId || null,
				kind,
				title,
				toothCode: options.toothCode || null,
				region: options.region || null,
				previewUrl: localBlobUrl,
				hasFile: true,
				capturedAt: new Date().toISOString(),
				sourceKind: "browser_local_upload",
				sourceName: file.name,
			};
			showToast(`Снимок «${title}» добавлен локально`, "info");
			return { success: true, study: fallbackStudy };
		}
		const msg = err?.message || "Ошибка сетевого соединения при загрузке снимка";
		showToast(msg, "error");
		return { success: false, error: msg };
	}
}
