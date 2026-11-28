/**
 * apps/web/src/components/analytics/__tests__/analyticsDesktopDensityCss.test.ts
 * React SSR DOM & role visibility verification for Executive Dashboard & P&L footer (6G Live SUT).
 */

import assert from "node:assert/strict";
import test from "node:test";
import type { ManagerialPnlReport } from "@dental/shared";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PnlActionFooter } from "../../finance/pnl/dashboardModules/PnlActionFooter.tsx";
import {
	ExecutiveDashboard,
	resolveExecutiveDashboardVisibility,
} from "../ExecutiveDashboard.tsx";
import { ExecutiveAnalyticsStudioHeader } from "../studio/ExecutiveAnalyticsStudioHeader.tsx";
import { ExecutiveAnalyticsStudioFooter } from "../studio/ExecutiveAnalyticsStudioFooter.tsx";

test("PnlActionFooter renders single primary CTA, secondary print/export buttons, and privacy note for null and live reports", () => {
	const emptyMarkup = renderToStaticMarkup(
		React.createElement(PnlActionFooter, {
			report: null,
			onOpenQuickExpense: () => {},
			periodLabel: "Январь 2026",
		}),
	);
	assert.ok(emptyMarkup.includes('class="pnl-footer"'));
	assert.equal((emptyMarkup.match(/pnl-footer-btn-primary/g) ?? []).length, 1);
	assert.equal((emptyMarkup.match(/pnl-footer-btn-secondary/g) ?? []).length, 2);
	assert.ok(emptyMarkup.includes('data-testid="financial-privacy-note"'));
	assert.equal(emptyMarkup.includes('disabled=""'), false);

	const sampleReport: ManagerialPnlReport = {
		clinicName: "Клиника Тест",
		period: { from: "2026-01-01", to: "2026-01-31" },
		grossRevenueRub: 150000,
		totalCogsRub: 30000,
		directLabCostRub: 10000,
		grossProfitRub: 120000,
		grossMarginPct: 80,
		totalOpexRub: 40000,
		ebitdaRub: 80000,
		ebitdaMarginPct: 53.3,
		netProfitRub: 75000,
		netMarginPct: 50,
		departmentRevenue: [],
		statutoryExpenses: [],
	};
	const loadedMarkup = renderToStaticMarkup(
		React.createElement(PnlActionFooter, {
			report: sampleReport,
			onOpenQuickExpense: () => {},
			periodLabel: "Январь 2026",
		}),
	);
	assert.ok(loadedMarkup.includes("+ Внести расход"));
	assert.ok(loadedMarkup.includes("Экспорт CSV"));
	assert.equal(loadedMarkup.includes('disabled=""'), false);
});

test("ExecutiveAnalyticsStudioHeader, Footer & ExecutiveDashboard respect role visibility (Mandate 8n) and zero disabled buttons", () => {
	const soloVis = resolveExecutiveDashboardVisibility({
		clinicMode: "solo_doctor",
		selectedWorkspaceRole: "doctor",
		hasPayrollModule: true,
		hasMultipleChairs: false,
	});
	assert.equal(soloVis.isSoloDoctor, true);
	assert.equal(soloVis.showPayrollTab, false);
	assert.equal(soloVis.showChairsTab, false);
	assert.equal(soloVis.showPnlButton, true);

	const adminVis = resolveExecutiveDashboardVisibility({
		clinicMode: "clinic",
		selectedWorkspaceRole: "administrator",
		hasPayrollModule: true,
		hasMultipleChairs: true,
	});
	assert.equal(adminVis.showPayrollTab, false);
	assert.equal(adminVis.showPnlButton, false);

	const headerHtml = renderToStaticMarkup(
		React.createElement(ExecutiveAnalyticsStudioHeader, {
			titleId: "exec-title",
			period: "month",
			onPeriodChange: () => {},
			onClose: () => {},
		}),
	);
	assert.ok(headerHtml.includes('data-testid="studio-modal-close-btn"'));
	assert.ok(headerHtml.includes("min-h-[44px] min-w-[44px]"));

	const footerHtml = renderToStaticMarkup(
		React.createElement(ExecutiveAnalyticsStudioFooter, {
			isLoading: false,
			exportSuccess: false,
			onRefresh: () => {},
			onPrint: () => {},
			onExport: () => {},
		}),
	);
	assert.ok(footerHtml.includes('data-testid="studio-primary-export-btn"'));
	assert.equal((footerHtml.match(/primary-button/g) ?? []).length, 1);

	const dashHtml = renderToStaticMarkup(
		React.createElement(ExecutiveDashboard, {
			period: "month",
		}),
	);
	assert.ok(dashHtml.includes('data-testid="executive-dashboard-root"'));
	assert.equal(dashHtml.includes('disabled=""'), false);
});
