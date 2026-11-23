import { readFileSync } from "node:fs";
import path from "node:path";
import { buildVolumeFromMultiFrameDicom } from "../apps/web/src/components/radiology/realDicomVolumeLoader.ts";
import { autoDetectDentalArch, findOcclusalZPlane, extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine.ts";
import { calculateArchTangentsAndNormals } from "../apps/web/src/components/radiology/cbctArchSplineMath.ts";
import { sampleVoxelTrilinearHU } from "../apps/web/src/components/radiology/cbctMprMath.ts";

async function run() {
	const filePath = "C:\\Users\\Admin\\Downloads\\Облако Mail\\Буляков Н.З. 29.08.2026г. ОЧ.dcm";
	const buf = readFileSync(filePath);
	const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

	const volume = await buildVolumeFromMultiFrameDicom(ab);
	const mandZ = findOcclusalZPlane(volume, "mandible");
	const arch = autoDetectDentalArch(volume, "mandible", 14.0);
	const vectorField = calculateArchTangentsAndNormals(arch.splinePointsMm);

	// 1. Find midline (anterior-most point, lowest Y in CBCT coords)
	let minY = Infinity;
	let midIdx = 0;
	for (let i = 0; i < vectorField.length; i++) {
		if (vectorField[i]!.point.y < minY) {
			minY = vectorField[i]!.point.y;
			midIdx = i;
		}
	}
	const midlineDist = vectorField[midIdx]!.distanceAlongArchMm;
	console.log(`Midline at index ${midIdx}, dist = ${midlineDist.toFixed(1)} mm, (X: ${vectorField[midIdx]!.point.x.toFixed(1)}, Y: ${vectorField[midIdx]!.point.y.toFixed(1)})`);

	// 2. Sample density profile along arch
	const profile: Array<{ dist: number; maxHU: number; pt: { x: number; y: number } }> = [];
	for (let i = 0; i < vectorField.length; i++) {
		const node = vectorField[i]!;
		let maxHU = -1000;
		for (let offset = -4.0; offset <= 4.0; offset += 0.5) {
			const sx = node.point.x + node.normal.x * offset;
			const sy = node.point.y + node.normal.y * offset;
			const vx = (sx - volume.originMm.x) / volume.spacingMm.x;
			const vy = (sy - volume.originMm.y) / volume.spacingMm.y;
			const vz = (mandZ - volume.originMm.z) / volume.spacingMm.z;
			const hu = sampleVoxelTrilinearHU(vx, vy, vz, volume);
			if (hu > maxHU) maxHU = hu;
		}
		profile.push({ dist: node.distanceAlongArchMm, maxHU, pt: node.point });
	}

	// 3. Anatomical tooth widths for Mandible (mm)
	// Incisors: 5.2 mm, Canine: 7.2 mm, Premolars: 7.2 mm, Molars: 10.8 mm
	const rightTeeth = [
		{ fdi: "41", expectedSpan: 2.6 },  // from midline to center of 41
		{ fdi: "42", expectedSpan: 5.4 },  // from 41 to 42
		{ fdi: "43", expectedSpan: 7.2 },  // from 42 to 43
		{ fdi: "44", expectedSpan: 7.2 },  // from 43 to 44
		{ fdi: "45", expectedSpan: 7.2 },  // from 44 to 45
		{ fdi: "46", expectedSpan: 10.8 }, // from 45 to 46
		{ fdi: "47", expectedSpan: 10.8 }, // from 46 to 47
		{ fdi: "48", expectedSpan: 10.5 }, // from 47 to 48
	];

	const leftTeeth = [
		{ fdi: "31", expectedSpan: 2.6 },
		{ fdi: "32", expectedSpan: 5.4 },
		{ fdi: "33", expectedSpan: 7.2 },
		{ fdi: "34", expectedSpan: 7.2 },
		{ fdi: "35", expectedSpan: 7.2 },
		{ fdi: "36", expectedSpan: 10.8 },
		{ fdi: "37", expectedSpan: 10.8 },
		{ fdi: "38", expectedSpan: 10.5 },
	];

	// Find optimal position for each tooth by searching local enamel peak around expected distance
	function locateTeeth(teethSpec: typeof rightTeeth, startDist: number, direction: 1 | -1) {
		const results: any[] = [];
		let curDist = startDist;

		for (const t of teethSpec) {
			const expectedTargetDist = curDist + direction * t.expectedSpan;
			// Search window +/- 3.5 mm around expected distance
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

			// If a clear enamel peak (HU >= 1600) is found, lock onto it!
			// Otherwise fallback to expected distance
			let finalDist = expectedTargetDist;
			let isEnamelPeak = false;
			if (bestNode && bestHU >= 1600) {
				finalDist = bestNode.dist;
				isEnamelPeak = true;
			}

			// Find point on spline at finalDist
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

	console.log("\n--- Honest Anatomical Tooth Centroids for Bulyakov ---");
	for (const t of allTeeth) {
		console.log(`Tooth ${t.fdi}: dist = ${t.dist.toFixed(1)} mm | HU = ${t.maxHU} (${t.isEnamelPeak ? "PEAK LOCK" : "interpolated"}) | X: ${t.pt.x.toFixed(1)}, Y: ${t.pt.y.toFixed(1)}`);
	}
}

run().catch(console.error);
