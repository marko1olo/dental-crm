import { readFileSync, readdirSync, statSync } from "node:fs";
import * as path from "node:path";
import { buildVolumeFromDicomBuffers } from "../apps/web/src/components/radiology/realDicomVolumeLoader.js";
import { findOcclusalZPlane, extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine.js";
import { detectHonestDentalArch } from "../apps/web/src/components/radiology/cbctHonestArchBlobEngine.js";

async function main() {
	const p = "apps/web/public/radiology/demo_cbct";
	const files = readdirSync(p).filter((f) => statSync(path.join(p, f)).isFile() && f.endsWith(".dcm"));
	const items = files.map((f) => ({ buffer: readFileSync(path.join(p, f)).buffer, fileName: f }));
	const vol = await buildVolumeFromDicomBuffers(items);
	const maxZ = findOcclusalZPlane(vol, "maxilla");
	const maxSlab = extractAxialMIPSlab(vol, maxZ, 6.0);
	const res = detectHonestDentalArch(maxSlab, "maxilla");
	console.log("Apex:", res.apexMm);
	for (const a of res.anchors) {
		console.log(a.toothFdi, a.positionMm, "missing:", a.isMissing, "peakHU:", a.peakHU);
	}
}

main().catch(console.error);
