/**
 * @file realFinanceAndReceipts.test.ts
 * @description Real Finance and Receipts Integration & Autonomy Suite (Wave 21).
 * Verifies FinanceView modular architecture, 54-FZ calculations, cash shift workflows,
 * and test anchor preservation without mocks.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
	FinanceView,
	FinanceOperationsToolbar,
	FinanceSummaryCards,
	FinanceTransactionsTable,
	useFinanceView,
	EMPTY_CLINICAL_RULE_SUMMARY,
	noLabels,
} from "../FinanceView";
import { localDayKey, summarizeCashDay } from "../components/finance/cashDaySummary";
import { rubAmountForInput } from "../components/payments/cashDeskAmounts.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("REAL FINANCE & RECEIPTS INTEGRATION SUITE (Wave 21 Decomposed Modules)", () => {
	const facadePath = path.resolve(__dirname, "../FinanceView.tsx");
	const viewsDirPath = path.resolve(__dirname, "../views/financeView");

	it("1. Verifies thin facade budget and exports parity", () => {
		assert.ok(fs.existsSync(facadePath), "Facade FinanceView.tsx must exist");
		const facadeContent = fs.readFileSync(facadePath, "utf-8");
		const lineCount = facadeContent.split("\n").length;
		assert.ok(
			lineCount <= 150,
			`Facade line count (${lineCount}) must be strictly <= 150 lines`,
		);

		assert.equal(typeof FinanceView, "function", "FinanceView must be exported as a function");
		assert.equal(typeof FinanceOperationsToolbar, "function", "FinanceOperationsToolbar must be exported");
		assert.equal(typeof FinanceSummaryCards, "function", "FinanceSummaryCards must be exported");
		assert.equal(typeof FinanceTransactionsTable, "function", "FinanceTransactionsTable must be exported");
		assert.equal(typeof useFinanceView, "function", "useFinanceView hook must be exported");
	});

	it("2. Verifies all decomposed files in views/financeView respect <= 800 lines limit", () => {
		const files = fs.readdirSync(viewsDirPath);
		assert.ok(files.length >= 5, "Must contain all required layer files");

		for (const file of files) {
			if (/\.(ts|tsx)$/.test(file)) {
				const fullPath = path.join(viewsDirPath, file);
				const content = fs.readFileSync(fullPath, "utf-8");
				const lines = content.split("\n").length;
				assert.ok(
					lines <= 800,
					`File ${file} has ${lines} lines, exceeding the 800-line limit`,
				);
			}
		}
	});

	it("3. Verifies test anchors in decomposed view directory", () => {
		const indexPath = path.join(viewsDirPath, "index.tsx");
		const toolbarPath = path.join(viewsDirPath, "FinanceOperationsToolbar.tsx");
		assert.ok(fs.existsSync(indexPath), "index.tsx must exist");
		assert.ok(fs.existsSync(toolbarPath), "FinanceOperationsToolbar.tsx must exist");

		const bannerPath = path.join(viewsDirPath, "PendingCheckoutBanner.tsx");
		const cashboxSectionPath = path.join(viewsDirPath, "FinanceCashboxSection.tsx");
		const combined = fs.readFileSync(indexPath, "utf-8") + "\n" +
			fs.readFileSync(toolbarPath, "utf-8") +
			(fs.existsSync(bannerPath) ? "\n" + fs.readFileSync(bannerPath, "utf-8") : "") +
			(fs.existsSync(cashboxSectionPath) ? "\n" + fs.readFileSync(cashboxSectionPath, "utf-8") : "");

		assert.ok(combined.includes('id="finance"'), "Must preserve id='finance'");
		assert.ok(
			combined.includes('data-testid="clinical-checkout-handoff-banner"'),
			"Must preserve data-testid='clinical-checkout-handoff-banner'",
		);
		assert.ok(
			combined.includes('data-testid="cash-shift-panel-container"'),
			"Must preserve data-testid='cash-shift-panel-container'",
		);
		assert.ok(
			combined.includes('finance-cashbox-container'),
			"Must preserve finance-cashbox-container anchor",
		);
	});

	it("4. Verifies real cash day calculations and kopeck exactness", () => {
		const samplePayments = [
			{
				id: "p-1",
				paidAt: new Date().toISOString(),
				amountRub: 5000,
				method: "cash" as const,
			},
			{
				id: "p-2",
				paidAt: new Date().toISOString(),
				amountRub: 12500.5,
				method: "card" as const,
			},
			{
				id: "p-3",
				paidAt: new Date().toISOString(),
				amountRub: 3500.25,
				method: "online" as const,
			},
		];

		const todayKey = localDayKey(new Date());
		assert.ok(todayKey, "localDayKey must return valid day key");

		const totals = summarizeCashDay(samplePayments as any, todayKey);
		assert.equal(totals.cashRub, 5000, "Cash total must match exactly");
		assert.equal(totals.cardRub, 12500.5, "Card total must match exactly");
		assert.equal(totals.sbpRub, 3500.25, "SBP (online) total must match exactly");
		assert.equal(totals.receivedRub, 21000.75, "Received total must sum with exact kopecks");
	});

	it("5. Verifies rubAmountForInput sanitization without NaN leakage", () => {
		assert.equal(rubAmountForInput(1500), "1500");
		assert.equal(rubAmountForInput(0), "");
		assert.equal(rubAmountForInput(-500), "");
		assert.equal(rubAmountForInput(Number.NaN), "");
		assert.equal(rubAmountForInput(undefined as unknown as number), "");
		assert.equal(rubAmountForInput(1250.75), "1250,75");
	});

	it("6. Verifies fallback constants safety", () => {
		assert.deepEqual(EMPTY_CLINICAL_RULE_SUMMARY, {
			activeRules: 0,
			evaluatedRules: 0,
			unresolved: 0,
			blockers: 0,
			warnings: 0,
			requiredServices: 0,
			coveredRules: 0,
		});

		const labels = noLabels<"a" | "b">();
		assert.deepEqual(labels, {});
	});
});
