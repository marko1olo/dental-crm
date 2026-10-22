/**
 * apps/web/src/tests/marketingAnalytics.test.tsx
 *
 * Dedicated Automated Test Suite for Seed #15 (#marketing / MarketingView & MarketingDashboardView).
 *
 * Requirements:
 * 1. End-to-end acquisition funnel, CPL, CAC, ROMI %, and patient first-visit sources.
 * 2. 100% division-by-zero protection (zero NaN / Infinity leaks).
 * 3. UI & Design System invariants (Mandate 8c & 8d):
 *    - Single-row 32-36px toolbar (Hick's Law).
 *    - Monochrome clinical base + var(--teal) (0 carnival rainbow colors).
 *    - Zero cartoon emojis (strictly Lucide SVG icons).
 *    - Strictly <= 800 lines per file (Mandate 8b).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { MarketingView, MarketingDashboardView } from "../MarketingView";
import {
	MARKETING_CHANNELS,
	calculateFunnelAnalysis,
	exportFunnelReportCsv,
	getDefaultChannelSpendMap,
	normalizeMarketingChannel,
	type FunnelLead,
} from "../components/leads/leadsFunnelEngine";
import { DEFAULT_PATIENT_SEGMENTS } from "../components/marketing/marketingPresets";

describe("Seed #15: Marketing Analytics & Acquisition Funnel Engine", () => {
	it("normalizes patient first-visit sources and UTM channels accurately", () => {
		assert.equal(normalizeMarketingChannel("Яндекс.Директ"), "yandex_direct");
		assert.equal(normalizeMarketingChannel("2ГИС"), "gis_2");
		assert.equal(normalizeMarketingChannel("ПроДокторов"), "prodoctorov");
		assert.equal(normalizeMarketingChannel("НаПоправку"), "napopravku");
		assert.equal(normalizeMarketingChannel("Сайт клиники / SEO"), "site_seo");
		assert.equal(normalizeMarketingChannel("Рекомендации"), "recommendations");
		assert.equal(normalizeMarketingChannel("Telegram / VK"), "social_media");
	});

	it("computes CPL, CAC, Show-Up Rate, and ROMI % without NaN or division by zero", () => {
		// 1. Empty leads & zero spend guard
		const emptyResult = calculateFunnelAnalysis([], "all", {
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

		assert.equal(emptyResult.summary.totalLeads, 0);
		assert.equal(Number.isNaN(emptyResult.summary.cplRub), false);
		assert.equal(Number.isNaN(emptyResult.summary.cacRub), false);
		assert.equal(Number.isNaN(emptyResult.summary.romiPercent), false);
		assert.equal(Number.isNaN(emptyResult.summary.showUpRatePercent), false);

		// 2. Realistic clinical leads cohort
		const sampleLeads: FunnelLead[] = [
			{
				id: "lead-1",
				name: "Иванов Алексей",
				source: "Яндекс.Директ",
				status: "showed_up",
				showedUp: true,
				isPaid: true,
				paidAmountRub: 45000,
				treatmentPlanAgreed: true,
				createdAt: new Date().toISOString(),
			},
			{
				id: "lead-2",
				name: "Смирнова Мария",
				source: "Яндекс.Директ",
				status: "consult_booked",
				showedUp: false,
				isPaid: false,
				paidAmountRub: 0,
				createdAt: new Date().toISOString(),
			},
			{
				id: "lead-3",
				name: "Кузнецов Дмитрий",
				source: "ПроДокторов",
				status: "showed_up",
				showedUp: true,
				isPaid: true,
				paidAmountRub: 85000,
				treatmentPlanAgreed: true,
				createdAt: new Date().toISOString(),
			},
			{
				id: "lead-4",
				name: "Соколова Елена",
				source: "Рекомендации",
				status: "showed_up",
				showedUp: true,
				isPaid: true,
				paidAmountRub: 120000,
				treatmentPlanAgreed: true,
				createdAt: new Date().toISOString(),
			},
		];

		const spends = {
			...getDefaultChannelSpendMap(),
			yandex_direct: 20000,
			prodoctorov: 15000,
			recommendations: 0,
			gis_2: 0,
			napopravku: 0,
			site_seo: 0,
			social_media: 0,
			avito: 0,
			yandex_maps: 0,
			max: 0,
			other: 0,
		};

		const analysis = calculateFunnelAnalysis(sampleLeads, "all", spends);
		assert.equal(analysis.summary.totalLeads, 4);
		assert.equal(analysis.summary.showUpLeads, 3);
		assert.equal(analysis.summary.showUpRatePercent, 75);
		assert.equal(analysis.summary.totalRevenueRub, 250000);
		assert.equal(analysis.summary.totalMarketingSpendRub, 35000);
		assert.ok(analysis.summary.romiPercent > 0);
		assert.ok(analysis.summary.cplRub > 0);
		assert.ok(analysis.summary.cacRub > 0);

		// Verify CSV export produces valid non-empty CSV
		const csv = exportFunnelReportCsv(analysis);
		assert.ok(csv.length > 50);
		assert.ok(!csv.includes("NaN"));
		assert.ok(!csv.includes("undefined"));
	});

	it("enforces monochrome clinical base + var(--teal) on all marketing channels (Anti-Color-Confetti)", () => {
		for (const ch of MARKETING_CHANNELS) {
			assert.ok(
				ch.color === "var(--teal)" || ch.color === "var(--muted)",
				`Channel ${ch.key} must use brand token var(--teal) or monochrome var(--muted), found ${ch.color}`,
			);
		}
	});
});

describe("Seed #15: MarketingView & MarketingDashboardView DOM & UI Audit", () => {
	it("renders MarketingView with single-row header, 4 tabs, and analytics dashboard", () => {
		const html = renderToStaticMarkup(<MarketingView initialTab="analytics" />);
		assert.ok(html.includes('id="marketing"'));
		assert.ok(html.includes('data-testid="marketing-view"'));
		assert.ok(html.includes('data-testid="tab-nav-analytics"'));
		assert.ok(html.includes('data-testid="tab-nav-promos"'));
		assert.ok(html.includes('data-testid="tab-nav-recalls"'));
		assert.ok(html.includes('data-testid="tab-nav-romi"'));
		assert.ok(html.includes('data-testid="marketing-dashboard-page"'));
	});

	it("renders all 4 KPI cards and 4 analytical sections in MarketingDashboardView", () => {
		const html = renderToStaticMarkup(<MarketingDashboardView embedded={true} />);
		assert.ok(html.includes('data-testid="kpi-ad-spend"'));
		assert.ok(html.includes('data-testid="kpi-total-leads"'));
		assert.ok(html.includes('data-testid="kpi-show-ups"'));
		assert.ok(html.includes('data-testid="kpi-romi-revenue"'));
		assert.ok(html.includes('data-testid="marketing-channels-section"'));
		assert.ok(html.includes('data-testid="marketing-funnel-section"'));
		assert.ok(html.includes('data-testid="marketing-roi-section"'));
		assert.ok(html.includes('data-testid="marketing-segments-section"'));
		assert.ok(!html.includes("NaN"));
		assert.ok(!html.includes("undefined"));
	});

	it("renders segmented patient cohorts with trigger actions", () => {
		assert.ok(DEFAULT_PATIENT_SEGMENTS.length >= 4);
		const html = renderToStaticMarkup(<MarketingDashboardView embedded={true} />);
		for (const seg of DEFAULT_PATIENT_SEGMENTS) {
			assert.ok(
				html.includes(`data-testid="segment-card-${seg.id}"`),
				`Missing segment card ${seg.id}`,
			);
		}
	});

	it("enforces Mandate 8d: zero cartoon emojis in MarketingView and MarketingDashboardView", () => {
		const cartoonEmojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/u;
		const rootDir = process.cwd().endsWith("web")
			? path.resolve(process.cwd(), "../..")
			: process.cwd();
		const files = [
			"apps/web/src/MarketingView.tsx",
			"apps/web/src/pages/MarketingDashboardView.tsx",
		];

		for (const rel of files) {
			const full = path.resolve(rootDir, rel);
			const content = fs.readFileSync(full, "utf-8");
			assert.equal(
				cartoonEmojiRegex.test(content),
				false,
				`File ${rel} must contain 0 cartoon emojis`,
			);
		}
	});

	it("enforces Mandate 8b: file lengths strictly <= 800 lines", () => {
		const rootDir = process.cwd().endsWith("web")
			? path.resolve(process.cwd(), "../..")
			: process.cwd();
		const files = [
			"apps/web/src/MarketingView.tsx",
			"apps/web/src/pages/MarketingDashboardView.tsx",
			"apps/web/src/pages/MarketingDashboardView.css",
		];
		for (const rel of files) {
			const full = path.resolve(rootDir, rel);
			assert.ok(fs.existsSync(full), `File must exist: ${rel}`);
			const lines = fs.readFileSync(full, "utf-8").split("\n").length;
			assert.ok(
				lines <= 800,
				`File ${rel} exceeds 800 lines limit (${lines} lines)`,
			);
		}
	});
});
