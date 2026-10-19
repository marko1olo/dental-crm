/**
 * DENTE Dental CRM — Clinical Funnel Metrics & Conversion Engine Test Suite
 *
 * Mandate 8x (Clinical Language & Visual Invariants)
 * Mandate 8e (Doctor & Staff Autonomy)
 * Mandate 8n (Solo Doctor Scale Sovereignty)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Lead } from "../../../store/leadsStore.js";
import {
	calculateChannelPerformance,
	calculateClinicalFunnelMetrics,
	detectFunnelLeaks,
} from "../leadsFunnelEngine.js";

describe("Leads Clinical Funnel Metrics & 4-Stage Conversion Engine (Mandate 8x, 8e, 8n)", () => {
	const sampleLeads: Lead[] = [
		{
			id: "lead-1",
			name: "Белова Марина",
			phone: "+79164401892",
			source: "Яндекс.Директ",
			status: "new",
			expectedRevenue: "145000",
			createdAt: new Date().toISOString(),
		},
		{
			id: "lead-2",
			name: "Ковалёв Денис",
			phone: "+79257123045",
			source: "2ГИС",
			status: "contacted",
			expectedRevenue: "18500",
			createdAt: new Date().toISOString(),
		},
		{
			id: "lead-3",
			name: "Ларионова Ольга",
			phone: "+79158820933",
			source: "Рекомендации",
			status: "consult_booked",
			expectedRevenue: "180000",
			createdAt: new Date().toISOString(),
		},
		{
			id: "lead-4",
			name: "Крылова Екатерина",
			phone: "+79052316419",
			source: "ПроДокторов",
			status: "showed_up",
			expectedRevenue: "310000",
			createdAt: new Date().toISOString(),
		},
		{
			id: "lead-5",
			name: "Григорьев Сергей",
			phone: "+79037778899",
			source: "2ГИС",
			status: "trash",
			expectedRevenue: "25000",
			dropReason: "Нецелевой / ОМС",
			createdAt: new Date().toISOString(),
		},
	];

	describe("1. calculateClinicalFunnelMetrics", () => {
		it("correctly buckets leads into the 4 canonical stages", () => {
			const metrics = calculateClinicalFunnelMetrics(sampleLeads);

			assert.equal(metrics.totalCount, 5);
			// new and contacted are mapped to newCount
			assert.equal(metrics.newCount, 2);
			assert.equal(metrics.bookedCount, 1);
			assert.equal(metrics.showedUpCount, 1);
			assert.equal(metrics.trashCount, 1);
		});

		it("accurately calculates financial breakdown (pipeline, realized, lost)", () => {
			const metrics = calculateClinicalFunnelMetrics(sampleLeads);

			// Pipeline = new (145k) + contacted (18.5k) + consult_booked (180k) = 343,500
			assert.equal(metrics.pipelineRevenue, 343500);
			// Realized = showed_up (310k) = 310,000
			assert.equal(metrics.realizedRevenue, 310000);
			// Lost = trash (25k) = 25,000
			assert.equal(metrics.lostRevenue, 25000);
		});

		it("calculates booking and overall conversion rates correctly", () => {
			const metrics = calculateClinicalFunnelMetrics(sampleLeads);

			// Active/Done = 1 (booked) + 1 (showedUp) = 2
			// Targetable = 5 - 1 (trash) = 4 -> 2 / 4 = 50%
			assert.equal(metrics.bookingRatePct, 50);

			// Show-up rate: 1 showedUp / 2 active = 50%
			assert.equal(metrics.showUpRatePct, 50);

			// Overall conversion: 1 showedUp / 5 total = 20%
			assert.equal(metrics.overallConversionRatePct, 20);
		});
	});

	describe("2. calculateChannelPerformance", () => {
		it("groups channel performance and calculates conversion percentage", () => {
			const channels = calculateChannelPerformance(sampleLeads);

			assert.ok(channels.length > 0);
			const yandex = channels.find((c) => c.channelKey === "yandex_direct");
			assert.ok(yandex);
			assert.equal(yandex.leadCount, 1);

			const gis = channels.find((c) => c.channelKey === "gis_2");
			assert.ok(gis);
			assert.equal(gis.leadCount, 2); // Ковалёв + Григорьев
		});
	});

	describe("3. detectFunnelLeaks", () => {
		it("detects stale new leads older than 24 hours", () => {
			const staleDate = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
			const testLeads: Lead[] = [
				{
					id: "stale-1",
					name: "Зависший Лид",
					phone: "+79001112233",
					status: "new",
					createdAt: staleDate,
				},
				{
					id: "trash-no-reason",
					name: "Отказник",
					status: "trash",
					createdAt: new Date().toISOString(),
				},
			];

			const leaks = detectFunnelLeaks(testLeads);
			assert.equal(leaks.length, 2);
			assert.equal(leaks[0]?.leakType, "stale_new");
			assert.equal(leaks[1]?.leakType, "unrecorded_drop_reason");
		});
	});
});
