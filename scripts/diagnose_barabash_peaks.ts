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

	const profile = computeOcclusalDensityProfile(volume);
	const enamelPeaks: Array<{ z: number; enamel: number; bone: number }> = [];
	for (let i = 1; i < profile.length - 1; i++) {
		const prev = profile[i - 1]!.smoothedEnamel;
		const cur = profile[i]!.smoothedEnamel;
		const next = profile[i + 1]!.smoothedEnamel;
		if (cur > prev && cur > next && cur > 10000) {
			enamelPeaks.push({ z: profile[i]!.zMm, enamel: cur, bone: profile[i]!.smoothedBone });
		}
	}
	console.log("Enamel peaks sorted by value:");
	enamelPeaks.sort((a, b) => b.enamel - a.enamel);
	for (const p of enamelPeaks) {
		console.log(`Z=${p.z.toFixed(2)}: enamel=${p.enamel.toFixed(0)} bone=${p.bone.toFixed(0)}`);
	}
}

run().catch(console.error);
