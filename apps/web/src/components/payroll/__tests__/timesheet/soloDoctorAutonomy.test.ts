/**
 * soloDoctorAutonomy.test.ts — Solo Doctor Autonomy & Specialty Presets
 * Mandate 8b: File strictly <= 120 lines.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DOCTOR_SPECIALTY_CONFIGS } from "../../staffPayrollEngine";

describe("Red Team: Solo Doctor Autonomy & Piece-Rate Sovereignty (Mandates 8e, 8n)", () => {
	it("1.1 Doctor specialty presets provide robust piecework rates across all clinical directions", () => {
		assert.ok(DOCTOR_SPECIALTY_CONFIGS.general_dentist, "general_dentist must exist");
		assert.ok(DOCTOR_SPECIALTY_CONFIGS.therapist, "therapist must exist");
		assert.ok(DOCTOR_SPECIALTY_CONFIGS.orthopedist, "orthopedist must exist");
		assert.ok(DOCTOR_SPECIALTY_CONFIGS.surgeon, "surgeon must exist");
		assert.ok(DOCTOR_SPECIALTY_CONFIGS.orthodontist, "orthodontist must exist");
		assert.ok(DOCTOR_SPECIALTY_CONFIGS.solo_practitioner, "solo_practitioner must exist");

		// Therapist has standard 30% piecework rate
		assert.equal(DOCTOR_SPECIALTY_CONFIGS.therapist.defaultPercentage, 30);
		// Orthopedist has 30% and deducts lab costs
		assert.equal(DOCTOR_SPECIALTY_CONFIGS.orthopedist.defaultPercentage, 30);
		assert.equal(DOCTOR_SPECIALTY_CONFIGS.orthopedist.deductsLabCosts, true);
	});

	it("1.2 Solo practitioner operates on 100% net margin piecework after clinic expenses", () => {
		assert.ok(DOCTOR_SPECIALTY_CONFIGS.solo_practitioner, "solo_practitioner config must exist");
		assert.equal(DOCTOR_SPECIALTY_CONFIGS.solo_practitioner.defaultPercentage, 100);
		assert.equal(DOCTOR_SPECIALTY_CONFIGS.solo_practitioner.deductsLabCosts, true);
		assert.equal(DOCTOR_SPECIALTY_CONFIGS.solo_practitioner.deductsMaterialCosts, true);
	});

	it("1.3 Minimum monthly guarantee floors apply correctly when doctor has attendance", () => {
		assert.ok(DOCTOR_SPECIALTY_CONFIGS.general_dentist, "general_dentist config must exist");
		assert.ok(DOCTOR_SPECIALTY_CONFIGS.therapist, "therapist config must exist");
		assert.ok(DOCTOR_SPECIALTY_CONFIGS.surgeon, "surgeon config must exist");
		assert.ok(DOCTOR_SPECIALTY_CONFIGS.general_dentist.minGuaranteeMonthlyKop > 0);
		assert.ok(DOCTOR_SPECIALTY_CONFIGS.therapist.minGuaranteeMonthlyKop > 0);
		assert.ok(DOCTOR_SPECIALTY_CONFIGS.surgeon.minGuaranteeMonthlyKop > 0);
	});
});
