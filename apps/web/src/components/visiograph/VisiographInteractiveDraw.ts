/**
 * VisiographInteractiveDraw.ts
 * Renders in-progress interactive tool overlays on HTML5 Canvas 2D context.
 */

import { calculateAngle3Points, distance2D } from "./VisiographMeasurementMath";
import type { DrawInteractiveOverlayOptions } from "./VisiographInteractiveTypes";

export function drawInteractiveOverlay(
	ctx: CanvasRenderingContext2D,
	{ activeTool, drawingPoints, hoverPos, calibration }: DrawInteractiveOverlayOptions,
): void {
	if (drawingPoints.length === 0) return;
	ctx.save();

	if (activeTool === "ruler" || activeTool === "calibrate") {
		const p1 = drawingPoints[0];
		const p2 = hoverPos || p1;
		if (p1 && p2) {
			ctx.strokeStyle = activeTool === "calibrate" ? "#76ff03" : "#00e5ff";
			ctx.lineWidth = 2;
			ctx.setLineDash([4, 4]);
			ctx.beginPath();
			ctx.moveTo(p1.x, p1.y);
			ctx.lineTo(p2.x, p2.y);
			ctx.stroke();

			const mm = distance2D(p1, p2) * calibration.scaleMmPerPixel;
			ctx.fillStyle = "#ffffff";
			ctx.font = "bold 12px sans-serif";
			ctx.fillText(`${mm.toFixed(1)} мм`, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - 8);
		}
	} else if (activeTool === "angle") {
		ctx.strokeStyle = "#ffab00";
		ctx.lineWidth = 2;
		ctx.setLineDash([4, 4]);
		if (drawingPoints.length === 1 && hoverPos) {
			const p1 = drawingPoints[0]!;
			ctx.beginPath();
			ctx.moveTo(p1.x, p1.y);
			ctx.lineTo(hoverPos.x, hoverPos.y);
			ctx.stroke();
		} else if (drawingPoints.length === 2 && hoverPos) {
			const v = drawingPoints[0]!;
			const arm1 = drawingPoints[1]!;
			ctx.beginPath();
			ctx.moveTo(arm1.x, arm1.y);
			ctx.lineTo(v.x, v.y);
			ctx.lineTo(hoverPos.x, hoverPos.y);
			ctx.stroke();

			const tempAngle = calculateAngle3Points(v, arm1, hoverPos);
			ctx.fillStyle = "#ffffff";
			ctx.font = "bold 12px sans-serif";
			ctx.fillText(`${tempAngle.angleDeg.toFixed(1)}°`, v.x + 10, v.y - 10);
		}
	} else if (activeTool === "lesion") {
		ctx.strokeStyle = "#ff1744";
		ctx.lineWidth = 2;
		ctx.setLineDash([3, 3]);
		ctx.beginPath();
		const first = drawingPoints[0]!;
		ctx.moveTo(first.x, first.y);
		for (let i = 1; i < drawingPoints.length; i++) ctx.lineTo(drawingPoints[i]!.x, drawingPoints[i]!.y);
		if (hoverPos) ctx.lineTo(hoverPos.x, hoverPos.y);
		ctx.stroke();
	} else if (activeTool === "root_canal") {
		ctx.strokeStyle = "#10b981";
		ctx.lineWidth = 2.5;
		ctx.setLineDash([2, 2]);
		ctx.beginPath();
		const first = drawingPoints[0]!;
		ctx.moveTo(first.x, first.y);
		for (let i = 1; i < drawingPoints.length; i++) ctx.lineTo(drawingPoints[i]!.x, drawingPoints[i]!.y);
		if (hoverPos) ctx.lineTo(hoverPos.x, hoverPos.y);
		ctx.stroke();

		const allPts = hoverPos ? [...drawingPoints, hoverPos] : drawingPoints;
		for (const pt of allPts) {
			ctx.fillStyle = "#10b981";
			ctx.beginPath();
			ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
			ctx.fill();
		}

		let dist = 0;
		for (let i = 1; i < allPts.length; i++) dist += distance2D(allPts[i - 1]!, allPts[i]!);
		const lengthMm = dist * calibration.scaleMmPerPixel;
		const last = allPts[allPts.length - 1];
		if (last) {
			ctx.fillStyle = "#10b981";
			ctx.font = "bold 13px monospace";
			ctx.fillText(`WL = ${lengthMm.toFixed(1)} мм (Апекс)`, last.x + 8, last.y - 8);
		}
	}
	ctx.restore();
}
