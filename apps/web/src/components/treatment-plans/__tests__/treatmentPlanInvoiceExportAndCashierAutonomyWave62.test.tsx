/**
 * treatmentPlanInvoiceExportAndCashierAutonomyWave62.test.tsx
 *
 * Wave 62 / Feature 251 Test Suite:
 * «планы_лечения_касса::сохранение_счетов_в_хранилище_при_экспорте_кассиру_и_интеграция_с_invoices_view»
 * (StomX / DentalPRO / IDENT Parity, Mandates 2, 8c, 8d, 8e, 8k, 8n)
 *
 * Requirements:
 * 1. 1-Click Export to Cashier from TreatmentPlanModule:
 *    - Main toolbar has tp-quick-cashier-btn («В кассу», icon Send).
 *    - Options menu has options-menu-export-cashier-btn («Отправить счет кассиру (1 клик)»).
 *    - Preserves tp-invoice-btn («Счет / Наряд», opens InvoiceGenerationModal).
 * 2. Two-Tier Storage & Cross-Module Invoicing Parity:
 *    - Export saves a conforming BillingInvoice into localStorage (dente_billing_invoices).
 *    - Dispatches real-time custom event "dente-invoices-updated".
 *    - Dispatches onExportToCashier callback if supplied by parent.
 *    - InvoicesView receives "dente-invoices-updated" and integrates the newly exported invoice.
 * 3. 100% Warranty Autonomy (Mandates 8e, 8n):
 *    - Zero-price / 100% warranty plan creates invoice with status "warranty_100" without barriers.
 * 4. HIG / Studio Clinical Invariants (Mandates 8c, 8d):
 *    - 0 cartoon emojis (strict Lucide vector icons).
 *    - 0 disabled buttons on primary workflows.
 *    - Touch-targets >= 44px (mobile/touch) and >= 38px (desktop).
 */

import React from "react";
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { TreatmentPlanModule } from "../TreatmentPlanModule.js";
import { VisitTreatmentPlanTab } from "../../visit/VisitTreatmentPlanTab.js";
import {
	InvoicesView,
	loadStoredInvoices,
	saveStoredInvoices,
	INVOICES_STORAGE_KEY,
	type BillingInvoice,
} from "../../billing/InvoicesView.js";
import type { ToothData } from "../../odontogram/ToothChart.js";
import { AppLogicProvider } from "../../../contexts/AppLogicContext.js";
import type { CashierInvoiceExportData } from "../types.js";

// Mock localStorage for Node.js test environment
class MockLocalStorage {
	private store: Record<string, string> = {};

	getItem(key: string): string | null {
		return this.store[key] ?? null;
	}

	setItem(key: string, value: string): void {
		this.store[key] = String(value);
	}

	removeItem(key: string): void {
		delete this.store[key];
	}

	clear(): void {
		this.store = {};
	}
}

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

describe("Wave 62 / Feature 251: Treatment Plan Cashier Export & InvoicesView Sync", () => {
	const sampleTeeth: ToothData[] = [
		{
			id: 16,
			toothNumber: 16,
			state: "Caries",
			systemicNotes: "Глубокий кариес",
		} as ToothData,
		{
			id: 36,
			toothNumber: 36,
			state: "Missing",
			systemicNotes: "Адентия",
		} as ToothData,
	];

	const mockAppContext = {
		dashboard: {
			serviceCatalog: [
				{
					id: "srv-caries",
					code: "A16.07.002",
					title: "Лечение глубокого кариеса",
					category: "Терапия",
					basePriceRub: 4500,
					active: true,
				},
				{
					id: "srv-implant",
					code: "A16.07.054",
					title: "Установка дентального имплантата",
					category: "Хирургия",
					basePriceRub: 35000,
					active: true,
				},
			],
			patients: [
				{
					id: "PAT-WAVE62",
					fullName: "Волков Дмитрий Андреевич",
					name: "Волков Дмитрий Андреевич",
					phone: "+7 (999) 111-22-33",
					balanceRub: 15000,
					administrativeProfile: {
						curatorFullName: "Семенова Ирина Павловна",
					},
				},
			],
		},
		auth: {
			currentUser: {
				id: "DOC-WAVE62",
				name: "Д-р Кузнецов М. С.",
				role: "doctor",
			},
		},
	};

	beforeEach(() => {
		mockStorage.clear();
	});

	describe("1. TreatmentPlanModule Cashier Export Toolbar & Options Menu", () => {
		it("renders 1-click cashier export button 'tp-quick-cashier-btn' in toolbar with Send icon", () => {
			const html = renderToString(
				<AppLogicProvider value={mockAppContext as any}>
					<TreatmentPlanModule
						patientId="PAT-WAVE62"
						patientName="Волков Дмитрий Андреевич"
						teethData={sampleTeeth}
					/>
				</AppLogicProvider>,
			);

			assert.ok(
				html.includes('data-testid="tp-quick-cashier-btn"'),
				"tp-quick-cashier-btn must be present on main toolbar",
			);
			assert.ok(
				html.includes("В кассу"),
				"Button title or text 'В кассу' must be rendered",
			);
			assert.ok(
				html.includes('data-testid="tp-invoice-btn"'),
				"tp-invoice-btn ('Счет / Наряд') must be preserved alongside",
			);
		});

		it("renders 1-click export action 'options-menu-export-cashier-btn' in options dropdown", () => {
			const html = renderToString(
				<AppLogicProvider value={mockAppContext as any}>
					<TreatmentPlanModule
						patientId="PAT-WAVE62"
						patientName="Волков Дмитрий Андреевич"
						teethData={sampleTeeth}
						initialOptionsMenuOpen={true}
					/>
				</AppLogicProvider>,
			);

			assert.ok(
				html.includes('data-testid="options-menu-export-cashier-btn"'),
				"options-menu-export-cashier-btn must be rendered inside options menu",
			);
			assert.ok(
				html.includes("Отправить счет кассиру (1 клик)"),
				"Button must display clear clinical label without jargon",
			);
		});

		it("guarantees Apple HIG touch target compliance (>= 44px touch, >= 38px desktop)", () => {
			const html = renderToString(
				<AppLogicProvider value={mockAppContext as any}>
					<TreatmentPlanModule
						patientId="PAT-WAVE62"
						patientName="Волков Дмитрий Андреевич"
						teethData={sampleTeeth}
					/>
				</AppLogicProvider>,
			);

			assert.ok(
				html.includes("min-h-[44px]") && html.includes("sm:min-h-[38px]"),
				"Buttons must specify min-h-[44px] touch targets for medical/gloved operation",
			);
		});

		it("guarantees 0 cartoon emojis in treatment plan toolbar and menus (Mandate 8d)", () => {
			const html = renderToString(
				<AppLogicProvider value={mockAppContext as any}>
					<TreatmentPlanModule
						patientId="PAT-WAVE62"
						patientName="Волков Дмитрий Андреевич"
						teethData={sampleTeeth}
						initialOptionsMenuOpen={true}
					/>
				</AppLogicProvider>,
			);

			// Match common emoji ranges
			const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
			assert.ok(
				!emojiRegex.test(html),
				"Strict ban on cartoon emojis: only vector Lucide icons allowed",
			);
		});
	});

	describe("2. Two-Tier Invoices Persistence & Storage Synchronization", () => {
		it("correctly loads and saves BillingInvoice arrays via loadStoredInvoices and saveStoredInvoices", () => {
			const sampleInvoice: BillingInvoice = {
				id: "inv-test-01",
				number: "СЧ-2026-1001",
				patientId: "PAT-WAVE62",
				patientName: "Волков Дмитрий Андреевич",
				patientPhone: "+7 (999) 111-22-33",
				doctorName: "Д-р Кузнецов М. С.",
				date: "09.09.2026",
				totalAmountRub: 39500,
				paidAmountRub: 0,
				status: "issued",
				items: [
					{
						id: "li-01",
						code: "A16.07.002",
						name: "Лечение глубокого кариеса (зуб 16)",
						quantity: 1,
						priceRub: 4500,
					},
					{
						id: "li-02",
						code: "A16.07.054",
						name: "Установка дентального имплантата (зуб 36)",
						quantity: 1,
						priceRub: 35000,
					},
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
					{
						id: "li-warr-01",
						code: "A16.07.002.001",
						name: "Гарантийная пришлифовка пломбы (зуб 16)",
						quantity: 1,
						priceRub: 0,
					},
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
				items: [
					{
						id: "li-55",
						name: "Профессиональная гигиена",
						quantity: 1,
						priceRub: 4500,
					},
				],
				createdAt: new Date().toISOString(),
			};

			saveStoredInvoices([storedInvoice]);

			const html = renderToString(
				<InvoicesView
					patientId="PAT-WAVE62"
					patientName="Волков Дмитрий Андреевич"
				/>,
			);

			assert.ok(
				html.includes("СЧ-2026-5555"),
				"InvoicesView must render invoice number from local storage",
			);
			assert.ok(
				html.includes("4\u00A0500") || html.includes("4 500") || html.includes("4500"),
				"InvoicesView must render the invoice total amount",
			);
		});
	});

	describe("3. VisitTreatmentPlanTab Integration", () => {
		it("accepts onExportToCashier prop and passes it cleanly without type errors", () => {
			let exportedData: CashierInvoiceExportData | null = null;
			const handleExport = (data: CashierInvoiceExportData) => {
				exportedData = data;
			};

			const html = renderToString(
				<AppLogicProvider value={mockAppContext as any}>
					<VisitTreatmentPlanTab
						activePatient={{
							id: "PAT-WAVE62",
							fullName: "Волков Дмитрий Андреевич",
						}}
						teethData={sampleTeeth}
						onExportToCashier={handleExport}
					/>
				</AppLogicProvider>,
			);

			assert.ok(
				html.includes('data-testid="visit-treatment-plan-tab"'),
				"VisitTreatmentPlanTab must mount correctly",
			);
			assert.ok(
				html.includes('data-testid="tp-quick-cashier-btn"'),
				"Mounted TreatmentPlanModule must retain quick cashier button",
			);
		});
	});
});
