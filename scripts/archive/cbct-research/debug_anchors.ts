import { readFileSync, readdirSync, statSync } from "node:fs";
import * as path from "node:path";
import { buildVolumeFromMultiFrameDicom } from "../apps/web/src/components/radiology/dicomMultiFrameLoader.js";
import { buildVolumeFromDicomBuffers } from "../apps/web/src/components/radiology/realDicomVolumeLoader.js";
import { findOcclusalZPlane, extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine.js";
import { detectHonestDentalArch } from "../apps/web/src/components/radiology/cbctHonestArchBlobEngine.js";

async function main() {
	// Bulyakov
	console.log("Loading Bulyakov...");
	const bufB = readFileSync("C:\\Users\\Admin\\Downloads\\Облако Mail\\Буляков Н.З. 29.08.2026г. ОЧ.dcm");
	const volB = await buildVolumeFromMultiFrameDicom(bufB.buffer.slice(bufB.byteOffset, bufB.byteOffset + bufB.byteLength));
	for (const jaw of ["mandible", "maxilla"] as const) {
		const z = findOcclusalZPlane(volB, jaw);
		const mip = extractAxialMIPSlab(volB, z, 6.0);
		const res = detectHonestDentalArch(mip, jaw);
		console.log(`Bulyakov ${jaw}: apex=(${res.apexMm.x}, ${res.apexMm.y}), arcLen=${res.curve.totalArcLengthMm} mm`);
		console.log(`  Anchors (${res.anchors.length}):`, res.anchors.map(a => `${a.toothFdi}:(${a.positionMm.x},${a.positionMm.y})`).join(" "));
	}

	// Zakharov
	console.log("\nLoading Zakharov...");
	const dirZ = "apps/web/public/radiology/demo_cbct";
	const files = readdirSync(dirZ).filter((f) => f.endsWith(".dcm") || !f.includes("."));
	const items = files.map((f) => {
		const b = readFileSync(path.join(dirZ, f));
		return { buffer: b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), fileName: f };
	});
	const volZ = buildVolumeFromDicomBuffers(items);
	for (const jaw of ["mandible", "maxilla"] as const) {
		const z = findOcclusalZPlane(volZ, jaw);
		const mip = extractAxialMIPSlab(volZ, z, 6.0);
		const res = detectHonestDentalArch(mip, jaw);
		console.log(`Zakharov ${jaw}: apex=(${res.apexMm.x}, ${res.apexMm.y}), arcLen=${res.curve.totalArcLengthMm} mm`);
		console.log(`  Anchors (${res.anchors.length}):`, res.anchors.map(a => `${a.toothFdi}:(${a.positionMm.x},${a.positionMm.y})`).join(" "));
	}
}

main().catch(console.error);
