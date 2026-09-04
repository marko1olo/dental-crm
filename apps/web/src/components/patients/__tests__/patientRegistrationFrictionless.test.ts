import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_PATIENT_FIELD_REQUIREMENTS,
	validatePatientDraftWithRequirements,
} from "../patientFieldRequirementsConfig.js";

describe("Frictionless Patient Registration & Non-Blocking Invariants (Mandate 8e)", () => {
	it("allows registration without patronymic (single or two-word names)", () => {
		// Single name (e.g. foreigner or mononym)
		const singleNameResult = validatePatientDraftWithRequirements({
			fullName: "Барабаш",
			phone: "+7 (999) 111-22-33",
		});
		assert.equal(
			singleNameResult.isValid,
			true,
			"Single word name must be valid",
		);
		assert.equal(singleNameResult.errors.fullName, undefined);

		// Two-word name (First + Last, no patronymic)
		const twoWordResult = validatePatientDraftWithRequirements({
			fullName: "Смирнова Анна",
			phone: "+7 (999) 111-22-33",
		});
		assert.equal(
			twoWordResult.isValid,
			true,
			"Two-word name without patronymic must be valid",
		);
		assert.equal(twoWordResult.errors.fullName, undefined);

		// Three-word name (traditional FIO)
		const threeWordResult = validatePatientDraftWithRequirements({
			fullName: "Иванов Иван Иванович",
			phone: "+7 (999) 111-22-33",
		});
		assert.equal(
			threeWordResult.isValid,
			true,
			"Standard three-word name must be valid",
		);
		assert.equal(threeWordResult.errors.fullName, undefined);
	});

	it("does not block registration when SNILS or passport are absent even if clinic requires them for EGISZ", () => {
		const strictClinicRequirements = {
			...DEFAULT_PATIENT_FIELD_REQUIREMENTS,
			requirePhone: true,
			requireSnils: true,
			requireIdentityDocument: true,
			requireAdvertisingSource: true,
		};

		// Emergency/primary mode: documents never block
		const emergencyResult = validatePatientDraftWithRequirements(
			{
				fullName: "Смирнова Анна",
				phone: "+7 (999) 111-22-33",
				isEmergencyOrPrimary: true,
			},
			strictClinicRequirements,
		);
		assert.equal(
			emergencyResult.isValid,
			true,
			"Emergency patient must not be blocked without SNILS/passport",
		);
		assert.equal(emergencyResult.missingRequiredLabels.length, 0);

		// Standard mode with clinic EGISZ recommendation: guidance message explicitly clarifies non-blocking nature
		const standardResult = validatePatientDraftWithRequirements(
			{
				fullName: "Смирнова Анна",
				phone: "+7 (999) 111-22-33",
				isEmergencyOrPrimary: false,
			},
			strictClinicRequirements,
		);
		assert.ok(standardResult.missingRequiredLabels.includes("СНИЛС"));
		assert.ok(standardResult.missingRequiredLabels.includes("Паспорт"));
		assert.ok(
			standardResult.guidanceMessage?.includes("не блокируют регистрацию"),
			"Guidance must explicitly state that SNILS and passport do not block registration",
		);
	});
});
