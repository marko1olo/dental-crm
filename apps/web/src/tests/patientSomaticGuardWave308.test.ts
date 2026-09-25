/**
 * apps/web/src/tests/patientSomaticGuardWave308.test.ts
 *
 * Comprehensive Test Suite for Mandates 8l / 8e / 8i / 8k:
 * Patient Allergo-Somatic Guard & Chairside Emergency Protocol Inquisitor.
 *
 * CONSTITUTIONAL MANDATES VALIDATED:
 * - Mandate 8e: Doctor Autonomy (Zero disabled buttons due to somatic fields,
 *   1-click physiological norm by default, doctor edits pathology only).
 * - Mandate 8i: Ambulatory Dental Context (Direct chairside risks: anesthetics,
 *   pacemaker -> ultrasound/coagulation ban, pregnancy trimesters, asthma, epilepsy; zero hospital bloat).
 * - Mandate 8k: Friction-Killer Law (CRM != Reality Simulator, 0-click emergency protocol bridge
 *   per Order MZ RF 786n / 1144n with instant adrenaline 0.1% & prednisolone dosage calculations).
 * - Mandate 8d item 7: Medical Record Sanctity (Zero cartoon emojis in clinical badges/forms).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import {
	CANONICAL_FORM043_SOMATIC_NORM,
	CANONICAL_SOMATIC_HEALTHY_NORM_TEXT,
	CANONICAL_SOMATIC_NORM_SHORT,
	CANONICAL_SOMATIC_NORM_BADGE,
	extractDentalContraindicationBadges,
	getPatientSomaticGuardStatus,
	isNegativeAllergyStatement,
	isSomaticTextPhysiologicalNorm,
} from "../utils/somaticNorm";
import {
	calculateAllEmergencyDosages,
	calculateLipidRescueDoses,
	generateEmergencyIncidentAct,
	generateSmpDispatchCheatSheet,
} from "../components/emergency/emergencyRescueEngine";

// Cartoon emoji regex per Mandate 8d item 7
const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

function hasCartoonEmojis(text: string): boolean {
	return CARTOON_EMOJI_REGEX.test(text);
}

describe("Wave 308: Patient Allergo-Somatic Guard & Emergency Rescue Inquisitor", () => {
	describe("1. Allergo-Somatic Alert Shield: Critical Red & Warning Yellow Badges", () => {
		it("extracts Red Critical Badge for Articaine + Novocaine with anesthetic ban formula", () => {
			const status = getPatientSomaticGuardStatus({
				hasArticaineAllergy: true,
				hasNovocaineAllergy: true,
			});

			assert.strictEqual(status.isHealthyNorm, false);
			assert.strictEqual(status.criticalBadges.length, 1);
			const allergyBadge = status.criticalBadges[0];
			assert.ok(allergyBadge);
			assert.strictEqual(allergyBadge.severity, "critical");
			assert.strictEqual(allergyBadge.id, "allergy");
			assert.strictEqual(allergyBadge.testId, "visit-focus-allergy-alert");
			assert.strictEqual(
				allergyBadge.fullLabel,
				"АЛЛЕРГИЯ: Артикаин / Новокаин — запрет анестетика!",
			);
			assert.strictEqual(hasCartoonEmojis(allergyBadge.fullLabel), false);
		});

		it("extracts Red Critical Badge for custom allergy string (Articaine / Novocaine)", () => {
			const status = getPatientSomaticGuardStatus(null, "Артикаин / Новокаин");

			assert.strictEqual(status.isHealthyNorm, false);
			assert.strictEqual(status.criticalBadges.length, 1);
			const badge = status.criticalBadges[0];
			assert.ok(badge);
			assert.strictEqual(badge.severity, "critical");
			assert.strictEqual(
				badge.fullLabel,
				"АЛЛЕРГИЯ: Артикаин / Новокаин — запрет анестетика!",
			);
		});

		it("extracts Red Critical Badge for Lidocaine and Penicillins and Sulfites", () => {
			const status = getPatientSomaticGuardStatus({
				hasLidocaineAllergy: true,
				hasPenicillinAllergy: true,
				hasSulfitesAllergy: true,
			});

			assert.strictEqual(status.isHealthyNorm, false);
			assert.strictEqual(status.criticalBadges.length, 1);
			const badge = status.criticalBadges[0];
			assert.ok(badge);
			assert.strictEqual(badge.severity, "critical");
			assert.ok(badge.fullLabel.includes("Лидокаин"));
			assert.ok(badge.fullLabel.includes("Пенициллины"));
			assert.ok(badge.fullLabel.includes("Сульфиты"));
			assert.ok(badge.fullLabel.includes("запрет анестетика!"));
		});

		it("extracts Yellow Warning Badge for Pacemaker with ultrasound & electrosurgery ban", () => {
			const status = getPatientSomaticGuardStatus({
				hasPacemakerExs: true,
			});

			assert.strictEqual(status.isHealthyNorm, false);
			assert.strictEqual(status.warningBadges.length, 1);
			const pBadge = status.warningBadges[0];
			assert.ok(pBadge);
			assert.strictEqual(pBadge.id, "pacemaker");
			assert.strictEqual(pBadge.testId, "visit-focus-pacemaker-alert");
			assert.strictEqual(pBadge.severity, "warning");
			assert.strictEqual(pBadge.shortLabel, "ЭКС");
			assert.ok(pBadge.fullLabel.includes("ЗАПРЕТ УЗ-скейлера и электрокоагулятора!"));
			assert.ok(pBadge.title.includes("абсолютный запрет УЗ-скейлинга"));
		});

		it("extracts Yellow Warning Badge for Pregnancy (I, II, III trimesters)", () => {
			const statusT1 = getPatientSomaticGuardStatus({
				pregnancyTrimester: "trimester_1",
			});
			assert.strictEqual(statusT1.warningBadges.length, 1);
			const b1 = statusT1.warningBadges[0];
			assert.ok(b1);
			assert.strictEqual(b1.severity, "warning");
			assert.ok(b1.fullLabel.includes("I триместр (1 ТРИМ.)"));
			assert.ok(b1.fullLabel.includes("ограничение адреналина и рентгена"));

			const statusT2 = getPatientSomaticGuardStatus({
				pregnancyTrimester: "trimester_2",
			});
			const b2 = statusT2.warningBadges[0];
			assert.ok(b2);
			assert.ok(b2.fullLabel.includes("II триместр (2 ТРИМ.)"));

			const statusT3 = getPatientSomaticGuardStatus({
				pregnancyTrimester: "trimester_3",
			});
			const b3 = statusT3.warningBadges[0];
			assert.ok(b3);
			assert.ok(b3.fullLabel.includes("III триместр (3 ТРИМ.)"));
		});

		it("extracts Yellow Warning Badge for Bronchial Asthma", () => {
			const status = getPatientSomaticGuardStatus({
				hasBronchialAsthma: true,
			});

			assert.strictEqual(status.warningBadges.length, 1);
			const aBadge = status.warningBadges[0];
			assert.ok(aBadge);
			assert.strictEqual(aBadge.id, "asthma");
			assert.strictEqual(aBadge.testId, "visit-focus-asthma-alert");
			assert.strictEqual(aBadge.severity, "warning");
			assert.strictEqual(aBadge.shortLabel, "АСТМА");
			assert.strictEqual(
				aBadge.fullLabel,
				"Бронхиальная астма: риск бронхоспазма, ингалятор наготове",
			);
		});

		it("extracts Yellow Warning Badge for Epilepsy", () => {
			const status = getPatientSomaticGuardStatus({
				hasEpilepsy: true,
			});

			assert.strictEqual(status.warningBadges.length, 1);
			const eBadge = status.warningBadges[0];
			assert.ok(eBadge);
			assert.strictEqual(eBadge.id, "epilepsy");
			assert.strictEqual(eBadge.testId, "visit-focus-epilepsy-alert");
			assert.strictEqual(eBadge.severity, "warning");
			assert.strictEqual(eBadge.shortLabel, "ЭПИЛЕПСИЯ");
			assert.strictEqual(
				eBadge.fullLabel,
				"Эпилепсия: противосудорожная готовность, защита от световых триггеров",
			);
		});

		it("renders Green Succinct Badge for Healthy Norm without visual noise", () => {
			const statusClean = getPatientSomaticGuardStatus({});
			assert.strictEqual(statusClean.isHealthyNorm, true);
			assert.strictEqual(statusClean.badges.length, 0);
			assert.ok(statusClean.normBadge);
			assert.strictEqual(statusClean.normBadge.severity, "healthy");
			assert.strictEqual(
				statusClean.normBadge.fullLabel,
				CANONICAL_SOMATIC_NORM_SHORT,
			);
			assert.strictEqual(
				statusClean.normBadge.testId,
				"visit-somatic-norm-badge",
			);

			const statusWithNegatives = getPatientSomaticGuardStatus(
				{ customAllergyNotes: "аллергоанамнез не отягощен" },
				"нет",
			);
			assert.strictEqual(statusWithNegatives.isHealthyNorm, true);
			assert.strictEqual(statusWithNegatives.badges.length, 0);
		});
	});

	describe("2. 0-Click Emergency Rescue Protocol Bridge (Order MZ RF 786n / 1144n)", () => {
		it("calculates exact weight-adjusted Adrenaline 0.1% and Prednisolone for adult 75 kg", () => {
			const dosages = calculateAllEmergencyDosages(75, 42);

			// Adrenaline 0.1% 1st line: 0.5 ml (0.5 mg)
			assert.strictEqual(dosages.adrenaline_epi_01.calculatedVolumeMl, 0.5);
			assert.strictEqual(dosages.adrenaline_epi_01.calculatedDoseMg, 0.5);

			// Prednisolone 2nd line: 120 mg (4.0 ml / 4 ampoules for safeWeight <= 90)
			assert.strictEqual(dosages.prednisolone_30mg.calculatedDoseMg, 120);
			assert.strictEqual(dosages.prednisolone_30mg.calculatedVolumeMl, 4.0);
			assert.strictEqual(dosages.prednisolone_30mg.numberOfAmpoules, 4);
		});

		it("calculates pediatric weight-adjusted Adrenaline 0.1% and Prednisolone for child 20 kg", () => {
			const dosages = calculateAllEmergencyDosages(20, 6);

			// Adrenaline pediatric (0.15 ml / 0.15 mg for weight < 25 kg)
			assert.strictEqual(dosages.adrenaline_epi_01.calculatedVolumeMl, 0.15);
			assert.strictEqual(dosages.adrenaline_epi_01.calculatedDoseMg, 0.15);

			// Prednisolone pediatric (2.5 mg/kg): 20 * 2.5 = 50 mg = 1.7 ml
			assert.strictEqual(dosages.prednisolone_30mg.calculatedDoseMg, 50);
			assert.strictEqual(dosages.prednisolone_30mg.calculatedVolumeMl, 1.7);
		});

		it("calculates Lipid Rescue Intralipid 20% bolus and infusion for LAST toxicity", () => {
			const lipid = calculateLipidRescueDoses(70);
			assert.strictEqual(lipid.bolusVolumeMl, 105); // 70 * 1.5 = 105 ml
			assert.strictEqual(lipid.infusionRateMlPerHour, 1050); // 70 * 15 = 1050 ml/h
			assert.strictEqual(lipid.maxTotalDoseMl, 840); // 70 * 12 = 840 ml
		});

		it("generates statutory Incident Act referencing Order MZ RF standards and Form 043/u", () => {
			const act = generateEmergencyIncidentAct({
				clinicName: "Клиника ДЕНТЕ",
				clinicAddress: "ул. Клиническая 10",
				cabinetNumber: "1",
				doctorFullName: "Иванов И.И.",
				assistantFullName: "Петрова А.С.",
				patientFullName: "Сидоров С.С.",
				patientAgeYears: 42,
				patientWeightKg: 75,
				patientGender: "male",
				medCardNumber: "043-1234",
				scenarioId: "anaphylactic_shock",
				incidentStartTime: new Date("2026-09-24T12:00:00Z"),
				initialVitals: {
					bpSystolic: 70,
					bpDiastolic: 40,
					hr: 125,
					spo2: 89,
					rr: 26,
					consciousnessRu: "Спутанное",
				},
				finalVitals: {
					bpSystolic: 115,
					bpDiastolic: 75,
					hr: 82,
					spo2: 98,
					rr: 16,
					consciousnessRu: "Ясное",
				},
				completedSteps: [
					{
						stepId: "step_stop_allergen",
						stepTitleRu: "Немедленно прекратить введение аллергена",
						timestamp: "12:01",
					},
					{
						stepId: "step_adrenaline",
						stepTitleRu: "Ввести Адреналин 0.1% в/м",
						timestamp: "12:02",
						administeredMedicationRu: "Адреналин 0.1%",
						doseDetailsRu: "0.5 мл в/м",
					},
				],
				patientOutcomeRu: "Гемодинамика стабилизирована",
				handoverNotesRu: "Бригада СМП уведомлена",
			});

			assert.ok(act.includes("АКТ ОКАЗАНИЯ ЭКСТРЕННОЙ МЕДИЦИНСКОЙ ПОМОЩИ"));
			assert.ok(act.includes("Вкладыш в медицинскую карту стоматологического пациента 043/у"));
			assert.ok(act.includes("Анафилактический шок"));
			assert.ok(act.includes("Адреналин 0.1%"));
			assert.ok(act.includes("Сидоров С.С."));
			assert.strictEqual(hasCartoonEmojis(act), false);
		});

		it("generates SMP 112 dispatch cheat sheet for immediate verbal handover", () => {
			const cheatSheet = generateSmpDispatchCheatSheet({
				clinicName: "ДЕНТЕ",
				clinicAddress: "ул. Ленина 5",
				cabinetNumber: "3",
				doctorFullName: "Доктор",
				assistantFullName: "Медсестра",
				patientFullName: "Пациент",
				patientAgeYears: 35,
				patientWeightKg: 70,
				patientGender: "female",
				medCardNumber: "043",
				scenarioId: "anaphylactic_shock",
				incidentStartTime: new Date(),
				initialVitals: { bpSystolic: 80, bpDiastolic: 50, hr: 110, spo2: 92, rr: 22, consciousnessRu: "Заторможен" },
				finalVitals: { bpSystolic: 110, bpDiastolic: 70, hr: 80, spo2: 97, rr: 16, consciousnessRu: "Ясное" },
				completedSteps: [],
				patientOutcomeRu: "Стабилизирован",
				handoverNotesRu: "Ожидаем СМП",
			});

			assert.ok(cheatSheet.includes("ТЕКСТ ДЛЯ ДИСПЕТЧЕРА СКОРОЙ ПОМОЩИ"));
			assert.ok(cheatSheet.includes("103 / 112"));
			assert.ok(cheatSheet.includes("ул. Ленина 5"));
		});
	});

	describe("3. Doctor Autonomy & 1-Click Physiological Norm (Mandates 8e, 8k)", () => {
		it("provides full 1-click Form 043/u somatic norm preset", () => {
			assert.ok(CANONICAL_FORM043_SOMATIC_NORM.allergologicalHistory.includes("не отягощен"));
			assert.ok(CANONICAL_FORM043_SOMATIC_NORM.concomitantDiseases.includes("Соматически здоров"));
			assert.ok(CANONICAL_FORM043_SOMATIC_NORM.currentMedications.includes("отрицает"));
			assert.strictEqual(CANONICAL_FORM043_SOMATIC_NORM.pregnancyLactationStatus, "Нет");
		});

		it("isSomaticTextPhysiologicalNorm detects norm and rejects active pathologies", () => {
			assert.strictEqual(isSomaticTextPhysiologicalNorm(null), true);
			assert.strictEqual(isSomaticTextPhysiologicalNorm(""), true);
			assert.strictEqual(isSomaticTextPhysiologicalNorm(CANONICAL_SOMATIC_HEALTHY_NORM_TEXT), true);

			assert.strictEqual(
				isSomaticTextPhysiologicalNorm("Соматически здоров, но аллергия на новокаин"),
				false,
			);
			assert.strictEqual(
				isSomaticTextPhysiologicalNorm("Пациент с кардиостимулятором"),
				false,
			);
			assert.strictEqual(
				isSomaticTextPhysiologicalNorm("Принимает антикоагулянты (варфарин)"),
				false,
			);
		});
	});

	describe("4. Codebase & Component Source Verification (Mandates 8e, 8i, 8k)", () => {
		it("verifies SomaticSafetyAlertWidget.tsx exists and implements all shield requirements", () => {
			const widgetPath = path.resolve(
				__dirname,
				"../components/clinical/SomaticSafetyAlertWidget.tsx",
			);
			assert.ok(fs.existsSync(widgetPath), "SomaticSafetyAlertWidget.tsx must physically exist");

			const content = fs.readFileSync(widgetPath, "utf8");
			assert.ok(
				content.includes('data-testid="somatic-safety-alert-badge"'),
				"Widget must contain data-testid somatic-safety-alert-badge",
			);
			assert.ok(
				content.includes('data-testid="btn-somatic-norm-one-click"'),
				"Widget must contain 1-click norm button btn-somatic-norm-one-click",
			);
			assert.ok(
				content.includes('from "@dental/shared"'),
				"Widget must import strictly from @dental/shared per Mandate 8s",
			);
			assert.strictEqual(
				hasCartoonEmojis(content),
				false,
				"SomaticSafetyAlertWidget.tsx must contain 0 cartoon emojis",
			);
		});

		it("verifies VisitEmkTab.tsx exists and contains save/complete buttons with zero disabled buttons", () => {
			const emkTabPath = path.resolve(
				__dirname,
				"../components/visit/VisitEmkTab.tsx",
			);
			assert.ok(fs.existsSync(emkTabPath), "VisitEmkTab.tsx must physically exist");

			const content = fs.readFileSync(emkTabPath, "utf8");
			assert.ok(
				content.includes('data-testid="btn-save-visit-note"'),
				"VisitEmkTab must have btn-save-visit-note",
			);
			assert.ok(
				content.includes('data-testid="btn-complete-visit-emk"'),
				"VisitEmkTab must have btn-complete-visit-emk",
			);

			// Check Doctor Autonomy: Save and Complete buttons must NOT have disabled={true} due to somatic fields
			assert.ok(
				!content.includes('data-testid="btn-save-visit-note" disabled'),
				"Save visit note button must not be disabled by somatic inputs",
			);
			assert.ok(
				!content.includes('data-testid="btn-complete-visit-emk" disabled'),
				"Complete visit button must not be disabled by somatic inputs",
			);
			assert.strictEqual(
				hasCartoonEmojis(content),
				false,
				"VisitEmkTab.tsx must contain 0 cartoon emojis",
			);
		});

		it("verifies EmergencyRescueModal.tsx exists and provides statutory adrenaline and metronome tools", () => {
			const modalPath = path.resolve(
				__dirname,
				"../components/emergency/EmergencyRescueModal.tsx",
			);
			assert.ok(fs.existsSync(modalPath), "EmergencyRescueModal.tsx must physically exist");

			const content = fs.readFileSync(modalPath, "utf8");
			assert.ok(
				content.includes("EmergencyRescueModal"),
				"EmergencyRescueModal must export EmergencyRescueModal component",
			);
			assert.ok(
				content.includes("calculateAllEmergencyDosages"),
				"EmergencyRescueModal must calculate real-time emergency dosages",
			);
			assert.ok(
				content.includes("ТАЙМЕР ПОВТОРНОГО ВВЕДЕНИЯ АДРЕНАЛИНА"),
				"EmergencyRescueModal must provide adrenaline timer",
			);
			assert.ok(
				content.includes("УКЛАДКА ЭКСТРЕННОЙ ПОМОЩИ (ПРИКАЗ МЗ РФ № 786н / 1144н)"),
				"EmergencyRescueModal must provide statutory kit memo",
			);
			assert.strictEqual(
				hasCartoonEmojis(content),
				false,
				"EmergencyRescueModal.tsx must contain 0 cartoon emojis",
			);
		});
	});
});
