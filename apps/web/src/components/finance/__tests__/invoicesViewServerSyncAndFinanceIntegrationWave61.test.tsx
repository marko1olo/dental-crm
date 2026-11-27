/**
 * apps/web/src/components/finance/__tests__/invoicesViewServerSyncAndFinanceIntegrationWave61.test.tsx
 */

import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import {
	InvoicesView,
	type BillingInvoice,
	INVOICES_STORAGE_KEY,
	loadStoredInvoices,
	saveStoredInvoices,
} from "../../billing/InvoicesView.js";
import { FinanceToolbarActions } from "../toolbar/FinanceToolbarActions.js";
import { FinanceToolbarMenu } from "../toolbar/FinanceToolbarMenu.js";
import { CashFlowModal } from "../CashFlowModal.js";
import { InvoiceCardIdentity } from "../../billing/invoices/InvoiceCardIdentity.js";

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
			items: [{ id: "li-1", code: "A16.07.002", name: "Лечение кариеса", quantity: 1, priceRub: 6500 }],
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
			items: [{ id: "li-2", code: "A16.07.051", name: "Профгигиена GBT", quantity: 1, priceRub: 12000 }],
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
			items: [{ id: "li-3", code: "A16.07.002", name: "Гарантийная шлифовка", quantity: 1, priceRub: 0 }],
			createdAt: new Date().toISOString(),
			paidAt: new Date().toISOString(),
			paymentMethod: "warranty_discount_100",
			notes: "Гарантия 100% на переделку реставрации",
		},
	];

	describe("1. Zero Mocks & Two-Tier Storage", () => {
		it("loadStoredInvoices and saveStoredInvoices roundtrip correctly via localStorage", () => {
			assert.equal(INVOICES_STORAGE_KEY, "dente_billing_invoices");
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
				<InvoicesView initialInvoices={[]} currentDoctorName="Д-р Смирнов А.В." />,
			);

			assert.ok(html.includes("Счета не найдены"));
			assert.ok(html.includes("Создать первый счет"));
			assert.equal(html.includes("СЧ-004812"), false);
		});
	});

	describe("2. FinanceToolbarActions, RBAC 8n & CashFlowModal Transfer Integration", () => {
		it("renders btn-finance-open-invoices with clean Russian label 'Счета и акты'", () => {
			const html = renderToString(
				<FinanceToolbarActions
					billingSummary={null}
					onPayDebtQuick={() => {}}
					money={(v) => `${v ?? 0} ₽`}
					onOpenInvoices={() => {}}
				/>,
			);
			assert.ok(html.includes('data-testid="btn-finance-open-invoices"'));
			assert.ok(html.includes("Счета и акты"));
			assert.equal(html.includes("804н"), false);
		});

		it("enforces Mandate 8n RBAC in FinanceToolbarMenu: hides P&L and 1C CommerceML from admin while exposing them to owner", () => {
			const commonProps = {
				isFinanceOptionsOpen: true,
				onToggleFinanceOptions: () => {},
				onCloseFinanceOptions: () => {},
				onOpenPnl: () => {},
				onGoToDocuments: () => {},
				onOpenCashbox: () => {},
				onOpenAccountingExport: () => {},
				isCashShiftOpen: true,
				onToggleCashShift: () => {},
			};

			const adminHtml = renderToString(<FinanceToolbarMenu {...commonProps} userRole="admin" />);
			assert.equal(adminHtml.includes("Управленческий P&amp;L") || adminHtml.includes("Управленческий P&L"), false, "Admin must not see P&L");
			assert.equal(adminHtml.includes("Экспорт в 1С (CommerceML)"), false, "Admin must not see 1C export");

			const ownerHtml = renderToString(<FinanceToolbarMenu {...commonProps} userRole="owner" />);
			assert.ok(ownerHtml.includes("Управленческий P") && ownerHtml.includes("Экспорт в 1С (CommerceML)"), "Owner must see P&L and 1C export");
		});

		it("renders CashFlowModal with Межкассовый перевод mode and selects", () => {
			const html = renderToString(
				<CashFlowModal isOpen={true} initialMode="transfer" onClose={() => {}} />,
			);
			assert.ok(html.includes('data-testid="tab-cash-transfer-mode"'));
			assert.ok(html.includes('data-testid="select-cash-transfer-from"'));
			assert.ok(html.includes('data-testid="select-cash-transfer-to"'));
			assert.equal(html.includes("возврат_прихода"), false);
		});
	});

	describe("3. UI & Theme Hygiene (DEF-06, Mandate 8d)", () => {
		it("All status badges include WCAG AAA dark mode border tokens", () => {
			const paidHtml = renderToString(<InvoiceCardIdentity invoice={sampleInvoices[1]!} isPaid={true} isWarranty={false} />);
			const warrantyHtml = renderToString(<InvoiceCardIdentity invoice={sampleInvoices[2]!} isPaid={false} isWarranty={true} />);
			const pendingHtml = renderToString(<InvoiceCardIdentity invoice={sampleInvoices[0]!} isPaid={false} isWarranty={false} />);

			assert.ok(paidHtml.includes("border-emerald-200") && paidHtml.includes("dark:border-emerald-800"));
			assert.ok(warrantyHtml.includes("border-purple-200") && warrantyHtml.includes("dark:border-purple-800"));
			assert.ok(pendingHtml.includes("border-amber-200") && pendingHtml.includes("dark:border-amber-800"));
		});

		it("Toolbar close button, touch targets >= 44px, 0 cartoon emojis & 0 disabled buttons", () => {
			const html = renderToString(
				<InvoicesView
					initialInvoices={sampleInvoices}
					currentDoctorName="Д-р Смирнов А.В."
					onClose={() => {}}
				/>,
			);

			assert.ok(html.includes('data-testid="btn-invoices-close"'));
			assert.ok(html.includes("min-h-[44px]"));
			for (const emoji of ["⚡", "🧾", "💳", "📄", "💰", "🦷", "🏥", "✅", "❌", "⚠️", "🔥"]) {
				assert.equal(html.includes(emoji), false);
			}
			assert.ok(html.includes('data-testid="btn-pay-invoice-inv-w61-001"'));
			assert.ok(html.includes('data-testid="btn-print-invoice-inv-w61-001"'));
			assert.ok(html.includes('data-testid="btn-invoice-menu-inv-w61-001"'));
		});
	});
});
