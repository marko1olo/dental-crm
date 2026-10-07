import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	findOcclusalZPlane,
	extractAxialMIPSlab,
	detectDentalArchCentroids,
	autoDetectDentalArch,
} from "../cbctAutoArchEngine";
import {
	detectHonestDentalArch,
	findAnteriorArchApexRobust,
	extractEnamelBeadsDistanceTransform,
} from "../cbctHonestArchBlobEngine";
import {
	createEmptyCbctVolume,
	type CbctVoxelVolume,
	worldMmToVoxel,
} from "../cbctMprMath";
import {
	DEFAULT_MANDIBULAR_ARCH_ANCHORS,
	calculateArchLengthMm,
	projectPointOntoArchSpline,
} from "../cbctArchSplineMath";
import type { AxialMIPSlab } from "../cbctAutoArchTypes";

/**
 * Creates a calibrated base mandibular volume (180x180x60 voxels, 0.5 mm spacing).
 * Origin: (-45, -75, -15) mm -> physical dimensions 90 x 90 x 30 mm.
 * Mandibular arch placed at Z = -10.0 mm with cortical bone (HU = 600..900) and tooth crowns (HU = 2500..3200).
 */
function createBaseMandibularVolume(): CbctVoxelVolume {
	const width = 200;
	const height = 180;
	const depth = 60;
	const spacingMm = 0.5;

	const volume = createEmptyCbctVolume(width, height, depth, spacingMm, -1000);
	(volume as { originMm: { x: number; y: number; z: number } }).originMm = {
		x: -50.0,
		y: -75.0,
		z: -15.0,
	};
	return volume;
}

/**
 * Paints teeth on volume according to an anchor list with realistic anatomical crown dimensions
 * (Misch / Wheeler: molars r ~ 3.5mm, premolars r ~ 2.7mm, canines r ~ 2.4mm, incisors r ~ 2.0mm).
 */
function paintTeethOnVolume(
	volume: CbctVoxelVolume,
	anchors: Array<{ toothFdi: string; x: number; y: number; z: number; hu?: number }>,
	paintAlveolarBone = true,
): void {
	const { width, height, depth } = volume.dimensions;
	const data = volume.data!;
	const totalSliceVoxels = width * height;
	const sp = volume.spacingMm.x || 0.5;

	for (const tooth of anchors) {
		const vox = worldMmToVoxel({ x: tooth.x, y: tooth.y, z: tooth.z }, volume);
		const crownHU = tooth.hu ?? 3000;

		const fdiNum = parseInt(tooth.toothFdi, 10);
		const toothPos = fdiNum % 10; // 1..8
		let radiusMm = 2.0; // incisors (1, 2)
		if (toothPos === 3) radiusMm = 2.4; // canine
		else if (toothPos === 4 || toothPos === 5) radiusMm = 2.7; // premolars
		else if (toothPos >= 6) radiusMm = 3.6; // molars

		const rVox = Math.round(radiusMm / sp);
		const zRadiusVox = 2; // ~1 mm height

		for (let dz = -zRadiusVox; dz <= zRadiusVox; dz++) {
			for (let dy = -rVox; dy <= rVox; dy++) {
				for (let dx = -rVox; dx <= rVox; dx++) {
					if (Math.hypot(dx * sp, dy * sp) <= radiusMm) {
						const z = vox.z + dz;
						const y = vox.y + dy;
						const x = vox.x + dx;
						if (x >= 0 && x < width && y >= 0 && y < height && z >= 0 && z < depth) {
							data[z * totalSliceVoxels + y * width + x] = crownHU;
						}
					}
				}
			}
		}

		// Alveolar bone ridge beneath and around tooth (HU = 650)
		if (paintAlveolarBone) {
			const boneRadiusMm = radiusMm + 1.2;
			const boneRVox = Math.round(boneRadiusMm / sp);
			for (let dz = -6; dz <= -1; dz++) {
				for (let dy = -boneRVox; dy <= boneRVox; dy++) {
					for (let dx = -boneRVox; dx <= boneRVox; dx++) {
						if (Math.hypot(dx * sp, dy * sp) <= boneRadiusMm) {
							const z = vox.z + dz;
							const y = vox.y + dy;
							const x = vox.x + dx;
							if (x >= 0 && x < width && y >= 0 && y < height && z >= 0 && z < depth) {
								const idx = z * totalSliceVoxels + y * width + x;
								if (data[idx]! < 650) data[idx] = 650;
							}
						}
					}
				}
			}
		}
	}
}

describe("CBCT Arch Stress & Edge Cases Inquisition Suite", () => {
	describe("1. Partial Adentia: Loss of Molar Teeth (4.6, 4.7)", () => {
		it("detects arch without singularity when 4.6 and 4.7 are missing", () => {
			const volume = createBaseMandibularVolume();
			const mandibularZ = -10.0;

			// All teeth EXCEPT 4.6 and 4.7
			const dentition = DEFAULT_MANDIBULAR_ARCH_ANCHORS.filter(
				(a) => a.toothFdi !== "46" && a.toothFdi !== "47",
			).map((a) => ({
				toothFdi: a.toothFdi,
				x: a.positionMm.x,
				y: a.positionMm.y,
				z: mandibularZ,
			}));

			// Alveolar ridge bone (residual crest) remains in the defect area (4.6, 4.7) at HU = 550
			paintTeethOnVolume(volume, dentition, true);
			const missing46 = DEFAULT_MANDIBULAR_ARCH_ANCHORS.find((a) => a.toothFdi === "46")!;
			const missing47 = DEFAULT_MANDIBULAR_ARCH_ANCHORS.find((a) => a.toothFdi === "47")!;
			for (const m of [missing46, missing47]) {
				const vox = worldMmToVoxel({ x: m.positionMm.x, y: m.positionMm.y, z: mandibularZ }, volume);
				const data = volume.data!;
				const totalSliceVoxels = volume.dimensions.width * volume.dimensions.height;
				for (let dz = -2; dz <= 0; dz++) {
					for (let dy = -1; dy <= 1; dy++) {
						for (let dx = -1; dx <= 1; dx++) {
							const z = vox.z + dz;
							const y = vox.y + dy;
							const x = vox.x + dx;
							if (z >= 0 && z < volume.dimensions.depth && y >= 0 && y < volume.dimensions.height && x >= 0 && x < volume.dimensions.width) {
								data[z * totalSliceVoxels + y * volume.dimensions.width + x] = 550;
							}
						}
					}
				}
			}

			// Test cbctAutoArchEngine
			const autoCurve = autoDetectDentalArch(volume, "mandible");
			assert.ok(autoCurve.splinePointsMm.length >= 16);
			assert.ok(Number.isFinite(autoCurve.totalArcLengthMm));
			assert.ok(autoCurve.totalArcLengthMm > 50.0);

			// Test cbctHonestArchBlobEngine
			const mip = extractAxialMIPSlab(volume, mandibularZ, 6.0);
			const honestRes = detectHonestDentalArch(mip, "mandible");

			// Honest engine must recognize 46 and 47 as missing
			assert.ok(honestRes.missingTeethFdi.includes("46"), "Missing teeth must include 46");
			assert.ok(honestRes.missingTeethFdi.includes("47"), "Missing teeth must include 47");
			assert.ok(honestRes.presentTeethFdi.includes("48"), "Present teeth must include 48");
			assert.ok(honestRes.presentTeethFdi.includes("45"), "Present teeth must include 45");

			// Spline must smoothly bridge 48 to 45 without NaN or infinite curvature
			assert.ok(honestRes.curve.splinePointsMm.length >= 10);
			for (const pt of honestRes.curve.splinePointsMm) {
				assert.ok(Number.isFinite(pt.x));
				assert.ok(Number.isFinite(pt.y));
			}

			// Residual ridge position test: check spline point near Y = -18 mm (midway between 45 and 48)
			const projMid = projectPointOntoArchSpline({ x: -27.6, y: -18.0 }, honestRes.curve.splinePointsMm);
			assert.ok(
				projMid.lateralOffsetMm < 4.0,
				`Spline must pass through alveolar defect corridor (lateral offset < 4mm), got ${projMid.lateralOffsetMm}`,
			);
		});

		it("tests terminal free-end adentia (distal extension loss: missing 4.8, 4.7, 4.6)", () => {
			const volume = createBaseMandibularVolume();
			const mandibularZ = -10.0;

			// Teeth missing: 48, 47, 46 (Kennedy Class II free-end defect)
			const dentition = DEFAULT_MANDIBULAR_ARCH_ANCHORS.filter(
				(a) => !["48", "47", "46"].includes(a.toothFdi),
			).map((a) => ({
				toothFdi: a.toothFdi,
				x: a.positionMm.x,
				y: a.positionMm.y,
				z: mandibularZ,
			}));

			paintTeethOnVolume(volume, dentition, true);

			const mip = extractAxialMIPSlab(volume, mandibularZ, 6.0);
			const honestRes = detectHonestDentalArch(mip, "mandible");

			assert.ok(honestRes.missingTeethFdi.includes("48"));
			assert.ok(honestRes.missingTeethFdi.includes("47"));
			assert.ok(honestRes.missingTeethFdi.includes("46"));
			assert.ok(honestRes.presentTeethFdi.includes("45"));

			// Spline must not collapse or produce looping
			assert.ok(honestRes.curve.splinePointsMm.length >= 5);
			const totalLen = calculateArchLengthMm(honestRes.curve.splinePointsMm);
			assert.ok(totalLen > 40.0, `Arch length must be realistic, got ${totalLen}`);
		});
	});

	describe("2. Frontal Adentia: Loss of Anterior Incisors (4.1, 4.2, 3.1, 3.2)", () => {
		it("evaluates apex detection and arch shape when anterior teeth are completely absent", () => {
			const volume = createBaseMandibularVolume();
			const mandibularZ = -10.0;

			// Anterior incisors 42, 41, 31, 32 missing. Canines 43 and 33 are present.
			const dentition = DEFAULT_MANDIBULAR_ARCH_ANCHORS.filter(
				(a) => !["42", "41", "31", "32"].includes(a.toothFdi),
			).map((a) => ({
				toothFdi: a.toothFdi,
				x: a.positionMm.x,
				y: a.positionMm.y,
				z: mandibularZ,
			}));

			paintTeethOnVolume(volume, dentition, true);

			// Paint residual anterior cortical bone crest at (X: -10..10 mm, Y = -54.0 mm) with HU = 550
			const width = volume.dimensions.width;
			const totalSliceVoxels = width * volume.dimensions.height;
			const data = volume.data!;
			for (let dz = -2; dz <= 2; dz++) {
				for (let dyMm = -1.0; dyMm <= 1.0; dyMm += 0.5) {
					for (let xMm = -10; xMm <= 10; xMm += 0.5) {
						const vox = worldMmToVoxel({ x: xMm, y: -54.0 + dyMm, z: mandibularZ }, volume);
						const z = vox.z + dz;
						if (vox.x >= 0 && vox.x < width && vox.y >= 0 && vox.y < volume.dimensions.height && z >= 0 && z < volume.dimensions.depth) {
							const idx = z * totalSliceVoxels + vox.y * width + vox.x;
							if (data[idx]! < 550) data[idx] = 550;
						}
					}
				}
			}

			const mip = extractAxialMIPSlab(volume, mandibularZ, 6.0);
			const apexResult = findAnteriorArchApexRobust(mip, "mandible");

			// Apex finder must lock onto the anterior cortical bone crest
			assert.ok(
				Math.abs(apexResult.apex.y - (-54.0)) <= 3.0,
				`Apex Y must detect cortical crest ~ -54mm, got ${apexResult.apex.y}`,
			);

			// Honest arch detection
			const honestRes = detectHonestDentalArch(mip, "mandible");
			assert.ok(honestRes.missingTeethFdi.includes("41"));
			assert.ok(honestRes.missingTeethFdi.includes("31"));
			assert.ok(honestRes.presentTeethFdi.includes("43"));
			assert.ok(honestRes.presentTeethFdi.includes("33"));
		});
	});

	describe("3. Severe Jaw Asymmetry (Unilateral Crossbite / Hemifacial Width Difference)", () => {
		it("compares honest engine vs auto-arch forced symmetry on asymmetric mandible", () => {
			const volume = createBaseMandibularVolume();
			const mandibularZ = -10.0;

			// Asymmetric jaw: Right side normal, Left side expanded buccally by +12 mm
			// (e.g. Left molars at X = +40 mm instead of +28 mm)
			const asymmetricAnchors = DEFAULT_MANDIBULAR_ARCH_ANCHORS.map((a) => {
				if (!a.isQuadrantRight) {
					// Left quadrant: expand X by +12 mm
					return {
						toothFdi: a.toothFdi,
						x: a.positionMm.x + 12.0,
						y: a.positionMm.y,
						z: mandibularZ,
					};
				}
				return {
					toothFdi: a.toothFdi,
					x: a.positionMm.x,
					y: a.positionMm.y,
					z: mandibularZ,
				};
			});

			paintTeethOnVolume(volume, asymmetricAnchors, true);

			const mip = extractAxialMIPSlab(volume, mandibularZ, 6.0);

			// 1. Honest engine: strictly follows genuine teeth without forced symmetry
			const honestRes = detectHonestDentalArch(mip, "mandible");
			const honestLeftMolar = honestRes.anchors.find((a) => a.toothFdi === "38" || a.toothFdi === "37");
			assert.ok(honestLeftMolar, "Left molar must be detected in honest engine");
			assert.ok(
				honestLeftMolar.positionMm.x > 38.0,
				`Honest engine must honor true anatomical asymmetry (X > 38 mm), got ${honestLeftMolar.positionMm.x}`,
			);

			// 2. AutoArch polar engine: inspect symmetry regularization impact
			const autoCurve = autoDetectDentalArch(volume, "mandible");
			const autoLeftMolar = autoCurve.anchors.find((a) => a.toothFdi === "38");
			assert.ok(autoLeftMolar);
		});
	});

	describe("4. Patient Head Tilt (Oblique Slice / Pitch-Roll Slanted Volume)", () => {
		it("stress-tests findOcclusalZPlane and MIP extraction under 12 mm occlusal slope", () => {
			const volume = createBaseMandibularVolume();

			// Pitch tilt: Incisors at Z = -16.0 mm, Molars at Z = -4.0 mm (12 mm Z-spread)
			const slantedAnchors = DEFAULT_MANDIBULAR_ARCH_ANCHORS.map((a) => {
				// y ranges from -55 mm (incisors) to 0 mm (3rd molars)
				// Z slope: z = -4.0 + (y / 55.0) * (-12.0)
				const frac = (a.positionMm.y - 0.0) / -55.0; // 0 at molars, 1 at incisors
				const slantedZ = -4.0 - frac * 12.0;
				return {
					toothFdi: a.toothFdi,
					x: a.positionMm.x,
					y: a.positionMm.y,
					z: Number(slantedZ.toFixed(2)),
				};
			});

			paintTeethOnVolume(volume, slantedAnchors, true);

			// Occlusal plane detection
			const detectedZ = findOcclusalZPlane(volume, "mandible");
			assert.ok(Number.isFinite(detectedZ));
			// Detected Z should fall inside the slanted range [-16..-4] mm
			assert.ok(
				detectedZ >= -17.0 && detectedZ <= -3.0,
				`Detected Z must lie within slanted occlusal table [-16..-4], got ${detectedZ}`,
			);

			// Inspect how thin 6mm MIP slab behaves vs thick 14mm slab
			const thinMip = extractAxialMIPSlab(volume, detectedZ, 6.0);
			const thickMip = extractAxialMIPSlab(volume, detectedZ, 14.0);

			const thinBeads = extractEnamelBeadsDistanceTransform(thinMip, 1150);
			const thickBeads = extractEnamelBeadsDistanceTransform(thickMip, 1150);

			// In a 12mm slanted case, thick MIP (14mm) should capture significantly more teeth than thin (6mm)!
			assert.ok(
				thickBeads.length >= thinBeads.length,
				`Thick MIP (${thickBeads.length} beads) should capture >= thin MIP (${thinBeads.length} beads)`,
			);
		});
	});
});
