/**
 * apps/web/src/components/settings/__tests__/scaleSovereigntyPresets.test.ts
 *
 * Тесты на суверенитет масштаба (Scale Sovereignty):
 *  - 1-click пресеты для соло-врача, малой клиники и сетевой клиники.
 *  - Отсутствие перегруженности и бюрократических тупиков для соло-врача на субаренде.
 *  - Отсутствие эмодзи (Mandate 8d).
 *  - Потолок строк <= 800 (Mandate 8b).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { SCALE_PRESETS } from "../ScaleSovereigntyPresetsBar";

const here = fileURLToPath(import.meta.url);
const settingsDir = join(here, "..", "..");
const migrationDir = join(settingsDir, "migration");

describe("Scale Sovereignty Presets (Мгновенный старт без тупиков)", () => {
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

		// Врач на аренде не должен быть заблокирован требованием ассистента или склада
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

	it("SettingsModulesTab.tsx содержит плашку ScaleSovereigntyPresetsBar", () => {
		const tabCode = readFileSync(
			join(settingsDir, "SettingsModulesTab.tsx"),
			"utf8",
		);
		assert.match(tabCode, /<ScaleSovereigntyPresetsBar/);
		assert.match(
			tabCode,
			/import\s*\{\s*ScaleSovereigntyPresetsBar\s*\}\s*from/,
		);
	});
});

describe("Mandate 8b: Жесткий лимит строк (<= 800 строк на файл)", () => {
	const filesToCheck = [
		join(settingsDir, "ScaleSovereigntyPresetsBar.tsx"),
		join(settingsDir, "SettingsModulesTab.tsx"),
		join(settingsDir, "SettingsRulesTab.tsx"),
		join(settingsDir, "MigrationWizard.tsx"),
		join(migrationDir, "migrationTypes.ts"),
		join(migrationDir, "MigrationSourcePanel.tsx"),
		join(migrationDir, "MigrationMappingPanel.tsx"),
		join(migrationDir, "MigrationRunningPanel.tsx"),
		join(migrationDir, "MigrationReportPanel.tsx"),
		join(migrationDir, "MigrationDiscoveryPanel.tsx"),
	];

	for (const file of filesToCheck) {
		it(`файл ${file.split(/[\\/]/).pop()} строго <= 800 строк`, () => {
			const content = readFileSync(file, "utf8");
			const lineCount = content.split(/\r?\n/).length;
			assert.ok(
				lineCount <= 800,
				`Файл ${file} содержит ${lineCount} строк, что превышает лимит 800 строк (Mandate 8b)`,
			);
		});
	}
});

describe("Mandate 8d: Ноль мультяшных эмодзи", () => {
	const filesToCheck = [
		join(settingsDir, "ScaleSovereigntyPresetsBar.tsx"),
		join(settingsDir, "MigrationWizard.tsx"),
		join(migrationDir, "MigrationSourcePanel.tsx"),
		join(migrationDir, "MigrationMappingPanel.tsx"),
		join(migrationDir, "MigrationRunningPanel.tsx"),
		join(migrationDir, "MigrationReportPanel.tsx"),
		join(migrationDir, "MigrationDiscoveryPanel.tsx"),
	];

	// Unicode ranges for emojis
	const emojiRegex =
		/(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83d\ud83e][\ud000-\udfff])/g;

	for (const file of filesToCheck) {
		it(`файл ${file.split(/[\\/]/).pop()} не содержит эмодзи`, () => {
			const content = readFileSync(file, "utf8");
			const matches = content.match(emojiRegex);
			assert.equal(
				matches,
				null,
				`В файле ${file} найдены эмодзи: ${matches?.join(", ")}`,
			);
		});
	}
});
