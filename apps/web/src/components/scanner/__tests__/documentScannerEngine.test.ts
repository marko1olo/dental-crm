import assert from "node:assert/strict";
import test from "node:test";
import {
	DOCUMENT_PRESETS,
	DOCUMENT_PRESETS_LIST,
	calculateDocumentGuideFrame,
	parseOmsPolicyOcrText,
	parsePassportOcrText,
	parseSnilsOcrText,
	validateSnilsChecksum,
} from "../documentScannerEngine.js";

test("Clinical Document Camera Scanner & OCR Engine Suite", async (t) => {
	await t.test("1. Document Presets & Aspect Ratios", () => {
		assert.equal(DOCUMENT_PRESETS_LIST.length, 6);
		assert.equal(DOCUMENT_PRESETS.passport_rf.aspectRatio, 1.42);
		assert.equal(DOCUMENT_PRESETS.oms_policy.aspectRatio, 1.58);
		assert.ok(DOCUMENT_PRESETS.passport_rf.title.includes("Паспорт"));
		assert.ok(DOCUMENT_PRESETS.snils.title.includes("СНИЛС"));
	});

	await t.test("2. Russian Passport OCR Parser", () => {
		// Standard series & number format
		const text1 = "ПАСПОРТ ГРАЖДАНИНА РОССИЙСКОЙ ФЕДЕРАЦИИ\nСерия 45 12 № 893201\nВыдан 14.05.2012\nКод подразделения 770-001";
		const res1 = parsePassportOcrText(text1);
		assert.equal(res1.isValidSeriesNumber, true);
		assert.equal(res1.series, "45 12");
		assert.equal(res1.number, "893201");
		assert.equal(res1.issuerCode, "770-001");
		assert.equal(res1.issueDate, "14.05.2012");

		// Contiguous 10-digit format
		const text2 = "Паспорт РФ 5014-998822 выдан 20.10.2018 ТП №1";
		const res2 = parsePassportOcrText(text2);
		assert.equal(res2.isValidSeriesNumber, true);
		assert.equal(res2.series, "50 14");
		assert.equal(res2.number, "998822");
		assert.equal(res2.issueDate, "20.10.2018");

		// Non-passport empty text
		const resEmpty = parsePassportOcrText("");
		assert.equal(resEmpty.isValidSeriesNumber, false);
	});

	await t.test("3. OMS 16-Digit Policy Number Parser", () => {
		// 16-digit unified format with spaces
		const textOms1 = "ПОЛИС ОБЯЗАТЕЛЬНОГО МЕДИЦИНСКОГО СТРАХОВАНИЯ\n7754 8920 1928 3746\nСОГАЗ-МЕД";
		const resOms1 = parseOmsPolicyOcrText(textOms1);
		assert.equal(resOms1.isValid16Digit, true);
		assert.equal(resOms1.policyNumber, "7754892019283746");

		// Contiguous 16-digit string
		const textOms2 = "Единый полис: 1234567890123456";
		const resOms2 = parseOmsPolicyOcrText(textOms2);
		assert.equal(resOms2.isValid16Digit, true);
		assert.equal(resOms2.policyNumber, "1234567890123456");

		// Invalid short string
		const resShort = parseOmsPolicyOcrText("12345");
		assert.equal(resShort.isValid16Digit, false);
	});

	await t.test("4. SNILS Checksum & Parser", () => {
		// Valid real-world SNILS with checksum (112-233-445 95)
		// Calculation: 1*9 + 1*8 + 2*7 + 2*6 + 3*5 + 3*4 + 4*3 + 4*2 + 5*1 = 9+8+14+12+15+12+12+8+5 = 95
		const validSnils = "112-233-445 95";
		assert.equal(validateSnilsChecksum(validSnils), true);

		const parsedSnils = parseSnilsOcrText("Страховое свидетельство: 112-233-445 95");
		assert.equal(parsedSnils.isValidChecksum, true);
		assert.equal(parsedSnils.digitsOnly, "11223344595");
		assert.equal(parsedSnils.formatted, "112-233-445 95");

		// Broken checksum
		const invalidSnils = "112-233-445 99";
		assert.equal(validateSnilsChecksum(invalidSnils), false);
		const parsedInvalid = parseSnilsOcrText(invalidSnils);
		assert.equal(parsedInvalid.isValidChecksum, false);
	});

	await t.test("5. Guide Frame Normalization Math", () => {
		const frameLandscape = calculateDocumentGuideFrame(800, 600, 1.42);
		assert.ok(frameLandscape.width > 0);
		assert.ok(frameLandscape.height > 0);
		assert.ok(frameLandscape.x >= 0);
		assert.ok(frameLandscape.y >= 0);
		assert.ok(frameLandscape.width <= 800);
		assert.ok(frameLandscape.height <= 600);

		const framePortrait = calculateDocumentGuideFrame(390, 844, 1.58);
		assert.ok(framePortrait.width > 0);
		assert.ok(framePortrait.height > 0);
		assert.ok(framePortrait.x >= 0);
		assert.ok(framePortrait.y >= 0);
	});
});
