import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatPatientBirthAndAge } from "../PatientHeaderCard";
import { CANONICAL_ROADMAP_META } from "../../treatment-plans/TreatmentPlanRoadmap";

describe("PatientHeaderCard & TreatmentPlanRoadmap — Ergonomics & Roadmaps", () => {
	it("1. Formats patient birth date and Russian age correctly", () => {
		const today = new Date();
		const birth30 = new Date(today.getFullYear() - 30, today.getMonth(), today.getDate()).toISOString();
		const formatted30 = formatPatientBirthAndAge(birth30);
		assert.ok(formatted30.includes("30 лет"));

		const birth21 = new Date(today.getFullYear() - 21, today.getMonth(), today.getDate()).toISOString();
		const formatted21 = formatPatientBirthAndAge(birth21);
		assert.ok(formatted21.includes("21 год"));

		const birth24 = new Date(today.getFullYear() - 24, today.getMonth(), today.getDate()).toISOString();
		const formatted24 = formatPatientBirthAndAge(birth24);
		assert.ok(formatted24.includes("24 года"));
	});

	it("2. Verifies 5 Canonical Treatment Plan Roadmap metadata (Timelines, Prep, Warranty)", () => {
		const stage1 = CANONICAL_ROADMAP_META.stage_1_emergency;
		assert.equal(stage1.stageNumber, 1);
		assert.ok(stage1.timelineRu.includes("визит"));
		assert.ok(stage1.preparationRu.includes("аллерги"));
		assert.ok(stage1.warrantyRu.includes("воспален"));

		const stage2 = CANONICAL_ROADMAP_META.stage_2_therapy;
		assert.equal(stage2.stageNumber, 2);
		assert.ok(stage2.preparationRu.includes("поесть"));
		assert.ok(stage2.warrantyRu.includes("2 года"));

		const stage3 = CANONICAL_ROADMAP_META.stage_3_surgery;
		assert.equal(stage3.stageNumber, 3);
		assert.ok(stage3.preparationRu.includes("КТ"));
		assert.ok(stage3.warrantyRu.includes("гарантия"));

		const stage4 = CANONICAL_ROADMAP_META.stage_4_orthopedics;
		assert.equal(stage4.stageNumber, 4);
		assert.ok(stage4.timelineRu.includes("CAD/CAM") || stage4.timelineRu.includes("визит"));
		assert.ok(stage4.warrantyRu.includes("5 лет"));

		const stage5 = CANONICAL_ROADMAP_META.stage_5_hygiene_checkup;
		assert.equal(stage5.stageNumber, 5);
		assert.ok(stage5.preparationRu.includes("красящ"));
		assert.ok(stage5.warrantyRu.includes("гаранти"));
	});
});
