/**
 * DENTE CRM — Chairside Camera & Photo Capture Bridge (Layer 2)
 *
 * Integrates Capacitor Camera plugin, intraoral camera streams, and offline patient attachments.
 */

import type {
	MobileCameraPhotoOptions,
	MobileCameraPhotoResult,
} from "./types";
import { isNativePlatform, getMobileNativeApi } from "./platform";
import { triggerHaptic } from "./hapticsAndAudio";

/**
 * Captures chairside dental clinical photo directly into the patient card.
 * Routes through native Android APK Capacitor Camera plugin if available,
 * custom mobile bridge, or falls back to WebRTC MediaDevices video capture.
 */
export async function captureMobileCameraPhoto(
	options: MobileCameraPhotoOptions = {},
): Promise<MobileCameraPhotoResult> {
	const now = new Date().toISOString();

	// 1. Check Capacitor Camera Plugin (Android APK / Tablet at chairside)
	if (isNativePlatform()) {
		const cameraPlugin = window.Capacitor?.Plugins?.Camera;
		if (cameraPlugin?.getPhoto) {
			try {
				const photo = await cameraPlugin.getPhoto({
					quality: options.resolution === "macro" ? 95 : options.resolution === "high" ? 90 : 85,
					allowEditing: false,
					resultType: "dataUrl",
					source: "camera",
					direction: options.facingMode === "user" ? "front" : "rear",
				});

				const dataUrl = photo.dataUrl || (photo.base64String ? `data:image/${photo.format || "jpeg"};base64,${photo.base64String}` : undefined);
				if (dataUrl) {
					triggerHaptic("success");
					return {
						success: true,
						dataUrl,
						mimeType: photo.format ? `image/${photo.format}` : "image/jpeg",
						capturedAt: now,
						toothCode: options.toothCode,
						viewCategory: options.viewCategory,
					};
				}
			} catch (err: unknown) {
				const errMsg = err instanceof Error ? err.message : String(err);
				if (errMsg.toLowerCase().includes("cancel")) {
					return {
						success: false,
						capturedAt: now,
						error: "Съемка фото отменена пользователем",
					};
				}
			}
		}

		// 2. Custom native bridge method if present
		const nativeApi = getMobileNativeApi();
		if (nativeApi?.capturePhoto) {
			try {
				const res = await nativeApi.capturePhoto({
					quality: options.resolution === "macro" ? 95 : 90,
					facingMode: options.facingMode ?? "environment",
				});
				if (res.success && res.dataUrl) {
					triggerHaptic("success");
					return {
						success: true,
						dataUrl: res.dataUrl,
						mimeType: "image/jpeg",
						capturedAt: now,
						toothCode: options.toothCode,
						viewCategory: options.viewCategory,
					};
				}
			} catch (err: unknown) {
				console.warn("[mobileBridge] native takeIntraoralPhoto failed, falling back:", err);
				// Fall through
			}
		}
	}

	// 3. Fallback: browser / PWA HTML5 MediaDevices camera capture
	const { captureChairsidePhoto } = await import("../../utils/deviceDetection.js");
	return captureChairsidePhoto({
		...(options.toothCode ? { toothCode: options.toothCode } : {}),
		...(options.viewCategory ? { viewCategory: options.viewCategory } : {}),
		...(options.facingMode ? { facingMode: options.facingMode } : {}),
		...(options.resolution ? { resolution: options.resolution } : {}),
	});
}

/**
 * Captures chairside dental photograph directly into the patient card attachments.
 * On Android APK: uses Capacitor Camera plugin with native camera UI.
 * Saves result directly into offline drafts / patient attachments.
 */
export async function captureAndAttachPatientPhoto(params: {
	patientId: string;
	toothCode?: string;
	viewCategory?:
		| "portrait"
		| "occlusion"
		| "upper_arch"
		| "lower_arch"
		| "intraoral_macro"
		| "xray_film_scan";
	resolution?: "standard" | "high" | "macro";
}): Promise<{
	success: boolean;
	dataUrl?: string;
	toothCode?: string;
	viewCategory?: string;
	capturedAt: string;
	error?: string;
}> {
	const now = new Date().toISOString();
	try {
		const photoRes = await captureMobileCameraPhoto({
			resolution: params.resolution ?? "macro",
			toothCode: params.toothCode,
			viewCategory: params.viewCategory ?? "intraoral_macro",
		});

		if (!photoRes.success || !photoRes.dataUrl) {
			return {
				success: false,
				capturedAt: now,
				error: photoRes.error || "Не удалось захватить снимок с камеры",
			};
		}

		// Save draft in unified offline storage for zero data loss (Mandate 8e)
		try {
			const { saveOfflineDraft } = await import("../../services/offline/index.js");
			await saveOfflineDraft(
				`photo_attachment_${params.patientId}_${Date.now()}`,
				"DIARY_043_DRAFT",
				params.patientId,
				{
					patientId: params.patientId,
					toothCode: params.toothCode,
					viewCategory: params.viewCategory ?? "intraoral_macro",
					dataUrl: photoRes.dataUrl,
					capturedAt: now,
				},
			);
		} catch (err: unknown) {
			console.warn("[mobileBridge] saveOfflineRecord photo attachment failed:", err);
			// Storage failure does not discard captured photo in memory
		}

		return {
			success: true,
			dataUrl: photoRes.dataUrl,
			...(params.toothCode ? { toothCode: params.toothCode } : {}),
			viewCategory: params.viewCategory ?? "intraoral_macro",
			capturedAt: now,
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : "Ошибка захвата фото пациента";
		return {
			success: false,
			capturedAt: now,
			error: message,
		};
	}
}
