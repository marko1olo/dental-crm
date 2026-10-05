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

	console.log("Maxilla Z =", maxZ);

	// Let's sample a cross-section line across tooth 17/16 (e.g. from lingual to buccal)
	// Tooth 17 is around y = -15 mm, x goes from -15 mm (palatal) to -26 mm (buccal)
	console.log("\n--- Transverse line across Tooth 17 (y = -15.0) ---");
	for (let x = -15.0; x >= -27.0; x -= 0.5) {
		const hu = sampleMipHUContinuous(maxSlab, x, -15.0);
		const bar = hu > 0 ? "#".repeat(Math.min(50, Math.floor(hu / 60))) : "";
		console.log(`x=${x.toFixed(1)}: HU=${Math.round(hu).toString().padStart(5)} ${bar}`);
	}

	// Anterior central incisors: y goes from -42 (lingual) to -50 (vestibular) at x = -3.0
	console.log("\n--- Sagittal line across Central Incisor 11 (x = -3.5) ---");
	for (let y = -42.0; y >= -52.0; y -= 0.5) {
		const hu = sampleMipHUContinuous(maxSlab, -3.5, y);
		const bar = hu > 0 ? "#".repeat(Math.min(50, Math.floor(hu / 60))) : "";
		console.log(`y=${y.toFixed(1)}: HU=${Math.round(hu).toString().padStart(5)} ${bar}`);
	}
}

main().catch(console.error);
