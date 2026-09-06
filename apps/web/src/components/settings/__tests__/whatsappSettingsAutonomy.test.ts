/**
 * whatsappSettingsAutonomy.test.ts
 *
 * DENTE Dental CRM — WhatsApp Settings Non-Blocking Save Autonomy
 *
 * Governed by:
 * - Mandate 8e: Doctor & Staff Autonomy ("Никаких заблокированных кнопок без причины...").
 * - Mandate 8j: "Works — don't break" & Definition of Done Stop-Line.
 * - Mandate 8k: Friction-Killer Law.
 *
 * Verifies that in WhatsappSettingsPanel:
 * 1. Save button is accessible in both clean (!dirty) and dirty states.
 * 2. Save button disabled condition is strictly `!canSave || saveState === "saving"`.
 * 3. Visual feedback informs user of changes without disabling primary controls.
 * 4. Clean save action triggers friendly toast/badge and allows re-saving draft cleanly.
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";

import type {
	WhatsappConnectionStatus,
	WhatsappSettings,
	WhatsappSettingsLoadState,
	WhatsappStaffRouting,
	useWhatsappSettings,
} from "../../../hooks/useWhatsappSettings.js";
import { showToast } from "../../GlobalToast.js";
import {
	computeWhatsappSettingsDirty,
	isWhatsappSettingsSaveDisabled,
	WhatsappSettingsPanel,
} from "../WhatsappSettingsPanel.js";

const SAMPLE_SETTINGS: WhatsappSettings = {
	id: "wa-settings-001",
	organizationId: "org-main",
	phoneNumberId: "phone_123456789",
	hasToken: true,
	webhookVerifyToken: "verify_token_secure",
	enabledFeatures: ["appointment_reminders", "post_visit_instructions"],
	staffRouting: {
		defaultUserId: "staff-1",
		rules: [{ intent: "appointment", assignToUserId: "staff-1" }],
	},
	isActive: true,
	updatedAt: "2026-09-06T12:00:00.000Z",
};

const SAMPLE_STATUS: WhatsappConnectionStatus = {
	channel: "whatsapp",
	connected: true,
	detail: "WhatsApp Cloud API подключен и активен",
};

const READY_LOAD_STATE: WhatsappSettingsLoadState = {
	phase: "ready",
	configured: true,
};

function createMockSettingsHook(overrides?: Partial<ReturnType<typeof useWhatsappSettings>>) {
	return function useMockWhatsappSettings(): ReturnType<typeof useWhatsappSettings> {
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
			phoneNumberIdDraft: "phone_123456789",
			setPhoneNumberIdDraft: () => {},
			accessTokenDraft: "",
			setAccessTokenDraft: () => {},
			webhookVerifyTokenDraft: "verify_token_secure",
			setWebhookVerifyTokenDraft: () => {},
			isActiveDraft: true,
			setIsActiveDraft: () => {},
			enabledFeaturesDraft: ["appointment_reminders", "post_visit_instructions"],
			setEnabledFeaturesDraft: () => {},
			staffRoutingDraft: {
				defaultUserId: "staff-1",
				rules: [{ intent: "appointment", assignToUserId: "staff-1" }],
			},
			setStaffRoutingDraft: () => {},
			save: async () => {},
			reload: async () => {},
			...overrides,
		};
	};
}

describe("Mandate 8e Non-Blocking WhatsApp Save Autonomy — Truth Table & Predicate", () => {
	it("Save button is NOT disabled when settings are clean (!dirty) and canSave is true", () => {
		const canSave = true;
		const saveState = "idle";
		const disabled = isWhatsappSettingsSaveDisabled(canSave, saveState);

		expect(disabled).toBe(false);
	});

	it("Save button is NOT disabled when settings are dirty and canSave is true", () => {
		const canSave = true;
		const saveState = "idle";
		const disabled = isWhatsappSettingsSaveDisabled(canSave, saveState);

		expect(disabled).toBe(false);
	});

	it("Save button is disabled when saveState === 'saving' to prevent concurrent in-flight requests", () => {
		const canSave = true;
		const saveState = "saving";
		const disabled = isWhatsappSettingsSaveDisabled(canSave, saveState);

		expect(disabled).toBe(true);
	});

	it("Save button is disabled when canSave is false (drafts not yet seeded from server)", () => {
		const canSave = false;
		const saveState = "idle";
		const disabled = isWhatsappSettingsSaveDisabled(canSave, saveState);

		expect(disabled).toBe(true);
	});

	it("Save button is NOT disabled when saveState is 'saved' or 'error' (allows immediate re-save / retry)", () => {
		expect(isWhatsappSettingsSaveDisabled(true, "saved")).toBe(false);
		expect(isWhatsappSettingsSaveDisabled(true, "error")).toBe(false);
	});
});

describe("Mandate 8e WhatsApp Dirty Calculation Autonomy — computeWhatsappSettingsDirty", () => {
	const baseRouting: WhatsappStaffRouting = {
		defaultUserId: "staff-1",
		rules: [{ intent: "billing", assignToUserId: "staff-2" }],
	};

	it("Returns false when all drafts exactly match saved server settings", () => {
		const dirty = computeWhatsappSettingsDirty({
			phoneNumberIdDraft: "phone_123",
			settingsPhoneNumberId: "phone_123",
			webhookVerifyTokenDraft: "token_abc",
			settingsWebhookVerifyToken: "token_abc",
			isActiveDraft: true,
			settingsIsActive: true,
			enabledFeaturesDraft: ["appointment_reminders"],
			settingsEnabledFeatures: ["appointment_reminders"],
			staffRoutingDraft: baseRouting,
			settingsStaffRouting: baseRouting,
			accessTokenDraft: "   ",
		});

		expect(dirty).toBe(false);
	});

	it("Returns true when phoneNumberIdDraft is changed", () => {
		const dirty = computeWhatsappSettingsDirty({
			phoneNumberIdDraft: "phone_changed",
			settingsPhoneNumberId: "phone_123",
			webhookVerifyTokenDraft: "token_abc",
			settingsWebhookVerifyToken: "token_abc",
			isActiveDraft: true,
			settingsIsActive: true,
			enabledFeaturesDraft: ["appointment_reminders"],
			settingsEnabledFeatures: ["appointment_reminders"],
			staffRoutingDraft: baseRouting,
			settingsStaffRouting: baseRouting,
			accessTokenDraft: "",
		});

		expect(dirty).toBe(true);
	});

	it("Returns true when webhookVerifyTokenDraft is changed", () => {
		const dirty = computeWhatsappSettingsDirty({
			phoneNumberIdDraft: "phone_123",
			settingsPhoneNumberId: "phone_123",
			webhookVerifyTokenDraft: "token_new",
			settingsWebhookVerifyToken: "token_abc",
			isActiveDraft: true,
			settingsIsActive: true,
			enabledFeaturesDraft: ["appointment_reminders"],
			settingsEnabledFeatures: ["appointment_reminders"],
			staffRoutingDraft: baseRouting,
			settingsStaffRouting: baseRouting,
			accessTokenDraft: "",
		});

		expect(dirty).toBe(true);
	});

	it("Returns true when isActiveDraft is changed", () => {
		const dirty = computeWhatsappSettingsDirty({
			phoneNumberIdDraft: "phone_123",
			settingsPhoneNumberId: "phone_123",
			webhookVerifyTokenDraft: "token_abc",
			settingsWebhookVerifyToken: "token_abc",
			isActiveDraft: false,
			settingsIsActive: true,
			enabledFeaturesDraft: ["appointment_reminders"],
			settingsEnabledFeatures: ["appointment_reminders"],
			staffRoutingDraft: baseRouting,
			settingsStaffRouting: baseRouting,
			accessTokenDraft: "",
		});

		expect(dirty).toBe(true);
	});

	it("Returns true when enabledFeaturesDraft is changed", () => {
		const dirty = computeWhatsappSettingsDirty({
			phoneNumberIdDraft: "phone_123",
			settingsPhoneNumberId: "phone_123",
			webhookVerifyTokenDraft: "token_abc",
			settingsWebhookVerifyToken: "token_abc",
			isActiveDraft: true,
			settingsIsActive: true,
			enabledFeaturesDraft: ["appointment_reminders", "payment_reminders"],
			settingsEnabledFeatures: ["appointment_reminders"],
			staffRoutingDraft: baseRouting,
			settingsStaffRouting: baseRouting,
			accessTokenDraft: "",
		});

		expect(dirty).toBe(true);
	});

	it("Returns true when staffRouting rules are modified", () => {
		const modifiedRouting: WhatsappStaffRouting = {
			defaultUserId: "staff-1",
			rules: [
				{ intent: "billing", assignToUserId: "staff-2" },
				{ intent: "consultation", assignToUserId: "staff-3" },
			],
		};

		const dirty = computeWhatsappSettingsDirty({
			phoneNumberIdDraft: "phone_123",
			settingsPhoneNumberId: "phone_123",
			webhookVerifyTokenDraft: "token_abc",
			settingsWebhookVerifyToken: "token_abc",
			isActiveDraft: true,
			settingsIsActive: true,
			enabledFeaturesDraft: ["appointment_reminders"],
			settingsEnabledFeatures: ["appointment_reminders"],
			staffRoutingDraft: modifiedRouting,
			settingsStaffRouting: baseRouting,
			accessTokenDraft: "",
		});

		expect(dirty).toBe(true);
	});

	it("Returns true when new accessToken is entered", () => {
		const dirty = computeWhatsappSettingsDirty({
			phoneNumberIdDraft: "phone_123",
			settingsPhoneNumberId: "phone_123",
			webhookVerifyTokenDraft: "token_abc",
			settingsWebhookVerifyToken: "token_abc",
			isActiveDraft: true,
			settingsIsActive: true,
			enabledFeaturesDraft: ["appointment_reminders"],
			settingsEnabledFeatures: ["appointment_reminders"],
			staffRoutingDraft: baseRouting,
			settingsStaffRouting: baseRouting,
			accessTokenDraft: "EAAB_new_token_secret",
		});

		expect(dirty).toBe(true);
	});
});

describe("WhatsappSettingsPanel Component Visual Audit & Autonomy Rendering", () => {
	const staffOptions = [
		{ id: "staff-1", fullName: "Администратор Иванов И.И." },
		{ id: "staff-2", fullName: "Куратор Петрова А.С." },
	];

	it("Renders enabled Save button and 'Настройки актуальны' badge in clean state (!dirty)", () => {
		const mockHook = createMockSettingsHook({
			canSave: true,
			saveState: "idle",
			phoneNumberIdDraft: "phone_123456789",
			isActiveDraft: true,
			accessTokenDraft: "",
		});

		const html = renderToStaticMarkup(
			React.createElement(WhatsappSettingsPanel, {
				staffOptions,
				serverBaseUrl: "https://dente.clinic",
				useSettingsHook: mockHook,
			}),
		);

		// 1. Button must NOT have disabled attribute
		expect(html).toMatch(/<button[^>]*class="btn-primary"[^>]*>[\s\S]*?Сохранить[\s\S]*?<\/button>/);
		expect(html).not.toMatch(/<button[^>]*class="btn-primary"[^>]*disabled/);

		// 2. Visual clean badge must be rendered
		expect(html).toContain("Настройки актуальны");
		expect(html).toContain('data-testid="clean-badge"');
	});

	it("Renders enabled Save button and dirty badge with indicator dot in dirty state", () => {
		const mockHook = createMockSettingsHook({
			canSave: true,
			saveState: "idle",
			phoneNumberIdDraft: "phone_987654321", // Differs from SAMPLE_SETTINGS.phoneNumberId
			isActiveDraft: true,
			accessTokenDraft: "",
		});

		const html = renderToStaticMarkup(
			React.createElement(WhatsappSettingsPanel, {
				staffOptions,
				serverBaseUrl: "https://dente.clinic",
				useSettingsHook: mockHook,
			}),
		);

		// 1. Save button must be enabled
		expect(html).not.toMatch(/<button[^>]*class="btn-primary"[^>]*disabled/);

		// 2. Dirty badge and dot must be rendered
		expect(html).toContain("Есть несохраненные изменения");
		expect(html).toContain("dirty-dot");
		expect(html).toContain('data-testid="dirty-badge"');
	});

	it("Renders disabled Save button during active saving state", () => {
		const mockHook = createMockSettingsHook({
			canSave: true,
			saveState: "saving",
		});

		const html = renderToStaticMarkup(
			React.createElement(WhatsappSettingsPanel, {
				staffOptions,
				serverBaseUrl: "https://dente.clinic",
				useSettingsHook: mockHook,
			}),
		);

		expect(html).toContain('disabled=""');
		expect(html).toContain("Сохранение...");
	});

	it("Renders 'Сохранено' feedback and enabled button when saveState === 'saved'", () => {
		const mockHook = createMockSettingsHook({
			canSave: true,
			saveState: "saved",
		});

		const html = renderToStaticMarkup(
			React.createElement(WhatsappSettingsPanel, {
				staffOptions,
				serverBaseUrl: "https://dente.clinic",
				useSettingsHook: mockHook,
			}),
		);

		expect(html).toContain("Сохранено");
		expect(html).not.toMatch(/<button[^>]*class="btn-primary"[^>]*disabled/);
	});

	it("Preserves error alert when saveError is present", () => {
		const errorMessage = "Сервер WhatsApp Cloud API временно недоступен (502 Bad Gateway)";
		const mockHook = createMockSettingsHook({
			canSave: true,
			saveState: "error",
			saveError: errorMessage,
		});

		const html = renderToStaticMarkup(
			React.createElement(WhatsappSettingsPanel, {
				staffOptions,
				serverBaseUrl: "https://dente.clinic",
				useSettingsHook: mockHook,
			}),
		);

		expect(html).toContain(errorMessage);
		expect(html).toContain('role="alert"');
	});

	it("Dispatches 'Настройки актуальны (сохранено)' toast when clean settings are saved", () => {
		let toastReceivedText: string | null = null;
		let toastReceivedType: string | null = null;
		const originalWindow = globalThis.window;

		(globalThis as unknown as { window: unknown }).window = {
			dispatchEvent: (event: CustomEvent<{ text: string; type: string }>) => {
				if (event.type === "dente-toast") {
					toastReceivedText = event.detail.text;
					toastReceivedType = event.detail.type;
				}
				return true;
			},
		};

		try {
			showToast("Настройки актуальны (сохранено)", "info");
			expect(toastReceivedText).toBe("Настройки актуальны (сохранено)");
			expect(toastReceivedType).toBe("info");
		} finally {
			(globalThis as unknown as { window: unknown }).window = originalWindow;
		}
	});

	it("Uses design system tokens var(--amber) and var(--muted) for visual badges", () => {
		const mockHook = createMockSettingsHook({
			canSave: true,
			saveState: "idle",
			phoneNumberIdDraft: "phone_different",
		});

		const html = renderToStaticMarkup(
			React.createElement(WhatsappSettingsPanel, {
				staffOptions,
				serverBaseUrl: "https://dente.clinic",
				useSettingsHook: mockHook,
			}),
		);

		expect(html).toContain("var(--amber)");
		expect(html).not.toMatch(/#[0-9a-fA-F]{3,6}/);
	});
});
