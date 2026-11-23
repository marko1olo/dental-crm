import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { buildVolumeFromDicomBuffers } from "../apps/web/src/components/radiology/realDicomVolumeLoader.js";
import { extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine.js";

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

async function testPalate(name: string, dirPath: string, z1: number, z2: number) {
	console.log(`\nTesting Palate/Tongue: ${name}`);
	const vol = await loadSeries(dirPath);
	for (const z of [z1, z2]) {
		const slab = extractAxialMIPSlab(vol, z, 1.0, "average");
		const spX = slab.spacingMm.x;
		const spY = slab.spacingMm.y;
		let boneInPalateRegion = 0;
		// Palatal vault region: X between -12 and +12 mm, Y between -30 and -10 mm
		for (let y = -30; y <= -10; y += 1.0) {
			for (let x = -12; x <= 12; x += 1.0) {
				const vx = Math.round((x - slab.originMm.x) / spX);
				const vy = Math.round((y - slab.originMm.y) / spY);
				if (vx >= 0 && vx < slab.width && vy >= 0 && vy < slab.height) {
					const hu = slab.data[vy * slab.width + vx] ?? -1000;
					if (hu >= 350) boneInPalateRegion++;
				}
			}
		}
		console.log(`  Z = ${z.toFixed(2)} mm: bone in central palate region = ${boneInPalateRegion}`);
	}
}

async function main() {
	await testPalate("Захаров", "apps/web/public/radiology/demo_cbct", -3.25, 3.25);
	await testPalate("Барабаш", "C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\BARABASH_SVETLANA_VIKTOROVNA_09141256\\BARABASH_SVETLANA_VIKTOROVNA_09141256\\Data", -8.0, -0.8);
}

main().catch(console.error);
