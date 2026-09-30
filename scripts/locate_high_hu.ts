import { readFileSync } from "node:fs";
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

console.log("Analyzing high HU distribution in retromolar area across Z...");
for (let z = 0; z < depth; z += 5) {
	const zMm = originZ + z * sliceThickness;
	const base = z * sliceCount;
	let cR = 0;
	let cL = 0;
	for (let y = 0; y < height; y++) {
		const worldY = -physicalHeightMm * 0.5 + y * pixelSpacing;
		if (worldY < -5.0 || worldY > 30.0) continue;
		for (let x = 0; x < width; x++) {
			const worldX = -physicalWidthMm * 0.5 + x * pixelSpacing;
			const hu = voxelData[base + y * width + x];
			if (hu >= 2000) {
				if (worldX < -26.0) cR++;
				if (worldX > 26.0) cL++;
			}
		}
	}
	if (cR > 0 || cL > 0) {
		console.log(`z = ${zMm.toFixed(2)} mm (idx ${z}): cR = ${cR}, cL = ${cL}`);
	}
}
