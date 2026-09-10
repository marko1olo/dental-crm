import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	DENTAL_PKU_MEDICATIONS,
	GS1_APPLICATION_IDENTIFIERS,
	GS1_DELIMITER,
	MDLP_OPERATION_CODES,
	MDLP_OPERATION_CONFIGS,
	calculateGtin14,
	cleanScannerBarcodeString,
	generateAuthenticDentalBarcode,
	generateGs1DataMatrix,
	generateSecureAlphanumeric,
	isGs1DataMatrixCandidate,
	parseGs1DataMatrixWithPku as parseGs1DataMatrix,
	processScannerInput,
} from "../inventory/gs1DataMatrixParser.js";

describe("GS1 DataMatrix Parser & Authentic Generator for MDLP (Честный ЗНАК)", () => {
	test("1. Application Identifiers and Operation Codes configuration", () => {
		assert.strictEqual(GS1_APPLICATION_IDENTIFIERS.GTIN, "01");
		assert.strictEqual(GS1_APPLICATION_IDENTIFIERS.SERIAL_NUMBER, "21");
		assert.strictEqual(GS1_APPLICATION_IDENTIFIERS.CRYPTO_KEY, "91");
		assert.strictEqual(GS1_APPLICATION_IDENTIFIERS.CRYPTO_SIGNATURE, "92");
		assert.strictEqual(GS1_APPLICATION_IDENTIFIERS.EXPIRATION_DATE, "17");
		assert.strictEqual(GS1_APPLICATION_IDENTIFIERS.BATCH_LOT, "10");

		assert.strictEqual(MDLP_OPERATION_CODES.DISPOSAL_MEDICAL_CARE, 332);
		assert.strictEqual(MDLP_OPERATION_CODES.DISPOSAL_WRITE_OFF_OR_DEFECT, 331);

		const cfg332 = MDLP_OPERATION_CONFIGS[332];
		assert.strictEqual(cfg332.schema10560WithdrawalType, 13);
		assert.ok(cfg332.titleRu.includes("332"));

		const cfg331 = MDLP_OPERATION_CONFIGS[331];
		assert.strictEqual(cfg331.schema10560WithdrawalType, 14);
		assert.ok(cfg331.titleRu.includes("331"));
	});

	test("2. Dental PKU catalog contains all primary anesthetics", () => {
		const articaineForte = DENTAL_PKU_MEDICATIONS.articaine_1_100000;
		assert.strictEqual(articaineForte.vasoconstrictor, "1:100000");
		assert.strictEqual(articaineForte.isPkuSubject, true);
		assert.strictEqual(articaineForte.unitsPerPackage, 50);

		const articaineStandard = DENTAL_PKU_MEDICATIONS.articaine_1_200000;
		assert.strictEqual(articaineStandard.vasoconstrictor, "1:200000");
		assert.strictEqual(articaineStandard.isPkuSubject, true);

		const mepivacaine = DENTAL_PKU_MEDICATIONS.mepivacaine_plain;
		assert.strictEqual(mepivacaine.vasoconstrictor, "none");
		assert.ok(mepivacaine.inn.includes("Мепивакаин"));

		const articainePlain = DENTAL_PKU_MEDICATIONS.articaine_plain;
		assert.strictEqual(articainePlain.vasoconstrictor, "none");
	});

	test("3. calculateGtin14 computes accurate Modulo 10 check digit", () => {
		// Ultracain DS forte: 0366479800001 -> check digit 6
		assert.strictEqual(calculateGtin14("0366479800001"), "03664798000016");
		// Scandonest: 0340093000003 -> check digit 8
		assert.strictEqual(calculateGtin14("0340093000003"), "03400930000038");

		assert.throws(() => calculateGtin14("123"), /13 цифр/);
	});

	test("4. generateSecureAlphanumeric generates correct length without Math.random", () => {
		const serial1 = generateSecureAlphanumeric(13);
		const serial2 = generateSecureAlphanumeric(13);
		assert.strictEqual(serial1.length, 13);
		assert.strictEqual(serial2.length, 13);
		assert.notStrictEqual(serial1, serial2);
		assert.ok(/^[a-zA-Z0-9]{13}$/.test(serial1));
	});

	test("5. generateGs1DataMatrix builds authentic raw, human, and escaped barcodes", () => {
		const raw = generateGs1DataMatrix({
			gtin: "03664798000016",
			serialNumber: "A1B2C3D4E5F6G",
			expirationDate: "280531",
			series: "LOT2026",
			cryptoKey: "ABCD",
			cryptoSignature: "1234567890abcdefghijklmnopqrstuvwxyz1234==",
			format: "raw",
		});

		assert.ok(raw.startsWith("010366479800001621A1B2C3D4E5F6G\x1d17280531\x1d10LOT2026\x1d91ABCD\x1d92"));
		assert.strictEqual(raw.split(GS1_DELIMITER).length, 5);

		const human = generateGs1DataMatrix({
			gtin: "03664798000016",
			serialNumber: "A1B2C3D4E5F6G",
			expirationDate: "280531",
			series: "LOT2026",
			cryptoKey: "ABCD",
			cryptoSignature: "1234567890abcdefghijklmnopqrstuvwxyz1234==",
			format: "human",
		});
		assert.strictEqual(
			human,
			"(01)03664798000016(21)A1B2C3D4E5F6G(17)280531(10)LOT2026(91)ABCD(92)1234567890abcdefghijklmnopqrstuvwxyz1234==",
		);

		const escaped = generateGs1DataMatrix({
			gtin: "03664798000016",
			serialNumber: "A1B2C3D4E5F6G",
			expirationDate: "280531",
			series: "LOT2026",
			cryptoKey: "ABCD",
			cryptoSignature: "1234567890abcdefghijklmnopqrstuvwxyz1234==",
			format: "escaped",
		});
		assert.ok(escaped.includes("<GS>"));
	});

	test("6. parseGs1DataMatrix parses raw DataMatrix with all AI attributes", () => {
		const raw = generateGs1DataMatrix({
			gtin: "03664798000016",
			serialNumber: "13CHARSERIALX",
			expirationDate: "281231",
			series: "SERIES2026",
			cryptoKey: "K91A",
			cryptoSignature: "SIG44CHARACTERSBASE64ALPHANUMERIC12345678==",
			format: "raw",
		});

		const result = parseGs1DataMatrix(raw);
		assert.strictEqual(result.isValid, true);
		assert.strictEqual(result.gtin, "03664798000016");
		assert.strictEqual(result.serialNumber, "13CHARSERIALX");
		assert.strictEqual(result.cryptoKey, "K91A");
		assert.strictEqual(result.cryptoSignature, "SIG44CHARACTERSBASE64ALPHANUMERIC12345678==");
		assert.strictEqual(result.expirationDate, "2028-12-31");
		assert.strictEqual(result.series, "SERIES2026");
		assert.strictEqual(result.isValidGtinChecksum, true);
		assert.strictEqual(result.isExpired, false);
		assert.strictEqual(result.recognizedDrug?.tradeName, "Ультракаин® Д-С форте");
		assert.strictEqual(result.pkuInfo?.category, "articaine_1_100000");
	});

	test("7. cleanScannerBarcodeString and processScannerInput handle scanner prefixes and delimiters", () => {
		const rawScanner = "]d2010340093000003821SER1234567890<GS>17281130<GS>10LOT99<GS>91AB12<GS>92SIG44CHARACTERSBASE64ALPHANUMERIC12345678==";
		const cleaned = cleanScannerBarcodeString(rawScanner);
		assert.ok(!cleaned.startsWith("]d2"));
		assert.ok(cleaned.includes("\x1d"));
		assert.ok(!cleaned.includes("<GS>"));

		const scannerRes = processScannerInput(rawScanner);
		assert.strictEqual(scannerRes.isScannerEvent, true);
		assert.strictEqual(scannerRes.isCompleteBarcode, true);
		assert.strictEqual(scannerRes.parsed.isValid, true);
		assert.strictEqual(scannerRes.parsed.gtin, "03400930000038");
		assert.strictEqual(scannerRes.parsed.pkuInfo?.inn, "Мепивакаин");
	});

	test("8. generateAuthenticDentalBarcode generates valid barcodes for all PKU categories", () => {
		for (const cat of ["articaine_1_100000", "articaine_1_200000", "mepivacaine_plain", "articaine_plain"] as const) {
			const unitBarcode = generateAuthenticDentalBarcode(cat, { packaging: "carpule" });
			const parsedUnit = parseGs1DataMatrix(unitBarcode);
			assert.strictEqual(parsedUnit.isValid, true, `Unit barcode for ${cat} must be valid`);
			assert.strictEqual(parsedUnit.packagingLevel, "carpule");

			const packBarcode = generateAuthenticDentalBarcode(cat, { packaging: "package" });
			const parsedPack = parseGs1DataMatrix(packBarcode);
			assert.strictEqual(parsedPack.isValid, true, `Package barcode for ${cat} must be valid`);
			assert.strictEqual(parsedPack.packagingLevel, "package");
			assert.strictEqual(parsedPack.unitsCount, 50);
		}
	});

	test("9. isGs1DataMatrixCandidate detects candidate barcodes and ignores short non-barcode strings", () => {
		assert.strictEqual(isGs1DataMatrixCandidate("010366479800001621SN1234567890"), true);
		assert.strictEqual(isGs1DataMatrixCandidate("]d2010366479800001621SN1234567890"), true);
		assert.strictEqual(isGs1DataMatrixCandidate("(01)03664798000016(21)SN1234567890"), true);
		assert.strictEqual(isGs1DataMatrixCandidate("abc"), false);
		assert.strictEqual(isGs1DataMatrixCandidate(""), false);
	});
});
