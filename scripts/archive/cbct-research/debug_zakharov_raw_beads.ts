import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { buildVolumeFromDicomBuffers } from "../apps/web/src/components/radiology/realDicomVolumeLoader";
import { findOcclusalZPlane, extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine";
import { extractEnamelBeadsDistanceTransform } from "../apps/web/src/components/radiology/cbctHonestArchBlobEngine";

async function main() {
	const p = "apps/web/public/radiology/demo_cbct";
	const files = readdirSync(p).filter((f) => f.endsWith(".dcm")).sort();
	const items = files.map((f) => {
		const buf = readFileSync(path.join(p, f));
		return { buffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), fileName: f };
	});
	const vol = await buildVolumeFromDicomBuffers(items);
	const zMax = findOcclusalZPlane(vol, "maxilla");
	console.log(`Zakharov Maxilla Z = ${zMax.toFixed(2)} mm`);

	// Extract native 1.0mm thin slice (NOT 8mm MIP!)
	const thinSlab = extractAxialMIPSlab(vol, zMax, 1.0);
	const rawBeads = extractEnamelBeadsDistanceTransform(thinSlab, 1150);
	console.log(`Raw beads found on 1.0mm slice: ${rawBeads.length}`);
	for (const b of rawBeads) {
		console.log(`  Bead at (${b.wx.toFixed(1)}, ${b.wy.toFixed(1)}) HU=${b.hu} dMm=${b.dMm}`);
	}
}

main().catch(console.error);
