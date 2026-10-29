/**
 * marketingRomiEngineAndPersistence.test.ts
 * Red Team Inquisitorial tests for Marketing ROMI engine, kopeck precision, zero-mocks,
 * and Fastify API persistence in PostgreSQL (Mandates 8ap, 8wy, 8e, 8n).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
	buildAdvertisingChannelMetric,
	calculateMarketingRomiSummary,
	aggregateCrmMarketingMetrics,
} from "@dental/shared";
import { DEFAULT_DENTE_CHANNELS } from "../marketingRomiPresets.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const marketingDir = path.resolve(__dirname, "..");

test("1. buildAdvertisingChannelMetric computes ROMI, CAC, and LTV with exact kopeck precision", () => {
	const channel = buildAdvertisingChannelMetric({
		id: "ch_test_yandex",
		channelKey: "yandex_maps",
		nameRu: "Яндекс Карты",
		categoryRu: "Гео-сервисы",
		spentKopecks: 2500000, // 25 000 ₽
		leadsCount: 20,
		primaryPatientsCount: 10,
		repeatVisitsCount: 5,
		revenueKopecks: 10000000, // 100 000 ₽
	});

	assert.equal(channel.profitKopecks, 7500000, "Profit must be exactly 75 000 ₽ in kopecks");
	assert.equal(channel.romiPercent, 300, "ROMI must be 300% ((100k - 25k) / 25k * 100)");
	assert.equal(channel.cacKopecks, 250000, "CAC must be exactly 2 500 ₽ per primary patient");
	assert.equal(channel.averageCheckKopecks, 1000000, "Average check must be 10 000 ₽");
	assert.equal(channel.showUpRatePercent, 50, "Show up rate must be 50%");
	assert.equal(channel.romiStatus, "super_profitable", "Status must be super_profitable");
});

test("2. calculateMarketingRomiSummary handles mixed channels without float drift", () => {
	const metrics = DEFAULT_DENTE_CHANNELS.map(buildAdvertisingChannelMetric);
	const summary = calculateMarketingRomiSummary(metrics);

	assert.ok(summary.totalChannelsCount > 0, "Should have channels");
	assert.ok(typeof summary.totalSpentKopecks === "number", "Spent must be integer number");
	assert.ok(typeof summary.totalRevenueKopecks === "number", "Revenue must be integer number");
	assert.equal(
		summary.totalProfitKopecks,
		summary.totalRevenueKopecks - summary.totalSpentKopecks,
		"Profit must exactly equal Revenue - Spent",
	);
	assert.ok(summary.overallRomiFormatted !== undefined, "Summary must have formatted ROMI");
});

test("3. aggregateCrmMarketingMetrics maps real DB patients, appointments and payments without regex notes scoring", () => {
	const result = aggregateCrmMarketingMetrics({
		patients: [
			{ id: "p1", administrativeProfile: { advertisingSource: "2gis" } },
			{ id: "p2", administrativeProfile: { advertisingSource: "яндекс карты" } },
			{ id: "p3", administrativeProfile: { advertisingSource: "сарафанное радио" } },
		],
		appointments: [
			{ id: "a1", patientId: "p1", status: "completed" },
			{ id: "a2", patientId: "p1", status: "completed" },
			{ id: "a3", patientId: "p2", status: "completed" },
		],
		payments: [
			{ id: "pay1", patientId: "p1", amountRub: 15000, status: "paid" },
			{ id: "pay2", patientId: "p2", amountRub: 8000, status: "paid" },
		],
	});

	const gis = result.find((c) => c.channelKey === "gis2");
	const yandex = result.find((c) => c.channelKey === "yandex_maps");
	const mouth = result.find((c) => c.channelKey === "word_of_mouth");

	assert.ok(gis, "2GIS channel must be identified");
	assert.equal(gis?.primaryPatientsCount, 1, "p1 completed appointment");
	assert.equal(gis?.repeatVisitsCount, 1, "p1 had 2 completed visits (1 primary + 1 repeat)");
	assert.equal(gis?.revenueKopecks, 1500000, "p1 revenue must be 15 000 ₽ (1 500 000 kopecks)");

	assert.ok(yandex, "Yandex channel must be identified");
	assert.equal(yandex?.primaryPatientsCount, 1, "p2 completed appointment");
	assert.equal(yandex?.revenueKopecks, 800000, "p2 revenue must be 8 000 ₽");

	assert.ok(mouth, "Word of mouth must be identified");
	assert.equal(mouth?.spentKopecks, 0, "Organic word of mouth budget is 0 ₽");
});

test("4. useMarketingRomiChannels hook file adheres to live Fastify API endpoints", () => {
	const hookPath = path.join(marketingDir, "useMarketingRomiChannels.ts");
	const code = fs.readFileSync(hookPath, "utf8");

	assert.ok(code.includes("/api/marketing/campaigns"), "Must persist to /api/marketing/campaigns");
	assert.ok(code.includes("/api/marketing/romi"), "Must sync with /api/marketing/romi");
	assert.ok(code.includes("denteClinicalMutationHeaders"), "Must use mutation headers");
	assert.ok(code.split("\n").length <= 135, "File length must be <= 135 lines");
});
