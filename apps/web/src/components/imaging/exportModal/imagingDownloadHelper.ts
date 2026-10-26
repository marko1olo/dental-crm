/**
 * imagingDownloadHelper.ts — Экспорт и скачивание снимка в формате JPG/PNG
 * Mandate 8b: строго <= 120 строк.
 */

import { showToast } from "../../GlobalToast.js";

function fallbackDirectDownload(url: string, prefix: string, toothCode?: string | null): void {
	const a = document.createElement("a");
	const toothPart = toothCode ? `_tooth${toothCode}` : "";
	a.download = `${prefix}${toothPart}.jpg`;
	a.href = url;
	a.target = "_blank";
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	showToast("Снимок скачивается...", "info");
}

export function downloadStudyImageAsJpg(
	imageUrl: string,
	filenamePrefix = "dental_xray",
	toothCode?: string | null | undefined,
): void {
	if (typeof window === "undefined" || !imageUrl) return;

	try {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => {
			const canvas = document.createElement("canvas");
			canvas.width = img.naturalWidth || img.width || 800;
			canvas.height = img.naturalHeight || img.height || 600;
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				fallbackDirectDownload(imageUrl, filenamePrefix, toothCode);
				return;
			}
			ctx.drawImage(img, 0, 0);

			canvas.toBlob(
				(blob) => {
					if (!blob) {
						fallbackDirectDownload(imageUrl, filenamePrefix, toothCode);
						return;
					}
					const url = URL.createObjectURL(blob);
					const a = document.createElement("a");
					const toothPart = toothCode ? `_tooth${toothCode}` : "";
					a.download = `${filenamePrefix}${toothPart}_${Date.now()}.jpg`;
					a.href = url;
					document.body.appendChild(a);
					a.click();
					document.body.removeChild(a);
					setTimeout(() => URL.revokeObjectURL(url), 4000);
					showToast("Снимок сохранён в JPG", "success");
				},
				"image/jpeg",
				0.95,
			);
		};
		img.onerror = () => {
			fallbackDirectDownload(imageUrl, filenamePrefix, toothCode);
		};
		img.src = imageUrl;
	} catch {
		fallbackDirectDownload(imageUrl, filenamePrefix, toothCode);
	}
}
