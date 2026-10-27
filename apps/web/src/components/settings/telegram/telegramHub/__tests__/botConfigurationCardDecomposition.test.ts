import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { CLINICAL_BOT_PRESETS } from "../../telegramBotPresets";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("Mandate 8b Line Budget: botConfiguration micro-modules <= 120 lines and facades <= 15 lines", () => {
	const botConfigDir = path.resolve(__dirname, "..", "botConfiguration");
	const files = fs.readdirSync(botConfigDir).filter((f) => /\.(ts|tsx)$/.test(f));

	assert.ok(files.length >= 8, `Expected at least 8 files in botConfiguration, found ${files.length}`);

	for (const file of files) {
		const filePath = path.join(botConfigDir, file);
		const content = fs.readFileSync(filePath, "utf8");
		const lines = content.split("\n").length;
		if (file === "index.ts") {
			assert.ok(lines <= 15, `botConfiguration facade index.ts exceeds 15 lines: ${lines}`);
		} else {
			assert.ok(lines <= 120, `File ${file} exceeds 120 lines limit: ${lines}`);
		}
	}

	const facadePath = path.resolve(__dirname, "..", "BotConfigurationCard.tsx");
	const facadeContent = fs.readFileSync(facadePath, "utf8");
	const facadeLines = facadeContent.split("\n").length;
	assert.ok(facadeLines <= 15, `BotConfigurationCard.tsx facade exceeds 15 lines: ${facadeLines}`);
});

test("Mandate 8b Line Budget: botPresets micro-modules <= 120 lines and facades <= 15 lines", () => {
	const presetsDir = path.resolve(__dirname, "..", "..", "botPresets");
	const files = fs.readdirSync(presetsDir).filter((f) => /\.(ts|tsx)$/.test(f));

	assert.ok(files.length >= 7, `Expected at least 7 files in botPresets, found ${files.length}`);

	for (const file of files) {
		const filePath = path.join(presetsDir, file);
		const content = fs.readFileSync(filePath, "utf8");
		const lines = content.split("\n").length;
		if (file === "index.ts" || file === "patientBotPresets.ts" || file === "adminBotPresets.ts") {
			assert.ok(lines <= 15, `botPresets facade ${file} exceeds 15 lines: ${lines}`);
		} else {
			assert.ok(lines <= 120, `File ${file} exceeds 120 lines limit: ${lines}`);
		}
	}

	const presetsFacadePath = path.resolve(__dirname, "..", "..", "telegramBotPresets.ts");
	const presetsFacadeContent = fs.readFileSync(presetsFacadePath, "utf8");
	const presetsFacadeLines = presetsFacadeContent.split("\n").length;
	assert.ok(presetsFacadeLines <= 15, `telegramBotPresets.ts facade exceeds 15 lines: ${presetsFacadeLines}`);
});

test("Clinical Presets Integrity: all 5 clinical presets exist and contain required screens", () => {
	const presetIds = ["premium", "family", "orthodontics", "solo_doctor", "standard_clinic"] as const;
	for (const id of presetIds) {
		const preset = CLINICAL_BOT_PRESETS[id];
		assert.ok(preset, `Preset ${id} must exist in CLINICAL_BOT_PRESETS`);
		assert.equal(preset.id, id);
		assert.ok(preset.commandsList.length >= 5);
		assert.ok(preset.screens.root, `Preset ${id} must have a root screen`);
		assert.ok(preset.screens.appointment, `Preset ${id} must have an appointment screen`);
	}
});
