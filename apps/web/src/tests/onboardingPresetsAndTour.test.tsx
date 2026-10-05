/**
 * apps/web/src/tests/onboardingPresetsAndTour.test.tsx
 *
 * Comprehensive unit test suite for:
 * 1. 3-Click Sovereign Scale Presets (Частный кабинет, Стандартная клиника, Сеть)
 * 2. Deep Clinical Configurations & Doctor Autonomy Store (useDeepClinicalSettingsStore)
 * 3. Role-Based Non-Intrusive Walkthrough Tour (InteractiveGuideTour, Catalogs & LocalStorage state)
 * 4. Mandate 8d (Zero cartoon emojis) & Mandate 8b (Line limits <= 800 lines)
 *
 * Authorities:
 * - Mandate 8e: Doctor Autonomy (Zero blocking popups, 100% discount freedom for solo doctor).
 * - Mandate 8d: 7 Deadly Sins of UI (Zero cartoon emojis, strictly Lucide SVG icons).
 * - Mandate 8n: Solo Doctor & Scale Sovereignty (Instant setup without dead ends).
 * - Mandate 8b: Strictly <= 800 lines.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, it } from "vitest";

import {
	SOVEREIGN_PRESETS,
	SovereignScalePresetsCard,
} from "../components/onboarding/SovereignScalePresetsCard";
import {
	DEFAULT_DEEP_CLINICAL_SETTINGS,
	NETWORK_CLINIC_DEEP_SETTINGS,
	SOLO_DOCTOR_DEEP_SETTINGS,
	STANDARD_CLINIC_DEEP_SETTINGS,
	useDeepClinicalSettingsStore,
} from "../store/deepClinicalSettingsStore";
import {
	ROLE_TOUR_CATALOGS,
	dismissGuideTourPermanently,
	hasSeenGuideTour,
	isGuideTourDismissed,
	markGuideTourSeen,
	resetGuideTourProgress,
	InteractiveGuideTour,
} from "../components/tutorial/InteractiveGuideTour";
import { DeepClinicalSettingsSection } from "../components/settings/DeepClinicalSettingsSection";

describe("Sovereign Scale Presets (Частный кабинет / Стандарт / Сеть)", () => {
	it("defines exactly 3 sovereign scale presets matching clinic archetypes", () => {
		assert.equal(SOVEREIGN_PRESETS.length, 3);
		const ids = SOVEREIGN_PRESETS.map((p) => p.id);
		assert.deepEqual(ids, ["solo_doctor", "standard_clinic", "network_center"]);
	});

	it("configures solo_doctor preset for zero bureaucracy and doctor autonomy", () => {
		const solo = SOVEREIGN_PRESETS.find((p) => p.id === "solo_doctor");
		assert.ok(solo, "solo_doctor preset must exist");
		assert.equal(solo.title, "Частный кабинет / Соло-врач");
		assert.ok(solo.chairsCountText.includes("1 кресло"));
		assert.ok(
			solo.features.some((f) => f.includes("«✓ Соматически здоров»")),
			"Solo doctor must feature 1-tap norm default",
		);
		assert.ok(
			solo.features.some((f) => f.includes("Экспресс-касса")),
			"Solo doctor must feature express cashier without INN",
		);
		assert.ok(
			solo.features.some((f) => f.includes("склад")),
			"Solo doctor must feature non-blocking warehouse",
		);
	});

	it("configures standard_clinic preset for balanced team coordination", () => {
		const standard = SOVEREIGN_PRESETS.find((p) => p.id === "standard_clinic");
		assert.ok(standard, "standard_clinic preset must exist");
		assert.equal(standard.title, "Стандартная клиника");
		assert.ok(standard.chairsCountText.includes("3 кресла"));
		assert.ok(
			standard.features.some((f) => f.includes("54-ФЗ")),
			"Standard clinic must feature 54-FZ cashier",
		);
		assert.ok(
			standard.features.some((f) => f.includes("SanPiN")),
			"Standard clinic must feature SanPiN autoclave logs",
		);
	});

	it("configures network_center preset for multi-branch scale and FEFO", () => {
		const network = SOVEREIGN_PRESETS.find((p) => p.id === "network_center");
		assert.ok(network, "network_center preset must exist");
		assert.equal(network.title, "Многопрофильный центр / Сеть");
		assert.ok(network.chairsCountText.includes("5+ кресел"));
		assert.ok(
			network.features.some((f) => f.includes("FEFO")),
			"Network center must feature FEFO warehouse",
		);
		assert.ok(
			network.features.some((f) => f.includes("ЗТЛ")),
			"Network center must feature dental lab (ZTL)",
		);
	});

	it("renders SovereignScalePresetsCard markup cleanly with buttons and badges", () => {
		const html = renderToStaticMarkup(<SovereignScalePresetsCard />);
		assert.ok(html.includes("Частный кабинет / Соло-врач"));
		assert.ok(html.includes("Стандартная клиника"));
		assert.ok(html.includes("Многопрофильный центр / Сеть"));
		assert.ok(html.includes("data-testid=\"preset-card-solo_doctor\""));
		assert.ok(html.includes("data-testid=\"preset-card-standard_clinic\""));
		assert.ok(html.includes("data-testid=\"preset-card-network_center\""));
	});
});

describe("Deep Clinical Configurations Store (useDeepClinicalSettingsStore)", () => {
	beforeEach(() => {
		useDeepClinicalSettingsStore.getState().resetToDefaults();
	});

	it("initializes with non-blocking physiological norm defaults (Mandate 8e)", () => {
		const settings = useDeepClinicalSettingsStore.getState().settings;
		assert.equal(settings.requireThermalTests, false, "Thermal tests must not block visits by default");
		assert.equal(settings.autofillSoapNormalByDefault, true, "1-tap normal default enabled");
		assert.equal(settings.allowSoftNegativeStock, true, "Stock shortages must never block clinical visits");
		assert.equal(settings.maxDoctorDiscountPercent, 100, "Solo doctors retain 100% discount autonomy");
		assert.equal(settings.autoDeductAnestheticsPackage, true, "BOM auto deduction on by default");
	});

	it("applies solo doctor preset accurately", () => {
		const store = useDeepClinicalSettingsStore.getState();
		store.applyPreset("solo");
		const s = useDeepClinicalSettingsStore.getState().settings;

		assert.equal(s.requireThermalTests, false);
		assert.equal(s.intercomEnabled, false);
		assert.equal(s.maxDoctorDiscountPercent, 100);
		assert.equal(s.allowSoftNegativeStock, true);
		assert.equal(s.informedConsentTemplate, "simplified_ambulatory");
	});

	it("applies standard clinic preset accurately", () => {
		const store = useDeepClinicalSettingsStore.getState();
		store.applyPreset("standard");
		const s = useDeepClinicalSettingsStore.getState().settings;

		assert.equal(s.requireThermalTests, false);
		assert.equal(s.intercomEnabled, true);
		assert.equal(s.maxDoctorDiscountPercent, 20);
		assert.equal(s.allowSoftNegativeStock, true);
		assert.equal(s.informedConsentTemplate, "standard_1051n");
	});

	it("applies network clinic preset with strict clinical compliance", () => {
		const store = useDeepClinicalSettingsStore.getState();
		store.applyPreset("network");
		const s = useDeepClinicalSettingsStore.getState().settings;

		assert.equal(s.requireThermalTests, true);
		assert.equal(s.requirePercussionData, true);
		assert.equal(s.allowSoftNegativeStock, false);
		assert.equal(s.maxDoctorDiscountPercent, 10);
		assert.equal(s.informedConsentTemplate, "implant_extended");
	});

	it("allows atomic updates to specific clinical settings", () => {
		const store = useDeepClinicalSettingsStore.getState();
		store.updateSettings({
			xrayRetentionPeriodYears: 25,
			soundVolume: 95,
			intercomRooms: ["Кабинет 1", "Кабинет 2"],
		});

		const s = useDeepClinicalSettingsStore.getState().settings;
		assert.equal(s.xrayRetentionPeriodYears, 25);
		assert.equal(s.soundVolume, 95);
		assert.deepEqual(s.intercomRooms, ["Кабинет 1", "Кабинет 2"]);
	});

	it("renders DeepClinicalSettingsSection markup with all 4 tab panes", () => {
		const html = renderToStaticMarkup(<DeepClinicalSettingsSection />);
		assert.ok(html.includes("Расширенные клинические настройки"));
		assert.ok(html.includes("Протоколы ЭМК и ИДС"));
		assert.ok(html.includes("Склад и техкарты"));
		assert.ok(html.includes("Интерком и ассистенты"));
		assert.ok(html.includes("Касса и автономия"));
		assert.ok(html.includes("data-testid=\"deep-preset-solo\""));
		assert.ok(html.includes("data-testid=\"deep-settings-save-btn\""));
	});
});

describe("Interactive Role-Based Walkthrough (InteractiveGuideTour & Catalogs)", () => {
	beforeEach(() => {
		resetGuideTourProgress();
	});

	it("provides dedicated tour catalogs for admin, doctor, and director roles", () => {
		assert.ok(ROLE_TOUR_CATALOGS.admin, "Admin tour catalog must exist");
		assert.ok(ROLE_TOUR_CATALOGS.doctor, "Doctor tour catalog must exist");
		assert.ok(ROLE_TOUR_CATALOGS.director, "Director tour catalog must exist");
	});

	it("admin tour guides through schedule booking, fast search, and 54-FZ cashier", () => {
		const steps = ROLE_TOUR_CATALOGS.admin.steps;
		assert.ok(steps.length >= 3);
		assert.equal(steps[0]?.id, "admin_schedule_grid");
		assert.equal(steps[1]?.id, "admin_patient_search");
		assert.equal(steps[2]?.id, "admin_cashier_checkout");
	});

	it("doctor tour guides through FDI quadrant formula, 1-click norm, mic, and 1-tap finish", () => {
		const steps = ROLE_TOUR_CATALOGS.doctor.steps;
		assert.ok(steps.length >= 4);
		assert.equal(steps[0]?.id, "doctor_odontogram_formula");
		assert.equal(steps[1]?.id, "doctor_instant_norm_button");
		assert.ok(steps[1]?.title.includes("«✓ Соматически здоров»"));
		assert.equal(steps[2]?.id, "doctor_smart_microphone");
		assert.equal(steps[3]?.id, "doctor_finish_visit_one_tap");
	});

	it("director tour guides through revenue, occupancy KPI, and FEFO warehouse", () => {
		const steps = ROLE_TOUR_CATALOGS.director.steps;
		assert.ok(steps.length >= 3);
		assert.equal(steps[0]?.id, "director_revenue_dashboard");
		assert.equal(steps[1]?.id, "director_chair_occupancy");
		assert.equal(steps[2]?.id, "director_warehouse_consumption");
	});

	it("manages localStorage state for seen and dismissed tours accurately", () => {
		assert.equal(hasSeenGuideTour("doctor"), false);
		markGuideTourSeen("doctor");
		assert.equal(hasSeenGuideTour("doctor"), true);
		assert.equal(hasSeenGuideTour("admin"), false);

		assert.equal(isGuideTourDismissed(), false);
		dismissGuideTourPermanently();
		assert.equal(isGuideTourDismissed(), true);

		resetGuideTourProgress();
		assert.equal(hasSeenGuideTour("doctor"), false);
		assert.equal(isGuideTourDismissed(), false);
	});

	it("renders InteractiveGuideTour markup cleanly", () => {
		const html = renderToStaticMarkup(<InteractiveGuideTour userRole="doctor" />);
		assert.ok(typeof html === "string");
	});
});

describe("Mandates & Quality Invariants Verification (8b, 8d, 8e)", () => {
	const filesToCheck = [
		"apps/web/src/store/deepClinicalSettingsStore.ts",
		"apps/web/src/components/onboarding/SovereignScalePresetsCard.tsx",
		"apps/web/src/components/tutorial/InteractiveGuideTour.tsx",
		"apps/web/src/components/settings/DeepClinicalSettingsSection.tsx",
		"apps/web/src/components/settings/OwnerSettingsSection.tsx",
	];

	it("enforces Mandate 8b: file length strictly <= 800 lines for all new components", () => {
		for (const relativePath of filesToCheck) {
			const fullPath = path.resolve(process.cwd(), relativePath);
			assert.ok(fs.existsSync(fullPath), `File must exist: ${relativePath}`);
			const content = fs.readFileSync(fullPath, "utf-8");
			const lineCount = content.split("\n").length;
			assert.ok(
				lineCount <= 800,
				`File ${relativePath} exceeds 800 lines mandate (${lineCount} lines)`,
			);
		}
	});

	it("enforces Mandate 8d: zero cartoon emojis across onboarding and tour files", () => {
		// Strict cartoon emoji regex (emoticons, pictographs, symbols) excluding standard typographical symbols
		const cartoonEmojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/u;

		for (const relativePath of filesToCheck) {
			const fullPath = path.resolve(process.cwd(), relativePath);
			const content = fs.readFileSync(fullPath, "utf-8");
			const lines = content.split("\n");
			const emojiViolations: { line: number; text: string }[] = [];

			lines.forEach((lineText, idx) => {
				if (cartoonEmojiRegex.test(lineText)) {
					emojiViolations.push({ line: idx + 1, text: lineText.trim() });
				}
			});

			assert.equal(
				emojiViolations.length,
				0,
				`Mandate 8d violation: Found cartoon emojis in ${relativePath} at lines: ${JSON.stringify(emojiViolations)}`,
			);
		}
	});
});
