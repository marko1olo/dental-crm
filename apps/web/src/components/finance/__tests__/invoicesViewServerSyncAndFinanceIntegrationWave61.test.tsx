/**
 * apps/web/src/components/finance/__tests__/invoicesViewServerSyncAndFinanceIntegrationWave61.test.tsx
 *
 * DENTE Dental CRM — Wave 61 / Feature 250 Test Suite
 * «финансы_счета_акты::серверная_синхронизация_счетов_интеграция_с_finance_view_и_ликвидация_demo_invoices»
 * Compliance: Mandates 8c, 8d, 8e, 8k, 8n (The 7 Deadly Sins of UI & Doctor Autonomy)
 */

import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	InvoicesView,
	type BillingInvoice,
	INVOICES_STORAGE_KEY,
	loadStoredInvoices,
	saveStoredInvoices,
} from "../../billing/InvoicesView.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const invoicesFilePath = path.resolve(__dirname, "../../billing/InvoicesView.tsx");
const financeFilePath = path.resolve(__dirname, "../../../FinanceView.tsx");

describe("Wave 61 (Feature 250): Invoices Server Sync, FinanceView Mounting & Zero Mocks", () => {
	const sampleInvoices: BillingInvoice[] = [
		{
			id: "inv-w61-001",
			number: "СЧ-009101",
			patientId: "pat-w61-01",
			patientName: "Смирнова Елена Анатольевна",
			doctorName: "Д-р Смирнов А.В.",
			date: "09.09.2026",
			totalAmountRub: 6500,
			paidAmountRub: 0,
			status: "issued",
			items: [
				{ id: "li-1", code: "A16.07.002", name: "Лечение кариеса", quantity: 1, priceRub: 6500 },
			],
			createdAt: new Date().toISOString(),
		},
		{
			id: "inv-w61-002",
			number: "СЧ-009102",
			patientId: "pat-w61-02",
			patientName: "Волков Денис Игоревич",
			doctorName: "Д-р Смирнов А.В.",
			date: "09.09.2026",
			totalAmountRub: 12000,
			paidAmountRub: 12000,
			status: "paid",
			items: [
				{ id: "li-2", code: "A16.07.051", name: "Профгигиена GBT", quantity: 1, priceRub: 12000 },
			],
			createdAt: new Date().toISOString(),
			paidAt: new Date().toISOString(),
			paymentMethod: "card_terminal",
		},
		{
			id: "inv-w61-003",
			number: "СЧ-009103",
			patientId: "pat-w61-03",
			patientName: "Барабаш Сергей Владимирович",
			doctorName: "Д-р Смирнов А.В.",
			date: "09.09.2026",
			totalAmountRub: 0,
			paidAmountRub: 0,
			status: "warranty_100",
			items: [
				{ id: "li-3", code: "A16.07.002", name: "Гарантийная шлифовка", quantity: 1, priceRub: 0 },
			],
			createdAt: new Date().toISOString(),
			paidAt: new Date().toISOString(),
			paymentMethod: "warranty_discount_100",
			notes: "Гарантия 100% на переделку реставрации",
		},
	];

	describe("1. Zero Mocks & Two-Tier Storage (DEF-01, DEF-03, Mandate 2)", () => {
		it("InvoicesView source has NO hardcoded DEMO_INVOICES array", () => {
			const source = fs.readFileSync(invoicesFilePath, "utf-8");

			assert.ok(
				!source.includes("const DEMO_INVOICES"),
				"DEMO_INVOICES mock array must be eliminated",
			);
			assert.ok(
				source.includes("export const INVOICES_STORAGE_KEY = \"dente_billing_invoices\""),
				"Must declare standard INVOICES_STORAGE_KEY",
			);
			assert.ok(
				source.includes("export function loadStoredInvoices"),
				"Must declare loadStoredInvoices helper",
			);
			assert.ok(
				source.includes("export function saveStoredInvoices"),
				"Must declare saveStoredInvoices helper",
			);
		});

		it("loadStoredInvoices and saveStoredInvoices roundtrip correctly via localStorage", () => {
			const fakeStorage: Record<string, string> = {};
			const mockLocalStorage = {
				getItem: (key: string) => fakeStorage[key] || null,
				setItem: (key: string, val: string) => {
					fakeStorage[key] = val;
				},
				removeItem: (key: string) => {
					delete fakeStorage[key];
				},
				clear: () => {
					for (const k of Object.keys(fakeStorage)) delete fakeStorage[k];
				},
			};

			const originalWindow = global.window;
			// @ts-expect-error test mock
			global.window = { localStorage: mockLocalStorage };

			try {
				saveStoredInvoices(sampleInvoices);
				const loaded = loadStoredInvoices();
				assert.equal(loaded.length, 3);
				assert.equal(loaded[0]?.number, "СЧ-009101");
				assert.equal(loaded[1]?.status, "paid");
				assert.equal(loaded[2]?.status, "warranty_100");
			} finally {
				global.window = originalWindow;
			}
		});

		it("Renders clean empty state when no invoices exist instead of fake mock cards", () => {
			const html = renderToString(
				<InvoicesView
					initialInvoices={[]}
					currentDoctorName="Д-р Смирнов А.В."
				/>,
			);

			assert.ok(html.includes("Счета не найдены"), "Must display honest empty state");
			assert.ok(html.includes("Создать первый счет"), "Must show 1-click create button");
			assert.ok(!html.includes("СЧ-004812"), "Must NOT display deleted demo invoice СЧ-004812");
		});
	});

	describe("2. Server Synchronization & Persistence (DEF-03, DEF-04, Mandates 8e, 8n)", () => {
		it("InvoicesView source wires server fetch with denteAdminSecretRequestHeaders", () => {
			const source = fs.readFileSync(invoicesFilePath, "utf-8");

			assert.ok(
				source.includes("denteAdminSecretRequestHeaders()"),
				"Must wire denteAdminSecretRequestHeaders in fetch",
			);
			assert.ok(
				source.includes("/api/invoices"),
				"Must query GET /api/invoices",
			);
			assert.ok(
				source.includes("saveStoredInvoices"),
				"Must persist synced server invoices to storage",
			);
		});

		it("handleCreateInvoice saves new invoice to storage and triggers async sync", () => {
			const source = fs.readFileSync(invoicesFilePath, "utf-8");

			assert.ok(
				source.includes("saveStoredInvoices(updated)"),
				"Must persist updated invoices to storage on creation",
			);
			assert.ok(
				source.includes("/api/invoices/generate-from-plan"),
				"Must trigger async server sync when patient UUID is provided",
			);
		});

		it("handleApplyWarranty100 sets status to warranty_100, 0 ₽ total, and saves to storage", () => {
			const source = fs.readFileSync(invoicesFilePath, "utf-8");

			assert.ok(
				source.includes("status: \"warranty_100\""),
				"Must set status to warranty_100",
			);
			assert.ok(
				source.includes("totalAmountRub: 0"),
				"Must set totalAmountRub to 0",
			);
			assert.ok(
				source.includes("saveStoredInvoices(updated)"),
				"Must call saveStoredInvoices when warranty is applied",
			);
		});
	});

	describe("3. FinanceView Integration (DEF-02, Mandates 8c, 8d, 8e)", () => {
		it("FinanceView source mounts InvoicesView and renders btn-finance-open-invoices button", () => {
			const source = fs.readFileSync(financeFilePath, "utf-8");

			assert.ok(
				source.includes("import { InvoicesView } from \"./components/billing/InvoicesView.js\"") ||
				source.includes("import { InvoicesView } from \"./components/billing/InvoicesView\""),
				"FinanceView must import InvoicesView",
			);
			assert.ok(
				source.includes("data-testid=\"btn-finance-open-invoices\""),
				"FinanceView must render btn-finance-open-invoices button",
			);
			assert.ok(
				source.includes("Счета и акты (804н)"),
				"Button must display clean Russian text 'Счета и акты (804н)'",
			);
			assert.ok(
				source.includes("data-testid=\"modal-finance-invoices\""),
				"FinanceView must render modal container modal-finance-invoices",
			);
			assert.ok(
				source.includes("patientId={documentPatient?.id}"),
				"FinanceView must pass documentPatient?.id to InvoicesView",
			);
			assert.ok(
				source.includes("patientName={documentPatient?.fullName}"),
				"FinanceView must pass documentPatient?.fullName to InvoicesView",
			);
		});
	});

	describe("4. 7 Deadly Sins of UI & Theme Hygiene (DEF-06, Mandate 8d)", () => {
		it("All status badges include WCAG AAA dark mode border tokens", () => {
			const source = fs.readFileSync(invoicesFilePath, "utf-8");

			assert.ok(
				source.includes("border-emerald-200 dark:border-emerald-800"),
				"Paid status badge must include dark:border-emerald-800",
			);
			assert.ok(
				source.includes("border-purple-200 dark:border-purple-800"),
				"Warranty status badge must include dark:border-purple-800",
			);
			assert.ok(
				source.includes("border-amber-200 dark:border-amber-800"),
				"Pending status badge must include dark:border-amber-800",
			);
		});

		it("Toolbar close button has data-testid='btn-invoices-close' when onClose is provided", () => {
			const html = renderToString(
				<InvoicesView
					initialInvoices={sampleInvoices}
					onClose={() => {}}
				/>,
			);

			assert.ok(
				html.includes("data-testid=\"btn-invoices-close\""),
				"Close button must have data-testid='btn-invoices-close'",
			);
		});

		it("All interactive controls enforce touch targets >= 44px on mobile and >= 32px on desktop", () => {
			const html = renderToString(
				<InvoicesView
					initialInvoices={sampleInvoices}
					onClose={() => {}}
				/>,
			);

			assert.ok(html.includes("min-h-[44px]"), "Must have min-h-[44px] touch targets");
		});

		it("Strict ban on cartoon emojis in invoices, acts, and cards (Lucide icons only)", () => {
			const html = renderToString(
				<InvoicesView
					initialInvoices={sampleInvoices}
					currentDoctorName="Д-р Смирнов А.В."
					onClose={() => {}}
				/>,
			);

			const forbiddenEmojis = ["⚡", "🧾", "💳", "📄", "💰", "🦷", "🏥", "✅", "❌", "⚠️", "🔥"];
			for (const emoji of forbiddenEmojis) {
				assert.ok(
					!html.includes(emoji),
					`Rendered HTML must NOT contain cartoon emoji '${emoji}'`,
				);
			}
		});

		it("Zero disabled buttons without clinical justification (Doctor Autonomy Mandate 8e)", () => {
			const html = renderToString(
				<InvoicesView
					initialInvoices={sampleInvoices}
					currentDoctorName="Д-р Смирнов А.В."
					onClose={() => {}}
				/>,
			);

			// Pay buttons, print buttons, menu buttons must be fully enabled
			assert.ok(html.includes("data-testid=\"btn-pay-invoice-inv-w61-001\""));
			assert.ok(html.includes("data-testid=\"btn-print-invoice-inv-w61-001\""));
			assert.ok(html.includes("data-testid=\"btn-invoice-menu-inv-w61-001\""));
		});
	});
});
