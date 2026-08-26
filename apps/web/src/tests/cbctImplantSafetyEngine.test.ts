import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
import {
  analyzeMischBoneQuality,
  classifyHUToMisch,
  computeHUZoneProfile,
  formatMischProtocolToDiaryText,
  generateMischDrillSequence,
  MISCH_HU_THRESHOLDS,
} from "../components/radiology/boneDensityMischMath";
import {
  auditAlveolarBoneContainment,
  auditMandibularNerveSafety,
  calculateApexCoordinates,
  findImplantSpec,
  performCbctPlanningAudit,
  pointToSegmentDistance2D,
  STANDARD_IMPLANT_CATALOG,
  type AlveolarRidgeEnvelope,
  type CrossSectionImplantPose,
  type MandibularCanalCrossSection,
} from "../components/radiology/implantSafetyEngine";

describe("Dental CBCT Implant Planning & Nerve Safety Alarm Engine Suite", () => {
  // 1. MISCH BONE CLASSIFICATION (HU) & 3-ZONE SAMPLING
  describe("Misch Bone Density (HU) Engine", () => {
    it("classifies raw Hounsfield Units into Misch D1-D5 categories correctly", () => {
      assert.equal(classifyHUToMisch(1400), "D1");
      assert.equal(classifyHUToMisch(1251), "D1");
      assert.equal(classifyHUToMisch(1250), "D2");
      assert.equal(classifyHUToMisch(950), "D2");
      assert.equal(classifyHUToMisch(850), "D2");
      assert.equal(classifyHUToMisch(849), "D3");
      assert.equal(classifyHUToMisch(450), "D3");
      assert.equal(classifyHUToMisch(350), "D3");
      assert.equal(classifyHUToMisch(349), "D4");
      assert.equal(classifyHUToMisch(200), "D4");
      assert.equal(classifyHUToMisch(150), "D4");
      assert.equal(classifyHUToMisch(149), "D5");
      assert.equal(classifyHUToMisch(50), "D5");
    });

    it("computes 3-zone weighted HU profile correctly (25% coronal, 50% trabecular, 25% apical)", () => {
      const sampling = computeHUZoneProfile(1200, 600, 800);
      assert.equal(sampling.coronalCrestalHU, 1200);
      assert.equal(sampling.trabecularCoreHU, 600);
      assert.equal(sampling.apicalBaseHU, 800);
      assert.equal(sampling.overallMeanHU, 800);
    });

    it("provides D1 surgical protocol with mandatory cortical tap and low RPM", () => {
      const d1Profile = computeHUZoneProfile(1500, 1300, 1400);
      const analysis = analyzeMischBoneQuality(d1Profile, 4.0);
      assert.equal(analysis.mischClass, "D1");
      assert.equal(analysis.corticalTapRequired, true);
      assert.equal(analysis.underdrillingRecommended, false);
      assert.ok(analysis.recommendedDrillingRpm.includes("400–600 RPM"));
      assert.equal(analysis.isImmediateLoadingEligible, true);
      assert.ok(analysis.estimatedInsertionTorqueNcm.expectedNcm >= 45);
    });

    it("provides D4 surgical protocol with mandatory under-drilling recommendation", () => {
      const d4Profile = computeHUZoneProfile(300, 200, 250);
      const analysis = analyzeMischBoneQuality(d4Profile, 4.5);
      assert.equal(analysis.mischClass, "D4");
      assert.equal(analysis.corticalTapRequired, false);
      assert.equal(analysis.underdrillingRecommended, true);
      assert.equal(analysis.underdrillingMm, 0.8);
      assert.equal(analysis.isImmediateLoadingEligible, false);
      assert.ok(analysis.clinicalAdvice.some((a) => a.includes("Недопрепарирование")));
    });

    it("generates tailored drilling sequence steps according to bone class and implant diameter", () => {
      const d1Steps = generateMischDrillSequence("D1", 4.0, 10.0);
      assert.ok(d1Steps.some((s) => s.drillName.includes("Кортикальный метчик")));

      const d4Steps = generateMischDrillSequence("D4", 4.0, 10.0);
      assert.ok(!d4Steps.some((s) => s.drillName.includes("Кортикальный метчик")));
    });

    it("formats Misch bone analysis to diary text containing all clinical parameters", () => {
      const sampling = computeHUZoneProfile(1100, 850, 950);
      const analysis = analyzeMischBoneQuality(sampling, 4.0);
      const diaryText = formatMischProtocolToDiaryText(sampling, analysis, 46);
      assert.ok(diaryText.includes("FDI #46"));
      assert.ok(diaryText.includes("Класс по Misch"));
      assert.ok(diaryText.includes("1100 HU"));
      assert.ok(diaryText.includes("850 HU"));
    });
  });

  // 2. VIRTUAL IMPLANT CATALOG & GEOMETRY
  describe("Virtual Implant Catalog & Apex Geometry Engine", () => {
    it("contains fixtures for Straumann, Nobel Biocare, Osstem, and Dentium", () => {
      assert.ok(STANDARD_IMPLANT_CATALOG.length >= 16);
      const brands = new Set(STANDARD_IMPLANT_CATALOG.map((i) => i.brand));
      assert.ok(brands.has("straumann"));
      assert.ok(brands.has("nobel_biocare"));
      assert.ok(brands.has("osstem"));
      assert.ok(brands.has("dentium"));
    });

    it("finds matching implant specification by brand, diameter, and length", () => {
      const spec = findImplantSpec("osstem", 4.0, 10.0);
      assert.equal(spec.brand, "osstem");
      assert.equal(spec.diameterMm, 4.0);
      assert.equal(spec.lengthMm, 10.0);
      assert.equal(spec.priceKopecks, 1850000);
    });

    it("calculates 2D apex coordinates accurately for vertical and tilted trajectories", () => {
      const vertApex = calculateApexCoordinates({ x: 14.0, y: 5.0 }, 0, 10.0);
      assert.equal(vertApex.x, 14.0);
      assert.equal(vertApex.y, 15.0);

      const tiltedApex = calculateApexCoordinates({ x: 14.0, y: 5.0 }, 30, 10.0);
      assert.equal(tiltedApex.x, 19.0);
      assert.ok(Math.abs(tiltedApex.y - 13.66) <= 0.05);
    });

    it("calculates point to segment distance correctly", () => {
      const res = pointToSegmentDistance2D({ x: 14.0, y: 20.0 }, { x: 14.0, y: 5.0 }, { x: 14.0, y: 15.0 });
      assert.equal(res.distance, 5.0);
      assert.equal(res.closestPoint.x, 14.0);
      assert.equal(res.closestPoint.y, 15.0);
    });
  });

  // 3. MANDIBULAR NERVE SAFETY & AUDIO ALARM ENGINE
  describe("Mandibular Canal (IAN) Safety Corridor & Alarm Engine", () => {
    const mockCanal: MandibularCanalCrossSection = {
      center: { x: 14.0, y: 26.5 },
      radiusMm: 1.5,
      safetyMarginMm: 2.0,
    };

    it("classifies SAFE when clearance to canal wall is >= 2.0 mm (no alarm)", () => {
      const pose: CrossSectionImplantPose = {
        entryPoint: { x: 14.0, y: 5.0 },
        angulationDeg: 0,
        implantSpec: findImplantSpec("osstem", 4.0, 10.0),
      };
      const safety = auditMandibularNerveSafety(pose, mockCanal);
      assert.equal(safety.safetyStatus, "safe");
      assert.equal(safety.isDangerous, false);
      assert.equal(safety.isWarning, false);
      assert.equal(safety.shouldTriggerAudioAlarm, false);
      assert.ok(safety.netClearanceToCanalWallMm >= 2.0);
    });

    it("classifies WARNING when clearance to canal wall is between 1.0 mm and 2.0 mm", () => {
      const pose: CrossSectionImplantPose = {
        entryPoint: { x: 14.0, y: 5.0 },
        angulationDeg: 0,
        implantSpec: {
          id: "custom",
          brand: "osstem",
          brandName: "Osstem",
          lineName: "TS III",
          diameterMm: 4.0,
          lengthMm: 16.5,
          platformDiameterMm: 4.0,
          apexDiameterMm: 2.8,
          priceKopecks: 1850000,
          articleNumber: "TEST",
        },
      };
      const safety = auditMandibularNerveSafety(pose, mockCanal);
      assert.equal(safety.safetyStatus, "warning");
      assert.equal(safety.isDangerous, false);
      assert.equal(safety.isWarning, true);
      assert.equal(safety.shouldTriggerAudioAlarm, false);
    });

    it("classifies DANGER and triggers AUDIO ALARM when clearance < 1.0 mm", () => {
      const pose: CrossSectionImplantPose = {
        entryPoint: { x: 14.0, y: 5.0 },
        angulationDeg: 0,
        implantSpec: {
          id: "custom",
          brand: "osstem",
          brandName: "Osstem",
          lineName: "TS III",
          diameterMm: 4.0,
          lengthMm: 17.5,
          platformDiameterMm: 4.0,
          apexDiameterMm: 2.8,
          priceKopecks: 1850000,
          articleNumber: "TEST",
        },
      };
      const safety = auditMandibularNerveSafety(pose, mockCanal);
      assert.equal(safety.safetyStatus, "danger");
      assert.equal(safety.isDangerous, true);
      assert.equal(safety.shouldTriggerAudioAlarm, true);
      assert.ok(safety.clinicalMessageRu.includes("КРИТИЧЕСКИЙ РИСК"));
    });

    it("detects canal perforation when implant body intersects nerve canal wall (clearance <= 0)", () => {
      const pose: CrossSectionImplantPose = {
        entryPoint: { x: 14.0, y: 5.0 },
        angulationDeg: 0,
        implantSpec: {
          id: "custom",
          brand: "osstem",
          brandName: "Osstem",
          lineName: "TS III",
          diameterMm: 4.0,
          lengthMm: 20.0,
          platformDiameterMm: 4.0,
          apexDiameterMm: 2.8,
          priceKopecks: 1850000,
          articleNumber: "TEST",
        },
      };
      const safety = auditMandibularNerveSafety(pose, mockCanal);
      assert.equal(safety.safetyStatus, "danger");
      assert.equal(safety.isDangerous, true);
      assert.equal(safety.shouldTriggerAudioAlarm, true);
      assert.ok(safety.clinicalMessageRu.includes("ПЕРФОРАЦИЯ НИЖНЕЧЕЛЮСТНОГО КАНАЛА"));
    });
  });

  // 4. ALVEOLAR BONE ENVELOPE CONTAINMENT
  describe("Alveolar Bone Envelope Containment Guard", () => {
    const mockEnvelope: AlveolarRidgeEnvelope = {
      crestPoint: { x: 14.0, y: 4.5 },
      basePoint: { x: 14.0, y: 32.0 },
      buccalCrestPoint: { x: 8.5, y: 5.0 },
      lingualCrestPoint: { x: 19.5, y: 5.0 },
      ridgeWidthMm: 11.0,
      ridgeHeightMm: 27.5,
    };

    it("validates adequate bone thickness when centered inside wide ridge", () => {
      const pose: CrossSectionImplantPose = {
        entryPoint: { x: 14.0, y: 5.0 },
        angulationDeg: 0,
        implantSpec: findImplantSpec("straumann", 4.0, 10.0),
      };
      const containment = auditAlveolarBoneContainment(pose, mockEnvelope);
      assert.equal(containment.isBuccalBoneAdequate, true);
      assert.equal(containment.isLingualBoneAdequate, true);
      assert.equal(containment.requiresGbrAugmentation, false);
    });

    it("flags GBR augmentation requirement when implant is shifted too far buccally", () => {
      const pose: CrossSectionImplantPose = {
        entryPoint: { x: 9.5, y: 5.0 },
        angulationDeg: 0,
        implantSpec: findImplantSpec("straumann", 4.0, 10.0),
      };
      const containment = auditAlveolarBoneContainment(pose, mockEnvelope);
      assert.equal(containment.isBuccalBoneAdequate, false);
      assert.equal(containment.requiresGbrAugmentation, true);
      assert.ok(containment.clinicalWarningRu?.includes("НКР (GBR)"));
    });
  });

  // 5. COMPREHENSIVE SURGICAL AUDIT & FORM 043/U GENERATOR
  describe("End-to-End CBCT Surgical Planning Audit & Form 043/u Generator", () => {
    const mockCanal: MandibularCanalCrossSection = {
      center: { x: 14.0, y: 26.5 },
      radiusMm: 1.5,
      safetyMarginMm: 2.0,
    };
    const mockEnvelope: AlveolarRidgeEnvelope = {
      crestPoint: { x: 14.0, y: 4.5 },
      basePoint: { x: 14.0, y: 32.0 },
      buccalCrestPoint: { x: 8.5, y: 5.0 },
      lingualCrestPoint: { x: 19.5, y: 5.0 },
      ridgeWidthMm: 11.0,
      ridgeHeightMm: 27.5,
    };

    it("approves surgical plan and generates treatment line item + Form 043/u protocol", () => {
      const audit = performCbctPlanningAudit({
        toothFdi: 46,
        implantPose: {
          entryPoint: { x: 14.0, y: 5.0 },
          angulationDeg: 0,
          implantSpec: findImplantSpec("osstem", 4.0, 10.0),
        },
        canal: mockCanal,
        envelope: mockEnvelope,
        huSampling: computeHUZoneProfile(1150, 850, 950),
        patientName: "Кузнецов А.В.",
      });

      assert.equal(audit.isPlanApproved, true);
      assert.equal(audit.toothFdi, 46);
      assert.equal(audit.treatmentPlanItem.code, "A16.07.054.46");
      assert.equal(audit.treatmentPlanItem.priceKopecks, 1850000);
      assert.ok(audit.treatmentPlanItem.priceFormattedRu.includes("18"));
      assert.ok(audit.form043DiaryText.includes("ФОРМА 043/У"));
      assert.ok(audit.form043DiaryText.includes("Кузнецов А.В."));
      assert.ok(audit.form043DiaryText.includes("ОДОБРЕНО К УСТАНОВКЕ"));
    });

    it("rejects approval when implant violates nerve safety distance", () => {
      const auditDanger = performCbctPlanningAudit({
        toothFdi: 47,
        implantPose: {
          entryPoint: { x: 14.0, y: 5.0 },
          angulationDeg: 0,
          implantSpec: findImplantSpec("osstem", 5.0, 13.0),
        },
        canal: { center: { x: 14.0, y: 19.0 }, radiusMm: 1.5, safetyMarginMm: 2.0 },
        envelope: mockEnvelope,
        huSampling: computeHUZoneProfile(1000, 700, 800),
        patientName: "Тестовый Пациент",
      });

      assert.equal(auditDanger.isPlanApproved, false);
      assert.ok(auditDanger.form043DiaryText.includes("ОТКЛОНЕНО"));
    });
  });
});