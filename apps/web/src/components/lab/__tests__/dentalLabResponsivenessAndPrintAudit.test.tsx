import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { DentalLabOrdersView } from "../DentalLabOrdersView";
import { LabOrderCard } from "../LabOrderCard";
import { LabTrackingDrawer } from "../LabTrackingDrawer";
import { LabOrdersTable, generateBatchRegistryPrintHtml } from "../ordersView/LabOrdersTable";
import { generateDentalLabOrderA4PrintBlank, A4_PRINT_BLANK_CSS } from "../dentalLabWorkflowExport";
import { createDentalLabOrder } from "../dentalLabWorkflowEngine";
import type { DentalLabOrderData } from "../labMath";

const sampleOrder: DentalLabOrderData = {
	id: "ord-resp-1",
	orderNumber: "ЗТЛ-101",
	patientId: "pt-1",
	patientName: "Пациент <script>alert(1)</script>",
	doctorName: "Врач Тест",
	toothNumber: 16,
	teeth: [16, 17],
	constructionType: "single_crown",
	material: "zirconia_multilayer",
	shade: "A2",
	labName: "ДентЛаб",
	status: "in_progress",
	currentStage: "in_progress",
	priceRub: 24000,
	labCostRub: 7500,
	dueDate: "2026-12-05",
	createdAt: "2026-11-28",
	secureToken: "ZTL-TEST-101",
};

describe("Dental Lab Responsiveness, 32px Dense Registry, XSS Escaping & Print Audit", () => {
	it("1. DentalLabOrdersView renders 5 canonical status filters and view mode switcher", () => {
		const html = renderToString(
			React.createElement(DentalLabOrdersView, {
				initialOrders: [sampleOrder],
			}),
		);

		assert.ok(html.includes("lab-status-filter-all"));
		assert.ok(html.includes("lab-status-filter-in_progress"));
		assert.ok(html.includes("lab-status-filter-fitting"));
		assert.ok(html.includes("lab-status-filter-in_clinic"));
		assert.ok(html.includes("lab-status-filter-completed"));
		assert.ok(html.includes('data-testid="lab-orders-view-table-btn"'));
		assert.ok(html.includes('data-testid="lab-orders-view-cards-btn"'));
		assert.ok(html.includes('data-testid="lab-orders-dense-table"'));
		assert.ok(html.includes("h-8 min-h-[32px] max-h-[32px]"));
	});

	it("2. P1-2.1: LabOrdersTable escapes untrusted HTML in batch registry export and uses semantic tokens", () => {
		const batchHtml = generateBatchRegistryPrintHtml([sampleOrder]);
		assert.equal(batchHtml.includes("<script>alert(1)</script>"), false, "Raw <script> tag must be escaped");
		assert.ok(batchHtml.includes("&lt;script&gt;alert(1)&lt;/script&gt;"), "Escaped patient name must appear");

		const tableHtml = renderToString(
			React.createElement(LabOrdersTable, {
				orders: [sampleOrder],
				initialSelectedIds: ["ord-resp-1"],
				openMenuOrderId: null,
				setOpenMenuOrderId: () => {},
				onSelectTimelineOrder: () => {},
				onOpenReadyInClinicPrompt: () => {},
				onOpenPrintOrder: () => {},
				onOpenTracking: () => {},
				onView3DScan: () => {},
				onPayFromCashbox: () => {},
				onMarkInstalled: () => {},
				onAttach3DScan: () => {},
				onAttachBitePhoto: () => {},
				onTechnicianComment: () => {},
				onRepeatFitting: () => {},
				onReclamation: () => {},
				onOpenEditOrder: () => {},
				copyPortalLink: () => {},
				getStatusBadge: () => React.createElement("span", null, "В работе"),
			}),
		);
		assert.ok(tableHtml.includes("bg-[var(--paper-strong)] text-[var(--ink)]"));
		assert.equal(tableHtml.includes("bg-white/10 text-white"), false);
	});

	it("3. LabOrderCard and LabTrackingDrawer enforce 44px mobile touch targets and responsive stepper", () => {
		const cardHtml = renderToString(
			React.createElement(LabOrderCard, {
				order: sampleOrder,
				openMenuOrderId: null,
				setOpenMenuOrderId: () => {},
				handleOpenPrintOrder: () => {},
				handleOpenTracking: () => {},
				handleAttach3DScan: () => {},
				handleAttachBitePhoto: () => {},
				handleTechnicianComment: () => {},
				handleRepeatFitting: () => {},
				handleReclamation: () => {},
				handleOpenEditOrder: () => {},
				copyPortalLink: () => {},
				getStatusBadge: () => React.createElement("span", null, "В работе"),
			}),
		);
		assert.ok(cardHtml.includes("min-h-[44px] sm:min-h-[32px] h-11 sm:h-8"));

		const drawerHtml = renderToString(
			React.createElement(LabTrackingDrawer, {
				isOpen: true,
				onClose: () => {},
				order: sampleOrder,
				patientDepositRub: 10000,
				stageTotalRub: 24000,
				stagePaidRub: 12000,
				onStageUpdate: async () => {},
				onFittingDateUpdate: async () => {},
			}),
		);
		assert.ok(drawerHtml.includes("grid-cols-2 sm:grid-cols-5"));
		assert.ok(drawerHtml.includes("min-h-[44px] sm:min-h-[38px]"));
	});

	it("4. Printable workflow HTML enforces @media print and break-inside: avoid", () => {
		assert.ok(A4_PRINT_BLANK_CSS.includes("@media print"));
		assert.ok(A4_PRINT_BLANK_CSS.includes("background: #ffffff !important"));
		assert.ok(A4_PRINT_BLANK_CSS.includes("break-inside: avoid !important"));

		const wfOrder = createDentalLabOrder({
			patientId: "pt-resp-1",
			patientName: "Тест Пациент",
			doctorId: "doc-resp-1",
			doctorName: "Врач Тест",
			workTypeId: "crown_zirconia",
			selectedTeeth: [16],
		});
		const html = generateDentalLabOrderA4PrintBlank(wfOrder);
		assert.ok(html.includes("@media print"));
		assert.ok(html.includes("break-inside: avoid !important"));
	});
});
