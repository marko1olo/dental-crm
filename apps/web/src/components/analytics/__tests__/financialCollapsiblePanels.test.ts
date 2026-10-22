/**
 * apps/web/src/components/analytics/__tests__/financialCollapsiblePanels.test.ts
 * Mandate 8b: File <= 120 lines. Collapsible financial analytics panels test.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const analyticsDir = path.resolve(__dirname, "..");

test("FinancialAnalyticsModal implements 3 collapsible panels (Depts, Cashboxes, Expenses)", () => {
	const filePath = path.join(analyticsDir, "FinancialAnalyticsModal.tsx");
	assert.ok(fs.existsSync(filePath), "FinancialAnalyticsModal.tsx must exist");
	const finModulesDir = path.join(analyticsDir, "financialModalModules");
	const pnlBreakdownPath = path.join(finModulesDir, "FinancialPnlBreakdownSection.tsx");
	const cashflowPath = path.join(finModulesDir, "FinancialCashflowTimeline.tsx");
	const content =
		fs.readFileSync(filePath, "utf8") +
		(fs.existsSync(pnlBreakdownPath) ? fs.readFileSync(pnlBreakdownPath, "utf8") : "") +
		(fs.existsSync(cashflowPath) ? fs.readFileSync(cashflowPath, "utf8") : "");

	// Panel 1: Departments
	assert.ok(content.includes('data-testid="toggle-depts-btn"'));
	assert.ok(content.includes('data-testid="depts-compact-strip"'));
	assert.ok(content.includes('data-testid="depts-table-expanded"'));

	// Panel 2: Cashboxes
	assert.ok(content.includes('data-testid="toggle-cashboxes-btn"'));
	assert.ok(content.includes('data-testid="cashboxes-compact-strip"'));
	assert.ok(content.includes('data-testid="cashboxes-table-expanded"'));

	// Panel 3: Expenses
	assert.ok(content.includes('data-testid="toggle-expenses-btn"'));
	assert.ok(content.includes('data-testid="expenses-compact-strip"'));
	assert.ok(content.includes('data-testid="expenses-table-expanded"'));
});
