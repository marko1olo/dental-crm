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
import { checkImplantSliceIntersection } from "../implantSafetyEngine";
import {
	calculateNerveDistanceGating,
	drawMandibularNerveBadge,
} from "../cbctCaliperNerveMath";
import type { MprOverlayParams } from "./cbctOverlayTypes";

export function drawSagittalMprOverlay(
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
		selectedNerveNodeIdx,
		obliqueAngles,
		activeRotationHandle,
		hoveredHandle,
		showEdgeRulers,
		isHovered,
	} = params;

	const metadata = {
		widthPx: volume.dimensions.height,
		heightPx: volume.dimensions.depth,
		pixelSpacingX: volume.spacingMm.y,
		pixelSpacingY: volume.spacingMm.z,
	};
	const vox = worldMmToVoxel(crosshairMm, volume);
	const zPx = metadata.heightPx - 1 - vox.z;

	ctx.save();
	ctx.translate(transform.panX, transform.panY);
	ctx.scale(transform.zoom, transform.zoom);

	let sagittalImplantPEntry: { x: number; y: number } | null = null;
	let sagittalImplantStatusColor = "#10b981";

	if (studioMode === "implant" && implant3DWorld) {
		const sagittalGate = checkImplantSliceIntersection(
			implant3DWorld,
			"sagittal",
			crosshairMm.x,
			2.5,
		);
		if (sagittalGate.isIntersecting) {
			ctx.save();
			ctx.globalAlpha = sagittalGate.alpha;
			const vEntry = worldMmToVoxel(implant3DWorld.entry3D, volume);
			const vApex = worldMmToVoxel(implant3DWorld.apex3D, volume);
			const depthMax = volume.dimensions.depth - 1;

			const pEntry = { x: vEntry.y, y: depthMax - vEntry.z };
			const pApex = { x: vApex.y, y: depthMax - vApex.z };
			sagittalImplantPEntry = pEntry;

			const spY = volume.spacingMm.y || 0.4;
			const rPlatPx = (implant3DWorld.platformDiameterMm / 2.0) / spY;
			const rApexPx = (implant3DWorld.apexDiameterMm / 2.0) / spY;
			const rHaloPlatPx = rPlatPx + 2.0 / spY;
			const rHaloApexPx = rApexPx + 2.0 / spY;

			const dx = pApex.x - pEntry.x;
			const dy = pApex.y - pEntry.y;
			const len = Math.hypot(dx, dy) || 1.0;
			const nx = -dy / len;
			const ny = dx / len;

			const statusColor = nerveAuditResult.isDangerous
				? "#ef4444"
				: nerveAuditResult.isWarning
					? "#f59e0b"
					: "#10b981";
			sagittalImplantStatusColor = statusColor;
			const statusFill = nerveAuditResult.isDangerous
				? "rgba(239, 68, 68, 0.45)"
				: nerveAuditResult.isWarning
					? "rgba(245, 158, 11, 0.4)"
					: "rgba(16, 185, 129, 0.35)";

			ctx.strokeStyle = statusColor;
			ctx.lineWidth = 1.5;
			ctx.setLineDash([3, 2]);
			ctx.beginPath();
			ctx.moveTo(pEntry.x + nx * rHaloPlatPx, pEntry.y + ny * rHaloPlatPx);
			ctx.lineTo(pApex.x + nx * rHaloApexPx, pApex.y + ny * rHaloApexPx);
			ctx.lineTo(pApex.x - nx * rHaloApexPx, pApex.y - ny * rHaloApexPx);
			ctx.lineTo(pEntry.x - nx * rHaloPlatPx, pEntry.y - ny * rHaloPlatPx);
			ctx.closePath();
			ctx.stroke();
			ctx.setLineDash([]);

			ctx.fillStyle = statusFill;
			ctx.strokeStyle = statusColor;
			ctx.lineWidth = 2.0;
			ctx.beginPath();
			ctx.moveTo(pEntry.x + nx * rPlatPx, pEntry.y + ny * rPlatPx);
			ctx.lineTo(pApex.x + nx * rApexPx, pApex.y + ny * rApexPx);
			ctx.lineTo(pApex.x - nx * rApexPx, pApex.y - ny * rApexPx);
			ctx.lineTo(pEntry.x - nx * rPlatPx, pEntry.y - ny * rPlatPx);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();

			ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
			ctx.lineWidth = 1.0;
			ctx.beginPath();
			ctx.moveTo(pEntry.x, pEntry.y);
			ctx.lineTo(pApex.x, pApex.y);
			ctx.stroke();
			ctx.restore();
		}
	}

	if (slabMode !== "single" && slabThicknessMm > 1.0) {
		drawRomexisSlabCorridor(ctx, {
			orientation: "horizontal",
			centerPx: zPx,
			thicknessMm: slabThicknessMm,
			pixelSpacingMm: metadata.pixelSpacingY,
			lengthPx: metadata.widthPx,
			colorRgba: ROMEXIS_COLORS.axialRgba(0.65),
			fillColorRgba: ROMEXIS_COLORS.axialRgba(0.08),
		});
	}

	if (interpolatedNerve3D.length > 1) {
		ctx.save();
		ctx.lineCap = "round";
		ctx.lineJoin = "round";

		for (let i = 0; i < interpolatedNerve3D.length - 1; i++) {
			const p1 = interpolatedNerve3D[i]!;
			const p2 = interpolatedNerve3D[i + 1]!;
			const midX = (p1.x + p2.x) / 2.0;
			const deltaX = Math.abs(midX - crosshairMm.x);
			const gating = calculateNerveDistanceGating(deltaX);

			if (!gating.isVisible) continue;

			const p1Px = worldMmToSlicePx(p1, "sagittal", volume);
			const p2Px = worldMmToSlicePx(p2, "sagittal", volume);

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
			const deltaX = Math.abs(pt.x - crosshairMm.x);
			const gating = calculateNerveDistanceGating(deltaX);

			if (!gating.isVisible) continue;

			const p = worldMmToSlicePx(pt, "sagittal", volume);
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

	// PASS 2: SCREEN-SPACE
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

	if (sagittalImplantPEntry && implant3DWorld) {
		const pEntryScreen = slicePxToScreenPx(sagittalImplantPEntry, transform);
		const badgeY = Math.max(2, pEntryScreen.y - 18);
		ctx.save();
		ctx.fillStyle = "rgba(9, 9, 11, 0.9)";
		ctx.strokeStyle = sagittalImplantStatusColor;
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
		ctx.fillStyle = sagittalImplantStatusColor;
		ctx.fill();
		ctx.fillStyle = "#ffffff";
		ctx.font = "bold 8.5px monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(`#${implant3DWorld.targetToothFdi}`, pEntryScreen.x, badgeY + 6);
		ctx.restore();
	}

	for (const r of rulers) {
		if (r.plane === "sagittal") {
			const p1 = slicePxToScreenPx(
				worldMmToSlicePx(r.startMm, "sagittal", volume),
				transform,
			);
			const p2 = slicePxToScreenPx(
				worldMmToSlicePx(r.endMm, "sagittal", volume),
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
	if (activeRuler && activeRuler.plane === "sagittal") {
		const p1 = slicePxToScreenPx(
			worldMmToSlicePx(activeRuler.startMm, "sagittal", volume),
			transform,
		);
		const p2 = slicePxToScreenPx(
			worldMmToSlicePx(activeRuler.currentMm, "sagittal", volume),
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
		if (a.plane === "sagittal") {
			const p1 = slicePxToScreenPx(
				worldMmToSlicePx(a.startMm, "sagittal", volume),
				transform,
			);
			const pv = slicePxToScreenPx(
				worldMmToSlicePx(a.vertexMm, "sagittal", volume),
				transform,
			);
			const p2 = slicePxToScreenPx(
				worldMmToSlicePx(a.endMm, "sagittal", volume),
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

	for (const pm of probeMarkers) {
		if (pm.plane === "sagittal") {
			const p = slicePxToScreenPx(
				worldMmToSlicePx(pm.worldMm, "sagittal", volume),
				transform,
			);
			const isSelected = selectedMeasurement?.id === pm.id;
			drawCbctProbeMarker(ctx, p, pm.hu, pm.tissueName, isSelected);
		}
	}
	if (activeProbe && activeProbe.plane === "sagittal" && activeTool === "probe") {
		const p = slicePxToScreenPx(
			worldMmToSlicePx(activeProbe.worldMm, "sagittal", volume),
			transform,
		);
		drawCbctProbeMarker(ctx, p, activeProbe.hu, activeProbe.tissueName, true);
	}

	const centerScreen = slicePxToScreenPx({ x: vox.y, y: zPx }, transform);
	drawObliqueCrosshairWithRotationHandles(ctx, {
		widthPx: metadata.widthPx,
		heightPx: metadata.heightPx,
		centerPx: centerScreen,
		plane: "sagittal",
		rotationDeg: obliqueAngles.sagittalTiltDeg,
		activeHandle:
			activeRotationHandle?.plane === "sagittal"
				? activeRotationHandle.handle
				: null,
		hoveredHandle:
			hoveredHandle?.plane === "sagittal" ? hoveredHandle.handle : null,
		showHandles: true,
		showAngleBadge: true,
		invertColors,
		isHovered,
	});
}
