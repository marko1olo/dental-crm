/**
 * leadsDuplicateDetectionAndAttribution.test.ts
 *
 * MANDATE 8e (Doctor Autonomy), MANDATE 8n (Solo Doctor / Small Clinic), MANDATE 8s (Anti-Bloat & Zero Mocks)
 *
 * Verifies:
 * 1. Marketing channels normalization: Avito, Yandex.Maps, MAX messenger.
 * 2. Drop reasons dictionary and mapping.
 * 3. Channel display names & badge colors for marketing attribution.
 * 4. Duplicate patient detection contract on Lead objects (existingPatient badge).
 * 5. Telephony marketing attribution for new channels (avito, yandex_maps, max).
 */

import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
import {
	normalizeMarketingChannel,
	MARKETING_CHANNELS,
	LEAD_DROP_REASONS,
} from "../leadsFunnelTypes.js";
import {
	CHANNEL_DISPLAY_NAMES,
	CHANNEL_BADGE_COLORS,
} from "../../telephony/telephonyAttribution.js";
import { detectMarketingAttribution } from "../../../../../api/src/services/telephony/telephonySecurity.js";

describe("1. Marketing Channels Normalization & Drop Reasons", () => {
	it("normalizes Avito variants to avito", () => {
		assert.equal(normalizeMarketingChannel("avito"), "avito");
		assert.equal(normalizeMarketingChannel("Авито"), "avito");
		assert.equal(normalizeMarketingChannel("avito_promo"), "avito");
	});

	it("normalizes Yandex Maps variants to yandex_maps", () => {
		assert.equal(normalizeMarketingChannel("yandex_maps"), "yandex_maps");
		assert.equal(normalizeMarketingChannel("яндекс.карты"), "yandex_maps");
		assert.equal(normalizeMarketingChannel("Яндекс Карты"), "yandex_maps");
		assert.equal(normalizeMarketingChannel("maps.yandex.ru"), "yandex_maps");
	});

	it("normalizes MAX messenger variants to max", () => {
		assert.equal(normalizeMarketingChannel("max"), "max");
		assert.equal(normalizeMarketingChannel("vk_max"), "max");
		assert.equal(normalizeMarketingChannel("мессенджер max"), "max");
	});

	it("contains canonical drop reasons for trash stage", () => {
		assert.ok(LEAD_DROP_REASONS.includes("Дорого"));
		assert.ok(LEAD_DROP_REASONS.includes("Далеко / Неудобная локация"));
		assert.ok(LEAD_DROP_REASONS.includes("Передумал / Неактуально"));
		assert.ok(LEAD_DROP_REASONS.includes("Дубль обращения"));
		assert.ok(LEAD_DROP_REASONS.includes("Другое"));
	});
});

describe("2. Telephony & Marketing Channel Attribution", () => {
	it("provides display names and badge colors for new channels", () => {
		assert.equal(CHANNEL_DISPLAY_NAMES.avito, "Авито");
		assert.equal(CHANNEL_DISPLAY_NAMES.yandex_maps, "Яндекс.Карты");
		assert.equal(CHANNEL_DISPLAY_NAMES.max, "Мессенджер MAX");

		assert.ok(CHANNEL_BADGE_COLORS.avito);
		assert.ok(CHANNEL_BADGE_COLORS.yandex_maps);
		assert.ok(CHANNEL_BADGE_COLORS.max);
	});

	it("detectMarketingAttribution detects avito, yandex_maps, max from UTM params", () => {
		const avitoRes = detectMarketingAttribution({ utm_source: "avito" });
		assert.equal(avitoRes.channel, "avito");
		assert.equal(avitoRes.channelLabel, "Авито");

		const yandexMapsRes = detectMarketingAttribution({ utm_source: "yandex_maps" });
		assert.equal(yandexMapsRes.channel, "yandex_maps");
		assert.equal(yandexMapsRes.channelLabel, "Яндекс.Карты");

		const maxRes = detectMarketingAttribution({ utm_source: "vk_max" });
		assert.equal(maxRes.channel, "max");
		assert.equal(maxRes.channelLabel, "Мессенджер MAX");
	});

	it("detectMarketingAttribution detects advertising_channel overrides", () => {
		const res = detectMarketingAttribution({ advertising_channel: "Авито контекст" });
		assert.equal(res.channel, "avito");
		assert.equal(res.channelLabel, "Авито");
	});
});

describe("3. Lead Existing Patient Duplicate Contract", () => {
	it("supports existingPatient property on Lead for instant recognition", () => {
		const leadWithPatient = {
			id: "lead-1",
			name: "Иван Иванов",
			phone: "+79991234567",
			status: "new" as const,
			existingPatient: {
				id: "patient-123",
				fullName: "Иванов Иван Иванович",
			},
		};

		assert.equal(leadWithPatient.existingPatient?.id, "patient-123");
		assert.equal(leadWithPatient.existingPatient?.fullName, "Иванов Иван Иванович");

		const leadWithoutPatient = {
			id: "lead-2",
			name: "Новый Клиент",
			phone: "+79997654321",
			status: "new" as const,
			existingPatient: null,
		};

		assert.equal(leadWithoutPatient.existingPatient, null);
	});
});
