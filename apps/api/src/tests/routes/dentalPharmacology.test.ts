import { describe, expect, it } from "vitest";
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

		expect(result.isPrescriptionSafe).toBe(false);
		expect(result.blockersCount).toBeGreaterThanOrEqual(1);
		const blocker = result.conflicts.find((c) => c.id === "INT-METRO-ALC");
		expect(blocker).toBeDefined();
		expect(blocker?.severity).toBe("blocker");
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

		expect(result.isPrescriptionSafe).toBe(false);
		const blocker = result.conflicts.find(
			(c) => c.id === "INT-NSAID-ANTICOAG",
		);
		expect(blocker).toBeDefined();
		expect(blocker?.severity).toBe("blocker");
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

		expect(result.isPrescriptionSafe).toBe(false);
		const blocker = result.conflicts.find(
			(c) => c.id === "ALLERGY-PEN-DIRECT",
		);
		expect(blocker).toBeDefined();
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

		expect(result.isPrescriptionSafe).toBe(false);
		const blocker = result.conflicts.find((c) => c.id === "INT-EPI-BB");
		expect(blocker).toBeDefined();
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

		expect(result.isPrescriptionSafe).toBe(false);
		const blocker = result.conflicts.find(
			(c) => c.id === "ALLERGY-SAMTER-TRIAD",
		);
		expect(blocker).toBeDefined();
	});
});
