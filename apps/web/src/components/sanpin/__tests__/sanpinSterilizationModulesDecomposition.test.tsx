import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
	SANPIN_STERILIZATION_REGIMES,
	SANPIN_PACKAGING_MATERIALS,
	validateSterilizationCycleParameters,
	calculatePackageExpiryDate,
	type SterilizationLogRecord,
} from "@dental/shared";

import {
	CycleParametersForm,
	CyclePresetsSelector,
	STATUTORY_REGIMES_OPTIONS,
	STATUTORY_PACKAGING_PRESETS,
	INITIAL_5_POINTS,
} from "../sterilizationModules";

describe("SanPiN 3.3686-21 — Sterilization Cycle Decomposed Architecture (Mandates 8b, 8d, 8e)", () => {
	it("verifies public export parity and component definitions", () => {
		assert.equal(typeof CycleParametersForm, "function");
		assert.equal(typeof CyclePresetsSelector, "function");
	});

	it("verifies all decomposed modules in sterilizationModules are strictly <= 350 lines (Mandate 8b)", () => {
		const decomposedDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../sterilizationModules");
		assert.ok(fs.existsSync(decomposedDir), "Decomposed directory must exist");
		const files = fs.readdirSync(decomposedDir);
		for (const file of files) {
			if (!file.endsWith(".ts") && !file.endsWith(".tsx")) continue;
			const filePath = path.join(decomposedDir, file);
			const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/).length;
			assert.ok(lines <= 350, `Module ${file} exceeds healthy limit of 350 lines (${lines} lines)`);
		}
	});

	it("renders CycleParametersForm and binds SanPiN normative regimes", () => {
		const regime = STATUTORY_REGIMES_OPTIONS[0]!;
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
			/>
		);

		assert.ok(html.includes("Стерилизационный аппарат клиники"), "Must have apparatus section");
		assert.ok(html.includes("134"), "Must contain 134 deg option");
		assert.ok(html.includes("121"), "Must contain 121 deg option");
		assert.ok(html.includes("Заполнить нормой"), "Must have fill norm action");
	});

	it("renders CyclePresetsSelector with 1-click clinical presets", () => {
		const html = renderToStaticMarkup(
			<CyclePresetsSelector
				selectedRegimeId="steam_134_5min"
				onSelectPreset={() => {}}
			/>
		);

		assert.ok(html.includes("Клинические пресеты цикла"), "Must render presets title");
		assert.ok(html.includes("134"), "Must render 134 deg preset");
		assert.ok(html.includes("121"), "Must render 121 deg preset");
	});

	it("validates SSOT packaging expiry calculations and parameters validation", () => {
		const validationResult = validateSterilizationCycleParameters("steam_134_5min", 134, 2.1, 5);
		assert.equal(validationResult.isValid, true, "134C / 2.1 bar / 5 min should be valid");

		const expiry = calculatePackageExpiryDate("2026-10-12", "kraft_self_seal");
		assert.ok(expiry.expiryDateFormatted.length > 0, "Expiry date must be calculated");
		assert.ok(expiry.shelfLifeDays > 0, "Shelf life days must be positive");
	});

	it("verifies zero cartoon emojis across decomposed files (Mandate 8d pt 7)", () => {
		const dirs = [
			path.resolve(process.cwd(), "apps/web/src/components/sanpin/sterilizationModules"),
		];

		for (const dir of dirs) {
			if (!fs.existsSync(dir)) continue;
			const files = fs.readdirSync(dir);
			for (const file of files) {
				if (!file.endsWith(".ts") && !file.endsWith(".tsx")) continue;
				const content = fs.readFileSync(path.join(dir, file), "utf8");
				const match = content.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u);
				assert.equal(match, null, `Found cartoon emoji in ${dir}/${file}`);
			}
		}
	});
});
