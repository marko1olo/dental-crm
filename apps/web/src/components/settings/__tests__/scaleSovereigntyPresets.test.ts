/**
 * apps/web/src/components/settings/__tests__/scaleSovereigntyPresets.test.ts (6G Live SUT)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	SCALE_PRESETS,
	ScaleSovereigntyPresetsBar,
} from "../ScaleSovereigntyPresetsBar";
import { SettingsModulesTab } from "../SettingsModulesTab";
import { MigrationWizard } from "../MigrationWizard";

const EMOJI_REGEX =
	/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}]/u;

describe("Scale Sovereignty Presets (Мгновенный старт без тупиков — 6G Live SUT)", () => {
	it("содержит ровно 3 ключевых масштаба клиники", () => {
		const presetIds = SCALE_PRESETS.map((p) => p.id);
		assert.deepEqual(presetIds, [
			"solo_therapist",
			"family_clinic",
			"enterprise",
		]);
	});

	it("пресет соло-врача (solo_therapist) полностью исключает избыточную бюрократию", () => {
		const solo = SCALE_PRESETS.find((p) => p.id === "solo_therapist");
		assert.ok(solo, "Пресет соло-врача должен существовать");

		assert.equal(solo.customFlags.hasAssistants, false);
		assert.equal(solo.customFlags.hasMultipleChairs, false);
		assert.equal(solo.customFlags.hasDentalLab, false);
		assert.equal(solo.customFlags.hasInsuranceCoPay, false);
		assert.equal(solo.customFlags.hasPayrollModule, false);
		assert.equal(solo.customFlags.hasMarketingModule, false);
		assert.equal(solo.customFlags.hasInventoryModule, false);
		assert.equal(solo.customFlags.hasClinicalRules, false);
		assert.equal(solo.customFlags.hasCsoScanner, false);
		assert.equal(solo.customFlags.hasLeadsKanban, false);
		assert.equal(solo.customFlags.numberOfDoctors, 1);
	});

	it("пресет малой клиники (family_clinic) включает ключевой базовый функционал", () => {
		const clinic = SCALE_PRESETS.find((p) => p.id === "family_clinic");
		assert.ok(clinic, "Пресет малой клиники должен существовать");

		assert.equal(clinic.customFlags.hasAssistants, true);
		assert.equal(clinic.customFlags.hasMultipleChairs, true);
		assert.equal(clinic.customFlags.hasDentalLab, true);
		assert.equal(clinic.customFlags.hasPayrollModule, true);
		assert.equal(clinic.customFlags.hasInventoryModule, true);
		assert.equal(clinic.customFlags.hasOmnichannel, true);
		assert.equal(clinic.customFlags.numberOfDoctors, 4);
	});

	it("пресет сети (enterprise) активирует полный масштаб управления", () => {
		const enterprise = SCALE_PRESETS.find((p) => p.id === "enterprise");
		assert.ok(enterprise, "Пресет enterprise должен существовать");

		assert.equal(enterprise.customFlags.hasAssistants, true);
		assert.equal(enterprise.customFlags.hasMultipleChairs, true);
		assert.equal(enterprise.customFlags.hasCsoScanner, true);
		assert.equal(enterprise.customFlags.hasLeadsKanban, true);
		assert.equal(enterprise.customFlags.hasClinicalRules, true);
		assert.equal(enterprise.customFlags.hasEngineeringStatus, true);
		assert.equal(enterprise.customFlags.numberOfDoctors, 10);
	});

	it("SettingsModulesTab рендерит ScaleSovereigntyPresetsBar со всеми 3 пресетами без эмодзи и без disabled", () => {
		const barHtml = renderToStaticMarkup(React.createElement(ScaleSovereigntyPresetsBar));
		const tabHtml = renderToStaticMarkup(React.createElement(SettingsModulesTab));

		assert.ok(tabHtml.includes("Модули и функции"));
		for (const preset of SCALE_PRESETS) {
			assert.ok(barHtml.includes(preset.title), `Bar must render ${preset.title}`);
			assert.ok(tabHtml.includes(preset.title), `SettingsModulesTab must render ${preset.title}`);
		}
		assert.equal(EMOJI_REGEX.test(tabHtml), false);
		assert.equal(tabHtml.includes('disabled=""'), false);
	});

	it("MigrationWizard рендерит мастер переноса без эмодзи и с доступными кнопками", () => {
		const wizardHtml = renderToStaticMarkup(React.createElement(MigrationWizard));
		assert.ok(wizardHtml.includes("Источник"));
		assert.equal(EMOJI_REGEX.test(wizardHtml), false);
		assert.equal(wizardHtml.includes('disabled=""'), false);
	});
});
