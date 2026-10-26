import type { PanoramicOverlayParams } from "./types";
import { drawCalibratedMillimeterRulers, slicePxToScreenPx } from "../../cbctMprMath";
import { panoramicWorldMmToSlicePx } from "../../cbctCoordinateMath";
import { drawScreenSpaceMeasurements } from "./screenSpaceMeasurements";

export function drawPanoramicScreenPass(
	ctx: CanvasRenderingContext2D,
	params: PanoramicOverlayParams,
	worldResult: { panoImplantX: number | null; panoImplantYEntry: number | null; panoImplantStatusColor: string },
): void {
	const {
		activePano, archCurve, invertColors, transform, implant3DWorld,
		rulers = [], activeRuler = null, angles = [], activeAngle = null,
		selectedMeasurement = null, hoveredMeasurementHandle = null, draggingMeasurementHandle = null,
	} = params;

	drawCalibratedMillimeterRulers(ctx, {
		widthPx: activePano.widthPx,
		heightPx: activePano.heightPx,
		pixelSpacingMmX: archCurve.totalArcLengthMm / activePano.widthPx,
		pixelSpacingMmY: (activePano.heightMm ?? 74.0) / activePano.heightPx,
		showScaleBar: false,
		invertColors,
		transform,
	});

	if (worldResult.panoImplantX !== null && worldResult.panoImplantYEntry !== null && implant3DWorld) {
		const pEntryScreen = slicePxToScreenPx(
			{ x: worldResult.panoImplantX, y: worldResult.panoImplantYEntry },
			transform,
		);
		const badgeY = Math.max(2, pEntryScreen.y - 18);
		ctx.save();
		ctx.fillStyle = "rgba(9, 9, 11, 0.9)";
		ctx.strokeStyle = worldResult.panoImplantStatusColor;
		ctx.lineWidth = 1;
		ctx.beginPath();
		if (typeof ctx.roundRect === "function") {
			ctx.roundRect(pEntryScreen.x - 13, badgeY, 26, 12, 3);
		} else {
			ctx.rect(pEntryScreen.x - 13, badgeY, 26, 12);
		}
		ctx.fill();
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(pEntryScreen.x - 3, badgeY + 12);
		ctx.lineTo(pEntryScreen.x, badgeY + 15);
		ctx.lineTo(pEntryScreen.x + 3, badgeY + 12);
		ctx.closePath();
		ctx.fillStyle = worldResult.panoImplantStatusColor;
		ctx.fill();
		ctx.fillStyle = "#ffffff";
		ctx.font = "bold 8.5px monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(`#${implant3DWorld.targetToothFdi}`, pEntryScreen.x, badgeY + 6);
		ctx.restore();
	}

	drawScreenSpaceMeasurements(
		ctx,
		"panoramic",
		(pt) => slicePxToScreenPx(panoramicWorldMmToSlicePx(pt, activePano, archCurve.totalArcLengthMm), transform),
		invertColors,
		rulers,
		activeRuler,
		angles,
		activeAngle,
		selectedMeasurement?.id,
		hoveredMeasurementHandle,
		draggingMeasurementHandle,
	);
}
