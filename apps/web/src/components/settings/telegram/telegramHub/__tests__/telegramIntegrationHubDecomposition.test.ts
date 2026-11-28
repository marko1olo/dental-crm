import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TelegramHubView } from "../TelegramHubView";
import {
	BOT_TOKEN_REGEX,
	DEFAULT_TELEGRAM_NOTIFICATION_TEMPLATES,
	INITIAL_TELEGRAM_QUEUE_ITEMS,
	TELEGRAM_TEMPLATE_VARIABLES,
	TG_CODE_LENGTH,
	TG_CODE_TIMER_DEFAULT_SECONDS,
} from "../constants";

const CARTOON_EMOJI_RE = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

test("Telegram Hub Constants: Bot token regex validates correct BotFather formats", () => {
	assert.equal(BOT_TOKEN_REGEX.test("123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ_12345678"), true);
	assert.equal(BOT_TOKEN_REGEX.test("9876543210:AAH_XYZ123456789abcdefghijklmnopqrstuvwxyz"), true);
	assert.equal(BOT_TOKEN_REGEX.test("123456789:short_token"), false);
	assert.equal(BOT_TOKEN_REGEX.test("invalid_token_without_colon"), false);
	assert.equal(BOT_TOKEN_REGEX.test(""), false);
});

test("Telegram Hub Constants: Default templates and variables integrity", () => {
	assert.ok(DEFAULT_TELEGRAM_NOTIFICATION_TEMPLATES.length >= 5);
	const reminder = DEFAULT_TELEGRAM_NOTIFICATION_TEMPLATES.find(
		(t) => t.code === "appointment_reminder",
	);
	assert.ok(reminder);
	assert.ok(reminder.templateText.includes("{patientName}"));
	assert.ok(reminder.templateText.includes("{clinicName}"));

	assert.equal(TG_CODE_LENGTH, 5);
	assert.equal(TG_CODE_TIMER_DEFAULT_SECONDS, 120);

	const patientNameVar = TELEGRAM_TEMPLATE_VARIABLES.find(
		(v) => v.key === "{patientName}",
	);
	assert.ok(patientNameVar);
	assert.equal(patientNameVar.label, "ФИО пациента");
});

test("Telegram Hub Constants: Initial queue items have valid statuses", () => {
	assert.ok(INITIAL_TELEGRAM_QUEUE_ITEMS.length >= 3);
	for (const item of INITIAL_TELEGRAM_QUEUE_ITEMS) {
		assert.ok(["sent", "queued", "failed", "sending", "cancelled"].includes(item.status));
		assert.ok(item.attempts <= item.maxAttempts);
		assert.ok(item.recipientName.length > 0);
	}
});

test("TelegramHubView renders all navigation tabs, live bot status, zero emojis, and unlocked buttons", () => {
	const html = renderToStaticMarkup(
		React.createElement(TelegramHubView, {
			clinicId: "clinic-tg-1",
			userId: "user-tg-1",
			botStatus: {
				configured: true,
				bot: {
					id: 10,
					username: "clinic_dental_bot",
					firstName: "Clinic Bot",
					canJoinGroups: false,
					canReadAllGroupMessages: false,
					supportsInlineQueries: false,
					tokenMasked: "123:***",
					webhookActive: true,
				},
			},
			isBotLoading: false,
			accountStatus: { connected: false },
			isAccountLoading: false,
			loadBotStatus: () => {},
			loadAccountStatus: () => {},
		}),
	);

	assert.ok(html.includes('data-testid="telegram-integration-hub"'));
	assert.ok(html.includes('data-testid="tg-hub-tab-bot"'));
	assert.ok(html.includes('data-testid="tg-hub-tab-account"'));
	assert.ok(html.includes('data-testid="tg-hub-tab-studio"'));
	assert.ok(html.includes("Бот Telegram"));
	assert.ok(html.includes("clinic_dental_bot"));
	assert.equal(CARTOON_EMOJI_RE.test(html), false);
	assert.equal(html.includes('disabled=""'), false);
});
