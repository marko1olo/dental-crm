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

// Extract clean MIP slab around mandibular crowns: centerZ = 5.5mm, thickness = 6.0mm
const mip = extractAxialMIPSlab(volume, 5.5, 6.0);

// Let's find local maxima in 2D
// A pixel is a local maximum if it is >= all pixels in a radius of R mm (e.g. 3 mm = 12 voxels)
const radiusPx = 14;
const minPeakHU = 1800; // Enamel peak
const peaks: Array<{ px: number; py: number; worldX: number; worldY: number; hu: number }> = [];

for (let y = radiusPx; y < height - radiusPx; y++) {
	if (y > 380) continue; // Exclude vertebrae
	for (let x = radiusPx; x < width - radiusPx; x++) {
		const val = mip.data[y * width + x];
		if (val < minPeakHU) continue;

		let isMax = true;
		for (let dy = -radiusPx; dy <= radiusPx; dy++) {
			for (let dx = -radiusPx; dx <= radiusPx; dx++) {
				if (dx * dx + dy * dy > radiusPx * radiusPx) continue;
				if (dx === 0 && dy === 0) continue;
				const nVal = mip.data[(y + dy) * width + (x + dx)];
				if (nVal > val || (nVal === val && (dy < 0 || (dy === 0 && dx < 0)))) {
					isMax = false;
					break;
				}
			}
			if (!isMax) break;
		}

		if (isMax) {
			const worldX = volume.originMm.x + x * pixelSpacing;
			const worldY = volume.originMm.y + y * pixelSpacing;
			peaks.push({
				px: x,
				py: y,
				worldX: Number(worldX.toFixed(2)),
				worldY: Number(worldY.toFixed(2)),
				hu: val,
			});
		}
	}
}

console.log(`Found ${peaks.length} enamel peaks at radius=${radiusPx}px (3.5mm), minHU=${minPeakHU}:`);
// Sort anterior-to-posterior or along arch
peaks.sort((a, b) => a.worldX - b.worldX);
for (const p of peaks) {
	console.log(`Peak: px=(${p.px}, ${p.py}), world=(${p.worldX}, ${p.worldY}) mm, HU=${p.hu}`);
}
