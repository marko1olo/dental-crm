import type { Point2D } from "../cbctCaliperNerveMath";

export interface ArchVectorNode {
	readonly point: Point2D;
	readonly tangent: Point2D;
	readonly normal: Point2D;
	readonly distanceAlongArchMm: number;
	readonly curvature: number;
}

/**
 * Computes tangents, unit normal vectors, and Frenet-Serret curvature along the dental spline curve.
 * Zero-division, Infinity, and NaN safe under coinciding or degenerate anchors.
 */
export function calculateArchTangentsAndNormals(spline: readonly Point2D[]): ArchVectorNode[] {
	if (!spline || spline.length === 0) return [];

	const validSpline: Point2D[] = [];
	for (const pt of spline) {
		if (pt && Number.isFinite(pt.x) && Number.isFinite(pt.y)) validSpline.push(pt);
	}
	if (validSpline.length === 0) return [];

	const rawNodes: Array<{ point: Point2D; tangent: Point2D; normal: Point2D; distanceAlongArchMm: number }> = [];
	let accumulatedDist = 0;
	let lastValidTangent: Point2D | null = null;

	for (let i = 0; i < validSpline.length; i++) {
		const cur = validSpline[i]!;
		let tx = 0;
		let ty = 0;

		if (validSpline.length === 1) {
			tx = 1.0; ty = 0.0;
		} else if (i === 0) {
			const next = validSpline[1]!;
			tx = next.x - cur.x; ty = next.y - cur.y;
		} else if (i === validSpline.length - 1) {
			const prev = validSpline[i - 1]!;
			tx = cur.x - prev.x; ty = cur.y - prev.y;
			const stepDist = Math.hypot(tx, ty);
			if (Number.isFinite(stepDist)) accumulatedDist += stepDist;
		} else {
			const prev = validSpline[i - 1]!;
			const next = validSpline[i + 1]!;
			tx = next.x - prev.x; ty = next.y - prev.y;
			const stepDist = Math.hypot(cur.x - prev.x, cur.y - prev.y);
			if (Number.isFinite(stepDist)) accumulatedDist += stepDist;
		}

		let len = Math.hypot(tx, ty);
		if (!Number.isFinite(len) || len < 1e-6) {
			if (i < validSpline.length - 1) {
				const fwdX = validSpline[i + 1]!.x - cur.x;
				const fwdY = validSpline[i + 1]!.y - cur.y;
				const fwdLen = Math.hypot(fwdX, fwdY);
				if (Number.isFinite(fwdLen) && fwdLen >= 1e-6) { tx = fwdX; ty = fwdY; len = fwdLen; }
			}
			if (len < 1e-6 && i > 0) {
				const bwdX = cur.x - validSpline[i - 1]!.x;
				const bwdY = cur.y - validSpline[i - 1]!.y;
				const bwdLen = Math.hypot(bwdX, bwdY);
				if (Number.isFinite(bwdLen) && bwdLen >= 1e-6) { tx = bwdX; ty = bwdY; len = bwdLen; }
			}
			if (len < 1e-6 && lastValidTangent) { tx = lastValidTangent.x; ty = lastValidTangent.y; len = 1.0; }
			if (len < 1e-6 || !Number.isFinite(len)) { tx = 1.0; ty = 0.0; len = 1.0; }
		}

		const unitTx = tx / len;
		const unitTy = ty / len;
		const normTangent: Point2D = { x: unitTx, y: unitTy };
		const normNormal: Point2D = { x: -unitTy, y: unitTx };
		lastValidTangent = normTangent;

		rawNodes.push({ point: cur, tangent: normTangent, normal: normNormal, distanceAlongArchMm: Number(accumulatedDist.toFixed(2)) });
	}

	const nNodes = rawNodes.length;
	const results: ArchVectorNode[] = [];

	for (let i = 0; i < nNodes; i++) {
		const cur = rawNodes[i]!;
		if (nNodes < 2) { results.push({ ...cur, curvature: 0.0 }); continue; }

		let dTx = 0; let dTy = 0; let ds = 1.0;
		if (i === 0) {
			const next = rawNodes[1]!;
			dTx = next.tangent.x - cur.tangent.x; dTy = next.tangent.y - cur.tangent.y;
			ds = Math.max(1e-4, next.distanceAlongArchMm - cur.distanceAlongArchMm);
		} else if (i === nNodes - 1) {
			const prev = rawNodes[i - 1]!;
			dTx = cur.tangent.x - prev.tangent.x; dTy = cur.tangent.y - prev.tangent.y;
			ds = Math.max(1e-4, cur.distanceAlongArchMm - prev.distanceAlongArchMm);
		} else {
			const prev = rawNodes[i - 1]!; const next = rawNodes[i + 1]!;
			dTx = next.tangent.x - prev.tangent.x; dTy = next.tangent.y - prev.tangent.y;
			ds = Math.max(1e-4, next.distanceAlongArchMm - prev.distanceAlongArchMm);
		}

		const dTdsX = dTx / ds; const dTdsY = dTy / ds;
		const kappa = Math.abs(dTdsX * cur.normal.x + dTdsY * cur.normal.y);
		const safeCurvature = Number.isFinite(kappa) ? Number(kappa.toFixed(4)) : 0.0;
		results.push({ point: cur.point, tangent: cur.tangent, normal: cur.normal, distanceAlongArchMm: cur.distanceAlongArchMm, curvature: safeCurvature });
	}

	return results;
}
