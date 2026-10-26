/**
 * dicomScreenCaptureHelper.ts — Снимок экрана/холста DICOM и сохранение в буфер/файл
 * Mandate 8b: строго <= 120 строк.
 */

import { showToast } from "../../GlobalToast.js";

export async function captureDicomCanvas(
	copyToClipboardOnly = true,
	toothFdiCode?: string,
): Promise<void> {
	const canvas = document.querySelector<HTMLCanvasElement>(
		"[data-testid='dicom-viewport-canvas']",
	);
	if (!canvas) {
		showToast("Холст снимка не найден для захвата", "warning");
		return;
	}
	try {
		if (copyToClipboardOnly && typeof navigator !== "undefined" && navigator.clipboard) {
			canvas.toBlob(async (blob) => {
				if (blob) {
					try {
						const item = new ClipboardItem({ "image/png": blob });
						await navigator.clipboard.write([item]);
						showToast("Снимок среза скопирован в буфер обмена (Ctrl+V)", "success");
					} catch {
						const dataUrl = canvas.toDataURL("image/png");
						await navigator.clipboard.writeText(dataUrl);
						showToast("Ссылка на снимок скопирована в буфер обмена", "success");
					}
				}
			}, "image/png");
		} else {
			const dataUrl = canvas.toDataURL("image/png");
			const a = document.createElement("a");
			a.href = dataUrl;
			a.download = `DENTE_Slice_${toothFdiCode ? `Tooth${toothFdiCode}_` : ""}${Date.now()}.png`;
			a.click();
			showToast("Снимок высокого разрешения сохранён (PNG)", "success");
		}
	} catch (err: any) {
		showToast("Ошибка при захвате снимка: " + (err?.message || "сбой"), "error");
	}
}
