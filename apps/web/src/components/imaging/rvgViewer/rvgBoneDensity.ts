/**
 * rvgBoneDensity.ts — Расчет профиля плотности кости (HU) по линейному вектору (Мандат 8b <= 120 строк).
 */

import type { Point2D } from "@dental/shared";
import type { HuProfileSample, HuProfileStats } from "./types";

export function classifyMischDensity(hu: number): "D1" | "D2" | "D3" | "D4" | "D5" {
	if (hu > 1250) return "D1";
	if (hu >= 850) return "D2";
	if (hu >= 350) return "D3";
	if (hu >= 150) return "D4";
	return "D5";
}

export function calculateBoneDensityProfile(
	p1: Point2D,
	p2: Point2D,
	windowWidth: number,
	windowCenter: number,
	mmPerPixel: number,
	sampleCount = 30,
	canvas?: HTMLCanvasElement | null,
): HuProfileStats {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	const lengthPx = Math.sqrt(dx * dx + dy * dy);
	const lengthMm = lengthPx * mmPerPixel;
	const count = Math.max(5, sampleCount);

	let ctx: CanvasRenderingContext2D | null = null;
	let imgData: ImageData | null = null;
	if (canvas && canvas.width > 0 && canvas.height > 0) {
		try {
			ctx = canvas.getContext("2d", { willReadFrequently: true });
			if (ctx) imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		} catch {}
	}

	const samples: HuProfileSample[] = [];
	let sumHu = 0;
	let minHu = Number.POSITIVE_INFINITY;
	let maxHu = Number.NEGATIVE_INFINITY;
	const classCounts: Record<string, number> = { D1: 0, D2: 0, D3: 0, D4: 0, D5: 0 };
	const ww = Math.max(10, windowWidth);
	const wl = windowCenter;

	for (let i = 0; i < count; i++) {
		const t = i / (count - 1);
		const currX = p1.x + dx * t;
		const currY = p1.y + dy * t;
		const distMm = Number((lengthMm * t).toFixed(2));

		let intensity = 0;
		if (imgData && ctx) {
			const px = Math.min(imgData.width - 1, Math.max(0, Math.round(currX)));
			const py = Math.min(imgData.height - 1, Math.max(0, Math.round(currY)));
			const idx = (py * imgData.width + px) * 4;
			const r = imgData.data[idx] ?? 128;
			const g = imgData.data[idx + 1] ?? 128;
			const b = imgData.data[idx + 2] ?? 128;
			intensity = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
		}

		const calculatedHu = Math.round(wl - ww / 2 + (intensity / 255) * ww);
		const misch = classifyMischDensity(calculatedHu);

		samples.push({ distanceMm: distMm, hu: calculatedHu, mischClass: misch, intensity });
		sumHu += calculatedHu;
		if (calculatedHu < minHu) minHu = calculatedHu;
		if (calculatedHu > maxHu) maxHu = calculatedHu;
		classCounts[misch] = (classCounts[misch] || 0) + 1;
	}

	let dominantClass: "D1" | "D2" | "D3" | "D4" | "D5" = "D2";
	let maxCount = -1;
	for (const [cls, cnt] of Object.entries(classCounts)) {
		if (cnt > maxCount) {
			maxCount = cnt;
			dominantClass = cls as "D1" | "D2" | "D3" | "D4" | "D5";
		}
	}

	return {
		samples,
		meanHu: Math.round(sumHu / count),
		minHu: minHu === Number.POSITIVE_INFINITY ? 0 : minHu,
		maxHu: maxHu === Number.NEGATIVE_INFINITY ? 0 : maxHu,
		dominantClass,
		lengthMm: Number(lengthMm.toFixed(2)),
	};
}
