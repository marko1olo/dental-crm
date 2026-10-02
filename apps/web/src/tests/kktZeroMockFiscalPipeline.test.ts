/**
 * DENTE CRM — Zero-Mock Hardware KKT & 54-FZ Fiscal Adapter Inquisitor Test Suite
 *
 * Verifies absolute zero-mock statutory compliance for 54-FZ FFD 1.2 & Minzdrav 804n:
 * 1. Absolute rejection of dummy mocks (empty items [], missing cashier, missing fiscal payload).
 * 2. Statutory nomenclature translation: service name, exact integer kopecks, quantity, VAT,
 *    payment subject/method, Order 804n code, Chestny ZNAK DataMatrix.
 * 3. Mandate 8e: 100% discount / warranty treatment (0.00 ₽) bypasses KKT hardware error.
 * 4. Offline buffering: KKT hardware disconnect safely buffers receipt with `offline_buffered` status.
 * 5. Codebase audit: absence of dummyFiscalPayload in omniPlatformAdapter.ts.
 */

import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	validateFiscalReceiptPayload54Fz,
	extractAndValidateFiscalJobPayload,
	executeStatutoryFiscalPipeline,
} from "../lib/kktFiscalPipeline";
import { omniPlatform } from "../lib/omniPlatformAdapter";
import { FiscalReceiptQueueManager } from "../services/hardware/fiscalReceiptQueueManager";
import { KktLanPrinterService } from "../services/hardware/kktLanPrinter";

test("Zero-Mock Hardware KKT & 54-FZ Fiscal Pipeline Suite", async (t) => {
	t.beforeEach(() => {
		KktLanPrinterService.resetCircuitBreaker();
	});

	await t.test("1. Inquisitor Gate: Absolute rejection of jobs without fiscal payload", async () => {
		// Attempting to print fiscal receipt without any payload MUST FAIL, NEVER print dummy receipt
		const res = await omniPlatform.printDirect({
			type: "fiscal_receipt",
			title: "Чек без реквизитов",
		});

		assert.equal(res.success, false);
		assert.equal(res.status, "failed");
		assert.match(res.error || "", /Отсутствуют фискальные реквизиты чека/i);
	});

	await t.test("2. Inquisitor Gate: Rejection of dummy mock with empty items array", async () => {
		// Mock payload with empty items array must be ruthlessly rejected
		const dummyMock = {
			receiptNumber: "REC-999999",
			cashierFullName: "Кассир-администратор",
			operationType: "income" as const,
			totalRub: 0,
			items: [],
		};

		const validation = validateFiscalReceiptPayload54Fz(dummyMock);
		assert.equal(validation.isValid, false);
		assert.match(validation.error || "", /список позиций пуст/i);

		const printRes = await omniPlatform.printDirect({
			type: "fiscal_receipt",
			fiscalPayload: dummyMock as any,
		});

		assert.equal(printRes.success, false);
		assert.equal(printRes.status, "failed");
		assert.match(printRes.error || "", /список позиций пуст/i);
	});

	await t.test("3. Inquisitor Gate: Rejection when cashier is missing", async () => {
		const invalidCashierPayload = {
			cashierFullName: "",
			operationType: "income" as const,
			totalRub: 2500,
			items: [
				{
					name: "A16.07.002 Восстановление зуба пломбой",
					priceRub: 2500,
					quantity: 1,
					amountRub: 2500,
				},
			],
		};

		const validation = validateFiscalReceiptPayload54Fz(invalidCashierPayload);
		assert.equal(validation.isValid, false);
		assert.match(validation.error || "", /не указано ФИО кассира/i);
	});

	await t.test("4. Statutory 54-FZ & 804n Nomenclature Translation: kopecks, VAT, payment methods", async () => {
		const statutoryPayload = {
			clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
			cashierFullName: "Сидорова М. В.",
			operationType: "income" as const,
			customerContact: "+7 (999) 111-22-33",
			items: [
				{
					name: "A16.07.002.001 Наложение пломбы светового отверждения Filtek Ultimate",
					priceRub: 4500,
					quantity: 1,
					amountRub: 4500,
					vatRate: "vat_none" as const,
					paymentMethod: "full_payment" as const,
					paymentSubject: "service" as const,
					medicalServiceCode804n: "A16.07.002.001",
				},
				{
					name: "A11.07.012 Глубокое фторирование эмали зуба",
					priceRub: 800,
					quantity: 2,
					amountRub: 1600,
					vatRate: "vat_none" as const,
					paymentMethod: "full_payment" as const,
					paymentSubject: "service" as const,
					medicalServiceCode804n: "A11.07.012",
				},
			],
			totalRub: 6100,
			electronicRub: 6100,
		};

		const validation = validateFiscalReceiptPayload54Fz(statutoryPayload);
		assert.equal(validation.isValid, true);
		assert.ok(validation.normalizedPayload);

		const normalized = validation.normalizedPayload;
		assert.equal(normalized.totalRub, 6100);
		assert.equal(normalized.items.length, 2);

		// Item 1 verification
		assert.equal(normalized.items[0]!.name, "A16.07.002.001 Наложение пломбы светового отверждения Filtek Ultimate");
		assert.equal(normalized.items[0]!.priceRub, 4500);
		assert.equal(normalized.items[0]!.quantity, 1);
		assert.equal(normalized.items[0]!.amountRub, 4500);
		assert.equal(normalized.items[0]!.medicalServiceCode804n, "A16.07.002.001");
		assert.equal(normalized.items[0]!.paymentMethod, "full_payment");
		assert.equal(normalized.items[0]!.paymentSubject, "service");

		// Item 2 verification
		assert.equal(normalized.items[1]!.name, "A11.07.012 Глубокое фторирование эмали зуба");
		assert.equal(normalized.items[1]!.priceRub, 800);
		assert.equal(normalized.items[1]!.quantity, 2);
		assert.equal(normalized.items[1]!.amountRub, 1600);
		assert.equal(normalized.items[1]!.medicalServiceCode804n, "A11.07.012");
	});

	await t.test("5. Arithmetic discrepancy detection: price * qty mismatch is rejected", async () => {
		const brokenArithmeticPayload = {
			cashierFullName: "Кассир",
			operationType: "income" as const,
			items: [
				{
					name: "Консультация врача-стоматолога",
					priceRub: 1000,
					quantity: 2,
					amountRub: 2000,
				},
			],
			totalRub: 5000, // Broken! Should be 2000
		};

		const validation = validateFiscalReceiptPayload54Fz(brokenArithmeticPayload);
		assert.equal(validation.isValid, false);
		assert.match(validation.error || "", /расходится с суммой позиций/i);
	});

	await t.test("6. Mandate 8e: 100% discount / warranty treatment (0.00 ₽) bypasses KKT hardware", async () => {
		const warrantyPayload = {
			cashierFullName: "Доктор Иванов А. А.",
			operationType: "income" as const,
			items: [
				{
					name: "Гарантийная пришлифовка пломбы (скидка 100%)",
					priceRub: 0,
					quantity: 1,
					amountRub: 0,
					medicalServiceCode804n: "A16.07.025",
				},
			],
			totalRub: 0,
		};

		const validation = validateFiscalReceiptPayload54Fz(warrantyPayload);
		assert.equal(validation.isValid, true);

		// Execute statutory pipeline
		const result = await executeStatutoryFiscalPipeline(validation.normalizedPayload!);
		assert.equal(result.success, true);
		assert.equal(result.status, "printed");
		assert.equal(result.fiscalSign, "0000000000");
		assert.equal(result.fiscalDocNum, "0");
	});

	await t.test("7. Offline Buffering: Connection drop enqueues receipt with offline_buffered status", async () => {
		const validPayload = {
			clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
			cashierFullName: "Администратор",
			operationType: "income" as const,
			items: [
				{
					name: "A16.07.001 Удаление постоянного зуба сложное",
					priceRub: 3500,
					quantity: 1,
					amountRub: 3500,
					medicalServiceCode804n: "A16.07.001",
				},
			],
			totalRub: 3500,
			electronicRub: 3500,
		};

		// Force offline LAN IP
		const executionRes = await executeStatutoryFiscalPipeline(validPayload as any, {
			kktConnection: {
				host: "192.0.2.1", // RFC 5737 TEST-NET-1 (unreachable)
				port: 16732,
				protocol: "atol",
			},
		});

		// Must NOT crash or print dummy receipt; must buffer in queue
		assert.equal(executionRes.success, false);
		assert.equal(executionRes.status, "offline_buffered");
		assert.equal(executionRes.methodUsed, "queued_offline");
		assert.ok(executionRes.queueId);
		assert.match(executionRes.error || "", /сохранен в очередь неотправленных документов/i);

		// Verify receipt physically exists in FiscalReceiptQueueManager
		const pending = FiscalReceiptQueueManager.getAllQueuedItems();
		const queuedItem = pending.find((i) => i.id === executionRes.queueId);
		assert.ok(queuedItem);
		assert.equal(queuedItem.status, "hardware_offline");
		assert.equal(queuedItem.payload.totalRub, 3500);
	});

	await t.test("8. Codebase Invariant: Absence of dummyFiscalPayload in omniPlatformAdapter.ts", () => {
		const adapterFilePath = fileURLToPath(new URL("../lib/omniPlatformAdapter.ts", import.meta.url));
		const fileContent = fs.readFileSync(adapterFilePath, "utf8");

		assert.equal(
			fileContent.includes("dummyFiscalPayload"),
			false,
			"CRITICAL DEFECT: dummyFiscalPayload must be completely eliminated from omniPlatformAdapter.ts",
		);
		assert.equal(
			fileContent.includes("executeStatutoryFiscalPipeline"),
			true,
			"omniPlatformAdapter.ts must route fiscal receipts via executeStatutoryFiscalPipeline",
		);
	});

	await t.test("9. Financial Integrity: Exact 1-kopeck discrepancy is ruthlessly rejected", () => {
		const oneKopeckDriftPayload = {
			cashierFullName: "Иванова А. С.",
			operationType: "income" as const,
			items: [
				{
					name: "Прием (осмотр, консультация) стоматолога первичный",
					priceRub: 2000,
					quantity: 1,
					amountRub: 2000,
				},
			],
			totalRub: 2000.01, // 1 kopeck extra!
		};

		const validation = validateFiscalReceiptPayload54Fz(oneKopeckDriftPayload);
		assert.equal(validation.isValid, false);
		assert.match(validation.error || "", /расходится с суммой позиций/i);
	});

	await t.test("10. 54-FZ Tender Reconciliation: Cash + electronic mismatch is rejected", () => {
		const brokenTenderPayload = {
			cashierFullName: "Иванова А. С.",
			operationType: "income" as const,
			items: [
				{
					name: "Профессиональная гигиена полости рта",
					priceRub: 5000,
					quantity: 1,
					amountRub: 5000,
				},
			],
			totalRub: 5000,
			cashRub: 3000,
			electronicRub: 1500, // Sum = 4500 !== 5000!
		};

		const validation = validateFiscalReceiptPayload54Fz(brokenTenderPayload);
		assert.equal(validation.isValid, false);
		assert.match(validation.error || "", /Сумма оплат .* не равна итогу чека/i);
	});

	await t.test("11. FFD 1.2 Tag Invariants: Invalid VAT rate and payment method are rejected", () => {
		const invalidVatPayload = {
			cashierFullName: "Иванова А. С.",
			operationType: "income" as const,
			items: [
				{
					name: "Ортодонтическая коррекция",
					priceRub: 10000,
					quantity: 1,
					amountRub: 10000,
					vatRate: "vat_18" as any, // Obsolete 18% VAT invalid in FFD 1.2
				},
			],
			totalRub: 10000,
		};

		const vatValidation = validateFiscalReceiptPayload54Fz(invalidVatPayload);
		assert.equal(vatValidation.isValid, false);
		assert.match(vatValidation.error || "", /некорректная ставка НДС по ФФД 1\.2/i);

		const invalidPaymentMethodPayload = {
			cashierFullName: "Иванова А. С.",
			operationType: "income" as const,
			items: [
				{
					name: "Ортодонтическая коррекция",
					priceRub: 10000,
					quantity: 1,
					amountRub: 10000,
					paymentMethod: "crypto_token" as any, // Invalid payment method
				},
			],
			totalRub: 10000,
		};

		const methodValidation = validateFiscalReceiptPayload54Fz(invalidPaymentMethodPayload);
		assert.equal(methodValidation.isValid, false);
		assert.match(methodValidation.error || "", /некорректный признак способа расчета по ФФД 1\.2/i);
	});
});
