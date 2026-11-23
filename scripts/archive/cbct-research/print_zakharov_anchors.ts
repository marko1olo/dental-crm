import { findOcclusalZPlane, extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine";
import { detectHonestDentalArch } from "../apps/web/src/components/radiology/cbctHonestArchBlobEngine";
import { buildVolumeFromDicomBuffers } from "../apps/web/src/components/radiology/realDicomVolumeLoader";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

async function run() {
	const p = "apps/web/public/radiology/demo_cbct";
	const files = readdirSync(p).filter((f) => statSync(path.join(p, f)).isFile() && f.endsWith(".dcm"));
	const items = files.map((f) => ({ buffer: readFileSync(path.join(p, f)).buffer, fileName: f }));
	const vol = await buildVolumeFromDicomBuffers(items);
	const z = findOcclusalZPlane(vol, "maxilla");
	const slab = extractAxialMIPSlab(vol, z, 4.0);
	const res = detectHonestDentalArch(slab, "maxilla");
	console.log("Zakharov Maxilla Teeth:");
	for (const a of res.anchors) {
		console.log(`  ${a.toothFdi} | pos: (${a.positionMm.x}, ${a.positionMm.y}) | HU: ${a.peakHU} | status: ${a.status}`);
	}
}

run().catch(console.error);
