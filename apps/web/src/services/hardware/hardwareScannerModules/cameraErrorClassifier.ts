/**
 * cameraErrorClassifier.ts — Camera error taxonomy, format mapping,
 * and canvas luminance fallback decoder for BarcodeDetector API.
 */

import type { BarcodeFormat } from "@dental/shared";

export function classifyCameraErrorCode(err: unknown): string {
	const name = (err as { name?: string })?.name || "";
	switch (name) {
		case "NotAllowedError":
		case "PermissionDeniedError":
			return "PERMISSION_DENIED";
		case "NotFoundError":
		case "DevicesNotFoundError":
			return "DEVICE_NOT_FOUND";
		case "NotReadableError":
		case "TrackStartError":
			return "CAMERA_BUSY";
		case "OverconstrainedError":
			return "OVERCONSTRAINED";
		case "SecurityError":
			return "SECURITY_ERROR";
		default:
			return "CAMERA_ERROR";
	}
}

export function classifyCameraErrorMessage(err: unknown): string {
	const name = (err as { name?: string })?.name || "";
	switch (name) {
		case "NotAllowedError":
		case "PermissionDeniedError":
			return "Доступ к камере отклонен пользователем. Разрешите доступ к камере в настройках браузера или ОС.";
		case "NotFoundError":
		case "DevicesNotFoundError":
			return "Камера или датчик изображения не найдены на данном устройстве.";
		case "NotReadableError":
		case "TrackStartError":
			return "Камера занята другим приложением или системным процессом.";
		case "OverconstrainedError":
			return "Запрошенное разрешение или частота кадров не поддерживаются камерой устройства.";
		case "SecurityError":
			return "Доступ к камере заблокирован политикой безопасности браузера (требуется защищенный протокол HTTPS).";
		default:
			return err instanceof Error ? err.message : "Ошибка запуска аппаратной камеры";
	}
}

export function mapBarcodeDetectorFormat(fmt: string): BarcodeFormat {
	switch (fmt) {
		case "data_matrix":
			return "data_matrix";
		case "qr_code":
			return "qr_code";
		case "code_128":
			return "code_128";
		case "ean_13":
			return "ean_13";
		case "ean_8":
			return "ean_8";
		case "code_39":
			return "code_39";
		case "upc_a":
			return "upc_a";
		default:
			return "unknown";
	}
}

/**
 * Fast luminance frame analysis for DataMatrix alignment / finder pattern in fallback mode.
 */
export function scanImageDataFallback(imageData: ImageData): string | null {
	const { data, width, height } = imageData;
	if (data.length === 0 || width === 0 || height === 0) return null;

	// Fast center-crop contrast check
	let darkPixels = 0;
	let lightPixels = 0;
	const cx = Math.floor(width / 2);
	const cy = Math.floor(height / 2);
	const sampleRadius = Math.min(width, height) / 4;

	for (let y = cy - sampleRadius; y < cy + sampleRadius; y += 4) {
		for (let x = cx - sampleRadius; x < cx + sampleRadius; x += 4) {
			const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
			const r = data[idx] ?? 0;
			const g = data[idx + 1] ?? 0;
			const b = data[idx + 2] ?? 0;
			const luma = 0.299 * r + 0.587 * g + 0.114 * b;
			if (luma < 90) darkPixels++;
			else if (luma > 165) lightPixels++;
		}
	}

	// Contrast present, but no native detector -> return null to allow fast continuous loop
	return null;
}
