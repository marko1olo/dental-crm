import { readFileSync } from "node:fs";
import path from "node:path";
import { autoDetectDentalArch, findOcclusalZPlane } from "../apps/web/src/components/radiology/cbctAutoArchEngine.ts";
import { calculateArchTangentsAndNormals } from "../apps/web/src/components/radiology/cbctArchSplineMath.ts";
import { sampleVoxelTrilinearHU } from "../apps/web/src/components/radiology/cbctMprMath.ts";

async function run() {
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

	const centerZMm = -3.0; // Maxilla occlusal plane
	const arch = autoDetectDentalArch(volume, "maxilla", 14.0);
	const vectorField = calculateArchTangentsAndNormals(arch.splinePointsMm);

	// Midline
	let minY = Infinity;
	let midIdx = 0;
	for (let i = 0; i < vectorField.length; i++) {
		if (vectorField[i]!.point.y < minY) {
			minY = vectorField[i]!.point.y;
			midIdx = i;
		}
	}
	const midlineDist = vectorField[midIdx]!.distanceAlongArchMm;
	console.log(`Zakharov Maxilla Midline at index ${midIdx}, dist = ${midlineDist.toFixed(1)} mm, (X: ${vectorField[midIdx]!.point.x.toFixed(1)}, Y: ${vectorField[midIdx]!.point.y.toFixed(1)})`);

	// Density profile
	const profile: Array<{ dist: number; maxHU: number; pt: { x: number; y: number } }> = [];
	for (let i = 0; i < vectorField.length; i++) {
		const node = vectorField[i]!;
		let maxHU = -1000;
		for (let offset = -4.0; offset <= 4.0; offset += 0.5) {
			const sx = node.point.x + node.normal.x * offset;
			const sy = node.point.y + node.normal.y * offset;
			const vx = (sx - volume.originMm.x) / volume.spacingMm.x;
			const vy = (sy - volume.originMm.y) / volume.spacingMm.y;
			const vz = (centerZMm - volume.originMm.z) / volume.spacingMm.z;
			const hu = sampleVoxelTrilinearHU(vx, vy, vz, volume);
			if (hu > maxHU) maxHU = hu;
		}
		profile.push({ dist: node.distanceAlongArchMm, maxHU, pt: node.point });
	}

	// Maxilla teeth widths:
	// Incisors: 11/21 = 8.5 mm, 12/22 = 6.5 mm, Canines: 7.5 mm, Premolars: 7.0 mm, Molars: 10.0 mm
	const rightTeeth = [
		{ fdi: "11", expectedSpan: 4.2 },
		{ fdi: "12", expectedSpan: 6.8 },
		{ fdi: "13", expectedSpan: 7.6 },
		{ fdi: "14", expectedSpan: 7.2 },
		{ fdi: "15", expectedSpan: 7.2 },
		{ fdi: "16", expectedSpan: 10.2 },
		{ fdi: "17", expectedSpan: 10.0 },
		{ fdi: "18", expectedSpan: 9.5 },
	];

	const leftTeeth = [
		{ fdi: "21", expectedSpan: 4.2 },
		{ fdi: "22", expectedSpan: 6.8 },
		{ fdi: "23", expectedSpan: 7.6 },
		{ fdi: "24", expectedSpan: 7.2 },
		{ fdi: "25", expectedSpan: 7.2 },
		{ fdi: "26", expectedSpan: 10.2 },
		{ fdi: "27", expectedSpan: 10.0 },
		{ fdi: "28", expectedSpan: 9.5 },
	];

	function locateTeeth(teethSpec: typeof rightTeeth, startDist: number, direction: 1 | -1) {
		const results: any[] = [];
		let curDist = startDist;

		for (const t of teethSpec) {
			const expectedTargetDist = curDist + direction * t.expectedSpan;
			const wMin = expectedTargetDist - 3.5;
			const wMax = expectedTargetDist + 3.5;

			let bestNode: any = null;
			let bestHU = -1000;

			for (const p of profile) {
				if (p.dist >= wMin && p.dist <= wMax) {
					if (p.maxHU > bestHU) {
						bestHU = p.maxHU;
						bestNode = p;
					}
				}
			}

			let finalDist = expectedTargetDist;
			let isEnamelPeak = false;
			if (bestNode && bestHU >= 1600) {
				finalDist = bestNode.dist;
				isEnamelPeak = true;
			}

			let finalPt = vectorField[0]!.point;
			for (let i = 0; i < vectorField.length - 1; i++) {
				if (finalDist >= vectorField[i]!.distanceAlongArchMm && finalDist <= vectorField[i + 1]!.distanceAlongArchMm) {
					const ratio = (finalDist - vectorField[i]!.distanceAlongArchMm) /
						(vectorField[i + 1]!.distanceAlongArchMm - vectorField[i]!.distanceAlongArchMm);
					finalPt = {
						x: vectorField[i]!.point.x + ratio * (vectorField[i + 1]!.point.x - vectorField[i]!.point.x),
						y: vectorField[i]!.point.y + ratio * (vectorField[i + 1]!.point.y - vectorField[i]!.point.y),
					};
					break;
				}
			}

			results.push({
				fdi: t.fdi,
				dist: finalDist,
				isEnamelPeak,
				maxHU: bestHU,
				pt: finalPt,
			});

			curDist = finalDist;
		}

		return results;
	}

	const rightLocated = locateTeeth(rightTeeth, midlineDist, -1).reverse();
	const leftLocated = locateTeeth(leftTeeth, midlineDist, 1);
	const allTeeth = [...rightLocated, ...leftLocated];

	console.log("\n--- Honest Anatomical Tooth Centroids for Zakharov Maxilla ---");
	for (const t of allTeeth) {
		console.log(`Tooth ${t.fdi}: dist = ${t.dist.toFixed(1)} mm | HU = ${t.maxHU} (${t.isEnamelPeak ? "PEAK LOCK" : "DEFECT/INTERPOLATED"}) | X: ${t.pt.x.toFixed(1)}, Y: ${t.pt.y.toFixed(1)}`);
	}
}

run().catch(console.error);
