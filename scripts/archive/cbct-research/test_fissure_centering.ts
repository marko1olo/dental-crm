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

	// Let's test tooth 17 on Zakharov
	// Peak was at x = -23.5, y = -14.5
	// Let's compute COM with winR = 3.5mm vs winR = 6.2mm
	for (const winR of [3.5, 5.0, 6.5, 7.5]) {
		let sumHU = 0, sumHUX = 0, sumHUY = 0;
		const centerX = -22.5;
		const centerY = -14.5;
		const sp = 0.25;
		for (let dy = -winR; dy <= winR; dy += sp) {
			for (let dx = -winR; dx <= winR; dx += sp) {
				if (Math.hypot(dx, dy) > winR) continue;
				const x = centerX + dx;
				const y = centerY + dy;
				const hu = sampleMipHUContinuous(maxSlab, x, y);
				if (hu >= 1100) {
					const w = hu;
					sumHU += w;
					sumHUX += w * x;
					sumHUY += w * y;
				}
			}
		}
		const comX = sumHUX / (sumHU || 1);
		const comY = sumHUY / (sumHU || 1);
		console.log(`Radius ${winR.toFixed(1)}mm: COM = (${comX.toFixed(2)}, ${comY.toFixed(2)})`);
	}
}

main().catch(console.error);
