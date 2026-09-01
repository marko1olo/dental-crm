/**
 * clinicalDdiDrugSafetyEngine.test.ts
 * Rigorous Red Team unit tests for Clinical DDI, Allergy & Somatic Drug Safety Engine.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	auditClinicalDrugSafety,
	matchDrugClasses,
} from "./clinicalDdiDrugSafetyEngine.js";

describe("Inquisitor 8: Clinical DDI, Allergy & Drug Safety Engine", () => {
	describe("1. Warfarin & Anticoagulant + NSAID Hazard Blocking (GI Bleed Prevention)", () => {
		it("should 100% block Ibuprofen when patient is on Warfarin", () => {
			const result = auditClinicalDrugSafety({
				proposedMedications: ["Ибупрофен 400 мг"],
				existingMedications: ["Варфарин 2.5 мг"],
			});

			assert.strictEqual(result.isSafe, false);
			assert.strictEqual(result.riskLevel, "critical_danger");
			assert.strictEqual(result.hasSevereDdi, true);
			assert.ok(result.blockedPrescriptions.includes("Ибупрофен 400 мг"));
			assert.ok(
				result.drugInteractions.some(
					(i) =>
						i.severity === "critical" &&
						i.primaryDrug === "Ибупрофен 400 мг" &&
						i.interactingDrug === "Варфарин 2.5 мг" &&
						i.effectDescriptionRu.includes("кровотеч"),
				),
			);
			assert.ok(
				result.safeAlternativeRecommendations.some(
					(r) =>
						r.originalDrug === "Ибупрофен 400 мг" &&
						r.recommendedAlternatives.some((alt) => alt.includes("Парацетамол")),
				),
			);
		});

		it("should 100% block Ketorolac when patient takes DOAC (Xarelto / Rivaroxaban)", () => {
			const result = auditClinicalDrugSafety({
				proposedMedications: ["Кеторолак 10 мг (Кетанов)"],
				existingMedications: ["Ксарелто 20 мг (Ривароксабан)"],
			});

			assert.strictEqual(result.isSafe, false);
			assert.strictEqual(result.riskLevel, "critical_danger");
			assert.strictEqual(result.hasSevereDdi, true);
			assert.ok(result.blockedPrescriptions.includes("Кеторолак 10 мг (Кетанов)"));
			assert.ok(
				result.drugInteractions.some(
					(i) =>
						i.severity === "critical" &&
						i.effectDescriptionRu.includes("кровотечений"),
				),
			);
		});

		it("should 100% block Metronidazole when patient takes Warfarin (CYP2C9 spike)", () => {
			const result = auditClinicalDrugSafety({
				proposedMedications: ["Метронидазол 500 мг (Трихопол)"],
				existingMedications: ["Варфарин"],
			});

			assert.strictEqual(result.isSafe, false);
			assert.strictEqual(result.riskLevel, "critical_danger");
			assert.strictEqual(result.hasSevereDdi, true);
			assert.ok(result.blockedPrescriptions.includes("Метронидазол 500 мг (Трихопол)"));
			assert.ok(
				result.safeAlternativeRecommendations.some(
					(r) =>
						r.originalDrug === "Метронидазол 500 мг (Трихопол)" &&
						r.recommendedAlternatives.some((alt) => alt.includes("Клиндамицин") || alt.includes("Амоксициллин")),
				),
			);
		});
	});

	describe("2. Penicillin Allergy & Cross-Reactivity Blocking", () => {
		it("should 100% block Amoxiclav / Augmentin on penicillin allergy & suggest Azithromycin/Clindamycin", () => {
			const result = auditClinicalDrugSafety({
				proposedMedications: ["Амоксиклав 875/125 мг (Амоксициллин + клавуланат)"],
				knownAllergies: ["Аллергия на пенициллины"],
			});

			assert.strictEqual(result.isSafe, false);
			assert.strictEqual(result.riskLevel, "critical_danger");
			assert.strictEqual(result.hasAllergyClash, true);
			assert.ok(
				result.blockedPrescriptions.includes(
					"Амоксиклав 875/125 мг (Амоксициллин + клавуланат)",
				),
			);
			assert.ok(
				result.allergyWarnings.some(
					(w) =>
						w.severity === "critical" &&
						w.allergenGroup.includes("Пенициллины") &&
						w.manifestationsRu.includes("Анафилактический шок"),
				),
			);

			const alt = result.safeAlternativeRecommendations.find(
				(r) => r.originalDrug === "Амоксиклав 875/125 мг (Амоксициллин + клавуланат)",
			);
			assert.ok(alt, "Must provide safe alternatives");
			assert.ok(alt.recommendedAlternatives.some((a) => a.includes("Азитромицин") || a.includes("Сумамед")));
			assert.ok(alt.recommendedAlternatives.some((a) => a.includes("Клиндамицин")));
		});

		it("should 100% block Flemoxin / Ampicillin when patient has beta-lactam allergy in English or Russian", () => {
			const result = auditClinicalDrugSafety({
				proposedMedications: ["Флемоксин Солютаб 500 мг", "Ампициллин"],
				knownAllergies: ["Penicillin", "Beta_lactam allergy"],
			});

			assert.strictEqual(result.isSafe, false);
			assert.strictEqual(result.riskLevel, "critical_danger");
			assert.strictEqual(result.hasAllergyClash, true);
			assert.strictEqual(result.blockedPrescriptions.length, 2);
			assert.ok(result.blockedPrescriptions.includes("Флемоксин Солютаб 500 мг"));
			assert.ok(result.blockedPrescriptions.includes("Ампициллин"));
		});
	});

	describe("3. Bronchial Asthma & Sulfite Allergy vs Epinephrine Anesthetics", () => {
		it("should 100% block Ultracain DS (Articaine 1:100 000 with epinephrine) in Bronchial Asthma", () => {
			const result = auditClinicalDrugSafety({
				proposedMedications: ["Ультракаин Д-С форте (Артикаин 4% + Эпинефрин 1:100 000)"],
				patientConditions: ["Бронхиальная астма, смешанная форма"],
			});

			assert.strictEqual(result.isSafe, false);
			assert.strictEqual(result.riskLevel, "critical_danger");
			assert.strictEqual(result.hasAllergyClash, true);
			assert.ok(
				result.blockedPrescriptions.includes(
					"Ультракаин Д-С форте (Артикаин 4% + Эпинефрин 1:100 000)",
				),
			);
			assert.ok(
				result.allergyWarnings.some(
					(w) =>
						w.severity === "critical" &&
						w.allergenGroup.includes("Сульфиты") &&
						w.manifestationsRu.includes("бронхоспазм"),
				),
			);

			const alt = result.safeAlternativeRecommendations.find(
				(r) =>
					r.originalDrug ===
					"Ультракаин Д-С форте (Артикаин 4% + Эпинефрин 1:100 000)",
			);
			assert.ok(alt, "Must provide Scandonest / Mepivacaine 3% alternative");
			assert.ok(
				alt.recommendedAlternatives.some((a) =>
					a.includes("Скандонест 3%") || a.includes("Мепивакаин"),
				),
			);
		});

		it("should 100% block Septanest / Ubistesin when patient has explicit sodium metabisulfite allergy", () => {
			const result = auditClinicalDrugSafety({
				proposedMedications: ["Септанест 1:100 000", "Убистезин 1:200 000"],
				knownAllergies: ["Метабисульфит натрия (E223)"],
			});

			assert.strictEqual(result.isSafe, false);
			assert.strictEqual(result.riskLevel, "critical_danger");
			assert.strictEqual(result.blockedPrescriptions.length, 2);
		});
	});

	describe("4. Pregnancy III Trimester vs NSAID Blocking", () => {
		it("should 100% block Nimesulide / Ibuprofen in III trimester & recommend Paracetamol", () => {
			const result = auditClinicalDrugSafety({
				proposedMedications: ["Нимесил 100 мг (Нимесулид)", "Ибупрофен 400 мг"],
				patientConditions: ["Беременность 3 триместр (34 недели)"],
			});

			assert.strictEqual(result.isSafe, false);
			assert.strictEqual(result.riskLevel, "critical_danger");
			assert.strictEqual(result.hasConditionContraindication, true);
			assert.ok(result.blockedPrescriptions.includes("Нимесил 100 мг (Нимесулид)"));
			assert.ok(result.blockedPrescriptions.includes("Ибупрофен 400 мг"));

			assert.ok(
				result.conditionContraindications.some(
					(c) =>
						c.condition.includes("III триместр") &&
						c.severity === "critical" &&
						c.reasonRu.includes("Боталлова") || c.reasonRu.includes("протока"),
				),
			);

			assert.ok(
				result.safeAlternativeRecommendations.some(
					(r) =>
						r.recommendedAlternatives.some((alt) => alt.includes("Парацетамол")),
				),
			);
		});
	});

	describe("5. Epinephrine + Non-Selective Beta-Blockers (Propranolol / Anaprilin)", () => {
		it("should 100% block Epinephrine anesthetics when patient takes Propranolol", () => {
			const result = auditClinicalDrugSafety({
				proposedMedications: ["Ультракаин Д-С (Артикаин + Эпинефрин 1:200 000)"],
				existingMedications: ["Анаприлин 40 мг (Пропранолол)"],
			});

			assert.strictEqual(result.isSafe, false);
			assert.strictEqual(result.riskLevel, "critical_danger");
			assert.strictEqual(result.hasSevereDdi, true);
			assert.ok(
				result.blockedPrescriptions.includes(
					"Ультракаин Д-С (Артикаин + Эпинефрин 1:200 000)",
				),
			);
			assert.ok(
				result.drugInteractions.some(
					(i) =>
						i.severity === "critical" &&
						i.effectDescriptionRu.includes("гипертонический криз"),
				),
			);
			assert.ok(
				result.safeAlternativeRecommendations.some(
					(r) =>
						r.recommendedAlternatives.some((alt) => alt.includes("Скандонест") || alt.includes("Мепивакаин")),
				),
			);
		});
	});

	describe("6. Complex Multi-Hazard Safety Screen (Zero Leaks)", () => {
		it("should simultaneously detect and block multiple independent hazards", () => {
			const result = auditClinicalDrugSafety({
				proposedMedications: [
					"Амоксиклав 875 мг",
					"Ультракаин Д-С 1:100 000",
					"Кеторолак 10 мг",
					"Парацетамол 500 мг",
				],
				existingMedications: ["Варфарин 5 мг"],
				knownAllergies: ["Пенициллин"],
				patientConditions: ["Бронхиальная астма"],
			});

			assert.strictEqual(result.isSafe, false);
			assert.strictEqual(result.riskLevel, "critical_danger");
			assert.strictEqual(result.hasAllergyClash, true);
			assert.strictEqual(result.hasSevereDdi, true);

			// Amoxiclav blocked by Penicillin allergy
			assert.ok(result.blockedPrescriptions.includes("Амоксиклав 875 мг"));
			// Ultracain blocked by Asthma (sulfites)
			assert.ok(result.blockedPrescriptions.includes("Ультракаин Д-С 1:100 000"));
			// Ketorolac blocked by Warfarin DDI
			assert.ok(result.blockedPrescriptions.includes("Кеторолак 10 мг"));
			// Paracetamol should NOT be blocked
			assert.ok(!result.blockedPrescriptions.includes("Парацетамол 500 мг"));
		});
	});

	describe("7. Safe Clinical Regimen Acceptance", () => {
		it("should approve safe combination with zero false alarms", () => {
			const result = auditClinicalDrugSafety({
				proposedMedications: [
					"Скандонест 3% (Мепивакаин 30 мг/мл)",
					"Азитромицин 500 мг (Сумамед)",
					"Парацетамол 500 мг",
				],
				existingMedications: ["Варфарин 2.5 мг"],
				knownAllergies: ["Пенициллины"],
				patientConditions: ["Бронхиальная астма", "Беременность 3 триместр"],
			});

			assert.strictEqual(result.isSafe, true);
			assert.strictEqual(result.riskLevel, "safe");
			assert.strictEqual(result.blockedPrescriptions.length, 0);
			assert.strictEqual(result.hasAllergyClash, false);
			assert.strictEqual(result.hasSevereDdi, false);
			assert.strictEqual(result.hasConditionContraindication, false);
			assert.ok(result.summaryRu.includes("УСПЕШНО"));
		});
	});

	describe("8. Pharmacological Class Matcher Unit Tests", () => {
		it("should accurately classify varied commercial names and generic synonyms", () => {
			assert.ok(matchDrugClasses("Амоксиклав").includes("penicillin_beta_lactam"));
			assert.ok(matchDrugClasses("Augmentin 1000mg").includes("penicillin_beta_lactam"));
			assert.ok(matchDrugClasses("Цефтриаксон 1г").includes("penicillin_beta_lactam"));
			assert.ok(matchDrugClasses("Кеторол").includes("nsaid"));
			assert.ok(matchDrugClasses("Dexalgin").includes("nsaid"));
			assert.ok(matchDrugClasses("Найз").includes("nsaid"));
			assert.ok(matchDrugClasses("Xarelto").includes("anticoagulant_antiplatelet"));
			assert.ok(matchDrugClasses("Клопидогрел").includes("anticoagulant_antiplatelet"));
			assert.ok(matchDrugClasses("Ультракаин Д-С").includes("epinephrine_anesthetic"));
			assert.ok(matchDrugClasses("Скандонест 3%").includes("mepivacaine_plain"));
			assert.ok(matchDrugClasses("Сумамед").includes("macrolide_lincosamide"));
			assert.ok(matchDrugClasses("Сумамед").includes("azalide_macrolide"));
			assert.ok(matchDrugClasses("Клиндамицин").includes("lincosamide"));
			assert.ok(matchDrugClasses("Кларитромицин (Клацид)").includes("macrolide_cyp3a4_inhibitor"));
			assert.ok(matchDrugClasses("Ципрофлоксацин").includes("fluoroquinolone"));
			assert.ok(matchDrugClasses("Трамадол").includes("opioid_analgesic"));
			assert.ok(matchDrugClasses("Диазепам").includes("benzodiazepine_sedative"));
			assert.ok(matchDrugClasses("Бетадин (повидон-йод)").includes("iodine_antiseptic"));
			assert.ok(matchDrugClasses("Новокаин").includes("ester_anesthetic"));
			assert.ok(matchDrugClasses("Hurricaine гель (бензокаин)").includes("ester_anesthetic"));
		});
	});

	describe("9. Ester Local Anesthetics & Topical Benzocaine Allergy Blocking", () => {
		it("should 100% block Novocaine and Hurricaine / Benzocaine topical gel on ester allergy", () => {
			const result = auditClinicalDrugSafety({
				proposedMedications: [
					"Новокаин 0.5%",
					"Hurricaine гель (Бензокаин 20%)",
				],
				knownAllergies: ["Аллергия на новокаин и эфирные анестетики"],
			});

			assert.strictEqual(result.isSafe, false);
			assert.strictEqual(result.riskLevel, "critical_danger");
			assert.strictEqual(result.hasAllergyClash, true);
			assert.strictEqual(result.blockedPrescriptions.length, 2);
			assert.ok(result.blockedPrescriptions.includes("Новокаин 0.5%"));
			assert.ok(result.blockedPrescriptions.includes("Hurricaine гель (Бензокаин 20%)"));
			assert.ok(
				result.allergyWarnings.some(
					(w) =>
						w.severity === "critical" &&
						w.allergenGroup.includes("Эфирные анестетики"),
				),
			);
			assert.ok(
				result.safeAlternativeRecommendations.some(
					(r) =>
						r.recommendedAlternatives.some((a) => a.includes("Ультракаин") || a.includes("Скандонест") || a.includes("Лидокаин")),
				),
			);
		});
	});

	describe("10. Iodine & Iodoform (Betadine, Metapex, Alveogyl) Allergy Blocking", () => {
		it("should 100% block Betadine and Metapex when patient has iodine allergy", () => {
			const result = auditClinicalDrugSafety({
				proposedMedications: [
					"Бетадин (раствор повидон-йода 10%)",
					"Metapex (паста с йодоформом)",
				],
				knownAllergies: ["Аллергия на йод и морепродукты"],
			});

			assert.strictEqual(result.isSafe, false);
			assert.strictEqual(result.riskLevel, "critical_danger");
			assert.strictEqual(result.hasAllergyClash, true);
			assert.strictEqual(result.blockedPrescriptions.length, 2);
			assert.ok(
				result.allergyWarnings.some(
					(w) =>
						w.severity === "critical" &&
						w.allergenGroup.includes("йода и йодоформа"),
				),
			);
			assert.ok(
				result.safeAlternativeRecommendations.some(
					(r) =>
						r.recommendedAlternatives.some((a) => a.includes("Хлоргексидин") || a.includes("UltraCal XS")),
				),
			);
		});
	});

	describe("11. Pheochromocytoma & Thyrotoxicosis Adrenaline Absolute Blocking", () => {
		it("should 100% block Epinephrine anesthetics in Pheochromocytoma", () => {
			const result = auditClinicalDrugSafety({
				proposedMedications: ["Ультракаин Д-С форте 1:100 000"],
				patientConditions: ["Феохромоцитома левого надпочечника"],
			});

			assert.strictEqual(result.isSafe, false);
			assert.strictEqual(result.riskLevel, "critical_danger");
			assert.strictEqual(result.hasConditionContraindication, true);
			assert.ok(result.blockedPrescriptions.includes("Ультракаин Д-С форте 1:100 000"));
			assert.ok(
				result.conditionContraindications.some(
					(c) =>
						c.severity === "critical" &&
						c.condition.includes("Феохромоцитома"),
				),
			);
			assert.ok(
				result.safeAlternativeRecommendations.some(
					(r) => r.recommendedAlternatives.some((a) => a.includes("Скандонест 3%")),
				),
			);
		});

		it("should 100% block Epinephrine anesthetics in Thyrotoxicosis", () => {
			const result = auditClinicalDrugSafety({
				proposedMedications: ["Септанест 1:100 000 (Артикаин с адреналином)"],
				patientConditions: ["Диффузный токсический зоб, тиреотоксикоз"],
			});

			assert.strictEqual(result.isSafe, false);
			assert.strictEqual(result.riskLevel, "critical_danger");
			assert.strictEqual(result.hasConditionContraindication, true);
			assert.ok(result.blockedPrescriptions.includes("Септанест 1:100 000 (Артикаин с адреналином)"));
			assert.ok(
				result.conditionContraindications.some(
					(c) =>
						c.severity === "critical" &&
						c.condition.includes("тиреотоксикоз"),
				),
			);
		});
	});

	describe("12. Fluoroquinolone + NSAID Seizure Hazard Detection", () => {
		it("should detect high severity seizure interaction between Ciprofloxacin and Ketorolac", () => {
			const result = auditClinicalDrugSafety({
				proposedMedications: ["Ципрофлоксацин 500 мг (Цифран)", "Кеторолак 10 мг"],
			});

			assert.strictEqual(result.hasSevereDdi, true);
			assert.ok(
				result.drugInteractions.some(
					(i) =>
						i.severity === "high" &&
						i.effectDescriptionRu.includes("судорож"),
				),
			);
		});
	});

	describe("13. Opioid (Tramadol) + Benzodiazepine (Diazepam) Black Box Warning", () => {
		it("should 100% block Tramadol and Diazepam combination due to fatal respiratory depression risk", () => {
			const result = auditClinicalDrugSafety({
				proposedMedications: ["Трамадол 50 мг"],
				existingMedications: ["Диазепам 5 мг (Реланиум)"],
			});

			assert.strictEqual(result.isSafe, false);
			assert.strictEqual(result.riskLevel, "critical_danger");
			assert.strictEqual(result.hasSevereDdi, true);
			assert.ok(result.blockedPrescriptions.includes("Трамадол 50 мг"));
			assert.ok(
				result.drugInteractions.some(
					(i) =>
						i.severity === "critical" &&
						i.effectDescriptionRu.includes("Black Box Warning"),
				),
			);
		});
	});

	describe("14. Metronidazole + Alcohol / Ethanol Disulfiram-like Reaction", () => {
		it("should 100% block Metronidazole when alcohol is concurrently reported", () => {
			const result = auditClinicalDrugSafety({
				proposedMedications: ["Метронидазол 500 мг"],
				existingMedications: ["Спиртовые настойки (алкоголь)"],
			});

			assert.strictEqual(result.isSafe, false);
			assert.strictEqual(result.riskLevel, "critical_danger");
			assert.ok(result.blockedPrescriptions.includes("Метронидазол 500 мг"));
			assert.ok(
				result.drugInteractions.some(
					(i) =>
						i.severity === "critical" &&
						i.effectDescriptionRu.includes("дисульфирамоподобный"),
				),
			);
		});
	});

	describe("15. Clarithromycin (CYP3A4 Inhibitor) vs DOACs (Xarelto)", () => {
		it("should detect CYP3A4 interaction between Clarithromycin and Rivaroxaban", () => {
			const result = auditClinicalDrugSafety({
				proposedMedications: ["Кларитромицин 500 мг (Клацид)"],
				existingMedications: ["Ксарелто 20 мг (Ривароксабан)"],
			});

			assert.strictEqual(result.hasSevereDdi, true);
			assert.ok(result.blockedPrescriptions.includes("Кларитромицин 500 мг (Клацид)"));
			assert.ok(
				result.drugInteractions.some(
					(i) =>
						i.severity === "high" &&
						i.effectDescriptionRu.includes("CYP3A4"),
				),
			);
		});
	});
});
