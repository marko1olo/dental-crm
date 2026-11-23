import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { buildVolumeFromMultiFrameDicom } from "../apps/web/src/components/radiology/dicomMultiFrameLoader.js";
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

function measureArchWidthAtZ(vol: any, z: number) {
	const slab = extractAxialMIPSlab(vol, z, 1.0, "average");
	const data = slab.data;
	const w = slab.width;
	const h = slab.height;
	const spX = slab.spacingMm.x;
	const spY = slab.spacingMm.y;

	let minX = Infinity;
	let maxX = -Infinity;
	let count = 0;

	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const hu = data[y * w + x] ?? -1000;
			if (hu >= 1400) {
				const wx = slab.originMm.x + x * spX;
				const wy = slab.originMm.y + y * spY;
				// In dental arch region (Y < 10)
				if (wy < 10 && wy > -65) {
					if (wx < minX) minX = wx;
					if (wx > maxX) maxX = wx;
					count++;
				}
			}
		}
	}
	const width = maxX > minX ? maxX - minX : 0;
	return { width, count };
}

async function main() {
	// 1. Zakharov (peaks at -3.25 and 3.25)
	const volZak = await loadSeries("apps/web/public/radiology/demo_cbct");
	console.log("Захаров:");
	console.log("  Z = -3.25 mm (Maxilla):", measureArchWidthAtZ(volZak, -3.25));
	console.log("  Z = +3.25 mm (Mandible):", measureArchWidthAtZ(volZak, 3.25));

	// 2. Barabash (peaks at -0.8 and -8.0)
	const volBar = await loadSeries("C:\\Users\\Admin\\Downloads\\_Organized_Downloads\\08_Проекты_и_Папки\\Медицина_и_Снимки\\BARABASH_SVETLANA_VIKTOROVNA_09141256\\BARABASH_SVETLANA_VIKTOROVNA_09141256\\Data");
	console.log("\nБарабаш:");
	console.log("  Z = -0.80 mm (Maxilla):", measureArchWidthAtZ(volBar, -0.80));
	console.log("  Z = -8.00 mm (Mandible):", measureArchWidthAtZ(volBar, -8.00));

	// 3. Bulyakov (peaks at -1.10 and +8.90)
	const bufBul = readFileSync("C:\\Users\\Admin\\Downloads\\Облако Mail\\Буляков Н.З. 29.08.2026г. ОЧ.dcm");
	const volBul = await buildVolumeFromMultiFrameDicom(bufBul.buffer.slice(bufBul.byteOffset, bufBul.byteOffset + bufBul.byteLength));
	console.log("\nБуляков:");
	console.log("  Z = -1.10 mm (Maxilla):", measureArchWidthAtZ(volBul, -1.10));
	console.log("  Z = +8.90 mm (Mandible):", measureArchWidthAtZ(volBul, 8.90));
}

main().catch(console.error);
