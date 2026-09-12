import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { VolumeSamplingData } from "../cprMath.js";
import { AIR_HU } from "../cprMath.js";
import {
	classifyMischBone,
	classifyLekholmZarb,
	calculateCorticalThickness,
	determineOsteotomyProtocol,
	sampleImplantSiteBoneQuality,
	formatBoneQualityForm043A4Protocol,
	mischBoneClassSchema,
	lekholmZarbTypeSchema,
	boneSamplingConfigSchema,
	osteotomyRecommendationSchema,
	boneSiteAssessmentSchema,
	MISCH_CLASSIFICATION_INFO,
	LEKHOLM_ZARB_INFO,
	type MischBoneClass,
	type LekholmZarbType,
} from "../boneQualityEngine.js";

// Helper to create a synthetic 3D alveolar ridge volume for 100% pure unit testing
function createSyntheticBoneVolume(): VolumeSamplingData {
	// 40x40x40 voxels at 0.5mm spacing -> 20mm x 20mm x 20mm world volume
	const dims: [number, number, number] = [40, 40, 40];
	const origin: [number, number, number] = [0, 0, 0];
	const vSpacing = 0.5;

	// Grid field array
	const grid = new Float32Array(dims[0] * dims[1] * dims[2]);

	for (let k = 0; k < dims[2]; k++) {
		const zWorld = k * vSpacing;
		for (let j = 0; j < dims[1]; j++) {
			for (let i = 0; i < dims[0]; i++) {
				const idx = i + j * dims[0] + k * dims[0] * dims[1];
				if (zWorld > 16) {
					// Air above the alveolar ridge
					grid[idx] = AIR_HU;
				} else if (zWorld >= 14) {
					// Crestal cortical layer: 14mm..16mm (2.0 mm thick) -> ~1050 HU
					grid[idx] = 1050;
				} else if (zWorld >= 4) {
					// Cancellous / trabecular bone core: 4mm..14mm -> ~650 HU
					grid[idx] = 650;
				} else {
					// Basal / apical cortical plate: 0mm..4mm -> ~1150 HU
					grid[idx] = 1150;
				}
			}
		}
	}

	return {
		dims,
		origin,
		getVoxel: (i: number, j: number, k: number) => {
			if (i < 0 || i >= dims[0] || j < 0 || j >= dims[1] || k < 0 || k >= dims[2]) {
				return AIR_HU;
			}
			return grid[i + j * dims[0] + k * dims[0] * dims[1]] ?? AIR_HU;
		},
		invSx: 1 / vSpacing,
		invSy: 1 / vSpacing,
		invSz: 1 / vSpacing,
		zMin: 0,
		zMax: dims[2] * vSpacing,
		vSpacing,
	};
}

describe("Wave 139: CBCT Bone Quality & Osteotomy Assessment Engine", () => {
	// ── 1. Misch Bone Classification ───────────────────────────
	describe("1. Carl E. Misch Bone Density Classification (D1..D5)", () => {
		it("correctly classifies D1 (> 1250 HU)", () => {
			assert.equal(classifyMischBone(1251), "D1");
			assert.equal(classifyMischBone(1500), "D1");
			assert.equal(classifyMischBone(2200), "D1");
		});

		it("correctly classifies D2 (850..1250 HU)", () => {
			assert.equal(classifyMischBone(1250), "D2");
			assert.equal(classifyMischBone(1000), "D2");
			assert.equal(classifyMischBone(850), "D2");
		});

		it("correctly classifies D3 (350..<850 HU)", () => {
			assert.equal(classifyMischBone(849), "D3");
			assert.equal(classifyMischBone(600), "D3");
			assert.equal(classifyMischBone(350), "D3");
		});

		it("correctly classifies D4 (150..<350 HU)", () => {
			assert.equal(classifyMischBone(349), "D4");
			assert.equal(classifyMischBone(250), "D4");
			assert.equal(classifyMischBone(150), "D4");
		});

		it("correctly classifies D5 (< 150 HU)", () => {
			assert.equal(classifyMischBone(149), "D5");
			assert.equal(classifyMischBone(50), "D5");
			assert.equal(classifyMischBone(0), "D5");
			assert.equal(classifyMischBone(-200), "D5");
		});

		it("provides complete clinical metadata for all Misch classes", () => {
			const classes: MischBoneClass[] = ["D1", "D2", "D3", "D4", "D5"];
			for (const c of classes) {
				const info = MISCH_CLASSIFICATION_INFO[c];
				assert.ok(info);
				assert.equal(info.mischClass, c);
				assert.ok(info.classNameRu.length > 5);
				assert.ok(info.anatomicalLocationRu.length > 5);
				assert.ok(info.tactileFeelRu.length > 3);
				assert.ok(info.clinicalDescriptionRu.length > 10);
			}
		});
	});

	// ── 2. Lekholm & Zarb Classification ───────────────────────
	describe("2. Lekholm & Zarb Morphology Typing (Type I..Type IV)", () => {
		it("classifies Type I when cortical thickness >= 2.5mm or trabecular >= 1000 HU", () => {
			assert.equal(classifyLekholmZarb(2.8, 600), "Type_I");
			assert.equal(classifyLekholmZarb(1.2, 1100), "Type_I");
		});

		it("classifies Type II when cortical >= 1.5mm and trabecular >= 500 HU", () => {
			assert.equal(classifyLekholmZarb(1.8, 650), "Type_II");
			assert.equal(classifyLekholmZarb(2.0, 500), "Type_II");
		});

		it("classifies Type III when thin cortex (< 1.5mm) with dense trabecular (>= 400 HU)", () => {
			assert.equal(classifyLekholmZarb(1.0, 600), "Type_III");
			assert.equal(classifyLekholmZarb(0.8, 450), "Type_III");
		});

		it("classifies Type IV when thin cortex (< 1.5mm) with sparse trabecular (< 400 HU)", () => {
			assert.equal(classifyLekholmZarb(0.8, 250), "Type_IV");
			assert.equal(classifyLekholmZarb(0.5, 100), "Type_IV");
		});

		it("provides complete clinical metadata for all Lekholm-Zarb types", () => {
			const types: LekholmZarbType[] = ["Type_I", "Type_II", "Type_III", "Type_IV"];
			for (const t of types) {
				const info = LEKHOLM_ZARB_INFO[t];
				assert.ok(info);
				assert.equal(info.type, t);
				assert.ok(info.nameRu.length > 5);
				assert.ok(info.descriptionRu.length > 10);
				assert.ok(info.morphologyRu.length > 10);
			}
		});
	});

	// ── 3. Cortical Thickness Measurement ──────────────────────
	describe("3. Cortical Thickness Linear Ray Calculation", () => {
		it("calculates thickness from contiguous samples >= threshold", () => {
			// Spacing 0.5 mm, 4 samples >= 700 HU -> 2.0 mm
			const samples = [1050, 1000, 950, 800, 550, 450];
			const thickness = calculateCorticalThickness(samples, 0.5, 700);
			assert.equal(thickness, 2.0);
		});

		it("returns 0 when initial crest sample is below threshold", () => {
			const samples = [400, 500, 1000, 1100];
			const thickness = calculateCorticalThickness(samples, 0.5, 700);
			assert.equal(thickness, 0);
		});

		it("handles empty or degenerate arrays gracefully", () => {
			assert.equal(calculateCorticalThickness([], 0.5), 0);
			assert.equal(calculateCorticalThickness([1000], 0), 0);
		});
	});

	// ── 4. Osteotomy Recommendation & Protocol ─────────────────
	describe("4. Osteotomy Drilling Protocol & Primary Stability Forecast", () => {
		it("prescribes bone_tap_countersink for D1 bone with high torque and ISQ", () => {
			const rec = determineOsteotomyProtocol("D1", 2.5);
			assert.equal(rec.drillProtocol, "bone_tap_countersink");
			assert.equal(rec.primaryStabilityExpected, "high");
			assert.equal(rec.recommendedTorqueNcm.min, 35);
			assert.equal(rec.recommendedTorqueNcm.max, 45);
			assert.equal(rec.estimatedISQ.min, 75);
			assert.equal(rec.estimatedISQ.max, 85);
			assert.ok(rec.coolingRecommendationRu.includes("0.9%"));
			assert.ok(rec.surgicalTipsRu.some((t) => t.includes("термического остеонекроза")));
		});

		it("prescribes standard protocol for D2 bone", () => {
			const rec = determineOsteotomyProtocol("D2", 1.8);
			assert.equal(rec.drillProtocol, "standard");
			assert.equal(rec.primaryStabilityExpected, "high");
			assert.equal(rec.recommendedTorqueNcm.min, 35);
			assert.equal(rec.recommendedTorqueNcm.max, 40);
			assert.equal(rec.estimatedISQ.min, 70);
			assert.equal(rec.estimatedISQ.max, 80);
		});

		it("adapts D3 protocol based on cortical plate thickness", () => {
			const thinCortex = determineOsteotomyProtocol("D3", 0.6);
			assert.equal(thinCortex.drillProtocol, "under_drill");
			assert.equal(thinCortex.primaryStabilityExpected, "medium");

			const normalCortex = determineOsteotomyProtocol("D3", 1.5);
			assert.equal(normalCortex.drillProtocol, "standard");
			assert.equal(normalCortex.primaryStabilityExpected, "medium");
		});

		it("prescribes under_drill with osteocompression for D4 bone", () => {
			const rec = determineOsteotomyProtocol("D4", 0.5);
			assert.equal(rec.drillProtocol, "under_drill");
			assert.equal(rec.primaryStabilityExpected, "low");
			assert.equal(rec.recommendedTorqueNcm.min, 15);
			assert.equal(rec.recommendedTorqueNcm.max, 25);
			assert.equal(rec.estimatedISQ.min, 45);
			assert.equal(rec.estimatedISQ.max, 60);
			assert.ok(rec.surgicalTipsRu.some((t) => t.includes("остеотом")));
		});

		it("prescribes bicortical_fixation or bone grafting for D5 defect", () => {
			const rec = determineOsteotomyProtocol("D5", 0.0);
			assert.equal(rec.drillProtocol, "bicortical_fixation");
			assert.equal(rec.primaryStabilityExpected, "compromised");
			assert.ok(rec.surgicalTipsRu.some((t) => t.includes("GBR")));
		});
	});

	// ── 5. Volumetric 3D Implant Bed Sampling ──────────────────
	describe("5. 3D Volumetric Bone Sampling on Synthetic Alveolar Ridge", () => {
		const vol = createSyntheticBoneVolume();

		it("accurately samples implant bed within cortical and trabecular zones", () => {
			// Planned implant: entry at [10, 10, 16] (crest), apex at [10, 10, 6] (length 10 mm)
			const assessment = sampleImplantSiteBoneQuality({
				vol,
				entry: [10, 10, 16],
				apex: [10, 10, 6],
				radiusMm: 2.0,
				implantId: "IMP-36-NOBEL",
				toothNumber: 36,
			});

			assert.equal(assessment.implantId, "IMP-36-NOBEL");
			assert.equal(assessment.toothNumber, 36);
			assert.ok(assessment.sampleCount && assessment.sampleCount > 0);
			assert.ok(assessment.meanHU > 600 && assessment.meanHU < 1100);
			assert.ok(assessment.corticalThicknessCrestMm >= 1.5);
			assert.ok(assessment.trabecularDensityHU >= 600);
			assert.ok(["D2", "D3"].includes(assessment.mischClass));
			assert.ok(["Type_I", "Type_II"].includes(assessment.lekholmZarbType));
			assert.ok(assessment.osteotomyRecommendation);
		});

		it("handles degenerate implant vectors gracefully without crashing", () => {
			const assessment = sampleImplantSiteBoneQuality({
				vol,
				entry: [10, 10, 10],
				apex: [10, 10, 10], // zero length
				radiusMm: 2.0,
			});

			assert.equal(assessment.sampleCount, 0);
			assert.equal(assessment.meanHU, 0);
			assert.equal(assessment.mischClass, "D5");
		});

		it("handles out-of-volume placement safely without NaN leakage", () => {
			const assessment = sampleImplantSiteBoneQuality({
				vol,
				entry: [100, 100, 100],
				apex: [100, 100, 90],
				radiusMm: 2.0,
			});

			assert.equal(assessment.sampleCount, 0);
			assert.equal(assessment.meanHU, 0);
			assert.equal(assessment.mischClass, "D5");
			assert.equal(Number.isNaN(assessment.meanHU), false);
		});
	});

	// ── 6. Form 043/u A4 Protocol & Strict 0 Emojis Audit ──────
	describe("6. Russian Medical Form 043/u A4 Protocol & Mandate 8d Emoji Audit", () => {
		it("formats comprehensive clinical protocol with zero emojis", () => {
			const sampleAssessment = {
				implantId: "IMP-46-STRAUMANN",
				toothNumber: 46,
				meanHU: 920.5,
				mischClass: "D2" as MischBoneClass,
				lekholmZarbType: "Type_II" as LekholmZarbType,
				corticalThicknessCrestMm: 2.1,
				corticalThicknessApicalMm: 1.8,
				trabecularDensityHU: 720.0,
				osteotomyRecommendation: determineOsteotomyProtocol("D2", 2.1),
				sampleCount: 65,
				minHU: 650,
				maxHU: 1150,
				stdDevHU: 142.3,
				assessmentDate: "2026-09-12",
			};

			const protocol = formatBoneQualityForm043A4Protocol(sampleAssessment);

			// Check presence of required clinical sections
			assert.ok(protocol.includes("ПРОТОКОЛ ПЛАНИРОВАНИЯ ОСТЕОТОМИИ"));
			assert.ok(protocol.includes("ФОРМА 043/У"));
			assert.ok(protocol.includes("Зуб 46"));
			assert.ok(protocol.includes("IMP-46-STRAUMANN"));
			assert.ok(protocol.includes("Класс D2"));
			assert.ok(protocol.includes("Тип II"));
			assert.ok(protocol.includes("STANDARD"));
			assert.ok(protocol.includes("35–40 Н*см"));
			assert.ok(protocol.includes("70–80 ед."));
			assert.ok(protocol.includes("Подпись врача-стоматолога-хирурга"));

			// Strict 0 emojis test per Mandate 8d item 7
			const EMOJI_REGEX =
				/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E0}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;
			assert.equal(
				EMOJI_REGEX.test(protocol),
				false,
				"Form 043/u protocol must NOT contain any emojis per Mandate 8d #7",
			);
		});
	});

	// ── 7. Zod Schemas Validation ──────────────────────────────
	describe("7. Zod Schemas Runtime Verification", () => {
		it("validates valid Misch classes and rejects invalid ones", () => {
			assert.equal(mischBoneClassSchema.parse("D1"), "D1");
			assert.equal(mischBoneClassSchema.parse("D5"), "D5");
			assert.throws(() => mischBoneClassSchema.parse("D6"));
			assert.throws(() => mischBoneClassSchema.parse("X1"));
		});

		it("validates valid Lekholm-Zarb types", () => {
			assert.equal(lekholmZarbTypeSchema.parse("Type_I"), "Type_I");
			assert.equal(lekholmZarbTypeSchema.parse("Type_IV"), "Type_IV");
			assert.throws(() => lekholmZarbTypeSchema.parse("Type_V"));
		});

		it("validates sampling config defaults", () => {
			const parsed = boneSamplingConfigSchema.parse({});
			assert.equal(parsed.axialSteps, 12);
			assert.equal(parsed.radialSteps, 4);
			assert.equal(parsed.radialFraction, 0.6);
			assert.equal(parsed.corticalSearchRadiusMm, 3.0);
			assert.equal(parsed.corticalThresholdHU, 700);
		});

		it("validates full BoneSiteAssessment object and enforces toothNumber 11..48", () => {
			const validAssessment = {
				implantId: "IMP-11",
				toothNumber: 11,
				meanHU: 1100,
				mischClass: "D2",
				lekholmZarbType: "Type_II",
				corticalThicknessCrestMm: 2.0,
				corticalThicknessApicalMm: 1.5,
				trabecularDensityHU: 800,
				osteotomyRecommendation: determineOsteotomyProtocol("D2", 2.0),
			};

			const parsed = boneSiteAssessmentSchema.parse(validAssessment);
			assert.equal(parsed.implantId, "IMP-11");
			assert.equal(parsed.toothNumber, 11);

			// Invalid tooth numbers
			assert.throws(() =>
				boneSiteAssessmentSchema.parse({
					...validAssessment,
					toothNumber: 55, // not 11..48
				}),
			);
			assert.throws(() =>
				boneSiteAssessmentSchema.parse({
					...validAssessment,
					toothNumber: 9, // not 11..48
				}),
			);
		});
	});
});
