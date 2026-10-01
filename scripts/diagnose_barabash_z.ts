import { readdirSync, statSync, readFileSync } from "node:fs";
import path from "node:path";
import { buildVolumeFromDicomBuffers } from "../apps/web/src/components/radiology/realDicomVolumeLoader.js";
import { computeOcclusalDensityProfile } from "../apps/web/src/components/radiology/cbctAutoArchEngine.js";

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
	console.log("Volume dimensions:", volume.dimensions, "spacing:", volume.spacingMm, "origin:", volume.originMm);

	const profile = computeOcclusalDensityProfile(volume);
	console.log("Profile sample around Z:");
	for (const p of profile) {
		if (p.smoothedEnamel > 100 || p.smoothedBone > 100000) {
			console.log(`Z=${p.zMm.toFixed(2)} (idx=${p.zIndex}): enamel=${p.smoothedEnamel.toFixed(0)} bone=${p.smoothedBone.toFixed(0)}`);
		}
	}
}

run().catch(console.error);
