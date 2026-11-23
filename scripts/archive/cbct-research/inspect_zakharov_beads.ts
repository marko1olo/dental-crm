import { readFileSync, readdirSync, statSync } from "node:fs";
import * as path from "node:path";
import { buildVolumeFromDicomBuffers } from "../apps/web/src/components/radiology/realDicomVolumeLoader.js";
import { findOcclusalZPlane, extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine.js";
import { extractEnamelBeadsDistanceTransform, findAnteriorArchApexRobust } from "../apps/web/src/components/radiology/cbctHonestArchBlobEngine.js";

async function main() {
	const p = "apps/web/public/radiology/demo_cbct";
	const files = readdirSync(p).filter((f) => statSync(path.join(p, f)).isFile() && f.endsWith(".dcm"));
	const items = files.map((f) => ({ buffer: readFileSync(path.join(p, f)).buffer, fileName: f }));
	const vol = await buildVolumeFromDicomBuffers(items);
	const maxZ = findOcclusalZPlane(vol, "maxilla");
	const maxSlab = extractAxialMIPSlab(vol, maxZ, 6.0);
	const { apex, midlineX } = findAnteriorArchApexRobust(maxSlab, "maxilla");
	const beads = extractEnamelBeadsDistanceTransform(maxSlab, 1150);
	console.log("Apex:", apex, "midlineX:", midlineX);
	console.log("--- All Beads on Maxilla ---");
	for (const b of beads) {
		const dx = b.wx - midlineX;
		const dy = b.wy - apex.y;
		console.log(`x=${b.wx.toFixed(2)}, y=${b.wy.toFixed(2)} (dx=${dx.toFixed(2)}, dy=${dy.toFixed(2)}) HU=${b.hu}, dMm=${b.dMm}`);
	}
}

main().catch(console.error);
