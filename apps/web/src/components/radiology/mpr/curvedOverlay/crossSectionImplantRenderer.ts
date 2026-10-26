import type { CrossSectionOverlayParams } from "./types";

export function renderCrossSectionImplant(
	ctx: CanvasRenderingContext2D,
	pose: CrossSectionOverlayParams["currentImplantPose"],
	spec: CrossSectionOverlayParams["currentImplantSpec"],
	nerveAuditResult: CrossSectionOverlayParams["nerveAuditResult"],
	selectedMeasurement: unknown,
	hoveredPart: string | null,
	dragPart: string | null,
	centerX: number, topY: number, pxSpacing: number,
	canalCenterX: number, canalCenterY: number,
	currentCanal: CrossSectionOverlayParams["currentCanal"],
): { statusStroke: string; clearanceMidPoint: { x: number; y: number } | null } {
	const entryPxX = centerX + pose.entryPoint.x / pxSpacing;
	const entryPxY = topY + pose.entryPoint.y / pxSpacing;
	const radiusPx = spec.diameterMm / 2.0 / pxSpacing;
	const haloRadiusPx = radiusPx + 2.0 / pxSpacing;

	ctx.save();
	ctx.translate(entryPxX, entryPxY);
	ctx.rotate((pose.angulationDeg * Math.PI) / 180);

	const lengthPx = spec.lengthMm / pxSpacing;
	const haloLengthPx = lengthPx + 2.0 / pxSpacing;
	const statusStroke = nerveAuditResult.isDangerous ? "#ef4444" : nerveAuditResult.isWarning ? "#f59e0b" : "#10b981";
	const statusFill = nerveAuditResult.isDangerous ? "rgba(239, 68, 68, 0.45)" : nerveAuditResult.isWarning ? "rgba(245, 158, 11, 0.35)" : "rgba(16, 185, 129, 0.35)";

	ctx.strokeStyle = statusStroke;
	ctx.lineWidth = 1.5;
	ctx.setLineDash([3, 2]);
	ctx.beginPath();
	ctx.moveTo(-haloRadiusPx, -2.0 / pxSpacing);
	ctx.lineTo(haloRadiusPx, -2.0 / pxSpacing);
	ctx.lineTo(haloRadiusPx * 0.7, haloLengthPx);
	ctx.lineTo(-haloRadiusPx * 0.7, haloLengthPx);
	ctx.closePath();
	ctx.stroke();
	ctx.setLineDash([]);

	const isImplantActive = (selectedMeasurement as { type?: string } | null)?.type === "implant" || hoveredPart !== null || dragPart !== null;
	if (isImplantActive) {
		ctx.save();
		ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
		ctx.lineWidth = 4.5;
		ctx.shadowColor = "#f59e0b";
		ctx.shadowBlur = 8;
		ctx.beginPath();
		ctx.moveTo(-radiusPx - 1, -2); ctx.lineTo(radiusPx + 1, -2);
		ctx.lineTo(radiusPx * 0.7 + 1, lengthPx + 1); ctx.lineTo(-radiusPx * 0.7 - 1, lengthPx + 1);
		ctx.closePath();
		ctx.stroke();
		ctx.restore();
	}

	ctx.fillStyle = "#94a3b8";
	ctx.fillRect(-radiusPx - 1, -2, (radiusPx + 1) * 2, 3);
	ctx.fillStyle = statusFill;
	ctx.strokeStyle = isImplantActive ? "#f59e0b" : statusStroke;
	ctx.lineWidth = isImplantActive ? 2.5 : 2.0;

	ctx.beginPath();
	ctx.moveTo(-radiusPx, 0); ctx.lineTo(radiusPx, 0);
	ctx.lineTo(radiusPx * 0.7, lengthPx); ctx.lineTo(-radiusPx * 0.7, lengthPx);
	ctx.closePath();
	ctx.fill(); ctx.stroke();

	ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
	ctx.lineWidth = 1.0;
	ctx.beginPath();
	ctx.moveTo(0, 0); ctx.lineTo(0, lengthPx);
	ctx.stroke();

	drawPins(ctx, dragPart, hoveredPart, lengthPx, statusStroke);
	ctx.restore();

	const apexPxX = entryPxX + lengthPx * Math.sin((pose.angulationDeg * Math.PI) / 180);
	const apexPxY = entryPxY + lengthPx * Math.cos((pose.angulationDeg * Math.PI) / 180);
	let clearanceMidPoint: { x: number; y: number } | null = null;

	if (currentCanal) {
		ctx.save();
		ctx.strokeStyle = statusStroke;
		ctx.lineWidth = 1.2;
		ctx.setLineDash([2, 2]);
		ctx.beginPath();
		ctx.moveTo(apexPxX, apexPxY); ctx.lineTo(canalCenterX, canalCenterY);
		ctx.stroke(); ctx.setLineDash([]);
		ctx.restore();
		clearanceMidPoint = { x: (apexPxX + canalCenterX) / 2, y: (apexPxY + canalCenterY) / 2 };
	}

	return { statusStroke, clearanceMidPoint };
}

function drawPins(ctx: CanvasRenderingContext2D, dragPart: string | null, hoveredPart: string | null, lengthPx: number, statusStroke: string): void {
	const isEntryActive = dragPart === "entry" || hoveredPart === "entry";
	ctx.save();
	ctx.fillStyle = isEntryActive ? "#f59e0b" : "#22d3ee";
	ctx.beginPath();
	ctx.arc(0, 0, isEntryActive ? 4.2 : 3.5, 0, Math.PI * 2);
	ctx.fill(); ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5; ctx.stroke();
	ctx.restore();

	const isApexActive = dragPart === "apex" || hoveredPart === "apex";
	ctx.save();
	ctx.fillStyle = isApexActive ? "#f59e0b" : "#ffffff";
	ctx.beginPath();
	ctx.arc(0, lengthPx, isApexActive ? 4.2 : 3.5, 0, Math.PI * 2);
	ctx.fill(); ctx.strokeStyle = statusStroke; ctx.lineWidth = 1.5; ctx.stroke();
	ctx.restore();
}
