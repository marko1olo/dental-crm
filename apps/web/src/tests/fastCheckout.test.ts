import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
	validateCheckoutSplit,
	generate54FzFiscalPayload,
	validateBuyerInn,
	applyQuickCheckoutPreset,
} from "../components/payments/checkout/fastCheckoutEngine.js";
import { KktLanPrinterService } from "../services/hardware/kktLanPrinter.js";
import { FiscalReceiptQueueManager } from "../services/hardware/fiscalReceiptQueueManager.js";

describe("1-Click Fast Checkout & 54-FZ Split Engine", () => {
	it("should validate 100% SBP QR payment", () => {
		const res = validateCheckoutSplit({
			orderId: "CHK-001",
			totalBillKop: 1960000,
			payments: [{ method: "sbp_qr", amountKop: 1960000 }],
		});
		assert.equal(res.isValid, true);
		assert.equal(res.totalPaidKop, 1960000);
		assert.equal(res.remainingDueKop, 0);
	});

	it("should validate split payment: 50% deposit + 50% card", () => {
		const res = validateCheckoutSplit({
			orderId: "CHK-002",
			totalBillKop: 1000000,
			payments: [
				{ method: "patient_deposit", amountKop: 500000 },
				{ method: "bank_card", amountKop: 500000 },
			],
		});
		assert.equal(res.isValid, true);
		assert.equal(res.remainingDueKop, 0);
	});

	it("should calculate cash change correctly", () => {
		const res = validateCheckoutSplit({
			orderId: "CHK-003",
			totalBillKop: 380000,
			payments: [{ method: "cash", amountKop: 380000 }],
			cashTenderedKop: 500000,
		});
		assert.equal(res.isValid, true);
		assert.equal(res.cashChangeDueKop, 120000);
	});

	it("should generate 54-FZ FFD 1.2 payload with correct tags", () => {
		const payload = generate54FzFiscalPayload({
			orderId: "CHK-004",
			totalBillKop: 1000000,
			payments: [
				{ method: "cash", amountKop: 400000 },
				{ method: "bank_card", amountKop: 600000 },
			],
			patientPhone: "+79991234567",
		});
		assert.equal(payload.ffdVersion, "1.2");
		assert.equal(payload.totalSumKop, 1000000);
		assert.equal(payload.paymentsDistribution.cashKop, 400000);
		assert.equal(payload.paymentsDistribution.electronicKop, 600000);
		assert.equal(payload.clientContact, "+79991234567");
	});
});

describe("Doctor Autonomy & Warranty Reception (0.00 ₽) — Mandates 8e, 8p", () => {
	it("validates 0.00 ₽ warranty visit as immediately valid with zero payments", () => {
		const res = validateCheckoutSplit({
			orderId: "CHK-WARRANTY-001",
			totalBillKop: 0,
			payments: [],
		});
		assert.equal(res.isValid, true);
		assert.equal(res.totalPaidKop, 0);
		assert.equal(res.remainingDueKop, 0);
		assert.equal(res.cashChangeDueKop, 0);
	});

	it("applies warranty_100 quick preset resetting payments to empty array", () => {
		const preset = applyQuickCheckoutPreset({
			totalBillKop: 1500000,
			preset: "warranty_100",
		});
		assert.deepEqual(preset.payments, []);
		assert.equal(preset.cashTenderedKop, 0);
		assert.equal(preset.activeMethod, "bank_card");
	});

	it("intercepts 0.00 ₽ in KktLanPrinterService and returns success without hardware error", async () => {
		const result = await KktLanPrinterService.printReceipt({
			operationType: "income",
			customerContact: "+79991112233",
			cashierFullName: "Д-р Смирнов А.В.",
			totalRub: 0,
			items: [],
			cashRub: 0,
			electronicRub: 0,
			prepaidRub: 0,
			taxationSystem: "usn_income",
		});

		assert.equal(result.success, true);
		assert.equal(result.fiscalSign, "0000000000");
		assert.equal(result.fiscalDocNum, "0");
	});

	it("immediately marks 0.00 ₽ receipts as printed in FiscalReceiptQueueManager without queuing to KKT", () => {
		const item = FiscalReceiptQueueManager.enqueueReceipt({
			operationType: "income",
			customerContact: "+79991112233",
			cashierFullName: "Д-р Смирнов А.В.",
			totalRub: 0,
			items: [],
			cashRub: 0,
			electronicRub: 0,
			prepaidRub: 0,
			taxationSystem: "usn_income",
		});

		assert.equal(item.status, "printed");
		assert.equal(item.payload.totalRub, 0);
	});
});

describe("Payer Type & INN Optionality (Mandate 8e: 0 Friction for Patients)", () => {
	it("physical person: empty or undefined INN is 100% valid and never blocks checkout", () => {
		const emptyRes = validateBuyerInn({ clientType: "physical_person", buyerInn: "" });
		assert.equal(emptyRes.isValid, true);
		assert.equal(emptyRes.isRequired, false);
		assert.equal(emptyRes.errorRu, undefined);

		const undefRes = validateBuyerInn({ clientType: "physical_person", buyerInn: undefined });
		assert.equal(undefRes.isValid, true);
		assert.equal(undefRes.isRequired, false);
		assert.equal(undefRes.errorRu, undefined);
	});

	it("physical person: voluntary 12-digit INN is valid and accepted", () => {
		const res = validateBuyerInn({
			clientType: "physical_person",
			buyerInn: "770123456789",
		});
		assert.equal(res.isValid, true);
		assert.equal(res.isRequired, false);
		assert.equal(res.errorRu, undefined);
	});

	it("physical person: non-standard INN length does NOT block cashier (isValid remains true)", () => {
		const res = validateBuyerInn({
			clientType: "physical_person",
			buyerInn: "12345",
		});
		// Crucial Mandate 8e invariant: cashier is never blocked on physical persons!
		assert.equal(res.isValid, true);
		assert.equal(res.isRequired, false);
		assert.match(res.errorRu ?? "", /не блокирует оплату/);
	});

	it("legal entity: requires exactly 10 digits and reports clear error if empty or wrong length", () => {
		const emptyRes = validateBuyerInn({ clientType: "legal_entity", buyerInn: "" });
		assert.equal(emptyRes.isValid, false);
		assert.equal(emptyRes.isRequired, true);

		const wrongRes = validateBuyerInn({ clientType: "legal_entity", buyerInn: "123456789" });
		assert.equal(wrongRes.isValid, false);
		assert.match(wrongRes.errorRu ?? "", /ровно 10 цифр/);

		const validRes = validateBuyerInn({ clientType: "legal_entity", buyerInn: "7701234567" });
		assert.equal(validRes.isValid, true);
		assert.equal(validRes.isRequired, true);
	});

	it("individual entrepreneur (IP): requires exactly 12 digits", () => {
		const wrongRes = validateBuyerInn({ clientType: "individual_entrepreneur", buyerInn: "7701234567" });
		assert.equal(wrongRes.isValid, false);
		assert.match(wrongRes.errorRu ?? "", /ровно 12 цифр/);

		const validRes = validateBuyerInn({ clientType: "individual_entrepreneur", buyerInn: "770123456789" });
		assert.equal(validRes.isValid, true);
		assert.equal(validRes.isRequired, true);
	});
});

describe("Autonomous Offline Terminal Checkout Buffer (Mandates 8e, 8n)", () => {
	beforeEach(() => {
		FiscalReceiptQueueManager.clearQueue();
	});

	it("enqueues receipt in offline queue with status pending and human Russian reason", () => {
		const queuedItem = FiscalReceiptQueueManager.enqueueOfflineFallback({
			operationType: "income",
			customerContact: "+79998887766",
			cashierFullName: "Кассир Петрова",
			totalRub: 3500,
			items: [
				{
					name: "Лечение пульпита",
					priceRub: 3500,
					quantity: 1,
					amountRub: 3500,
					paymentMethod: "full_payment",
					paymentSubject: "service",
				},
			],
			cashRub: 0,
			electronicRub: 3500,
			prepaidRub: 0,
			taxationSystem: "usn_income",
		});

		assert.equal(queuedItem.status, "hardware_offline");
		assert.match(queuedItem.lastError ?? "", /автономный терминал/);
		assert.equal(FiscalReceiptQueueManager.getPendingItems().length, 1);

		const pendingItems = FiscalReceiptQueueManager.getPendingItems();
		assert.equal(pendingItems.length, 1);
		assert.equal(pendingItems[0]?.payload.totalRub, 3500);
	});

	it("generates 54-FZ payload with offlineBuffered option without error", () => {
		const payload = generate54FzFiscalPayload(
			{
				orderId: "CHK-OFFLINE-001",
				totalBillKop: 500000,
				payments: [{ method: "bank_card", amountKop: 500000 }],
			},
			{
				offlineBuffered: true,
			}
		);

		assert.equal(payload.totalSumKop, 500000);
		assert.equal(payload.paymentsDistribution.electronicKop, 500000);
	});
});
