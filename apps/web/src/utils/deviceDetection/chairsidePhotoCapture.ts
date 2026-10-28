/**
 * DENTE CRM — Chairside Clinical Photo Capture
 *
 * Captures dental photographs (macro, facial, X-ray lightbox) using native camera or HTML5 stream.
 */

import type { ChairsidePhotoOptions, ChairsidePhotoResult } from "@dental/shared";

export async function captureChairsidePhoto(options: ChairsidePhotoOptions = {}): Promise<ChairsidePhotoResult> {
	const now = new Date().toISOString();
	if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
		return { success: false, capturedAt: now, error: "Камера недоступна в данном окружении или требуется HTTPS" };
	}

	try {
		const targetWidth = options.resolution === "macro" ? 3840 : options.resolution === "high" ? 1920 : 1280;
		const targetHeight = options.resolution === "macro" ? 2160 : options.resolution === "high" ? 1080 : 720;

		const stream = await navigator.mediaDevices.getUserMedia({
			video: {
				facingMode: options.facingMode ?? "environment",
				width: { ideal: targetWidth },
				height: { ideal: targetHeight },
			},
			audio: false,
		});

		const video = document.createElement("video");
		video.playsInline = true;
		video.muted = true;
		video.srcObject = stream;

		await new Promise<void>((resolve, reject) => {
			video.onloadedmetadata = () => { video.play().then(() => resolve()).catch(reject); };
			video.onerror = () => reject(new Error("Не удалось инициализировать видеопоток"));
			setTimeout(() => resolve(), 1500);
		});

		const width = video.videoWidth || targetWidth;
		const height = video.videoHeight || targetHeight;
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;

		const ctx = canvas.getContext("2d");
		if (!ctx) {
			stream.getTracks().forEach((t) => t.stop());
			return { success: false, capturedAt: now, error: "Ошибка создания 2D-контекста" };
		}

		ctx.drawImage(video, 0, 0, width, height);
		stream.getTracks().forEach((t) => t.stop());

		return {
			success: true,
			dataUrl: canvas.toDataURL("image/jpeg", 0.92),
			mimeType: "image/jpeg",
			widthPx: width,
			heightPx: height,
			capturedAt: now,
			toothCode: options.toothCode,
			viewCategory: options.viewCategory,
		};
	} catch (err) {
		return { success: false, capturedAt: now, error: err instanceof Error ? err.message : "Ошибка работы с камерой" };
	}
}
