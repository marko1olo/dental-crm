import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
	setupMockDom,
	findNodeByTestId,
} from "./helpers/dentalLabTestDomHelper";
import { DentalLabOrdersHubModal } from "../DentalLabOrdersHubModal";
import { createDentalLabOrder } from "../dentalLabWorkflowEngine";

describe("Wave 243 — Hub Toolbar Segmented Filters", () => {
	it("2. Toolbar has segmented status filters («Все», «Отправлен», «В работе», «Принят», «Готов», «Припасован»)", async () => {
		const { doc } = setupMockDom();
		const container = doc.createElement("div");
		doc.body.appendChild(container);

		const sampleOrder = createDentalLabOrder({
			patientId: "pat-1",
			doctorId: "doc-1",
			orderNumber: "ЗТЛ-243-01",
			patientName: "Сидоров Алексей Петрович",
			doctorName: "Д-р Смирнов В. А.",
			labName: "CAD/CAM Центр Дентал-Мастер",
			workTypeId: "crown_zirconia",
			selectedTeeth: [14],
			shadeCode: "A2",
			expectedLabDate: "2026-09-25",
			pricePerUnitRub: 24000,
			costPerUnitRub: 7500,
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

		const requiredStatusChipIds = [
			"ALL",
			"sent_to_lab",
			"in_work",
			"draft",
			"fitting_scheduled",
			"installed_completed",
		];

		for (const chipId of requiredStatusChipIds) {
			const chip = findNodeByTestId(container, `ztl-filter-stage-${chipId}`);
			assert.ok(chip);
		}

		if (root) {
			await act(async () => {
				(root as Root).unmount();
			});
		}
	});
});
