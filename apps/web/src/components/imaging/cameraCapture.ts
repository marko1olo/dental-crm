import { readDenteClinicToken } from "../../lib/safeLocalStorage";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import { compressCameraFile } from "./cameraCaptureCompressor";

export interface CameraCaptureParams {
	file: File;
	activePatientId: string;
	activeAppointmentId?: string;
	onStudyCreated?: (studyId: string) => void;
	onDashboardRefresh?: () => void;
}

export async function processCameraPhotoCapture({
	file,
	activePatientId,
	activeAppointmentId,
	onStudyCreated,
	onDashboardRefresh,
}: CameraCaptureParams): Promise<void> {
	let cleanupFn: (() => void) | undefined;
	try {
		const { uploadBlob, cleanup } = await compressCameraFile(file);
		cleanupFn = cleanup;

		const clinicToken = readDenteClinicToken() || null;
		const formData = new FormData();
		formData.append("file", uploadBlob, "chairside_camera.webp");
		formData.append("entityType", "patient");
		formData.append("entityId", activePatientId);

		let storagePath: string | undefined;
		try {
			const uploadRes = await fetch(
				`/api/files/patients/${encodeURIComponent(activePatientId)}/attachments`,
				{
					method: "POST",
					headers: {
						...(clinicToken ? { "x-dente-clinic-token": clinicToken } : {}),
					},
					body: formData,
				},
			);

			if (uploadRes.ok) {
				const uploadData = (await uploadRes.json()) as {
					attachment?: { storagePath?: string };
					file?: { url?: string };
				};
				storagePath = uploadData.attachment?.storagePath || uploadData.file?.url;
			}
		} catch {
			// Офлайн режим
		}

		const studyRes = await fetch("/api/imaging/studies", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(clinicToken ? { "x-dente-clinic-token": clinicToken } : {}),
			},
			body: JSON.stringify({
				patientId: activePatientId,
				visitId: activeAppointmentId || undefined,
				kind: "photo",
				title: "Снимок с камеры (кресло)",
				region: "полость рта / негатоскоп",
				sourceKind: "camera_macro",
				sourceName: "Камера устройства",
				storagePath: storagePath || undefined,
				capturedAt: new Date().toISOString(),
			}),
		});

		if (studyRes.ok) {
			const created = (await studyRes.json()) as { id?: string };
			showToast("Снимок с камеры успешно добавлен в карту", "success", 5000);
			if (created?.id && onStudyCreated) {
				onStudyCreated(created.id);
			}
			if (onDashboardRefresh) {
				onDashboardRefresh();
			}
		} else {
			showToast("Снимок сохранён во вложениях пациента", "info", 6000);
		}
	} catch (err) {
		logger.error("[imaging camera capture] error", err);
		showToast("Ошибка при сохранении снимка с камеры", "error", 8000);
	} finally {
		if (cleanupFn) cleanupFn();
	}
}
