import {
	ROMEXIS_COLORS,
	drawCalibratedMillimeterRulers,
	drawRomexisSlabCorridor,
	drawObliqueCrosshairWithRotationHandles,
	drawCbctMeasurementRuler,
	drawCbctAngleMeasurement,
	drawCbctProbeMarker,
	calculateAngleBetween3Points3D,
	worldMmToSlicePx,
	slicePxToScreenPx,
	worldMmToVoxel,
} from "../cbctMprMath";
import { drawDentalArchControlPointManipulators } from "../dentalCurveEngine";
import { calculateAxialImplantIntersection } from "../implantSafetyEngine";
import {
	calculateNerveDistanceGating,
	drawMandibularNerveBadge,
} from "../cbctCaliperNerveMath";
import type { MprOverlayParams } from "./cbctOverlayTypes";

export function drawAxialMprOverlay(
	ctx: CanvasRenderingContext2D,
	params: MprOverlayParams,
): void {
	const {
		volume,
		crosshairMm,
		transform,
		invertColors,
		slabMode,
		slabThicknessMm,
		rulers,
		activeRuler,
		angles,
		activeAngle,
		probeMarkers,
		activeProbe,
		selectedMeasurement,
		hoveredMeasurementHandle,
		draggingMeasurementHandle,
		activeTool,
		studioMode,
		implant3DWorld,
		nerveAuditResult,
		interpolatedNerve3D,
		nervePoints,
		nerveTotalLengthMm,
		selectedNerveNodeIdx,
		obliqueAngles,
		activeRotationHandle,
		hoveredHandle,
		showDentalArch,
		showEdgeRulers,
		isHovered,
		archCurve,
		activeCrossSection,
		selectedArchAnchorIdx,
		hoveredArchAnchorIdx,
		isDraggingArchAnchor,
	} = params;

	const metadata = {
		widthPx: volume.dimensions.width,
		heightPx: volume.dimensions.height,
		pixelSpacingX: volume.spacingMm.x,
		pixelSpacingY: volume.spacingMm.y,
	};
	const vox = worldMmToVoxel(crosshairMm, volume);

	// PASS 1: TRANSFORMED WORLD SPACE
	ctx.save();
	ctx.translate(transform.panX, transform.panY);
	ctx.scale(transform.zoom, transform.zoom);

	if (showDentalArch && archCurve) {
		ctx.save();
		ctx.strokeStyle = "rgba(168, 85, 247, 0.85)";
		ctx.lineWidth = 1.5;
		ctx.setLineDash([4, 2]);
		ctx.beginPath();
		const spline = archCurve.splinePointsMm;
		for (let i = 0; i < spline.length; i++) {
			const pt = spline[i]!;
			const v = worldMmToVoxel({ x: pt.x, y: pt.y, z: crosshairMm.z }, volume);
			if (i === 0) ctx.moveTo(v.x, v.y);
			else ctx.lineTo(v.x, v.y);
		}
		ctx.stroke();
		ctx.setLineDash([]);

		for (const anchor of archCurve.anchors) {
			const v = worldMmToVoxel(
				{ x: anchor.positionMm.x, y: anchor.positionMm.y, z: crosshairMm.z },
				volume,
			);
			ctx.fillStyle = "rgba(168, 85, 247, 0.9)";
			ctx.beginPath();
			ctx.arc(v.x, v.y, 2.5, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.restore();
	}

	if (activeCrossSection) {
		const norm2D = activeCrossSection.normalVector2D;
		const rayHalfLenMm = activeCrossSection.widthMm / 2.0;
		const rayP1Mm = {
			x: activeCrossSection.centerPointMm.x - norm2D.x * rayHalfLenMm,
			y: activeCrossSection.centerPointMm.y - norm2D.y * rayHalfLenMm,
			z: crosshairMm.z,
		};
		const rayP2Mm = {
			x: activeCrossSection.centerPointMm.x + norm2D.x * rayHalfLenMm,
			y: activeCrossSection.centerPointMm.y + norm2D.y * rayHalfLenMm,
			z: crosshairMm.z,
		};
		const v1 = worldMmToVoxel(rayP1Mm, volume);
		const v2 = worldMmToVoxel(rayP2Mm, volume);

		ctx.strokeStyle = ROMEXIS_COLORS.crossSection;
		ctx.lineWidth = 2.0;
		ctx.beginPath();
		ctx.moveTo(v1.x, v1.y);
		ctx.lineTo(v2.x, v2.y);
		ctx.stroke();
	}

	if (studioMode === "implant" && implant3DWorld) {
		const axialIntersection = calculateAxialImplantIntersection(
			implant3DWorld,
			crosshairMm.z,
			2.0,
		);
		const statusColor = nerveAuditResult.isDangerous
			? "#ef4444"
			: nerveAuditResult.isWarning
				? "#f59e0b"
				: "#10b981";
		const statusFill = nerveAuditResult.isDangerous
			? "rgba(239, 68, 68, 0.45)"
			: nerveAuditResult.isWarning
				? "rgba(245, 158, 11, 0.4)"
				: "rgba(16, 185, 129, 0.35)";

		const centerVox = worldMmToVoxel(axialIntersection.centerMm, volume);
		const spX = volume.spacingMm.x || 0.4;
		const spY = volume.spacingMm.y || 0.4;
		const bodyMajorPx = axialIntersection.semiMajorMm / spX;
		const bodyMinorPx = axialIntersection.semiMinorMm / spY;
		const haloMajorPx = axialIntersection.safetyHaloSemiMajorMm / spX;
		const haloMinorPx = axialIntersection.safetyHaloSemiMinorMm / spY;

		ctx.save();
		ctx.translate(centerVox.x, centerVox.y);
		ctx.rotate(axialIntersection.rotationRad);

		if (axialIntersection.isInsideSpan) {
			ctx.strokeStyle = statusColor;
			ctx.lineWidth = 1.5;
			ctx.setLineDash([3, 2]);
			ctx.beginPath();
			ctx.ellipse(
				0,
				0,
				Math.max(1, haloMajorPx),
				Math.max(1, haloMinorPx),
				0,
				0,
				Math.PI * 2,
			);
			ctx.stroke();
			ctx.setLineDash([]);

			ctx.fillStyle = statusFill;
			ctx.strokeStyle = statusColor;
			ctx.lineWidth = 2.0;
			ctx.beginPath();
			ctx.ellipse(
				0,
				0,
				Math.max(1, bodyMajorPx),
				Math.max(1, bodyMinorPx),
				0,
				0,
				Math.PI * 2,
			);
			ctx.fill();
			ctx.stroke();

			ctx.strokeStyle = "#ffffff";
			ctx.lineWidth = 1.0;
			ctx.beginPath();
			ctx.moveTo(-3, 0);
			ctx.lineTo(3, 0);
			ctx.moveTo(0, -3);
			ctx.lineTo(0, 3);
			ctx.stroke();
		} else if (Math.abs(axialIntersection.signedDistanceToZMm) <= 8.0) {
			ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
			ctx.lineWidth = 1.0;
			ctx.setLineDash([2, 2]);
			ctx.beginPath();
			ctx.ellipse(
				0,
				0,
				Math.max(1, bodyMajorPx),
				Math.max(1, bodyMinorPx),
				0,
				0,
				Math.PI * 2,
			);
			ctx.stroke();
			ctx.setLineDash([]);
		}
		ctx.restore();
	}

	if (slabMode !== "single" && slabThicknessMm > 1.0) {
		drawRomexisSlabCorridor(ctx, {
			orientation: "horizontal",
			centerPx: vox.y,
			thicknessMm: slabThicknessMm,
			pixelSpacingMm: metadata.pixelSpacingY,
			lengthPx: metadata.widthPx,
			colorRgba: ROMEXIS_COLORS.coronalRgba(0.65),
			fillColorRgba: ROMEXIS_COLORS.coronalRgba(0.08),
		});
	}

	if (interpolatedNerve3D.length > 1) {
		ctx.save();
		ctx.lineCap = "round";
		ctx.lineJoin = "round";

		for (let i = 0; i < interpolatedNerve3D.length - 1; i++) {
			const p1 = interpolatedNerve3D[i]!;
			const p2 = interpolatedNerve3D[i + 1]!;
			const midZ = (p1.z + p2.z) / 2.0;
			const deltaZ = Math.abs(midZ - crosshairMm.z);
			const gating = calculateNerveDistanceGating(deltaZ);

			if (!gating.isVisible) continue;

			const p1Px = worldMmToSlicePx(p1, "axial", volume);
			const p2Px = worldMmToSlicePx(p2, "axial", volume);

			const haloWidthPx = Math.max(8, 4.0 / (metadata.pixelSpacingX || 0.4));
			ctx.lineWidth = haloWidthPx;
			ctx.setLineDash([5, 3]);
			ctx.strokeStyle = `rgba(245, 158, 11, ${Number((gating.alpha * 0.45).toFixed(3))})`;
			ctx.beginPath();
			ctx.moveTo(p1Px.x, p1Px.y);
			ctx.lineTo(p2Px.x, p2Px.y);
			ctx.stroke();

			ctx.lineWidth = 2.5;
			if (gating.isDashed) {
				ctx.setLineDash([4, 4]);
			} else {
				ctx.setLineDash([]);
			}
			ctx.strokeStyle = `rgba(245, 158, 11, ${Number(gating.alpha.toFixed(3))})`;
			ctx.beginPath();
			ctx.moveTo(p1Px.x, p1Px.y);
			ctx.lineTo(p2Px.x, p2Px.y);
			ctx.stroke();
		}

		ctx.setLineDash([]);
		for (let i = 0; i < nervePoints.length; i++) {
			const pt = nervePoints[i]!;
			const deltaZ = Math.abs(pt.z - crosshairMm.z);
			const gating = calculateNerveDistanceGating(deltaZ);

			if (!gating.isVisible) continue;

			const p = worldMmToSlicePx(pt, "axial", volume);
			const isSelected = selectedNerveNodeIdx === i;

			if (isSelected) {
				ctx.strokeStyle = "#38bdf8";
				ctx.lineWidth = 2.0;
				ctx.beginPath();
				ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
				ctx.stroke();

				ctx.fillStyle = "#38bdf8";
				ctx.beginPath();
				ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
				ctx.fill();
			} else {
				ctx.fillStyle = `rgba(251, 191, 36, ${Number(gating.alpha.toFixed(3))})`;
				ctx.beginPath();
				ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
				ctx.fill();
			}
		}
		ctx.restore();
	}

	ctx.restore();

	// PASS 2: SCREEN-SPACE 1:1 VECTOR SPACE
	drawCalibratedMillimeterRulers(ctx, {
		widthPx: metadata.widthPx,
		heightPx: metadata.heightPx,
		pixelSpacingMmX: metadata.pixelSpacingX,
		pixelSpacingMmY: metadata.pixelSpacingY,
		showXAxis: Boolean(showEdgeRulers),
		showYAxis: Boolean(showEdgeRulers),
		showScaleBar: false,
		invertColors,
		transform,
	});

	if (interpolatedNerve3D.length > 1) {
		const visibleNodes = nervePoints.filter(
			(pt) => Math.abs(pt.z - crosshairMm.z) <= 3.5,
		);
		if (visibleNodes.length > 0) {
			const midPt = visibleNodes[Math.floor(visibleNodes.length / 2)]!;
			const pMid = slicePxToScreenPx(
				worldMmToSlicePx(midPt, "axial", volume),
				transform,
			);
			drawMandibularNerveBadge(ctx, pMid, nerveTotalLengthMm, 2.0);
		}
	}

	for (const r of rulers) {
		if (r.plane === "axial") {
			const p1 = slicePxToScreenPx(
				worldMmToSlicePx(r.startMm, "axial", volume),
				transform,
			);
			const p2 = slicePxToScreenPx(
				worldMmToSlicePx(r.endMm, "axial", volume),
				transform,
			);
			const isSelected = selectedMeasurement?.id === r.id;
			const activeH =
				hoveredMeasurementHandle?.id === r.id
					? hoveredMeasurementHandle.handleIndex
					: draggingMeasurementHandle?.id === r.id
						? draggingMeasurementHandle.handleIndex
						: null;
			drawCbctMeasurementRuler(
				ctx,
				p1,
				p2,
				r.distanceMm,
				isSelected,
				activeH,
				invertColors,
			);
		}
	}
	if (activeRuler && activeRuler.plane === "axial") {
		const p1 = slicePxToScreenPx(
			worldMmToSlicePx(activeRuler.startMm, "axial", volume),
			transform,
		);
		const p2 = slicePxToScreenPx(
			worldMmToSlicePx(activeRuler.currentMm, "axial", volume),
			transform,
		);
		const dist = Math.hypot(
			activeRuler.currentMm.x - activeRuler.startMm.x,
			activeRuler.currentMm.y - activeRuler.startMm.y,
			activeRuler.currentMm.z - activeRuler.startMm.z,
		);
		drawCbctMeasurementRuler(ctx, p1, p2, dist, true, null, invertColors);
	}

	for (const a of angles) {
		if (a.plane === "axial") {
			const p1 = slicePxToScreenPx(
				worldMmToSlicePx(a.startMm, "axial", volume),
				transform,
			);
			const pv = slicePxToScreenPx(
				worldMmToSlicePx(a.vertexMm, "axial", volume),
				transform,
			);
			const p2 = slicePxToScreenPx(
				worldMmToSlicePx(a.endMm, "axial", volume),
				transform,
			);
			const isSelected = selectedMeasurement?.id === a.id;
			const activeH =
				hoveredMeasurementHandle?.id === a.id
					? hoveredMeasurementHandle.handleIndex
					: draggingMeasurementHandle?.id === a.id
						? draggingMeasurementHandle.handleIndex
						: null;
			drawCbctAngleMeasurement(ctx, p1, pv, p2, a.angleDeg, isSelected, activeH);
		}
	}
	if (activeAngle && activeAngle.plane === "axial") {
		const p1 = slicePxToScreenPx(
			worldMmToSlicePx(activeAngle.startMm, "axial", volume),
			transform,
		);
		const pv = activeAngle.vertexMm
			? slicePxToScreenPx(
					worldMmToSlicePx(activeAngle.vertexMm, "axial", volume),
					transform,
				)
			: slicePxToScreenPx(
					worldMmToSlicePx(activeAngle.currentMm, "axial", volume),
					transform,
				);
		const p2 = slicePxToScreenPx(
			worldMmToSlicePx(activeAngle.currentMm, "axial", volume),
			transform,
		);
		const angleDeg = activeAngle.vertexMm
			? calculateAngleBetween3Points3D(
					activeAngle.startMm,
					activeAngle.vertexMm,
					activeAngle.currentMm,
				)
			: 0;
		drawCbctAngleMeasurement(ctx, p1, pv, p2, angleDeg, true, null);
	}

	for (const pm of probeMarkers) {
		if (pm.plane === "axial") {
			const p = slicePxToScreenPx(
				worldMmToSlicePx(pm.worldMm, "axial", volume),
				transform,
			);
			const isSelected = selectedMeasurement?.id === pm.id;
			drawCbctProbeMarker(ctx, p, pm.hu, pm.tissueName, isSelected);
		}
	}
	if (activeProbe && activeProbe.plane === "axial" && activeTool === "probe") {
		const p = slicePxToScreenPx(
			worldMmToSlicePx(activeProbe.worldMm, "axial", volume),
			transform,
		);
		drawCbctProbeMarker(ctx, p, activeProbe.hu, activeProbe.tissueName, true);
	}

	const centerScreen = slicePxToScreenPx({ x: vox.x, y: vox.y }, transform);
	drawObliqueCrosshairWithRotationHandles(ctx, {
		widthPx: metadata.widthPx,
		heightPx: metadata.heightPx,
		centerPx: centerScreen,
		plane: "axial",
		rotationDeg: obliqueAngles.axialAngleDeg,
		activeHandle:
			activeRotationHandle?.plane === "axial"
				? activeRotationHandle.handle
				: null,
		hoveredHandle:
			hoveredHandle?.plane === "axial" ? hoveredHandle.handle : null,
		showHandles: true,
		showAngleBadge: true,
		invertColors,
		isHovered,
	});

	if (showDentalArch && archCurve) {
		drawDentalArchControlPointManipulators(ctx, {
			archCurve,
			volume,
			transform,
			crosshairZMm: crosshairMm.z,
			selectedAnchorIdx: selectedArchAnchorIdx ?? null,
			hoveredAnchorIdx: hoveredArchAnchorIdx ?? null,
			draggingAnchorIdx: isDraggingArchAnchor ?? null,
			activeToothFdi: activeCrossSection?.nearestToothFdi ?? null,
			invertColors,
		});
	}
}
