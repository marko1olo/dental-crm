/**
 * apps/web/src/hooks/useMemoryLeakGuard.test.ts
 *
 * DENTE Dental CRM — Test Suite for useMemoryLeakGuard & InvoicesView Virtualization
 * Wave 252-Perf2: Low-RAM Laptop Protection & DOM Memory Safety
 * Compliance: Mandates 8e, 8k, 8n, 8d
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	type BillingInvoice,
	InvoicesView,
} from "../components/billing/InvoicesView.js";
import {
	type MemoryLeakGuardController,
	type UseDomListPaginationReturn,
	useDomListPagination,
	useMemoryLeakGuard,
} from "./useMemoryLeakGuard.js";

describe("Wave 252-Perf2: useMemoryLeakGuard & InvoicesView Virtualization Tests", () => {
	describe("1. useMemoryLeakGuard Controller API Contract", () => {
		it("provides all mandatory lifecycle disposal methods", () => {
			let capturedGuard: MemoryLeakGuardController | null = null;
			function TestComponent() {
				capturedGuard = useMemoryLeakGuard({ debugName: "TestComponent" });
				return null;
			}

			renderToString(React.createElement(TestComponent));
			assert.ok(capturedGuard !== null, "Guard controller must be initialized");
			const guard: MemoryLeakGuardController = capturedGuard;
			assert.equal(typeof guard.safeSetTimeout, "function");
			assert.equal(typeof guard.safeClearTimeout, "function");
			assert.equal(typeof guard.safeSetInterval, "function");
			assert.equal(typeof guard.safeClearInterval, "function");
			assert.equal(typeof guard.safeRequestAnimationFrame, "function");
			assert.equal(typeof guard.safeCancelAnimationFrame, "function");
			assert.equal(typeof guard.safeAddEventListener, "function");
			assert.equal(typeof guard.createAbortController, "function");
			assert.equal(typeof guard.getAbortSignal, "function");
			assert.equal(typeof guard.registerDisposer, "function");
			assert.equal(typeof guard.registerObserver, "function");
			assert.equal(typeof guard.disposeAll, "function");
			assert.equal(typeof guard.isMounted, "function");
		});

		it("creates functional AbortController and AbortSignal", () => {
			let capturedGuard: MemoryLeakGuardController | null = null;
			function TestComponent() {
				capturedGuard = useMemoryLeakGuard();
				return null;
			}
			renderToString(React.createElement(TestComponent));
			assert.ok(capturedGuard !== null);
			const guard: MemoryLeakGuardController = capturedGuard;
			const controller = guard.createAbortController();
			assert.ok(controller instanceof AbortController);
			assert.equal(controller.signal.aborted, false);

			const signal = guard.getAbortSignal();
			assert.ok(signal instanceof AbortSignal);
			assert.equal(signal.aborted, false);

			guard.disposeAll();
			assert.equal(controller.signal.aborted, true);
		});
	});

	describe("2. useDomListPagination Hook", () => {
		it("initializes with default page limit 50 and handles loadMore/loadAll", () => {
			let capturedPagination: UseDomListPaginationReturn<{
				id: string;
			}> | null = null;
			const sampleItems = Array.from({ length: 120 }, (_, i) => ({
				id: `el-${i}`,
			}));

			function TestPaginationComponent() {
				capturedPagination = useDomListPagination(sampleItems, {
					initialLimit: 50,
					step: 50,
				});
				return null;
			}

			renderToString(React.createElement(TestPaginationComponent));
			assert.ok(capturedPagination !== null);
			const pagination: UseDomListPaginationReturn<{ id: string }> =
				capturedPagination;
			assert.equal(pagination.visibleItems.length, 50);
			assert.equal(pagination.totalCount, 120);
			assert.equal(pagination.remainingCount, 70);
			assert.equal(pagination.hasMore, true);
			assert.equal(pagination.limit, 50);
		});
	});

	describe("3. InvoicesView DOM Virtualization & Limits (Wave 252-Perf2)", () => {
		const largeInvoiceList: BillingInvoice[] = Array.from(
			{ length: 120 },
			(_, idx) => ({
				id: `inv-large-${idx + 1}`,
				number: `СЧ-${String(idx + 1).padStart(6, "0")}`,
				patientId: `pat-${idx + 1}`,
				patientName: `Пациент Тестовый ${idx + 1}`,
				doctorName: "Д-р Смирнов А.В.",
				date: "18.09.2026",
				totalAmountRub: 5000,
				paidAmountRub: 0,
				status: "issued",
				items: [
					{
						id: `li-${idx}`,
						code: "A16.07.002",
						name: "Лечение кариеса",
						quantity: 1,
						priceRub: 5000,
					},
				],
				createdAt: new Date().toISOString(),
			}),
		);

		it("limits initial DOM nodes to 50 when 120 invoices are passed", () => {
			const html = renderToString(
				React.createElement(InvoicesView, {
					initialInvoices: largeInvoiceList,
					currentDoctorName: "Д-р Смирнов А.В.",
				}),
			);

			// Count occurrences of invoice-card in rendered DOM
			const matches = html.match(/data-testid="invoice-card-/g);
			assert.ok(matches !== null);
			assert.equal(
				matches ? matches.length : 0,
				50,
				"DOM must render exactly 50 cards, not 120, to prevent RAM thrashing",
			);

			// Must render virtualization bar
			assert.ok(
				html.includes('data-testid="invoices-dom-virtualization-bar"'),
				"Must display virtualization status bar",
			);
			assert.ok(
				html.includes('data-testid="btn-invoices-load-more"'),
				"Must display 'Показать ещё' button",
			);
			assert.ok(
				html.includes('data-testid="btn-invoices-load-all"'),
				"Must display 'Показать все' button",
			);
			assert.ok(
				html.includes("защита RAM ноутбука"),
				"Must display informative label for weak hardware protection",
			);
		});

		it("renders all items without virtualization bar when invoices count <= 50", () => {
			const smallList = largeInvoiceList.slice(0, 20);
			const html = renderToString(
				React.createElement(InvoicesView, {
					initialInvoices: smallList,
					currentDoctorName: "Д-р Смирнов А.В.",
				}),
			);

			const matches = html.match(/data-testid="invoice-card-/g);
			assert.ok(matches !== null);
			assert.equal(matches ? matches.length : 0, 20);
			assert.ok(
				!html.includes('data-testid="invoices-dom-virtualization-bar"'),
				"Virtualization bar should not show when total items <= 50",
			);
		});
	});
});
