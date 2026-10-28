/**
 * DENTE CRM — Panoramic Measurement Interaction & Hit-Testing
 * Handles handle and object hit testing, measurement drag updates, and ruler finalization on panoramic views.
 * Standards: DICOM Part 3, Mandate 8b (<= 300 lines).
 */

import type React from "react";
import { panoramicWorldMmToSlicePx } from "../../cbctCoordinateMath";
import type {
	CbctAngleMeasurement,
	CbctMeasurementRuler,
	Point3D,
	ViewportTransform,
} from "../../cbctMprMath";
import {
	calculateAngleBetween3Points3D,
	calculateWorldDistance3DMm,
	hitTestMeasurementHandle,
	hitTestMeasurementObject,
	slicePxToScreenPx,
} from "../../cbctMprMath";
import type { PanoramicReconstructionResult } from "../../dentalCurveEngine";
import {
	CBCT_MEASUREMENT_HANDLE_HIT_RADIUS_PX,
	CBCT_MEASUREMENT_OBJECT_HIT_RADIUS_PX,
	CBCT_MIN_RULER_DISTANCE_MM,
} from "./constants";
import type { MeasurementHandleDragDescriptor } from "./types";

/**
 * Hit tests measurement handles (ends / vertices) on panoramic projection
 */
export function hitTestPanoramicHandles(
	pointerPx: { readonly x: number; readonly y: number },
	rulers: CbctMeasurementRuler[],
	angles: CbctAngleMeasurement[],
	panoramicData: PanoramicReconstructionResult,
	currentTransform: ViewportTransform,
	totalArcLengthMm: number,
) {
	const toScreen = (p: Point3D) =>
		slicePxToScreenPx(
			panoramicWorldMmToSlicePx(p, panoramicData, totalArcLengthMm),
			currentTransform,
		);

	const pRulers = rulers
		.filter((r) => r.plane === "panoramic")
		.map((r) => ({
			id: r.id,
			plane: r.plane,
			startPx: toScreen(r.startMm),
			endPx: toScreen(r.endMm),
		}));

	const pAngles = angles
		.filter((a) => a.plane === "panoramic")
		.map((a) => ({
			id: a.id,
			plane: a.plane,
			startPx: toScreen(a.startMm),
			vertexPx: toScreen(a.vertexMm),
			endPx: toScreen(a.endMm),
		}));

	return hitTestMeasurementHandle(
		pointerPx,
		pRulers,
		pAngles,
		CBCT_MEASUREMENT_HANDLE_HIT_RADIUS_PX,
	);
}

/**
 * Hit tests measurement lines and delete buttons on panoramic projection
 */
export function hitTestPanoramicObjects(
	pointerPx: { readonly x: number; readonly y: number },
	rulers: CbctMeasurementRuler[],
	angles: CbctAngleMeasurement[],
	panoramicData: PanoramicReconstructionResult,
	currentTransform: ViewportTransform,
	totalArcLengthMm: number,
) {
	const toScreen = (p: Point3D) =>
		slicePxToScreenPx(
			panoramicWorldMmToSlicePx(p, panoramicData, totalArcLengthMm),
			currentTransform,
		);

	const pRulers = rulers
		.filter((r) => r.plane === "panoramic")
		.map((r) => ({
			id: r.id,
			plane: r.plane,
			startPx: toScreen(r.startMm),
			endPx: toScreen(r.endMm),
		}));

	const pAngles = angles
		.filter((a) => a.plane === "panoramic")
		.map((a) => ({
			id: a.id,
			plane: a.plane,
			startPx: toScreen(a.startMm),
			vertexPx: toScreen(a.vertexMm),
			endPx: toScreen(a.endMm),
		}));

	return hitTestMeasurementObject(
		pointerPx,
		pRulers,
		pAngles,
		[],
		CBCT_MEASUREMENT_OBJECT_HIT_RADIUS_PX,
	);
}

/**
 * Updates ruler or angle coordinates during handle drag on panoramic slice
 */
export function updatePanoramicMeasurementDrag(
	draggingHandle: MeasurementHandleDragDescriptor,
	pt: Point3D,
	setRulers: React.Dispatch<React.SetStateAction<CbctMeasurementRuler[]>>,
	setAngles: React.Dispatch<React.SetStateAction<CbctAngleMeasurement[]>>,
): void {
	if (draggingHandle.type === "ruler") {
		setRulers((prev) =>
			prev.map((r) => {
				if (r.id !== draggingHandle.id) return r;
				const startMm =
					draggingHandle.handleIndex === 0 ? pt : r.startMm;
				const endMm =
					draggingHandle.handleIndex === 1 ? pt : r.endMm;
				return {
					...r,
					startMm,
					endMm,
					distanceMm: calculateWorldDistance3DMm(startMm, endMm),
				};
			}),
		);
	} else if (draggingHandle.type === "angle") {
		setAngles((prev) =>
			prev.map((a) => {
				if (a.id !== draggingHandle.id) return a;
				const startMm =
					draggingHandle.handleIndex === 0 ? pt : a.startMm;
				const vertexMm =
					draggingHandle.handleIndex === 1 ? pt : a.vertexMm;
				const endMm =
					draggingHandle.handleIndex === 2 ? pt : a.endMm;
				return {
					...a,
					startMm,
					vertexMm,
					endMm,
					angleDeg: calculateAngleBetween3Points3D(
						startMm,
						vertexMm,
						endMm,
					),
				};
			}),
		);
	}
}

/**
 * Finalizes ruler measurement on mouse release, returning completed ruler if above threshold
 */
export function finalizePanoramicRuler(
	activeRuler: CbctMeasurementRuler & { currentMm: Point3D },
): CbctMeasurementRuler | null {
	const distMm = calculateWorldDistance3DMm(
		activeRuler.startMm,
		activeRuler.currentMm,
	);
	if (distMm >= CBCT_MIN_RULER_DISTANCE_MM) {
		return {
			id: activeRuler.id,
			plane: "panoramic",
			startMm: activeRuler.startMm,
			endMm: activeRuler.currentMm,
			distanceMm: distMm,
		};
	}
	return null;
}
