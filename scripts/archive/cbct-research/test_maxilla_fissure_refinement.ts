import { readFileSync } from "node:fs";
import path from "node:path";
import { autoDetectDentalArch, extractAxialMIPSlab, detectDentalArchCentroids } from "../apps/web/src/components/radiology/cbctAutoArchEngine.ts";
import { calculateArchTangentsAndNormals, fitSmoothDentalArchSpline } from "../apps/web/src/components/radiology/cbctArchSplineMath.ts";
import { refineHonestFdiCentroids } from "../apps/web/src/components/radiology/cbctToothCentroidDetector.ts";
import { sampleVoxelTrilinearHU } from "../apps/web/src/components/radiology/cbctMprMath.ts";

async function main() {
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

	const centerZMm = -3.0;
	const mip = extractAxialMIPSlab(volume, centerZMm, 6.0);
	const rawAnchors = detectDentalArchCentroids(mip, "maxilla");
	const roughSpline = fitSmoothDentalArchSpline(rawAnchors, 8);
	const vectorField = calculateArchTangentsAndNormals(roughSpline);

	console.log("=== TESTING FISSURE MIDPOINT ON TEETH 14..17 ===");
	for (const toothFdi of ["14", "15", "16", "17", "18"]) {
		const raw = rawAnchors.find(a => a.toothFdi === toothFdi)!;
		// Find nearest vectorField node
		let bestIdx = 0;
		let bestD = 1e9;
		for (let i = 0; i < vectorField.length; i++) {
			const d = Math.hypot(vectorField[i]!.point.x - raw.positionMm.x, vectorField[i]!.point.y - raw.positionMm.y);
			if (d < bestD) { bestD = d; bestIdx = i; }
		}
		const node = vectorField[bestIdx]!;

		let minEnamelOffset: number | null = null;
		let maxEnamelOffset: number | null = null;
		let maxHU = -1000;
		let peakOffset = 0;

		for (let offset = -6.0; offset <= 6.0; offset += 0.25) {
			const sx = node.point.x + node.normal.x * offset;
			const sy = node.point.y + node.normal.y * offset;
			const vx = (sx - volume.originMm.x) / 0.25;
			const vy = (sy - volume.originMm.y) / 0.25;
			const vz = (centerZMm - volume.originMm.z) / 0.25;
			const hu = sampleVoxelTrilinearHU(vx, vy, vz, volume);

			if (hu >= 1500) {
				if (minEnamelOffset === null) minEnamelOffset = offset;
				maxEnamelOffset = offset;
			}
			if (hu > maxHU) {
				maxHU = hu;
				peakOffset = offset;
			}
		}

		if (minEnamelOffset !== null && maxEnamelOffset !== null) {
			const midOffset = (minEnamelOffset + maxEnamelOffset) / 2.0;
			const midPt = {
				x: Number((node.point.x + node.normal.x * midOffset).toFixed(2)),
				y: Number((node.point.y + node.normal.y * midOffset).toFixed(2)),
			};
			const peakPt = {
				x: Number((node.point.x + node.normal.x * peakOffset).toFixed(2)),
				y: Number((node.point.y + node.normal.y * peakOffset).toFixed(2)),
			};
			console.log(`Tooth ${toothFdi}: maxHU = ${maxHU} | Enamel span [${minEnamelOffset.toFixed(1)}, ${maxEnamelOffset.toFixed(1)}] mm -> Fissure Midpoint: (${midPt.x}, ${midPt.y}) | Peak: (${peakPt.x}, ${peakPt.y})`);
		} else {
			console.log(`Tooth ${toothFdi}: NO ENAMEL PEAK (maxHU = ${maxHU})`);
		}
	}
}

main().catch(console.error);
