import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";
import { PatientAllergySafetyBanner } from "../PatientAllergySafetyBanner.js";
import type { PatientClinicalSafetyProfile } from "../safetyMath.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

export function hasCartoonEmojis(text: string): boolean {
	return CARTOON_EMOJI_REGEX.test(text);
}

describe("4. PatientAllergySafetyBanner Integration & Emojis", () => {
	const safetyMathPath = path.resolve(__dirname, "../safetyMath.ts");
	const safetyMathSource = fs.readFileSync(safetyMathPath, "utf8");

	const anamnesisModalPath = path.resolve(__dirname, "../PatientAnamnesisModal.tsx");
	const anamnesisModalSource = fs.readFileSync(anamnesisModalPath, "utf8");

	const safetyBannerPath = path.resolve(__dirname, "../PatientAllergySafetyBanner.tsx");
	const safetyBannerSource = fs.readFileSync(safetyBannerPath, "utf8");

	it("4.1. handleApplySomaticNorm resets hasNsaidAllergy to false", () => {
		assert.ok(safetyBannerSource.includes("hasNsaidAllergy: false,"));
	});

	it("4.2. renders PatientAllergySafetyBanner with active NSAID allergy and shows stop factor", () => {
		const nsaidProfile: PatientClinicalSafetyProfile = { pregnancyTrimester: "none", hasNsaidAllergy: true };
		const html = renderToString(
			React.createElement(PatientAllergySafetyBanner, {
				patientId: "pat-test-banner",
				patientName: "Петров Василий Сергеевич",
				profile: nsaidProfile,
			}),
		);
		assert.ok(html.includes('data-testid="patient-allergy-safety-banner"'));
		assert.ok(html.includes("СОМАТИЧЕСКИЕ ФАКТОРЫ РИСКА:"));
		assert.ok(html.includes("[СТОП] АЛЛЕРГИЯ: НПВП (ЗАПРЕТ АСПИРИНА / КЕТОРОЛА)"));
	});

	it("4.3. does NOT render PatientAllergySafetyBanner when clean norm", () => {
		const html = renderToString(
			React.createElement(PatientAllergySafetyBanner, {
				patientId: "pat-test-banner-clean",
				patientName: "Ковалев Андрей Павлович",
				profile: { pregnancyTrimester: "none" },
			}),
		);
		assert.strictEqual(html, "");
	});

	it("4.4. renders PatientAllergySafetyBanner when explicitly forcing hideWhenClean={false}", () => {
		const html = renderToString(
			React.createElement(PatientAllergySafetyBanner, {
				patientId: "pat-test-banner-clean",
				patientName: "Ковалев Андрей Павлович",
				profile: { pregnancyTrimester: "none" },
				hideWhenClean: false,
			}),
		);
		assert.ok(html.includes('data-testid="banner-apply-somatic-norm-btn"'));
		assert.ok(html.includes("Соматически здоров (норма)"));
	});

	it("5. guarantees zero cartoon emojis in safety modules", () => {
		assert.strictEqual(hasCartoonEmojis(safetyMathSource), false);
		assert.strictEqual(hasCartoonEmojis(anamnesisModalSource), false);
		assert.strictEqual(hasCartoonEmojis(safetyBannerSource), false);
	});
});
