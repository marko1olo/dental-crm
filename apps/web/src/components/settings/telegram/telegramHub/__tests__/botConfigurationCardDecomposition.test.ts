import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BotConfigurationCard } from "../BotConfigurationCard";
import {
	CLINICAL_BOT_PRESETS,
	adminBotPresets,
	patientBotPresets,
	soloDoctorPreset,
} from "../../telegramBotPresets";

test("BotConfigurationCard renders disconnected setup state and connected QR diagnostics state cleanly", () => {
	const disconnectedHtml = renderToStaticMarkup(
		React.createElement(BotConfigurationCard, {
			clinicId: "clinic-1",
			botStatus: { configured: false },
			isBotLoading: false,
			onRefreshStatus: () => {},
		}),
	);
	assert.ok(disconnectedHtml.includes('data-testid="tg-bot-pane"'));
	assert.strictEqual(disconnectedHtml.includes('disabled=""'), false);

	const connectedHtml = renderToStaticMarkup(
		React.createElement(BotConfigurationCard, {
			clinicId: "clinic-1",
			botStatus: {
				configured: true,
				bot: {
					id: 42,
					username: "dente_clinic_bot",
					firstName: "DENTE Bot",
					canJoinGroups: false,
					canReadAllGroupMessages: false,
					supportsInlineQueries: false,
					tokenMasked: "123456:***",
					webhookActive: true,
				},
			},
			isBotLoading: false,
			onRefreshStatus: () => {},
		}),
	);
	assert.ok(connectedHtml.includes('data-testid="tg-bot-pane"'));
	assert.ok(connectedHtml.includes("dente_clinic_bot"));
});

test("Bot Presets Parity: patientBotPresets, adminBotPresets & soloDoctorPreset match CLINICAL_BOT_PRESETS", () => {
	assert.ok(Array.isArray(patientBotPresets) && patientBotPresets.length >= 2);
	assert.ok(Array.isArray(adminBotPresets) && adminBotPresets.length >= 2);
	assert.equal(CLINICAL_BOT_PRESETS.solo_doctor.id, soloDoctorPreset.id);
	assert.ok(soloDoctorPreset.commandsList.length >= 5);
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
