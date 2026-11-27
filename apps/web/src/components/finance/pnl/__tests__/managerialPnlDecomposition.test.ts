import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ManagerialPnlDashboardModal } from "../ManagerialPnlDashboardModal.js";
import {
	PnlHeader,
	PnlSummaryCards,
	PnlRevenueSection,
	PnlDirectCostsSection,
	PnlIndirectCostsSection,
	PnlChairEconomicsTable,
	PnlMobileCards,
	PnlActionFooter,
	PnlModalContainer,
	ManagerialPnlModalAssembler,
} from "../dashboardModules/index.js";

describe("ManagerialPnlDashboardModal Behavioral & Decomposition Suite", () => {
	it("renders dynamic cashBoxCount & expenseCount in PnlHeader without hardcoded '6 касс · 12 регламентированных статей'", () => {
		const html = renderToStaticMarkup(
			React.createElement(PnlHeader, {
				periodPreset: "current_month",
				onSetPeriodPreset: () => {},
				onRefresh: () => {},
				onClose: () => {},
				loading: false,
				cashBoxCount: 3,
				expenseCount: 5,
			}),
		);
		assert.equal(html.includes("6 касс · 12 регламентированных статей"), false);
		assert.ok(html.includes("3 касс · 5 статей расходов"));
	});

	it("renders default fallback subtitle when counts are omitted", () => {
		const html = renderToStaticMarkup(
			React.createElement(PnlHeader, {
				periodPreset: "quarter",
				onSetPeriodPreset: () => {},
				onRefresh: () => {},
				onClose: () => {},
				loading: false,
			}),
		);
		assert.ok(html.includes("Управленческий учет"));
		assert.equal(html.includes("6 касс"), false);
	});

	it("renders ManagerialPnlDashboardModal null when closed and shell when open", () => {
		const closedHtml = renderToStaticMarkup(
			React.createElement(ManagerialPnlDashboardModal, { isOpen: false, onClose: () => {} }),
		);
		assert.equal(closedHtml, "");

		const openHtml = renderToStaticMarkup(
			React.createElement(ManagerialPnlDashboardModal, { isOpen: true, onClose: () => {} }),
		);
		assert.ok(openHtml.includes("Управленческий отчет P&amp;L") || openHtml.includes("Управленческий отчет P&L"));
		assert.equal(/<button[^>]*\bdisabled\b/i.test(openHtml), false);
	});

	it("exports all PNL dashboard submodules as valid React components", () => {
		for (const comp of [
			PnlHeader,
			PnlSummaryCards,
			PnlRevenueSection,
			PnlDirectCostsSection,
			PnlIndirectCostsSection,
			PnlChairEconomicsTable,
			PnlMobileCards,
			PnlActionFooter,
			PnlModalContainer,
			ManagerialPnlModalAssembler,
		]) {
			assert.ok(comp !== undefined);
		}
	});
});
