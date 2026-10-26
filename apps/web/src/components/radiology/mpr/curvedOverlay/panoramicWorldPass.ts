import type { PanoramicOverlayParams } from "./types";
import { ROMEXIS_COLORS, drawRomexisSlabCorridor } from "../../cbctMprMath";
import { renderNerveProjection } from "./panoramicNerveRenderer";
import { renderImplantProjection } from "./panoramicImplantRenderer";
import { renderFanTicks } from "./panoramicTicksRenderer";

export interface PanoramicWorldPassResult {
	readonly panoImplantX: number | null;
	readonly panoImplantYEntry: number | null;
	readonly panoImplantStatusColor: string;
}

export function drawPanoramicWorldPass(
	ctx: CanvasRenderingContext2D,
	params: PanoramicOverlayParams,
): PanoramicWorldPassResult {
	const {
		activePano, volume, crosshairMm, transform, slabMode, slabThicknessMm,
		interpolatedNerve3D, archCurve, nervePoints, studioMode,
		activeCrossSection, implant3DWorld, nerveAuditResult, crossSections,
		hoveredToothMarkerFdi,
	} = params;
	const canvas = ctx.canvas;

	ctx.save();
	ctx.translate(transform.panX, transform.panY);
	ctx.scale(transform.zoom, transform.zoom);

	if (volume) {
		const centerZMm = activePano.centerZMm ?? (archCurve.planeZMm ?? 0.0);
		const panoHMm = activePano.heightMm ?? 74.0;
		const zTopMm = centerZMm + panoHMm / 2.0;
		const zBottomMm = centerZMm - panoHMm / 2.0;
		const zPx = Math.round(((zTopMm - crosshairMm.z) / panoHMm) * activePano.heightPx);

		if (crosshairMm.z >= zBottomMm && crosshairMm.z <= zTopMm) {
			if (slabMode !== "single" && slabThicknessMm > 1.0) {
				drawRomexisSlabCorridor(ctx, {
					orientation: "horizontal", centerPx: zPx, thicknessMm: slabThicknessMm,
					pixelSpacingMm: panoHMm / activePano.heightPx, lengthPx: canvas.width,
					colorRgba: ROMEXIS_COLORS.axialRgba(0.6), fillColorRgba: ROMEXIS_COLORS.axialRgba(0.08),
				});
			}
			ctx.strokeStyle = ROMEXIS_COLORS.axial;
			ctx.lineWidth = 1.2;
			ctx.beginPath();
			ctx.moveTo(0, zPx);
			ctx.lineTo(canvas.width, zPx);
			ctx.stroke();
		}
	}

	if (interpolatedNerve3D.length > 1) {
		renderNerveProjection(ctx, interpolatedNerve3D, nervePoints, archCurve, activePano);
	}

	let panoImplantX: number | null = null;
	let panoImplantYEntry: number | null = null;
	let panoImplantStatusColor = "#10b981";

	if (studioMode === "implant" && activeCrossSection && implant3DWorld) {
		const res = renderImplantProjection(ctx, activeCrossSection, implant3DWorld, activePano, archCurve, nerveAuditResult);
		panoImplantX = res.panoX;
		panoImplantYEntry = res.yEntryPx;
		panoImplantStatusColor = res.statusColor;
	}

	if (crossSections.length > 0) {
		renderFanTicks(ctx, crossSections, activeCrossSection, activePano, archCurve, hoveredToothMarkerFdi, canvas.height);
	}

	ctx.restore();
	return { panoImplantX, panoImplantYEntry, panoImplantStatusColor };
}
