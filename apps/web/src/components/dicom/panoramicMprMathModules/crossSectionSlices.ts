/**
 * crossSectionSlices.ts — Вычисление плоскостей поперечных срезов вдоль дуги (Мандат 8b <= 120 строк).
 */

import type { ArchCurvePoint, CrossSectionOptions, CrossSectionSlicePlane } from "./types";
import { vec3Normalize, vec3Lerp } from "./vectorMath";

export function generateCrossSectionSlicePlanes(
	curvePoints: ArchCurvePoint[],
	options: CrossSectionOptions = {},
): CrossSectionSlicePlane[] {
	if (curvePoints.length < 2) return [];

	const stepInterval = Math.max(0.5, Math.min(10.0, options.stepIntervalMm ?? 1.5));
	const thickness = Math.max(0.5, Math.min(20.0, options.thicknessMm ?? 1.0));
	const width = Math.max(10.0, Math.min(80.0, options.widthMm ?? 30.0));
	const height = Math.max(10.0, Math.min(80.0, options.heightMm ?? 40.0));

	const totalLength = curvePoints[curvePoints.length - 1]!.arcLengthMm;
	const numSlices = Math.max(2, Math.floor(totalLength / stepInterval) + 1);

	const slices: CrossSectionSlicePlane[] = [];
	let curveIdx = 0;

	for (let sliceIdx = 0; sliceIdx < numSlices; sliceIdx++) {
		const targetArcLength = Math.min(totalLength, sliceIdx * stepInterval);

		while (
			curveIdx < curvePoints.length - 1 &&
			curvePoints[curveIdx + 1]!.arcLengthMm < targetArcLength
		) {
			curveIdx++;
		}

		const pA = curvePoints[curveIdx]!;
		const pB = curvePoints[Math.min(curvePoints.length - 1, curveIdx + 1)]!;
		const segmentLen = pB.arcLengthMm - pA.arcLengthMm;
		const alpha = segmentLen > 1e-6 ? (targetArcLength - pA.arcLengthMm) / segmentLen : 0;

		const center = vec3Lerp(pA.point, pB.point, alpha);
		const tangent = vec3Normalize(vec3Lerp(pA.tangent, pB.tangent, alpha));
		const normal = vec3Normalize(vec3Lerp(pA.normal, pB.normal, alpha));
		const up = vec3Normalize(vec3Lerp(pA.binormal, pB.binormal, alpha));

		slices.push({
			sliceIndex: sliceIdx,
			center,
			normal: tangent,
			tangent: normal,
			up,
			arcLengthMm: targetArcLength,
			widthMm: width,
			heightMm: height,
			thicknessMm: thickness,
		});
	}

	return slices;
}
