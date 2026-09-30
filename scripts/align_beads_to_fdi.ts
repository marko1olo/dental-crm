import { readFileSync } from "node:fs";
import path from "node:path";
import { extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine.ts";

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

const volume: any = {
	dimensions: { width, height, depth },
	spacingMm: { x: pixelSpacing, y: pixelSpacing, z: sliceThickness },
	originMm: {
		x: -physicalWidthMm * 0.5,
		y: -physicalHeightMm * 0.5,
		z: -physicalDepthMm * 0.5,
	},
	data: voxelData,
	isDisposed: false,
};

// Test MIP around Z = 5.5 mm (mandibular crowns)
const mip = extractAxialMIPSlab(volume, 5.5, 7.0);

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

// Fit parabola through tooth ridge
// Apex
let apexX = 0, apexY = -52;
let maxHU = -1000;
for (let y = -58; y <= -46; y += 0.5) {
	for (let x = -8; x <= 8; x += 0.5) {
		const hu = sampleMIP(x, y);
		if (hu > maxHU) {
			maxHU = hu;
			apexX = x;
			apexY = y;
		}
	}
}

// Parabola: Y = apexY + a * (X - apexX)^2
// Determine a by fitting to the 1st molars (X ~ +/- 23mm, Y ~ -22mm)
// a = (-22 - apexY) / (23^2) = (-22 - (-52)) / 529 = 30 / 529 = 0.0567
const a = 0.055;
console.log(`Parabola Apex: (${apexX.toFixed(1)}, ${apexY.toFixed(1)}) mm, a = ${a}`);

// Sample arc along this parabola from X = -28 to +28
const arcPts: Array<{ x: number; y: number; s: number }> = [];
let sAcc = 0;
let prevPt = { x: -28.0, y: apexY + a * (-28.0 - apexX) ** 2 };
arcPts.push({ ...prevPt, s: 0 });

for (let x = -27.8; x <= 28.0; x += 0.2) {
	const y = apexY + a * (x - apexX) ** 2;
	const ds = Math.hypot(x - prevPt.x, y - prevPt.y);
	sAcc += ds;
	const pt = { x, y, s: sAcc };
	arcPts.push(pt);
	prevPt = pt;
}

console.log(`Parabolic arc built: length = ${sAcc.toFixed(1)} mm`);

// Measure normal density profile at each arc point
interface ProfileSample {
	s: number;
	x: number;
	y: number;
	width: number;
	integral: number;
	peakHU: number;
	normalOffsetX: number;
	normalOffsetY: number;
}

const profile: ProfileSample[] = [];
for (let i = 0; i < arcPts.length; i++) {
	const cur = arcPts[i];
	const prev = arcPts[Math.max(0, i - 1)];
	const next = arcPts[Math.min(arcPts.length - 1, i + 1)];
	let tx = next.x - prev.x;
	let ty = next.y - prev.y;
	const len = Math.hypot(tx, ty) || 1;
	tx /= len;
	ty /= len;
	const nx = -ty;
	const ny = tx;

	let count = 0;
	let sumU = 0;
	let sumW = 0;
	let maxVal = -1000;

	for (let u = -7.0; u <= 7.0; u += 0.2) {
		const hu = sampleMIP(cur.x + u * nx, cur.y + u * ny);
		if (hu > maxVal) maxVal = hu;
		if (hu >= 1100) {
			count++;
			const w = hu - 1000;
			sumU += u * w;
			sumW += w;
		}
	}

	const uOpt = sumW > 0 ? sumU / sumW : 0;
	profile.push({
		s: cur.s,
		x: cur.x + uOpt * nx,
		y: cur.y + uOpt * ny,
		width: count * 0.2,
		integral: sumW,
		peakHU: maxVal,
		normalOffsetX: uOpt * nx,
		normalOffsetY: uOpt * ny,
	});
}

// 1D Gaussian smooth profile
const smoothed = profile.map((p, idx) => {
	let sw = 0, count = 0;
	for (let di = -5; di <= 5; di++) {
		const nIdx = Math.max(0, Math.min(profile.length - 1, idx + di));
		sw += profile[nIdx].integral;
		count++;
	}
	return { ...p, smoothIntegral: sw / count };
});

// Detect peaks (tooth bodies) and valleys (interdental necks)
const peaks: typeof smoothed = [];
const valleys: typeof smoothed = [];

for (let i = 2; i < smoothed.length - 2; i++) {
	const cur = smoothed[i].smoothIntegral;
	const prev = smoothed[i - 1].smoothIntegral;
	const next = smoothed[i + 1].smoothIntegral;

	if (cur > prev && cur >= next && cur >= 2000) {
		peaks.push(smoothed[i]);
	}
	if (cur < prev && cur <= next) {
		valleys.push(smoothed[i]);
	}
}

console.log(`\nDetected ${peaks.length} tooth body peaks:`);
peaks.forEach((pk, idx) => {
	console.log(`Peak ${idx + 1}: s=${pk.s.toFixed(1)}mm, x=${pk.x.toFixed(1)}, y=${pk.y.toFixed(1)}, width=${pk.width.toFixed(1)}mm, integral=${Math.round(pk.smoothIntegral)}`);
});

console.log(`\nDetected ${valleys.length} interdental constrictions (valleys):`);
valleys.forEach((vl, idx) => {
	console.log(`Valley ${idx + 1}: s=${vl.s.toFixed(1)}mm, x=${vl.x.toFixed(1)}, y=${vl.y.toFixed(1)}, width=${vl.width.toFixed(1)}mm, integral=${Math.round(vl.smoothIntegral)}`);
});
