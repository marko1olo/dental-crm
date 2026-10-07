import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Dental Lab Responsiveness, 32px Dense Registry & Perfect Print Audit", () => {
	const labDir = path.resolve(__dirname, "..");
	const pagesDir = path.resolve(__dirname, "../../../pages");
	const webSrcDir = path.resolve(__dirname, "../../..");

	it("1. Desktop Registry (LabOrdersPage.tsx) provides dense 32px grid and 5 canonical status filters", () => {
		const filePath = path.join(pagesDir, "LabOrdersPage.tsx");
		assert.ok(fs.existsSync(filePath), "LabOrdersPage.tsx must exist");
		const labOrdersViewPath = path.resolve(__dirname, "../../dental-lab/DentalLabOrdersView.tsx");
		const content = fs.readFileSync(filePath, "utf-8") + (fs.existsSync(labOrdersViewPath) ? "\n" + fs.readFileSync(labOrdersViewPath, "utf-8") : "");

		// 5 Canonical Status Filter Chips & IDs
		assert.ok(content.includes("lab-status-filter-"), "Must have status filter data-testids");
		assert.ok(content.includes('id: "all"'), "Must have 'all' filter");
		assert.ok(content.includes('id: "impression_scan"') && content.includes('"Слепок"'), "Must have 'Слепок' filter");
		assert.ok(content.includes('id: "framework_fitting"') && content.includes('"Каркас"'), "Must have 'Каркас' filter");
		assert.ok(content.includes('id: "ceramic_layering"') && content.includes('"Керамика"'), "Must have 'Керамика' filter");
		assert.ok(content.includes('id: "ready_in_clinic"') && content.includes('"Готовая в клинике"'), "Must have 'Готовая в клинике' filter");
		assert.ok(content.includes('id: "patient_fixation"') && content.includes('"Зафиксировано"'), "Must have 'Зафиксировано' filter");

		// View Mode Switcher
		assert.ok(content.includes('data-testid="lab-orders-view-table-btn"'), "Must have 'Таблица 32px' view toggle button");
		assert.ok(content.includes('data-testid="lab-orders-view-cards-btn"'), "Must have 'Карточки' view toggle button");

		// Dense 32px Table
		assert.ok(content.includes('data-testid="lab-orders-dense-table"'), "Must render dense desktop table");
		assert.ok(content.includes('h-8 min-h-[32px] max-h-[32px]'), "Table rows must enforce strict 32px height (h-8)");
		assert.ok(content.includes('lab-order-table-row-'), "Table rows must have data-testids");
	});

	it("2. Mobile touch target ergonomics (44px) for technician and courier in LabOrderCard, Drawer & Portal", () => {
		const cardPath = path.join(labDir, "LabOrderCard.tsx");
		const drawerPath = path.join(labDir, "LabTrackingDrawer.tsx");
		const portalCssPath = path.join(webSrcDir, "GuestLabPortal.css");

		const cardContent = fs.readFileSync(cardPath, "utf-8");
		const drawerContent = fs.readFileSync(drawerPath, "utf-8");
		const portalCssContent = fs.readFileSync(portalCssPath, "utf-8");

		// LabOrderCard adaptive 44px mobile / 32px desktop buttons
		assert.ok(
			cardContent.includes("min-h-[44px] sm:min-h-[32px] h-11 sm:h-8"),
			"LabOrderCard action buttons must be 44px on mobile and 32px on desktop"
		);

		// LabTrackingDrawer adaptive 5-stage stepper on mobile
		assert.ok(
			drawerContent.includes("grid-cols-2 sm:grid-cols-5"),
			"LabTrackingDrawer 5-stage stepper must break into 2 columns on mobile screens"
		);
		assert.ok(
			drawerContent.includes("min-h-[44px] sm:min-h-[38px]"),
			"LabTrackingDrawer stepper buttons must have 44px touch targets on mobile"
		);

		// GuestLabPortal mobile action buttons
		assert.ok(
			portalCssContent.includes("min-height: 44px !important"),
			"GuestLabPortal mobile action buttons must have 44px min-height"
		);
		assert.ok(
			portalCssContent.includes("touch-action: manipulation"),
			"GuestLabPortal must have touch-action manipulation for lag-free mobile taps"
		);
	});

	it("3. Printable Order Blank (DentalLabPrintBlank.tsx & dentalLabWorkflowExport.ts) has @media print and break-inside: avoid", () => {
		const blankPath = path.join(labDir, "DentalLabPrintBlank.tsx");
		const exportPath = path.join(labDir, "dentalLabWorkflowExport.ts");

		const blankContent = fs.readFileSync(blankPath, "utf-8");
		const exportContent = fs.readFileSync(exportPath, "utf-8");

		// DentalLabPrintBlank print stylesheet
		assert.ok(blankContent.includes("@media print"), "DentalLabPrintBlank must contain @media print stylesheet");
		assert.ok(
			blankContent.includes("background: #ffffff !important"),
			"DentalLabPrintBlank must enforce pure white background in print mode"
		);
		assert.ok(
			blankContent.includes("break-inside: avoid") || blankContent.includes("breakInside: \"avoid\""),
			"DentalLabPrintBlank must avoid splitting rows and sections across pages"
		);
		assert.ok(
			blankContent.includes("data-testid=\"lab-blank-5stage-tracker\""),
			"5-stage tracker container must exist in printed blank"
		);

		// dentalLabWorkflowExport print stylesheet
		assert.ok(exportContent.includes("@media print"), "dentalLabWorkflowExport must contain @media print");
		assert.ok(
			exportContent.includes("break-inside: avoid !important"),
			"dentalLabWorkflowExport must prevent breaking table rows, teeth block, and boxes across pages"
		);
	});
});
