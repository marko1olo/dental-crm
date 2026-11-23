import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { buildVolumeFromDicomBuffers } from "../apps/web/src/components/radiology/realDicomVolumeLoader.js";
import { computeOcclusalDensityProfile, findOcclusalZPlane, extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine.js";
import { extractEnamelBeadsDistanceTransform } from "../apps/web/src/components/radiology/cbctHonestArchBlobEngine.js";

async function loadSeries(dirPath: string) {
	const files = readdirSync(dirPath).filter((f) => {
		const full = path.join(dirPath, f);
		return statSync(full).isFile() && (f.toLowerCase().endsWith(".dcm") || !f.includes("."));
	});
	const items: Array<{ buffer: ArrayBuffer; fileName: string }> = [];
	for (const f of files) {
		const full = path.join(dirPath, f);
		const buf = readFileSync(full);
		const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
		items.push({ buffer: arrayBuf, fileName: f });
	}
	return buildVolumeFromDicomBuffers(items);
}

async function diagnose(name: string, dirPath: string) {
	console.log(`\n=================== DIAGNOSING: ${name} ===================`);
	const vol = await loadSeries(dirPath);
	console.log(`Dimensions: ${vol.dimensions.width}x${vol.dimensions.height}x${vol.dimensions.depth}`);
	console.log(`Spacing: ${vol.spacingMm.x}x${vol.spacingMm.y}x${vol.spacingMm.z} mm`);
	console.log(`Origin: ${vol.originMm.x}, ${vol.originMm.y}, ${vol.originMm.z} mm`);

	const profile = computeOcclusalDensityProfile(vol);
	console.log("Z-Profile significant enamel (>500) slices:");
	for (const p of profile) {
		if (p.smoothedEnamel > 500) {
			console.log(`  Z = ${p.zMm.toFixed(2)} mm (idx=${p.zIndex}): enamel=${Math.round(p.smoothedEnamel)}, bone=${Math.round(p.smoothedBone)}`);
		}
	}

	const mandZ = findOcclusalZPlane(vol, "mandible");
	const maxZ = findOcclusalZPlane(vol, "maxilla");
	console.log(`findOcclusalZPlane -> Mandible: ${mandZ.toFixed(2)} mm, Maxilla: ${maxZ.toFixed(2)} mm`);

	// Test slices around teeth
	for (const z of [mandZ, maxZ]) {
		const slab = extractAxialMIPSlab(vol, z, 1.0, "average");
		const beads = extractEnamelBeadsDistanceTransform(slab, 1150);
		console.log(`  At Z = ${z.toFixed(2)} mm: found ${beads.length} beads (HU>=1150)`);
		for (const b of beads.slice(0, 10)) {
			console.log(`    Bead at (${b.wx.toFixed(1)}, ${b.wy.toFixed(1)}) HU=${b.hu} dMm=${b.dMm}`);
		}
	}
}

async function main() {
	await diagnose("Барабаш С.В.", "C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\BARABASH_SVETLANA_VIKTOROVNA_09141256\\BARABASH_SVETLANA_VIKTOROVNA_09141256\\Data");
	await diagnose("Сумарокова И.О.", "C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\Сумарокова Ирина Олеговна\\Data\\1.2.250.1.90.3.3703714412.20260727125355.4924.34");
	await diagnose("Амирова Н.Н.", "C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\АМИРОВА НАДЕЖДА НИКОЛАЕВНА КТ 2.5-2.6 22.06.2026\\АМИРОВА НАДЕЖДА НИКОЛАЕВНА КТ 2.5-2.6 22.06.2026\\20260622_112915_98\\CT");
}

main().catch(console.error);
