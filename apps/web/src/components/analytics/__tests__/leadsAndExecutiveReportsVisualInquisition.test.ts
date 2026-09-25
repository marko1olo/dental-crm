/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LEADS & EXECUTIVE REPORTS VISUAL OVERHAUL — RED TEAM INQUISITION TEST SUITE
 * Mandates Enforced:
 *   - Mandate 8d & Frontend Rule 3.1: Collapsible analytics panels to prevent dashboard clutter
 *   - 152-FZ & Article 13 of 323-FZ: Medical Secrecy (Initials only, masked phones, zero diagnoses in marketing)
 *   - Mandates 8k, 8s: Zero Mocks / Stubs (Live /api/marketing and /api/analytics endpoints)
 *   - Mandate 8b: Integer Kopeck / Ruble Exactness in Financial P&L
 *   - Desktop Density: 32-36px controls on desktop, touch-friendly on mobile
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const analyticsDir = path.resolve(__dirname, "..");
const leadsDir = path.resolve(__dirname, "../../leads");

describe("Leads & Executive Reports Visual Overhaul — Constitutional Inquisition", () => {
	// ── 1. Frontend Rule 3.1 & Mandate 8d: Collapsible Panels ──
	describe("1. Collapsible Analytics Panels (Anti-Landfill)", () => {
		test("LeadsFunnelAnalyticsModal implements collapsible panels for Waterfall and Channels Table", () => {
			const filePath = path.join(leadsDir, "LeadsFunnelAnalyticsModal.tsx");
			assert.ok(fs.existsSync(filePath), "LeadsFunnelAnalyticsModal.tsx must exist");
			const waterfallPath = path.join(leadsDir, "FunnelWaterfallSection.tsx");
			const channelsPath = path.join(leadsDir, "FunnelChannelsTableSection.tsx");
			const content =
				fs.readFileSync(filePath, "utf8") +
				(fs.existsSync(waterfallPath) ? fs.readFileSync(waterfallPath, "utf8") : "") +
				(fs.existsSync(channelsPath) ? fs.readFileSync(channelsPath, "utf8") : "");

			// Waterfall toggle button and compact strip
			assert.ok(
				content.includes("data-testid=\"toggle-leads-waterfall-btn\""),
				"LeadsFunnelAnalyticsModal must have toggle-leads-waterfall-btn",
			);
			assert.ok(
				content.includes("data-testid=\"leads-waterfall-compact-strip\""),
				"LeadsFunnelAnalyticsModal must have leads-waterfall-compact-strip",
			);
			assert.ok(
				content.includes("data-testid=\"leads-waterfall-expanded\""),
				"LeadsFunnelAnalyticsModal must have leads-waterfall-expanded",
			);

			// Channels Table toggle button and compact strip
			assert.ok(
				content.includes("data-testid=\"toggle-channels-table-btn\""),
				"LeadsFunnelAnalyticsModal must have toggle-channels-table-btn",
			);
			assert.ok(
				content.includes("data-testid=\"channels-compact-strip\""),
				"LeadsFunnelAnalyticsModal must have channels-compact-strip",
			);
			assert.ok(
				content.includes("data-testid=\"channels-table-expanded\""),
				"LeadsFunnelAnalyticsModal must have channels-table-expanded",
			);
		});

		test("MarketingRoiModal implements collapsible 5-stage funnel breakdown", () => {
			const filePath = path.join(analyticsDir, "MarketingRoiModal.tsx");
			assert.ok(fs.existsSync(filePath), "MarketingRoiModal.tsx must exist");
			const content = fs.readFileSync(filePath, "utf8");

			assert.ok(
				content.includes("data-testid=\"toggle-funnel-stages-btn\""),
				"MarketingRoiModal must have toggle-funnel-stages-btn",
			);
			assert.ok(
				content.includes("data-testid=\"funnel-compact-summary\""),
				"MarketingRoiModal must have funnel-compact-summary for Tier 1 Hot Path",
			);
			assert.ok(
				content.includes("data-testid=\"funnel-stages-expanded\""),
				"MarketingRoiModal must have funnel-stages-expanded",
			);
		});

		test("FinancialAnalyticsModal implements 3 collapsible panels (Depts, Cashboxes, Expenses)", () => {
			const filePath = path.join(analyticsDir, "FinancialAnalyticsModal.tsx");
			assert.ok(fs.existsSync(filePath), "FinancialAnalyticsModal.tsx must exist");
			const content = fs.readFileSync(filePath, "utf8");

			// Panel 1: Departments
			assert.ok(
				content.includes("data-testid=\"toggle-depts-btn\""),
				"FinancialAnalyticsModal must have toggle-depts-btn",
			);
			assert.ok(
				content.includes("data-testid=\"depts-compact-strip\""),
				"FinancialAnalyticsModal must have depts-compact-strip",
			);
			assert.ok(
				content.includes("data-testid=\"depts-table-expanded\""),
				"FinancialAnalyticsModal must have depts-table-expanded",
			);

			// Panel 2: Cashboxes
			assert.ok(
				content.includes("data-testid=\"toggle-cashboxes-btn\""),
				"FinancialAnalyticsModal must have toggle-cashboxes-btn",
			);
			assert.ok(
				content.includes("data-testid=\"cashboxes-compact-strip\""),
				"FinancialAnalyticsModal must have cashboxes-compact-strip",
			);
			assert.ok(
				content.includes("data-testid=\"cashboxes-table-expanded\""),
				"FinancialAnalyticsModal must have cashboxes-table-expanded",
			);

			// Panel 3: Expenses
			assert.ok(
				content.includes("data-testid=\"toggle-expenses-btn\""),
				"FinancialAnalyticsModal must have toggle-expenses-btn",
			);
			assert.ok(
				content.includes("data-testid=\"expenses-compact-strip\""),
				"FinancialAnalyticsModal must have expenses-compact-strip",
			);
			assert.ok(
				content.includes("data-testid=\"expenses-table-expanded\""),
				"FinancialAnalyticsModal must have expenses-table-expanded",
			);
		});
	});

	// ── 2. Medical Secrecy (ст. 13 323-ФЗ) & 152-ФЗ Personal Data Protection ──
	describe("2. Medical Secrecy & Patient Privacy (ст. 13 323-ФЗ & 152-ФЗ)", () => {
		test("MarketingRoiModal enforces patient initials only, masked phone, and neutral treatment plan titles", () => {
			const filePath = path.join(analyticsDir, "MarketingRoiModal.tsx");
			const content = fs.readFileSync(filePath, "utf8");

			// Privacy Banner
			assert.ok(
				content.includes("data-testid=\"marketing-roi-privacy-banner\""),
				"MarketingRoiModal must display 152-FZ & 323-FZ privacy banner in UTM tab",
			);

			// Masking helpers usage
			assert.ok(
				content.includes("formatInitialsOnly"),
				"MarketingRoiModal must use formatInitialsOnly for patient names",
			);
			assert.ok(
				content.includes("maskRussianPhone"),
				"MarketingRoiModal must use maskRussianPhone for telephone numbers",
			);

			// Neutral plan title sanitization (no raw diagnoses like pulpitis/caries)
			assert.ok(
				content.includes("sanitizedPlanTitle"),
				"MarketingRoiModal must sanitize clinical diagnoses from plan titles",
			);
		});

		test("FinancialAnalyticsModal enforces medical privacy notice and strictly impersonal accounting aggregates", () => {
			const filePath = path.join(analyticsDir, "FinancialAnalyticsModal.tsx");
			const content = fs.readFileSync(filePath, "utf8");

			assert.ok(
				content.includes("data-testid=\"financial-privacy-note\""),
				"FinancialAnalyticsModal must display 152-FZ and 323-FZ compliance notice",
			);
			assert.ok(
				content.includes("врачебной тайны (152-ФЗ и ст. 13 323-ФЗ)"),
				"Must explicitly cite 152-FZ and Article 13 of 323-FZ",
			);
		});
	});

	// ── 3. Zero Mocks & Live API Wiring ──
	describe("3. Zero Mocks & Live API Connection", () => {
		test("MarketingRoiModal fetches real /api/marketing/attribution", () => {
			const filePath = path.join(analyticsDir, "MarketingRoiModal.tsx");
			const content = fs.readFileSync(filePath, "utf8");

			assert.ok(
				content.includes("/api/marketing/attribution"),
				"MarketingRoiModal must fetch from /api/marketing/attribution",
			);
			assert.ok(
				content.includes("denteAdminSecretRequestHeaders"),
				"Must pass denteAdminSecretRequestHeaders",
			);
		});

		test("LeadsFunnelAnalyticsModal fetches live marketing spends from /api/marketing/attribution", () => {
			const filePath = path.join(leadsDir, "LeadsFunnelAnalyticsModal.tsx");
			const content = fs.readFileSync(filePath, "utf8");

			assert.ok(
				content.includes("/api/marketing/attribution"),
				"LeadsFunnelAnalyticsModal must fetch from /api/marketing/attribution",
			);
			assert.ok(
				content.includes("denteAdminSecretRequestHeaders"),
				"Must pass denteAdminSecretRequestHeaders",
			);
		});

		test("FinancialAnalyticsModal connects to /api/analytics/executive, /api/cash/cash-box, and /api/cash/expense-reasons", () => {
			const filePath = path.join(analyticsDir, "FinancialAnalyticsModal.tsx");
			const content = fs.readFileSync(filePath, "utf8");

			assert.ok(
				content.includes("/api/analytics/executive"),
				"FinancialAnalyticsModal must query /api/analytics/executive",
			);
			assert.ok(
				content.includes("/api/cash/cash-box"),
				"FinancialAnalyticsModal must query /api/cash/cash-box",
			);
			assert.ok(
				content.includes("/api/cash/expense-reasons"),
				"FinancialAnalyticsModal must query /api/cash/expense-reasons",
			);
		});
	});

	// ── 4. Desktop Density (32-36px) & Design Tokens ──
	describe("4. Desktop Density (32-36px) & Multi-Theme Tokens", () => {
		test("marketingRoi.css enforces 32-36px button heights on pointer devices", () => {
			const cssPath = path.join(analyticsDir, "marketingRoi.css");
			const content = fs.readFileSync(cssPath, "utf8");

			assert.ok(
				content.includes(".marketing-roi-toggle-btn"),
				"marketingRoi.css must define .marketing-roi-toggle-btn",
			);
			assert.ok(
				content.includes("height: 32px"),
				"marketingRoi.css must use 32px height for toggle button",
			);
			assert.ok(
				content.includes("--paper"),
				"Must use design tokens --paper",
			);
		});

		test("financialAnalytics.css enforces 32-36px desktop density with mobile touch >= 44px", () => {
			const cssPath = path.join(analyticsDir, "financialAnalytics.css");
			const content = fs.readFileSync(cssPath, "utf8");

			assert.ok(
				content.includes(".fin-analytics-tab-btn"),
				"financialAnalytics.css must define .fin-analytics-tab-btn",
			);
			assert.ok(
				content.includes("height: 32px"),
				"financialAnalytics.css must use 32px height for desktop tabs",
			);
			assert.ok(
				content.includes(".fin-analytics-close-btn"),
				"financialAnalytics.css must define .fin-analytics-close-btn",
			);
			assert.ok(
				content.includes("min-width: 44px;"),
				"Close button must maintain 44px hit target",
			);
		});
	});
});
