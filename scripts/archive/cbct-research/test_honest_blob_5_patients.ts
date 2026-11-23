import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { buildVolumeFromMultiFrameDicom } from "../apps/web/src/components/radiology/dicomMultiFrameLoader.js";
import { buildVolumeFromDicomBuffers } from "../apps/web/src/components/radiology/realDicomVolumeLoader.js";
import { findOcclusalZPlane, extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine.js";
import { detectHonestDentalArch } from "../apps/web/src/components/radiology/cbctHonestArchBlobEngine.js";
import type { CbctVoxelVolume } from "../apps/web/src/components/radiology/cbctMprMath.js";

async function loadDataset(ds: { name: string; type: string; path: string }): Promise<CbctVoxelVolume> {
	if (ds.type === "multiframe") {
		const buf = readFileSync(ds.path);
		const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
		return buildVolumeFromMultiFrameDicom(arrayBuf);
	} else {
		const files = readdirSync(ds.path).filter((f) => {
			const full = path.join(ds.path, f);
			return statSync(full).isFile() && (f.toLowerCase().endsWith(".dcm") || !f.includes("."));
		});
		const items: Array<{ buffer: ArrayBuffer; fileName: string }> = [];
		for (const f of files) {
			const full = path.join(ds.path, f);
			const buf = readFileSync(full);
			const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
			items.push({ buffer: arrayBuf, fileName: f });
		}
		return buildVolumeFromDicomBuffers(items);
	}
}

async function run() {
	const datasets = [
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

	for (const ds of datasets) {
		console.log(`\n=================== TESTING: ${ds.name} ===================`);
		const vol = await loadDataset(ds);

		for (const jaw of ["mandible", "maxilla"] as const) {
			const z = findOcclusalZPlane(vol, jaw);
			const slab = extractAxialMIPSlab(vol, z, 6.0);
			const res = detectHonestDentalArch(slab, jaw, 14.0);

			console.log(`[${jaw.toUpperCase()}] Z = ${z.toFixed(2)} mm`);
			console.log(`  Apex: (${res.apexMm.x.toFixed(1)}, ${res.apexMm.y.toFixed(1)}) mm`);
			console.log(`  Arc length: ${res.curve.totalArcLengthMm?.toFixed(1)} mm, Spline points: ${res.curve.splinePointsMm.length}`);
			console.log(`  Present (${res.presentTeethFdi.length}): ${res.presentTeethFdi.join(", ")}`);
			console.log(`  Missing (${res.missingTeethFdi.length}): ${res.missingTeethFdi.join(", ")}`);
			console.log(`  Metrics:`, res.metrics);

			const xs = res.anchors.map((a) => a.positionMm.x);
			const ys = res.anchors.map((a) => a.positionMm.y);
			const hasNaN = xs.some(isNaN) || ys.some(isNaN) || res.curve.splinePointsMm.some((p) => isNaN(p.x) || isNaN(p.y));
			if (hasNaN) {
				console.error(`  CRITICAL: NaN found in ${ds.name} ${jaw}!`);
			}
		}
	}
}

run();
