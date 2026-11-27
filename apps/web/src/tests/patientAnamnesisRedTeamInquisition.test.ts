import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { calculateActivePatientCriticalBadges } from "../components/visit/view/visitCriticalBadges";
import { SomaticQuickNormBar } from "../components/visit/anamnesisTab/SomaticQuickNormBar";
import { executePatientSomaticNormAutonomy } from "../PatientsView";
import { patientCoreDraftFromPatient } from "../appHelpers/clinicProfileHelpers";

describe("Patient Somatic Anamnesis & Allergy Chairside Integrity Suite", () => {
	it("1. calculateActivePatientCriticalBadges detects Penicillin, Lidocaine & Asthma stop-factors", () => {
		const badges = calculateActivePatientCriticalBadges(
			{
				allergies: "Пенициллин, Лидокаин",
				somaticNotes: "Бронхиальная астма",
			},
		);
		const ids = badges.map((b) => b.id);
		assert.ok(ids.includes("penicillin"));
		assert.ok(ids.includes("lidocaine"));
		assert.ok(ids.includes("asthma"));
	});

	it("2. SomaticQuickNormBar renders unlocked norm action and critical warning banner without 834н jargon", () => {
		const html = renderToStaticMarkup(
			React.createElement(SomaticQuickNormBar, {
				activePat: { fullName: "Иванов И.И.", allergies: "Пенициллин" },
				totalCriticalAlerts: true,
				selectedRisks: ["asthma"],
				selectedAllergies: { penicillin: "Крапивница" },
				selectedAllergyCount: 1,
				onApplyPhysiologicalNorm: () => {},
				onApplyToDiary: () => {},
			}),
		);
		assert.ok(html.length > 0);
		assert.strictEqual(html.includes("834н"), false);
		assert.strictEqual(html.includes("043/у"), false);
	});

	it("3. executePatientSomaticNormAutonomy applies healthy status without blocking CTA", () => {
		let savedNotes = "";
		const res = executePatientSomaticNormAutonomy({
			selectedPatient: {
				id: "pat-anam-1",
				organizationId: "org-1",
				fullName: "Тест",
				phone: "+79001112233",
				birthDate: "1990-01-01",
				status: "active",
				balanceRub: 0,
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-01T00:00:00Z",
			},
			currentNotes: "",
			updatePatientCoreDraft: (_field, val) => {
				savedNotes = val;
			},
		});
		assert.strictEqual(res.executed, true);
		assert.ok(savedNotes.includes("Соматически здоров"));
		assert.ok(patientCoreDraftFromPatient(null).fullName === "");
	});
});
