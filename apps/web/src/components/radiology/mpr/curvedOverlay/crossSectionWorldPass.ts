import type { CrossSectionOverlayParams } from "./types";
import { ROMEXIS_COLORS } from "../../cbctMprMath";
import { renderCrossSectionImplant } from "./crossSectionImplantRenderer";

export interface CrossSectionWorldPassResult {
	readonly crossSectionClearanceMidPoint: { x: number; y: number } | null;
	readonly crossSectionStatusStroke: string;
}

export function drawCrossSectionWorldPass(
	ctx: CanvasRenderingContext2D,
	params: CrossSectionOverlayParams,
): CrossSectionWorldPassResult {
	const {
		activeCrossSection, transform, studioMode, currentCanal,
		currentImplantPose, currentImplantSpec, nerveAuditResult,
		selectedMeasurement, hoveredImplantPart, dragImplantPart,
	} = params;
	const canvas = ctx.canvas;

	ctx.save();
	ctx.translate(transform.panX, transform.panY);
	ctx.scale(transform.zoom, transform.zoom);

	const pxSpacing = activeCrossSection.pixelSpacingMm;
	const centerX = canvas.width / 2;
	const topY = 20;

	const centerY = canvas.height / 2;
	ctx.strokeStyle = ROMEXIS_COLORS.axialRgba(0.75);
	ctx.lineWidth = 1.0;
	ctx.setLineDash([3, 3]);
	ctx.beginPath();
	ctx.moveTo(0, centerY);
	ctx.lineTo(canvas.width, centerY);
	ctx.stroke();
	ctx.setLineDash([]);

	let crossSectionClearanceMidPoint: { x: number; y: number } | null = null;
	let crossSectionStatusStroke = "#10b981";
	let canalCenterX = 0;
	let canalCenterY = 0;

	if (currentCanal) {
		canalCenterX = centerX + currentCanal.center.x / pxSpacing;
		canalCenterY = topY + currentCanal.center.y / pxSpacing;
		const canalRadiusPx = currentCanal.radiusMm / pxSpacing;
		const safetyRadiusPx = (currentCanal.radiusMm + currentCanal.safetyMarginMm) / pxSpacing;
		const isDangerous = studioMode === "implant" && Boolean(nerveAuditResult?.isDangerous);
		const isWarning = studioMode === "implant" && Boolean(nerveAuditResult?.isWarning);

		ctx.strokeStyle = isDangerous ? "rgba(239, 68, 68, 0.9)" : isWarning ? "rgba(245, 158, 11, 0.85)" : "rgba(245, 158, 11, 0.65)";
		ctx.lineWidth = 1.5;
		ctx.setLineDash([4, 3]);
		ctx.beginPath();
		ctx.arc(canalCenterX, canalCenterY, safetyRadiusPx, 0, Math.PI * 2);
		ctx.stroke();
		ctx.setLineDash([]);

		ctx.fillStyle = isDangerous ? "rgba(239, 68, 68, 0.45)" : "rgba(255, 145, 0, 0.35)";
		ctx.strokeStyle = isDangerous ? "#ef4444" : "#ff9100";
		ctx.lineWidth = 2.0;
		ctx.beginPath();
		ctx.arc(canalCenterX, canalCenterY, canalRadiusPx, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();

		ctx.fillStyle = "#ffffff";
		ctx.beginPath();
		ctx.arc(canalCenterX, canalCenterY, 1.5, 0, Math.PI * 2);
		ctx.fill();

		ctx.font = "bold 9px monospace";
		ctx.fillStyle = isDangerous ? "#ef4444" : "#ff9100";
		ctx.textAlign = "center";
		ctx.fillText("IAN", canalCenterX, canalCenterY + canalRadiusPx + 10);
	}

	if (studioMode === "implant") {
		const res = renderCrossSectionImplant(
			ctx, currentImplantPose, currentImplantSpec, nerveAuditResult,
			selectedMeasurement, hoveredImplantPart, dragImplantPart,
			centerX, topY, pxSpacing, canalCenterX, canalCenterY, currentCanal,
		);
		crossSectionStatusStroke = res.statusStroke;
		crossSectionClearanceMidPoint = res.clearanceMidPoint;
	}

	ctx.restore();
	return { crossSectionClearanceMidPoint, crossSectionStatusStroke };
}
