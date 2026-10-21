import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateAdminLeakImpact,
	calculateAdminSlaRating,
	calculateFirstResponseTimeMinutes,
	calculateSlaPenaltyPoints,
	calculateSpeedToLeadMetrics,
	detectCrmFunnelLeaks,
	type FunnelLead,
	getLeadSlaStatus,
	isLeadSlaBreached,
	// Re-exported from facade:
	predictShowUpBySource,
} from "../leadsFunnelEngine.js";

describe("Wave 28: Funnel Engine Decomposed Modules — Extended Domain Tests", () => {
	describe("1. predictShowUpBySource (Show-Up Prediction Engine)", () => {
		it("calculates show-up predictions based on historical conversion rates", () => {
			const historicalLeads: FunnelLead[] = [
				// Yandex Direct: 10 booked, 8 showed up = 80%
				...Array.from({ length: 10 }, (_, i) => ({
					id: `yandex-hist-${i}`,
					name: `Пациент ${i}`,
					source: "Яндекс.Директ",
					status: (i < 8
						? "showed_up"
						: "consult_booked") as FunnelLead["status"],
				})),
				// 2GIS: 5 booked, 2 showed up = 40%
				...Array.from({ length: 5 }, (_, i) => ({
					id: `2gis-hist-${i}`,
					name: `Пациент ${i}`,
					source: "2ГИС",
					status: (i < 2
						? "showed_up"
						: "consult_booked") as FunnelLead["status"],
				})),
			];

			const currentBooked: FunnelLead[] = [
				// Yandex: 5 currently booked
				...Array.from({ length: 5 }, (_, i) => ({
					id: `yandex-curr-${i}`,
					name: `Лид ${i}`,
					source: "yandex",
					status: "consult_booked" as const,
				})),
				// 2GIS: 10 currently booked
				...Array.from({ length: 10 }, (_, i) => ({
					id: `2gis-curr-${i}`,
					name: `Лид ${i}`,
					source: "2gis",
					status: "consult_booked" as const,
				})),
			];

			const predictions = predictShowUpBySource(historicalLeads, currentBooked);
			assert.ok(Array.isArray(predictions));

			const yandexPred = predictions.find(
				(p) => p.channelKey === "yandex_direct",
			);
			assert.ok(yandexPred);
			assert.strictEqual(yandexPred.bookedCount, 5);
			assert.strictEqual(yandexPred.predictedShowUpRatePercent, 80);
			assert.strictEqual(yandexPred.predictedShowUpCount, 4); // 5 * 80% = 4
			assert.strictEqual(yandexPred.confidence, "medium"); // 10 leads

			const twoGisPred = predictions.find((p) => p.channelKey === "gis_2");
			assert.ok(twoGisPred);
			assert.strictEqual(twoGisPred.bookedCount, 10);
			assert.strictEqual(twoGisPred.predictedShowUpRatePercent, 40);
			assert.strictEqual(twoGisPred.predictedShowUpCount, 4); // 10 * 40% = 4
			assert.strictEqual(twoGisPred.confidence, "medium"); // 5 leads
		});

		it("handles zero historical data gracefully with honest 0% default", () => {
			const predictions = predictShowUpBySource(
				[],
				[
					{
						id: "lead-1",
						name: "Лид",
						source: "prodoctorov",
						status: "consult_booked",
					},
				],
			);
			const prodoc = predictions.find((p) => p.channelKey === "prodoctorov");
			assert.ok(prodoc);
			assert.strictEqual(prodoc.bookedCount, 1);
			assert.strictEqual(prodoc.predictedShowUpRatePercent, 0);
			assert.strictEqual(prodoc.predictedShowUpCount, 0);
			assert.strictEqual(prodoc.confidence, "low");
		});
	});

	describe("2. speedToLeadSlaTracker (SLA Metrics & Ratings)", () => {
		it("calculates first response time and SLA breach status accurately", () => {
			const now = new Date("2026-10-10T12:00:00Z");

			const freshLead: FunnelLead = {
				id: "fresh",
				name: "Лид 1",
				status: "new",
				createdAt: new Date("2026-10-10T11:50:00Z").toISOString(), // 10 min ago
			};
			assert.strictEqual(calculateFirstResponseTimeMinutes(freshLead, now), 10);
			assert.strictEqual(isLeadSlaBreached(freshLead, now), false);
			assert.strictEqual(getLeadSlaStatus(freshLead, now), "fresh");

			const warningLead: FunnelLead = {
				id: "warn",
				name: "Лид 2",
				status: "new",
				createdAt: new Date("2026-10-10T11:30:00Z").toISOString(), // 30 min ago
			};
			assert.strictEqual(
				calculateFirstResponseTimeMinutes(warningLead, now),
				30,
			);
			assert.strictEqual(isLeadSlaBreached(warningLead, now), true);
			assert.strictEqual(getLeadSlaStatus(warningLead, now), "warning");

			const breachedLead: FunnelLead = {
				id: "breach",
				name: "Лид 3",
				status: "new",
				createdAt: new Date("2026-10-10T10:00:00Z").toISOString(), // 120 min ago
			};
			assert.strictEqual(
				calculateFirstResponseTimeMinutes(breachedLead, now),
				120,
			);
			assert.strictEqual(isLeadSlaBreached(breachedLead, now), true);
			assert.strictEqual(getLeadSlaStatus(breachedLead, now), "breached");
		});

		it("computes SLA penalty points properly", () => {
			assert.strictEqual(calculateSlaPenaltyPoints(10), 0);
			assert.strictEqual(calculateSlaPenaltyPoints(20), 1);
			assert.strictEqual(calculateSlaPenaltyPoints(45), 3);
			assert.strictEqual(calculateSlaPenaltyPoints(60), 5);
			assert.strictEqual(calculateSlaPenaltyPoints(120), 6); // 5 + 1 extra hr
			assert.strictEqual(calculateSlaPenaltyPoints(180), 7); // 5 + 2 extra hrs
		});

		it("evaluates admin performance rating correctly", () => {
			assert.strictEqual(calculateAdminSlaRating(96), "excellent");
			assert.strictEqual(calculateAdminSlaRating(88), "good");
			assert.strictEqual(calculateAdminSlaRating(75), "warning");
			assert.strictEqual(calculateAdminSlaRating(60), "critical");
		});

		it("calculates comprehensive SpeedToLeadMetrics summary", () => {
			const now = new Date("2026-10-10T12:00:00Z");
			const leads: FunnelLead[] = [
				{
					id: "1",
					name: "Лид 1",
					status: "new",
					createdAt: new Date("2026-10-10T11:55:00Z").toISOString(),
				}, // 5 min -> fresh
				{
					id: "2",
					name: "Лид 2",
					status: "new",
					createdAt: new Date("2026-10-10T11:52:00Z").toISOString(),
				}, // 8 min -> fresh
				{
					id: "3",
					name: "Лид 3",
					status: "new",
					createdAt: new Date("2026-10-10T11:40:00Z").toISOString(),
				}, // 20 min -> warning
				{
					id: "4",
					name: "Лид 4",
					status: "new",
					createdAt: new Date("2026-10-10T10:30:00Z").toISOString(),
				}, // 90 min -> breached
			];

			const metrics = calculateSpeedToLeadMetrics(leads, now);
			assert.strictEqual(metrics.totalLeads, 4);
			assert.strictEqual(metrics.freshCount, 2);
			assert.strictEqual(metrics.warningCount, 1);
			assert.strictEqual(metrics.breachedCount, 1);
			assert.strictEqual(metrics.slaComplianceRatePercent, 50); // 2/4 = 50%
			assert.strictEqual(metrics.adminPerformanceRating, "critical");
			assert.ok(metrics.totalPenaltyPoints > 0);
			assert.ok(metrics.summaryText.includes("Просрочен SLA у 1 из 4"));
		});
	});

	describe("3. crmLeakDetectorEngine (Leak Detection & Revenue Loss Prevention)", () => {
		it("detects stalled leads at various funnel stages with financial impact", () => {
			const now = new Date("2026-10-10T12:00:00Z");

			const leads: FunnelLead[] = [
				// New lead idle for 3 hours -> warning leak
				{
					id: "leak-new-1",
					name: "Иван Иванов",
					phone: "+7 999 111 22 33",
					status: "new",
					createdAt: new Date("2026-10-10T09:00:00Z").toISOString(),
					source: "yandex",
					actualRevenueRub: 20000,
				},
				// New lead idle for 15 hours -> critical leak
				{
					id: "leak-new-2",
					name: "Петр Петров",
					phone: "+7 999 222 33 44",
					status: "new",
					createdAt: new Date("2026-10-09T21:00:00Z").toISOString(),
					source: "2gis",
				},
				// Contacted lead idle for 30 hours -> warning leak
				{
					id: "leak-cont-1",
					name: "Анна Смирнова",
					phone: "+7 999 333 44 55",
					status: "contacted",
					stageEnteredAt: new Date("2026-10-09T06:00:00Z").toISOString(),
					source: "website",
				},
				// Paid lead (should NOT be detected as leak)
				{
					id: "paid-lead",
					name: "Сергей Кузнецов",
					status: "paid",
					isPaid: true,
					paidAmountRub: 50000,
					createdAt: new Date("2026-10-01T10:00:00Z").toISOString(),
				},
			];

			const report = detectCrmFunnelLeaks(leads, { now });
			assert.strictEqual(report.totalLeakedCount, 3);
			assert.strictEqual(report.criticalLeaksCount, 1);
			assert.strictEqual(report.warningLeaksCount, 2);
			assert.strictEqual(report.leaksByStage.new, 2);
			assert.strictEqual(report.leaksByStage.contacted, 1);
			assert.strictEqual(report.leaksByStage.paid, 0);

			// Honest calculation: only real entered expected/actual revenue (20 000 ₽), zero fake multipliers
			assert.strictEqual(report.totalLeakedRevenueRub, 20000);
			assert.ok(report.summaryText.includes("Обнаружено 3 зависших лидов"));

			// Check breakdown impact helper
			const impact = calculateAdminLeakImpact(report.leaks);
			assert.strictEqual(impact.totalLossRub, 20000);
			assert.strictEqual(impact.criticalCount, 1);
			assert.strictEqual(impact.stageBreakdown.new, 2);
			assert.strictEqual(impact.stageBreakdown.contacted, 1);
		});
	});
});
