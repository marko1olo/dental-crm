/**
 * marketingRomiEngine.test.ts — Unit tests for Dental Marketing ROMI calculation engine.
 *
 * Tests:
 * 1. Exact kopeck arithmetic and ROMI (%) calculations: ((Revenue - Spend) / Spend) * 100%
 * 2. Zero-spend / organic channel handling (100% organic, zero CAC)
 * 3. Break-even and negative ROMI (loss-making channels) handling
 * 4. Overall marketing summary aggregations, top channel recognition, and kopeck precision
 * 5. Input validation schemas and default dental advertising presets
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseKopecks, formatKopecksRu } from "../money.js";
import {
	advertisingChannelInputSchema,
	buildAdvertisingChannelMetric,
	calculateChannelRomi,
	calculateMarketingRomiSummary,
	DEFAULT_DENTAL_ADVERTISING_CHANNELS,
	type AdvertisingChannelInput,
} from "../marketing/marketingRomiEngine.js";

describe("Dental Marketing ROMI & Performance Engine", () => {
	it("1. calculateChannelRomi computes exact positive ROMI, CAC, and average check", () => {
		// Spend: 65,000 ₽ (6500000 kop), Patients: 24, Revenue: 345,000 ₽ (34500000 kop)
		// Profit: 280,000 ₽ (28000000 kop)
		// ROMI: (280000 / 65000) * 100 = 430.769... -> 430.8%
		// CAC: 65000 / 24 = 2708.33... -> 2708.33 ₽ (270833 kop)
		// Avg Check: 345000 / 24 = 14375 ₽ (1437500 kop)
		const spentKop = parseKopecks("65000.00");
		const revenueKop = parseKopecks("345000.00");
		const result = calculateChannelRomi(spentKop, 24, revenueKop);

		assert.equal(result.profitKopecks, parseKopecks("280000.00"));
		assert.equal(result.romiPercent, 430.8);
		assert.equal(result.romiStatus, "super_profitable");
		assert.ok(result.cacKopecks !== null);
		assert.equal(result.cacKopecks, Math.round(6500000 / 24));
		assert.ok(result.averageCheckKopecks !== null);
		assert.equal(result.averageCheckKopecks, Math.round(34500000 / 24));
	});

	it("2. calculateChannelRomi handles organic / word-of-mouth channel with zero spend", () => {
		// Spend: 0 ₽, Patients: 35, Revenue: 580,000 ₽
		const result = calculateChannelRomi(0, 35, parseKopecks("580000.00"));

		assert.equal(result.profitKopecks, parseKopecks("580000.00"));
		assert.equal(result.romiPercent, null); // Infinite / Organic
		assert.equal(result.romiStatus, "organic");
		assert.equal(result.cacKopecks, 0); // 0 ₽ cost per patient
		assert.ok(result.averageCheckKopecks !== null);
		assert.equal(result.averageCheckKopecks, Math.round(58000000 / 35));
	});

	it("3. calculateChannelRomi handles loss-making advertising channels (Negative ROMI)", () => {
		// Spend: 50,000 ₽, Patients: 2, Revenue: 15,000 ₽ (Loss: -35,000 ₽)
		// ROMI: ((15000 - 50000) / 50000) * 100 = -70.0%
		const result = calculateChannelRomi(parseKopecks("50000.00"), 2, parseKopecks("15000.00"));

		assert.equal(result.profitKopecks, parseKopecks("-35000.00"));
		assert.equal(result.romiPercent, -70.0);
		assert.equal(result.romiStatus, "loss");
		assert.equal(result.cacKopecks, parseKopecks("25000.00")); // 25,000 ₽ per patient
	});

	it("4. calculateChannelRomi handles exact break-even (ROMI = 0%)", () => {
		// Spend: 20,000 ₽, Revenue: 20,000 ₽
		const result = calculateChannelRomi(parseKopecks("20000.00"), 5, parseKopecks("20000.00"));

		assert.equal(result.profitKopecks, 0);
		assert.equal(result.romiPercent, 0.0);
		assert.equal(result.romiStatus, "break_even");
	});

	it("5. buildAdvertisingChannelMetric formats currencies and labels in Russian format", () => {
		const input: AdvertisingChannelInput = {
			id: "ch_test",
			channelKey: "yandex_maps",
			nameRu: "Яндекс.Карты (Гео)",
			categoryRu: "Гео-сервисы",
			spentKopecks: parseKopecks("25000.00"),
			primaryPatientsCount: 18,
			revenueKopecks: parseKopecks("210000.00"),
			notes: "Приоритетное размещение",
		};

		const metric = buildAdvertisingChannelMetric(input);

		assert.equal(metric.nameRu, "Яндекс.Карты (Гео)");
		assert.equal(metric.spentFormatted, formatKopecksRu(2500000));
		assert.equal(metric.revenueFormatted, formatKopecksRu(21000000));
		assert.equal(metric.profitFormatted, formatKopecksRu(18500000));
		assert.equal(metric.romiPercent, 740.0);
		assert.equal(metric.romiFormatted, "+740.0%");
		assert.equal(metric.romiStatus, "super_profitable");
	});

	it("6. calculateMarketingRomiSummary aggregates totals across all default channels", () => {
		const metrics = DEFAULT_DENTAL_ADVERTISING_CHANNELS.map(buildAdvertisingChannelMetric);
		const summary = calculateMarketingRomiSummary(metrics);

		assert.equal(summary.totalChannelsCount, 7);
		assert.equal(summary.activeChannelsCount, 7);

		// Total Spent: 65k + 25k + 18k + 0 + 15k + 22k + 10k = 155,000 ₽ = 15,500,000 kop
		assert.equal(summary.totalSpentKopecks, parseKopecks("155000.00"));

		// Total Patients: 24 + 18 + 12 + 35 + 9 + 8 + 6 = 112 patients
		assert.equal(summary.totalPrimaryPatientsCount, 112);

		// Total Revenue: 345k + 210k + 142k + 580k + 115k + 78k + 62k = 1,532,000 ₽
		assert.equal(summary.totalRevenueKopecks, parseKopecks("1532000.00"));

		// Total Profit: 1,532,000 - 155,000 = 1,377,000 ₽
		assert.equal(summary.totalProfitKopecks, parseKopecks("1377000.00"));

		// Overall ROMI: (1377000 / 155000) * 100 = 888.387... -> 888.4%
		assert.equal(summary.overallRomiPercent, 888.4);
		assert.equal(summary.overallRomiFormatted, "+888.4%");

		// Top channel by revenue is Сарафанное радио (580k)
		assert.equal(summary.topChannelName, "Сарафанное радио / Рекомендации пациентов");
		assert.equal(summary.profitableChannelsCount, 6);
		assert.equal(summary.organicChannelsCount, 1);
		assert.equal(summary.lossChannelsCount, 0);

		// Overall CAC: 155,000 ₽ / 112 = 1383.92 ₽
		assert.equal(summary.overallCacKopecks, Math.round(15500000 / 112));
	});

	it("7. advertisingChannelInputSchema validates valid inputs and rejects invalid ones", () => {
		const valid = {
			id: "ch_1",
			channelKey: "test",
			nameRu: "Тестовый канал",
			spentKopecks: 100000,
			primaryPatientsCount: 5,
			revenueKopecks: 500000,
		};
		assert.doesNotThrow(() => advertisingChannelInputSchema.parse(valid));

		const invalidNegative = {
			id: "ch_2",
			channelKey: "test",
			nameRu: "Тестовый канал",
			spentKopecks: -500, // Invalid negative
			primaryPatientsCount: 5,
			revenueKopecks: 500000,
		};
		assert.throws(() => advertisingChannelInputSchema.parse(invalidNegative));
	});
});
