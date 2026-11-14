import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
	setupMockDom,
	findAllNodesByCondition,
	findNodeByTestId,
} from "./helpers/dentalLabTestDomHelper";
import { LabOrdersFilterBar } from "../ordersView/LabOrdersFilterBar";

describe("Wave 239 — Canonical Lab Orders Toolbar Filters (SSOT)", () => {
	it("1. LabOrdersFilterBar contains search input, doctor select filter and action buttons", async () => {
		const { doc } = setupMockDom();
		const container = doc.createElement("div");
		doc.body.appendChild(container);

		let root: Root | null = null;
		await act(async () => {
			root = createRoot(container as unknown as HTMLElement);
			root.render(
				<LabOrdersFilterBar
					metrics={{ total: 12, inProgress: 4, ready: 7, overdue: 1, tryIn: 0, completed: 0 }}
					searchQuery=""
					onSearchChange={() => {}}
					doctorFilter="all"
					onDoctorFilterChange={() => {}}
					doctorsList={["Д-р Смирнов А. В.", "Д-р Иванов И. И."]}
					onOpenPriceMatrix={() => {}}
					onOpenHubModal={() => {}}
					onRefresh={() => {}}
					isLoading={false}
					onOpenNewOrder={() => {}}
				/>,
			);
		});

		const selects = findAllNodesByCondition(container, (n) => n.tagName === "SELECT");
		assert.ok(selects.length >= 1);

		const doctorSelect = selects.find((s) => s.getAttribute("aria-label") === "Фильтр по врачу");
		assert.ok(doctorSelect);

		const searchInput = findAllNodesByCondition(container, (n) => n.tagName === "INPUT");
		assert.ok(searchInput.length >= 1);

		const newOrderBtn = findNodeByTestId(container, "lab-orders-new-order-btn");
		assert.ok(newOrderBtn);

		const priceMatrixBtn = findNodeByTestId(container, "btn-open-price-matrix");
		assert.ok(priceMatrixBtn);

		if (root) {
			await act(async () => {
				(root as Root).unmount();
			});
		}
	});
});
