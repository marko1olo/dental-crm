import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
	setupMockDom,
	findNodeByTestId,
} from "./helpers/dentalLabTestDomHelper";
import { LabOrdersSegmentedNav } from "../ordersView/LabOrdersSegmentedNav";
import { CANONICAL_STAGE_FILTERS } from "../ordersView/constants";

describe("Wave 243 — Hub Toolbar Segmented Filters (SSOT)", () => {
	it("1. LabOrdersSegmentedNav has segmented status filters («Все заказы», «В работе», «Примерка», «В клинике», «Сдано»)", async () => {
		const { doc } = setupMockDom();
		const container = doc.createElement("div");
		doc.body.appendChild(container);

		let root: Root | null = null;
		await act(async () => {
			root = createRoot(container as any);
			root.render(
				<LabOrdersSegmentedNav
					canonicalFilters={CANONICAL_STAGE_FILTERS}
					statusFilter="all"
					onStatusFilterChange={() => {}}
					stageCounts={{ all: 15, in_progress: 5, fitting: 3, in_clinic: 4, completed: 3 }}
					viewMode="table"
					onViewModeChange={() => {}}
				/>,
			);
		});

		for (const filter of CANONICAL_STAGE_FILTERS) {
			const chip = findNodeByTestId(container, `lab-status-filter-${filter.id}`);
			assert.ok(chip, `Filter chip lab-status-filter-${filter.id} must exist`);
		}

		const tableBtn = findNodeByTestId(container, "lab-orders-view-table-btn");
		assert.ok(tableBtn, "Table view toggle must exist");

		const cardsBtn = findNodeByTestId(container, "lab-orders-view-cards-btn");
		assert.ok(cardsBtn, "Cards view toggle must exist");

		const kanbanBtn = findNodeByTestId(container, "lab-orders-view-kanban-btn");
		assert.ok(kanbanBtn, "Kanban view toggle must exist");

		if (root) {
			await act(async () => {
				(root as Root).unmount();
			});
		}
	});
});
