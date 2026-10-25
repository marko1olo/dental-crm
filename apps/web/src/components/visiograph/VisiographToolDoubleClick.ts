/**
 * VisiographToolDoubleClick.ts
 * Double-click interactions to finalize lesion polygons or dispatch endodontic WL events.
 */

import type React from "react";
import {
	calculatePeriapicalLesion,
	calculateRuler,
	distance2D,
	type CalibrationReference,
	type PeriapicalLesion,
	type Point2D,
	type RulerMeasurement,
} from "./VisiographMeasurementMath";
import type { ActiveVisiographToolType } from "./VisiographInteractiveOverlay";

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
		const lesion = calculatePeriapicalLesion(drawingPoints, calibration.scaleMmPerPixel, toothCode ?? undefined);
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
