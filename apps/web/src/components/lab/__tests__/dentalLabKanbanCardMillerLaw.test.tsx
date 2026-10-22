import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
	setupMockDom,
	findNodeByTestId,
	clickNode,
} from "./helpers/dentalLabTestDomHelper";
import { DentalLabOrdersHubModal } from "../DentalLabOrdersHubModal";
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
				<DentalLabOrdersHubModal
					isOpen={true}
					onClose={() => {}}
					initialOrders={[sampleOrder]}
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
});
