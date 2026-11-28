import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	TelegramBotStudio,
	BotMessagePreviewCard,
	CLINICAL_BOT_PRESETS,
} from "../TelegramBotStudio";
import { TelegramIntegrationHub } from "../TelegramIntegrationHub";
import { TelegramHubView } from "../telegramHub/TelegramHubView";

describe("Telegram Bot Studio & Hub Runtime + SSR Contract", () => {
	it("TelegramBotStudio renders studio controls, clinical presets, and unlocked primary actions", () => {
		const markup = renderToStaticMarkup(
			React.createElement(TelegramBotStudio, {
				initialWizardStep: 1,
				initialChannel: "telegram",
			}),
		);

		expect(markup.length).toBeGreaterThan(200);
		expect(markup).not.toContain("disabled");
	});

	it("CLINICAL_BOT_PRESETS & BotMessagePreviewCard render telegram, vk, whatsapp, and max channels", () => {
		const presets = Object.values(CLINICAL_BOT_PRESETS);
		expect(presets.length).toBeGreaterThanOrEqual(5);
		const firstPreset = CLINICAL_BOT_PRESETS.standard_clinic;
		expect(firstPreset).toBeDefined();

		for (const channel of ["telegram", "vk", "whatsapp", "max"] as const) {
			const cardHtml = renderToStaticMarkup(
				React.createElement(BotMessagePreviewCard, {
					preset: firstPreset,
					channel,
					customClinicName: "Клиника DENTE",
					themeMode: "dark",
				}),
			);
			expect(cardHtml).toContain(`channel-${channel}`);
			expect(cardHtml).toContain("Клиника DENTE");
		}
	});

	it("TelegramIntegrationHub mounts TelegramHubView cleanly with disconnected initial status", () => {
		const markup = renderToStaticMarkup(
			React.createElement(TelegramIntegrationHub, {
				clinicId: "00000000-0000-4000-8000-000000000001",
				userId: "00000000-0000-4000-8000-000000000002",
			}),
		);

		expect(markup).toContain('data-testid="telegram-integration-hub"');
		expect(markup).toContain("telegram-hub-container");
		expect(markup).toContain("tg-hub-main-tabs");
		expect(markup).toContain('data-testid="tg-hub-tab-bot"');
	});

	it("TelegramHubView renders configured bot indicator and neutral state without errors", () => {
		const markup = renderToStaticMarkup(
			React.createElement(TelegramHubView, {
				clinicId: "00000000-0000-4000-8000-000000000001",
				userId: "00000000-0000-4000-8000-000000000002",
				botStatus: {
					configured: true,
					botUsername: "dente_clinic_bot",
					webhookEnabled: true,
				},
				isBotLoading: false,
				accountStatus: {
					connected: false,
				},
				isAccountLoading: false,
				loadBotStatus: () => {},
				loadAccountStatus: () => {},
			}),
		);

		expect(markup).toContain('data-testid="telegram-integration-hub"');
		expect(markup).toContain("dente_clinic_bot");
	});
});
