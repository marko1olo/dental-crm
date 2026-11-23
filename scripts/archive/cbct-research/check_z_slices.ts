import { readFileSync } from "node:fs";
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

console.log("Analyzing slices at Z = -7.0mm vs Z = +7.0mm...");

function inspectSliceZ(zMm: number) {
	const zIdx = Math.max(0, Math.min(depth - 1, Math.round((zMm - originZ) / sliceThickness)));
	const base = zIdx * sliceCount;
	let c1500 = 0, c2000 = 0;
	for (let i = 0; i < sliceCount; i++) {
		const hu = voxelData[base + i];
		if (hu >= 1500) c1500++;
		if (hu >= 2000) c2000++;
	}
	console.log(`z = ${zMm} mm (slice ${zIdx}): count>=1500: ${c1500}, count>=2000: ${c2000}`);
}

for (const z of [-8, -7, -6, -5, -4, 0, 4, 5, 6, 7, 8]) {
	inspectSliceZ(z);
}
