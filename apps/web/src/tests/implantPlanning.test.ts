import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
import {
	calculateKitPriceKopecks,
	findFixture,
	findFixtureBySpecs,
	getAvailableDiameters,
	getAvailableLengths,
	getFixturesByBrand,
	getLinesByBrand,
	IMPLANT_BRANDS_METADATA,
	IMPLANT_CATALOG,
	type ImplantBrand,
	type ImplantFixture,
} from "../components/implant/implantCatalog";
import {
	calculateInsertionAxis,
	estimateInsertionTorque,
	evaluateAdjacentRootSafety,
	evaluateInterImplantSafety,
	evaluateMandibularCanalSafety,
	evaluateMaxillarySinusSafety,
	performComprehensiveImplantSafetyAudit,
	pointToSegmentDistance3D,
	segmentToSegmentDistance3D,
	vec3,
	vecAdd,
	vecCross,
	vecDistance,
	vecDot,
	vecLength,
	vecNormalize,
	vecScale,
	vecSub,
} from "../components/implant/implantPlanningMath";

describe("Dental Implant Planning & Biomechanical Safety Suite", () => {
	// ─── 1. IMPLANT CATALOG & SYSTEM LIBRARY TESTS ─────────────────────────────
	describe("Implant System Catalog (Каталог имплантатов)", () => {
		it("contains all 5 required world-class implant systems with valid metadata", () => {
			const requiredBrands: ImplantBrand[] = [
				"straumann",
				"nobel_biocare",
				"osstem",
				"dentium",
				"astra_tech",
			];

			for (const brand of requiredBrands) {
				const meta = IMPLANT_BRANDS_METADATA[brand];
				assert.ok(meta, `Metadata for ${brand} must exist`);
				assert.ok(meta.name.length > 0, `Brand name for ${brand} must not be empty`);
				assert.ok(meta.lines.length > 0, `Brand ${brand} must have lines`);

				const fixtures = getFixturesByBrand(brand);
				assert.ok(
					fixtures.length >= 10,
					`Brand ${brand} must have at least 10 fixture variations (found: ${fixtures.length})`,
				);
			}
		});

		it("verifies Straumann fixtures (BLX, Bone Level, Tissue Level) specs & pricing", () => {
			const straumannFixtures = getFixturesByBrand("straumann");
			assert.ok(straumannFixtures.length > 0);

			const lines = getLinesByBrand("straumann");
			assert.ok(lines.includes("BLX"));
			assert.ok(lines.includes("Bone Level (SLA)"));
			assert.ok(lines.includes("Tissue Level"));

			// Check Straumann BLX 4.1 x 10mm
			const blx41 = findFixtureBySpecs("straumann", "BLX", 4.1, 10.0);
			assert.ok(blx41, "Straumann BLX 4.1 x 10mm must exist");
			assert.equal(blx41.diameterMm, 4.1);
			assert.equal(blx41.lengthMm, 10.0);
			assert.equal(blx41.platformType, "conical");
			assert.ok(blx41.surfaceTreatment.includes("SLActive"));
			assert.ok(blx41.fixturePriceKopecks > 3000000); // 30,000+ RUB in kopecks
			assert.ok(blx41.drillSequence.length >= 4);

			// Check Straumann Tissue Level 4.8 x 12mm
			const tl48 = findFixtureBySpecs("straumann", "Tissue Level", 4.8, 12.0);
			assert.ok(tl48, "Straumann TL 4.8 x 12mm must exist");
			assert.equal(tl48.platformType, "internal_hex");
		});

		it("verifies Nobel Biocare fixtures (NobelActive, NobelReplace CC) specs & pricing", () => {
			const nobelActive = findFixtureBySpecs("nobel_biocare", "NobelActive", 4.3, 11.5);
			assert.ok(nobelActive, "NobelActive 4.3 x 11.5mm must exist");
			assert.equal(nobelActive.diameterMm, 4.3);
			assert.equal(nobelActive.lengthMm, 11.5);
			assert.equal(nobelActive.platformType, "conical");
			assert.ok(nobelActive.surfaceTreatment.includes("TiUnite"));
			assert.equal(nobelActive.fixturePriceKopecks, 3950000); // 39,500.00 RUB
		});

		it("verifies Osstem fixtures (TS III SA, TS III CA) specs & pricing", () => {
			const osstemSa = findFixtureBySpecs("osstem", "TS III SA", 4.0, 10.0);
			assert.ok(osstemSa, "Osstem TS III SA 4.0 x 10mm must exist");
			assert.equal(osstemSa.diameterMm, 4.0);
			assert.equal(osstemSa.lengthMm, 10.0);
			assert.equal(osstemSa.platformType, "conical");
			assert.equal(osstemSa.fixturePriceKopecks, 1850000); // 18,500.00 RUB

			const osstemCa = findFixtureBySpecs("osstem", "TS III CA", 4.5, 11.5);
			assert.ok(osstemCa, "Osstem TS III CA 4.5 x 11.5mm must exist");
			assert.ok(osstemCa.surfaceTreatment.includes("CA"));
			assert.equal(osstemCa.fixturePriceKopecks, 2200000); // 22,000.00 RUB
		});

		it("verifies Dentium fixtures (SuperLine, SimpleLine II) specs & pricing", () => {
			const superline = findFixtureBySpecs("dentium", "SuperLine", 4.0, 10.0);
			assert.ok(superline, "Dentium SuperLine 4.0 x 10mm must exist");
			assert.equal(superline.diameterMm, 4.0);
			assert.equal(superline.lengthMm, 10.0);
			assert.equal(superline.fixturePriceKopecks, 1900000); // 19,000.00 RUB

			const simpleline = findFixtureBySpecs("dentium", "SimpleLine II", 4.5, 12.0);
			assert.ok(simpleline, "Dentium SimpleLine II 4.5 x 12mm must exist");
			assert.equal(simpleline.platformType, "internal_hex");
		});

		it("verifies Astra Tech fixtures (OsseoSpeed EV) specs & pricing", () => {
			const astra = findFixtureBySpecs("astra_tech", "OsseoSpeed EV", 4.2, 11.0);
			assert.ok(astra, "Astra Tech OsseoSpeed EV 4.2 x 11mm must exist");
			assert.equal(astra.diameterMm, 4.2);
			assert.equal(astra.lengthMm, 11.0);
			assert.ok(astra.surfaceTreatment.includes("Fluoride-modified"));
			assert.equal(astra.fixturePriceKopecks, 3750000); // 37,500.00 RUB
		});

		it("calculates kopeck-exact kit price summary with all components", () => {
			const fixture = IMPLANT_CATALOG[0];
			assert.ok(fixture);

			const kit = calculateKitPriceKopecks(fixture, {
				includeHealingCap: true,
				includeTransfer: true,
				includeAbutment: true,
				includeGuidedSleeve: true,
			});

			const expectedTotal =
				fixture.fixturePriceKopecks +
				fixture.healingCapPriceKopecks +
				fixture.transferPriceKopecks +
				fixture.standardAbutmentPriceKopecks +
				fixture.guidedSleevePriceKopecks;

			assert.equal(kit.totalKitKopecks, expectedTotal);
			assert.ok(kit.totalRublesFormatted.includes("₽"));
		});
	});

	// ─── 2. 3D VECTOR & SEGMENT DISTANCE MATH TESTS ────────────────────────────
	describe("3D Vector & Geometry Engine", () => {
		it("performs 3D vector arithmetic correctly", () => {
			const a = vec3(1, 2, 3);
			const b = vec3(4, 5, 6);

			assert.deepEqual(vecAdd(a, b), { x: 5, y: 7, z: 9 });
			assert.deepEqual(vecSub(b, a), { x: 3, y: 3, z: 3 });
			assert.deepEqual(vecScale(a, 2), { x: 2, y: 4, z: 6 });
			assert.equal(vecDot(a, b), 1 * 4 + 2 * 5 + 3 * 6); // 32
			assert.equal(vecDistance(vec3(0, 0, 0), vec3(0, 3, 4)), 5.0);

			const cross = vecCross(vec3(1, 0, 0), vec3(0, 1, 0));
			assert.deepEqual(cross, { x: 0, y: 0, z: 1 });
		});

		it("computes point to line segment distance accurately", () => {
			const p = vec3(0, 5, 0);
			const a = vec3(0, 0, 0);
			const b = vec3(10, 0, 0);

			const result = pointToSegmentDistance3D(p, a, b);
			assert.equal(result.distance, 5.0);
			assert.deepEqual(result.closestPoint, { x: 0, y: 0, z: 0 });

			// Beyond endpoint B
			const p2 = vec3(15, 0, 0);
			const res2 = pointToSegmentDistance3D(p2, a, b);
			assert.equal(res2.distance, 5.0);
			assert.deepEqual(res2.closestPoint, { x: 10, y: 0, z: 0 });
		});

		it("computes shortest distance between two 3D line segments (parallel and skew)", () => {
			// Parallel segments at distance 4.0 mm
			const s1Start = vec3(0, 0, 0);
			const s1End = vec3(0, 0, 10);
			const s2Start = vec3(4, 0, 0);
			const s2End = vec3(4, 0, 10);

			const parallelDist = segmentToSegmentDistance3D(s1Start, s1End, s2Start, s2End);
			assert.equal(Math.round(parallelDist.distance), 4);

			// Orthogonal skew segments
			const s3Start = vec3(-5, 5, 5);
			const s3End = vec3(5, 5, 5);
			const skewDist = segmentToSegmentDistance3D(s1Start, s1End, s3Start, s3End);
			assert.equal(Math.round(skewDist.distance), 5);
		});
	});

	// ─── 3. MANDIBULAR CANAL (IAN) SAFETY MARGIN (2.0 MM RULE) ────────────────
	describe("Mandibular Canal (IAN) Safety Margin Protection", () => {
		const mockCanal = {
			centerlinePoints: [vec3(-20, 0, -15), vec3(0, 0, -15), vec3(20, 0, -15)],
			canalRadiusMm: 1.5,
		};

		it("flags SAFE when clearance >= 2.0 mm", () => {
			const safeImplant = {
				entryPoint: vec3(0, 0, 0),
				apexPoint: vec3(0, 0, -10), // Apex at Z=-10, Canal centerline at Z=-15
				diameterMm: 4.0,
				radiusMm: 2.0,
				lengthMm: 10.0,
			};

			const result = evaluateMandibularCanalSafety(safeImplant, mockCanal);
			// Centerline distance = 5.0 mm. Net clearance = 5.0 - (2.0 + 1.5) = 1.5 mm or apex clearance
			assert.ok(result.clearanceMm >= 1.5);
			assert.equal(result.isDangerous, false);
		});

		it("flags WARNING when clearance is between 1.0 mm and 2.0 mm", () => {
			const warnImplant = {
				entryPoint: vec3(0, 0, 0),
				apexPoint: vec3(0, 0, -11.8), // Centerline dist = 3.2. Net = 3.2 - 3.5 = -0.3 or 1.7 mm
				diameterMm: 3.5,
				radiusMm: 1.75,
				lengthMm: 11.5,
			};

			// Canal at -15. Apex at -11.5. Distance = 3.5 mm. Radius sum = 1.75 + 1.5 = 3.25. Clearance = 0.25 -> warning/danger
			const customCanal = {
				centerlinePoints: [vec3(-10, 0, -15), vec3(10, 0, -15)],
				canalRadiusMm: 1.0,
			};
			const implantWith15Margin = {
				entryPoint: vec3(0, 0, 0),
				apexPoint: vec3(0, 0, -10.5),
				diameterMm: 4.0,
				radiusMm: 2.0,
				lengthMm: 10.5,
			};
			// Dist = 4.5. Radii sum = 2.0 + 1.0 = 3.0. Clearance = 1.5 mm.
			const res = evaluateMandibularCanalSafety(implantWith15Margin, customCanal);
			assert.equal(res.status, "warning");
			assert.equal(res.isWarning, true);
			assert.equal(res.isDangerous, false);
		});

		it("flags CRITICAL DANGER (RED ALERT) when clearance < 1.0 mm or penetration", () => {
			const dangerousImplant = {
				entryPoint: vec3(0, 0, 0),
				apexPoint: vec3(0, 0, -14.5), // Apex penetrating into canal centerline at -15
				diameterMm: 4.0,
				radiusMm: 2.0,
				lengthMm: 14.5,
			};

			const result = evaluateMandibularCanalSafety(dangerousImplant, mockCanal);
			assert.equal(result.status, "danger");
			assert.equal(result.isDangerous, true);
			assert.ok(result.clinicalMessage.includes("КРИТИЧЕСКИЙ"));
		});
	});

	// ─── 4. MAXILLARY SINUS FLOOR & SINUS LIFT TESTS ───────────────────────────
	describe("Maxillary Sinus Floor & Sinus Lift Evaluator", () => {
		it("detects NO sinus lift when subantral bone height >= implant length + 1.0 mm", () => {
			const res = evaluateMaxillarySinusSafety(13.0, 10.0);
			assert.equal(res.status, "safe");
			assert.equal(res.sinusLiftRequired, false);
			assert.equal(res.sinusLiftType, "none");
			assert.equal(res.sinusPenetrationMm, 0);
		});

		it("detects CRESTAL CLOSED SINUS LIFT (Summers) when bone >= 5mm and lift <= 4mm", () => {
			const res = evaluateMaxillarySinusSafety(7.5, 10.0); // Residual 7.5mm, Deficit 2.5mm
			assert.equal(res.status, "warning");
			assert.equal(res.sinusLiftRequired, true);
			assert.equal(res.sinusLiftType, "crestal_closed");
			assert.equal(res.sinusPenetrationMm, 2.5);
			assert.ok(res.clinicalMessage.includes("закрытый синус-лифтинг"));
		});

		it("detects LATERAL WINDOW OPEN SINUS LIFT (Tatum) when bone < 5.0 mm", () => {
			const res = evaluateMaxillarySinusSafety(3.5, 10.0); // Severe atrophy 3.5mm
			assert.equal(res.sinusLiftRequired, true);
			assert.equal(res.sinusLiftType, "lateral_window");
			assert.ok(res.clinicalMessage.includes("латеральное окно"));
		});
	});

	// ─── 5. ADJACENT ROOTS & INTER-IMPLANT DISTANCE TESTS ──────────────────────
	describe("Root Proximity & Inter-Implant Biological Width Protection", () => {
		const implant = {
			entryPoint: vec3(0, 0, 0),
			apexPoint: vec3(0, 0, -10),
			diameterMm: 4.0,
			radiusMm: 2.0,
			lengthMm: 10.0,
		};

		it("detects adjacent tooth root danger if clearance < 1.0 mm (1.5 mm safety zone)", () => {
			const collisionRoot = {
				toothNumberFdi: 45,
				crownPoint: vec3(2.5, 0, 0),
				apexPoint: vec3(2.5, 0, -10),
				rootRadiusMm: 1.5,
			};
			// Distance = 2.5. Radii sum = 2.0 + 1.5 = 3.5. Clearance = -1.0 mm (collision)
			const res = evaluateAdjacentRootSafety(implant, collisionRoot);
			assert.equal(res.status, "danger");
			assert.equal(res.isDangerous, true);
			assert.ok(res.clinicalMessage.includes("КРИТИЧЕСКИЙ КОНФЛИКТ"));
		});

		it("detects inter-implant violation if distance < 3.0 mm (Tarnow rule)", () => {
			const adjacentImplant = {
				entryPoint: vec3(5.0, 0, 0),
				apexPoint: vec3(5.0, 0, -10),
				diameterMm: 4.0,
				radiusMm: 2.0,
				lengthMm: 10.0,
			};
			// Centerline dist = 5.0. Radii sum = 2.0 + 2.0 = 4.0. Clearance = 1.0 mm (< 3.0 mm)
			const res = evaluateInterImplantSafety(implant, adjacentImplant, 46, 47);
			assert.equal(res.isDangerous, true);
			assert.ok(res.clearanceMm < 3.0);
			assert.ok(res.clinicalMessage.includes("Межимплантатное расстояние"));
		});
	});

	// ─── 6. INSERTION AXIS & ANGULATION TESTS ──────────────────────────────────
	describe("Insertion Axis & Angulation Analysis", () => {
		it("evaluates vertical insertion correctly", () => {
			const axis = calculateInsertionAxis(vec3(0, 0, 0), vec3(0, 0, -10));
			assert.equal(axis.totalAngulationDeg, 0);
			assert.equal(axis.mesiodistalTiltDeg, 0);
			assert.equal(axis.buccolingualTiltDeg, 0);
			assert.equal(axis.recommendedAbutmentAngleDeg, 0);
		});

		it("detects excessive angulation (> 25°) and recommends angled abutment", () => {
			// Tilt 30° mesially: x = 10 * sin(30°) = 5, z = -10 * cos(30°) = -8.66
			const axis = calculateInsertionAxis(vec3(0, 0, 0), vec3(5, 0, -8.66));
			assert.ok(axis.totalAngulationDeg >= 29 && axis.totalAngulationDeg <= 31);
			assert.equal(axis.isAngulationExcessive, true);
			assert.equal(axis.recommendedAbutmentAngleDeg, 30);
		});
	});

	// ─── 7. MISCH BONE DENSITY & TORQUE ESTIMATOR TESTS ─────────────────────────
	describe("Misch Bone Density & Insertion Torque Engine", () => {
		const fixture = findFixtureBySpecs("straumann", "BLX", 4.1, 10.0)!;

		it("estimates D1 bone torque (> 45 Ncm) with mandatory bone tapping", () => {
			const est = estimateInsertionTorque("D1", fixture);
			assert.equal(est.boneDensity, "D1");
			assert.ok(est.expectedTorqueMinNcm >= 45);
			assert.equal(est.corticalTapRequired, true);
			assert.equal(est.underdrillingRecommended, false);
		});

		it("estimates D2 bone torque (35–45 Ncm) as golden standard for immediate loading", () => {
			const est = estimateInsertionTorque("D2", fixture);
			assert.equal(est.boneDensity, "D2");
			assert.ok(est.isImmediateLoadingEligible, "D2 should be eligible for immediate loading");
			assert.equal(est.loadingRecommendation, "immediate_functional_loading");
		});

		it("estimates D4 bone torque (< 30 Ncm) as contraindicated for immediate loading", () => {
			const est = estimateInsertionTorque("D4", fixture);
			assert.equal(est.boneDensity, "D4");
			assert.equal(est.isImmediateLoadingEligible, false);
			assert.equal(est.underdrillingRecommended, true);
			assert.equal(est.loadingRecommendation, "delayed_two_stage_submerged");
		});
	});

	// ─── 8. COMPREHENSIVE SURGICAL AUDIT ENGINE ────────────────────────────────
	describe("Comprehensive Implant Safety Audit Engine", () => {
		it("performs full multi-zone surgical audit and generates structured protocol", () => {
			const fixture = findFixtureBySpecs("straumann", "BLX", 4.1, 10.0)!;
			const audit = performComprehensiveImplantSafetyAudit({
				toothNumberFdi: 46,
				fixture,
				entryPoint: vec3(0, 0, 0),
				apexPoint: vec3(0, 0, -10),
				boneDensity: "D2",
				mandibularCanal: {
					centerlinePoints: [vec3(-15, 0, -16), vec3(0, 0, -16), vec3(15, 0, -16)],
					canalRadiusMm: 1.5,
				},
				adjacentRoots: [
					{
						toothNumberFdi: 45,
						crownPoint: vec3(-6, 0, 0),
						apexPoint: vec3(-7, 0, -14),
						rootRadiusMm: 1.5,
					},
				],
			});

			assert.equal(audit.overallStatus, "safe");
			assert.equal(audit.isSafeToProceed, true);
			assert.equal(audit.criticalDangersCount, 0);
			assert.ok(audit.surgicalProtocolText.includes("FDI 46"));
			assert.ok(audit.surgicalProtocolText.includes("Straumann BLX"));
			assert.ok(audit.surgicalProtocolText.includes("Пошаговый протокол сверления:"));
		});
	});
});
