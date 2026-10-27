import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_PATIENT_FIELD_REQUIREMENTS,
	validatePatientDraftWithRequirements,
} from "../patientFieldRequirementsConfig.js";

describe("Frictionless Patient Registration & Validation (Mandate 8e)", () => {
	it("allows registration without patronymic (single or two-word names)", () => {
		const singleNameResult = validatePatientDraftWithRequirements({
			fullName: "Барабаш",
			phone: "+7 (999) 111-22-33",
		});
		assert.equal(singleNameResult.isValid, true);
		assert.equal(singleNameResult.errors.fullName, undefined);

		const twoWordResult = validatePatientDraftWithRequirements({
			fullName: "Смирнова Анна",
			phone: "+7 (999) 111-22-33",
		});
		assert.equal(twoWordResult.isValid, true);
		assert.equal(twoWordResult.errors.fullName, undefined);

		const threeWordResult = validatePatientDraftWithRequirements({
			fullName: "Иванов Иван Иванович",
			phone: "+7 (999) 111-22-33",
		});
		assert.equal(threeWordResult.isValid, true);
		assert.equal(threeWordResult.errors.fullName, undefined);
	});

	it("does not block registration when SNILS or passport are absent even if clinic requires them", () => {
		const strictClinicRequirements = {
			...DEFAULT_PATIENT_FIELD_REQUIREMENTS,
			requirePhone: true,
			requireSnils: true,
			requireIdentityDocument: true,
			requireAdvertisingSource: true,
		};

		const emergencyResult = validatePatientDraftWithRequirements(
			{ fullName: "Смирнова Анна", phone: "+7 (999) 111-22-33", isEmergencyOrPrimary: true },
			strictClinicRequirements,
		);
		assert.equal(emergencyResult.isValid, true);
		assert.equal(emergencyResult.missingRequiredLabels.length, 0);

		const standardResult = validatePatientDraftWithRequirements(
			{ fullName: "Смирнова Анна", phone: "+7 (999) 111-22-33", isEmergencyOrPrimary: false },
			strictClinicRequirements,
		);
		assert.ok(standardResult.missingRequiredLabels.includes("СНИЛС"));
		assert.ok(standardResult.missingRequiredLabels.includes("Паспорт"));
		assert.ok(standardResult.guidanceMessage?.includes("не блокируют регистрацию"));
	});

	it("guarantees 2-click patient registration (FIO + Phone) with non-blocking submit (Mandate 8e, 8n)", () => {
		const quickIntakeResult = validatePatientDraftWithRequirements({
			fullName: "Ковалев Михаил",
			phone: "+7 (903) 123-45-67",
			isEmergencyOrPrimary: true,
		});

		assert.equal(quickIntakeResult.isValid, true);
		assert.equal(Object.keys(quickIntakeResult.errors).length, 0);
		assert.equal(quickIntakeResult.missingRequiredLabels.length, 0);
	});
});
