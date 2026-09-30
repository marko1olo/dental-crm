import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

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

console.log(`Loading ${depth} slices...`);
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
const originZ = -physicalDepthMm * 0.5;

function getSliceIndexForZMm(zMm: number): number {
	return Math.max(0, Math.min(depth - 1, Math.round((zMm - originZ) / sliceThickness)));
}

// Let's inspect density features around different Z:
// E.g. zMm = -8, -6, -4, -2, 0, +2, +4, +6, +8
const testZ = [-10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10];
for (const z of testZ) {
	const zIdx = getSliceIndexForZMm(z);
	const base = zIdx * sliceCount;
	let count1500 = 0;
	let count2000 = 0;
	let count800 = 0;
	let meanY1500 = 0;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const hu = voxelData[base + y * width + x];
			if (hu >= 800) count800++;
			if (hu >= 1500) {
				count1500++;
				meanY1500 += y;
			}
			if (hu >= 2000) count2000++;
		}
	}
	if (count1500 > 0) meanY1500 /= count1500;
	console.log(`z = ${z} mm (idx ${zIdx}): count>=800: ${count800}, count>=1500: ${count1500}, count>=2000: ${count2000}, meanY(>=1500): ${meanY1500.toFixed(1)}`);
}
