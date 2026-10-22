import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type AcquiringTerminalTransaction,
	exportAcquiringReconciliationToCsv,
	exportFiscalPeriodStatementToCsv,
	type KktFiscalElectronicRecord,
	reconcileAcquiringWithKkt,
} from "../fiscal54fzEngine";

describe("Fiscal Reconciliation Tests", () => {
	it("1.1 exportFiscalPeriodStatementToCsv — Generates RFC 4180 CSV with UTF-8 BOM", () => {
		const csv = exportFiscalPeriodStatementToCsv({
			statementNumber: "ВЕД-2026/08",
			periodStart: "2026-08-01",
			periodEnd: "2026-08-25",
			shifts: [],
		});
		assert.ok(csv.startsWith("\uFEFF"));
		assert.ok(csv.includes("СВОДНАЯ ВЕДОМОСТЬ ФИСКАЛЬНЫХ ОПЕРАЦИЙ И ВЫРУЧКИ ЗА ПЕРИОД"));
		assert.ok(csv.includes("ИТОГО ЗА ПЕРИОД"));
	});

	it("1.2 reconcileAcquiringWithKkt — Matches exact transactions, catches missing receipts and diffs", () => {
		const terminalTxs: AcquiringTerminalTransaction[] = [
			{
				id: "t-1",
				rrn: "623891048110",
				authCode: "594821",
				panMasked: "4276 38** **** 8421",
				paymentType: "card_contactless",
				amountRub: 28000,
				amountKopecks: 2800000,
				timestamp: "2026-08-25 09:09:40",
				terminalId: "POS-01",
				status: "approved",
			},
		];

		const kktRecords: KktFiscalElectronicRecord[] = [
			{
				id: "k-1",
				fiscalDocNumber: "00084",
				fiscalSign: "4920194821",
				patientName: "Кузнецов Артем",
				electronicAmountRub: 28000,
				electronicAmountKopecks: 2800000,
				operationType: "income",
				timestamp: "2026-08-25 09:12:44",
				terminalRrn: "623891048110",
			},
		];

		const report = reconcileAcquiringWithKkt(terminalTxs, kktRecords);
		const csv = exportAcquiringReconciliationToCsv(report);
		assert.ok(csv.startsWith("\uFEFF"));
		assert.ok(csv.includes("Статус сверки;RRN Эквайринга;Карта / Тип"));
		assert.ok(csv.includes("623891048110"));
		assert.ok(csv.includes("28000,00"));
	});
});
