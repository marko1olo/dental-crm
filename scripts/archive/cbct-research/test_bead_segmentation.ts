import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

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

console.log("Loading dataset...");
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

function getSliceIndexForZMm(zMm: number): number {
	return Math.max(0, Math.min(depth - 1, Math.round((zMm - originZ) / sliceThickness)));
}

// Target slice: Z = -4.0 mm (slice 140)
const zTargetMm = -4.0;
const zIdx = getSliceIndexForZMm(zTargetMm);
const sliceBase = zIdx * sliceCount;
const sliceHU = new Float32Array(sliceCount);
for (let i = 0; i < sliceCount; i++) {
	sliceHU[i] = voxelData[sliceBase + i];
}
console.log(`Loaded slice at Z = ${zTargetMm} mm (index ${zIdx})`);

function sampleHU(xMm: number, yMm: number): number {
	const vx = (xMm - (-physicalWidthMm * 0.5)) / pixelSpacing;
	const vy = (yMm - (-physicalHeightMm * 0.5)) / pixelSpacing;
	if (vx < 0 || vx >= width - 1 || vy < 0 || vy >= height - 1) return -1000;
	const x0 = Math.floor(vx);
	const y0 = Math.floor(vy);
	const dx = vx - x0;
	const dy = vy - y0;
	const v00 = sliceHU[y0 * width + x0] || -1000;
	const v10 = sliceHU[y0 * width + x0 + 1] || -1000;
	const v01 = sliceHU[(y0 + 1) * width + x0] || -1000;
	const v11 = sliceHU[(y0 + 1) * width + x0 + 1] || -1000;
	return (1 - dy) * ((1 - dx) * v00 + dx * v10) + dy * ((1 - dx) * v01 + dx * v11);
}

// 1. Estimate center of teeth
let sumW = 0, sumX = 0, sumY = 0;
for (let y = 0; y < height; y++) {
	const yMm = -physicalHeightMm * 0.5 + y * pixelSpacing;
	if (yMm > 0) continue; // Anterior only
	for (let x = 0; x < width; x++) {
		const hu = sliceHU[y * width + x];
		if (hu >= 800) {
			const w = hu - 700;
			sumW += w;
			sumX += (-physicalWidthMm * 0.5 + x * pixelSpacing) * w;
			sumY += yMm * w;
		}
	}
}
const jawCenterX = sumX / sumW;
const jawCenterY = (sumY / sumW) + 25.0; // Origin in oral cavity
console.log(`Jaw ray origin: (${jawCenterX.toFixed(2)}, ${jawCenterY.toFixed(2)}) mm`);

// 2. Sample polar rays to get initial guide curve
const numRays = 180;
const rayPoints: Array<{ angle: number; r: number; x: number; y: number; peakHU: number }> = [];
for (let i = 0; i <= numRays; i++) {
	// From -5 deg to 185 deg
	const angle = (-5 + (190 * i) / numRays) * (Math.PI / 180);
	const dirX = -Math.cos(angle);
	const dirY = -Math.sin(angle);

	let bestR = 40;
	let maxHU = -1000;
	let sumWR = 0, sumW_ray = 0;

	for (let r = 15; r <= 70; r += 0.5) {
		const xm = jawCenterX + r * dirX;
		const ym = jawCenterY + r * dirY;
		const hu = sampleHU(xm, ym);
		if (hu > maxHU) {
			maxHU = hu;
			bestR = r;
		}
		if (hu >= 800) {
			const w = Math.pow(hu - 700, 1.5);
			sumWR += r * w;
			sumW_ray += w;
		}
	}
	const optR = sumW_ray > 0 ? sumWR / sumW_ray : bestR;
	rayPoints.push({
		angle,
		r: optR,
		x: jawCenterX + optR * dirX,
		y: jawCenterY + optR * dirY,
		peakHU: maxHU,
	});
}

// Smooth ray points with 5-point moving average
const smoothedGuide: Array<{ x: number; y: number }> = [];
for (let i = 0; i < rayPoints.length; i++) {
	let sx = 0, sy = 0, count = 0;
	for (let di = -3; di <= 3; di++) {
		const idx = Math.max(0, Math.min(rayPoints.length - 1, i + di));
		sx += rayPoints[idx].x;
		sy += rayPoints[idx].y;
		count++;
	}
	smoothedGuide.push({ x: sx / count, y: sy / count });
}

// 3. Resample guide curve at uniform arc-length steps ds = 0.5 mm
const uniformArc: Array<{ x: number; y: number; s: number; tx: number; ty: number; nx: number; ny: number }> = [];
let totalS = 0;
uniformArc.push({ x: smoothedGuide[0].x, y: smoothedGuide[0].y, s: 0, tx: 0, ty: 0, nx: 0, ny: 0 });

let curIdx = 0;
let curPt = { ...smoothedGuide[0] };
const stepMm = 0.5;

while (curIdx < smoothedGuide.length - 1) {
	const nextPt = smoothedGuide[curIdx + 1];
	const segDist = Math.hypot(nextPt.x - curPt.x, nextPt.y - curPt.y);
	if (segDist < stepMm) {
		curIdx++;
		curPt = { ...nextPt };
		continue;
	}
	const t = stepMm / segDist;
	curPt = {
		x: curPt.x + t * (nextPt.x - curPt.x),
		y: curPt.y + t * (nextPt.y - curPt.y),
	};
	totalS += stepMm;
	uniformArc.push({ x: curPt.x, y: curPt.y, s: totalS, tx: 0, ty: 0, nx: 0, ny: 0 });
}

// Compute tangents and normals
for (let i = 0; i < uniformArc.length; i++) {
	const prev = uniformArc[Math.max(0, i - 1)];
	const next = uniformArc[Math.min(uniformArc.length - 1, i + 1)];
	let dx = next.x - prev.x;
	let dy = next.y - prev.y;
	const len = Math.hypot(dx, dy) || 1;
	dx /= len;
	dy /= len;
	uniformArc[i].tx = dx;
	uniformArc[i].ty = dy;
	// Normal: perpendicular (pointing buccal to lingual or vice versa)
	uniformArc[i].nx = -dy;
	uniformArc[i].ny = dx;
}

// 4. Measure normal thickness W(s) and density integral D(s) along uniform arc
console.log(`Uniform arc built: ${uniformArc.length} points, total length = ${totalS.toFixed(1)} mm`);
const profilePoints: Array<{
	s: number;
	x: number;
	y: number;
	widthMm: number;
	integralHU: number;
	peakHU: number;
	centerOffsetMm: number;
}> = [];

const THRESHOLD_HU = 1000; // Tooth enamel / cortical bone boundary

for (let i = 0; i < uniformArc.length; i++) {
	const p = uniformArc[i];
	// Sample along normal: u from -8 mm to +8 mm in 0.25 mm steps
	let minU = 999;
	let maxU = -999;
	let sumU = 0;
	let sumWeight = 0;
	let sumIntegral = 0;
	let maxSampleHU = -1000;

	for (let u = -8.0; u <= 8.0; u += 0.25) {
		const sx = p.x + u * p.nx;
		const sy = p.y + u * p.ny;
		const hu = sampleHU(sx, sy);
		if (hu > maxSampleHU) maxSampleHU = hu;

		if (hu >= THRESHOLD_HU) {
			if (u < minU) minU = u;
			if (u > maxU) maxU = u;
			const w = hu - THRESHOLD_HU;
			sumU += u * w;
			sumWeight += w;
			sumIntegral += w;
		}
	}

	const widthMm = maxU >= minU ? maxU - minU : 0;
	const centerOffset = sumWeight > 0 ? sumU / sumWeight : 0;

	profilePoints.push({
		s: p.s,
		x: p.x + centerOffset * p.nx,
		y: p.y + centerOffset * p.ny,
		widthMm,
		integralHU: sumIntegral,
		peakHU: maxSampleHU,
		centerOffsetMm: centerOffset,
	});
}

// Smooth width and integral with 7-point Gaussian kernel
const smoothedProfile = profilePoints.map((p, idx) => {
	let sw = 0, si = 0, weightTotal = 0;
	const kernel = [0.06, 0.24, 0.40, 0.24, 0.06];
	for (let k = -2; k <= 2; k++) {
		const nIdx = Math.max(0, Math.min(profilePoints.length - 1, idx + k));
		const w = kernel[k + 2];
		sw += profilePoints[nIdx].widthMm * w;
		si += profilePoints[nIdx].integralHU * w;
		weightTotal += w;
	}
	return {
		...p,
		smoothWidth: sw / weightTotal,
		smoothIntegral: si / weightTotal,
	};
});

// 5. Detect constrictions (local minima of smoothWidth / smoothIntegral)
// and tooth equators (local maxima)
const minima: Array<{ s: number; x: number; y: number; width: number; integral: number }> = [];
const maxima: Array<{ s: number; x: number; y: number; width: number; integral: number }> = [];

for (let i = 2; i < smoothedProfile.length - 2; i++) {
	const prev = smoothedProfile[i - 1].smoothIntegral;
	const cur = smoothedProfile[i].smoothIntegral;
	const next = smoothedProfile[i + 1].smoothIntegral;

	// Local maximum: tooth equator
	if (cur > prev && cur >= next && cur >= 200) {
		maxima.push({
			s: smoothedProfile[i].s,
			x: smoothedProfile[i].x,
			y: smoothedProfile[i].y,
			width: smoothedProfile[i].smoothWidth,
			integral: cur,
		});
	}

	// Local minimum: interdental constriction
	if (cur < prev && cur <= next && (prev > 100 || next > 100)) {
		minima.push({
			s: smoothedProfile[i].s,
			x: smoothedProfile[i].x,
			y: smoothedProfile[i].y,
			width: smoothedProfile[i].smoothWidth,
			integral: cur,
		});
	}
}

console.log(`\nDetected ${maxima.length} tooth equators (maxima) and ${minima.length} constrictions (minima):`);
console.log("--- Tooth Equators (Beads) ---");
maxima.forEach((m, idx) => {
	console.log(`Tooth ${idx + 1}: s=${m.s.toFixed(1)}mm, x=${m.x.toFixed(1)}, y=${m.y.toFixed(1)}, width=${m.width.toFixed(1)}mm, integral=${Math.round(m.integral)}`);
});

console.log("\n--- Interdental Constrictions (Necks / Cuts) ---");
minima.forEach((m, idx) => {
	console.log(`Neck ${idx + 1}: s=${m.s.toFixed(1)}mm, x=${m.x.toFixed(1)}, y=${m.y.toFixed(1)}, width=${m.width.toFixed(1)}mm, integral=${Math.round(m.integral)}`);
});

// Let's render a diagnostic screenshot showing:
// 1. Raw slice at Z = -4.0 mm
// 2. Medial axis curve (cyan)
// 3. Constrictions (red cut lines)
// 4. Tooth centroids (green dots / numbers)
async function renderDiagnostic() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});
	const page = await browser.newPage({ viewport: { width: 640, height: 640 } });

	const wl = 1000;
	const ww = 2500;
	const low = wl - ww / 2;
	const high = wl + ww / 2;
	const rgba = new Uint8ClampedArray(width * height * 4);

	for (let i = 0; i < sliceCount; i++) {
		const hu = sliceHU[i];
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
		<html>
		<body style="margin:0; background:#000; display:flex; justify-content:center; align-items:center;">
			<canvas id="c" width="${width}" height="${height}"></canvas>
		</body>
		</html>
	`);

	await page.evaluate(({ w, h, bytes, profilePts, equators, necks, originMm, spacingMm }) => {
		const canvas = document.getElementById("c") as HTMLCanvasElement;
		const ctx = canvas.getContext("2d")!;
		const imgData = ctx.createImageData(w, h);
		imgData.data.set(new Uint8ClampedArray(bytes));
		ctx.putImageData(imgData, 0, 0);

		// Draw medial axis
		ctx.lineWidth = 2.0;
		ctx.strokeStyle = "#06b6d4";
		ctx.beginPath();
		if (profilePts.length > 0) {
			const p0x = (profilePts[0].x - originMm.x) / spacingMm.x;
			const p0y = (profilePts[0].y - originMm.y) / spacingMm.y;
			ctx.moveTo(p0x, p0y);
			for (let i = 1; i < profilePts.length; i++) {
				const px = (profilePts[i].x - originMm.x) / spacingMm.x;
				const py = (profilePts[i].y - originMm.y) / spacingMm.y;
				ctx.lineTo(px, py);
			}
			ctx.stroke();
		}

		// Draw Interdental Constrictions (Red circles)
		ctx.strokeStyle = "#f43f5e";
		ctx.lineWidth = 2.0;
		for (const n of necks) {
			const px = (n.x - originMm.x) / spacingMm.x;
			const py = (n.y - originMm.y) / spacingMm.y;
			ctx.beginPath();
			ctx.arc(px, py, 4, 0, Math.PI * 2);
			ctx.stroke();
		}

		// Draw Tooth Equators / Centroids (Lime Green circles with labels)
		for (let i = 0; i < equators.length; i++) {
			const eq = equators[i];
			const px = (eq.x - originMm.x) / spacingMm.x;
			const py = (eq.y - originMm.y) / spacingMm.y;

			ctx.beginPath();
			ctx.arc(px, py, 6, 0, Math.PI * 2);
			ctx.fillStyle = "#10b981";
			ctx.fill();
			ctx.strokeStyle = "#ffffff";
			ctx.lineWidth = 1.5;
			ctx.stroke();

			ctx.font = "bold 12px monospace";
			ctx.fillStyle = "#ffffff";
			ctx.fillText(String(i + 1), px - 4, py - 8);
		}
	}, {
		w: width,
		h: height,
		bytes: Array.from(rgba),
		profilePts: smoothedProfile,
		equators: maxima,
		necks: minima,
		originMm: { x: -physicalWidthMm * 0.5, y: -physicalHeightMm * 0.5 },
		spacingMm: { x: pixelSpacing, y: pixelSpacing },
	});

	const outDir = path.resolve("docs/screenshots/cbct_live/iterations");
	if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
	const outPath = path.join(outDir, "bead_segmentation_z_minus4.png");
	const canvasEl = await page.locator("#c");
	await canvasEl.screenshot({ path: outPath });
	console.log(`Saved bead diagnostic: ${outPath}`);

	await browser.close();
}

renderDiagnostic().catch(console.error);
