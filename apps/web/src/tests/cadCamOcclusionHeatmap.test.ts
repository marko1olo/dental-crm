import test, { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
	type CrownMaterialId,
	type PreparationZoneType,
	CROWN_MATERIAL_SPECS,
	CROWN_MATERIALS_CATALOG,
	getCrownMaterialById,
	evaluateMaterialClearance,
	rankMaterialsByClearance,
} from "../components/lab/crownMaterialTolerances";

import {
	type AnatomicalCuspId,
	OCCLUSAL_LANDMARKS,
	CLEARANCE_HEATMAP_ZONES,
	getClearanceHeatmapZone,
	getInterpolatedClearanceColor,
	isUpperJawTooth,
	getAntagonistToothFdi,
	isCuspFunctional,
	getZoneTypeForLandmark,
	evaluateLandmarkPoints,
	calculateClearanceStats,
	generateDenseOcclusalHeatmapGrid,
	computeCrossSectionSlice,
	generateLabOcclusionReport,
	getSimulationPresetClearances,
} from "../components/lab/occlusionClearanceMath";

describe("CAD/CAM STL Occlusal Clearance Heatmap & Crown Material Tolerances Suite", () => {
	// ─── 1. MATERIAL TOLERANCE CATALOG & BIOMECHANICS ───────────────────────────
	describe("1. Material Tolerance Catalog & Biomechanical Specifications", () => {
		it("validates Monolithic Zirconia Ultra-Translucent tolerances (func 1.0 mm, non-func 0.8 mm, margin 0.5 mm)", () => {
			const spec = getCrownMaterialById("zirconia_ultra_translucent");
			assert.equal(spec.id, "zirconia_ultra_translucent");
			assert.equal(spec.flexuralStrengthMpa, 750);
			assert.equal(spec.modulusOfElasticityGpa, 210);
			assert.equal(spec.zones.functional_cusp.minMm, 1.0);
			assert.equal(spec.zones.functional_cusp.idealMm, 1.2);
			assert.equal(spec.zones.non_functional_cusp.minMm, 0.8);
			assert.equal(spec.zones.non_functional_cusp.idealMm, 1.0);
			assert.equal(spec.zones.central_fossa.minMm, 0.8);
			assert.equal(spec.zones.axial_wall.minMm, 0.6);
			assert.equal(spec.zones.margin_chamfer.minMm, 0.5);
			assert.equal(spec.cementationProtocol, "self_adhesive_resin");
		});

		it("validates Monolithic Zirconia High-Strength (3Y/4Y-TZP) ultra-thin preparation tolerances (0.8 / 0.6 mm)", () => {
			const spec = getCrownMaterialById("zirconia_high_strength");
			assert.equal(spec.flexuralStrengthMpa, 1200);
			assert.equal(spec.zones.functional_cusp.minMm, 0.8);
			assert.equal(spec.zones.non_functional_cusp.minMm, 0.6);
			assert.equal(spec.zones.central_fossa.minMm, 0.6);
			assert.equal(spec.zones.margin_chamfer.minMm, 0.4);
		});

		it("validates IPS e.max Lithium Disilicate tolerances (func 1.5 mm, non-func 1.0 mm, margin 0.8 mm)", () => {
			const spec = getCrownMaterialById("emax_lithium_disilicate");
			assert.equal(spec.flexuralStrengthMpa, 500);
			assert.equal(spec.modulusOfElasticityGpa, 95);
			assert.equal(spec.zones.functional_cusp.minMm, 1.5);
			assert.equal(spec.zones.functional_cusp.idealMm, 1.8);
			assert.equal(spec.zones.non_functional_cusp.minMm, 1.0);
			assert.equal(spec.zones.non_functional_cusp.idealMm, 1.2);
			assert.equal(spec.zones.margin_chamfer.minMm, 0.8);
			assert.equal(spec.cementationProtocol, "adhesive_resin");
		});

		it("validates PFM (Porcelain-Fused-to-Metal) heavy reduction tolerances (func 1.5–2.0 mm, non-func 1.5 mm)", () => {
			const spec = getCrownMaterialById("pfm_cocr");
			assert.equal(spec.flexuralStrengthMpa, 900);
			assert.equal(spec.zones.functional_cusp.minMm, 1.5);
			assert.equal(spec.zones.functional_cusp.idealMm, 2.0);
			assert.equal(spec.zones.non_functional_cusp.minMm, 1.5);
			assert.equal(spec.zones.axial_wall.minMm, 1.2);
			assert.equal(spec.zones.margin_chamfer.minMm, 1.2);
		});

		it("validates Feldspathic Porcelain Veneer ultra-thin enamel tolerances (0.3–0.5 mm)", () => {
			const spec = getCrownMaterialById("feldspathic_veneer");
			assert.equal(spec.flexuralStrengthMpa, 120);
			assert.equal(spec.zones.functional_cusp.minMm, 0.4);
			assert.equal(spec.zones.non_functional_cusp.minMm, 0.3);
			assert.equal(spec.zones.axial_wall.minMm, 0.3);
			assert.equal(spec.zones.margin_chamfer.minMm, 0.3);
		});

		it("falls back gracefully to Zirconia Ultra-Translucent for unknown or null material ID", () => {
			const specNull = getCrownMaterialById(null);
			const specUndefined = getCrownMaterialById(undefined);
			const specInvalid = getCrownMaterialById("non_existent_material_123");

			assert.equal(specNull.id, "zirconia_ultra_translucent");
			assert.equal(specUndefined.id, "zirconia_ultra_translucent");
			assert.equal(specInvalid.id, "zirconia_ultra_translucent");
		});

		it("verifies all catalog materials have complete zone thickness definitions and valid properties", () => {
			assert.ok(CROWN_MATERIALS_CATALOG.length >= 6);
			for (const mat of CROWN_MATERIALS_CATALOG) {
				assert.ok(mat.id);
				assert.ok(mat.nameRu);
				assert.ok(mat.flexuralStrengthMpa > 0);
				assert.ok(mat.modulusOfElasticityGpa > 0);
				assert.ok(mat.zones.functional_cusp.minMm > 0);
				assert.ok(mat.zones.functional_cusp.idealMm >= mat.zones.functional_cusp.minMm);
				assert.ok(mat.zones.non_functional_cusp.minMm > 0);
				assert.ok(mat.zones.central_fossa.minMm > 0);
				assert.ok(mat.zones.axial_wall.minMm > 0);
				assert.ok(mat.zones.margin_chamfer.minMm > 0);
			}
		});
	});

	// ─── 2. HEATMAP COLOR SCALE & CLEARANCE EVALUATION ─────────────────────────
	describe("2. Heatmap Color Scale & Clearance Classification", () => {
		it("classifies < 0.5 mm as Red Danger Zone (critical shortage / fracture risk)", () => {
			const zone0 = getClearanceHeatmapZone(0.0);
			const zone03 = getClearanceHeatmapZone(0.35);
			const zone049 = getClearanceHeatmapZone(0.49);

			assert.equal(zone0.severity, "danger");
			assert.equal(zone03.severity, "danger");
			assert.equal(zone049.severity, "danger");
			assert.equal(zone03.colorHex, "#ef4444");
			assert.match(zone03.riskDescriptionRu, /риск скола\/перфорации/);
		});

		it("classifies 0.5–1.0 mm as Yellow Warning Zone (critical minimum)", () => {
			const zone05 = getClearanceHeatmapZone(0.5);
			const zone08 = getClearanceHeatmapZone(0.85);
			const zone099 = getClearanceHeatmapZone(0.99);

			assert.equal(zone05.severity, "warning");
			assert.equal(zone08.severity, "warning");
			assert.equal(zone099.severity, "warning");
			assert.equal(zone08.colorHex, "#eab308");
			assert.match(zone08.actionRu, /редукция зуба-антагониста/);
		});

		it("classifies 1.0–1.8 mm as Green Safe Zone (ideal anatomical clearance)", () => {
			const zone10 = getClearanceHeatmapZone(1.0);
			const zone14 = getClearanceHeatmapZone(1.4);
			const zone18 = getClearanceHeatmapZone(1.8);

			assert.equal(zone10.severity, "safe");
			assert.equal(zone14.severity, "safe");
			assert.equal(zone18.severity, "safe");
			assert.equal(zone14.colorHex, "#22c55e");
		});

		it("classifies > 1.8 mm as Blue Excess Zone", () => {
			const zone181 = getClearanceHeatmapZone(1.81);
			const zone25 = getClearanceHeatmapZone(2.5);
			const zone40 = getClearanceHeatmapZone(4.0);

			assert.equal(zone181.severity, "excess");
			assert.equal(zone25.severity, "excess");
			assert.equal(zone40.severity, "excess");
			assert.equal(zone25.colorHex, "#3b82f6");
		});

		it("generates smooth interpolated RGB color strings across all clearance ranges", () => {
			const colorRed = getInterpolatedClearanceColor(0.1);
			const colorYellow = getInterpolatedClearanceColor(0.75);
			const colorGreen = getInterpolatedClearanceColor(1.4);
			const colorBlue = getInterpolatedClearanceColor(2.4);

			assert.match(colorRed, /^rgb\(\d+,\s*\d+,\s*\d+\)$/);
			assert.match(colorYellow, /^rgb\(\d+,\s*\d+,\s*\d+\)$/);
			assert.match(colorGreen, /^rgb\(\d+,\s*\d+,\s*\d+\)$/);
			assert.match(colorBlue, /^rgb\(\d+,\s*\d+,\s*\d+\)$/);
		});
	});

	// ─── 3. TOOTH FDI & ANATOMICAL CUSP BIOMECHANICS ────────────────────────────
	describe("3. Tooth FDI & Functional Cusp Biomechanics", () => {
		it("correctly identifies Upper Jaw (Maxilla) teeth vs Lower Jaw (Mandible) teeth", () => {
			// Upper permanent
			assert.equal(isUpperJawTooth(16), true);
			assert.equal(isUpperJawTooth(21), true);
			assert.equal(isUpperJawTooth(27), true);
			// Upper deciduous
			assert.equal(isUpperJawTooth(54), true);
			assert.equal(isUpperJawTooth(65), true);

			// Lower permanent
			assert.equal(isUpperJawTooth(36), false);
			assert.equal(isUpperJawTooth(41), false);
			assert.equal(isUpperJawTooth(47), false);
			// Lower deciduous
			assert.equal(isUpperJawTooth(75), false);
			assert.equal(isUpperJawTooth(84), false);
		});

		it("identifies palatal cusps as functional in Upper teeth, and buccal cusps in Lower teeth", () => {
			// Upper molar (16) — Palatal (ML, DL) is functional, Buccal (MB, DB) is non-functional
			assert.equal(isCuspFunctional(16, "ML"), true);
			assert.equal(isCuspFunctional(16, "DL"), true);
			assert.equal(isCuspFunctional(16, "MB"), false);
			assert.equal(isCuspFunctional(16, "DB"), false);

			// Lower molar (46) — Buccal (MB, DB) is functional, Lingual (ML, DL) is non-functional
			assert.equal(isCuspFunctional(46, "MB"), true);
			assert.equal(isCuspFunctional(46, "DB"), true);
			assert.equal(isCuspFunctional(46, "ML"), false);
			assert.equal(isCuspFunctional(46, "DL"), false);

			// Central Fossa is central_fossa zone
			assert.equal(getZoneTypeForLandmark(16, "CF"), "central_fossa");
			assert.equal(getZoneTypeForLandmark(46, "CF"), "central_fossa");
		});

		it("resolves exact antagonist tooth FDI across all quadrants", () => {
			assert.equal(getAntagonistToothFdi(16), 46);
			assert.equal(getAntagonistToothFdi(26), 36);
			assert.equal(getAntagonistToothFdi(36), 26);
			assert.equal(getAntagonistToothFdi(46), 16);
			assert.equal(getAntagonistToothFdi(11), 41);
			assert.equal(getAntagonistToothFdi(21), 31);
		});
	});

	// ─── 4. MATERIAL CLEARANCE VALIDATION & DEFICIENCY CHECKS ──────────────────
	describe("4. Material Clearance Validation & Deficiency Checks", () => {
		it("detects critical shortage when E.max functional cusp clearance is 0.9 mm (< 1.5 mm min)", () => {
			const res = evaluateMaterialClearance("emax_lithium_disilicate", "functional_cusp", 0.9);
			assert.equal(res.safetyLevel, "critical_shortage");
			assert.equal(res.isSafe, false);
			assert.equal(res.minAllowedMm, 1.5);
			assert.equal(res.deficiencyMm, 0.6); // 1.5 - 0.9 = 0.6 mm
			assert.match(res.warningMessageRu, /Критический дефицит толщины/);
			assert.match(res.actionRecommendationRu, /0.6 мм/);
		});

		it("marks Monolithic Zirconia as safe for 0.9 mm functional cusp (min 0.8–1.0 mm)", () => {
			const res = evaluateMaterialClearance("zirconia_high_strength", "functional_cusp", 0.9);
			assert.equal(res.isSafe, true);
			assert.equal(res.safetyLevel, "borderline_tight");
			assert.equal(res.deficiencyMm, 0);
		});

		it("detects optimal clearance for Zirconia Ultra-Translucent at 1.4 mm", () => {
			const res = evaluateMaterialClearance("zirconia_ultra_translucent", "functional_cusp", 1.4);
			assert.equal(res.safetyLevel, "optimal");
			assert.equal(res.isSafe, true);
			assert.equal(res.deficiencyMm, 0);
			assert.match(res.warningMessageRu, /Идеальное анатомическое пространство/);
		});

		it("ranks materials correctly when space is tight (0.8 mm)", () => {
			const ranked = rankMaterialsByClearance("functional_cusp", 0.8);
			assert.ok(ranked.length >= 5);
			// Zirconia high strength (min 0.8) and Feldspathic (min 0.4) should be recommended/safe
			const highStrengthZirc = ranked.find((r) => r.materialId === "zirconia_high_strength");
			assert.ok(highStrengthZirc);
			assert.equal(highStrengthZirc?.isSafe, true);

			// E.max (min 1.5) and PFM (min 1.5) must NOT be safe at 0.8 mm
			const emax = ranked.find((r) => r.materialId === "emax_lithium_disilicate");
			assert.ok(emax);
			assert.equal(emax?.isSafe, false);
			assert.equal(emax?.safetyLevel, "critical_shortage");
		});
	});

	// ─── 5. LANDMARK POINT EVALUATION & VIRTUAL REDUCTIONS ──────────────────────
	describe("5. Landmark Evaluation & Virtual Reductions (Articulator & Enameloplasty)", () => {
		it("evaluates default landmark points for Tooth 16 and computes correct clearance", () => {
			const points = evaluateLandmarkPoints(16, "zirconia_ultra_translucent");
			assert.equal(points.length, 9); // MB, DB, ML, DL, CF, MMR, DMR, B_AXIAL, L_AXIAL

			const mb = points.find((p) => p.cuspId === "MB");
			const ml = points.find((p) => p.cuspId === "ML");
			const cf = points.find((p) => p.cuspId === "CF");

			assert.ok(mb);
			assert.ok(ml);
			assert.ok(cf);

			assert.equal(mb?.clearanceMm, 1.4);
			assert.equal(ml?.clearanceMm, 1.5);
			assert.equal(cf?.clearanceMm, 1.6);
			assert.equal(ml?.isFunctional, true); // Upper palatal
			assert.equal(mb?.isFunctional, false); // Upper buccal
		});

		it("applies antagonist reduction (+0.4 mm) and prep reduction (+0.2 mm) to increase clearance", () => {
			const customClearances = { MB: 0.6, ML: 0.8, CF: 0.5 };
			const points = evaluateLandmarkPoints(16, "emax_lithium_disilicate", customClearances, {
				antagonistReductionMm: 0.4,
				prepReductionMm: 0.2,
				vdoDeltaMm: 0.0,
			});

			const mb = points.find((p) => p.cuspId === "MB");
			const ml = points.find((p) => p.cuspId === "ML");
			const cf = points.find((p) => p.cuspId === "CF");

			// 0.6 + 0.4 + 0.2 = 1.2 mm
			assert.equal(mb?.clearanceMm, 1.2);
			// 0.8 + 0.4 + 0.2 = 1.4 mm
			assert.equal(ml?.clearanceMm, 1.4);
			// 0.5 + 0.4 + 0.2 = 1.1 mm
			assert.equal(cf?.clearanceMm, 1.1);
		});

		it("applies VDO adjustment (±0.3 mm) correctly", () => {
			const pointsPlus = evaluateLandmarkPoints(16, "zirconia_ultra_translucent", { CF: 1.0 }, { vdoDeltaMm: 0.3 });
			const pointsMinus = evaluateLandmarkPoints(16, "zirconia_ultra_translucent", { CF: 1.0 }, { vdoDeltaMm: -0.3 });

			const cfPlus = pointsPlus.find((p) => p.cuspId === "CF");
			const cfMinus = pointsMinus.find((p) => p.cuspId === "CF");

			assert.equal(cfPlus?.clearanceMm, 1.3);
			assert.equal(cfMinus?.clearanceMm, 0.7);
		});
	});

	// ─── 6. CLEARANCE STATISTICS & RISK AGGREGATION ────────────────────────────
	describe("6. Clearance Statistics & Risk Aggregation", () => {
		it("calculates accurate min, max, avg, median and zone percentages across points", () => {
			const points = evaluateLandmarkPoints(16, "zirconia_ultra_translucent", {
				MB: 0.4, // red
				DB: 0.7, // yellow
				ML: 1.2, // green
				DL: 1.4, // green
				CF: 1.6, // green
				MMR: 1.0, // green
				DMR: 1.0, // green
				B_AXIAL: 0.9, // yellow
				L_AXIAL: 2.1, // blue
			});

			const stats = calculateClearanceStats(16, "zirconia_ultra_translucent", points);
			assert.equal(stats.totalPoints, 9);
			assert.equal(stats.minClearanceMm, 0.4);
			assert.equal(stats.maxClearanceMm, 2.1);
			assert.equal(stats.redCount, 1);
			assert.equal(stats.yellowCount, 2);
			assert.equal(stats.greenCount, 5);
			assert.equal(stats.blueCount, 1);
			assert.equal(stats.redPct, 11); // 1/9 = 11%
			assert.equal(stats.greenPct, 56); // 5/9 = 56%
			assert.equal(stats.overallSeverity, "danger");
			assert.equal(stats.isMaterialCompliant, false);
			assert.ok(stats.criticalDeficientPoints.length >= 1);
			assert.equal(stats.worstPoint?.cuspId, "MB");
		});

		it("handles empty points safely without crashing", () => {
			const stats = calculateClearanceStats(16, "zirconia_ultra_translucent", []);
			assert.equal(stats.totalPoints, 0);
			assert.equal(stats.minClearanceMm, 0);
			assert.equal(stats.avgClearanceMm, 0);
			assert.equal(stats.isMaterialCompliant, false);
		});
	});

	// ─── 7. CONTINUOUS DENSE HEATMAP GRID & 2D/3D CROSS SECTIONS ──────────────
	describe("7. Continuous Dense Heatmap Grid & 2D/3D Cross-Sections", () => {
		it("generates 12x12 IDW interpolating grid matrix (144 sample points) with bounded coordinates", () => {
			const points = evaluateLandmarkPoints(16, "zirconia_ultra_translucent");
			const grid = generateDenseOcclusalHeatmapGrid(points, 12);

			assert.equal(grid.length, 12);
			assert.equal(grid[0]?.length, 12);

			for (let r = 0; r < 12; r++) {
				for (let c = 0; c < 12; c++) {
					const cell = grid[r]![c]!;
					assert.ok(cell.posX >= 0 && cell.posX <= 100);
					assert.ok(cell.posY >= 0 && cell.posY <= 100);
					assert.ok(cell.clearanceMm >= 0);
					assert.match(cell.color, /^rgb\(/);
				}
			}
		});

		it("computes buccolingual cross-section profile with 21 sample points", () => {
			const points = evaluateLandmarkPoints(16, "zirconia_ultra_translucent");
			const slice = computeCrossSectionSlice("buccolingual", points, "zirconia_ultra_translucent", 40);

			assert.equal(slice.plane, "buccolingual");
			assert.equal(slice.points.length, 21);
			assert.ok(slice.minClearanceMm > 0);
			assert.ok(slice.minThicknessMm > 0);

			for (const p of slice.points) {
				assert.ok(p.prepStumpY > 0);
				assert.ok(p.crownTopY > 0);
				assert.ok(p.antagonistY > 0);
				assert.ok(p.thicknessMm > 0);
				assert.match(p.zoneColor, /^rgb\(/);
			}
		});

		it("computes mesiodistal cross-section profile", () => {
			const points = evaluateLandmarkPoints(16, "emax_lithium_disilicate");
			const slice = computeCrossSectionSlice("mesiodistal", points, "emax_lithium_disilicate", 30);

			assert.equal(slice.plane, "mesiodistal");
			assert.equal(slice.points.length, 21);
			assert.match(slice.titleRu, /Мезио-дистальный/);
		});
	});

	// ─── 8. LABORATORY (ЗТЛ) SPECIFICATION & SIMULATION PRESETS ────────────────
	describe("8. Laboratory Specification Builder & Simulation Presets", () => {
		it("generates comprehensive copyable ЗТЛ report with antagonist adjustment specs", () => {
			const points = evaluateLandmarkPoints(16, "emax_lithium_disilicate", { MB: 0.9 });
			const stats = calculateClearanceStats(16, "emax_lithium_disilicate", points);

			const report = generateLabOcclusionReport({
				toothFdi: 16,
				materialId: "emax_lithium_disilicate",
				stats,
				cementGapMicrons: 45,
				doctorNotes: "Пациент с умеренным бруксизмом",
			});

			assert.equal(report.toothFdi, 16);
			assert.equal(report.antagonistToothFdi, 46);
			assert.match(report.materialNameRu, /IPS e.max/);
			assert.equal(report.recommendedCementGapMicrons, 45);
			assert.ok(report.rawTextForCopy.includes("Зуб: №16 (Антагонист: №46)"));
			assert.ok(report.rawTextForCopy.includes("Пациент с умеренным бруксизмом"));
		});

		it("returns correct simulation preset landmark clearances", () => {
			const optimal = getSimulationPresetClearances("optimal");
			const tightBuccal = getSimulationPresetClearances("tight_buccal");
			const severeCollision = getSimulationPresetClearances("severe_collision");
			const excessive = getSimulationPresetClearances("excessive");

			assert.equal(optimal.MB, 1.4);
			assert.equal(tightBuccal.MB, 0.7);
			assert.equal(severeCollision.MB, 0.3);
			assert.equal(excessive.CF, 2.8);
		});
	});
});
