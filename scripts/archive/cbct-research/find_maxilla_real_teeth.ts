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

// Extract axial MIP slab around Z = -3.0 mm (maxilla)
const slab = extractAxialMIPSlab(volume, -3.0, 6.0);
console.log("Slab extracted. Searching high-density enamel clusters (HU >= 2000)...");

// Grid search for high HU blobs in quadrant 1 (X < 0, Y < 0 in physical mm)
// Physical mm: X from -60 to 0, Y from -60 to 10
const clusters: Array<{ xMm: number; yMm: number; maxHU: number; meanHU: number; count: number }> = [];
const visited = new Uint8Array(width * height);

for (let y = 50; y < height - 50; y++) {
	for (let x = 50; x < width - 50; x++) {
		const idx = y * width + x;
		if (visited[idx]) continue;

		const hu = slab.data[idx];
		if (hu >= 1800) {
			// Flood fill cluster
			let sumX = 0, sumY = 0, count = 0, maxHU = -1000, sumHU = 0;
			const queue = [idx];
			visited[idx] = 1;

			while (queue.length > 0) {
				const cur = queue.pop()!;
				const cy = Math.floor(cur / width);
				const cx = cur % width;
				const curHU = slab.data[cur];

				sumX += cx;
				sumY += cy;
				sumHU += curHU;
				if (curHU > maxHU) maxHU = curHU;
				count++;

				for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
					const nx = cx + dx;
					const ny = cy + dy;
					if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
						const nidx = ny * width + nx;
						if (!visited[nidx] && slab.data[nidx] >= 1600) {
							visited[nidx] = 1;
							queue.push(nidx);
						}
					}
				}
			}

			if (count >= 20) {
				const avgX = sumX / count;
				const avgY = sumY / count;
				const xMm = Number(((avgX - width * 0.5) * pixelSpacing).toFixed(2));
				const yMm = Number(((avgY - height * 0.5) * pixelSpacing).toFixed(2));
				clusters.push({
					xMm,
					yMm,
					maxHU,
					meanHU: Math.round(sumHU / count),
					count,
				});
			}
		}
	}
}

console.log(`Found ${clusters.length} enamel clusters:`);
clusters.sort((a, b) => a.xMm - b.xMm);
for (const c of clusters) {
	console.log(`  X: ${c.xMm.toFixed(1)} mm, Y: ${c.yMm.toFixed(1)} mm | count: ${c.count}, maxHU: ${c.maxHU}, meanHU: ${c.meanHU}`);
}
