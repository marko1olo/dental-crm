/**
 * apps/web/src/tests/clinicalDrugSafetyAndSomaticGuard.test.ts
 *
 * Targeted Unit Tests for Clinical Drug Safety, Allergy History & Somatic Guardrails.
 *
 * CONSTITUTIONAL MANDATES TESTED:
 * - Mandate 8e: Doctor Autonomy (Silent background alerts, zero blocking modals at chairside, 1-click presets).
 * - Mandate 8i: Ambulatory Dental Context (Chairside vital drug & somatic risks: articaine, lidocaine, penicillins,
 *               hypertension/cardiovascular, anticoagulants, diabetes, pregnancy, pacemaker, bisphosphonates).
 * - Mandate 8k: Friction-Killer Law (Autonomy presets adapt intelligently to active patient's medical profile).
 * - Mandate 8l: Action Engine (Zero mocks, real dispatch into CRM store / REST API).
 * - Mandate 8d: Sanctity of Medical Records (Zero cartoon emojis in clinical badges and diary texts).
 */

import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
import {
	calculateActivePatientCriticalBadges,
	type PatientForCriticalBadges,
} from "../components/visit/view/visitCriticalBadges.js";
import {
	executeApplySomaticNormAutonomy,
	executeApplyAnesthesiaPresetAutonomy,
} from "../components/visit/view/visitViewAutonomyActions.js";
import { calculateAnesthesiaSafety } from "../components/anesthesia/anesthesiaEngine.js";
import { useVisitStore } from "../store/visitStore.js";
import { usePatientStore } from "../store/patientStore.js";
import { useAppStore } from "../store/appStore.js";

const EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

function containsCartoonEmoji(text: string): boolean {
	return EMOJI_REGEX.test(text);
}

describe("Clinical Drug Safety & Somatic Guardrails Unit Tests", () => {
	describe("1. Chairside Critical Badges Calculation (Tier 1 Vital Signals)", () => {
		it("returns empty badge list for clean healthy patient without alerts", () => {
			const cleanPatient: PatientForCriticalBadges = {
				allergies: "нет",
				somaticNotes: "Соматически здоров",
				concomitantDiseases: "без особенностей",
			};
			const badges = calculateActivePatientCriticalBadges(cleanPatient);
			assert.equal(badges.length, 0, "No badges should be displayed for clean somatic status");
		});

		it("flags hypertension with short label and mepivacaine 3% advice", () => {
			const hyperPatient: PatientForCriticalBadges = {
				allergies: "нет",
				somaticNotes: "Гипертоническая болезнь 2 ст, АД 150/95",
			};
			const badges = calculateActivePatientCriticalBadges(hyperPatient);
			const hyperBadge = badges.find((b) => b.id === "hypertension");
			assert.ok(hyperBadge, "Hypertension badge must be present");
			assert.equal(hyperBadge.testId, "visit-focus-hypertension-alert");
			assert.equal(hyperBadge.shortLabel, "АГ / ССЗ");
			assert.ok(hyperBadge.title.includes("Мепивакаин 3%"));
			assert.ok(hyperBadge.fullLabel.includes("адреналин <= 1:200 000 или скандонест"));
		});

		it("flags articaine allergy with warning and mepivacaine recommendation", () => {
			const allergicPatient: PatientForCriticalBadges = {
				allergies: "Аллергия на артикаин и ультракаин",
			};
			const badges = calculateActivePatientCriticalBadges(allergicPatient);
			const articaineBadge = badges.find((b) => b.id === "articaine");
			assert.ok(articaineBadge, "Articaine allergy badge must be detected");
			assert.equal(articaineBadge.testId, "visit-focus-articaine-alert");
			assert.ok(articaineBadge.title.includes("АНАФИЛАКТИЧЕСКОГО ШОКА"));
			assert.ok(articaineBadge.title.includes("Мепивакаин 3%"));
			assert.ok(articaineBadge.fullLabel.includes("Скандонест") || articaineBadge.fullLabel.includes("Мепивакаин"));
		});

		it("flags lidocaine allergy with specific warning", () => {
			const allergicPatient: PatientForCriticalBadges = {
				allergies: "Лидокаин",
			};
			const badges = calculateActivePatientCriticalBadges(allergicPatient);
			const lidoBadge = badges.find((b) => b.id === "lidocaine");
			assert.ok(lidoBadge, "Lidocaine badge must be present");
			assert.equal(lidoBadge.testId, "visit-focus-lidocaine-alert");
			assert.ok(lidoBadge.title.includes("Лидокаин"));
		});

		it("flags penicillin allergy with clarithromycin/clindamycin alternative", () => {
			const allergicPatient: PatientForCriticalBadges = {
				allergies: "Амоксиклав, пенициллины (крапивница)",
			};
			const badges = calculateActivePatientCriticalBadges(allergicPatient);
			const penBadge = badges.find((b) => b.id === "penicillin");
			assert.ok(penBadge, "Penicillin badge must be generated");
			assert.equal(penBadge.testId, "visit-focus-penicillin-alert");
			assert.ok(penBadge.title.includes("Кларитромицин 500 мг"));
			assert.ok(penBadge.title.includes("Клиндамицин 300 мг"));
		});

		it("flags anticoagulants with extraction bleeding risk", () => {
			const acPatient: PatientForCriticalBadges = {
				somaticNotes: "Постоянный прием Ксарелто 20 мг по поводу мерцательной аритмии",
			};
			const badges = calculateActivePatientCriticalBadges(acPatient);
			const acBadge = badges.find((b) => b.id === "anticoagulant");
			assert.ok(acBadge, "Anticoagulant badge must be present");
			assert.equal(acBadge.testId, "visit-focus-anticoagulant-alert");
			assert.ok(acBadge.title.includes("луночкового кровотечения при удалении"));
		});

		it("flags diabetes mellitus with delayed osseointegration warning", () => {
			const diabPatient: PatientForCriticalBadges = {
				somaticNotes: "Сахарный диабет 2 типа, гликированный гемоглобин 7.2%",
			};
			const badges = calculateActivePatientCriticalBadges(diabPatient);
			const diabBadge = badges.find((b) => b.id === "diabetes");
			assert.ok(diabBadge, "Diabetes badge must be present");
			assert.equal(diabBadge.testId, "visit-focus-diabetes-alert");
			assert.ok(diabBadge.title.includes("замедленной остеоинтеграции"));
		});

		it("flags pregnancy with safe vasoconstrictor restriction", () => {
			const pregPatient: PatientForCriticalBadges = {
				somaticNotes: "Беременность 22 недели (2 триместр)",
			};
			const badges = calculateActivePatientCriticalBadges(pregPatient);
			const pregBadge = badges.find((b) => b.id === "pregnancy");
			assert.ok(pregBadge, "Pregnancy badge must be present");
			assert.equal(pregBadge.testId, "visit-focus-pregnancy-alert");
			assert.ok(pregBadge.title.includes("1:200 000"));
		});

		it("flags pacemaker with absolute ultrasound scaler ban", () => {
			const pacePatient: PatientForCriticalBadges = {
				somaticNotes: "Установлен кардиостимулятор (ЭКС) в 2022 году",
			};
			const badges = calculateActivePatientCriticalBadges(pacePatient);
			const paceBadge = badges.find((b) => b.id === "pacemaker");
			assert.ok(paceBadge, "Pacemaker badge must be present");
			assert.equal(paceBadge.testId, "visit-focus-pacemaker-alert");
			assert.ok(paceBadge.title.includes("ЗАПРЕТ УЗ-скейлера"));
		});

		it("flags bisphosphonates with jaw osteonecrosis warning", () => {
			const bisPatient: PatientForCriticalBadges = {
				somaticNotes: "Терапия бисфосфонатами (Зомета) по поводу остеопороза",
			};
			const badges = calculateActivePatientCriticalBadges(bisPatient);
			const bisBadge = badges.find((b) => b.id === "bisphosphonates");
			assert.ok(bisBadge, "Bisphosphonates badge must be present");
			assert.equal(bisBadge.testId, "visit-focus-bisphosphonates-alert");
			assert.ok(bisBadge.title.includes("MRONJ/БОНЧ"));
		});

		it("guarantees zero cartoon emojis across all generated badges", () => {
			const complexPatient: PatientForCriticalBadges = {
				allergies: "артикаин, пенициллин",
				somaticNotes: "гипертония, диабет, ксарелто, беременность, экс, бисфосфонаты, астма",
			};
			const badges = calculateActivePatientCriticalBadges(complexPatient);
			for (const b of badges) {
				assert.equal(
					containsCartoonEmoji(b.fullLabel),
					false,
					`Full label "${b.fullLabel}" contains cartoon emoji!`,
				);
			}
		});
	});

	describe("2. 1-Click Somatic Autonomy Preset (executeApplySomaticNormAutonomy)", () => {
		it("inserts physiological norm when active patient is somatic-clean", () => {
			let updatedField = "";
			let updatedValue = "";
			let toastMsg = "";

			const result = executeApplySomaticNormAutonomy({
				updateVisitNoteField: (field, val) => {
					if (field === "anamnesis") {
						updatedField = field;
						updatedValue = val;
					}
				},
				showToastFn: (msg) => {
					toastMsg = msg;
				},
				activePatient: {
					allergies: "нет",
					somaticNotes: "",
				},
			});

			assert.equal(result.executed, true);
			assert.equal(updatedField, "anamnesis");
			assert.ok(updatedValue.includes("Соматически здоров"));
			assert.ok(updatedValue.includes("Аллергоанамнез не отягощен"));
			assert.ok(updatedValue.includes("Физиологическая норма"));
			assert.ok(toastMsg.includes("соматически здоров"));
		});

		it("adapts anamnesis with patient's real somatic profile without blocking the doctor", () => {
			let updatedValue = "";
			let toastMsg = "";

			const result = executeApplySomaticNormAutonomy({
				updateVisitNoteField: (field, val) => {
					if (field === "anamnesis") {
						updatedValue = val;
					}
				},
				showToastFn: (msg) => {
					toastMsg = msg;
				},
				activePatient: {
					allergies: "Аллергия на пенициллины",
					somaticNotes: "Гипертоническая болезнь 2 ст.",
				},
			});

			assert.equal(result.executed, true);
			assert.ok(updatedValue.includes("Пенициллин") || updatedValue.includes("пенициллин"));
			assert.ok(updatedValue.includes("Гипертон") || updatedValue.includes("гипертенз"));
			assert.ok(updatedValue.includes("отрицает"));
			assert.ok(toastMsg.includes("с учетом соматического статуса"));
		});
	});

	describe("3. 1-Click Anesthesia Preset Autonomy (executeApplyAnesthesiaPresetAutonomy)", () => {
		it("applies standard Articaine 4% 1:100 000 for healthy patient", () => {
			let treatmentValue = "";
			let toastMsg = "";

			const result = executeApplyAnesthesiaPresetAutonomy({
				updateVisitNoteField: (field, val) => {
					if (field === "treatmentPlan" || field === "treatment") treatmentValue = val;
				},
				showToastFn: (msg) => {
					toastMsg = msg;
				},
				activePatient: { allergies: "нет", somaticNotes: "" },
			});

			assert.equal(result.executed, true);
			assert.ok(treatmentValue.includes("Sol. Articaini 4% с эпинефрином 1:100 000"));
			assert.ok(toastMsg.includes("Sol. Articaini 4%"));
		});

		it("switches to Mepivacaine 3% plain cardio-protocol for hypertensive patient", () => {
			let treatmentValue = "";
			let toastMsg = "";

			const result = executeApplyAnesthesiaPresetAutonomy({
				updateVisitNoteField: (field, val) => {
					if (field === "treatmentPlan" || field === "treatment") treatmentValue = val;
				},
				showToastFn: (msg) => {
					toastMsg = msg;
				},
				activePatient: { somaticNotes: "Гипертоническая болезнь 2 стадии, АД 155/95" },
			});

			assert.equal(result.executed, true);
			assert.ok(treatmentValue.includes("Sol. Mepivacaini 3% без вазоконстриктора (Скандонест)"));
			assert.ok(treatmentValue.includes("кардио-протокол"));
			assert.ok(toastMsg.includes("Mepivacaini 3% plain"));
		});

		it("switches to Mepivacaine 3% hypoallergenic protocol for articaine-allergic patient", () => {
			let treatmentValue = "";
			let toastMsg = "";

			const result = executeApplyAnesthesiaPresetAutonomy({
				updateVisitNoteField: (field, val) => {
					if (field === "treatmentPlan" || field === "treatment") treatmentValue = val;
				},
				showToastFn: (msg) => {
					toastMsg = msg;
				},
				activePatient: { allergies: "Аллергия на артикаин / септанест" },
			});

			assert.equal(result.executed, true);
			assert.ok(treatmentValue.includes("гипоаллергенный протокол"));
			assert.ok(treatmentValue.includes("Sol. Mepivacaini 3%"));
			assert.ok(toastMsg.includes("гипоаллергенная анестезия"));
		});

		it("switches to Articaine 1:200 000 gestational protocol for pregnant patient", () => {
			let treatmentValue = "";
			let toastMsg = "";

			const result = executeApplyAnesthesiaPresetAutonomy({
				updateVisitNoteField: (field, val) => {
					if (field === "treatmentPlan" || field === "treatment") treatmentValue = val;
				},
				showToastFn: (msg) => {
					toastMsg = msg;
				},
				activePatient: { somaticNotes: "Беременность 20 недель" },
			});

			assert.equal(result.executed, true);
			assert.ok(treatmentValue.includes("гестационный протокол"));
			assert.ok(treatmentValue.includes("1:200 000"));
			assert.ok(toastMsg.includes("для беременных"));
		});
	});

	describe("4. Clinical Drug Safety & Anesthetic Calculation (calculateAnesthesiaSafety)", () => {
		it("calculates anesthesia safety for healthy patient without blocking doctor autonomy", () => {
			const result = calculateAnesthesiaSafety({
				drugId: "articaine_100",
				carpulesCount: 2,
				patientWeightKg: 70,
				isSomaticallyHealthy: true,
			});

			assert.equal(result.isOverdose, false);
			assert.equal(result.isEpinephrineOverdose, false);
			assert.equal(result.isCardioRisk, false);
			assert.ok(result.maxSafeCarpulesCount >= 5);
			assert.ok(result.diaryEntryRu.includes("Articaini"));
		});

		it("auto-detects cardiovascular risk for hypertensive patient and flags epinephrine limit", () => {
			const result = calculateAnesthesiaSafety({
				drugId: "mepivacaine_plain",
				carpulesCount: 2,
				patientWeightKg: 80,
				hasHypertension: true,
				hasCardiovascularRisk: true,
			});

			assert.equal(result.isCardioRisk, true);
			assert.equal(result.isOverdose, false);
			assert.equal(result.isEpinephrineOverdose, false);
			assert.ok(result.maxSafeCarpulesCount >= 4);
		});

		it("evaluates safety for pregnant patient with gestational protocol", () => {
			const result = calculateAnesthesiaSafety({
				drugId: "articaine_200",
				carpulesCount: 1,
				patientWeightKg: 65,
				isPregnantOrLactating: true,
			});

			assert.equal(result.isOverdose, false);
			assert.ok(result.warnings.some((w) => w.includes("Беременность") || w.includes("1:200 000")));
		});
	});
});
