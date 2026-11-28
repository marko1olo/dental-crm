import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Lead } from "../../../store/leadsStore";
import {
	LeadsFunnelAnalyticsModal,
	buildFunnelCsvFilename,
	calculateFunnelAnalysis,
	exportFunnelReportCsv,
	exportFunnelReportSummaryText,
	filterLeadsByPeriod,
	getDefaultChannelSpendMap,
	mapLiveAttributionToChannelSpends,
	parseSanitizedBudgetRub,
	resolveRomiToneColor,
	resolveShowUpToneColor,
} from "../LeadsFunnelAnalyticsModal";
import { calculateClinicalFunnelMetrics } from "../leadsFunnelEngine";

const sampleLeads: Lead[] = [
	{
		id: "lead-f-1",
		name: "Анна",
		phone: "+7 (999) 111-11-11",
		source: "gis_2",
		status: "new",
		expectedRevenue: "15000",
		createdAt: "2026-10-10T10:00:00.000Z",
	},
	{
		id: "lead-f-2",
		name: "Борис",
		phone: "+7 (999) 222-22-22",
		source: "prodoctorov",
		status: "consult_booked",
		expectedRevenue: "35000",
		createdAt: "2026-10-10T11:00:00.000Z",
	},
	{
		id: "lead-f-3",
		name: "Вера",
		phone: "+7 (999) 333-33-33",
		source: "gis_2",
		status: "showed_up",
		expectedRevenue: "45000",
		createdAt: "2026-10-11T12:00:00.000Z",
	},
];

describe("LeadsFunnelAnalyticsModal & leadsFunnelAnalyticsModules (Live 6G SUT)", () => {
	it("1. calculateClinicalFunnelMetrics computes stages, conversion rates, and revenue buckets", () => {
		const metrics = calculateClinicalFunnelMetrics(sampleLeads);
		assert.equal(metrics.totalCount, 3);
		assert.equal(metrics.newCount, 1);
		assert.equal(metrics.bookedCount, 1);
		assert.equal(metrics.showedUpCount, 1);
		assert.equal(metrics.pipelineRevenue, 50000);
		assert.equal(metrics.realizedRevenue, 45000);
		assert.ok(metrics.showUpRatePct > 0);
	});

	it("2. calculateFunnelAnalysis, exportFunnelReportCsv, and exportFunnelReportSummaryText handle leads & spends", () => {
		const filtered = filterLeadsByPeriod(sampleLeads, "all");
		assert.equal(filtered.length, 3);
		const spends = getDefaultChannelSpendMap();
		const analysis = calculateFunnelAnalysis(filtered, spends);
		assert.equal(analysis.summary.totalLeads, 3);
		assert.ok(analysis.channels.length > 0);

		const csv = exportFunnelReportCsv(analysis);
		assert.ok(csv.includes(";"));
		assert.ok(csv.length > 20);

		const summaryText = exportFunnelReportSummaryText(analysis, "all");
		assert.ok(summaryText.includes("3"));
		assert.ok(summaryText.length > 20);
	});

	it("3. Pure utility functions: mapLiveAttributionToChannelSpends", () => {
		const mockData = {
			selfBookingChannels: [
				{ key: "gis_2", spentKopecks: 1500000 },
				{ key: "prodoctorov", spentKopecks: 2400000 },
				{ key: "website_widget", spentKopecks: 850000 },
				{ key: "tg_bot", spentKopecks: 600000 },
				{ key: "wa_bot", spentKopecks: 400000 },
			],
			telephonyAdminFunnel: {
				spentKopecks: 1200000,
			},
		};

		const result = mapLiveAttributionToChannelSpends(mockData);
		assert.equal(result.gis_2, 15000);
		assert.equal(result.prodoctorov, 24000);
		assert.equal(result.site_seo, 8500);
		assert.equal(result.social_media, 10000);
		assert.equal(result.other, 12000);

		assert.deepEqual(mapLiveAttributionToChannelSpends(null), {});
		assert.deepEqual(mapLiveAttributionToChannelSpends(undefined), {});
	});

	it("4. Pure utility functions: parseSanitizedBudgetRub and formatting helpers", () => {
		assert.equal(parseSanitizedBudgetRub("15 000 ₽"), 15000);
		assert.equal(parseSanitizedBudgetRub("abc"), 0);
		assert.equal(parseSanitizedBudgetRub(""), 0);

		assert.equal(
			buildFunnelCsvFilename("month", "2026-10-11T12:00:00.000Z"),
			"Dente_Leads_Funnel_Report_month_2026-10-11.csv",
		);

		assert.equal(resolveShowUpToneColor(80), "var(--ok-fg)");
		assert.equal(resolveShowUpToneColor(60), "var(--warn-fg)");

		assert.equal(resolveRomiToneColor(150), "var(--ok-fg)");
		assert.equal(resolveRomiToneColor(50), "var(--warn-fg)");
		assert.equal(resolveRomiToneColor(-20), "var(--rust)");
	});

	it("5. LeadsFunnelAnalyticsModal renders populated funnel analytics with zero portal breakage", () => {
		const prevDoc = (globalThis as { document?: unknown }).document;
		(globalThis as { document?: unknown }).document = undefined;
		let openHtml = "";
		try {
			openHtml = renderToStaticMarkup(
				<LeadsFunnelAnalyticsModal
					isOpen={true}
					onClose={() => {}}
					leads={sampleLeads}
					onOpenLeakDetector={() => {}}
				/>,
			);
		} finally {
			(globalThis as { document?: unknown }).document = prevDoc;
		}
		assert.ok(openHtml.includes("45") || openHtml.includes("2ГИС"));
		assert.ok(openHtml.includes("консультации врача у кресла"));
	});

	it("6. SSR Render & Test Anchor Parity", () => {
		const closedHtml = renderToStaticMarkup(
			<LeadsFunnelAnalyticsModal
				isOpen={false}
				onClose={() => {}}
				leads={[]}
			/>,
		);
		assert.equal(closedHtml, "");

		const openHtml = renderToStaticMarkup(
			<LeadsFunnelAnalyticsModal
				isOpen={true}
				onClose={() => {}}
				leads={[]}
				onOpenLeakDetector={() => {}}
			/>,
		);

		assert.ok(openHtml.includes('data-testid="btn-analytics-open-leak-detector"'));
		assert.ok(openHtml.includes('data-testid="funnel-open-leak-detector-btn"'));
		assert.ok(openHtml.includes('aria-label="Детектор утечек"'));
		assert.ok(openHtml.includes('aria-label="Скопировать сводку"'));
		assert.ok(openHtml.includes('aria-label="Экспорт в CSV"'));
		assert.ok(openHtml.includes('aria-label="Закрыть окно"'));
		assert.ok(
			openHtml.includes("Сквозная Воронка &amp; Маркетинг") ||
				openHtml.includes("Сквозная Воронка & Маркетинг"),
		);
		assert.ok(openHtml.includes("CRM Intelligence"));
	});
});
