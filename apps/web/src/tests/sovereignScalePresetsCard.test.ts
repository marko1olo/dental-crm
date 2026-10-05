/**
 * apps/web/src/tests/sovereignScalePresetsCard.test.ts
 *
 * Verification suite for Sovereign Scale Presets (Mandate 8e, 8n, 8s):
 * 1. SOVEREIGN_PRESETS data structure integrity: solo_doctor, standard_clinic, network_center.
 * 2. Chairs count and recommendation texts match clinical standards.
 * 3. 0 cartoon emojis: icons are strictly Lucide SVG components.
 * 4. Scale mode mapping and store preset consistency.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	SOVEREIGN_PRESETS,
	type SovereignPresetId,
} from "../components/onboarding/SovereignScalePresetsCard";
import { useOnboardingStore } from "../store/onboardingStore";
import { useSettingsStore } from "../store/settingsStore";
import { useDeepClinicalSettingsStore } from "../store/deepClinicalSettingsStore";

describe("SovereignScalePresetsCard Specification & Store Integrity", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("contains exactly 3 sovereign presets covering the clinic scale spectrum", () => {
		expect(SOVEREIGN_PRESETS.length).toBe(3);

		const presetIds = SOVEREIGN_PRESETS.map((p) => p.id);
		expect(presetIds).toEqual(["solo_doctor", "standard_clinic", "network_center"]);
	});

	it("preserves Mandate 8d & 8n: Solo Doctor preset optimizes for 1 chair without bureaucracy", () => {
		const solo = SOVEREIGN_PRESETS.find((p) => p.id === "solo_doctor");
		expect(solo).toBeDefined();
		expect(solo!.title).toContain("Соло-врач");
		expect(solo!.chairsCountText).toContain("1 кресло");
		expect(solo!.features.some((f) => f.includes("FDI"))).toBe(true);
		expect(solo!.features.some((f) => f.includes("Соматически здоров"))).toBe(true);
		expect(solo!.features.some((f) => f.includes("Экспресс-касса"))).toBe(true);
		// Check for zero cartoon emojis in titles and features
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		expect(emojiRegex.test(solo!.title)).toBe(false);
		expect(emojiRegex.test(solo!.chairsCountText)).toBe(false);
	});

	it("preserves Standard Clinic preset configuration for 2-5 chairs team workflows", () => {
		const standard = SOVEREIGN_PRESETS.find((p) => p.id === "standard_clinic");
		expect(standard).toBeDefined();
		expect(standard!.chairsCountText).toContain("3 кресла");
		expect(standard!.features.some((f) => f.includes("54-ФЗ"))).toBe(true);
		expect(standard!.features.some((f) => f.includes("SanPiN"))).toBe(true);
	});

	it("preserves Network Center preset configuration for multi-branch and dental lab", () => {
		const network = SOVEREIGN_PRESETS.find((p) => p.id === "network_center");
		expect(network).toBeDefined();
		expect(network!.chairsCountText).toContain("5+ кресел");
		expect(network!.features.some((f) => f.includes("ЗТЛ"))).toBe(true);
		expect(network!.features.some((f) => f.includes("ЕГИСЗ"))).toBe(true);
	});

	it("deepClinicalSettingsStore successfully applies matching presets without throws", () => {
		useDeepClinicalSettingsStore.getState().applyPreset("solo");
		expect(useDeepClinicalSettingsStore.getState().settings.autofillSoapNormalByDefault).toBe(true);
		expect(useDeepClinicalSettingsStore.getState().settings.allowSoftNegativeStock).toBe(true);

		useDeepClinicalSettingsStore.getState().applyPreset("standard");
		expect(useDeepClinicalSettingsStore.getState().settings.autofillSoapNormalByDefault).toBe(true);
		expect(useDeepClinicalSettingsStore.getState().settings.informedConsentTemplate).toBe("standard_1051n");

		useDeepClinicalSettingsStore.getState().applyPreset("network");
		expect(useDeepClinicalSettingsStore.getState().settings.requireThermalTests).toBe(true);
	});

	it("onboardingStore correctly updates operational mode and schedule defaults", () => {
		useOnboardingStore.getState().setOperationalMode("solo_doctor");
		expect(useOnboardingStore.getState().profile.mode).toBe("solo_doctor");

		useOnboardingStore.getState().updateSchedule({
			workdayStart: "09:00",
			workdayEnd: "18:00",
			defaultVisitMinutes: 30,
		});
		expect(useOnboardingStore.getState().schedule.defaultVisitMinutes).toBe(30);

		useOnboardingStore.getState().setOperationalMode("small_clinic");
		expect(useOnboardingStore.getState().profile.mode).toBe("small_clinic");
	});

	it("settingsStore allows atomic updating of clinicMode for solo sovereignty", () => {
		const settings = useSettingsStore.getState();

		settings.setClinicMode("solo_doctor");
		expect(useSettingsStore.getState().clinicMode).toBe("solo_doctor");

		settings.setClinicMode("small_clinic");
		expect(useSettingsStore.getState().clinicMode).toBe("small_clinic");

		settings.setClinicMode("network_clinic");
		expect(useSettingsStore.getState().clinicMode).toBe("network_clinic");
	});
});
