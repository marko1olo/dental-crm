import React from "react";
import fs from "fs";
import path from "path";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TelegramPhoneSimulator } from "../TelegramPhoneSimulator";
import { CLINICAL_BOT_PRESETS } from "../telegramBotPresets";
import {
	PhoneSimulatorScreen,
	PhoneSimulatorChatBubble,
	PhoneSimulatorInputBar,
	PhoneSimulatorPresetSelector,
	useTelegramPhoneSimulatorState,
} from "../phoneSimulator";

describe("TelegramPhoneSimulator Decomposition & Sweet Spot Suite (Mandates 8b/8zi, 8e, 8n, 8x)", () => {
	const baseDir = path.resolve(__dirname, "..");
	const facadePath = path.join(baseDir, "TelegramPhoneSimulator.tsx");
	const phoneSimDir = path.join(baseDir, "phoneSimulator");

	it("Facade TelegramPhoneSimulator.tsx is strictly <= 120 lines", () => {
		expect(fs.existsSync(facadePath)).toBe(true);
		const content = fs.readFileSync(facadePath, "utf-8");
		const lines = content.split(/\r?\n/).length;
		expect(lines).toBeLessThanOrEqual(120);
	});

	it("All submodules in phoneSimulator/ are strictly <= 500 lines (Sweet Spot)", () => {
		const files = [
			"PhoneSimulatorScreen.tsx",
			"PhoneSimulatorChatBubble.tsx",
			"PhoneSimulatorInputBar.tsx",
			"PhoneSimulatorPresetSelector.tsx",
			"useTelegramPhoneSimulatorState.ts",
			"scenarioScreens.ts",
			"types.ts",
		];

		for (const file of files) {
			const filePath = path.join(phoneSimDir, file);
			expect(fs.existsSync(filePath), `File ${file} should exist`).toBe(true);
			const raw = fs.readFileSync(filePath, "utf-8");
			const lineCount = raw.split(/\r?\n/).length;
			expect(lineCount).toBeLessThanOrEqual(500);
		}
	});

	it("TelegramPhoneSimulator renders complete phone mockup with status bar, preset ribbon, and input bar", () => {
		const preset = CLINICAL_BOT_PRESETS.premium;
		const html = renderToStaticMarkup(
			<TelegramPhoneSimulator preset={preset} channel="telegram" />,
		);

		// Status bar and notch
		expect(html).toContain("09:41");
		expect(html).toContain("tg-phone-notch-bar");

		// Header and channel styling
		expect(html).toContain("channel-telegram");
		expect(html).toContain("header-telegram");
		expect(html).toContain("Live");

		// Scenario presets
		expect(html).toContain("Приветствие");
		expect(html).toContain("Онлайн-запись");
		expect(html).toContain("Напоминание");
		expect(html).toContain("Смета и план");
		expect(html).toContain("Прейскурант");

		// Input bar
		expect(html).toContain("Напишите сообщение...");
		expect(html).toContain("Меню");
	});

	it("Correctly renders multichannel variants (VK, WhatsApp, MAX)", () => {
		const preset = CLINICAL_BOT_PRESETS.premium;

		// VK
		const vkHtml = renderToStaticMarkup(
			<TelegramPhoneSimulator preset={preset} channel="vk" />,
		);
		expect(vkHtml).toContain("channel-vk");
		expect(vkHtml).toContain("сообщество онлайн");

		// WhatsApp
		const waHtml = renderToStaticMarkup(
			<TelegramPhoneSimulator preset={preset} channel="whatsapp" />,
		);
		expect(waHtml).toContain("channel-whatsapp");
		expect(waHtml).toContain("официальный бизнес-аккаунт");

		// MAX Gateway
		const maxHtml = renderToStaticMarkup(
			<TelegramPhoneSimulator preset={preset} channel="max" />,
		);
		expect(maxHtml).toContain("channel-max");
		expect(maxHtml).toContain("корпоративный шлюз CRM");
	});

	it("Correctly switches scenarios and renders estimate and plan without Soviet bureaucrat numbers", () => {
		const preset = CLINICAL_BOT_PRESETS.premium;

		const estimateHtml = renderToStaticMarkup(
			<TelegramPhoneSimulator
				preset={preset}
				channel="telegram"
				previewScreenId="estimate"
			/>,
		);

		expect(estimateHtml).toContain("План лечения и согласованная смета");
		expect(estimateHtml).toContain("Согласовать план лечения");

		// Mandate 8x & 8ap: Zero Soviet decree numbers
		expect(estimateHtml).not.toContain("043/у");
		expect(estimateHtml).not.toContain("804н");
		expect(estimateHtml).not.toContain("54-ФЗ");
		expect(estimateHtml).not.toContain("StomX");
		expect(estimateHtml).not.toContain("DentalPRO");
	});

	it("PhoneSimulatorChatBubble correctly differentiates user outgoing and bot incoming bubbles", () => {
		const userMsg = {
			id: "u1",
			sender: "user" as const,
			text: "Здравствуйте, хочу записаться",
			time: "14:15",
			status: "read" as const,
		};

		const botMsg = {
			id: "b1",
			sender: "bot" as const,
			text: "Добрый день! Выберите направление:",
			time: "14:15",
			status: "read" as const,
			buttons: [[{ text: "Терапия", action: "action:select_therapy", isPrimary: true }]],
		};

		const userHtml = renderToStaticMarkup(
			<PhoneSimulatorChatBubble
				message={userMsg}
				channel="telegram"
				activeTheme="light"
			/>,
		);
		expect(userHtml).toContain("tg-user-bubble");
		expect(userHtml).toContain("Здравствуйте, хочу записаться");

		const botHtml = renderToStaticMarkup(
			<PhoneSimulatorChatBubble
				message={botMsg}
				channel="telegram"
				activeTheme="light"
			/>,
		);
		expect(botHtml).toContain("tg-bot-bubble-wrapper");
		expect(botHtml).toContain("Добрый день! Выберите направление:");
		expect(botHtml).toContain("Терапия");
		expect(botHtml).toContain("tg-btn-primary");
	});
});
