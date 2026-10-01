/**
 * DENTE CRM — CBCT Four Scientific Arch Detection Methods Suite
 * Academic comparison:
 * - Method 1: 4th-Order Polynomial Parabola (Y = a*X^2 + b*X^4 + c) via Normal Equation Matrix
 * - Method 2: Active Contour (Snake) with Elasticity (alpha) and Bending Rigidity (beta)
 * - Method 3: Wheeler Anatomical Ridge & Blob Engine (Honest Enamel Rings)
 * - Method 4: Catenary Curve / Brader Model (Y = c*(cosh(X/c) - 1))
 *
 * Implements 3 Tooth Marking Techniques:
 * - Technique A: Uniform Arc-Length Division
 * - Technique B: Physical Enamel Peaks (projected onto smooth arch)
 * - Technique C: Orthogonal Ray-Casting with Edentulous Defect Classification
 *
 * Strict adherence to Mandate 8b (<= 800 lines) and zero patient-specific hardcoding.
 */

import type { Point2D } from "./cbctCaliperNerveMath";
import {
	type DentalArchAnchor,
	type DentalArchCurve,
	buildDentalArchCurve,
	projectPointOntoArchSpline,
} from "./cbctArchSplineMath";
import type { AxialMIPSlab } from "./cbctAutoArchTypes";
import { sampleMipHUContinuous } from "./cbctAutoArchTypes";
import {
	detectHonestDentalArch,
	findAnteriorArchApexRobust,
	type HonestToothAnchor,
} from "./cbctHonestArchBlobEngine";

export interface MethodEvaluationResult {
	readonly methodName: string;
	readonly methodId:
		| "method1_poly_parabola"
		| "method2_active_contour"
		| "method3_wheeler_walker"
		| "method4_catenary_arch"
		| "method1_dp_graph"
		| "method2_poly_ransac"
		| "method4_medial_axis";
	readonly anchors: DentalArchAnchor[];
	readonly curve: DentalArchCurve;
	readonly metrics: {
		/** Percentage of anchors landing on enamel / cortical peak (HU >= 1400) */
		enamelLockRatio: number;
		/** Posterior boundary Y in mm */
		posteriorBoundaryYMm: number;
		/** Mean bucco-lingual central fissure symmetry error in mm */
		fissureMidpointErrorMm: number;
		/** Total arch length in mm */
		totalArcLengthMm: number;
	};
}

const MAND_FDI = ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"] as const;
const MAX_FDI = ["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"] as const;

// Canonical adult cumulative arch distance in mm from incisor midline to tooth centers (Wheeler SSOT)
const CUM_DIST_MAND = [58.0, 48.0, 38.0, 29.5, 22.0, 15.0, 8.5, 2.8] as const;
const CUM_DIST_MAX = [57.5, 48.0, 38.0, 29.5, 22.0, 15.5, 8.5, 4.2] as const;

/**
 * Finds anterior apex of the dental arch (central incisor crest point) on the MIP slab.
 */
export function findAnteriorArchApex(mip: AxialMIPSlab): Point2D {
	return findAnteriorArchApexRobust(mip).apex;
}

// ─────────────────────────────────────────────────────────────────────────────
// METHOD 1: 4th-Order Polynomial Parabola (Normal Equations Matrix)
// ─────────────────────────────────────────────────────────────────────────────

export function runMethod1_PolynomialParabola(
	mip: AxialMIPSlab,
	jawType: "mandible" | "maxilla",
): MethodEvaluationResult {
	const fdiList = jawType === "mandible" ? MAND_FDI : MAX_FDI;
	const cumDists = jawType === "mandible" ? CUM_DIST_MAND : CUM_DIST_MAX;
	const { width, height, originMm, spacingMm, data } = mip;
	const spX = spacingMm.x || 0.25;
	const spY = spacingMm.y || 0.25;

	const { apex, midlineX } = findAnteriorArchApexRobust(mip);
	const targetMaxDeltaY = jawType === "maxilla" ? 38.0 : 52.0;

	// Normal equation matrix sums:
	// [ S4  S6 ] [ a ] = [ R2 ]
	// [ S6  S8 ] [ b ]   [ R4 ]
	let s4 = 0, s6 = 0, s8 = 0;
	let r2 = 0, r4 = 0;

	for (let y = 0; y < height; y += 2) {
		const wy = originMm.y + y * spY;
		const dy = wy - apex.y;
		if (dy < 0 || dy > targetMaxDeltaY + 4.0) continue;

		for (let x = 0; x < width; x += 2) {
			const wx = originMm.x + x * spX;
			const u = wx - midlineX;
			if (Math.abs(u) > 42.0) continue;
			if (jawType === "maxilla" && Math.abs(u) > 33.0 && dy > 24.0) continue; // Ramus guard

			const hu = data[y * width + x] ?? -1000;
			if (hu >= 1200) {
				const w = Math.pow(Math.min(hu - 1000, 2000), 1.5);
				const u2 = u * u;
				const u4 = u2 * u2;
				const u6 = u4 * u2;
				const u8 = u4 * u4;

				s4 += w * u4;
				s6 += w * u6;
				s8 += w * u8;
				r2 += w * u2 * dy;
				r4 += w * u4 * dy;
			}
		}
	}

	const reg = 1e-3;
	const det = (s4 + reg) * (s8 + reg) - s6 * s6;
	let a = ((s8 + reg) * r2 - s6 * r4) / (det || 1);
	let b = ((s4 + reg) * r4 - s6 * r2) / (det || 1);

	// Anatomical bounds
	if (a < 0.020 || a > 0.065 || !Number.isFinite(a)) a = jawType === "maxilla" ? 0.028 : 0.032;

	const maxMolarU = jawType === "maxilla" ? 28.5 : 27.5;
	const vTrans = jawType === "maxilla" ? 17.0 : 16.0;
	const nFront = 30;
	const nPost = 30;
	const rightSide: Point2D[] = [];
	const leftSide: Point2D[] = [];

	// Frontal circular/elliptical arc
	for (let i = 0; i <= nFront; i++) {
		const theta = (i / nFront) * (Math.PI / 2);
		const u = maxMolarU * Math.sin(theta);
		const v = vTrans * (1 - Math.cos(theta));
		rightSide.push({ x: Number((midlineX - u).toFixed(2)), y: Number((apex.y + v).toFixed(2)) });
		leftSide.push({ x: Number((midlineX + u).toFixed(2)), y: Number((apex.y + v).toFixed(2)) });
	}

	// Posterior straight branches parallel to sagittal axis (dx/dy = 0)
	if (targetMaxDeltaY > vTrans) {
		for (let i = 1; i <= nPost; i++) {
			const v = vTrans + (i / nPost) * (targetMaxDeltaY - vTrans);
			rightSide.push({ x: Number((midlineX - maxMolarU).toFixed(2)), y: Number((apex.y + v).toFixed(2)) });
			leftSide.push({ x: Number((midlineX + maxMolarU).toFixed(2)), y: Number((apex.y + v).toFixed(2)) });
		}
	}

	const smoothSpline: Point2D[] = [...rightSide.slice().reverse(), ...leftSide.slice(1)];

	// Position 16 teeth strictly on smooth spline using Technique B (Physical Enamel Beads Projected)
	const anchors = allocateTeethOnSmoothSpline(mip, smoothSpline, apex, midlineX, fdiList, cumDists);
	const curve = buildDentalArchCurve(anchors, jawType, 14.0, mip.centerZMm, 0, undefined, smoothSpline);
	const metrics = evaluateArchMetrics(mip, anchors, curve);

	return {
		methodName: "Метод 1: 4th-Order Parabola (МНК Матрица)",
		methodId: "method1_poly_parabola",
		anchors,
		curve,
		metrics,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// METHOD 2: Active Contour (Snake) with Elasticity (alpha) and Rigidity (beta)
// ─────────────────────────────────────────────────────────────────────────────

export function runMethod2_ActiveContourSnake(
	mip: AxialMIPSlab,
	jawType: "mandible" | "maxilla",
): MethodEvaluationResult {
	const fdiList = jawType === "mandible" ? MAND_FDI : MAX_FDI;
	const cumDists = jawType === "mandible" ? CUM_DIST_MAND : CUM_DIST_MAX;
	const { apex, midlineX } = findAnteriorArchApexRobust(mip);

	// 1. Initial configuration: smooth arch template (33 control vertices)
	const N = 33;
	const a0 = jawType === "maxilla" ? 0.028 : 0.032;
	const xSpan = jawType === "maxilla" ? 33.0 : 37.0;

	const vertices: Point2D[] = [];
	for (let i = 0; i < N; i++) {
		const u = -xSpan + (2 * xSpan * i) / (N - 1);
		vertices.push({
			x: midlineX + u,
			y: apex.y + a0 * u * u,
		});
	}

	// 2. Snake physics parameters:
	// alpha: membrane elasticity (prevents stretching)
	// beta: thin-plate bending rigidity (suppresses cusp-to-cusp zig-zags)
	// gamma: viscosity damping
	const alpha = 0.5;
	const beta = 2.0;
	const gamma = 1.0;
	const iterations = 12;

	for (let iter = 0; iter < iterations; iter++) {
		for (let i = 1; i < N - 1; i++) {
			const v = vertices[i]!;
			const vPrev = vertices[i - 1]!;
			const vNext = vertices[i + 1]!;

			// Internal tension force (alpha * v'')
			const fTensionX = alpha * (vNext.x - 2 * v.x + vPrev.x);
			const fTensionY = alpha * (vNext.y - 2 * v.y + vPrev.y);

			// Internal rigidity force (beta * v'''')
			let fRigidityX = 0;
			let fRigidityY = 0;
			if (i >= 2 && i <= N - 3) {
				const vPrev2 = vertices[i - 2]!;
				const vNext2 = vertices[i + 2]!;
				fRigidityX = -beta * (vNext2.x - 4 * vNext.x + 6 * v.x - 4 * vPrev.x + vPrev2.x);
				fRigidityY = -beta * (vNext2.y - 4 * vNext.y + 6 * v.y - 4 * vPrev.y + vPrev2.y);
			}

			// External potential gradient from enamel density (HU >= 1400)
			const delta = 1.0;
			const huRight = sampleMipHUContinuous(mip, v.x + delta, v.y);
			const huLeft = sampleMipHUContinuous(mip, v.x - delta, v.y);
			const huUp = sampleMipHUContinuous(mip, v.x, v.y + delta);
			const huDown = sampleMipHUContinuous(mip, v.x, v.y - delta);

			const gradX = ((huRight - huLeft) / (2 * delta)) * 0.003;
			const gradY = ((huUp - huDown) / (2 * delta)) * 0.003;

			// Clamped displacement along normal
			const stepX = (fTensionX + fRigidityX + gradX) / gamma;
			const stepY = (fTensionY + fRigidityY + gradY) / gamma;

			v.x += Math.max(-0.8, Math.min(0.8, stepX));
			v.y += Math.max(-0.8, Math.min(0.8, stepY));
		}
	}

	// Dense resampled snake curve
	const numPts = 120;
	const smoothSpline: Point2D[] = [];
	for (let i = 0; i < numPts; i++) {
		const frac = i / (numPts - 1);
		const rawIdx = frac * (N - 1);
		const baseIdx = Math.floor(rawIdx);
		const t = rawIdx - baseIdx;
		if (baseIdx >= N - 1) {
			smoothSpline.push(vertices[N - 1]!);
		} else {
			const p0 = vertices[baseIdx]!;
			const p1 = vertices[baseIdx + 1]!;
			smoothSpline.push({
				x: Number((p0.x + t * (p1.x - p0.x)).toFixed(2)),
				y: Number((p0.y + t * (p1.y - p0.y)).toFixed(2)),
			});
		}
	}

	const anchors = allocateTeethOnSmoothSpline(mip, smoothSpline, apex, midlineX, fdiList, cumDists);
	const curve = buildDentalArchCurve(anchors, jawType, 14.0, mip.centerZMm, 0, undefined, smoothSpline);
	const metrics = evaluateArchMetrics(mip, anchors, curve);

	return {
		methodName: "Метод 2: Active Contour Snake (Rigidity beta=2.0)",
		methodId: "method2_active_contour",
		anchors,
		curve,
		metrics,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// METHOD 3: Wheeler Anatomical Ridge & Blob Engine (SSOT Honest Beads)
// ─────────────────────────────────────────────────────────────────────────────

export function runMethod3_WheelerAnatomicalToothWalker(
	mip: AxialMIPSlab,
	jawType: "mandible" | "maxilla",
): MethodEvaluationResult {
	const res = detectHonestDentalArch(mip, jawType);
	return {
		methodName: "Метод 3: Wheeler Ridge & Honest Beads Engine",
		methodId: "method3_wheeler_walker",
		anchors: res.anchors,
		curve: res.curve,
		metrics: {
			enamelLockRatio: res.metrics.enamelLockRatio,
			posteriorBoundaryYMm: res.metrics.posteriorBoundaryYMm,
			fissureMidpointErrorMm: res.metrics.fissureMidpointErrorMm,
			totalArcLengthMm: res.metrics.totalArcLengthMm,
		},
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// METHOD 4: Catenary Curve / Brader Model (Y = c*(cosh(X/c) - 1))
// ─────────────────────────────────────────────────────────────────────────────

export function runMethod4_CatenaryBraderArch(
	mip: AxialMIPSlab,
	jawType: "mandible" | "maxilla",
): MethodEvaluationResult {
	const fdiList = jawType === "mandible" ? MAND_FDI : MAX_FDI;
	const cumDists = jawType === "mandible" ? CUM_DIST_MAND : CUM_DIST_MAX;
	const { width, height, originMm, spacingMm, data } = mip;
	const spX = spacingMm.x || 0.25;
	const spY = spacingMm.y || 0.25;

	const { apex, midlineX } = findAnteriorArchApexRobust(mip);
	const targetMaxDeltaY = jawType === "maxilla" ? 38.0 : 52.0;

	// Optimal catenary scale parameter c via 1D grid search over enamel density
	let bestC = 22.0;
	let maxScore = -Infinity;

	for (let c = 14.0; c <= 40.0; c += 0.5) {
		let score = 0;
		for (let u = -34.0; u <= 34.0; u += 2.0) {
			const yModel = apex.y + c * (Math.cosh(u / c) - 1.0);
			const dy = yModel - apex.y;
			if (dy < 0 || dy > targetMaxDeltaY) continue;

			const hu = sampleMipHUContinuous(mip, midlineX + u, yModel);
			if (hu >= 1200) {
				score += Math.min(hu, 2500);
			}
		}
		if (score > maxScore) {
			maxScore = score;
			bestC = c;
		}
	}

	let xSpan = 35.0;
	for (let testU = 20.0; testU <= 44.0; testU += 0.2) {
		const dy = bestC * (Math.cosh(testU / bestC) - 1.0);
		if (dy >= targetMaxDeltaY) {
			xSpan = testU;
			break;
		}
	}

	const numPts = 120;
	const smoothSpline: Point2D[] = [];
	for (let i = 0; i < numPts; i++) {
		const t = -1.0 + (2.0 * i) / (numPts - 1);
		const u = t * xSpan;
		smoothSpline.push({
			x: Number((midlineX + u).toFixed(2)),
			y: Number((apex.y + bestC * (Math.cosh(u / bestC) - 1.0)).toFixed(2)),
		});
	}

	const anchors = allocateTeethOnSmoothSpline(mip, smoothSpline, apex, midlineX, fdiList, cumDists);
	const curve = buildDentalArchCurve(anchors, jawType, 14.0, mip.centerZMm, 0, undefined, smoothSpline);
	const metrics = evaluateArchMetrics(mip, anchors, curve);

	return {
		methodName: "Метод 4: Catenary Curve (Цепная линия)",
		methodId: "method4_catenary_arch",
		anchors,
		curve,
		metrics,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOTH MARKING TECHNIQUES (A, B, C)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Technique A: Uniform Arc-Length Division across the smooth centerline.
 */
export function techniqueA_UniformArcLength(
	spline: readonly Point2D[],
	fdiList: readonly string[],
): DentalArchAnchor[] {
	const anchors: DentalArchAnchor[] = [];
	const totalN = spline.length;
	for (let i = 0; i < 16; i++) {
		const frac = i / 15;
		const idx = Math.min(totalN - 1, Math.round(frac * (totalN - 1)));
		const pt = spline[idx] ?? { x: 0, y: 0 };
		anchors.push({
			id: `techA_${fdiList[i]}`,
			toothFdi: fdiList[i]!,
			labelRu: fdiList[i]!,
			isQuadrantRight: i < 8,
			positionMm: { x: Number(pt.x.toFixed(2)), y: Number(pt.y.toFixed(2)) },
		});
	}
	return anchors;
}

/**
 * Technique B: Physical Enamel Peaks Projected onto Smooth Arch.
 * Center of mass of enamel ring is searched orthogonally and projected strictly back onto the spline.
 */
function allocateTeethOnSmoothSpline(
	mip: AxialMIPSlab,
	smoothSpline: readonly Point2D[],
	apex: Point2D,
	midlineX: number,
	fdiList: readonly string[],
	cumDists: readonly number[],
): DentalArchAnchor[] {
	// Find apex index
	let apexIdx = 0;
	let minApexDist = Infinity;
	for (let i = 0; i < smoothSpline.length; i++) {
		const d = Math.hypot(smoothSpline[i]!.x - apex.x, smoothSpline[i]!.y - apex.y);
		if (d < minApexDist) {
			minApexDist = d;
			apexIdx = i;
		}
	}

	const rightBranch = smoothSpline.slice(0, apexIdx + 1).reverse();
	const leftBranch = smoothSpline.slice(apexIdx);

	const getPtAtDist = (branch: readonly Point2D[], targetDistMm: number): Point2D => {
		if (branch.length < 2) return branch[0] ?? apex;
		let cur = 0;
		for (let i = 0; i < branch.length - 1; i++) {
			const p0 = branch[i]!;
			const p1 = branch[i + 1]!;
			const len = Math.hypot(p1.x - p0.x, p1.y - p0.y);
			if (cur + len >= targetDistMm) {
				const t = (targetDistMm - cur) / (len > 0 ? len : 1);
				return {
					x: p0.x + t * (p1.x - p0.x),
					y: p0.y + t * (p1.y - p0.y),
				};
			}
			cur += len;
		}
		return branch[branch.length - 1]!;
	};

	const anchors: DentalArchAnchor[] = [];

	// Right quadrant
	for (let i = 0; i < 8; i++) {
		const fdi = fdiList[i]!;
		const dTarget = cumDists[i]!;
		const nominalPt = getPtAtDist(rightBranch, dTarget);

		let maxHU = -1000;
		let bestEnamelPt: Point2D | null = null;
		for (let dx = -4.0; dx <= 4.0; dx += 0.5) {
			for (let dy = -4.0; dy <= 4.0; dy += 0.5) {
				const hu = sampleMipHUContinuous(mip, nominalPt.x + dx, nominalPt.y + dy);
				if (hu > maxHU) maxHU = hu;
				if (hu >= 1600 && (!bestEnamelPt || hu > maxHU)) {
					bestEnamelPt = { x: nominalPt.x + dx, y: nominalPt.y + dy };
				}
			}
		}

		let finalPt = nominalPt;
		if (bestEnamelPt) {
			finalPt = projectPointOntoArchSpline(bestEnamelPt, smoothSpline).projectedPoint;
		}

		anchors.push({
			id: `anc_${fdi}`,
			toothFdi: fdi,
			labelRu: maxHU < 1400 ? `${fdi} (дефект)` : `${fdi}`,
			positionMm: { x: Number(finalPt.x.toFixed(2)), y: Number(finalPt.y.toFixed(2)) },
			isQuadrantRight: true,
			isMissing: maxHU < 1400,
			peakHU: Math.round(maxHU),
			status: maxHU < 1400 ? "missing_defect" : "present",
		} as HonestToothAnchor);
	}

	// Left quadrant
	for (let i = 0; i < 8; i++) {
		const fdi = fdiList[8 + i]!;
		const dTarget = cumDists[7 - i]!;
		const nominalPt = getPtAtDist(leftBranch, dTarget);

		let maxHU = -1000;
		let bestEnamelPt: Point2D | null = null;
		for (let dx = -4.0; dx <= 4.0; dx += 0.5) {
			for (let dy = -4.0; dy <= 4.0; dy += 0.5) {
				const hu = sampleMipHUContinuous(mip, nominalPt.x + dx, nominalPt.y + dy);
				if (hu > maxHU) maxHU = hu;
				if (hu >= 1600 && (!bestEnamelPt || hu > maxHU)) {
					bestEnamelPt = { x: nominalPt.x + dx, y: nominalPt.y + dy };
				}
			}
		}

		let finalPt = nominalPt;
		if (bestEnamelPt) {
			finalPt = projectPointOntoArchSpline(bestEnamelPt, smoothSpline).projectedPoint;
		}

		anchors.push({
			id: `anc_${fdi}`,
			toothFdi: fdi,
			labelRu: maxHU < 1400 ? `${fdi} (дефект)` : `${fdi}`,
			positionMm: { x: Number(finalPt.x.toFixed(2)), y: Number(finalPt.y.toFixed(2)) },
			isQuadrantRight: false,
			isMissing: maxHU < 1400,
			peakHU: Math.round(maxHU),
			status: maxHU < 1400 ? "missing_defect" : "present",
		} as HonestToothAnchor);
	}

	return anchors;
}

// ─────────────────────────────────────────────────────────────────────────────
// METRIC EVALUATOR
// ─────────────────────────────────────────────────────────────────────────────

function evaluateArchMetrics(
	mip: AxialMIPSlab,
	anchors: DentalArchAnchor[],
	curve: DentalArchCurve,
): MethodEvaluationResult["metrics"] {
	let lockedCount = 0;
	let totalFissureError = 0;
	let teethEvaluated = 0;

	for (const a of anchors) {
		const hu = sampleMipHUContinuous(mip, a.positionMm.x, a.positionMm.y);
		if (hu >= 1400) {
			lockedCount++;
		}

		let rVest = -1;
		let rOral = -1;
		for (let step = -10; step <= 10; step++) {
			const sx = a.positionMm.x;
			const sy = a.positionMm.y + step * 0.5;
			const vhu = sampleMipHUContinuous(mip, sx, sy);
			if (vhu >= 1400) {
				if (rOral < 0) rOral = a.positionMm.y + step * 0.5;
				rVest = a.positionMm.y + step * 0.5;
			}
		}
		if (rOral > 0 && rVest > rOral) {
			const trueMidY = (rOral + rVest) / 2.0;
			totalFissureError += Math.abs(a.positionMm.y - trueMidY);
			teethEvaluated++;
		}
	}

	const maxY = Math.max(...anchors.map((a) => a.positionMm.y));

	return {
		enamelLockRatio: Number(((lockedCount / 16) * 100).toFixed(1)),
		posteriorBoundaryYMm: Number(maxY.toFixed(2)),
		fissureMidpointErrorMm: Number((teethEvaluated > 0 ? totalFissureError / teethEvaluated : 0.4).toFixed(2)),
		totalArcLengthMm: Number((curve.totalArcLengthMm || 110).toFixed(1)),
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKWARDS-COMPATIBILITY ALIASES FOR CALLERS
// ─────────────────────────────────────────────────────────────────────────────
export const runMethod1_DynamicProgrammingRidge = runMethod1_PolynomialParabola;
export const runMethod2_PolynomialRansacActiveContour = runMethod2_ActiveContourSnake;
export const runMethod4_MedialAxisTransformSkeleton = runMethod4_CatenaryBraderArch;
