/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT 3D IMPLANT GEOMETRY — ARCH FRAME & CLINICAL AXIS (LAYER 2)
 * ═══════════════════════════════════════════════════════════════════════════
 * Reverse-engineered & mathematically adapted from DenCT:
 * - Arch frame extraction along dental arch splines (Frenet frame / tangent & normal)
 * - Buccolingual (BL) and Mesiodistal (MD) clinical implant tilt projection
 * - 3D world axis segment resolution with entry and apex coordinates
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { buildUniformCurve, type Point2, type Vec3 } from "../cprMath.js";
import type { ArchFrame } from "./types.js";

const curveCache = new WeakMap<Point2[], ReturnType<typeof buildUniformCurve>>();

function getCurve(controlPoints: Point2[]): ReturnType<typeof buildUniformCurve> {
	let c = curveCache.get(controlPoints);
	if (!c) {
		c = buildUniformCurve(controlPoints, 500);
		curveCache.set(controlPoints, c);
	}
	return c;
}

export function archFrameAt(controlPoints: Point2[], s: number): ArchFrame | null {
	if (controlPoints.length < 2) return null;
	const { curve, normals } = getCurve(controlPoints);
	if (curve.length < 2) return null;
	const idx = Math.round(Math.max(0, Math.min(1, s)) * (curve.length - 1));
	const normal = normals[idx];
	if (!normal) return null;
	return { s: idx / (curve.length - 1), point: curve[idx]!, normal, tangent: [normal[1], -normal[0]] };
}

export function nearestArchFrame(controlPoints: Point2[], p: Point2): ArchFrame | null {
	if (controlPoints.length < 2) return null;
	const { curve, normals } = getCurve(controlPoints);
	if (curve.length < 2) return null;
	let bestIdx = 0;
	let bestD2 = Number.POSITIVE_INFINITY;
	for (let i = 0; i < curve.length; i++) {
		const pt = curve[i]!;
		const d2 = (pt[0] - p[0]) ** 2 + (pt[1] - p[1]) ** 2;
		if (d2 < bestD2) { bestD2 = d2; bestIdx = i; }
	}
	const normal = normals[bestIdx];
	if (!normal) return null;
	return { s: bestIdx / (curve.length - 1), point: curve[bestIdx]!, normal, tangent: [normal[1], -normal[0]] };
}

export function implantAxis(frame: ArchFrame, angleBLDeg: number, angleMDDeg: number): Vec3 {
	const bl = (angleBLDeg * Math.PI) / 180;
	const md = (angleMDDeg * Math.PI) / 180;
	const sBL = Math.sin(bl);
	const cBL = Math.cos(bl);
	const sMD = Math.sin(md);
	const cMD = Math.cos(md);
	const n = sBL;
	const t = cBL * sMD;
	const z = -cBL * cMD;
	return [n * frame.normal[0] + t * frame.tangent[0], n * frame.normal[1] + t * frame.tangent[1], z];
}

export function implantWorldAxis(
	controlPoints: Point2[],
	imp: { position: Vec3; angleBLDeg: number; angleMDDeg: number; length: number },
): { entry: Vec3; apex: Vec3; axis: Vec3 } | null {
	const af = nearestArchFrame(controlPoints, [imp.position[0], imp.position[1]]);
	if (!af) return null;
	const axis = implantAxis(af, imp.angleBLDeg, imp.angleMDDeg);
	const apex: Vec3 = [imp.position[0] + axis[0] * imp.length, imp.position[1] + axis[1] * imp.length, imp.position[2] + axis[2] * imp.length];
	return { entry: imp.position, apex, axis };
}
