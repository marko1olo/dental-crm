import { readFileSync } from "node:fs";
import path from "node:path";
import { extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine.ts";

const manifestPath = path.resolve("apps/web/public/radiology/demo_cbct/manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const validSlices = manifest.slices.filter(
	(s: string) => readFileSync(path.resolve("apps/web/public/radiology/demo_cbct", s)).byteLength >= 720000
);

const width = 600;
const height = 600;
const depth = validSlices.length;
const sliceCount = width * height;
const voxelData = new Int16Array(sliceCount * depth);

for (let z = 0; z < depth; z++) {
	const buf = readFileSync(path.resolve("apps/web/public/radiology/demo_cbct", validSlices[z]));
	const raw = new Uint16Array(buf.buffer, buf.byteOffset + buf.byteLength - sliceCount * 2, sliceCount);
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

const slab = extractAxialMIPSlab(volume, -3.0, 6.0);

// Let's sample along radial rays from center (0, -10 mm) outward, covering angles from 0 to 180 degrees
const centerX = width * 0.5;
const centerY = height * 0.5 - 10.0 / pixelSpacing; // origin offset Y = -10 mm

console.log("Analyzing radial rays across Maxilla to locate central groove/fissure peaks...");

// Angles: from -170 deg (distal Q1) to -10 deg (distal Q2)
// In standard dental:
// Q1 (right side of patient, left side of image): angle ~ 180..90 deg
// Q2 (left side of patient, right side of image): angle ~ 90..0 deg
const samples: any[] = [];

for (let deg = 20; deg <= 160; deg += 5) {
	const rad = (deg * Math.PI) / 180;
	// Ray direction: cos(rad), -sin(rad) (anterior is -Y in screen coords)
	const dirX = Math.cos(rad);
	const dirY = -Math.sin(rad);

	let bestR = 0;
	let maxHU = -1000;
	let peakX = 0;
	let peakY = 0;

	// Search radii from 15 mm to 45 mm
	for (let rMm = 15; rMm <= 45; rMm += 0.5) {
		const rPx = rMm / pixelSpacing;
		const px = Math.round(centerX + dirX * rPx);
		const py = Math.round(centerY + dirY * rPx);

		if (px >= 0 && px < width && py >= 0 && py < height) {
			const hu = slab.data[py * width + px];
			if (hu > maxHU) {
				maxHU = hu;
				bestR = rMm;
				peakX = (px - centerX) * pixelSpacing;
				peakY = (py - height * 0.5) * pixelSpacing;
			}
		}
	}

	samples.push({
		deg,
		bestR,
		maxHU,
		xMm: Number(peakX.toFixed(2)),
		yMm: Number(peakY.toFixed(2)),
	});
}

for (const s of samples) {
	if (s.maxHU >= 1000) {
		console.log(`Angle ${s.deg}°: R = ${s.bestR} mm, maxHU = ${s.maxHU} -> (X: ${s.xMm} mm, Y: ${s.yMm} mm)`);
	}
}
