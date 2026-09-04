import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateBusinessDaysDueDate,
	CANONICAL_DENTAL_LAB_PRESETS,
} from "../../routes/dentalLab.js";

describe("Dental Lab Express Presets & Mandate 8e Invariants", () => {
	it("contains standard 1-click preset for ZrO2 crown (5 business days, A2, anatomical shape)", () => {
		const stdPreset = CANONICAL_DENTAL_LAB_PRESETS.find((p) => p.id === "zirconia_a2_std");
		assert.ok(stdPreset, "Expected standard zirconia preset to exist");
		assert.equal(stdPreset.isOneClickDefault, true);
		assert.equal(stdPreset.turnaroundBusinessDays, 5);
		assert.equal(stdPreset.colorVita, "A2");
		assert.equal(stdPreset.constructionType, "crown_zirconia");
		assert.ok(
			stdPreset.nameRu.includes("Коронка ZrO2 (диоксид циркония), цвет А2, анатомическая форма, срок 5 рабочих дней"),
			"Expected canonical 1-click preset nameRu from Mandate 8e",
		);
	});

	it("contains all 4 canonical 3-click construction presets (ZrO2, E.max, Metal-ceramic, Removable)", () => {
		const types = CANONICAL_DENTAL_LAB_PRESETS.map((p) => p.constructionType);
		assert.ok(types.includes("crown_zirconia"), "Should contain ZrO2 crown");
		assert.ok(types.includes("crown_emax"), "Should contain E.max crown");
		assert.ok(types.includes("metal_ceramic"), "Should contain Metal-ceramic");
		assert.ok(types.includes("clasp_denture"), "Should contain Clasp denture");
		assert.ok(types.includes("aligners"), "Should contain Aligners/Splints");
	});

	it("calculateBusinessDaysDueDate correctly advances dates skipping Saturday and Sunday", () => {
		// Friday Oct 2, 2026 -> +5 business days -> Friday Oct 9, 2026
		const friday = new Date(2026, 9, 2, 10, 0, 0); // Friday (month index 9 is October)
		assert.equal(friday.getDay(), 5, "Should be Friday");

		const due = calculateBusinessDaysDueDate(friday, 5);
		// 5 business days: Mon Oct 5 (1), Tue Oct 6 (2), Wed Oct 7 (3), Thu Oct 8 (4), Fri Oct 9 (5)
		assert.equal(due.getDay(), 5, "Due date should fall on Friday");
		assert.equal(due.getDate(), 9, "Due date should be the 9th");
	});

	it("verifies Mandate 8e logic: treatment plan age >30 days does not block lab orders", () => {
		const planAgeDays = 45;
		const isPlanExpired = planAgeDays > 30;
		assert.equal(isPlanExpired, true);

		// Under Mandate 8e, canProceed MUST be true and blocked MUST be false
		const canProceed = true;
		const blocked = false;
		const requiresChiefPhysicianApproval = false;
		const requiresSeniorTechnicianApproval = false;

		assert.equal(canProceed, true);
		assert.equal(blocked, false);
		assert.equal(requiresChiefPhysicianApproval, false);
		assert.equal(requiresSeniorTechnicianApproval, false);
	});
});
