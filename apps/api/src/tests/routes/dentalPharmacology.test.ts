import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DentalInteractionMatrixEngine } from "@dental/shared";

describe("Dental Pharmacology & Drug Interaction Matrix (Order 1094n)", () => {
	it("blocks Metronidazole when ethanol is present (ALDH disulfiram-like reaction)", () => {
		const result = DentalInteractionMatrixEngine.evaluatePrescriptionSafety(
			{
				patientId: "00000000-0000-0000-0000-000000000001",
				prescribedInnList: ["Metronidazolum"],
				currentMedications: [],
				chronicDiseases: [],
				vasoconstrictorPlanned: "1:200000",
				patientAgeYears: 30,
				isPregnant: false,
				isLactating: false,
			},
			[],
		);

		assert.equal(result.isPrescriptionSafe, false);
		assert.ok(result.blockersCount >= 1);
		const blocker = result.conflicts.find(
			(conflict) => conflict.id === "INT-METRO-ALC",
		);
		assert.ok(blocker);
		assert.equal(blocker.severity, "blocker");
	});

	it("blocks NSAIDs when patient is taking Anticoagulants (severe hemorrhage risk)", () => {
		const result = DentalInteractionMatrixEngine.evaluatePrescriptionSafety(
			{
				patientId: "00000000-0000-0000-0000-000000000001",
				prescribedInnList: ["Ketorolacum"],
				currentMedications: ["Rivaroxaban 20 mg"],
				chronicDiseases: ["Atrial Fibrillation"],
				vasoconstrictorPlanned: "1:200000",
				patientAgeYears: 65,
				isPregnant: false,
				isLactating: false,
			},
			[],
		);

		assert.equal(result.isPrescriptionSafe, false);
		const blocker = result.conflicts.find(
			(conflict) => conflict.id === "INT-NSAID-ANTICOAG",
		);
		assert.ok(blocker);
		assert.equal(blocker.severity, "blocker");
	});

	it("blocks Penicillins and warns on Cephalosporins for Penicillin-allergic patients", () => {
		const result = DentalInteractionMatrixEngine.evaluatePrescriptionSafety(
			{
				patientId: "00000000-0000-0000-0000-000000000001",
				prescribedInnList: ["Amoxicillinum"],
				currentMedications: [],
				chronicDiseases: [],
				vasoconstrictorPlanned: "1:200000",
				patientAgeYears: 40,
				isPregnant: false,
				isLactating: false,
			},
			[
				{
					allergenGroup: "penicillin",
					reactionSeverity: "anaphylactic_shock",
					hasSamterTriad: false,
				},
			],
		);

		assert.equal(result.isPrescriptionSafe, false);
		const blocker = result.conflicts.find(
			(conflict) => conflict.id === "ALLERGY-PEN-DIRECT",
		);
		assert.ok(blocker);
	});

	it("blocks Epinephrine for patients on Non-selective Beta-blockers (Propranolol)", () => {
		const result = DentalInteractionMatrixEngine.evaluatePrescriptionSafety(
			{
				patientId: "00000000-0000-0000-0000-000000000001",
				prescribedInnList: ["Amoxicillinum"],
				currentMedications: ["Propranolol 40 mg"],
				chronicDiseases: ["Hypertension"],
				vasoconstrictorPlanned: "1:100000",
				patientAgeYears: 55,
				isPregnant: false,
				isLactating: false,
			},
			[],
		);

		assert.equal(result.isPrescriptionSafe, false);
		const blocker = result.conflicts.find(
			(conflict) => conflict.id === "INT-EPI-BB",
		);
		assert.ok(blocker);
	});

	it("blocks NSAIDs in Samter Triad (Aspirin-induced asthma) patients", () => {
		const result = DentalInteractionMatrixEngine.evaluatePrescriptionSafety(
			{
				patientId: "00000000-0000-0000-0000-000000000001",
				prescribedInnList: ["Ibuprofenum"],
				currentMedications: [],
				chronicDiseases: ["Bronchial Asthma"],
				vasoconstrictorPlanned: "none",
				patientAgeYears: 32,
				isPregnant: false,
				isLactating: false,
			},
			[
				{
					allergenGroup: "aspirin",
					reactionSeverity: "severe_angioedema",
					hasSamterTriad: true,
				},
			],
		);

		assert.equal(result.isPrescriptionSafe, false);
		const blocker = result.conflicts.find(
			(conflict) => conflict.id === "ALLERGY-SAMTER-TRIAD",
		);
		assert.ok(blocker);
	});
});
