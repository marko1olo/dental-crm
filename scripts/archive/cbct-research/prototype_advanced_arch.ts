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

console.log("Loading CBCT dataset...");
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

// 1. Extract clean MIP slab around mandibular crowns: center Z = 5.5 mm, thickness = 7.0 mm
const centerZMm = 5.5;
const thicknessMm = 7.0;
const mip = extractAxialMIPSlab(volume, centerZMm, thicknessMm);
console.log(`Extracted MIP: ${mip.width}x${mip.height}, Z=${centerZMm}mm, thickness=${thicknessMm}mm`);

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

// 2. Identify anterior jaw apex (chin / central incisors)
// Look for peak enamel density near X=0, Y < -40mm
let maxAntHU = -1000;
let apexX = 0;
let apexY = -55.0;

for (let yMm = -65.0; yMm <= -45.0; yMm += 0.5) {
	for (let xMm = -10.0; xMm <= 10.0; xMm += 0.5) {
		const hu = sampleMIP(xMm, yMm);
		if (hu > maxAntHU) {
			maxAntHU = hu;
			apexX = xMm;
			apexY = yMm;
		}
	}
}
console.log(`Anterior Apex candidate: (${apexX.toFixed(2)}, ${apexY.toFixed(2)}) mm, HU=${maxAntHU}`);

// 3. Multi-point ridge tracing using active contour / dynamic programming
// In the mandibular arch:
// Teeth lie in the range Y in [-60, -2] mm, X in [-35, +35] mm.
// Ascending ramus begins at Y > -2 mm and flares to |X| > 38 mm.
// We trace the ridge starting from the central incisors (apex) backwards into each quadrant.

interface QuadrantPoint {
	x: number;
	y: number;
	hu: number;
	width: number;
}

function traceQuadrantRidge(isRight: boolean): QuadrantPoint[] {
	const sign = isRight ? -1 : 1;
	const points: QuadrantPoint[] = [];

	// Start at central incisor
	let curX = apexX + sign * 2.0;
	let curY = apexY;

	points.push({ x: curX, y: curY, hu: sampleMIP(curX, curY), width: 6.0 });

	// We step backwards in Y from apexY (-55mm) up to the distal boundary of the molars (-2mm)
	// At each step in Y (step = 1.0mm), find the optimal X in a search window
	let prevX = curX;

	for (let y = apexY + 1.0; y <= 5.0; y += 1.0) {
		// Stop condition: if we reach retromolar region (y > -2mm) and density drops or width drops
		let bestX = prevX;
		let maxDense = -1000;
		let bestWidth = 0;

		// Search window around previous X: X moves outwards as Y moves backwards
		const minX = isRight ? Math.min(-5.0, prevX - 3.5) : Math.max(5.0, prevX - 1.0);
		const maxX = isRight ? Math.min(-2.0, prevX + 1.0) : Math.max(2.0, prevX + 3.5);

		for (let x = Math.min(minX, maxX); x <= Math.max(minX, maxX); x += 0.25) {
			// Measure density profile across normal
			// At this point, tangent is roughly (dx, dy), normal is perpendicular
			let peakVal = -1000;
			let countHigh = 0;
			for (let off = -5.0; off <= 5.0; off += 0.5) {
				const sampleVal = sampleMIP(x + off, y);
				if (sampleVal > peakVal) peakVal = sampleVal;
				if (sampleVal >= 1000) countHigh++;
			}

			const score = peakVal + countHigh * 80;
			if (score > maxDense) {
				maxDense = score;
				bestX = x;
				bestWidth = countHigh * 0.5;
			}
		}

		// Detect if we entered the ascending ramus:
		// Ramus criteria:
		// 1) Y > -4 mm
		// 2) The bone becomes thin cortical plate (bestWidth < 3.5 mm) or flares out sharply (|bestX| > 35 mm)
		// 3) Peak density is low (cortical bone only, no enamel: peakVal < 1400 HU)
		const currentPeak = sampleMIP(bestX, y);
		if (y > -4.0) {
			if (currentPeak < 1300 && bestWidth < 3.0) {
				console.log(`Quadrant ${isRight ? "4" : "3"} stopped at Y=${y}mm (retromolar pad, no more tooth crowns).`);
				break;
			}
			if (Math.abs(bestX) > 34.0) {
				console.log(`Quadrant ${isRight ? "4" : "3"} stopped at X=${bestX.toFixed(1)}mm (ramus boundary).`);
				break;
			}
		}

		prevX = bestX;
		points.push({ x: bestX, y, hu: currentPeak, width: bestWidth });
	}

	return points;
}

const rightRidge = traceQuadrantRidge(true);
const leftRidge = traceQuadrantRidge(false);

console.log(`Right ridge: ${rightRidge.length} points, ending at (${rightRidge[rightRidge.length - 1].x.toFixed(1)}, ${rightRidge[rightRidge.length - 1].y.toFixed(1)})`);
console.log(`Left ridge: ${leftRidge.length} points, ending at (${leftRidge[leftRidge.length - 1].x.toFixed(1)}, ${leftRidge[leftRidge.length - 1].y.toFixed(1)})`);

// Combine into single continuous dental arch curve from Right Molar (47) to Left Molar (37)
const fullArchPath: Array<{ x: number; y: number }> = [
	...[...rightRidge].reverse().map((p) => ({ x: p.x, y: p.y })),
	...leftRidge.map((p) => ({ x: p.x, y: p.y })),
];

// Fit a smooth Catmull-Rom or polynomial spline through the path
// Resample at uniform 0.5mm arc-length
const uniformSpline: Array<{ x: number; y: number; s: number }> = [];
let totalArcMm = 0;
uniformSpline.push({ x: fullArchPath[0].x, y: fullArchPath[0].y, s: 0 });

let sCur = 0;
for (let i = 0; i < fullArchPath.length - 1; i++) {
	const p1 = fullArchPath[i];
	const p2 = fullArchPath[i + 1];
	const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
	const numSteps = Math.max(1, Math.round(dist / 0.5));
	for (let step = 1; step <= numSteps; step++) {
		const t = step / numSteps;
		const x = p1.x + t * (p2.x - p1.x);
		const y = p1.y + t * (p2.y - p1.y);
		sCur += dist / numSteps;
		uniformSpline.push({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), s: Number(sCur.toFixed(2)) });
	}
}
totalArcMm = sCur;
console.log(`Uniform smooth arch spline: ${uniformSpline.length} points, total length = ${totalArcMm.toFixed(1)} mm`);

// Measure normal tooth width W(s) along uniformSpline
const archWidthProfile: Array<{ s: number; x: number; y: number; widthMm: number; peakHU: number; nx: number; ny: number }> = [];
for (let i = 0; i < uniformSpline.length; i++) {
	const cur = uniformSpline[i];
	const prev = uniformSpline[Math.max(0, i - 1)];
	const next = uniformSpline[Math.min(uniformSpline.length - 1, i + 1)];
	let tx = next.x - prev.x;
	let ty = next.y - prev.y;
	const len = Math.hypot(tx, ty) || 1;
	tx /= len;
	ty /= len;
	const nx = -ty;
	const ny = tx;

	let countHigh = 0;
	let maxHU = -1000;
	let sumU = 0;
	let sumW = 0;

	for (let u = -7.0; u <= 7.0; u += 0.25) {
		const hu = sampleMIP(cur.x + u * nx, cur.y + u * ny);
		if (hu > maxHU) maxHU = hu;
		if (hu >= 1000) {
			countHigh++;
			const w = hu - 900;
			sumU += u * w;
			sumW += w;
		}
	}

	const centerShift = sumW > 0 ? sumU / sumW : 0;
	archWidthProfile.push({
		s: cur.s,
		x: cur.x + centerShift * nx,
		y: cur.y + centerShift * ny,
		widthMm: countHigh * 0.25,
		peakHU: maxHU,
		nx, ny,
	});
}

// Detect tooth centroids from width/density profile
// A tooth is an equator peak of width/density
const toothCenters: Array<{ x: number; y: number; s: number; widthMm: number; peakHU: number }> = [];
const minToothSpacing = 6.0; // Minimal distance between tooth centroids (6 mm)

for (let i = 2; i < archWidthProfile.length - 2; i++) {
	const cur = archWidthProfile[i];
	const prev = archWidthProfile[i - 1];
	const next = archWidthProfile[i + 1];

	if (cur.widthMm >= 4.0 && cur.peakHU >= 1400) {
		if (cur.widthMm >= prev.widthMm && cur.widthMm >= next.widthMm) {
			// Check distance to previous detected tooth
			const last = toothCenters[toothCenters.length - 1];
			if (!last || Math.abs(cur.s - last.s) >= minToothSpacing) {
				toothCenters.push({
					x: Number(cur.x.toFixed(2)),
					y: Number(cur.y.toFixed(2)),
					s: cur.s,
					widthMm: cur.widthMm,
					peakHU: cur.peakHU,
				});
			} else if (cur.widthMm > last.widthMm) {
				// Replace with stronger peak
				toothCenters[toothCenters.length - 1] = {
					x: Number(cur.x.toFixed(2)),
					y: Number(cur.y.toFixed(2)),
					s: cur.s,
					widthMm: cur.widthMm,
					peakHU: cur.peakHU,
				};
			}
		}
	}
}

console.log(`\nDetected ${toothCenters.length} tooth centroids along ridge:`);
toothCenters.forEach((tc, idx) => {
	console.log(`Tooth #${idx + 1}: (${tc.x.toFixed(1)}, ${tc.y.toFixed(1)}) mm, width=${tc.widthMm.toFixed(1)}mm, peakHU=${tc.peakHU}`);
});

// Construct 16 standard FDI anchors:
// In FDI notation for mandible: 48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38.
// If patient has 7 teeth per quadrant (47..41 and 31..37),
// 48 sits immediately distal to 47 along the ridge curve (without flaring into ramus!),
// and 38 sits immediately distal to 37 along the ridge curve!
// Let's generate the 16 FDI anchors:
const anchors: Array<{
	id: string;
	toothFdi: string;
	labelRu: string;
	positionMm: { x: number; y: number };
	isQuadrantRight: boolean;
}> = [];

// Divide spline into 16 FDI stations or match with detected tooth centers
// Let's create anchors that accurately map onto the 14 real teeth (47..41 and 31..37),
// with 48 and 38 placed cleanly at the retromolar pad limits of the alveolar ridge!

const fdiList = ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"];
const fdiLabels: Record<string, string> = {
	"48": "48 (3-й моляр)", "47": "47 (2-й моляр)", "46": "46 (1-й моляр)", "45": "45 (2-й премоляр)",
	"44": "44 (1-й премоляр)", "43": "43 (Клык)", "42": "42 (Боковой резец)", "41": "41 (Центральный резец)",
	"31": "31 (Центральный резец)", "32": "32 (Боковой резец)", "33": "33 (Клык)", "34": "34 (1-й премоляр)",
	"35": "35 (2-й премоляр)", "36": "36 (1-й моляр)", "37": "37 (2-й моляр)", "38": "38 (3-й моляр)",
};

// We can map the 16 FDI anchors along the smooth ridge:
// 47..41 take the 7 right tooth positions
// 31..37 take the 7 left tooth positions
// 48 is placed 4mm distal along the curve from 47
// 38 is placed 4mm distal along the curve from 37
const rightTeeth = toothCenters.filter((t) => t.x < 0).sort((a, b) => a.x - b.x); // from distal to mesial
const leftTeeth = toothCenters.filter((t) => t.x >= 0).sort((a, b) => a.x - b.x); // from mesial to distal

console.log(`Right teeth detected: ${rightTeeth.length}, Left teeth detected: ${leftTeeth.length}`);

// Final spline points for the arch curve:
const finalSplinePoints = uniformSpline.map((p) => ({ x: p.x, y: p.y }));

// Render verification screenshot with Playwright
async function renderProof() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});
	const page = await browser.newPage({ viewport: { width: 700, height: 700 } });

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

	// Compute focal trough (+/- 7 mm, with 14 mm thickness)
	const trough = getFocalTroughBoundaryCurves(finalSplinePoints, 14.0);

	await page.setContent(`
		<html>
		<body style="margin:0; background:#000; display:flex; justify-content:center; align-items:center;">
			<canvas id="c" width="${width}" height="${height}"></canvas>
		</body>
		</html>
	`);

	await page.evaluate(({ w, h, bytes, spline, troughInner, troughOuter, toothPts, originMm, spacingMm }) => {
		const canvas = document.getElementById("c") as HTMLCanvasElement;
		const ctx = canvas.getContext("2d")!;
		const imgData = ctx.createImageData(w, h);
		imgData.data.set(new Uint8ClampedArray(bytes));
		ctx.putImageData(imgData, 0, 0);

		// Focal trough boundaries (yellow dashed)
		ctx.lineWidth = 1.5;
		ctx.setLineDash([4, 4]);
		ctx.strokeStyle = "rgba(234, 179, 8, 0.75)";

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

		// Dental arch centerline (Bright cyan)
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

		// Tooth centroids (Lime green)
		for (let i = 0; i < toothPts.length; i++) {
			const tp = toothPts[i];
			const px = (tp.x - originMm.x) / spacingMm.x;
			const py = (tp.y - originMm.y) / spacingMm.y;

			ctx.beginPath();
			ctx.arc(px, py, 5, 0, Math.PI * 2);
			ctx.fillStyle = "#10b981";
			ctx.fill();
			ctx.strokeStyle = "#ffffff";
			ctx.lineWidth = 1.5;
			ctx.stroke();
		}
	}, {
		w: width,
		h: height,
		bytes: Array.from(rgba),
		spline: finalSplinePoints,
		troughInner: trough.innerBoundary,
		troughOuter: trough.outerBoundary,
		toothPts: toothCenters,
		originMm: volume.originMm,
		spacingMm: volume.spacingMm,
	});

	const outDir = path.resolve("docs/screenshots/cbct_live/iterations");
	if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
	const outPath = path.join(outDir, "prototype_advanced_arch_z5.5.png");
	const canvasEl = await page.locator("#c");
	await canvasEl.screenshot({ path: outPath });
	console.log(`Saved prototype proof: ${outPath}`);

	await browser.close();
}

renderProof().catch(console.error);
