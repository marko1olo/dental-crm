/**
 * botStudioModal.test.tsx
 *
 * Unit tests for BotStudioModal, BotOnboardingWizard, TelegramPhoneSimulator,
 * and botZipGenerator (DENTE Bot Studio & Onboarding UI Inquisitor Suite).
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BotStudioModal } from "../components/settings/telegram/BotStudioModal";
import { BotOnboardingWizard } from "../components/settings/telegram/BotOnboardingWizard";
import { TelegramPhoneSimulator } from "../components/settings/telegram/TelegramPhoneSimulator";
import { CLINICAL_BOT_PRESETS } from "../components/settings/telegram/telegramBotPresets";
import {
	generateBotSourceEntries,
	buildZipArchive,
} from "../components/settings/telegram/botZipGenerator";

describe("BotStudioModal & Onboarding Suite", () => {
	it("BotStudioModal: does not render markup when isOpen is false", () => {
		const html = renderToStaticMarkup(
			<BotStudioModal isOpen={false} onClose={() => {}} />,
		);
		expect(html).toBe("");
	});


	it("BotStudioModal: renders complete macOS/iPad HIG modal structure when open", () => {
		const html = renderToStaticMarkup(
			<BotStudioModal isOpen={true} onClose={() => {}} initialChannel="telegram" />,
		);

		// Check modal accessibility attributes
		expect(html).toContain('role="dialog"');
		expect(html).toContain('aria-modal="true"');
		expect(html).toContain('aria-labelledby="bot-modal-title"');

		// Check header
		expect(html).toContain("Студия ботов DENTE: Быстрый запуск");
		expect(html).toContain("152-ФЗ Безопасно");

		// Check 2-column layout elements
		expect(html).toContain("bot-modal-wizard-col");
		expect(html).toContain("bot-modal-simulator-col");
	});

	it("BotOnboardingWizard: renders 4-step progress stepper and channel selectors", () => {
		const html = renderToStaticMarkup(<BotOnboardingWizard channel="telegram" />);

		// Stepper stages
		expect(html).toContain("Канал связи");
		expect(html).toContain("Профиль клиники");
		expect(html).toContain("Выбор плагинов");
		expect(html).toContain("Быстрый запуск");

		// 4 Channel cards
		expect(html).toContain("Telegram Bot");
		expect(html).toContain("ВКонтакте Сообщество");
		expect(html).toContain("WhatsApp Business");
		expect(html).toContain("MAX (1С:Медицина)");

		// Instructions and token input
		expect(html).toContain("@BotFather");
		expect(html).toContain("/newbot");
		expect(html).toContain("Проверить токен");
	});

	it("botZipGenerator: produces valid PKZIP byte headers and complete bot source package", () => {
		const entries = generateBotSourceEntries({
			channel: "telegram",
			clinicName: "DENTE VIP Clinic",
			clinicAddress: "Кутузовский проспект, 24",
			clinicPhone: "+7 (999) 000-00-00",
			botToken: "7123456789:AAH1bK_test_token",
			botUsername: "dente_vip_bot",
			welcomeText: "Добро пожаловать в DENTE VIP!",
			enabledPlugins: {
				onlineBooking: true,
				reminders: true,
				reviews: true,
				priceFaq: true,
				adminEscalation: true,
			},
		});

		// Check presence of essential autonomous package files
		const fileNames = entries.map((e) => e.name);
		expect(fileNames).toContain("package.json");
		expect(fileNames).toContain(".env.example");
		expect(fileNames).toContain("README.md");
		expect(fileNames).toContain("Dockerfile");
		expect(fileNames).toContain("index.js");
		expect(fileNames).toContain("manifest.json");

		// Build binary ZIP archive
		const zipBytes = buildZipArchive(entries);
		expect(zipBytes instanceof Uint8Array).toBe(true);
		expect(zipBytes.length).toBeGreaterThan(500);

		// Check standard PKZIP magic bytes PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
		expect(zipBytes[0]).toBe(0x50);
		expect(zipBytes[1]).toBe(0x4b);
		expect(zipBytes[2]).toBe(0x03);
		expect(zipBytes[3]).toBe(0x04);
	});

	it("TelegramPhoneSimulator: correctly adapts to different channels (Telegram, VK, WhatsApp, MAX)", () => {
		const preset = CLINICAL_BOT_PRESETS.premium;

		// 1. Telegram
		const tgHtml = renderToStaticMarkup(
			<TelegramPhoneSimulator preset={preset} channel="telegram" />,
		);
		expect(tgHtml).toContain("channel-telegram");
		expect(tgHtml).toContain("header-telegram");

		// 2. VK
		const vkHtml = renderToStaticMarkup(
			<TelegramPhoneSimulator preset={preset} channel="vk" />,
		);
		expect(vkHtml).toContain("channel-vk");
		expect(vkHtml).toContain("сообщество онлайн");

		// 3. WhatsApp
		const waHtml = renderToStaticMarkup(
			<TelegramPhoneSimulator preset={preset} channel="whatsapp" />,
		);
		expect(waHtml).toContain("channel-whatsapp");
		expect(waHtml).toContain("официальный бизнес-аккаунт");

		// 4. Plugin preview screens
		const bookingHtml = renderToStaticMarkup(
			<TelegramPhoneSimulator
				preset={preset}
				channel="telegram"
				previewScreenId="booking"
			/>,
		);
		expect(bookingHtml).toContain("Онлайн-запись на приём");

		const remindersHtml = renderToStaticMarkup(
			<TelegramPhoneSimulator
				preset={preset}
				channel="telegram"
				previewScreenId="reminders"
			/>,
		);
		expect(remindersHtml).toContain("Напоминание о визите");
		expect(remindersHtml).toContain("Да, я буду (Подтвердить)");

		const reviewsHtml = renderToStaticMarkup(
			<TelegramPhoneSimulator
				preset={preset}
				channel="telegram"
				previewScreenId="reviews"
			/>,
		);
		expect(reviewsHtml).toContain("Яндекс.Карты");
		expect(reviewsHtml).toContain("2ГИС");
	});
});

