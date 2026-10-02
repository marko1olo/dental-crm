/**
 * apps/web/src/components/settings/__tests__/doctorCbctSettingsDefaults.test.ts
 *
 * Unit tests for Doctor CBCT Defaults persistence, boundary sanitization,
 * canonical resets, and Mandate 8b file size limits (< 800 lines).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
	CANONICAL_CBCT_SETTINGS,
	DOCTOR_CBCT_SETTINGS_STORAGE_KEY,
	loadDoctorCbctSettings,
	resetDoctorCbctSettings,
	saveDoctorCbctSettings,
} from "../../radiology/cbctLutMath";

test("Doctor CBCT Defaults — canonical fallback when storage empty", () => {
	// Mock window and localStorage
	const storage = new Map<string, string>();
	const mockWindow = {
		localStorage: {
			getItem: (k: string) => storage.get(k) ?? null,
			setItem: (k: string, v: string) => storage.set(k, v),
			removeItem: (k: string) => storage.delete(k),
		},
		dispatchEvent: (_event: unknown) => true,
	};
	// @ts-expect-error Mocking global window for testing
	globalThis.window = mockWindow;

	const defaults = loadDoctorCbctSettings();
	assert.strictEqual(defaults.windowWidth, 4025, "Canonical Window Width must be 4025 HU");
	assert.strictEqual(defaults.windowLevel, 525, "Canonical Window Level must be 525 HU");
	assert.strictEqual(defaults.gamma, 1.50, "Canonical Gamma must be 1.50");
	assert.strictEqual(defaults.airCutoffHU, -500, "Canonical Air Cutoff must be -500 HU");
	assert.strictEqual(defaults.mprThicknessMm, 1.0, "Canonical MPR Thickness must be 1.0 mm");
	assert.strictEqual(defaults.panoThicknessMm, 1.0, "Canonical Pano Thickness must be 1.0 mm");
});

test("Doctor CBCT Defaults — saves and reloads personal preferences with DOM dispatch", () => {
	const storage = new Map<string, string>();
	let dispatchedEvent: unknown = null;

	const mockWindow = {
		localStorage: {
			getItem: (k: string) => storage.get(k) ?? null,
			setItem: (k: string, v: string) => storage.set(k, v),
			removeItem: (k: string) => storage.delete(k),
		},
		dispatchEvent: (event: unknown) => {
			dispatchedEvent = event;
			return true;
		},
	};
	// @ts-expect-error Mocking global window
	globalThis.window = mockWindow;

	const updated = saveDoctorCbctSettings({
		windowWidth: 3200,
		windowLevel: 600,
		gamma: 1.25,
		airCutoffHU: -400,
		mprThicknessMm: 2.0,
		panoThicknessMm: 3.5,
	});

	assert.strictEqual(updated.windowWidth, 3200);
	assert.strictEqual(updated.windowLevel, 600);
	assert.strictEqual(updated.gamma, 1.25);
	assert.strictEqual(updated.airCutoffHU, -400);
	assert.strictEqual(updated.mprThicknessMm, 2.0);
	assert.strictEqual(updated.panoThicknessMm, 3.5);

	// Verify persistence in storage
	const storedRaw = storage.get(DOCTOR_CBCT_SETTINGS_STORAGE_KEY);
	assert.ok(storedRaw, "Settings must be persisted in localStorage");
	const loaded = loadDoctorCbctSettings();
	assert.deepStrictEqual(loaded, updated, "Loaded settings must match saved settings");
	assert.ok(dispatchedEvent, "A CustomEvent must be dispatched on save");
});

test("Doctor CBCT Defaults — out of bound values sanitize to canonical limits", () => {
	const storage = new Map<string, string>();
	storage.set(
		DOCTOR_CBCT_SETTINGS_STORAGE_KEY,
		JSON.stringify({
			windowWidth: 999999, // out of range
			windowLevel: -99999, // out of range
			gamma: 15.0, // out of range
			airCutoffHU: 500, // air cannot be positive HU
			mprThicknessMm: -5.0,
			panoThicknessMm: 100.0,
		}),
	);

	const mockWindow = {
		localStorage: {
			getItem: (k: string) => storage.get(k) ?? null,
			setItem: (k: string, v: string) => storage.set(k, v),
			removeItem: (k: string) => storage.delete(k),
		},
		dispatchEvent: (_event: unknown) => true,
	};
	// @ts-expect-error Mocking global window
	globalThis.window = mockWindow;

	const sanitized = loadDoctorCbctSettings();
	assert.strictEqual(sanitized.windowWidth, CANONICAL_CBCT_SETTINGS.windowWidth);
	assert.strictEqual(sanitized.windowLevel, CANONICAL_CBCT_SETTINGS.windowLevel);
	assert.strictEqual(sanitized.gamma, CANONICAL_CBCT_SETTINGS.gamma);
	assert.strictEqual(sanitized.airCutoffHU, CANONICAL_CBCT_SETTINGS.airCutoffHU);
	assert.strictEqual(sanitized.mprThicknessMm, CANONICAL_CBCT_SETTINGS.mprThicknessMm);
	assert.strictEqual(sanitized.panoThicknessMm, CANONICAL_CBCT_SETTINGS.panoThicknessMm);
});

test("Doctor CBCT Defaults — reset restores canonical standard", () => {
	const storage = new Map<string, string>();
	storage.set(
		DOCTOR_CBCT_SETTINGS_STORAGE_KEY,
		JSON.stringify({ windowWidth: 2000, windowLevel: 800 }),
	);

	const mockWindow = {
		localStorage: {
			getItem: (k: string) => storage.get(k) ?? null,
			setItem: (k: string, v: string) => storage.set(k, v),
			removeItem: (k: string) => storage.delete(k),
		},
		dispatchEvent: (_event: unknown) => true,
	};
	// @ts-expect-error Mocking global window
	globalThis.window = mockWindow;

	const canon = resetDoctorCbctSettings();
	assert.strictEqual(canon.windowWidth, 4025);
	assert.strictEqual(canon.windowLevel, 525);
	assert.strictEqual(storage.has(DOCTOR_CBCT_SETTINGS_STORAGE_KEY), false);
});

test("Mandate 8b: File bounds check for all touched CBCT and settings files (<= 800 lines)", () => {
	const filesToCheck = [
		"apps/web/src/components/radiology/cbctLutMath.ts",
		"apps/web/src/components/radiology/CbctMprImplantStudioModal.tsx",
		"apps/web/src/components/settings/DoctorCbctSettingsModal.tsx",
		"apps/web/src/components/settings/DoctorCbctPreferencesCard.tsx",
		"apps/web/src/components/settings/DoctorClinicalPreferencesSection.tsx",
		"apps/web/src/components/settings/SettingsClinicTab.tsx",
		"apps/web/src/store/settingsStore.ts",
	];

	const repoRoot = fs.existsSync(path.resolve(process.cwd(), "apps"))
		? process.cwd()
		: path.resolve(process.cwd(), "../..");

	for (const relPath of filesToCheck) {
		const fullPath = path.resolve(repoRoot, relPath);
		assert.ok(fs.existsSync(fullPath), `File must exist: ${relPath}`);
		const content = fs.readFileSync(fullPath, "utf8");
		const lineCount = content.split(/\r?\n/).length;
		assert.ok(
			lineCount <= 800,
			`File ${relPath} has ${lineCount} lines, must be <= 800 lines (Mandate 8b)`,
		);
	}
});
