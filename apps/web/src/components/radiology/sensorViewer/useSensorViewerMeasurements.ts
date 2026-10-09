import { useState, useCallback } from "react";
import {
	calculateCurvedCanalLengthMm,
	calculateLesionAreaGaussMm2,
	type ViewerPoint2D,
	type ViewerRulerMeasurement,
	type ViewerCurvedMeasurement,
	type ViewerAreaMeasurement,
} from "../dentalViewerMath.js";
import { showToast } from "../../GlobalToast.js";

export interface UseSensorViewerMeasurementsOptions {
	readonly calibratedMmPerPx: number;
}

export function useSensorViewerMeasurements(options: UseSensorViewerMeasurementsOptions) {
	const { calibratedMmPerPx } = options;

	// Interactive straight and curved measurements
	const [measurements, setMeasurements] = useState<ViewerRulerMeasurement[]>([]);
	const [draftStart, setDraftStart] = useState<ViewerPoint2D | null>(null);
	const [draftCurrent, setDraftCurrent] = useState<ViewerPoint2D | null>(null);

	// Multi-point curved root canal apex caliper (Working Length)
	const [curvedCanals, setCurvedCanals] = useState<ViewerCurvedMeasurement[]>([]);
	const [draftCurvedPoints, setDraftCurvedPoints] = useState<ViewerPoint2D[]>([]);

	// Periapical lesion contour polygons (Gauss Shoelace area mm²)
	const [lesionContours, setLesionContours] = useState<ViewerAreaMeasurement[]>([]);
	const [draftLesionPoints, setDraftLesionPoints] = useState<ViewerPoint2D[]>([]);

	// Finalizes multi-point curved root canal apex caliper measurement
	const handleFinishCurvedCanal = useCallback(() => {
		if (draftCurvedPoints.length < 2) {
			setDraftCurvedPoints([]);
			return;
		}
		const lengthMm = calculateCurvedCanalLengthMm(draftCurvedPoints, calibratedMmPerPx);
		const canalIdx = curvedCanals.length + 1;
		const newCanal: ViewerCurvedMeasurement = {
			id: `canal-${Date.now()}`,
			points: draftCurvedPoints,
			totalLengthMm: lengthMm,
			label: `Канал #${canalIdx} (WL: ${lengthMm.toFixed(1)} мм)`,
			color: "#38bdf8",
		};
		setCurvedCanals((prev) => [...prev, newCanal]);
		setDraftCurvedPoints([]);
		showToast(`Эндо-канал #${canalIdx}: рабочая длина ${lengthMm.toFixed(1)} мм зафиксирована`, "success");
	}, [draftCurvedPoints, calibratedMmPerPx, curvedCanals.length]);

	// Finalizes periapical lesion / cyst contour polygon measurement (Gauss Shoelace)
	const handleFinishLesionContour = useCallback(() => {
		if (draftLesionPoints.length < 3) {
			setDraftLesionPoints([]);
			return;
		}
		const areaMm2 = calculateLesionAreaGaussMm2(draftLesionPoints, calibratedMmPerPx);
		const lesionIdx = lesionContours.length + 1;
		const newLesion: ViewerAreaMeasurement = {
			id: `lesion-${Date.now()}`,
			points: draftLesionPoints,
			areaMm2,
			label: `Очаг #${lesionIdx} (${areaMm2.toFixed(1)} мм²)`,
			color: "#f59e0b",
		};
		setLesionContours((prev) => [...prev, newLesion]);
		setDraftLesionPoints([]);
		showToast(`Очаг деструкции #${lesionIdx}: площадь ${areaMm2.toFixed(1)} мм² зафиксирована`, "success");
	}, [draftLesionPoints, calibratedMmPerPx, lesionContours.length]);

	// Clear all measurements
	const handleClearMeasurements = useCallback(() => {
		setMeasurements([]);
		setCurvedCanals([]);
		setLesionContours([]);
		setDraftStart(null);
		setDraftCurrent(null);
		setDraftCurvedPoints([]);
		setDraftLesionPoints([]);
		showToast("Измерения снимка очищены", "info");
	}, []);

	const measurementsCount = measurements.length + curvedCanals.length + lesionContours.length;

	return {
		measurements,
		setMeasurements,
		draftStart,
		setDraftStart,
		draftCurrent,
		setDraftCurrent,
		curvedCanals,
		setCurvedCanals,
		draftCurvedPoints,
		setDraftCurvedPoints,
		lesionContours,
		setLesionContours,
		draftLesionPoints,
		setDraftLesionPoints,
		handleFinishCurvedCanal,
		handleFinishLesionContour,
		handleClearMeasurements,
		measurementsCount,
	};
}
