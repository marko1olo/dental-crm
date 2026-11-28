/**
 * apps/web/src/components/settings/__tests__/doctorCbctSettingsDefaults.test.ts (6G Live SUT)
 */

import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	CANONICAL_CBCT_SETTINGS,
	DOCTOR_CBCT_SETTINGS_STORAGE_KEY,
	loadDoctorCbctSettings,
	resetDoctorCbctSettings,
	saveDoctorCbctSettings,
} from "../../radiology/cbctLutMath";
import { DoctorCbctPreferencesCard } from "../DoctorCbctPreferencesCard";
import { DoctorCbctSettingsModal } from "../DoctorCbctSettingsModal";
import { DoctorClinicalPreferencesSection } from "../DoctorClinicalPreferencesSection";

test("Doctor CBCT Defaults — canonical fallback when storage empty or malformed JSON", () => {
	const storage = new Map<string, string>();
	const prevWindow = (globalThis as { window?: unknown }).window;
	(globalThis as { window?: unknown }).window = {
		localStorage: {
			getItem: (k: string) => storage.get(k) ?? null,
			setItem: (k: string, v: string) => storage.set(k, v),
			removeItem: (k: string) => storage.delete(k),
		},
		dispatchEvent: () => true,
	};

	try {
		const defaults = loadDoctorCbctSettings();
		assert.strictEqual(defaults.windowWidth, 4025, "Canonical Window Width must be 4025 HU");
		assert.strictEqual(defaults.windowLevel, 525, "Canonical Window Level must be 525 HU");
		assert.strictEqual(defaults.gamma, 1.5, "Canonical Gamma must be 1.50");
		assert.strictEqual(defaults.airCutoffHU, -500, "Canonical Air Cutoff must be -500 HU");
		assert.strictEqual(defaults.mprThicknessMm, 1.0, "Canonical MPR Thickness must be 1.0 mm");
		assert.strictEqual(defaults.panoThicknessMm, 1.0, "Canonical Pano Thickness must be 1.0 mm");
		assert.strictEqual(defaults.interpolationMethod, "catmull_rom", "Canonical Interpolation Method must be catmull_rom");

		storage.set(DOCTOR_CBCT_SETTINGS_STORAGE_KEY, "{not-valid-json");
		const corruptedFallback = loadDoctorCbctSettings();
		assert.strictEqual(corruptedFallback.windowWidth, CANONICAL_CBCT_SETTINGS.windowWidth);
	} finally {
		(globalThis as { window?: unknown }).window = prevWindow;
	}
});

test("Doctor CBCT Defaults — saves and reloads personal preferences with DOM dispatch", () => {
	const storage = new Map<string, string>();
	let dispatchedEvent: unknown = null;
	const prevWindow = (globalThis as { window?: unknown }).window;
	(globalThis as { window?: unknown }).window = {
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

	try {
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

		const storedRaw = storage.get(DOCTOR_CBCT_SETTINGS_STORAGE_KEY);
		assert.ok(storedRaw, "Settings must be persisted in localStorage");
		const loaded = loadDoctorCbctSettings();
		assert.deepStrictEqual(loaded, updated, "Loaded settings must match saved settings");
		assert.ok(dispatchedEvent, "A CustomEvent must be dispatched on save");
	} finally {
		(globalThis as { window?: unknown }).window = prevWindow;
	}
});

test("Doctor CBCT Defaults — out of bound values sanitize to canonical limits", () => {
	const storage = new Map<string, string>();
	storage.set(
		DOCTOR_CBCT_SETTINGS_STORAGE_KEY,
		JSON.stringify({
			windowWidth: 999999,
			windowLevel: -99999,
			gamma: 15.0,
			airCutoffHU: 500,
			mprThicknessMm: -5.0,
			panoThicknessMm: 100.0,
		}),
	);

	const prevWindow = (globalThis as { window?: unknown }).window;
	(globalThis as { window?: unknown }).window = {
		localStorage: {
			getItem: (k: string) => storage.get(k) ?? null,
			setItem: (k: string, v: string) => storage.set(k, v),
			removeItem: (k: string) => storage.delete(k),
		},
		dispatchEvent: () => true,
	};

	try {
		const sanitized = loadDoctorCbctSettings();
		assert.strictEqual(sanitized.windowWidth, CANONICAL_CBCT_SETTINGS.windowWidth);
		assert.strictEqual(sanitized.windowLevel, CANONICAL_CBCT_SETTINGS.windowLevel);
		assert.strictEqual(sanitized.gamma, CANONICAL_CBCT_SETTINGS.gamma);
		assert.strictEqual(sanitized.airCutoffHU, CANONICAL_CBCT_SETTINGS.airCutoffHU);
		assert.strictEqual(sanitized.mprThicknessMm, CANONICAL_CBCT_SETTINGS.mprThicknessMm);
		assert.strictEqual(sanitized.panoThicknessMm, CANONICAL_CBCT_SETTINGS.panoThicknessMm);
	} finally {
		(globalThis as { window?: unknown }).window = prevWindow;
	}
});

test("Doctor CBCT Defaults — reset restores canonical standard", () => {
	const storage = new Map<string, string>();
	storage.set(
		DOCTOR_CBCT_SETTINGS_STORAGE_KEY,
		JSON.stringify({ windowWidth: 2000, windowLevel: 800 }),
	);

	const prevWindow = (globalThis as { window?: unknown }).window;
	(globalThis as { window?: unknown }).window = {
		localStorage: {
			getItem: (k: string) => storage.get(k) ?? null,
			setItem: (k: string, v: string) => storage.set(k, v),
			removeItem: (k: string) => storage.delete(k),
		},
		dispatchEvent: () => true,
	};

	try {
		const canon = resetDoctorCbctSettings();
		assert.strictEqual(canon.windowWidth, 4025);
		assert.strictEqual(canon.windowLevel, 525);
		assert.strictEqual(storage.has(DOCTOR_CBCT_SETTINGS_STORAGE_KEY), false);
	} finally {
		(globalThis as { window?: unknown }).window = prevWindow;
	}
});

test("DoctorCbctPreferencesCard, DoctorCbctSettingsModal & DoctorClinicalPreferencesSection render cleanly without disabled CTA", () => {
	const cardHtml = renderToStaticMarkup(React.createElement(DoctorCbctPreferencesCard));
	assert.ok(cardHtml.includes('data-testid="doctor-cbct-preferences-card"'));
	assert.strictEqual(cardHtml.includes('disabled=""'), false);

	const modalClosed = renderToStaticMarkup(
		React.createElement(DoctorCbctSettingsModal, { isOpen: false, onClose: () => {} }),
	);
	assert.strictEqual(modalClosed, "");

	const sectionHtml = renderToStaticMarkup(
		React.createElement(DoctorClinicalPreferencesSection, {}),
	);
	assert.ok(sectionHtml.includes('data-testid="doctor-clinical-preferences-section"'));
	assert.ok(sectionHtml.includes("Клинические настройки врача"));
});
