import { readFileSync, readdirSync, statSync } from "node:fs";
import * as path from "node:path";
import { buildVolumeFromDicomBuffers } from "../apps/web/src/components/radiology/realDicomVolumeLoader.js";
import { findOcclusalZPlane, extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine.js";
import { detectHonestDentalArch, extractEnamelBeadsDistanceTransform, findAnteriorArchApexRobust } from "../apps/web/src/components/radiology/cbctHonestArchBlobEngine.js";

async function main() {
	const p = "apps/web/public/radiology/demo_cbct";
	const files = readdirSync(p).filter((f) => statSync(path.join(p, f)).isFile() && f.endsWith(".dcm"));
	const items = files.map((f) => ({ buffer: readFileSync(path.join(p, f)).buffer, fileName: f }));
	const vol = await buildVolumeFromDicomBuffers(items);

	const mandZ = findOcclusalZPlane(vol, "mandible");
	console.log("Zakharov Mandible Z =", mandZ);
	const mandSlab = extractAxialMIPSlab(vol, mandZ, 6.0);

	const { apex, midlineX } = findAnteriorArchApexRobust(mandSlab, "mandible");
	console.log("Mandible Apex:", apex, "midlineX:", midlineX);

	const beads = extractEnamelBeadsDistanceTransform(mandSlab, 1150);
	console.log(`--- All Mandible Beads (${beads.length}) ---`);
	for (const b of beads) {
		const dx = b.wx - midlineX;
		const dy = b.wy - apex.y;
		console.log(`x=${b.wx.toFixed(2)}, y=${b.wy.toFixed(2)} (dx=${dx.toFixed(2)}, dy=${dy.toFixed(2)}) HU=${b.hu}, dMm=${b.dMm}`);
	}

	const arch = detectHonestDentalArch(mandSlab, "mandible", 14.0);
	console.log("\nMandible Anchors:");
	for (const a of arch.anchors) {
		console.log(`  ${a.toothFdi}: pos=(${a.positionMm.x}, ${a.positionMm.y}) HU=${(a as any).peakHU}`);
	}
	console.log("Present:", arch.presentTeethFdi);
	console.log("Missing:", arch.missingTeethFdi);
}

main().catch(console.error);
