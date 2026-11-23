import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { buildVolumeFromMultiFrameDicom } from "../apps/web/src/components/radiology/dicomMultiFrameLoader.js";
import { buildVolumeFromDicomBuffers } from "../apps/web/src/components/radiology/realDicomVolumeLoader.js";
import { findOcclusalZPlane, computeOcclusalDensityProfile } from "../apps/web/src/components/radiology/cbctAutoArchEngine.js";
import type { CbctVoxelVolume } from "../apps/web/src/components/radiology/cbctMprMath.js";

async function loadDataset(ds: { name: string; type: string; path: string }): Promise<CbctVoxelVolume> {
	console.log(`\n>>> Loading dataset: ${ds.name} (${ds.type})`);
	const startTime = Date.now();

	if (ds.type === "multiframe") {
		const buf = readFileSync(ds.path);
		const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
		const vol = await buildVolumeFromMultiFrameDicom(arrayBuf);
		console.log(`  Loaded in ${Date.now() - startTime}ms. Dimensions: ${vol.dimensions.width}x${vol.dimensions.height}x${vol.dimensions.depth}, Spacing: ${vol.spacingMm.x}mm`);
		return vol;
	} else {
		const files = readdirSync(ds.path).filter((f) => {
			const full = path.join(ds.path, f);
			return statSync(full).isFile() && (f.toLowerCase().endsWith(".dcm") || !f.includes("."));
		});
		console.log(`  Reading ${files.length} DICOM slice files...`);
		const items: Array<{ buffer: ArrayBuffer; fileName: string }> = [];
		for (const f of files) {
			const full = path.join(ds.path, f);
			const buf = readFileSync(full);
			const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
			items.push({ buffer: arrayBuf, fileName: f });
		}
		const vol = await buildVolumeFromDicomBuffers(items);
		console.log(`  Loaded in ${Date.now() - startTime}ms. Dimensions: ${vol.dimensions.width}x${vol.dimensions.height}x${vol.dimensions.depth}, Spacing: ${vol.spacingMm.x}x${vol.spacingMm.y}x${vol.spacingMm.z}mm`);
		return vol;
	}
}

async function testAll() {
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
		try {
			const vol = await loadDataset(ds);
			const zMandible = findOcclusalZPlane(vol, "mandible");
			const zMaxilla = findOcclusalZPlane(vol, "maxilla");
			console.log(`  Z Occlusal Planes: Mandible = ${zMandible.toFixed(2)} mm, Maxilla = ${zMaxilla.toFixed(2)} mm (Delta = ${(zMaxilla - zMandible).toFixed(2)} mm)`);
		} catch (err: any) {
			console.error(`  ERROR on ${ds.name}:`, err.message);
		}
	}
}

testAll();
