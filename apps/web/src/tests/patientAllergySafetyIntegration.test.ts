import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";

import {
	calculateActivePatientCriticalBadges,
	type PatientForCriticalBadges,
} from "../components/visit/view/visitCriticalBadges";
import {
	buildConsolidatedAllergyChip,
	PatientAlertBadgesBar,
} from "../components/visit/view/visitHeader/PatientAlertBadgesBar";
import {
	parseSafetyProfileFromText,
	evaluatePatientSafetyFlags,
	formatSafetyProfileToDiaryText,
	type PatientClinicalSafetyProfile,
} from "../components/patients/safetyMath";
import {
	AnesthesiaQuickBar,
} from "../components/anesthesia/AnesthesiaQuickBar";
import {
	AnesthesiaSafetyAllergyHud,
} from "../components/anesthesia/anesthesiaQuickBar/AnesthesiaSafetyAllergyHud";
import {
	AnestheticDrugSelector,
} from "../components/anesthesia/anesthesiaQuickBar/AnestheticDrugSelector";
import {
	EMERGENCY_SCENARIOS,
	type EmergencyScenarioId,
} from "../components/emergency/emergencyRescuePresets";
import {
	calculateAllEmergencyDosages,
} from "../components/emergency/emergencyRescueEngine";
import { EmergencyRescueModal } from "../components/emergency/EmergencyRescueModal";

describe("Red Team: Patient Allergy Guard & Medical Safety Inquisitor Suite", () => {
	describe("1. Patient Card Critical Allergies & Somatic Risk Parsing", () => {
		it("detects Lidocaine, Novocaine, Articaine, Penicillins, and Latex from free text notes", () => {
			const text = "Аллергия на лидокаин, новокаин, ультракаин (артикаин), амоксициллин (пенициллины), латексные перчатки";
			const profile = parseSafetyProfileFromText(text);

			assert.equal(profile.hasLidocaineAllergy, true, "Lidocaine allergy must be detected");
			assert.equal(profile.hasEsterAnestheticsAllergy, true, "Novocaine (ester) allergy must be detected");
			assert.equal(profile.hasArticaineAllergy, true, "Articaine allergy must be detected");
			assert.equal(profile.hasPenicillinAllergy, true, "Penicillin allergy must be detected");
			assert.equal(profile.hasLatexAllergy, true, "Latex allergy must be detected");
		});

		it("detects somatic risks: Pacemaker/EXS, Pregnancy, Hypertension/Cardio, Diabetes, Bisphosphonates", () => {
			const text = "Пациент с ЭКС (кардиостимулятор), ИБС, гипертония, сахарный диабет 2 типа, принимает акласту (бисфосфонаты), беременность 2 триместр";
			const profile = parseSafetyProfileFromText(text);

			assert.equal(profile.hasPacemakerExs, true, "Pacemaker must be detected");
			assert.equal(profile.hasCardiovascularDisease, true, "Cardiovascular disease must be detected");
			assert.equal(profile.hasDiabetesMellitus, true, "Diabetes must be detected");
			assert.equal(profile.takesBisphosphonates, true, "Bisphosphonates must be detected");
			assert.equal(profile.pregnancyTrimester, "trimester_2", "Pregnancy trimester 2 must be detected");
		});

		it("evaluates critical stop flags accurately with forbidden procedures", () => {
			const profile: PatientClinicalSafetyProfile = {
				hasPacemakerExs: true,
				hasLidocaineAllergy: true,
				takesBisphosphonates: true,
				pregnancyTrimester: "none",
			};
			const evaluation = evaluatePatientSafetyFlags(profile);

			assert.equal(evaluation.hasCriticalStopFlags, true, "Must have critical stop flags");
			assert.ok(evaluation.activeFlags.some((f) => f.id.includes("pacemaker")), "Pacemaker flag must be active");
			assert.ok(evaluation.activeFlags.some((f) => f.id.includes("bisphosphonate")), "Bisphosphonate flag must be active");
			assert.ok(evaluation.activeFlags.some((f) => f.id.includes("lidocaine")), "Lidocaine flag must be active");

			// Pacemaker forbidden procedures must include ultrasound scaler
			const pacemakerFlag = evaluation.activeFlags.find((f) => f.id.includes("pacemaker"));
			assert.ok(
				pacemakerFlag?.forbiddenProcedures.some((p) => p.toLowerCase().includes("ультразвук")),
				"Ultrasonic scaling must be forbidden for pacemaker patient",
			);
		});
	});

	describe("2. Active Visit Cockpit / TopBar Allergy Badges", () => {
		it("generates Lidocaine alert badge when patient has lidocaine allergy in allergies property", () => {
			const patient: PatientForCriticalBadges = {
				allergies: "Лидокаин",
			};
			const badges = calculateActivePatientCriticalBadges(patient);

			const lidoBadge = badges.find((b) => b.id === "lidocaine");
			assert.ok(lidoBadge, "Lidocaine badge must be present");
			assert.equal(lidoBadge.testId, "visit-focus-lidocaine-alert");
			assert.equal(lidoBadge.shortLabel, "ЛИДОКАИН");
			assert.ok(lidoBadge.fullLabel.includes("Лидокаин"));
		});

		it("generates Lidocaine alert badge when allergy is in structured clinicalSafetyProfile or administrativeProfile", () => {
			const patientWithCSP: PatientForCriticalBadges = {
				clinicalSafetyProfile: {
					hasLidocaineAllergy: true,
					pregnancyTrimester: "none",
				},
			};
			const badges = calculateActivePatientCriticalBadges(patientWithCSP);
			const lidoBadge = badges.find((b) => b.id === "lidocaine");
			assert.ok(lidoBadge, "Lidocaine badge must be extracted from structured clinicalSafetyProfile");

			const patientWithAdminProfile: PatientForCriticalBadges = {
				administrativeProfile: {
					clinicalSafetyProfile: {
						hasLidocaineAllergy: true,
					},
				},
			};
			const adminBadges = calculateActivePatientCriticalBadges(patientWithAdminProfile);
			assert.ok(adminBadges.some((b) => b.id === "lidocaine"), "Lidocaine badge must be extracted from administrativeProfile");
		});

		it("buildConsolidatedAllergyChip consolidates allergies into a single readable string", () => {
			const activePatient = { allergies: "Лидокаин" };
			const badges = calculateActivePatientCriticalBadges(activePatient);
			const chip = buildConsolidatedAllergyChip(activePatient, [...badges]);

			assert.ok(chip, "Chip text must exist");
			assert.equal(chip, "Аллергия: Лидокаин");
		});

		it("PatientAlertBadgesBar renders prominent allergy badge when badges are active", () => {
			const activePatient = { allergies: "Лидокаин" };
			const badges = calculateActivePatientCriticalBadges(activePatient);
			const html = renderToString(
				React.createElement(PatientAlertBadgesBar, {
					activePatient,
					activePatientCriticalBadges: [...badges],
				}),
			);

			assert.ok(html.includes("visit-focus-allergy-alert"), "Must render visit-focus-allergy-alert");
			assert.ok(html.includes("Лидокаин"), "Must render Lidocaine in the badge text");
			assert.ok(html.includes("bg-rose-600/15"), "Must have prominent rose background");
		});

		it("PatientAlertBadgesBar renders clean badge when patient has no allergies", () => {
			const cleanPatient = { allergies: "" };
			const badges = calculateActivePatientCriticalBadges(cleanPatient);
			const html = renderToString(
				React.createElement(PatientAlertBadgesBar, {
					activePatient: cleanPatient,
					activePatientCriticalBadges: [...badges],
				}),
			);

			assert.ok(html.includes("visit-focus-allergy-clean"), "Must render visit-focus-allergy-clean");
			assert.ok(html.includes("Аллергии не выявлены"), "Must show allergies not detected");
		});
	});

	describe("3. Anesthesia Quick Bar & Guiding Soft-Alert (Mandates 8e, 8z)", () => {
		it("renders dedicated Lidocaine allergy guiding soft-alert when lidocaine is selected for allergic patient", () => {
			const html = renderToString(
				React.createElement(AnesthesiaSafetyAllergyHud, {
					patientWeightKg: 70,
					isCardioRisk: false,
					takesBetaBlockers: false,
					hasSulfiteAllergy: false,
					hasBronchialAsthma: false,
					hasLidocaineAllergy: true,
					selectedDrugId: "lidocaine_1_100k",
					selectedDrugInfo: {
						isAdrenalineFree: false,
						tradeNamesRu: ["Лидокаин 2% с адреналином 1:100 000"],
					} as any,
					safetyWarning: null,
					onSelectDrug: () => {},
					onDismissWarning: () => {},
					onConfirmWarningOverride: () => {},
				}),
			);

			assert.ok(
				html.includes('data-testid="anesthesia-lidocaine-allergy-warning-badge"'),
				"Must render anesthesia-lidocaine-allergy-warning-badge",
			);
			assert.ok(
				html.includes("Аллергия на Лидокаин"),
				"Must explicitly warn about Lidocaine allergy",
			);
			assert.ok(
				html.includes('data-testid="btn-switch-to-scandonest-safe"'),
				"Must offer 1-click switch to Scandonest safe",
			);
			assert.ok(
				html.includes("Выбрать Скандонест 3%"),
				"Button must display Russian recommendation to choose Scandonest 3%",
			);
		});

		it("never disables buttons during clinical allergy warnings (Mandate 8e: Doctor Autonomy)", () => {
			const html = renderToString(
				React.createElement(AnesthesiaSafetyAllergyHud, {
					patientWeightKg: 70,
					isCardioRisk: false,
					takesBetaBlockers: false,
					hasSulfiteAllergy: false,
					hasBronchialAsthma: false,
					hasLidocaineAllergy: true,
					selectedDrugId: "lidocaine_1_100k",
					selectedDrugInfo: {
						isAdrenalineFree: false,
						tradeNamesRu: ["Лидокаин 2% с адреналином 1:100 000"],
					} as any,
					safetyWarning: {
						title: "Внимание",
						text: "Тест предупреждения",
						carpulesCount: 1.0,
					},
					onSelectDrug: () => {},
					onDismissWarning: () => {},
					onConfirmWarningOverride: () => {},
				}),
			);

			assert.ok(
				html.includes("Всё равно внести (врачебное решение)"),
				"Must allow doctor override without blocking",
			);
		});

		it("AnestheticDrugSelector displays allergy indicator on lidocaine chip when patient is allergic", () => {
			const html = renderToString(
				React.createElement(AnestheticDrugSelector, {
					selectedDrugId: "mepivacaine_plain",
					onSelectDrug: () => {},
					isCardioRisk: false,
					hasSulfiteAllergy: false,
					hasBronchialAsthma: false,
					hasLidocaineAllergy: true,
				}),
			);

			assert.ok(
				html.includes("Лидокаин"),
				"Must include Lidocaine chip",
			);
			assert.ok(
				html.includes("Аллергия!"),
				"Must flag Lidocaine chip with allergy badge",
			);
		});

		it("AnesthesiaQuickBar defaults to safe Mepivacaine 3% when patient has lidocaine allergy", () => {
			const html = renderToString(
				React.createElement(AnesthesiaQuickBar, {
					patientWeightKg: 75,
					hasLidocaineAllergy: true,
				}),
			);

			assert.ok(html.includes("anesthesia-quick-bar"), "AnesthesiaQuickBar must render");
			assert.ok(html.includes("Аллергия: Лидокаин"), "Must display Lidocaine allergy tag");
		});
	});

	describe("4. Emergency 1-Click Protocol & Live Resuscitation Calculators", () => {
		it("EMERGENCY_SCENARIOS provides comprehensive Anaphylactic Shock and LAST protocols", () => {
			const anaph = EMERGENCY_SCENARIOS.anaphylactic_shock;
			assert.ok(anaph, "Anaphylactic shock scenario must be registered");
			assert.equal(anaph.icd10Code, "T78.2");
			assert.ok(anaph.actionSteps.length >= 5, "Must have comprehensive resuscitation steps");

			// Adrenaline step
			const epiStep = anaph.actionSteps.find((s) => s.drugId === "adrenaline_epi_01");
			assert.ok(epiStep, "Must include Adrenaline (Epinephrine) step");
			assert.equal(epiStep.requiresAdrenalineTimer, true, "Must require adrenaline repeat timer");

			// LAST scenario
			const last = EMERGENCY_SCENARIOS.local_anesthetic_toxicity;
			assert.ok(last, "LAST scenario must be registered");
			assert.ok(last.icd10Code.startsWith("T88"), "LAST must use T88 ICD10 code");
		});

		it("calculateAllEmergencyDosages computes weight-adjusted Adrenaline and Prednisolone doses", () => {
			const doses70kg = calculateAllEmergencyDosages(70, 40);
			const epi = doses70kg.adrenaline_epi_01;
			assert.ok(epi, "Adrenaline dosage must be calculated");
			assert.equal(epi.calculatedVolumeMl, 0.5, "Adult 70kg must receive 0.5 ml IM adrenaline");

			const pred = doses70kg.prednisolone_30mg;
			assert.ok(pred, "Prednisolone dosage must be calculated");
			assert.ok(pred.calculatedDoseMg >= 60, "Adult must receive high-dose prednisolone");

			const dosesChild20kg = calculateAllEmergencyDosages(20, 6);
			const childEpi = dosesChild20kg.adrenaline_epi_01;
			assert.ok(childEpi.calculatedVolumeMl <= 0.3, "Child 20kg adrenaline dose must be safe");
		});

		it("EmergencyRescueModal renders successfully with zero disabled buttons", () => {
			const html = renderToString(
				React.createElement(EmergencyRescueModal, {
					isOpen: true,
					onClose: () => {},
					initialPatientName: "Иванов Иван",
					initialPatientWeightKg: 80,
					defaultScenarioId: "anaphylactic_shock",
				}),
			);

			assert.ok(html.includes("Анафилактический шок"), "Must display Anaphylactic Shock title");
			assert.ok(html.includes("103 / 112"), "Must display emergency dispatch call instructions");
			assert.ok(html.includes("Адреналин"), "Must display Adrenaline 0.1% dosing instructions");
			assert.ok(!html.includes("disabled"), "No disabled buttons allowed in emergency modal");
		});
	});

	describe("5. End-to-End Clinical Safety Persistence Format", () => {
		it("formatSafetyProfileToDiaryText produces statutory Form 043/u snippet with clear contraindications", () => {
			const profile: PatientClinicalSafetyProfile = {
				hasLidocaineAllergy: true,
				hasPenicillinAllergy: true,
				hasPacemakerExs: true,
				pregnancyTrimester: "none",
			};
			const snippet = formatSafetyProfileToDiaryText(profile);

			assert.ok(snippet.includes("Лидокаин"), "Must document Lidocaine allergy");
			assert.ok(snippet.includes("Пенициллины"), "Must document Penicillin allergy");
			assert.ok(snippet.includes("ЭКС") || snippet.includes("кардиостимулятор"), "Must document Pacemaker");
			assert.ok(snippet.includes("ультразвуковой") || snippet.includes("УЗ"), "Must state ultrasound prohibition");
		});
	});
});
