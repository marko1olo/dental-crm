import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { WhatsappIntegrationHub } from "../WhatsappIntegrationHub.js";
import { WhatsappSettingsPanel } from "../WhatsappSettingsPanel.js";
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
	it("renders both connection modes (QR Code and Official WABA Cloud)", () => {
		const html = renderToStaticMarkup(
			<WhatsappIntegrationHub
				staffOptions={[{ id: "user-1", fullName: "Иванова А.В." }]}
				useSettingsHook={() => createMockSettingsHook()}
			/>,
		);

		// Проверяем наличие вкладок
		assert.ok(html.includes("Рабочий номер по QR-коду"), "Должна быть вкладка QR-кода");
		assert.ok(html.includes("Официальный WhatsApp Cloud (WABA)"), "Должна быть вкладка WABA");
		assert.ok(html.includes("data-testid=\"tab-qr-mode\""), "Должен быть data-testid вкладки QR");
		assert.ok(html.includes("data-testid=\"tab-waba-mode\""), "Должен быть data-testid вкладки WABA");
	});

	it("renders QR code session controls, timer and pairing code switch", () => {
		const html = renderToStaticMarkup(
			<WhatsappIntegrationHub
				staffOptions={[]}
				useSettingsHook={() => createMockSettingsHook()}
			/>,
		);

		assert.ok(html.includes("Обновление QR-кода через"), "Должен отображаться таймер обновления");
		assert.ok(html.includes("Обновить QR"), "Должна быть кнопка ручного обновления QR");
		assert.ok(html.includes("Код сопряжения"), "Должна быть кнопка переключения на Pairing Code");
		assert.ok(html.includes("Симулировать сканирование"), "Должна быть кнопка симуляции для тестов");
	});

	it("renders step-by-step accordion instructions for clinic staff", () => {
		const html = renderToStaticMarkup(
			<WhatsappIntegrationHub
				staffOptions={[]}
				useSettingsHook={() => createMockSettingsHook()}
			/>,
		);

		assert.ok(html.includes("Откройте WhatsApp на рабочем смартфоне клиники"), "Шаг 1 инструкции");
		assert.ok(html.includes("Связанные устройства"), "Шаг 2 инструкции");
		assert.ok(html.includes("Привязка устройства"), "Шаг 3 инструкции");
		assert.ok(html.includes("Технология Multi-Device"), "Памятка Multi-Device");
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
	});
});
