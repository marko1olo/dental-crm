/**
 * apps/web/src/tests/sberbankTerminal.test.ts
 *
 * Comprehensive Unit Test Suite for Sberbank POS Terminal, SberPay QR,
 * FacePay Biometry, CP866 Bank Slips, and Reversal / Double-Charge Protection.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	kopecksToSberAmount,
	getPilotNtCommandCode,
	buildPilotNtCommandPacket,
	buildDualConnectorCommand,
	buildSmartPosPacket,
	detectCardSystem,
	formatSberBankSlip,
	formatSberSettlementSlip,
	isValidRrn,
	isValidAuthCode,
	generateSberPayQrPayload,
	type SberPosTerminalConfig,
	type SberPosTransactionRequest,
	type SberSettlementTotals,
} from "@dental/shared";
import { SberbankTerminalService } from "../services/hardware/sberbankTerminal.js";
import { hardwarePrinter } from "../services/hardware/HardwarePrinter.js";

const TEST_CONFIG: SberPosTerminalConfig = {
	terminalId: "19827340",
	merchantId: "981273948192031",
	hostIp: "127.0.0.1",
	hostPort: 4000,
	protocol: "pilot_nt",
	hardwareModel: "sber_smartpos",
	timeoutMs: 30000,
	retryCount: 2,
	clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	clinicAddress: "г. Москва, Ломоносовский пр-т, 24",
	clinicInn: "7701234567",
};

describe("Sberbank POS Terminal & SberPay Math & Protocols", () => {
	it("should enforce exact positive integer amount in kopecks (zero double manual entry)", () => {
		assert.equal(kopecksToSberAmount(150000), 150000);
		assert.equal(kopecksToSberAmount(1), 1);
		assert.equal(kopecksToSberAmount(4999.4), 4999);
		assert.equal(kopecksToSberAmount(4999.6), 5000);

		assert.throws(() => kopecksToSberAmount(0), /положительным целым числом/);
		assert.throws(() => kopecksToSberAmount(-500), /положительным целым числом/);
		assert.throws(() => kopecksToSberAmount(Number.NaN), /положительным целым числом/);
	});

	it("should correctly map Pilot-NT operation command codes", () => {
		assert.equal(getPilotNtCommandCode("sale"), 1);
		assert.equal(getPilotNtCommandCode("refund"), 3);
		assert.equal(getPilotNtCommandCode("void"), 4);
		assert.equal(getPilotNtCommandCode("settlement"), 7);
		assert.equal(getPilotNtCommandCode("sberpay_qr"), 11);
		assert.equal(getPilotNtCommandCode("biometry_facepay"), 13);
		assert.equal(getPilotNtCommandCode("reconciliation_rrn"), 9);
	});

	it("should construct valid Pilot-NT ASCII packet", () => {
		const req: SberPosTransactionRequest = {
			operation: "sale",
			amountKop: 245000,
			orderId: "ORDER-7712",
			originalRrn: "123456789012",
			originalAuthCode: "AB1234",
		};
		const packet = buildPilotNtCommandPacket(TEST_CONFIG, req);
		assert.equal(packet, "1,245000,123456789012,AB1234,643,ORDER-7712,19827340,981273948192031");
	});

	it("should construct valid DualConnector JSON structure", () => {
		const req: SberPosTransactionRequest = {
			operation: "sberpay_qr",
			amountKop: 120000,
			orderId: "QR-9901",
		};
		const command = buildDualConnectorCommand(TEST_CONFIG, req);
		assert.equal(command.action, "sberpay_qr");
		assert.equal(command.amount, 120000);
		assert.equal(command.terminalId, "19827340");
		assert.equal(command.merchantId, "981273948192031");
	});

	it("should construct valid SmartPOS REST payload", () => {
		const req: SberPosTransactionRequest = {
			operation: "biometry_facepay",
			amountKop: 890000,
			orderId: "FACE-101",
			patientName: "Иванов И.И.",
		};
		const packet = buildSmartPosPacket(TEST_CONFIG, req) as {
			protocolVersion: string;
			transaction: { type: string; amountKopecks: number; orderId: string };
		};
		assert.equal(packet.protocolVersion, "2.1");
		assert.equal(packet.transaction.type, "biometry_facepay");
		assert.equal(packet.transaction.amountKopecks, 890000);
		assert.equal(packet.transaction.orderId, "FACE-101");
	});

	it("should accurately detect card payment systems and issuers", () => {
		assert.equal(detectCardSystem("2200123456781234", ""), "МИР");
		assert.equal(detectCardSystem("2204999988887777", ""), "МИР");
		assert.equal(detectCardSystem("4111222233334444", ""), "Visa");
		assert.equal(detectCardSystem("5536912345678901", ""), "MasterCard");
		assert.equal(detectCardSystem("6212345678901234", ""), "UnionPay");
		assert.equal(detectCardSystem("SBER_PAY_TOKEN", "SBERPAY_EMV"), "SberPay");
	});

	it("should validate RRN (12 chars) and AuthCode (6 chars)", () => {
		assert.equal(isValidRrn("123456789012"), true);
		assert.equal(isValidRrn("A2345678901Z"), true);
		assert.equal(isValidRrn("12345"), false);
		assert.equal(isValidRrn("1234567890123"), false);

		assert.equal(isValidAuthCode("123456"), true);
		assert.equal(isValidAuthCode("AB1234"), true);
		assert.equal(isValidAuthCode("12345"), false);
	});

	it("should generate standard SberPay / SBP QR URI", () => {
		const qrUri = generateSberPayQrPayload("ORD-554", 350000, TEST_CONFIG.merchantId);
		assert.ok(qrUri.startsWith("https://qr.sberbank.ru/sbp/pay?"));
		assert.ok(qrUri.includes("sum=3500.00"));
		assert.ok(qrUri.includes("order=ORD-554"));
		assert.ok(qrUri.includes("mcc=8021"));
	});
});

describe("Sberbank Thermal Bank Slip ESC/POS Generation & Printing", () => {
	it("should format monospace customer and merchant bank slips", () => {
		const slip = formatSberBankSlip(TEST_CONFIG, {
			isCustomerCopy: true,
			operation: "sale",
			amountKop: 1540000,
			rrn: "981273948192",
			authCode: "481920",
			cardHash: "2200********4819",
			cardIssuer: "МИР",
			aid: "A0000006581010",
			tvr: "0000008000",
			dateTime: "01.09.2026 14:30:00",
			responseCode: "00",
			orderId: "POS-1234",
		});

		assert.ok(slip.includes("ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"));
		assert.ok(slip.includes("15400.00 РУБ."));
		assert.ok(slip.includes("ТЕРМИНАЛ (TID): 19827340"));
		assert.ok(slip.includes("НОМЕР RRN:         981273948192"));
		assert.ok(slip.includes("КОД АВТОР. (AUTH): 481920"));
		assert.ok(slip.includes("ЧЕК КЛИЕНТА"));
		assert.ok(slip.includes("ОДОБРЕНО / SUCCESS"));
	});

	it("should format banking settlement (Z-Report) summary slip", () => {
		const totals: SberSettlementTotals = {
			batchNumber: 42,
			dateTime: "01.09.2026 21:00:00",
			saleCount: 10,
			saleTotalKop: 25000000,
			refundCount: 1,
			refundTotalKop: 500000,
			voidCount: 0,
			voidTotalKop: 0,
			sberpayQrCount: 4,
			sberpayQrTotalKop: 8000000,
			biometryCount: 2,
			biometryTotalKop: 4000000,
			netTotalKop: 24500000,
		};

		const zSlip = formatSberSettlementSlip(TEST_CONFIG, totals);
		assert.ok(zSlip.includes("СВЕРКА ИТОГОВ (Z-ОТЧЕТ)"));
		assert.ok(zSlip.includes("СМЕНА (BATCH):  №0042"));
		assert.ok(zSlip.includes("245000.00 Р"));
		assert.ok(zSlip.includes("ИТОГИ СОВПАЛИ С ПРОЦЕССИНГОМ ПАО СБЕРБАНК"));
	});

	it("should build valid CP866 ESC/POS binary command buffer", () => {
		const slipText = "ЧЕК КЛИЕНТА\nСУММА: 1000.00 РУБ.";
		const buffer = hardwarePrinter.buildEscPosBankSlip(slipText);

		assert.ok(buffer instanceof Uint8Array);
		assert.ok(buffer.length > 20);
		// Check ESC @ (init)
		assert.equal(buffer[0], 0x1b);
		assert.equal(buffer[1], 0x40);
		// Check ESC t 17 (CP866)
		assert.equal(buffer[2], 0x1b);
		assert.equal(buffer[3], 0x74);
		assert.equal(buffer[4], 0x11);
	});

	it("should generate printable HTML for browser thermal printers", () => {
		const slipText = "ТЕСТОВЫЙ БАНКОВСКИЙ СЛИП";
		const html = hardwarePrinter.generatePrintableBankSlipHtml(slipText);

		assert.ok(html.includes("<!DOCTYPE html>"));
		assert.ok(html.includes("Банковский слип"));
		assert.ok(html.includes("ТЕСТОВЫЙ БАНКОВСКИЙ СЛИП"));
		assert.ok(html.includes("window.print()"));
	});
});

describe("Sberbank Terminal Service State Machine & Recovery", () => {
	it("should subscribe to status updates and maintain current state", () => {
		const service = new SberbankTerminalService(TEST_CONFIG);
		const observedStatuses: string[] = [];

		const unsub = service.subscribeStatus((status) => {
			observedStatuses.push(status);
		});

		assert.equal(service.getStatus(), "ready");
		assert.ok(observedStatuses.includes("ready"));
		unsub();
	});

	it("should reject invalid refund parameters lacking 12-digit RRN", async () => {
		const service = new SberbankTerminalService(TEST_CONFIG);
		await assert.rejects(
			() =>
				service.executeRefund({
					amountKopecks: 10000,
					patientId: "pat-1",
					originalRrn: "INVALID_RRN",
					originalAuthCode: "123456",
				}),
			/Некорректный номер RRN/,
		);
	});
});
