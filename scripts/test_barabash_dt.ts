import { readdirSync, statSync, readFileSync } from "node:fs";
import path from "node:path";
import { buildVolumeFromDicomBuffers } from "../apps/web/src/components/radiology/realDicomVolumeLoader.js";
import { extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine.js";
import { extractEnamelBeadsDistanceTransform } from "../apps/web/src/components/radiology/cbctHonestArchBlobEngine.js";

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

	for (const z of [-8.0, -2.0, -0.8, 1.0]) {
		const slab = extractAxialMIPSlab(volume, z, 1.0, "average");
		const beads = extractEnamelBeadsDistanceTransform(slab, 1150);
		console.log(`\nZ=${z.toFixed(2)}: found ${beads.length} beads:`);
		for (const b of beads) {
			console.log(`  pos=(${b.wx}, ${b.wy}) dMm=${b.dMm} hu=${b.hu} count=${b.count}`);
		}
	}
}

run().catch(console.error);
