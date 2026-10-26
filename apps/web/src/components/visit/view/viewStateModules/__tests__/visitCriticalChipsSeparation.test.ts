import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it } from "vitest";
import {
	buildConsolidatedAllergyChip,
	buildConsolidatedSomaticChip,
	ALLERGY_BADGE_IDS,
	SOMATIC_BADGE_IDS,
} from "../visitCriticalChipsBuilder";
import { calculateActivePatientCriticalBadges } from "../../visitCriticalBadges";
import { PatientAvatarAndInfoSection } from "../../visitHeaderModules/PatientAvatarAndInfoSection";

describe("Visit Critical Badges & Somatic Separation Invariant (Mandates 8e, 8y, 8am)", () => {
	it("1. guarantees somatic conditions (АГ / ССЗ) are NEVER included in allergy chip", () => {
		const patientWithHypertension = {
			allergies: "Пенициллиновый ряд",
			concomitantDiseases: "Артериальная гипертензия 2 ст, ССЗ",
		};
		const badges = calculateActivePatientCriticalBadges(patientWithHypertension);

		const allergyChip = buildConsolidatedAllergyChip(patientWithHypertension, badges);
		const somaticChip = buildConsolidatedSomaticChip(badges);

		// Allergy chip must ONLY contain the allergen, NEVER somatic abbreviations
		assert.ok(allergyChip, "Allergy chip must exist");
		assert.equal(allergyChip, "Аллергия: Пенициллиновый ряд");
		assert.ok(!allergyChip.includes("АГ"), "Allergy chip must NOT include 'АГ'");
		assert.ok(!allergyChip.includes("ССЗ"), "Allergy chip must NOT include 'ССЗ'");
		assert.ok(!allergyChip.includes("Гипертенз"), "Allergy chip must NOT include hypertension");

		// Somatic chip must contain the somatic risk
		assert.ok(somaticChip, "Somatic chip must exist");
		assert.ok(somaticChip.includes("АГ / ССЗ"), `Somatic chip must include АГ / ССЗ, got "${somaticChip}"`);
		assert.ok(!somaticChip.includes("Пенициллин"), "Somatic chip must NOT include allergens");
	});

	it("2. patient with only somatic risks produces NO allergy chip and clean allergy status", () => {
		const patientOnlySomatic = {
			allergies: "",
			notes: "ЭКС (кардиостимулятор), ИБС",
		};
		const badges = calculateActivePatientCriticalBadges(patientOnlySomatic);

		const allergyChip = buildConsolidatedAllergyChip(patientOnlySomatic, badges);
		const somaticChip = buildConsolidatedSomaticChip(badges);

		assert.equal(allergyChip, null, "Allergy chip must be null when patient has no allergies");
		assert.ok(somaticChip, "Somatic chip must exist for pacemaker/hypertension");
		assert.ok(somaticChip.includes("ЭКС"), `Somatic chip must mention ЭКС, got "${somaticChip}"`);
	});

	it("3. patient with multiple somatic risks (АГ, СД, Астма) consolidates into a single clean somatic chip", () => {
		const patientMultiSomatic = {
			allergies: "Лидокаин",
			notes: "Сахарный диабет 2 типа, гипертония, бронхиальная астма",
		};
		const badges = calculateActivePatientCriticalBadges(patientMultiSomatic);

		const allergyChip = buildConsolidatedAllergyChip(patientMultiSomatic, badges);
		const somaticChip = buildConsolidatedSomaticChip(badges);

		assert.equal(allergyChip, "Аллергия: Лидокаин");
		assert.ok(somaticChip, "Somatic chip must exist");
		assert.ok(somaticChip.startsWith("Риск: "), "Somatic chip must start with 'Риск: '");
		assert.ok(somaticChip.includes("Астма"), "Must include asthma");
		assert.ok(somaticChip.includes("АГ / ССЗ"), "Must include hypertension");
		assert.ok(somaticChip.includes("СД"), "Must include diabetes");
	});

	it("4. PatientAvatarAndInfoSection renders TWO sovereign badges in live SSR DOM", () => {
		const patient = {
			fullName: "Смирнова Анна Сергеевна",
			birthDate: "1988-04-12",
			allergies: "Пенициллиновый ряд",
			notes: "Гипертоническая болезнь, ССЗ",
		};
		const badges = calculateActivePatientCriticalBadges(patient);
		const allergyChip = buildConsolidatedAllergyChip(patient, badges);
		const somaticChip = buildConsolidatedSomaticChip(badges);

		const html = renderToString(
			React.createElement(PatientAvatarAndInfoSection, {
				activePatient: patient,
				patientAge: "38 лет",
				activeAppointment: null,
				activePeers: [],
				summaryText: null,
				activePatientCriticalBadges: badges,
				consolidatedAllergyChip: allergyChip,
				consolidatedSomaticChip: somaticChip,
			}),
		);

		// Must render both sovereign testids
		assert.ok(html.includes('data-testid="visit-focus-allergy-alert"'), "Must render allergy alert badge");
		assert.ok(html.includes('data-testid="visit-focus-somatic-alert"'), "Must render somatic alert badge");

		// Allergy badge text
		assert.ok(html.includes("Аллергия: Пенициллиновый ряд"), "Must render clean allergy text");
		assert.ok(html.includes("Риск: АГ / ССЗ"), "Must render sovereign somatic risk text");

		// Zero cartoon emojis in DOM (Mandates 8d, 8p)
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;
		assert.ok(!emojiRegex.test(html), "DOM must contain strictly 0 cartoon emojis, Lucide icons only");
	});

	it("5. PatientAvatarAndInfoSection renders clean allergy badge when patient has no allergies but has somatic risk", () => {
		const patient = {
			fullName: "Кузнецов Михаил Васильевич",
			birthDate: "1985-11-20",
			allergies: "",
			notes: "ЭКС (кардиостимулятор)",
		};
		const badges = calculateActivePatientCriticalBadges(patient);
		const allergyChip = buildConsolidatedAllergyChip(patient, badges);
		const somaticChip = buildConsolidatedSomaticChip(badges);

		const html = renderToString(
			React.createElement(PatientAvatarAndInfoSection, {
				activePatient: patient,
				patientAge: "41 год",
				activeAppointment: null,
				activePeers: [],
				summaryText: null,
				activePatientCriticalBadges: badges,
				consolidatedAllergyChip: allergyChip,
				consolidatedSomaticChip: somaticChip,
			}),
		);

		// Must render clean allergy badge AND somatic alert
		assert.ok(html.includes('data-testid="visit-focus-allergy-clean"'), "Must render clean allergy badge");
		assert.ok(html.includes("Аллергий нет"), "Must state no allergies");
		assert.ok(html.includes('data-testid="visit-focus-somatic-alert"'), "Must render somatic alert badge");
		assert.ok(html.includes("Риск: ЭКС"), "Must render pacemaker somatic risk");
	});
});
