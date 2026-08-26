import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
import {
  analyzeEmergenceProfile,
  buildZtlWorkOrder,
  calculateEmergenceAngleDeg,
  calculatePlatformSwitchStepMm,
  evaluateBiologicWidth,
  evaluateCementationRisk,
  evaluateEmergenceAngleRisk,
  evaluatePlatformSwitchStatus,
  formatZtlWorkOrderToText,
  getToothEmergenceDefaults,
  TOOTH_EMERGENCE_DEFAULTS,
} from "../components/implant/implantEmergenceMath";
import {
  findTiBaseByArticle,
  getRecommendedTorqueNcm,
  getScrewdriverType,
  getTiBasesByBrandAndPlatform,
  getTorqueSpecsByBrand,
  IMPLANT_TORQUE_SPECS,
  TI_BASE_CATALOG,
  type ImplantTorqueBrand,
} from "../components/implant/implantTorqueCatalog";

describe("Dental Implant Abutment & Emergence Profile Studio Suite", () => {
  // 1. EMERGENCE ANGLE MATHEMATICAL ENGINE
  describe("Emergence Angle (alpha) Biomechanical Calculations", () => {
    it("computes safe emergence angle (< 30°) for anterior incisor with adequate cuff", () => {
      const angle = calculateEmergenceAngleDeg(4.1, 6.0, 2.5);
      assert.ok(angle >= 20.0 && angle <= 22.0, `Expected ~20.8°, got ${angle}°`);
    });

    it("computes critical wide emergence angle (> 40°) for molar with shallow cuff", () => {
      const angle = calculateEmergenceAngleDeg(4.0, 9.5, 1.5);
      assert.ok(angle >= 60.0 && angle <= 63.0, `Expected ~61.4°, got ${angle}°`);
    });

    it("handles zero or negative cuff height gracefully by returning 90° boundary limit", () => {
      const zeroCuffAngle = calculateEmergenceAngleDeg(4.0, 6.0, 0.0);
      assert.equal(zeroCuffAngle, 90.0);

      const negCuffAngle = calculateEmergenceAngleDeg(4.0, 6.0, -1.0);
      assert.equal(negCuffAngle, 90.0);
    });

    it("returns 0° for cylindrical emergence when margin diameter <= platform diameter", () => {
      const angleEqual = calculateEmergenceAngleDeg(4.5, 4.5, 2.0);
      assert.equal(angleEqual, 0.0);

      const angleSmaller = calculateEmergenceAngleDeg(5.0, 4.0, 2.0);
      assert.equal(angleSmaller, 0.0);
    });
  });

  // 2. KATAFUCHI & SOUZA PERI-IMPLANTITIS RISK MODEL
  describe("Katafuchi & Souza Peri-implantitis Risk Evaluator", () => {
    it("grades emergence angle <= 30° as SAFE with 1.0x baseline risk multiplier", () => {
      const evalConcave = evaluateEmergenceAngleRisk(24.5, "concave");
      assert.equal(evalConcave.riskLevel, "safe");
      assert.equal(evalConcave.katafuchiMultiplier, 1.0);

      const evalStraight = evaluateEmergenceAngleRisk(30.0, "straight");
      assert.equal(evalStraight.riskLevel, "safe");
      assert.equal(evalStraight.katafuchiMultiplier, 1.0);
    });

    it("grades emergence angle between 30° and 40° with concave shape as WARNING", () => {
      const evalWarn = evaluateEmergenceAngleRisk(34.0, "concave");
      assert.equal(evalWarn.riskLevel, "warning");
      assert.equal(evalWarn.katafuchiMultiplier, 2.4);
    });

    it("grades angle > 30° with CONVEX profile as DANGER (Souza 2018 bone loss model)", () => {
      const evalConvexDanger = evaluateEmergenceAngleRisk(32.0, "convex");
      assert.equal(evalConvexDanger.riskLevel, "danger");
      assert.equal(evalConvexDanger.katafuchiMultiplier, 3.7);
    });

    it("grades angle > 40° as DANGER regardless of profile contour", () => {
      const evalHighAngle = evaluateEmergenceAngleRisk(42.5, "concave");
      assert.equal(evalHighAngle.riskLevel, "danger");
      assert.equal(evalHighAngle.katafuchiMultiplier, 3.7);
    });
  });

  // 3. PLATFORM SWITCHING BIOLOGICAL WIDTH PRESERVATION
  describe("Platform Switching (Platform Shifting) Evaluation", () => {
    it("calculates platform switch delta correctly in mm", () => {
      const delta = calculatePlatformSwitchStepMm(4.5, 3.5);
      assert.equal(delta, 0.5);

      const deltaMatch = calculatePlatformSwitchStepMm(4.1, 4.1);
      assert.equal(deltaMatch, 0.0);
    });

    it("identifies optimal platform switching (step >= 0.38 mm) per Lazzara & Porter", () => {
      const statusOptimal = evaluatePlatformSwitchStatus(0.45);
      assert.equal(statusOptimal, "optimal_switch");

      const statusBoundary = evaluatePlatformSwitchStatus(0.38);
      assert.equal(statusBoundary, "optimal_switch");
    });

    it("identifies platform matching and inverted risk step conditions", () => {
      const statusMatch = evaluatePlatformSwitchStatus(0.15);
      assert.equal(statusMatch, "platform_matching");

      const statusInverted = evaluatePlatformSwitchStatus(-0.25);
      assert.equal(statusInverted, "inverted_risk");
    });
  });

  // 4. CEMENT-ASSOCIATED PERI-IMPLANTITIS RISK (WILSON 2009)
  describe("Cement-Associated Peri-implantitis Risk Guard", () => {
    it("confirms zero cement risk for screw-retained and multi-unit restorations", () => {
      const screwRisk = evaluateCementationRisk("screw_retained", 3.0);
      assert.equal(screwRisk.level, "none_screw");
      assert.ok(screwRisk.description.includes("0%"));

      const multiUnitRisk = evaluateCementationRisk("multi_unit", 2.5);
      assert.equal(multiUnitRisk.level, "none_screw");
    });

    it("flags safe equigingival margin for cementation <= 1.0 mm subgingival", () => {
      const safeCement = evaluateCementationRisk("cement_retained", 0.8);
      assert.equal(safeCement.level, "safe_equigingival");
    });

    it("triggers CRITICAL RED ALERT when cement margin is > 1.0 mm subgingival", () => {
      const dangerCement = evaluateCementationRisk("cement_retained", 2.5);
      assert.equal(dangerCement.level, "critical_subgingival");
      assert.ok(dangerCement.description.includes("КРИТИЧЕСКИЙ РИСК"));
      assert.ok(dangerCement.description.includes("Wilson 2009"));
    });
  });

  // 5. ANGLED SCREW CHANNEL (ASC) & BIOLOGIC WIDTH
  describe("Angled Screw Channel (ASC) & Biological Width Engine", () => {
    it("validates ASC feasibility up to 25° angulation", () => {
      const analysis15 = analyzeEmergenceProfile({
        toothNumberFdi: 11,
        implantBrand: "nobel_biocare",
        implantLine: "NobelActive",
        platformDiameterMm: 3.5,
        crownMarginDiameterMm: 6.0,
        gingivalCuffHeightMm: 2.5,
        profileShape: "concave",
        fixationType: "screw_retained",
        subgingivalMarginDepthMm: 1.5,
        screwChannelAngulationDeg: 15,
      });
      assert.equal(analysis15.isAscFeasible, true);
      assert.equal(analysis15.ascWarning, undefined);

      const analysis30 = analyzeEmergenceProfile({
        toothNumberFdi: 11,
        implantBrand: "nobel_biocare",
        implantLine: "NobelActive",
        platformDiameterMm: 3.5,
        crownMarginDiameterMm: 6.0,
        gingivalCuffHeightMm: 2.5,
        profileShape: "concave",
        fixationType: "screw_retained",
        subgingivalMarginDepthMm: 1.5,
        screwChannelAngulationDeg: 30,
      });
      assert.equal(analysis30.isAscFeasible, false);
      assert.ok(analysis30.ascWarning?.includes("превышает предел 25°"));
    });

    it("evaluates transmucosal biological width parameters (3.0 mm total required)", () => {
      const bio25 = evaluateBiologicWidth(2.5);
      assert.equal(bio25.totalBiologicWidthMm, 3.0);
      assert.equal(bio25.connectiveTissueBandMm, 1.5);
      assert.equal(bio25.junctionalEpitheliumMm, 1.5);
      assert.equal(bio25.isAdequate, true);

      const bio10 = evaluateBiologicWidth(1.0);
      assert.equal(bio10.isAdequate, false);
    });
  });

  // 6. TOOTH ANATOMICAL DEFAULTS & FDI TAXONOMY
  describe("FDI Tooth Anatomical Defaults Catalog", () => {
    it("provides aesthetic smile zone defaults for maxillary anterior teeth (#11, #21)", () => {
      const def11 = getToothEmergenceDefaults(11);
      assert.equal(def11.toothNumberFdi, 11);
      assert.equal(def11.isAestheticZone, true);
      assert.equal(def11.defaultCervicalDiameterMm, 7.0);
      assert.equal(def11.typicalMucosalThicknessMm, 2.5);

      const def21 = getToothEmergenceDefaults(21);
      assert.equal(def21.isAestheticZone, true);
    });

    it("provides molar defaults for posterior masticatory teeth (#16, #46)", () => {
      const def46 = getToothEmergenceDefaults(46);
      assert.equal(def46.toothNumberFdi, 46);
      assert.equal(def46.isAestheticZone, false);
      assert.equal(def46.defaultCervicalDiameterMm, 9.5);
    });

    it("provides fallback defaults for non-standard or unspecified FDI numbers", () => {
      const defFallback = getToothEmergenceDefaults(99);
      assert.ok(defFallback.toothNameRu.includes("99"));
      assert.equal(defFallback.defaultCervicalDiameterMm, 6.5);
    });
  });

  // 7. IMPLANT TORQUE SPECIFICATIONS (25-35 N·CM)
  describe("Implant Torque Catalog & Calibrated Driver Standards", () => {
    const requiredBrands: ImplantTorqueBrand[] = [
      "straumann",
      "nobel_biocare",
      "osstem",
      "dentium",
      "astra_tech",
      "megagen",
    ];

    it("contains specifications for all 6 major world-class implant systems", () => {
      for (const b of requiredBrands) {
        const spec = IMPLANT_TORQUE_SPECS[b];
        assert.ok(spec, `Brand spec for ${b} must exist`);
        assert.ok(spec.torqueFinalScrewNcm >= 25 && spec.torqueFinalScrewNcm <= 35);
        assert.ok(spec.screwdriverDefault.length > 0);
        assert.ok(spec.connectionSafetyNotes.length > 0);
      }
    });

    it("verifies Straumann torque (35 N·cm) and SCS screwdriver", () => {
      const straumann = getTorqueSpecsByBrand("straumann");
      assert.equal(straumann.torqueFinalScrewNcm, 35);
      assert.equal(straumann.torqueMultiUnitBridgeScrewNcm, 15);
      assert.equal(getRecommendedTorqueNcm("straumann", "final_prosthetic_screw"), 35);
      assert.equal(getRecommendedTorqueNcm("straumann", "multi_unit_bridge_screw"), 15);
      assert.ok(getScrewdriverType("straumann").includes("SCS"));
    });

    it("verifies Nobel Biocare torque (35 N·cm) and Unigrip/Omnigrip drivers", () => {
      assert.equal(getRecommendedTorqueNcm("nobel_biocare", "final_prosthetic_screw"), 35);
      assert.ok(getScrewdriverType("nobel_biocare", false).includes("Unigrip"));
      assert.ok(getScrewdriverType("nobel_biocare", true).includes("Omnigrip"));
    });

    it("verifies Osstem torque (Regular 30 N·cm, Mini platform 20 N·cm protection)", () => {
      assert.equal(getRecommendedTorqueNcm("osstem", "final_prosthetic_screw", 4.5), 30);
      assert.equal(getRecommendedTorqueNcm("osstem", "final_prosthetic_screw", 3.5), 20);
      assert.ok(getScrewdriverType("osstem").includes("Hex 1.2"));
    });

    it("verifies Dentium torque (30 N·cm) and Hex 1.27 mm driver", () => {
      assert.equal(getRecommendedTorqueNcm("dentium", "final_prosthetic_screw"), 30);
      assert.ok(getScrewdriverType("dentium").includes("Hex 1.27"));
    });

    it("verifies Astra Tech EV torque (25 N·cm) and Hex EV driver", () => {
      assert.equal(getRecommendedTorqueNcm("astra_tech", "final_prosthetic_screw", 4.2), 25);
      assert.ok(getScrewdriverType("astra_tech").includes("Hex EV"));
    });

    it("verifies MegaGen AnyRidge torque (35 N·cm) and Meg-Torq driver", () => {
      assert.equal(getRecommendedTorqueNcm("megagen", "final_prosthetic_screw"), 35);
      assert.ok(getScrewdriverType("megagen").includes("Meg-Torq"));
    });
  });

  // 8. TI-BASE & PROSTHETIC CATALOG ENGINE
  describe("Ti-Base Catalog Queries & Articles", () => {
    it("provides filterable Ti-Base items across brands and platform diameters", () => {
      const straumannTiBases = getTiBasesByBrandAndPlatform("straumann", 4.1);
      assert.ok(straumannTiBases.length > 0);
      assert.ok(straumannTiBases.some((tb) => tb.platformName.includes("RC")));

      const osstemTiBases = getTiBasesByBrandAndPlatform("osstem", 4.5);
      assert.ok(osstemTiBases.length > 0);
      assert.ok(osstemTiBases.some((tb) => tb.platformName.includes("Regular")));
    });

    it("finds Ti-Base by exact catalog article number", () => {
      const variobaseRc = findTiBaseByArticle("022.0106");
      assert.ok(variobaseRc, "Straumann Variobase 022.0106 must exist");
      assert.equal(variobaseRc.brand, "straumann");
      assert.equal(variobaseRc.platformDiameterMm, 4.1);
      assert.equal(variobaseRc.priceKopecks, 680000);

      const nobelAsc = findTiBaseByArticle("38841");
      assert.ok(nobelAsc, "Nobel ASC 38841 must exist");
      assert.equal(nobelAsc.brand, "nobel_biocare");
      assert.equal(nobelAsc.maxAscAngleDeg, 25);
    });
  });

  // 9. DENTAL LAB (ЗТЛ) WORK ORDER SPECIFICATION
  describe("Dental Lab (ЗТЛ) Work Order Generator", () => {
    it("generates structured work order specification and formats to readable text", () => {
      const workOrder = buildZtlWorkOrder({
        toothNumberFdi: 11,
        implantBrand: "Straumann",
        implantLine: "BLX TorcFit",
        platformDiameterMm: 4.1,
        tiBaseArticle: "022.0106",
        abutmentType: "Variobase RC",
        gingivalCuffHeightMm: 2.5,
        chimneyPostHeightMm: 5.5,
        fixationType: "screw_retained",
        crownMaterial: "zirconia_multilayer",
        emergenceAngleDeg: 20.8,
        profileShape: "concave",
        recommendedTorqueNcm: 35,
        screwdriverType: "SCS",
        screwChannelAngulationDeg: 10,
        notes: "Цвет A2, полупрозрачный режущий край.",
      });

      assert.ok(workOrder.orderId.startsWith("ZTL-11-"));
      assert.equal(workOrder.toothNumberFdi, 11);
      assert.equal(workOrder.recommendedTorqueNcm, 35);
      assert.equal(workOrder.screwChannelAngulationDeg, 10);
      assert.equal(workOrder.isSubgingivalCementAlert, false);

      const formattedText = formatZtlWorkOrderToText(workOrder);
      assert.ok(formattedText.includes("ЗАКАЗ-НАРЯД В ЗУБОТЕХНИЧЕСКУЮ ЛАБОРАТОРИЮ"));
      assert.ok(formattedText.includes("FDI #11"));
      assert.ok(formattedText.includes("35 N·cm"));
      assert.ok(formattedText.includes("022.0106"));
      assert.ok(formattedText.includes("Цвет A2"));
    });

    it("flags subgingival cement alert in lab work order when cementation > 1.0 mm is used", () => {
      const cementOrder = buildZtlWorkOrder({
        toothNumberFdi: 46,
        implantBrand: "Osstem",
        implantLine: "TS III Regular",
        platformDiameterMm: 4.5,
        tiBaseArticle: "TBA4525R",
        abutmentType: "Custom Ti-Base",
        gingivalCuffHeightMm: 2.5,
        chimneyPostHeightMm: 5.5,
        fixationType: "cement_retained",
        crownMaterial: "zirconia_monolithic",
        emergenceAngleDeg: 28.0,
        profileShape: "straight",
        recommendedTorqueNcm: 30,
        screwdriverType: "Hex 1.2 mm",
      });

      assert.equal(cementOrder.isSubgingivalCementAlert, true);
      const formattedText = formatZtlWorkOrderToText(cementOrder);
      assert.ok(formattedText.includes("ВНИМАНИЕ: При цементной фиксации вынести уступ"));
    });
  });
});