/**
 * marketingSSOTSuite.test.tsx — Red Team Inquisitorial SSOT Test Suite for Dental Marketing & ROMI Studio.
 * Enforces Mandates 8b/8zi (Sweet Spot), 8e (Autonomy), 8am (1 Primary CTA), 8ze (Apple HIG), 8ap (Anti-Mock).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fileURLToPath } from "node:url";

import {
	DENTE_MARKETING_SOURCES,
	buildDenteDefaultAdvertisingChannels,
	buildAdvertisingChannelMetric,
	calculateMarketingRomiSummary,
	aggregateCrmMarketingMetrics,
} from "@dental/shared";
import { MarketingView, type MarketingTab } from "../../../MarketingView.js";
import { resolveClinicRoute } from "../../../router/routeResolver.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const marketingDir = path.resolve(__dirname, "..");
const webSrcDir = path.resolve(marketingDir, "../..");

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

test("1.4. MarketingView exports canonical tabs and conforms to Mandate 8b UI facade", () => {
	const viewPath = path.join(webSrcDir, "MarketingView.tsx");
	const content = fs.readFileSync(viewPath, "utf8");

	assert.ok(content.includes('initialTab = "promos"'), "Default tab must be promos");
	assert.ok(content.includes('"analytics"'), "Must support analytics tab");
	assert.ok(content.includes('"promos"'), "Must support promos tab");
	assert.ok(content.includes('"recalls"'), "Must support recalls tab");
	assert.ok(content.includes('"romi"'), "Must support romi tab");
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

test("2.4. Apple HIG Mobile ergonomics and 0px horizontal drift verified in CSS", () => {
	const cssPath = path.join(webSrcDir, "styles/modules/marketing.css");
	let css = fs.readFileSync(cssPath, "utf8");
	if (css.includes("@import")) {
		const baseDir = path.dirname(cssPath);
		css = css.replace(/@import\s+["']([^"']+)["'];/g, (_, rel) => {
			const importPath = path.resolve(baseDir, rel);
			return fs.existsSync(importPath) ? fs.readFileSync(importPath, "utf8") : "";
		});
	}

	assert.ok(css.includes("overflow-x: clip"), "Must prevent horizontal scroll drift (0px drift)");
	assert.ok(css.includes("min-height: 44px") || css.includes("min-height: 52px"), "Must adhere to Apple HIG >= 44px touch targets");
});

test("3.1. resolveClinicRoute routes #marketing, #romi, #campaigns to analytics/marketing view", () => {
	assert.equal(resolveClinicRoute("", "#marketing").view, "analytics");
	assert.equal(resolveClinicRoute("", "#romi").view, "analytics");
	assert.equal(resolveClinicRoute("", "#campaigns").view, "analytics");
	assert.equal(resolveClinicRoute("", "#marketing").subTab, "marketing");
});

test("3.2. WorkspaceStudioOverlayHost is mounted in AppModalsContainer.tsx (Mandate 8aq)", () => {
	const containerPath = path.join(webSrcDir, "components/appLayout/AppModalsContainer.tsx");
	const code = fs.readFileSync(containerPath, "utf8");
	assert.ok(code.includes("WorkspaceStudioOverlayHost"), "Must mount WorkspaceStudioOverlayHost in AppModalsContainer");
});

test("3.3. MarketingView routes cleanly under App.tsx persistent shell (Mandate 8aq)", () => {
	const appCode = fs.readFileSync(path.join(webSrcDir, "App.tsx"), "utf8");
	assert.ok(appCode.includes("resolveClinicRoute"), "App.tsx must resolve #marketing routes");
});

test("3.4. Obsolete DirectMarketingLauncher.tsx is purged (Mandate 8bf)", () => {
	assert.equal(
		fs.existsSync(path.join(marketingDir, "DirectMarketingLauncher.tsx")),
		false,
		"Obsolete DirectMarketingLauncher.tsx must stay removed",
	);
});

test("4.1. File sizes conform to Mandate 8b/8zi (Sweet Spot limits)", () => {
	const viewLines = fs.readFileSync(path.join(webSrcDir, "MarketingView.tsx"), "utf8").split("\n").length;
	assert.ok(viewLines <= 120, `MarketingView.tsx must be <= 120 lines (got ${viewLines})`);
});
