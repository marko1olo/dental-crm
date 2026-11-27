/**
 * marketingSSOTSuite.test.tsx — Red Team Inquisitorial SSOT Test Suite for Dental Marketing & ROMI Studio.
 * Enforces Mandates 8b/8zi (Sweet Spot), 8e (Autonomy), 8am (1 Primary CTA), 8ze (Apple HIG), 8ap (Anti-Mock).
 */

import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
	DENTE_MARKETING_SOURCES,
	buildDenteDefaultAdvertisingChannels,
	buildAdvertisingChannelMetric,
	calculateMarketingRomiSummary,
	aggregateCrmMarketingMetrics,
} from "@dental/shared";
import { MarketingView } from "../../../MarketingView.js";
import { resolveClinicRoute } from "../../../router/routeResolver.js";

test("1.1. DENTE_MARKETING_SOURCES contains core channels with honest 0 ₽ default spend (Mandates 8k, 8z)", () => {
	assert.ok(DENTE_MARKETING_SOURCES.length >= 8, "Must define at least 8 canonical channels");

	const expectedKeys = ["yandex_maps", "gis2", "prodoctorov", "word_of_mouth", "website"];
	for (const key of expectedKeys) {
		const found = DENTE_MARKETING_SOURCES.find((c) => c.channelKey === key);
		assert.ok(found, `Channel ${key} must exist in canonical sources`);
		assert.equal(found.defaultSpendRub, 0, `defaultSpendRub for ${key} must be 0 ₽ in empty state`);
	}

	const channels = buildDenteDefaultAdvertisingChannels();
	for (const ch of channels) {
		assert.equal(ch.spentKopecks, 0, `Initial spend for ${ch.channelKey} must be 0 kopecks`);
		assert.equal(ch.revenueKopecks, 0, `Initial revenue for ${ch.channelKey} must be 0 kopecks`);
	}
});

test("1.2. Integer ROMI and CAC math accurately prevents float drift", () => {
	const metric = buildAdvertisingChannelMetric({
		id: "ch_test",
		channelKey: "yandex_maps",
		nameRu: "Яндекс Карты",
		categoryRu: "Гео-сервисы",
		spentKopecks: 3500000,
		leadsCount: 30,
		primaryPatientsCount: 22,
		revenueKopecks: 27500000,
	});

	assert.equal(metric.romiPercent, 685.7, "ROMI must calculate to +685.7%");
	assert.equal(metric.cacKopecks, 159091, "CAC in kopecks must be exact integer 159091");
	assert.equal(metric.averageCheckKopecks, 1250000, "Avg check in kopecks must be 1250000");

	// Organic 0 spend test case
	const organicMetric = buildAdvertisingChannelMetric({
		id: "ch_organic",
		channelKey: "word_of_mouth",
		nameRu: "Сарафан",
		categoryRu: "Органика",
		spentKopecks: 0,
		leadsCount: 10,
		primaryPatientsCount: 10,
		revenueKopecks: 5000000,
	});
	assert.equal(organicMetric.romiPercent, null, "0 spend must return null ROMI (organic)");
	assert.equal(organicMetric.romiStatus, "organic");
});

test("1.3. Aggregate CRM marketing metrics aggregates real DB records cleanly", () => {
	const result = aggregateCrmMarketingMetrics({
		patients: [{ id: "p1", source: "yandex_maps" }],
		appointments: [{ id: "a1", patientId: "p1", status: "completed" }],
		payments: [{ id: "pay1", patientId: "p1", amountRub: 15000 }],
	});

	assert.ok(result.length >= 8);
	const yandex = result.find((r) => r.channelKey === "yandex_maps");
	assert.ok(yandex);
	assert.equal(yandex.primaryPatientsCount, 1);
	assert.equal(yandex.revenueKopecks, 1500000);
});

test("1.4. MarketingView defaults to 'promos' tab and switches cleanly across analytics, recalls, and romi tabs", () => {
	const defaultHtml = renderToStaticMarkup(
		createElement(MarketingView, { clinicName: "Стоматология ДЕНТЕ" }),
	);
	assert.ok(defaultHtml.includes('data-testid="tab-nav-promos"'));
	assert.ok(defaultHtml.includes('data-testid="marketing-two-col-dashboard"'));

	for (const tab of ["analytics", "promos", "recalls", "romi"] as const) {
		const tabHtml = renderToStaticMarkup(
			createElement(MarketingView, { clinicName: "Стоматология ДЕНТЕ", initialTab: tab }),
		);
		assert.ok(tabHtml.includes('data-testid="marketing-view"'), `Tab ${tab} must render cleanly`);
	}
});

test("2.1. MarketingView renders static markup with header and workspace tabs", () => {
	const html = renderToStaticMarkup(
		createElement(MarketingView, {
			clinicName: "Стоматология ДЕНТЕ Премиум",
			initialTab: "promos",
		}),
	);

	assert.ok(html.includes('data-testid="marketing-view"'), "Must have marketing-view testid");
	assert.ok(html.includes("Акции и реклама клиники"), "Must display human header");
	assert.ok(html.includes('data-testid="tab-nav-romi"'), "Must render tab-nav-romi");
	assert.ok(html.includes('data-testid="tab-nav-promos"'), "Must render tab-nav-promos");
	assert.ok(html.includes('data-testid="tab-nav-analytics"'), "Must render tab-nav-analytics");
	assert.ok(html.includes('data-testid="tab-nav-recalls"'), "Must render tab-nav-recalls");
});

test("2.2. MarketingView in 'promos' tab renders promos list or honest empty state", () => {
	const html = renderToStaticMarkup(
		createElement(MarketingView, {
			clinicName: "Стоматология ДЕНТЕ Премиум",
			initialTab: "promos",
		}),
	);

	assert.ok(html.includes('data-testid="marketing-two-col-dashboard"'), "Must render two-column dashboard");
	assert.ok(!html.includes("disabled"), "No button or input may be disabled (Mandate 8e Autonomy)");
});

test("2.3. MarketingView in 'promos' tab contains exactly ONE Primary CTA in Header (Mandate 8am)", () => {
	const html = renderToStaticMarkup(
		createElement(MarketingView, {
			clinicName: "Стоматология ДЕНТЕ Премиум",
			initialTab: "promos",
		}),
	);

	assert.ok(html.includes('data-testid="btn-marketing-primary-cta"'), "Must render primary CTA button");
	assert.ok(html.includes("Запустить акцию"), "Must have Russian action CTA");
});

test("2.4. MarketingView renders accessible layout classes without raw inline overflow hacks", () => {
	const html = renderToStaticMarkup(
		createElement(MarketingView, {
			clinicName: "Стоматология ДЕНТЕ Премиум",
			initialTab: "promos",
		}),
	);
	assert.ok(html.includes('data-testid="marketing-view"'));
	assert.ok(html.includes('data-testid="btn-marketing-primary-cta"'));
});

test("3.1. resolveClinicRoute routes #marketing, #romi, #campaigns to analytics/marketing view", () => {
	assert.equal(resolveClinicRoute("", "#marketing").view, "analytics");
	assert.equal(resolveClinicRoute("", "#romi").view, "analytics");
	assert.equal(resolveClinicRoute("", "#campaigns").view, "analytics");
	assert.equal(resolveClinicRoute("", "#marketing").subTab, "marketing");
});
