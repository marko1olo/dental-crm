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
	CANONICAL_MARKETING_CHANNELS,
	CANONICAL_PROMO_PACKAGES,
	calculateChannelRomi,
	calculateChannelCac,
	calculateChannelAvgCheck,
	formatKopecksToRub,
	formatRomiPercent,
	calculateMarketingAggregateSummary,
} from "../marketingCatalogData.js";
import { MarketingStudioModal } from "../MarketingStudioModal.js";
import { DirectMarketingLauncher } from "../DirectMarketingLauncher.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const marketingDir = path.resolve(__dirname, "..");
const webSrcDir = path.resolve(marketingDir, "../..");

test("1.1. CANONICAL_MARKETING_CHANNELS contains 6 core channels of RF private dentistry with exact integer kopecks", () => {
	assert.equal(CANONICAL_MARKETING_CHANNELS.length, 6, "Must define exactly 6 canonical channels");

	const expectedIds = ["yandex_maps", "gis2", "prodoctorov", "word_of_mouth", "website", "telegram"];
	for (const id of expectedIds) {
		const found = CANONICAL_MARKETING_CHANNELS.find((c) => c.id === id);
		assert.ok(found, `Channel ${id} must exist in canonical list`);
		assert.ok(Number.isInteger(found.spentKopecks), `spentKopecks for ${id} must be integer`);
		assert.ok(Number.isInteger(found.revenueKopecks), `revenueKopecks for ${id} must be integer`);
		assert.ok(Number.isInteger(found.profitKopecks), `profitKopecks for ${id} must be integer`);
		assert.ok(found.spentKopecks >= 0, "spentKopecks must be non-negative");
		assert.ok(found.revenueKopecks >= 0, "revenueKopecks must be non-negative");
	}

	// Verify organic word of mouth has 0 spend
	const organic = CANONICAL_MARKETING_CHANNELS.find((c) => c.id === "word_of_mouth");
	assert.equal(organic?.spentKopecks, 0, "Word of mouth must have 0 spend");
	assert.equal(organic?.romiPercent, null, "Organic ROMI must be null (representing infinity)");
});

test("1.2. Integer ROMI and CAC math accurately prevents float drift", () => {
	// Yandex Maps test case: 35 000 ₽ spent (3 500 000 kopecks), 275 000 ₽ revenue (27 500 000 kopecks)
	const romi = calculateChannelRomi(3500000, 27500000);
	assert.equal(romi, 685.7, "Yandex Maps ROMI must be +685.7%");

	// Organic 0 spend test case
	const organicRomi = calculateChannelRomi(0, 48000000);
	assert.equal(organicRomi, null, "0 spend must return null ROMI");

	// CAC test case: 35 000 ₽ spent, 22 patients
	const cac = calculateChannelCac(3500000, 22);
	assert.equal(cac, 159091, "CAC in kopecks must be 159091");
	assert.equal(formatKopecksToRub(cac).replace(/\s/g, " "), "1 591 ₽", "CAC must format to 1 591 ₽");

	// Average check test case: 275 000 ₽ revenue, 22 patients
	const avgCheck = calculateChannelAvgCheck(27500000, 22);
	assert.equal(avgCheck, 1250000, "Avg check in kopecks must be 1250000");
	assert.equal(formatKopecksToRub(avgCheck).replace(/\s/g, " "), "12 500 ₽");
});

test("1.3. Aggregate summary calculation aggregates across all channels cleanly", () => {
	const summary = calculateMarketingAggregateSummary(CANONICAL_MARKETING_CHANNELS);
	assert.equal(summary.totalChannelsCount, 6);
	assert.equal(summary.activeChannelsCount, 6);
	assert.ok(summary.totalRevenueKopecks > summary.totalSpentKopecks, "Clinic marketing must be net profitable");
	assert.ok(summary.overallRomiPercent !== null && summary.overallRomiPercent > 500, "Overall ROMI must exceed 500%");
	assert.ok(summary.totalPatientsCount > 100, "Primary patients count must be realistic");
});

test("1.4. CANONICAL_PROMO_PACKAGES contains realistic dental promos without float pricing", () => {
	assert.ok(CANONICAL_PROMO_PACKAGES.length >= 4, "Must define at least 4 canonical promo packages");

	const codes = CANONICAL_PROMO_PACKAGES.map((p) => p.promoCode);
	assert.ok(codes.includes("FAMILY-CHECKUP"), "Must include Family Checkup promo");
	assert.ok(codes.includes("HYGIENE-FIRST"), "Must include First Hygiene promo");
	assert.ok(codes.includes("ZOOM-GIFT"), "Must include Zoom Whitening promo");
	assert.ok(codes.includes("IMPLANT-ALLIN"), "Must include All-in Implant promo");

	for (const promo of CANONICAL_PROMO_PACKAGES) {
		assert.ok(Number.isInteger(promo.priceKopecks), `priceKopecks for ${promo.id} must be integer`);
		assert.ok(Number.isInteger(promo.regularPriceKopecks), `regularPriceKopecks for ${promo.id} must be integer`);
		assert.ok(promo.regularPriceKopecks >= promo.priceKopecks, "Regular price must be >= discounted price");
		assert.ok(promo.includedServices.length >= 3, "Must list at least 3 clinical services");
	}
});

test("2.1. MarketingStudioModal renders static markup with 4 KPI cards and tab navigation", () => {
	const html = renderToStaticMarkup(
		createElement(MarketingStudioModal, {
			isOpen: true,
			onClose: () => {},
			initialTab: "romi",
			clinicName: "Стоматология ДЕНТЕ Премиум",
		}),
	);

	assert.ok(html.includes("data-testid=\"marketing-studio-modal\""), "Must have studio modal testid");
	assert.ok(html.includes("Студия маркетинга и окупаемости рекламы (ROMI)"), "Must display human header");
	assert.ok(html.includes("data-testid=\"kpi-budget\""), "Must render budget KPI");
	assert.ok(html.includes("data-testid=\"kpi-revenue\""), "Must render revenue KPI");
	assert.ok(html.includes("data-testid=\"kpi-romi\""), "Must render ROMI KPI");
	assert.ok(html.includes("data-testid=\"kpi-patients\""), "Must render patients KPI");

	// Tab buttons
	assert.ok(html.includes("data-testid=\"tab-romi\""), "Must render tab-romi");
	assert.ok(html.includes("data-testid=\"tab-promos\""), "Must render tab-promos");
	assert.ok(html.includes("data-testid=\"tab-launch\""), "Must render tab-launch");

	// Channels table & mobile cards
	assert.ok(html.includes("data-testid=\"marketing-channels-table\""), "Must render desktop table");
	assert.ok(html.includes("data-testid=\"marketing-channels-mobile-list\""), "Must render mobile cards");
	assert.ok(html.includes("Яндекс Карты"));
	assert.ok(html.includes("2ГИС"));
	assert.ok(html.includes("ПроДокторов"));
	assert.ok(html.includes("Сарафанное радио"));
});

test("2.2. MarketingStudioModal in 'promos' tab renders active promotional packages", () => {
	const html = renderToStaticMarkup(
		createElement(MarketingStudioModal, {
			isOpen: true,
			onClose: () => {},
			initialTab: "promos",
			clinicName: "Стоматология ДЕНТЕ Премиум",
		}),
	);

	assert.ok(html.includes("data-testid=\"marketing-promos-grid\""), "Must render promos grid");
	assert.ok(html.includes("FAMILY-CHECKUP"), "Must show Family Checkup code");
	assert.ok(html.includes("HYGIENE-FIRST"), "Must show First Hygiene code");
	assert.ok(html.includes("ZOOM-GIFT"), "Must show Zoom Gift code");
});

test("2.3. MarketingStudioModal in 'launch' tab contains express launch form and exactly ONE Primary CTA in Teal", () => {
	const html = renderToStaticMarkup(
		createElement(MarketingStudioModal, {
			isOpen: true,
			onClose: () => {},
			initialTab: "launch",
			clinicName: "Стоматология ДЕНТЕ Премиум",
		}),
	);

	assert.ok(html.includes("data-testid=\"marketing-express-form\""), "Must render express launch form");
	assert.ok(html.includes("data-testid=\"btn-launch-promo\""), "Must render launch promo CTA button");
	assert.ok(html.includes("Запустить акцию в клинике за 1 клик"), "Must have action-oriented Russian CTA");

	// Check Mandate 8e: zero disabled buttons!
	assert.ok(!html.includes("disabled"), "No button or input may be disabled (Mandate 8e Autonomy)");

	// Read css to verify Primary CTA uses var(--teal) / #0d9488
	const cssPath = path.join(marketingDir, "marketing.css");
	const css = fs.readFileSync(cssPath, "utf8");
	assert.ok(css.includes(".marketing-primary-cta"), "Must have .marketing-primary-cta class");
	assert.ok(css.includes("var(--teal"), "Must style Primary CTA with var(--teal)");
});

test("2.4. Apple HIG Mobile Bottom Sheet ergonomics and 0px horizontal drift verified in CSS", () => {
	const cssPath = path.join(marketingDir, "marketing.css");
	const css = fs.readFileSync(cssPath, "utf8");

	assert.ok(css.includes("overflow-x: clip"), "Must prevent horizontal scroll drift (0px drift)");
	assert.ok(css.includes("rounded-t-[24px]") || css.includes("border-radius: 24px 24px 0 0"), "Must have 24px top rounded corners on mobile");
	assert.ok(css.includes("marketing-drag-handle"), "Must define tactile drag handle for mobile");
	assert.ok(css.includes("env(safe-area-inset-bottom)"), "Must respect iOS safe-area-inset-bottom");
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
	assert.ok(code.includes("id: \"marketing-studio\""), "Must have entry id marketing-studio");
	assert.ok(code.includes("Студия маркетинга, акций и ROMI"), "Must have title in registry");
});

test("4.1. File sizes conform to Mandate 8b/8zi (Sweet Spot limits)", () => {
	const dataLines = fs.readFileSync(path.join(marketingDir, "marketingCatalogData.ts"), "utf8").split("\n").length;
	assert.ok(dataLines >= 300 && dataLines <= 350, `marketingCatalogData.ts must be 300-350 lines (got ${dataLines})`);

	const modalLines = fs.readFileSync(path.join(marketingDir, "MarketingStudioModal.tsx"), "utf8").split("\n").length;
	assert.ok(modalLines >= 400 && modalLines <= 470, `MarketingStudioModal.tsx must be 400-470 lines (got ${modalLines})`);

	const launcherLines = fs.readFileSync(path.join(marketingDir, "DirectMarketingLauncher.tsx"), "utf8").split("\n").length;
	assert.ok(launcherLines >= 50 && launcherLines <= 70, `DirectMarketingLauncher.tsx must be 50-70 lines (got ${launcherLines})`);
});
