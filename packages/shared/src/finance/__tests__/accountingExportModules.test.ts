/**
 * accountingExportModules.test.ts — Unit Tests for Decomposed Accounting Export Modules.
 * Wave 130: CSV/TSV, Clinic Expense Matcher, Transaction Aggregator & Export Registry.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type BankStatementOrder,
	type BankStatementRegistry,
	type BankMatcherExpenseItem,
	calculateAggregatedTotalsKopecks,
	executeAccountingExport,
	exportOrdersToCsv,
	exportOrdersToTsv,
	matchClinicExpensesWithBankOrders,
} from "../accountingExportEngine.js";

describe("Accounting Export Decomposed Modules Test Suite", () => {
	const sampleOrders: BankStatementOrder[] = [
		{
			id: "ord-1",
			documentType: "Платежное поручение",
			number: "101",
			date: "2026-09-05",
			amountKopecks: 2500000,
			operationType: "receipt",
			payerAccount: "40817810200000099999",
			payerName: "Петров П.П.",
			payerInn: null,
			payerKpp: null,
			payerBankBik: "044525225",
			payerBankName: "ПАО СБЕРБАНК",
			payerBankCorrAccount: null,
			recipientAccount: "40702810400000012345",
			recipientName: "ООО «ДЕНТЕ»",
			recipientInn: "7707083893",
			recipientKpp: "770701001",
			recipientBankBik: "044525225",
			recipientBankName: "ПАО СБЕРБАНК",
			recipientBankCorrAccount: null,
			paymentPurpose: "Оплата стоматологических услуг",
			paymentKind: "электронно",
			paymentTypeCode: "01",
			priority: 5,
			vatRate: "Без НДС",
			vatAmountKopecks: 0,
		},
		{
			id: "ord-2",
			documentType: "Платежное поручение",
			number: "102",
			date: "2026-09-08",
			amountKopecks: 1000000,
			operationType: "expense",
			payerAccount: "40702810400000012345",
			payerName: "ООО «ДЕНТЕ»",
			payerInn: "7707083893",
			payerKpp: "770701001",
			payerBankBik: "044525225",
			payerBankName: "ПАО СБЕРБАНК",
			payerBankCorrAccount: null,
			recipientAccount: "40702810900000077777",
			recipientName: "ООО «МЕДТЕХНИКА»",
			recipientInn: "7702999999",
			recipientKpp: "770201001",
			recipientBankBik: "044525225",
			recipientBankName: "ПАО СБЕРБАНК",
			recipientBankCorrAccount: null,
			paymentPurpose: "Оплата расходных материалов",
			paymentKind: "электронно",
			paymentTypeCode: "01",
			priority: 5,
			vatRate: "20%",
			vatAmountKopecks: 166667,
		},
	];

	it("1. CSV & TSV Export includes UTF-8 BOM and correct headers", () => {
		const csv = exportOrdersToCsv(sampleOrders, ";");
		assert.ok(csv.startsWith("\uFEFF"), "CSV must start with UTF-8 BOM");
		assert.ok(csv.includes("Номер;Дата;Сумма (руб);Тип операции"));
		assert.ok(csv.includes("101;05.09.2026;25000.00;Поступление"));
		assert.ok(csv.includes("102;08.09.2026;10000.00;Списание"));

		const tsv = exportOrdersToTsv(sampleOrders);
		assert.ok(tsv.startsWith("\uFEFF"), "TSV must start with UTF-8 BOM");
		assert.ok(tsv.includes("Номер\tДата\tСумма (руб)"));
	});

	it("2. Transaction Aggregator calculates exact kopeck totals", () => {
		const totals = calculateAggregatedTotalsKopecks(sampleOrders);
		assert.equal(totals.totalReceivedKopecks, 2500000);
		assert.equal(totals.totalDeductedKopecks, 1000000);
		assert.equal(totals.netBalanceKopecks, 1500000);
		assert.equal(totals.receiptCount, 1);
		assert.equal(totals.expenseCount, 1);
	});

	it("3. Clinic Expense Matcher matches supplier orders with bank expenses", () => {
		const clinicExpenses: BankMatcherExpenseItem[] = [
			{
				id: "exp-1",
				amountKopecks: 1000000,
				supplierInn: "7702999999",
				supplierName: "ООО «МЕДТЕХНИКА»",
			},
			{
				id: "exp-2",
				amountKopecks: 500000,
				supplierInn: "7703888888",
			},
		];

		const matchResult = matchClinicExpensesWithBankOrders(sampleOrders, clinicExpenses);
		assert.equal(matchResult.matched.length, 1);
		assert.equal(matchResult.matched[0]?.clinicExpenseId, "exp-1");
		assert.equal(matchResult.matched[0]?.bankOrderId, "ord-2");
		assert.equal(matchResult.matched[0]?.isExactMatch, true);
		assert.equal(matchResult.matched[0]?.discrepancyKopecks, 0);
		assert.equal(matchResult.unmatchedClinicExpenses.length, 1);
		assert.equal(matchResult.unmatchedClinicExpenses[0]?.id, "exp-2");
	});

	it("4. Export Registry executes export for 1c_bank, csv, and tsv", () => {
		const registry: BankStatementRegistry = {
			registryId: "reg-test",
			accountNumber: "40702810400000012345",
			bankBik: "044525225",
			bankName: "ПАО СБЕРБАНК",
			clinicName: "ООО «ДЕНТЕ»",
			clinicInn: "7707083893",
			dateFrom: "2026-09-01",
			dateTo: "2026-09-10",
			orders: sampleOrders,
		};

		const res1C = executeAccountingExport({ format: "1c_bank", registry });
		assert.equal(res1C.format, "1c_bank");
		assert.ok(res1C.fileContent.includes("1CClientBankExchange"));

		const resCsv = executeAccountingExport({ format: "csv", registry });
		assert.equal(resCsv.format, "csv");
		assert.ok(resCsv.fileContent.startsWith("\uFEFF"));

		const resTsv = executeAccountingExport({ format: "tsv", registry });
		assert.equal(resTsv.format, "tsv");
		assert.ok(resTsv.fileContent.startsWith("\uFEFF"));
	});
});
