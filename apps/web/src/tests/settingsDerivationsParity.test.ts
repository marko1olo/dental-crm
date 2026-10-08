import "../../testCssStub.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {
	useSettingsDerivations,
	deriveScheduleSettings,
	deriveStaffSettings,
	deriveBillingSettings,
	deriveHardwareSettings,
	deriveTelegramSettings,
	deriveMigrationSettings,
} from "../useSettingsDerivations";

test("useSettingsDerivations facade exports all expected symbols", () => {
	assert.equal(typeof useSettingsDerivations, "function");
	assert.equal(typeof deriveScheduleSettings, "function");
	assert.equal(typeof deriveStaffSettings, "function");
	assert.equal(typeof deriveBillingSettings, "function");
	assert.equal(typeof deriveHardwareSettings, "function");
	assert.equal(typeof deriveTelegramSettings, "function");
	assert.equal(typeof deriveMigrationSettings, "function");
});

test("deriveScheduleSettings calculates status and options", () => {
	const res = deriveScheduleSettings({
		clinicProfileSaveState: "saved",
		clinicModeLabels: { solo_practice: "Индивидуальный приём" },
		dashboard: null,
		weekdayOptions: [{ value: 0, label: "Вс" }],
		uiLanguageOptions: [{ value: "ru", label: "Русский", detail: "Основной" }],
	});

	assert.equal(res.clinicProfileSaveButtonText, "Профиль сохранен");
	assert.deepEqual(res._typedClinicModes, ["solo_practice"]);
	assert.equal(res._typedWeekdayOptions.length, 1);
	assert.equal(res._typedUiLanguageOptions.length, 1);
});

test("deriveStaffSettings handles role queues and admin secrets", () => {
	const res = deriveStaffSettings({
		newStaffName: "Д-р Иванов",
		newChairName: "Кабинет 1",
		telegramAdminSecretDraft: "supersecret",
		settingsTab: "telegram",
		dashboard: null,
		telegramLinkStaffOptions: [],
		activeWorkspaceProfile: null,
	});

	assert.equal(res._newStaffReadyToCreate, true);
	assert.equal(res._newChairReadyToCreate, true);
	assert.equal(res._adminSecretReady, true);
	assert.match(res._adminSecretScopeWarning, /Telegram/);
});

test("deriveBillingSettings returns 8 clinical and service catalog projections", () => {
	const res = deriveBillingSettings({
		dashboard: null,
		clinicalRuleActionLabels: { alert_doctor: "Оповестить врача" },
		clinicalRuleSeverityLabels: { high: "Высокая" },
		serviceCategoryLabels: { therapy: "Терапия" },
	});

	assert.deepEqual(res.typedClinicalRuleActions, ["alert_doctor"]);
	assert.deepEqual(res.typedClinicalRuleSeverities, ["high"]);
	assert.deepEqual(res.typedServiceCategories, ["therapy"]);
	assert.deepEqual(res.typedClinicalRules, []);
	assert.deepEqual(res.typedServiceCatalog, []);
});

test("deriveTelegramSettings produces outbox and bot projections", () => {
	const res = deriveTelegramSettings({
		hiddenTelegramOutboxItemCount: 3,
		telegramInlineButtonRowsFromReplyMarkup: () => [],
		isTelegramLoading: true,
	});

	assert.equal(res.telegramOutboxBulkSendGuidance, "Дождитесь загрузки очереди Telegram.");
	assert.equal(res._telegramOutboxRemainingCount, 3);
});
