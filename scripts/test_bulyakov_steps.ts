import { readFileSync } from "node:fs";
import { buildVolumeFromMultiFrameDicom } from "../apps/web/src/components/radiology/dicomMultiFrameLoader.js";
import { findOcclusalZPlane, extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine.js";
import { extractEnamelBeadsDistanceTransform, findAnteriorArchApexRobust } from "../apps/web/src/components/radiology/cbctHonestArchBlobEngine.js";

async function main() {
	const p = "C:\\Users\\Admin\\Downloads\\Облако Mail\\Буляков Н.З. 29.08.2026г. ОЧ.dcm";
	const buf = readFileSync(p);
	const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
	const vol = await buildVolumeFromMultiFrameDicom(arrayBuf);
	
	const zMand = findOcclusalZPlane(vol, "mandible");
	const slab = extractAxialMIPSlab(vol, zMand, 6.0);
	const { apex, midlineX } = findAnteriorArchApexRobust(slab, "mandible");
	const beads = extractEnamelBeadsDistanceTransform(slab, 1150);

	console.log(`Bulyakov Mandible Beads (${beads.length}):`);
	const rightBeads = beads.filter(b => b.wx < midlineX).sort((a,b) => a.wy - b.wy);
	const leftBeads = beads.filter(b => b.wx >= midlineX).sort((a,b) => a.wy - b.wy);

	console.log("\n--- Right Branch ---");
	for (let i = 0; i < rightBeads.length; i++) {
		const b = rightBeads[i]!;
		const prev = i > 0 ? rightBeads[i-1]! : { wx: midlineX, wy: apex.y };
		const step = Math.hypot(b.wx - prev.wx, b.wy - prev.wy);
		console.log(`Bead ${i}: pos=(${b.wx.toFixed(2)}, ${b.wy.toFixed(2)}) stepFromPrev=${step.toFixed(2)}mm, HU=${b.hu}`);
	}

	console.log("\n--- Left Branch ---");
	for (let i = 0; i < leftBeads.length; i++) {
		const b = leftBeads[i]!;
		const prev = i > 0 ? leftBeads[i-1]! : { wx: midlineX, wy: apex.y };
		const step = Math.hypot(b.wx - prev.wx, b.wy - prev.wy);
		console.log(`Bead ${i}: pos=(${b.wx.toFixed(2)}, ${b.wy.toFixed(2)}) stepFromPrev=${step.toFixed(2)}mm, HU=${b.hu}`);
	}
}

main().catch(console.error);
