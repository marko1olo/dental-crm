/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FNS MEDICAL TAX DEDUCTION XML GENERATOR TESTS (ПРИКАЗ ФНС № ЕД-7-11/755@)
 * Test Suite for Validation, XML Generation & Printable Forms
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_FNS_CLINIC_PRESET,
	FNS_KINSHIP_PRESETS,
	FNS_SERVICE_CODE_PRESETS,
	NDFL_LIMITS,
	SUPPORTED_TAX_YEARS,
	validateRussianInn,
	validateRussianKpp,
	validateRussianOgrn,
	validateRussianSnils,
} from "../components/documents/ndflXml/fnsNdflXmlPresets.js";
import {
	escapeXmlAttr,
	formatFnsRuDate,
	generateFnsFileName,
	generateFnsNdflPrintHtml,
	generateFnsNdflXml,
	parseFio,
	preflightValidatePayload,
	type FnsNdflXmlPayload,
} from "../components/documents/ndflXml/fnsNdflXmlEngine.js";
import { FnsNdflXmlModal } from "../components/documents/ndflXml/FnsNdflXmlModal.js";

describe("1. Russian Tax Identification Number (ИНН) Checksum Validator", () => {
	it("1.1 Correctly validates 10-digit legal entity INN checksums", () => {
		// Valid legal entity INN: 7701234560
		const validLegal = validateRussianInn("7701234560");
		assert.equal(validLegal.isValid, true);
		assert.equal(validLegal.type, "legal");
		assert.equal(validLegal.cleanInn, "7701234560");

		// Invalid legal entity INN (bad checksum digit)
		const invalidLegal = validateRussianInn("7701234561");
		assert.equal(invalidLegal.isValid, false);
		assert.equal(invalidLegal.type, "invalid");
		assert.ok(invalidLegal.error?.includes("Неверная контрольная сумма"));
	});

	it("1.2 Correctly validates 12-digit individual / IP INN checksums", () => {
		// Valid individual INN: 770112345695
		const validIndividual = validateRussianInn("770112345695");
		assert.equal(validIndividual.isValid, true);
		assert.equal(validIndividual.type, "individual");
		assert.equal(validIndividual.cleanInn, "770112345695");

		// Invalid individual INN
		const invalidIndividual = validateRussianInn("770112345699");
		assert.equal(invalidIndividual.isValid, false);
		assert.equal(invalidIndividual.type, "invalid");
		assert.ok(invalidIndividual.error?.includes("Неверная контрольная сумма"));
	});

	it("1.3 Rejects malformed or non-digit INNs", () => {
		const empty = validateRussianInn("");
		assert.equal(empty.isValid, false);

		const short = validateRussianInn("12345678");
		assert.equal(short.isValid, false);

		const withLetters = validateRussianInn("7701ABC4560");
		assert.equal(withLetters.isValid, false);
	});
});

describe("2. Russian SNILS, KPP & OGRN Validators", () => {
	it("2.1 Validates Russian SNILS checksum algorithm", () => {
		// Valid SNILS: 123-456-789 64
		const valid = validateRussianSnils("123-456-789 64");
		assert.equal(valid.isValid, true);
		assert.equal(valid.formatted, "123-456-789 64");

		// Invalid SNILS checksum
		const invalid = validateRussianSnils("123-456-789 00");
		assert.equal(invalid.isValid, false);
		assert.ok(invalid.error?.includes("Неверное контрольное число"));

		// All zeroes
		const zero = validateRussianSnils("000-000-000 00");
		assert.equal(zero.isValid, false);
	});

	it("2.2 Validates KPP and OGRN length requirements", () => {
		assert.equal(validateRussianKpp("770101001"), true);
		assert.equal(validateRussianKpp("77010100"), false);

		assert.equal(validateRussianOgrn("1157746123456"), true); // 13 digits legal
		assert.equal(validateRussianOgrn("315774600123456"), true); // 15 digits IP
		assert.equal(validateRussianOgrn("1157746"), false);
	});
});

describe("3. FNS Presets and Limits Verification", () => {
	it("3.1 Service Code presets and 13% tax limits are compliant with Tax Code Art. 219", () => {
		assert.equal(FNS_SERVICE_CODE_PRESETS["1"].hasLimit, true);
		assert.equal(FNS_SERVICE_CODE_PRESETS["2"].hasLimit, false);

		assert.equal(NDFL_LIMITS.CODE_1_MAX_EXPENSE_FROM_2024, 150000);
		assert.equal(NDFL_LIMITS.CODE_1_MAX_EXPENSE_LEGACY, 120000);
		assert.equal(NDFL_LIMITS.TAX_RATE, 0.13);

		assert.ok(SUPPORTED_TAX_YEARS.includes(2026));
		assert.ok(SUPPORTED_TAX_YEARS.includes(2025));
		assert.ok(SUPPORTED_TAX_YEARS.includes(2024));
		assert.ok(SUPPORTED_TAX_YEARS.includes(2023));
	});

	it("3.2 Kinship presets conform to FNS Order № ЕД-7-11/755@", () => {
		assert.equal(FNS_KINSHIP_PRESETS["1"].requiresKinshipDoc, false);
		assert.equal(FNS_KINSHIP_PRESETS["2"].requiresKinshipDoc, true);
		assert.equal(FNS_KINSHIP_PRESETS["3"].requiresKinshipDoc, true);
		assert.equal(FNS_KINSHIP_PRESETS["4"].requiresKinshipDoc, true);
		assert.equal(FNS_KINSHIP_PRESETS["5"].requiresKinshipDoc, true);
	});
});

describe("4. Statutory FNS XML Engine (Order № ЕД-7-11/755@ / КНД 1184043 Version 5.01)", () => {
	const basePayload: FnsNdflXmlPayload = {
		documentNumber: "СПР-2025-1048",
		documentDate: "2026-08-19",
		taxYear: 2025,
		taxInspectionCode: "7701",
		certificateKind: "1",
		clinic: {
			name: "ООО СТОМАТОЛОГИЯ ДЕНТЕ",
			inn: "7701234560", // Valid 10-digit
			kpp: "770101001",
			ogrn: "1157746123456",
			license: {
				number: "ЛО-77-01-019842",
				date: "2021-04-12",
			},
			directorName: "Смирнов Алексей Владимирович",
			directorSnils: "12345678964",
		},
		payer: {
			fullName: {
				family: "Иванов",
				given: "Иван",
				patronymic: "Иванович",
			},
			inn: "770112345695", // Valid 12-digit
			birthDate: "1990-05-15",
			identityDocument: {
				docTypeCode: "21",
				seriesAndNumber: "4510 123456",
				issueDate: "2010-06-20",
			},
		},
		patient: {
			kinshipCode: "1", // Self
		},
		receipts: [
			{
				id: "r-1",
				receiptNumber: "ФЧ-101",
				fiscalDocumentNumber: "74892",
				receiptDate: "2025-04-10",
				serviceName: "Лечение кариеса",
				deductionCode: "1",
				amountRub: 14500.5,
			},
			{
				id: "r-2",
				receiptNumber: "ФЧ-102",
				fiscalDocumentNumber: "74893",
				receiptDate: "2025-05-12",
				serviceName: "Профгигиена",
				deductionCode: "1",
				amountRub: 7500.25,
			},
			{
				id: "r-3",
				receiptNumber: "ФЧ-103",
				fiscalDocumentNumber: "74894",
				receiptDate: "2025-07-20",
				serviceName: "Имплантация Nobel Biocare",
				deductionCode: "2",
				amountRub: 85000.0,
			},
		],
	};

	it("4.1 Generates XML declaration and strict statutory structure for self-payer (Kinship 1)", () => {
		const result = generateFnsNdflXml(basePayload, "test-uuid-static-1");

		assert.equal(result.isValidForSubmission, true);
		assert.ok(result.xmlContent.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
		assert.ok(result.xmlContent.includes('КНД="1184043"'));
		assert.ok(result.xmlContent.includes('ВерсФорм="5.01"'));
		assert.ok(result.xmlContent.includes('ГодУсл="2025"'));
		assert.ok(result.xmlContent.includes('НомСпр="СПР-2025-1048"'));
		assert.ok(result.xmlContent.includes('ИННЮЛ="7701234560"'));
		assert.ok(result.xmlContent.includes('КПП="770101001"'));
		assert.ok(result.xmlContent.includes('<СвПациент ПризнПац="1"/>'));
		assert.ok(result.fileName.startsWith("UT_SVOPLMEDUSL_7701_7701_7701234560770101001_"));
		assert.ok(result.fileName.endsWith(".xml"));
	});

	it("4.2 Performs kopeck-exact calculations and 13% tax deduction refund estimate", () => {
		const result = generateFnsNdflXml(basePayload);

		// Code 1: 14500.50 + 7500.25 = 22000.75 rub = 2200075 kopecks
		assert.equal(result.code1Kopecks, 2200075);
		assert.equal(result.code1Rub, 22000.75);

		// Code 2: 85000.00 rub = 8500000 kopecks
		assert.equal(result.code2Kopecks, 8500000);
		assert.equal(result.code2Rub, 85000.0);

		// Total: 107000.75 rub
		assert.equal(result.totalKopecks, 10700075);
		assert.equal(result.totalRub, 107000.75);

		// 13% Refund: (22000.75 * 0.13) + (85000 * 0.13) = 2860.0975 + 11050 = 13910.10
		assert.equal(result.estimatedTaxRefundRub, 13910.1);

		// XML contains kopeck-exact formatted attributes
		assert.ok(result.xmlContent.includes('КодУслуг="1" СумОпл="22000.75"'));
		assert.ok(result.xmlContent.includes('КодУслуг="2" СумОпл="85000.00"'));
	});

	it("4.3 Generates full Patient block when kinship is a family member (e.g. child 4)", () => {
		const childPayload: FnsNdflXmlPayload = {
			...basePayload,
			patient: {
				kinshipCode: "4", // Child
				fullName: {
					family: "Иванова",
					given: "Мария",
					patronymic: "Ивановна",
				},
				birthDate: "2015-09-20",
				identityDocument: {
					docTypeCode: "03",
					seriesAndNumber: "II-МЮ 654321",
					issueDate: "2015-10-01",
				},
			},
		};

		const result = generateFnsNdflXml(childPayload, "test-uuid-child");
		assert.equal(result.isValidForSubmission, true);
		assert.ok(result.xmlContent.includes('<СвПациент ПризнПац="4" ДатаРожд="20.09.2015">'));
		assert.ok(result.xmlContent.includes('<ФИО Фамилия="Иванова" Имя="Мария" Отчество="Ивановна"/>'));
		assert.ok(result.xmlContent.includes('<УдЛичнФЛ КодВидДок="03" СерНомДок="II-МЮ 654321" ДатаДок="01.10.2015"/>'));
	});

	it("4.4 Generates Individual Entrepreneur (<СвИП>) clinic block for IP medical practice", () => {
		const ipPayload: FnsNdflXmlPayload = {
			...basePayload,
			clinic: {
				name: "ИП Смирнов А.В.",
				inn: "770112345695", // 12-digit IP INN
				ogrn: "315774600123456",
				isIndividualEntrepreneur: true,
				ipFullName: {
					family: "Смирнов",
					given: "Алексей",
					patronymic: "Владимирович",
				},
				license: {
					number: "ЛО-77-01-000111",
					date: "2022-01-10",
				},
			},
		};

		const result = generateFnsNdflXml(ipPayload, "test-uuid-ip");
		assert.ok(result.xmlContent.includes('<СвИП ИННФЛ="770112345695" ОГРНИП="315774600123456">'));
		assert.ok(result.xmlContent.includes('<ФИО Фамилия="Смирнов" Имя="Алексей" Отчество="Владимирович"/>'));
	});

	it("4.5 Properly escapes XML special characters", () => {
		const escaped = escapeXmlAttr('ООО "ДЕНТЕ & СТОМАТОЛОГИЯ" <КЛИНИКА>');
		assert.equal(escaped, "ООО &quot;ДЕНТЕ &amp; СТОМАТОЛОГИЯ&quot; &lt;КЛИНИКА&gt;");
	});

	it("4.6 Validates preflight issues on incomplete data", () => {
		const invalidPayload: FnsNdflXmlPayload = {
			...basePayload,
			clinic: {
				...basePayload.clinic,
				inn: "123", // invalid INN
			},
			receipts: [],
		};

		const issues = preflightValidatePayload(invalidPayload);
		assert.ok(issues.length >= 2);
		assert.ok(issues.some((i) => i.field === "clinic.inn"));
		assert.ok(issues.some((i) => i.field === "receipts"));
	});
});

describe("5. Printable Paper Certificate Generator (Приложение № 1 / КНД 1151156)", () => {
	it("5.1 Generates complete HTML paper certificate ready for print", () => {
		const payload: FnsNdflXmlPayload = {
			documentNumber: "105",
			documentDate: "2026-08-19",
			taxYear: 2025,
			clinic: {
				name: "ООО ДЕНТЕ",
				inn: "7701234560",
				kpp: "770101001",
				ogrn: "1157746123456",
			},
			payer: {
				fullName: { family: "Иванов", given: "Иван" },
				inn: "770112345695",
				birthDate: "1990-05-15",
			},
			patient: { kinshipCode: "1" },
			receipts: [
				{
					id: "r1",
					receiptNumber: "ФЧ-1",
					receiptDate: "2025-02-10",
					serviceName: "Лечение пульпита",
					deductionCode: "1",
					amountRub: 12000,
				},
			],
		};

		const html = generateFnsNdflPrintHtml(payload);
		assert.ok(html.includes("<!DOCTYPE html>"));
		assert.ok(html.includes("КНД 1151156"));
		assert.ok(html.includes("СПРАВКА ОБ ОПЛАТЕ МЕДИЦИНСКИХ УСЛУГ"));
		assert.ok(html.includes("ООО ДЕНТЕ"));
		assert.ok(html.includes("Иванов Иван"));
		assert.ok(html.includes("12 000,00 ₽") || html.includes("12 000,00"));
	});
});

describe("6. Modal Component Integration Contract", () => {
	it("6.1 Exports FnsNdflXmlModal as a valid React component function", () => {
		assert.equal(typeof FnsNdflXmlModal, "function");
	});
});
