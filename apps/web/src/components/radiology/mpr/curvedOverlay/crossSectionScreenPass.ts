import type { CrossSectionOverlayParams } from "./types";
import { slicePxToScreenPx } from "../../cbctMprMath";
import { crossSectionWorldMmToSlicePx } from "../../cbctCoordinateMath";
import { drawScreenSpaceMeasurements } from "./screenSpaceMeasurements";

export function drawCrossSectionScreenPass(
	ctx: CanvasRenderingContext2D,
	params: CrossSectionOverlayParams,
	worldResult: { crossSectionClearanceMidPoint: { x: number; y: number } | null; crossSectionStatusStroke: string },
): void {
	const {
		activeCrossSection, transform, nerveAuditResult, invertColors,
		rulers = [], activeRuler = null, angles = [], activeAngle = null,
		selectedMeasurement, hoveredMeasurementHandle = null, draggingMeasurementHandle = null,
	} = params;
	const canvas = ctx.canvas;

	if (worldResult.crossSectionClearanceMidPoint) {
		const midScreen = slicePxToScreenPx(
			worldResult.crossSectionClearanceMidPoint,
			transform,
		);
		ctx.save();
		ctx.fillStyle = "rgba(9, 9, 11, 0.9)";
		ctx.strokeStyle = worldResult.crossSectionStatusStroke;
		ctx.lineWidth = 1;
		ctx.beginPath();
		if (typeof ctx.roundRect === "function") {
			ctx.roundRect(midScreen.x - 22, midScreen.y - 8, 44, 16, 3);
		} else {
			ctx.rect(midScreen.x - 22, midScreen.y - 8, 44, 16);
		}
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = "#ffffff";
		ctx.font = "bold 9px monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(
			`${nerveAuditResult.netClearanceToCanalWallMm.toFixed(1)} мм`,
			midScreen.x,
			midScreen.y,
		);
		ctx.restore();
	}

	drawScreenSpaceMeasurements(
		ctx,
		"cross_section",
		(pt) => slicePxToScreenPx(crossSectionWorldMmToSlicePx(pt, activeCrossSection, canvas.width), transform),
		invertColors,
		rulers,
		activeRuler,
		angles,
		activeAngle,
		(selectedMeasurement as { id?: string } | null)?.id,
		hoveredMeasurementHandle,
		draggingMeasurementHandle,
	);
}
