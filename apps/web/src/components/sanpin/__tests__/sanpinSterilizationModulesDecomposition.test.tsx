import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
	validateSterilizationCycleParameters,
	calculatePackageExpiryDate,
} from "@dental/shared";
import {
	CycleParametersForm,
	CyclePresetsSelector,
	STATUTORY_REGIMES_OPTIONS,
	STATUTORY_PACKAGING_PRESETS,
	INITIAL_5_POINTS,
} from "../sterilizationModules";

const REAL_HTML_DISABLED_BTN_REGEX = /<button[^>]*\sdisabled(?:=["'][^"']*["'])?(?=[\s>])/i;

describe("SanPiN 3.3686-21 — Sterilization Cycle Decomposed Architecture (Mandates 8b, 8d, 8e)", () => {
	it("verifies public export parity and preset definitions", () => {
		assert.equal(typeof CycleParametersForm, "function");
		assert.equal(typeof CyclePresetsSelector, "function");
		assert.ok(STATUTORY_REGIMES_OPTIONS.length >= 2);
		assert.ok(STATUTORY_PACKAGING_PRESETS.length >= 1);
		assert.equal(INITIAL_5_POINTS.length, 5);
	});

	it("renders CycleParametersForm and binds SanPiN normative regimes without disabled buttons", () => {
		const regime = STATUTORY_REGIMES_OPTIONS[0];
		assert.ok(regime);
		const html = renderToStaticMarkup(
			<CycleParametersForm
				cycleDate="2026-10-12"
				onCycleDateChange={() => {}}
				cycleTime="10:30"
				onCycleTimeChange={() => {}}
				cycleNumber={4}
				onCycleNumberChange={() => {}}
				selectedDeviceId="melag_vacuklav_23b"
				onDeviceChange={() => {}}
				clinicDevices={[]}
				selectedRegimeId={regime.id}
				onRegimeChange={() => {}}
				selectedRegime={regime}
				actualTemp={134.5}
				onActualTempChange={() => {}}
				actualPressure={2.12}
				onActualPressureChange={() => {}}
				actualDuration={5.5}
				onActualDurationChange={() => {}}
				onFillNormIn1Click={() => {}}
			/>,
		);

		assert.ok(html.includes("Стерилизационный аппарат клиники"));
		assert.ok(html.includes("134"));
		assert.ok(html.includes("121"));
		assert.ok(html.includes("Заполнить нормой"));
		assert.equal(REAL_HTML_DISABLED_BTN_REGEX.test(html), false);
		assert.equal(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(html.replace(/[✓✕•→]/g, "")), false);
	});

	it("renders CyclePresetsSelector with clinical presets and zero emojis", () => {
		const html = renderToStaticMarkup(
			<CyclePresetsSelector
				selectedRegimeId="steam_134_5min"
				onSelectPreset={() => {}}
			/>,
		);

		assert.ok(html.includes("Клинические пресеты цикла"));
		assert.ok(html.includes("134"));
		assert.ok(html.includes("121"));
		assert.equal(REAL_HTML_DISABLED_BTN_REGEX.test(html), false);
		assert.equal(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(html.replace(/[✓✕•→]/g, "")), false);
	});

	it("validates SSOT packaging expiry calculations and parameters validation", () => {
		const validationResult = validateSterilizationCycleParameters("steam_134_5min", 134, 2.1, 5);
		assert.equal(validationResult.isValid, true);

		const expiry = calculatePackageExpiryDate("2026-10-12", "kraft_self_seal");
		assert.ok(expiry.expiryDateFormatted.length > 0);
		assert.ok(expiry.shelfLifeDays > 0);
	});
});
