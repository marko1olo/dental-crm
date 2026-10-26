/**
 * crossSectionFrame.ts — Ортонормированный базис кросс-секционного среза (Мандат 8b <= 120 строк).
 */

import type { Vec3, CrossSectionPlaneSpec, CrossSectionOrthonormalFrame } from "./types";
import { dot3 } from "./vectorMath";

export function buildCrossSectionFrame(spec: CrossSectionPlaneSpec): CrossSectionOrthonormalFrame {
	const px = spec.point[0];
	const py = spec.point[1];
	const zMid = (spec.zMin + spec.zMax) * 0.5;

	const nx = spec.normal[0];
	const ny = spec.normal[1];
	const tx = spec.tangent[0];
	const ty = spec.tangent[1];

	const MAX_TILT = 30;
	const tiltDeg = Math.max(-MAX_TILT, Math.min(MAX_TILT, spec.tiltDeg ?? 0));
	const tiltRad = (tiltDeg * Math.PI) / 180;

	const sinT = Math.sin(tiltRad);
	const cosT = Math.cos(tiltRad);

	const origin: Vec3 = [px, py, zMid];
	const eU: Vec3 = [nx, ny, 0];
	const eV: Vec3 = [tx * sinT, ty * sinT, cosT];
	const normal: Vec3 = [ny * cosT, -nx * cosT, -sinT];
	const d = dot3(normal, origin);

	return { origin, eU, eV, normal, d };
}
