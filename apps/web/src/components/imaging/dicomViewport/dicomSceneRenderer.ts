import {
	CLINICAL_IMAGING_COLORS,
	measureDistanceMm,
	measureRootCanalWorkingLength,
	type CalibratedRulerMeasurement,
	type DicomViewportState,
	type Point2D,
} from "../rvgViewerEngine.js";
import { drawRulerOnContext } from "./drawRulerHelper.js";
import { isLowSpecHardware } from "../../../utils/deviceDetection.js";

export interface RenderDicomSceneParams {
	canvas: HTMLCanvasElement | null;
	img: HTMLImageElement | null;
	filteredCanvas: HTMLCanvasElement | null;
	viewportState: DicomViewportState;
	measurements: readonly CalibratedRulerMeasurement[];
	draftRulerStart: Point2D | null;
	draftRulerCurrent: Point2D | null;
	draftCanalPoints: readonly Point2D[];
}

export function renderDicomScene({
	canvas,
	img,
	filteredCanvas,
	viewportState,
	measurements,
	draftRulerStart,
	draftRulerCurrent,
	draftCanalPoints,
}: RenderDicomSceneParams): void {
	if (!canvas || !img) return;
	const ctx = canvas.getContext("2d");
	if (!ctx) return;

	canvas.width = canvas.parentElement?.clientWidth || 800;
	canvas.height = canvas.parentElement?.clientHeight || 600;

	ctx.save();
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = CLINICAL_IMAGING_COLORS.viewportDarkBg;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	ctx.translate(canvas.width / 2 + viewportState.panX, canvas.height / 2 + viewportState.panY);
	ctx.scale(viewportState.zoom, viewportState.zoom);
	ctx.translate(-img.width / 2, -img.height / 2);

	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = isLowSpecHardware() ? "low" : "high";

	if (filteredCanvas) {
		ctx.drawImage(filteredCanvas, 0, 0, img.width, img.height);
	} else {
		ctx.drawImage(img, 0, 0);
	}

	for (const r of measurements) {
		const isCanal = r.clinicalType === "root_canal_length" || r.labelRu.includes("Канал") || r.labelRu.includes("Апекс");
		drawRulerOnContext(ctx, r.p1, r.p2, r.labelRu || `${r.lengthMm.toFixed(1)} мм`, isCanal ? CLINICAL_IMAGING_COLORS.pulpRed : CLINICAL_IMAGING_COLORS.rulerCyan);
	}

	if (draftRulerStart && draftRulerCurrent) {
		const m = measureDistanceMm(draftRulerStart, draftRulerCurrent, viewportState.calibrationMmPerPixel);
		drawRulerOnContext(ctx, draftRulerStart, draftRulerCurrent, `${m.distanceMm.toFixed(1)} мм (черновик)`, CLINICAL_IMAGING_COLORS.rulerDraftAmber);
	}

	if (draftCanalPoints.length > 0) {
		const activePts = draftRulerCurrent ? [...draftCanalPoints, draftRulerCurrent] : draftCanalPoints;
		ctx.save();
		ctx.strokeStyle = CLINICAL_IMAGING_COLORS.pulpRed;
		ctx.lineWidth = 2.5;
		ctx.setLineDash([4, 4]);
		ctx.beginPath();
		const startPt = activePts[0];
		if (startPt) {
			ctx.moveTo(startPt.x, startPt.y);
			for (let i = 1; i < activePts.length; i++) {
				const pt = activePts[i];
				if (pt) ctx.lineTo(pt.x, pt.y);
			}
			ctx.stroke();

			for (const pt of activePts) {
				ctx.fillStyle = CLINICAL_IMAGING_COLORS.pulpRedDark;
				ctx.beginPath();
				ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
				ctx.fill();
			}

			const canalResult = measureRootCanalWorkingLength(activePts, viewportState.calibrationMmPerPixel);
			const lastPt = activePts[activePts.length - 1];
			if (lastPt) {
				ctx.fillStyle = CLINICAL_IMAGING_COLORS.pulpRed;
				ctx.font = "bold 13px monospace";
				ctx.fillText(`Апекс / WL = ${canalResult.totalLengthMm.toFixed(1)} мм`, lastPt.x + 8, lastPt.y - 8);
			}
		}
		ctx.restore();
	}

	ctx.restore();
}
