import { readFileSync, readdirSync, statSync } from "node:fs";
import * as path from "node:path";
import { buildVolumeFromDicomBuffers } from "../apps/web/src/components/radiology/realDicomVolumeLoader.js";
import { findOcclusalZPlane, extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine.js";
import { sampleMipHUContinuous } from "../apps/web/src/components/radiology/cbctAutoArchTypes.js";

async function main() {
	const p = "apps/web/public/radiology/demo_cbct";
	const files = readdirSync(p).filter((f) => statSync(path.join(p, f)).isFile() && f.endsWith(".dcm"));
	const items = files.map((f) => ({ buffer: readFileSync(path.join(p, f)).buffer, fileName: f }));
	const vol = await buildVolumeFromDicomBuffers(items);
	const maxZ = findOcclusalZPlane(vol, "maxilla");
	const maxSlab = extractAxialMIPSlab(vol, maxZ, 6.0);

	// Let's test lines across premolars and molars:
	// y = -34 (premolars 14/24)
	// y = -27 (premolars 15/25)
	// y = -15 (molars 17)
	const testYs = [-15, -27, -34];
	for (const y of testYs) {
		console.log(`\n=== Y = ${y} mm (Transverse slice across arch) ===`);
		// Find enamel segments on right (x < 0) and left (x > 0)
		for (const sign of [-1, 1]) {
			const side = sign < 0 ? "Right" : "Left";
			let minEnamel = Infinity, maxEnamel = -Infinity;
			let peakX = 0, peakHU = -1000;
			for (let u = 8.0; u <= 35.0; u += 0.25) {
				const x = sign * u;
				const hu = sampleMipHUContinuous(maxSlab, x, y);
				if (hu >= 1200) {
					if (u < minEnamel) minEnamel = u;
					if (u > maxEnamel) maxEnamel = u;
					if (hu > peakHU) {
						peakHU = hu;
						peakX = x;
					}
				}
			}
			if (minEnamel < Infinity) {
				const midU = (minEnamel + maxEnamel) / 2;
				const midX = sign * midU;
				const width = maxEnamel - minEnamel;
				console.log(`  ${side}: enamel span [${(sign * minEnamel).toFixed(2)}, ${(sign * maxEnamel).toFixed(2)}], width=${width.toFixed(2)}mm, midX=${midX.toFixed(2)}, peakX=${peakX.toFixed(2)} (HU=${peakHU})`);
			}
		}
	}
}

main().catch(console.error);
