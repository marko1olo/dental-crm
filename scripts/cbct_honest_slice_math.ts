/**
 * cbct_honest_slice_math.ts
 *
 * Mathematical core for clean analytical dental arch parabola fitting,
 * high-definition OPG CPR reconstruction with 3x3 Laplacian Unsharp Masking,
 * and physical perpendicular transverse cross-sections with real anatomical calipers.
 * Governed by Mandate 8b (file length <= 800 lines).
 */

import { sampleVoxelTrilinearHU, type CbctVoxelVolume } from "../apps/web/src/components/radiology/cbctMprMath";

export interface DentalArchPoint {
	readonly x: number;
	readonly y: number;
	readonly tX: number;
	readonly tY: number;
	readonly nX: number;
	readonly nY: number;
	readonly sMm: number;
}

export interface DentalArchModel {
	readonly xApex: number;
	readonly yApex: number;
	readonly thetaDeg: number;
	readonly a: number;
	readonly aL?: number;
	readonly aR?: number;
	readonly b: number;
	readonly zCenterMm: number;
	readonly points: ReadonlyArray<DentalArchPoint>;
	readonly totalLengthMm: number;
	readonly beads?: ReadonlyArray<{ fdi: string; x: number; y: number; label: string; sMm: number }>;
	readonly isAdaptiveEnamelArch?: boolean;
	readonly meanEnamelHU?: number;
}

export type ParabolaModel = DentalArchModel;

/**
 * detectAdaptiveEnamelArch
 * 
 * Analytically detects enamel beads (HU >= 1200..3000) on the 3D MIP occlusal slab
 * across angular sectors, filters low-density gaps, and constructs a C2 Catmull-Rom spline
 * that runs strictly through the dental fissures without flaring outward into the cheeks.
 */
export function detectAdaptiveEnamelArch(
	volume: CbctVoxelVolume,
	zCenterMm = -4.0,
	zHalfSlabMm = 3.0,
): DentalArchModel {
	const sp = volume.spacingMm.x || 0.25;
	const origin = volume.originMm;
	const zMin = zCenterMm - zHalfSlabMm;
	const zMax = zCenterMm + zHalfSlabMm;

	// Ray origin in lingual oral floor
	const rayOrigin = { x: 0, y: -18 };
	const rawBeads: Array<{ deg: number; pt: { x: number; y: number }; maxHU: number }> = [];

	for (let deg = -200; deg <= 20; deg += 10) {
		const rad = (deg * Math.PI) / 180;
		const dirX = Math.cos(rad);
		const dirY = Math.sin(rad);

		let bestDist = 0;
		let maxPeakHU = -1000;

		for (let r = 14.0; r <= 48.0; r += 0.5) {
			const x = rayOrigin.x + r * dirX;
			const y = rayOrigin.y + r * dirY;

			let mipHU = -1000;
			for (let z = zMin; z <= zMax; z += 1.0) {
				const vx = (x - origin.x) / sp;
				const vy = (y - origin.y) / sp;
				const vz = (z - origin.z) / sp;
				const hu = sampleVoxelTrilinearHU(vx, vy, vz, volume);
				if (hu > mipHU) mipHU = hu;
			}

			if (mipHU > maxPeakHU) {
				maxPeakHU = mipHU;
				bestDist = r;
			}
		}

		rawBeads.push({
			deg,
			pt: { x: Number((rayOrigin.x + bestDist * dirX).toFixed(2)), y: Number((rayOrigin.y + bestDist * dirY).toFixed(2)) },
			maxHU: maxPeakHU,
		});
	}

	// Filter beads with interpolation across edentulous or low-density gaps
	const cleanBeads: Array<{ x: number; y: number }> = [];
	for (let i = 0; i < rawBeads.length; i++) {
		const b = rawBeads[i]!;
		if (b.maxHU >= 1000) {
			cleanBeads.push(b.pt);
		} else {
			let prev: { x: number; y: number } | null = null;
			for (let p = i - 1; p >= 0; p--) {
				if (rawBeads[p]!.maxHU >= 1000) { prev = rawBeads[p]!.pt; break; }
			}
			let next: { x: number; y: number } | null = null;
			for (let n = i + 1; n < rawBeads.length; n++) {
				if (rawBeads[n]!.maxHU >= 1000) { next = rawBeads[n]!.pt; break; }
			}
			if (prev && next) {
				cleanBeads.push({
					x: Number((prev.x + 0.5 * (next.x - prev.x)).toFixed(2)),
					y: Number((prev.y + 0.5 * (next.y - prev.y)).toFixed(2)),
				});
			} else if (prev) {
				cleanBeads.push(prev);
			} else if (next) {
				cleanBeads.push(next);
			}
		}
	}

	// Smooth beads slightly to eliminate discrete voxel stepping
	const smoothed: Array<{ x: number; y: number }> = [];
	for (let i = 0; i < cleanBeads.length; i++) {
		if (i === 0 || i === cleanBeads.length - 1) {
			smoothed.push(cleanBeads[i]!);
		} else {
			const p0 = cleanBeads[i - 1]!;
			const p1 = cleanBeads[i]!;
			const p2 = cleanBeads[i + 1]!;
			smoothed.push({
				x: Number((0.2 * p0.x + 0.6 * p1.x + 0.2 * p2.x).toFixed(2)),
				y: Number((0.2 * p0.y + 0.6 * p1.y + 0.2 * p2.y).toFixed(2)),
			});
		}
	}

	// Build C2 continuous Catmull-Rom spline
	const p0 = { x: smoothed[0]!.x + (smoothed[0]!.x - smoothed[1]!.x) * 0.5, y: smoothed[0]!.y + (smoothed[0]!.y - smoothed[1]!.y) * 0.5 };
	const pLast = smoothed[smoothed.length - 1]!;
	const pPrev = smoothed[smoothed.length - 2]!;
	const pEnd = { x: pLast.x + (pLast.x - pPrev.x) * 0.5, y: pLast.y + (pLast.y - pPrev.y) * 0.5 };

	const all = [p0, ...smoothed, pEnd];
	const numSamples = 180;
	const numSegments = all.length - 3;
	const stepsPerSeg = Math.ceil(numSamples / numSegments);

	const splinePoints: DentalArchPoint[] = [];
	let sAcc = 0;
	let prevX = 0, prevY = 0;

	for (let seg = 0; seg < numSegments; seg++) {
		const c0 = all[seg]!;
		const c1 = all[seg + 1]!;
		const c2 = all[seg + 2]!;
		const c3 = all[seg + 3]!;

		const isLast = seg === numSegments - 1;
		const maxStep = isLast ? stepsPerSeg : stepsPerSeg - 1;

		for (let step = 0; step <= maxStep; step++) {
			const t = step / stepsPerSeg;
			const t2 = t * t;
			const t3 = t2 * t;

			const x = 0.5 * (
				(2 * c1.x) +
				(-c0.x + c2.x) * t +
				(2 * c0.x - 5 * c1.x + 4 * c2.x - c3.x) * t2 +
				(-c0.x + 3 * c1.x - 3 * c2.x + c3.x) * t3
			);

			const y = 0.5 * (
				(2 * c1.y) +
				(-c0.y + c2.y) * t +
				(2 * c0.y - 5 * c1.y + 4 * c2.y - c3.y) * t2 +
				(-c0.y + 3 * c1.y - 3 * c2.y + c3.y) * t3
			);

			const dx = 0.5 * (
				(-c0.x + c2.x) +
				2 * (2 * c0.x - 5 * c1.x + 4 * c2.x - c3.x) * t +
				3 * (-c0.x + 3 * c1.x - 3 * c2.x + c3.x) * t2
			);

			const dy = 0.5 * (
				(-c0.y + c2.y) +
				2 * (2 * c0.y - 5 * c1.y + 4 * c2.y - c3.y) * t +
				3 * (-c0.y + 3 * c1.y - 3 * c2.y + c3.y) * t2
			);

			const len = Math.hypot(dx, dy) || 1;
			const tX = dx / len;
			const tY = dy / len;
			const nX = -tY;
			const nY = tX;

			if (splinePoints.length > 0) sAcc += Math.hypot(x - prevX, y - prevY);
			prevX = x;
			prevY = y;

			splinePoints.push({
				x: Number(x.toFixed(2)),
				y: Number(y.toFixed(2)),
				tX: Number(tX.toFixed(4)),
				tY: Number(tY.toFixed(4)),
				nX: Number(nX.toFixed(4)),
				nY: Number(nY.toFixed(4)),
				sMm: Number(sAcc.toFixed(2)),
			});
		}
	}

	// Mean enamel density check
	let sumHU = 0, count = 0;
	for (const pt of splinePoints) {
		let maxHU = -1000;
		for (let z = zMin; z <= zMax; z += 0.5) {
			const vx = (pt.x - origin.x) / sp;
			const vy = (pt.y - origin.y) / sp;
			const vz = (z - origin.z) / sp;
			const hu = sampleVoxelTrilinearHU(vx, vy, vz, volume);
			if (hu > maxHU) maxHU = hu;
		}
		if (maxHU > 500) sumHU += maxHU;
		count++;
	}
	const meanEnamelHU = count > 0 ? Math.round(sumHU / count) : 1200;

	// Assign FDI beads along arc length
	const fdiList = ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"];
	const beadsWithS: Array<{ fdi: string; x: number; y: number; label: string; sMm: number }> = [];

	for (let i = 0; i < fdiList.length; i++) {
		const frac = i / (fdiList.length - 1);
		const targetS = frac * sAcc;
		let closestPt = splinePoints[0]!;
		let bestDist = Infinity;
		for (const pt of splinePoints) {
			const d = Math.abs(pt.sMm - targetS);
			if (d < bestDist) {
				bestDist = d;
				closestPt = pt;
			}
		}
		beadsWithS.push({
			fdi: fdiList[i]!,
			x: closestPt.x,
			y: closestPt.y,
			label: `#${fdiList[i]}`,
			sMm: closestPt.sMm,
		});
	}

	const apexPt = splinePoints[Math.round(splinePoints.length / 2)]!;

	return {
		xApex: apexPt.x,
		yApex: apexPt.y,
		thetaDeg: 0,
		a: 0.030,
		b: 0,
		zCenterMm,
		points: splinePoints,
		totalLengthMm: Number(sAcc.toFixed(1)),
		beads: beadsWithS,
		isAdaptiveEnamelArch: true,
		meanEnamelHU,
	};
}

export function fitAnatomicalParabola(
	volume: CbctVoxelVolume,
	zCenterMm: number,
	zHalfSlabMm: number,
	_defaultApexY?: number,
	_maxSpanU?: number,
): ParabolaModel {
	return detectAdaptiveEnamelArch(volume, zCenterMm, zHalfSlabMm);
}

export interface PanoramaImage {
	readonly widthPx: number;
	readonly heightPx: number;
	readonly base64: string;
	readonly toothPositionsOnPano: Array<{ fdi: string; xPx: number; label: string }>;
	readonly focalTroughMm: number;
}

export function reconstructHighDefPanoramicOPG(
	volume: CbctVoxelVolume,
	parabola: ParabolaModel,
	options: {
		readonly pixelSpacingMm?: number;
		readonly widthPx?: number;
		readonly heightPx?: number;
		readonly focalTroughMm?: number;
		readonly verticalHeightMm?: number;
		readonly windowWidth?: number;
		readonly windowLevel?: number;
		readonly unsharpAlpha?: number;
	} = {},
): PanoramaImage {
	const vertHeightMm = options.verticalHeightMm ?? 65.0;
	const spMm = options.pixelSpacingMm ?? 0.15;
	const totalLenMm = parabola.totalLengthMm;

	// Isometric 1:1 aspect ratio: each pixel represents spMm in both arc length and height
	const outW = options.widthPx ?? Math.round(totalLenMm / spMm);
	const outH = options.heightPx ?? Math.round(vertHeightMm / spMm);
	const focalTroughMm = options.focalTroughMm ?? 6.0;
	const halfTrough = focalTroughMm / 2.0;
	const zTopMm = parabola.zCenterMm + vertHeightMm / 2.0;
	const zStepMm = vertHeightMm / outH;

	const sp = volume.spacingMm.x || 0.25;
	const origin = volume.originMm;
	const rawHU = new Float32Array(outW * outH);

	const troughSteps = 15;
	const troughOffsets: number[] = [];
	for (let s = 0; s < troughSteps; s++) {
		troughOffsets.push(-halfTrough + (s / (troughSteps - 1)) * focalTroughMm);
	}

	for (let col = 0; col < outW; col++) {
		const targetS = (col / (outW - 1)) * parabola.totalLengthMm;
		let pt = parabola.points[0]!;
		for (let i = 0; i < parabola.points.length - 1; i++) {
			if (targetS >= parabola.points[i]!.sMm && targetS <= parabola.points[i + 1]!.sMm) {
				const r = (targetS - parabola.points[i]!.sMm) / (parabola.points[i + 1]!.sMm - parabola.points[i]!.sMm || 1);
				pt = {
					x: parabola.points[i]!.x + r * (parabola.points[i + 1]!.x - parabola.points[i]!.x),
					y: parabola.points[i]!.y + r * (parabola.points[i + 1]!.y - parabola.points[i]!.y),
					nX: parabola.points[i]!.nX,
					nY: parabola.points[i]!.nY,
					tX: parabola.points[i]!.tX,
					tY: parabola.points[i]!.tY,
					sMm: targetS,
				};
				break;
			}
		}

		for (let row = 0; row < outH; row++) {
			const zMm = zTopMm - row * zStepMm;
			const vz = (zMm - origin.z) / sp;

			let maxHU = -1000;
			for (const tOffset of troughOffsets) {
				const sx = pt.x + tOffset * pt.nX;
				const sy = pt.y + tOffset * pt.nY;
				const vx = (sx - origin.x) / sp;
				const vy = (sy - origin.y) / sp;
				const hu = sampleVoxelTrilinearHU(vx, vy, vz, volume);
				if (hu > maxHU) maxHU = hu;
			}
			rawHU[row * outW + col] = maxHU;
		}
	}

	const alpha = options.unsharpAlpha ?? 0.16;
	const filteredHU = new Float32Array(outW * outH);

	for (let r = 0; r < outH; r++) {
		for (let c = 0; c < outW; c++) {
			const idx = r * outW + c;
			const center = rawHU[idx]!;

			if (r > 0 && r < outH - 1 && c > 0 && c < outW - 1 && center > -600) {
				const up = rawHU[(r - 1) * outW + c]!;
				const down = rawHU[(r + 1) * outW + c]!;
				const left = rawHU[r * outW + (c - 1)]!;
				const right = rawHU[r * outW + (c + 1)]!;

				if (up > -600 && down > -600 && left > -600 && right > -600) {
					const lap = 4 * center - (up + down + left + right);
					filteredHU[idx] = Math.max(-1000, Math.min(3071, center + alpha * lap));
					continue;
				}
			}
			filteredHU[idx] = center;
		}
	}

	const ww = options.windowWidth ?? 2000;
	const wl = options.windowLevel ?? 450;
	const low = wl - ww / 2;
	const high = wl + ww / 2;
	const rgba = new Uint8ClampedArray(outW * outH * 4);

	for (let i = 0; i < outW * outH; i++) {
		let norm = (filteredHU[i]! - low) / (high - low);
		norm = Math.max(0, Math.min(1, norm));
		const val = Math.round(norm * 255);
		const p = i * 4;
		rgba[p] = val;
		rgba[p + 1] = val;
		rgba[p + 2] = val;
		rgba[p + 3] = 255;
	}

	const fdiList = ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"];
	const toothPositionsOnPano: Array<{ fdi: string; xPx: number; label: string }> = [];

	if (parabola.beads && parabola.beads.length > 0) {
		for (const bead of parabola.beads) {
			const xPx = Math.round((bead.sMm / parabola.totalLengthMm) * outW);
			toothPositionsOnPano.push({
				fdi: bead.fdi,
				xPx: Math.max(10, Math.min(outW - 10, xPx)),
				label: bead.label,
			});
		}
	} else {
		for (let i = 0; i < fdiList.length; i++) {
			const frac = (i + 0.5) / fdiList.length;
			toothPositionsOnPano.push({
				fdi: fdiList[i]!,
				xPx: Math.round(frac * outW),
				label: `#${fdiList[i]}`,
			});
		}
	}

	return {
		widthPx: outW,
		heightPx: outH,
		base64: Buffer.from(rgba.buffer).toString("base64"),
		toothPositionsOnPano,
		focalTroughMm,
	};
}

export interface CrossSectionMeasurement {
	readonly toothFdi: string;
	readonly toothNameRu: string;
	readonly jaw: "mandible" | "maxilla";
	readonly patientName: string;
	readonly widthPx: number;
	readonly heightPx: number;
	readonly pixelSpacingMm: number;
	readonly base64: string;
	readonly crestPointPx: { x: number; y: number };
	readonly anatomicalLimitPointPx: { x: number; y: number };
	readonly availableHeightMm: number;
	readonly widthAt2Mm: number;
	readonly widthAt2MmText: string;
	readonly widthAt6Mm: number;
	readonly widthAt6MmText: string;
	readonly isW6Air?: boolean;
	readonly meanDensityHU: number;
	readonly boneQualityMisch: "D1" | "D2" | "D3" | "D4";
	readonly anatomicalLimitNameRu: string;
	readonly clinicalVerdictRu: string;
	readonly w2LinePx: { left: { x: number; y: number }; right: { x: number; y: number } };
	readonly w6LinePx: { left: { x: number; y: number }; right: { x: number; y: number } };
}

export function extractHonestPhysicalCrossSection(
	volume: CbctVoxelVolume,
	toothFdi: string,
	toothNameRu: string,
	jaw: "mandible" | "maxilla",
	patientName: string,
	centerMm: { x: number; y: number; z: number },
	normal2D: { x: number; y: number },
	options: {
		readonly widthMm?: number;
		readonly heightMm?: number;
		readonly pixelSpacingMm?: number;
		readonly slabThicknessMm?: number;
		readonly windowWidth?: number;
		readonly windowLevel?: number;
	} = {},
): CrossSectionMeasurement {
	const wMm = options.widthMm ?? 26.0;
	const hMm = options.heightMm ?? 34.0;
	const spMm = options.pixelSpacingMm ?? 0.15;
	const wPx = Math.round(wMm / spMm);
	const hPx = Math.round(hMm / spMm);

	const nLen = Math.hypot(normal2D.x, normal2D.y) || 1;
	const nX = normal2D.x / nLen;
	const nY = normal2D.y / nLen;
	const tX = -nY;
	const tY = nX;

	const sp = volume.spacingMm.x || 0.25;
	const origin = volume.originMm;
	const huGrid = new Float32Array(wPx * hPx);
	const rgba = new Uint8ClampedArray(wPx * hPx * 4);

	const slabThick = options.slabThicknessMm ?? 1.0;
	const slabSteps = 5;
	const slabDeltas: number[] = [];
	for (let s = 0; s < slabSteps; s++) {
		slabDeltas.push(-slabThick / 2.0 + (s / (slabSteps - 1)) * slabThick);
	}

	const ww = options.windowWidth ?? 2400;
	const wl = options.windowLevel ?? 500;
	const low = wl - ww / 2;
	const high = wl + ww / 2;

	for (let py = 0; py < hPx; py++) {
		const vMm = (hPx / 2 - py) * spMm;
		const curZ = centerMm.z + vMm;
		const vz = (curZ - origin.z) / sp;
		const rowOffset = py * wPx;

		for (let px = 0; px < wPx; px++) {
			const uMm = (px - wPx / 2) * spMm;
			const curX = centerMm.x + uMm * nX;
			const curY = centerMm.y + uMm * nY;

			let maxHU = -1000;
			for (const dt of slabDeltas) {
				const sx = curX + dt * tX;
				const sy = curY + dt * tY;
				const vx = (sx - origin.x) / sp;
				const vy = (sy - origin.y) / sp;
				const hu = sampleVoxelTrilinearHU(vx, vy, vz, volume);
				if (hu > maxHU) maxHU = hu;
			}

			huGrid[rowOffset + px] = maxHU;

			let norm = (maxHU - low) / (high - low);
			norm = Math.max(0, Math.min(1, norm));
			const val = Math.round(norm * 255);
			const p = (rowOffset + px) * 4;
			rgba[p] = val;
			rgba[p + 1] = val;
			rgba[p + 2] = val;
			rgba[p + 3] = 255;
		}
	}

	// ─── ANATOMICAL MEASUREMENTS WITH CENTROID TRACKING ─────────────────────
	// Find true ridge centroid along horizontal X axis
	let ridgeCenterX = Math.round(wPx / 2);
	let maxColumnHU = -1000;
	for (let px = Math.round(wPx * 0.25); px <= Math.round(wPx * 0.75); px++) {
		let colSum = 0;
		for (let py = Math.round(hPx * 0.2); py <= Math.round(hPx * 0.8); py++) {
			colSum += Math.max(0, huGrid[py * wPx + px]!);
		}
		if (colSum > maxColumnHU) {
			maxColumnHU = colSum;
			ridgeCenterX = px;
		}
	}

	let crestPy = Math.round(hPx * 0.35);
	let limitPy = Math.round(hPx * 0.75);

	if (jaw === "mandible") {
		// Scan from top downwards near ridgeCenterX to find alveolar crest border
		for (let py = Math.round(hPx * 0.12); py < hPx - 15; py++) {
			if (huGrid[py * wPx + ridgeCenterX]! >= 300) {
				crestPy = py;
				break;
			}
		}
		// Search for mandibular canal below crest (radiolucent core HU < 80 surrounded by bone)
		let foundCanal = false;
		for (let py = crestPy + Math.round(8.0 / spMm); py < hPx - 15; py++) {
			const hu = huGrid[py * wPx + ridgeCenterX]!;
			if (hu < 100) {
				limitPy = py;
				foundCanal = true;
				break;
			}
		}
		if (!foundCanal) limitPy = Math.min(hPx - 15, crestPy + Math.round(13.5 / spMm));
	} else {
		// Maxilla: Scan from bottom upwards near ridgeCenterX to find alveolar crest
		for (let py = hPx - 15; py >= Math.round(hPx * 0.25); py--) {
			if (huGrid[py * wPx + ridgeCenterX]! >= 220) {
				crestPy = py;
				break;
			}
		}
		// Search upwards for floor of maxillary sinus / nasal floor
		let foundSinus = false;
		for (let py = crestPy - Math.round(3.0 / spMm); py >= 15; py--) {
			const hu = huGrid[py * wPx + ridgeCenterX]!;
			const above = huGrid[(py - 4) * wPx + ridgeCenterX]!;
			if (hu >= 200 && above < -100) {
				limitPy = py;
				foundSinus = true;
				break;
			}
		}
		if (!foundSinus) limitPy = Math.max(15, crestPy - Math.round(5.5 / spMm));
	}

	const availHeightMm = Number((Math.abs(crestPy - limitPy) * spMm).toFixed(1));

	const fdiNum = parseInt(toothFdi, 10);
	const isAnteriorMaxilla = jaw === "maxilla" && ((fdiNum >= 11 && fdiNum <= 13) || (fdiNum >= 21 && fdiNum <= 23));

	// Measure bone width at W2 (2 mm from crest) and W6 (6 mm from crest)
	const measureWidthAt = (offsetMm: number) => {
		const rowY = jaw === "mandible"
			? Math.min(hPx - 1, crestPy + Math.round(offsetMm / spMm))
			: Math.max(0, crestPy - Math.round(offsetMm / spMm));

		// In maxilla, if offset exceeds the available bone height, the level enters the maxillary sinus / nasal air
		const isBeyondBone = jaw === "maxilla" && offsetMm > availHeightMm;

		let startX = ridgeCenterX;
		let foundBone = false;
		if (huGrid[rowY * wPx + startX]! >= 150) {
			foundBone = true;
		} else {
			let bestDist = 999;
			for (let dx = -40; dx <= 40; dx++) {
				const curX = startX + dx;
				if (curX >= 0 && curX < wPx && huGrid[rowY * wPx + curX]! >= 150) {
					if (Math.abs(dx) < bestDist) {
						bestDist = Math.abs(dx);
						startX = curX;
						foundBone = true;
					}
				}
			}
		}

		if (isBeyondBone || !foundBone) {
			const text = jaw === "maxilla" 
				? (isAnteriorMaxilla ? "0.0 мм (дно полости носа / воздух)" : "0.0 мм (пневматизация синуса / воздух)") 
				: "0.0 мм (нет кости)";
			return {
				widthMm: 0.0,
				displayText: text,
				left: { x: ridgeCenterX, y: rowY },
				right: { x: ridgeCenterX, y: rowY },
				isAir: true,
			};
		}

		let leftPx = startX;
		let rightPx = startX;
		for (let px = startX; px >= 0; px--) {
			if (huGrid[rowY * wPx + px]! < 120) {
				leftPx = px;
				break;
			}
		}
		for (let px = startX; px < wPx; px++) {
			if (huGrid[rowY * wPx + px]! < 120) {
				rightPx = px;
				break;
			}
		}
		const spanPx = Math.max(0, rightPx - leftPx);
		const widthMm = spanPx < 2 ? 0.0 : Number((spanPx * spMm).toFixed(1));
		const displayText = widthMm === 0.0
			? (jaw === "maxilla" ? (isAnteriorMaxilla ? "0.0 мм (дно полости носа / воздух)" : "0.0 мм (пневматизация синуса / воздух)") : "0.0 мм (нет кости)")
			: `${widthMm} мм`;

		return {
			widthMm,
			displayText,
			left: { x: leftPx, y: rowY },
			right: { x: rightPx, y: rowY },
			isAir: widthMm === 0.0,
		};
	};

	const w2Res = measureWidthAt(2.0);
	const w6Res = measureWidthAt(6.0);

	let sumHU = 0;
	let countHU = 0;
	const minY = Math.min(crestPy, limitPy);
	const maxY = Math.max(crestPy, limitPy);
	for (let y = minY; y <= maxY; y++) {
		for (let x = ridgeCenterX - 10; x <= ridgeCenterX + 10; x++) {
			if (x >= 0 && x < wPx && y >= 0 && y < hPx) {
				sumHU += huGrid[y * wPx + x]!;
				countHU++;
			}
		}
	}
	const meanHU = countHU > 0 ? Math.round(sumHU / countHU) : 450;

	let misch: "D1" | "D2" | "D3" | "D4" = "D3";
	if (meanHU >= 850) misch = "D1";
	else if (meanHU >= 550) misch = "D2";
	else if (meanHU >= 200) misch = "D3";
	else misch = "D4";

	let limitName = "";
	let verdict = "";
	if (jaw === "mandible") {
		limitName = "Канал нижнечелюстного нерва (N. Alveolaris Inf.)";
		verdict = availHeightMm >= 10.0 ? "Достаточная высота (Margin >= 2 мм)" : "Дефицит высоты: риск повреждения канала";
	} else if (isAnteriorMaxilla) {
		limitName = "Дно полости носа (Cavum Nasi) / резцовый канал";
		verdict = availHeightMm < 8.0 
			? "Дефицит высоты до дна полости носа (Cavum Nasi) • Аугментация" 
			: "Достаточная высота для имплантации";
	} else {
		limitName = "Дно верхнечелюстного синуса (Sinus Maxillaris)";
		verdict = availHeightMm < 8.0 
			? "Показан синус-лифтинг (дефицит высоты)" 
			: "Достаточная высота для имплантации";
	}

	return {
		toothFdi,
		toothNameRu,
		jaw,
		patientName,
		widthPx: wPx,
		heightPx: hPx,
		pixelSpacingMm: spMm,
		base64: Buffer.from(rgba.buffer).toString("base64"),
		crestPointPx: { x: ridgeCenterX, y: crestPy },
		anatomicalLimitPointPx: { x: ridgeCenterX, y: limitPy },
		availableHeightMm: availHeightMm,
		widthAt2Mm: w2Res.widthMm,
		widthAt2MmText: w2Res.displayText,
		widthAt6Mm: w6Res.widthMm,
		widthAt6MmText: w6Res.displayText,
		isW6Air: w6Res.isAir,
		meanDensityHU: meanHU,
		boneQualityMisch: misch,
		anatomicalLimitNameRu: limitName,
		clinicalVerdictRu: verdict,
		w2LinePx: { left: w2Res.left, right: w2Res.right },
		w6LinePx: { left: w6Res.left, right: w6Res.right },
	};
}
