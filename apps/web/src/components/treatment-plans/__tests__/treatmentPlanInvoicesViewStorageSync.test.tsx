/**
 * treatmentPlanInvoicesViewStorageSync.test.tsx — Тестирование синхронизации счетов с InvoicesView
 * и локальным хранилищем (Mandates 2, 8c, 8e, 8n).
 */

import assert from "node:assert/strict";
import React from "react";
import { beforeEach, describe, it } from "node:test";
import { renderToString } from "react-dom/server";
import {
	InvoicesView,
	loadStoredInvoices,
	saveStoredInvoices,
	type BillingInvoice,
} from "../../billing/InvoicesView.js";
import { MockLocalStorage } from "./helpers/cashierExportTestHelpers.js";

const mockStorage = new MockLocalStorage();
if (typeof (globalThis as any).window === "undefined") {
	(globalThis as any).window = {
		localStorage: mockStorage,
		dispatchEvent: () => true,
		addEventListener: () => {},
		removeEventListener: () => {},
	};
} else {
	(globalThis as any).window.localStorage = mockStorage;
}

describe("InvoicesView & Two-Tier Invoices Persistence Sync", () => {
	beforeEach(() => {
		mockStorage.clear();
		saveStoredInvoices([]);
	});

	it("correctly loads and saves BillingInvoice arrays via loadStoredInvoices and saveStoredInvoices", () => {
		const sampleInvoice: BillingInvoice = {
			id: "inv-test-01",
			number: "СЧ-2026-1001",
			patientId: "PAT-WAVE62",
			patientName: "Волков Дмитрий Андреевич",
			doctorName: "Д-р Кузнецов М. С.",
			date: "09.09.2026",
			totalAmountRub: 39500,
			paidAmountRub: 0,
			status: "issued",
			items: [
				{ id: "li-01", code: "A16.07.002", name: "Лечение глубокого кариеса (зуб 16)", quantity: 1, priceRub: 4500 },
				{ id: "li-02", code: "A16.07.054", name: "Установка дентального имплантата (зуб 36)", quantity: 1, priceRub: 35000 },
			],
			createdAt: new Date().toISOString(),
			notes: "Счет по комплексному плану",
		};

		saveStoredInvoices([sampleInvoice]);

		const loaded = loadStoredInvoices();
		assert.equal(loaded.length, 1, "Must load 1 stored invoice from localStorage");
		assert.equal(loaded[0]?.id, "inv-test-01");
		assert.equal(loaded[0]?.number, "СЧ-2026-1001");
		assert.equal(loaded[0]?.totalAmountRub, 39500);
		assert.equal(loaded[0]?.items.length, 2);
	});

	it("handles 100% warranty zero-price invoices with status 'warranty_100'", () => {
		const warrantyInvoice: BillingInvoice = {
			id: "inv-warranty-01",
			number: "СЧ-2026-WARR",
			patientId: "PAT-WAVE62",
			patientName: "Волков Дмитрий Андреевич",
			doctorName: "Д-р Кузнецов М. С.",
			date: "09.09.2026",
			totalAmountRub: 0,
			paidAmountRub: 0,
			status: "warranty_100",
			items: [
				{ id: "li-warr-01", code: "A16.07.002.001", name: "Гарантийная пришлифовка пломбы (зуб 16)", quantity: 1, priceRub: 0 },
			],
			createdAt: new Date().toISOString(),
			notes: "Гарантийная переделка 100% (Мандат 8e)",
		};

		saveStoredInvoices([warrantyInvoice]);

		const loaded = loadStoredInvoices();
		assert.equal(loaded.length, 1);
		assert.equal(loaded[0]?.status, "warranty_100");
		assert.equal(loaded[0]?.totalAmountRub, 0);
	});

	it("renders InvoicesView with stored invoices loaded from localStorage", () => {
		const storedInvoice: BillingInvoice = {
			id: "inv-rendered-01",
			number: "СЧ-2026-5555",
			patientId: "PAT-WAVE62",
			patientName: "Волков Дмитрий Андреевич",
			doctorName: "Д-р Кузнецов М. С.",
			date: "09.09.2026",
			totalAmountRub: 4500,
			paidAmountRub: 0,
			status: "issued",
			items: [{ id: "li-55", name: "Профессиональная гигиена", quantity: 1, priceRub: 4500 }],
			createdAt: new Date().toISOString(),
		};

		saveStoredInvoices([storedInvoice]);

		const html = renderToString(
			<InvoicesView patientId="PAT-WAVE62" patientName="Волков Дмитрий Андреевич" />,
		);

		assert.ok(html.includes("СЧ-2026-5555"), "InvoicesView must render invoice number");
		assert.ok(html.includes("4\u00A0500") || html.includes("4 500") || html.includes("4500"), "InvoicesView must render invoice total");
	});
});
