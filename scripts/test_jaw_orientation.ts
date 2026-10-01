import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { buildVolumeFromMultiFrameDicom } from "../apps/web/src/components/radiology/dicomMultiFrameLoader.js";
import { buildVolumeFromDicomBuffers } from "../apps/web/src/components/radiology/realDicomVolumeLoader.js";
import { sampleVoxelTrilinearHU } from "../apps/web/src/components/radiology/cbctMprMath.js";

async function testJawOrientation(name: string, vol: any, z1: number, z2: number) {
	console.log(`\nTesting: ${name} (peaks at Z1=${z1}, Z2=${z2})`);
	// Check presence of air sinus 12mm away from occlusal plane along Z
	// If moving along +Z enters air sinus (HU < -500), then +Z is cranial (superior = maxilla).
	// If moving along -Z enters air sinus, then -Z is cranial (superior = maxilla).

	for (const z of [z1, z2]) {
		let airPlus = 0;
		let airMinus = 0;
		// Sample in palate/sinus region (X around 0, Y around -25..-10)
		for (let x = -15; x <= 15; x += 3) {
			for (let y = -25; y <= -10; y += 3) {
				const vx = (x - vol.originMm.x) / vol.spacingMm.x;
				const vy = (y - vol.originMm.y) / vol.spacingMm.y;
				const vzPlus = (z + 12 - vol.originMm.z) / vol.spacingMm.z;
				const vzMinus = (z - 12 - vol.originMm.z) / vol.spacingMm.z;

				const huP = sampleVoxelTrilinearHU(vx, vy, vzPlus, vol);
				const huM = sampleVoxelTrilinearHU(vx, vy, vzMinus, vol);

				if (huP < -500) airPlus++;
				if (huM < -500) airMinus++;
			}
		}
		console.log(`  Z = ${z}: air at (Z+12mm) = ${airPlus}, air at (Z-12mm) = ${airMinus}`);
	}
}

async function main() {
	// 1. Zakharov
	const pZak = "apps/web/public/radiology/demo_cbct";
	const filesZak = readdirSync(pZak).filter((f) => statSync(path.join(pZak, f)).isFile() && f.endsWith(".dcm"));
	const itemsZak = filesZak.map((f) => ({ buffer: readFileSync(path.join(pZak, f)).buffer, fileName: f }));
	const volZak = await buildVolumeFromDicomBuffers(itemsZak);
	await testJawOrientation("Захаров", volZak, -3.25, 3.25);

	// 2. Barabash
	const pBar = "C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\BARABASH_SVETLANA_VIKTOROVNA_09141256\\BARABASH_SVETLANA_VIKTOROVNA_09141256\\Data";
	const filesBar = readdirSync(pBar).filter((f) => statSync(path.join(pBar, f)).isFile() && (f.endsWith(".dcm") || !f.includes(".")));
	const itemsBar = filesBar.map((f) => ({ buffer: readFileSync(path.join(pBar, f)).buffer, fileName: f }));
	const volBar = await buildVolumeFromDicomBuffers(itemsBar);
	await testJawOrientation("Барабаш", volBar, -8.0, -0.8);
}

main().catch(console.error);
