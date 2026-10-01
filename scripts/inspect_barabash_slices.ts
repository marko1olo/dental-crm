import { readdirSync, statSync, readFileSync } from "node:fs";
import path from "node:path";
import { buildVolumeFromDicomBuffers } from "../apps/web/src/components/radiology/realDicomVolumeLoader.js";
import { extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine.js";

async function run() {
	const barabashDir = "C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\BARABASH_SVETLANA_VIKTOROVNA_09141256\\BARABASH_SVETLANA_VIKTOROVNA_09141256\\Data";
	const files = readdirSync(barabashDir).filter((f) => {
		const full = path.join(barabashDir, f);
		return statSync(full).isFile() && (f.toLowerCase().endsWith(".dcm") || !f.includes("."));
	});
	const items: Array<{ buffer: ArrayBuffer; fileName: string }> = [];
	for (const f of files) {
		const full = path.join(barabashDir, f);
		const buf = readFileSync(full);
		items.push({ buffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), fileName: f });
	}
	const volume = await buildVolumeFromDicomBuffers(items);

	for (const z of [-8.0, -4.0, -2.0, -0.8, 0.0, 1.0, 3.0]) {
		const slab = extractAxialMIPSlab(volume, z, 1.0, "average");
		let minVal = 99999, maxVal = -99999, count1050 = 0, count1600 = 0;
		for (let i = 0; i < slab.data.length; i++) {
			const v = slab.data[i]!;
			if (v < minVal) minVal = v;
			if (v > maxVal) maxVal = v;
			if (v >= 1050) count1050++;
			if (v >= 1600) count1600++;
		}
		console.log(`Z=${z.toFixed(2)}: min=${minVal} max=${maxVal} count>=1050=${count1050} count>=1600=${count1600}`);
	}
}

run().catch(console.error);
