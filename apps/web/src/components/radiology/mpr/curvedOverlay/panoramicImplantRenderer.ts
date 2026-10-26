import type { PanoramicOverlayParams } from "./types";
import { mapSliceToPanoramicX } from "../../dentalCurveEngine";

export function renderImplantProjection(
	ctx: CanvasRenderingContext2D,
	activeCrossSection: NonNullable<PanoramicOverlayParams["activeCrossSection"]>,
	implant3DWorld: NonNullable<PanoramicOverlayParams["implant3DWorld"]>,
	activePano: PanoramicOverlayParams["activePano"],
	archCurve: PanoramicOverlayParams["archCurve"],
	nerveAuditResult: PanoramicOverlayParams["nerveAuditResult"],
): { panoX: number; yEntryPx: number; statusColor: string } {
	const panoX = mapSliceToPanoramicX(activeCrossSection, activePano.widthPx, archCurve.totalArcLengthMm);
	const panoH = activePano.heightPx;
	const panoHMm = activePano.heightMm ?? 74.0;
	const zTopMm = (activePano.centerZMm ?? (archCurve.planeZMm ?? 0.0)) + panoHMm / 2.0;

	const yEntryPx = Math.max(0, Math.min(panoH - 1, ((zTopMm - implant3DWorld.entry3D.z) / panoHMm) * panoH));
	const yApexPx = Math.max(0, Math.min(panoH - 1, ((zTopMm - implant3DWorld.apex3D.z) / panoHMm) * panoH));
	const pxPerMmY = panoH / panoHMm;
	const rPlatPx = (implant3DWorld.platformDiameterMm / 2.0) * pxPerMmY;
	const rApexPx = (implant3DWorld.apexDiameterMm / 2.0) * pxPerMmY;
	const rHaloPlatPx = rPlatPx + 2.0 * pxPerMmY;
	const rHaloApexPx = rApexPx + 2.0 * pxPerMmY;

	const statusColor = nerveAuditResult.isDangerous ? "#ef4444" : nerveAuditResult.isWarning ? "#f59e0b" : "#10b981";
	const statusFill = nerveAuditResult.isDangerous ? "rgba(239, 68, 68, 0.55)" : nerveAuditResult.isWarning ? "rgba(245, 158, 11, 0.45)" : "rgba(16, 185, 129, 0.4)";

	ctx.strokeStyle = statusColor;
	ctx.lineWidth = 1.5;
	ctx.setLineDash([3, 2]);
	ctx.beginPath();
	ctx.moveTo(panoX - rHaloPlatPx, yEntryPx);
	ctx.lineTo(panoX + rHaloPlatPx, yEntryPx);
	ctx.lineTo(panoX + rHaloApexPx, yApexPx);
	ctx.lineTo(panoX - rHaloApexPx, yApexPx);
	ctx.closePath();
	ctx.stroke();
	ctx.setLineDash([]);

	ctx.fillStyle = statusFill;
	ctx.strokeStyle = statusColor;
	ctx.lineWidth = 2.0;
	ctx.beginPath();
	ctx.moveTo(panoX - rPlatPx, yEntryPx);
	ctx.lineTo(panoX + rPlatPx, yEntryPx);
	ctx.lineTo(panoX + rApexPx, yApexPx);
	ctx.lineTo(panoX - rApexPx, yApexPx);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();

	ctx.strokeStyle = "#ffffff";
	ctx.lineWidth = 1.0;
	ctx.beginPath();
	ctx.moveTo(panoX, yEntryPx);
	ctx.lineTo(panoX, yApexPx);
	ctx.stroke();

	return { panoX, yEntryPx, statusColor };
}
