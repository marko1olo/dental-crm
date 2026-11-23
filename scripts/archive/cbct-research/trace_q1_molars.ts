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
const centerX = width * 0.5;
const centerY = height * 0.5 - 10.0 / pixelSpacing;

console.log("Tracing molar / tuberosity zone in Q1 (angles 150..185 deg)...");

for (let deg = 150; deg <= 185; deg += 2) {
	const rad = (deg * Math.PI) / 180;
	const dirX = Math.cos(rad);
	const dirY = -Math.sin(rad);

	let bestR = 0;
	let maxHU = -1000;
	let peakX = 0;
	let peakY = 0;

	for (let rMm = 15; rMm <= 40; rMm += 0.5) {
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

	console.log(`Angle ${deg}°: R = ${bestR} mm, maxHU = ${maxHU} -> (X: ${peakX.toFixed(1)} mm, Y: ${peakY.toFixed(1)} mm)`);
}
