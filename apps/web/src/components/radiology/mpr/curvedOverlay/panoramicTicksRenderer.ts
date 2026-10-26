import type { PanoramicOverlayParams } from "./types";
import { ROMEXIS_COLORS } from "../../cbctMprMath";
import { mapSliceToPanoramicX, getPanoramicSliceFanTicks } from "../../dentalCurveEngine";

export function renderFanTicks(
	ctx: CanvasRenderingContext2D,
	crossSections: PanoramicOverlayParams["crossSections"],
	activeCrossSection: PanoramicOverlayParams["activeCrossSection"],
	activePano: PanoramicOverlayParams["activePano"],
	archCurve: PanoramicOverlayParams["archCurve"],
	hoveredToothMarkerFdi: PanoramicOverlayParams["hoveredToothMarkerFdi"],
	canvasHeight: number,
): void {
	const fanTicks = getPanoramicSliceFanTicks(crossSections, activePano.widthPx, archCurve.totalArcLengthMm);
	const activeX = activeCrossSection ? mapSliceToPanoramicX(activeCrossSection, activePano.widthPx, archCurve.totalArcLengthMm) : null;

	for (const tick of fanTicks) {
		const isHovered = hoveredToothMarkerFdi !== null && tick.nearestToothFdi === String(hoveredToothMarkerFdi);
		ctx.strokeStyle = isHovered ? "#38bdf8" : tick.isMajor ? "rgba(255, 255, 255, 0.7)" : "rgba(255, 255, 255, 0.25)";
		ctx.lineWidth = isHovered || tick.isMajor ? 1.5 : 1.0;
		const tickHeightPx = tick.isMajor ? 10 : 5;
		ctx.beginPath();
		ctx.moveTo(tick.panoX, canvasHeight - 1);
		ctx.lineTo(tick.panoX, canvasHeight - 1 - tickHeightPx);
		ctx.stroke();
	}

	if (activeX !== null) {
		ctx.strokeStyle = ROMEXIS_COLORS.crossSection;
		ctx.lineWidth = 2.0;
		ctx.beginPath();
		ctx.moveTo(activeX, 0);
		ctx.lineTo(activeX, canvasHeight);
		ctx.stroke();
	}
}
