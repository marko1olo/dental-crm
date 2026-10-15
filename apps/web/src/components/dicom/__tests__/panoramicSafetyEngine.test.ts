import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	evaluateAnatomicalSafety,
	getImplantRecommendationForMisch,
	ANATOMICAL_SAFETY_BUFFER_MM,
	ANATOMICAL_DANGER_THRESHOLD_MM,
} from "../PanoramicSafetyEngine.js";

describe("PanoramicSafetyEngine — Metric Distance & Misch Implant Auto-Selection", () => {
	it("1.1 Accurately evaluates safe clearance (>= 2.0 mm) without warnings", () => {
		const audit = evaluateAnatomicalSafety({
			distanceToCanalMm: 3.5,
			distanceToForamenMm: 4.2,
			distanceToSinusFloorMm: 5.0,
		});

		assert.equal(audit.isWarning, false);
		assert.equal(audit.isCritical, false);
		assert.equal(audit.canProceed, true); // Mandate 8e: Doctor Autonomy
		assert.equal(audit.minClearanceMm, 3.5);
		assert.equal(audit.nearestStructure, "mandibular_canal");
		assert.equal(audit.warningMessageRu, null);
	});

	it("1.2 Triggers soft warning when distance is between 1.5 mm and 2.0 mm without disabling CTA", () => {
		const audit = evaluateAnatomicalSafety({
			distanceToCanalMm: 1.8,
			distanceToForamenMm: 3.0,
		});

		assert.equal(audit.isWarning, true);
		assert.equal(audit.isCritical, false);
		assert.equal(audit.canProceed, true); // Mandate 8e: Non-blocking warning banner
		assert.equal(audit.minClearanceMm, 1.8);
		assert.ok(audit.warningMessageRu?.includes("Внимание"));
		assert.ok(audit.warningMessageRu?.includes("нижнечелюстного канала"));
	});

	it("1.3 Triggers critical alert when distance is < 1.5 mm (nerve danger / sinus perforation) with canProceed=true", () => {
		const audit = evaluateAnatomicalSafety({
			distanceToSinusFloorMm: 0.8,
			distanceToCanalMm: 5.0,
		});

		assert.equal(audit.isWarning, true);
		assert.equal(audit.isCritical, true);
		assert.equal(audit.canProceed, true); // Mandate 8e: Never disable buttons
		assert.equal(audit.minClearanceMm, 0.8);
		assert.ok(audit.warningMessageRu?.includes("КРИТИЧЕСКИЙ РИСК"));
		assert.ok(audit.warningMessageRu?.includes("дна гайморовой пазухи"));
	});

	it("1.4 Recommends parallel/cylindrical implants and mandatory cortical tap for D1 bone (>1250 HU)", () => {
		const rec = getImplantRecommendationForMisch(1450);
		assert.equal(rec.mischClass, "D1");
		assert.equal(rec.requiresCorticalTap, true);
		assert.equal(rec.requiresUnderDrilling, false);
		assert.ok(rec.bodyDesignRu.includes("Цилиндрический"));
		assert.ok(rec.surgicalProtocolRu.includes("кортикальный метчик"));
		assert.ok(rec.recommendedSystems.some((s) => s.brand === "Straumann" || s.brand === "Nobel Biocare"));
	});

	it("1.5 Recommends standard drilling protocol and high primary stability for D2 bone (850-1250 HU)", () => {
		const rec = getImplantRecommendationForMisch(950);
		assert.equal(rec.mischClass, "D2");
		assert.equal(rec.requiresCorticalTap, false);
		assert.equal(rec.requiresUnderDrilling, false);
		assert.ok(rec.primaryStabilityExpectationRu.includes("Превосходная") || rec.primaryStabilityExpectationRu.includes("ISQ"));
		assert.ok(rec.recommendedSystems.some((s) => s.brand === "Osstem"));
	});

	it("1.6 Recommends tapered active thread for D3 bone (350-850 HU)", () => {
		const rec = getImplantRecommendationForMisch(550);
		assert.equal(rec.mischClass, "D3");
		assert.ok(rec.threadTypeRu.includes("Двойная резьба") || rec.bodyDesignRu.includes("конический"));
		assert.ok(rec.recommendedSystems.some((s) => s.brand === "Dentium" || s.brand === "Osstem"));
	});

	it("1.7 Recommends aggressive condensing thread and under-drilling for D4 bone (150-350 HU)", () => {
		const rec = getImplantRecommendationForMisch(250);
		assert.equal(rec.mischClass, "D4");
		assert.equal(rec.requiresUnderDrilling, true);
		assert.equal(rec.underDrillingMm, 1.0);
		assert.ok(rec.bodyDesignRu.includes("самонарезающим") || rec.bodyDesignRu.includes("конус"));
		assert.ok(rec.recommendedSystems.some((s) => s.line === "NobelActive" || s.brand === "MIS Implants"));
	});

	it("1.8 Identifies D5 (<150 HU) as defect/immature bone requiring GBR or Sinus Lift augmentation", () => {
		const rec = getImplantRecommendationForMisch(80);
		assert.equal(rec.mischClass, "D5");
		assert.equal(rec.requiresBoneAugmentation, true);
		assert.ok(rec.surgicalProtocolRu.includes("НКР") || rec.surgicalProtocolRu.includes("GBR"));
	});
});
