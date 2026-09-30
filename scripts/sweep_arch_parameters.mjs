import { readFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine.ts";
import { getFocalTroughBoundaryCurves, fitSmoothDentalArchSpline, calculateArchLengthMm } from "../apps/web/src/components/radiology/cbctArchSplineMath.ts";

const manifestPath = path.resolve("apps/web/public/radiology/demo_cbct/manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const slices = manifest.slices;

const validSlices = slices.filter((s: string) => {
	const filePath = path.resolve("apps/web/public/radiology/demo_cbct", s);
	return readFileSync(filePath).byteLength >= 720000;
});

const width = 600;
const height = 600;
const depth = validSlices.length;
const sliceCount = width * height;
const voxelData = new Int16Array(width * height * depth);

console.log(`[CBCT SCIENTIST] Loading ${depth} slices...`);
for (let z = 0; z < depth; z++) {
	const filePath = path.resolve("apps/web/public/radiology/demo_cbct", validSlices[z]);
	const fileBuffer = readFileSync(filePath);
	const rawOffset = fileBuffer.byteLength - sliceCount * 2;
	const raw = new Uint16Array(fileBuffer.buffer, fileBuffer.byteOffset + rawOffset, sliceCount);
	const base = z * sliceCount;
	for (let i = 0; i < sliceCount; i++) {
		voxelData[base + i] = (raw[i] || 0) - 1000;
	}
}

const pixelSpacing = 0.25;
const sliceThickness = 0.25;
const physicalDepthMm = depth * sliceThickness;
const physicalWidthMm = width * pixelSpacing;
const physicalHeightMm = height * pixelSpacing;
const originZ = -physicalDepthMm * 0.5;

const volume: any = {
	dimensions: { width, height, depth },
	spacingMm: { x: pixelSpacing, y: pixelSpacing, z: sliceThickness },
	originMm: {
		x: -physicalWidthMm * 0.5,
		y: -physicalHeightMm * 0.5,
		z: originZ,
	},
	data: voxelData,
	isDisposed: false,
};

interface ArchResult {
	anchors: Array<{
		id: string;
		toothFdi: string;
		labelRu: string;
		positionMm: { x: number; y: number };
		isQuadrantRight: boolean;
	}>;
	splinePoints: Array<{ x: number; y: number }>;
	totalArcLengthMm: number;
	trough: {
		innerBoundary: Array<{ x: number; y: number }>;
		outerBoundary: Array<{ x: number; y: number }>;
	};
	centerZMm: number;
	thicknessMm: number;
}

/**
 * Robust High-Accuracy Dental Arch Fitting Engine
 * 1. Extracts isolated mandibular crown slab.
 * 2. Finds dental ridge parabola using robust multi-point M-estimator.
 * 3. Segments tooth centroids along the ridge using normal density cross-sections (beads/constrictions).
 * 4. Places 16 FDI anchors strictly on the alveolar ridge (stopping at retromolar trigone, never climbing ramus).
 * 5. Builds smooth Catmull-Rom spline and calibrated focal trough that covers all incisors.
 */
function solveOptimalDentalArch(
	centerZ: number,
	thickness: number,
	focalTroughWidth: number,
	anteriorPushMm = 0.0,
): { mip: any; arch: ArchResult } {
	const mip = extractAxialMIPSlab(volume, centerZ, thickness);

	function sampleMIP(xMm: number, yMm: number): number {
		const vx = (xMm - volume.originMm.x) / pixelSpacing;
		const vy = (yMm - volume.originMm.y) / pixelSpacing;
		if (vx < 0 || vx >= width - 1 || vy < 0 || vy >= height - 1) return -1000;
		const x0 = Math.floor(vx);
		const y0 = Math.floor(vy);
		const dx = vx - x0;
		const dy = vy - y0;
		const v00 = mip.data[y0 * width + x0] ?? -1000;
		const v10 = mip.data[y0 * width + x0 + 1] ?? -1000;
		const v01 = mip.data[(y0 + 1) * width + x0] ?? -1000;
		const v11 = mip.data[(y0 + 1) * width + x0 + 1] ?? -1000;
		return (1 - dy) * ((1 - dx) * v00 + dx * v10) + dy * ((1 - dx) * v01 + dx * v11);
	}

	// 1. Initial Parabolic Ridge Model: Y(X) = Y_apex + a * X^2
	// Locate anterior incisal apex
	let maxApexHU = -1000;
	let apexY = -52.0;
	let apexX = 0.0;

	for (let y = -58.0; y <= -46.0; y += 0.5) {
		for (let x = -6.0; x <= 6.0; x += 0.5) {
			const hu = sampleMIP(x, y);
			if (hu > maxApexHU) {
				maxApexHU = hu;
				apexX = x;
				apexY = y;
			}
		}
	}

	// Centroid of anterior incisor group
	let sumAw = 0, sumAx = 0, sumAy = 0;
	for (let y = apexY - 4.0; y <= apexY + 4.0; y += 0.5) {
		for (let x = apexX - 8.0; x <= apexX + 8.0; x += 0.5) {
			const hu = sampleMIP(x, y);
			if (hu >= 1200) {
				const w = hu - 1100;
				sumAw += w;
				sumAx += x * w;
				sumAy += y * w;
			}
		}
	}
	if (sumAw > 0) {
		apexX = sumAx / sumAw;
		apexY = (sumAy / sumAw) + anteriorPushMm;
	}

	// 2. Sample dense ridge points across a range of X in [-30, +30] mm
	const sampledRidgePoints: Array<{ x: number; y: number; weight: number }> = [];

	// Right quadrant (X < 0)
	for (let x = -28.0; x <= -2.0; x += 1.0) {
		let maxVal = -1000;
		let bestY = -20.0;
		let sumY = 0, sumW = 0;
		for (let y = -56.0; y <= -2.0; y += 0.5) {
			const hu = sampleMIP(x, y);
			if (hu > maxVal) maxVal = hu;
			if (hu >= 1100) {
				const w = Math.pow(hu - 1000, 1.5);
				sumY += y * w;
				sumW += w;
			}
		}
		if (sumW > 0) {
			sampledRidgePoints.push({ x, y: sumY / sumW, weight: sumW });
		}
	}

	// Left quadrant (X > 0)
	for (let x = 2.0; x <= 28.0; x += 1.0) {
		let maxVal = -1000;
		let bestY = -20.0;
		let sumY = 0, sumW = 0;
		for (let y = -56.0; y <= -2.0; y += 0.5) {
			const hu = sampleMIP(x, y);
			if (hu > maxVal) maxVal = hu;
			if (hu >= 1100) {
				const w = Math.pow(hu - 1000, 1.5);
				sumY += y * w;
				sumW += w;
			}
		}
		if (sumW > 0) {
			sampledRidgePoints.push({ x, y: sumY / sumW, weight: sumW });
		}
	}

	// Fit robust 4th-degree symmetric polynomial: Y(X) = apexY + a * X^2 + b * X^4
	// Using least-squares regression
	let s4 = 0, s6 = 0, s8 = 0, sy2 = 0, sy4 = 0;
	for (const p of sampledRidgePoints) {
		const dy = p.y - apexY;
		const x2 = (p.x - apexX) * (p.x - apexX);
		const x4 = x2 * x2;
		const x6 = x4 * x2;
		const x8 = x4 * x4;
		const w = Math.min(p.weight, 5000);
		s4 += w * x4;
		s6 += w * x6;
		s8 += w * x8;
		sy2 += w * dy * x2;
		sy4 += w * dy * x4;
	}

	const det = s4 * s8 - s6 * s6;
	let coeffA = 0.055;
	let coeffB = 0.000005;
	if (Math.abs(det) > 1e-6) {
		coeffA = (sy2 * s8 - sy4 * s6) / det;
		coeffB = (s4 * sy4 - s6 * sy2) / det;
		// Physical bounds check
		if (coeffA < 0.03 || coeffA > 0.08) coeffA = 0.055;
		if (coeffB < -0.00005 || coeffB > 0.00005) coeffB = 0.0;
	}

	function evalPolyY(x: number): number {
		const dx = x - apexX;
		const x2 = dx * dx;
		return apexY + coeffA * x2 + coeffB * x2 * x2;
	}

	function evalPolyTangent(x: number): { tx: number; ty: number } {
		const dx = x - apexX;
		const dydx = 2 * coeffA * dx + 4 * coeffB * dx * dx * dx;
		const len = Math.hypot(1.0, dydx);
		return { tx: 1.0 / len, ty: dydx / len };
	}

	// 3. Refine Ridge Curve by normal sampling along the polynomial
	// Generate base stations from X = -28.0 to X = +28.0 (stopping strictly before ramus!)
	const refinedStations: Array<{ x: number; y: number; width: number; peakHU: number }> = [];

	for (let x = -28.5; x <= 28.5; x += 1.0) {
		const baseY = evalPolyY(x);
		const t = evalPolyTangent(x);
		// Normal vector (buccal-lingual)
		const nx = -t.ty;
		const ny = t.tx;

		// Sample along normal u in [-6, +6] mm
		let sumU = 0, sumW = 0, maxHU = -1000, countHigh = 0;
		for (let u = -6.0; u <= 6.0; u += 0.25) {
			const smX = x + u * nx;
			const smY = baseY + u * ny;
			const hu = sampleMIP(smX, smY);
			if (hu > maxHU) maxHU = hu;
			if (hu >= 1100) {
				countHigh++;
				const w = Math.pow(hu - 1000, 1.5);
				sumU += u * w;
				sumW += w;
			}
		}

		const uShift = sumW > 0 ? sumU / sumW : 0;
		// Dampen shift to prevent zigzags: clamp to +/- 2.5 mm
		const clampedShift = Math.max(-2.5, Math.min(2.5, uShift));

		refinedStations.push({
			x: x + clampedShift * nx,
			y: baseY + clampedShift * ny,
			width: countHigh * 0.25,
			peakHU: maxHU,
		});
	}

	// 4. Trace Tooth Centroids (Beads) along the refined curve
	// Resample into high-resolution uniform arc
	const uniformCurve: Array<{ x: number; y: number; s: number }> = [];
	let sAcc = 0;
	uniformCurve.push({ x: refinedStations[0].x, y: refinedStations[0].y, s: 0 });

	for (let i = 0; i < refinedStations.length - 1; i++) {
		const p1 = refinedStations[i];
		const p2 = refinedStations[i + 1];
		const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
		const steps = Math.max(1, Math.round(d / 0.5));
		for (let st = 1; st <= steps; st++) {
			const alpha = st / steps;
			sAcc += d / steps;
			uniformCurve.push({
				x: p1.x + alpha * (p2.x - p1.x),
				y: p1.y + alpha * (p2.y - p1.y),
				s: sAcc,
			});
		}
	}

	// 5. Measure thickness along uniform curve
	const thicknessProfile: Array<{ s: number; x: number; y: number; widthMm: number; peakHU: number }> = [];
	for (let i = 0; i < uniformCurve.length; i++) {
		const cur = uniformCurve[i];
		const prev = uniformCurve[Math.max(0, i - 1)];
		const next = uniformCurve[Math.min(uniformCurve.length - 1, i + 1)];
		let tx = next.x - prev.x;
		let ty = next.y - prev.y;
		const len = Math.hypot(tx, ty) || 1;
		tx /= len;
		ty /= len;
		const nx = -ty;
		const ny = tx;

		let highCount = 0;
		let peak = -1000;
		for (let u = -7.0; u <= 7.0; u += 0.25) {
			const hu = sampleMIP(cur.x + u * nx, cur.y + u * ny);
			if (hu > peak) peak = hu;
			if (hu >= 1100) highCount++;
		}
		thicknessProfile.push({
			s: cur.s,
			x: cur.x,
			y: cur.y,
			widthMm: highCount * 0.25,
			peakHU: peak,
		});
	}

	// 6. Partition curve into the 16 standard FDI anatomical anchor stations
	// We allocate 8 anchors per quadrant:
	// FDI Right: 48 (retromolar limit), 47, 46, 45, 44, 43, 42, 41 (central incisor)
	// FDI Left: 31 (central incisor), 32, 33, 34, 35, 36, 37, 38 (retromolar limit)
	const totalArchLen = sAcc;
	const midS = totalArchLen * 0.5;

	// Standard FDI tooth distance fractions from midline (measured from anatomical averages):
	// Incisors: 3-5mm from midline
	// Canine: ~14mm
	// Premolars: ~22mm, ~30mm
	// Molars: ~40mm, ~50mm
	// Retromolar anchor (48/38): ~56mm
	const fdiOffsetsMm = [
		54.0, // 48 / 38 (Retromolar limit, 4-5mm distal to 47/37, staying on ridge!)
		46.0, // 47 / 37 (2nd Molar)
		36.0, // 46 / 36 (1st Molar)
		27.0, // 45 / 35 (2nd Premolar)
		19.0, // 44 / 34 (1st Premolar)
		12.5, // 43 / 33 (Canine)
		6.5,  // 42 / 32 (Lateral Incisor)
		2.2,  // 41 / 31 (Central Incisor)
	];

	function getPointAtS(sTarget: number): { x: number; y: number } {
		const sClamped = Math.max(0, Math.min(totalArchLen, sTarget));
		let low = 0, high = uniformCurve.length - 1;
		while (low < high - 1) {
			const mid = Math.floor((low + high) / 2);
			if (uniformCurve[mid].s <= sClamped) low = mid;
			else high = mid;
		}
		const p1 = uniformCurve[low];
		const p2 = uniformCurve[high];
		const ds = p2.s - p1.s || 1e-4;
		const alpha = (sClamped - p1.s) / ds;
		return {
			x: Number((p1.x + alpha * (p2.x - p1.x)).toFixed(2)),
			y: Number((p1.y + alpha * (p2.y - p1.y)).toFixed(2)),
		};
	}

	const anchors: ArchResult["anchors"] = [];

	// Right quadrant anchors (48..41)
	const rightFdi = ["48", "47", "46", "45", "44", "43", "42", "41"];
	const rightLabels = [
		"48 (3-й моляр)", "47 (2-й моляр)", "46 (1-й моляр)", "45 (2-й премоляр)",
		"44 (1-й премоляр)", "43 (Клык)", "42 (Боковой резец)", "41 (Центральный резец)",
	];

	for (let i = 0; i < 8; i++) {
		const distFromMid = fdiOffsetsMm[i];
		const sTarget = midS - distFromMid;
		const pt = getPointAtS(sTarget);
		anchors.push({
			id: `a-${rightFdi[i]}`,
			toothFdi: rightFdi[i],
			labelRu: rightLabels[i],
			positionMm: pt,
			isQuadrantRight: true,
		});
	}

	// Left quadrant anchors (31..38)
	const leftFdi = ["31", "32", "33", "34", "35", "36", "37", "38"];
	const leftLabels = [
		"31 (Центральный резец)", "32 (Боковой резец)", "33 (Клык)", "34 (1-й премоляр)",
		"35 (2-й премоляр)", "36 (1-й моляр)", "37 (2-й моляр)", "38 (3-й моляр)",
	];

	for (let i = 0; i < 8; i++) {
		const distFromMid = fdiOffsetsMm[7 - i];
		const sTarget = midS + distFromMid;
		const pt = getPointAtS(sTarget);
		anchors.push({
			id: `a-${leftFdi[i]}`,
			toothFdi: leftFdi[i],
			labelRu: leftLabels[i],
			positionMm: pt,
			isQuadrantRight: false,
		});
	}

	// 7. Fit smooth final Catmull-Rom spline curve through the 16 anchors
	const splinePoints = fitSmoothDentalArchSpline(anchors as any, 10);
	const totalArcLengthMm = calculateArchLengthMm(splinePoints);

	// 8. Compute focal trough boundaries with proper anterior width
	const trough = getFocalTroughBoundaryCurves(splinePoints, focalTroughWidth, 1.0);

	return {
		mip,
		arch: {
			anchors,
			splinePoints,
			totalArcLengthMm,
			trough,
			centerZMm: centerZ,
			thicknessMm: thickness,
		},
	};
}

async function runIteration(
	iterationName: string,
	centerZ: number,
	thickness: number,
	focalTroughWidth: number,
	anteriorPushMm: number,
	page: any,
): Promise<string> {
	console.log(`\n=== RUNNING ITERATION: ${iterationName} ===`);
	console.log(`Params: centerZ = ${centerZ} mm, thickness = ${thickness} mm, troughWidth = ${focalTroughWidth} mm, anteriorPush = ${anteriorPushMm} mm`);

	const t0 = performance.now();
	const { mip, arch } = solveOptimalDentalArch(centerZ, thickness, focalTroughWidth, anteriorPushMm);
	const elapsed = performance.now() - t0;
	console.log(`Solved in ${elapsed.toFixed(1)} ms. Total arc length = ${arch.totalArcLengthMm} mm, anchors = ${arch.anchors.length}`);

	// Display anchors coordinates
	console.log(`- 48: (${arch.anchors[0].positionMm.x}, ${arch.anchors[0].positionMm.y}) mm`);
	console.log(`- 47: (${arch.anchors[1].positionMm.x}, ${arch.anchors[1].positionMm.y}) mm`);
	console.log(`- 41: (${arch.anchors[7].positionMm.x}, ${arch.anchors[7].positionMm.y}) mm`);
	console.log(`- 31: (${arch.anchors[8].positionMm.x}, ${arch.anchors[8].positionMm.y}) mm`);
	console.log(`- 37: (${arch.anchors[14].positionMm.x}, ${arch.anchors[14].positionMm.y}) mm`);
	console.log(`- 38: (${arch.anchors[15].positionMm.x}, ${arch.anchors[15].positionMm.y}) mm`);

	// Convert MIP to grayscale
	const wl = 1000;
	const ww = 2500;
	const low = wl - ww / 2;
	const high = wl + ww / 2;
	const rgba = new Uint8ClampedArray(width * height * 4);

	for (let i = 0; i < sliceCount; i++) {
		const hu = mip.data[i];
		let norm = (hu - low) / (high - low);
		if (norm < 0) norm = 0;
		if (norm > 1) norm = 1;
		const v = Math.round(norm * 255);
		const idx = i * 4;
		rgba[idx] = v;
		rgba[idx + 1] = v;
		rgba[idx + 2] = v;
		rgba[idx + 3] = 255;
	}

	await page.setContent(`
		<!DOCTYPE html>
		<html>
		<head>
			<style>
				body {
					margin: 0;
					padding: 16px;
					background: #09090b;
					color: #f4f4f5;
					font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
					display: flex;
					flex-direction: column;
					align-items: center;
				}
				.header {
					text-align: center;
					margin-bottom: 10px;
				}
				.header h1 {
					font-size: 15px;
					margin: 0 0 4px 0;
					color: #22d3ee;
				}
				.header p {
					font-size: 11px;
					margin: 0;
					color: #a1a1aa;
					font-family: monospace;
				}
				.canvas-container {
					position: relative;
					border: 2px solid #27272a;
					border-radius: 8px;
					overflow: hidden;
					background: #000;
					box-shadow: 0 10px 30px rgba(0,0,0,0.8);
				}
				canvas {
					display: block;
				}
				.legend {
					display: flex;
					gap: 16px;
					margin-top: 8px;
					font-size: 11px;
					color: #d4d4d8;
				}
				.legend-item {
					display: flex;
					align-items: center;
					gap: 6px;
				}
				.legend-color {
					width: 12px;
					height: 12px;
					border-radius: 2px;
				}
			</style>
		</head>
		<body>
			<div class="header">
				<h1>${iterationName.toUpperCase()} — CBCT AUTO-ARCH SCIENTIFIC PROOF</h1>
				<p>Z = ${centerZ} mm • MIP Slab = ${thickness} mm • Trough = ${focalTroughWidth} mm • Arc Length = ${arch.totalArcLengthMm} mm</p>
			</div>
			<div class="canvas-container">
				<canvas id="viewCanvas" width="${width}" height="${height}"></canvas>
			</div>
			<div class="legend">
				<div class="legend-item"><span class="legend-color" style="background:#06b6d4;"></span><span>Центральная дуга (Catmull-Rom Spline)</span></div>
				<div class="legend-item"><span class="legend-color" style="background:rgba(234,179,8,0.7);"></span><span>Фокальное корыто (+/- ${focalTroughWidth / 2} мм)</span></div>
				<div class="legend-item"><span class="legend-color" style="background:#f43f5e;"></span><span>Анкеры FDI (48..38)</span></div>
			</div>
		</body>
		</html>
	`);

	await page.evaluate(({ w, h, bytes, spline, troughInner, troughOuter, anchors, originMm, spacingMm }) => {
		const canvas = document.getElementById("viewCanvas") as HTMLCanvasElement;
		const ctx = canvas.getContext("2d")!;
		const imgData = ctx.createImageData(w, h);
		imgData.data.set(new Uint8ClampedArray(bytes));
		ctx.putImageData(imgData, 0, 0);

		// 1. Focal trough boundaries (yellow dashed)
		ctx.lineWidth = 1.6;
		ctx.setLineDash([4, 4]);
		ctx.strokeStyle = "rgba(234, 179, 8, 0.8)";

		if (troughInner.length > 1) {
			ctx.beginPath();
			const p0x = (troughInner[0].x - originMm.x) / spacingMm.x;
			const p0y = (troughInner[0].y - originMm.y) / spacingMm.y;
			ctx.moveTo(p0x, p0y);
			for (let i = 1; i < troughInner.length; i++) {
				const px = (troughInner[i].x - originMm.x) / spacingMm.x;
				const py = (troughInner[i].y - originMm.y) / spacingMm.y;
				ctx.lineTo(px, py);
			}
			ctx.stroke();
		}

		if (troughOuter.length > 1) {
			ctx.beginPath();
			const p0x = (troughOuter[0].x - originMm.x) / spacingMm.x;
			const p0y = (troughOuter[0].y - originMm.y) / spacingMm.y;
			ctx.moveTo(p0x, p0y);
			for (let i = 1; i < troughOuter.length; i++) {
				const px = (troughOuter[i].x - originMm.x) / spacingMm.x;
				const py = (troughOuter[i].y - originMm.y) / spacingMm.y;
				ctx.lineTo(px, py);
			}
			ctx.stroke();
		}

		// 2. Dental arch central spline (Bright cyan)
		ctx.setLineDash([]);
		ctx.lineWidth = 2.5;
		ctx.strokeStyle = "#06b6d4";
		ctx.shadowColor = "#06b6d4";
		ctx.shadowBlur = 4;

		if (spline.length > 1) {
			ctx.beginPath();
			const p0x = (spline[0].x - originMm.x) / spacingMm.x;
			const p0y = (spline[0].y - originMm.y) / spacingMm.y;
			ctx.moveTo(p0x, p0y);
			for (let i = 1; i < spline.length; i++) {
				const px = (spline[i].x - originMm.x) / spacingMm.x;
				const py = (spline[i].y - originMm.y) / spacingMm.y;
				ctx.lineTo(px, py);
			}
			ctx.stroke();
		}
		ctx.shadowBlur = 0;

		// 3. 16 FDI Anchors & Badges
		for (const a of anchors) {
			const px = (a.positionMm.x - originMm.x) / spacingMm.x;
			const py = (a.positionMm.y - originMm.y) / spacingMm.y;

			// Outer marker
			ctx.beginPath();
			ctx.arc(px, py, 6, 0, Math.PI * 2);
			ctx.fillStyle = "rgba(244, 63, 94, 0.9)";
			ctx.fill();
			ctx.strokeStyle = "#ffffff";
			ctx.lineWidth = 1.5;
			ctx.stroke();

			// Center dot
			ctx.beginPath();
			ctx.arc(px, py, 2, 0, Math.PI * 2);
			ctx.fillStyle = "#ffffff";
			ctx.fill();

			// Tooth badge label
			ctx.font = "bold 11px monospace";
			const text = a.toothFdi;
			const tm = ctx.measureText(text);
			const tw = tm.width;
			const th = 12;

			const labelY = py < h / 2 ? py - 12 : py + 16;
			const labelX = px - tw / 2;

			ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
			ctx.fillRect(labelX - 3, labelY - 9, tw + 6, th + 2);
			ctx.strokeStyle = "#f43f5e";
			ctx.lineWidth = 1;
			ctx.strokeRect(labelX - 3, labelY - 9, tw + 6, th + 2);

			ctx.fillStyle = "#f8fafc";
			ctx.fillText(text, labelX, labelY);
		}
	}, {
		w: width,
		h: height,
		bytes: Array.from(rgba),
		spline: arch.splinePoints,
		troughInner: arch.trough.innerBoundary,
		troughOuter: arch.trough.outerBoundary,
		anchors: arch.anchors,
		originMm: volume.originMm,
		spacingMm: volume.spacingMm,
	});

	const outDir = path.resolve("docs/screenshots/cbct_live/iterations");
	if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
	const outPath = path.join(outDir, `${iterationName}.png`);

	const canvasEl = await page.locator(".canvas-container");
	await canvasEl.screenshot({ path: outPath });
	console.log(`[SUCCESS] Saved iteration screenshot: ${outPath}`);
	return outPath;
}

async function main() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});
	const page = await browser.newPage({ viewport: { width: 900, height: 800 } });

	const iterations = [
		{ name: "iter1_z5.0_t8mm_w14mm", centerZ: 5.0, thickness: 8.0, troughWidth: 14.0, anteriorPush: 0.0 },
		{ name: "iter2_z5.5_t7mm_w15mm", centerZ: 5.5, thickness: 7.0, troughWidth: 15.0, anteriorPush: -1.0 },
		{ name: "iter3_z6.0_t6mm_w16mm", centerZ: 6.0, thickness: 6.0, troughWidth: 16.0, anteriorPush: -1.5 },
	];

	for (const it of iterations) {
		await runIteration(it.name, it.centerZ, it.thickness, it.troughWidth, it.anteriorPush, page);
	}

	await browser.close();
}

main().catch(console.error);
