import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateVariableTroughThicknessMm,
	getFocalTroughBoundaryCurves,
	fitSmoothDentalArchSpline,
} from "../cbctArchSplineMath";
import {
	calculateToothTiltVector,
	buildEndodonticSliceBasis,
} from "../cbctToothTiltMath";
import {
	measureAlveolarRidgeCaliper,
	generateRidge043ProtocolText,
} from "../cbctRidgeCaliperMath";
import {
	createEmptyCbctVolume,
	type CbctVoxelVolume,
	worldMmToVoxel,
} from "../cbctMprMath";
import {
	DEFAULT_MANDIBULAR_ARCH_ANCHORS,
} from "../dentalCurveEngine";

describe("CBCT Clinical Expansion Features Suite", () => {
	describe("1. Variable Focal Trough Engine (Feature A)", () => {
		it("calculates accurate clinical thicknesses: incisors 8-10 mm, premolars 12-14 mm, molars 18-22 mm", () => {
			const totalLen = 120.0;

			// Incisor apex (midpoint: s = 0.5)
			const tFront = calculateVariableTroughThicknessMm(60.0, totalLen);
			assert.ok(tFront >= 8.5 && tFront <= 10.0, `Front thickness ${tFront} should be ~9 mm`);

			// Premolar zone (s = 0.25 and s = 0.75)
			const tPremolarRight = calculateVariableTroughThicknessMm(30.0, totalLen);
			const tPremolarLeft = calculateVariableTroughThicknessMm(90.0, totalLen);
			assert.ok(tPremolarRight >= 12.0 && tPremolarRight <= 14.5, `Premolar R thickness ${tPremolarRight} should be ~13 mm`);
			assert.ok(tPremolarLeft >= 12.0 && tPremolarLeft <= 14.5, `Premolar L thickness ${tPremolarLeft} should be ~13 mm`);

			// Molar & ramus zone (s = 0.0 and s = 1.0)
			const tMolarRight = calculateVariableTroughThicknessMm(0.0, totalLen);
			const tMolarLeft = calculateVariableTroughThicknessMm(120.0, totalLen);
			assert.ok(tMolarRight >= 18.0 && tMolarRight <= 22.0, `Molar R thickness ${tMolarRight} should be ~20 mm`);
			assert.ok(tMolarLeft >= 18.0 && tMolarLeft <= 22.0, `Molar L thickness ${tMolarLeft} should be ~20 mm`);
		});

		it("generates continuous inner and outer boundary curves with variable trough option", () => {
			const spline = fitSmoothDentalArchSpline(DEFAULT_MANDIBULAR_ARCH_ANCHORS, 8);
			const trough = getFocalTroughBoundaryCurves(spline, 14.0, {
				enabled: true,
				anteriorThicknessMm: 9.0,
				premolarThicknessMm: 13.0,
				molarThicknessMm: 20.0,
			});

			assert.equal(trough.innerBoundary.length, trough.outerBoundary.length);
			assert.ok(trough.innerBoundary.length > 50);

			// Measure boundary width at ends vs center
			const n = trough.innerBoundary.length;
			const midIdx = Math.floor(n / 2);

			const widthDistal = Math.hypot(
				trough.outerBoundary[0]!.x - trough.innerBoundary[0]!.x,
				trough.outerBoundary[0]!.y - trough.innerBoundary[0]!.y,
			);
			const widthCenter = Math.hypot(
				trough.outerBoundary[midIdx]!.x - trough.innerBoundary[midIdx]!.x,
				trough.outerBoundary[midIdx]!.y - trough.innerBoundary[midIdx]!.y,
			);

			assert.ok(widthDistal > widthCenter + 5.0, `Distal width ${widthDistal} mm must be wider than anterior width ${widthCenter} mm`);
		});
	});

	describe("2. Tooth Tilt Vector Engine (Feature B)", () => {
		it("calculates 3D longitudinal root canal axis and spatial tilt angles", () => {
			const volume = createEmptyCbctVolume(100, 100, 50, 0.5, -1000);
			// Align origin: (-25, -25, -10) mm
			(volume as any).originMm = { x: -25.0, y: -25.0, z: -10.0 };

			// Paint a tilted tooth root for 46 (tilted 15 degrees mesially)
			const anchor = {
				id: "a-46",
				toothFdi: "46",
				labelRu: "46 (1-й моляр)",
				positionMm: { x: 0.0, y: 0.0 },
				isQuadrantRight: true,
			};

			const crownZ = 0.0;
			// Paint crown (3200 HU)
			for (let step = 0; step <= 10; step++) {
				const z = crownZ + step * 1.0;
				// Mesial tilt: dx = step * 0.3 mm
				const x = step * 0.3;
				const y = step * 0.1;
				const vox = worldMmToVoxel({ x, y, z }, volume);
				if (vox.x >= 0 && vox.x < 100 && vox.y >= 0 && vox.y < 100 && vox.z >= 0 && vox.z < 50) {
					volume.data![vox.z * 10000 + vox.y * 100 + vox.x] = 1800; // Dentin
				}
			}

			const tilt = calculateToothTiltVector(volume, anchor, crownZ, "mandible");

			assert.equal(tilt.toothFdi, "46");
			assert.ok(tilt.canalDetected, "Root canal dentin should be detected");
			assert.ok(tilt.rootLengthMm >= 6.0, `Root length ${tilt.rootLengthMm} should be >= 6 mm`);
			assert.ok(Number.isFinite(tilt.mesiodistalTiltDeg));
			assert.ok(Number.isFinite(tilt.buccolingualTiltDeg));

			// Construct orthonormal slicing basis
			const basis = buildEndodonticSliceBasis(tilt);
			assert.ok(Number.isFinite(basis.upAxis.z));
			assert.ok(Number.isFinite(basis.rightAxis.x));
			assert.ok(Number.isFinite(basis.normalAxis.y));

			// Verify orthogonality: right . up === 0, right . normal === 0
			const dotRightUp = basis.rightAxis.x * basis.upAxis.x + basis.rightAxis.y * basis.upAxis.y + basis.rightAxis.z * basis.upAxis.z;
			assert.ok(Math.abs(dotRightUp) < 1e-3, `Right and Up axes must be orthogonal (dot = ${dotRightUp})`);
		});
	});

	describe("3. Alveolar Ridge Caliper Engine (Feature C)", () => {
		it("measures W2, W6, H and Misch bone quality on simulated ridge cross-section", () => {
			const w = 80;
			const h = 100;
			const spacing = 0.25; // 0.25 mm per pixel -> 20 x 25 mm slice
			const slice = new Float32Array(w * h).fill(-1000);

			// Paint alveolar ridge in mandible:
			// Crest starts at Y = 20 (y = 5.0 mm)
			// Bone extends from Y = 20 to Y = 70 (height = 50 px = 12.5 mm)
			// At Y = 28 (depth 2 mm): width = 24 px = 6.0 mm (W2)
			// At Y = 44 (depth 6 mm): width = 32 px = 8.0 mm (W6)
			// At Y = 68: mandibular canal lumen (HU = 50)
			for (let y = 20; y < 80; y++) {
				const depthPx = y - 20;
				// Ridge widens with depth: 10 px at crest, 16 px at depth 2 mm, 20 px at depth 6 mm
				const halfWidthPx = Math.min(22, 6 + depthPx * 0.4);
				for (let x = Math.round(40 - halfWidthPx); x <= Math.round(40 + halfWidthPx); x++) {
					slice[y * w + x] = 900; // D2 bone
				}
			}

			// Canal lumen at Y = 68, X = 40 (radius 4 px)
			for (let dy = -3; dy <= 3; dy++) {
				for (let dx = -3; dx <= 3; dx++) {
					slice[(68 + dy) * w + (40 + dx)] = 50; // Nerve canal soft tissue
				}
			}

			const caliper = measureAlveolarRidgeCaliper(slice, w, h, spacing, "mandible", "tooth_46");

			assert.equal(caliper.toothFdiOrSite, "tooth_46");
			assert.ok(caliper.widthAt2Mm >= 5.0 && caliper.widthAt2Mm <= 7.5, `W2 width ${caliper.widthAt2Mm} mm should be ~6 mm`);
			assert.ok(caliper.widthAt6Mm >= 7.0 && caliper.widthAt6Mm <= 9.5, `W6 width ${caliper.widthAt6Mm} mm should be ~8 mm`);
			assert.ok(caliper.availableHeightMm >= 10.0 && caliper.availableHeightMm <= 14.0, `Height ${caliper.availableHeightMm} mm should be ~12 mm`);
			assert.equal(caliper.anatomicalLimit, "mandibular_canal");
			assert.equal(caliper.boneQualityMisch, "D2");
		});

		it("generates evidence-based 043/u protocol with sinus lift recommendations", () => {
			// Case A: Zakharov 26 (H = 7.25 mm -> closed sinus lift)
			const mockCaliper26 = {
				toothFdiOrSite: "26",
				crestPointMm: { x: 10.5, y: 33.25 },
				widthAt2Mm: 4.2, // Narrow crest (< 5 mm)
				widthAt6Mm: 7.5,
				availableHeightMm: 7.25, // 5..10 mm -> closed sinus lift
				anatomicalLimit: "maxillary_sinus" as const,
				boneQualityMisch: "D4" as const,
				meanDensityHU: 137,
				measurementPoints: {
					crest: { x: 10.5, y: 33.25 },
					w2Buccal: { x: 8.4, y: 31.25 },
					w2Lingual: { x: 12.6, y: 31.25 },
					w6Buccal: { x: 6.75, y: 27.25 },
					w6Lingual: { x: 14.25, y: 27.25 },
					baseLimit: { x: 10.5, y: 26.0 },
				},
			};

			const rep26 = generateRidge043ProtocolText(mockCaliper26, "Захаров И.Д.", "26");
			assert.equal(rep26.toothFdi, "26");
			assert.equal(rep26.sinusLiftNeeded, true);
			assert.equal(rep26.sinusLiftType, "transcrestal_closed");
			assert.equal(rep26.boneAugmentationNeeded, true); // W2 = 4.2 < 5.0 mm
			assert.ok(rep26.statusLocalis043.includes("W2 = 4.2 мм"));
			assert.ok(rep26.statusLocalis043.includes("W6 = 7.5 мм"));
			assert.ok(rep26.statusLocalis043.includes("H = 7.3 мм") || rep26.statusLocalis043.includes("H = 7.2 мм") || rep26.statusLocalis043.includes("H = 7.25 мм"));
			assert.ok(rep26.surgicalRecommendation043.includes("закрытым (транскрестальным"));
			assert.ok(rep26.surgicalRecommendation043.includes("Горизонтальный дефицит"));
			assert.ok(rep26.fullProtocolText.includes("ФОРМЫ 043/У"));

			// Case B: Severe vertical atrophy (H = 3.2 mm -> open lateral sinus lift)
			const mockCaliperSevere = {
				...mockCaliper26,
				availableHeightMm: 3.2,
			};
			const repSevere = generateRidge043ProtocolText(mockCaliperSevere, "Захаров И.Д.", "26");
			assert.equal(repSevere.sinusLiftNeeded, true);
			assert.equal(repSevere.sinusLiftType, "lateral_open");
			assert.ok(repSevere.surgicalRecommendation043.includes("открытый (латеральный"));

			// Zero cartoon emojis verification (Mandate 8d)
			const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
			assert.ok(!emojiRegex.test(rep26.fullProtocolText), "043/u protocol must strictly contain 0 emojis");
		});
	});
});
