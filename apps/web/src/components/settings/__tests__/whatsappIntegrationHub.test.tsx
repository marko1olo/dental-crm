import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
	WhatsappIntegrationHub,
	WhatsappSettingsPanel,
} from "../WhatsappSettingsPanel.js";
import type {
	WhatsappSettings,
	WhatsappConnectionStatus,
	WhatsappSettingsLoadState,
	useWhatsappSettings,
} from "../../../hooks/useWhatsappSettings.js";

const SAMPLE_SETTINGS: WhatsappSettings = {
	id: "wa-settings-test-1",
	organizationId: "org-001",
	phoneNumberId: "109876543210987",
	hasToken: true,
	webhookVerifyToken: "my_verify_secret_123",
	enabledFeatures: ["appointment_reminders", "appointment_confirmation"],
	staffRouting: {
		defaultUserId: "user-1",
		rules: [],
	},
	isActive: true,
	updatedAt: "2026-10-05T12:00:00.000Z",
};

const SAMPLE_STATUS: WhatsappConnectionStatus = {
	channel: "whatsapp",
	connected: true,
	detail: "Подключен рабочий номер клиники",
};

const READY_LOAD_STATE: WhatsappSettingsLoadState = {
	phase: "ready",
	configured: true,
};

function createMockSettingsHook(): ReturnType<typeof useWhatsappSettings> {
	return {
		settings: SAMPLE_SETTINGS,
		status: SAMPLE_STATUS,
		statusUnknown: false,
		loading: false,
		loadState: READY_LOAD_STATE,
		loadFailureStatus: null,
		canSave: true,
		saveState: "idle",
		saveError: null,
		phoneNumberIdDraft: "109876543210987",
		setPhoneNumberIdDraft: () => {},
		accessTokenDraft: "",
		setAccessTokenDraft: () => {},
		webhookVerifyTokenDraft: "my_verify_secret_123",
		setWebhookVerifyTokenDraft: () => {},
		isActiveDraft: true,
		setIsActiveDraft: () => {},
		enabledFeaturesDraft: ["appointment_reminders", "appointment_confirmation"],
		setEnabledFeaturesDraft: () => {},
		staffRoutingDraft: {
			defaultUserId: "user-1",
			rules: [],
		},
		setStaffRoutingDraft: () => {},
		save: async () => {},
		reload: async () => {},
	};
}

describe("WhatsappIntegrationHub UI Component Tests", () => {
	it("renders both connection modes (Cloud API and QR Gateway)", () => {
		const html = renderToStaticMarkup(
			<WhatsappIntegrationHub
				staffOptions={[{ id: "user-1", fullName: "Иванова А.В." }]}
				useSettingsHook={() => createMockSettingsHook()}
			/>,
		);

		// Проверяем наличие режимов подключения
		assert.ok(html.includes("Meta Cloud API (Официальный)"), "Должна быть опция Meta Cloud API");
		assert.ok(html.includes("WhatsApp QR-шлюз"), "Должна быть опция QR-шлюза");
		assert.ok(html.includes("data-testid=\"wa-mode-cloud-btn\""), "Должен быть data-testid кнопки Cloud API");
		assert.ok(html.includes("data-testid=\"wa-mode-qr-btn\""), "Должен быть data-testid кнопки QR");
		assert.ok(html.includes("data-testid=\"whatsapp-mode-selector\""), "Должен быть data-testid селектора режима");
	});

	it("renders integrated WhatsappSettingsPanel with Hub controls without breaking legacy contract", () => {
		const html = renderToStaticMarkup(
			<WhatsappSettingsPanel
				staffOptions={[{ id: "user-1", fullName: "Иванова А.В." }]}
				useSettingsHook={() => createMockSettingsHook()}
			/>,
		);

		assert.ok(html.includes("whatsapp-panel") || html.includes("whatsapp-integration-hub"));
		assert.ok(html.includes("WhatsApp"));
		assert.ok(html.includes("Подключён"), "Должен отображаться статус подключения");
	});
});
