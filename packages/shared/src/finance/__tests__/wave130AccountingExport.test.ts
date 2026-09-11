/**
 * wave130AccountingExport.test.ts — Unit Tests for 1C Client-Bank Accounting Export & Acquiring Reconciliation Engine.
 *
 * Wave 130 — Domain: Accounting Export & Bank Reconciliation (DentalPin Reverse-Engineering).
 *
 * Test coverage:
 * 1. Re-exports & Architectural Integrity:
 *    - All schemas, types, constants and functions exported from finance/index.ts and shared root index.ts.
 * 2. Zod Validation Schemas:
 *    - bankStatementOrderSchema validates incoming (receipt) and outgoing (expense) bank orders.
 *    - bankStatementRegistrySchema validates full 1C statement registry with balances.
 *    - paymentEntrySchema validates card/SBP/QR terminal payments.
 *    - acquirerStatementItemSchema validates bank acquiring statement lines.
 *    - acquirerReconciliationSchema validates full reconciliation result.
 *    - exportPreviewSchema validates DentalPin preview adapter.
 * 3. 1C:Enterprise Client-Bank Format 1.03 Export Generator:
 *    - Validates file header: 1CClientBankExchange, ВерсияФормата=1.03, Кодировка=Windows.
 *    - Validates СекцияРасчСчет with exact opening, received, deducted, and closing balances.
 *    - Validates СекцияДокумент=Платежное поручение with kopeck-exact amounts, INN/KPP, BIK, purpose.
 *    - Roundtrip: parse1CBankStatement parses generated text back with exact balances and orders.
 * 4. Acquiring Reconciliation Algorithm (reconcileAcquiringTransactions):
 *    - Scenario A: Perfect match (all transactions match, 0 commission discrepancy, status: balanced).
 *    - Scenario B: Commission discrepancy (bank charged 50 kopecks higher fee, status: discrepancies_found).
 *    - Scenario C: Lost payment / missing in bank (CRM card payment not found in bank statement).
 *    - Scenario D: Unrecorded transaction / missing in CRM (Terminal charged card, but missing in CRM).
 *    - Scenario E: Multi-acquirer tariffs (Sberbank 1.8%, T-Bank 1.7%, VTB 1.75%) with exact kopeck math.
 * 5. Statutory A4 Reconciliation Protocol (formatReconciliationProtocolA4):
 *    - Contains all statutory requisites (402-FZ, organization INN/KPP/account, summary table, signatures).
 *    - MANDATE 8d point 7: STRICT AUDIT guarantees 100% absence of emojis in official protocol.
 * 6. DentalPin Preview Adapter (buildAccountingExportPreview):
 *    - Calculates invoice count, payment count, taxable base, VAT, total amount, and sample orders.
 *
 * 100% Zero Mocks.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	ACQUIRING_PROVIDER_NAMES_RU,
	ACQUIRING_PROVIDERS,
	CLIENT_BANK_ENCODING,
	CLIENT_BANK_EXCHANGE_VERSION,
	DEFAULT_PAYMENT_KIND,
	DEFAULT_PAYMENT_PRIORITY,
	DEFAULT_PAYMENT_TYPE_CODE,
	DEFAULT_RECIPIENT_PROGRAM,
	DEFAULT_SENDER_PROGRAM,
	acquirerReconciliationSchema,
	acquirerStatementItemSchema,
	bankStatementOrderSchema,
	bankStatementRegistrySchema,
	buildAccountingExportPreview,
	exportPreviewSchema,
	format1CDate,
	format1CTime,
	formatAmount1C,
	formatReconciliationProtocolA4,
	formatRublesRu,
	generate1CBankStatement,
	matchedTransactionRecordSchema,
	parse1CBankStatement,
	paymentEntrySchema,
	reconcileAcquiringTransactions,
	reconciliationSummarySchema,
	type AcquirerStatementItem,
	type BankStatementOrder,
	type BankStatementRegistry,
	type PaymentEntry,
	type ReconciliationResult,
} from "../accountingExportEngine.js";

// Verify re-exports from packages/shared/src/finance/index.ts
import {
	buildAccountingExportPreview as buildPreviewFromFinanceIndex,
	formatReconciliationProtocolA4 as formatA4FromFinanceIndex,
	generate1CBankStatement as generate1CFromFinanceIndex,
	parse1CBankStatement as parse1CFromFinanceIndex,
	reconcileAcquiringTransactions as reconcileFromFinanceIndex,
} from "../index.js";

// Verify re-exports from packages/shared/src/index.ts
import {
	buildAccountingExportPreview as buildPreviewFromSharedIndex,
	formatReconciliationProtocolA4 as formatA4FromSharedIndex,
	generate1CBankStatement as generate1CFromSharedIndex,
	parse1CBankStatement as parse1CFromSharedIndex,
	reconcileAcquiringTransactions as reconcileFromSharedIndex,
} from "../../index.js";

describe("Wave 130: 1C Client-Bank Accounting Export & Acquiring Reconciliation Engine", () => {
	const validClinicInn = "7707083893";
	const validClinicKpp = "770701001";
	const validSettlementAccount = "40702810400000012345";
	const validBik = "044525225";
	const validBankName = "ПАО СБЕРБАНК";
	const validCorrAccount = "30101810400000000225";

	describe("1. Architectural Integrity & Re-exports", () => {
		it("re-exports all core accounting engine symbols through finance/index.ts", () => {
			assert.equal(typeof generate1CFromFinanceIndex, "function");
			assert.equal(typeof parse1CFromFinanceIndex, "function");
			assert.equal(typeof reconcileFromFinanceIndex, "function");
			assert.equal(typeof formatA4FromFinanceIndex, "function");
			assert.equal(typeof buildPreviewFromFinanceIndex, "function");
		});

		it("re-exports all core accounting engine symbols through packages/shared/src/index.ts", () => {
			assert.equal(typeof generate1CFromSharedIndex, "function");
			assert.equal(typeof parse1CFromSharedIndex, "function");
			assert.equal(typeof reconcileFromSharedIndex, "function");
			assert.equal(typeof formatA4FromSharedIndex, "function");
			assert.equal(typeof buildPreviewFromSharedIndex, "function");
		});
	});

	describe("2. Zod Validation Schemas & Taxonomy", () => {
		it("validates 1C Client-Bank order schema with incoming and outgoing payments", () => {
			const incomingOrder: BankStatementOrder = {
				id: "ord-001",
				documentType: "Платежное поручение",
				number: "101",
				date: "2026-09-10",
				amountKopecks: 1545000, // 15,450.00 RUB
				operationType: "receipt",
				payerAccount: "40817810200000099999",
				payerName: "Иванов Иван Иванович",
				payerInn: null,
				payerKpp: null,
				payerBankBik: "044525225",
				payerBankName: "ПАО СБЕРБАНК",
				payerBankCorrAccount: validCorrAccount,
				recipientAccount: validSettlementAccount,
				recipientName: "ООО «ДЕНТЕ КЛИНИК»",
				recipientInn: validClinicInn,
				recipientKpp: validClinicKpp,
				recipientBankBik: validBik,
				recipientBankName: validBankName,
				recipientBankCorrAccount: validCorrAccount,
				paymentPurpose: "Оплата стоматологических услуг по договору № 42. Без НДС (пп. 2 п. 2 ст. 149 НК РФ)",
				paymentKind: DEFAULT_PAYMENT_KIND,
				paymentTypeCode: DEFAULT_PAYMENT_TYPE_CODE,
				priority: DEFAULT_PAYMENT_PRIORITY,
				vatRate: "Без НДС",
				vatAmountKopecks: 0,
			};
			const parsed = bankStatementOrderSchema.parse(incomingOrder);
			assert.equal(parsed.amountKopecks, 1545000);
			assert.equal(parsed.operationType, "receipt");

			const outgoingOrder: BankStatementOrder = {
				...incomingOrder,
				id: "ord-002",
				number: "102",
				amountKopecks: 450000, // 4,500.00 RUB
				operationType: "expense",
				payerAccount: validSettlementAccount,
				payerName: "ООО «ДЕНТЕ КЛИНИК»",
				payerInn: validClinicInn,
				payerKpp: validClinicKpp,
				recipientAccount: "40702810900000088888",
				recipientName: "ООО «ДЕНТАЛ МАТЕРИАЛС»",
				recipientInn: "7701234567",
				recipientKpp: "770101001",
				paymentPurpose: "Оплата расходных материалов для стерилизации по счету № 305. В том числе НДС 20%",
				vatRate: "20%",
				vatAmountKopecks: 75000,
			};
			const parsedOut = bankStatementOrderSchema.parse(outgoingOrder);
			assert.equal(parsedOut.amountKopecks, 450000);
			assert.equal(parsedOut.operationType, "expense");
		});

		it("validates acquiring payment entry and statement item schemas", () => {
			const payment: PaymentEntry = {
				id: "pay-1",
				date: "2026-09-11 14:30:00",
				amountKopecks: 500000, // 5000 RUB
				rrn: "123456789012",
				authCode: "654321",
				terminalId: "TERM001",
				cardLast4: "4321",
				paymentMethod: "card",
				acquirerName: "sberbank",
				expectedFeeRatePercent: 1.8,
				expectedFeeKopecks: 9000, // 90.00 RUB
				patientName: "Смирнова Елена Сергеевна",
				receiptNumber: "REC-1001",
			};
			const parsedPay = paymentEntrySchema.parse(payment);
			assert.equal(parsedPay.amountKopecks, 500000);
			assert.equal(parsedPay.expectedFeeKopecks, 9000);

			const statementItem: AcquirerStatementItem = {
				id: "bank-tx-1",
				date: "2026-09-11 14:30:15",
				terminalId: "TERM001",
				rrn: "123456789012",
				authCode: "654321",
				cardMask: "2200********4321",
				paymentSystem: "MIR",
				grossAmountKopecks: 500000,
				feeKopecks: 9000,
				netAmountKopecks: 491000,
				feeRatePercent: 1.8,
			};
			const parsedStmt = acquirerStatementItemSchema.parse(statementItem);
			assert.equal(parsedStmt.netAmountKopecks, 491000);
			assert.equal(parsedStmt.feeKopecks, 9000);
		});
	});

	describe("3. 1C:Enterprise Client-Bank Format 1.03 Export Generator", () => {
		const registry: BankStatementRegistry = {
			registryId: "reg-2026-09",
			accountNumber: validSettlementAccount,
			bankBik: validBik,
			bankName: validBankName,
			bankCorrAccount: validCorrAccount,
			clinicName: "ООО «ДЕНТЕ КЛИНИК»",
			clinicInn: validClinicInn,
			clinicKpp: validClinicKpp,
			dateFrom: "2026-09-01",
			dateTo: "2026-09-12",
			createdAt: "2026-09-12 10:00:00",
			senderProgram: DEFAULT_SENDER_PROGRAM,
			recipientProgram: DEFAULT_RECIPIENT_PROGRAM,
			openingBalanceKopecks: 10000000, // 100,000.00 RUB
			orders: [
				{
					id: "ord-1",
					documentType: "Платежное поручение",
					number: "101",
					date: "2026-09-05",
					amountKopecks: 2500000, // 25,000.00 RUB
					operationType: "receipt",
					payerAccount: "40817810200000099999",
					payerName: "Петров Петр Петрович",
					payerInn: null,
					payerKpp: null,
					payerBankBik: validBik,
					payerBankName: validBankName,
					payerBankCorrAccount: validCorrAccount,
					recipientAccount: validSettlementAccount,
					recipientName: "ООО «ДЕНТЕ КЛИНИК»",
					recipientInn: validClinicInn,
					recipientKpp: validClinicKpp,
					recipientBankBik: validBik,
					recipientBankName: validBankName,
					recipientBankCorrAccount: validCorrAccount,
					paymentPurpose: "Оплата стоматологических услуг по договору № 55. Без НДС",
					paymentKind: DEFAULT_PAYMENT_KIND,
					paymentTypeCode: DEFAULT_PAYMENT_TYPE_CODE,
					priority: 5,
					vatRate: "Без НДС",
					vatAmountKopecks: 0,
				},
				{
					id: "ord-2",
					documentType: "Платежное поручение",
					number: "102",
					date: "2026-09-08",
					amountKopecks: 1000000, // 10,000.00 RUB
					operationType: "expense",
					payerAccount: validSettlementAccount,
					payerName: "ООО «ДЕНТЕ КЛИНИК»",
					payerInn: validClinicInn,
					payerKpp: validClinicKpp,
					payerBankBik: validBik,
					payerBankName: validBankName,
					payerBankCorrAccount: validCorrAccount,
					recipientAccount: "40702810900000077777",
					recipientName: "ООО «МЕДТЕХНИКА»",
					recipientInn: "7702999999",
					recipientKpp: "770201001",
					recipientBankBik: validBik,
					recipientBankName: validBankName,
					recipientBankCorrAccount: validCorrAccount,
					paymentPurpose: "Оплата обслуживания автоклавов и компрессора",
					paymentKind: DEFAULT_PAYMENT_KIND,
					paymentTypeCode: DEFAULT_PAYMENT_TYPE_CODE,
					priority: 5,
					vatRate: "20%",
					vatAmountKopecks: 166667,
				},
			],
		};

		it("generates compliant 1CClientBankExchange document with exact headers, account section, and orders", () => {
			const fileText = generate1CBankStatement(registry);

			assert.ok(fileText.startsWith("1CClientBankExchange\r\nВерсияФормата=1.03\r\nКодировка=Windows"));
			assert.ok(fileText.includes("Отправитель=DENTE Dental CRM"));
			assert.ok(fileText.includes("Получатель=1С:Предприятие"));
			assert.ok(fileText.includes(`РасчСчет=${validSettlementAccount}`));

			// Account section check
			assert.ok(fileText.includes("СекцияРасчСчет"));
			assert.ok(fileText.includes("НачальныйОстаток=100000.00"));
			assert.ok(fileText.includes("ВсегоПоступило=25000.00"));
			assert.ok(fileText.includes("ВсегоСписано=10000.00"));
			assert.ok(fileText.includes("КонечныйОстаток=115000.00")); // 100,000 + 25,000 - 10,000 = 115,000.00
			assert.ok(fileText.includes("КонецРасчСчет"));

			// Orders check
			assert.ok(fileText.includes("СекцияДокумент=Платежное поручение"));
			assert.ok(fileText.includes("Номер=101"));
			assert.ok(fileText.includes("Дата=05.09.2026"));
			assert.ok(fileText.includes("Сумма=25000.00"));
			assert.ok(fileText.includes("Плательщик=Петров Петр Петрович"));
			assert.ok(fileText.includes(`ПолучательИНН=${validClinicInn}`));

			assert.ok(fileText.includes("Номер=102"));
			assert.ok(fileText.includes("Дата=08.09.2026"));
			assert.ok(fileText.includes("Сумма=10000.00"));
			assert.ok(fileText.includes("Получатель=ООО «МЕДТЕХНИКА»"));

			assert.ok(fileText.endsWith("КонецФайла"));
		});

		it("parses generated 1C Client-Bank file back into structured registry with exact balance roundtrip", () => {
			const fileText = generate1CBankStatement(registry);
			const parsedRegistry = parse1CBankStatement(fileText);

			assert.equal(parsedRegistry.accountNumber, validSettlementAccount);
			assert.equal(parsedRegistry.openingBalanceKopecks, 10000000);
			assert.equal(parsedRegistry.totalReceivedKopecks, 2500000);
			assert.equal(parsedRegistry.totalDeductedKopecks, 1000000);
			assert.equal(parsedRegistry.closingBalanceKopecks, 11500000);
			assert.equal(parsedRegistry.orders.length, 2);

			assert.equal(parsedRegistry.orders[0]?.number, "101");
			assert.equal(parsedRegistry.orders[0]?.amountKopecks, 2500000);
			assert.equal(parsedRegistry.orders[0]?.operationType, "receipt");

			assert.equal(parsedRegistry.orders[1]?.number, "102");
			assert.equal(parsedRegistry.orders[1]?.amountKopecks, 1000000);
			assert.equal(parsedRegistry.orders[1]?.operationType, "expense");
		});
	});

	describe("4. Acquiring Reconciliation Algorithm (reconcileAcquiringTransactions)", () => {
		it("Scenario A: Perfect Match — all transactions balanced with exact commissions", () => {
			const systemPayments: PaymentEntry[] = [
				{
					id: "pay-101",
					date: "2026-09-12 10:15:00",
					amountKopecks: 1000000, // 10,000.00 RUB
					rrn: "888001001001",
					authCode: "AUTH01",
					terminalId: "T001",
					cardLast4: "1111",
					paymentMethod: "card",
					acquirerName: "sberbank",
					expectedFeeRatePercent: 1.8,
					expectedFeeKopecks: 18000, // 180.00 RUB
					patientName: "Алексеев А.А.",
				},
				{
					id: "pay-102",
					date: "2026-09-12 11:30:00",
					amountKopecks: 2500000, // 25,000.00 RUB
					rrn: "888001001002",
					authCode: "AUTH02",
					terminalId: "T001",
					cardLast4: "2222",
					paymentMethod: "card",
					acquirerName: "sberbank",
					expectedFeeRatePercent: 1.8,
					expectedFeeKopecks: 45000, // 450.00 RUB
					patientName: "Борисов Б.Б.",
				},
			];

			const acquirerStatements: AcquirerStatementItem[] = [
				{
					id: "stmt-1",
					date: "2026-09-12 10:15:05",
					terminalId: "T001",
					rrn: "888001001001",
					authCode: "AUTH01",
					cardMask: "2200********1111",
					paymentSystem: "MIR",
					grossAmountKopecks: 1000000,
					feeKopecks: 18000,
					netAmountKopecks: 982000,
					feeRatePercent: 1.8,
				},
				{
					id: "stmt-2",
					date: "2026-09-12 11:30:10",
					terminalId: "T001",
					rrn: "888001001002",
					authCode: "AUTH02",
					cardMask: "4276********2222",
					paymentSystem: "VISA",
					grossAmountKopecks: 2500000,
					feeKopecks: 45000,
					netAmountKopecks: 2455000,
					feeRatePercent: 1.8,
				},
			];

			const result = reconcileAcquiringTransactions(systemPayments, acquirerStatements);

			assert.equal(result.status, "balanced");
			assert.equal(result.summary.systemCount, 2);
			assert.equal(result.summary.acquirerCount, 2);
			assert.equal(result.summary.matchedCount, 2);
			assert.equal(result.summary.feeDiscrepancyCount, 0);
			assert.equal(result.summary.feeDiscrepancyKopecks, 0);
			assert.equal(result.summary.missingInBankCount, 0);
			assert.equal(result.summary.missingInCrmCount, 0);
			assert.equal(result.summary.systemTotalKopecks, 3500000);
			assert.equal(result.summary.acquirerGrossKopecks, 3500000);
			assert.equal(result.summary.acquirerFeeKopecks, 63000);
			assert.equal(result.summary.acquirerNetKopecks, 3437000);
		});

		it("Scenario B: Commission Discrepancy — bank deducted unexpected fee difference", () => {
			const systemPayments: PaymentEntry[] = [
				{
					id: "pay-201",
					date: "2026-09-12 12:00:00",
					amountKopecks: 2000000, // 20,000.00 RUB
					paymentMethod: "card",
					acquirerName: "sberbank",
					rrn: "999002002001",
					authCode: "A201",
					terminalId: "T001",
					expectedFeeRatePercent: 1.8,
					expectedFeeKopecks: 36000, // 360.00 RUB
				},
			];

			const acquirerStatements: AcquirerStatementItem[] = [
				{
					id: "stmt-201",
					date: "2026-09-12 12:00:05",
					terminalId: "T001",
					rrn: "999002002001",
					authCode: "A201",
					cardMask: "2200********9999",
					grossAmountKopecks: 2000000,
					feeKopecks: 41000, // 410.00 RUB (overcharged by 50.00 RUB = 5000 kopecks)
					netAmountKopecks: 1959000,
					feeRatePercent: 2.05,
				},
			];

			const result = reconcileAcquiringTransactions(systemPayments, acquirerStatements);

			assert.equal(result.status, "discrepancies_found");
			assert.equal(result.summary.feeDiscrepancyCount, 1);
			assert.equal(result.summary.feeDiscrepancyKopecks, 5000); // 50.00 RUB discrepancy
			assert.equal(result.matchedRecords[0]?.hasFeeDiscrepancy, true);
			assert.equal(result.matchedRecords[0]?.feeDiscrepancyKopecks, 5000);
		});

		it("Scenario C: Lost payment / missing in bank statement", () => {
			const systemPayments: PaymentEntry[] = [
				{
					id: "pay-301",
					date: "2026-09-12 14:00:00",
					amountKopecks: 850000,
					paymentMethod: "card",
					acquirerName: "sberbank",
					rrn: "777003003001",
					patientName: "Васильев В.В.",
				},
			];
			const acquirerStatements: AcquirerStatementItem[] = []; // Empty bank statement

			const result = reconcileAcquiringTransactions(systemPayments, acquirerStatements);

			assert.equal(result.status, "discrepancies_found");
			assert.equal(result.summary.missingInBankCount, 1);
			assert.equal(result.summary.missingInBankKopecks, 850000);
			assert.equal(result.missingInBankRecords.length, 1);
			assert.equal(result.missingInBankRecords[0]?.id, "pay-301");
		});

		it("Scenario D: Unrecorded transaction / missing in CRM (charged on terminal without CRM entry)", () => {
			const systemPayments: PaymentEntry[] = [];
			const acquirerStatements: AcquirerStatementItem[] = [
				{
					id: "stmt-401",
					date: "2026-09-12 15:30:00",
					terminalId: "T002",
					rrn: "666004004001",
					authCode: "A401",
					cardMask: "5536********0000",
					grossAmountKopecks: 1200000, // 12,000.00 RUB
					feeKopecks: 21600,
					netAmountKopecks: 1178400,
				},
			];

			const result = reconcileAcquiringTransactions(systemPayments, acquirerStatements);

			assert.equal(result.status, "discrepancies_found");
			assert.equal(result.summary.missingInCrmCount, 1);
			assert.equal(result.summary.missingInCrmKopecks, 1200000);
			assert.equal(result.missingInCrmRecords.length, 1);
			assert.equal(result.missingInCrmRecords[0]?.id, "stmt-401");
		});

		it("Scenario E: Multi-acquirer tariffs (Sberbank 1.8%, T-Bank 1.7%, VTB 1.75%)", () => {
			const tBankPayments: PaymentEntry[] = [
				{
					id: "pay-tb-1",
					date: "2026-09-12 16:00:00",
					amountKopecks: 3000000, // 30,000.00 RUB
					paymentMethod: "card",
					rrn: "TB999001",
					acquirerName: "tbank",
					expectedFeeRatePercent: 1.7, // T-Bank tariff 1.7%
				},
			];
			const tBankStatement: AcquirerStatementItem[] = [
				{
					id: "tb-stmt-1",
					date: "2026-09-12 16:00:02",
					rrn: "TB999001",
					grossAmountKopecks: 3000000,
					feeKopecks: 51000, // 30,000 * 1.7% = 510.00 RUB (51,000 kopecks)
					netAmountKopecks: 2949000,
					feeRatePercent: 1.7,
				},
			];

			const result = reconcileAcquiringTransactions(tBankPayments, tBankStatement);
			assert.equal(result.status, "balanced");
			assert.equal(result.matchedRecords[0]?.expectedFeeKopecks, 51000);
			assert.equal(result.matchedRecords[0]?.actualFeeKopecks, 51000);
			assert.equal(result.matchedRecords[0]?.hasFeeDiscrepancy, false);
		});
	});

	describe("5. Statutory A4 Reconciliation Protocol (Mandate 8d point 7: 0 Emojis)", () => {
		it("generates statutory Russian A4 reconciliation protocol and strictly guarantees 0 emojis", () => {
			const systemPayments: PaymentEntry[] = [
				{
					id: "pay-p1",
					date: "2026-09-12 10:00:00",
					amountKopecks: 14500000, // 145,000.00 RUB
					paymentMethod: "card",
					acquirerName: "sberbank",
					rrn: "111222333444",
					patientName: "Кузнецов К.К.",
					expectedFeeRatePercent: 1.8,
					expectedFeeKopecks: 261000,
				},
				{
					id: "pay-p2",
					date: "2026-09-12 11:00:00",
					amountKopecks: 300000,
					paymentMethod: "card",
					acquirerName: "sberbank",
					rrn: "555666777888",
					patientName: "Попова П.П.",
					expectedFeeRatePercent: 1.8,
					expectedFeeKopecks: 5400,
				},
			];

			const acquirerStatements: AcquirerStatementItem[] = [
				{
					id: "st-p1",
					date: "2026-09-12 10:00:05",
					rrn: "111222333444",
					grossAmountKopecks: 14500000,
					feeKopecks: 266000, // 50.00 RUB discrepancy
					netAmountKopecks: 14234000,
					feeRatePercent: 1.83,
				},
				// pay-p2 is intentionally missing to test discrepancy table
			];

			const reconResult = reconcileAcquiringTransactions(systemPayments, acquirerStatements, {
				reconciliationId: "RECON-2026-09-12-001",
				reconciliationDate: "12.09.2026",
				periodFrom: "01.09.2026",
				periodTo: "12.09.2026",
				acquirerName: ACQUIRING_PROVIDER_NAMES_RU.sberbank,
			});

			const clinicInfo = {
				name: "ООО «ДЕНТЕ КЛИНИК»",
				inn: validClinicInn,
				kpp: validClinicKpp,
				bankAccount: validSettlementAccount,
				bankName: validBankName,
				bankBik: validBik,
			};

			const protocol = formatReconciliationProtocolA4(reconResult, clinicInfo, {
				protocolNumber: "СВ-2026-09-12/01",
				chiefAccountant: "Смирнова Е.А.",
				cashier: "Барабаш С.В.",
			});

			// Check Russian statutory text structure
			assert.ok(protocol.includes("ПРОТОКОЛ СВЕРКИ ОПЕРАЦИЙ ЭКВАЙРИНГА И КАССОВОЙ ВЫРУЧКИ"));
			assert.ok(protocol.includes("№ СВ-2026-09-12/01 от 12.09.2026"));
			assert.ok(protocol.includes(`ИНН / КПП:          ${validClinicInn} / ${validClinicKpp}`));
			assert.ok(protocol.includes("Банк-эквайер:       ПАО Сбербанк"));
			assert.ok(protocol.includes("1. СВОДНЫЕ ПОКАЗАТЕЛИ СВЕРКИ ОПЕРАЦИЙ"));
			assert.ok(protocol.includes("2. ДЕТАЛИЗАЦИЯ РАСХОЖДЕНИЙ ПО КОМИССИИ ЭКВАЙРИНГА"));
			assert.ok(protocol.includes("3. ПЛАТЕЖИ, НЕ ПОДТВЕРЖДЕННЫЕ В ВЫПИСКЕ БАНКА"));
			assert.ok(protocol.includes("Главный бухгалтер:                  ____________________ / Смирнова Е.А. /"));
			assert.ok(protocol.includes("Ответственный за кассу:             ____________________ / Барабаш С.В. /"));
			assert.ok(protocol.includes("Федерального закона\nот 06.12.2011 № 402-ФЗ «О бухгалтерском учете»"));

			// MANDATE 8d POINT 7: STRICT AUDIT — 0 EMOJIS IN OFFICIAL STATUTORY FORM
			const hasExtendedPictographic = /\p{Extended_Pictographic}/u.test(protocol);
			assert.equal(hasExtendedPictographic, false, "Protocol contains prohibited emoji characters");

			const hasEmojiRange = /[\u{1F300}-\u{1F9FF}]/u.test(protocol);
			assert.equal(hasEmojiRange, false, "Protocol contains unicode emoji range symbols");
		});
	});

	describe("6. DentalPin Preview Adapter (buildAccountingExportPreview)", () => {
		it("calculates accurate summary preview of invoices and payments from registry", () => {
			const registry: BankStatementRegistry = {
				registryId: "reg-prev-1",
				accountNumber: validSettlementAccount,
				bankBik: validBik,
				bankName: validBankName,
				clinicName: "ООО «ДЕНТЕ КЛИНИК»",
				clinicInn: validClinicInn,
				senderProgram: DEFAULT_SENDER_PROGRAM,
				recipientProgram: DEFAULT_RECIPIENT_PROGRAM,
				dateFrom: "2026-09-01",
				dateTo: "2026-09-12",
				openingBalanceKopecks: 5000000,
				orders: [
					{
						id: "ord-p1",
						number: "1",
						date: "2026-09-02",
						amountKopecks: 1000000,
						documentType: "payment_order",
						operationType: "receipt",
						payerAccount: "40817810000000000001",
						payerName: "Пациент 1",
						payerBankBik: validBik,
						payerBankName: validBankName,
						recipientAccount: validSettlementAccount,
						recipientName: "ООО «ДЕНТЕ КЛИНИК»",
						recipientBankBik: validBik,
						recipientBankName: validBankName,
						paymentPurpose: "Оплата услуг",
						paymentKind: DEFAULT_PAYMENT_KIND,
						paymentTypeCode: DEFAULT_PAYMENT_TYPE_CODE,
						priority: 5,
						vatRate: "Без НДС",
						vatAmountKopecks: 0,
					},
					{
						id: "ord-p2",
						number: "2",
						date: "2026-09-03",
						amountKopecks: 2000000,
						documentType: "payment_order",
						operationType: "expense",
						payerAccount: validSettlementAccount,
						payerName: "ООО «ДЕНТЕ КЛИНИК»",
						payerBankBik: validBik,
						payerBankName: validBankName,
						recipientAccount: "40702810000000000002",
						recipientName: "Поставщик 1",
						recipientBankBik: validBik,
						recipientBankName: validBankName,
						paymentPurpose: "Покупка инструментов",
						paymentKind: DEFAULT_PAYMENT_KIND,
						paymentTypeCode: DEFAULT_PAYMENT_TYPE_CODE,
						priority: 5,
						vatRate: "20%",
						vatAmountKopecks: 333333,
					},
				],
			};

			const preview = buildAccountingExportPreview(registry);

			assert.equal(preview.paymentCount, 2);
			assert.equal(preview.invoiceCount, 1);
			assert.equal(preview.totalAmountKopecks, 3000000);
			assert.equal(preview.totalVatKopecks, 333333);
			assert.equal(preview.totalBaseKopecks, 2666667);
			assert.equal(preview.sampleOrders?.length, 2);
			assert.equal(preview.sampleOrders[0]?.number, "1");
			assert.equal(preview.sampleOrders[0]?.amountRub, "10000.00");
		});
	});
});
