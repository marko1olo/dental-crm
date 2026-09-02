import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildFnsKnd1151156Xml,
	classifyNdflServiceCode,
	isNonMedicalGood,
	isDmsInsurancePayment,
	validateFnsFiscalReceiptsChecksums,
	generateFnsNdflPrintHtml,
	type FnsTaxPayload,
} from "../documents/ndflXmlGenerator.js";
import { parseKopecks } from "../money.js";

describe("packages/shared: ndflXmlGenerator Statutory & Cryptographic Engine", () => {
	const basePayload: FnsTaxPayload = {
		documentNumber: "СПР-2026/042",
		documentDate: "2026-09-02",
		taxYear: 2025,
		taxInspectionCode: "7701",
		certificateKind: "1",
		correctionNumber: 0,
		clinic: {
			inn: "7701234560",
			kpp: "770101001",
			ogrn: "1027700132195",
			name: 'ООО "Стоматологическая клиника ДЕНТЕ"',
			directorName: "Смирнов Алексей Владимирович",
			directorSnils: "112-233-445 95",
			license: {
				number: "ЛО41-01137-77/00368421",
				date: "2021-04-12",
			},
		},
		payer: {
			fullName: {
				family: "Кузнецов",
				given: "Дмитрий",
				patronymic: "Сергеевич",
			},
			inn: "770212345681",
			snils: "112-233-445 95",
			birthDate: "1980-03-15",
			identityDocument: {
				docTypeCode: "21",
				seriesAndNumber: "4509 987654",
				issueDate: "2010-05-20",
			},
		},
		patient: {
			patientKinshipCode: "1", // Лично сам плательщик
		},
		receipts: [
			{
				id: "rec-1",
				receiptNumber: "ЧЕК-001",
				fiscalDocumentNumber: "1001",
				receiptDate: "2025-03-10",
				serviceName: "Лечение глубокого кариеса зуба 16",
				deductionCode: "1",
				amountRub: 80000,
			},
			{
				id: "rec-2",
				receiptNumber: "ЧЕК-002",
				fiscalDocumentNumber: "1002",
				receiptDate: "2025-06-15",
				serviceName: "Ортодонтическая коррекция брекет-системой",
				deductionCode: "1",
				amountRub: 120000,
			},
			{
				id: "rec-3",
				receiptNumber: "ЧЕК-003",
				fiscalDocumentNumber: "1003",
				receiptDate: "2025-09-20",
				serviceName: "Операция дентальной имплантации Dentium SuperLine (зуб 46)",
				deductionCode: "2",
				amountRub: 350000,
			},
		],
		expenses: {
			code1AmountRub: 200000,
			code2AmountRub: 350000,
		},
		signatory: {
			signatoryRole: "1",
			fullName: {
				family: "Смирнова",
				given: "Елена",
				patronymic: "Сергеевна",
			},
			snils: "087-654-303 00",
		},
	};

	it("1. Accurately calculates Code 01 (capped at 150k ₽) and Code 02 (uncapped) deductions and refunds", () => {
		const result = buildFnsKnd1151156Xml(basePayload, "mock-uuid-test");
		assert.strictEqual(result.isValidForSubmission, true);
		assert.strictEqual(result.code1Rub, 200000);
		assert.strictEqual(result.code2Rub, 350000);
		assert.strictEqual(result.totalRub, 550000);

		// Code 01: 200 000 ₽ expense -> capped at 150 000 ₽ -> 13% = 19 500 ₽
		// Code 02: 350 000 ₽ expense -> uncapped -> 13% = 45 500 ₽
		// Total 13% refund: 19 500 + 45 500 = 65 000 ₽
		assert.strictEqual(result.estimatedTaxRefundRub, 65000);

		// 15% refund bracket (high-income > 5m ₽):
		// Code 01: 150 000 * 0.15 = 22 500 ₽
		// Code 02: 350 000 * 0.15 = 52 500 ₽
		// Total 15% refund: 75 000 ₽
		assert.strictEqual(result.estimatedTaxRefund15Rub, 75000);

		assert.ok(result.xmlContent.includes('<СведРасхУсл КодУслуг="1" СумОпл="200000.00"/>'));
		assert.ok(result.xmlContent.includes('<СведРасхУсл КодУслуг="2" СумОпл="350000.00"/>'));
	});

	it("2. Correctly classifies dental services by Order 804n code and clinical keywords", () => {
		// Code 2 (дорогостоящее лечение по ПП РФ № 458):
		assert.strictEqual(classifyNdflServiceCode("Установка имплантата", "A16.07.054"), "2");
		assert.strictEqual(classifyNdflServiceCode("Синус-лифтинг закрытый", "A16.07.055"), "2");
		assert.strictEqual(classifyNdflServiceCode("Костная пластика челюсти", "A16.07.041"), "2");
		assert.strictEqual(classifyNdflServiceCode("Скуловой имплантат Zygoma", "A16.07.056"), "2");
		assert.strictEqual(classifyNdflServiceCode("Протезирование All-on-4 на имплантатах", "A16.07.023"), "2");
		assert.strictEqual(classifyNdflServiceCode("Био-гайд мембрана и остеопластика"), "2");

		// Code 1 (обычное лечение):
		assert.strictEqual(classifyNdflServiceCode("Лечение кариеса эмали", "A16.07.002"), "1");
		assert.strictEqual(classifyNdflServiceCode("Профессиональная гигиена полости рта AirFlow", "A16.07.051"), "1");
		assert.strictEqual(classifyNdflServiceCode("Эндодонтическое лечение пульпита"), "1");
	});

	it("3. Identifies non-medical retail goods and excludes them from tax refund", () => {
		assert.strictEqual(isNonMedicalGood("Зубная щетка Curaprox 5460"), true);
		assert.strictEqual(isNonMedicalGood("Зубная паста Marvis 85мл"), true);
		assert.strictEqual(isNonMedicalGood("Ирригатор Waterpik WP-660"), true);
		assert.strictEqual(isNonMedicalGood("Зубная нить Oral-B"), true);
		assert.strictEqual(isNonMedicalGood("Набор для домашнего отбеливания"), true);

		// Medical treatments are NOT goods:
		assert.strictEqual(isNonMedicalGood("Лечение пульпита зуба 21"), false);
		assert.strictEqual(isNonMedicalGood("Установка керамической коронки E.max"), false);
	});

	it("4. Identifies DMS insurance payments and validates fiscal receipts checksum integrity", () => {
		assert.strictEqual(isDmsInsurancePayment("dms"), true);
		assert.strictEqual(isDmsInsurancePayment("cash", "Оплата по полису ДМС СОГАЗ"), true);
		assert.strictEqual(isDmsInsurancePayment("card", "Личная доплата пациента"), false);

		// Valid checksums:
		const validCheck = validateFnsFiscalReceiptsChecksums(basePayload);
		assert.strictEqual(validCheck.isValid, true);
		assert.strictEqual(validCheck.totalDiscrepancyKopecks, 0);

		// Duplicate receipt detection:
		const duplicatePayload: FnsTaxPayload = {
			...basePayload,
			receipts: [
				...(basePayload.receipts || []),
				{
					id: "rec-dup",
					receiptNumber: "ЧЕК-001",
					fiscalDocumentNumber: "1001", // duplicate FD 1001
					receiptDate: "2025-03-10",
					serviceName: "Повторный чек",
					deductionCode: "1",
					amountRub: 10000,
				},
			],
		};
		const dupCheck = validateFnsFiscalReceiptsChecksums(duplicatePayload);
		assert.strictEqual(dupCheck.isValid, false);
		assert.ok(dupCheck.errors.some((err) => err.includes("обнаружен дубликат чека")));

		// Discrepancy detection: declared 200k ₽ vs receipts 80k ₽
		const mismatchPayload: FnsTaxPayload = {
			...basePayload,
			expenses: {
				code1AmountRub: 300000, // declared 300k, but receipts sum is 200k
				code2AmountRub: 350000,
			},
		};
		const mismatchCheck = validateFnsFiscalReceiptsChecksums(mismatchPayload);
		assert.strictEqual(mismatchCheck.isValid, false);
		assert.ok(mismatchCheck.errors.some((err) => err.includes("Расхождение контрольной суммы по коду 1")));
	});

	it("5. Generates official printable HTML with authentic GOST R 7.0.97-2016 blue UKEP signature stamp", () => {
		const htmlWithStamp = generateFnsNdflPrintHtml(basePayload, {
			certificateSerialNumber: "00E4A28B10277001321958240001",
			certificateSubject: 'ООО "Стоматологическая клиника ДЕНТЕ" (Главный бухгалтер Смирнова Е.С.)',
			certificateIssuer: "УЦ Федерального казначейства (ГОСТ Р 34.10-2012)",
			validFrom: "2026-01-15T00:00:00Z",
			validTo: "2027-04-15T00:00:00Z",
			signatureType: "ukep",
		});

		// Check HTML structural elements
		assert.ok(htmlWithStamp.includes("<!DOCTYPE html>"));
		assert.ok(htmlWithStamp.includes("КНД 1151156"));
		assert.ok(htmlWithStamp.includes("Приказ ФНС № ЕА-7-11/824@"));
		assert.ok(htmlWithStamp.includes("СПРАВКА ОБ ОПЛАТЕ МЕДИЦИНСКИХ УСЛУГ"));
		assert.match(htmlWithStamp, /200[\s\u00A0]000,00[\s\u00A0]₽/); // Код 1
		assert.match(htmlWithStamp, /350[\s\u00A0]000,00[\s\u00A0]₽/); // Код 2
		assert.match(htmlWithStamp, /65[\s\u00A0]000,00[\s\u00A0]₽/);  // 13% вычет

		// Check Blue Visual Signature Stamp (ГОСТ Р 7.0.97-2016)
		assert.ok(htmlWithStamp.includes("ДОКУМЕНТ ПОДПИСАН"), "Синий штамп содержит заголовок по ГОСТ");
		assert.ok(htmlWithStamp.includes("ЭЛЕКТРОННОЙ ПОДПИСЬЮ"), "Синий штамп содержит 'ЭЛЕКТРОННОЙ ПОДПИСЬЮ'");
		assert.ok(htmlWithStamp.includes("00E4A28B10277001321958240001"), "Штамп содержит серийный номер сертификата");
		assert.ok(htmlWithStamp.includes("Главный бухгалтер Смирнова Е.С."), "Штамп содержит владельца");
		assert.ok(htmlWithStamp.includes("gost-digital-stamp"), "Штамп имеет класс gost-digital-stamp");
	});
});
