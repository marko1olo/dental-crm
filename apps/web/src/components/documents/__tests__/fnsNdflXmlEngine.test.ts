import assert from "node:assert";
import { describe, test } from "node:test";
import {
	generateFnsNdflXml,
	generateFnsNdflPrintHtml,
	preflightValidatePayload,
	type FnsNdflXmlPayload,
} from "../ndflXml/fnsNdflXmlEngine";

describe("FNS Tax Deduction Certificate (КНД 1151156 / XML КНД 1184043)", () => {
	const validPayload: FnsNdflXmlPayload = {
		documentNumber: "СПР-2026/001",
		documentDate: "2026-03-15",
		taxYear: 2025,
		taxInspectionCode: "7701",
		clinic: {
			inn: "7701234560", // Valid 10-digit checksum
			kpp: "770101001",
			ogrn: "1027700132195",
			name: "ООО Стоматология Денте",
			directorName: "Смирнов Алексей Владимирович",
			directorSnils: "12345678901",
			license: {
				number: "ЛО-77-01-019842",
				date: "2021-04-12",
			},
		},
		payer: {
			fullName: {
				family: "Иванов",
				given: "Иван",
				patronymic: "Иванович",
			},
			inn: "770212345681", // Valid 12-digit checksum
			snils: "98765432100",
			birthDate: "1985-06-20",
			identityDocument: {
				docTypeCode: "21",
				seriesAndNumber: "4510 123456",
				issueDate: "2015-07-10",
			},
		},
		patient: {
			kinshipCode: "1", // Self
		},
		receipts: [
			{
				id: "rec-1",
				receiptNumber: "ЧЕК-101",
				fiscalDocumentNumber: "12345",
				receiptDate: "2025-04-10",
				serviceName: "Лечение кариеса и пломбирование",
				deductionCode: "1", // Regular
				amountRub: 50000,
			},
			{
				id: "rec-2",
				receiptNumber: "ЧЕК-102",
				fiscalDocumentNumber: "12346",
				receiptDate: "2025-05-12",
				serviceName: "Профессиональная гигиена",
				deductionCode: "1", // Regular
				amountRub: 120000, // Exceeds 150k limit together with rec-1 (total 170k)
			},
			{
				id: "rec-3",
				receiptNumber: "ЧЕК-103",
				fiscalDocumentNumber: "12347",
				receiptDate: "2025-06-20",
				serviceName: "Дентальная имплантация Straumann",
				deductionCode: "2", // Expensive treatment
				amountRub: 300000,
			},
		],
	};

	test("accurately calculates Code 1 and Code 2 totals and 13% tax refund", () => {
		const result = generateFnsNdflXml(validPayload);
		assert.strictEqual(result.isValidForSubmission, true);
		assert.strictEqual(result.code1Rub, 170000);
		assert.strictEqual(result.code2Rub, 300000);
		assert.strictEqual(result.totalRub, 470000);

		// Code 1 is capped at 150,000 руб for tax year 2025 -> refund is 150,000 * 0.13 = 19,500 руб
		// Code 2 has no limit (300,000 руб) -> refund is 300,000 * 0.13 = 39,000 руб
		// Total refund = 19,500 + 39,000 = 58,500 руб
		assert.strictEqual(result.estimatedTaxRefundRub, 58500);
	});

	test("generates valid FNS XML matching KND 1184043 version 5.01", () => {
		const result = generateFnsNdflXml(validPayload);
		assert.ok(result.xmlContent.includes('<?xml version="1.0" encoding="UTF-8"?>'));
		assert.ok(result.xmlContent.includes('ВерсФорм="5.01"'));
		assert.ok(result.xmlContent.includes('КНД="1184043"'));
		assert.ok(result.xmlContent.includes('НомСпр="СПР-2026/001"'));
		assert.ok(result.xmlContent.includes('ГодУсл="2025"'));
		assert.ok(result.xmlContent.includes('<СвОргЮЛ'));
		assert.ok(result.xmlContent.includes('ИННЮЛ="7701234560"'));
		assert.ok(result.xmlContent.includes('ИННФЛ="770212345681"'));
		assert.ok(result.xmlContent.includes('<СвПациент ПризнПац="1"/>'));
		assert.ok(result.xmlContent.includes('<СведРасхУсл КодУслуг="1" СумОпл="170000.00"/>'));
		assert.ok(result.xmlContent.includes('<СведРасхУсл КодУслуг="2" СумОпл="300000.00"/>'));
	});

	test("supports relative kinship patient (e.g. child / kinship 4)", () => {
		const relativePayload: FnsNdflXmlPayload = {
			...validPayload,
			patient: {
				kinshipCode: "4", // Ребенок
				fullName: {
					family: "Иванова",
					given: "Мария",
					patronymic: "Ивановна",
				},
				birthDate: "2018-04-12",
			},
		};
		const result = generateFnsNdflXml(relativePayload);
		assert.strictEqual(result.isValidForSubmission, true);
		assert.ok(result.xmlContent.includes('ПризнПац="4"'));
		assert.ok(result.xmlContent.includes('Фамилия="Иванова"'));
		assert.ok(result.xmlContent.includes('ДатаРожд="12.04.2018"'));
	});

	test("generates printable HTML sheet for KND 1151156", () => {
		const html = generateFnsNdflPrintHtml(validPayload);
		assert.ok(html.includes("КНД 1151156"));
		assert.ok(html.includes("СПРАВКА ОБ ОПЛАТЕ МЕДИЦИНСКИХ УСЛУГ"));
		assert.ok(html.includes("ООО Стоматология Денте"));
		assert.ok(html.includes("Иванов Иван Иванович"));
		assert.ok(html.includes("170"));
		assert.ok(html.includes("300"));
		assert.ok(html.includes("58"));
	});

	test("preflight validation rejects invalid INN and missing receipts", () => {
		const invalidPayload: FnsNdflXmlPayload = {
			...validPayload,
			clinic: {
				...validPayload.clinic,
				inn: "123", // Invalid INN
			},
			receipts: [],
		};
		const issues = preflightValidatePayload(invalidPayload);
		assert.ok(issues.some((i) => i.field === "clinic.inn" && i.severity === "error"));
		assert.ok(issues.some((i) => i.field === "receipts" && i.severity === "error"));
	});
});
