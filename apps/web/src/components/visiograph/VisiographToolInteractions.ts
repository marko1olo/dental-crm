/**
 * VisiographToolInteractions.ts
 *
 * Click and double-click interaction handlers for Visiograph Studio:
 * - Ruler creation (two points)
 * - Calibration reference measurement
 * - Angle 3-points calculation
 * - Periapical lesion contour polygon closure
 * - Root canal apex working length (WL) measurement & Form 043 event dispatch
 */

import type React from "react";
import {
	CALIBRATION_PRESETS,
	calculateAngle3Points,
	calculatePeriapicalLesion,
	calculateRuler,
	computeCalibration,
	distance2D,
	type AngleMeasurement,
	type CalibrationReference,
	type CalibrationReferenceType,
	type PeriapicalLesion,
	type Point2D,
	type RulerMeasurement,
} from "./VisiographMeasurementMath";
import type { ActiveVisiographToolType } from "./VisiographInteractiveOverlay";

export interface ToolClickContext {
	pt: Point2D;
	activeTool: ActiveVisiographToolType;
	drawingPoints: Point2D[];
	calibration: CalibrationReference;
	calibRefType: CalibrationReferenceType;
	customMmInput: number;
	toothCode: string | null | undefined;
	rulersCount: number;
	anglesCount: number;
	setDrawingPoints: React.Dispatch<React.SetStateAction<Point2D[]>>;
	setRulers: React.Dispatch<React.SetStateAction<RulerMeasurement[]>>;
	setAngles: React.Dispatch<React.SetStateAction<AngleMeasurement[]>>;
	setLesions: React.Dispatch<React.SetStateAction<PeriapicalLesion[]>>;
	setCalibration: React.Dispatch<React.SetStateAction<CalibrationReference>>;
	setIsCalibrated: React.Dispatch<React.SetStateAction<boolean>>;
	setActiveTool: (tool: ActiveVisiographToolType) => void;
}

export function handleToolCanvasClick({
	pt,
	activeTool,
	drawingPoints,
	calibration,
	calibRefType,
	customMmInput,
	toothCode,
	rulersCount,
	anglesCount,
	setDrawingPoints,
	setRulers,
	setAngles,
	setLesions,
	setCalibration,
	setIsCalibrated,
	setActiveTool,
}: ToolClickContext): void {
	if (activeTool === "ruler") {
		if (drawingPoints.length === 0) {
			setDrawingPoints([pt]);
		} else {
			const p1 = drawingPoints[0];
			if (p1 && distance2D(p1, pt) > 3) {
				const newRuler = calculateRuler(
					p1,
					pt,
					calibration.scaleMmPerPixel,
					`L${rulersCount + 1}`,
				);
				setRulers((prev) => [...prev, newRuler]);
			}
			setDrawingPoints([]);
		}
	} else if (activeTool === "calibrate") {
		if (drawingPoints.length === 0) {
			setDrawingPoints([pt]);
		} else {
			const p1 = drawingPoints[0];
			if (p1 && distance2D(p1, pt) > 5) {
				const preset = CALIBRATION_PRESETS[calibRefType];
				const knownMm =
					calibRefType === "custom_mm"
						? customMmInput
						: preset?.defaultMm || 5.0;
				const calib = computeCalibration(p1, pt, knownMm, calibRefType);
				setCalibration(calib);
				setIsCalibrated(true);

				setRulers((prev) =>
					prev.map((r) => calculateRuler(r.p1, r.p2, calib.scaleMmPerPixel, r.label, r.id)),
				);
				setLesions((prev) =>
					prev.map((les) =>
						calculatePeriapicalLesion(
							les.points,
							calib.scaleMmPerPixel,
							les.fdiToothCode,
							les.id,
						),
					),
				);
			}
			setDrawingPoints([]);
			setActiveTool("pointer");
		}
	} else if (activeTool === "angle") {
		if (drawingPoints.length === 0) {
			setDrawingPoints([pt]);
		} else if (drawingPoints.length === 1) {
			setDrawingPoints((prev) => [...prev, pt]);
		} else if (drawingPoints.length === 2) {
			const v = drawingPoints[0];
			const arm1 = drawingPoints[1];
			if (v && arm1) {
				const newAngle = calculateAngle3Points(
					v,
					arm1,
					pt,
					"tooth_axis",
					`∠${anglesCount + 1}`,
				);
				setAngles((prev) => [...prev, newAngle]);
			}
			setDrawingPoints([]);
		}
	} else if (activeTool === "lesion") {
		if (drawingPoints.length >= 2) {
			const first = drawingPoints[0];
			if (first && distance2D(pt, first) < 12) {
				const lesion = calculatePeriapicalLesion(
					drawingPoints,
					calibration.scaleMmPerPixel,
					toothCode ?? undefined,
				);
				setLesions((prev) => [...prev, lesion]);
				setDrawingPoints([]);
				return;
			}
		}
		setDrawingPoints((prev) => [...prev, pt]);
	} else if (activeTool === "root_canal") {
		setDrawingPoints((prev) => [...prev, pt]);
	}
}

export interface ToolDoubleClickContext {
	activeTool: ActiveVisiographToolType;
	drawingPoints: Point2D[];
	calibration: CalibrationReference;
	toothCode: string | null | undefined;
	setDrawingPoints: React.Dispatch<React.SetStateAction<Point2D[]>>;
	setRulers: React.Dispatch<React.SetStateAction<RulerMeasurement[]>>;
	setLesions: React.Dispatch<React.SetStateAction<PeriapicalLesion[]>>;
}

export function handleToolCanvasDoubleClick({
	activeTool,
	drawingPoints,
	calibration,
	toothCode,
	setDrawingPoints,
	setRulers,
	setLesions,
}: ToolDoubleClickContext): void {
	if (activeTool === "lesion" && drawingPoints.length >= 3) {
		const lesion = calculatePeriapicalLesion(
			drawingPoints,
			calibration.scaleMmPerPixel,
			toothCode ?? undefined,
		);
		setLesions((prev) => [...prev, lesion]);
		setDrawingPoints([]);
	} else if (activeTool === "root_canal" && drawingPoints.length >= 2) {
		let totalDist = 0;
		for (let i = 1; i < drawingPoints.length; i++) {
			const pA = drawingPoints[i - 1];
			const pB = drawingPoints[i];
			if (pA && pB) totalDist += distance2D(pA, pB);
		}
		const lengthMm = totalDist * calibration.scaleMmPerPixel;
		const p1 = drawingPoints[0]!;
		const pLast = drawingPoints[drawingPoints.length - 1]!;
		const newRuler = calculateRuler(
			p1,
			pLast,
			calibration.scaleMmPerPixel,
			`Канал: ${lengthMm.toFixed(1)} мм (WL/Апекс)`,
		);
		newRuler.lengthPx = totalDist;
		newRuler.lengthMm = lengthMm;
		newRuler.color = "#10b981";
		setRulers((prev) => [...prev, newRuler]);
		setDrawingPoints([]);

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-endo-wl-measured", {
					detail: {
						toothNumber: toothCode ? Number(toothCode) : 16,
						lengthMm: Math.round(lengthMm * 10) / 10,
					},
				}),
			);
		}
	}
}
