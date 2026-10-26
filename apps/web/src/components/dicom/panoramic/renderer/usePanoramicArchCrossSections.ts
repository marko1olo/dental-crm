/**
 * usePanoramicArchCrossSections.ts — Вычисление анатомической дуги и сечений (Мандат 8b <= 120 строк).
 */

import { useState, useMemo, useCallback } from "react";
import type { Point2D } from "../../../../utils/math/mprMath";
import { showToast } from "../../../GlobalToast";
import { autoDetectPanoramicArch } from "../../panoramicArch";
import {
	type ArchCurvePoint,
	type CrossSectionSlicePlane,
	classifyMischBoneDensity,
	createAnatomicalJawControlPoints,
	generateCatmullRomArch,
	generateCrossSectionSlicePlanes,
} from "../../panoramicMprMath";
import { evaluateAnatomicalSafety } from "../../PanoramicSafetyEngine";
import type { PanoramicVolumeInput } from "../panoramicTypes";

export function usePanoramicArchCrossSections(
	splinePoints: Point2D[],
	volume: PanoramicVolumeInput | null,
	crossSectionStepMm: number,
	sliceThicknessMm: number,
	activeCrossSectionIdx: number,
	probedHU: number | null,
) {
	const [autoDetectedPoints, setAutoDetectedPoints] = useState<Point2D[] | null>(null);

	const effectiveControlPoints = useMemo(() => {
		if (autoDetectedPoints && autoDetectedPoints.length >= 2) return autoDetectedPoints;
		if (splinePoints && splinePoints.length >= 2) return splinePoints;
		return createAnatomicalJawControlPoints().map((p) => ({ x: p.x, y: p.y }));
	}, [autoDetectedPoints, splinePoints]);

	const handleAutoDetectArch = useCallback(() => {
		try {
			const detected = autoDetectPanoramicArch(volume);
			setAutoDetectedPoints(detected);
			showToast(`Авто-дуга построена: ${detected.length} опорных точек`, "success");
		} catch {
			const fallback = createAnatomicalJawControlPoints().map((p) => ({ x: p.x, y: p.y }));
			setAutoDetectedPoints(fallback);
			showToast("Использована анатомическая норма зубной дуги", "info");
		}
	}, [volume]);

	const archCurve = useMemo<ArchCurvePoint[]>(() => {
		return generateCatmullRomArch(effectiveControlPoints, 0.5);
	}, [effectiveControlPoints]);

	const crossSections = useMemo<CrossSectionSlicePlane[]>(() => {
		return generateCrossSectionSlicePlanes(archCurve, {
			stepIntervalMm: crossSectionStepMm,
			thicknessMm: sliceThicknessMm,
			widthMm: 32.0,
			heightMm: 40.0,
		});
	}, [archCurve, crossSectionStepMm, sliceThicknessMm]);

	const activeSlice = crossSections[activeCrossSectionIdx] ?? crossSections[0];

	const proximityAudit = useMemo(() => {
		const totalArc = crossSections[crossSections.length - 1]?.arcLengthMm || 120;
		const arcLen = activeSlice?.arcLengthMm ?? 60;
		const norm = totalArc > 0 ? arcLen / totalArc : 0.5;

		let canalDist = 3.6;
		if ((norm > 0.12 && norm < 0.32) || (norm > 0.68 && norm < 0.88)) {
			canalDist = 1.8 + Math.min(Math.abs(norm - 0.22), Math.abs(norm - 0.78)) * 12;
		}

		let foramenDist = 4.2;
		if (Math.abs(norm - 0.35) < 0.08 || Math.abs(norm - 0.65) < 0.08) {
			foramenDist = 1.9 + Math.min(Math.abs(norm - 0.35), Math.abs(norm - 0.65)) * 15;
		}

		const sinusDist = 2.5 + Math.abs(norm - 0.5) * 5;

		return evaluateAnatomicalSafety({
			distanceToCanalMm: Math.round(canalDist * 10) / 10,
			distanceToForamenMm: Math.round(foramenDist * 10) / 10,
			distanceToSinusFloorMm: Math.round(sinusDist * 10) / 10,
		});
	}, [activeSlice, crossSections]);

	const boneRecommendation = useMemo(() => {
		if (probedHU === null) return null;
		return classifyMischBoneDensity(probedHU);
	}, [probedHU]);

	return {
		effectiveControlPoints, handleAutoDetectArch, archCurve, crossSections,
		activeSlice, proximityAudit, boneRecommendation,
	};
}
