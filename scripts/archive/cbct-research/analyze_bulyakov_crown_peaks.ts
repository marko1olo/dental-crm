import { readFileSync } from "node:fs";
import path from "node:path";
import { buildVolumeFromMultiFrameDicom } from "../apps/web/src/components/radiology/realDicomVolumeLoader.ts";
import { autoDetectDentalArch, findOcclusalZPlane, extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine.ts";
import { calculateArchTangentsAndNormals } from "../apps/web/src/components/radiology/cbctArchSplineMath.ts";
import { sampleVoxelTrilinearHU } from "../apps/web/src/components/radiology/cbctMprMath.ts";

async function analyzeBulyakov() {
	const filePath = "C:\\Users\\Admin\\Downloads\\Облако Mail\\Буляков Н.З. 29.08.2026г. ОЧ.dcm";
	const buf = readFileSync(filePath);
	const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

	console.log("Loading Bulyakov volume...");
	const volume = await buildVolumeFromMultiFrameDicom(ab);
	const mandZ = findOcclusalZPlane(volume, "mandible");
	console.log(`Mandible Z = ${mandZ.toFixed(2)} mm`);

	// Auto-detect initial arch curve
	const arch = autoDetectDentalArch(volume, "mandible", 14.0);
	console.log(`Arch points: ${arch.splinePointsMm.length}, arc length: ${arch.totalArcLengthMm.toFixed(1)} mm`);

	// Calculate tangents and normals along spline
	const vectorField = calculateArchTangentsAndNormals(arch.splinePointsMm);
	const totalLen = arch.totalArcLengthMm;

	// Extract axial slab around occlusal plane
	const slab = extractAxialMIPSlab(volume, mandZ, 4.0);

	// Profile along the arch
	console.log("\n--- Profiling Enamel HU along the arch ---");
	const profile: Array<{ distMm: number; maxHU: number; meanHU: number; xMm: number; yMm: number }> = [];

	for (let i = 0; i < vectorField.length; i++) {
		const node = vectorField[i]!;
		const pt = node.point;
		const norm = node.normal;

		// Sample across transverse strip +/- 4 mm around arch
		let maxHU = -1000;
		let sumHU = 0;
		let count = 0;

		for (let offsetMm = -4.0; offsetMm <= 4.0; offsetMm += 0.5) {
			const sx = pt.x + norm.x * offsetMm;
			const sy = pt.y + norm.y * offsetMm;
			// Convert to voxel
			const vx = (sx - volume.originMm.x) / volume.spacingMm.x;
			const vy = (sy - volume.originMm.y) / volume.spacingMm.y;
			const vz = (mandZ - volume.originMm.z) / volume.spacingMm.z;

			if (vx >= 0 && vx < volume.dimensions.width && vy >= 0 && vy < volume.dimensions.height) {
				const hu = sampleVoxelTrilinearHU(vx, vy, vz, volume);
				if (hu > maxHU) maxHU = hu;
				if (hu >= 1000) {
					sumHU += hu;
					count++;
				}
			}
		}

		profile.push({
			distMm: node.distanceAlongArchMm,
			maxHU,
			meanHU: count > 0 ? Math.round(sumHU / count) : 0,
			xMm: pt.x,
			yMm: pt.y,
		});
	}

	// Find local peaks of maxHU >= 1800
	const peaks: any[] = [];
	for (let i = 2; i < profile.length - 2; i++) {
		const p = profile[i]!;
		if (p.maxHU >= 1600) {
			const prev1 = profile[i - 1]!.maxHU;
			const prev2 = profile[i - 2]!.maxHU;
			const next1 = profile[i + 1]!.maxHU;
			const next2 = profile[i + 2]!.maxHU;

			if (p.maxHU >= prev1 && p.maxHU >= prev2 && p.maxHU >= next1 && p.maxHU >= next2) {
				// Avoid peaks too close (< 4 mm)
				if (peaks.length === 0 || p.distMm - peaks[peaks.length - 1].distMm >= 4.0) {
					peaks.push(p);
				}
			}
		}
	}

	console.log(`Found ${peaks.length} crown peaks along arch:`);
	for (let i = 0; i < peaks.length; i++) {
		const pk = peaks[i]!;
		const delta = i > 0 ? (pk.distMm - peaks[i - 1].distMm).toFixed(1) : "0.0";
		console.log(`  Peak ${i + 1}: dist = ${pk.distMm.toFixed(1)} mm (step: ${delta} mm) | maxHU = ${pk.maxHU} | X: ${pk.xMm.toFixed(1)}, Y: ${pk.yMm.toFixed(1)}`);
	}
}

analyzeBulyakov().catch(console.error);
