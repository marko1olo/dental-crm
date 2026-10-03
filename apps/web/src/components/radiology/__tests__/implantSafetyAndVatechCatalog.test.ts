import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	CANONICAL_IMPLANT_CATALOG,
	CANONICAL_IMPLANT_BRANDS,
	SURGICAL_KITS,
	getCanonicalFixturesByBrand,
	getLinesForBrand,
	findCanonicalFixture,
	filterCanonicalCatalog,
	calculateDrillDepth,
	type CanonicalImplantBrandKey,
	type CanonicalImplantFixture,
} from "../implantCatalog.js";

import {
	VATECH_NERVE_SAFE_THRESHOLD_MM,
	VATECH_NERVE_WARNING_THRESHOLD_MM,
	VATECH_NERVE_COLLISION_THRESHOLD_MM,
	BUCCAL_CORTICAL_PLATE_IDEAL_MM,
	BUCCAL_CORTICAL_PLATE_MIN_RECOMMENDED_MM,
	BUCCAL_CORTICAL_PLATE_CRITICAL_MM,
	LINGUAL_CORTICAL_PLATE_MIN_MM,
	classifyVatechNerveClearance,
	auditCorticalPlateEnvelope,
	auditCorticalPlatesFromEnvelope,
	calculateOsteotomyDrillDepth,
	resolveSurgicalKit,
} from "../implantCorticalAndSleeveEngine.js";

describe("Layer 2: Vatech Ez3D CBCT Implant Library & Clinical Safety Engine", () => {
	// ─── 1. VATECH 3-ZONE MANDIBULAR NERVE CLASSIFICATION ─────────────────────
	describe("1. Vatech 3-Zone Mandibular Nerve Clearance Classification", () => {
		it("confirms safe zone when clearance >= 2.0 mm (Green #10b981)", () => {
			const safeAssessment = classifyVatechNerveClearance(2.5);
			assert.equal(safeAssessment.zone, "safe");
			assert.equal(safeAssessment.isSafe, true);
			assert.equal(safeAssessment.isWarning, false);
			assert.equal(safeAssessment.isCollision, false);
			assert.equal(safeAssessment.colorHex, "#10b981");
			assert.ok(safeAssessment.labelRu.includes("Безопасно"));

			// Exact threshold boundary
			const exactBoundary = classifyVatechNerveClearance(2.0);
			assert.equal(exactBoundary.zone, "safe");
			assert.equal(exactBoundary.isSafe, true);
		});

		it("confirms warning buffer when clearance is in 1.5 .. 2.0 mm corridor (Yellow #f59e0b)", () => {
			const warningAssessment = classifyVatechNerveClearance(1.75);
			assert.equal(warningAssessment.zone, "warning");
			assert.equal(warningAssessment.isSafe, false);
			assert.equal(warningAssessment.isWarning, true);
			assert.equal(warningAssessment.isCollision, false);
			assert.equal(warningAssessment.colorHex, "#f59e0b");
			assert.ok(warningAssessment.labelRu.includes("Предупреждение"));

			const lowerBoundary = classifyVatechNerveClearance(1.5);
			assert.equal(lowerBoundary.zone, "warning");
			assert.equal(lowerBoundary.isWarning, true);
		});

		it("confirms critical collision when clearance < 1.5 mm (Red #ef4444)", () => {
			const collisionAssessment = classifyVatechNerveClearance(1.4);
			assert.equal(collisionAssessment.zone, "collision");
			assert.equal(collisionAssessment.isSafe, false);
			assert.equal(collisionAssessment.isWarning, false);
			assert.equal(collisionAssessment.isCollision, true);
			assert.equal(collisionAssessment.colorHex, "#ef4444");
			assert.ok(collisionAssessment.labelRu.includes("Коллизия"));
			assert.ok(collisionAssessment.clinicalAdviceRu.includes("Уменьшите длину имплантата"));

			// Direct penetration (clearance <= 0)
			const directPenetration = classifyVatechNerveClearance(-0.5);
			assert.equal(directPenetration.zone, "collision");
			assert.equal(directPenetration.isCollision, true);
		});

		it("returns honest unmeasured assessment on null/undefined without throwing", () => {
			const nullAssessment = classifyVatechNerveClearance(null);
			assert.equal(nullAssessment.zone, "unmeasured");
			assert.equal(nullAssessment.isSafe, false);
			assert.equal(nullAssessment.isWarning, false);
			assert.equal(nullAssessment.isCollision, false);

			const nanAssessment = classifyVatechNerveClearance(Number.NaN);
			assert.equal(nanAssessment.zone, "unmeasured");
		});
	});

	// ─── 2. CORTICAL BONE PLATE THICKNESS AUDIT ───────────────────────────────
	describe("2. ITI Consensus Alveolar Cortical Bone Plate Thickness Audit", () => {
		it("flags adequate bone when buccal >= 1.8 mm and lingual >= 1.0 mm", () => {
			// Center at X=0, diameter=4.0 (radius=2.0)
			// Buccal crest at -4.5 -> bone = 4.5 - 2.0 = 2.5 mm
			// Lingual crest at +3.5 -> bone = 3.5 - 2.0 = 1.5 mm
			const audit = auditCorticalPlateEnvelope(0, 4.0, -4.5, 3.5);

			assert.equal(audit.residualBuccalBoneMm, 2.5);
			assert.equal(audit.residualLingualBoneMm, 1.5);
			assert.equal(audit.buccalStatus, "adequate");
			assert.equal(audit.lingualStatus, "adequate");
			assert.equal(audit.isBuccalAdequate, true);
			assert.equal(audit.isLingualAdequate, true);
			assert.equal(audit.requiresGbrAugmentation, false);
			assert.equal(audit.severity, "safe");
		});

		it("flags GBR graft required when buccal plate is in warning zone (1.0 .. 1.79 mm)", () => {
			// Center at X=0, diameter=4.0 (radius=2.0)
			// Buccal crest at -3.4 -> bone = 3.4 - 2.0 = 1.4 mm (< 1.8 mm)
			// Lingual crest at +3.5 -> bone = 1.5 mm (adequate)
			const audit = auditCorticalPlateEnvelope(0, 4.0, -3.4, 3.5);

			assert.equal(audit.residualBuccalBoneMm, 1.4);
			assert.equal(audit.buccalStatus, "graft_required");
			assert.equal(audit.isBuccalAdequate, false);
			assert.equal(audit.requiresGbrAugmentation, true);
			assert.equal(audit.severity, "warning");
			assert.ok(audit.recommendedGbrProtocolRu.includes("Bio-Oss") || audit.recommendedGbrProtocolRu.includes("ксенографт"));
		});

		it("flags critical dehiscence risk when buccal plate < 1.0 mm", () => {
			// Center at X=0, diameter=4.0 (radius=2.0)
			// Buccal crest at -2.7 -> bone = 2.7 - 2.0 = 0.7 mm (< 1.0 mm)
			const audit = auditCorticalPlateEnvelope(0, 4.0, -2.7, 3.5);

			assert.equal(audit.residualBuccalBoneMm, 0.7);
			assert.equal(audit.buccalStatus, "dehiscence_imminent");
			assert.equal(audit.isBuccalAdequate, false);
			assert.equal(audit.requiresGbrAugmentation, true);
			assert.equal(audit.severity, "critical");
			assert.ok(audit.clinicalWarningRu.includes("Критический дефицит"));
			assert.ok(audit.recommendedGbrProtocolRu.includes("титановой сеткой") || audit.recommendedGbrProtocolRu.includes("НКР"));
		});

		it("flags lingual perforation risk when lingual plate < 1.0 mm", () => {
			// Center at X=0, diameter=4.0 (radius=2.0)
			// Buccal crest at -4.0 -> bone = 2.0 mm (adequate)
			// Lingual crest at +2.6 -> bone = 0.6 mm (< 1.0 mm)
			const audit = auditCorticalPlateEnvelope(0, 4.0, -4.0, 2.6);

			assert.equal(audit.residualLingualBoneMm, 0.6);
			assert.equal(audit.lingualStatus, "perforation_risk");
			assert.equal(audit.isLingualAdequate, false);
			assert.equal(audit.requiresGbrAugmentation, true);
			assert.ok(audit.clinicalWarningRu.includes("язычной перфорации"));
		});

		it("correctly audits cortical plate via envelope wrapper object", () => {
			const audit = auditCorticalPlatesFromEnvelope(
				{ entryPoint: { x: 0.5, y: 10 }, implantSpec: { diameterMm: 3.5 } },
				{ buccalCrestPoint: { x: -3.0, y: 10 }, lingualCrestPoint: { x: 4.0, y: 10 } },
			);

			// entry=0.5, radius=1.75
			// buccalDist = |0.5 - (-3.0)| - 1.75 = 3.5 - 1.75 = 1.75 mm
			// lingualDist = |0.5 - 4.0| - 1.75 = 3.5 - 1.75 = 1.75 mm
			assert.equal(audit.residualBuccalBoneMm, 1.75);
			assert.equal(audit.residualLingualBoneMm, 1.75);
			// Buccal 1.75 mm < 1.8 mm -> graft_required
			assert.equal(audit.buccalStatus, "graft_required");
			assert.equal(audit.isLingualAdequate, true);
		});
	});

	// ─── 3. SURGICAL GUIDE SLEEVE DRILL DEPTH CALCULUS ────────────────────────
	describe("3. Surgical Guide Sleeve Osteotomy Depth Calculus: L_drill = L_implant + V_offset", () => {
		it("calculates exact drill depth for Osstem OneGuide (default offset 9.0 mm)", () => {
			const res10 = calculateOsteotomyDrillDepth(10.0, undefined, "osstem");
			assert.equal(res10.implantLengthMm, 10.0);
			assert.equal(res10.sleeveOffsetMm, 9.0);
			assert.equal(res10.drillTotalLengthMm, 19.0); // 10 + 9
			assert.equal(res10.kitName, "Osstem OneGuide");
			assert.equal(res10.sleeveHeightMm, 5.0);
			assert.equal(res10.isStandardOffset, true);

			// Alternative 10.5 mm offset key
			const res115 = calculateOsteotomyDrillDepth(11.5, 10.5, "osstem");
			assert.equal(res115.drillTotalLengthMm, 22.0); // 11.5 + 10.5
			assert.equal(res115.isStandardOffset, true);
		});

		it("calculates exact drill depth for Straumann Guided Surgery (offsets 2.0, 4.0, 6.0 mm)", () => {
			const defaultRes = calculateOsteotomyDrillDepth(10.0, undefined, "straumann");
			assert.equal(defaultRes.sleeveOffsetMm, 4.0); // Straumann default
			assert.equal(defaultRes.drillTotalLengthMm, 14.0);

			const h2Res = calculateOsteotomyDrillDepth(12.0, 2.0, "straumann");
			assert.equal(h2Res.drillTotalLengthMm, 14.0); // 12 + 2

			const h6Res = calculateOsteotomyDrillDepth(10.0, 6.0, "straumann");
			assert.equal(h6Res.drillTotalLengthMm, 16.0); // 10 + 6
		});

		it("calculates drill depth for NobelGuide (offset 9.0 mm)", () => {
			const nobelRes = calculateOsteotomyDrillDepth(11.5, undefined, "nobel_biocare");
			assert.equal(nobelRes.sleeveOffsetMm, 9.0);
			assert.equal(nobelRes.drillTotalLengthMm, 20.5); // 11.5 + 9.0
			assert.equal(nobelRes.kitName, "NobelGuide");
		});

		it("resolves default kit for unknown brand without throwing", () => {
			const unknownRes = calculateOsteotomyDrillDepth(10.0, undefined, "unknown_custom_system");
			assert.ok(unknownRes.drillTotalLengthMm > 10.0);
			assert.equal(unknownRes.sleeveOffsetMm, 9.0);
		});

		it("verifies calculateDrillDepth in implantCatalog module", () => {
			const drill = calculateDrillDepth(10.0, 9.0);
			assert.equal(drill.drillTotalLengthMm, 19.0);
			assert.ok(drill.drillStopSummaryRu.includes("19 мм"));
		});
	});

	// ─── 4. CANONICAL IMPLANT FIXTURE CATALOG (11 GLOBAL BRANDS) ──────────────
	describe("4. Canonical Typed Implant Catalog (11 Global Systems from Vatech NimplantDB.mdb)", () => {
		it("includes all 11 global implant brands", () => {
			const expectedBrands: CanonicalImplantBrandKey[] = [
				"osstem",
				"straumann",
				"nobel_biocare",
				"dentium",
				"mis",
				"astra_tech",
				"zimmer",
				"megagen",
				"biohorizons",
				"alphabio",
				"ankylos",
			];

			assert.equal(CANONICAL_IMPLANT_BRANDS.length, 11);
			for (const brand of expectedBrands) {
				const fixtures = getCanonicalFixturesByBrand(brand);
				assert.ok(fixtures.length > 0, `Brand ${brand} must contain canonical fixtures`);
			}
		});

		it("contains >= 40 verified canonical fixture configurations", () => {
			assert.ok(CANONICAL_IMPLANT_CATALOG.length >= 40, "Must contain >= 40 canonical fixtures");
		});

		it("verifies Osstem TS III fixtures (11 deg Morse taper connection, OneGuide kit)", () => {
			const osstemFixtures = getCanonicalFixturesByBrand("osstem");
			const ts3 = osstemFixtures.find((f) => f.lineName === "TS III SA" && f.diameterMm === 4.0 && f.lengthMm === 10.0);
			assert.ok(ts3, "Osstem TS III SA 4.0x10.0 must exist");
			assert.equal(ts3.hexType, "morse_taper_11");
			assert.equal(ts3.coneAngleDeg, 1.5);
			assert.equal(ts3.apexDiameterMm, 2.8);
			assert.equal(ts3.guidedKit.kitName, "Osstem OneGuide");
			assert.equal(ts3.articleNumber, "TS3S40100");
			assert.ok(Number.isInteger(ts3.priceKopecks), "Price must be integer kopecks");
			assert.ok(ts3.priceKopecks > 0);
		});

		it("verifies Straumann fixtures (BLX TorcFit, BLT CrossFit NC/RC, Tissue Level SynOcta)", () => {
			const straumannFixtures = getCanonicalFixturesByBrand("straumann");
			const blx = straumannFixtures.find((f) => f.lineName.includes("BLX") && f.diameterMm === 4.0);
			assert.ok(blx, "Straumann BLX 4.0 must exist");
			assert.equal(blx.hexType, "crossfit_internal");
			assert.equal(blx.apexDiameterMm, 2.5);

			const tl = straumannFixtures.find((f) => f.lineName === "Tissue Level Standard Plus");
			assert.ok(tl, "Straumann Tissue Level SP must exist");
			assert.equal(tl.hexType, "tissue_level_synocta");
			assert.equal(tl.coneAngleDeg, 0);
		});

		it("verifies Nobel Biocare fixtures (NobelActive 12 deg Morse, NobelReplace Trilobe)", () => {
			const active = findCanonicalFixture("nobel_biocare", 4.3, 10.0, "NobelActive");
			assert.ok(active, "NobelActive 4.3x10.0 must exist");
			assert.equal(active.hexType, "morse_taper_12");
			assert.equal(active.coneAngleDeg, 5.0);
			assert.equal(active.platformCode, "RP");

			const replace = findCanonicalFixture("nobel_biocare", 4.3, 10.0, "NobelReplace");
			assert.ok(replace, "NobelReplace CC 4.3x10.0 must exist");
			assert.equal(replace.hexType, "tri_lobe");
		});

		it("verifies Dentium SuperLine (11 deg Morse taper connection)", () => {
			const superline = findCanonicalFixture("dentium", 4.0, 10.0, "SuperLine");
			assert.ok(superline, "Dentium SuperLine 4.0x10.0 must exist");
			assert.equal(superline.hexType, "morse_taper_11");
			assert.equal(superline.coneAngleDeg, 3.5);
			assert.equal(superline.apexDiameterMm, 2.8);
		});

		it("verifies MIS Implants (C1 conical morse, V3 triangular neck, SEVEN internal hex)", () => {
			const c1 = findCanonicalFixture("mis", 4.2, 10.0, "C1");
			assert.ok(c1, "MIS C1 4.2x10.0 must exist");
			assert.equal(c1.hexType, "morse_taper_12");

			const v3 = findCanonicalFixture("mis", 3.9, 10.0, "V3");
			assert.ok(v3, "MIS V3 3.9x10.0 must exist");
			assert.equal(v3.hexType, "morse_taper_12");

			const seven = findCanonicalFixture("mis", 4.2, 10.0, "SEVEN");
			assert.ok(seven, "MIS SEVEN 4.2x10.0 must exist");
			assert.equal(seven.hexType, "internal_hex");
		});

		it("verifies Astra Tech OsseoSpeed (Conical Seal Design)", () => {
			const astra = findCanonicalFixture("astra_tech", 4.2, 11.0, "OsseoSpeed EV");
			assert.ok(astra, "Astra Tech EV 4.2x11.0 must exist");
			assert.equal(astra.hexType, "conical_seal");
			assert.equal(astra.coneAngleDeg, 2.5);
		});

		it("verifies Zimmer Dental TSV (Lead-in Hex-Lock)", () => {
			const zimmer = findCanonicalFixture("zimmer", 4.7, 10.0, "TSV");
			assert.ok(zimmer, "Zimmer TSV 4.7x10.0 must exist");
			assert.equal(zimmer.hexType, "internal_hex");
		});

		it("verifies Megagen AnyRidge (Knife Threads and 5 deg cone)", () => {
			const anyridge = findCanonicalFixture("megagen", 4.5, 10.0, "AnyRidge");
			assert.ok(anyridge, "Megagen AnyRidge 4.5x10.0 must exist");
			assert.equal(anyridge.hexType, "anyridge_hex_cone");
			assert.equal(anyridge.coneAngleDeg, 4.0);
		});

		it("verifies BioHorizons (Laser-Lok microchannels)", () => {
			const bio = findCanonicalFixture("biohorizons", 4.6, 10.5, "Tapered Internal");
			assert.ok(bio, "BioHorizons 4.6x10.5 must exist");
			assert.equal(bio.hexType, "internal_hex");
			assert.ok(bio.clinicalIndicationRu.includes("Laser-Lok"));
		});

		it("verifies Alpha-Bio Tec (SPI Spiral)", () => {
			const spi = findCanonicalFixture("alphabio", 4.2, 10.0, "SPI");
			assert.ok(spi, "Alpha-Bio SPI 4.2x10.0 must exist");
			assert.equal(spi.hexType, "internal_hex");
			assert.ok(Math.abs(spi.apexDiameterMm - 2.73) < 0.01);
		});

		it("verifies Ankylos C/X (TissueCare Morse Cone 5.7 deg)", () => {
			const ankylos = findCanonicalFixture("ankylos", 3.5, 11.0, "Ankylos C/X");
			assert.ok(ankylos, "Ankylos C/X 3.5x11.0 must exist");
			assert.equal(ankylos.hexType, "tissue_care_cone");
			assert.equal(ankylos.platformDiameterMm, 3.5);
			assert.ok(ankylos.apexDiameterMm < 3.5);
		});

		it("verifies all prices are strict integer kopecks (Financial Invariant Mandate 8b)", () => {
			for (const f of CANONICAL_IMPLANT_CATALOG) {
				assert.ok(Number.isInteger(f.priceKopecks), `Fixture ${f.id} price ${f.priceKopecks} must be integer`);
				assert.ok(f.priceKopecks > 0, `Fixture ${f.id} price must be > 0`);
			}
		});

		it("verifies all tapered fixtures have apexDiameterMm < diameterMm", () => {
			for (const f of CANONICAL_IMPLANT_CATALOG) {
				if (f.isTapered) {
					assert.ok(
						f.apexDiameterMm < f.diameterMm,
						`Tapered fixture ${f.id} (${f.diameterMm}mm) apex (${f.apexDiameterMm}mm) must be narrower than body`,
					);
				}
			}
		});

		it("filterCanonicalCatalog properly filters by brand, diameter, and hex type", () => {
			const filteredMorse = filterCanonicalCatalog({
				hexType: "morse_taper_11",
				minDiameter: 3.5,
				maxDiameter: 4.5,
			});
			assert.ok(filteredMorse.length > 0);
			for (const f of filteredMorse) {
				assert.equal(f.hexType, "morse_taper_11");
				assert.ok(f.diameterMm >= 3.45 && f.diameterMm <= 4.55);
			}

			const filteredBrand = filterCanonicalCatalog({
				brandKey: "straumann",
			});
			assert.ok(filteredBrand.length >= 4);
			for (const f of filteredBrand) {
				assert.equal(f.brandKey, "straumann");
			}
		});
	});
});
