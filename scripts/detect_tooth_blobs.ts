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

const mip = extractAxialMIPSlab(volume, 5.5, 6.0);

// Connected components on MIP for hu >= threshold
function findToothBlobs(threshold: number) {
	const visited = new Uint8Array(width * height);
	const blobs: Array<{
		count: number;
		peakHU: number;
		centroidX: number;
		centroidY: number;
		centroidWorldMm: { x: number; y: number };
		minX: number;
		maxX: number;
		minY: number;
		maxY: number;
	}> = [];

	for (let y = 0; y < height; y++) {
		// Only search in the dental arch region (y < 450 to exclude cervical spine)
		if (y > 450) continue;
		for (let x = 0; x < width; x++) {
			const idx = y * width + x;
			if (visited[idx]) continue;
			const hu = mip.data[idx];
			if (hu >= threshold) {
				// BFS component
				const queue: number[] = [idx];
				visited[idx] = 1;
				let count = 0;
				let sumX = 0;
				let sumY = 0;
				let sumWeight = 0;
				let peakHU = -1000;
				let minX = x;
				let maxX = x;
				let minY = y;
				let maxY = y;

				while (queue.length > 0) {
					const curr = queue.pop()!;
					const cy = Math.floor(curr / width);
					const cx = curr % width;
					const chu = mip.data[curr];
					if (chu > peakHU) peakHU = chu;

					const w = chu - threshold + 1;
					sumWeight += w;
					sumX += cx * w;
					sumY += cy * w;
					count++;

					if (cx < minX) minX = cx;
					if (cx > maxX) maxX = cx;
					if (cy < minY) minY = cy;
					if (cy > maxY) maxY = cy;

					// 4-neighbors
					const neighbors = [
						cy > 0 ? curr - width : -1,
						cy < height - 1 ? curr + width : -1,
						cx > 0 ? curr - 1 : -1,
						cx < width - 1 ? curr + 1 : -1,
					];

					for (const n of neighbors) {
						if (n >= 0 && !visited[n] && mip.data[n] >= threshold) {
							visited[n] = 1;
							queue.push(n);
						}
					}
				}

				if (count >= 15) { // filter noise speckles
					const cx = sumX / sumWeight;
					const cy = sumY / sumWeight;
					const worldX = volume.originMm.x + cx * pixelSpacing;
					const worldY = volume.originMm.y + cy * pixelSpacing;
					blobs.push({
						count,
						peakHU,
						centroidX: cx,
						centroidY: cy,
						centroidWorldMm: { x: Number(worldX.toFixed(2)), y: Number(worldY.toFixed(2)) },
						minX, maxX, minY, maxY,
					});
				}
			}
		}
	}

	return blobs;
}

for (const th of [1200, 1500, 1800, 2000]) {
	const blobs = findToothBlobs(th);
	console.log(`\n=== Blobs at Threshold >= ${th} HU (Total: ${blobs.length}) ===`);
	// Sort by X
	blobs.sort((a, b) => a.centroidX - b.centroidX);
	for (let i = 0; i < blobs.length; i++) {
		const b = blobs[i];
		console.log(`Blob ${i + 1}: count=${b.count}, peakHU=${b.peakHU}, px=(${b.centroidX.toFixed(1)}, ${b.centroidY.toFixed(1)}), worldMm=(${b.centroidWorldMm.x}, ${b.centroidWorldMm.y})`);
	}
}
