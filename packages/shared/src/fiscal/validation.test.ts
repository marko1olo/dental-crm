import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	fiscalReceiptItemSchema,
	createFiscalReceiptPayloadSchema,
	fiscalRefundPayloadSchema,
	computeFpd54Fz,
	format54FzFtsQrString,
	parseAndValidate54FzFtsQrString,
	buildFiscalReceiptPayloadSignature,
	buildFiscalRefundPayloadSignature,
	createFiscalCompositeIdempotencyKey,
	verifyFiscalCompositeIdempotencyKey,
	calculateCashChange,
	getCashPresetSuggestions,
	validateRussianTaxpayerInn,
} from "./validation.js";

describe("54-FZ FFD 1.2 Fiscal Validation & Decomposition Suite", () => {
	describe("1. fiscalReceiptItemSchema", () => {
		it("validates a standard dental service item with integer arithmetic", () => {
			const item = {
				name: "Первичная консультация врача-стоматолога",
				priceKopecks: 150000,
				quantity: 1,
				amountKopecks: 150000,
			};

			const parsed = fiscalReceiptItemSchema.parse(item);
			assert.equal(parsed.name, item.name);
			assert.equal(parsed.amountKopecks, 150000);
			assert.equal(parsed.subject, "service");
			assert.equal(parsed.method, "full_payment");
			assert.equal(parsed.vatRate, "vat_none");
			assert.equal(parsed.measure, "piece");
		});

		it("validates discount calculation in kopecks and percentage", () => {
			const itemWithFixedDiscount = {
				name: "Установка пломбы светового отверждения",
				priceKopecks: 400000,
				quantity: 1,
				discountKopecks: 50000,
				amountKopecks: 350000,
			};
			assert.doesNotThrow(() => fiscalReceiptItemSchema.parse(itemWithFixedDiscount));

			const itemWithPercentDiscount = {
				name: "Установка пломбы светового отверждения",
				priceKopecks: 400000,
				quantity: 1,
				discountPercent: 10,
				amountKopecks: 360000,
			};
			assert.doesNotThrow(() => fiscalReceiptItemSchema.parse(itemWithPercentDiscount));
		});

		it("rejects line item when amountKopecks does not match price * quantity - discount", () => {
			const badItem = {
				name: "Удаление зуба",
				priceKopecks: 200000,
				quantity: 1,
				amountKopecks: 180000, // drift without discount
			};
			assert.throws(() => fiscalReceiptItemSchema.parse(badItem));
		});

		it("correctly copies medicalServiceCodeMzk to medicalServiceCode804n when 804n is absent", () => {
			const item = {
				name: "Прием врача",
				priceKopecks: 100000,
				quantity: 1,
				amountKopecks: 100000,
				medicalServiceCodeMzk: "A11.07.012",
			};
			const parsed = fiscalReceiptItemSchema.parse(item);
			assert.equal(parsed.medicalServiceCode804n, "A11.07.012");
		});
	});

	describe("2. createFiscalReceiptPayloadSchema", () => {
		const validItem = {
			name: "Лечение кариеса",
			priceKopecks: 500000,
			quantity: 1,
			amountKopecks: 500000,
		};

		it("validates compliant receipt with cash tender parity", () => {
			const payload = {
				patientId: "a0000000-0000-0000-0000-000000000001",
				customerContact: "+79991234567",
				cashierFullName: "Иванова А.С.",
				items: [validItem],
				cashKopecks: 500000,
				totalKopecks: 500000,
			};
			const parsed = createFiscalReceiptPayloadSchema.parse(payload);
			assert.equal(parsed.totalKopecks, 500000);
			assert.equal(parsed.cashKopecks, 500000);
		});

		it("rejects receipt when payment tenders sum does not match totalKopecks", () => {
			const payload = {
				patientId: "a0000000-0000-0000-0000-000000000001",
				customerContact: "+79991234567",
				items: [validItem],
				cashKopecks: 400000,
				electronicCardKopecks: 0,
				totalKopecks: 500000, // 400000 !== 500000
			};
			assert.throws(() => createFiscalReceiptPayloadSchema.parse(payload));
		});

		it("rejects receipt when items sum does not match totalKopecks", () => {
			const payload = {
				patientId: "a0000000-0000-0000-0000-000000000001",
				customerContact: "+79991234567",
				items: [validItem], // 500000
				sbpKopecks: 600000,
				totalKopecks: 600000, // 500000 !== 600000
			};
			assert.throws(() => createFiscalReceiptPayloadSchema.parse(payload));
		});

		it("enforces mandatory correctionDocDate and correctionDocNumber for correction receipts", () => {
			const correctionPayloadMissingDoc = {
				patientId: "a0000000-0000-0000-0000-000000000001",
				customerContact: "+79991234567",
				items: [validItem],
				electronicCardKopecks: 500000,
				totalKopecks: 500000,
				isCorrection: true,
			};
			assert.throws(() => createFiscalReceiptPayloadSchema.parse(correctionPayloadMissingDoc));

			const correctionPayloadValid = {
				...correctionPayloadMissingDoc,
				correctionType: "self_initiated",
				correctionDocDate: "2026-10-10",
				correctionDocNumber: "DOC-9912",
			};
			assert.doesNotThrow(() => createFiscalReceiptPayloadSchema.parse(correctionPayloadValid));
		});
	});

	describe("3. fiscalRefundPayloadSchema", () => {
		const validItem = {
			name: "Возврат: Консультация",
			priceKopecks: 150000,
			quantity: 1,
			amountKopecks: 150000,
		};

		it("validates refund with tender parity and defaults to electronic when tenders are 0", () => {
			const refund = {
				patientId: "a0000000-0000-0000-0000-000000000001",
				totalRefundKopecks: 150000,
				reason: "Отказ от плана лечения",
				items: [validItem],
			};
			const parsed = fiscalRefundPayloadSchema.parse(refund);
			assert.equal(parsed.refundElectronicKopecks, 150000);
			assert.equal(parsed.originalReceiptNumber, "CHK-1");
		});

		it("rejects refund when tender sum does not match totalRefundKopecks", () => {
			const refund = {
				patientId: "a0000000-0000-0000-0000-000000000001",
				refundCashKopecks: 100000,
				totalRefundKopecks: 150000,
				reason: "Отказ",
				items: [validItem],
			};
			assert.throws(() => fiscalRefundPayloadSchema.parse(refund));
		});
	});

	describe("4. computeFpd54Fz & QR-Code string validation", () => {
		it("computes deterministic 10-digit decimal FPD string", () => {
			const fpd = computeFpd54Fz({
				fnSerial: "9999078900012345",
				fiscalDocumentNumber: 142,
				issuedAt: new Date("2026-10-10T12:30:00Z"),
				totalKopecks: 350000,
				operationType: "income",
			});
			assert.equal(typeof fpd, "string");
			assert.equal(fpd.length, 10);
			assert.match(fpd, /^\d{10}$/);

			// Determinism: identical input yields identical FPD
			const fpd2 = computeFpd54Fz({
				fnSerial: "9999078900012345",
				fiscalDocumentNumber: 142,
				issuedAt: new Date("2026-10-10T12:30:00Z"),
				totalKopecks: 350000,
				operationType: "income",
			});
			assert.equal(fpd, fpd2);
		});

		it("formats and parses statutory 54-FZ FTS QR-code string", () => {
			const qrParams = {
				issuedAt: new Date("2026-10-10T15:45:00Z"),
				totalKopecks: 245050,
				fnSerial: "9999078900012345",
				fiscalDocumentNumber: 884,
				fiscalSign: "3849201847",
				operationType: "income" as const,
			};

			const qrString = format54FzFtsQrString(qrParams);
			assert.match(qrString, /^t=\d{8}T\d{4}&s=2450\.50&fn=9999078900012345&i=884&fp=3849201847&n=1$/);

			const parsed = parseAndValidate54FzFtsQrString(qrString);
			assert.equal(parsed.isValid, true);
			assert.equal(parsed.totalAmountKopecks, 245050);
			assert.equal(parsed.fnSerial, "9999078900012345");
			assert.equal(parsed.fiscalDocumentNumber, 884);
			assert.equal(parsed.fiscalSign, "3849201847");
			assert.equal(parsed.operationType, "income");
		});

		it("rejects corrupted or incomplete QR strings", () => {
			assert.equal(parseAndValidate54FzFtsQrString("").isValid, false);
			assert.equal(parseAndValidate54FzFtsQrString("t=20261010T1545&s=100.00").isValid, false);
		});
	});

	describe("5. Composite Idempotency Keys & Hashing", () => {
		it("creates and verifies composite idempotency keys", () => {
			const payloadSig = buildFiscalReceiptPayloadSignature({
				patientId: "a0000000-0000-0000-0000-000000000001",
				totalKopecks: 100000,
				cashKopecks: 100000,
				items: [{
					name: "Прием",
					priceKopecks: 100000,
					quantity: 1,
					amountKopecks: 100000,
				}],
			});

			const uuid = "550e8400-e29b-41d4-a716-446655440000";
			const compositeKey = createFiscalCompositeIdempotencyKey(uuid, payloadSig);
			assert.ok(compositeKey.startsWith(`${uuid}#`));

			const verification = verifyFiscalCompositeIdempotencyKey(compositeKey, payloadSig);
			assert.equal(verification.isValid, true);
			assert.equal(verification.uuid, uuid);

			// Verification fails if payload altered
			const alteredSig = { ...payloadSig, totalKopecks: 200000 };
			const alteredVerification = verifyFiscalCompositeIdempotencyKey(compositeKey, alteredSig);
			assert.equal(alteredVerification.isValid, false);
		});

		it("builds deterministic refund signature", () => {
			const sig = buildFiscalRefundPayloadSignature({
				patientId: "a0000000-0000-0000-0000-000000000001",
				totalRefundKopecks: 50000,
				refundElectronicKopecks: 50000,
				reason: "Возврат",
				items: [{
					name: "Услуга",
					priceKopecks: 50000,
					quantity: 1,
					amountKopecks: 50000,
				}],
			});
			assert.equal(sig.totalRefundKopecks, 50000);
			assert.equal(sig.reason, "Возврат");
		});
	});

	describe("6. Fast Cashier: Change & Suggestions", () => {
		it("calculates exact change and shortage", () => {
			const changeResult = calculateCashChange(1250.00, 1500.00);
			assert.equal(changeResult.isShortage, false);
			assert.equal(changeResult.changeRub, 250.00);
			assert.equal(changeResult.changeKopecks, 25000);

			const shortageResult = calculateCashChange(1250.00, 1000.00);
			assert.equal(shortageResult.isShortage, true);
			assert.equal(shortageResult.shortageRub, 250.00);
			assert.equal(shortageResult.shortageKopecks, 25000);
		});

		it("returns smart cash preset suggestions", () => {
			const presets = getCashPresetSuggestions(1350);
			assert.ok(presets.includes(1350));
			assert.ok(presets.includes(1400) || presets.includes(1500));
			assert.ok(presets.includes(2000));
			assert.ok(presets.length <= 5);
		});
	});

	describe("7. Russian Taxpayer INN Validation", () => {
		it("validates 10-digit legal entity INN with checksum", () => {
			// Sberbank INN: 7707083893
			const sber = validateRussianTaxpayerInn("7707083893");
			assert.equal(sber.isValid, true);
			assert.equal(sber.kind, "ul");

			// Invalid checksum 10-digit
			const badUl = validateRussianTaxpayerInn("7707083894");
			assert.equal(badUl.isValid, false);
		});

		it("validates 12-digit individual INN with two checksums", () => {
			// Valid 12-digit test INN: 500100732259
			const fl = validateRussianTaxpayerInn("500100732259");
			assert.equal(fl.isValid, true);
			assert.equal(fl.kind, "fl");

			// Invalid checksum 12-digit
			const badFl = validateRussianTaxpayerInn("500100732250");
			assert.equal(badFl.isValid, false);
		});

		it("rejects non-10/12-digit strings and nulls", () => {
			assert.equal(validateRussianTaxpayerInn(null).isValid, false);
			assert.equal(validateRussianTaxpayerInn("12345").isValid, false);
		});
	});
});
