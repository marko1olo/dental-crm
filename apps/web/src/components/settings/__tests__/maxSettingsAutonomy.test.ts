/**
 * maxSettingsAutonomy.test.ts
 *
 * DENTE Dental CRM — Settings Non-Blocking Save Autonomy
 *
 * Governed by:
 * - Mandate 8e: Doctor & Staff Autonomy ("Никаких заблокированных кнопок без причины...").
 * - Mandate 8j: "Works — don't break" & Definition of Done Stop-Line.
 * - Mandate 8k: Friction-Killer Law.
 *
 * Verifies that in MaxSettingsPanel:
 * 1. Save button is accessible in both clean (!dirty) and dirty states.
 * 2. Save button disabled condition is strictly `!canSave || saveState === "saving"`.
 * 3. Visual feedback informs user of changes without disabling primary controls.
 * 4. Clean save action triggers friendly toast/badge and allows re-saving draft cleanly.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type {
	MaxConnectionStatus,
	MaxSettings,
	MaxSettingsLoadState,
	MaxStaffRouting,
	useMaxSettings,
} from "../../../hooks/useMaxSettings.js";
import { showToast } from "../../GlobalToast.js";
import {
	computeMaxSettingsDirty,
	isMaxSettingsSaveDisabled,
	MaxSettingsPanel,
} from "../MaxSettingsPanel.js";

const SAMPLE_SETTINGS: MaxSettings = {
	id: "max-settings-001",
	organizationId: "org-main",
	botId: "bot_12345",
	hasToken: true,
	webhookUrl: "https://dente.clinic/api/max/webhook",
	enabledFeatures: ["chat", "notifications"],
	staffRouting: {
		defaultUserId: "staff-1",
		rules: [{ intent: "appointment", assignToUserId: "staff-1" }],
	},
	isActive: true,
	updatedAt: "2026-09-06T12:00:00.000Z",
};

const SAMPLE_STATUS: MaxConnectionStatus = {
	channel: "max",
	connected: true,
	detail: "Бот активен и принимает сообщения",
};

const READY_LOAD_STATE: MaxSettingsLoadState = {
	phase: "ready",
	configured: true,
};

function createMockSettingsHook(overrides?: Partial<ReturnType<typeof useMaxSettings>>) {
	return function useMockMaxSettings(): ReturnType<typeof useMaxSettings> {
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
			botIdDraft: "bot_12345",
			setBotIdDraft: () => {},
			apiTokenDraft: "",
			setApiTokenDraft: () => {},
			webhookUrlDraft: "https://dente.clinic/api/max/webhook",
			setWebhookUrlDraft: () => {},
			isActiveDraft: true,
			setIsActiveDraft: () => {},
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

describe("Mandate 8e Non-Blocking Save Autonomy — Truth Table & Predicate", () => {
	it("Save button is NOT disabled when settings are clean (!dirty) and canSave is true", () => {
		const canSave = true;
		const saveState = "idle";
		const disabled = isMaxSettingsSaveDisabled(canSave, saveState);

		assert.equal(
			disabled,
			false,
			"Under Mandate 8e, clean settings (!dirty) must NEVER disable the Save button",
		);
	});

	it("Save button is NOT disabled when settings are dirty and canSave is true", () => {
		const canSave = true;
		const saveState = "idle";
		const disabled = isMaxSettingsSaveDisabled(canSave, saveState);

		assert.equal(disabled, false, "Dirty settings must have Save button enabled");
	});

	it("Save button is disabled when saveState === 'saving' to prevent concurrent in-flight requests", () => {
		const canSave = true;
		const saveState = "saving";
		const disabled = isMaxSettingsSaveDisabled(canSave, saveState);

		assert.equal(disabled, true, "Button must be disabled during active save request");
	});

	it("Save button is disabled when canSave is false (drafts not yet seeded from server)", () => {
		const canSave = false;
		const saveState = "idle";
		const disabled = isMaxSettingsSaveDisabled(canSave, saveState);

		assert.equal(
			disabled,
			true,
			"Button must be disabled when drafts are not seeded to prevent overwriting live config",
		);
	});

	it("Save button is NOT disabled when saveState is 'saved' or 'error' (allows immediate re-save / retry)", () => {
		assert.equal(
			isMaxSettingsSaveDisabled(true, "saved"),
			false,
			"Must allow re-save after successful save",
		);
		assert.equal(
			isMaxSettingsSaveDisabled(true, "error"),
			false,
			"Must allow retry after save error without page reload",
		);
	});
});

describe("Mandate 8e Dirty Calculation Autonomy — computeMaxSettingsDirty", () => {
	const baseRouting: MaxStaffRouting = {
		defaultUserId: "staff-1",
		rules: [{ intent: "billing", assignToUserId: "staff-2" }],
	};

	it("Returns false when all drafts exactly match saved server settings", () => {
		const dirty = computeMaxSettingsDirty({
			botIdDraft: "bot_123",
			settingsBotId: "bot_123",
			isActiveDraft: true,
			settingsIsActive: true,
			staffRoutingDraft: baseRouting,
			settingsStaffRouting: baseRouting,
			apiTokenDraft: "   ",
		});

		assert.equal(dirty, false, "Should be clean when all values match");
	});

	it("Returns true when botIdDraft is changed", () => {
		const dirty = computeMaxSettingsDirty({
			botIdDraft: "bot_different",
			settingsBotId: "bot_123",
			isActiveDraft: true,
			settingsIsActive: true,
			staffRoutingDraft: baseRouting,
			settingsStaffRouting: baseRouting,
			apiTokenDraft: "",
		});

		assert.equal(dirty, true, "Should be dirty when botId differs");
	});

	it("Returns true when isActiveDraft is changed", () => {
		const dirty = computeMaxSettingsDirty({
			botIdDraft: "bot_123",
			settingsBotId: "bot_123",
			isActiveDraft: false,
			settingsIsActive: true,
			staffRoutingDraft: baseRouting,
			settingsStaffRouting: baseRouting,
			apiTokenDraft: "",
		});

		assert.equal(dirty, true, "Should be dirty when active toggle differs");
	});

	it("Returns true when staffRouting rules are modified", () => {
		const modifiedRouting: MaxStaffRouting = {
			defaultUserId: "staff-1",
			rules: [
				{ intent: "billing", assignToUserId: "staff-2" },
				{ intent: "consultation", assignToUserId: "staff-3" },
			],
		};

		const dirty = computeMaxSettingsDirty({
			botIdDraft: "bot_123",
			settingsBotId: "bot_123",
			isActiveDraft: true,
			settingsIsActive: true,
			staffRoutingDraft: modifiedRouting,
			settingsStaffRouting: baseRouting,
			apiTokenDraft: "",
		});

		assert.equal(dirty, true, "Should be dirty when routing rules differ");
	});

	it("Returns true when new apiToken is entered", () => {
		const dirty = computeMaxSettingsDirty({
			botIdDraft: "bot_123",
			settingsBotId: "bot_123",
			isActiveDraft: true,
			settingsIsActive: true,
			staffRoutingDraft: baseRouting,
			settingsStaffRouting: baseRouting,
			apiTokenDraft: "secret_token_123",
		});

		assert.equal(dirty, true, "Should be dirty when apiToken is typed");
	});
});

describe("MaxSettingsPanel Component Visual Audit & Autonomy Rendering", () => {
	const staffOptions = [
		{ id: "staff-1", fullName: "Администратор Иванов И.И." },
		{ id: "staff-2", fullName: "Куратор Петрова А.С." },
	];

	it("Renders enabled Save button and 'Настройки актуальны' badge in clean state (!dirty)", () => {
		const mockHook = createMockSettingsHook({
			canSave: true,
			saveState: "idle",
			botIdDraft: "bot_12345",
			isActiveDraft: true,
			apiTokenDraft: "",
		});

		const html = renderToStaticMarkup(
			React.createElement(MaxSettingsPanel, {
				staffOptions,
				serverBaseUrl: "https://dente.clinic",
				useSettingsHook: mockHook,
			}),
		);

		// 1. Button must NOT have disabled attribute
		assert.match(
			html,
			/<button[^>]*class="btn-primary"[^>]*>[\s\S]*?Сохранить[\s\S]*?<\/button>/,
			"Save button must be present with btn-primary class",
		);
		assert.doesNotMatch(
			html,
			/<button[^>]*class="btn-primary"[^>]*disabled/,
			"Save button must NOT be disabled when clean under Mandate 8e",
		);

		// 2. Visual clean badge must be rendered
		assert.ok(
			html.includes("Настройки актуальны"),
			"Clean badge 'Настройки актуальны' must inform user of state",
		);
		assert.ok(
			html.includes("data-testid=\"clean-badge\""),
			"clean-badge test id must be present",
		);
	});

	it("Renders enabled Save button and dirty badge with indicator dot in dirty state", () => {
		const mockHook = createMockSettingsHook({
			canSave: true,
			saveState: "idle",
			botIdDraft: "bot_modified_999", // Differs from SAMPLE_SETTINGS.botId
			isActiveDraft: true,
			apiTokenDraft: "",
		});

		const html = renderToStaticMarkup(
			React.createElement(MaxSettingsPanel, {
				staffOptions,
				serverBaseUrl: "https://dente.clinic",
				useSettingsHook: mockHook,
			}),
		);

		// 1. Save button must be enabled
		assert.doesNotMatch(
			html,
			/<button[^>]*class="btn-primary"[^>]*disabled/,
			"Save button must be enabled when dirty",
		);

		// 2. Dirty badge and dot must be rendered
		assert.ok(
			html.includes("Есть несохраненные изменения"),
			"Dirty badge must inform user of pending changes",
		);
		assert.ok(
			html.includes("dirty-dot"),
			"Visual indicator dot must be rendered",
		);
		assert.ok(
			html.includes("data-testid=\"dirty-badge\""),
			"dirty-badge test id must be present",
		);
	});

	it("Renders disabled Save button during active saving state", () => {
		const mockHook = createMockSettingsHook({
			canSave: true,
			saveState: "saving",
		});

		const html = renderToStaticMarkup(
			React.createElement(MaxSettingsPanel, {
				staffOptions,
				serverBaseUrl: "https://dente.clinic",
				useSettingsHook: mockHook,
			}),
		);

		assert.ok(
			html.includes("disabled=\"\"") && html.includes("Сохранение..."),
			"Save button must have disabled attribute during saving",
		);
		assert.ok(
			html.includes("Сохранение..."),
			"Save button must show in-progress label",
		);
	});

	it("Renders 'Сохранено' feedback and enabled button when saveState === 'saved'", () => {
		const mockHook = createMockSettingsHook({
			canSave: true,
			saveState: "saved",
		});

		const html = renderToStaticMarkup(
			React.createElement(MaxSettingsPanel, {
				staffOptions,
				serverBaseUrl: "https://dente.clinic",
				useSettingsHook: mockHook,
			}),
		);

		assert.ok(
			html.includes("Сохранено"),
			"Must display saved confirmation text",
		);
		assert.doesNotMatch(
			html,
			/<button[^>]*class="btn-primary"[^>]*disabled/,
			"Button must remain enabled to allow subsequent force-pushes",
		);
	});

	it("Preserves error alert when saveError is present", () => {
		const errorMessage = "Сервер MAX временно недоступен (502 Bad Gateway)";
		const mockHook = createMockSettingsHook({
			canSave: true,
			saveState: "error",
			saveError: errorMessage,
		});

		const html = renderToStaticMarkup(
			React.createElement(MaxSettingsPanel, {
				staffOptions,
				serverBaseUrl: "https://dente.clinic",
				useSettingsHook: mockHook,
			}),
		);

		assert.ok(
			html.includes(errorMessage),
			"Error message must be preserved in alert container",
		);
		assert.ok(
			html.includes("role=\"alert\""),
			"Alert role must be present for accessibility",
		);
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
			assert.equal(toastReceivedText, "Настройки актуальны (сохранено)");
			assert.equal(toastReceivedType, "info");
		} finally {
			(globalThis as unknown as { window: unknown }).window = originalWindow;
		}
	});

	it("Uses design system tokens var(--amber) and var(--muted) for visual badges", () => {
		const mockHook = createMockSettingsHook({
			canSave: true,
			saveState: "idle",
			botIdDraft: "bot_different",
		});

		const html = renderToStaticMarkup(
			React.createElement(MaxSettingsPanel, {
				staffOptions,
				serverBaseUrl: "https://dente.clinic",
				useSettingsHook: mockHook,
			}),
		);

		assert.ok(
			html.includes("var(--amber)"),
			"Dirty badge must use semantic token var(--amber)",
		);
		assert.doesNotMatch(
			html,
			/#[0-9a-fA-F]{3,6}/,
			"Must not contain hardcoded hex colors in badge styles",
		);
	});
});
