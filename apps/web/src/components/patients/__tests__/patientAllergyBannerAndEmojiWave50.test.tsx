import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PatientSafetyBanner } from "../tabs/generalInfo/PatientSafetyBanner.js";
import {
	DEFAULT_SOMATIC_HEALTHY_NORM,
	evaluatePatientSafetyFlags,
	type PatientClinicalSafetyProfile,
} from "../safetyMath.js";

export const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

export function hasCartoonEmojis(text: string): boolean {
	return CARTOON_EMOJI_REGEX.test(text);
}

describe("4. PatientSafetyBanner Integration & Emojis (6G Live SUT)", () => {
	it("4.1. DEFAULT_SOMATIC_HEALTHY_NORM resets allergies and evaluates zero stop flags", () => {
		assert.strictEqual(DEFAULT_SOMATIC_HEALTHY_NORM.hasNsaidAllergy, false);
		assert.strictEqual(DEFAULT_SOMATIC_HEALTHY_NORM.hasPenicillinAllergy, false);
		assert.strictEqual(DEFAULT_SOMATIC_HEALTHY_NORM.hasLatexAllergy, false);
		const evalResult = evaluatePatientSafetyFlags(DEFAULT_SOMATIC_HEALTHY_NORM);
		assert.strictEqual(evalResult.hasCriticalStopFlags, false);
		assert.strictEqual(evalResult.totalAlertCount, 0);
	});

	it("4.2. renders PatientSafetyBanner in full mode with active NSAID allergy and shows stop factor without disabling buttons", () => {
		const nsaidProfile: PatientClinicalSafetyProfile = {
			pregnancyTrimester: "none",
			hasNsaidAllergy: true,
		};
		const html = renderToStaticMarkup(
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
		assert.strictEqual(html.includes('disabled=""'), false);
	});

	it("4.3. renders PatientSafetyBanner with clean norm and exposes norm CTA in full mode", () => {
		const html = renderToStaticMarkup(
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
		assert.strictEqual(hasCartoonEmojis(html), false);
	});

	it("4.4. renders PatientSafetyBanner compact mode with active risk flags and exposes norm CTA", () => {
		const nsaidProfile: PatientClinicalSafetyProfile = {
			pregnancyTrimester: "none",
			hasNsaidAllergy: true,
		};
		const html = renderToStaticMarkup(
			React.createElement(PatientSafetyBanner, {
				mode: "compact",
				patientId: "pat-test-banner-risk",
				patientName: "Ковалев Андрей Павлович",
				currentProfile: nsaidProfile,
				onToggleAllergy: () => {},
			}),
		);
		assert.ok(html.includes('data-testid="btn-somatic-healthy-norm"'));
		assert.ok(html.includes("НПВП / Аспирин"));
		assert.strictEqual(hasCartoonEmojis(html), false);
	});

	it("5. guarantees zero cartoon emojis and zero Soviet order codes in rendered full and compact safety banners", () => {
		const riskProfile: PatientClinicalSafetyProfile = {
			pregnancyTrimester: "second",
			hasNsaidAllergy: true,
			hasPenicillinAllergy: true,
			hasLatexAllergy: true,
		};
		const fullHtml = renderToStaticMarkup(
			React.createElement(PatientSafetyBanner, {
				mode: "full",
				patientId: "pat-emoji-check",
				patientName: "Смирнов Алексей Игоревич",
				currentProfile: riskProfile,
				onToggleAllergy: () => {},
			}),
		);
		const compactHtml = renderToStaticMarkup(
			React.createElement(PatientSafetyBanner, {
				mode: "compact",
				patientId: "pat-emoji-check",
				patientName: "Смирнов Алексей Игоревич",
				currentProfile: riskProfile,
				onToggleAllergy: () => {},
			}),
		);
		assert.strictEqual(hasCartoonEmojis(fullHtml), false);
		assert.strictEqual(hasCartoonEmojis(compactHtml), false);
		assert.strictEqual(fullHtml.includes("043/у"), false);
		assert.strictEqual(fullHtml.includes("804н"), false);
	});
});
