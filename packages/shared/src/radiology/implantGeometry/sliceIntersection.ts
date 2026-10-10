/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT 3D IMPLANT GEOMETRY — SLICE INTERSECTION & GUIDES (LAYER 2)
 * ═══════════════════════════════════════════════════════════════════════════
 * Analytical intersection of 3D implant geometry with resection planes/slabs:
 * - Longitudinal (0° parallel), transverse (90° perpendicular), and oblique (45°)
 * - Resection planar strips, drill sleeves, and surgical drill segments
 * - 2D local plane coordinates and 3D world coordinates
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type {
	Vec3,
	PlaneFrame,
	ImplantBody,
	SleeveSpec,
	VirtualImplantParams,
	ImplantSliceContour,
} from "./types.js";
import { dot3, cross3, normalize3 } from "./mathVectors.js";
import { radiusProfile } from "./meshGenerator.js";

export function projectToPlane(p: Vec3, frame: PlaneFrame): [number, number, number] {
	const rel: Vec3 = [p[0] - frame.origin[0], p[1] - frame.origin[1], p[2] - frame.origin[2]];
	const n = cross3(frame.eU, frame.eV);
	return [dot3(rel, frame.eU), dot3(rel, frame.eV), dot3(rel, n)];
}

export function cylinderPlaneStrip(
	body: ImplantBody,
	frame: PlaneFrame,
	radiusFn: (t01: number) => number = () => 1,
	samples = 24,
): [number, number][] | null {
	const n = cross3(frame.eU, frame.eV);
	const R = body.diameter / 2;
	const au = dot3(body.axis, frame.eU);
	const av = dot3(body.axis, frame.eV);
	const len2d = Math.hypot(au, av);
	if (len2d < 1e-4) return null;
	const pu = -av / len2d;
	const pv = au / len2d;

	const rel0: Vec3 = [body.entry[0] - frame.origin[0], body.entry[1] - frame.origin[1], body.entry[2] - frame.origin[2]];
	const u0 = dot3(rel0, frame.eU);
	const v0 = dot3(rel0, frame.eV);
	const w0 = dot3(rel0, n);
	const dw = dot3(body.axis, n);

	const left: [number, number][] = [];
	const right: [number, number][] = [];
	let anyVisible = false;

	for (let i = 0; i <= samples; i++) {
		const t01 = i / samples;
		const t = t01 * body.length;
		const r = R * radiusFn(t01);
		const w = w0 + dw * t;
		const hwSq = r * r - w * w;
		const hw = hwSq > 0 ? Math.sqrt(hwSq) : 0;
		if (hw > 0.01) anyVisible = true;
		const u = u0 + au * t;
		const v = v0 + av * t;
		left.push([u - hw * pu, v - hw * pv]);
		right.push([u + hw * pu, v + hw * pv]);
	}

	if (!anyVisible) return null;
	return [...left, ...right.reverse()];
}

export function implantPlaneStrip(body: ImplantBody, frame: PlaneFrame, samples = 24): [number, number][] | null {
	return cylinderPlaneStrip(body, frame, radiusProfile, samples);
}

export function sleeveBody(implant: ImplantBody, sleeve: SleeveSpec): ImplantBody {
	const back = sleeve.offset + sleeve.height;
	const top: Vec3 = [implant.entry[0] - implant.axis[0] * back, implant.entry[1] - implant.axis[1] * back, implant.entry[2] - implant.axis[2] * back];
	return { entry: top, axis: implant.axis, diameter: sleeve.diameter, length: sleeve.height };
}

export function drillSegment(implant: ImplantBody, sleeve: SleeveSpec, drillLength: number): [Vec3, Vec3] {
	const back = sleeve.offset + sleeve.height;
	const start: Vec3 = [implant.entry[0] - implant.axis[0] * back, implant.entry[1] - implant.axis[1] * back, implant.entry[2] - implant.axis[2] * back];
	const end: Vec3 = [implant.entry[0] + implant.axis[0] * drillLength, implant.entry[1] + implant.axis[1] * drillLength, implant.entry[2] + implant.axis[2] * drillLength];
	return [start, end];
}

/**
 * Analytical intersection of an implant cylinder/taper body with an arbitrary 2D slice plane or slab.
 *
 * Mathematically derived and adapted from DenCT (Dental-CBCT-Viewer):
 * - Evaluates 0° (parallel/longitudinal), 45° (oblique/elliptical), and 90° (perpendicular/circular) cross sections
 * - Correctly accounts for slice thickness (slab projection in MIP/average CPR viewing)
 * - Returns 2D plane local coordinates [u, v] and 3D world coordinates [x, y, z] for direct canvas/mesh overlay
 * - Returns null when the implant does not intersect the slice plane within threshold.
 *
 * 100% pure TypeScript, zero DOM/VTK/Three.js dependencies.
 */
export function computeImplantSliceIntersection(
	implant: VirtualImplantParams,
	planeOrigin: Vec3,
	planeNormal: Vec3,
	sliceThickness = 0,
): ImplantSliceContour | null {
	const diameter = implant.diameter;
	const length = implant.length;
	if (!Number.isFinite(diameter) || diameter <= 0) return null;
	if (!Number.isFinite(length) || length <= 0) return null;

	const normLen = Math.hypot(planeNormal[0], planeNormal[1], planeNormal[2]);
	if (normLen < 1e-9) return null;
	const n: Vec3 = [planeNormal[0] / normLen, planeNormal[1] / normLen, planeNormal[2] / normLen];

	const axisLen = Math.hypot(implant.axis[0], implant.axis[1], implant.axis[2]);
	if (axisLen < 1e-9) return null;
	const axis: Vec3 = [implant.axis[0] / axisLen, implant.axis[1] / axisLen, implant.axis[2] / axisLen];

	// Canonical right-handed orthonormal basis (eU, eV, n) such that eU x eV = n
	let eU: Vec3;
	if (Math.abs(n[0]) < 0.8 && Math.abs(n[1]) < 0.8) {
		eU = normalize3(cross3([0, 1, 0], n));
	} else {
		eU = normalize3(cross3(n, [0, 0, 1]));
	}
	const eV = normalize3(cross3(n, eU));
	const planeFrame: PlaneFrame = { origin: planeOrigin, eU, eV };

	const rel0: Vec3 = [
		implant.entry[0] - planeOrigin[0],
		implant.entry[1] - planeOrigin[1],
		implant.entry[2] - planeOrigin[2],
	];
	const u0 = dot3(rel0, eU);
	const v0 = dot3(rel0, eV);
	const w0 = dot3(rel0, n);

	const au = dot3(axis, eU);
	const av = dot3(axis, eV);
	const dw = dot3(axis, n);
	const len2d = Math.hypot(au, av);

	const radiusFn = implant.radiusFn ?? radiusProfile;
	const R = diameter / 2;
	const slabHalf = Math.max(0, sliceThickness) / 2;

	// Case 1: Implant axis perpendicular or nearly perpendicular to slice plane (len2d < 1e-4)
	if (len2d < 1e-4) {
		const sign = dw >= 0 ? 1 : -1;
		const effectiveDw = Math.abs(dw) > 1e-6 ? dw : sign * 1e-6;

		// The range of t where the cylinder body reaches [-slabHalf, +slabHalf]
		const t1 = (-slabHalf - w0) / effectiveDw;
		const t2 = (slabHalf - w0) / effectiveDw;
		const tMin = Math.min(t1, t2);
		const tMax = Math.max(t1, t2);

		const tStart = Math.max(0, tMin);
		const tEnd = Math.min(length, tMax);
		if (tStart > tEnd + 1e-4) return null;

		const tCut = Math.max(0, Math.min(length, -w0 / effectiveDw));
		const t01 = tCut / length;
		const rCut = R * radiusFn(t01);
		const d = Math.max(0, Math.abs(w0 + effectiveDw * tCut) - slabHalf);
		const hwSq = rCut * rCut - d * d;
		if (hwSq <= 1e-6) return null;
		const rEff = Math.sqrt(hwSq);
		if (rEff < 0.01) return null;

		const uC = u0 + au * tCut;
		const vC = v0 + av * tCut;
		const points2D: [number, number][] = [];
		const points3D: Vec3[] = [];
		const circleSteps = 32;

		for (let k = 0; k < circleSteps; k++) {
			const theta = (2 * Math.PI * k) / circleSteps;
			const pu = uC + rEff * Math.cos(theta);
			const pv = vC + rEff * Math.sin(theta);
			points2D.push([pu, pv]);
			points3D.push([
				planeOrigin[0] + pu * eU[0] + pv * eV[0],
				planeOrigin[1] + pu * eU[1] + pv * eV[1],
				planeOrigin[2] + pu * eU[2] + pv * eV[2],
			]);
		}

		const center3D: Vec3 = [
			planeOrigin[0] + uC * eU[0] + vC * eV[0],
			planeOrigin[1] + uC * eU[1] + vC * eV[1],
			planeOrigin[2] + uC * eU[2] + vC * eV[2],
		];

		return {
			points2D,
			points3D,
			center3D,
			planeFrame,
			isVisible: true,
			maxSpanMm: rEff * 2,
			averageRadiusMm: rEff,
		};
	}

	// Case 2: Oblique or parallel intersection (len2d >= 1e-4)
	const pu = -av / len2d;
	const pv = au / len2d;
	const uAxis = au / len2d;
	const vAxis = av / len2d;

	// Bounding t interval along implant axis where intersection with slab is mathematically possible
	let tLo = 0;
	let tHi = length;

	if (Math.abs(dw) > 1e-5) {
		const boundR = R * len2d;
		const tA = (-boundR - slabHalf - w0) / dw;
		const tB = (boundR + slabHalf - w0) / dw;
		const tMin = Math.min(tA, tB);
		const tMax = Math.max(tA, tB);
		tLo = Math.max(0, tMin);
		tHi = Math.min(length, tMax);
		if (tLo > tHi + 1e-4) return null;
	} else {
		// Parallel to plane: check if distance to plane exceeds radius + slabHalf
		const distToPlane = Math.abs(w0);
		if (distToPlane > R + slabHalf) return null;
	}

	const samples = 32;
	const left: [number, number][] = [];
	const right: [number, number][] = [];
	let maxHw = 0;

	for (let i = 0; i <= samples; i++) {
		const t = tLo + (i / samples) * (tHi - tLo);
		const t01 = Math.max(0, Math.min(1, t / length));
		const r = R * radiusFn(t01);
		const w = w0 + dw * t;
		const d = slabHalf > 0 ? Math.max(0, Math.abs(w) - slabHalf) / len2d : Math.abs(w) / len2d;
		const hwSq = r * r - d * d;
		const hw = hwSq > 0 ? Math.sqrt(hwSq) : 0;
		if (hw > maxHw) maxHw = hw;

		// Exact in-plane position along projected axis at parameter t:
		const shift = (w * dw) / len2d;
		const u = u0 + au * t + shift * uAxis;
		const v = v0 + av * t + shift * vAxis;
		left.push([u - hw * pu, v - hw * pv]);
		right.push([u + hw * pu, v + hw * pv]);
	}

	if (maxHw < 0.005) return null;

	const points2D: [number, number][] = [...left, ...right.reverse()];
	const points3D: Vec3[] = points2D.map(([u, v]) => [
		planeOrigin[0] + u * eU[0] + v * eV[0],
		planeOrigin[1] + u * eU[1] + v * eV[1],
		planeOrigin[2] + u * eU[2] + v * eV[2],
	]);

	// Compute center3D as centroid of points3D
	let sumX = 0;
	let sumY = 0;
	let sumZ = 0;
	for (const pt of points3D) {
		sumX += pt[0];
		sumY += pt[1];
		sumZ += pt[2];
	}
	const count = points3D.length;
	const center3D: Vec3 = [sumX / count, sumY / count, sumZ / count];

	// Compute maxSpanMm (maximum pair distance) and averageRadiusMm
	let maxSpanSq = 0;
	let sumRadius = 0;
	for (let i = 0; i < count; i++) {
		const p = points3D[i]!;
		const distToCenter = Math.hypot(p[0] - center3D[0], p[1] - center3D[1], p[2] - center3D[2]);
		sumRadius += distToCenter;
		for (let j = i + 1; j < count; j++) {
			const q = points3D[j]!;
			const dSq = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
			if (dSq > maxSpanSq) maxSpanSq = dSq;
		}
	}

	return {
		points2D,
		points3D,
		center3D,
		planeFrame,
		isVisible: true,
		maxSpanMm: Math.sqrt(maxSpanSq),
		averageRadiusMm: sumRadius / count,
	};
}
