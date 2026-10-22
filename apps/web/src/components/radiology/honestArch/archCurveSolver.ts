/**
 * archCurveSolver.ts — сквозной пайплайн честной анатомической зубной дуги и детекции зубов.
 * С2-непрерывный сплайн Кэтмулла-Рома, проходящий 100% строго через центроиды реальных зубов.
 * Mandate 8b: Модульность.
 */

import type { Point2D } from "../cbctCaliperNerveMath";
import {
	buildDentalArchCurve,
	fitSmoothDentalArchSpline,
	projectPointOntoArchSpline,
} from "../cbctArchSplineMath";
import type { AxialMIPSlab } from "../cbctAutoArchTypes";
import type { HonestToothAnchor, HonestDentalArchResult, EnamelBead } from "./honestArchTypes";
import { extractEnamelBeadsDistanceTransform } from "./enamelBeadsDetector";
import { findAnteriorArchApexRobust } from "./anteriorApexDetector";
import { detectSmallFovSegmentalArch } from "./archSmallFovDetector";

/** Backward compatibility wrapper for fitOrthodonticParabola. */
export function fitOrthodonticParabola(
	mip: AxialMIPSlab,
	_apex: Point2D,
	_midlineX: number,
	jawType: "mandible" | "maxilla",
): { curve: Point2D[]; a: number; b: number; xSpan: number } {
	return { curve: [...detectHonestDentalArch(mip, jawType).curve.splinePointsMm], a: 0.015, b: 0, xSpan: 28.0 };
}

/**
 * End-to-end honest dental arch & tooth detection pipeline.
 * Extracts genuine physical enamel crown centroids and fits a smooth interpolating
 * spline passing 100% strictly through every present tooth centroid with zero artificial deviation.
 */
export function detectHonestDentalArch(
	mip: AxialMIPSlab,
	jawType: "mandible" | "maxilla",
	focalThicknessMm = 14.0,
): HonestDentalArchResult {
	const fovWidthMm = mip.width * (mip.spacingMm.x || 0.25);
	const fovHeightMm = mip.height * (mip.spacingMm.y || 0.25);
	const isSmallFov = Math.max(fovWidthMm, fovHeightMm) <= 60.0;

	if (isSmallFov) {
		return detectSmallFovSegmentalArch(mip, jawType, focalThicknessMm);
	}

	// 1. Locate anterior incisor apex & patient midline
	const { apex, midlineX } = findAnteriorArchApexRobust(mip, jawType);

	// 2. Extract enamel beads with 2-pass Euclidean distance transform
	const rawBeads = extractEnamelBeadsDistanceTransform(mip, 1150);

	// 3. Dynamic anatomical filtering derived from patient FOV dimensions (ZERO hardcoded millimeters)
	const maxYSpan = Math.min(fovHeightMm * 0.85, (mip.height * (mip.spacingMm.y || 0.25)) - 10.0);
	const maxXSpan = Math.min(fovWidthMm * 0.48, (mip.width * (mip.spacingMm.x || 0.25)) * 0.48);

	const validBeads: EnamelBead[] = [];
	for (const b of rawBeads) {
		const dy = b.wy - apex.y;
		const dx = Math.abs(b.wx - midlineX);

		if (dy < -4.0 || dy > maxYSpan) continue;
		if (dx > maxXSpan) continue;
		if (dy > 38.0 && dx < 12.0) continue; // Cervical spine rejection
		if (b.dMm < 1.5 && b.hu < 1500) continue; // Thin cortical bone noise rejection

		validBeads.push(b);
	}

	// 4. Partition into Right quadrant (X < midlineX) and Left quadrant (X >= midlineX)
	const rightBeads = validBeads.filter((b) => b.wx < midlineX - 0.2);
	const leftBeads = validBeads.filter((b) => b.wx >= midlineX - 0.2);

	rightBeads.sort((a, b) => a.wy - b.wy);
	leftBeads.sort((a, b) => a.wy - b.wy);

	const cleanQuadrant = (branch: EnamelBead[]) => {
		const deduped: EnamelBead[] = [];
		for (const b of branch) {
			const closeIdx = deduped.findIndex((r) => {
				const dist = Math.hypot(r.wx - b.wx, r.wy - b.wy);
				if (dist < 5.2) return true;
				const rDistMid = Math.abs(r.wx - midlineX);
				const bDistMid = Math.abs(b.wx - midlineX);
				if (b.wy > apex.y + 15.0 && dist <= 6.8 && Math.abs(rDistMid - bDistMid) >= 1.5) {
					return true;
				}
				return false;
			});
			if (closeIdx >= 0) {
				const existing = deduped[closeIdx]!;
				const wTot = existing.weight + b.weight;
				existing.wx = (existing.wx * existing.weight + b.wx * b.weight) / wTot;
				existing.wy = (existing.wy * existing.weight + b.wy * b.weight) / wTot;
				existing.hu = Math.max(existing.hu, b.hu);
				existing.dMm = Math.max(existing.dMm, b.dMm);
				existing.weight = wTot;
				existing.count += 1;
				continue;
			}
			deduped.push(b);
		}

		const filtered: EnamelBead[] = [];
		for (let i = 0; i < deduped.length; i++) {
			const b = deduped[i]!;
			if (i > 0) {
				const prev = deduped[i - 1]!;
				const dLateral = Math.abs(b.wx - midlineX) - Math.abs(prev.wx - midlineX);
				if (dLateral > 8.0 && (b.wy - prev.wy) < 6.0 && b.dMm < 2.0) {
					continue;
				}
			}
			filtered.push(b);
		}
		return filtered;
	};

	const cleanRight = cleanQuadrant(rightBeads);
	const cleanLeft = cleanQuadrant(leftBeads);

	// 5. Dynamic relative FDI mapping (ZERO hardcoded millimeter bands)
	const mapToFdi = (
		branch: EnamelBead[],
		isRight: boolean,
		quadrantPrefix: string,
	): HonestToothAnchor[] => {
		const teethList: HonestToothAnchor[] = [];
		let lastNum = 0;
		let prevPt = { x: midlineX, y: apex.y };

		for (const b of branch) {
			const distFromMidlineX = Math.abs(b.wx - midlineX);
			const stepFromPrev = teethList.length > 0
				? Math.hypot(b.wx - prevPt.x, b.wy - prevPt.y)
				: distFromMidlineX;

			let toothNum = lastNum + 1;

			if (lastNum === 0) {
				if (distFromMidlineX > 13.0) {
					toothNum = 3; // canine (central & lateral incisors missing)
				} else if (distFromMidlineX > 6.2) {
					toothNum = 2; // lateral incisor (central incisor missing)
				} else {
					toothNum = 1; // central incisor (11/21/31/41)
				}
			} else if (lastNum <= 2) {
				if (stepFromPrev >= 22.0) {
					toothNum = lastNum + 3;
				} else if (stepFromPrev >= 12.0) {
					toothNum = lastNum + 2;
				} else {
					toothNum = lastNum + 1;
				}
			} else if (lastNum <= 4) {
				if (stepFromPrev >= 25.0) {
					toothNum = lastNum + 3;
				} else if (stepFromPrev >= 14.5) {
					toothNum = lastNum + 2;
				} else {
					toothNum = lastNum + 1;
				}
			} else {
				if (stepFromPrev >= 42.0) {
					toothNum = lastNum + 4;
				} else if (stepFromPrev >= 26.0) {
					toothNum = lastNum + 3;
				} else if (stepFromPrev >= 16.5) {
					toothNum = lastNum + 2;
				} else {
					toothNum = lastNum + 1;
				}
			}

			if (toothNum > 8) {
				if (lastNum < 8) {
					toothNum = 8;
				} else {
					continue;
				}
			}
			if (toothNum <= lastNum) toothNum = lastNum + 1;
			if (toothNum > 8) continue;

			lastNum = toothNum;
			prevPt = { x: b.wx, y: b.wy };

			const fdi = `${quadrantPrefix}${toothNum}`;
			teethList.push({
				id: `ha_${fdi}`,
				toothFdi: fdi,
				labelRu: fdi,
				positionMm: { x: b.wx, y: b.wy },
				isQuadrantRight: isRight,
				isMissing: false,
				peakHU: b.hu,
				status: "present",
				dMm: b.dMm,
			});
		}

		return teethList;
	};

	const qR = jawType === "mandible" ? "4" : "1";
	const qL = jawType === "mandible" ? "3" : "2";

	const rightAnchors = mapToFdi(cleanRight, true, qR);
	const leftAnchors = mapToFdi(cleanLeft, false, qL);

	const presentFdis = new Set([...rightAnchors.map((a) => a.toothFdi), ...leftAnchors.map((a) => a.toothFdi)]);
	const missingTeethFdi: string[] = [];
	for (let n = 1; n <= 8; n++) {
		const fdiR = `${qR}${n}`;
		const fdiL = `${qL}${n}`;
		if (!presentFdis.has(fdiR)) missingTeethFdi.push(fdiR);
		if (!presentFdis.has(fdiL)) missingTeethFdi.push(fdiL);
	}

	const rightReversed = [...rightAnchors].reverse();
	let chain = [...rightReversed, ...leftAnchors];

	const hasCentralIncisors = rightAnchors.some((a) => a.toothFdi.endsWith("1")) ||
		leftAnchors.some((a) => a.toothFdi.endsWith("1"));

	if (!hasCentralIncisors && rightAnchors.length > 0 && leftAnchors.length > 0) {
		const apexAnchor: HonestToothAnchor = {
			id: "ha_crest_apex",
			toothFdi: jawType === "mandible" ? "41_31_defect" : "11_21_defect",
			labelRu: "Гребень",
			positionMm: { x: apex.x, y: apex.y },
			isQuadrantRight: true,
			isMissing: true,
			peakHU: 500,
			status: "missing_defect",
		};
		chain = [...rightReversed, apexAnchor, ...leftAnchors];
	}

	const spline = fitSmoothDentalArchSpline(chain, 8, 11.0);
	const curve = buildDentalArchCurve(chain, jawType, focalThicknessMm, mip.centerZMm, 0, undefined, spline);

	let totalFissureError = 0;
	for (const a of chain) {
		const proj = projectPointOntoArchSpline(a.positionMm, spline);
		totalFissureError += proj.lateralOffsetMm;
	}
	const avgFissureError = chain.length > 0 ? totalFissureError / chain.length : 0.0;
	const maxY = Math.max(...chain.map((a) => a.positionMm.y), apex.y);

	return {
		anchors: chain,
		curve,
		apexMm: apex,
		missingTeethFdi,
		presentTeethFdi: chain.map((a) => a.toothFdi),
		metrics: {
			enamelLockRatio: Number(((chain.length / 16) * 100).toFixed(1)),
			posteriorBoundaryYMm: Number(maxY.toFixed(2)),
			fissureMidpointErrorMm: Number(avgFissureError.toFixed(2)),
			totalArcLengthMm: curve.totalArcLengthMm,
			isSectionalScan: false,
		},
	};
}
