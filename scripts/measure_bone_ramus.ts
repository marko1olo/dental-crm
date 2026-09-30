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

// Mandibular crown layer Z = +7.0 mm (Slab = 6 mm)
const mip = extractAxialMIPSlab(volume, 7.0, 6.0);

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

console.log("=== MEASURING MANDIBULAR BONE CROSS-SECTIONS AT POSTERIOR Y ===");

// Measure bone center on Right Side (X < 0) for Y from 0 to 30 mm
console.log("\n--- RIGHT RAMUS / ANGLE (X < 0) ---");
for (let y = 0; y <= 30; y += 5) {
	// Search in range X in [-45, -20]
	let sumW = 0, sumWX = 0, maxHU = -1000, bestX = 0;
	let xInner = 0, xOuter = 0, foundInner = false;

	for (let x = -20; x >= -48; x -= 0.25) {
		const hu = sampleMIP(x, y);
		if (hu > maxHU) {
			maxHU = hu;
			bestX = x;
		}
		if (hu >= 500) {
			const w = hu - 400;
			sumW += w;
			sumWX += w * x;
			if (!foundInner) {
				xInner = x;
				foundInner = true;
			}
			xOuter = x;
		}
	}
	const comX = sumW > 0 ? sumWX / sumW : bestX;
	const midX = foundInner ? (xInner + xOuter) / 2 : comX;
	const boneWidth = foundInner ? Math.abs(xOuter - xInner) : 0;
	console.log(`Y = +${y} mm: Bone [${xInner.toFixed(1)} .. ${xOuter.toFixed(1)}], Width = ${boneWidth.toFixed(1)} mm, CenterOfBone = ${midX.toFixed(1)} mm, Peak HU = ${maxHU}`);
}

// Measure bone center on Left Side (X > 0) for Y from 0 to 30 mm
console.log("\n--- LEFT RAMUS / ANGLE (X > 0) ---");
for (let y = 0; y <= 30; y += 5) {
	// Search in range X in [+20, +48]
	let sumW = 0, sumWX = 0, maxHU = -1000, bestX = 0;
	let xInner = 0, xOuter = 0, foundInner = false;

	for (let x = 20; x <= 48; x += 0.25) {
		const hu = sampleMIP(x, y);
		if (hu > maxHU) {
			maxHU = hu;
			bestX = x;
		}
		if (hu >= 500) {
			const w = hu - 400;
			sumW += w;
			sumWX += w * x;
			if (!foundInner) {
				xInner = x;
				foundInner = true;
			}
			xOuter = x;
		}
	}
	const comX = sumW > 0 ? sumWX / sumW : bestX;
	const midX = foundInner ? (xInner + xOuter) / 2 : comX;
	const boneWidth = foundInner ? Math.abs(xOuter - xInner) : 0;
	console.log(`Y = +${y} mm: Bone [${xInner.toFixed(1)} .. ${xOuter.toFixed(1)}], Width = ${boneWidth.toFixed(1)} mm, CenterOfBone = ${midX.toFixed(1)} mm, Peak HU = ${maxHU}`);
}
