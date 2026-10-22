/**
 * apps/web/src/components/analytics/__tests__/leadsCollapsiblePanels.test.ts
 * Mandate 8b: File <= 120 lines. Collapsible leads analytics panels test.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const analyticsDir = path.resolve(__dirname, "..");
const leadsDir = path.resolve(__dirname, "../../leads");

test("LeadsFunnelAnalyticsModal implements collapsible panels for Waterfall and Channels Table", () => {
	const filePath = path.join(leadsDir, "LeadsFunnelAnalyticsModal.tsx");
	assert.ok(fs.existsSync(filePath), "LeadsFunnelAnalyticsModal.tsx must exist");
	const waterfallPath = path.join(leadsDir, "FunnelWaterfallSection.tsx");
	const waterfallStripPath = path.join(leadsDir, "FunnelWaterfallCompactStrip.tsx");
	const channelsPath = path.join(leadsDir, "FunnelChannelsTableSection.tsx");
	const channelsStripPath = path.join(leadsDir, "FunnelChannelsCompactStrip.tsx");
	const content =
		fs.readFileSync(filePath, "utf8") +
		(fs.existsSync(waterfallPath) ? fs.readFileSync(waterfallPath, "utf8") : "") +
		(fs.existsSync(waterfallStripPath) ? fs.readFileSync(waterfallStripPath, "utf8") : "") +
		(fs.existsSync(channelsPath) ? fs.readFileSync(channelsPath, "utf8") : "") +
		(fs.existsSync(channelsStripPath) ? fs.readFileSync(channelsStripPath, "utf8") : "");

	assert.ok(content.includes('data-testid="toggle-leads-waterfall-btn"'));
	assert.ok(content.includes('data-testid="leads-waterfall-compact-strip"'));
	assert.ok(content.includes('data-testid="leads-waterfall-expanded"'));
	assert.ok(content.includes('data-testid="toggle-channels-table-btn"'));
	assert.ok(content.includes('data-testid="channels-compact-strip"'));
	assert.ok(content.includes('data-testid="channels-table-expanded"'));
});

test("MarketingRoiModal implements collapsible 5-stage funnel breakdown", () => {
	const filePath = path.join(analyticsDir, "MarketingRoiModal.tsx");
	assert.ok(fs.existsSync(filePath), "MarketingRoiModal.tsx must exist");
	const content = fs.readFileSync(filePath, "utf8");

	assert.ok(content.includes('data-testid="toggle-funnel-stages-btn"'));
	assert.ok(content.includes('data-testid="funnel-compact-summary"'));
	assert.ok(content.includes('data-testid="funnel-stages-expanded"'));
});
