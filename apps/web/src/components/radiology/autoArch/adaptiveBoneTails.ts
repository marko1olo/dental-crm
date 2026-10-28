/**
 * DENTE CRM — CBCT Adaptive Bone Ridge Tails Tracer
 * Standards: DICOM Part 3, Misch CE, Mandate 8b (<= 120 lines).
 */

import type { Point2D } from "../cbctCaliperNerveMath";
import type { AxialMIPSlab } from "../cbctAutoArchTypes";
import type { DentalArchAnchor } from "../dentalCurveEngine";
import { sampleMipHUContinuous } from "./axialMipExtractor";

/** Traces cortical bone center for retromolar / ascending ramus extensions from DICOM HU. */
export function traceAdaptiveBoneRidgeTails(
	mip: AxialMIPSlab,
	anchors: readonly DentalArchAnchor[],
	extendMm: number,
): { rightExt: Point2D[]; leftExt: Point2D[] } {
	if (extendMm <= 0 || !anchors || anchors.length < 2) return { rightExt: [], leftExt: [] };

	const findBoneCenter = (yMm: number, isRight: boolean, prevX: number): Point2D => {
		let sumW = 0, sumWX = 0, minX = 0, maxX = 0, found = false;
		const searchStart = isRight ? Math.min(-10.0, prevX + 4.0) : Math.max(10.0, prevX - 4.0);
		const searchEnd = isRight ? prevX - 30.0 : prevX + 30.0;
		const step = isRight ? -0.5 : 0.5;
		const steps = Math.abs(Math.round((searchEnd - searchStart) / step));

		for (let i = 0; i <= steps; i++) {
			const x = searchStart + i * step;
			const hu = sampleMipHUContinuous(mip, x, yMm);
			if (hu >= 500) {
				const w = hu - 400;
				sumW += w;
				sumWX += w * x;
				if (!found) { minX = x; found = true; }
				maxX = x;
			}
		}
		if (found && sumW > 0) return { x: Number(((minX + maxX) / 2.0).toFixed(2)), y: yMm };
		return { x: Number((isRight ? prevX - 3.5 : prevX + 3.5).toFixed(2)), y: yMm };
	};

	const rightAnch = anchors[0]!.positionMm;
	const leftAnch = anchors[anchors.length - 1]!.positionMm;
	const nSteps = 3;
	const stepMm = extendMm / nSteps;
	const rightPts: Point2D[] = [];
	const leftPts: Point2D[] = [];
	let prevRightX = rightAnch.x;
	let prevLeftX = leftAnch.x;

	for (let i = 1; i <= nSteps; i++) {
		const ptR = findBoneCenter(rightAnch.y + i * stepMm, true, prevRightX);
		rightPts.push(ptR);
		prevRightX = ptR.x;
		const ptL = findBoneCenter(leftAnch.y + i * stepMm, false, prevLeftX);
		leftPts.push(ptL);
		prevLeftX = ptL.x;
	}

	return { rightExt: rightPts.reverse(), leftExt: leftPts };
}
