import { readFileSync } from "node:fs";
import { buildVolumeFromMultiFrameDicom } from "../apps/web/src/components/radiology/dicomMultiFrameLoader.js";
import { findOcclusalZPlane, extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine.js";
import { sampleMipHUContinuous } from "../apps/web/src/components/radiology/cbctAutoArchTypes.js";

async function main() {
	const p = "C:\\Users\\Admin\\Downloads\\Облако Mail\\Буляков Н.З. 29.08.2026г. ОЧ.dcm";
	const buf = readFileSync(p);
	const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
	const vol = await buildVolumeFromMultiFrameDicom(arrayBuf);
	
	const zMand = findOcclusalZPlane(vol, "mandible");
	console.log("Bulyakov Mandible Z =", zMand);
	const slab = extractAxialMIPSlab(vol, zMand, 6.0);

	// Let's scan along Y from -35 to +20 mm with step 5 mm, looking for teeth
	for (let y = -35; y <= 20; y += 5) {
		console.log(`\n=== Y = ${y} mm ===`);
		for (const sign of [-1, 1]) {
			const side = sign < 0 ? "Right" : "Left";
			let minE = Infinity, maxE = -Infinity, peakX = 0, peakHU = -1000;
			for (let u = 4.0; u <= 38.0; u += 0.5) {
				const x = sign * u;
				const hu = sampleMipHUContinuous(slab, x, y);
				if (hu >= 1200) {
					if (u < minE) minE = u;
					if (u > maxE) maxE = u;
					if (hu > peakHU) { peakHU = hu; peakX = x; }
				}
			}
			if (minE < Infinity) {
				const midX = sign * (minE + maxE) / 2;
				console.log(`  ${side}: span [${(sign * minE).toFixed(1)}, ${(sign * maxE).toFixed(1)}], midX=${midX.toFixed(1)}, peakX=${peakX.toFixed(1)} (HU=${peakHU})`);
			}
		}
	}
}

main().catch(console.error);
