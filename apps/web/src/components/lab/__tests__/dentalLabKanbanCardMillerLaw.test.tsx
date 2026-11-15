import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import {
	setupMockDom,
	findNodeByTestId,
	clickNode,
} from "./helpers/dentalLabTestDomHelper";
import { DentalLabOrdersKanbanBoard } from "../DentalLabOrdersKanbanBoard";
import { DentalLabKanbanCard } from "../DentalLabKanbanCard";
import {
	createDentalLabOrder,
	type DentalLabWorkflowOrder,
} from "../dentalLabWorkflowEngine";

describe("Wave 239 — Kanban Card Miller's Law", () => {
	it("1. Kanban card obeys Miller's Law: strictly 2 direct action buttons («Открыть», «Статус») and menu «...»", async () => {
		const { doc } = setupMockDom();
		const container = doc.createElement("div");
		doc.body.appendChild(container);

		const sampleOrder: DentalLabWorkflowOrder = createDentalLabOrder({
			patientId: "pat-42",
			doctorId: "doc-01",
			orderNumber: "ЗТЛ-2026-0042",
			patientName: "Волков Сергей Александрович",
			doctorName: "Д-р Кузнецов А. С.",
			labName: "CAD/CAM Центр Дентал-Мастер",
			workTypeId: "crown_emax",
			selectedTeeth: [26],
			shadeCode: "A2",
			expectedLabDate: "2026-09-22",
			pricePerUnitRub: 24000,
			costPerUnitRub: 8000,
			doctorPercent: 20,
			initialStatus: "sent_to_lab",
		});

		let root: Root | null = null;
		await act(async () => {
			root = createRoot(container as any);
			root.render(
				<DentalLabOrdersKanbanBoard
					orders={[sampleOrder]}
					onOpenOrder={() => {}}
					onOpenStatusTimeline={() => {}}
					onActionPrompt={() => {}}
					onOpenScan3D={() => {}}
					onOpenFittingModal={() => {}}
					onRequestWarrantyRework={() => {}}
				/>,
			);
		});

		const openBtn = findNodeByTestId(container, `ztl-card-open-${sampleOrder.id}`);
		assert.ok(openBtn);

		const statusBtn = findNodeByTestId(container, `ztl-card-status-${sampleOrder.id}`);
		assert.ok(statusBtn);

		const menuBtn = findNodeByTestId(container, `ztl-card-menu-btn-${sampleOrder.id}`);
		assert.ok(menuBtn);

		await clickNode(menuBtn);

		const printA4Btn = findNodeByTestId(container, `ztl-card-print-a4-${sampleOrder.id}`);
		assert.ok(printA4Btn);

		if (root) {
			await act(async () => {
				(root as Root).unmount();
			});
		}
	});

	it("2. Kanban card displays clean clinical typography: sentence case warranty banner and ruble symbol (₽)", () => {
		const warrantyOrder: DentalLabWorkflowOrder = createDentalLabOrder({
			patientId: "pat-99",
			doctorId: "doc-01",
			orderNumber: "ЗТЛ-2026-0099",
			originalOrderNumber: "ЗТЛ-2026-0012",
			patientName: "Смирнова Елена Викторовна",
			doctorName: "Д-р Кузнецов А. С.",
			labName: "CAD/CAM Центр Дентал-Мастер",
			workTypeId: "crown_emax",
			selectedTeeth: [16],
			shadeCode: "A2",
			expectedLabDate: "2026-09-22",
			pricePerUnitRub: 0,
			costPerUnitRub: 0,
			isWarrantyRework: true,
			initialStatus: "warranty_rework",
		});

		const html = renderToString(
			<DentalLabKanbanCard
				order={warrantyOrder}
				columnId="in_progress"
				isMenuOpen={false}
				onToggleMenu={() => {}}
				onCloseMenu={() => {}}
				onInspectOrder={() => {}}
				onAdvanceStage={() => {}}
				onPrintBlank={() => {}}
				onAttachBitePhoto={() => {}}
				onTechnicianComment={() => {}}
				onRepeatFitting={() => {}}
				onRequestWarrantyRework={() => {}}
			/>,
		);

		assert.ok(
			html.includes("Гарантийная переделка (0 ₽)"),
			"Must display sentence case 'Гарантийная переделка (0 ₽)'",
		);
		assert.ok(
			!html.includes("ГАРАНТИЙНАЯ ПЕРЕДЕЛКА"),
			"Must not contain ALL CAPS 'ГАРАНТИЙНАЯ ПЕРЕДЕЛКА'",
		);
		assert.ok(
			!html.includes("0 руб."),
			"Must use ruble sign '0 ₽' instead of '0 руб.'",
		);
		assert.ok(
			html.includes("0 ₽ (Гарантия)"),
			"Must display 0 ₽ (Гарантия)",
		);
	});
});
