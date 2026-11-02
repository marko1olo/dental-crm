/**
 * apps/web/src/components/patient/__tests__/patientAnamnesisNorms.test.ts
 *
 * Patient Anamnesis & Somatic Norm Invariants (Mandates 8d, 8e, 8b & 8zi):
 * 1. PatientAnamnesisTab: 1-click somatic norm, 5 allergy chips, 0 disabled buttons, Form 043/u diary export.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
	createHealthySomaticNormProfile,
	DEFAULT_SOMATIC_HEALTHY_NORM,
	evaluatePatientSafetyFlags,
	formatSafetyProfileToDiaryText,
	isSomaticProfilePhysiologicalNorm,
	type PatientClinicalSafetyProfile,
} from "../../patients/safetyMath.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const patientDir = path.resolve(__dirname, "..");

describe("Patient Anamnesis & Somatic Norm Invariants", () => {
	it("provides an atomic 1-click physiological norm with zero active allergies", () => {
		const norm = createHealthySomaticNormProfile();

		assert.equal(
			norm.hasPenicillinAllergy,
			false,
			"Penicillin allergy must be false in healthy norm",
		);
		assert.equal(
			norm.hasLidocaineAllergy,
			false,
			"Lidocaine allergy must be false in healthy norm",
		);
		assert.equal(
			norm.hasArticaineAllergy,
			false,
			"Articaine allergy must be false in healthy norm",
		);
		assert.equal(
			norm.hasLatexAllergy,
			false,
			"Latex allergy must be false in healthy norm",
		);
		assert.equal(
			norm.hasIodineAllergy,
			false,
			"Iodine allergy must be false in healthy norm",
		);
		assert.equal(
			norm.hasCardiovascularDisease,
			false,
			"Cardiovascular disease must be false",
		);
		assert.equal(
			norm.takesAnticoagulants,
			false,
			"Anticoagulants must be false",
		);
		assert.equal(norm.hasDiabetesMellitus, false, "Diabetes must be false");

		assert.ok(
			isSomaticProfilePhysiologicalNorm(norm),
			"Profile must be certified physiological norm",
		);

		const evalResult = evaluatePatientSafetyFlags(norm);
		assert.equal(
			evalResult.activeFlags.length,
			0,
			"Healthy norm must have 0 stop-factor flags",
		);
		assert.equal(
			evalResult.hasCriticalStopFlags,
			false,
			"Healthy norm must have 0 critical stop flags",
		);
	});

	it("correctly identifies and flags each of the 5 core clinical allergies", () => {
		const allergyKeys: Array<keyof PatientClinicalSafetyProfile> = [
			"hasPenicillinAllergy",
			"hasLidocaineAllergy",
			"hasArticaineAllergy",
			"hasLatexAllergy",
			"hasIodineAllergy",
		];

		for (const key of allergyKeys) {
			const profile: PatientClinicalSafetyProfile = {
				...DEFAULT_SOMATIC_HEALTHY_NORM,
				[key]: true,
			};

			assert.equal(
				isSomaticProfilePhysiologicalNorm(profile),
				false,
				`${String(key)} must invalidate norm`,
			);
			const evalResult = evaluatePatientSafetyFlags(profile);
			assert.ok(
				evalResult.activeFlags.length >= 1,
				`Activating ${String(key)} must generate at least 1 active clinical safety badge`,
			);
		}
	});

	it("generates clinical SOAP diary snippet without cartoon emojis", () => {
		const profile: PatientClinicalSafetyProfile = {
			...DEFAULT_SOMATIC_HEALTHY_NORM,
			hasPenicillinAllergy: true,
			hasLidocaineAllergy: true,
			customChronicNotes: "Дентофобия средней степени",
		};

		const text = formatSafetyProfileToDiaryText(profile);
		assert.ok(
			text.includes("Аллергологический анамнез: Отягощен"),
			"Diary must flag allergy alert",
		);
		assert.ok(text.includes("Пенициллины"), "Diary must list Penicillin");
		assert.ok(text.includes("Лидокаин"), "Diary must list Lidocaine");
		assert.ok(
			text.includes("Дентофобия"),
			"Diary must include chronic notes",
		);

		const EMOJI_REGEX =
			/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E0}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;
		assert.equal(
			EMOJI_REGEX.test(text),
			false,
			"EMR diary snippet must contain 0 cartoon emojis (Mandate 8d)",
		);
	});

	it("enforces zero disabled buttons in PatientAnamnesisTab source code", () => {
		const tabFile = path.resolve(patientDir, "PatientAnamnesisTab.tsx");
		const anamnesisDir = path.resolve(patientDir, "anamnesis");
		const canonicalTabFile = path.resolve(patientDir, "../patients/PatientAnamnesisTab.tsx");
		const canonicalAnamnesisDir = path.resolve(patientDir, "../patients/anamnesis");
		let content = fs.readFileSync(tabFile, "utf-8");
		if (fs.existsSync(canonicalTabFile)) {
			content += `\n${fs.readFileSync(canonicalTabFile, "utf-8")}`;
		}
		if (fs.existsSync(canonicalAnamnesisDir)) {
			const decompFiles = fs
				.readdirSync(canonicalAnamnesisDir)
				.filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
			for (const f of decompFiles) {
				content += `\n${fs.readFileSync(path.join(canonicalAnamnesisDir, f), "utf-8")}`;
			}
		}
		if (fs.existsSync(anamnesisDir)) {
			const decompFiles = fs
				.readdirSync(anamnesisDir)
				.filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
			for (const f of decompFiles) {
				content += `\n${fs.readFileSync(path.join(anamnesisDir, f), "utf-8")}`;
			}
		}

		assert.ok(
			content.includes('data-testid="mark-somatic-norm-btn"'),
			"Must have 1-click norm button",
		);
		assert.ok(
			content.includes('data-testid="toggle-allergy-penicillin"'),
			"Must have penicillin chip",
		);
		assert.ok(
			content.includes('data-testid="toggle-allergy-lidocaine"'),
			"Must have lidocaine chip",
		);
		assert.ok(
			content.includes('data-testid="toggle-allergy-articaine"'),
			"Must have articaine chip",
		);
		assert.ok(
			content.includes('data-testid="toggle-allergy-latex"'),
			"Must have latex chip",
		);
		assert.ok(
			content.includes('data-testid="toggle-allergy-iodine"'),
			"Must have iodine chip",
		);

		// Check for disabled attribute pattern
		const disabledRegex = /disabled=\{/g;
		const disabledMatches = content.match(disabledRegex) || [];
		assert.equal(
			disabledMatches.length,
			0,
			`PatientAnamnesisTab must have 0 disabled buttons (Mandate 8e), found: ${disabledMatches.length}`,
		);
	});
});
