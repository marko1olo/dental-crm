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

console.log("Checking entire ramus and retromolar region for any impacted 48/38 teeth (HU >= 2000)...");
let count48 = 0;
let count38 = 0;

for (let z = 0; z < depth; z++) {
	const base = z * sliceCount;
	for (let y = 0; y < height; y++) {
		const worldY = -physicalHeightMm * 0.5 + y * pixelSpacing;
		// Retromolar / ramus area: Y > -5 mm
		if (worldY < -5.0 || worldY > 30.0) continue;
		for (let x = 0; x < width; x++) {
			const worldX = -physicalWidthMm * 0.5 + x * pixelSpacing;
			const hu = voxelData[base + y * width + x];
			if (hu >= 2000) {
				// Right ramus/retromolar: worldX < -28
				if (worldX < -26.0) count48++;
				// Left ramus/retromolar: worldX > 28
				if (worldX > 26.0) count38++;
			}
		}
	}
}

console.log(`Voxels with HU >= 2000 in retromolar/ramus zone (Y > -5mm): Right (48 region): ${count48}, Left (38 region): ${count38}`);
