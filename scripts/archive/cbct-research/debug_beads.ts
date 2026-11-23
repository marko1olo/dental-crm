import { readFileSync } from "node:fs";
import { buildVolumeFromMultiFrameDicom } from "../apps/web/src/components/radiology/dicomMultiFrameLoader.js";
import { findOcclusalZPlane, extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine.js";
import { extractEnamelBeadsDistanceTransform, findAnteriorArchApexRobust } from "../apps/web/src/components/radiology/cbctHonestArchBlobEngine.js";

async function main() {
	const bufB = readFileSync("C:\\Users\\Admin\\Downloads\\Облако Mail\\Буляков Н.З. 29.08.2026г. ОЧ.dcm");
	const volB = await buildVolumeFromMultiFrameDicom(bufB.buffer.slice(bufB.byteOffset, bufB.byteOffset + bufB.byteLength));
	const z = findOcclusalZPlane(volB, "mandible");
	const mip = extractAxialMIPSlab(volB, z, 6.0);
	console.log("MIP info:", { width: mip.width, height: mip.height, originMm: mip.originMm, spacingMm: mip.spacingMm, z });
	
	const { apex, midlineX } = findAnteriorArchApexRobust(mip, "mandible");
	console.log("Apex:", apex, "midlineX:", midlineX);

	const rawBeads = extractEnamelBeadsDistanceTransform(mip, 1150);
	console.log("rawBeads count:", rawBeads.length);
	if (rawBeads.length > 0) {
		console.log("RawBeads sample:", rawBeads.slice(0, 10).map(b => `(${b.wx},${b.wy},HU:${b.hu})`).join(" "));
	}
}

main().catch(console.error);
