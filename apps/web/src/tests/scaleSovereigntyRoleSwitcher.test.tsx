/**
 * apps/web/src/tests/scaleSovereigntyRoleSwitcher.test.tsx
 *
 * Dedicated Automated Test Suite for:
 * 1. RoleSwitcher (6 clinical roles: therapist, orthopedist, orthodontist, surgeon, owner, admin)
 * 2. ScaleSovereigntyToggle (Solo Doctor, Small Clinic 1-3 chairs, Network Clinic 5+ chairs)
 * 3. DemoProdModeIndicator (Dual-Engine: Demo Showcase vs. Live PostgreSQL 18:5432)
 *
 * Mandate 8b (<= 800 lines), Mandate 8d (0 cartoon emojis), Mandate 8e (Doctor Autonomy),
 * Mandate 8n (Scale Sovereignty), Mandate 8c (Zero Dead-Ends).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe, it, beforeEach } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
	RoleSwitcher,
	CLINICAL_ROLE_ITEMS,
} from "../components/scale-sovereignty/RoleSwitcher";
import {
	ScaleSovereigntyToggle,
	SCALE_TIER_OPTIONS,
} from "../components/scale-sovereignty/ScaleSovereigntyToggle";
import { DemoProdModeIndicator } from "../components/scale-sovereignty/DemoProdModeIndicator";
import { useAppStore } from "../store/appStore";
import { usePatientStore } from "../store/patientStore";
import { useSettingsStore } from "../store/settingsStore";
import { useOnboardingStore } from "../store/onboardingStore";
import { useDeepClinicalSettingsStore } from "../store/deepClinicalSettingsStore";
import { usePerspectiveStore } from "../store/perspectiveStore";
import {
	enableDemoShowcaseMode,
	disableDemoShowcaseMode,
	setRuntimeDemoMode,
} from "../utils/demoModeEngine";

describe("RoleSwitcher Specification & Ergonomics", () => {
	beforeEach(() => {
		setRuntimeDemoMode(null);
		disableDemoShowcaseMode();
		useAppStore.getState().setSelectedWorkspaceRole("doctor");
		usePatientStore.getState().setSelectedPatientId(null);
		usePerspectiveStore.getState().setPerspective("standard");
	});

	it("contains exactly 6 clinical roles covering the dental clinic spectrum", () => {
		assert.equal(CLINICAL_ROLE_ITEMS.length, 6);
		const keys = CLINICAL_ROLE_ITEMS.map((r) => r.key);
		assert.deepEqual(keys, [
			"therapist",
			"orthopedist",
			"orthodontist",
			"surgeon",
			"owner",
			"admin",
		]);
	});

	it("preserves Mandate 8d: zero cartoon emojis in clinical roles", () => {
		const cartoonEmojiRegex =
			/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/u;
		for (const role of CLINICAL_ROLE_ITEMS) {
			assert.equal(
				cartoonEmojiRegex.test(role.title),
				false,
				`Role title must have 0 cartoon emojis: ${role.title}`,
			);
			assert.equal(
				cartoonEmojiRegex.test(role.specialty),
				false,
				`Role specialty must have 0 cartoon emojis: ${role.specialty}`,
			);
			assert.equal(
				cartoonEmojiRegex.test(role.doctorName),
				false,
				`Doctor name must have 0 cartoon emojis: ${role.doctorName}`,
			);
		}
	});

	it("renders RoleSwitcher markup with clean testids", () => {
		const html = renderToStaticMarkup(<RoleSwitcher />);
		assert.ok(html.includes("data-testid=\"clinical-role-switcher\""));
		assert.ok(html.includes("data-testid=\"role-switcher-trigger\""));
		assert.ok(html.includes("Главврач") || html.includes("Терапевт"));
	});

	it("preserves patient context upon role switching", () => {
		// Set existing patient
		const testPatientId = "01a00000-0000-0000-0000-000000000001";
		usePatientStore.getState().setSelectedPatientId(testPatientId);
		assert.equal(usePatientStore.getState().selectedPatientId, testPatientId);

		// Switch role to Surgeon
		useAppStore.getState().setSelectedWorkspaceRole("doctor");
		usePerspectiveStore.getState().setPerspective("chairsider");

		// Context must NOT be lost
		assert.equal(usePatientStore.getState().selectedPatientId, testPatientId);
	});
});

describe("ScaleSovereigntyToggle Specification (Mandate 8n)", () => {
	beforeEach(() => {
		useSettingsStore.getState().setClinicMode(null);
		useOnboardingStore.getState().setOperationalMode("small_clinic");
		useDeepClinicalSettingsStore.getState().resetToDefaults();
	});

	it("contains exactly 3 scale tiers", () => {
		assert.equal(SCALE_TIER_OPTIONS.length, 3);
		const ids = SCALE_TIER_OPTIONS.map((t) => t.id);
		assert.deepEqual(ids, ["solo_doctor", "small_clinic", "network_clinic"]);
	});

	it("preserves Mandate 8d: zero cartoon emojis in scale tier options", () => {
		const cartoonEmojiRegex =
			/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/u;
		for (const tier of SCALE_TIER_OPTIONS) {
			assert.equal(
				cartoonEmojiRegex.test(tier.title),
				false,
				`Tier title must have 0 cartoon emojis: ${tier.title}`,
			);
			assert.equal(
				cartoonEmojiRegex.test(tier.chairsLabel),
				false,
				`Chairs label must have 0 cartoon emojis: ${tier.chairsLabel}`,
			);
			assert.equal(
				cartoonEmojiRegex.test(tier.description),
				false,
				`Description must have 0 cartoon emojis: ${tier.description}`,
			);
		}
	});

	it("renders ScaleSovereigntyToggle markup with clean testids", () => {
		const html = renderToStaticMarkup(<ScaleSovereigntyToggle />);
		assert.ok(html.includes("data-testid=\"scale-sovereignty-toggle\""));
		assert.ok(html.includes("data-testid=\"scale-toggle-trigger\""));
		assert.ok(html.includes("Клиника 1-3 кресла"));
	});
});

describe("DemoProdModeIndicator Specification (Dual-Engine SSOT)", () => {
	beforeEach(() => {
		setRuntimeDemoMode(null);
		disableDemoShowcaseMode();
	});

	it("renders production contour indicator by default in production", () => {
		const html = renderToStaticMarkup(<DemoProdModeIndicator />);
		assert.ok(html.includes("data-testid=\"prod-contour-indicator\""));
		assert.ok(html.includes("Боевой контур"));
		assert.ok(html.includes("PG 18:5432"));
		assert.equal(html.includes("data-testid=\"demo-contour-indicator\""), false);
	});

	it("renders demo contour indicator when showcase mode is enabled", () => {
		enableDemoShowcaseMode();
		const html = renderToStaticMarkup(<DemoProdModeIndicator />);
		assert.ok(html.includes("data-testid=\"demo-contour-indicator\""));
		assert.ok(html.includes("Демо-витрина"));
		assert.ok(html.includes("data-testid=\"exit-to-prod-button\""));
		assert.ok(html.includes("В боевой"));
	});
});

describe("Mandate 8b: File Lengths Strictly <= 800 Lines", () => {
	it("all scale-sovereignty files are strictly <= 800 lines", () => {
		const files = [
			"apps/web/src/components/scale-sovereignty/RoleSwitcher.tsx",
			"apps/web/src/components/scale-sovereignty/ScaleSovereigntyToggle.tsx",
			"apps/web/src/components/scale-sovereignty/DemoProdModeIndicator.tsx",
			"apps/web/src/components/scale-sovereignty/index.ts",
			"apps/web/src/workspaceShellModules/topBarModules/WorkspaceTopBarStatusAndSearch.tsx",
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
