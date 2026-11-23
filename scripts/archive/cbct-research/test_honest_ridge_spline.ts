import { readFileSync } from "node:fs";
import path from "node:path";
import { buildVolumeFromMultiFrameDicom } from "../apps/web/src/components/radiology/realDicomVolumeLoader.ts";
import { extractAxialMIPSlab, findOcclusalZPlane, sampleMipHUContinuous } from "../apps/web/src/components/radiology/cbctAutoArchEngine.ts";
import { calculateArchTangentsAndNormals, fitSmoothDentalArchSpline, DentalArchAnchor } from "../apps/web/src/components/radiology/cbctArchSplineMath.ts";
import { sampleVoxelTrilinearHU } from "../apps/web/src/components/radiology/cbctMprMath.ts";

// Pure continuous polar ridge tracer: casts 37 rays from -10 to 190 deg (step 5 deg)
export function traceContinuousRidgeContour(mip: any, jawType: "mandible" | "maxilla") {
	// Find jaw center from density
	let weightedX = 0, weightedY = 0, totalWeight = 0;
	for (let y = 0; y < mip.height; y += 4) {
		const worldY = mip.originMm.y + y * mip.spacingMm.y;
		const rowOffset = y * mip.width;
		for (let x = 0; x < mip.width; x += 4) {
			const hu = mip.data[rowOffset + x];
			if (hu >= 600) {
				const w = Math.pow(hu - 400, 1.2);
				totalWeight += w;
				weightedX += w * (mip.originMm.x + x * mip.spacingMm.x);
				weightedY += w * worldY;
			}
		}
	}
	const jawCenterX = totalWeight > 100 ? weightedX / totalWeight : 0;
	const teethCenterY = totalWeight > 100 ? weightedY / totalWeight : -25;
	const jawCenterY = teethCenterY + 28.0; // Origin in oral cavity

	// Cast dense rays: step 4 deg
	const ridgePoints: Array<{ x: number; y: number; r: number; theta: number }> = [];
	const angleStartDeg = jawType === "maxilla" ? 0 : -10;
	const angleEndDeg = jawType === "maxilla" ? 180 : 190;
	const stepDeg = 4;

	for (let deg = angleStartDeg; deg <= angleEndDeg; deg += stepDeg) {
		const rad = (deg * Math.PI) / 180;
		const dirX = -Math.cos(rad);
		const dirY = -Math.sin(rad);

		let maxHU = -1000;
		let bestR = 40.0;
		for (let r = 15.0; r <= 70.0; r += 0.5) {
			const sx = jawCenterX + r * dirX;
			const sy = jawCenterY + r * dirY;
			const hu = sampleMipHUContinuous(mip, sx, sy);
			if (hu > maxHU) {
				maxHU = hu;
				bestR = r;
			}
		}
		// Centroid around peak
		let sumW = 0, sumWR = 0;
		for (let r = Math.max(15.0, bestR - 5.0); r <= Math.min(70.0, bestR + 5.0); r += 0.5) {
			const sx = jawCenterX + r * dirX;
			const sy = jawCenterY + r * dirY;
			const hu = sampleMipHUContinuous(mip, sx, sy);
			if (hu >= 500) {
				const w = hu - 400;
				sumW += w;
				sumWR += w * r;
			}
		}
		const finalR = sumW > 0 ? sumWR / sumW : bestR;
		ridgePoints.push({
			x: Number((jawCenterX + finalR * dirX).toFixed(2)),
			y: Number((jawCenterY + finalR * dirY).toFixed(2)),
			r: finalR,
			theta: rad,
		});
	}

	return { jawCenterX, jawCenterY, ridgePoints };
}

async function run() {
	console.log("=== HONEST ANATOMICAL ARCH ON ZAKHAROV (MAXILLA) ===");
	const manifestPath = path.resolve("apps/web/public/radiology/demo_cbct/manifest.json");
	const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
	const validSlices = manifest.slices.filter(
		(s: string) => readFileSync(path.resolve("apps/web/public/radiology/demo_cbct", s)).byteLength >= 720000
	);

	const width = 600, height = 600, depth = validSlices.length, sliceCount = width * height;
	const voxelData = new Int16Array(sliceCount * depth);
	for (let z = 0; z < depth; z++) {
		const buf = readFileSync(path.resolve("apps/web/public/radiology/demo_cbct", validSlices[z]));
		const raw = new Uint16Array(buf.buffer, buf.byteOffset + buf.byteLength - sliceCount * 2, sliceCount);
		const base = z * sliceCount;
		for (let i = 0; i < sliceCount; i++) voxelData[base + i] = (raw[i] || 0) - 1000;
	}
	const volumeZ: any = {
		dimensions: { width, height, depth },
		spacingMm: { x: 0.25, y: 0.25, z: 0.25 },
		originMm: { x: -75, y: -75, z: -depth * 0.25 * 0.5 },
		data: voxelData,
		isDisposed: false,
	};
	const mipZ = extractAxialMIPSlab(volumeZ, -3.0, 6.0);
	const ridgeZ = traceContinuousRidgeContour(mipZ, "maxilla");
	console.log(`Zakharov continuous ridge points: ${ridgeZ.ridgePoints.length}`);

	// Smooth spline along the continuous ridge
	const roughSpline = fitSmoothDentalArchSpline(
		ridgeZ.ridgePoints.map((p, idx) => ({
			id: `r-${idx}`,
			toothFdi: String(idx),
			labelRu: `R-${idx}`,
			positionMm: { x: p.x, y: p.y },
			isQuadrantRight: idx < ridgeZ.ridgePoints.length / 2,
		})),
		6
	);
	const vf = calculateArchTangentsAndNormals(roughSpline);

	// Find true anatomical midline: anterior apex intersecting the sagittal symmetry plane (X ~ 0)
	let minY = Infinity;
	for (let i = 0; i < vf.length; i++) {
		if (vf[i]!.point.y < minY) minY = vf[i]!.point.y;
	}
	let bestMidIdx = 0;
	let minAbsX = Infinity;
	for (let i = 0; i < vf.length; i++) {
		if (vf[i]!.point.y <= minY + 3.0) {
			const absX = Math.abs(vf[i]!.point.x);
			if (absX < minAbsX) {
				minAbsX = absX;
				bestMidIdx = i;
			}
		}
	}
	const midlineDist = vf[bestMidIdx]!.distanceAlongArchMm;
	console.log(`Zakharov True Anatomical Midline: at dist = ${midlineDist.toFixed(1)} mm, (X: ${vf[bestMidIdx]!.point.x.toFixed(1)}, Y: ${vf[bestMidIdx]!.point.y.toFixed(1)})`);

	// Now profile along vf
	const profile: Array<{ dist: number; maxHU: number; buccalOffset: number; palatalOffset: number; fissurePt: { x: number; y: number } }> = [];
	for (let i = 0; i < vf.length; i++) {
		const node = vf[i]!;
		let maxHU = -1000;
		let minB = 0, maxP = 0, foundEnamel = false;
		for (let offset = -7.0; offset <= 7.0; offset += 0.25) {
			const sx = node.point.x + node.normal.x * offset;
			const sy = node.point.y + node.normal.y * offset;
			const vx = (sx - volumeZ.originMm.x) / 0.25;
			const vy = (sy - volumeZ.originMm.y) / 0.25;
			const vz = (-3.0 - volumeZ.originMm.z) / 0.25;
			const hu = sampleVoxelTrilinearHU(vx, vy, vz, volumeZ);
			if (hu > maxHU) maxHU = hu;
			if (hu >= 1500) {
				if (!foundEnamel) { minB = offset; foundEnamel = true; }
				maxP = offset;
			}
		}
		const midOff = foundEnamel ? (minB + maxP) / 2.0 : 0;
		const fissurePt = {
			x: Number((node.point.x + node.normal.x * midOff).toFixed(2)),
			y: Number((node.point.y + node.normal.y * midOff).toFixed(2)),
		};
		profile.push({ dist: node.distanceAlongArchMm, maxHU, buccalOffset: minB, palatalOffset: maxP, fissurePt });
	}

	const maxillaSpecs = [
		{ fdi: "11", span: 4.2 },
		{ fdi: "12", span: 6.8 },
		{ fdi: "13", span: 7.6 },
		{ fdi: "14", span: 7.2 },
		{ fdi: "15", span: 7.2 },
		{ fdi: "16", span: 10.2 },
		{ fdi: "17", span: 10.0 },
		{ fdi: "18", span: 9.5 },
	];

	console.log("\nFitting Right Quadrant (11..18):");
	let curD = midlineDist;
	for (const t of maxillaSpecs) {
		const targetD = curD - t.span;
		// Search window +/- 4 mm
		let bestP = null;
		let bestHU = -1000;
		for (const p of profile) {
			if (p.dist >= targetD - 4.0 && p.dist <= targetD + 4.0) {
				if (p.maxHU > bestHU) {
					bestHU = p.maxHU;
					bestP = p;
				}
			}
		}
		let pt = vf[0]!.point;
		let finalD = targetD;
		let status = "ridge";
		if (bestP && bestHU >= 1600) {
			pt = bestP.fissurePt;
			finalD = bestP.dist;
			status = `PEAK (${bestHU} HU)`;
		} else {
			// Find on vf
			for (let i = 0; i < vf.length - 1; i++) {
				if (targetD >= vf[i]!.distanceAlongArchMm && targetD <= vf[i + 1]!.distanceAlongArchMm) {
					const r = (targetD - vf[i]!.distanceAlongArchMm) / (vf[i + 1]!.distanceAlongArchMm - vf[i]!.distanceAlongArchMm);
					pt = {
						x: Number((vf[i]!.point.x + r * (vf[i + 1]!.point.x - vf[i]!.point.x)).toFixed(2)),
						y: Number((vf[i]!.point.y + r * (vf[i + 1]!.point.y - vf[i]!.point.y)).toFixed(2)),
					};
					break;
				}
			}
		}
		// Cap maxilla at tuberosity
		if (t.fdi === "18" && bestHU < 1600) {
			pt.y = Math.min(0.5, pt.y);
		}
		console.log(`  Tooth ${t.fdi}: dist=${finalD.toFixed(1)} mm | Pos: (${pt.x}, ${pt.y}) | ${status}`);
		curD = finalD;
	}
}

run().catch(console.error);
