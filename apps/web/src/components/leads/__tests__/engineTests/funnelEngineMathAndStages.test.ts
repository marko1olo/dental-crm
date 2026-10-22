import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateFunnelAnalysis,
	extractLeadRevenueRub,
	filterLeadsByPeriod,
	type FunnelLead,
	safeDivide,
	safePercent,
} from "../../leadsFunnelEngine";

describe("3. Safe Math & Revenue Extraction", () => {
	it("3.1. safePercent prevents division by zero, NaN and Infinity", () => {
		assert.equal(safePercent(0, 0), 0);
		assert.equal(safePercent(10, 0), 0);
		assert.equal(safePercent(10, -5), 0);
		assert.equal(safePercent(25, 100), 25);
		assert.equal(safePercent(1, 3, 2), 33.33);
	});

	it("3.2. safeDivide computes integer or float rounded values cleanly", () => {
		assert.equal(safeDivide(100, 0), 0);
		assert.equal(safeDivide(100, 4), 25);
		assert.equal(safeDivide(100, 3, 2), 33.33);
		assert.equal(safeDivide(100, 3, 0), 33);
	});

	it("3.3. extractLeadRevenueRub extracts revenue correctly with priority", () => {
		assert.equal(
			extractLeadRevenueRub({
				id: "1",
				name: "P1",
				status: "consult_booked",
				actualRevenueRub: 45000,
				paidAmountRub: 30000,
			}),
			45000,
		);
		assert.equal(
			extractLeadRevenueRub({
				id: "2",
				name: "P2",
				status: "consult_booked",
				paidAmountRub: 22000,
			}),
			22000,
		);
		assert.equal(
			extractLeadRevenueRub({
				id: "3",
				name: "P3",
				status: "consult_booked",
				paidAmountKopecks: 1250000,
			}),
			12500,
		);
		assert.equal(
			extractLeadRevenueRub({
				id: "4",
				name: "P4",
				status: "consult_booked",
				expectedRevenue: "18500",
			}),
			0,
		);
		assert.equal(
			extractLeadRevenueRub({
				id: "5",
				name: "P5",
				status: "consult_booked",
			}),
			0,
		);
	});
});

describe("4. End-to-End Funnel Calculation", () => {
	const sampleLeads: FunnelLead[] = [
		{ id: "L1", name: "Алексей Я.", source: "Яндекс.Директ", status: "consult_booked", isPaid: true, actualRevenueRub: 50000 },
		{ id: "L2", name: "Борис Я.", source: "Яндекс.Директ", status: "consult_booked", showedUp: true },
		{ id: "L3", name: "Виктор Я.", source: "Яндекс.Директ", status: "consult_booked" },
		{ id: "L4", name: "Галина Д.", source: "2ГИС", status: "consult_booked", treatmentPlanAgreed: true, expectedRevenue: "120000" },
		{ id: "L5", name: "Дмитрий Д.", source: "2ГИС", status: "contacted" },
		{ id: "L6", name: "Елена С.", source: "Сайт клиники", status: "consult_booked", isPaid: true, actualRevenueRub: 30000 },
		{ id: "L7", name: "Жанна С.", source: "SEO", status: "consult_booked", isPaid: true, actualRevenueRub: 40000 },
		{ id: "L8", name: "Игорь Р.", source: "Рекомендация друга", status: "consult_booked", isPaid: true, actualRevenueRub: 80000 },
		{ id: "L9", name: "Константин Н.", source: "Звонок", status: "new" },
		{ id: "L10", name: "Лариса О.", source: "VK", status: "trash" },
	];

	const defaultSpend = {
		yandex_direct: 30000,
		gis_2: 15000,
		site_seo: 20000,
		recommendations: 0,
		social_media: 5000,
		prodoctorov: 0,
		napopravku: 0,
		avito: 0,
		yandex_maps: 0,
		max: 0,
		other: 0,
	};

	it("4.1. Computes exact stage counts and conversion percentages", () => {
		const result = calculateFunnelAnalysis(sampleLeads, "all", defaultSpend);
		assert.equal(result.summary.totalLeads, 10);
		assert.equal(result.stages[0]?.count, 10);
		assert.equal(result.stages[1]?.count, 8);
		assert.equal(result.stages[2]?.count, 7);
		assert.equal(result.stages[3]?.count, 6);
		assert.equal(result.stages[4]?.count, 5);
		assert.equal(result.stages[5]?.count, 4);
	});

	it("4.2. Computes marketing financial KPIs and unit economics", () => {
		const result = calculateFunnelAnalysis(sampleLeads, "all", defaultSpend);
		assert.equal(result.summary.totalMarketingSpendRub, 70000);
		assert.equal(result.summary.totalRevenueRub, 200000);
		assert.equal(result.summary.totalRevenueKopecks, 20000000);
		assert.equal(result.summary.paidLeads, 4);
		assert.equal(result.summary.avgBillRub, 50000);
		assert.equal(result.summary.netMarketingProfitRub, 130000);
		assert.equal(result.summary.cplRub, 7000);
		assert.equal(result.summary.cpsRub, 11667);
		assert.equal(result.summary.cacRub, 17500);
		assert.equal(result.summary.romiPercent, 185.7);
		assert.equal(result.summary.ltvEstimatedRub, 50000);
		assert.equal(result.summary.ltvToCacRatio, 2.9);
	});

	it("4.3. Computes individual marketing channel metrics and recommendations", () => {
		const result = calculateFunnelAnalysis(sampleLeads, "all", defaultSpend);
		const yandex = result.channels.find((c) => c.channelKey === "yandex_direct");
		assert.ok(yandex);
		assert.equal(yandex.leadsCount, 3);
		assert.equal(yandex.paidCount, 1);
		assert.equal(yandex.revenueRub, 50000);

		const seo = result.channels.find((c) => c.channelKey === "site_seo");
		assert.ok(seo);
		assert.equal(seo.leadsCount, 2);
		assert.equal(seo.revenueRub, 70000);
	});

	it("4.4. Zero leads and zero spend edge case handled gracefully", () => {
		const result = calculateFunnelAnalysis([], "all", {
			yandex_direct: 0,
			gis_2: 0,
			prodoctorov: 0,
			napopravku: 0,
			site_seo: 0,
			recommendations: 0,
			social_media: 0,
			avito: 0,
			yandex_maps: 0,
			max: 0,
			other: 0,
		});
		assert.equal(result.summary.totalLeads, 0);
		assert.equal(result.summary.paidLeads, 0);
		assert.equal(result.stages.length, 6);
	});
});

describe("5. Time Period Filtering", () => {
	const fixedNow = new Date("2026-08-28T12:00:00.000Z");
	const leadsWithDates: FunnelLead[] = [
		{ id: "T1", name: "Сегодня", status: "new", createdAt: "2026-08-28T09:00:00.000Z" },
		{ id: "T2", name: "3 дня назад", status: "new", createdAt: "2026-08-25T10:00:00.000Z" },
		{ id: "T3", name: "20 дней назад", status: "new", createdAt: "2026-08-08T10:00:00.000Z" },
		{ id: "T4", name: "60 дней назад", status: "new", createdAt: "2026-06-29T10:00:00.000Z" },
		{ id: "T5", name: "200 дней назад", status: "new", createdAt: "2026-02-09T10:00:00.000Z" },
	];

	it("5.1. Filters by today", () => {
		const filtered = filterLeadsByPeriod(leadsWithDates, "today", fixedNow);
		assert.equal(filtered.length, 1);
		assert.equal(filtered[0]?.id, "T1");
	});

	it("5.2. Filters by week (7 days)", () => {
		const filtered = filterLeadsByPeriod(leadsWithDates, "week", fixedNow);
		assert.equal(filtered.length, 2);
	});

	it("5.3. Filters by month (30 days)", () => {
		const filtered = filterLeadsByPeriod(leadsWithDates, "month", fixedNow);
		assert.equal(filtered.length, 3);
	});

	it("5.4. Filters by quarter (90 days)", () => {
		const filtered = filterLeadsByPeriod(leadsWithDates, "quarter", fixedNow);
		assert.equal(filtered.length, 4);
	});

	it("5.5. Filters by year (365 days) and all", () => {
		const filteredYear = filterLeadsByPeriod(leadsWithDates, "year", fixedNow);
		assert.equal(filteredYear.length, 5);
		const filteredAll = filterLeadsByPeriod(leadsWithDates, "all", fixedNow);
		assert.equal(filteredAll.length, 5);
	});
});
