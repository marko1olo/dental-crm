import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { buildVolumeFromDicomBuffers } from "../apps/web/src/components/radiology/realDicomVolumeLoader";
import { findOcclusalZPlane, extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine";
import { detectHonestDentalArch } from "../apps/web/src/components/radiology/cbctHonestArchBlobEngine";

async function main() {
	const p = "apps/web/public/radiology/demo_cbct";
	const files = readdirSync(p).filter((f) => f.endsWith(".dcm")).sort();
	const items = files.map((f) => {
		const buf = readFileSync(path.join(p, f));
		return { buffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), fileName: f };
	});
	const vol = await buildVolumeFromDicomBuffers(items);
	const zMax = findOcclusalZPlane(vol, "maxilla");
	const slab = extractAxialMIPSlab(vol, zMax, 1.0);
	const arch = detectHonestDentalArch(slab, "maxilla", 14.0);

	console.log(`Zakharov Maxilla Anchors:`);
	for (const a of arch.anchors) {
		console.log(`  Anchor ${a.toothFdi}: pos=(${a.positionMm.x}, ${a.positionMm.y}) HU=${(a as any).peakHU}`);
	}
	console.log("Missing:", arch.missingTeethFdi);
	console.log("Present:", arch.presentTeethFdi);
}

main().catch(console.error);
