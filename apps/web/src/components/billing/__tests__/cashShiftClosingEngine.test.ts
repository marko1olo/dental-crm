import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	type CashDenominations,
	type CashDiscrepancyReason,
	type CashShiftOperationRecord,
	CASH_DISCREPANCY_REASON_LABELS,
	DEFAULT_CLINIC_FISCAL_DETAILS,
	EMPTY_CASH_DENOMINATIONS,
	calculateCashShiftBalances,
	calculateDenominationsTotalKopecks,
	calculateDenominationsTotalRub,
	convertRubToWordsRu,
	generateEncashmentStatement,
	generateEncashmentStatementHtml,
	generateKo1Html,
	generateKo1Voucher,
	generateKo2Html,
	generateKo2Voucher,
	generateMonospacedTapeText,
	generateShiftClosingAct,
	generateShiftClosingActHtml,
} from "../cashShiftClosingEngine";

describe("cashShiftClosingEngine — 54-FZ Shift Closing & Encashment", () => {
	describe("1. Denomination breakdown calculations", () => {
		it("calculates zero for empty denominations", () => {
			assert.equal(calculateDenominationsTotalKopecks(EMPTY_CASH_DENOMINATIONS), 0);
			assert.equal(calculateDenominationsTotalRub(EMPTY_CASH_DENOMINATIONS), 0);
		});

		it("calculates exact kopecks and rubles for various denominations", () => {
			const denoms: CashDenominations = {
				b5000: 2, // 10 000
				b2000: 1, // 2 000
				b1000: 3, // 3 000
				b500: 4, // 2 000
				b200: 5, // 1 000
				b100: 10, // 1 000
				b50: 2, // 100
				c10: 15, // 150
				c5: 10, // 50
				c2: 5, // 10
				c1: 5, // 5
				coinsFractionalRub: 0.75, // 0.75
			};
			// Total: 10000 + 2000 + 3000 + 2000 + 1000 + 1000 + 100 + 150 + 50 + 10 + 5 + 0.75 = 19315.75
			const totalKop = calculateDenominationsTotalKopecks(denoms);
			const totalRub = calculateDenominationsTotalRub(denoms);

			assert.equal(totalKop, 1931575);
			assert.equal(totalRub, 19315.75);
		});
	});

	describe("2. Cash shift balancing & 54-FZ reconciliation", () => {
		const baseTime = "2026-08-28T09:00:00.000Z";
		const closeTime = "2026-08-28T18:00:00.000Z";

		const sampleOps: CashShiftOperationRecord[] = [
			{
				id: "1",
				timestampIso: "2026-08-28T10:00:00.000Z",
				type: "patient_payment",
				amountRub: 10000,
				amountKopecks: 1000000 as any,
				tenderType: "cash",
				description: "Оплата наличными",
				cashierFullName: "Сидорова А. П.",
			},
			{
				id: "2",
				timestampIso: "2026-08-28T11:00:00.000Z",
				type: "patient_payment",
				amountRub: 25000,
				amountKopecks: 2500000 as any,
				tenderType: "card",
				description: "Эквайринг карты",
				cashierFullName: "Сидорова А. П.",
			},
			{
				id: "3",
				timestampIso: "2026-08-28T12:00:00.000Z",
				type: "patient_payment",
				amountRub: 15000,
				amountKopecks: 1500000 as any,
				tenderType: "sbp",
				description: "Оплата по СБП QR",
				cashierFullName: "Сидорова А. П.",
			},
			{
				id: "4",
				timestampIso: "2026-08-28T13:00:00.000Z",
				type: "patient_payment",
				amountRub: 5000,
				amountKopecks: 500000 as any,
				tenderType: "advance_offset",
				description: "Зачет депозита",
				cashierFullName: "Сидорова А. П.",
			},
			{
				id: "5",
				timestampIso: "2026-08-28T14:00:00.000Z",
				type: "patient_refund",
				amountRub: 2000,
				amountKopecks: 200000 as any,
				tenderType: "cash",
				description: "Возврат наличных",
				cashierFullName: "Сидорова А. П.",
			},
			{
				id: "6",
				timestampIso: "2026-08-28T15:00:00.000Z",
				type: "cash_in",
				amountRub: 3000,
				amountKopecks: 300000 as any,
				description: "Внесение наличных в кассу",
				cashierFullName: "Сидорова А. П.",
			},
		];

		it("reconciles exact cash balance with zero discrepancy", () => {
			// Initial change fund: 5 000
			// Inflow cash: 10 000 (payment) + 3 000 (cash-in) = 13 000
			// Outflow cash: 2 000 (refund)
			// Calculated cash in drawer: 5000 + 13000 - 2000 = 16 000
			const res = calculateCashShiftBalances({
				shiftNumber: 10,
				openedAtIso: baseTime,
				closedAtIso: closeTime,
				cashierFullName: "Сидорова А. П.",
				initialChangeFundRub: 5000,
				operations: sampleOps,
				countedCashRub: 16000,
				retainedChangeFundRub: 5000,
			});

			assert.equal(res.calculatedCashInDrawerRub, 16000);
			assert.equal(res.countedCashInDrawerRub, 16000);
			assert.equal(res.differenceRub, 0);
			assert.equal(res.status, "balanced");
			assert.equal(res.isExplanationRequired, false);
			assert.equal(res.discrepancyReason, "exact_match");
			assert.equal(res.encashmentAmountRub, 11000); // 16000 - 5000 retained
			assert.equal(res.retainedNextShiftChangeFundRub, 5000);
			assert.equal(res.tenders.netRevenueRub, 53000); // 55000 gross - 2000 return
			assert.equal(res.shiftDurationHours, 9);
			assert.equal(res.shiftDurationFormatted, "9 ч 00 мин");
			assert.equal(res.isShiftDurationExceeded24h, false);
			assert.equal(res.isShiftDurationWarning20h, false);
			assert.equal(res.hoursRemainingUntil24h, 15);
		});

		it("detects surplus when physical cash > calculated cash", () => {
			const res = calculateCashShiftBalances({
				shiftNumber: 10,
				openedAtIso: baseTime,
				closedAtIso: closeTime,
				cashierFullName: "Сидорова А. П.",
				initialChangeFundRub: 5000,
				operations: sampleOps,
				countedCashRub: 16500, // 500 rub surplus
				discrepancyReason: "unrecorded_cash_operation",
				cashierExplanation: "Оплата за снимок 500 руб не была внесена в CRM",
			});

			assert.equal(res.status, "surplus");
			assert.equal(res.differenceRub, 500);
			assert.equal(res.isExplanationRequired, true);
			assert.equal(res.discrepancyReason, "unrecorded_cash_operation");
			assert.equal(res.cashierExplanation, "Оплата за снимок 500 руб не была внесена в CRM");
			assert.equal(res.discrepancyReasonLabel, "Неучтенная наличная операция (без пробития чека)");
		});

		it("detects shortage when physical cash < calculated cash", () => {
			const res = calculateCashShiftBalances({
				shiftNumber: 10,
				openedAtIso: baseTime,
				closedAtIso: closeTime,
				cashierFullName: "Сидорова А. П.",
				initialChangeFundRub: 5000,
				operations: sampleOps,
				countedCashRub: 15300, // 700 rub shortage
				discrepancyReason: "cashier_change_error",
				cashierExplanation: "Ошибочно выдана лишняя сдача пациенту",
			});

			assert.equal(res.status, "shortage");
			assert.equal(res.differenceRub, -700);
			assert.equal(res.isExplanationRequired, true);
			assert.equal(res.discrepancyReason, "cashier_change_error");
			assert.equal(res.discrepancyReasonLabel, "Ошибка кассира при выдаче сдачи");
		});

		it("handles 20-hour warning and 24-hour limit violation properly", () => {
			// 21 hours duration (warning)
			const open21h = "2026-08-27T21:00:00.000Z";
			const close21h = "2026-08-28T18:00:00.000Z"; // 21 hours
			const resWarning = calculateCashShiftBalances({
				shiftNumber: 11,
				openedAtIso: open21h,
				closedAtIso: close21h,
				cashierFullName: "Сидорова А. П.",
				initialChangeFundRub: 5000,
				operations: [],
				countedCashRub: 5000,
			});

			assert.equal(resWarning.isShiftDurationWarning20h, true);
			assert.equal(resWarning.isShiftDurationExceeded24h, false);
			assert.equal(resWarning.shiftDurationHours, 21);
			assert.equal(resWarning.hoursRemainingUntil24h, 3);
			assert.ok(resWarning.ftsWarningMessage?.includes("До блокировки ККТ"));

			// 26 hours duration (exceeded)
			const open26h = "2026-08-27T16:00:00.000Z";
			const close26h = "2026-08-28T18:00:00.000Z"; // 26 hours
			const resExceeded = calculateCashShiftBalances({
				shiftNumber: 12,
				openedAtIso: open26h,
				closedAtIso: close26h,
				cashierFullName: "Сидорова А. П.",
				initialChangeFundRub: 5000,
				operations: [],
				countedCashRub: 5000,
			});

			assert.equal(resExceeded.isShiftDurationExceeded24h, true);
			assert.equal(resExceeded.isShiftDurationWarning20h, false);
			assert.ok(resExceeded.shiftDurationHours >= 26);
			assert.equal(resExceeded.hoursRemainingUntil24h, 0);
			assert.ok(resExceeded.ftsWarningMessage?.includes("Смена превысила 24 часа"));
		});

		it("correctly reconciles all payment tenders (Cash, Card, SBP, Advance)", () => {
			const res = calculateCashShiftBalances({
				shiftNumber: 15,
				openedAtIso: baseTime,
				closedAtIso: closeTime,
				cashierFullName: "Сидорова А. П.",
				initialChangeFundRub: 10000,
				operations: sampleOps,
			});

			assert.equal(res.tenders.cashIncomeRub, 10000);
			assert.equal(res.tenders.cardIncomeRub, 25000);
			assert.equal(res.tenders.sbpIncomeRub, 15000);
			assert.equal(res.tenders.advanceOffsetIncomeRub, 5000);
			assert.equal(res.tenders.totalGrossIncomeRub, 55000);
			assert.equal(res.tenders.cashReturnRub, 2000);
			assert.equal(res.tenders.totalReturnsRub, 2000);
			assert.equal(res.tenders.netRevenueRub, 53000);
			assert.equal(res.receiptsCount, 4);
			assert.equal(res.returnsCount, 1);
		});
	});

	describe("3. Russian currency amount in words generator (convertRubToWordsRu)", () => {
		it("converts 0 rubles correctly", () => {
			assert.equal(convertRubToWordsRu(0), "Ноль рублей 00 копеек");
		});

		it("converts single rubles with proper masculine declension", () => {
			assert.equal(convertRubToWordsRu(1), "Один рубль 00 копеек");
			assert.equal(convertRubToWordsRu(2), "Два рубля 00 копеек");
			assert.equal(convertRubToWordsRu(5), "Пять рублей 00 копеек");
		});

		it("converts thousands with proper feminine declension", () => {
			assert.equal(convertRubToWordsRu(1000), "Одна тысяча рублей 00 копеек");
			assert.equal(convertRubToWordsRu(2000), "Две тысячи рублей 00 копеек");
			assert.equal(convertRubToWordsRu(5000), "Пять тысяч рублей 00 копеек");
		});

		it("converts complex amounts with exact kopecks", () => {
			assert.equal(
				convertRubToWordsRu(55400.5),
				"Пятьдесят пять тысяч четыреста рублей 50 копеек",
			);
			assert.equal(
				convertRubToWordsRu(1001.01),
				"Одна тысяча один рубль 01 копейка",
			);
			assert.equal(
				convertRubToWordsRu(22.22),
				"Двадцать два рубля 22 копейки",
			);
			assert.equal(
				convertRubToWordsRu(1234567.89),
				"Один миллион двести тридцать четыре тысячи пятьсот шестьдесят семь рублей 89 копеек",
			);
		});
	});

	describe("4. Accounting documents (KO-1, KO-2, Encashment, Act)", () => {
		it("generates valid KO-1 Cash Inflow Voucher and HTML", () => {
			const v = generateKo1Voucher({
				docNumber: "ПКО-42",
				amountRub: 5000,
				receivedFrom: "Сидорова А. П.",
				basisRu: "Внесение разменного фонда",
				cashierFullName: "Сидорова А. П.",
			});

			assert.equal(v.docNumber, "ПКО-42");
			assert.equal(v.amountRub, 5000);
			assert.equal(v.amountWordsRu, "Пять тысяч рублей 00 копеек");
			assert.equal(v.receivedFrom, "Сидорова А. П.");

			const html = generateKo1Html(v);
			assert.ok(html.includes("Приходный кассовый ордер (Форма КО-1)"));
			assert.ok(html.includes("ПКО-42"));
			assert.ok(html.includes("5000.00 руб."));
			assert.ok(html.includes(DEFAULT_CLINIC_FISCAL_DETAILS.legalName));
		});

		it("generates valid KO-2 Cash Outflow Voucher and HTML", () => {
			const v = generateKo2Voucher({
				docNumber: "РКО-42",
				amountRub: 15400,
				issuedTo: "Служба инкассации",
				basisRu: "Инкассация выручки за смену",
				cashierFullName: "Сидорова А. П.",
				recipientPassportRu: "Паспорт РФ 45 12 № 394821 выдан ОВД Тверской г. Москвы",
			});

			assert.equal(v.docNumber, "РКО-42");
			assert.equal(v.amountRub, 15400);
			assert.equal(v.amountWordsRu, "Пятнадцать тысяч четыреста рублей 00 копеек");
			assert.ok(v.recipientPassportRu?.includes("394821"));

			const html = generateKo2Html(v);
			assert.ok(html.includes("Расходный кассовый ордер (Форма КО-2)"));
			assert.ok(html.includes("РКО-42"));
			assert.ok(html.includes("15400.00 руб."));
		});

		it("generates valid Encashment Statement and HTML", () => {
			const stmt = generateEncashmentStatement({
				shiftNumber: 42,
				statementNumber: "ИНК-42",
				cashierFullName: "Сидорова А. П.",
				encashmentAmountRub: 20000,
				denominations: { ...EMPTY_CASH_DENOMINATIONS, b5000: 4 },
				destination: "clinic_safe",
			});

			assert.equal(stmt.statementNumber, "ИНК-42");
			assert.equal(stmt.encashmentAmountRub, 20000);
			assert.equal(stmt.destination, "clinic_safe");
			assert.equal(stmt.destinationLabel, "Огнеупорный сейф клиники");

			const html = generateEncashmentStatementHtml(stmt);
			assert.ok(html.includes("Ведомость инкассации и передачи выручки"));
			assert.ok(html.includes("ИНК-42"));
			assert.ok(html.includes("20000.00 руб."));
		});

		it("generates valid Shift Closing Act and HTML", () => {
			const rec = calculateCashShiftBalances({
				shiftNumber: 42,
				openedAtIso: "2026-08-28T09:00:00.000Z",
				cashierFullName: "Сидорова А. П.",
				initialChangeFundRub: 5000,
				operations: [],
				countedCashRub: 5000,
			});

			const act = generateShiftClosingAct({ reconciliation: rec, actNumber: "АКТ-42" });
			assert.equal(act.actNumber, "АКТ-42");
			assert.equal(act.reconciliation.shiftNumber, 42);

			const html = generateShiftClosingActHtml(act);
			assert.ok(html.includes("Акт закрытия кассовой смены и инвентаризации кассы"));
			assert.ok(html.includes("АКТ-42"));
			assert.ok(html.includes("СВЕРЕНО (0.00 ₽)"));
			assert.ok(html.includes("1. ФИСКАЛЬНЫЕ ИТОГИ СМЕНЫ 54-ФЗ"));
		});
	});

	describe("5. Monospaced fiscal tape text generator (X-Report and Z-Report)", () => {
		it("generates 58mm and 80mm thermal receipt tapes with full 54-FZ tags", () => {
			const rec = calculateCashShiftBalances({
				shiftNumber: 42,
				openedAtIso: "2026-08-28T09:00:00.000Z",
				cashierFullName: "Сидорова А. П.",
				initialChangeFundRub: 5000,
				operations: [
					{
						id: "1",
						timestampIso: "2026-08-28T10:00:00.000Z",
						type: "patient_payment",
						amountRub: 12000,
						amountKopecks: 1200000 as any,
						tenderType: "cash",
						description: "Оплата",
						cashierFullName: "Сидорова А. П.",
					},
				],
				countedCashRub: 17000,
			});

			// X-Report
			const xTape58 = generateMonospacedTapeText({
				reportType: "x_report",
				reconciliation: rec,
				tapeWidth: "58mm",
				fiscalDocNumber: "00041",
				fiscalSign: "1234567890",
			});
			assert.ok(xTape58.includes("ПРОМЕЖУТОЧНЫЙ ОТЧЕТ (X)"));
			assert.ok(xTape58.includes("СМЕНА № 42"));
			assert.ok(xTape58.includes("12000.00 ₽"));

			// Z-Report 58mm
			const zTape58 = generateMonospacedTapeText({
				reportType: "z_report",
				reconciliation: rec,
				tapeWidth: "58mm",
				fiscalDocNumber: "00042",
				fiscalSign: "3920194821",
			});
			assert.ok(zTape58.includes("ОТЧЕТ О ЗАКРЫТИИ СМЕНЫ (Z)"));
			assert.ok(zTape58.includes("СМЕНА № 42"));
			assert.ok(zTape58.includes("12000.00 ₽"));
			assert.ok(zTape58.includes("ФД №:"));
			assert.ok(zTape58.includes("00042"));
			assert.ok(zTape58.includes("ФПД:"));
			assert.ok(zTape58.includes("3920194821"));

			// Z-Report 80mm
			const zTape80 = generateMonospacedTapeText({
				reportType: "z_report",
				reconciliation: rec,
				tapeWidth: "80mm",
				fiscalDocNumber: "00042",
				fiscalSign: "3920194821",
			});
			assert.ok(zTape80.includes("ОТЧЕТ О ЗАКРЫТИИ СМЕНЫ (Z)"));
			assert.ok(zTape80.length > 0);
		});
	});

	describe("6. Discrepancy reason labels mapping", () => {
		it("provides all required discrepancy reasons with Russian localized labels", () => {
			const reasons: CashDiscrepancyReason[] = [
				"exact_match",
				"cashier_change_error",
				"unrecorded_cash_operation",
				"pos_terminal_desync",
				"bank_holding_delay",
				"technical_kkt_malfunction",
				"rounding_difference",
				"other",
			];

			for (const r of reasons) {
				assert.ok(CASH_DISCREPANCY_REASON_LABELS[r], `Reason label missing for: ${r}`);
				assert.ok(typeof CASH_DISCREPANCY_REASON_LABELS[r] === "string");
				assert.ok(CASH_DISCREPANCY_REASON_LABELS[r].length > 0);
			}
		});
	});
});
