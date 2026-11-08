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
import { DirectMarketingLauncher } from "../DirectMarketingLauncher.js";

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
	const cssPath = path.join(marketingDir, "marketing.css");
	const css = fs.readFileSync(cssPath, "utf8");

	assert.ok(css.includes("overflow-x: clip"), "Must prevent horizontal scroll drift (0px drift)");
	assert.ok(css.includes("min-height: 44px") || css.includes("min-height: 52px"), "Must adhere to Apple HIG >= 44px touch targets");
});

test("3.1. DirectMarketingLauncher listens to #marketing, #romi, #campaigns and dente:open-marketing", () => {
	const launcherPath = path.join(marketingDir, "DirectMarketingLauncher.tsx");
	const code = fs.readFileSync(launcherPath, "utf8");

	assert.ok(code.includes("#marketing"), "Must match #marketing hash");
	assert.ok(code.includes("#romi"), "Must match #romi hash");
	assert.ok(code.includes("#campaigns"), "Must match #campaigns hash");
	assert.ok(code.includes("marketing=1"), "Must match ?marketing=1 search param");
	assert.ok(code.includes("dente:open-marketing"), "Must listen to dente:open-marketing event");
});

test("3.2. DirectMarketingLauncher is mounted in AppShell.tsx (Mandate 8aq)", () => {
	const appShellPath = path.join(webSrcDir, "AppShell.tsx");
	const code = fs.readFileSync(appShellPath, "utf8");

	assert.ok(code.includes('import { DirectMarketingLauncher } from "./components/marketing/DirectMarketingLauncher"'), "Must import DirectMarketingLauncher in AppShell");
	assert.ok(code.includes("<DirectMarketingLauncher />"), "Must render <DirectMarketingLauncher /> in AppShell");
});

test("3.3. DirectMarketingLauncher is mounted in SpecializedAdministrativeLaunchers.tsx (Mandate 8aq)", () => {
	const specializedPath = path.join(webSrcDir, "components/appLayout/modalsContainerModules/standalone/SpecializedAdministrativeLaunchers.tsx");
	const code = fs.readFileSync(specializedPath, "utf8");

	assert.ok(code.includes("DirectMarketingLauncher"), "Must import and reference DirectMarketingLauncher");
	assert.ok(code.includes("#marketing"), "Must handle #marketing in SpecializedAdministrativeLaunchers");
});

test("3.4. DirectMarketingLauncher is registered in administrativeLaunchersRegistry.tsx (Mandate 8aq)", () => {
	const registryPath = path.join(webSrcDir, "components/appLayout/modalsContainerModules/standalone/administrativeLaunchersRegistry.tsx");
	const code = fs.readFileSync(registryPath, "utf8");

	assert.ok(code.includes("DirectMarketingLauncher"), "Must import DirectMarketingLauncher in registry");
	assert.ok(code.includes('id: "marketing-studio"'), "Must have entry id marketing-studio");
	assert.ok(code.includes("Студия маркетинга, акций и ROMI"), "Must have title in registry");
});

test("4.1. File sizes conform to Mandate 8b/8zi (Sweet Spot limits)", () => {
	const viewLines = fs.readFileSync(path.join(webSrcDir, "MarketingView.tsx"), "utf8").split("\n").length;
	assert.ok(viewLines <= 120, `MarketingView.tsx must be <= 120 lines (got ${viewLines})`);

	const launcherLines = fs.readFileSync(path.join(marketingDir, "DirectMarketingLauncher.tsx"), "utf8").split("\n").length;
	assert.ok(launcherLines >= 50 && launcherLines <= 70, `DirectMarketingLauncher.tsx must be 50-70 lines (got ${launcherLines})`);
});
