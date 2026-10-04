import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_PATIENT_BOT_COMMANDS,
	DEFAULT_STAFF_BOT_COMMANDS,
	TelegramBotHostingService,
} from "../services/telegram/TelegramBotHostingService.js";
import { TelegramPollingRunner } from "../services/telegram/TelegramPollingRunner.js";

describe("TelegramBotHostingService & VPS Deployment Suite", () => {
	describe("1. Token Validation & Command Menus", () => {
		it("rejects malformed bot tokens without colon separator", async () => {
			const result = await TelegramBotHostingService.verifyBotToken("invalidtoken123");
			assert.strictEqual(result.ok, false);
			assert.match(result.error ?? "", /Некорректный формат токена/);
		});

		it("rejects empty token", async () => {
			const result = await TelegramBotHostingService.verifyBotToken("");
			assert.strictEqual(result.ok, false);
			assert.match(result.error ?? "", /Некорректный формат токена/);
		});

		it("provides standard command catalog for patient bot", () => {
			const commands = DEFAULT_PATIENT_BOT_COMMANDS;
			assert.ok(commands.length >= 5);
			const startCmd = commands.find((c) => c.command === "start");
			const scheduleCmd = commands.find((c) => c.command === "schedule");
			const careCmd = commands.find((c) => c.command === "care");
			const docsCmd = commands.find((c) => c.command === "documents");

			assert.ok(startCmd, "Command /start must exist");
			assert.ok(scheduleCmd, "Command /schedule must exist");
			assert.ok(careCmd, "Command /care must exist");
			assert.ok(docsCmd, "Command /documents must exist");
		});

		it("provides specialized command catalog for clinic staff bot", () => {
			const commands = DEFAULT_STAFF_BOT_COMMANDS;
			assert.ok(commands.length >= 4);
			const scheduleCmd = commands.find((c) => c.command === "schedule");
			const tomorrowCmd = commands.find((c) => c.command === "tomorrow");
			const intercomCmd = commands.find((c) => c.command === "intercom");

			assert.ok(scheduleCmd, "Staff command /schedule must exist");
			assert.ok(tomorrowCmd, "Staff command /tomorrow must exist");
			assert.ok(intercomCmd, "Staff command /intercom must exist");
		});
	});

	describe("2. Clinical Post-Op Care Catalog (Medical Invariants)", () => {
		it("provides comprehensive extraction instructions adhering to SanPiN & clinical protocols", () => {
			const instruction = TelegramBotHostingService.getClinicalCareInstruction("extraction");
			assert.ok(instruction.title.includes("удаления"));
			assert.match(instruction.text, /НЕ ПОЛОСКАТЬ рот в первые 24 часа/i);
			assert.match(instruction.text, /Холод к щеке/i);
			assert.match(instruction.text, /Не пить напитки через трубочку/i);
			assert.match(instruction.text, /кровяной сгусток/i);
		});

		it("provides dental implantation and sinus lift instructions", () => {
			const instruction = TelegramBotHostingService.getClinicalCareInstruction("implantation");
			assert.ok(instruction.title.includes("имплантации"));
			assert.match(instruction.text, /синус-лифтинг/i);
			assert.match(instruction.text, /запрещено сильно сморкаться/i);
			assert.match(instruction.text, /ванночки с антисептиком/i);
		});

		it("provides professional hygiene Air-Flow white diet instructions", () => {
			const instruction = TelegramBotHostingService.getClinicalCareInstruction("hygiene");
			assert.ok(instruction.title.includes("гигиены"));
			assert.match(instruction.text, /белую диету/i);
			assert.match(instruction.text, /Замените зубную щетку на новую/i);
			assert.match(instruction.text, /48 часов/i);
		});

		it("provides filling restoration precautions regarding local anesthesia", () => {
			const instruction = TelegramBotHostingService.getClinicalCareInstruction("filling");
			assert.ok(instruction.title.includes("пломбирования"));
			assert.match(instruction.text, /Анестезия действует 2–4 часа/i);
			assert.match(instruction.text, /не прикусите губу/i);
		});

		it("provides endodontic canal post-treatment expectations", () => {
			const instruction = TelegramBotHostingService.getClinicalCareInstruction("endo");
			assert.ok(instruction.title.includes("корневых каналов"));
			assert.match(instruction.text, /болезненность при накусывании/i);
		});
	});

	describe("3. Telegram Intercom Ack Protocol", () => {
		it("rejects non-intercom callback formats gracefully", async () => {
			const result = await TelegramBotHostingService.handleIntercomAckCallback({
				organizationId: "00000000-0000-0000-0000-000000000001",
				callbackData: "some_other_action",
				chatFingerprint: "hash123",
			});
			assert.strictEqual(result.handled, false);
		});

		it("rejects malformed intercom_ack callbacks with insufficient parts", async () => {
			const result = await TelegramBotHostingService.handleIntercomAckCallback({
				organizationId: "00000000-0000-0000-0000-000000000001",
				callbackData: "intercom_ack:only_id",
				chatFingerprint: "hash123",
			});
			assert.strictEqual(result.handled, true);
			assert.strictEqual(result.ok, false);
			assert.match(result.responseText, /Неверный формат/);
		});
	});

	describe("4. Autonomous Long Polling Runner Lifecycle", () => {
		it("initializes in inactive state and toggles active state properly", () => {
			const runner = new TelegramPollingRunner({
				botToken: "123456:dummy-token",
				organizationId: "00000000-0000-0000-0000-000000000001",
				pollIntervalMs: 100,
				timeoutSeconds: 1,
				onUpdate: async () => {},
			});

			assert.strictEqual(runner.isActive(), false);
			runner.start();
			assert.strictEqual(runner.isActive(), true);
			runner.stop();
			assert.strictEqual(runner.isActive(), false);
		});
	});
});
