/**
 * apps/api/src/services/clinical/prescriptionValidationService.test.ts
 *
 * Юнит-тесты валидации рецептов, аллергоанамнеза и пассивной безопасности врача.
 * Мандаты 8e (Автономия врача), 8y (Пассивная безопасность), PHR-03 / PHR-04.
 * Время выполнения: строго <= 10 секунд.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	extractPatientAllergyTerms,
	formatPassiveAllergyAlert,
	validatePrescriptionAllergiesAndSafety,
} from "./prescriptionValidationService.js";

describe("Prescription Clinical Validation & Allergy Safety Service (PHR-03 / PHR-04)", () => {
	it("1. [PHR-03] Generates passive warning for penicillin allergy with Amoxicillin & suggests Clindamycin", () => {
		const result = validatePrescriptionAllergiesAndSafety({
			proposedDrugs: ["Амоксициллин 500 мг", "Хлоргексидин 0.05%"],
			patientAllergies: ["Пенициллин (крапивница в анамнезе)"],
		});

		assert.equal(result.isValid, true);
		assert.equal(result.safetyAuditPassed, false);
		assert.equal(result.hasAllergyWarning, true);
		assert.equal(result.isDoctorAutonomyPermitted, true);
		assert.ok(result.passiveWarnings.length >= 1);

		const warningText = result.passiveWarnings[0] || "";
		assert.ok(
			warningText.includes("непереносимость пенициллинов"),
			`Предупреждение должно содержать непереносимость пенициллинов: ${warningText}`,
		);
		assert.ok(
			warningText.includes("Амоксициллин"),
			`Предупреждение должно содержать назначенный препарат: ${warningText}`,
		);
		assert.ok(
			warningText.includes("Клиндамицин") || warningText.includes("Азитромицин"),
			`Предупреждение должно рекомендовать безопасную альтернативу: ${warningText}`,
		);

		// Safe alternatives list must be populated
		assert.ok(
			result.safeAlternativeRecommendations.some((alt) =>
				alt.recommendedAlternatives.some((a) => a.includes("Клиндамицин")),
			),
		);
	});

	it("2. [PHR-03] Generates passive warning for NSAID allergy with Nimesulide & suggests Paracetamol", () => {
		const result = validatePrescriptionAllergiesAndSafety({
			proposedDrugs: ["Нимесил (Нимесулид 100 мг)"],
			patientAllergies: ["НПВС, аспириновая триада"],
		});

		assert.equal(result.isValid, true);
		assert.equal(result.safetyAuditPassed, false);
		assert.equal(result.hasAllergyWarning, true);
		assert.equal(result.isDoctorAutonomyPermitted, true);
		assert.ok(result.passiveWarnings.length >= 1);

		const warningText = result.passiveWarnings[0] || "";
		assert.ok(
			warningText.includes("непереносимость НПВП"),
			`Предупреждение должно содержать непереносимость НПВП: ${warningText}`,
		);
		assert.ok(
			warningText.includes("Парацетамол"),
			`Предупреждение должно содержать рекомендацию Парацетамола: ${warningText}`,
		);
	});

	it("3. Passes safety audit when no allergies or DDI conflicts are present", () => {
		const result = validatePrescriptionAllergiesAndSafety({
			proposedDrugs: ["Парацетамол 500 мг", "Хлоргексидин 0.05%"],
			patientAllergies: [],
		});

		assert.equal(result.isValid, true);
		assert.equal(result.safetyAuditPassed, true);
		assert.equal(result.hasAllergyWarning, false);
		assert.equal(result.passiveWarnings.length, 0);
		assert.equal(result.isDoctorAutonomyPermitted, true);
	});

	it("4. Formats passive allergy alerts matching Creator's exact canonical pattern", () => {
		const alertPenicillin = formatPassiveAllergyAlert(
			"penicillin",
			"Амоксиклав 875/125 мг",
			"Клиндамицин 300 мг",
		);
		assert.equal(
			alertPenicillin,
			"⚠️ Внимание: в карте отмечена непереносимость пенициллинов. Назначен: Амоксиклав 875/125 мг. Альтернатива: Клиндамицин 300 мг",
		);

		const alertNsaid = formatPassiveAllergyAlert(
			"nsaid",
			"Кетанов 10 мг",
			"Парацетамол 500 мг",
		);
		assert.equal(
			alertNsaid,
			"⚠️ Внимание: в карте отмечена непереносимость НПВП/аспирина. Назначен: Кетанов 10 мг. Альтернатива: Парацетамол 500 мг",
		);
	});

	it("5. Correctly parses various patient allergy input formats (string, array, comma-separated)", () => {
		assert.deepEqual(extractPatientAllergyTerms(null), []);
		assert.deepEqual(extractPatientAllergyTerms(""), []);
		assert.deepEqual(
			extractPatientAllergyTerms("Пенициллин, Аспирин; Лидокаин"),
			["Пенициллин", "Аспирин", "Лидокаин"],
		);
		assert.deepEqual(
			extractPatientAllergyTerms(["Пенициллин", " НПВС "]),
			["Пенициллин", "НПВС"],
		);
	});

	it("6. Mandate 8e: Doctor Autonomy is ALWAYS preserved (isDoctorAutonomyPermitted: true)", () => {
		// Even in worst allergy case, doctor autonomy flag is unconditionally true
		const result = validatePrescriptionAllergiesAndSafety({
			proposedDrugs: ["Амоксициллин 1000 мг", "Ибупрофен 400 мг"],
			patientAllergies: ["Пенициллин", "НПВС"],
		});

		assert.equal(result.isDoctorAutonomyPermitted, true);
		assert.equal(result.isValid, true);
	});
});
