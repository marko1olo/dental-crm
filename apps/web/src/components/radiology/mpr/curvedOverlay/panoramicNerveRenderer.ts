import type { PanoramicOverlayParams } from "./types";
import { project3DNerveToPanorama } from "../../dentalCurveEngine";

export function renderNerveProjection(
	ctx: CanvasRenderingContext2D,
	interpolatedNerve3D: PanoramicOverlayParams["interpolatedNerve3D"],
	nervePoints: PanoramicOverlayParams["nervePoints"],
	archCurve: PanoramicOverlayParams["archCurve"],
	activePano: PanoramicOverlayParams["activePano"],
): void {
	const projectedNerve = project3DNerveToPanorama(
		interpolatedNerve3D, archCurve, activePano.widthPx, activePano.heightPx,
		{ heightMm: activePano.heightMm ?? 74.0, centerZMm: activePano.centerZMm ?? (archCurve.planeZMm ?? 0.0) },
	);
	if (projectedNerve.projectedPoints.length <= 1) return;

	ctx.save();
	ctx.strokeStyle = "rgba(239, 68, 68, 0.55)";
	ctx.fillStyle = "rgba(239, 68, 68, 0.14)";
	ctx.lineWidth = 1.2;
	ctx.setLineDash([3, 2]);
	ctx.beginPath();
	for (let i = 0; i < projectedNerve.safetyCorridorPolygon.length; i++) {
		const pt = projectedNerve.safetyCorridorPolygon[i]!;
		if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
	}
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	ctx.setLineDash([]);

	ctx.strokeStyle = "#ef4444";
	ctx.lineWidth = 2.0;
	ctx.beginPath();
	for (let i = 0; i < projectedNerve.projectedPoints.length; i++) {
		const pt = projectedNerve.projectedPoints[i]!;
		if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
	}
	ctx.stroke();

	for (const pt of nervePoints) {
		const nodePano = project3DNerveToPanorama([pt], archCurve, activePano.widthPx, activePano.heightPx);
		const nodePt = nodePano.projectedPoints[0];
		if (nodePt) {
			ctx.fillStyle = "#ffffff";
			ctx.strokeStyle = "#ef4444";
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.arc(nodePt.x, nodePt.y, 2.5, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
		}
	}
	ctx.restore();
}
