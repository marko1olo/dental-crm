/**
 * mprCoordinatesSync.ts — Синхронизация 3D-координат между 4 MPR вьюпортами (Мандат 8b <= 120 строк).
 */

import type { Point3D, ArchCurvePoint, CrossSectionSlicePlane, MprCrosshairSync } from "./types";
import { vec3Distance } from "./vectorMath";

export function synchronizeMprCoordinates(
	worldPos: Point3D,
	archCurve: ArchCurvePoint[],
	crossSections: CrossSectionSlicePlane[],
): MprCrosshairSync {
	let nearestArchIdx = 0;
	let minArchDist = Infinity;

	for (let i = 0; i < archCurve.length; i++) {
		const d = vec3Distance(worldPos, archCurve[i]!.point);
		if (d < minArchDist) {
			minArchDist = d;
			nearestArchIdx = i;
		}
	}

	let nearestSliceIdx = 0;
	let minSliceDist = Infinity;

	for (let i = 0; i < crossSections.length; i++) {
		const d = vec3Distance(worldPos, crossSections[i]!.center);
		if (d < minSliceDist) {
			minSliceDist = d;
			nearestSliceIdx = i;
		}
	}

	const activeArchParamT = archCurve.length > 1 ? nearestArchIdx / (archCurve.length - 1) : 0;

	return {
		worldPos,
		axialSliceZ: worldPos.z,
		coronalSliceY: worldPos.y,
		sagittalSliceX: worldPos.x,
		activeCrossSectionIndex: nearestSliceIdx,
		activeArchParamT,
		distanceToArchMm: minArchDist,
	};
}
