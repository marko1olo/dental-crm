/**
 * Test script: Honest Peak Detection along Dental Arch Quadrants across 5 Real Patients
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { buildVolumeFromMultiFrameDicom, buildVolumeFromDicomBuffers } from "../apps/web/src/components/radiology/realDicomVolumeLoader";
import { findOcclusalZPlane, extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine";
import {
	findAnteriorArchApexRobust,
	traceContinuousRidgePath,
} from "../apps/web/src/components/radiology/cbctHonestArchBlobEngine";
import { sampleMipHUContinuous } from "../apps/web/src/components/radiology/cbctAutoArchTypes";
import type { Point2D } from "../apps/web/src/components/radiology/cbctCaliperNerveMath";

interface PatientConfig {
	name: string;
	type: "multiframe" | "series";
	path: string;
}

const PATIENTS: PatientConfig[] = [
	{
		name: "Буляков Н.З.",
		type: "multiframe",
		path: "C:\\Users\\Admin\\Downloads\\Облако Mail\\Буляков Н.З. 29.08.2026г. ОЧ.dcm",
	},
	{
		name: "Захаров И.Д.",
		type: "series",
		path: "apps/web/public/radiology/demo_cbct",
	},
	{
		name: "Сумарокова И.О.",
		type: "series",
		path: "C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\Сумарокова Ирина Олеговна\\Data\\1.2.250.1.90.3.3703714412.20260727125355.4924.34",
	},
	{
		name: "Барабаш С.В.",
		type: "series",
		path: "C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\BARABASH_SVETLANA_VIKTOROVNA_09141256\\BARABASH_SVETLANA_VIKTOROVNA_09141256\\Data",
	},
	{
		name: "Амирова Н.Н.",
		type: "series",
		path: "C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\АМИРОВА НАДЕЖДА НИКОЛАЕВНА КТ 2.5-2.6 22.06.2026\\АМИРОВА НАДЕЖДА НИКОЛАЕВНА КТ 2.5-2.6 22.06.2026\\20260622_112915_98\\CT",
	},
];

async function loadVolume(p: PatientConfig) {
	if (p.type === "multiframe") {
		const buf = readFileSync(p.path);
		const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
		return buildVolumeFromMultiFrameDicom(ab);
	} else {
		const files = readdirSync(p.path).filter((f) => {
			const full = path.join(p.path, f);
			return statSync(full).isFile() && (f.toLowerCase().endsWith(".dcm") || !f.includes("."));
		});
		const items = files.map((f) => {
			const buf = readFileSync(path.join(p.path, f));
			return { buffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), fileName: f };
		});
		return buildVolumeFromDicomBuffers(items);
	}
}

interface RidgePeak {
	distFromApexMm: number;
	maxHU: number;
	point: Point2D;
}

function extractQuadrantPeaks(
	mip: any,
	branch: readonly Point2D[],
	minPeakDistMm = 4.5,
): RidgePeak[] {
	if (branch.length < 2) return [];

	// 1. Resample branch at 0.5 mm steps
	const sampled: Array<{ dist: number; pt: Point2D; maxHU: number }> = [];
	let curDist = 0;

	for (let i = 0; i < branch.length - 1; i++) {
		const p0 = branch[i]!;
		const p1 = branch[i + 1]!;
		const segLen = Math.hypot(p1.x - p0.x, p1.y - p0.y);
		if (segLen === 0) continue;

		const dirX = (p1.x - p0.x) / segLen;
		const dirY = (p1.y - p0.y) / segLen;
		const normX = -dirY;
		const normY = dirX;

		for (let s = 0; s < segLen; s += 0.5) {
			const px = p0.x + dirX * s;
			const py = p0.y + dirY * s;

			// Sample transverse profile +/- 3.5 mm around ridge point
			let maxHU = -1000;
			let bestX = px;
			let bestY = py;

			for (let o = -3.5; o <= 3.5; o += 0.5) {
				const tx = px + normX * o;
				const ty = py + normY * o;
				const hu = sampleMipHUContinuous(mip, tx, ty);
				if (hu > maxHU) {
					maxHU = hu;
					bestX = tx;
					bestY = ty;
				}
			}

			sampled.push({
				dist: Number((curDist + s).toFixed(1)),
				pt: { x: Number(bestX.toFixed(2)), y: Number(bestY.toFixed(2)) },
				maxHU,
			});
		}
		curDist += segLen;
	}

	// 2. Detect local maxima along the 1D profile
	const peaks: RidgePeak[] = [];
	for (let i = 2; i < sampled.length - 2; i++) {
		const cur = sampled[i]!;
		if (cur.maxHU < 1200) continue; // Must be enamel or dense cortical/implant peak

		const isLocalMax =
			cur.maxHU >= sampled[i - 1]!.maxHU &&
			cur.maxHU >= sampled[i - 2]!.maxHU &&
			cur.maxHU >= sampled[i + 1]!.maxHU &&
			cur.maxHU >= sampled[i + 2]!.maxHU;

		if (isLocalMax) {
			// Enforce minimum inter-tooth distance
			if (peaks.length === 0 || cur.dist - peaks[peaks.length - 1]!.distFromApexMm >= minPeakDistMm) {
				peaks.push({
					distFromApexMm: cur.dist,
					maxHU: cur.maxHU,
					point: cur.pt,
				});
			} else {
				// If too close, replace with the higher peak
				const prev = peaks[peaks.length - 1]!;
				if (cur.maxHU > prev.maxHU) {
					peaks[peaks.length - 1] = {
						distFromApexMm: cur.dist,
						maxHU: cur.maxHU,
						point: cur.pt,
					};
				}
			}
		}
	}

	return peaks;
}

async function run() {
	console.log("=== HONEST PHYSICAL ENAMEL PEAK EXTRACTION ACROSS 5 REAL PATIENTS ===\n");

	for (const p of PATIENTS) {
		console.log(`\n=================== PATIENT: ${p.name} ===================`);
		const vol = await loadVolume(p);

		for (const jaw of ["mandible", "maxilla"] as const) {
			const zMm = findOcclusalZPlane(vol, jaw);
			const slab = extractAxialMIPSlab(vol, zMm, 4.0);
			const apex = findAnteriorArchApexRobust(slab);
			const ridgePoints = traceContinuousRidgePath(slab, apex, jaw);

			let apexIdx = 0;
			let minDist = Infinity;
			for (let i = 0; i < ridgePoints.length; i++) {
				const d = Math.hypot(ridgePoints[i]!.x - apex.x, ridgePoints[i]!.y - apex.y);
				if (d < minDist) {
					minDist = d;
					apexIdx = i;
				}
			}

			const rightBranch = ridgePoints.slice(0, apexIdx + 1).reverse();
			const leftBranch = ridgePoints.slice(apexIdx);

			const rightPeaks = extractQuadrantPeaks(slab, rightBranch);
			const leftPeaks = extractQuadrantPeaks(slab, leftBranch);

			const qRightName = jaw === "mandible" ? "Q4 (Нижний правый: 41..48)" : "Q1 (Верхний правый: 11..18)";
			const qLeftName = jaw === "mandible" ? "Q3 (Нижний левый: 31..38)" : "Q2 (Верхний левый: 21..28)";

			console.log(`\n[${jaw.toUpperCase()}] Z = ${zMm.toFixed(2)} mm | Apex: (${apex.x.toFixed(1)}, ${apex.y.toFixed(1)}) mm`);
			console.log(`  ${qRightName}: ${rightPeaks.length} physical peaks found:`);
			for (let i = 0; i < rightPeaks.length; i++) {
				const pk = rightPeaks[i]!;
				console.log(`    Peak ${i + 1}: dist = ${pk.distFromApexMm.toFixed(1)} mm | HU = ${pk.maxHU} | pos: (${pk.point.x.toFixed(1)}, ${pk.point.y.toFixed(1)})`);
			}

			console.log(`  ${qLeftName}: ${leftPeaks.length} physical peaks found:`);
			for (let i = 0; i < leftPeaks.length; i++) {
				const pk = leftPeaks[i]!;
				console.log(`    Peak ${i + 1}: dist = ${pk.distFromApexMm.toFixed(1)} mm | HU = ${pk.maxHU} | pos: (${pk.point.x.toFixed(1)}, ${pk.point.y.toFixed(1)})`);
			}
		}
	}
}

run().catch(console.error);
