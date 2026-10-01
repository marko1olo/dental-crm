import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { buildVolumeFromMultiFrameDicom } from "../apps/web/src/components/radiology/dicomMultiFrameLoader.js";
import { buildVolumeFromDicomBuffers } from "../apps/web/src/components/radiology/realDicomVolumeLoader.js";
import { extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine.js";

async function loadPatient(cfg: any) {
	if (cfg.type === "multiframe") {
		const buf = readFileSync(cfg.path);
		return buildVolumeFromMultiFrameDicom(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
	} else {
		const files = readdirSync(cfg.path).filter((f) => {
			const full = path.join(cfg.path, f);
			return statSync(full).isFile() && (f.toLowerCase().endsWith(".dcm") || !f.includes("."));
		});
		const items: Array<{ buffer: ArrayBuffer; fileName: string }> = [];
		for (const f of files) {
			const full = path.join(cfg.path, f);
			const buf = readFileSync(full);
			items.push({ buffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), fileName: f });
		}
		return buildVolumeFromDicomBuffers(items);
	}
}

function getAnteriorY(slab: any, huThreshold = 1200): number {
	const { width, height, data, originMm, spacingMm } = slab;
	const spY = spacingMm.y || 0.25;
	let minY = Infinity;
	for (let y = 0; y < height; y++) {
		const row = y * width;
		for (let x = 0; x < width; x++) {
			if ((data[row + x] ?? -1000) >= huThreshold) {
				const worldY = originMm.y + y * spY;
				if (worldY < minY) minY = worldY;
			}
		}
	}
	return minY;
}

async function test() {
	const cases = [
		{
			name: "Буляков",
			type: "multiframe",
			path: "C:\\Users\\Admin\\Downloads\\Облако Mail\\Буляков Н.З. 29.08.2026г. ОЧ.dcm",
			mandZ: 8.90,
			maxZ: -1.10,
		},
		{
			name: "Захаров",
			type: "series",
			path: "apps/web/public/radiology/demo_cbct",
			mandZ: 3.25,
			maxZ: -3.25,
		},
		{
			name: "Барабаш",
			type: "series",
			path: "C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\BARABASH_SVETLANA_VIKTOROVNA_09141256\\BARABASH_SVETLANA_VIKTOROVNA_09141256\\Data",
			mandZ: -8.00,
			maxZ: -0.80,
		},
	];

	for (const c of cases) {
		const vol = await loadPatient(c);
		const slabMand = extractAxialMIPSlab(vol, c.mandZ, 1.0, "average");
		const slabMax = extractAxialMIPSlab(vol, c.maxZ, 1.0, "average");
		const mandAntY = getAnteriorY(slabMand);
		const maxAntY = getAnteriorY(slabMax);
		console.log(`${c.name}: Mandible (${c.mandZ}) antY=${mandAntY.toFixed(2)}, Maxilla (${c.maxZ}) antY=${maxAntY.toFixed(2)}, Maxilla is more anterior by ${(mandAntY - maxAntY).toFixed(2)} mm`);
	}
}

test().catch(console.error);
