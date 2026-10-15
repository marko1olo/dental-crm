import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	LeadsFunnelAnalyticsModal,
	mapLiveAttributionToChannelSpends,
	parseSanitizedBudgetRub,
	buildFunnelCsvFilename,
	resolveShowUpToneColor,
	resolveRomiToneColor,
} from "../LeadsFunnelAnalyticsModal";

const leadsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("LeadsFunnelAnalyticsModal & leadsFunnelAnalyticsModules Architectural Decomposition", () => {
	it("1. Facade line count budget (Mandate 8b: <= 120 lines)", () => {
		const facadePath = path.join(
			leadsDir,
			"LeadsFunnelAnalyticsModal.tsx",
		);
		const content = fs.readFileSync(facadePath, "utf8");
		const lineCount = content.split("\n").length;
		assert.ok(
			lineCount <= 120,
			`LeadsFunnelAnalyticsModal.tsx facade must be <= 120 lines (currently: ${lineCount})`,
		);
	});

	it("2. Module line count budgets (Mandate 8b: each file <= 800 lines)", () => {
		const modulesDir = path.join(
			leadsDir,
			"leadsFunnelAnalyticsModules",
		);
		const files = fs.readdirSync(modulesDir);
		assert.ok(files.length >= 6, "Expected at least 6 module files in leadsFunnelAnalyticsModules");
		for (const file of files) {
			const filePath = path.join(modulesDir, file);
			const lines = fs.readFileSync(filePath, "utf8").split("\n").length;
			assert.ok(
				lines <= 800,
				`Module ${file} must be <= 800 lines (currently: ${lines})`,
			);
		}
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
		assert.equal(result.social_media, 10000); // 6000 + 4000
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

	it("5. Static Invariants & Anti-Matryoshka Portals", () => {
		const facadePath = path.join(
			leadsDir,
			"LeadsFunnelAnalyticsModal.tsx",
		);
		const content = fs.readFileSync(facadePath, "utf8");

		assert.ok(
			content.includes("createPortal") && content.includes("document.body"),
			"LeadsFunnelAnalyticsModal must use createPortal to document.body",
		);
		assert.ok(
			content.includes("/api/marketing/attribution"),
			"Must reference /api/marketing/attribution endpoint",
		);
		assert.ok(
			content.includes("denteAdminSecretRequestHeaders"),
			"Must pass denteAdminSecretRequestHeaders",
		);
		assert.ok(
			content.includes("консультации врача у кресла"),
			"Must retain clinical context: консультации врача у кресла",
		);
	});

	it("6. SSR Render & Test Anchor Parity", () => {
		// When closed, returns null (empty markup)
		const closedHtml = renderToStaticMarkup(
			<LeadsFunnelAnalyticsModal
				isOpen={false}
				onClose={() => {}}
				leads={[]}
			/>,
		);
		assert.equal(closedHtml, "");

		// When open, renders full modal with all 6 test anchors
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
		assert.ok(openHtml.includes("Сквозная Воронка &amp; Маркетинг") || openHtml.includes("Сквозная Воронка & Маркетинг"));
		assert.ok(openHtml.includes("CRM Intelligence"));
	});
});
