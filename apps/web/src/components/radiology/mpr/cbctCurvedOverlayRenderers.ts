import type {
	CbctAngleMeasurement,
	CbctMeasurementRuler,
	CbctVoxelVolume,
	Point3D,
	SlabProjectionMode,
	ViewportTransform,
} from "../cbctMprMath";
import {
	ROMEXIS_COLORS,
	calculateAngleBetween3Points3D,
	drawCalibratedMillimeterRulers,
	drawRomexisSlabCorridor,
	slicePxToScreenPx,
	worldMmToVoxel,
} from "../cbctMprMath";
import {
	panoramicWorldMmToSlicePx,
	crossSectionWorldMmToSlicePx,
} from "../cbctCoordinateMath";
import {
	drawCbctAngleMeasurement,
	drawCbctMeasurementRuler,
} from "../cbctOverlayMeasurementRenderers";
import type {
	DentalArchCurve,
	CrossSectionSliceData,
	PanoramicReconstructionResult,
} from "../dentalCurveEngine";
import {
	mapSliceToPanoramicX,
	project3DNerveToPanorama,
	getPanoramicSliceFanTicks,
} from "../dentalCurveEngine";
import type {
	CrossSectionImplantPose,
	Implant3DWorldProjection,
	MandibularCanalCrossSection,
	VirtualImplantSpec,
} from "../implantSafetyEngine";
import type { StudioMode } from "./cbctStudioTypes";

export interface PanoramicOverlayParams {
	activePano: PanoramicReconstructionResult;
	volume: CbctVoxelVolume | null;
	crosshairMm: Point3D;
	transform: ViewportTransform;
	slabMode: SlabProjectionMode;
	slabThicknessMm: number;
	interpolatedNerve3D: Point3D[];
	archCurve: DentalArchCurve;
	nervePoints: readonly Point3D[];
	studioMode: StudioMode;
	activeCrossSection: CrossSectionSliceData | null;
	implant3DWorld: Implant3DWorldProjection | null;
	nerveAuditResult: {
		isDangerous: boolean;
		isWarning: boolean;
		netClearanceToCanalWallMm: number;
		clinicalMessageRu: string;
	};
	crossSections: CrossSectionSliceData[];
	hoveredToothMarkerFdi: number | null;
	invertColors: boolean;
	rulers?: readonly CbctMeasurementRuler[];
	activeRuler?: (CbctMeasurementRuler & { currentMm: Point3D }) | null;
	angles?: readonly CbctAngleMeasurement[];
	activeAngle?: (CbctAngleMeasurement & { currentMm: Point3D }) | null;
	selectedMeasurement?: { id?: string; type?: string } | null;
	hoveredMeasurementHandle?: { id: string; handleIndex: number } | null;
	draggingMeasurementHandle?: { id: string; handleIndex: number } | null;
}

function drawScreenSpaceMeasurements(
	ctx: CanvasRenderingContext2D,
	plane: "panoramic" | "cross_section",
	toScreen: (pt: Point3D) => { x: number; y: number },
	invertColors: boolean,
	rulers: readonly CbctMeasurementRuler[],
	activeRuler: (CbctMeasurementRuler & { currentMm: Point3D }) | null,
	angles: readonly CbctAngleMeasurement[],
	activeAngle: (CbctAngleMeasurement & { currentMm: Point3D }) | null,
	selectedId?: string,
	hoveredHandle?: { id: string; handleIndex: number } | null,
	draggingHandle?: { id: string; handleIndex: number } | null,
): void {
	for (const r of rulers) {
		if (r.plane !== plane) continue;
		const h = hoveredHandle?.id === r.id ? hoveredHandle.handleIndex : draggingHandle?.id === r.id ? draggingHandle.handleIndex : null;
		drawCbctMeasurementRuler(ctx, toScreen(r.startMm), toScreen(r.endMm), r.distanceMm, selectedId === r.id, h, invertColors);
	}
	if (activeRuler && activeRuler.plane === plane) {
		const dist = Math.hypot(activeRuler.currentMm.x - activeRuler.startMm.x, activeRuler.currentMm.z - activeRuler.startMm.z);
		drawCbctMeasurementRuler(ctx, toScreen(activeRuler.startMm), toScreen(activeRuler.currentMm), dist, true, null, invertColors);
	}
	for (const a of angles) {
		if (a.plane !== plane) continue;
		const h = hoveredHandle?.id === a.id ? hoveredHandle.handleIndex : draggingHandle?.id === a.id ? draggingHandle.handleIndex : null;
		drawCbctAngleMeasurement(ctx, toScreen(a.startMm), toScreen(a.vertexMm), toScreen(a.endMm), a.angleDeg, selectedId === a.id, h);
	}
	if (activeAngle && activeAngle.plane === plane) {
		const pv = activeAngle.vertexMm ? toScreen(activeAngle.vertexMm) : toScreen(activeAngle.currentMm);
		const deg = activeAngle.vertexMm ? calculateAngleBetween3Points3D(activeAngle.startMm, activeAngle.vertexMm, activeAngle.currentMm) : 0;
		drawCbctAngleMeasurement(ctx, toScreen(activeAngle.startMm), pv, toScreen(activeAngle.currentMm), deg, true, null);
	}
}

export function drawPanoramicOverlay(
	ctx: CanvasRenderingContext2D,
	params: PanoramicOverlayParams,
): void {
	const {
		activePano,
		volume,
		crosshairMm,
		transform,
		slabMode,
		slabThicknessMm,
		interpolatedNerve3D,
		archCurve,
		nervePoints,
		studioMode,
		activeCrossSection,
		implant3DWorld,
		nerveAuditResult,
		crossSections,
		hoveredToothMarkerFdi,
		invertColors,
		rulers = [],
		activeRuler = null,
		angles = [],
		activeAngle = null,
		selectedMeasurement = null,
		hoveredMeasurementHandle = null,
		draggingMeasurementHandle = null,
	} = params;

	const canvas = ctx.canvas;

	// PASS 1: TRANSFORMED WORLD SPACE
	ctx.save();
	ctx.translate(transform.panX, transform.panY);
	ctx.scale(transform.zoom, transform.zoom);

	// Axial Plane Intersection Line
	if (volume) {
		const centerZMm = activePano.centerZMm ?? (archCurve.planeZMm ?? 0.0);
		const panoHMm = activePano.heightMm ?? 74.0;
		const zTopMm = centerZMm + panoHMm / 2.0;
		const zBottomMm = centerZMm - panoHMm / 2.0;
		const zPx = Math.round(((zTopMm - crosshairMm.z) / panoHMm) * activePano.heightPx);

		if (crosshairMm.z >= zBottomMm && crosshairMm.z <= zTopMm) {
			if (slabMode !== "single" && slabThicknessMm > 1.0) {
				drawRomexisSlabCorridor(ctx, {
					orientation: "horizontal",
					centerPx: zPx,
					thicknessMm: slabThicknessMm,
					pixelSpacingMm: panoHMm / activePano.heightPx,
					lengthPx: canvas.width,
					colorRgba: ROMEXIS_COLORS.axialRgba(0.6),
					fillColorRgba: ROMEXIS_COLORS.axialRgba(0.08),
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

	// 3D Mandibular Canal Nerve (IAN) Projection
	if (interpolatedNerve3D.length > 1) {
		const projectedNerve = project3DNerveToPanorama(
			interpolatedNerve3D,
			archCurve,
			activePano.widthPx,
			activePano.heightPx,
			{
				heightMm: activePano.heightMm ?? 74.0,
				centerZMm: activePano.centerZMm ?? (archCurve.planeZMm ?? 0.0),
			},
		);

		if (projectedNerve.projectedPoints.length > 1) {
			ctx.save();
			ctx.strokeStyle = "rgba(239, 68, 68, 0.55)";
			ctx.fillStyle = "rgba(239, 68, 68, 0.14)";
			ctx.lineWidth = 1.2;
			ctx.setLineDash([3, 2]);
			ctx.beginPath();
			for (let i = 0; i < projectedNerve.safetyCorridorPolygon.length; i++) {
				const pt = projectedNerve.safetyCorridorPolygon[i]!;
				if (i === 0) ctx.moveTo(pt.x, pt.y);
				else ctx.lineTo(pt.x, pt.y);
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
				if (i === 0) ctx.moveTo(pt.x, pt.y);
				else ctx.lineTo(pt.x, pt.y);
			}
			ctx.stroke();

			for (const pt of nervePoints) {
				const nodePano = project3DNerveToPanorama(
					[pt],
					archCurve,
					activePano.widthPx,
					activePano.heightPx,
				);
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
	}

	let panoImplantX: number | null = null;
	let panoImplantYEntry: number | null = null;
	let panoImplantStatusColor = "#10b981";

	if (studioMode === "implant" && activeCrossSection && implant3DWorld) {
		const panoX = mapSliceToPanoramicX(
			activeCrossSection,
			activePano.widthPx,
			archCurve.totalArcLengthMm,
		);
		const panoH = activePano.heightPx;
		const panoHMm = activePano.heightMm ?? 74.0;
		const centerZMm = activePano.centerZMm ?? (archCurve.planeZMm ?? 0.0);
		const zTopMm = centerZMm + panoHMm / 2.0;

		const yEntryPx = Math.max(
			0,
			Math.min(
				panoH - 1,
				((zTopMm - implant3DWorld.entry3D.z) / panoHMm) * panoH,
			),
		);
		const yApexPx = Math.max(
			0,
			Math.min(
				panoH - 1,
				((zTopMm - implant3DWorld.apex3D.z) / panoHMm) * panoH,
			),
		);
		panoImplantX = panoX;
		panoImplantYEntry = yEntryPx;

		const pxPerMmY = panoH / panoHMm;
		const rPlatPx = (implant3DWorld.platformDiameterMm / 2.0) * pxPerMmY;
		const rApexPx = (implant3DWorld.apexDiameterMm / 2.0) * pxPerMmY;
		const rHaloPlatPx = rPlatPx + 2.0 * pxPerMmY;
		const rHaloApexPx = rApexPx + 2.0 * pxPerMmY;

		const statusColor = nerveAuditResult.isDangerous
			? "#ef4444"
			: nerveAuditResult.isWarning
				? "#f59e0b"
				: "#10b981";
		panoImplantStatusColor = statusColor;
		const statusFill = nerveAuditResult.isDangerous
			? "rgba(239, 68, 68, 0.55)"
			: nerveAuditResult.isWarning
				? "rgba(245, 158, 11, 0.45)"
				: "rgba(16, 185, 129, 0.4)";

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
	}

	// Cross-Section tick marks along bottom
	if (crossSections.length > 0) {
		const fanTicks = getPanoramicSliceFanTicks(
			crossSections,
			activePano.widthPx,
			archCurve.totalArcLengthMm,
		);
		const activeX = activeCrossSection
			? mapSliceToPanoramicX(
					activeCrossSection,
					activePano.widthPx,
					archCurve.totalArcLengthMm,
				)
			: null;

		for (const tick of fanTicks) {
			const isHovered =
				hoveredToothMarkerFdi !== null &&
				tick.nearestToothFdi === String(hoveredToothMarkerFdi);
			ctx.strokeStyle = isHovered
				? "#38bdf8"
				: tick.isMajor
					? "rgba(255, 255, 255, 0.7)"
					: "rgba(255, 255, 255, 0.25)";
			ctx.lineWidth = isHovered || tick.isMajor ? 1.5 : 1.0;
			const tickHeightPx = tick.isMajor ? 10 : 5;
			ctx.beginPath();
			ctx.moveTo(tick.panoX, canvas.height - 1);
			ctx.lineTo(tick.panoX, canvas.height - 1 - tickHeightPx);
			ctx.stroke();
		}

		if (activeX !== null) {
			ctx.strokeStyle = ROMEXIS_COLORS.crossSection;
			ctx.lineWidth = 2.0;
			ctx.beginPath();
			ctx.moveTo(activeX, 0);
			ctx.lineTo(activeX, canvas.height);
			ctx.stroke();
		}
	}

	ctx.restore();

	// PASS 2: SCREEN-SPACE
	drawCalibratedMillimeterRulers(ctx, {
		widthPx: activePano.widthPx,
		heightPx: activePano.heightPx,
		pixelSpacingMmX: archCurve.totalArcLengthMm / activePano.widthPx,
		pixelSpacingMmY: (activePano.heightMm ?? 74.0) / activePano.heightPx,
		showScaleBar: false,
		invertColors,
		transform,
	});

	// FDI tooth badges suppressed from user viewport overlay per mandate

	if (panoImplantX !== null && panoImplantYEntry !== null && implant3DWorld) {
		const pEntryScreen = slicePxToScreenPx(
			{ x: panoImplantX, y: panoImplantYEntry },
			transform,
		);
		const badgeY = Math.max(2, pEntryScreen.y - 18);
		ctx.save();
		ctx.fillStyle = "rgba(9, 9, 11, 0.9)";
		ctx.strokeStyle = panoImplantStatusColor;
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
		ctx.fillStyle = panoImplantStatusColor;
		ctx.fill();
		ctx.fillStyle = "#ffffff";
		ctx.font = "bold 8.5px monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(`#${implant3DWorld.targetToothFdi}`, pEntryScreen.x, badgeY + 6);
		ctx.restore();
	}

	// PASS 2: Rulers & Angles on Panoramic Viewport
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

export interface CrossSectionOverlayParams {
	activeCrossSection: CrossSectionSliceData;
	transform: ViewportTransform;
	studioMode: StudioMode;
	currentCanal: MandibularCanalCrossSection;
	currentImplantPose: CrossSectionImplantPose;
	currentImplantSpec: VirtualImplantSpec;
	nerveAuditResult: {
		isDangerous: boolean;
		isWarning: boolean;
		netClearanceToCanalWallMm: number;
		clinicalMessageRu: string;
	};
	selectedMeasurement: unknown | null;
	hoveredImplantPart: string | null;
	dragImplantPart: string | null;
	invertColors: boolean;
	rulers?: readonly CbctMeasurementRuler[];
	activeRuler?: (CbctMeasurementRuler & { currentMm: Point3D }) | null;
	angles?: readonly CbctAngleMeasurement[];
	activeAngle?: (CbctAngleMeasurement & { currentMm: Point3D }) | null;
	hoveredMeasurementHandle?: { id: string; handleIndex: number } | null;
	draggingMeasurementHandle?: { id: string; handleIndex: number } | null;
}

export function drawCrossSectionOverlay(
	ctx: CanvasRenderingContext2D,
	params: CrossSectionOverlayParams,
): void {
	const {
		activeCrossSection,
		transform,
		studioMode,
		currentCanal,
		currentImplantPose,
		currentImplantSpec,
		nerveAuditResult,
		selectedMeasurement,
		hoveredImplantPart,
		dragImplantPart,
		invertColors,
		rulers = [],
		activeRuler = null,
		angles = [],
		activeAngle = null,
		hoveredMeasurementHandle = null,
		draggingMeasurementHandle = null,
	} = params;

	const canvas = ctx.canvas;

	// PASS 1: TRANSFORMED WORLD SPACE
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

	if (studioMode === "implant") {
		const canalCenterX = centerX + currentCanal.center.x / pxSpacing;
		const canalCenterY = topY + currentCanal.center.y / pxSpacing;
		const canalRadiusPx = currentCanal.radiusMm / pxSpacing;
		const safetyRadiusPx =
			(currentCanal.radiusMm + currentCanal.safetyMarginMm) / pxSpacing;

		ctx.strokeStyle = nerveAuditResult.isDangerous
			? "rgba(239, 68, 68, 0.9)"
			: nerveAuditResult.isWarning
				? "rgba(245, 158, 11, 0.85)"
				: "rgba(34, 197, 94, 0.65)";
		ctx.lineWidth = 1.5;
		ctx.setLineDash([4, 3]);
		ctx.beginPath();
		ctx.arc(canalCenterX, canalCenterY, safetyRadiusPx, 0, Math.PI * 2);
		ctx.stroke();
		ctx.setLineDash([]);

		ctx.fillStyle = "rgba(239, 68, 68, 0.35)";
		ctx.strokeStyle = "#ef4444";
		ctx.lineWidth = 2.0;
		ctx.beginPath();
		ctx.arc(canalCenterX, canalCenterY, canalRadiusPx, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();

		const entryPxX = centerX + currentImplantPose.entryPoint.x / pxSpacing;
		const entryPxY = topY + currentImplantPose.entryPoint.y / pxSpacing;
		const radiusPx = currentImplantSpec.diameterMm / 2.0 / pxSpacing;
		const haloRadiusPx = radiusPx + 2.0 / pxSpacing;

		ctx.save();
		ctx.translate(entryPxX, entryPxY);
		ctx.rotate((currentImplantPose.angulationDeg * Math.PI) / 180);

		const lengthPx = currentImplantSpec.lengthMm / pxSpacing;
		const haloLengthPx = lengthPx + 2.0 / pxSpacing;

		const statusStroke = nerveAuditResult.isDangerous
			? "#ef4444"
			: nerveAuditResult.isWarning
				? "#f59e0b"
				: "#10b981";
		crossSectionStatusStroke = statusStroke;
		const statusFill = nerveAuditResult.isDangerous
			? "rgba(239, 68, 68, 0.45)"
			: nerveAuditResult.isWarning
				? "rgba(245, 158, 11, 0.35)"
				: "rgba(16, 185, 129, 0.35)";

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

		const isImplantActive =
			(selectedMeasurement as { type?: string } | null)?.type === "implant" ||
			hoveredImplantPart !== null ||
			dragImplantPart !== null;
		if (isImplantActive) {
			ctx.save();
			ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
			ctx.lineWidth = 4.5;
			ctx.shadowColor = "#f59e0b";
			ctx.shadowBlur = 8;
			ctx.beginPath();
			ctx.moveTo(-radiusPx - 1, -2);
			ctx.lineTo(radiusPx + 1, -2);
			ctx.lineTo(radiusPx * 0.7 + 1, lengthPx + 1);
			ctx.lineTo(-radiusPx * 0.7 - 1, lengthPx + 1);
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
		ctx.moveTo(-radiusPx, 0);
		ctx.lineTo(radiusPx, 0);
		ctx.lineTo(radiusPx * 0.7, lengthPx);
		ctx.lineTo(-radiusPx * 0.7, lengthPx);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();

		ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
		ctx.lineWidth = 1.0;
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.lineTo(0, lengthPx);
		ctx.stroke();

		const isEntryActive =
			dragImplantPart === "entry" || hoveredImplantPart === "entry";
		ctx.save();
		ctx.shadowColor = isEntryActive ? "#f59e0b" : "#22d3ee";
		ctx.shadowBlur = isEntryActive ? 8 : 6;
		ctx.fillStyle = isEntryActive ? "#f59e0b" : "#22d3ee";
		ctx.beginPath();
		ctx.arc(0, 0, isEntryActive ? 4.2 : 3.5, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = "#ffffff";
		ctx.lineWidth = 1.5;
		ctx.stroke();
		ctx.restore();

		const isApexActive =
			dragImplantPart === "apex" || hoveredImplantPart === "apex";
		ctx.save();
		ctx.shadowColor = isApexActive ? "#f59e0b" : "#f59e0b";
		ctx.shadowBlur = isApexActive ? 8 : 6;
		ctx.fillStyle = isApexActive ? "#f59e0b" : "#ffffff";
		ctx.beginPath();
		ctx.arc(0, lengthPx, isApexActive ? 4.2 : 3.5, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = statusStroke;
		ctx.lineWidth = 1.5;
		ctx.stroke();
		ctx.restore();

		ctx.restore();

		const apexPxX =
			entryPxX +
			lengthPx *
				Math.sin((currentImplantPose.angulationDeg * Math.PI) / 180);
		const apexPxY =
			entryPxY +
			lengthPx *
				Math.cos((currentImplantPose.angulationDeg * Math.PI) / 180);

		ctx.save();
		ctx.strokeStyle = statusStroke;
		ctx.lineWidth = 1.2;
		ctx.setLineDash([2, 2]);
		ctx.beginPath();
		ctx.moveTo(apexPxX, apexPxY);
		ctx.lineTo(canalCenterX, canalCenterY);
		ctx.stroke();
		ctx.setLineDash([]);
		ctx.restore();

		crossSectionClearanceMidPoint = {
			x: (apexPxX + canalCenterX) / 2,
			y: (apexPxY + canalCenterY) / 2,
		};
	}

	ctx.restore();

	// PASS 2: SCREEN-SPACE (Ruler 10, 20, 30 mm removed per user mandate to eliminate visual clutter on cross-sections)


	if (crossSectionClearanceMidPoint) {
		const midScreen = slicePxToScreenPx(
			crossSectionClearanceMidPoint,
			transform,
		);
		ctx.save();
		ctx.fillStyle = "rgba(9, 9, 11, 0.9)";
		ctx.strokeStyle = crossSectionStatusStroke;
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

	// PASS 2: Rulers & Angles on Cross-Section Viewport
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
