import { decodeHeicImage } from "../../services/imaging/heicDecoder";
import { readDenteClinicToken } from "../../lib/safeLocalStorage";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";

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
	let localObjectUrl: string | null = null;
	try {
		let compressedBlob: Blob | null = null;
		try {
			const decoded = await decodeHeicImage(file, {
				targetFormat: "webp",
				quality: 0.88,
				maxDimension: 1920,
				preserveColorProfile: true,
				applyExifRotation: true,
			});
			const res = await fetch(decoded.dataUrl);
			if (!res.ok) throw new Error("HEIC_DECODE_FETCH_FAILED");
			compressedBlob = await res.blob();
		} catch {
			const img = new Image();
			localObjectUrl = URL.createObjectURL(file);
			await new Promise<void>((resolve, reject) => {
				img.onload = () => resolve();
				img.onerror = () => reject(new Error("FILE_NOT_IMAGE"));
				img.src = localObjectUrl!;
			});

			const canvas = document.createElement("canvas");
			let width = img.width;
			let height = img.height;
			const MAX_SIZE = 1920;
			if (width > height && width > MAX_SIZE) {
				height = Math.round((height * MAX_SIZE) / width);
				width = MAX_SIZE;
			} else if (height > MAX_SIZE) {
				width = Math.round((width * MAX_SIZE) / height);
				height = MAX_SIZE;
			}
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext("2d");
			if (ctx) {
				ctx.drawImage(img, 0, 0, width, height);
				compressedBlob = await new Promise<Blob | null>((resolve) =>
					canvas.toBlob(resolve, "image/webp", 0.85),
				);
			}
		}

		const uploadBlob = compressedBlob || file;
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
		if (localObjectUrl) URL.revokeObjectURL(localObjectUrl);
	}
}
