/**
 * packages/shared/src/tests/wave118StomxCashFlowCatalogs.test.ts
 *
 * DENTE Dental CRM — Verification Suite for StomX Cash Flow & 54-FZ FFD 1.2 Tag 1054 Catalogs (Wave 118).
 * Governed by:
 * - Supreme Law: THE HAMMER, Mandates 8a-8q
 * - Federal Law No. 54-FZ & FFD 1.2 Tag 1054
 * - Exact integer math & zero mocks
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	STOMX_CASH_EXPENSE_CATALOG,
	STOMX_CASH_RECEIPT_CATALOG,
	STOMX_CASH_EXPENSE_BY_ALIAS,
	STOMX_CASH_EXPENSE_BY_ID,
	STOMX_CASH_RECEIPT_BY_ALIAS,
	STOMX_CASH_RECEIPT_BY_ID,
	STOMX_EXPENSE_TYPE_ALIASES,
	STOMX_RECEIPT_TYPE_ALIASES,
	stomxCashExpenseItemSchema,
	stomxCashReceiptItemSchema,
	getFfd1054Label,
	isFiscal54FzOperation,
} from "../finance/stomxCashFlowCatalogs.js";

describe("Wave 118 — StomX Cash Flow Catalogs & 54-FZ Tag 1054 Classification", () => {
	it("contains exactly 14 canonical StomX cash expense types with valid schemas and IDs", () => {
		assert.equal(STOMX_CASH_EXPENSE_CATALOG.length, 14, "Must contain exactly 14 expense types");
		assert.equal(STOMX_EXPENSE_TYPE_ALIASES.length, 14, "Must list all 14 aliases");

		const expectedExpenses: Record<string, { id: number; name: string; tag1054: string | null }> = {
			family_transfer: { id: 41, name: "Перевод семейного аванса", tag1054: null },
			collection: { id: 1, name: "Инкассация", tag1054: null },
			return_appointment: { id: 12, name: "Возврат денег за прием", tag1054: "возврат_прихода" },
			return_advance: { id: 2, name: "Вернуть аванс", tag1054: "возврат_прихода" },
			payment_employee: { id: 3, name: "Выдать ДС сотруднику", tag1054: "расход" },
			payment_contractor: { id: 4, name: "Выдать ДС контрагенту", tag1054: "расход" },
			return_product: { id: 14, name: "Возврат товаров", tag1054: "возврат_прихода" },
			service_charge: { id: 15, name: "Плата за услуги", tag1054: "расход" },
			cash_to_balance: { id: 18, name: "Возврат денег на баланс", tag1054: null },
			payment_lab: { id: 8, name: "Оплата услуг лаборатории", tag1054: "расход" },
			block: { id: 9, name: "Блокировка средств для оплаты приема", tag1054: null },
			remainder: { id: 11, name: "Остатки", tag1054: null },
			dms_return: { id: 21, name: "Возврат услуг через ДМС", tag1054: null },
			xray_return: { id: 32, name: "Возврат рентгена", tag1054: "возврат_прихода" },
		};

		for (const [alias, expected] of Object.entries(expectedExpenses)) {
			const item = STOMX_CASH_EXPENSE_BY_ALIAS[alias as keyof typeof STOMX_CASH_EXPENSE_BY_ALIAS];
			assert.ok(item, `Expense item for alias '${alias}' must exist`);
			assert.equal(item.id, expected.id, `ID mismatch for expense '${alias}'`);
			assert.equal(item.name, expected.name, `Name mismatch for expense '${alias}'`);
			assert.equal(item.ffdTag1054, expected.tag1054, `54-FZ Tag 1054 mismatch for '${alias}'`);

			// Validate with Zod schema
			const parsed = stomxCashExpenseItemSchema.safeParse(item);
			assert.ok(parsed.success, `Zod validation failed for expense '${alias}': ${JSON.stringify(parsed.error?.issues)}`);

			// Lookup by ID parity
			const byId = STOMX_CASH_EXPENSE_BY_ID[expected.id];
			assert.equal(byId.alias, alias, `ID map lookup mismatch for id ${expected.id}`);
		}
	});

	it("contains exactly 9 canonical StomX cash receipt types with valid schemas and IDs", () => {
		assert.equal(STOMX_CASH_RECEIPT_CATALOG.length, 9, "Must contain exactly 9 receipt types");
		assert.equal(STOMX_RECEIPT_TYPE_ALIASES.length, 9, "Must list all 9 aliases");

		const expectedReceipts: Record<string, { id: number; name: string; tag1054: string | null; ffdSubject?: number | null }> = {
			installment_payment: { id: 50, name: "Оплата по рассрочке", tag1054: "приход", ffdSubject: 3 },
			appointment_payment: { id: 5, name: "Оплата приема", tag1054: "приход", ffdSubject: 4 },
			sale_product: { id: 13, name: "Продажа товаров", tag1054: "приход", ffdSubject: 1 },
			xray_payment: { id: 31, name: "Оплата рентгена", tag1054: "приход", ffdSubject: 4 },
			dms_pay: { id: 20, name: "Оплата услуг через ДМС", tag1054: null, ffdSubject: 4 },
			advance_payment: { id: 19, name: "Внесение аванса", tag1054: "приход", ffdSubject: 3 },
			cash_deposit: { id: 40, name: "Внесение для размена", tag1054: null, ffdSubject: null },
			income_employee: { id: 6, name: "Внесение ДС сотрудником", tag1054: null, ffdSubject: null },
			income_contractor: { id: 7, name: "Внесение ДС контрагентом", tag1054: null, ffdSubject: null },
		};

		for (const [alias, expected] of Object.entries(expectedReceipts)) {
			const item = STOMX_CASH_RECEIPT_BY_ALIAS[alias as keyof typeof STOMX_CASH_RECEIPT_BY_ALIAS];
			assert.ok(item, `Receipt item for alias '${alias}' must exist`);
			assert.equal(item.id, expected.id, `ID mismatch for receipt '${alias}'`);
			assert.equal(item.name, expected.name, `Name mismatch for receipt '${alias}'`);
			assert.equal(item.ffdTag1054, expected.tag1054, `54-FZ Tag 1054 mismatch for '${alias}'`);

			if (expected.ffdSubject !== undefined) {
				assert.equal(item.ffdCalculationSubject, expected.ffdSubject, `Calculation subject mismatch for '${alias}'`);
			}

			// Validate with Zod schema
			const parsed = stomxCashReceiptItemSchema.safeParse(item);
			assert.ok(parsed.success, `Zod validation failed for receipt '${alias}': ${JSON.stringify(parsed.error?.issues)}`);

			// Lookup by ID parity
			const byId = STOMX_CASH_RECEIPT_BY_ID[expected.id];
			assert.equal(byId.alias, alias, `ID map lookup mismatch for id ${expected.id}`);
		}
	});

	it("strictly validates 54-FZ FFD 1.2 Tag 1054 helper functions", () => {
		assert.ok(getFfd1054Label("приход").includes("Тег 1054 = 1"));
		assert.ok(getFfd1054Label("возврат_прихода").includes("Тег 1054 = 2"));
		assert.ok(getFfd1054Label("расход").includes("Тег 1054 = 3"));
		assert.ok(getFfd1054Label("возврат_расхода").includes("Тег 1054 = 4"));
		assert.equal(getFfd1054Label(null), "Внереализационная / Без чека");

		// isFiscal54FzOperation
		const receiptFiscal = STOMX_CASH_RECEIPT_BY_ALIAS.appointment_payment;
		const receiptNonFiscal = STOMX_CASH_RECEIPT_BY_ALIAS.cash_deposit;
		const expenseFiscalRefund = STOMX_CASH_EXPENSE_BY_ALIAS.return_appointment;
		const expenseNonFiscal = STOMX_CASH_EXPENSE_BY_ALIAS.collection;

		assert.equal(isFiscal54FzOperation(receiptFiscal), true, "Appointment payment must be fiscal");
		assert.equal(isFiscal54FzOperation(receiptNonFiscal), false, "Cash deposit for change is non-fiscal");
		assert.equal(isFiscal54FzOperation(expenseFiscalRefund), true, "Return appointment is fiscal refund");
		assert.equal(isFiscal54FzOperation(expenseNonFiscal), false, "Collection is non-fiscal");
	});

	it("rejects invalid item structures via Zod schemas", () => {
		// Negative ID
		const invalidExpense = {
			id: -1,
			alias: "collection",
			name: "Bad",
			isPredefined: true,
			isLocked: false,
			ffdTag1054: null,
		};
		assert.equal(stomxCashExpenseItemSchema.safeParse(invalidExpense).success, false);

		// Unknown alias
		const invalidAlias = {
			id: 100,
			alias: "unknown_alias_xyz",
			name: "Unknown",
			isPredefined: false,
			isLocked: false,
			ffdTag1054: null,
		};
		assert.equal(stomxCashReceiptItemSchema.safeParse(invalidAlias).success, false);
	});
});
