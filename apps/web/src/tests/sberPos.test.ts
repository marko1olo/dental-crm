import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	getPilotNtCommandCode,
	buildPilotNtCommandPacket,
	buildArcusDCommandPacket,
	detectCardSystem,
	formatSberBankSlip,
	formatSberSettlementSlip,
	isValidRrn,
	isValidAuthCode,
	generateSberPayQrPayload,
	createMockSberPosResponse,
	SBER_POS_ERROR_CODES,
	type SberPosTerminalConfig,
	type SberSettlementTotals,
} from "../components/payments/sberPos/sberPosEngine";
import {
	DEFAULT_SBER_TERMINAL_CONFIG,
	SBER_HARDWARE_PROFILES,
	SAMPLE_SUCCESS_RESPONSE,
	SAMPLE_FAILURE_RESPONSE,
} from "../components/payments/sberPos/sberPosPresets";

describe("Sberbank POS Terminal Protocol Engine & SberPay Direct", () => {
	const testConfig: SberPosTerminalConfig = {
		terminalId: "19827340",
		merchantId: "981273948192031",
		hostIp: "127.0.0.1",
		hostPort: 4000,
		protocol: "pilot_nt",
		hardwareModel: "sber_smartpos",
		timeoutMs: 45000,
		retryCount: 2,
		clinicName: "СТОМАТОЛОГИЯ «ДЕНТЕ»",
		clinicAddress: "г. Москва, ул. Арбат, д. 24",
		clinicInn: "770412345678",
	};

	describe("1. Command Code & Packet Serialization", () => {
		it("should map Pilot-NT operation command codes correctly", () => {
			assert.equal(getPilotNtCommandCode("sale"), 1);
			assert.equal(getPilotNtCommandCode("test_ping"), 2);
			assert.equal(getPilotNtCommandCode("refund"), 3);
			assert.equal(getPilotNtCommandCode("void"), 4);
			assert.equal(getPilotNtCommandCode("reprint_slip"), 5);
			assert.equal(getPilotNtCommandCode("settlement"), 7);
			assert.equal(getPilotNtCommandCode("summary_report"), 8);
			assert.equal(getPilotNtCommandCode("sberpay_qr"), 11);
			assert.equal(getPilotNtCommandCode("biometry_facepay"), 13);
		});

		it("should build standard Pilot-NT command string for Sale", () => {
			const packet = buildPilotNtCommandPacket(testConfig, {
				operation: "sale",
				amountKop: 1960000,
				orderId: "CHK-2026-891",
			});
			assert.equal(packet, "1,1960000,,,643,CHK-2026-891,19827340,981273948192031");
		});

		it("should build Pilot-NT command string for Refund with original RRN and AuthCode", () => {
			const packet = buildPilotNtCommandPacket(testConfig, {
				operation: "refund",
				amountKop: 500000,
				orderId: "REF-001",
				originalRrn: "423891028471",
				originalAuthCode: "982310",
			});
			assert.equal(packet, "3,500000,423891028471,982310,643,REF-001,19827340,981273948192031");
		});

		it("should build Arcus-D command dictionary with appropriate OP_CODE", () => {
			const arcusPacket = buildArcusDCommandPacket(testConfig, {
				operation: "sberpay_qr",
				amountKop: 250000,
				orderId: "QR-99",
			});
			assert.equal(arcusPacket.OP_CODE, "000010");
			assert.equal(arcusPacket.AMOUNT, 250000);
			assert.equal(arcusPacket.TERMINAL_ID, "19827340");
			assert.equal(arcusPacket.MERCHANT_ID, "981273948192031");
			assert.equal(arcusPacket.ORDER_ID, "QR-99");
		});
	});

	describe("2. Payment Card System & Identifier Detection", () => {
		it("should identify MIR card system from PAN prefix and AID", () => {
			assert.equal(detectCardSystem("2200********4819", "A0000006581010"), "МИР");
			assert.equal(detectCardSystem("2204********1234", ""), "МИР");
		});

		it("should identify Visa card from PAN and AID", () => {
			assert.equal(detectCardSystem("4276********9012", "A0000000031010"), "Visa");
		});

		it("should identify MasterCard from PAN and AID", () => {
			assert.equal(detectCardSystem("5489********3456", "A0000000041010"), "MasterCard");
		});

		it("should identify UnionPay and SberPay", () => {
			assert.equal(detectCardSystem("6281********7890", "A0000003331010"), "UnionPay");
			assert.equal(detectCardSystem("SBERPAY-QR", "SBERPAY001"), "SberPay");
		});
	});

	describe("3. Banking Identifiers & SberPay QR Validation", () => {
		it("should validate 12-digit RRN accurately", () => {
			assert.equal(isValidRrn("423891028471"), true);
			assert.equal(isValidRrn("42389102847A"), true);
			assert.equal(isValidRrn("12345"), false); // too short
			assert.equal(isValidRrn("4238910284719999"), false); // too long
			assert.equal(isValidRrn("42389102847!"), false); // invalid char
		});

		it("should validate 6-character AuthCode", () => {
			assert.equal(isValidAuthCode("982310"), true);
			assert.equal(isValidAuthCode("AB9012"), true);
			assert.equal(isValidAuthCode("12345"), false); // too short
			assert.equal(isValidAuthCode("1234567"), false); // too long
		});

		it("should construct valid SberPay / SBP QR URI with MCC 8021", () => {
			const qrUrl = generateSberPayQrPayload("CHK-891", 1960000, "981273948192031");
			assert.match(qrUrl, /^https:\/\/qr\.sberbank\.ru\/sbp\/pay/);
			assert.match(qrUrl, /tid=981273948192031/);
			assert.match(qrUrl, /order=CHK-891/);
			assert.match(qrUrl, /sum=19600\.00/);
			assert.match(qrUrl, /mcc=8021/);
		});
	});

	describe("4. Bank Slip & Settlement Formatting", () => {
		it("should format compliant Customer Copy Bank Slip", () => {
			const slip = formatSberBankSlip(testConfig, {
				isCustomerCopy: true,
				operation: "sale",
				amountKop: 1960000,
				rrn: "423891028471",
				authCode: "982310",
				cardHash: "2200********4819",
				cardIssuer: "МИР",
				aid: "A0000006581010",
				tvr: "0000008000",
				dateTime: "22.08.2026 14:35:12",
				responseCode: "00",
				orderId: "CHK-2026-891",
			});

			assert.match(slip, /СТОМАТОЛОГИЯ «ДЕНТЕ»/);
			assert.match(slip, /ИНН: 770412345678/);
			assert.match(slip, /ТЕРМИНАЛ \(TID\): 19827340/);
			assert.match(slip, /МЕРЧАНТ  \(MID\): 981273948192031/);
			assert.match(slip, /19600\.00 РУБ\./);
			assert.match(slip, /НОМЕР RRN:\s+423891028471/);
			assert.match(slip, /КОД АВТОР\. \(AUTH\):\s+982310/);
			assert.match(slip, /EMV AID:\s+A0000006581010/);
			assert.match(slip, /EMV TVR:\s+0000008000/);
			assert.match(slip, /СТАТУС: \[ ОДОБРЕНО \/ SUCCESS \]/);
			assert.match(slip, /ЧЕК КЛИЕНТА/);
		});

		it("should format Merchant / Accounting Copy Bank Slip with signature line", () => {
			const slip = formatSberBankSlip(testConfig, {
				isCustomerCopy: false,
				operation: "sale",
				amountKop: 1960000,
				rrn: "423891028471",
				authCode: "982310",
				cardHash: "2200********4819",
				cardIssuer: "МИР",
				aid: "A0000006581010",
				tvr: "0000008000",
				dateTime: "22.08.2026 14:35:12",
				responseCode: "00",
				orderId: "CHK-2026-891",
			});

			assert.match(slip, /ЧЕК ТЕРМИНАЛА \(КОПИЯ ДЛЯ БУХГАЛТЕРИИ\)/);
			assert.match(slip, /ПОДПИСЬ КАССИРА: _______________________/);
		});

		it("should format Settlement (Z-Report) slip and balance totals", () => {
			const totals: SberSettlementTotals = {
				batchNumber: 142,
				dateTime: "22.08.2026 21:00:00",
				saleCount: 20,
				saleTotalKop: 40000000,
				refundCount: 2,
				refundTotalKop: 2000000,
				voidCount: 0,
				voidTotalKop: 0,
				sberpayQrCount: 8,
				sberpayQrTotalKop: 15000000,
				biometryCount: 3,
				biometryTotalKop: 6000000,
				netTotalKop: 38000000,
			};

			const slip = formatSberSettlementSlip(testConfig, totals);
			assert.match(slip, /СВЕРКА ИТОГОВ \(Z-ОТЧЕТ\)/);
			assert.match(slip, /СМЕНА \(BATCH\):\s+№0142/);
			assert.match(slip, /ИТОГО В БАНК \(NET\):\s+380000\.00 Р/);
			assert.match(slip, /РЕЗУЛЬТАТ: \[ СМЕНА УСПЕШНО ЗАКРЫТА \]/);
		});
	});

	describe("5. Error Codes & Retry Policy", () => {
		it("should correctly identify retryable and non-retryable error codes", () => {
			assert.equal(SBER_POS_ERROR_CODES["00"]?.isRetryable, false);
			assert.equal(SBER_POS_ERROR_CODES["51"]?.isRetryable, true); // Insufficient funds -> can retry with another card
			assert.equal(SBER_POS_ERROR_CODES["55"]?.isRetryable, true); // Wrong PIN -> can retry PIN entry
			assert.equal(SBER_POS_ERROR_CODES["99"]?.isRetryable, true); // Timeout -> can retry
			assert.equal(SBER_POS_ERROR_CODES["4100"]?.isRetryable, true); // Socket timeout -> can retry
			assert.equal(SBER_POS_ERROR_CODES["54"]?.isRetryable, false); // Expired card -> cannot retry same card
		});
	});

	describe("6. Mock Response Generator & Presets Integrity", () => {
		it("should generate realistic successful transaction response", () => {
			const res = createMockSberPosResponse(testConfig, {
				operation: "sale",
				amountKop: 1960000,
				orderId: "CHK-001",
			});
			assert.equal(res.success, true);
			assert.equal(res.responseCode, "00");
			assert.equal(res.amountKop, 1960000);
			assert.equal(isValidRrn(res.rrn), true);
			assert.equal(isValidAuthCode(res.authCode), true);
			assert.ok(res.customerSlip.length > 50);
		});

		it("should generate realistic SberPay QR transaction response with QR payload", () => {
			const res = createMockSberPosResponse(testConfig, {
				operation: "sberpay_qr",
				amountKop: 350000,
				orderId: "QR-100",
			});
			assert.equal(res.success, true);
			assert.ok(res.qrPayload);
			assert.match(res.qrPayload!, /qr\.sberbank\.ru/);
			assert.equal(res.cardIssuer, "SberPay QR (СБП)");
		});

		it("should generate failure response with error code 51", () => {
			const res = createMockSberPosResponse(testConfig, {
				operation: "sale",
				amountKop: 1960000,
				orderId: "CHK-002",
			}, "51");
			assert.equal(res.success, false);
			assert.equal(res.responseCode, "51");
			assert.match(res.responseMessageRu, /Недостаточно средств/);
		});

		it("should verify hardware profile catalog", () => {
			assert.equal(SBER_HARDWARE_PROFILES.length, 4);
			const smartPos = SBER_HARDWARE_PROFILES.find((p) => p.id === "sber_smartpos");
			assert.ok(smartPos);
			assert.equal(smartPos?.supportsFacePay, true);
			assert.equal(smartPos?.supportsQrDisplay, true);
			assert.equal(DEFAULT_SBER_TERMINAL_CONFIG.terminalId, "19827340");
		});
	});
});
