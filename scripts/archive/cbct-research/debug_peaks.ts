import { readFileSync } from "node:fs";
import { buildVolumeFromMultiFrameDicom } from "../apps/web/src/components/radiology/dicomMultiFrameLoader.js";
import { findOcclusalZPlane, extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine.js";

async function main() {
	const bufB = readFileSync("C:\\Users\\Admin\\Downloads\\Облако Mail\\Буляков Н.З. 29.08.2026г. ОЧ.dcm");
	const volB = await buildVolumeFromMultiFrameDicom(bufB.buffer.slice(bufB.byteOffset, bufB.byteOffset + bufB.byteLength));
	const z = findOcclusalZPlane(volB, "mandible");
	const mip = extractAxialMIPSlab(volB, z, 6.0);

	// Find local maxima with HU >= 1000 across the entire MIP
	const spX = mip.spacingMm.x;
	const spY = mip.spacingMm.y;
	const w = mip.width;
	const h = mip.height;
	const data = mip.data;

	console.log("Sampling peaks across MIP...");
	const peaks: Array<{ wx: number; wy: number; hu: number }> = [];
	for (let y = 5; y < h - 5; y += 3) {
		for (let x = 5; x < w - 5; x += 3) {
			const hu = data[y * w + x] ?? -1000;
			if (hu >= 1100) {
				const wx = mip.originMm.x + x * spX;
				const wy = mip.originMm.y + y * spY;
				// Check local 5x5 maximum
				let isMax = true;
				for (let dy = -2; dy <= 2; dy++) {
					for (let dx = -2; dx <= 2; dx++) {
						if (dx === 0 && dy === 0) continue;
						if ((data[(y + dy) * w + (x + dx)] ?? -1000) > hu) {
							isMax = false;
							break;
						}
					}
					if (!isMax) break;
				}
				if (isMax) {
					peaks.push({ wx: Number(wx.toFixed(1)), wy: Number(wy.toFixed(1)), hu });
				}
			}
		}
	}
	console.log(`Found ${peaks.length} local peaks with HU >= 1100:`);
	// Sort by Y (anterior to posterior)
	peaks.sort((a, b) => a.wy - b.wy);
	for (const p of peaks) {
		console.log(`  X: ${p.wx}, Y: ${p.wy}, HU: ${p.hu}`);
	}
}

main().catch(console.error);
