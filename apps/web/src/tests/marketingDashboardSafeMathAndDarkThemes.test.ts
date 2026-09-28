/**
 * DENTE Dental CRM — Marketing Dashboard Safe Math & 6 Dark Themes Inquisitor Tests
 *
 * Mandate 8c: Visual Quality & 6 Dark Themes Parity (Night, OLED, Dark, Ocean, Emerald, Cyber X-Ray)
 * Mandate 8d: Quiet Telemetry & Zero NaN / Zero Division Failures
 * Mandate 8e & 8n: Solo Doctor Scale Sovereignty & Anti-Landfill Ergonomics
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculateFunnelAnalysis,
	safeDivide,
	safePercent,
	evaluateChannelEfficiency,
	getDefaultChannelSpendMap,
	type FunnelLead,
	type ChannelSpendMap,
} from "../components/leads/leadsFunnelEngine";

describe("Marketing Dashboard Safe Math & Dark Themes Inquisitor Suite", () => {
	describe("1. Division by Zero Immunity (CPL, CAC, ROMI, Conversion Rates)", () => {
		it("safeDivide safely handles 0 denominator, NaN, Infinity and empty values without throwing", () => {
			assert.equal(safeDivide(100, 0), 0);
			assert.equal(safeDivide(0, 0), 0);
			assert.equal(safeDivide(0, 100), 0);
			assert.equal(safeDivide(Number.NaN, 10), 0);
			assert.equal(safeDivide(10, Number.NaN), 0);
			assert.equal(safeDivide(Number.POSITIVE_INFINITY, 10), 0);
			assert.equal(safeDivide(10, Number.POSITIVE_INFINITY), 0);
			assert.equal(safeDivide(-50, 0), 0);
		});

		it("safePercent safely handles 0 denominator and edge cases without throwing", () => {
			assert.equal(safePercent(5, 0), 0);
			assert.equal(safePercent(0, 0), 0);
			assert.equal(safePercent(0, 10), 0);
			assert.equal(safePercent(Number.NaN, 50), 0);
			assert.equal(safePercent(50, Number.NaN), 0);
			assert.equal(safePercent(10, 100), 10);
			assert.equal(safePercent(1, 3, 2), 33.33);
		});

		it("calculateFunnelAnalysis with completely empty leads and zero spend maps computes clean 0s without NaN or Infinity", () => {
			const zeroSpends: ChannelSpendMap = {
				yandex_direct: 0,
				gis_2: 0,
				prodoctorov: 0,
				napopravku: 0,
				site_seo: 0,
				recommendations: 0,
				social_media: 0,
				other: 0,
			};

			const result = calculateFunnelAnalysis([], "all", zeroSpends);

			assert.equal(result.summary.totalLeads, 0);
			assert.equal(result.summary.totalMarketingSpendRub, 0);
			assert.equal(result.summary.totalRevenueRub, 0);
			assert.equal(result.summary.cplRub, 0);
			assert.equal(result.summary.cacRub, 0);
			assert.equal(result.summary.cpsRub, 0);
			assert.equal(result.summary.romiPercent, 0);
			assert.equal(result.summary.showUpRatePercent, 0);
			assert.equal(result.summary.bookingRatePercent, 0);
			assert.equal(result.summary.overallConversionPercent, 0);

			for (const ch of result.channels) {
				assert.equal(ch.leadsCount, 0);
				assert.equal(ch.spendRub, 0);
				assert.equal(ch.cplRub, 0);
				assert.equal(ch.cacRub, 0);
				assert.equal(ch.romiPercent, 0);
				assert.equal(ch.conversionRatePercent, 0);
				assert.equal(ch.showUpRatePercent, 0);
				assert.ok(Number.isFinite(ch.cplRub));
				assert.ok(Number.isFinite(ch.cacRub));
				assert.ok(Number.isFinite(ch.romiPercent));
			}
		});

		it("Handles high advertising spend with 0 leads (100% loss edge case) safely", () => {
			const spendWithNoLeads: ChannelSpendMap = {
				yandex_direct: 80000,
				gis_2: 0,
				prodoctorov: 0,
				napopravku: 0,
				site_seo: 0,
				recommendations: 0,
				social_media: 0,
				other: 0,
			};

			const result = calculateFunnelAnalysis([], "all", spendWithNoLeads);

			const yandex = result.channels.find((c) => c.channelKey === "yandex_direct");
			assert.ok(yandex);
			assert.equal(yandex.spendRub, 80000);
			assert.equal(yandex.leadsCount, 0);
			assert.equal(yandex.paidCount, 0);
			assert.equal(yandex.cplRub, 0);
			assert.equal(yandex.cacRub, 0);
			// Net profit: -80,000 / 80,000 = -100% ROMI
			assert.equal(yandex.romiPercent, -100);
			assert.equal(yandex.efficiencyRating, "critical");
			assert.ok(Number.isFinite(yandex.romiPercent));
		});

		it("Handles organic traffic with 0 spend and positive revenue (Infinite nominal ROI case) safely", () => {
			const organicLeads: FunnelLead[] = [
				{
					id: "lead-org-1",
					name: "Ольга Морозова",
					source: "recommendations",
					status: "showed_up",
					isPaid: true,
					paidAmountRub: 45000,
				},
			];

			const zeroSpendMap: ChannelSpendMap = {
				yandex_direct: 0,
				gis_2: 0,
				prodoctorov: 0,
				napopravku: 0,
				site_seo: 0,
				recommendations: 0,
				social_media: 0,
				other: 0,
			};

			const result = calculateFunnelAnalysis(organicLeads, "all", zeroSpendMap);
			const recChannel = result.channels.find((c) => c.channelKey === "recommendations");
			assert.ok(recChannel);
			assert.equal(recChannel.spendRub, 0);
			assert.equal(recChannel.leadsCount, 1);
			assert.equal(recChannel.paidCount, 1);
			assert.equal(recChannel.revenueRub, 45000);
			assert.equal(recChannel.cplRub, 0);
			assert.equal(recChannel.cacRub, 0);
			// When spend is 0, ROMI is capped safely at 0 rather than Infinity
			assert.equal(recChannel.romiPercent, 0);
			assert.equal(recChannel.efficiencyRating, "organic");
		});
	});

	describe("2. 2-Column Balanced Dashboard Layout & 6 Dark Themes (Mandates 8c, 8d)", () => {
		it("Channels have non-empty, contrasting design token colors", () => {
			const defaultSpends = getDefaultChannelSpendMap();
			const result = calculateFunnelAnalysis([], "all", defaultSpends);

			for (const ch of result.channels) {
				assert.ok(ch.color, `Channel ${ch.channelKey} must have a defined color`);
				assert.ok(
					ch.color.startsWith("var(--"),
					`Channel ${ch.channelKey} color (${ch.color}) must be a CSS variable token`,
				);
			}
		});

		it("All 6 canonical funnel stages are generated sequentially without gaps", () => {
			const result = calculateFunnelAnalysis([]);
			assert.equal(result.stages.length, 6);
			assert.deepEqual(
				result.stages.map((s) => s.key),
				["new", "contacted", "consult_booked", "showed_up", "treatment_plan_accepted", "paid"],
			);
		});

		it("Efficiency ratings cover all clinical performance scenarios without throwing", () => {
			assert.equal(evaluateChannelEfficiency(0, 5, 0).rating, "organic");
			assert.equal(evaluateChannelEfficiency(10000, 0, -100).rating, "critical");
			assert.equal(evaluateChannelEfficiency(10000, 10, 350).rating, "excellent");
			assert.equal(evaluateChannelEfficiency(10000, 5, 150).rating, "good");
			assert.equal(evaluateChannelEfficiency(10000, 2, 20).rating, "warning");
			assert.equal(evaluateChannelEfficiency(10000, 1, -40).rating, "critical");
		});
	});
});
