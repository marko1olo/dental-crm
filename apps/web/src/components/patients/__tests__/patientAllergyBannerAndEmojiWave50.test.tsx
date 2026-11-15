import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";
import { PatientSafetyBanner } from "../tabs/generalInfo/PatientSafetyBanner.js";
import {
	DEFAULT_SOMATIC_HEALTHY_NORM,
	type PatientClinicalSafetyProfile,
} from "../safetyMath.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

export function hasCartoonEmojis(text: string): boolean {
	return CARTOON_EMOJI_REGEX.test(text);
}

describe("4. PatientSafetyBanner Integration & Emojis", () => {
	const safetyMathPath = path.resolve(__dirname, "../safetyMath.ts");
	const safetyMathSource = fs.readFileSync(safetyMathPath, "utf8");

	const somaticDefaultsPath = path.resolve(
		__dirname,
		"../safetyMath/somaticDefaults.ts",
	);
	const somaticDefaultsSource = fs.readFileSync(somaticDefaultsPath, "utf8");

	const bannerPath = path.resolve(
		__dirname,
		"../tabs/generalInfo/PatientSafetyBanner.tsx",
	);
	const bannerSource = fs.readFileSync(bannerPath, "utf8");

	const fullBannerPath = path.resolve(
		__dirname,
		"../tabs/generalInfo/PatientSafetyBannerFull.tsx",
	);
	const fullBannerSource = fs.readFileSync(fullBannerPath, "utf8");

	it("4.1. DEFAULT_SOMATIC_HEALTHY_NORM resets hasNsaidAllergy to false", () => {
		assert.strictEqual(DEFAULT_SOMATIC_HEALTHY_NORM.hasNsaidAllergy, false);
		assert.ok(somaticDefaultsSource.includes("hasNsaidAllergy: false"));
	});

	it("4.2. renders PatientSafetyBanner in full mode with active NSAID allergy and shows stop factor", () => {
		const nsaidProfile: PatientClinicalSafetyProfile = {
			pregnancyTrimester: "none",
			hasNsaidAllergy: true,
		};
		const html = renderToString(
			React.createElement(PatientSafetyBanner, {
				mode: "full",
				patientId: "pat-test-banner",
				patientName: "Петров Василий Сергеевич",
				currentProfile: nsaidProfile,
				onToggleAllergy: () => {},
			}),
		);
		assert.ok(html.includes('data-testid="toggle-allergy-nsaid"'));
		assert.ok(html.includes("НПВП / Аспирин"));
		assert.ok(html.includes("(Аллергия)"));
	});

	it("4.3. renders PatientSafetyBanner with clean norm and exposes 1-click norm CTA in full mode", () => {
		const html = renderToString(
			React.createElement(PatientSafetyBanner, {
				mode: "full",
				patientId: "pat-test-banner-clean",
				patientName: "Ковалев Андрей Павлович",
				currentProfile: DEFAULT_SOMATIC_HEALTHY_NORM,
				onToggleAllergy: () => {},
			}),
		);
		assert.ok(html.includes('data-testid="btn-somatic-healthy-norm"'));
		assert.ok(html.includes("Норма"));
	});

	it("4.4. renders PatientSafetyBanner compact mode with active risk flags and exposes norm CTA", () => {
		const nsaidProfile: PatientClinicalSafetyProfile = {
			pregnancyTrimester: "none",
			hasNsaidAllergy: true,
		};
		const html = renderToString(
			React.createElement(PatientSafetyBanner, {
				mode: "compact",
				patientId: "pat-test-banner-risk",
				patientName: "Ковалев Андрей Павлович",
				currentProfile: nsaidProfile,
				onToggleAllergy: () => {},
			}),
		);
		assert.ok(html.includes('data-testid="btn-somatic-healthy-norm"'));
	});

	it("5. guarantees zero cartoon emojis in safety modules", () => {
		assert.strictEqual(hasCartoonEmojis(safetyMathSource), false);
		assert.strictEqual(hasCartoonEmojis(somaticDefaultsSource), false);
		assert.strictEqual(hasCartoonEmojis(bannerSource), false);
		assert.strictEqual(hasCartoonEmojis(fullBannerSource), false);
	});
});
