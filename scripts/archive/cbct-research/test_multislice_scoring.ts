import { readFileSync } from "node:fs";
import path from "node:path";
import { computeOcclusalDensityProfile, extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine.ts";

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

console.log(`Loading ${depth} slices...`);
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

// Find bite plane
const profile = computeOcclusalDensityProfile(volume);
let biteZ = 0;
let maxE = 0;
for (const p of profile) {
	if (p.smoothedEnamel > maxE) {
		maxE = p.smoothedEnamel;
		biteZ = p.zMm;
	}
}
console.log(`Bite plane Z: ${biteZ} mm`);

// Multi-slice candidate evaluation function
interface SliceEvaluation {
	zMm: number;
	islandCount: number;
	avgCompactness: number;
	parabolaR2: number;
	totalScore: number;
}

function evaluateSlice(zMm: number): SliceEvaluation {
	const slab = extractAxialMIPSlab(volume, zMm, 4.0);
	const data = slab.data;

	// Binary threshold for enamel
	const mask = new Uint8Array(width * height);
	for (let i = 0; i < sliceCount; i++) {
		if (data[i] >= 1600) mask[i] = 1;
	}

	// Connected components
	const labels = new Int32Array(width * height);
	let currentLabel = 0;
	const compStats = new Map<number, { area: number; perimeter: number; sumX: number; sumY: number }>();

	for (let y = 1; y < height - 1; y++) {
		for (let x = 1; x < width - 1; x++) {
			const idx = y * width + x;
			if (mask[idx] === 1 && labels[idx] === 0) {
				currentLabel++;
				labels[idx] = currentLabel;
				const queue = [idx];
				let area = 0;
				let perimeter = 0;
				let sumX = 0;
				let sumY = 0;

				let head = 0;
				while (head < queue.length) {
					const c = queue[head++]!;
					area++;
					const cy = Math.floor(c / width);
					const cx = c % width;
					sumX += cx;
					sumY += cy;

					// Check 4-connectivity for perimeter
					let isBorder = false;
					const n4 = [
						(cy - 1) * width + cx,
						(cy + 1) * width + cx,
						cy * width + (cx - 1),
						cy * width + (cx + 1),
					];
					for (const nb of n4) {
						if (mask[nb] === 0) isBorder = true;
						else if (labels[nb] === 0) {
							labels[nb] = currentLabel;
							queue.push(nb);
						}
					}
					if (isBorder) perimeter++;
				}

				if (area >= 20 && area <= 2000) {
					compStats.set(currentLabel, { area, perimeter, sumX, sumY });
				}
			}
		}
	}

	const islands: Array<{ xMm: number; yMm: number; area: number; compactness: number }> = [];
	for (const stat of compStats.values()) {
		const cx = stat.sumX / stat.area;
		const cy = stat.sumY / stat.area;
		const xMm = volume.originMm.x + cx * pixelSpacing;
		const yMm = volume.originMm.y + cy * pixelSpacing;

		if (yMm < 15 && Math.abs(xMm) < 42) {
			const p = Math.max(1, stat.perimeter);
			const q = Math.min(1.0, (4 * Math.PI * stat.area) / (p * p));
			islands.push({ xMm, yMm, area: stat.area, compactness: q });
		}
	}

	const islandCount = islands.length;
	let avgCompactness = 0;
	if (islandCount > 0) {
		avgCompactness = islands.reduce((acc, it) => acc + it.compactness, 0) / islandCount;
	}

	// Parabola fit R^2
	let parabolaR2 = 0;
	if (islandCount >= 6) {
		// Y = Y0 + a * X^2
		let sumX4 = 0, sumX2 = 0, sumY = 0, sumX2Y = 0;
		const n = islands.length;
		for (const it of islands) {
			const x2 = it.xMm * it.xMm;
			sumX2 += x2;
			sumX4 += x2 * x2;
			sumY += it.yMm;
			sumX2Y += x2 * it.yMm;
		}
		const denom = n * sumX4 - sumX2 * sumX2;
		if (Math.abs(denom) > 1e-5) {
			const a = (n * sumX2Y - sumX2 * sumY) / denom;
			const y0 = (sumY - a * sumX2) / n;

			const meanY = sumY / n;
			let ssTot = 0;
			let ssRes = 0;
			for (const it of islands) {
				const yPred = y0 + a * it.xMm * it.xMm;
				ssTot += (it.yMm - meanY) ** 2;
				ssRes += (it.yMm - yPred) ** 2;
			}
			parabolaR2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
		}
	}

	// Island count Gaussian score around 14 (normal adult dentition)
	const countScore = Math.exp(-((islandCount - 14) ** 2) / 25);
	// Total score
	const totalScore = countScore * 0.4 + avgCompactness * 0.3 + parabolaR2 * 0.3;

	return {
		zMm,
		islandCount,
		avgCompactness: Number(avgCompactness.toFixed(3)),
		parabolaR2: Number(parabolaR2.toFixed(3)),
		totalScore: Number(totalScore.toFixed(3)),
	};
}

console.log("\n--- MANDIBLE CANDIDATES (Caudal from Bite Plane) ---");
const mandCandidates = [3.0, 4.5, 6.0, 7.0, 8.5, 10.0, 11.5];
let bestMand = { zMm: 0, totalScore: -1 };
for (const z of mandCandidates) {
	const res = evaluateSlice(biteZ + z);
	console.log(`Z = ${res.zMm.toFixed(1)} mm: Islands = ${res.islandCount}, Compactness = ${res.avgCompactness}, R2 = ${res.parabolaR2} => Score = ${res.totalScore}`);
	if (res.totalScore > bestMand.totalScore) {
		bestMand = res;
	}
}
console.log(`>> AUTOMATIC MANDIBLE WINNER: Z = ${bestMand.zMm.toFixed(1)} mm (Score = ${bestMand.totalScore})`);

console.log("\n--- MAXILLA CANDIDATES (Cranial from Bite Plane) ---");
const maxCandidates = [-3.0, -4.5, -6.0, -7.0, -8.5, -10.0];
let bestMax = { zMm: 0, totalScore: -1 };
for (const z of maxCandidates) {
	const res = evaluateSlice(biteZ + z);
	console.log(`Z = ${res.zMm.toFixed(1)} mm: Islands = ${res.islandCount}, Compactness = ${res.avgCompactness}, R2 = ${res.parabolaR2} => Score = ${res.totalScore}`);
	if (res.totalScore > bestMax.totalScore) {
		bestMax = res;
	}
}
console.log(`>> AUTOMATIC MAXILLA WINNER: Z = ${bestMax.zMm.toFixed(1)} mm (Score = ${bestMax.totalScore})`);
