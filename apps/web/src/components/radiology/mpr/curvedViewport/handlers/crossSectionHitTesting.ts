/**
 * crossSectionHitTesting.ts — Хит-тестинг и обновление измерений кросс-секции (Мандат 8b).
 */

import { crossSectionWorldMmToSlicePx } from "../../../cbctCoordinateMath";
import type { CbctAngleMeasurement, CbctMeasurementRuler, Point3D, ViewportTransform } from "../../../cbctMprMath";
import {
	calculateWorldDistance3DMm,
	hitTestMeasurementHandle,
	hitTestMeasurementObject,
	slicePxToScreenPx,
} from "../../../cbctMprMath";
import type { CrossSectionSliceData } from "../../../dentalCurveEngine";
import {
	CBCT_MEASUREMENT_HANDLE_HIT_RADIUS_PX,
	CBCT_MEASUREMENT_OBJECT_HIT_RADIUS_PX,
	CBCT_MIN_RULER_DISTANCE_MM,
} from "../constants";
import type { MeasurementHandleDragDescriptor } from "../types";

export function hitTestCrossSectionHandles(
	pointerPx: { readonly x: number; readonly y: number },
	rulers: CbctMeasurementRuler[],
	angles: CbctAngleMeasurement[],
	activeCrossSection: CrossSectionSliceData,
	currentTransform: ViewportTransform,
	canvasWidth: number,
) {
	const toScreen = (p: Point3D) => slicePxToScreenPx(crossSectionWorldMmToSlicePx(p, activeCrossSection, canvasWidth), currentTransform);
	const pRulers = rulers.filter((r) => r.plane === "cross_section").map((r) => ({ id: r.id, plane: r.plane, startPx: toScreen(r.startMm), endPx: toScreen(r.endMm) }));
	const pAngles = angles.filter((a) => a.plane === "cross_section").map((a) => ({ id: a.id, plane: a.plane, startPx: toScreen(a.startMm), vertexPx: toScreen(a.vertexMm), endPx: toScreen(a.endMm) }));
	return hitTestMeasurementHandle(pointerPx, pRulers, pAngles, CBCT_MEASUREMENT_HANDLE_HIT_RADIUS_PX);
}

export function hitTestCrossSectionObjects(
	pointerPx: { readonly x: number; readonly y: number },
	rulers: CbctMeasurementRuler[],
	angles: CbctAngleMeasurement[],
	activeCrossSection: CrossSectionSliceData,
	currentTransform: ViewportTransform,
	canvasWidth: number,
) {
	const toScreen = (p: Point3D) => slicePxToScreenPx(crossSectionWorldMmToSlicePx(p, activeCrossSection, canvasWidth), currentTransform);
	const pRulers = rulers.filter((r) => r.plane === "cross_section").map((r) => ({ id: r.id, plane: r.plane, startPx: toScreen(r.startMm), endPx: toScreen(r.endMm) }));
	const pAngles = angles.filter((a) => a.plane === "cross_section").map((a) => ({ id: a.id, plane: a.plane, startPx: toScreen(a.startMm), vertexPx: toScreen(a.vertexMm), endPx: toScreen(a.endMm) }));
	return hitTestMeasurementObject(pointerPx, pRulers, pAngles, [], CBCT_MEASUREMENT_OBJECT_HIT_RADIUS_PX);
}

export function updateCrossSectionMeasurementDrag(
	draggingHandle: MeasurementHandleDragDescriptor,
	pt: Point3D,
	setRulers: React.Dispatch<React.SetStateAction<CbctMeasurementRuler[]>>,
	setAngles: React.Dispatch<React.SetStateAction<CbctAngleMeasurement[]>>,
): void {
	if (draggingHandle.type === "ruler") {
		setRulers((prev) =>
			prev.map((r) => {
				if (r.id !== draggingHandle.id) return r;
				const startMm = draggingHandle.handleIndex === 0 ? pt : r.startMm;
				const endMm = draggingHandle.handleIndex === 1 ? pt : r.endMm;
				return { ...r, startMm, endMm, distanceMm: calculateWorldDistance3DMm(startMm, endMm) };
			}),
		);
	} else if (draggingHandle.type === "angle") {
		setAngles((prev) =>
			prev.map((a) => {
				if (a.id !== draggingHandle.id) return a;
				const startMm = draggingHandle.handleIndex === 0 ? pt : a.startMm;
				const vertexMm = draggingHandle.handleIndex === 1 ? pt : a.vertexMm;
				const endMm = draggingHandle.handleIndex === 2 ? pt : a.endMm;
				const a1 = Math.atan2(endMm.y - vertexMm.y, endMm.x - vertexMm.x);
				const a2 = Math.atan2(startMm.y - vertexMm.y, startMm.x - vertexMm.x);
				return { ...a, startMm, vertexMm, endMm, angleDeg: (Math.round((a1 - a2) * (180 / Math.PI)) + 360) % 360 };
			}),
		);
	}
}

export function finalizeCrossSectionRuler(activeRuler: CbctMeasurementRuler & { currentMm: Point3D }): CbctMeasurementRuler | null {
	const distMm = calculateWorldDistance3DMm(activeRuler.startMm, activeRuler.currentMm);
	if (distMm >= CBCT_MIN_RULER_DISTANCE_MM) {
		return { id: activeRuler.id, plane: "cross_section", startMm: activeRuler.startMm, endMm: activeRuler.currentMm, distanceMm: distMm };
	}
	return null;
}
