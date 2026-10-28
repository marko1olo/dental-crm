/**
 * botSimulatorAndZip.test.tsx
 *
 * Unit tests for TelegramPhoneSimulator and botZipGenerator.
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TelegramPhoneSimulator } from "../components/settings/telegram/TelegramPhoneSimulator";
import { CLINICAL_BOT_PRESETS } from "../components/settings/telegram/telegramBotPresets";
import {
	generateBotSourceEntries,
	buildZipArchive,
} from "../components/settings/telegram/botZipGenerator";

describe("BotSimulator & botZipGenerator Suite", () => {
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

		const fileNames = entries.map((e) => e.name);
		expect(fileNames).toContain("package.json");
		expect(fileNames).toContain(".env.example");
		expect(fileNames).toContain("README.md");
		expect(fileNames).toContain("Dockerfile");
		expect(fileNames).toContain("index.js");
		expect(fileNames).toContain("manifest.json");

		const zipBytes = buildZipArchive(entries);
		expect(zipBytes instanceof Uint8Array).toBe(true);
		expect(zipBytes.length).toBeGreaterThan(500);

		// PKZIP magic bytes
		expect(zipBytes[0]).toBe(0x50);
		expect(zipBytes[1]).toBe(0x4b);
		expect(zipBytes[2]).toBe(0x03);
		expect(zipBytes[3]).toBe(0x04);
	});

	it("TelegramPhoneSimulator: correctly adapts to different channels", () => {
		const preset = CLINICAL_BOT_PRESETS.premium;

		const tgHtml = renderToStaticMarkup(
			<TelegramPhoneSimulator preset={preset} channel="telegram" />,
		);
		expect(tgHtml).toContain("channel-telegram");
		expect(tgHtml).toContain("header-telegram");

		const vkHtml = renderToStaticMarkup(
			<TelegramPhoneSimulator preset={preset} channel="vk" />,
		);
		expect(vkHtml).toContain("channel-vk");
		expect(vkHtml).toContain("сообщество онлайн");

		const waHtml = renderToStaticMarkup(
			<TelegramPhoneSimulator preset={preset} channel="whatsapp" />,
		);
		expect(waHtml).toContain("channel-whatsapp");
		expect(waHtml).toContain("официальный бизнес-аккаунт");

		const bookingHtml = renderToStaticMarkup(
			<TelegramPhoneSimulator preset={preset} channel="telegram" previewScreenId="booking" />,
		);
		expect(bookingHtml).toContain("Онлайн-запись на приём");

		const remindersHtml = renderToStaticMarkup(
			<TelegramPhoneSimulator preset={preset} channel="telegram" previewScreenId="reminders" />,
		);
		expect(remindersHtml).toContain("Напоминание о визите");
		expect(remindersHtml).toContain("Да, я буду (Подтвердить)");

		const reviewsHtml = renderToStaticMarkup(
			<TelegramPhoneSimulator preset={preset} channel="telegram" previewScreenId="reviews" />,
		);
		expect(reviewsHtml).toContain("Яндекс.Карты");
		expect(reviewsHtml).toContain("2ГИС");
	});
});
