import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as PnlModules from "../dashboardModules/index.js";

describe("ManagerialPnlDashboardModal Mandate 8b Decomposition & Invariants", () => {
	const dashboardModules = [
		"apps/web/src/components/finance/pnl/dashboardModules/PnlHeader.tsx",
		"apps/web/src/components/finance/pnl/dashboardModules/PnlSummaryCards.tsx",
		"apps/web/src/components/finance/pnl/dashboardModules/PnlRevenueSection.tsx",
		"apps/web/src/components/finance/pnl/dashboardModules/PnlDirectCostsSection.tsx",
		"apps/web/src/components/finance/pnl/dashboardModules/PnlIndirectCostsSection.tsx",
		"apps/web/src/components/finance/pnl/dashboardModules/PnlChairEconomicsTable.tsx",
		"apps/web/src/components/finance/pnl/dashboardModules/PnlMobileCards.tsx",
		"apps/web/src/components/finance/pnl/dashboardModules/PnlActionFooter.tsx",
		"apps/web/src/components/finance/pnl/dashboardModules/PnlModalContainer.tsx",
		"apps/web/src/components/finance/pnl/dashboardModules/ManagerialPnlModalAssembler.tsx",
		"apps/web/src/components/finance/pnl/dashboardModules/index.ts",
	];

	const cssStyles = [
		"apps/web/src/components/finance/pnl/pnlStyles/pnlLayout.css",
		"apps/web/src/components/finance/pnl/pnlStyles/pnlHeader.css",
		"apps/web/src/components/finance/pnl/pnlStyles/pnlKpiCards.css",
		"apps/web/src/components/finance/pnl/pnlStyles/pnlBreakdownTable.css",
		"apps/web/src/components/finance/pnl/pnlStyles/pnlFooter.css",
		"apps/web/src/components/finance/pnl/pnlStyles/pnlMobile.css",
		"apps/web/src/components/finance/pnl/pnlStyles/pnlDarkTheme.css",
	];

	it("guarantees every decomposed TSX module is in healthy sweet spot <= 350 lines", () => {
		for (const relPath of dashboardModules) {
			const fullPath = path.resolve(process.cwd(), relPath);
			assert.ok(fs.existsSync(fullPath), `File must exist: ${fullPath}`);
			const lines = fs.readFileSync(fullPath, "utf-8").split("\n").length;
			assert.ok(
				lines <= 350,
				`Module ${relPath} exceeds healthy limit of 350 lines (currently ${lines})`,
			);
		}
	});

	it("guarantees every decomposed CSS stylesheet is in healthy range <= 350 lines", () => {
		for (const relPath of cssStyles) {
			const fullPath = path.resolve(process.cwd(), relPath);
			assert.ok(fs.existsSync(fullPath), `File must exist: ${fullPath}`);
			const lines = fs.readFileSync(fullPath, "utf-8").split("\n").length;
			assert.ok(
				lines <= 350,
				`CSS ${relPath} exceeds healthy limit of 350 lines (currently ${lines})`,
			);
		}
	});

	it("guarantees root facade ManagerialPnlDashboardModal.tsx is strictly <= 30 lines", () => {
		const facadePath = path.resolve(
			process.cwd(),
			"apps/web/src/components/finance/pnl/ManagerialPnlDashboardModal.tsx",
		);
		assert.ok(fs.existsSync(facadePath), `Facade file must exist: ${facadePath}`);
		const lines = fs.readFileSync(facadePath, "utf-8").split("\n").length;
		assert.ok(
			lines <= 30,
			`Facade ManagerialPnlDashboardModal.tsx must be <= 30 lines (currently ${lines})`,
		);
	});

	it("verifies elimination of hardcoded '6 касс · 12 регламентированных статей'", () => {
		const headerPath = path.resolve(
			process.cwd(),
			"apps/web/src/components/finance/pnl/dashboardModules/PnlHeader.tsx",
		);
		const content = fs.readFileSync(headerPath, "utf-8");
		assert.ok(
			!content.includes("6 касс · 12 регламентированных статей"),
			"PnlHeader.tsx must not contain hardcoded '6 касс · 12 регламентированных статей'",
		);
		assert.ok(
			content.includes("cashBoxCount") && content.includes("expenseCount"),
			"PnlHeader.tsx must dynamically calculate cash boxes and expenses",
		);
	});

	it("verifies all modules are properly exported via index.ts", () => {
		assert.ok(PnlModules.PnlHeader, "PnlHeader must be exported");
		assert.ok(PnlModules.PnlSummaryCards, "PnlSummaryCards must be exported");
		assert.ok(PnlModules.PnlRevenueSection, "PnlRevenueSection must be exported");
		assert.ok(PnlModules.PnlDirectCostsSection, "PnlDirectCostsSection must be exported");
		assert.ok(PnlModules.PnlIndirectCostsSection, "PnlIndirectCostsSection must be exported");
		assert.ok(PnlModules.PnlChairEconomicsTable, "PnlChairEconomicsTable must be exported");
		assert.ok(PnlModules.PnlMobileCards, "PnlMobileCards must be exported");
		assert.ok(PnlModules.PnlActionFooter, "PnlActionFooter must be exported");
		assert.ok(PnlModules.PnlModalContainer, "PnlModalContainer must be exported");
		assert.ok(PnlModules.ManagerialPnlModalAssembler, "ManagerialPnlModalAssembler must be exported");
	});
});
