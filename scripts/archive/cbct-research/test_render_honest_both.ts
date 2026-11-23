import { readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { buildVolumeFromMultiFrameDicom } from "../apps/web/src/components/radiology/realDicomVolumeLoader.ts";
import { autoDetectDentalArch, findOcclusalZPlane, extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine.ts";
import { calculateArchTangentsAndNormals, fitSmoothDentalArchSpline, getFocalTroughBoundaryCurves } from "../apps/web/src/components/radiology/cbctArchSplineMath.ts";
import { sampleVoxelTrilinearHU } from "../apps/web/src/components/radiology/cbctMprMath.ts";

// Helper: Honest Anatomical Centroid Refinement
export function refineHonestFdiCentroids(
	volume: any,
	zMm: number,
	roughSpline: any[],
	jawType: "mandible" | "maxilla",
) {
	const vectorField = calculateArchTangentsAndNormals(roughSpline);
	if (vectorField.length === 0) return [];

	// 1. Find Midline (anterior-most point, lowest Y)
	let minY = Infinity;
	let midIdx = 0;
	for (let i = 0; i < vectorField.length; i++) {
		if (vectorField[i]!.point.y < minY) {
			minY = vectorField[i]!.point.y;
			midIdx = i;
		}
	}
	const midlineDist = vectorField[midIdx]!.distanceAlongArchMm;

	// 2. Profile density
	const profile: Array<{ dist: number; maxHU: number; pt: { x: number; y: number } }> = [];
	for (let i = 0; i < vectorField.length; i++) {
		const node = vectorField[i]!;
		let maxHU = -1000;
		for (let offset = -4.5; offset <= 4.5; offset += 0.5) {
			const sx = node.point.x + node.normal.x * offset;
			const sy = node.point.y + node.normal.y * offset;
			const vx = (sx - volume.originMm.x) / volume.spacingMm.x;
			const vy = (sy - volume.originMm.y) / volume.spacingMm.y;
			const vz = (zMm - volume.originMm.z) / volume.spacingMm.z;
			const hu = sampleVoxelTrilinearHU(vx, vy, vz, volume);
			if (hu > maxHU) maxHU = hu;
		}
		profile.push({ dist: node.distanceAlongArchMm, maxHU, pt: node.point });
	}

	// 3. Anatomical tooth spacings from Wheeler's Dental Anatomy
	const rightSpecs = jawType === "mandible" ? [
		{ fdi: "41", labelRu: "41 (Центральный резец)", span: 2.6 },
		{ fdi: "42", labelRu: "42 (Боковой резец)", span: 5.4 },
		{ fdi: "43", labelRu: "43 (Клык)", span: 7.2 },
		{ fdi: "44", labelRu: "44 (1-й премоляр)", span: 7.2 },
		{ fdi: "45", labelRu: "45 (2-й премоляр)", span: 7.2 },
		{ fdi: "46", labelRu: "46 (1-й моляр)", span: 10.8 },
		{ fdi: "47", labelRu: "47 (2-й моляр)", span: 10.8 },
		{ fdi: "48", labelRu: "48 (3-й моляр)", span: 10.5 },
	] : [
		{ fdi: "11", labelRu: "11 (Центральный резец)", span: 4.2 },
		{ fdi: "12", labelRu: "12 (Боковой резец)", span: 6.8 },
		{ fdi: "13", labelRu: "13 (Клык)", span: 7.6 },
		{ fdi: "14", labelRu: "14 (1-й премоляр)", span: 7.2 },
		{ fdi: "15", labelRu: "15 (2-й премоляр)", span: 7.2 },
		{ fdi: "16", labelRu: "16 (1-й моляр)", span: 10.2 },
		{ fdi: "17", labelRu: "17 (2-й моляр)", span: 10.0 },
		{ fdi: "18", labelRu: "18 (3-й моляр)", span: 9.5 },
	];

	const leftSpecs = jawType === "mandible" ? [
		{ fdi: "31", labelRu: "31 (Центральный резец)", span: 2.6 },
		{ fdi: "32", labelRu: "32 (Боковой резец)", span: 5.4 },
		{ fdi: "33", labelRu: "33 (Клык)", span: 7.2 },
		{ fdi: "34", labelRu: "34 (1-й премоляр)", span: 7.2 },
		{ fdi: "35", labelRu: "35 (2-й премоляр)", span: 7.2 },
		{ fdi: "36", labelRu: "36 (1-й моляр)", span: 10.8 },
		{ fdi: "37", labelRu: "37 (2-й моляр)", span: 10.8 },
		{ fdi: "38", labelRu: "38 (3-й моляр)", span: 10.5 },
	] : [
		{ fdi: "21", labelRu: "21 (Центральный резец)", span: 4.2 },
		{ fdi: "22", labelRu: "22 (Боковой резец)", span: 6.8 },
		{ fdi: "23", labelRu: "23 (Клык)", span: 7.6 },
		{ fdi: "24", labelRu: "24 (1-й премоляр)", span: 7.2 },
		{ fdi: "25", labelRu: "25 (2-й премоляр)", span: 7.2 },
		{ fdi: "26", labelRu: "26 (1-й моляр)", span: 10.2 },
		{ fdi: "27", labelRu: "27 (2-й моляр)", span: 10.0 },
		{ fdi: "28", labelRu: "28 (3-й моляр)", span: 9.5 },
	];

	function locateSide(specs: typeof rightSpecs, direction: 1 | -1, isRight: boolean) {
		const out: any[] = [];
		let curDist = midlineDist;

		for (const t of specs) {
			const expectedDist = curDist + direction * t.span;
			const wMin = expectedDist - 4.0;
			const wMax = expectedDist + 4.0;

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

			let finalDist = expectedDist;
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
						x: Number((vectorField[i]!.point.x + ratio * (vectorField[i + 1]!.point.x - vectorField[i]!.point.x)).toFixed(2)),
						y: Number((vectorField[i]!.point.y + ratio * (vectorField[i + 1]!.point.y - vectorField[i]!.point.y)).toFixed(2)),
					};
					break;
				}
			}

			out.push({
				id: `a-${t.fdi}`,
				toothFdi: t.fdi,
				labelRu: t.labelRu,
				positionMm: finalPt,
				isQuadrantRight: isRight,
				isEnamelPeak,
				maxHU: bestHU,
			});

			curDist = finalDist;
		}

		return out;
	}

	const rightTeeth = locateSide(rightSpecs, -1, true).reverse();
	const leftTeeth = locateSide(leftSpecs, 1, false);
	return [...rightTeeth, ...leftTeeth];
}

async function testBoth() {
	console.log("=== TESTING HONEST CENTROIDS ON BOTH PATIENTS ===");
	// Test on Bulyakov
	const bulyakovPath = "C:\\Users\\Admin\\Downloads\\Облако Mail\\Буляков Н.З. 29.08.2026г. ОЧ.dcm";
	const bufB = readFileSync(bulyakovPath);
	const abB = bufB.buffer.slice(bufB.byteOffset, bufB.byteOffset + bufB.byteLength);
	const volB = await buildVolumeFromMultiFrameDicom(abB);
	const mandZB = findOcclusalZPlane(volB, "mandible");
	const archB = autoDetectDentalArch(volB, "mandible", 14.0);

	const honestAnchorsB = refineHonestFdiCentroids(volB, mandZB, archB.splinePointsMm, "mandible");
	console.log(`Bulyakov honest anchors: ${honestAnchorsB.length}`);
	for (const a of honestAnchorsB) {
		console.log(`  [${a.toothFdi}] dist: (X: ${a.positionMm.x}, Y: ${a.positionMm.y}) | maxHU = ${a.maxHU} (${a.isEnamelPeak ? "PEAK" : "interpolated"})`);
	}
}

testBoth().catch(console.error);
