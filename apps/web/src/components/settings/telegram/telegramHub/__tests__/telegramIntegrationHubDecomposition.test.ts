import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
	BOT_TOKEN_REGEX,
	DEFAULT_TELEGRAM_NOTIFICATION_TEMPLATES,
	INITIAL_TELEGRAM_QUEUE_ITEMS,
	TELEGRAM_TEMPLATE_VARIABLES,
	TG_CODE_LENGTH,
	TG_CODE_TIMER_DEFAULT_SECONDS,
} from "../constants";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("Telegram Hub Constants: Bot token regex validates correct BotFather formats", () => {
	// Exactly 35 chars after colon:
	assert.equal(BOT_TOKEN_REGEX.test("123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ_12345678"), true);
	// Longer token (42 chars):
	assert.equal(BOT_TOKEN_REGEX.test("9876543210:AAH_XYZ123456789abcdefghijklmnopqrstuvwxyz"), true);
	// Invalid: too short or missing colon:
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

test("Line Count Budget: All telegramHub files are strictly < 800 lines and facade <= 150 lines", () => {
	const hubDir = path.resolve(__dirname, "..");
	const files = fs.readdirSync(hubDir).filter((f) => /\.(ts|tsx)$/.test(f));

	for (const file of files) {
		const filePath = path.join(hubDir, file);
		const content = fs.readFileSync(filePath, "utf8");
		const lines = content.split("\n").length;
		assert.ok(
			lines <= 800,
			`File ${file} exceeds 800 lines limit (current: ${lines})`,
		);
	}

	const facadePath = path.resolve(hubDir, "..", "TelegramIntegrationHub.tsx");
	const facadeContent = fs.readFileSync(facadePath, "utf8");
	const facadeLines = facadeContent.split("\n").length;
	assert.ok(
		facadeLines <= 150,
		`Facade TelegramIntegrationHub.tsx exceeds 150 lines limit (current: ${facadeLines})`,
	);
});
