/**
 * apps/web/src/tests/scaleSovereigntyReactiveSwitch.test.tsx
 *
 * Dedicated Automated Test Suite for Mandate 8n (Scale Sovereignty & Small Clinic Presets).
 *
 * Requirements:
 * 1. 1-Click reactive switching between:
 *    - [ 🩺 Частный кабинет / Субаренда ] (solo_doctor)
 *    - [ 🏥 Клиника 1-3 кресла ] (standard_clinic / small_clinic)
 *    - [ 🌐 Сеть филиалов ] (network_center / network_clinic)
 * 2. Real-time reactivity via useClinicCapabilities without manual F5 reloads.
 * 3. Autonomous doctor ergonomics: zero barriers, express cashier, 1-chair schedule.
 * 4. Zero cartoon emojis (Mandate 8d) and strictly <= 800 lines (Mandate 8b).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe, it, beforeEach } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
	SOVEREIGN_PRESETS,
	SovereignScalePresetsCard,
} from "../components/onboarding/SovereignScalePresetsCard";
import {
	clinicCapabilities,
	describeHiddenCapabilities,
	hasCapability,
	resolveClinicMode,
} from "../lib/clinicCapabilities";
import { useClinicCapabilities } from "../hooks/useClinicCapabilities";
import { useSettingsStore } from "../store/settingsStore";
import { useOnboardingStore } from "../store/onboardingStore";
import { useDeepClinicalSettingsStore } from "../store/deepClinicalSettingsStore";
import { useWorkspaceProfileStore } from "../hooks/useWorkspaceProfile";

describe("Mandate 8n: Scale Sovereignty Presets Specification", () => {
	it("contains exactly 3 sovereign presets covering the clinic scale spectrum", () => {
		assert.equal(SOVEREIGN_PRESETS.length, 3);
		const ids = SOVEREIGN_PRESETS.map((p) => p.id);
		assert.deepEqual(ids, ["solo_doctor", "standard_clinic", "network_center"]);
	});

	it("solo_doctor preset: eliminates corporate bloat, enables express workflows", () => {
		const solo = SOVEREIGN_PRESETS.find((p) => p.id === "solo_doctor");
		assert.ok(solo);
		assert.ok(solo.title.includes("Соло-врач") || solo.title.includes("Частный кабинет"));
		assert.ok(solo.subtitle.includes("Субаренда") || solo.subtitle.includes("1 кресло"));
		assert.ok(solo.chairsCountText.includes("1 кресло"));
		assert.ok(solo.recommendationText.includes("субаренде"));
		assert.ok(solo.features.some((f) => f.includes("FDI")));
		assert.ok(solo.features.some((f) => f.includes("«✓ Соматически здоров»")));
		assert.ok(solo.features.some((f) => f.includes("Экспресс-касса")));
		assert.ok(solo.features.some((f) => f.includes("склад")));
	});

	it("standard_clinic preset: 1–3 chairs, 54-FZ cashier, SanPiN autoclave registers", () => {
		const standard = SOVEREIGN_PRESETS.find((p) => p.id === "standard_clinic");
		assert.ok(standard);
		assert.ok(standard.title.includes("Стандартная клиника") || standard.title.includes("1-3 кресла"));
		assert.ok(standard.subtitle.includes("1-3 кресла") || standard.subtitle.includes("Команда врачей"));
		assert.ok(standard.chairsCountText.includes("3 кресла"));
		assert.ok(standard.features.some((f) => f.includes("54-ФЗ")));
		assert.ok(standard.features.some((f) => f.includes("SanPiN")));
	});

	it("network_center preset: 5+ chairs, dental lab (ZTL), FEFO warehouse, unified contact center", () => {
		const network = SOVEREIGN_PRESETS.find((p) => p.id === "network_center");
		assert.ok(network);
		assert.ok(network.title.includes("Сеть") || network.title.includes("Многопрофильный центр"));
		assert.ok(network.subtitle.includes("Сеть филиалов") || network.subtitle.includes("Филиалы"));
		assert.ok(network.chairsCountText.includes("5+ кресел"));
		assert.ok(network.features.some((f) => f.includes("ЗТЛ")));
		assert.ok(network.features.some((f) => f.includes("FEFO")));
	});
});

describe("Mandate 8n: Reactive Scale Switching (Zero-F5 Propagation)", () => {
	beforeEach(() => {
		useSettingsStore.getState().setClinicMode(null);
		useOnboardingStore.getState().setOperationalMode("small_clinic");
		useDeepClinicalSettingsStore.getState().resetToDefaults();
	});

	it("1-click switch to Solo Doctor (Частный кабинет / Субаренда)", () => {
		// Simulate atomic 1-click application
		useSettingsStore.getState().setClinicMode("solo_doctor");
		useOnboardingStore.getState().setOperationalMode("solo_doctor");
		useOnboardingStore.getState().updateSchedule({
			workdayStart: "09:00",
			workdayEnd: "18:00",
			defaultVisitMinutes: 30,
		});
		useDeepClinicalSettingsStore.getState().applyPreset("solo");

		// Verify settingsStore
		assert.equal(useSettingsStore.getState().clinicMode, "solo_doctor");

		// Verify onboardingStore
		assert.equal(useOnboardingStore.getState().profile.mode, "solo_doctor");
		assert.equal(useOnboardingStore.getState().schedule.defaultVisitMinutes, 30);

		// Verify deepClinicalSettingsStore
		const deep = useDeepClinicalSettingsStore.getState().settings;
		assert.equal(deep.autofillSoapNormalByDefault, true);
		assert.equal(deep.allowSoftNegativeStock, true);

		// Verify reactive capabilities resolution
		const caps = clinicCapabilities("solo_doctor");
		assert.ok(caps.includes("callList"));
		assert.ok(caps.includes("messaging"));
		assert.ok(caps.includes("managerReports"));
		assert.equal(caps.includes("massCampaigns"), false);
		assert.equal(caps.includes("chairUtilisation"), false);
		assert.equal(caps.includes("doctorBreakdown"), false);
		assert.equal(caps.includes("marketingSection"), false);

		// Verify hidden explanations
		const hidden = describeHiddenCapabilities("solo_doctor");
		assert.ok(hidden.includes("рассылки по базе пациентов"));
		assert.ok(hidden.includes("занятость кресел"));
		assert.ok(hidden.includes("разрез отчётов по врачам"));
		assert.ok(hidden.includes("раздел продвижения и воронка обращений"));
	});

	it("1-click switch to Standard Clinic (Клиника 1-3 кресла)", () => {
		useSettingsStore.getState().setClinicMode("small_clinic");
		useOnboardingStore.getState().setOperationalMode("small_clinic");
		useOnboardingStore.getState().updateSchedule({
			workdayStart: "08:30",
			workdayEnd: "20:30",
			defaultVisitMinutes: 45,
		});
		useDeepClinicalSettingsStore.getState().applyPreset("standard");

		assert.equal(useSettingsStore.getState().clinicMode, "small_clinic");
		assert.equal(useOnboardingStore.getState().profile.mode, "small_clinic");
		assert.equal(useOnboardingStore.getState().schedule.defaultVisitMinutes, 45);

		const caps = clinicCapabilities("small_clinic");
		assert.ok(caps.includes("callList"));
		assert.ok(caps.includes("messaging"));
		assert.ok(caps.includes("massCampaigns"));
		assert.ok(caps.includes("chairUtilisation"));
		assert.ok(caps.includes("doctorBreakdown"));
		assert.ok(caps.includes("marketingSection"));

		const hidden = describeHiddenCapabilities("small_clinic");
		assert.equal(hidden.length, 0);
	});

	it("1-click switch to Network Center (Сеть филиалов)", () => {
		useSettingsStore.getState().setClinicMode("network_clinic");
		useOnboardingStore.getState().setOperationalMode("network_clinic");
		useDeepClinicalSettingsStore.getState().applyPreset("network");

		assert.equal(useSettingsStore.getState().clinicMode, "network_clinic");
		assert.equal(useOnboardingStore.getState().profile.mode, "network_clinic");

		const caps = clinicCapabilities("network_clinic");
		assert.ok(caps.includes("massCampaigns"));
		assert.ok(caps.includes("chairUtilisation"));
		assert.ok(caps.includes("doctorBreakdown"));
		assert.ok(caps.includes("marketingSection"));

		const deep = useDeepClinicalSettingsStore.getState().settings;
		assert.equal(deep.requireThermalTests, true);
	});

	it("useClinicCapabilities hook produces correct reactive values", () => {
		function getHookValues() {
			let result: any;
			function TestConsumer() {
				result = useClinicCapabilities();
				return null;
			}
			renderToStaticMarkup(<TestConsumer />);
			return result;
		}

		// Test null / unresolved fallback
		useSettingsStore.getState().setClinicMode(null);
		let capsResult = getHookValues();
		assert.equal(capsResult.mode, null);
		assert.equal(capsResult.isSoloDoctor, false);
		assert.ok(capsResult.hasCapability("callList"));
		assert.ok(capsResult.hasCapability("massCampaigns"));

		// Switch to solo_doctor
		useSettingsStore.getState().setClinicMode("solo_doctor");
		capsResult = getHookValues();
		assert.equal(capsResult.mode, "solo_doctor");
		assert.equal(capsResult.isSoloDoctor, true);
		assert.equal(capsResult.isSmallClinic, false);
		assert.equal(capsResult.isNetworkClinic, false);
		assert.equal(capsResult.hasCapability("callList"), true);
		assert.equal(capsResult.hasCapability("massCampaigns"), false);
		assert.equal(capsResult.hasCapability("chairUtilisation"), false);

		// Switch to small_clinic
		useSettingsStore.getState().setClinicMode("small_clinic");
		capsResult = getHookValues();
		assert.equal(capsResult.mode, "small_clinic");
		assert.equal(capsResult.isSoloDoctor, false);
		assert.equal(capsResult.isSmallClinic, true);
		assert.equal(capsResult.hasCapability("massCampaigns"), true);
		assert.equal(capsResult.hasCapability("chairUtilisation"), true);

		// Switch to network_clinic
		useSettingsStore.getState().setClinicMode("network_clinic");
		capsResult = getHookValues();
		assert.equal(capsResult.mode, "network_clinic");
		assert.equal(capsResult.isNetworkClinic, true);
	});
});

describe("Mandate 8c & 8d: Markup, Ergonomics & Quality Standards", () => {
	it("renders SovereignScalePresetsCard with valid testids and clean HTML", () => {
		const html = renderToStaticMarkup(<SovereignScalePresetsCard />);
		assert.ok(html.includes("data-testid=\"sovereign-presets-card\""));
		assert.ok(html.includes("data-testid=\"preset-card-solo_doctor\""));
		assert.ok(html.includes("data-testid=\"preset-card-standard_clinic\""));
		assert.ok(html.includes("data-testid=\"preset-card-network_center\""));
		assert.ok(html.includes("Быстрый старт профиля клиники"));
	});

	it("preserves Mandate 8d: zero cartoon emojis in preset titles and metadata", () => {
		const cartoonEmojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/u;
		for (const preset of SOVEREIGN_PRESETS) {
			assert.equal(
				cartoonEmojiRegex.test(preset.title),
				false,
				`Preset title must have 0 cartoon emojis: ${preset.title}`,
			);
			assert.equal(
				cartoonEmojiRegex.test(preset.subtitle),
				false,
				`Preset subtitle must have 0 cartoon emojis: ${preset.subtitle}`,
			);
			assert.equal(
				cartoonEmojiRegex.test(preset.badge),
				false,
				`Preset badge must have 0 cartoon emojis: ${preset.badge}`,
			);
			for (const feat of preset.features) {
				assert.equal(
					cartoonEmojiRegex.test(feat),
					false,
					`Feature must have 0 cartoon emojis: ${feat}`,
				);
			}
		}
	});

	it("preserves Mandate 8b: file lengths strictly <= 800 lines", () => {
		const files = [
			"apps/web/src/components/onboarding/SovereignScalePresetsCard.tsx",
			"apps/web/src/components/settings/SettingsClinicTab.tsx",
			"apps/web/src/hooks/useClinicCapabilities.ts",
			"apps/web/src/lib/clinicCapabilities.ts",
		];
		for (const rel of files) {
			const full = path.resolve(process.cwd(), rel);
			assert.ok(fs.existsSync(full), `File must exist: ${rel}`);
			const lines = fs.readFileSync(full, "utf-8").split("\n").length;
			assert.ok(
				lines <= 800,
				`File ${rel} exceeds 800 lines limit (${lines} lines)`,
			);
		}
	});
});
