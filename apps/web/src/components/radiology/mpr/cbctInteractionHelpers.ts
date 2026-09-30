/**
 * DENTE CRM — CBCT Interaction Helpers & Geometric Math Module
 * Decomposed from useCbctInteractionHandlers.ts per Mandate 8b.
 * Standards: DICOM Part 3, Misch CE, Buser
 */

import type {
	CbctVoxelVolume,
	Point3D,
	Point2D,
	MprPlane,
	CbctMeasurementRuler,
	CbctAngleMeasurement,
	CbctProbeMarker,
} from "../cbctMprMath";
import { worldMmToSlicePx, calculateAngleBetween3Points3D } from "../cbctMprMath";
import type { CrossSectionSliceData } from "../dentalCurveEngine";
import type { VirtualImplantSpec } from "../implantSafetyEngine";

export interface ImplantCrossSectionGeometry {
	readonly pxSpacing: number;
	readonly centerX: number;
	readonly topY: number;
	readonly entryPxX: number;
	readonly entryPxY: number;
	readonly apexPxX: number;
	readonly apexPxY: number;
	readonly radiusPx: number;
}

export function getImplantCrossSectionGeometry(
	canvas: HTMLCanvasElement,
	activeCrossSection: CrossSectionSliceData,
	currentImplantSpec: VirtualImplantSpec,
	implantEntryXOffsetMm: number,
	implantEntryDepthMm: number,
	implantAngulationDeg: number,
): ImplantCrossSectionGeometry {
	const pxSpacing = activeCrossSection.pixelSpacingMm || 0.25;
	const centerX = canvas.width / 2;
	const topY = 20;
	const entryPxX = centerX + (implantEntryXOffsetMm / pxSpacing);
	const entryPxY = topY + (implantEntryDepthMm / pxSpacing);
	const angRad = (implantAngulationDeg * Math.PI) / 180;
	const lengthPx = currentImplantSpec.lengthMm / pxSpacing;
	const apexPxX = entryPxX + lengthPx * Math.sin(angRad);
	const apexPxY = entryPxY + lengthPx * Math.cos(angRad);
	const radiusPx = (currentImplantSpec.diameterMm / 2.0) / pxSpacing;
	return { pxSpacing, centerX, topY, entryPxX, entryPxY, apexPxX, apexPxY, radiusPx };
}

export function projectMeasurementsToSlice(
	plane: MprPlane,
	volume: CbctVoxelVolume,
	rulers: readonly CbctMeasurementRuler[],
	angles: readonly CbctAngleMeasurement[],
	probeMarkers: readonly CbctProbeMarker[],
) {
	const projectedRulers = rulers
		.filter((r) => r.plane === plane)
		.map((r) => ({
			id: r.id,
			plane: r.plane,
			startPx: worldMmToSlicePx(r.startMm, plane, volume),
			endPx: worldMmToSlicePx(r.endMm, plane, volume),
		}));

	const projectedAngles = angles
		.filter((a) => a.plane === plane)
		.map((a) => ({
			id: a.id,
			plane: a.plane,
			startPx: worldMmToSlicePx(a.startMm, plane, volume),
			vertexPx: worldMmToSlicePx(a.vertexMm, plane, volume),
			endPx: worldMmToSlicePx(a.endMm, plane, volume),
		}));

	const projectedProbes = probeMarkers
		.filter((p) => p.plane === plane)
		.map((p) => ({
			id: p.id,
			plane: p.plane,
			posPx: worldMmToSlicePx(p.worldMm, plane, volume),
		}));

	return { projectedRulers, projectedAngles, projectedProbes };
}

export function updateDraggedMeasurementRuler(
	prevRulers: readonly CbctMeasurementRuler[],
	id: string,
	handleIndex: number,
	currentMm: Point3D,
): CbctMeasurementRuler[] {
	return prevRulers.map((r) => {
		if (r.id !== id) return r;
		const start = handleIndex === 0 ? currentMm : r.startMm;
		const end = handleIndex === 1 ? currentMm : r.endMm;
		return {
			...r,
			startMm: start,
			endMm: end,
			distanceMm: Number(Math.hypot(end.x - start.x, end.y - start.y, end.z - start.z).toFixed(1)),
		};
	});
}

export function updateDraggedMeasurementAngle(
	prevAngles: readonly CbctAngleMeasurement[],
	id: string,
	handleIndex: number,
	currentMm: Point3D,
): CbctAngleMeasurement[] {
	return prevAngles.map((a) => {
		if (a.id !== id) return a;
		const start = handleIndex === 0 ? currentMm : a.startMm;
		const vertex = handleIndex === 1 ? currentMm : a.vertexMm;
		const end = handleIndex === 2 ? currentMm : a.endMm;
		return {
			...a,
			startMm: start,
			vertexMm: vertex,
			endMm: end,
			angleDeg: calculateAngleBetween3Points3D(start, vertex, end),
		};
	});
}
