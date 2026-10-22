import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
	setupMockDom,
	findAllNodesByCondition,
} from "./helpers/dentalLabTestDomHelper";
import { DentalLabOrdersHubModal } from "../DentalLabOrdersHubModal";
import {
	createDentalLabOrder,
	type DentalLabWorkflowOrder,
} from "../dentalLabWorkflowEngine";

describe("Wave 239 — Hub Toolbar Filters", () => {
	it("2. Toolbar contains stage and date range selectors and delay filter", async () => {
		const { doc } = setupMockDom();
		const container = doc.createElement("div");
		doc.body.appendChild(container);

		const sampleOrder: DentalLabWorkflowOrder = createDentalLabOrder({
			patientId: "pat-99",
			doctorId: "doc-01",
			orderNumber: "ЗТЛ-2026-0099",
			patientName: "Иванова Ольга Павловна",
			doctorName: "Д-р Кузнецов А. С.",
			labName: "CAD/CAM Центр Дентал-Мастер",
			workTypeId: "crown_zirconia",
			selectedTeeth: [16],
			shadeCode: "A3",
			expectedLabDate: "2026-09-22",
			pricePerUnitRub: 28000,
			costPerUnitRub: 9000,
			doctorPercent: 20,
			initialStatus: "draft",
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

		const selects = findAllNodesByCondition(container, (n) => n.tagName === "SELECT");
		assert.ok(selects.length >= 4);

		const stageSelect = selects.find((s) => s.getAttribute("aria-label") === "Фильтр по этапу");
		assert.ok(stageSelect);

		const dateSelect = selects.find((s) => s.getAttribute("aria-label") === "Фильтр по срокам");
		assert.ok(dateSelect);

		if (root) {
			await act(async () => {
				(root as Root).unmount();
			});
		}
	});
});
