/**
 * marketingDashboardViewInquisition.test.tsx — Unit & Inquisitor Test for Marketing Dashboard
 *
 * Mandate 8c (Visual Quality), Mandate 8d (Quiet Telemetry), Mandate 8e & 8n (Solo Doctor Autonomy)
 * Validates:
 * 1. MarketingDashboardView 2-column balanced layout
 * 2. 4-column Kanban funnel with 1-click stage advancement & instant preview
 * 3. Acquisition channels, Conversion rates, Ad ROI, Segmented patient base
 */

import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { MarketingDashboardView } from "../pages/MarketingDashboardView";
import { MarketingView } from "../MarketingView";
import { COLUMNS } from "../components/leads/leadsKanbanTypes";
import { calculateFunnelAnalysis } from "../components/leads/leadsFunnelEngine";
import type { FunnelLead } from "../components/leads/leadsFunnelTypes";

describe("CRM Leads & Marketing Funnel Inquisitor Tests", () => {
	it("1. Kanban COLUMNS canonical 4-column active funnel labels match Constitution", () => {
		const labels = COLUMNS.map((c) => c.label);
		assert.strictEqual(labels[0], "1. Новые");
		assert.strictEqual(labels[1], "2. Квалифицированные");
		assert.strictEqual(labels[2], "3. Консультация");
		assert.strictEqual(labels[3], "4. Дошли");
		assert.strictEqual(labels[4], "Недозвон");
		assert.strictEqual(labels[5], "Отказ");
	});

	it("2. MarketingDashboardView renders 2-column balanced layout with acquisition channels & ROI", () => {
		const markup = ReactDOMServer.renderToStaticMarkup(
			<MarketingDashboardView clinicName="Тестовая Стоматология" />,
		);

		// Header & Telemetry
		assert.ok(markup.includes("Маркетинговая аналитика и воронка"));
		assert.ok(markup.includes("Телеметрия активна"));

		// 4 KPI cards
		assert.ok(markup.includes("Рекламный бюджет"));
		assert.ok(markup.includes("Обращения / Лиды"));
		assert.ok(markup.includes("Дошли до клиники"));
		assert.ok(markup.includes("Окупаемость ROMI"));

		// 2-column layout sections
		assert.ok(markup.includes("Каналы привлечения пациентов"));
		assert.ok(markup.includes("Конверсионная воронка (CR)"));
		assert.ok(markup.includes("Окупаемость рекламы (ROMI)"));
		assert.ok(markup.includes("Сегментированная пациентская база"));

		// Cohort segments
		assert.ok(markup.includes("Пациенты без визита &gt; 6 мес."));
		assert.ok(markup.includes("Пропустили регулярную гигиену"));
	});

	it("3. MarketingView supports analytics tab integrating MarketingDashboardView", () => {
		const markup = ReactDOMServer.renderToStaticMarkup(
			<MarketingView initialTab="analytics" />,
		);

		assert.ok(markup.includes("Сквозная аналитика и воронка"));
		assert.ok(markup.includes("marketing-dashboard-page"));
		assert.ok(markup.includes("Каналы привлечения пациентов"));
	});

	it("4. Funnel calculation correctly computes conversion rates and ROMI without NaN", () => {
		const mockLeads: FunnelLead[] = [
			{ id: "1", name: "Иванов И.И.", status: "new", source: "yandex_direct" },
			{ id: "2", name: "Петров П.П.", status: "contacted", source: "gis_2" },
			{ id: "3", name: "Сидоров С.С.", status: "consult_booked", source: "prodoctorov" },
			{ id: "4", name: "Смирнова Е.А.", status: "showed_up", source: "site_seo", paidAmountRub: 25000 },
		];

		const res = calculateFunnelAnalysis(mockLeads, "all");
		assert.strictEqual(res.summary.totalLeads, 4);
		assert.strictEqual(res.summary.contactedLeads, 3);
		assert.strictEqual(res.summary.bookedLeads, 2);
		assert.strictEqual(res.summary.showUpLeads, 1);
		assert.strictEqual(res.summary.paidLeads, 1);
		assert.ok(Number.isFinite(res.summary.overallConversionPercent));
		assert.ok(Number.isFinite(res.summary.romiPercent));
	});
});
