import { readFileSync } from "node:fs";
import path from "node:path";
import { sampleVoxelTrilinearHU, type CbctVoxelVolume } from "../apps/web/src/components/radiology/cbctMprMath";

function loadZakharovVolume(): CbctVoxelVolume {
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
	return {
		dimensions: { width, height, depth },
		spacingMm: { x: pixelSpacing, y: pixelSpacing, z: sliceThickness },
		originMm: {
			x: -width * pixelSpacing * 0.5,
			y: -height * pixelSpacing * 0.5,
			z: -depth * sliceThickness * 0.5,
		},
		data: voxelData,
		isDisposed: false,
	};
}

// Cubic Catmull-Rom spline
function sampleSpline(pts: Array<{ x: number; y: number }>, numSamples: number) {
	// Add ghost endpoints
	const p0 = { x: pts[0]!.x + (pts[0]!.x - pts[1]!.x), y: pts[0]!.y + (pts[0]!.y - pts[1]!.y) };
	const pLast = pts[pts.length - 1]!;
	const pPrev = pts[pts.length - 2]!;
	const pEnd = { x: pLast.x + (pLast.x - pPrev.x), y: pLast.y + (pLast.y - pPrev.y) };

	const all = [p0, ...pts, pEnd];
	const result: Array<{ x: number; y: number; tX: number; tY: number; nX: number; nY: number; sMm: number }> = [];

	let sAcc = 0;
	let prevX = 0, prevY = 0;

	const numSegments = all.length - 3;
	const stepsPerSeg = Math.ceil(numSamples / numSegments);

	for (let seg = 0; seg < numSegments; seg++) {
		const c0 = all[seg]!;
		const c1 = all[seg + 1]!;
		const c2 = all[seg + 2]!;
		const c3 = all[seg + 3]!;

		const isLast = seg === numSegments - 1;
		const maxStep = isLast ? stepsPerSeg : stepsPerSeg - 1;

		for (let step = 0; step <= maxStep; step++) {
			const t = step / stepsPerSeg;
			const t2 = t * t;
			const t3 = t2 * t;

			const x = 0.5 * (
				(2 * c1.x) +
				(-c0.x + c2.x) * t +
				(2 * c0.x - 5 * c1.x + 4 * c2.x - c3.x) * t2 +
				(-c0.x + 3 * c1.x - 3 * c2.x + c3.x) * t3
			);

			const y = 0.5 * (
				(2 * c1.y) +
				(-c0.y + c2.y) * t +
				(2 * c0.y - 5 * c1.y + 4 * c2.y - c3.y) * t2 +
				(-c0.y + 3 * c1.y - 3 * c2.y + c3.y) * t3
			);

			const dx = 0.5 * (
				(-c0.x + c2.x) +
				2 * (2 * c0.x - 5 * c1.x + 4 * c2.x - c3.x) * t +
				3 * (-c0.x + 3 * c1.x - 3 * c2.x + c3.x) * t2
			);

			const dy = 0.5 * (
				(-c0.y + c2.y) +
				2 * (2 * c0.y - 5 * c1.y + 4 * c2.y - c3.y) * t +
				3 * (-c0.y + 3 * c1.y - 3 * c2.y + c3.y) * t2
			);

			const len = Math.hypot(dx, dy) || 1;
			const tX = dx / len;
			const tY = dy / len;
			const nX = -tY;
			const nY = tX;

			if (result.length > 0) sAcc += Math.hypot(x - prevX, y - prevY);
			prevX = x;
			prevY = y;

			result.push({
				x: Number(x.toFixed(2)),
				y: Number(y.toFixed(2)),
				tX: Number(tX.toFixed(4)),
				tY: Number(tY.toFixed(4)),
				nX: Number(nX.toFixed(4)),
				nY: Number(nY.toFixed(4)),
				sMm: Number(sAcc.toFixed(2)),
			});
		}
	}

	return { points: result, totalLengthMm: Number(sAcc.toFixed(1)) };
}

async function main() {
	const vol = loadZakharovVolume();
	const sp = vol.spacingMm.x;
	const origin = vol.originMm;
	const zCenterMm = -4.0;
	const zHalfSlabMm = 3.0;

	// Real patient enamel beads detected from 3D MIP:
	const enamelArchBeads = [
		{ x: -27.2, y: -4.5 },   // Distal 48 (+2.5mm extension)
		{ x: -27.5, y: -10.5 },  // Tooth 47
		{ x: -24.8, y: -22.6 },  // Tooth 46
		{ x: -23.0, y: -28.9 },  // Tooth 45
		{ x: -20.3, y: -35.6 },  // Tooth 44
		{ x: -15.8, y: -42.9 },  // Tooth 43
		{ x: -8.8, y: -46.8 },   // Tooth 42
		{ x: -2.0, y: -48.8 },   // Tooth 41
		{ x: 5.1, y: -48.8 },    // Tooth 31 / 32
		{ x: 11.5, y: -42.4 },   // Tooth 33
		{ x: 16.5, y: -34.0 },   // Tooth 34
		{ x: 21.2, y: -36.2 },   // Tooth 35
		{ x: 23.6, y: -25.8 },   // Tooth 36
		{ x: 28.9, y: -8.2 },    // Tooth 37
		{ x: 30.5, y: -3.0 },    // Distal 38 (+2.5mm extension)
	];

	const spline = sampleSpline(enamelArchBeads, 160);
	console.log("Total spline samples:", spline.points.length, "Total length:", spline.totalLengthMm);

	// Test HU density along the entire spline
	let sumHU = 0, count = 0;
	for (const pt of spline.points) {
		let maxHU = -1000;
		for (let z = zCenterMm - zHalfSlabMm; z <= zCenterMm + zHalfSlabMm; z += 0.5) {
			const vx = (pt.x - origin.x) / sp;
			const vy = (pt.y - origin.y) / sp;
			const vz = (z - origin.z) / sp;
			const hu = sampleVoxelTrilinearHU(vx, vy, vz, vol);
			if (hu > maxHU) maxHU = hu;
		}
		if (maxHU > 500) sumHU += maxHU;
		count++;
	}

	console.log(`Mean HU along Adaptive Enamel Bead Spline: ${(sumHU / count).toFixed(1)} HU (Total points: ${count})`);
}

main().catch(console.error);
