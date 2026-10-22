/**
 * crossSectionPainter.ts — расчет и отрисовка 240x240 кросс-секционных срезов на canvas.
 * Mandate 8b: Модульность, строго < 120 строк.
 */

import { computeCrossSection, type Point2, type VolumeSamplingData } from "@dental/shared";
import { isLowSpecHardware, isHostUnderHeavyLoad } from "../../../utils/deviceDetection.js";
import type { CrossSectionSlicePlane } from "../panoramicMprMath";
import type { Point2D } from "../../../utils/math/mprMath";
import type { VisiographWindowPreset } from "../../visiograph/VisiographWindowPresets";
import { paintHuPixelsToCanvas } from "./panoramicTypes";

export interface PaintCrossSectionOptions {
	csCanvas: HTMLCanvasElement;
	offscreenRef: { current: HTMLCanvasElement | null };
	vol: VolumeSamplingData | null;
	activeSlice: CrossSectionSlicePlane | undefined;
	crossSections: CrossSectionSlicePlane[];
	effectiveControlPoints: Point2D[];
	currentPreset: VisiographWindowPreset;
	sliceThicknessMm: number;
}

export function paintCrossSectionSlice({
	csCanvas,
	offscreenRef,
	vol,
	activeSlice,
	crossSections,
	effectiveControlPoints,
	currentPreset,
	sliceThicknessMm,
}: PaintCrossSectionOptions): void {
	const ctx = csCanvas.getContext("2d");
	if (!ctx) return;

	const width = 240;
	const height = 240;
	csCanvas.width = width;
	csCanvas.height = height;

	const totalArcLen = crossSections[crossSections.length - 1]?.arcLengthMm || 1;

	if (!vol || !activeSlice || effectiveControlPoints.length < 2) {
		ctx.fillStyle = "#09090b";
		ctx.fillRect(0, 0, width, height);
		ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
		ctx.font = "11px sans-serif";
		ctx.textAlign = "center";
		ctx.fillText("Ожидание КЛКТ...", width / 2, height / 2);
		return;
	}

	const positionNormalized = Math.max(0, Math.min(1, activeSlice.arcLengthMm / totalArcLen));
	const widthMm = activeSlice.widthMm > 0 ? activeSlice.widthMm : 32.0;
	const resolution = widthMm / width;

	const csResult = computeCrossSection(vol, {
		controlPoints: effectiveControlPoints.map((p) => [p.x, p.y] as Point2),
		position: positionNormalized,
		tiltDeg: 0,
		widthMm,
		resolution,
	});

	if (csResult && csResult.width > 0 && csResult.height > 0) {
		if (!offscreenRef.current) {
			offscreenRef.current = document.createElement("canvas");
		}
		const offscreen = offscreenRef.current;
		paintHuPixelsToCanvas(offscreen, csResult.width, csResult.height, csResult.pixelData, currentPreset);

		ctx.fillStyle = "#09090b";
		ctx.fillRect(0, 0, width, height);

		const scale = Math.min(width / csResult.width, height / csResult.height);
		const drawW = Math.max(1, Math.round(csResult.width * scale));
		const drawH = Math.max(1, Math.round(csResult.height * scale));
		const drawX = Math.round((width - drawW) / 2);
		const drawY = Math.round((height - drawH) / 2);

		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = (isLowSpecHardware() || isHostUnderHeavyLoad()) ? "low" : "high";
		ctx.drawImage(offscreen, drawX, drawY, drawW, drawH);
	} else {
		ctx.fillStyle = "#09090b";
		ctx.fillRect(0, 0, width, height);
	}

	ctx.save();
	ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
	ctx.setLineDash([3, 3]);
	ctx.beginPath();
	ctx.moveTo(width / 2, 0);
	ctx.lineTo(width / 2, height);
	ctx.moveTo(0, height / 2);
	ctx.lineTo(width, height / 2);
	ctx.stroke();

	ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
	ctx.font = "bold 11px monospace";
	ctx.textAlign = "left";
	ctx.fillText(`${activeSlice.widthMm}x${activeSlice.heightMm} мм`, 8, 16);
	ctx.textAlign = "right";
	ctx.fillText(`Слой ${sliceThicknessMm.toFixed(1)} мм`, width - 8, 16);
	ctx.restore();
}
